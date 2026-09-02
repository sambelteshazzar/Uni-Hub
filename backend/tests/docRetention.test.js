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

// Registration only honors 'admin' in NODE_ENV=test (auth.controller forces
// other roles to 'buyer'), so promote in the DB directly (payout.test.js
// setRole pattern) when a test needs a non-admin privileged role.
const setRole = (userId, role) => {
  const { getDb } = require('../config/database');
  getDb().prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId);
};

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
      .field('university', 'atu')
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
    expect(rows[0].cloudinaryPublicId).toContain('jertscart/verifications/');
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
      .field('university', 'atu')
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
      .field('university', 'atu')
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

describe('decision sets purge deadline', () => {
  test('approve stamps documentsPurgeAt ~30 days out', async () => {
    const buyer = await registerUser('buyer', 'stampb');
    // Registration only honors 'admin' in NODE_ENV=test (auth.controller
    // forces other roles to 'buyer'), so an admin performs the approval.
    const reviewer = await registerUser('admin', 'stampa');

    const sub = await request(app)
      .post('/api/verification')
      .set('Authorization', `Bearer ${buyer.token}`)
      .field('studentId', '20701000')
      .field('fullName', 'Stamp Buyer')
      .field('email', buyer.email)
      .field('phone', '+233202000001')
      .field('university', 'atu')
      .field('level', '300')
      .field('verificationMethod', 'document')
      .attach('documents', Buffer.from([0x89, 0x50, 0x4E, 0x47]), 'id.png');
    const vid = sub.body.data.id || sub.body.data._id;

    const before = Date.now();
    const appr = await request(app)
      .put(`/api/verification/${vid}/approve`)
      .set('Authorization', `Bearer ${reviewer.token}`)
      .send({ notes: 'looks legit' });
    expect(appr.status).toBe(200);

    const { getDb } = require('../config/database');
    const row = getDb().prepare(
      'SELECT documentsPurgeAt FROM student_verifications WHERE id = ?',
    ).get(vid);
    expect(row.documentsPurgeAt).toBeTruthy();
    const deltaDays = (new Date(row.documentsPurgeAt).getTime() - before) / 86400000;
    expect(deltaDays).toBeGreaterThan(29.9);
    expect(deltaDays).toBeLessThan(30.1);
  });
});

describe('document listing endpoint', () => {
  test('issues signed URLs to moderators, denies buyers, audits the view', async () => {
    const buyer = await registerUser('buyer', 'listb');
    // Registration only honors 'admin' in NODE_ENV=test (auth.controller
    // forces other roles to 'buyer'), so a registered admin exercises the
    // privileged-viewer side of this behavior.
    const reviewer = await registerUser('admin', 'lista');

    const sub = await request(app)
      .post('/api/verification')
      .set('Authorization', `Bearer ${buyer.token}`)
      .field('studentId', '20801000')
      .field('fullName', 'List Buyer')
      .field('email', buyer.email)
      .field('phone', '+233203000001')
      .field('university', 'atu')
      .field('level', '100')
      .field('verificationMethod', 'document')
      .attach('documents', Buffer.from([0xFF, 0xD8, 0xFF, 0xDB]), 'snap.jpg');
    const vid = sub.body.data.id || sub.body.data._id;

    const denied = await request(app)
      .get(`/api/verification/${vid}/documents`)
      .set('Authorization', `Bearer ${buyer.token}`);
    expect(denied.status).toBe(403);

    const allowed = await request(app)
      .get(`/api/verification/${vid}/documents`)
      .set('Authorization', `Bearer ${reviewer.token}`);
    expect(allowed.status).toBe(200);
    expect(allowed.headers['cache-control']).toContain('no-store');
    expect(allowed.body.data.documents).toHaveLength(1);
    expect(allowed.body.data.documents[0].url).toContain('https://res.cloudinary.com/signed/');
    expect(JSON.stringify(allowed.body)).not.toContain('__cld_token__');

    // Audit entry written per call. activity_logs.action stores the action
    // string directly (CHECK-constrained enum); details are JSON WITHOUT URLs.
    const { getDb } = require('../config/database');
    const logs = getDb().prepare(
      'SELECT COUNT(*) AS n FROM activity_logs WHERE action LIKE \'%docs_viewed%\'',
    ).get();
    expect(logs.n).toBeGreaterThanOrEqual(1);
  });
});

describe('early purge endpoint', () => {
  test('admin destroys assets immediately; moderator denied; listing reflects purge', async () => {
    const buyer = await registerUser('buyer', 'purgb');
    // Moderators cannot be registered via the API in NODE_ENV=test —
    // promote a normal user in the DB so the authorize() 403 is genuine.
    const mod = await registerUser('buyer', 'purgm');
    setRole(mod.id, 'moderator');
    const admin = await registerUser('admin', 'purga');

    const sub = await request(app)
      .post('/api/verification')
      .set('Authorization', `Bearer ${buyer.token}`)
      .field('studentId', '20901000')
      .field('fullName', 'Purge Buyer')
      .field('email', buyer.email)
      .field('phone', '+233204000001')
      .field('university', 'atu')
      .field('level', '400')
      .field('verificationMethod', 'document')
      .attach('documents', Buffer.from([0x89, 0x50, 0x4E, 0x47]), 'one.png')
      .attach('documents', Buffer.from([0x89, 0x50, 0x4E, 0x47]), 'two.png');
    const vid = sub.body.data.id || sub.body.data._id;

    const denied = await request(app)
      .post(`/api/verification/${vid}/purge-documents`)
      .set('Authorization', `Bearer ${mod.token}`);
    expect(denied.status).toBe(403);

    const done = await request(app)
      .post(`/api/verification/${vid}/purge-documents`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(done.status).toBe(200);

    const stored = require('../utils/cloudinary.util').__storedAssets
      .filter(a => a.publicId.includes(vid));
    expect(stored.length).toBe(2);
    expect(stored.every(a => a.destroyed)).toBe(true);

    const { getDb } = require('../config/database');
    const dbh = getDb();
    const remaining = dbh.prepare(
      'SELECT COUNT(*) AS n FROM verification_documents WHERE verificationId = ?',
    ).get(vid).n;
    expect(remaining).toBe(0);
    expect(dbh.prepare(
      'SELECT documentsPurgedAt FROM student_verifications WHERE id = ?',
    ).get(vid).documentsPurgedAt).toBeTruthy();

    const listing = await request(app)
      .get(`/api/verification/${vid}/documents`)
      .set('Authorization', `Bearer ${mod.token}`);
    expect(listing.body.data.documents).toHaveLength(0);
    expect(listing.body.data.purged).toBe(true);
  });
});

// NOTE: this MUST stay the last describe block in the file — its
// mockImplementation replaces the shared cloudinary mock for everything
// that runs after it.
describe('retention sweep', () => {
  test('destroys expired assets, stamps parents, retries failures next run', async () => {
    const { getDb } = require('../config/database');
    const dbh = getDb();
    const past = new Date(Date.now() - 1000).toISOString();

    // userId REFERENCES users(id) and foreign_keys = ON, so 'seed-admin'
    // cannot be used directly — register a real admin row instead.
    const seedAdmin = await registerUser('admin', 'sweepa');
    const mkParent = (id) => dbh.prepare(
      'INSERT INTO student_verifications (id, userId, studentId, fullName, email, phone, university, level, verificationMethod, status, documentsPurgeAt) VALUES (?, ?, ?, \'Sweep\', \'s@test.com\', \'+233205000000\', \'University of Ghana\', \'200\', \'document\', \'approved\', ?)',
    ).run(id, seedAdmin.id, `SWEEP-${id}`, past);
    const mkDoc = (id, parentId, mime) => dbh.prepare(
      'INSERT INTO verification_documents (id, verificationId, fileName, cloudinaryPublicId, mimeType, sizeBytes) VALUES (?, ?, ?, ?, ?, 10)',
    ).run(id, parentId, `${id}.bin`, `jertscart/verifications/${parentId}/${id}`, mime);

    mkParent('sweep-A');
    mkDoc('sweep-A-1', 'sweep-A', 'image/png');
    mkParent('sweep-B');
    mkDoc('sweep-B-1', 'sweep-B', 'application/pdf');

    // Seed the mock asset registry so destroy-tracking works for these ids.
    const cUtil = require('../utils/cloudinary.util');
    ['sweep-A-1', 'sweep-B-1'].forEach((n, i) => {
      const parentId = i === 0 ? 'sweep-A' : 'sweep-B';
      const mime = i === 0 ? 'image/png' : 'application/pdf';
      if (!cUtil.__storedAssets.find(a => a.publicId === `jertscart/verifications/${parentId}/${n}`)) {
        cUtil.__storedAssets.push({ publicId: `jertscart/verifications/${parentId}/${n}`, mimeType: mime, destroyed: false });
      }
    });

    // First run: sweep-B's destroy fails exactly once.
    let bFailed = true;
    cUtil.destroyDocument.mockImplementation(async (publicId) => {
      if (publicId.includes('sweep-B') && bFailed) {
        bFailed = false;
        throw new Error('simulated cloudinary outage');
      }
      const asset = cUtil.__storedAssets.find(a => a.publicId === publicId);
      if (asset) { asset.destroyed = true; }
      return { result: 'ok' };
    });

    const { purgeExpiredVerificationDocs } = require('../services/docRetention');
    const first = await purgeExpiredVerificationDocs();
    expect(first.sweptParents).toBe(1);

    expect(dbh.prepare(
      'SELECT documentsPurgedAt FROM student_verifications WHERE id = ?',
    ).get('sweep-A').documentsPurgedAt).toBeTruthy();
    expect(dbh.prepare(
      'SELECT documentsPurgedAt FROM student_verifications WHERE id = ?',
    ).get('sweep-B').documentsPurgedAt).toBeNull();

    // Second run: B succeeds now.
    const second = await purgeExpiredVerificationDocs();
    expect(second.destroyedAssets).toBeGreaterThanOrEqual(1);
    expect(dbh.prepare(
      'SELECT documentsPurgedAt FROM student_verifications WHERE id = ?',
    ).get('sweep-B').documentsPurgedAt).toBeTruthy();
  });
});
