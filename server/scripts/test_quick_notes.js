/**
 * Automated Verification Test Suite for OrganizeUp Quick Notes (Phase 1 Hardening)
 *
 * Verifies:
 * 1. Note creation with auto-title extraction and inline #tags detection.
 * 2. 50 KB per-note size limit rejection with friendly error.
 * 3. 5 MB per-user total body storage cap enforcement.
 * 4. 1,000 active notes limit enforcement.
 * 5. Idempotent create via clientId.
 * 6. Idempotent conflict-copy creation (retries do not create duplicate copies).
 * 7. Ownership security: User B querying, patching, deleting, restoring, or exporting User A's note returns 404.
 * 8. Version conflict check: stale baseVersion returns 409 Conflict with serverNote.
 * 9. Version increment: sequential update increments version (1 -> 2).
 * 10. Partial-word and case-insensitive substring search (escaped regex, user-scoped).
 * 11. Lightweight list payload: full body is stripped, 160-char snippet generated.
 * 12. Soft delete sets deletedAt and excludes from active list.
 * 13. Restore clears deletedAt and returns note to active list.
 * 14. Export filename sanitization.
 * 15. Purge job: soft-deleted notes older than 30 days are removed.
 * 16. Permanent delete completely purges document from MongoDB.
 * 17. Cascade deletion: deleting user deletes all user notes.
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const assert = require("assert");
const mongoose = require("mongoose");
const Note = require("../models/Note");
const User = require("../models/User");
const noteController = require("../controllers/noteController");
const adminController = require("../controllers/adminController");

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

// Mock express req/res
function createMockReq(user, body = {}, params = {}, query = {}) {
  return {
    user,
    body,
    params,
    query,
  };
}

function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.data = payload;
      return this;
    },
    setHeader(key, val) {
      this.headers[key] = val;
    },
    send(body) {
      this.data = body;
      return this;
    },
  };
  return res;
}

async function runTests() {
  console.log("\n🧪 Running Quick Notes (Phase 1 Hardening) Test Suite...\n");

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI is required to run tests");
  }

  await mongoose.connect(mongoUri);

  // Setup test users
  const testUserA = new mongoose.Types.ObjectId();
  const testUserB = new mongoose.Types.ObjectId();

  try {
    // 1. Creation with auto-title and auto-tag extraction
    let createdNoteId = null;
    await test("Creates note with auto-derived title and extracted #tags", async () => {
      const req = createMockReq(
        { _id: testUserA },
        {
          body: "# Organic Chemistry Lecture\nRemember to review #reaction-mechanisms and #exam tomorrow!",
        }
      );
      const res = createMockRes();

      await noteController.createNote(req, res);
      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.note.title, "Organic Chemistry Lecture");
      assert(res.data.note.tags.includes("reaction-mechanisms"));
      assert(res.data.note.tags.includes("exam"));
      assert.strictEqual(res.data.note.version, 1);
      createdNoteId = res.data.note._id;
    });

    // 2. 50 KB per-note size limit enforcement
    await test("Rejects note exceeding 50 KB limit with 400", async () => {
      const hugeBody = "A".repeat(51 * 1024); // 51 KB
      const req = createMockReq(
        { _id: testUserA },
        {
          body: hugeBody,
        }
      );
      const res = createMockRes();

      await noteController.createNote(req, res);
      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.data.success, false);
      assert(res.data.message.includes("50 KB"));
    });

    // 3. Quota accuracy & bodyBytes aggregation test
    await test("Quota accuracy: bodyBytes is accurately saved and aggregated", async () => {
      const testQuotaNote = new Note({
        user: testUserA,
        title: "Quota Precision Test",
        body: "Hello World 12345", // 17 bytes
      });
      await testQuotaNote.save();
      assert.strictEqual(testQuotaNote.bodyBytes, 17);

      const totalSizeAgg = await Note.aggregate([
        { $match: { user: testUserA, _id: testQuotaNote._id, deletedAt: null } },
        { $group: { _id: null, total: { $sum: "$bodyBytes" } } },
      ]);
      assert.strictEqual(totalSizeAgg[0]?.total, 17);

      await Note.findByIdAndDelete(testQuotaNote._id);
    });

    // 4. Edits that shrink a note skip aggregation and update bodyBytes
    await test("Edits that shrink a note succeed without aggregation overhead and decrease bodyBytes", async () => {
      // Create a 20 KB note
      const reqCreate = createMockReq(
        { _id: testUserA },
        {
          title: "Shrink Note Test",
          body: "Z".repeat(20 * 1024),
        }
      );
      const resCreate = createMockRes();
      await noteController.createNote(reqCreate, resCreate);
      assert.strictEqual(resCreate.statusCode, 201);
      const noteId = resCreate.data.note._id;
      assert.strictEqual(resCreate.data.note.bodyBytes, 20 * 1024);

      // Now edit the note to shrink it to 5 KB
      const reqShrink = createMockReq(
        { _id: testUserA },
        {
          body: "Z".repeat(5 * 1024),
          baseVersion: 1,
        },
        { id: noteId }
      );
      const resShrink = createMockRes();
      await noteController.updateNote(reqShrink, resShrink);
      assert.strictEqual(resShrink.statusCode, 200);
      assert.strictEqual(resShrink.data.note.bodyBytes, 5 * 1024);
      assert.strictEqual(resShrink.data.note.version, 2);

      // Verify in DB that bodyBytes was updated
      const updatedNoteInDb = await Note.findById(noteId);
      assert.strictEqual(updatedNoteInDb.bodyBytes, 5 * 1024);

      await Note.findByIdAndDelete(noteId);
    });

    // 5. 5 MB per-user total body size limit enforcement
    await test("Enforces per-user total body storage cap of 5 MB via bodyBytes aggregation", async () => {
      // Mock aggregate temporarily to simulate near-limit (5 MB)
      const originalAggregate = Note.aggregate;
      Note.aggregate = async function (pipeline) {
        if (pipeline && pipeline.some((stage) => stage.$group && stage.$group.total)) {
          return [{ _id: null, total: 5 * 1024 * 1024 - 100 }]; // 100 bytes left
        }
        return originalAggregate.call(Note, pipeline);
      };

      try {
        const req = createMockReq(
          { _id: testUserA },
          {
            body: "A".repeat(200), // 200 bytes exceeds remaining 100 bytes
          }
        );
        const res = createMockRes();
        await noteController.createNote(req, res);

        assert.strictEqual(res.statusCode, 400);
        assert.strictEqual(res.data.success, false);
        assert(res.data.message.includes("5 MB"));
      } finally {
        Note.aggregate = originalAggregate;
      }
    });

    // 4. 1,000 active notes limit enforcement
    await test("Enforces 1,000 active notes limit per user with friendly 400 error", async () => {
      // Mock countDocuments temporarily to simulate 1,000 notes
      const originalCount = Note.countDocuments;
      Note.countDocuments = async (filter) => {
        if (filter && filter.user && filter.deletedAt === null) {
          return 1000;
        }
        return originalCount.call(Note, filter);
      };

      try {
        const req = createMockReq(
          { _id: testUserA },
          {
            body: "Note 1001 attempting to be created",
          }
        );
        const res = createMockRes();
        await noteController.createNote(req, res);

        assert.strictEqual(res.statusCode, 400);
        assert.strictEqual(res.data.success, false);
        assert(res.data.message.includes("1,000 active notes"));
      } finally {
        Note.countDocuments = originalCount;
      }
    });

    // 5. Idempotent create via clientId
    await test("Idempotent create: duplicate clientId returns existing note", async () => {
      const clientId = "client-uuid-" + Date.now();
      const req1 = createMockReq(
        { _id: testUserA },
        {
          title: "Offline Draft",
          body: "Written while offline on train.",
          clientId,
        }
      );
      const res1 = createMockRes();
      await noteController.createNote(req1, res1);
      assert.strictEqual(res1.statusCode, 201);
      const firstNoteId = res1.data.note._id.toString();

      // Second submission with identical clientId
      const req2 = createMockReq(
        { _id: testUserA },
        {
          title: "Offline Draft Resubmission",
          body: "Written while offline on train duplicate.",
          clientId,
        }
      );
      const res2 = createMockRes();
      await noteController.createNote(req2, res2);
      assert.strictEqual(res2.statusCode, 200);
      assert.strictEqual(res2.data.note._id.toString(), firstNoteId);
      assert.strictEqual(res2.data.isDuplicate, true);
    });

    // 6. Conflict-copy creation is idempotent (retries do not create extra copies)
    await test("Conflict-copy creation is idempotent via clientId", async () => {
      const conflictClientId = "conflict-copy-uuid-" + Date.now();
      const conflictReq1 = createMockReq(
        { _id: testUserA },
        {
          title: "Lecture Notes (conflict copy)",
          body: "Conflicting edits from secondary device",
          clientId: conflictClientId,
        }
      );
      const res1 = createMockRes();
      await noteController.createNote(conflictReq1, res1);
      assert.strictEqual(res1.statusCode, 201);
      const copyId = res1.data.note._id.toString();

      // Retry creating the conflict copy with same clientId
      const res2 = createMockRes();
      await noteController.createNote(conflictReq1, res2);
      assert.strictEqual(res2.statusCode, 200);
      assert.strictEqual(res2.data.note._id.toString(), copyId);
      assert.strictEqual(res2.data.isDuplicate, true);

      // Verify in DB that only 1 conflict copy document exists
      const copiesCount = await Note.countDocuments({
        user: testUserA,
        clientId: conflictClientId,
      });
      assert.strictEqual(copiesCount, 1);
    });

    // 7. Privacy & Ownership: User B gets 404 for User A's note on GET/PATCH/DELETE/restore/export
    await test("Privacy & Ownership: User B gets 404 for User A's note on GET", async () => {
      const req = createMockReq({ _id: testUserB }, {}, { id: createdNoteId });
      const res = createMockRes();
      await noteController.getNoteById(req, res);
      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.data.message, "Note not found");
    });

    await test("Privacy & Ownership: User B gets 404 for User A's note on PATCH", async () => {
      const req = createMockReq({ _id: testUserB }, { body: "Malicious update" }, { id: createdNoteId });
      const res = createMockRes();
      await noteController.updateNote(req, res);
      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.data.message, "Note not found");
    });

    await test("Privacy & Ownership: User B gets 404 for User A's note on DELETE", async () => {
      const req = createMockReq({ _id: testUserB }, {}, { id: createdNoteId });
      const res = createMockRes();
      await noteController.softDeleteNote(req, res);
      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.data.message, "Note not found");
    });

    await test("Privacy & Ownership: User B gets 404 for User A's note on restore", async () => {
      const req = createMockReq({ _id: testUserB }, {}, { id: createdNoteId });
      const res = createMockRes();
      await noteController.restoreNote(req, res);
      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.data.message, "Note not found");
    });

    await test("Privacy & Ownership: User B gets 404 for User A's note on export", async () => {
      const req = createMockReq({ _id: testUserB }, {}, { id: createdNoteId }, { format: "md" });
      const res = createMockRes();
      await noteController.exportNote(req, res);
      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.data.message, "Note not found");
    });

    // 8. Version conflict detection (HTTP 409)
    await test("Version conflict: returns 409 when baseVersion is stale", async () => {
      const req = createMockReq(
        { _id: testUserA },
        {
          body: "Updated text from Device 2",
          baseVersion: 999, // Stale version
        },
        { id: createdNoteId }
      );
      const res = createMockRes();

      await noteController.updateNote(req, res);
      assert.strictEqual(res.statusCode, 409);
      assert.strictEqual(res.data.success, false);
      assert(res.data.message.includes("Conflict"));
      assert(res.data.serverNote);
      assert.strictEqual(res.data.serverNote.version, 1);
    });

    // 9. Version increment on successful patch
    await test("Successful update increments version from 1 to 2", async () => {
      const req = createMockReq(
        { _id: testUserA },
        {
          body: "Updated text with correct version #exam #physics",
          baseVersion: 1,
        },
        { id: createdNoteId }
      );
      const res = createMockRes();

      await noteController.updateNote(req, res);
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.data.note.version, 2);
      assert(res.data.note.tags.includes("physics"));
    });

    // 10. Search: Partial-word and case-insensitive substring search
    await test("Search: partial-word and case-insensitive substring search matches", async () => {
      // Create searchable notes
      const note1 = new Note({
        user: testUserA,
        title: "Calculus Study Guide",
        body: "Advanced calculus derivatives and chain rule formulas.",
      });
      const note2 = new Note({
        user: testUserA,
        title: "Physics Problem Set",
        body: "Practice integrals and harmonic oscillators.",
      });
      await Promise.all([note1.save(), note2.save()]);

      // Partial-word search: 'deriv' should match 'derivatives'
      const req1 = createMockReq({ _id: testUserA }, {}, {}, { q: "deriv" });
      const res1 = createMockRes();
      await noteController.getNotes(req1, res1);
      assert.strictEqual(res1.statusCode, 200);
      assert(res1.data.notes.some((n) => n._id.toString() === note1._id.toString()));

      // Case-insensitive substring search: 'INTEG' should match 'integrals'
      const req2 = createMockReq({ _id: testUserA }, {}, {}, { q: "INTEG" });
      const res2 = createMockRes();
      await noteController.getNotes(req2, res2);
      assert.strictEqual(res2.statusCode, 200);
      assert(res2.data.notes.some((n) => n._id.toString() === note2._id.toString()));

      // Search scoped strictly to user: User B should find 0 results for 'deriv'
      const req3 = createMockReq({ _id: testUserB }, {}, {}, { q: "deriv" });
      const res3 = createMockRes();
      await noteController.getNotes(req3, res3);
      assert.strictEqual(res3.statusCode, 200);
      assert.strictEqual(res3.data.notes.length, 0);

      await Promise.all([Note.findByIdAndDelete(note1._id), Note.findByIdAndDelete(note2._id)]);
    });

    // 11. Lightweight list endpoint
    await test("List endpoint returns lightweight snippet (no full body)", async () => {
      const req = createMockReq({ _id: testUserA }, {}, {}, {});
      const res = createMockRes();

      await noteController.getNotes(req, res);
      assert.strictEqual(res.statusCode, 200);
      assert(Array.isArray(res.data.notes));
      const target = res.data.notes.find((n) => n._id.toString() === createdNoteId.toString());
      assert(target);
      assert.strictEqual(target.body, undefined); // Full body MUST NOT be returned in list
      assert(target.snippet);
      assert(target.snippet.length <= 165);
    });

    // 12. Soft delete moves to trash
    await test("Soft delete sets deletedAt and hides from default list", async () => {
      const reqDelete = createMockReq({ _id: testUserA }, {}, { id: createdNoteId });
      const resDelete = createMockRes();

      await noteController.softDeleteNote(reqDelete, resDelete);
      assert.strictEqual(resDelete.statusCode, 200);
      assert(resDelete.data.note.deletedAt);

      // Check default list (deletedAt: null)
      const reqList = createMockReq({ _id: testUserA }, {}, {}, {});
      const resList = createMockRes();
      await noteController.getNotes(reqList, resList);
      const foundInActive = resList.data.notes.some((n) => n._id.toString() === createdNoteId.toString());
      assert.strictEqual(foundInActive, false);
    });

    // 13. Restore note
    await test("Restore brings note back to active list", async () => {
      const reqRestore = createMockReq({ _id: testUserA }, {}, { id: createdNoteId });
      const resRestore = createMockRes();

      await noteController.restoreNote(reqRestore, resRestore);
      assert.strictEqual(resRestore.statusCode, 200);
      assert.strictEqual(resRestore.data.note.deletedAt, null);

      const reqList = createMockReq({ _id: testUserA }, {}, {}, {});
      const resList = createMockRes();
      await noteController.getNotes(reqList, resList);
      const foundInActive = resList.data.notes.some((n) => n._id.toString() === createdNoteId.toString());
      assert.strictEqual(foundInActive, true);
    });

    // 14. Single note export with sanitized filename
    await test("Exports note as markdown format with sanitized filename", async () => {
      const noteToExport = new Note({
        user: testUserA,
        title: "Test Note: With / Dangerous \\ Chars * & Whitespace",
        body: "Export test body",
      });
      await noteToExport.save();

      const req = createMockReq({ _id: testUserA }, {}, { id: noteToExport._id }, { format: "md" });
      const res = createMockRes();

      await noteController.exportNote(req, res);
      assert.strictEqual(res.statusCode, 200);
      const disposition = res.headers["Content-Disposition"];
      assert(disposition);
      const filenameMatch = disposition.match(/filename="([^"]+)"/);
      assert(filenameMatch);
      const extractedFilename = filenameMatch[1];
      // Illegal filesystem chars must be stripped from the filename
      assert(!extractedFilename.includes(":"));
      assert(!extractedFilename.includes("/"));
      assert(!extractedFilename.includes("\\"));
      assert(!extractedFilename.includes("*"));

      await Note.findByIdAndDelete(noteToExport._id);
    });

    // 15. Purge expired soft-deleted notes (> 30 days)
    await test("Purge job removes notes soft-deleted > 30 days ago", async () => {
      const oldDeletedNote = new Note({
        user: testUserA,
        title: "Old note to purge",
        body: "Ancient soft deleted note",
        deletedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 days ago
      });
      await oldDeletedNote.save();

      const purgeResult = await noteController.purgeExpiredSoftDeletedNotes();
      assert(purgeResult.purgedNotesCount >= 1);

      const check = await Note.findById(oldDeletedNote._id);
      assert.strictEqual(check, null);
    });

    // 16. Permanent delete
    await test("Permanent delete removes document from database", async () => {
      const req = createMockReq({ _id: testUserA }, {}, { id: createdNoteId });
      const res = createMockRes();

      await noteController.permanentDeleteNote(req, res);
      assert.strictEqual(res.statusCode, 200);

      const check = await Note.findById(createdNoteId);
      assert.strictEqual(check, null);
    });

    // 17. Cascade delete: deleting a user deletes all their notes
    await test("Cascade: deleting user cascades to delete all their notes", async () => {
      const cascadeUserId = new mongoose.Types.ObjectId();
      const note1 = new Note({ user: cascadeUserId, title: "Note 1", body: "Body 1" });
      const note2 = new Note({ user: cascadeUserId, title: "Note 2", body: "Body 2" });
      await Promise.all([note1.save(), note2.save()]);

      const countBefore = await Note.countDocuments({ user: cascadeUserId });
      assert.strictEqual(countBefore, 2);

      // Create a dummy user in DB to delete via adminController
      const dummyUser = new User({
        _id: cascadeUserId,
        name: "Cascade Test User",
        email: `cascade-${Date.now()}@test.com`,
        password: "password123",
      });
      await dummyUser.save();

      const adminUser = { _id: new mongoose.Types.ObjectId(), email: "admin@organizeup.app", role: "admin" };
      const req = createMockReq(adminUser, {}, { id: cascadeUserId.toString() });
      const res = createMockRes();

      await adminController.deleteUser(req, res);
      assert.strictEqual(res.statusCode, 200);

      const countAfter = await Note.countDocuments({ user: cascadeUserId });
      assert.strictEqual(countAfter, 0);
    });
  } finally {
    // Clean up any remaining test notes for test users
    await Note.deleteMany({ user: { $in: [testUserA, testUserB] } });
    await mongoose.disconnect();
  }

  console.log(`\nResults: ${passedCount} passed, ${failedCount} failed\n`);
  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
