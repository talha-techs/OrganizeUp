const assert = require('assert');
const path = require('path');
const mongoose = require('mongoose');

// Ensure storage service mocks or config
process.env.STORAGE_DRIVER = 'r2';
process.env.R2_ACCOUNT_ID = 'mock-account';
process.env.R2_ACCESS_KEY_ID = 'mock-key';
process.env.R2_SECRET_ACCESS_KEY = 'mock-secret';
process.env.R2_PUBLIC_BUCKET_NAME = 'mock-pub';
process.env.R2_PRIVATE_BUCKET_NAME = 'mock-priv';

const storageService = require('../services/storageService');
const CapturedResource = require('../models/CapturedResource');
const TelegramMessage = require('../models/TelegramMessage');
const DiscordMessage = require('../models/DiscordMessage');
const Book = require('../models/Book');
const Course = require('../models/Course');
const Tool = require('../models/Tool');
const User = require('../models/User');
const CustomSection = require('../models/CustomSection');

// Mock getPresignedDownloadUrl
storageService.getPresignedDownloadUrl = async (key, opts) => {
  return `https://mock-r2.test/${key}?isPublic=${opts.isPublic}&expiresIn=${opts.expiresIn}`;
};

// Mock streamFromR2
let streamFromR2Called = false;
storageService.streamFromR2 = async (opts) => {
  streamFromR2Called = true;
  opts.res.status(200).json({ streamed: true, key: opts.key });
};

// Mock streamFromGridFS
let streamFromGridFSCalled = false;
storageService.streamFromGridFS = async (id, res, type) => {
  streamFromGridFSCalled = true;
  res.status(200).json({ streamedGridFS: true, id });
};

// Now import controller which uses the same storageService from cache
const { serveImage } = require('../controllers/bookController');

// Helper to create mock req and res
function createMockReqRes({ params = {}, query = {}, user = null } = {}) {
  const req = {
    params,
    query,
    user,
  };
  const res = {
    statusCode: null,
    headers: {},
    body: null,
    redirectUrl: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    setHeader(k, v) {
      this.headers[k] = v;
      return this;
    },
    redirect(code, url) {
      this.statusCode = code;
      this.redirectUrl = url;
      return this;
    },
  };
  return { req, res };
}

async function runTests() {
  console.log('--- Starting serveImage Security & Authorization Tests ---');
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ FAIL: ${name}`);
      console.error(err);
      failed++;
    }
  }

  // 1. Path traversal check
  await test('Path traversal with ".." returns 404', async () => {
    const { req, res } = createMockReqRes({ params: { key: 'captures/../secrets.env' } });
    await serveImage(req, res);
    assert.strictEqual(res.statusCode, 404);
    assert.deepStrictEqual(res.body, { message: 'Image not found' });
  });

  // 2. Reject books/pdfs/
  await test('serveImage rejects books/pdfs/ with 404', async () => {
    const { req, res } = createMockReqRes({ params: { key: 'books/pdfs/mybook.pdf' } });
    await serveImage(req, res);
    assert.strictEqual(res.statusCode, 404);
    assert.deepStrictEqual(res.body, { message: 'Image not found' });
  });

  // 3. Reject books/audio/
  await test('serveImage rejects books/audio/ with 404', async () => {
    const { req, res } = createMockReqRes({ params: { key: 'books/audio/chapter1.mp3' } });
    await serveImage(req, res);
    assert.strictEqual(res.statusCode, 404);
    assert.deepStrictEqual(res.body, { message: 'Image not found' });
  });

  // 4. Reject unknown prefixes
  await test('serveImage rejects unknown prefix with 404', async () => {
    const { req, res } = createMockReqRes({ params: { key: 'internal_secrets/key.pem' } });
    await serveImage(req, res);
    assert.strictEqual(res.statusCode, 404);
    assert.deepStrictEqual(res.body, { message: 'Image not found' });
  });

  // 5. Public prefix succeeds without authentication
  await test('Public prefix (books/covers/) redirects without auth', async () => {
    const { req, res } = createMockReqRes({ params: { key: 'books/covers/cover-123.jpg' } });
    await serveImage(req, res);
    assert.strictEqual(res.statusCode, 302);
    assert.ok(res.redirectUrl.includes('books/covers/cover-123.jpg'));
    assert.ok(res.redirectUrl.includes('isPublic=true'));
  });

  // 6. Private prefix (captures/) returns 401 when logged out
  await test('Private prefix (captures/) returns 401 when unauthenticated', async () => {
    const { req, res } = createMockReqRes({ params: { key: 'captures/test-capture.jpg' } });
    await serveImage(req, res);
    assert.strictEqual(res.statusCode, 401);
    assert.deepStrictEqual(res.body, { message: 'Not authorized, token required' });
  });

  // 7. Private prefix with ?proxy=true returns 401 when logged out
  await test('Private prefix with ?proxy=true returns 401 when unauthenticated', async () => {
    const { req, res } = createMockReqRes({
      params: { key: 'captures/test-capture.jpg' },
      query: { proxy: 'true' },
    });
    await serveImage(req, res);
    assert.strictEqual(res.statusCode, 401);
  });

  // Backup original findOne
  const origCapturedFindOne = CapturedResource.findOne;
  const origTelegramFindOne = TelegramMessage.findOne;
  const origDiscordFindOne = DiscordMessage.findOne;
  const origBookFindOne = Book.findOne;
  const origCourseFindOne = Course.findOne;
  const origToolFindOne = Tool.findOne;
  const origUserFindOne = User.findOne;
  const origSectionFindOne = CustomSection.findOne;

  // 8. Private prefix returns 403 when authenticated user is NOT owner
  await test('Private prefix returns 403 when authenticated user is not owner', async () => {
    CapturedResource.findOne = () => ({
      select: () => ({
        lean: async () => ({ _id: 'doc1', user: 'owner_user_id' }),
      }),
    });

    const { req, res } = createMockReqRes({
      params: { key: 'captures/user1-image.jpg' },
      user: { _id: 'different_user_id', role: 'user' },
    });

    await serveImage(req, res);
    assert.strictEqual(res.statusCode, 403);
    assert.deepStrictEqual(res.body, { message: 'Not authorized to access this resource' });
  });

  // 9. Private prefix returns 302 when authenticated user IS owner
  await test('Private prefix returns 302 presigned URL when authenticated user is owner', async () => {
    CapturedResource.findOne = () => ({
      select: () => ({
        lean: async () => ({ _id: 'doc1', user: 'owner_user_id' }),
      }),
    });

    const { req, res } = createMockReqRes({
      params: { key: 'captures/user1-image.jpg' },
      user: { _id: 'owner_user_id', role: 'user' },
    });

    await serveImage(req, res);
    assert.strictEqual(res.statusCode, 302);
    assert.ok(res.redirectUrl.includes('captures/user1-image.jpg'));
    assert.ok(res.redirectUrl.includes('isPublic=false'));
    assert.ok(res.redirectUrl.includes('expiresIn=3600'));
  });

  // 10. Private prefix with ?proxy=true streams from R2 when authenticated user IS owner
  await test('Private prefix with ?proxy=true streams from R2 for owner', async () => {
    streamFromR2Called = false;
    CapturedResource.findOne = () => ({
      select: () => ({
        lean: async () => ({ _id: 'doc1', user: 'owner_user_id' }),
      }),
    });

    const { req, res } = createMockReqRes({
      params: { key: 'captures/user1-image.jpg' },
      query: { proxy: 'true' },
      user: { _id: 'owner_user_id', role: 'user' },
    });

    await serveImage(req, res);
    assert.strictEqual(streamFromR2Called, true);
  });

  // ==========================================
  // Legacy GridFS ObjectId Tests
  // ==========================================
  const dummyGridFsId = new mongoose.Types.ObjectId().toString();

  // 11. Legacy GridFS ObjectId: private capture returns 401 when logged out
  await test('Legacy GridFS ObjectId for capture returns 401 when unauthenticated', async () => {
    CapturedResource.findOne = () => ({
      select: () => ({
        lean: async () => ({ _id: 'cap1', user: 'owner_user_id' }),
      }),
    });
    TelegramMessage.findOne = () => ({ select: () => ({ lean: async () => null }) });
    DiscordMessage.findOne = () => ({ select: () => ({ lean: async () => null }) });

    const { req, res } = createMockReqRes({ params: { fileId: dummyGridFsId } });
    await serveImage(req, res);
    assert.strictEqual(res.statusCode, 401);
    assert.deepStrictEqual(res.body, { message: 'Not authorized, token required' });
  });

  // 12. Legacy GridFS ObjectId: private Telegram banner returns 401 when logged out
  await test('Legacy GridFS ObjectId for telegram banner returns 401 when unauthenticated', async () => {
    CapturedResource.findOne = () => ({ select: () => ({ lean: async () => null }) });
    TelegramMessage.findOne = () => ({
      select: () => ({
        lean: async () => ({ _id: 'tg1', user: 'owner_user_id' }),
      }),
    });
    DiscordMessage.findOne = () => ({ select: () => ({ lean: async () => null }) });

    const { req, res } = createMockReqRes({ params: { fileId: dummyGridFsId } });
    await serveImage(req, res);
    assert.strictEqual(res.statusCode, 401);
  });

  // 13. Legacy GridFS ObjectId: private resource returns 403 for non-owner
  await test('Legacy GridFS ObjectId returns 403 for non-owner', async () => {
    CapturedResource.findOne = () => ({
      select: () => ({
        lean: async () => ({ _id: 'cap1', user: 'owner_user_id' }),
      }),
    });
    TelegramMessage.findOne = () => ({ select: () => ({ lean: async () => null }) });
    DiscordMessage.findOne = () => ({ select: () => ({ lean: async () => null }) });

    const { req, res } = createMockReqRes({
      params: { fileId: dummyGridFsId },
      user: { _id: 'intruder_user_id', role: 'user' },
    });
    await serveImage(req, res);
    assert.strictEqual(res.statusCode, 403);
  });

  // 14. Legacy GridFS ObjectId: owner can stream private image
  await test('Legacy GridFS ObjectId streams for owner', async () => {
    streamFromGridFSCalled = false;
    CapturedResource.findOne = () => ({
      select: () => ({
        lean: async () => ({ _id: 'cap1', user: 'owner_user_id' }),
      }),
    });
    TelegramMessage.findOne = () => ({ select: () => ({ lean: async () => null }) });
    DiscordMessage.findOne = () => ({ select: () => ({ lean: async () => null }) });

    const { req, res } = createMockReqRes({
      params: { fileId: dummyGridFsId },
      user: { _id: 'owner_user_id', role: 'user' },
    });
    await serveImage(req, res);
    assert.strictEqual(streamFromGridFSCalled, true);
    assert.strictEqual(res.statusCode, 200);
  });

  // 15. Legacy GridFS ObjectId: unauthenticated user trying unreferenced/orphan ObjectId gets 404
  await test('Legacy GridFS ObjectId: unreferenced/orphan ID returns 404 for unauthenticated user', async () => {
    CapturedResource.findOne = () => ({ select: () => ({ lean: async () => null }) });
    TelegramMessage.findOne = () => ({ select: () => ({ lean: async () => null }) });
    DiscordMessage.findOne = () => ({ select: () => ({ lean: async () => null }) });
    Book.findOne = () => ({ select: () => ({ lean: async () => null }) });
    Course.findOne = () => ({ select: () => ({ lean: async () => null }) });
    Tool.findOne = () => ({ select: () => ({ lean: async () => null }) });
    User.findOne = () => ({ select: () => ({ lean: async () => null }) });
    CustomSection.findOne = () => ({ select: () => ({ lean: async () => null }) });

    const { req, res } = createMockReqRes({ params: { fileId: dummyGridFsId } });
    await serveImage(req, res);
    assert.strictEqual(res.statusCode, 404);
  });

  // 16. Legacy GridFS ObjectId: public Book cover streams without authentication
  await test('Legacy GridFS ObjectId: public book cover streams for unauthenticated user', async () => {
    streamFromGridFSCalled = false;
    CapturedResource.findOne = () => ({ select: () => ({ lean: async () => null }) });
    TelegramMessage.findOne = () => ({ select: () => ({ lean: async () => null }) });
    DiscordMessage.findOne = () => ({ select: () => ({ lean: async () => null }) });
    Book.findOne = () => ({ select: () => ({ lean: async () => ({ _id: 'book1' }) }) });
    Course.findOne = () => ({ select: () => ({ lean: async () => null }) });
    Tool.findOne = () => ({ select: () => ({ lean: async () => null }) });
    User.findOne = () => ({ select: () => ({ lean: async () => null }) });
    CustomSection.findOne = () => ({ select: () => ({ lean: async () => null }) });

    const { req, res } = createMockReqRes({ params: { fileId: dummyGridFsId } });
    await serveImage(req, res);
    assert.strictEqual(streamFromGridFSCalled, true);
    assert.strictEqual(res.statusCode, 200);
  });

  // Restore originals
  CapturedResource.findOne = origCapturedFindOne;
  TelegramMessage.findOne = origTelegramFindOne;
  DiscordMessage.findOne = origDiscordFindOne;
  Book.findOne = origBookFindOne;
  Course.findOne = origCourseFindOne;
  Tool.findOne = origToolFindOne;
  User.findOne = origUserFindOne;
  CustomSection.findOne = origSectionFindOne;

  console.log(`\nAll tests completed: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
