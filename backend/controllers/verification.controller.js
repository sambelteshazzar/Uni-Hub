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
    universityEmail: _universityEmail,
    documents: _documents,
  } = req.body;

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
    throw new ApiError(400, 'This student ID is already verified or awaiting confirmation');
  }

  // The legacy 'email' method (which sent a 6-digit code to the .edu.gh
  // address) has been removed in 2026-08-29. Both submission forms are
  // now treated identically: documents uploaded (if any) go to admin
  // review, then admin approval triggers a magic-link email to the
  // user's personal email.
  if (!['email', 'document'].includes(verificationMethod)) {
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
    verificationMethod,
    universityEmail: null,
    status: 'pending',
  };

  const verification = await db('student_verifications').create(verificationData);

  // Documents arrive as multipart files (memory storage). Metadata-only
  // submissions from the legacy flow are ignored — real assets only.
  // (`documents` from req.body is intentionally left unused.)
  if (req.files && req.files.length > 0) {
    const { sniffDocumentType } = require('../utils/fileSignature');
    const { uploadPrivateDocument, destroyDocument } = require('../utils/cloudinary.util');
    const folder = `uni-hub/verifications/${verification.id}`;
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

  const verifications = await db('student_verifications').find(
    { status: 'pending' },
    { sort: { createdAt: -1 } },
  );

  const populatedVerifications = [];
  for (const v of verifications) {
    const reviewer = await db('users').findById(v.reviewedBy);
    populatedVerifications.push({
      ...v,
      reviewedBy: reviewer ? { id: reviewer.id, fullName: reviewer.fullName } : null,
    });
  }

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

  let emailSent = false;
  let emailError = null;
  if (user && user.email) {
    const result = await sendApprovalLinkEmail(user.email, rawToken, user);
    emailSent = !!result.success;
    emailError = emailSent ? null : (result.error || 'unknown error');
    if (emailSent) {
      // eslint-disable-next-line no-console
      console.log(`[VERIFICATION] Approval link sent to ${user.email} for verification ${verification.id}`);
    } else {
      // eslint-disable-next-line no-console
      console.warn(`[VERIFICATION] Email send failed for verification ${verification.id}: ${emailError}`);
    }
  } else {
    // eslint-disable-next-line no-console
    console.warn(`[VERIFICATION] No user record found for verification ${verification.id} — cannot email link`);
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
        isVerified: false,
        status: 'not_submitted',
      },
    });
  }

  res.json({
    success: true,
    data: {
      // Only fully confirmed verifications count as isVerified.
      isVerified: latestVerification.status === 'approved',
      status: latestVerification.status,
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
    }));

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
