/**
 * ============================================
 * Cloudinary Integration
 * Handles image uploads to Cloudinary
 * ============================================
 */

const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload image to Cloudinary
 * @param {string} filePath - Local file path
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} - Upload result with secure_url
 */
const uploadImage = async (filePath, options = {}) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'uni-hub/products',
      resource_type: 'auto',
      transformation: [
        { quality: 'auto', fetch_format: 'auto' },
        ...(options.transformation || []),
      ],
      ...options,
    });

    return {
      secure_url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image');
  }
};

const uploadStream = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'uni-hub/products',
        resource_type: 'auto',
        transformation: [
          { quality: 'auto', fetch_format: 'auto' },
          ...(options.transformation || []),
        ],
        ...options,
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary stream upload error:', error);
          reject(new Error('Failed to upload image'));
        } else {
          resolve({
            secure_url: result.secure_url,
            public_id: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
          });
        }
      },
    );
    stream.end(buffer);
  });
};

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<Object>} - Delete result
 */
const deleteImage = async (publicId) => {
  try {
    return await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error('Failed to delete image');
  }
};

/**
 * Extract public ID from Cloudinary URL
 * @param {string} url - Cloudinary secure URL
 * @returns {string} - Public ID
 */
const getPublicIdFromUrl = (url) => {
  const parts = url.split('/');
  const filename = parts[parts.length - 1];
  return `uni-hub/products/${filename.split('.')[0]}`;
};

module.exports = { uploadImage, uploadStream, deleteImage, getPublicIdFromUrl };
