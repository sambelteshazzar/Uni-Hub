/**
 * ============================================
 * Multer Upload Middleware
 * Handles multipart/form-data file uploads
 * ============================================
 */

const multer = require('multer');
const path = require('path');

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `product-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

// File filter - only allow images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'), false);
  }
};

// Configure multer
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
    files: 5, // Max 5 files
  },
  fileFilter,
});

// Export upload middleware
module.exports = {
  // Upload single image
  uploadSingle: (fieldName = 'image') => upload.single(fieldName),
  
  // Upload multiple images
  uploadMultiple: (fieldName = 'images', maxCount = 5) => upload.array(fieldName, maxCount),
  
  // Upload multiple fields
  uploadFields: (fields) => upload.fields(fields),
};
