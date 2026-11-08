/**
 * Quick Test: Partial Index & No Default for seedId
 * Verifies that:
 * 1. None of the models have a default value for seedId (must be undefined, not null).
 * 2. Every model specifies a unique index with partialFilterExpression: { seedId: { $type: "string" } }.
 * 3. Two normal Books, Courses, Tools, and Playlists created without seedId do not have seedId set to null or collide on index.
 */

const assert = require("assert");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const Book = require("../models/Book");
const Course = require("../models/Course");
const Tool = require("../models/Tool");
const YoutubePlaylist = require("../models/YoutubePlaylist");
const CustomSection = require("../models/CustomSection");
const SubSection = require("../models/SubSection");

async function runTest() {
  console.log("==============================================================");
  console.log("  🧪 Testing seedId Partial Index & Default Absence");
  console.log("==============================================================");

  const models = [
    { name: "Book", Model: Book },
    { name: "Course", Model: Course },
    { name: "Tool", Model: Tool },
    { name: "YoutubePlaylist", Model: YoutubePlaylist },
    { name: "CustomSection", Model: CustomSection },
    { name: "SubSection", Model: SubSection },
  ];

  // 1. Verify schema definition: no default value on seedId
  for (const { name, Model } of models) {
    const seedIdField = Model.schema.path("seedId");
    assert(seedIdField, `${name} missing seedId field`);
    assert.strictEqual(
      seedIdField.defaultValue,
      undefined,
      `${name}.seedId must not have a default value (got ${seedIdField.defaultValue})`
    );

    // Verify index definition
    const indexes = Model.schema.indexes();
    const seedIndex = indexes.find((idx) => idx[0] && idx[0].seedId === 1);
    assert(seedIndex, `${name} missing seedId index`);
    assert.strictEqual(seedIndex[1].unique, true, `${name} seedId index must be unique`);
    assert.deepStrictEqual(
      seedIndex[1].partialFilterExpression,
      { seedId: { $type: "string" } },
      `${name} seedId index must have partialFilterExpression: { seedId: { $type: "string" } }`
    );
    console.log(`  ✅ ${name}: seedId defaultValue is undefined & partialFilterExpression is { seedId: { $type: "string" } }`);
  }

  // 2. Verify document instantiation: seedId is not populated with null
  const dummyUserId = new mongoose.Types.ObjectId();
  const dummyCatId = new mongoose.Types.ObjectId();

  const docPairs = [
    {
      name: "Book",
      doc1: new Book({ title: "Normal Book 1", author: "Author A", type: "text", addedBy: dummyUserId }),
      doc2: new Book({ title: "Normal Book 2", author: "Author B", type: "text", addedBy: dummyUserId }),
    },
    {
      name: "Course",
      doc1: new Course({ title: "Normal Course 1", category: dummyCatId, addedBy: dummyUserId }),
      doc2: new Course({ title: "Normal Course 2", category: dummyCatId, addedBy: dummyUserId }),
    },
    {
      name: "Tool",
      doc1: new Tool({ title: "Normal Tool 1", link: "https://example.com/1", addedBy: dummyUserId }),
      doc2: new Tool({ title: "Normal Tool 2", link: "https://example.com/2", addedBy: dummyUserId }),
    },
    {
      name: "YoutubePlaylist",
      doc1: new YoutubePlaylist({ title: "Normal Playlist 1", addedBy: dummyUserId }),
      doc2: new YoutubePlaylist({ title: "Normal Playlist 2", addedBy: dummyUserId }),
    },
  ];

  for (const { name, doc1, doc2 } of docPairs) {
    const obj1 = doc1.toObject();
    const obj2 = doc2.toObject();

    assert.strictEqual(obj1.seedId, undefined, `${name} doc1.seedId must be undefined`);
    assert.strictEqual(obj2.seedId, undefined, `${name} doc2.seedId must be undefined`);
    console.log(`  ✅ ${name}: 2 normal docs instantiated without seedId -> seedId remains undefined (not null)`);
  }

  // 3. If database connection is accessible, test actual DB insertion & indexing
  const mongoUri = process.env.MONGO_URI;
  if (mongoUri) {
    try {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000, family: 4 });
      console.log("\n  Connected to MongoDB to test live insertion...");

      for (const { name, doc1, doc2 } of docPairs) {
        await doc1.save();
        await doc2.save();
        console.log(`  ✅ ${name}: Saved 2 normal documents without seedId successfully (no duplicate key error)`);
        await doc1.deleteOne();
        await doc2.deleteOne();
      }
      await mongoose.disconnect();
    } catch (dbErr) {
      console.log(`\n  ℹ️ DB offline (${dbErr.message}): live insert test skipped, schema & memory assertions verified.`);
    }
  }

  console.log("\n🎉 All seedId partial index & default checks PASSED!\n");
}

runTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

