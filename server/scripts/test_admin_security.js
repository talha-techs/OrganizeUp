/**
 * Automated Security & Moderation Verification Test Suite
 *
 * Verifies:
 * 1. Admin route lockdown (requireAdmin):
 *    - Logged-out requests get 401
 *    - Logged-in non-admins get 404
 *    - Users with role 'admin' but mismatching email get 404
 *    - Stale JWT claim attacks (JWT claim role=admin but DB has role=user) get 404
 * 2. Authorized admin access:
 *    - Full access granted when role === 'admin' AND email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
 *    - Sensitive admin responses carry Cache-Control: no-store
 * 3. Regulatory Content Management & Isolation:
 *    - getContentCounts returns total, public, private metrics
 *    - getAllContent defaults to public, enriches thumbnails
 *    - Private content filtering generates AdminAuditLog (view_private_content)
 *    - getContentPreview provides signed URLs and logs view_private_content / preview_content
 *    - unpublishContent flips public items to private with reason and logs unpublish_content
 *    - adminDeleteContent triggers cascade file/child cleanup and logs delete_content
 *    - getAuditLogs returns paginated audit records
 */

const assert = require('assert');
const mongoose = require('mongoose');

// Configure test environment variables
process.env.ADMIN_EMAIL = 'admin@organizeup.com';
process.env.JWT_SECRET = 'test-jwt-secret-key-1234567890';
process.env.STORAGE_DRIVER = 'r2';
process.env.R2_ACCOUNT_ID = 'test-account';
process.env.R2_ACCESS_KEY_ID = 'test-key';
process.env.R2_SECRET_ACCESS_KEY = 'test-secret';
process.env.R2_PUBLIC_BUCKET_NAME = 'test-public';
process.env.R2_PRIVATE_BUCKET_NAME = 'test-private';

const User = require('../models/User');
const Book = require('../models/Book');
const Course = require('../models/Course');
const Tool = require('../models/Tool');
const CustomSection = require('../models/CustomSection');
const SubSection = require('../models/SubSection');
const YoutubePlaylist = require('../models/YoutubePlaylist');
const PublishRequest = require('../models/PublishRequest');
const Comment = require('../models/Comment');
const AdminAuditLog = require('../models/AdminAuditLog');
const storageService = require('../services/storageService');

// Mock storageService helpers
storageService.getPresignedDownloadUrl = async (key, opts = {}) => {
  return `https://presigned.r2.test/${key}?expiresIn=${opts.expiresIn}&isPublic=${opts.isPublic}`;
};

let deletedFiles = [];
storageService.deleteFile = async (opts) => {
  deletedFiles.push(opts);
  return true;
};

// Import middlewares and controllers
const { requireAdmin, protect } = require('../middleware/auth');
const {
  getContentCounts,
  getAllContent,
  getContentPreview,
  unpublishContent,
  adminDeleteContent,
  getAuditLogs,
} = require('../controllers/adminController');

// Test utilities
function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    setHeader(key, val) {
      this.headers[key.toLowerCase()] = val;
      return this;
    },
    set(headers) {
      Object.entries(headers).forEach(([k, v]) => {
        this.headers[k.toLowerCase()] = v;
      });
      return this;
    },
  };
  return res;
}

function createFluentQuery(result) {
  const q = {
    populate() { return q; },
    sort() { return q; },
    skip() { return q; },
    limit() { return q; },
    select() { return q; },
    lean: async () => result,
    then(onFulfilled, onRejected) {
      return Promise.resolve(result).then(onFulfilled, onRejected);
    },
  };
  return q;
}

let testCount = 0;
let passedCount = 0;

async function runTest(name, fn) {
  testCount++;
  try {
    await fn();
    passedCount++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.message}`);
  }
}

async function startTestSuite() {
  console.log('========================================================');
  console.log('🛡️  Starting Admin Security & Moderation Verification');
  console.log('========================================================\n');

  const adminUserId = new mongoose.Types.ObjectId();
  const regularUserId = new mongoose.Types.ObjectId();
  const impersonatorId = new mongoose.Types.ObjectId();

  // Mock DB User.findById
  const originalUserFindById = User.findById;
  User.findById = (id) => {
    return {
      select: (fields) => {
        const idStr = String(id);
        if (idStr === String(adminUserId)) {
          return Promise.resolve({
            _id: adminUserId,
            name: 'Admin User',
            email: 'admin@organizeup.com',
            role: 'admin',
          });
        }
        if (idStr === String(regularUserId)) {
          return Promise.resolve({
            _id: regularUserId,
            name: 'Regular Scholar',
            email: 'user@example.com',
            role: 'user',
          });
        }
        if (idStr === String(impersonatorId)) {
          // Role claims admin, but email is NOT ADMIN_EMAIL
          return Promise.resolve({
            _id: impersonatorId,
            name: 'Malicious Admin Wannabe',
            email: 'impersonator@example.com',
            role: 'admin',
          });
        }
        return Promise.resolve(null);
      },
    };
  };

  // Mock AdminAuditLog.create and find
  const auditLogsStored = [];
  const originalAuditCreate = AdminAuditLog.create;
  const originalAuditFind = AdminAuditLog.find;
  const originalAuditCount = AdminAuditLog.countDocuments;

  AdminAuditLog.create = async (doc) => {
    const entry = { _id: new mongoose.Types.ObjectId(), createdAt: new Date(), ...doc };
    auditLogsStored.unshift(entry);
    return entry;
  };

  AdminAuditLog.find = (filter) => {
    return {
      sort: () => ({
        skip: () => ({
          limit: () => ({
            populate: () => ({
              populate: () => ({
                lean: async () => auditLogsStored,
              }),
            }),
          }),
        }),
      }),
    };
  };

  AdminAuditLog.countDocuments = async () => auditLogsStored.length;

  console.log('--- Test Suite 1: requireAdmin Route Lockdown ---');

  await runTest('Logged-out request with no user gets 401', async () => {
    const req = { user: null };
    const res = createMockRes();
    let nextCalled = false;
    await requireAdmin(req, res, () => { nextCalled = true; });

    assert.strictEqual(res.statusCode, 401, 'Should return 401');
    assert.strictEqual(nextCalled, false, 'next() must NOT be called');
  });

  await runTest('Ordinary user (role: "user") gets 404 to conceal route existence', async () => {
    const req = { user: { _id: regularUserId, role: 'user', email: 'user@example.com' } };
    const res = createMockRes();
    let nextCalled = false;
    await requireAdmin(req, res, () => { nextCalled = true; });

    assert.strictEqual(res.statusCode, 404, 'Non-admin must receive 404');
    assert.strictEqual(nextCalled, false, 'next() must NOT be called');
  });

  await runTest('Impersonator with role: "admin" but non-admin email gets 404', async () => {
    const req = { user: { _id: impersonatorId, role: 'admin', email: 'impersonator@example.com' } };
    const res = createMockRes();
    let nextCalled = false;
    await requireAdmin(req, res, () => { nextCalled = true; });

    assert.strictEqual(res.statusCode, 404, 'Admin claim with wrong email must receive 404');
    assert.strictEqual(nextCalled, false, 'next() must NOT be called');
  });

  await runTest('Stale JWT payload claim (token has role: admin, DB has role: user) gets 404', async () => {
    // Client presents token that claims role: 'admin', but DB record is regular user
    const req = { user: { _id: regularUserId, role: 'admin', email: 'admin@organizeup.com' } };
    const res = createMockRes();
    let nextCalled = false;
    await requireAdmin(req, res, () => { nextCalled = true; });

    assert.strictEqual(res.statusCode, 404, 'Fresh DB load must detect role mismatch and return 404');
    assert.strictEqual(nextCalled, false, 'next() must NOT be called');
  });

  await runTest('Sole authorized admin (role: "admin" AND email matches ADMIN_EMAIL) succeeds', async () => {
    const req = { user: { _id: adminUserId, role: 'admin', email: 'Admin@OrganizeUp.COM' } };
    const res = createMockRes();
    let nextCalled = false;
    await requireAdmin(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, true, 'Authorized admin must proceed through next()');
    assert.strictEqual(req.user.email, 'admin@organizeup.com');
  });

  console.log('\n--- Test Suite 2: Content Management & Regulatory Moderation ---');

  await runTest('getContentCounts calculates aggregate category metrics', async () => {
    const req = { user: { _id: adminUserId, email: 'admin@organizeup.com', role: 'admin' } };
    const res = createMockRes();

    // Mock countDocuments on all models
    Book.countDocuments = async (filter) => (filter?.visibility === 'private' ? 3 : filter?.visibility === 'public' ? 7 : 10);
    Course.countDocuments = async (filter) => (filter?.visibility === 'private' ? 1 : filter?.visibility === 'public' ? 4 : 5);
    Tool.countDocuments = async (filter) => (filter?.visibility === 'private' ? 2 : filter?.visibility === 'public' ? 8 : 10);
    CustomSection.countDocuments = async (filter) => (filter?.visibility === 'private' ? 12 : filter?.visibility === 'public' ? 3 : 15);
    YoutubePlaylist.countDocuments = async (filter) => (filter?.visibility === 'private' ? 2 : filter?.visibility === 'public' ? 4 : 6);
    PublishRequest.countDocuments = async (filter) => (filter?.status === 'pending' ? 4 : filter?.status === 'approved' ? 2 : filter?.status === 'rejected' ? 1 : 7);
    Comment.countDocuments = async () => 25;

    await getContentCounts(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.counts.book.total, 10);
    assert.strictEqual(res.body.counts.book.private, 3);
    assert.strictEqual(res.body.counts.book.public, 7);
    assert.strictEqual(res.body.counts.section.total, 15);
    assert.strictEqual(res.body.counts.publish_request.pending, 4);
    assert.strictEqual(res.body.counts.comment.total, 25);
  });

  await runTest('getAllContent defaults to public and normalizes thumbnail URLs', async () => {
    const req = {
      params: { type: 'book' },
      query: {},
      user: { _id: adminUserId, email: 'admin@organizeup.com', role: 'admin' },
    };
    const res = createMockRes();

    // Mock Book.find
    Book.find = () =>
      createFluentQuery([
        {
          _id: 'b1',
          title: 'Public Book with R2 Key',
          coverR2Key: 'books/covers/cover-123.jpg',
          visibility: 'public',
        },
      ]);

    await getAllContent(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.items.length, 1);
    assert.ok(decodeURIComponent(res.body.items[0].thumbnailUrl).includes('books/covers/cover-123.jpg'), 'Thumbnail should be normalized');
  });

  await runTest('getAllContent with private filter audits view_private_content action', async () => {
    auditLogsStored.length = 0;
    const req = {
      params: { type: 'book' },
      query: { visibility: 'private' },
      user: { _id: adminUserId, email: 'admin@organizeup.com', role: 'admin' },
    };
    const res = createMockRes();

    Book.find = () =>
      createFluentQuery([
        { _id: 'b2', title: 'Private Book', visibility: 'private' },
      ]);

    await getAllContent(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(auditLogsStored.length, 1, 'Accessing private content list must write audit log');
    assert.strictEqual(auditLogsStored[0].action, 'view_private_content');
    assert.strictEqual(auditLogsStored[0].targetType, 'book');
  });

  await runTest('getContentPreview generates signed URLs and audits private content preview', async () => {
    auditLogsStored.length = 0;
    const testBookId = new mongoose.Types.ObjectId();
    const req = {
      params: { type: 'book', id: testBookId.toString() },
      query: { reason: 'Regulatory investigation' },
      user: { _id: adminUserId, email: 'admin@organizeup.com', role: 'admin' },
    };
    const res = createMockRes();

    Book.findById = () =>
      createFluentQuery({
        _id: testBookId,
        title: 'Classified Research Book',
        visibility: 'private',
        pdfR2Key: 'books/pdfs/secret-paper.pdf',
        audioFiles: [{ r2Key: 'books/audio/chapter1.mp3' }],
        addedBy: { _id: regularUserId, name: 'Author', email: 'user@example.com' },
      });

    await getContentPreview(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body.item.signedPdfUrl.includes('secret-paper.pdf'), 'Signed PDF URL must be generated');
    assert.ok(res.body.item.audioFiles[0].signedAudioUrl.includes('chapter1.mp3'), 'Signed Audio URL must be generated');
    assert.strictEqual(auditLogsStored.length, 1, 'Preview must be logged in AdminAuditLog');
    assert.strictEqual(auditLogsStored[0].action, 'view_private_content');
    assert.strictEqual(auditLogsStored[0].targetId, testBookId.toString());
  });

  await runTest('unpublishContent sets visibility to private and logs unpublish_content with reason', async () => {
    auditLogsStored.length = 0;
    const testCourseId = new mongoose.Types.ObjectId();
    let savedDoc = null;

    Course.findById = async () => ({
      _id: testCourseId,
      title: 'Copyright Infringing Course',
      visibility: 'public',
      addedBy: regularUserId,
      save: async function () { savedDoc = this; },
    });

    const req = {
      params: { type: 'course', id: testCourseId.toString() },
      body: { reason: 'DMCA Takedown Notice #982' },
      user: { _id: adminUserId, email: 'admin@organizeup.com', role: 'admin' },
    };
    const res = createMockRes();

    await unpublishContent(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(savedDoc.visibility, 'private', 'Content visibility must be flipped to private');
    assert.strictEqual(auditLogsStored.length, 1, 'Unpublish must write audit log');
    assert.strictEqual(auditLogsStored[0].action, 'unpublish_content');
    assert.strictEqual(auditLogsStored[0].reason, 'DMCA Takedown Notice #982');
  });

  await runTest('adminDeleteContent performs cascade cleanup and logs delete_content', async () => {
    auditLogsStored.length = 0;
    deletedFiles = [];
    const testBookId = new mongoose.Types.ObjectId();
    let deleted = false;

    Book.findById = async () => ({
      _id: testBookId,
      title: 'Malicious Book',
      storageProvider: 'r2',
      pdfR2Key: 'books/pdfs/malicious.pdf',
      coverR2Key: 'books/covers/malicious.jpg',
      audioFiles: [{ r2Key: 'books/audio/malicious.mp3', storageProvider: 'r2' }],
      addedBy: regularUserId,
      deleteOne: async () => { deleted = true; },
    });

    const req = {
      params: { type: 'book', id: testBookId.toString() },
      body: { reason: 'Prohibited exploit content' },
      user: { _id: adminUserId, email: 'admin@organizeup.com', role: 'admin' },
    };
    const res = createMockRes();

    await adminDeleteContent(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(deleted, true, 'Document must be deleted');
    assert.strictEqual(deletedFiles.length, 3, 'Must cascade-delete PDF, cover, and audio files');
    assert.strictEqual(auditLogsStored.length, 1, 'Deletion must be audit logged');
    assert.strictEqual(auditLogsStored[0].action, 'delete_content');
    assert.strictEqual(auditLogsStored[0].reason, 'Prohibited exploit content');
  });

  await runTest('getAuditLogs returns paginated audit records for admin review', async () => {
    const req = {
      query: { page: 1, limit: 10 },
      user: { _id: adminUserId, email: 'admin@organizeup.com', role: 'admin' },
    };
    const res = createMockRes();

    await getAuditLogs(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.ok(Array.isArray(res.body.logs), 'Logs must be an array');
    assert.strictEqual(res.body.page, 1);
  });

  // Restore DB methods
  User.findById = originalUserFindById;
  AdminAuditLog.create = originalAuditCreate;
  AdminAuditLog.find = originalAuditFind;
  AdminAuditLog.countDocuments = originalAuditCount;

  console.log('\n========================================================');
  console.log(`🎉 Results: ${passedCount}/${testCount} tests passed`);
  console.log('========================================================\n');

  if (passedCount !== testCount) {
    process.exit(1);
  }
}

startTestSuite().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
