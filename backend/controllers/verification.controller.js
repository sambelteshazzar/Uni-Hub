const { ApiError, asyncHandler } = require('../utils/errorHandler');
const { db, generateId, toBool } = require('../utils/db');
const {
  sendApprovalLinkEmail,
  buildConfirmationLink,
  isEmailConfigured,
} = require('../utils/emailService');
const {
  getSignedDocumentUrl,
  destroyDocument,
} = require('../utils/cloudinary.util');
const logActivity = require('../utils/logActivity');
const crypto = require('crypto');

// Token TTL for the magic-link approval confirmation. 24h per product spec
// (2026-08-29). After expiry the user must be re-approved.
const CONFIRMATION_TTL_MS = 24 * 60 * 60 * 1000;

// Tokens are 32 raw bytes hex-encoded. We store the SHA-256 of the token in
// the DB (not the token itself) so a DB leak does not give an attacker
// usable approval links. The raw token is only ever in the email and the
// URL the user clicks.
function hashToken (token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateConfirmationToken () {
  return crypto.randomBytes(32).toString('hex');
}

exports.submitVerification = asyncHandler(async (req, res) => {
  const {
    studentId,
    fullName,
    email,
    phone,
    university,
    level,
    hall,
    verificationMethod,
    universityEmail,
    documents: _documents,
  } = req.body;

  // Validation — the unified form (2026-08-30) requires these. A personal
  // email is mandatory because the magic-link approval confirmation is
  // sent there. universityEmail is optional.
  if (!studentId || !fullName || !email || !phone || !university || !level) {
    throw new ApiError(400, 'Missing required field(s)');
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email))) {
    throw new ApiError(400, 'Invalid personal email address');
  }
  if (universityEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(universityEmail))) {
    throw new ApiError(400, 'Invalid university email address');
  }
  if (!/^[\d\s+\-()]{7,15}$/.test(String(phone))) {
    throw new ApiError(400, 'Invalid phone number');
  }
  if (!['100', '200', '300', '400', '500', 'postgrad', 'phd'].includes(String(level))) {
    throw new ApiError(400, 'Invalid level');
  }

  // Block re-submission if the same studentId + university is already
  // either fully approved OR waiting for the user to click the link
  // ('approved_pending_user'). The latter is intentionally a hard stop
  // because a second submission would orphan the first confirmation token.
  const existing = await db('student_verifications').findOne({
    studentId,
    university,
    status: { $in: ['approved', 'approved_pending_user'] },
  });

  if (existing) {
    // details.code is the machine-readable branch the SPA uses to route
    // the user to /verification-status instead of a dead-end form toast.
    throw new ApiError(
      400,
      'This student ID is already verified or awaiting confirmation',
      { code: 'ALREADY_SUBMITTED', status: existing.status }
    );
  }

  // Backward compat: legacy 'email' method (sent a 6-digit code to the
  // .edu.gh address) was removed in 2026-08-29. We accept it as a no-op
  // alias for 'document' so any old client still works. The frontend
  // now uses a single 'document' method with optional file upload.
  const method = (verificationMethod === 'email' || verificationMethod === 'document')
    ? 'document'
    : null;
  if (!method) {
    throw new ApiError(400, 'Invalid verification method');
  }

  const verificationData = {
    id: generateId(),
    userId: req.user.id,
    studentId,
    fullName,
    email,
    phone,
    university,
    level,
    hall,
    verificationMethod: method,
    universityEmail: universityEmail || null,
    status: 'pending',
  };

  const verification = await db('student_verifications').create(verificationData);

  // Documents arrive as multipart files (memory storage). Metadata-only
  // submissions from the legacy flow are ignored — real assets only.
  // (`documents` from req.body is intentionally left unused.)
  if (req.files && req.files.length > 0) {
    const { sniffDocumentType } = require('../utils/fileSignature');
    const { uploadPrivateDocument, destroyDocument } = require('../utils/cloudinary.util');
    const folder = `jertscart/verifications/${verification.id}`;
    const uploaded = [];
    try {
      for (const file of req.files) {
        const sniffed = sniffDocumentType(file.buffer);
        if (!sniffed) {
          throw new ApiError(400, `"${file.originalname}" is not a valid JPEG, PNG or PDF document`);
        }
        const asset = await uploadPrivateDocument(file.buffer, folder, sniffed);
        uploaded.push({ file, sniffed, asset });
      }
      for (const u of uploaded) {
        await db('verification_documents').create({
          verificationId: verification.id,
          fileName: u.file.originalname,
          fileUrl: '',
          fileType: u.sniffed,
          cloudinaryPublicId: u.asset.publicId,
          sizeBytes: u.file.size,
          mimeType: u.sniffed,
        });
      }
    } catch (err) {
      // Roll back any stored assets so failures leave nothing behind.
      for (const u of uploaded) {
        try { await destroyDocument(u.asset.publicId, u.sniffed); } catch (_e) { /* sweep retries */ }
      }
      // Also delete the parent student_verifications row that we created
      // at line 104. Without this, a Cloudinary upload failure orphans a
      // 'pending' row the user can't easily retry past (the next submit
      // re-creates a new orphan each time). 404 on delete is fine — the
      // row may have been removed by an admin race.
      try {
        await db('student_verifications').deleteById(verification.id);
      } catch (_rollbackErr) { /* swallow — the user-facing error below is the priority */ }
      throw err instanceof ApiError ? err : new ApiError(500, 'Failed to store verification documents');
    }
  }

  res.status(201).json({
    success: true,
    message: 'Verification submitted for review',
    data: verification,
  });
});

exports.getPendingVerifications = asyncHandler(async (req, res) => {
  // Opportunistic sweep so low-uptime deployments still converge.
  require('../services/docRetention').purgeExpiredVerificationDocs()
    .catch(() => { /* logged inside service */ });

  // The admin QUEUE (route keeps its historical /pending name): return
  // every review state, not just 'pending'. Reviewed rows were previously
  // only ever visible in the browser that reviewed them (localStorage
  // fallback), so on any other machine the panel showed an empty queue
  // while a user sat in approved_pending_user — and the "ask an admin to
  // re-approve" instruction in the expired-link error had no way to reach
  // the row. Admin/moderator-gated by the route; the frontend still
  // filters per tab and persists a PII-minimal snapshot locally.
  const verifications = await db('student_verifications').find(
    { status: { $in: ['pending', 'approved_pending_user', 'approved', 'rejected'] } },
    { sort: { createdAt: -1 } },
  );

  // Single batched lookup instead of one findById per row (N+1). Most rows
  // have reviewedBy === null (unreviewed), so we only query reviewers that
  // are actually set.
  const reviewerIds = verifications.map(v => v.reviewedBy).filter(id => id !== null && id !== undefined);
  const reviewers = await db('users').findByIds(reviewerIds);
  const reviewerById = new Map(reviewers.map(r => [r.id, r]));

  const populatedVerifications = verifications.map(v => {
    const reviewer = reviewerById.get(v.reviewedBy);
    return {
      ...v,
      reviewedBy: reviewer ? { id: reviewer.id, fullName: reviewer.fullName } : null,
    };
  });

  res.json({
    success: true,
    data: {
      verifications: populatedVerifications,
      total: populatedVerifications.length,
    },
  });
});

exports.approveVerification = asyncHandler(async (req, res) => {
  const { notes } = req.body;

  const verification = await db('student_verifications').findById(req.params.id);

  if (!verification) {
    throw new ApiError(404, 'Verification request not found');
  }

  // Activate-now branch: approve AND mark the user verified in one step,
  // skipping the email-confirmation round trip. This is the escape hatch
  // for environments where no mail transport is configured — without it,
  // approving a user strands them in approved_pending_user forever (no
  // link can ever be delivered, and resubmission is intentionally
  // blocked). Any stale token is cleared so an old link cannot be clicked
  // after activation.
  // TODO: security review — this bypasses the email-confirmation
  // two-factor step; it is guarded by the same admin/moderator route
  // authorization as the normal approve.
  if (req.body && req.body.activate) {
    const confirmedAt = new Date().toISOString();
    await db('student_verifications').updateById(verification.id, {
      status: 'approved',
      reviewedBy: req.user.id,
      reviewedAt: confirmedAt,
      reviewNotes: notes || '',
      // Documents are PII: schedule their destruction 30 days out (spec
      // 2026-08-23), same retention as the normal approve.
      documentsPurgeAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      confirmedAt,
      confirmationTokenHash: null,
      confirmationTokenExpiresAt: null,
      confirmationTokenUsedAt: null,
    });

    // Flip the marketplace-access flag — mirrors confirmVerification's
    // user lookup and column writes so the account ends in exactly the
    // state a user-clicked link would produce.
    const activateUserId = verification.userId || verification.studentId;
    let activateUser = null;
    if (activateUserId) {
      activateUser =
        (await db('users').findById(activateUserId)) ||
        (await db('users').findOne({ studentId: verification.studentId, university: verification.university }));
    }
    if (activateUser) {
      await db('users').updateById(activateUser.id, {
        isVerified: toBool(true),
        verificationMethod: verification.verificationMethod,
        studentId: verification.studentId,
      });
    }

    await logActivity('verification_activated_by_admin', req.user, {
      verificationId: verification.id,
      studentId: verification.studentId,
      university: verification.university,
    }, 'info', req);

    const activatedRow = await db('student_verifications').findById(verification.id);
    return res.json({
      success: true,
      message: 'Verification approved and account activated — the user is verified immediately',
      activated: true,
      data: activatedRow,
    });
  }

  // Idempotent re-approval: if a token has already been issued and is
  // still un-used and un-expired, the previous link is invalidated by
  // issuing a new one. We rotate the token so the user cannot click a
  // stale link after a re-approval.
  const rawToken = generateConfirmationToken();
  const tokenHash = hashToken(rawToken);
  const tokenExpiresAt = new Date(Date.now() + CONFIRMATION_TTL_MS).toISOString();

  await db('student_verifications').updateById(verification.id, {
    status: 'approved_pending_user',
    reviewedBy: req.user.id,
    reviewedAt: new Date().toISOString(),
    reviewNotes: notes || '',
    // Documents are PII: schedule their destruction 30 days out (spec
    // 2026-08-23). The retention sweep reads this column.
    documentsPurgeAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    confirmationTokenHash: tokenHash,
    confirmationTokenExpiresAt: tokenExpiresAt,
    confirmationTokenUsedAt: null,
  });

  // The user is NOT flipped to isVerified here — that only happens
  // after the user clicks the magic link in the email. The 'isVerified'
  // flag is reserved for the final, two-factor-confirmed state.

  // Look up the user for the email + activity log.
  const user = (await db('users').findById(verification.userId)) ||
    (await db('users').findOne({ studentId: verification.studentId, university: verification.university }));

  const confirmUrl = buildConfirmationLink(rawToken);

  // Recipient: the personal email submitted on the form — mandatory since
  // 2026-08-30 precisely "because the magic-link approval confirmation is
  // sent there" (see submitValidation above), and what the status page
  // tells the user to check. Falling back to users.email for legacy rows
  // that predate the form field. Sending to users.email alone ignored the
  // form address and stranded users whose registration address differed
  // (e.g. registered with Gmail, typed another personal email).
  const recipient = verification.email || (user && user.email);

  let emailSent = false;
  let emailError = null;
  if (recipient) {
    const result = await sendApprovalLinkEmail(recipient, rawToken, user);
    emailSent = !!result.success;
    emailError = emailSent ? null : (result.error || 'unknown error');
    if (emailSent) {
      // eslint-disable-next-line no-console
      console.log(`[VERIFICATION] Approval link sent to ${recipient} for verification ${verification.id}`);
    } else {
      // eslint-disable-next-line no-console
      console.warn(`[VERIFICATION] Email send failed for verification ${verification.id}: ${emailError}`);
    }
  } else {
    // eslint-disable-next-line no-console
    console.warn(`[VERIFICATION] No recipient email for verification ${verification.id} — cannot email link`);
  }

  // In dev / when SMTP is not configured, surface the link so the admin
  // can complete the test flow without mail transport. The raw token
  // never leaves this response — it is not stored in the DB.
  const emailConfigured = isEmailConfigured();
  const shouldExposeLink = !emailSent;

  await logActivity('verification_approved_by_admin', req.user, {
    verificationId: verification.id,
    studentId: verification.studentId,
    university: verification.university,
    emailSent,
    emailConfigured,
  }, 'info', req);

  const responseData = await db('student_verifications').findById(verification.id);
  const responseBody = {
    success: true,
    message: emailSent
      ? 'Verification approved — confirmation link emailed to the user'
      : 'Verification approved — email not sent, share the link with the user manually',
    data: responseData,
  };
  if (shouldExposeLink) {
    responseBody.confirmationLink = confirmUrl;
    responseBody.confirmationLinkReason = emailConfigured
      ? 'email send failed'
      : 'email service not configured';
  }

  res.json(responseBody);
});

/**
 * Public endpoint: user clicks the magic link in their email and the SPA
 * calls this to finalize verification. No auth required — the token in
 * the URL is the credential. Single-use, 24h TTL.
 *
 * GET /api/verification/confirm?token=...
 */
exports.confirmVerification = asyncHandler(async (req, res) => {
  const rawToken = String(req.query.token || '').trim();
  if (!rawToken) {
    throw new ApiError(400, 'Missing confirmation token');
  }
  if (rawToken.length < 32) {
    throw new ApiError(400, 'Invalid confirmation token');
  }

  const tokenHash = hashToken(rawToken);
  const verification = await db('student_verifications').findOne({
    confirmationTokenHash: tokenHash,
  });

  if (!verification) {
    throw new ApiError(404, 'Confirmation link is invalid or has expired');
  }

  if (verification.confirmationTokenUsedAt) {
    throw new ApiError(410, 'This confirmation link has already been used');
  }

  if (!verification.confirmationTokenExpiresAt ||
      new Date(verification.confirmationTokenExpiresAt).getTime() < Date.now()) {
    throw new ApiError(410, 'This confirmation link has expired — ask an admin to re-approve');
  }

  if (verification.status !== 'approved_pending_user') {
    throw new ApiError(409, 'This verification is not awaiting user confirmation');
  }

  const confirmedAt = new Date().toISOString();
  await db('student_verifications').updateById(verification.id, {
    status: 'approved',
    confirmedAt,
    confirmationTokenUsedAt: confirmedAt,
  });

  const userId = verification.userId || verification.studentId;
  let user = null;
  if (userId) {
    user = (await db('users').findById(userId)) ||
      (await db('users').findOne({ studentId: verification.studentId, university: verification.university }));
  }
  if (user) {
    await db('users').updateById(user.id, {
      isVerified: toBool(true),
      verificationMethod: verification.verificationMethod,
      studentId: verification.studentId,
    });
  }

  await logActivity('verification_confirmed', user, {
    verificationId: verification.id,
    studentId: verification.studentId,
    university: verification.university,
  }, 'info', req);

  res.json({
    success: true,
    message: 'Student verification confirmed — you can now buy and sell on JERTS CART',
    data: {
      isVerified: true,
      status: 'approved',
      university: verification.university,
      studentId: verification.studentId,
    },
  });
});

/**
 * Self-service resend of the confirmation email (owner only). On success
 * the token ROTATES exactly like admin re-approve — any previously
 * delivered link dies — and re-sends to the FORM personal email. The raw
 * token is NEVER returned: the email channel is the only way the link
 * leaves the server (the token in the URL is the credential). On failure
 * the rotation is rolled back so the existing link keeps working, and a
 * missing mail configuration is reported up front (503
 * EMAIL_NOT_CONFIGURED) instead of burning the token for nothing.
 * Rate-limited in the route (3/15min) plus the namespace-wide POST
 * limiter in server.js.
 *
 * POST /api/verification/resend-confirmation
 */
exports.resendConfirmation = asyncHandler(async (req, res) => {
  const latest = (await db('student_verifications').find(
    { userId: req.user.id },
    { sort: { createdAt: -1 }, limit: 1 },
  ))[0];

  if (!latest) {
    throw new ApiError(404, 'No verification request found');
  }
  if (latest.status !== 'approved_pending_user') {
    throw new ApiError(409, 'No confirmation email is awaiting action for your account');
  }

  const recipient = latest.email || req.user.email;
  if (!recipient) {
    throw new ApiError(400, 'No email address available for the confirmation link');
  }

  // Deterministic config check BEFORE rotating: rotating a token we then
  // cannot deliver would destroy the user's only working link and strand
  // them in approved_pending_user forever (the jertscart.com outage mode —
  // generic 502 "try again later" with no working recovery path).
  if (!isEmailConfigured()) {
    throw new ApiError(
      503,
      'Confirmation emails are unavailable on this deployment. Please ask an admin to re-approve your verification and share the new link with you.',
      { code: 'EMAIL_NOT_CONFIGURED' },
    );
  }

  // Snapshot the current token so a failed send can roll back — resend
  // must never leave the user worse off than before they pressed the button.
  const prevHash = latest.confirmationTokenHash;
  const prevExpiresAt = latest.confirmationTokenExpiresAt;
  const prevUsedAt = latest.confirmationTokenUsedAt;

  const rawToken = generateConfirmationToken();
  await db('student_verifications').updateById(latest.id, {
    confirmationTokenHash: hashToken(rawToken),
    confirmationTokenExpiresAt: new Date(Date.now() + CONFIRMATION_TTL_MS).toISOString(),
    confirmationTokenUsedAt: null,
  });

  const user = await db('users').findById(req.user.id);
  const result = await sendApprovalLinkEmail(recipient, rawToken, user);
  const emailSent = !!result.success;

  await logActivity('verification_link_resent', req.user, {
    verificationId: latest.id,
    recipient,
    emailSent,
    emailError: emailSent ? null : result.error || 'unknown',
  }, emailSent ? 'info' : 'warning', req);

  if (!emailSent) {
    // Roll back the rotation: the previously delivered link (still inside
    // its 24h TTL) keeps working instead of being silently invalidated.
    try {
      await db('student_verifications').updateById(latest.id, {
        confirmationTokenHash: prevHash,
        confirmationTokenExpiresAt: prevExpiresAt,
        confirmationTokenUsedAt: prevUsedAt,
      });
    } catch (restoreErr) {
      // eslint-disable-next-line no-console
      console.warn('verification resend rollback failed:', restoreErr.message || restoreErr);
    }
    throw new ApiError(502, 'Could not send the confirmation email. Please try again later.', {
      code: 'EMAIL_SEND_FAILED',
    });
  }

  res.json({
    success: true,
    message: `Confirmation email sent to ${recipient}`,
  });
});

exports.rejectVerification = asyncHandler(async (req, res) => {
  const { notes } = req.body;

  const verification = await db('student_verifications').findById(req.params.id);

  if (!verification) {
    throw new ApiError(404, 'Verification request not found');
  }

  await db('student_verifications').updateById(verification.id, {
    status: 'rejected',
    reviewedBy: req.user.id,
    reviewedAt: new Date().toISOString(),
    reviewNotes: notes || '',
    // Same retention rule as approval — rejected docs are destroyed too.
    documentsPurgeAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });

  res.json({
    success: true,
    message: 'Verification rejected',
    data: await db('student_verifications').findById(verification.id),
  });
});

exports.getVerificationStatus = asyncHandler(async (req, res) => {
  const { studentId, university } = req.params;

  const verification = await db('student_verifications').findOne({
    studentId,
    university,
  });

  if (!verification) {
    return res.json({
      success: true,
      data: {
        isVerified: false,
        status: 'not_submitted',
      },
    });
  }

  const latestVerifications = await db('student_verifications').find(
    { studentId, university },
    { sort: { createdAt: -1 }, limit: 1 },
  );
  const latestVerification = latestVerifications[0];

  res.json({
    success: true,
    data: {
      // Only the user-clicked-magic-link end state counts as 'verified'.
      // 'approved_pending_user' means the admin has approved but the user
      // has not yet clicked the email confirmation link.
      isVerified: latestVerification.status === 'approved',
      status: latestVerification.status,
      submittedAt: latestVerification.createdAt,
      reviewedAt: latestVerification.reviewedAt,
      reviewNotes: latestVerification.reviewNotes,
      confirmedAt: latestVerification.confirmedAt || null,
    },
  });
});

exports.getMyVerificationStatus = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const latestVerifications = await db('student_verifications').find(
    { userId },
    { sort: { createdAt: -1 }, limit: 1 },
  );
  const latestVerification = latestVerifications[0];

  if (!latestVerification) {
    return res.json({
      success: true,
      data: {
        // users.isVerified is the marketplace access flag requireVerified
        // enforces (admin users-list "mark verified", seed data, legacy
        // accounts write ONLY this column). Returning false here made the
        // client's syncVerificationStatus() downgrade verified users on
        // every login ("verify again" bug).
        isVerified: !!req.user.isVerified,
        status: 'not_submitted',
      },
    });
  }

  // State-B self-heal: the row says approved but users.isVerified was
  // never flipped (confirmVerification partial failure / legacy rows).
  // requireVerified (checkout) checks users.isVerified only, so the user
  // stayed blocked while this endpoint already claimed verified — and no
  // other write path repaired the flag. Flip it here: this GET is the
  // first thing login/dashboard/cart sync call, so the next
  // requireVerified sees a consistent flag. approved_pending_user must
  // NOT heal — the magic link has not been clicked yet.
  let userIsVerified = !!req.user.isVerified;
  if (latestVerification.status === 'approved' && !userIsVerified) {
    try {
      await db('users').updateById(userId, { isVerified: toBool(true) });
      userIsVerified = true;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('verification/me: isVerified self-heal failed:', e.message || e);
    }
  }

  res.json({
    success: true,
    data: {
      // Only fully confirmed verifications count as isVerified — but the
      // users.isVerified flag (same one requireVerified checks) also
      // counts, so the two backend notions of "verified" cannot disagree
      // and clobber a good session on sync.
      isVerified: latestVerification.status === 'approved' || userIsVerified,
      status: latestVerification.status,
      // Own submitted personal email — lets the status page show a masked
      // destination ("sent to pe***@gmail.com") so users verify WHERE the
      // link goes before checking the wrong inbox.
      email: latestVerification.email || null,
      verificationMethod: latestVerification.verificationMethod,
      university: latestVerification.university,
      studentId: latestVerification.studentId,
      submittedAt: latestVerification.createdAt,
      reviewedAt: latestVerification.reviewedAt,
      confirmedAt: latestVerification.confirmedAt || null,
      reviewNotes: latestVerification.reviewNotes,
    },
  });
});

/**
 * @desc List verification documents with fresh signed URLs (PII access audited)
 * @route GET /api/verification/:id/documents
 * @access admin/moderator
 */
exports.getVerificationDocuments = asyncHandler(async (req, res) => {
  const verification = await db('student_verifications').findById(req.params.id);
  if (!verification) {
    throw new ApiError(404, 'Verification request not found');
  }

  const docs = await db('verification_documents').find({ verificationId: verification.id });
  const documents = docs
    .filter(d => d.cloudinaryPublicId)
    .map(d => ({
      fileName: d.fileName,
      mimeType: d.mimeType || d.fileType || 'application/octet-stream',
      sizeBytes: d.sizeBytes || 0,
      url: getSignedDocumentUrl(d.cloudinaryPublicId, d.mimeType || d.fileType, 300),
    }))
    // Drop documents with no usable preview URL (e.g. DEV_NO_UPLOAD stubs).
    // An empty string URL in the UI renders <img src="">, whose load error
    // trips the modal's capture-phase error refetch and repaints it endlessly.
    .filter(d => d.url);

  // PII access logging — who viewed which student's documents, when.
  // NEVER include the URLs themselves.
  await logActivity('verification_docs_viewed', req.user, {
    verificationId: verification.id,
    studentId: verification.studentId,
    documentCount: documents.length,
  }, 'info', req);

  res.set('Cache-Control', 'no-store');
  res.json({
    success: true,
    data: {
      documents,
      purged: !!verification.documentsPurgedAt,
      purgeScheduledFor: verification.documentsPurgeAt || null,
    },
  });
});

/**
 * @desc Immediately destroy remaining verification documents (DPA erasure)
 * @route POST /api/verification/:id/purge-documents
 * @access admin
 */
// TODO: security review — irreversible PII destruction; confirm retention
// policy sign-off before production enablement.
exports.purgeVerificationDocuments = asyncHandler(async (req, res) => {
  const verification = await db('student_verifications').findById(req.params.id);
  if (!verification) {
    throw new ApiError(404, 'Verification request not found');
  }

  const docs = await db('verification_documents').find({ verificationId: verification.id });
  let destroyed = 0;
  let failures = 0;
  for (const d of docs) {
    if (!d.cloudinaryPublicId) { continue; }
    try {
      await destroyDocument(d.cloudinaryPublicId, d.mimeType || d.fileType);
      destroyed++;
    } catch (_e) {
      failures++;
    }
  }
  if (failures > 0) {
    throw new ApiError(502, `Failed to destroy ${failures} asset(s) — retry shortly`);
  }

  await db('verification_documents').rawRun(
    'DELETE FROM verification_documents WHERE verificationId = ?',
    [verification.id],
  );
  await db('student_verifications').updateById(verification.id, {
    documentsPurgedAt: new Date().toISOString(),
  });

  res.json({ success: true, message: 'Documents permanently deleted', data: { destroyed } });
});
