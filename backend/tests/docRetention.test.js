/**
 * Verification-document retention tests (spec 2026-08-23).
 * Cloudinary util is mocked at the top of this file so all sections share it.
 */
const request = require('supertest');
const { createTestApp } = require('./test-server');

const app = createTestApp();

async function registerUser (role = 'buyer', prefix = 'vdoc') {
  const user = {
    ...global.testUtils.generateTestUser(),
    role,
    email: `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`,
  };
  const res = await request(app).post('/api/auth/register').send(user);
  return { token: res.body.data.token, id: res.body.data.user._id, email: user.email };
}

describe('doc retention schema', () => {
  test('new columns exist on both tables', async () => {
    const { getDb } = require('../config/database');
    const dbh = getDb();
    const docCols = dbh.prepare('PRAGMA table_info(verification_documents)').all().map(c => c.name);
    const parentCols = dbh.prepare('PRAGMA table_info(student_verifications)').all().map(c => c.name);
    expect(docCols).toEqual(expect.arrayContaining(['cloudinaryPublicId', 'sizeBytes', 'mimeType']));
    expect(parentCols).toEqual(expect.arrayContaining(['documentsPurgeAt', 'documentsPurgedAt']));
  });

  test('legacy asset-less doc rows are removed by migration', async () => {
    const { getDb } = require('../config/database');
    const dbh = getDb();
    // userId REFERENCES users(id) and foreign_keys = ON, so 'seed-admin'
    // cannot be used directly — register a real admin row instead.
    const seedAdmin = await registerUser('admin', 'seedadm');
    dbh.prepare(
      'INSERT INTO student_verifications (id, userId, studentId, fullName, email, phone, university, level, verificationMethod, status) VALUES (\'legacy-vdoc-parent\', ?, \'SID1\', \'Legacy User\', \'l@test.com\', \'+233200000000\', \'University of Ghana\', \'100\', \'document\', \'approved\')',
    ).run(seedAdmin.id);
    dbh.prepare(
      'INSERT INTO verification_documents (id, verificationId, fileName, fileType) VALUES (\'legacy-doc-row\', \'legacy-vdoc-parent\', \'old.pdf\', \'application/pdf\')',
    ).run();

    const { runDocRetentionMigration } = require('../config/database');
    await runDocRetentionMigration(dbh);

    const count = dbh.prepare(
      'SELECT COUNT(*) AS n FROM verification_documents WHERE cloudinaryPublicId IS NULL',
    ).get().n;
    expect(count).toBe(0);
  });
});

describe('fileSignature.sniffDocumentType', () => {
  const { sniffDocumentType } = require('../utils/fileSignature');

  test('recognizes JPEG magic bytes', () => {
    expect(sniffDocumentType(Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]))).toBe('image/jpeg');
  });
  test('recognizes PNG magic bytes', () => {
    expect(sniffDocumentType(Buffer.from([0x89, 0x50, 0x4E, 0x47]))).toBe('image/png');
  });
  test('recognizes PDF magic bytes', () => {
    expect(sniffDocumentType(Buffer.from('%PDF-1.7'))).toBe('application/pdf');
  });
  test('rejects GIF, SVG/text and empty buffers', () => {
    expect(sniffDocumentType(Buffer.from('GIF89a'))).toBeNull();
    expect(sniffDocumentType(Buffer.from('<svg>'))).toBeNull();
    expect(sniffDocumentType(Buffer.alloc(0))).toBeNull();
  });
});
