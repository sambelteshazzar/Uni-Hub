const { ApiError, asyncHandler } = require('../utils/errorHandler');
const { db, generateId, toBool, fromBool } = require('../utils/db');
const { sendVerificationEmail } = require('../utils/emailService');
const crypto = require('crypto');

exports.submitVerification = async (req, res) => {
  try {
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

    const existing = db('student_verifications').findOne({
      studentId,
      university,
      status: 'approved',
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'This student ID is already verified',
      });
    }

    const verificationData = {
      id: generateId(),
      studentId,
      fullName,
      email,
      phone,
      university,
      level,
      hall,
      verificationMethod,
      universityEmail,
      documents: JSON.stringify(documents),
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

    const verification = db('student_verifications').create(verificationData);

    res.status(201).json({
      success: true,
      message: 'Verification submitted for review',
      data: verification,
    });
  } catch (error) {
    console.error('Submit verification error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to submit verification',
    });
  }
};

exports.getPendingVerifications = async (req, res) => {
  try {
    const verifications = db('student_verifications').find(
      { status: 'pending' },
      { sort: { createdAt: -1 } },
    );

    const populatedVerifications = verifications.map(v => {
      const reviewer = db('users').findById(v.reviewedBy);
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
  } catch (error) {
    console.error('Get pending verifications error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch verifications',
    });
  }
};

exports.approveVerification = async (req, res) => {
  try {
    const { notes } = req.body;

    const verification = db('student_verifications').findById(req.params.id);

    if (!verification) {
      return res.status(404).json({
        success: false,
        error: 'Verification request not found',
      });
    }

    db('student_verifications').updateById(verification.id, {
      status: 'approved',
      reviewedBy: req.user.id,
      reviewedAt: new Date().toISOString(),
      reviewNotes: notes || '',
    });

    if (verification.userId) {
      db('users').findByIdAndUpdate(verification.userId, {
        isVerified: toBool(true),
        verificationMethod: 'document',
        studentId: verification.studentId,
      });
    }

    res.json({
      success: true,
      message: 'Verification approved',
      data: db('student_verifications').findById(verification.id),
    });
  } catch (error) {
    console.error('Approve verification error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to approve verification',
    });
  }
};

exports.rejectVerification = async (req, res) => {
  try {
    const { notes } = req.body;

    const verification = db('student_verifications').findById(req.params.id);

    if (!verification) {
      return res.status(404).json({
        success: false,
        error: 'Verification request not found',
      });
    }

    db('student_verifications').updateById(verification.id, {
      status: 'rejected',
      reviewedBy: req.user.id,
      reviewedAt: new Date().toISOString(),
      reviewNotes: notes || '',
    });

    res.json({
      success: true,
      message: 'Verification rejected',
      data: db('student_verifications').findById(verification.id),
    });
  } catch (error) {
    console.error('Reject verification error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to reject verification',
    });
  }
};

exports.getVerificationStatus = async (req, res) => {
  try {
    const { studentId, university } = req.params;

    const verification = db('student_verifications').findOne({
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

    const latestVerification = db('student_verifications').find(
      { studentId, university },
      { sort: { createdAt: -1 }, limit: 1 },
    )[0];

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
  } catch (error) {
    console.error('Get verification status error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get verification status',
    });
  }
};
