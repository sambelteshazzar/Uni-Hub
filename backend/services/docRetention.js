// ============================================
// DOC RETENTION SERVICE - Verification document lifecycle
// ============================================
// Destroys verification documents 30 days after their decision (spec
// 2026-08-23). Idempotent: safe to run repeatedly; assets whose destroy
// fails are retried next invocation; a parent is stamped documentsPurgedAt
// only once ALL its assets are gone.

const { db } = require('../utils/db');
const { destroyDocument } = require('../utils/cloudinary.util');

async function purgeExpiredVerificationDocs () {
  const now = new Date().toISOString();
  const parents = await db('student_verifications').rawAll(
    'SELECT id FROM student_verifications WHERE documentsPurgeAt IS NOT NULL AND documentsPurgedAt IS NULL AND documentsPurgeAt <= ?',
    [now],
  );

  let destroyedAssets = 0;
  let sweptParents = 0;

  for (const parent of parents) {
    const docs = await db('verification_documents').find({ verificationId: parent.id });
    let allGone = true;

    for (const d of docs) {
      if (!d.cloudinaryPublicId) { continue; }
      try {
        await destroyDocument(d.cloudinaryPublicId, d.mimeType || d.fileType || 'image/png');
        await db('verification_documents').rawRun(
          'DELETE FROM verification_documents WHERE id = ?',
          [d.id],
        );
        destroyedAssets++;
      } catch (error) {
        console.warn(`[docRetention] retry scheduled for ${d.cloudinaryPublicId}: ${error.message}`);
        allGone = false;
      }
    }

    if (allGone) {
      await db('student_verifications').updateById(parent.id, {
        documentsPurgedAt: new Date().toISOString(),
      });
      sweptParents++;
    }
  }

  return { sweptParents, destroyedAssets };
}

module.exports = { purgeExpiredVerificationDocs };
