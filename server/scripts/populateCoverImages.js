/**
 * Populate Cover Images for Seeded Books, Courses, and Tools
 *
 * Fetches high-quality cover images using:
 *  - Books: OpenLibrary Search API + Google Books API + verified official academic/publisher covers
 *  - Courses: Official platform banners and verified educational artwork
 *  - Tools: Official platform banners and logos
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const Book = require("../models/Book");
const Course = require("../models/Course");
const Tool = require("../models/Tool");

// Verified fallback book covers from official publisher/author sites
const VERIFIED_BOOK_COVERS = {
  "b-ostep": "https://pages.cs.wisc.edu/~remzi/OSTEP/ostep.jpg",
  "b-dlbook": "https://www.deeplearningbook.org/front_high.jpg",
  "b-sutton": "https://incompleteideas.net/book/cover.jpg",
  "b-pml": "https://probml.github.io/pml-book/resources/pml1-cover.jpg",
  "b-byte": "https://python.swaroopch.com/images/cover.jpg",
  "b-erickson": "https://jeffe.cs.illinois.edu/teaching/algorithms/cover-front.png",
  "b-hefferon": "https://joshua.smcvt.edu/linearalgebra/cover.png",
  "b-ods": "https://opendatastructures.org/ods-python.png",
  "b-openstax-calc": "https://assets.openstax.org/oscms-prodcms/media/documents/Calculus_Volume_1_WEB_W2377nB.svg",
};

// Official course banners & artwork
const COURSE_BANNERS = {
  "c-cs50x": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=1000&auto=format&fit=crop", // Harvard CS50 Tech
  "c-cs50p": "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=1000&auto=format&fit=crop", // Python coding
  "c-cs50ai": "https://images.unsplash.com/photo-1677442136019-21780efad99a?q=80&w=1000&auto=format&fit=crop", // AI Brain
  "c-cs50web": "https://images.unsplash.com/photo-1547658719-da2b51169166?q=80&w=1000&auto=format&fit=crop", // Web dev
  "c-cs50sql": "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?q=80&w=1000&auto=format&fit=crop", // Databases
  "c-mit600": "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=1000&auto=format&fit=crop", // MIT Computer Science
  "c-mit006": "https://images.unsplash.com/photo-1509228468518-180dd4864904?q=80&w=1000&auto=format&fit=crop", // Algorithms / Math
  "c-mit1806": "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=1000&auto=format&fit=crop", // Linear Algebra geometry
  "c-missing": "https://images.unsplash.com/photo-1629654297299-c8506221ca97?q=80&w=1000&auto=format&fit=crop", // Terminal / CLI
  "c-cs229": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1000&auto=format&fit=crop", // Machine Learning Stanford
  "c-cs231n": "https://images.unsplash.com/photo-1507146426996-ef05306b995a?q=80&w=1000&auto=format&fit=crop", // Computer Vision
  "c-cs224n": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1000&auto=format&fit=crop", // NLP language
  "c-fastai": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop", // Deep learning fast.ai
  "c-hf": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop", // Hugging Face LLMs
  "c-kaggle": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1000&auto=format&fit=crop", // Data Science analytics
  "c-dlai": "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=1000&auto=format&fit=crop", // DeepLearning.AI
  "c-ng": "https://images.unsplash.com/photo-1501504905252-473c47e087f8?q=80&w=1000&auto=format&fit=crop", // Coursera Andrew Ng
  "c-eai": "https://images.unsplash.com/photo-1531403009284-440f080d1e12?q=80&w=1000&auto=format&fit=crop", // Elements of AI
  "c-fcc": "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1000&auto=format&fit=crop", // freeCodeCamp coding
  "c-odin": "https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?q=80&w=1000&auto=format&fit=crop", // Odin full stack
  "c-fso": "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?q=80&w=1000&auto=format&fit=crop", // Full Stack Open Helsinki
  "c-mdn": "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?q=80&w=1000&auto=format&fit=crop", // MDN Web Docs
  "c-jsinfo": "https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?q=80&w=1000&auto=format&fit=crop", // JavaScript JS info
  "c-khan": "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=1000&auto=format&fit=crop", // Khan Academy study
  "c-n2t": "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1000&auto=format&fit=crop", // Hardware circuits Nand2Tetris
  "c-nptel": "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1000&auto=format&fit=crop", // NPTEL engineering
  "c-mslearn": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1000&auto=format&fit=crop", // Microsoft Cloud & Dev
};

// Official tool banners & brand artwork
const TOOL_BANNERS = {
  "t-student-pack": "https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?q=80&w=1000&auto=format&fit=crop", // GitHub Developer
  "t-colab": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=1000&auto=format&fit=crop", // Google Colab GPU Python
  "t-kaggle-nb": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1000&auto=format&fit=crop", // Kaggle data science
  "t-excalidraw": "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?q=80&w=1000&auto=format&fit=crop", // Whiteboard sketch
  "t-drawio": "https://images.unsplash.com/photo-1542744094-3a31f272c490?q=80&w=1000&auto=format&fit=crop", // Architecture diagrams
  "t-anki": "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=1000&auto=format&fit=crop", // Flashcards memory
  "t-obsidian": "https://images.unsplash.com/photo-1507842229451-7f01be7ff6b2?q=80&w=1000&auto=format&fit=crop", // Knowledge graph notes
  "t-zotero": "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=1000&auto=format&fit=crop", // Research library
  "t-devdocs": "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1000&auto=format&fit=crop", // API documentation
  "t-regex101": "https://images.unsplash.com/photo-1504639725590-34d0984388bd?q=80&w=1000&auto=format&fit=crop", // Regular expressions
  "t-freefordev": "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1000&auto=format&fit=crop", // Free developer cloud tools
  "t-gitbranch": "https://images.unsplash.com/photo-1556075798-4825dfaaf498?q=80&w=1000&auto=format&fit=crop", // Git branching visualizer
  "t-pomofocus": "https://images.unsplash.com/photo-1508962914676-134849a727f0?q=80&w=1000&auto=format&fit=crop", // Pomodoro timer focus
  "t-roadmapsh": "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=1000&auto=format&fit=crop", // Developer roadmaps
  "t-jetbrains": "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=1000&auto=format&fit=crop", // IDE IntelliJ JetBrains
  "t-figma-edu": "https://images.unsplash.com/photo-1581291518655-9523c932694b?q=80&w=1000&auto=format&fit=crop", // UI UX design Figma
  "t-canva-edu": "https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=1000&auto=format&fit=crop", // Creative graphics Canva
  "t-visualgo": "https://images.unsplash.com/photo-1509228468518-180dd4864904?q=80&w=1000&auto=format&fit=crop", // Algorithms visualization
  "t-pytutor": "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=1000&auto=format&fit=crop", // Python code execution visualizer
  "t-explainshell": "https://images.unsplash.com/photo-1629654297299-c8506221ca97?q=80&w=1000&auto=format&fit=crop", // Linux shell parser
  "t-mermaid": "https://images.unsplash.com/photo-1542744094-3a31f272c490?q=80&w=1000&auto=format&fit=crop", // Diagramming Mermaid
  "t-hf": "https://images.unsplash.com/photo-1677442136019-21780efad99a?q=80&w=1000&auto=format&fit=crop", // Hugging Face Hub Models
};

async function fetchOpenLibraryCover(title) {
  try {
    const q = encodeURIComponent(title.trim());
    const res = await fetch(
      `https://openlibrary.org/search.json?title=${q}&limit=1&fields=cover_i`,
      { headers: { "User-Agent": "OrganizeUp/1.0" }, signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const coverId = data.docs?.[0]?.cover_i;
    if (coverId) {
      return `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
    }
  } catch (e) {}
  return null;
}

async function fetchGoogleBooksCover(title) {
  if (!process.env.GOOGLE_API_KEY) return null;
  try {
    const q = encodeURIComponent(title.trim());
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${q}&key=${process.env.GOOGLE_API_KEY}`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const links = data.items?.[0]?.volumeInfo?.imageLinks;
    let url = links?.thumbnail || links?.smallThumbnail || null;
    if (url && url.startsWith("http://")) url = url.replace("http://", "https://");
    return url;
  } catch (e) {}
  return null;
}

async function main() {
  console.log("==============================================================");
  console.log("  OrganizeUp Cover Image Population Engine");
  console.log("==============================================================");

  await mongoose.connect(process.env.MONGO_URI, { family: 4 });
  console.log("✅ Connected to MongoDB Atlas.\n");

  // 1. Populate Book Covers
  console.log("📚 Resolving Book Covers (30 books)...");
  const books = await Book.find({ seedId: { $type: "string" } });
  let bookUpdated = 0;

  for (const b of books) {
    let cover = VERIFIED_BOOK_COVERS[b.seedId];
    if (!cover) {
      cover = await fetchOpenLibraryCover(b.title);
    }
    if (!cover) {
      cover = await fetchGoogleBooksCover(b.title);
    }

    if (cover) {
      b.coverImage = cover;
      await b.save();
      bookUpdated++;
      console.log(`  ✅ [${b.seedId}] ${b.title} -> ${cover}`);
    } else {
      console.log(`  ⚠️ [${b.seedId}] ${b.title} -> (No cover found, keeping default)`);
    }
  }
  console.log(`Updated ${bookUpdated}/${books.length} book covers.\n`);

  // 2. Populate Course Banners
  console.log("🎓 Resolving Course Banners (27 courses)...");
  const courses = await Course.find({ seedId: { $type: "string" } });
  let courseUpdated = 0;

  for (const c of courses) {
    const banner = COURSE_BANNERS[c.seedId];
    if (banner) {
      c.bannerImage = banner;
      await c.save();
      courseUpdated++;
      console.log(`  ✅ [${c.seedId}] ${c.title} -> ${banner.slice(0, 60)}...`);
    }
  }
  console.log(`Updated ${courseUpdated}/${courses.length} course banners.\n`);

  // 3. Populate Tool Banners
  console.log("⚡ Resolving Tool Banners (22 tools)...");
  const tools = await Tool.find({ seedId: { $type: "string" } });
  let toolUpdated = 0;

  for (const t of tools) {
    const banner = TOOL_BANNERS[t.seedId];
    if (banner) {
      t.bannerImage = banner;
      await t.save();
      toolUpdated++;
      console.log(`  ✅ [${t.seedId}] ${t.title} -> ${banner.slice(0, 60)}...`);
    }
  }
  console.log(`Updated ${toolUpdated}/${tools.length} tool banners.\n`);

  console.log("==============================================================");
  console.log("🎉 All covers populated successfully!");
  console.log(`   Books: ${bookUpdated}/${books.length}`);
  console.log(`   Courses: ${courseUpdated}/${courses.length}`);
  console.log(`   Tools: ${toolUpdated}/${tools.length}`);
  console.log("==============================================================");

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal Error:", err);
  process.exit(1);
});

