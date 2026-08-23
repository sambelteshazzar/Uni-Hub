# Verification Document Uploads Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Real verification-document uploads (Cloudinary private assets) with genuine admin review, 30-day auto-destruction, audit-logged access, and client-side PII minimization — per `docs/superpowers/specs/2026-08-23-verification-doc-uploads-design.md`.

**Architecture:** Browser uploads files via multipart to the existing `POST /api/verification` route; backend validates magic bytes, stores assets as Cloudinary **private** resources under `uni-hub/verifications/<verificationId>/`, and records metadata only in SQLite. Admins fetch fresh 5-minute signed URLs through a moderator-gated endpoint; an hourly purge service destroys assets 30 days after decision. No document bytes ever touch our database.

**Tech Stack:** Express + multer memory storage (already deps), cloudinary v2 SDK (configured in `backend/utils/cloudinary.util.js`), better-sqlite3/libSQL wrapper (`backend/utils/db.js`), supertest + jest, vanilla JS SPA frontend.

## Global Constraints

- NO new npm dependencies (multer, cloudinary already present).
- Magic-byte validation is hand-rolled: JPEG `FF D8 FF`, PNG `89 50 4E 47`, PDF `25 50 44 46` (`%PDF`). No file-type library.
- Server-enforced limits: jpg/png/pdf only, ≤5 MB per file, ≤3 files.
- Signed URLs are NEVER stored in DB or written to logs/audit payloads.
- `GET .../documents` requires role admin or moderator; purge endpoint requires admin.
- Every documents GET writes activity log entry `verification_docs_viewed`.
- Frontend: no NEW inline event handlers; escape dynamic text with `_pageEsc`.
- Backend gate after backend tasks: `cd backend && npm run lint:check && npx jest`. Final frontend gates: `npm run lint:check`, `npm run build`.
- Tests run with NODE_ENV=test, in-memory SQLite via `backend/tests/setup.js`; supertest needs `Authorization: Bearer <token>`; CSRF is skipped by the test app.
- DB wrapper APIs: `db('t').create(obj)`, `.findById(id)`, `.updateById(id, patch)`, `.find(query)`, `.rawRun(sql, params)`, `.rawGet`, `.rawAll`; tests may use `getDb().prepare(...)`.
- Test-user helper pattern (used by every test below): register via `POST /api/auth/register`, read `{ token, id }` from response.
- Commit after every task.

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `backend/config/database.js` | Modify | New columns in CREATE TABLE defs + PRAGMA migrations + legacy-row cleanup; export `runDocRetentionMigration` |
| `backend/utils/fileSignature.js` | Create | `sniffDocumentType(buffer)` magic-byte sniffing |
| `backend/utils/cloudinary.util.js` | Modify | `uploadPrivateDocument`, `getSignedDocumentUrl`, `destroyDocument` |
| `backend/middleware/upload.middleware.js` | Modify | `uploadVerificationDocs` multer instance (pdf allowed) |
| `backend/controllers/verification.controller.js` | Modify | Multipart branch, documents listing, early purge, decision stamping |
| `backend/routes/verification.routes.js` | Modify | Wire middleware + 2 new routes |
| `backend/services/docRetention.js` | Create | `purgeExpiredVerificationDocs()` sweep |
| `backend/server.js` | Modify | Hourly sweep interval |
| `backend/tests/docRetention.test.js` | Create | All backend behaviors (Cloudinary mocked) |
| `js/utils/api.js` | Modify | `verification.submitDocuments/getDocuments/purgeDocuments` |
| `js/pages/auth-pages.js` | Modify | FormData submission, consent copy, localStorage minimization |
| `js/pages/pages.js` | Modify | `viewVerificationDetail`: signed URLs, 3 states, Purge now, delegation |
| `js/admin/admin-verifications.js` | Modify | Remove local-write submit path |
| `e2e/admin-verifications-docs.spec.js` | Create | Queue render smoke test |

---

### Task 1: Schema migrations + legacy row cleanup

**Files:**
- Modify: `backend/config/database.js`
- Create: `backend/tests/docRetention.test.js`

**Interfaces:**
- Produces: columns `verification_documents.cloudinaryPublicId TEXT`, `verification_documents.sizeBytes INTEGER`, `verification_documents.mimeType TEXT`; `student_verifications.documentsPurgeAt TEXT`, `student_verifications.documentsPurgedAt TEXT`. Exported `runDocRetentionMigration(dbHandle)` deletes legacy asset-less rows once. Later tasks use these names verbatim.

- [ ] **Step 1: Write failing test**

Create `backend/tests/docRetention.test.js`:

```js
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
    dbh.prepare(
      "INSERT INTO student_verifications (id, userId, studentId, fullName, email, phone, university, level, verificationMethod, status) VALUES ('legacy-vdoc-parent', 'seed-admin', 'SID1', 'Legacy User', 'l@test.com', '+233200000000', 'University of Ghana', '100', 'document', 'approved')"
    ).run();
    dbh.prepare(
      "INSERT INTO verification_documents (id, verificationId, fileName, fileType) VALUES ('legacy-doc-row', 'legacy-vdoc-parent', 'old.pdf', 'application/pdf')"
    ).run();

    const { runDocRetentionMigration } = require('../config/database');
    await runDocRetentionMigration(dbh);

    const count = dbh.prepare(
      'SELECT COUNT(*) AS n FROM verification_documents WHERE cloudinaryPublicId IS NULL'
    ).get().n;
    expect(count).toBe(0);
  });
});
```

If `'seed-admin'` violates the users FK, first insert a user row or reuse the helper: register an admin via `registerUser('admin','seedadm')` and use its `id`.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest tests/docRetention.test.js`
Expected: FAIL — columns missing, `runDocRetentionMigration` not exported.

- [ ] **Step 3: Implement migrations**

In `backend/config/database.js`:

(a) In `SCHEMA_SQL`, extend `CREATE TABLE IF NOT EXISTS verification_documents (...)` with three lines before `uploadedAt`:

```sql
  cloudinaryPublicId TEXT,
  sizeBytes INTEGER,
  mimeType TEXT,
```

(b) In `SCHEMA_SQL`, add to `student_verifications` after `reviewNotes TEXT,`:

```sql
  documentsPurgeAt TEXT,
  documentsPurgedAt TEXT,
```

(c) Add the migration function (place near the existing local column migrations around line ~1106, following their exact style — `db.prepare(...).all()/.run()` locally):

```js
/**
 * Doc-retention migration (spec 2026-08-23): add retention columns and
 * delete legacy asset-less rows once — they predate real uploads and hold
 * nothing reviewable (fileName/size stubs).
 */
async function runDocRetentionMigration () {
  try {
    const docCols = db.prepare('PRAGMA table_info(verification_documents)').all();
    if (docCols.length > 0) {
      if (!docCols.find(c => c.name === 'cloudinaryPublicId')) {
        db.prepare('ALTER TABLE verification_documents ADD COLUMN cloudinaryPublicId TEXT').run();
      }
      if (!docCols.find(c => c.name === 'sizeBytes')) {
        db.prepare('ALTER TABLE verification_documents ADD COLUMN sizeBytes INTEGER').run();
      }
      if (!docCols.find(c => c.name === 'mimeType')) {
        db.prepare('ALTER TABLE verification_documents ADD COLUMN mimeType TEXT').run();
      }
    }
    const parentCols = db.prepare('PRAGMA table_info(student_verifications)').all();
    if (parentCols.length > 0) {
      if (!parentCols.find(c => c.name === 'documentsPurgeAt')) {
        db.prepare('ALTER TABLE student_verifications ADD COLUMN documentsPurgeAt TEXT').run();
      }
      if (!parentCols.find(c => c.name === 'documentsPurgedAt')) {
        db.prepare('ALTER TABLE student_verifications ADD COLUMN documentsPurgedAt TEXT').run();
      }
    }
    // One-time cleanup: rows without an asset are dead weight from the old
    // metadata-only flow.
    db.prepare('DELETE FROM verification_documents WHERE cloudinaryPublicId IS NULL').run();
  } catch (err) {
    console.error('Doc retention migration failed:', err.message);
  }
}
```

(d) Call `await runDocRetentionMigration();` inside `connectLocal()` right after the payouts-timestamp block (~line 1122). Add equivalent `tursoClient.execute('ALTER TABLE ...')` checks inside `runTursoMigrations()` mirroring the payouts-timestamp pattern at lines ~946–960.

(e) Export it — extend the module's exports:

```js
module.exports.runDocRetentionMigration = runDocRetentionMigration;
```

Note how the test calls it: `await runDocRetentionMigration(dbh)` — accept an optional handle parameter (`async function runDocRetentionMigration (handle)` using `handle || db`) so tests can force a re-run against the shared in-memory DB.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npx jest tests/docRetention.test.js`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/config/database.js backend/tests/docRetention.test.js
git commit -m "Add doc-retention schema migrations and legacy row cleanup"
```

---

### Task 2: Magic-byte file-type validator

**Files:**
- Create: `backend/utils/fileSignature.js`
- Modify: `backend/tests/docRetention.test.js`

**Interfaces:**
- Produces: `sniffDocumentType(buffer)` → `'image/jpeg' | 'image/png' | 'application/pdf' | null`. Null means reject.

- [ ] **Step 1: Write failing test** — append to `backend/tests/docRetention.test.js`:

```js
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
```

- [ ] **Step 2: Run to verify failure**

Run: `cd backend && npx jest tests/docRetention.test.js -t "sniffDocumentType"`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** — create `backend/utils/fileSignature.js`:

```js
// ============================================
// FILE SIGNATURE - Magic-byte type sniffing
// ============================================
// Never trust extensions or declared MIME types. Returns the sniffed MIME
// type from leading bytes, or null when the buffer matches no allowlisted
// document format. Hand-rolled on purpose: three signatures don't justify
// a dependency (AGENTS.md supply-chain rule).

const SIGNATURES = [
  { mime: 'image/jpeg', bytes: Buffer.from([0xFF, 0xD8, 0xFF]) },
  { mime: 'image/png', bytes: Buffer.from([0x89, 0x50, 0x4E, 0x47]) },
  { mime: 'application/pdf', bytes: Buffer.from('%PDF') },
];

function sniffDocumentType (buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    return null;
  }
  for (const sig of SIGNATURES) {
    if (buffer.subarray(0, sig.bytes.length).equals(sig.bytes)) {
      return sig.mime;
    }
  }
  return null;
}

module.exports = { sniffDocumentType };
```

- [ ] **Step 4: Run to verify pass**

Run: `cd backend && npx jest tests/docRetention.test.js -t "sniffDocumentType"`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/utils/fileSignature.js backend/tests/docRetention.test.js
git commit -m "Add magic-byte document type sniffer"
```

---

### Task 3: Cloudinary private-document helpers

**Files:**
- Modify: `backend/utils/cloudinary.util.js`

**Interfaces:**
- Produces:
  - `uploadPrivateDocument(buffer, folder, mimeType) → Promise<{ publicId, bytes }>`
  - `getSignedDocumentUrl(publicId, mimeType, ttlSeconds = 300) → string`
  - `destroyDocument(publicId, mimeType) → Promise<Object>`
- Consumers: Tasks 4, 6, 7, 8.

- [ ] **Step 1: Implement** — append before the module.exports line in `backend/utils/cloudinary.util.js`:

```js
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
```

Update the exports line to include the three new functions:

```js
module.exports = { uploadImage, uploadStream, deleteImage, getPublicIdFromUrl, uploadPrivateDocument, getSignedDocumentUrl, destroyDocument };
```

- [ ] **Step 2: Smoke-check syntax**

Run: `cd backend && node -e "const c=require('./utils/cloudinary.util'); ['uploadPrivateDocument','getSignedDocumentUrl','destroyDocument'].forEach(k=>{if(typeof c[k]!=='function')process.exit(1)}); console.log('ok')"`
Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add backend/utils/cloudinary.util.js
git commit -m "Add private document upload, signed URL and destroy helpers"
```

---

### Task 4: Multipart submission with rollback

**Files:**
- Modify: `backend/middleware/upload.middleware.js`, `backend/routes/verification.routes.js`, `backend/controllers/verification.controller.js`, `backend/tests/docRetention.test.js`

**Interfaces:**
- Consumes: Task 2 `sniffDocumentType`, Task 3 `uploadPrivateDocument(buffer, folder, mimeType)`, `destroyDocument(publicId, mimeType)`.
- Produces: `POST /api/verification` accepts multipart field `documents` (≤3 files, ≤5 MB, jpg/png/pdf). Rows carry `cloudinaryPublicId`, `sizeBytes`, `mimeType`. Partial failure destroys already-uploaded assets and returns 400 naming the offending file.

- [ ] **Step 1: Add the shared Cloudinary mock to the TOP of `backend/tests/docRetention.test.js`** (directly under the existing requires, so jest hoisting applies file-wide):

```js
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
      publicId => `https://res.cloudinary.com/signed/${publicId}`
    ),
  };
});
```

- [ ] **Step 2: Write failing tests** — append to `backend/tests/docRetention.test.js`:

```js
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
      'SELECT fileName, cloudinaryPublicId, sizeBytes, mimeType FROM verification_documents WHERE verificationId = ?'
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
```

- [ ] **Step 3: Run to verify failure**

Run: `cd backend && npx jest tests/docRetention.test.js -t "multipart verification submit"`
Expected: FAIL — multipart not handled / rows lack new columns values.

- [ ] **Step 4: Implement multer middleware** — append to `backend/middleware/upload.middleware.js` and extend exports:

```js
// Verification documents: PDF allowed alongside images. This transport-level
// filter is convenience only — the controller validates real content via
// magic bytes (spec 2026-08-23).
const verificationFileFilter = (req, file, cb) => {
  const ok = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'].includes(file.mimetype) ||
    /\.(jpe?g|png|pdf)$/i.test(file.originalname);
  if (ok) { cb(null, true); } else { cb(new Error('Only JPEG, PNG or PDF documents are allowed')); }
};

const uploadVerificationDocs = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 3 },
  fileFilter: verificationFileFilter,
}).array('documents', 3);
```

Add `uploadVerificationDocs` to the module's exports object.

In `backend/routes/verification.routes.js`, replace `router.post('/', protect, submitVerification);` with:

```js
const { uploadVerificationDocs } = require('../middleware/upload.middleware');

router.post('/', protect, (req, res, next) => {
  uploadVerificationDocs(req, res, (err) => {
    if (err instanceof require('multer').MulterError) {
      next(new ApiError(400, err.message));
    } else if (err) {
      next(new ApiError(400, err.message));
    } else {
      next();
    }
  });
}, submitVerification);
```

Import `ApiError` at the top of the routes file: `const { ApiError } = require('../utils/errorHandler');`. Multer passes non-multipart bodies through untouched, so the email-method JSON path still works.

- [ ] **Step 5: Implement controller branch** — in `submitVerification` (backend/controllers/verification.controller.js), REPLACE the legacy loop `if (documents && Array.isArray(documents)) {...}` with:

```js
  // Documents arrive as multipart files (memory storage). Metadata-only
  // submissions from the legacy flow are ignored — real assets only.
  if (req.files && req.files.length > 0) {
    const { sniffDocumentType } = require('../utils/fileSignature');
    const { uploadPrivateDocument, destroyDocument } = require('../utils/cloudinary.util');
    const folder = `uni-hub/verifications/${verification.id}`;
    const uploaded = [];
    try {
      for (const file of req.files) {
        const sniffed = sniffDocumentType(file.buffer);
        if (!sniffed) {
          throw new ApiError(400, `"${file.originalname}" is not a valid JPEG, PNG or PDF document`);
        }
        const asset = await uploadPrivateDocument(file.buffer, folder, sniffed);
        uploaded.push({ file, sniffed, asset });
      }
      for (const u of uploaded) {
        await db('verification_documents').create({
          verificationId: verification.id,
          fileName: u.file.originalname,
          fileUrl: '',
          fileType: u.sniffed,
          cloudinaryPublicId: u.asset.publicId,
          sizeBytes: u.file.size,
          mimeType: u.sniffed,
        });
      }
    } catch (err) {
      // Roll back any stored assets so failures leave nothing behind.
      for (const u of uploaded) {
        try { await destroyDocument(u.asset.publicId, u.sniffed); } catch (_e) { /* sweep retries */ }
      }
      throw err instanceof ApiError ? err : new ApiError(500, 'Failed to store verification documents');
    }
  }
```

Keep `documents` in the destructuring harmless (ignore its value).

- [ ] **Step 6: Run tests to verify pass**

Run: `cd backend && npx jest tests/docRetention.test.js && npx jest`
Expected: docRetention all PASS; full suite all PASS (existing verification tests unaffected).

- [ ] **Step 7: Commit**

```bash
git add backend/middleware/upload.middleware.js backend/routes/verification.routes.js backend/controllers/verification.controller.js backend/tests/docRetention.test.js
git commit -m "Accept real verification document uploads with validation and rollback"
```

### Task 5: Decision stamps documentsPurgeAt

**Files:**
- Modify: `backend/controllers/verification.controller.js`, `backend/tests/docRetention.test.js`

**Interfaces:**
- Produces: approve AND reject set `documentsPurgeAt = decision + 30 days` on the parent row. Tasks 7/8 read this column.

- [ ] **Step 1: Write failing test** — append to `backend/tests/docRetention.test.js`:

```js
describe('decision sets purge deadline', () => {
  test('approve stamps documentsPurgeAt ~30 days out', async () => {
    const buyer = await registerUser('buyer', 'stampb');
    const mod = await registerUser('moderator', 'stampm');

    const sub = await request(app)
      .post('/api/verification')
      .set('Authorization', `Bearer ${buyer.token}`)
      .field('studentId', '20701000')
      .field('fullName', 'Stamp Buyer')
      .field('email', buyer.email)
      .field('phone', '+233202000001')
      .field('university', 'University of Ghana')
      .field('level', '300')
      .field('verificationMethod', 'document')
      .attach('documents', Buffer.from([0x89, 0x50, 0x4E, 0x47]), 'id.png');
    const vid = sub.body.data.id || sub.body.data._id;

    const before = Date.now();
    const appr = await request(app)
      .put(`/api/verification/${vid}/approve`)
      .set('Authorization', `Bearer ${mod.token}`)
      .send({ notes: 'looks legit' });
    expect(appr.status).toBe(200);

    const { getDb } = require('../config/database');
    const row = getDb().prepare(
      'SELECT documentsPurgeAt FROM student_verifications WHERE id = ?'
    ).get(vid);
    expect(row.documentsPurgeAt).toBeTruthy();
    const deltaDays = (new Date(row.documentsPurgeAt).getTime() - before) / 86400000;
    expect(deltaDays).toBeGreaterThan(29.9);
    expect(deltaDays).toBeLessThan(30.1);
  });
});
```

Note: if `PUT /:id/approve` requires the verification to belong to a real user context or has extra guards (check the controller — it looks up by id and updates), adjust only the assertion mechanics, not the behavior under test.

- [ ] **Step 2: Run to verify failure**

Run: `cd backend && npx jest tests/docRetention.test.js -t "purge deadline"`
Expected: FAIL — documentsPurgeAt null.

- [ ] **Step 3: Implement** — in BOTH `approveVerification` and `rejectVerification` in `backend/controllers/verification.controller.js`, extend the existing `updateById` patch object with:

```js
    documentsPurgeAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
```

- [ ] **Step 4: Run to verify pass**

Run: `cd backend && npx jest tests/docRetention.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/controllers/verification.controller.js backend/tests/docRetention.test.js
git commit -m "Stamp 30-day document purge deadline on verification decisions"
```

---

### Task 6: Moderator document-listing endpoint with audit

**Files:**
- Modify: `backend/controllers/verification.controller.js`, `backend/routes/verification.routes.js`, `backend/tests/docRetention.test.js`

**Interfaces:**
- Consumes: Task 3 `getSignedDocumentUrl(publicId, mimeType, ttlSeconds)`.
- Produces: `GET /api/verification/:id/documents` → `{ success, data: { documents: [{ fileName, mimeType, sizeBytes, url }], purged, purgeScheduledFor } }`. Admin/moderator only. Writes activity-log entry per call; URLs never included in log details. `Cache-Control: no-store`.

- [ ] **Step 1: Write failing test** — append:

```js
describe('document listing endpoint', () => {
  test('issues signed URLs to moderators, denies buyers, audits the view', async () => {
    const buyer = await registerUser('buyer', 'listb');
    const mod = await registerUser('moderator', 'listm');

    const sub = await request(app)
      .post('/api/verification')
      .set('Authorization', `Bearer ${buyer.token}`)
      .field('studentId', '20801000')
      .field('fullName', 'List Buyer')
      .field('email', buyer.email)
      .field('phone', '+233203000001')
      .field('university', 'University of Ghana')
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
      .set('Authorization', `Bearer ${mod.token}`);
    expect(allowed.status).toBe(200);
    expect(allowed.headers['cache-control']).toContain('no-store');
    expect(allowed.body.data.documents).toHaveLength(1);
    expect(allowed.body.data.documents[0].url).toContain('https://res.cloudinary.com/signed/');
    expect(JSON.stringify(allowed.body)).not.toContain('__cld_token__');

    // Audit entry written (adjust table/column names to ACTIVITY_LOGS schema
    // in database.js if different).
    const { getDb } = require('../config/database');
    const logs = getDb().prepare(
      "SELECT COUNT(*) AS n FROM activity_logs WHERE action LIKE '%docs_viewed%'"
    ).get();
    expect(logs.n).toBeGreaterThanOrEqual(1);
  });
});
```

Before finalizing this test, inspect the ACTIVITY_LOGS schema block near the top of `backend/config/database.js` and the `logActivity` util (`backend/utils/logActivity.js`) to confirm how actions are stored (column names, JSON details shape) and adapt the LIKE pattern accordingly.

- [ ] **Step 2: Run to verify failure**

Run: `cd backend && npx jest tests/docRetention.test.js -t "document listing endpoint"`
Expected: FAIL — 404 route not found.

- [ ] **Step 3: Implement controller export**

Add imports at top of `backend/controllers/verification.controller.js`:

```js
const { getSignedDocumentUrl, destroyDocument } = require('../utils/cloudinary.util');
const logActivity = require('../utils/logActivity');
```

(Mirror the exact import/call shape used in auth.controller.js — `logActivity(action, user, details, severity, req)`.)

New export:

```js
/**
 * @desc List verification documents with fresh signed URLs (PII access audited)
 * @route GET /api/verification/:id/documents
 * @access admin/moderator
 */
exports.getVerificationDocuments = asyncHandler(async (req, res) => {
  const verification = await db('student_verifications').findById(req.params.id);
  if (!verification) {
    throw new ApiError(404, 'Verification request not found');
  }

  const docs = await db('verification_documents').find({ verificationId: verification.id });
  const documents = docs
    .filter(d => d.cloudinaryPublicId)
    .map(d => ({
      fileName: d.fileName,
      mimeType: d.mimeType || d.fileType || 'application/octet-stream',
      sizeBytes: d.sizeBytes || 0,
      url: getSignedDocumentUrl(d.cloudinaryPublicId, d.mimeType || d.fileType, 300),
    }));

  // PII access logging — who viewed which student's documents, when.
  // NEVER include the URLs themselves.
  await logActivity('verification_docs_viewed', req.user, {
    verificationId: verification.id,
    studentId: verification.studentId,
    documentCount: documents.length,
  }, 'info', req);

  res.set('Cache-Control', 'no-store');
  res.json({
    success: true,
    data: {
      documents,
      purged: !!verification.documentsPurgedAt,
      purgeScheduledFor: verification.documentsPurgeAt || null,
    },
  });
});
```

Route in `backend/routes/verification.routes.js` (needs `asyncHandler` from '../utils/errorHandler'):

```js
router.get('/:id/documents', protect, authorize('admin', 'moderator'), asyncHandler(getVerificationDocuments));
```

Add `getVerificationDocuments` to the controller destructuring at the top of the routes file.

- [ ] **Step 4: Run to verify pass**

Run: `cd backend && npx jest tests/docRetention.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/controllers/verification.controller.js backend/routes/verification.routes.js backend/tests/docRetention.test.js
git commit -m "Add audited moderator endpoint issuing short-lived signed document URLs"
```

---

### Task 7: Admin early-purge endpoint

**Files:**
- Modify: `backend/controllers/verification.controller.js`, `backend/routes/verification.routes.js`, `backend/tests/docRetention.test.js`

**Interfaces:**
- Consumes: Task 3 `destroyDocument(publicId, mimeType)`; audit middleware `auditMutation(name)` from '../middleware/audit.middleware'.
- Produces: `POST /api/verification/:id/purge-documents` (admin-only, audited) → destroys all remaining assets, deletes rows, stamps `documentsPurgedAt`.

- [ ] **Step 1: Write failing test** — append:

```js
describe('early purge endpoint', () => {
  test('admin destroys assets immediately; moderator denied; listing reflects purge', async () => {
    const buyer = await registerUser('buyer', 'purgb');
    const mod = await registerUser('moderator', 'purgm');
    const admin = await registerUser('admin', 'purga');

    const sub = await request(app)
      .post('/api/verification')
      .set('Authorization', `Bearer ${buyer.token}`)
      .field('studentId', '20901000')
      .field('fullName', 'Purge Buyer')
      .field('email', buyer.email)
      .field('phone', '+233204000001')
      .field('university', 'University of Ghana')
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
      'SELECT COUNT(*) AS n FROM verification_documents WHERE verificationId = ?'
    ).get(vid).n;
    expect(remaining).toBe(0);
    expect(dbh.prepare(
      'SELECT documentsPurgedAt FROM student_verifications WHERE id = ?'
    ).get(vid).documentsPurgedAt).toBeTruthy();

    const listing = await request(app)
      .get(`/api/verification/${vid}/documents`)
      .set('Authorization', `Bearer ${mod.token}`);
    expect(listing.body.data.documents).toHaveLength(0);
    expect(listing.body.data.purged).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd backend && npx jest tests/docRetention.test.js -t "early purge endpoint"`
Expected: FAIL — 404.

- [ ] **Step 3: Implement controller export**

```js
/**
 * @desc Immediately destroy remaining verification documents (DPA erasure)
 * @route POST /api/verification/:id/purge-documents
 * @access admin
 */
exports.purgeVerificationDocuments = asyncHandler(async (req, res) => {
  const verification = await db('student_verifications').findById(req.params.id);
  if (!verification) {
    throw new ApiError(404, 'Verification request not found');
  }

  const docs = await db('verification_documents').find({ verificationId: verification.id });
  let destroyed = 0;
  let failures = 0;
  for (const d of docs) {
    if (!d.cloudinaryPublicId) { continue; }
    try {
      await destroyDocument(d.cloudinaryPublicId, d.mimeType || d.fileType);
      destroyed++;
    } catch (_e) {
      failures++;
    }
  }
  if (failures > 0) {
    throw new ApiError(502, `Failed to destroy ${failures} asset(s) — retry shortly`);
  }

  await db('verification_documents').rawRun(
    'DELETE FROM verification_documents WHERE verificationId = ?',
    [verification.id],
  );
  await db('student_verifications').updateById(verification.id, {
    documentsPurgedAt: new Date().toISOString(),
  });

  res.json({ success: true, message: 'Documents permanently deleted', data: { destroyed } });
});
```

Route:

```js
const { auditMutation } = require('../middleware/audit.middleware');
router.post('/:id/purge-documents', protect, authorize('admin'), auditMutation('verification_docs_purge'), asyncHandler(purgeVerificationDocuments));
```

Add `purgeVerificationDocuments` and `auditMutation` imports appropriately.

- [ ] **Step 4: Run to verify pass**

Run: `cd backend && npx jest tests/docRetention.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/controllers/verification.controller.js backend/routes/verification.routes.js backend/tests/docRetention.test.js
git commit -m "Add admin immediate-purge endpoint for verification documents"
```

---

### Task 8: Retention sweep service + scheduling

**Files:**
- Create: `backend/services/docRetention.js`
- Modify: `backend/server.js`, `backend/controllers/verification.controller.js`, `backend/tests/docRetention.test.js`

**Interfaces:**
- Produces: `purgeExpiredVerificationDocs() → Promise<{ sweptParents, destroyedAssets }>`. Selects parents with `documentsPurgeAt <= now AND documentsPurgedAt IS NULL`; destroys each child asset (failures skipped for retry); deletes swept child rows; stamps parent `documentsPurgedAt` once ALL its assets are gone. Scheduled hourly in server.js (`.unref()`); invoked fire-and-forget inside `GET /verification/pending`.

- [ ] **Step 1: Write failing test** — append:

```js
describe('retention sweep', () => {
  test('destroys expired assets, stamps parents, retries failures next run', async () => {
    const { getDb } = require('../config/database');
    const dbh = getDb();
    const past = new Date(Date.now() - 1000).toISOString();

    const mkParent = (id) => dbh.prepare(
      "INSERT INTO student_verifications (id, userId, studentId, fullName, email, phone, university, level, verificationMethod, status, documentsPurgeAt) VALUES (?, 'seed-admin', ?, 'Sweep', 's@test.com', '+233205000000', 'University of Ghana', '200', 'document', 'approved', ?)"
    ).run(id, `SWEEP-${id}`, past);
    const mkDoc = (id, parentId, mime) => dbh.prepare(
      'INSERT INTO verification_documents (id, verificationId, fileName, cloudinaryPublicId, mimeType, sizeBytes) VALUES (?, ?, ?, ?, ?, 10)'
    ).run(id, parentId, `${id}.bin`, `uni-hub/verifications/${parentId}/${id}`, mime);

    mkParent('sweep-A');
    mkDoc('sweep-A-1', 'sweep-A', 'image/png');
    mkParent('sweep-B');
    mkDoc('sweep-B-1', 'sweep-B', 'application/pdf');

    // Seed the mock asset registry so destroy-tracking works for these ids.
    const cUtil = require('../utils/cloudinary.util');
    ['sweep-A-1', 'sweep-B-1'].forEach((n, i) => {
      const parentId = i === 0 ? 'sweep-A' : 'sweep-B';
      const mime = i === 0 ? 'image/png' : 'application/pdf';
      if (!cUtil.__storedAssets.find(a => a.publicId === `uni-hub/verifications/${parentId}/${n}`)) {
        cUtil.__storedAssets.push({ publicId: `uni-hub/verifications/${parentId}/${n}`, mimeType: mime, destroyed: false });
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
      'SELECT documentsPurgedAt FROM student_verifications WHERE id = ?'
    ).get('sweep-A').documentsPurgedAt).toBeTruthy();
    expect(dbh.prepare(
      'SELECT documentsPurgedAt FROM student_verifications WHERE id = ?'
    ).get('sweep-B').documentsPurgedAt).toBeNull();

    // Second run: B succeeds now.
    const second = await purgeExpiredVerificationDocs();
    expect(second.destroyedAssets).toBeGreaterThanOrEqual(1);
    expect(dbh.prepare(
      'SELECT documentsPurgedAt FROM student_verifications WHERE id = ?'
    ).get('sweep-B').documentsPurgedAt).toBeTruthy();
  });
});
```

IMPORTANT: this mockImplementation replaces the shared base mock for ALL later tests in the file — restore it after this suite with `afterEach(() => { /* re-pristine */ })` OR make this the LAST describe block in the file. Choose the latter: keep it last.

- [ ] **Step 2: Run to verify failure**

Run: `cd backend && npx jest tests/docRetention.test.js -t "retention sweep"`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `backend/services/docRetention.js`**

```js
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
```

If `db('student_verifications').rawAll(...)` does not exist as an instance method in the Db wrapper, use `db.rawAll('student_verifications', sql, params)` or the raw `getDb().prepare(...)` style — inspect `backend/utils/db.js` first and mirror whichever raw-SQL escape hatch the wrapper actually exposes (the payouts code uses `db('payouts').rawRun/rawGet`, so match that).

- [ ] **Step 4: Schedule in server.js + opportunistic convergence**

In `backend/server.js`, after routes are mounted:

```js
// Verification-document retention sweep (spec 2026-08-23): destroys assets
// 30 days after decision. Hourly; failures retry next pass.
const { purgeExpiredVerificationDocs } = require('./services/docRetention');
setInterval(() => {
  purgeExpiredVerificationDocs().catch(err =>
    console.error('[docRetention] sweep failed:', err.message));
}, 60 * 60 * 1000).unref();
```

In `getPendingVerifications` (controller), first line:

```js
  // Opportunistic sweep so low-uptime deployments still converge.
  require('../services/docRetention').purgeExpiredVerificationDocs()
    .catch(() => { /* logged inside service */ });
```

- [ ] **Step 5: Full backend gate**

Run: `cd backend && npm run lint:check && npx jest`
Expected: lint problems equal the pre-existing baseline (84 at time of writing — no NEW issues); every suite passes.

- [ ] **Step 6: Commit**

```bash
git add backend/services/docRetention.js backend/server.js backend/controllers/verification.controller.js backend/tests/docRetention.test.js
git commit -m "Add hourly verification-document retention sweep with opportunistic convergence"
```

### Task 9: api.js client methods

**Files:**
- Modify: `js/utils/api.js`

**Interfaces:**
- Produces:
  - `api.verification.submitDocuments(formData)` — multipart POST mirroring the existing `upload()` fetch pattern (Authorization header only, NO manual Content-Type so the browser sets the multipart boundary; 30s timeout race; offline-safe)
  - `api.verification.getDocuments(id)`
  - `api.verification.purgeDocuments(id)`

- [ ] **Step 1: Implement** — inside the existing `verification = { ... }` block in `js/utils/api.js` (after `getMyStatus`), add:

```js
    /**
     * Multipart document upload (spec 2026-08-23). Mirrors upload()'s fetch
     * pattern: FormData must NOT get a manual Content-Type header — the
     * browser sets it with the correct boundary.
     */
    submitDocuments: formData => {
      if (this.isStaticDeploy) {
        return Promise.resolve({ success: false, data: null, isOffline: true });
      }
      const fullUrl = this.baseURL + '/verification';
      const token = this.getTokenFor(fullUrl);
      return Promise.race([
        fetch(fullUrl, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), this.timeout)),
      ])
        .then(r => r.json().catch(() => ({ success: false, error: 'Malformed server response' })))
        .catch(error => ({ success: false, error: error.message }));
    },
    getDocuments: id => this.get(`/verification/${encodeURIComponent(id)}/documents`),
    purgeDocuments: id => this.post(`/verification/${encodeURIComponent(id)}/purge-documents`),
```

CSRF note: mutating requests through `this.request()` attach a CSRF token automatically; the multipart path bypasses `request()` exactly like `upload()` does. If live testing hits a CSRF 403 on POST /verification, first try switching to `this.request('/verification', { method: 'POST', body: formData })` and verify `request()` does not force the JSON Content-Type for FormData bodies; if it does, add the CSRF header manually via the same `fetchCsrfToken()` helper `request()` uses.

- [ ] **Step 2: Verify frontend gates**

Run: `npx eslint js/utils/api.js && npm run build`
Expected: no NEW eslint errors vs baseline; build succeeds.

- [ ] **Step 3: Commit**

```bash
git add js/utils/api.js
git commit -m "Add verification document client methods to api singleton"
```

---

### Task 10: Student submission UI + consent copy + localStorage minimization

**Files:**
- Modify: `js/pages/auth-pages.js`

**Interfaces:**
- Consumes: Task 9 `api.verification.submitDocuments(formData)`; field name `documents` matching Task 4's multer config.
- Produces: real uploads from the document tab; retention consent sentence; PII-minimal localStorage payload.

- [ ] **Step 1: Rework the document submit handler (~lines 383–437)**

Keep the existing 5MB size-check loop. Replace the `documents:` metadata array and the API call block so that submission builds FormData:

```js
    const files = Array.from(form.docDocuments.files || []);
```

(the input element is the one bound to the existing file checks — reuse its actual name from the template if not `docDocuments`).

Replace the `try { ... } catch (e) {...}` API block with:

```js
    // Submit to backend API for proper verification
    try {
      const session = StorageManager.get(STORAGE_KEYS.SESSION, true);
      if (api && session?.token) {
        if (files.length === 0) {
          showToast('Please attach at least one admission document.', 'warning');
          return;
        }
        const fd = new FormData();
        fd.append('studentId', form.docStudentId.value.trim());
        fd.append('fullName', form.docFullName.value.trim());
        fd.append('email', form.docEmail.value.trim());
        fd.append('phone', form.docPhone.value.trim());
        fd.append('university', selectedUniversity);
        fd.append('level', form.docLevel.value);
        fd.append('verificationMethod', 'document');
        files.forEach(f => fd.append('documents', f));

        const response = await api.verification.submitDocuments(fd);

        if (response.success) {
          // PII-minimal local cache (spec 2026-08-23): no documents list,
          // no phone number.
          StorageManager.set(STORAGE_KEYS.STUDENT_VERIFICATION, {
            universityId: selectedUniversity,
            verificationMethod: 'document',
            isVerified: false,
            isPending: true,
            submittedAt: new Date().toISOString(),
          });
          showToast(`Verification Submitted! Thank you, ${form.docFullName.value.trim()}! Your documents have been submitted for verification. You will be notified within 24-48 hours once your student status is confirmed. You must be verified before making any purchases.`, 'success');
          Pages.renderBrowse();
          return;
        }
        showToast(response.error || 'Document upload failed. Please check your files and try again.', 'error');
        return;
      }
    } catch (e) {
      console.warn('auth-pages: document verification API unreachable:', e);
    }

    showToast('Cannot connect to server. Please check your internet connection and try again.', 'error');
```

Note what was REMOVED vs the old code: the `documents:` array in any StorageManager.set payload, and the `adminVerificationsManager.submit(verificationData)` call (Task 12 removes that manager path entirely).

- [ ] **Step 2: Add the retention consent sentence**

In the document-tab template near `<small class="form-hint">Upload clear photos/scans of your admission documents</small>` (~line 252), add directly below:

```html
<small class="form-hint" style="display:block;margin-top:0.25rem;">Documents are viewable only by moderators and are permanently deleted 30 days after your review.</small>
```

- [ ] **Step 3: Verify frontend gates**

Run: `npx eslint js/pages/auth-pages.js && npm run build`
Expected: no NEW eslint errors vs baseline; build succeeds.

- [ ] **Step 4: Commit**

```bash
git add js/pages/auth-pages.js
git commit -m "Submit real verification documents and minimize locally stored PII"
```

---

### Task 11: Admin modal rework — signed URLs, three states, Purge now, delegation

**Files:**
- Modify: `js/pages/pages.js`

**Interfaces:**
- Consumes: Task 9 `api.verification.getDocuments(id)`, `api.verification.purgeDocuments(id)`.
- Produces: `viewVerificationDetail(id)` becomes async-aware of documents: renders live docs (images inline via escaped URL, PDFs as links), "Purging on \<date\>" state, "Documents deleted" state; admin-only working "Purge now" button using event delegation.

- [ ] **Step 1: Make `viewVerificationDetail` async and fetch documents**

Change the signature to `static async viewVerificationDetail (id)`. After the existing lookup/guard block (`const v = adminVerificationsManager.getById(id); if (!v) {...}`), insert:

```js
    // Fresh signed URLs on EVERY open — never cached, never persisted.
    let docsState = { documents: [], purged: false, purgeScheduledFor: null };
    try {
      const resp = await api.verification.getDocuments(v.id);
      if (resp.success && resp.data) {
        docsState = resp.data;
      }
    } catch (_) { /* non-fatal: render modal without doc section */ }
```

- [ ] **Step 2: Render the document section with three states**

Build the section HTML before creating the overlay:

```js
    const esc = v2 => _pageEsc(String(v2 === null || v2 === undefined ? '' : v2));
    let docsSection;
    if (docsState.purged || (!docsState.documents.length && docsState.purgeScheduledFor)) {
      docsSection = `
        <div style="padding:1rem;text-align:center;color:#6b7280;border:1px dashed rgba(255,255,255,0.15);border-radius:0.5rem;">
          🗑 Documents permanently deleted${v.reviewedAt ? ` (decision ${esc(Formatter.formatDate(v.reviewedAt))})` : ''}
        </div>`;
    } else if (docsState.documents.length > 0) {
      const items = docsState.documents.map(d => {
        if (d.mimeType === 'application/pdf') {
          return `<a href="${esc(d.url)}" target="_blank" rel="noopener noreferrer" data-doc-link style="display:block;padding:0.5rem;background:#1f2937;border-radius:0.5rem;color:#60a5fa;font-size:0.85rem;">📄 ${esc(d.fileName)}</a>`;
        }
        return `<img src="${esc(d.url)}" alt="${esc(d.fileName)}" style="max-width:100%;max-height:280px;display:block;margin:0.5rem auto;border-radius:0.5rem;" />`;
      }).join('');
      const purgeNote = docsState.purgeScheduledFor
        ? `<div style="font-size:0.75rem;color:#f59e0b;margin-top:0.5rem;">⏳ Auto-deletes ${esc(Formatter.formatDate(docsState.purgeScheduledFor))}</div>`
        : '';
      const purgeBtn = adminAuthManager.getCurrentUser()?.role === 'admin'
        ? `<button type="button" data-purge-docs="${esc(v.id)}" style="margin-top:0.5rem;padding:4px 10px;font-size:11px;background:#dc2626;color:#fff;border:none;border-radius:4px;cursor:pointer;">🗑 Purge now</button>`
        : '';
      docsSection = `
        <div style="border:1px solid rgba(255,255,255,0.1);border-radius:0.5rem;padding:0.75rem;">
          ${items}
          ${purgeNote}
          ${purgeBtn}
        </div>`;
    } else {
      docsSection = `
        <div style="padding:1rem;text-align:center;color:#6b7280;border:1px dashed rgba(255,255,255,0.15);border-radius:0.5rem;">
          No documents attached to this request
        </div>`;
    }
```

Signed URLs expire after 5 minutes (spec error-handling requirement). Handle it: attach a one-shot refetch to image elements —

```js
    // Signed URLs expire after 300s; refetch fresh ones once on load error.
    let refetched = false;
    overlay.addEventListener('error', e => {
      if (refetched || e.target.tagName !== 'IMG') { return; }
      refetched = true;
      void Pages.viewVerificationDetail(id);
    }, true);
```

(The capture-phase listener catches IMG error events, which do not bubble.)

Insert `${docsSection}` into the overlay body under an `<h4>Verification documents</h4>` heading. Signed URLs are rendered through `_pageEsc` into `src`/`href`; they come from our own backend but escaping stays mandatory per AGENTS.md.

- [ ] **Step 3: Wire actions by delegation (no new inline handlers)**

After appending the overlay to the DOM, replace/augment its wiring:

```js
    overlay.addEventListener('click', async e => {
      if (e.target === overlay) { overlay.remove(); return; }
      const purgeBtn = e.target.closest('[data-purge-docs]');
      if (!purgeBtn) { return; }
      const vid = purgeBtn.dataset.purgeDocs;
      if (!window.confirm('Permanently delete all documents for this request now? This cannot be undone.')) { return; }
      purgeBtn.disabled = true;
      try {
        const resp = await api.verification.purgeDocuments(vid);
        if (resp.success) {
          showToast('Documents permanently deleted', 'success');
          overlay.remove();
          Pages.renderAdminVerifications(Pages._verifFilter || 'pending');
        } else {
          showToast(resp.error || 'Failed to delete documents', 'error');
          purgeBtn.disabled = false;
        }
      } catch (err) {
        showToast(err.message || 'Failed to delete documents', 'error');
        purgeBtn.disabled = false;
      }
    });
```

Preserve whatever close-on-backdrop behavior the existing modal already has — merge with it rather than duplicating listeners. If the existing modal body uses inline onclick attributes for its own buttons (it does), leave those untouched in this task EXCEPT where you are already editing them; flag any handler you touch with the AGENTS.md TODO comment. Also store the current filter on the Pages object when filter buttons are clicked (`Pages._verifFilter = filter`) inside `renderAdminVerifications`, so the re-render after purging returns to the same tab.

- [ ] **Step 4: Verify frontend gates**

Run: `npx eslint js/pages/pages.js && npm run build`
Expected: no NEW errors vs baseline; build succeeds.

- [ ] **Step 5: Commit**

```bash
git add js/pages/pages.js
git commit -m "Rework verification detail modal for signed document viewing and early purge"
```

---

### Task 12: Remove the local-write queue path in admin-verifications.js

**Files:**
- Modify: `js/admin/admin-verifications.js`

**Interfaces:**
- Produces: `submit()` no longer writes to localStorage or the local array — the backend queue is authoritative. Callers (none after Task 10) are unaffected because the method remains as a no-op with a console.warn? NO — delete the method entirely and fix any references found by grep.

- [ ] **Step 1: Delete `submit()`**

Remove the whole `submit (data) {...}` method (~line 99–115 including its logActivity call). Then grep for callers:

Run: `rg -n "adminVerificationsManager.submit" js/`
Expected: zero results after Task 10's edit (fix any stragglers by deleting the call lines).

Also confirm `init()`'s backend-fetch merge loop does NOT write document fields into localStorage — it doesn't today (verified: it maps scalar fields only), so no change needed there.

- [ ] **Step 2: Verify frontend gates**

Run: `npx eslint js/admin/admin-verifications.js && npm run lint:check && npm run build`
Expected: no NEW errors; build passes.

- [ ] **Step 3: Commit**

```bash
git add js/admin/admin-verifications.js
git commit -m "Make backend the sole source of the verification queue"
```

---

### Task 13: E2E smoke + full verification chain

**Files:**
- Create: `e2e/admin-verifications-docs.spec.js`

**Interfaces:**
- Consumes: `e2e/helpers/admin-auth.js` `injectAdminSession(page, request)` helper used by other admin specs; Playwright webServer auto-starts both services.

- [ ] **Step 1: Write the smoke spec**

Create `e2e/admin-verifications-docs.spec.js`:

```js
// Smoke: admin verifications page + document states render after the
// doc-retention change (spec 2026-08-23). Full upload flow is covered by
// backend jest suites with mocked Cloudinary.
const { test, expect } = require('@playwright/test');
const { injectAdminSession } = require('./helpers/admin-auth');

test.describe('admin verifications with document states', () => {
  test.beforeEach(async ({ page, request }) => {
    await injectAdminSession(page, request);
  });

  test('verifications page loads with sidebar and stats', async ({ page }) => {
    await page.goto('/#/admin/verifications');
    await expect(page.locator('.admin-title')).toContainText(/Verifications/i);
    await expect(page.locator('.admin-sidebar')).toBeVisible();
  });

  test('payouts page still loads (adjacent admin surface regression)', async ({ page }) => {
    await page.goto('/#/admin/payouts');
    await expect(page.locator('.admin-title')).toContainText(/Payouts/i);
  });
});
```

Match the exact import/export shape of `e2e/helpers/admin-auth.js` and the assertions style of `e2e/admin.spec.js` when writing the final file (inspect both first).

- [ ] **Step 2: Run the smoke tests**

Run: `npx playwright test e2e/admin-verifications-docs.spec.js`
Expected: PASS

- [ ] **Step 3: Full verification chain**

Run:
```bash
cd backend && npm run lint:check && npx jest
cd .. && npm run lint:check && npx prettier --check "js/**/*.js" || true
npm run build
npx playwright test e2e/admin.spec.js e2e/admin-session-persists.spec.js
```
Expected: backend lint baseline unchanged; all jest suites green; build succeeds; pre-existing admin specs stay green. (prettier --check is informational here — repo-wide baseline already fails; ensure YOUR touched files gained no new violations.)

- [ ] **Step 4: Commit**

```bash
git add e2e/admin-verifications-docs.spec.js
git commit -m "Add admin verifications document-states e2e smoke"
```

---

## Manual acceptance checklist (post-implementation, dev environment)

1. Configure real Cloudinary creds in `backend/.env`, restart backend.
2. Submit a document-method verification as `sarah@student.upsa.edu.gh / Student123!` with a PNG + PDF → toast succeeds; Cloudinary media library shows private assets under `uni-hub/verifications/<id>/`.
3. Log in as admin at `/#/admin/login` (`admin@unihub.local / Admin123!`), open Verifications → View → images/PDF render; server log shows a `verification_docs_viewed` entry WITHOUT any URL.
4. Approve → detail shows "Auto-deletes <date>"; clicking "Purge now" empties Cloudinary folder + rows, shows "Documents deleted".
5. Reject-path: reject another request → same purge deadline stamped.


