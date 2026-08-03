/**
 * ============================================
 * Multer Upload Middleware
 * Handles multipart/form-data file uploads
 * ============================================
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.memoryStorage();

// File filter - only allow images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|svg|heic|heif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  const heicMimes = ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence'];
  if (mimetype || extname || heicMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, GIF, WebP, HEIC) are allowed'), false);
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

const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 5,
  },
  fileFilter,
});

// Export upload middleware
module.exports = {
// Upload single image
  uploadSingle: (fieldName = 'image') => upload.single(fieldName),

  // Upload multiple images
  uploadMultiple: (fieldName = 'images', maxCount = 5) => upload.array(fieldName, maxCount),

  // Upload multiple images to memory (no disk)
  uploadMultipleMemory: (fieldName = 'images', maxCount = 5) => uploadMemory.array(fieldName, maxCount),

  // Upload multiple fields
  uploadFields: (fields) => upload.fields(fields),
};
