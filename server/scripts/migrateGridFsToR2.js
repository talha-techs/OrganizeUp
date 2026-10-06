#!/usr/bin/env node
/**
 * OrganizeUp - GridFS to Cloudflare R2 Migration Script
 *
 * Usage:
 *   node scripts/migrateGridFsToR2.js [--dry-run] [--model=book,course,...] [--limit=N]
 *
 * Options:
 *   --dry-run       Analyze and display what would be migrated without modifying data or uploading to R2
 *   --model=NAME    Restrict migration to specific models (comma-separated: user,course,tool,section,subsection,capture,discord,telegram,book)
 *   --limit=N       Process at most N items per model (useful for small canary testing)
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const { PutObjectCommand, HeadObjectCommand } = require("@aws-sdk/client-s3");
const { getR2Client, isR2Configured, R2_CONFIG } = require("../config/r2");
const { initGridFS, getBucket } = require("../config/gridfs");

const User = require("../models/User");
const Course = require("../models/Course");
const Tool = require("../models/Tool");
const CustomSection = require("../models/CustomSection");
const SubSection = require("../models/SubSection");
const CapturedResource = require("../models/CapturedResource");
const DiscordMessage = require("../models/DiscordMessage");
const TelegramMessage = require("../models/TelegramMessage");
const Book = require("../models/Book");

// Parse CLI flags
const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const modelArg = args.find((a) => a.startsWith("--model="))?.split("=")[1];
const targetModels = modelArg ? modelArg.split(",").map((m) => m.trim().toLowerCase()) : null;
const limitArg = args.find((a) => a.startsWith("--limit="))?.split("=")[1];
const itemLimit = limitArg ? parseInt(limitArg, 10) : 0;

const stats = {
  totalProcessed: 0,
  totalUploaded: 0,
  totalBytes: 0,
  errors: 0,
  skipped: 0,
};

/**
 * Helper to stream a GridFS file into a Buffer with timeout protection
 * In dry-run mode, skips network buffering and returns metadata length directly
 */
const readGridFsFileBuffer = async (bucket, fileId, knownLength = 0, timeoutMs = 60000) => {
  if (isDryRun) {
    return { length: knownLength };
  }
  return new Promise((resolve, reject) => {
    try {
      const _id = new mongoose.Types.ObjectId(fileId);
      const stream = bucket.openDownloadStream(_id);
      const chunks = [];
      let settled = false;

      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          try { stream.destroy(); } catch (_) {}
          reject(new Error(`Timeout reading GridFS file ${fileId} after ${timeoutMs}ms`));
        }
      }, timeoutMs);

      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("error", (err) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(err);
        }
      });
      stream.on("end", () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(Buffer.concat(chunks));
        }
      });
      stream.on("close", () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(Buffer.concat(chunks));
        }
      });
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Upload buffer to R2 and verify size
 */
const uploadAndVerifyR2 = async (r2Client, bucket, key, buffer, contentType) => {
  if (isDryRun) {
    return { success: true, key };
  }

  await r2Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType || "application/octet-stream",
    })
  );

  // Verify object existence & size in R2
  const head = await r2Client.send(
    new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );

  if (head.ContentLength !== buffer.length) {
    throw new Error(
      `R2 upload size mismatch for key ${key}: expected ${buffer.length} bytes, got ${head.ContentLength}`
    );
  }

  return { success: true, key };
};

const extractGridFsId = (urlPath) => {
  if (!urlPath || typeof urlPath !== "string") return null;
  const match = urlPath.match(/\/api\/images\/([a-f0-9]{24})/);
  return match ? match[1] : null;
};

// ── Migration Tasks per Model ─────────────────────────────────────────────

async function migrateUsers(r2Client, imageBucket) {
  console.log("\n📦 [1/9] Checking Users for Avatar Migration...");
  const query = { avatarImageId: { $ne: null }, avatarR2Key: null };
  const count = await User.countDocuments(query);
  console.log(`   Found ${count} user avatar(s) to migrate.`);

  let cursor = User.find(query);
  if (itemLimit > 0) cursor = cursor.limit(itemLimit);
  const users = await cursor;

  for (const user of users) {
    stats.totalProcessed++;
    try {
      const fileId = user.avatarImageId.toString();
      const files = await imageBucket.find({ _id: user.avatarImageId }).toArray();
      if (!files.length) {
        console.warn(`   ⚠️ User ${user._id} avatar file not found in GridFS (${fileId})`);
        stats.skipped++;
        continue;
      }

      const fileMeta = files[0];
      const buffer = await readGridFsFileBuffer(imageBucket, user.avatarImageId, fileMeta.length);
      const key = `avatars/${user._id}-${Date.now()}.jpg`;

      await uploadAndVerifyR2(
        r2Client,
        R2_CONFIG.publicBucket,
        key,
        buffer,
        fileMeta.contentType || "image/jpeg"
      );

      stats.totalBytes += buffer.length;
      stats.totalUploaded++;

      if (!isDryRun) {
        user.avatarR2Key = key;
        user.avatarStorageProvider = "r2";
        user.avatar = R2_CONFIG.publicDomain
          ? `${R2_CONFIG.publicDomain}/${key}`
          : `/api/images/r2/${encodeURIComponent(key)}`;
        await user.save();
      }
      console.log(`   ✅ User ${user._id} avatar migrated: ${key} (${buffer.length} bytes)`);
    } catch (err) {
      stats.errors++;
      console.error(`   ❌ Failed migrating avatar for user ${user._id}:`, err.message);
    }
  }
}

async function migrateCourses(r2Client, imageBucket) {
  console.log("\n📦 [2/9] Checking Courses for Banner Migration...");
  const query = { bannerImageId: { $ne: null }, bannerR2Key: null };
  const count = await Course.countDocuments(query);
  console.log(`   Found ${count} course banner(s) to migrate.`);

  let cursor = Course.find(query);
  if (itemLimit > 0) cursor = cursor.limit(itemLimit);
  const courses = await cursor;

  for (const course of courses) {
    stats.totalProcessed++;
    try {
      const files = await imageBucket.find({ _id: course.bannerImageId }).toArray();
      if (!files.length) {
        stats.skipped++;
        continue;
      }
      const buffer = await readGridFsFileBuffer(imageBucket, course.bannerImageId, files[0].length);
      const key = `courses/${course._id}-${Date.now()}.jpg`;

      await uploadAndVerifyR2(
        r2Client,
        R2_CONFIG.publicBucket,
        key,
        buffer,
        files[0].contentType || "image/jpeg"
      );

      stats.totalBytes += buffer.length;
      stats.totalUploaded++;

      if (!isDryRun) {
        course.bannerR2Key = key;
        course.storageProvider = "r2";
        course.bannerImage = R2_CONFIG.publicDomain
          ? `${R2_CONFIG.publicDomain}/${key}`
          : `/api/images/r2/${encodeURIComponent(key)}`;
        await course.save();
      }
      console.log(`   ✅ Course ${course.title} banner migrated: ${key}`);
    } catch (err) {
      stats.errors++;
      console.error(`   ❌ Failed migrating course banner ${course._id}:`, err.message);
    }
  }
}

async function migrateTools(r2Client, imageBucket) {
  console.log("\n📦 [3/9] Checking Tools for Banner Migration...");
  const query = { bannerImageId: { $ne: null }, bannerR2Key: null };
  const count = await Tool.countDocuments(query);
  console.log(`   Found ${count} tool banner(s) to migrate.`);

  let cursor = Tool.find(query);
  if (itemLimit > 0) cursor = cursor.limit(itemLimit);
  const tools = await cursor;

  for (const tool of tools) {
    stats.totalProcessed++;
    try {
      const files = await imageBucket.find({ _id: tool.bannerImageId }).toArray();
      if (!files.length) {
        stats.skipped++;
        continue;
      }
      const buffer = await readGridFsFileBuffer(imageBucket, tool.bannerImageId, files[0].length);
      const key = `tools/${tool._id}-${Date.now()}.jpg`;

      await uploadAndVerifyR2(
        r2Client,
        R2_CONFIG.publicBucket,
        key,
        buffer,
        files[0].contentType || "image/jpeg"
      );

      stats.totalBytes += buffer.length;
      stats.totalUploaded++;

      if (!isDryRun) {
        tool.bannerR2Key = key;
        tool.storageProvider = "r2";
        tool.bannerImage = R2_CONFIG.publicDomain
          ? `${R2_CONFIG.publicDomain}/${key}`
          : `/api/images/r2/${encodeURIComponent(key)}`;
        await tool.save();
      }
      console.log(`   ✅ Tool ${tool.title} banner migrated: ${key}`);
    } catch (err) {
      stats.errors++;
      console.error(`   ❌ Failed migrating tool banner ${tool._id}:`, err.message);
    }
  }
}

async function migrateCustomSections(r2Client, imageBucket) {
  console.log("\n📦 [4/9] Checking CustomSections for Banner Migration...");
  const query = {
    bannerImage: { $regex: /^\/api\/images\/[a-f0-9]{24}/ },
    bannerR2Key: null,
  };
  const count = await CustomSection.countDocuments(query);
  console.log(`   Found ${count} section banner(s) to migrate.`);

  let cursor = CustomSection.find(query);
  if (itemLimit > 0) cursor = cursor.limit(itemLimit);
  const sections = await cursor;

  for (const section of sections) {
    stats.totalProcessed++;
    try {
      const fileId = extractGridFsId(section.bannerImage);
      if (!fileId) continue;
      const files = await imageBucket.find({ _id: new mongoose.Types.ObjectId(fileId) }).toArray();
      if (!files.length) {
        stats.skipped++;
        continue;
      }
      const buffer = await readGridFsFileBuffer(imageBucket, fileId, files[0].length);
      const key = `sections/banners/${section._id}-${Date.now()}.jpg`;

      await uploadAndVerifyR2(
        r2Client,
        R2_CONFIG.publicBucket,
        key,
        buffer,
        files[0].contentType || "image/jpeg"
      );

      stats.totalBytes += buffer.length;
      stats.totalUploaded++;

      if (!isDryRun) {
        section.bannerR2Key = key;
        section.storageProvider = "r2";
        section.bannerImage = R2_CONFIG.publicDomain
          ? `${R2_CONFIG.publicDomain}/${key}`
          : `/api/images/r2/${encodeURIComponent(key)}`;
        await section.save();
      }
      console.log(`   ✅ Section ${section.name} banner migrated: ${key}`);
    } catch (err) {
      stats.errors++;
      console.error(`   ❌ Failed migrating section banner ${section._id}:`, err.message);
    }
  }
}

async function migrateSubSections(r2Client, imageBucket) {
  console.log("\n📦 [5/9] Checking SubSections for Block Images...");
  const query = {
    type: "image",
    imageUrl: { $regex: /^\/api\/images\/[a-f0-9]{24}/ },
    imageR2Key: null,
  };
  const count = await SubSection.countDocuments(query);
  console.log(`   Found ${count} subsection image block(s) to migrate.`);

  let cursor = SubSection.find(query);
  if (itemLimit > 0) cursor = cursor.limit(itemLimit);
  const blocks = await cursor;

  for (const block of blocks) {
    stats.totalProcessed++;
    try {
      const fileId = extractGridFsId(block.imageUrl);
      if (!fileId) continue;
      const files = await imageBucket.find({ _id: new mongoose.Types.ObjectId(fileId) }).toArray();
      if (!files.length) {
        stats.skipped++;
        continue;
      }
      const buffer = await readGridFsFileBuffer(imageBucket, fileId, files[0].length);
      const key = `sections/blocks/${block._id}-${Date.now()}.png`;

      await uploadAndVerifyR2(
        r2Client,
        R2_CONFIG.publicBucket,
        key,
        buffer,
        files[0].contentType || "image/png"
      );

      stats.totalBytes += buffer.length;
      stats.totalUploaded++;

      if (!isDryRun) {
        block.imageR2Key = key;
        block.storageProvider = "r2";
        block.imageUrl = R2_CONFIG.publicDomain
          ? `${R2_CONFIG.publicDomain}/${key}`
          : `/api/images/r2/${encodeURIComponent(key)}`;
        await block.save();
      }
      console.log(`   ✅ SubSection ${block.name} image migrated: ${key}`);
    } catch (err) {
      stats.errors++;
      console.error(`   ❌ Failed migrating subsection image ${block._id}:`, err.message);
    }
  }
}

async function migrateCapturedResources(r2Client, imageBucket) {
  console.log("\n📦 [6/9] Checking Captured Resources...");
  const query = { mediaGridFsId: { $ne: null }, mediaR2Key: null };
  const count = await CapturedResource.countDocuments(query);
  console.log(`   Found ${count} capture media item(s) to migrate.`);

  let cursor = CapturedResource.find(query);
  if (itemLimit > 0) cursor = cursor.limit(itemLimit);
  const captures = await cursor;

  for (const cap of captures) {
    stats.totalProcessed++;
    try {
      const files = await imageBucket.find({ _id: cap.mediaGridFsId }).toArray();
      if (!files.length) {
        stats.skipped++;
        continue;
      }
      const buffer = await readGridFsFileBuffer(imageBucket, cap.mediaGridFsId, files[0].length);
      const key = `captures/${cap._id}-${Date.now()}.jpg`;

      await uploadAndVerifyR2(
        r2Client,
        R2_CONFIG.privateBucket,
        key,
        buffer,
        files[0].contentType || "image/jpeg"
      );

      stats.totalBytes += buffer.length;
      stats.totalUploaded++;

      if (!isDryRun) {
        cap.mediaR2Key = key;
        cap.storageProvider = "r2";
        cap.mediaUrl = `/api/images/r2/${encodeURIComponent(key)}`;
        await cap.save();
      }
      console.log(`   ✅ Capture ${cap._id} media migrated: ${key}`);
    } catch (err) {
      stats.errors++;
      console.error(`   ❌ Failed migrating capture ${cap._id}:`, err.message);
    }
  }
}

async function migrateDiscordMessages(r2Client) {
  console.log("\n📦 [7/9] Checking Discord Messages...");
  const db = mongoose.connection.db;
  const discordBucket = new mongoose.mongo.GridFSBucket(db, { bucketName: "discord_media" });

  const query = { "media.gridFsId": { $ne: null }, "media.r2Key": null };
  const count = await DiscordMessage.countDocuments(query);
  console.log(`   Found ${count} discord message(s) with unmigrated media.`);

  let cursor = DiscordMessage.find(query);
  if (itemLimit > 0) cursor = cursor.limit(itemLimit);
  const messages = await cursor;

  for (const msg of messages) {
    stats.totalProcessed++;
    try {
      let modified = false;
      for (const media of msg.media) {
        if (media.gridFsId && !media.r2Key) {
          const fileId = new mongoose.Types.ObjectId(media.gridFsId);
          const files = await discordBucket.find({ _id: fileId }).toArray();
          if (!files.length) continue;

          const buffer = await readGridFsFileBuffer(discordBucket, fileId, files[0].length);
          const key = `discord/${msg._id}-${media.gridFsId}.jpg`;

          await uploadAndVerifyR2(
            r2Client,
            R2_CONFIG.privateBucket,
            key,
            buffer,
            media.type || files[0].contentType || "image/jpeg"
          );

          stats.totalBytes += buffer.length;
          stats.totalUploaded++;

          media.r2Key = key;
          media.storageProvider = "r2";
          modified = true;
        }
      }

      if (modified && !isDryRun) {
        await msg.save();
      }
      console.log(`   ✅ Discord message ${msg._id} media items migrated.`);
    } catch (err) {
      stats.errors++;
      console.error(`   ❌ Failed migrating discord message ${msg._id}:`, err.message);
    }
  }
}

async function migrateTelegramMessages(r2Client, imageBucket) {
  console.log("\n📦 [8/9] Checking Telegram Messages...");
  const query = {
    bannerImageId: { $ne: null, $regex: /^[a-f0-9]{24}$/ },
    bannerR2Key: null,
  };
  const count = await TelegramMessage.countDocuments(query);
  console.log(`   Found ${count} telegram message(s) to migrate.`);

  let cursor = TelegramMessage.find(query);
  if (itemLimit > 0) cursor = cursor.limit(itemLimit);
  const messages = await cursor;

  for (const msg of messages) {
    stats.totalProcessed++;
    try {
      const fileId = new mongoose.Types.ObjectId(msg.bannerImageId);
      const files = await imageBucket.find({ _id: fileId }).toArray();
      if (!files.length) {
        stats.skipped++;
        continue;
      }
      const buffer = await readGridFsFileBuffer(imageBucket, fileId, files[0].length);
      const key = `telegram/${msg._id}-${msg.bannerImageId}.jpg`;

      await uploadAndVerifyR2(
        r2Client,
        R2_CONFIG.privateBucket,
        key,
        buffer,
        files[0].contentType || "image/jpeg"
      );

      stats.totalBytes += buffer.length;
      stats.totalUploaded++;

      if (!isDryRun) {
        msg.bannerR2Key = key;
        msg.storageProvider = "r2";
        await msg.save();
      }
      console.log(`   ✅ Telegram message ${msg._id} banner migrated: ${key}`);
    } catch (err) {
      stats.errors++;
      console.error(`   ❌ Failed migrating telegram message ${msg._id}:`, err.message);
    }
  }
}

async function migrateBooks(r2Client, pdfBucket, imageBucket, audioBucket) {
  console.log("\n📦 [9/9] Checking Books (PDFs, Covers, Audiobooks)...");
  const count = await Book.countDocuments();
  console.log(`   Scanning ${count} total book(s)...`);

  let cursor = Book.find();
  if (itemLimit > 0) cursor = cursor.limit(itemLimit);
  const books = await cursor;

  for (const book of books) {
    stats.totalProcessed++;
    let modified = false;

    // 1. PDF Migration
    if (book.pdfFileId && !book.pdfR2Key) {
      try {
        const files = await pdfBucket.find({ _id: book.pdfFileId }).toArray();
        if (files.length) {
          console.log(`   📄 Migrating PDF for "${book.title}" (${files[0].length} bytes)...`);
          const buffer = await readGridFsFileBuffer(pdfBucket, book.pdfFileId, files[0].length);
          const key = `books/pdfs/${book._id}-${book.pdfFileId}.pdf`;

          await uploadAndVerifyR2(
            r2Client,
            R2_CONFIG.privateBucket,
            key,
            buffer,
            "application/pdf"
          );

          stats.totalBytes += buffer.length;
          stats.totalUploaded++;
          book.pdfR2Key = key;
          book.storageProvider = "r2";
          modified = true;
          console.log(`      ✅ PDF uploaded to R2: ${key}`);
        }
      } catch (pdfErr) {
        stats.errors++;
        console.error(`      ❌ Error migrating PDF for book ${book._id}:`, pdfErr.message);
      }
    }

    // 2. Cover Image Migration
    if (book.coverImageId && !book.coverR2Key) {
      try {
        const files = await imageBucket.find({ _id: book.coverImageId }).toArray();
        if (files.length) {
          const buffer = await readGridFsFileBuffer(imageBucket, book.coverImageId, files[0].length);
          const key = `books/covers/${book._id}-${Date.now()}.jpg`;

          await uploadAndVerifyR2(
            r2Client,
            R2_CONFIG.publicBucket,
            key,
            buffer,
            files[0].contentType || "image/jpeg"
          );

          stats.totalBytes += buffer.length;
          stats.totalUploaded++;
          book.coverR2Key = key;
          book.coverImage = R2_CONFIG.publicDomain
            ? `${R2_CONFIG.publicDomain}/${key}`
            : `/api/images/r2/${encodeURIComponent(key)}`;
          modified = true;
          console.log(`      ✅ Cover uploaded to R2: ${key}`);
        }
      } catch (coverErr) {
        stats.errors++;
        console.error(`      ❌ Error migrating cover for book ${book._id}:`, coverErr.message);
      }
    }

    // 3. Audio Tracks Migration
    for (const track of book.audioFiles || []) {
      if (track.fileId && !track.r2Key) {
        try {
          const files = await audioBucket.find({ _id: track.fileId }).toArray();
          if (files.length) {
            console.log(`   🎵 Migrating Audio track "${track.title}" (${files[0].length} bytes)...`);
            const buffer = await readGridFsFileBuffer(audioBucket, track.fileId, files[0].length);
            const key = `books/audios/${book._id}-${track.fileId}.mp3`;

            await uploadAndVerifyR2(
              r2Client,
              R2_CONFIG.privateBucket,
              key,
              buffer,
              files[0].contentType || "audio/mpeg"
            );

            stats.totalBytes += buffer.length;
            stats.totalUploaded++;
            track.r2Key = key;
            track.storageProvider = "r2";
            modified = true;
            console.log(`      ✅ Audio track uploaded to R2: ${key}`);
          }
        } catch (audioErr) {
          stats.errors++;
          console.error(`      ❌ Error migrating audio track ${track.title}:`, audioErr.message);
        }
      }
    }

    if (modified && !isDryRun) {
      await book.save();
    }
  }
}

// ── Main Controller ────────────────────────────────────────────────────────

async function main() {
  console.log("==========================================================");
  console.log("🚀 OrganizeUp: MongoDB GridFS → Cloudflare R2 Migration");
  console.log(`Mode: ${isDryRun ? "🔍 DRY-RUN (No writes)" : "⚡ LIVE MIGRATION"}`);
  if (targetModels) console.log(`Filter: [${targetModels.join(", ")}]`);
  if (itemLimit) console.log(`Limit: max ${itemLimit} items per model`);
  console.log("==========================================================");

  if (!process.env.MONGO_URI) {
    console.error("❌ Fatal: MONGO_URI is missing from environment.");
    process.exit(1);
  }

  if (!isDryRun && !isR2Configured()) {
    console.error("❌ Fatal: Cloudflare R2 credentials (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY) not configured.");
    process.exit(1);
  }

  const startTime = Date.now();

  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB Atlas.");

    initGridFS();
    const pdfBucket = getBucket("pdf");
    const imageBucket = getBucket("image");
    const audioBucket = getBucket("audio");
    const r2Client = isDryRun ? null : getR2Client();

    const shouldRun = (name) => !targetModels || targetModels.includes(name);

    if (shouldRun("user")) await migrateUsers(r2Client, imageBucket);
    if (shouldRun("course")) await migrateCourses(r2Client, imageBucket);
    if (shouldRun("tool")) await migrateTools(r2Client, imageBucket);
    if (shouldRun("section")) await migrateCustomSections(r2Client, imageBucket);
    if (shouldRun("subsection")) await migrateSubSections(r2Client, imageBucket);
    if (shouldRun("capture")) await migrateCapturedResources(r2Client, imageBucket);
    if (shouldRun("discord")) await migrateDiscordMessages(r2Client);
    if (shouldRun("telegram")) await migrateTelegramMessages(r2Client, imageBucket);
    if (shouldRun("book")) await migrateBooks(r2Client, pdfBucket, imageBucket, audioBucket);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    const mbTotal = (stats.totalBytes / (1024 * 1024)).toFixed(2);

    console.log("\n==========================================================");
    console.log("🎉 Migration Summary");
    console.log(`Status:            ${isDryRun ? "DRY-RUN Complete" : "LIVE Execution Complete"}`);
    console.log(`Time Elapsed:      ${elapsed}s`);
    console.log(`Records Scanned:   ${stats.totalProcessed}`);
    console.log(`Files Uploaded:    ${stats.totalUploaded}`);
    console.log(`Volume Transferred: ${mbTotal} MB`);
    console.log(`Skipped/Missing:   ${stats.skipped}`);
    console.log(`Errors Encountered:${stats.errors}`);
    console.log("==========================================================");
  } catch (fatal) {
    console.error("❌ Fatal migration error:", fatal);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
    process.exit(0);
  }
}

main();
