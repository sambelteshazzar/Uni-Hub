const { ApiError, asyncHandler } = require('../utils/errorHandler');
/**
 * ============================================
 * Student Verification Controller
 * Handle student verification submissions and reviews
 * ============================================
 */

const StudentVerification = require('../models/StudentVerification.model');
const User = require('../models/User.model');

/**
 * @desc    Submit verification request
 * @route   POST /api/verification
 * @access  Public
 */
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

    // Check if already verified
    const existing = await StudentVerification.findOne({
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

    // Create verification request
    const verification = await StudentVerification.create({
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
      status: verificationMethod === 'email' ? 'approved' : 'pending',
    });

    // If email verification, update user immediately
    if (verificationMethod === 'email') {
      await User.findOneAndUpdate(
        { email: universityEmail },
        {
          isVerified: true,
          verificationMethod: 'email',
        },
      );
    }

    res.status(201).json({
      success: true,
      message: verificationMethod === 'email'
        ? 'Email verified successfully'
        : 'Verification submitted for review',
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

/**
 * @desc    Get pending verifications (admin)
 * @route   GET /api/verification/pending
 * @access  Private (admin)
 */
exports.getPendingVerifications = async (req, res) => {
  try {
    const verifications = await StudentVerification.getPending()
      .populate('reviewedBy', 'fullName');

    res.json({
      success: true,
      data: {
        verifications,
        total: verifications.length,
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

/**
 * @desc    Approve verification
 * @route   PUT /api/verification/:id/approve
 * @access  Private (admin)
 */
exports.approveVerification = async (req, res) => {
  try {
    const { notes } = req.body;

    const verification = await StudentVerification.findById(req.params.id);

    if (!verification) {
      return res.status(404).json({
        success: false,
        error: 'Verification request not found',
      });
    }

    await verification.approve(req.user._id, notes);

    // Update user verification status
    await User.findOneAndUpdate(
      { studentId: verification.studentId, university: verification.university },
      {
        isVerified: true,
        verificationMethod: 'document',
      },
    );

    res.json({
      success: true,
      message: 'Verification approved',
      data: verification,
    });
  } catch (error) {
    console.error('Approve verification error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to approve verification',
    });
  }
};

/**
 * @desc    Reject verification
 * @route   PUT /api/verification/:id/reject
 * @access  Private (admin)
 */
exports.rejectVerification = async (req, res) => {
  try {
    const { notes } = req.body;

    const verification = await StudentVerification.findById(req.params.id);

    if (!verification) {
      return res.status(404).json({
        success: false,
        error: 'Verification request not found',
      });
    }

    await verification.reject(req.user._id, notes);

    res.json({
      success: true,
      message: 'Verification rejected',
      data: verification,
    });
  } catch (error) {
    console.error('Reject verification error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to reject verification',
    });
  }
};

/**
 * @desc    Get verification status
 * @route   GET /api/verification/status/:studentId/:university
 * @access  Public
 */
exports.getVerificationStatus = async (req, res) => {
  try {
    const { studentId, university } = req.params;

    const verification = await StudentVerification.getByStudent(studentId, university);

    if (!verification) {
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
        isVerified: verification.status === 'approved',
        status: verification.status,
        submittedAt: verification.createdAt,
        reviewedAt: verification.reviewedAt,
        reviewNotes: verification.reviewNotes,
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
