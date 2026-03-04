const Book = require("../models/Book");
const Course = require("../models/Course");
const Tool = require("../models/Tool");
const CustomSection = require("../models/CustomSection");
const Vote = require("../models/Vote");
const Comment = require("../models/Comment");

/**
 * Helper: attach vote & comment counts to content items
 */
const attachSocialCounts = async (items, contentType) => {
  return Promise.all(
    items.map(async (item) => {
      const obj = item.toObject ? item.toObject() : item;
      const [upvotes, downvotes, commentCount] = await Promise.all([
        Vote.countDocuments({ contentType, contentId: obj._id, value: 1 }),
        Vote.countDocuments({ contentType, contentId: obj._id, value: -1 }),
        Comment.countDocuments({ contentType, contentId: obj._id }),
      ]);
      return {
        ...obj,
        upvotes,
        downvotes,
        score: upvotes - downvotes,
        commentCount,
      };
    }),
  );
};

// @desc    Get all public content (explore feed)
// @route   GET /api/explore?type=all|books|courses|tools|sections&sort=latest|popular&search=...
const getExploreContent = async (req, res) => {
  try {
    const {
      type = "all",
      sort = "latest",
      search = "",
      page = 1,
      limit = 20,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const lim = parseInt(limit);
    const filter = { visibility: "public" };

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Section search uses 'name' instead of 'title'
    const sectionFilter = { visibility: "public" };
    if (search) {
      sectionFilter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    let results = { books: [], courses: [], tools: [], sections: [] };
    let totals = { books: 0, courses: 0, tools: 0, sections: 0 };

    // For popular sort: fetch ALL items (no limit), attach scores, sort by score, then slice.
    // For latest sort: fetch with pagination as usual.
    const isPopular = sort === "popular";
    const perType = type === "all" ? 6 : lim; // items to return per category

    if (type === "all" || type === "books") {
      const bookFilter = { ...filter };
      if (search) {
        bookFilter.$or = [
          ...(bookFilter.$or || []),
          { author: { $regex: search, $options: "i" } },
        ];
      }
      const [allBooks, bookCount] = await Promise.all([
        Book.find(bookFilter)
          .populate("addedBy", "name avatar")
          .sort({ createdAt: -1 }),
        Book.countDocuments(bookFilter),
      ]);
      let scored = await attachSocialCounts(allBooks, "book");
      if (isPopular) {
        scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
        results.books = scored.slice(0, perType);
      } else {
        const s = type === "books" ? skip : 0;
        results.books = scored.slice(s, s + perType);
      }
      totals.books = bookCount;
    }

    if (type === "all" || type === "courses") {
      const [allCourses, courseCount] = await Promise.all([
        Course.find(filter)
          .populate("addedBy", "name avatar")
          .populate("category", "name")
          .sort({ createdAt: -1 }),
        Course.countDocuments(filter),
      ]);
      let scored = await attachSocialCounts(allCourses, "course");
      if (isPopular) {
        scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
        results.courses = scored.slice(0, perType);
      } else {
        const s = type === "courses" ? skip : 0;
        results.courses = scored.slice(s, s + perType);
      }
      totals.courses = courseCount;
    }

    if (type === "all" || type === "tools") {
      const [allTools, toolCount] = await Promise.all([
        Tool.find(filter)
          .populate("addedBy", "name avatar")
          .sort({ createdAt: -1 }),
        Tool.countDocuments(filter),
      ]);
      let scored = await attachSocialCounts(allTools, "tool");
      if (isPopular) {
        scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
        results.tools = scored.slice(0, perType);
      } else {
        const s = type === "tools" ? skip : 0;
        results.tools = scored.slice(s, s + perType);
      }
      totals.tools = toolCount;
    }

    if (type === "all" || type === "sections") {
      const [allSections, sectionCount] = await Promise.all([
        CustomSection.find(sectionFilter)
          .populate("addedBy", "name avatar")
          .sort({ createdAt: -1 }),
        CustomSection.countDocuments(sectionFilter),
      ]);
      let scored = await attachSocialCounts(allSections, "section");
      // Normalize 'name' → 'title' for consistent card rendering
      scored = scored.map((s) => ({ ...s, title: s.name }));
      if (isPopular) {
        scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
        results.sections = scored.slice(0, perType);
      } else {
        const s = type === "sections" ? skip : 0;
        results.sections = scored.slice(s, s + perType);
      }
      totals.sections = sectionCount;
    }

    res.json({ results, totals });
  } catch (error) {
    console.error("Explore error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get a single public content item with full social data
// @route   GET /api/explore/:contentType/:contentId
const getExploreItem = async (req, res) => {
  try {
    const { contentType, contentId } = req.params;
    const models = {
      book: Book,
      course: Course,
      tool: Tool,
      section: CustomSection,
    };
    const Model = models[contentType];

    if (!Model) {
      return res.status(400).json({ message: "Invalid content type" });
    }

    const item = await Model.findById(contentId).populate(
      "addedBy",
      "name avatar",
    );

    if (!item || item.visibility !== "public") {
      return res.status(404).json({ message: "Content not found" });
    }

    const [upvotes, downvotes, commentCount] = await Promise.all([
      Vote.countDocuments({ contentType, contentId, value: 1 }),
      Vote.countDocuments({ contentType, contentId, value: -1 }),
      Comment.countDocuments({ contentType, contentId }),
    ]);

    let userVote = 0;
    if (req.user) {
      const v = await Vote.findOne({
        contentType,
        contentId,
        user: req.user._id,
      });
      userVote = v?.value || 0;
    }

    res.json({
      item: {
        ...item.toObject(),
        upvotes,
        downvotes,
        score: upvotes - downvotes,
        commentCount,
        userVote,
      },
    });
  } catch (error) {
    console.error("Get explore item error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getExploreContent, getExploreItem };
