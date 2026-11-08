/**
 * Sync Real Books to R2 & Purge Link-Only Books
 *
 * For books with direct downloadable legal PDFs:
 *  - Downloads real PDF binary
 *  - Uploads to Cloudflare R2 under `books/pdfs/`
 *  - Updates book to native text PDF with `storageProvider: 'r2'` and `embedLink`
 *
 * For link-only books (no direct PDF):
 *  - Removes them from MongoDB Atlas so only real, R2-backed books remain.
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const Book = require("../models/Book");
const { uploadFile } = require("../services/storageService");

const REAL_PDF_SOURCES = {
  "b-eloquent": {
    url: "https://eloquentjavascript.net/Eloquent_JavaScript.pdf",
    filename: "eloquent-javascript.pdf",
  },
  "b-progit": {
    url: "https://github.com/progit/progit2/releases/download/2.1.427/progit.pdf",
    filename: "pro-git-2nd-edition.pdf",
  },
  "b-mml": {
    url: "https://mml-book.github.io/book/mml-book.pdf",
    filename: "mathematics-for-machine-learning.pdf",
  },
  "b-ods": {
    url: "https://opendatastructures.org/ods-python.pdf",
    filename: "open-data-structures-python.pdf",
  },
  "b-d2l": {
    url: "https://d2l.ai/d2l-en.pdf",
    filename: "dive-into-deep-learning.pdf",
  },
};

async function main() {
  console.log("==============================================================");
  console.log("  Syncing Real Books to R2 & Purging Link-Only Books");
  console.log("==============================================================");

  await mongoose.connect(process.env.MONGO_URI, { family: 4 });
  console.log("✅ Connected to MongoDB Atlas.\n");

  const seededBooks = await Book.find({ seedId: { $type: "string" } });
  console.log(`Found ${seededBooks.length} seeded books in database.`);

  const keptBooks = [];
  const removedBooks = [];

  for (const book of seededBooks) {
    // If it's already in R2 (like b-sicp)
    if (book.storageProvider === "r2" && book.pdfR2Key) {
      console.log(`  ⚡ [${book.seedId}] "${book.title}" -> ALREADY in R2 (${book.pdfR2Key})`);
      keptBooks.push(book);
      continue;
    }

    const source = REAL_PDF_SOURCES[book.seedId];
    if (source) {
      console.log(`  📥 Downloading real PDF for [${book.seedId}] "${book.title}"...`);
      try {
        const res = await fetch(source.url, {
          signal: AbortSignal.timeout(60000),
          headers: { "User-Agent": "Mozilla/5.0" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buffer = Buffer.from(await res.arrayBuffer());
        console.log(`     Downloaded ${(buffer.length / 1024 / 1024).toFixed(2)} MB.`);

        const slug = encodeURIComponent(book.title.replace(/[^a-zA-Z0-9-]/g, "-"));
        const uploaded = await uploadFile({
          buffer,
          originalname: source.filename || `${slug}.pdf`,
          mimetype: "application/pdf",
          folder: "books/pdfs",
          isPublic: false,
          bucketType: "pdf",
        });

        console.log(`     ☁️ Uploaded to R2: ${uploaded.key}`);

        book.pdfR2Key = uploaded.key;
        book.storageProvider = "r2";
        book.type = "text";
        book.sourceType = "upload";
        book.embedLink = `/api/books/pdf/${book._id}/${slug}.pdf`;
        book.externalUrl = ""; // Native reader enabled!
        await book.save();

        console.log(`     ✅ Live in Atlas & R2!\n`);
        keptBooks.push(book);
      } catch (err) {
        console.error(`     ❌ Failed to download/upload ${book.seedId}: ${err.message}`);
        removedBooks.push(book._id);
      }
    } else {
      // Link-only book with no direct PDF -> purge as requested
      removedBooks.push(book._id);
      console.log(`  🗑️ Removing link-only book (no direct PDF): [${book.seedId}] "${book.title}"`);
    }
  }

  if (removedBooks.length > 0) {
    const delRes = await Book.deleteMany({ _id: { $in: removedBooks } });
    console.log(`\nSuccessfully removed ${delRes.deletedCount} empty link-only books.`);
  }

  const finalAllBooks = await Book.countDocuments();
  const finalUserBooks = await Book.countDocuments({ seedId: { $exists: false } });
  const finalSeededR2Books = await Book.countDocuments({ seedId: { $type: "string" }, storageProvider: "r2" });

  console.log("\n==============================================================");
  console.log("📊 Final Book Counts in MongoDB Atlas:");
  console.log(`   User Books: ${finalUserBooks} (100% intact)`);
  console.log(`   Seeded Real R2 Books: ${finalSeededR2Books} (Stored in R2, native reader)`);
  console.log(`   Total Books: ${finalAllBooks}`);
  console.log("==============================================================");

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal Error:", err);
  process.exit(1);
});

