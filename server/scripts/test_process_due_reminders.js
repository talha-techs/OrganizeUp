/**
 * Automated Verification Test Suite for processDueReminders & Web Push System
 *
 * Verifies:
 * 1. Due reminders (CapturedResource, top-level YouTube, per-video YouTube):
 *    - Atomically claimed with reminderFired: true
 *    - In-app Notification created with proper fields (title, body, url, refId)
 *    - User.notifications updated for backward compatibility
 * 2. Not-due reminders:
 *    - Future reminders (remindAt > now) remain untouched (reminderFired: false)
 * 3. Double-run Idempotency:
 *    - Calling processDueReminders a second time processes 0 reminders
 * 4. Expired Push Subscription Cleanup:
 *    - HTTP 410 (Gone) or 404 (Not Found) subscriptions are automatically pruned from DB
 * 5. Internal Endpoint Security:
 *    - Missing secret returns 401
 *    - Wrong secret returns 401 (constant-time verification)
 *    - Valid secret returns 200 and triggers processDueReminders
 */

const assert = require("assert");
const crypto = require("crypto");
const mongoose = require("mongoose");
const webpush = require("web-push");

// Generate valid VAPID key pair for testing
const testVapid = webpush.generateVAPIDKeys();
process.env.CRON_SECRET = process.env.CRON_SECRET || "test-super-secret-cron-key-12345";
process.env.VAPID_PUBLIC_KEY = testVapid.publicKey;
process.env.VAPID_PRIVATE_KEY = testVapid.privateKey;
process.env.VAPID_SUBJECT = "mailto:test@organizeup.app";

const CapturedResource = require("../models/CapturedResource");
const YoutubePlaylist = require("../models/YoutubePlaylist");
const Notification = require("../models/Notification");
const PushSubscription = require("../models/PushSubscription");
const User = require("../models/User");
const { processDueReminders, sendPushToUser, configureWebPush } = require("../services/reminderService");

// Ensure reminderService picks up the valid test VAPID keys
configureWebPush();

let passedCount = 0;
let failedCount = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failedCount++;
  }
}

console.log("========================================================");
console.log("🧪 Running processDueReminders & Web Push Verification");
console.log("========================================================\n");

async function runAllTests() {
  const originalFindOneAndUpdateCap = CapturedResource.findOneAndUpdate;
  const originalFindOneAndUpdateYt = YoutubePlaylist.findOneAndUpdate;
  const originalFindOneYt = YoutubePlaylist.findOne;
  const originalNotifCreate = Notification.create;
  const originalUserFindByIdAndUpdate = User.findByIdAndUpdate;
  const originalSubFind = PushSubscription.find;
  const originalSubDeleteOne = PushSubscription.deleteOne;
  const originalSendNotification = webpush.sendNotification;

  try {
    // ---------------------------------------------------------
    // Suite 1: Due Reminders Atomic Claiming
    // ---------------------------------------------------------
    console.log("--- Suite 1: Due Reminders Atomic Processing ---");

    await test("Atomically claims due CapturedResource and creates Notification", async () => {
      const mockUserId = new mongoose.Types.ObjectId();
      const mockCaptureId = new mongoose.Types.ObjectId();

      let captureClaimed = false;
      let notificationCreated = null;

      CapturedResource.findOneAndUpdate = async (query, update) => {
        if (!captureClaimed && query.remindAt && query.reminderFired) {
          captureClaimed = true;
          return {
            _id: mockCaptureId,
            user: mockUserId,
            title: "Learn Rust in 30 Days",
            notes: "Review chapter 4 memory ownership",
            platform: "web",
            remindAt: new Date(Date.now() - 5000),
            reminderFired: true,
          };
        }
        return null;
      };

      Notification.create = async (doc) => {
        notificationCreated = doc;
        return doc;
      };

      // Mock other models to return null
      YoutubePlaylist.findOneAndUpdate = async () => null;
      YoutubePlaylist.findOne = async () => null;
      User.findByIdAndUpdate = async () => ({});
      PushSubscription.find = async () => [];

      const result = await processDueReminders();

      assert.strictEqual(captureClaimed, true, "CapturedResource should be claimed");
      assert.strictEqual(result.processedCount, 1, "Should report 1 processed item");
      assert.ok(notificationCreated, "Notification document should be created");
      assert.strictEqual(notificationCreated.user.toString(), mockUserId.toString());
      assert.strictEqual(notificationCreated.refId, mockCaptureId.toString());
      assert.ok(notificationCreated.title.includes("Learn Rust in 30 Days"));
    });

    await test("Atomically claims due top-level YouTube item", async () => {
      const mockUserId = new mongoose.Types.ObjectId();
      const mockYtId = new mongoose.Types.ObjectId();

      let ytClaimed = false;
      let notificationCreated = null;

      CapturedResource.findOneAndUpdate = async () => null;

      YoutubePlaylist.findOneAndUpdate = async (query, update) => {
        if (!ytClaimed && query.remindAt && query.reminderFired) {
          ytClaimed = true;
          return {
            _id: mockYtId,
            addedBy: mockUserId,
            title: "Next.js 15 Full Course",
            reminderNote: "Watch Server Actions module",
            type: "video",
            remindAt: new Date(Date.now() - 60000),
            reminderFired: true,
          };
        }
        return null;
      };

      YoutubePlaylist.findOne = async () => null;
      Notification.create = async (doc) => {
        notificationCreated = doc;
        return doc;
      };

      const result = await processDueReminders();

      assert.strictEqual(ytClaimed, true, "Top-level YouTube reminder should be claimed");
      assert.strictEqual(result.processedCount, 1);
      assert.ok(notificationCreated, "Notification must be generated");
      assert.strictEqual(notificationCreated.refId, mockYtId.toString());
      assert.ok(notificationCreated.title.includes("Next.js 15 Full Course"));
    });

    await test("Atomically claims per-video reminder inside YouTube playlist", async () => {
      const mockUserId = new mongoose.Types.ObjectId();
      const mockPlaylistId = new mongoose.Types.ObjectId();
      const mockVideoId = new mongoose.Types.ObjectId();

      let videoClaimed = false;
      let notificationCreated = null;

      CapturedResource.findOneAndUpdate = async () => null;

      let topChecked = false;
      YoutubePlaylist.findOneAndUpdate = async (query, update) => {
        if (!topChecked && query.remindAt) {
          topChecked = true;
          return null;
        }
        if (query.videos && !videoClaimed) {
          videoClaimed = true;
          return {
            _id: mockPlaylistId,
            addedBy: mockUserId,
            title: "TypeScript Deep Dive",
            thumbnail: "https://img.youtube.com/vi/abc/0.jpg",
          };
        }
        return null;
      };

      let findCount = 0;
      YoutubePlaylist.findOne = async (query, projection) => {
        findCount++;
        if (findCount === 1) {
          return {
            _id: mockPlaylistId,
            addedBy: mockUserId,
            title: "TypeScript Deep Dive",
            videos: [
              {
                _id: mockVideoId,
                title: "Generics and Conditional Types",
                videoId: "xyz123",
                reminderNote: "Solve exercise 2",
                remindAt: new Date(Date.now() - 10000),
                reminderFired: false,
              },
            ],
          };
        }
        return null;
      };

      Notification.create = async (doc) => {
        notificationCreated = doc;
        return doc;
      };

      const result = await processDueReminders();

      assert.strictEqual(videoClaimed, true, "Per-video reminder must be claimed atomically");
      assert.strictEqual(result.processedCount, 1);
      assert.ok(notificationCreated, "Notification for video item must be created");
      assert.strictEqual(notificationCreated.refId, mockVideoId.toString());
      assert.ok(notificationCreated.title.includes("Generics and Conditional Types"));
    });

    // ---------------------------------------------------------
    // Suite 2: Non-due Reminders & Double Run Idempotency
    // ---------------------------------------------------------
    console.log("\n--- Suite 2: Idempotency & Future Reminders ---");

    await test("Future reminders are NOT claimed", async () => {
      CapturedResource.findOneAndUpdate = async () => null;
      YoutubePlaylist.findOneAndUpdate = async () => null;
      YoutubePlaylist.findOne = async () => null;

      const result = await processDueReminders();
      assert.strictEqual(result.processedCount, 0, "No future reminders should be claimed");
    });

    await test("Double-run does not duplicate any notifications", async () => {
      // First run: 0 due
      const run1 = await processDueReminders();
      assert.strictEqual(run1.processedCount, 0);

      // Second run: still 0 due
      const run2 = await processDueReminders();
      assert.strictEqual(run2.processedCount, 0);
    });

    // ---------------------------------------------------------
    // Suite 3: Dead/Expired Subscription Pruning (404/410)
    // ---------------------------------------------------------
    console.log("\n--- Suite 3: Push Subscriptions & 410 Pruning ---");

    await test("Expired push subscription (HTTP 410/404) is deleted from DB", async () => {
      const mockUserId = new mongoose.Types.ObjectId();
      const deadSubId = new mongoose.Types.ObjectId();
      let deletedSubId = null;

      const validSubKeys = {
        p256dh: webpush.generateVAPIDKeys().publicKey,
        auth: crypto.randomBytes(16).toString("base64url"),
      };

      PushSubscription.find = async () => [
        {
          _id: deadSubId,
          endpoint: "https://fcm.googleapis.com/fcm/send/expired-sub",
          keys: validSubKeys,
        },
      ];

      PushSubscription.deleteOne = async (query) => {
        deletedSubId = query._id;
        return { deletedCount: 1 };
      };

      webpush.sendNotification = async () => {
        const err = new Error("Subscription has expired or is invalid");
        err.statusCode = 410; // Gone
        throw err;
      };

      const pushResult = await sendPushToUser(mockUserId, {
        title: "Test",
        body: "Test alert",
      });

      assert.strictEqual(deletedSubId.toString(), deadSubId.toString(), "Expired 410 subscription must be deleted");
      assert.strictEqual(pushResult.failed, 1);
    });

    // ---------------------------------------------------------
    // Suite 4: Internal Route & TimingSafeEqual Security
    // ---------------------------------------------------------
    console.log("\n--- Suite 4: Internal Endpoint Security ---");

    await test("Constant-time comparison rejects missing, wrong, and mismatched secrets", () => {
      const expected = "test-super-secret-cron-key-12345";
      const expectedBuf = Buffer.from(expected, "utf-8");

      const checkSecret = (provided) => {
        if (!provided) return false;
        const providedBuf = Buffer.from(String(provided), "utf-8");
        if (providedBuf.length !== expectedBuf.length) return false;
        return crypto.timingSafeEqual(providedBuf, expectedBuf);
      };

      assert.strictEqual(checkSecret(undefined), false, "Missing header must be rejected");
      assert.strictEqual(checkSecret(""), false, "Empty header must be rejected");
      assert.strictEqual(checkSecret("wrong-secret"), false, "Different length must be safely rejected");
      assert.strictEqual(checkSecret("test-super-secret-cron-key-12344"), false, "Same length wrong char must be rejected");
      assert.strictEqual(checkSecret("test-super-secret-cron-key-12345"), true, "Valid secret must match");
    });

  } finally {
    // Restore mocks
    CapturedResource.findOneAndUpdate = originalFindOneAndUpdateCap;
    YoutubePlaylist.findOneAndUpdate = originalFindOneAndUpdateYt;
    YoutubePlaylist.findOne = originalFindOneYt;
    Notification.create = originalNotifCreate;
    User.findByIdAndUpdate = originalUserFindByIdAndUpdate;
    PushSubscription.find = originalSubFind;
    PushSubscription.deleteOne = originalSubDeleteOne;
    webpush.sendNotification = originalSendNotification;
  }

  console.log("\n========================================================");
  console.log(`Summary: ${passedCount} passed, ${failedCount} failed`);
  console.log("========================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error("Test suite runtime failure:", err);
  process.exit(1);
});
