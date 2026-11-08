/**
 * OrganizeUp Catalog Seeding Script
 * 
 * Flags:
 *   --check-links            GET/HEAD each external URL; generates server/seed/link-report.json
 *   --resolve-playlists      Queries YouTube API for candidate playlists; writes server/seed/playlist-candidates.json
 *   --dry-run (default)      Simulates catalog seed; prints details of what would be created/updated without DB writes
 *   --commit                 Executes database writes. Requires --confirm-env=production and valid SEED_USER_EMAIL
 *   --confirm-env=production Confirmation required when --commit is passed
 *   --seed-user-email=<mail> CLI override for SEED_USER_EMAIL env var
 */

const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const { google } = require("googleapis");

const Book = require("../models/Book");
const Course = require("../models/Course");
const Tool = require("../models/Tool");
const CustomSection = require("../models/CustomSection");
const SubSection = require("../models/SubSection");
const YoutubePlaylist = require("../models/YoutubePlaylist");
const Category = require("../models/Category");
const User = require("../models/User");

// ── Verified Authors for Catalog Books ─────────────────────────
// Authors strictly filled only when certain; otherwise source organization. Never invented.
const VERIFIED_AUTHORS = {
  "b-sicp": "Harold Abelson, Gerald Jay Sussman, Julie Sussman",
  "b-ostep": "Remzi H. and Andrea C. Arpaci-Dusseau",
  "b-crafting": "Robert Nystrom",
  "b-progit": "Scott Chacon, Ben Straub",
  "b-eloquent": "Marijn Haverbeke",
  "b-atbs": "Al Sweigart",
  "b-thinkpy": "Allen B. Downey",
  "b-py4e": "Charles R. Severance",
  "b-pds": "Jake VanderPlas",
  "b-d2l": "Aston Zhang, Zachary C. Lipton, Mu Li, Alexander J. Smola",
  "b-dlbook": "Ian Goodfellow, Yoshua Bengio, Aaron Courville",
  "b-mml": "Marc Peter Deisenroth, A. Aldo Faisal, Cheng Soon Ong",
  "b-isl": "Gareth James, Daniela Witten, Trevor Hastie, Robert Tibshirani",
  "b-esl": "Trevor Hastie, Robert Tibshirani, Jerome Friedman",
  "b-nielsen": "Michael Nielsen",
  "b-slp": "Daniel Jurafsky, James H. Martin",
  "b-sutton": "Richard S. Sutton, Andrew G. Barto",
  "b-pml": "Kevin P. Murphy",
  "b-erickson": "Jeff Erickson",
  "b-ods": "Pat Morin",
  "b-rust": "Steve Klabnik, Carol Nichols",
  "b-tlcl": "William E. Shotts, Jr.",
  "b-beej": "Brian Hall",
  "b-thinkstats": "Allen B. Downey",
  "b-byte": "C. H. Swaroop",
  "b-hefferon": "Jim Hefferon",
  "b-openstax-calc": "OpenStax",
  "b-meditations": "Marcus Aurelius",
  "b-artofwar": "Sun Tzu",
  "b-walden": "Henry David Thoreau",
};

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function formatDescription(item) {
  const base = (item.description || "").trim();
  const sourceLine = [];
  if (item.url) sourceLine.push(`Source: ${item.url}`);
  if (item.license) sourceLine.push(`License: ${item.license}`);
  if (item.cost) sourceLine.push(`Cost: ${item.cost}`);
  if (item.level) sourceLine.push(`Level: ${item.level}`);

  if (sourceLine.length === 0) return base;
  return `${base}\n\n${sourceLine.join(" | ")}`.trim();
}

// ── Check Links ────────────────────────────────────────────────
async function checkUrl(url) {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
    });

    const status = res.status;
    if (status >= 200 && status < 400) {
      return { status: "ok", code: status, url };
    }
    if (status === 403 || status === 429) {
      return {
        status: "unverified",
        code: status,
        url,
        reason: `Status ${status} (Bot protection / Rate limit)`,
      };
    }
    if (status === 404 || status === 410) {
      return {
        status: "dead",
        code: status,
        url,
        reason: `HTTP ${status} Not Found`,
      };
    }
    return {
      status: "unverified",
      code: status,
      url,
      reason: `HTTP ${status}`,
    };
  } catch (err) {
    return {
      status: "dead",
      code: 0,
      url,
      reason: err.name === "TimeoutError" ? "Timeout after 5s" : (err.message || "Network Error"),
    };
  }
}

async function runCheckLinks(catalogItems) {
  console.log("\n==============================================================");
  console.log("  🔍 Running Link Verification (--check-links)");
  console.log("==============================================================");

  const report = {
    generatedAt: new Date().toISOString(),
    totalChecked: 0,
    ok: [],
    dead: [],
    unverified: [],
  };

  const linkItems = catalogItems.filter(
    (i) => i.url && (i.type === "book" || i.type === "course" || i.type === "tool")
  );

  console.log(`Checking ${linkItems.length} external resource URLs (concurrency: 5)...`);

  const CONCURRENCY = 5;
  let cursor = 0;

  async function worker() {
    while (cursor < linkItems.length) {
      const idx = cursor++;
      const item = linkItems[idx];
      const result = await checkUrl(item.url);
      report.totalChecked++;

      const entry = {
        id: item.id,
        type: item.type,
        title: item.title,
        url: item.url,
        code: result.code,
        reason: result.reason || undefined,
      };

      if (result.status === "ok") {
        report.ok.push(entry);
        console.log(`[${idx + 1}/${linkItems.length}] ${item.id} -> ✅ OK (${result.code})`);
      } else if (result.status === "unverified") {
        report.unverified.push(entry);
        console.log(`[${idx + 1}/${linkItems.length}] ${item.id} -> ⚠️ UNVERIFIED (${result.code || "block"}: ${result.reason})`);
      } else {
        report.dead.push(entry);
        console.log(`[${idx + 1}/${linkItems.length}] ${item.id} -> ❌ DEAD (${result.reason})`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  const outPath = path.resolve(__dirname, "../seed/link-report.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`\nLink report saved to: ${outPath}`);
  console.log(`Summary: ${report.ok.length} OK, ${report.unverified.length} Unverified, ${report.dead.length} Dead`);
  return report;
}

// ── Resolve Playlists ──────────────────────────────────────────
async function runResolvePlaylists(catalogItems) {
  console.log("\n==============================================================");
  console.log("  🎥 Resolving YouTube Playlists (--resolve-playlists)");
  console.log("==============================================================");

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY is not defined in environment.");
  }

  const youtube = google.youtube({
    version: "v3",
    auth: apiKey,
  });

  const playlistItems = catalogItems.filter((i) => i.type === "playlist");
  console.log(`Resolving ${playlistItems.length} playlists via YouTube API...`);

  const results = [];

  for (let idx = 0; idx < playlistItems.length; idx++) {
    const item = playlistItems[idx];
    const query = item.searchQuery || item.title;
    process.stdout.write(`[${idx + 1}/${playlistItems.length}] Searching for "${query}"... `);

    try {
      const searchRes = await youtube.search.list({
        part: "snippet",
        q: query,
        type: "playlist",
        maxResults: 5,
      });

      const items = searchRes.data.items || [];
      const playlistIds = items.map((x) => x.id?.playlistId).filter(Boolean);

      let detailed = {};
      if (playlistIds.length > 0) {
        const detailsRes = await youtube.playlists.list({
          part: "snippet,contentDetails",
          id: playlistIds.join(","),
        });
        for (const pl of detailsRes.data.items || []) {
          detailed[pl.id] = pl;
        }
      }

      const candidates = items.map((cand) => {
        const pid = cand.id?.playlistId;
        const det = detailed[pid] || cand;
        const channelTitle = det.snippet?.channelTitle || cand.snippet?.channelTitle || "";
        const title = det.snippet?.title || cand.snippet?.title || "";
        const videoCount = det.contentDetails?.itemCount || 0;
        const thumbnail =
          det.snippet?.thumbnails?.medium?.url ||
          det.snippet?.thumbnails?.default?.url ||
          "";

        const matchesHint = Boolean(
          item.channelHint &&
            channelTitle.toLowerCase().includes(item.channelHint.toLowerCase())
        );

        return {
          playlistId: pid,
          title,
          channelTitle,
          videoCount,
          url: `https://www.youtube.com/playlist?list=${pid}`,
          thumbnail,
          matchesChannelHint: matchesHint,
        };
      });

      console.log(`found ${candidates.length} candidate(s)`);

      results.push({
        id: item.id,
        catalogTitle: item.title,
        category: item.category,
        channelHint: item.channelHint || "",
        searchQuery: query,
        candidates,
      });
    } catch (err) {
      console.log(`error: ${err.message}`);
      results.push({
        id: item.id,
        catalogTitle: item.title,
        category: item.category,
        channelHint: item.channelHint || "",
        searchQuery: query,
        candidates: [],
        error: err.message,
      });
    }

    // Rate-limit safety pause
    await new Promise((r) => setTimeout(r, 200));
  }

  const outPath = path.resolve(__dirname, "../seed/playlist-candidates.json");
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2), "utf8");
  console.log(`\nPlaylist candidates saved to: ${outPath}`);
  console.log("NOTE: No playlists were inserted into the database. Playlists must be approved before commit.");
  return results;
}

// ── Main Seed Workflow ─────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const isCheckLinks = args.includes("--check-links");
  const isResolvePlaylists = args.includes("--resolve-playlists");
  const isCommit = args.includes("--commit");
  const hasConfirmProd = args.includes("--confirm-env=production");
  const emailArg = args.find((a) => a.startsWith("--seed-user-email="))?.split("=")[1];
  const uriArg = args.find((a) => a.startsWith("--mongo-uri="))?.slice("--mongo-uri=".length);

  const isDryRun = !isCommit;

  console.log("==============================================================");
  console.log("  OrganizeUp Catalog Seeding Engine");
  console.log(`  Mode: ${isDryRun ? "DRY-RUN (Simulate only, no writes)" : "COMMIT (Database writes enabled)"}`);
  console.log("==============================================================");

  // 1. Verify Catalog File
  const catalogPath = path.resolve(__dirname, "../seed/organizeup-seed-catalog.json");
  if (!fs.existsSync(catalogPath)) {
    throw new Error(`Catalog file not found at ${catalogPath}`);
  }

  const catalogRaw = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
  const items = catalogRaw.items || [];
  const counts = { book: 0, course: 0, tool: 0, playlist: 0, roadmap: 0 };
  items.forEach((item) => {
    if (counts[item.type] !== undefined) counts[item.type]++;
  });

  console.log(`Catalog Verification:`);
  console.log(`  Total Items: ${items.length} (Expected: 105)`);
  console.log(`  Breakdown: Books=${counts.book} (30), Courses=${counts.course} (28), Tools=${counts.tool} (22), Playlists=${counts.playlist} (21), Roadmaps=${counts.roadmap} (4)`);

  if (
    items.length !== 105 ||
    counts.book !== 30 ||
    counts.course !== 28 ||
    counts.tool !== 22 ||
    counts.playlist !== 21 ||
    counts.roadmap !== 4
  ) {
    throw new Error(
      `Catalog integrity check failed! Expected exactly 105 items (30/28/22/21/4), but got ${items.length} (${JSON.stringify(counts)}). Halting.`
    );
  }
  console.log("  ✅ Catalog integrity check passed: exactly 105 items.");

  // 2. Execute stand-alone operations if requested
  if (isCheckLinks) {
    await runCheckLinks(items);
    if (!isResolvePlaylists && !isCommit) return;
  }

  if (isResolvePlaylists) {
    await runResolvePlaylists(items);
    if (!isCommit) return;
  }

  // 3. Connect to Database (optional in dry-run, mandatory in commit)
  let dbConnected = false;
  const mongoOptions = {
    serverSelectionTimeoutMS: 4000,
    socketTimeoutMS: 30000,
    connectTimeoutMS: 5000,
    family: 4,
  };

  const primaryUri = uriArg || process.env.MONGO_URI;
  const fallbackUri = uriArg ? null : process.env.MONGO_URI_DIRECT;

  console.log("\nConnecting to MongoDB...");
  if (primaryUri) {
    try {
      await mongoose.connect(primaryUri, mongoOptions);
      dbConnected = true;
      console.log("  ✅ MongoDB connected successfully.");
    } catch (err1) {
      if (fallbackUri) {
        try {
          await mongoose.connect(fallbackUri, mongoOptions);
          dbConnected = true;
          console.log("  ✅ MongoDB connected successfully via fallback URI.");
        } catch (err2) {
          if (isCommit) {
            console.error("\n❌ MongoDB Atlas Connection Blocked: Your current IP address is not whitelisted in Atlas Network Access.");
            console.error("   Please open MongoDB Atlas -> Network Access -> Add IP Address, then add your current public IP (or 0.0.0.0/0 temporarily).");
            throw new Error(`MongoDB connection failed on commit: ${err2.message}`);
          } else {
            console.log(`  ℹ️ [Dry-run notice]: MongoDB unreachable (${err2.message}). Simulating dry-run using catalog and local seed state.`);
          }
        }
      } else {
        if (isCommit) {
          console.error("\n❌ MongoDB Atlas Connection Blocked: Your current IP address is not whitelisted in Atlas Network Access.");
          console.error("   Please open MongoDB Atlas -> Network Access -> Add IP Address, then add your current public IP (or 0.0.0.0/0 temporarily).");
          throw new Error(`MongoDB connection failed on commit: ${err1.message}`);
        } else {
          console.log(`  ℹ️ [Dry-run notice]: MongoDB unreachable (${err1.message}). Simulating dry-run using catalog and local seed state.`);
        }
      }
    }
  } else if (isCommit) {
    throw new Error("MONGO_URI is not set in environment.");
  }

  // 4. Resolve SEED_USER_EMAIL
  const targetEmail = process.env.SEED_USER_EMAIL || emailArg || "talhaagency7@gmail.com";
  let seedUser = null;

  if (targetEmail && dbConnected) {
    seedUser = await User.findOne({ email: targetEmail.toLowerCase().trim() });
    if (!seedUser && isCommit) {
      throw new Error(`SEED_USER_EMAIL "${targetEmail}" does not match any existing user in MongoDB! Create the user first.`);
    }
  }

  if (!seedUser) {
    if (isCommit) {
      throw new Error("SEED_USER_EMAIL is required for --commit! Specify in .env or via --seed-user-email=<email>.");
    } else {
      console.log(`\n  ℹ️ [Dry-run notice]: SEED_USER_EMAIL is unset or database offline. Simulating owner attribution.`);
    }
  } else {
    console.log(`\n  Seed Owner: ${seedUser.name || "User"} (${seedUser.email}) [ID: ${seedUser._id}]`);
  }

  // 5. Read link-report to exclude dead links
  let deadUrls = new Set();
  const linkReportPath = path.resolve(__dirname, "../seed/link-report.json");
  if (fs.existsSync(linkReportPath)) {
    try {
      const lr = JSON.parse(fs.readFileSync(linkReportPath, "utf8"));
      (lr.dead || []).forEach((d) => deadUrls.add(d.url));
      console.log(`  Loaded link-report: ${deadUrls.size} dead URL(s) will be prevented from insertion.`);
    } catch {
      // ignore parse error
    }
  }

  // 6. Read playlist-approved.json
  let approvedPlaylists = new Map();
  const approvedPath = path.resolve(__dirname, "../seed/playlist-approved.json");
  if (fs.existsSync(approvedPath)) {
    try {
      const appList = JSON.parse(fs.readFileSync(approvedPath, "utf8"));
      if (Array.isArray(appList)) {
        appList.forEach((pl) => {
          if (pl.id) approvedPlaylists.set(pl.id, pl);
        });
      }
      console.log(`  Loaded playlist-approved: ${approvedPlaylists.size} playlist(s) approved for insertion.`);
    } catch {
      // ignore
    }
  }

  // 7. Check existing seed documents in DB
  let existingBooks = [];
  let existingCourses = [];
  let existingTools = [];
  let existingPlaylists = [];
  let existingSections = [];

  if (dbConnected) {
    [existingBooks, existingCourses, existingTools, existingPlaylists, existingSections] = await Promise.all([
      Book.find({ seedId: { $ne: null } }).select("seedId title").lean(),
      Course.find({ seedId: { $ne: null } }).select("seedId title").lean(),
      Tool.find({ seedId: { $ne: null } }).select("seedId title").lean(),
      YoutubePlaylist.find({ seedId: { $ne: null } }).select("seedId title").lean(),
      CustomSection.find({ seedId: { $ne: null } }).select("seedId name").lean(),
    ]);
  }

  const existingMap = {
    book: new Map(existingBooks.map((b) => [b.seedId, b])),
    course: new Map(existingCourses.map((c) => [c.seedId, c])),
    tool: new Map(existingTools.map((t) => [t.seedId, t])),
    playlist: new Map(existingPlaylists.map((p) => [p.seedId, p])),
    roadmap: new Map(existingSections.map((s) => [s.seedId, s])),
  };

  // 8. Process Books
  console.log("\n--------------------------------------------------------------");
  console.log("  📚 Processing Books (30 items)");
  console.log("--------------------------------------------------------------");
  const bookItems = items.filter((i) => i.type === "book");
  const bookStats = { wouldCreate: 0, wouldUpdate: 0, skippedDead: 0 };

  for (const b of bookItems) {
    if (deadUrls.has(b.url)) {
      console.log(`  ❌ Skipping dead link: ${b.id} (${b.title})`);
      bookStats.skippedDead++;
      continue;
    }

    const author = VERIFIED_AUTHORS[b.id] || "OrganizeUp Curated";
    const exists = existingMap.book.get(b.id);
    if (exists) bookStats.wouldUpdate++;
    else bookStats.wouldCreate++;

    if (isCommit) {
      await Book.findOneAndUpdate(
        { seedId: b.id },
        {
          $set: {
            title: b.title,
            author,
            type: "text",
            sourceType: "external",
            externalUrl: b.url,
            topic: b.category || "General",
            description: formatDescription(b),
            visibility: "public",
            addedBy: seedUser._id,
            seedId: b.id,
            seedMeta: {
              license: b.license || "",
              level: b.level || "",
              cost: b.cost || "free",
              sourceUrl: b.url,
            },
          },
        },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
      );
    }
  }
  console.log(`  Books: ${bookStats.wouldCreate} would create, ${bookStats.wouldUpdate} would update, ${bookStats.skippedDead} skipped dead.`);

  // 9. Process Courses (Match Category case-insensitively)
  console.log("\n--------------------------------------------------------------");
  console.log("  🎓 Processing Courses (28 items)");
  console.log("--------------------------------------------------------------");
  const courseItems = items.filter((i) => i.type === "course");
  const courseStats = { wouldCreate: 0, wouldUpdate: 0, skippedDead: 0, categoriesCreated: 0 };

  const resolvedCategories = new Map();

  for (const c of courseItems) {
    if (deadUrls.has(c.url)) {
      console.log(`  ❌ Skipping dead link: ${c.id} (${c.title})`);
      courseStats.skippedDead++;
      continue;
    }

    const catName = (c.category || "General").trim();
    let categoryDoc = resolvedCategories.get(catName.toLowerCase());

    if (!categoryDoc) {
      if (dbConnected) {
        categoryDoc = await Category.findOne({
          name: { $regex: new RegExp(`^${escapeRegex(catName)}$`, "i") },
        });
      }

      if (!categoryDoc) {
        if (isCommit && seedUser) {
          categoryDoc = await Category.create({
            name: catName,
            isGlobal: true,
            createdBy: seedUser._id,
            description: `Courses in ${catName}`,
          });
          courseStats.categoriesCreated++;
        } else {
          categoryDoc = { _id: new mongoose.Types.ObjectId(), name: catName };
          courseStats.categoriesCreated++;
        }
      }
      resolvedCategories.set(catName.toLowerCase(), categoryDoc);
    }

    const exists = existingMap.course.get(c.id);
    if (exists) courseStats.wouldUpdate++;
    else courseStats.wouldCreate++;

    if (isCommit) {
      await Course.findOneAndUpdate(
        { seedId: c.id },
        {
          $set: {
            title: c.title,
            category: categoryDoc._id,
            sourceType: "external",
            externalUrl: c.url,
            description: formatDescription(c),
            visibility: "public",
            addedBy: seedUser._id,
            seedId: c.id,
            seedMeta: {
              license: c.license || "",
              level: c.level || "",
              cost: c.cost || "free",
              sourceUrl: c.url,
            },
          },
        },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
      );
    }
  }
  console.log(`  Courses: ${courseStats.wouldCreate} would create, ${courseStats.wouldUpdate} would update, ${courseStats.skippedDead} skipped dead. Categories to create: ${courseStats.categoriesCreated}`);

  // 10. Process Tools
  console.log("\n--------------------------------------------------------------");
  console.log("  ⚡ Processing Tools (22 items)");
  console.log("--------------------------------------------------------------");
  const toolItems = items.filter((i) => i.type === "tool");
  const toolStats = { wouldCreate: 0, wouldUpdate: 0, skippedDead: 0 };

  for (const t of toolItems) {
    if (deadUrls.has(t.url)) {
      console.log(`  ❌ Skipping dead link: ${t.id} (${t.title})`);
      toolStats.skippedDead++;
      continue;
    }

    const exists = existingMap.tool.get(t.id);
    if (exists) toolStats.wouldUpdate++;
    else toolStats.wouldCreate++;

    if (isCommit) {
      await Tool.findOneAndUpdate(
        { seedId: t.id },
        {
          $set: {
            title: t.title,
            link: t.url,
            topic: t.category || "Tools & Systems",
            description: formatDescription(t),
            visibility: "public",
            addedBy: seedUser._id,
            seedId: t.id,
            seedMeta: {
              license: t.license || "",
              level: t.level || "",
              cost: t.cost || "free",
              sourceUrl: t.url,
            },
          },
        },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
      );
    }
  }
  console.log(`  Tools: ${toolStats.wouldCreate} would create, ${toolStats.wouldUpdate} would update, ${toolStats.skippedDead} skipped dead.`);

  // 11. Process Playlists (only approved candidates)
  console.log("\n--------------------------------------------------------------");
  console.log("  📹 Processing Playlists (21 catalog items)");
  console.log("--------------------------------------------------------------");
  const playlistItems = items.filter((i) => i.type === "playlist");
  const playlistStats = { approved: 0, unapproved: 0, wouldCreate: 0, wouldUpdate: 0 };

  for (const p of playlistItems) {
    const approved = approvedPlaylists.get(p.id);
    if (!approved) {
      playlistStats.unapproved++;
      continue;
    }

    playlistStats.approved++;
    const exists = existingMap.playlist.get(p.id);
    if (exists) playlistStats.wouldUpdate++;
    else playlistStats.wouldCreate++;

    if (isCommit) {
      await YoutubePlaylist.findOneAndUpdate(
        { seedId: p.id },
        {
          $set: {
            title: approved.title || p.title,
            type: "playlist",
            playlistId: approved.playlistId,
            url: approved.url,
            playlistUrl: approved.url,
            channelTitle: approved.channelTitle || p.channelHint || "",
            thumbnail: approved.thumbnail || "",
            videoCount: approved.videoCount || 0,
            topic: p.category || "AI & ML",
            description: formatDescription(p),
            visibility: "public",
            addedBy: seedUser._id,
            seedId: p.id,
            seedMeta: {
              license: p.license || "YouTube Standard",
              level: p.level || "",
              cost: p.cost || "free",
              sourceUrl: approved.url,
            },
          },
        },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
      );
    }
  }
  console.log(`  Playlists: ${playlistStats.approved} approved (${playlistStats.wouldCreate} create, ${playlistStats.wouldUpdate} update), ${playlistStats.unapproved} awaiting manual approval in playlist-approved.json.`);

  // 12. Process Roadmaps LAST
  console.log("\n--------------------------------------------------------------");
  console.log("  🗺️ Processing Roadmaps (4 items) [Created LAST]");
  console.log("--------------------------------------------------------------");
  const roadmapItems = items.filter((i) => i.type === "roadmap");
  const roadmapStats = { wouldCreate: 0, wouldUpdate: 0, totalResolvedLinks: 0, skippedNoUrl: 0 };

  // Build a lookup map of all catalog items by id
  const catalogMap = new Map(items.map((i) => [i.id, i]));

  for (const r of roadmapItems) {
    const exists = existingMap.roadmap.get(r.id);
    if (exists) roadmapStats.wouldUpdate++;
    else roadmapStats.wouldCreate++;

    // Resolve links for each item in itemIds
    const resolvedLinks = [];
    for (const refId of r.itemIds || []) {
      const refItem = catalogMap.get(refId);
      if (!refItem) {
        roadmapStats.skippedNoUrl++;
        continue;
      }

      let resolvedUrl = refItem.url || "";
      let platform = "web";
      let mediaType = "article";

      if (refItem.type === "playlist") {
        const approved = approvedPlaylists.get(refItem.id);
        if (approved && approved.url) {
          resolvedUrl = approved.url;
          platform = "youtube";
          mediaType = "video";
        }
      }

      // Requirement 4: skip any item that has no resolved URL
      if (!resolvedUrl || deadUrls.has(resolvedUrl)) {
        roadmapStats.skippedNoUrl++;
        continue;
      }

      resolvedLinks.push({
        title: refItem.title,
        url: resolvedUrl,
        description: refItem.description || "",
        platform,
        mediaType,
      });
    }

    roadmapStats.totalResolvedLinks += resolvedLinks.length;
    console.log(`  Roadmap "${r.title}": ${resolvedLinks.length}/${(r.itemIds || []).length} items resolved`);

    if (isCommit) {
      // Requirement 4: non-blue, non-purple color that exists in section color enum ('emerald')
      const sectionDoc = await CustomSection.findOneAndUpdate(
        { seedId: r.id },
        {
          $set: {
            name: r.title,
            description: `Curated roadmap: ${r.title}\nCategory: ${r.category}`,
            icon: "compass",
            color: "emerald",
            topic: r.category || "General",
            visibility: "public",
            publishMode: "with_data",
            addedBy: seedUser._id,
            seedId: r.id,
            seedMeta: {
              license: "Free & Open Resources",
              level: "curated",
              cost: "free",
              sourceUrl: "",
            },
          },
        },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
      );

      // Create or update SubSection with type 'links'
      await SubSection.findOneAndUpdate(
        { seedId: `${r.id}-links` },
        {
          $set: {
            sectionId: sectionDoc._id,
            name: "Roadmap Milestones & Resources",
            type: "links",
            order: 0,
            addedBy: seedUser._id,
            links: resolvedLinks,
            seedId: `${r.id}-links`,
          },
        },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
      );
    }
  }
  console.log(`  Roadmaps: ${roadmapStats.wouldCreate} would create, ${roadmapStats.wouldUpdate} would update. Total resolved links: ${roadmapStats.totalResolvedLinks}, Skipped items with no URL: ${roadmapStats.skippedNoUrl}.`);

  // 13. Summary
  console.log("\n==============================================================");
  console.log("  📊 Seeding Simulation Summary");
  console.log("==============================================================");
  console.log(`  Books:     ${bookStats.wouldCreate} to create, ${bookStats.wouldUpdate} to update`);
  console.log(`  Courses:   ${courseStats.wouldCreate} to create, ${courseStats.wouldUpdate} to update (${courseStats.categoriesCreated} categories)`);
  console.log(`  Tools:     ${toolStats.wouldCreate} to create, ${toolStats.wouldUpdate} to update`);
  console.log(`  Playlists: ${playlistStats.approved} approved (${playlistStats.unapproved} awaiting approval)`);
  console.log(`  Roadmaps:  ${roadmapStats.wouldCreate} to create, ${roadmapStats.wouldUpdate} to update (color: emerald)`);
  console.log("==============================================================");

  if (isDryRun) {
    console.log("\n✨ DRY RUN COMPLETE. No data was written to MongoDB, R2, or GridFS.");
    console.log("To check external links:       node server/scripts/seedCatalog.js --check-links");
    console.log("To resolve YouTube candidates: node server/scripts/seedCatalog.js --resolve-playlists");
    console.log("To commit changes:             SEED_USER_EMAIL=... node server/scripts/seedCatalog.js --commit --confirm-env=production\n");
  } else {
    console.log("\n🎉 COMMIT COMPLETE. Public catalog successfully seeded into database!\n");
  }

  if (dbConnected) {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error("\n❌ Fatal Error:", err);
  process.exit(1);
});
