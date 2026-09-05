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

// Dev fallback: when Cloudinary credentials are missing or still set to the
// documented placeholder, skip the network round-trip and synthesize a stub
// asset. This lets the rest of the upload pipeline (sniff type, write the
// verification_documents row, mark pending) run normally so devs can test
// the end-to-end verification flow without a Cloudinary account. Production
// deploys must set real CLOUDINARY_* env vars — the placeholder check
// rejects the literal "your-cloud-name" from .env.example too.
//
// Search the codebase for DEV_NO_UPLOAD before any production deploy: every
// record that skipped real upload will carry this marker.
const isDevFallbackActive = (() => {
  const name = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!name || !key || !secret) {return true;}
  if (name === 'your-cloud-name' || key === 'your-api-key' || secret === 'your-api-secret') {return true;}
  return false;
})();

/**
 * Upload image to Cloudinary
 * @param {string} filePath - Local file path
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} - Upload result with secure_url
 */
const uploadImage = async (filePath, options = {}) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'jertscart/products',
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
        folder: 'jertscart/products',
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
          let secure_url = result.secure_url;
          if (secure_url.includes('/raw/upload/')) {
            secure_url = secure_url.replace('/raw/upload/', '/image/upload/');
          }
          resolve({
            secure_url,
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
  return `jertscart/products/${filename.split('.')[0]}`;
};

// ============================================
// PRIVATE DOCUMENT HELPERS (verification docs)
// ============================================
// Verification documents are PII: uploaded PRIVATE (no unsigned delivery),
// served only via freshly-signed short-TTL URLs issued by the backend, and
// destroyed by the retention sweep. URLs are never persisted or logged.
// TODO: security review — enable token-based auth on the Cloudinary account
// so __cld_token__ expiry is enforced account-side, not just app-side.

function resourceTypeForMime (mimeType) {
  return mimeType === 'application/pdf' ? 'raw' : 'image';
}

const uploadPrivateDocument = (buffer, folder, mimeType) => {
  if (isDevFallbackActive) {
    // Dev-only stub: skip the network call. The marker is searchable so a
    // pre-deploy audit can find every record that didn't actually upload.
    // The controller still writes a verification_documents row so the
    // admin queue and tests see the submission.
    console.warn(
      `[cloudinary] DEV_NO_UPLOAD: skipping real upload for ${folder} (${mimeType}, ${buffer.length} bytes). ` +
      'Set CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET in .env to enable real uploads.'
    );
    return Promise.resolve({
      publicId: 'DEV_NO_UPLOAD',
      bytes: buffer.length,
      devStub: true,
    });
  }
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        type: 'private',
        resource_type: resourceTypeForMime(mimeType),
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary private upload error:', error.message);
          reject(new Error('Failed to store document'));
        } else {
          resolve({ publicId: result.public_id, bytes: result.bytes });
        }
      },
    );
    stream.end(buffer);
  });
};

function getSignedDocumentUrl (publicId, mimeType, ttlSeconds = 300) {
  if (publicId === 'DEV_NO_UPLOAD') {
    return null; // admin UI should render "(no preview — dev stub)" for these
  }
  const options = {
    type: 'private',
    resource_type: resourceTypeForMime(mimeType),
    secure: true,
    sign_url: true,
  };
  try {
    options.auth_token = {
      key: process.env.CLOUDINARY_API_KEY,
      secret: process.env.CLOUDINARY_API_SECRET,
      start_time: Math.floor(Date.now() / 1000),
      duration: ttlSeconds,
    };
  } catch (_e) { /* signature alone still keeps the asset private */ }
  return cloudinary.url(publicId, options);
}

async function destroyDocument (publicId, mimeType) {
  if (publicId === 'DEV_NO_UPLOAD') {
    return { result: 'ok', devStub: true };
  }
  try {
    return await cloudinary.uploader.destroy(publicId, {
      type: 'private',
      resource_type: resourceTypeForMime(mimeType),
    });
  } catch (error) {
    console.error(`Cloudinary destroy failed (${publicId}):`, error.message);
    throw error;
  }
}

module.exports = { uploadImage, uploadStream, deleteImage, getPublicIdFromUrl, uploadPrivateDocument, getSignedDocumentUrl, destroyDocument };
