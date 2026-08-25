const { ApiError, asyncHandler } = require('../utils/errorHandler');
const { db, generateId, toBool, fromBool } = require('../utils/db');
const { sendVerificationEmail } = require('../utils/emailService');
const {
  getSignedDocumentUrl,
  destroyDocument,
} = require('../utils/cloudinary.util');
const logActivity = require('../utils/logActivity');
const crypto = require('crypto');

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

  const existing = await db('student_verifications').findOne({
    studentId,
    university,
    status: 'approved',
  });

  if (existing) {
    throw new ApiError(400, 'This student ID is already verified');
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
    universityEmail,
    status: 'pending',
  };

  if (verificationMethod === 'email' && universityEmail) {
    const verificationCode = crypto.randomBytes(3).toString('hex').toUpperCase();
    verificationData.verificationCode = verificationCode;
    verificationData.status = 'pending';

    if (process.env.EMAIL_USER) {
      const universityName = req.user.university || 'your university';
      await sendVerificationEmail(universityEmail, verificationCode, universityName);
    }
  }

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

  await db('student_verifications').updateById(verification.id, {
    status: 'approved',
    reviewedBy: req.user.id,
    reviewedAt: new Date().toISOString(),
    reviewNotes: notes || '',
    // Documents are PII: schedule their destruction 30 days out (spec
    // 2026-08-23). The retention sweep reads this column.
    documentsPurgeAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });

  const userId = verification.userId || verification.studentId;
  if (userId) {
    const userLookup = (await db('users').findById(userId)) || (await db('users').findOne({ studentId: verification.studentId, university: verification.university }));
    if (userLookup) {
      await db('users').updateById(userLookup.id, {
        isVerified: toBool(true),
        verificationMethod: verification.verificationMethod,
        studentId: verification.studentId,
      });
    }
  }

  res.json({
    success: true,
    message: 'Verification approved',
    data: await db('student_verifications').findById(verification.id),
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
      isVerified: latestVerification.status === 'approved',
      status: latestVerification.status,
      submittedAt: latestVerification.createdAt,
      reviewedAt: latestVerification.reviewedAt,
      reviewNotes: latestVerification.reviewNotes,
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
      isVerified: latestVerification.status === 'approved',
      status: latestVerification.status,
      verificationMethod: latestVerification.verificationMethod,
      university: latestVerification.university,
      studentId: latestVerification.studentId,
      submittedAt: latestVerification.createdAt,
      reviewedAt: latestVerification.reviewedAt,
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
