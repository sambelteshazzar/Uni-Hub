const { ApiError, asyncHandler } = require('../utils/errorHandler');
const { db, generateId, toBool, fromBool } = require('../utils/db');
const { sendVerificationEmail } = require('../utils/emailService');
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
    documents,
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

  if (documents && Array.isArray(documents)) {
    for (const doc of documents) {
      await db('verification_documents').create({
        verificationId: verification.id,
        fileName: doc.name || doc.fileName || 'document',
        fileUrl: doc.url || doc.fileUrl || '',
        fileType: doc.type || doc.fileType || 'image',
      });
    }
  }

  res.status(201).json({
    success: true,
    message: 'Verification submitted for review',
    data: verification,
  });
});

exports.getPendingVerifications = asyncHandler(async (req, res) => {
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
