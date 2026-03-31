/**
 * ============================================
 * Student Verification Model
 * For document-based verification of new students
 * ============================================
 */

const mongoose = require('mongoose');

const verificationSchema = new mongoose.Schema({
  // Student Information
  studentId: {
    type: String,
    required: [true, 'Student ID is required'],
    trim: true,
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
  },
  
  // University Information
  university: {
    type: String,
    required: [true, 'University is required'],
    trim: true,
  },
  level: {
    type: String,
    enum: ['100', '200', '300', '400', '500', 'postgrad', 'phd'],
    required: true,
  },
  hall: {
    type: String,
    trim: true,
  },
  
  // Verification Method
  verificationMethod: {
    type: String,
    enum: ['email', 'document'],
    required: true,
  },
  
  // For email verification
  universityEmail: {
    type: String,
    lowercase: true,
    trim: true,
  },
  
  // For document verification
  documents: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  
  // Verification Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  
  // Admin Review
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  reviewedAt: Date,
  reviewNotes: {
    type: String,
    trim: true,
  },
  
  // Timestamps
}, {
  timestamps: true,
});

// Indexes for faster queries
verificationSchema.index({ studentId: 1, university: 1 });
verificationSchema.index({ email: 1 });
verificationSchema.index({ status: 1, createdAt: -1 });
verificationSchema.index({ university: 1, status: 1 });

// Static method to get pending verifications
verificationSchema.statics.getPending = function() {
  return this.find({ status: 'pending' }).sort({ createdAt: -1 });
};

// Static method to get verification by student ID and university
verificationSchema.statics.getByStudent = function(studentId, university) {
  return this.findOne({ studentId, university });
};

// Method to approve verification
verificationSchema.methods.approve = function(adminId, notes = '') {
  this.status = 'approved';
  this.reviewedBy = adminId;
  this.reviewedAt = new Date();
  this.reviewNotes = notes;
  return this.save();
};

// Method to reject verification
verificationSchema.methods.reject = function(adminId, notes = '') {
  this.status = 'rejected';
  this.reviewedBy = adminId;
  this.reviewedAt = new Date();
  this.reviewNotes = notes;
  return this.save();
};

const StudentVerification = mongoose.model('StudentVerification', verificationSchema);

module.exports = StudentVerification;
