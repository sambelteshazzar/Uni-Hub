/**
 * Verification-document retention tests (spec 2026-08-23).
 * Cloudinary util is mocked at the top of this file so all sections share it.
 */
const request = require('supertest');
const { createTestApp } = require('./test-server');

jest.mock('../utils/cloudinary.util', () => {
  const actual = jest.requireActual('../utils/cloudinary.util');
  const stored = [];
  return {
    ...actual,
    __storedAssets: stored,
    uploadPrivateDocument: jest.fn(async (buffer, folder, mimeType) => {
      const publicId = `${folder}/mock-${stored.length + 1}`;
      stored.push({ publicId, mimeType, destroyed: false });
      return { publicId, bytes: buffer.length };
    }),
    destroyDocument: jest.fn(async (publicId) => {
      const asset = stored.find(a => a.publicId === publicId);
      if (asset) { asset.destroyed = true; }
      return { result: 'ok' };
    }),
    getSignedDocumentUrl: jest.fn(
      publicId => `https://res.cloudinary.com/signed/${publicId}`,
    ),
  };
});

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

describe('multipart verification submit', () => {
  let buyer;
  beforeEach(async () => {
    buyer = await registerUser('buyer', 'mpsub');
    require('../utils/cloudinary.util').__storedAssets.length = 0;
  });

  const pngBuf = () => Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  test('stores files as private assets with metadata rows', async () => {
    const res = await request(app)
      .post('/api/verification')
      .set('Authorization', `Bearer ${buyer.token}`)
      .field('studentId', '20651000')
      .field('fullName', 'Doc Buyer')
      .field('email', buyer.email)
      .field('phone', '+233201000001')
      .field('university', 'University of Ghana')
      .field('level', '200')
      .field('verificationMethod', 'document')
      .attach('documents', pngBuf(), 'id.png')
      .attach('documents', Buffer.from('%PDF-1.4 test'), 'letter.pdf');

    expect(res.status).toBe(201);
    const { getDb } = require('../config/database');
    const rows = getDb().prepare(
      'SELECT fileName, cloudinaryPublicId, sizeBytes, mimeType FROM verification_documents WHERE verificationId = ?',
    ).all(res.body.data.id || res.body.data._id);
    expect(rows).toHaveLength(2);
    expect(rows[0].cloudinaryPublicId).toContain('uni-hub/verifications/');
    expect(rows.find(r => r.mimeType === 'image/png')).toBeTruthy();
    expect(rows.find(r => r.mimeType === 'application/pdf')).toBeTruthy();
  });

  test('rejects disallowed content types by magic bytes', async () => {
    const res = await request(app)
      .post('/api/verification')
      .set('Authorization', `Bearer ${buyer.token}`)
      .field('studentId', '20651001')
      .field('fullName', 'Evil Buyer')
      .field('email', buyer.email)
      .field('phone', '+233201000002')
      .field('university', 'University of Ghana')
      .field('level', '200')
      .field('verificationMethod', 'document')
      .attach('documents', Buffer.from('GIF89a-not-allowed'), 'evil.gif');

    expect(res.status).toBe(400);
    expect(require('../utils/cloudinary.util').__storedAssets).toHaveLength(0);
  });

  test('rolls back uploaded assets when a later file fails validation', async () => {
    const res = await request(app)
      .post('/api/verification')
      .set('Authorization', `Bearer ${buyer.token}`)
      .field('studentId', '20651002')
      .field('fullName', 'Rollback Buyer')
      .field('email', buyer.email)
      .field('phone', '+233201000003')
      .field('university', 'University of Ghana')
      .field('level', '200')
      .field('verificationMethod', 'document')
      .attach('documents', pngBuf(), 'good.png')
      .attach('documents', Buffer.from('MZ-not-a-document'), 'fake.pdf');

    expect(res.status).toBe(400);
    const stored = require('../utils/cloudinary.util').__storedAssets;
    // fake.pdf passes the multer extension filter but fails magic-byte
    // sniffing in the controller — this exercises the ROLLBACK path:
    // good.png was already uploaded and must have been destroyed.
    expect(stored.length).toBeGreaterThanOrEqual(1);
    expect(stored.filter(a => a.destroyed)).toHaveLength(stored.length);
  });
});
