const Book = require("../models/Book");
const Course = require("../models/Course");
const Tool = require("../models/Tool");
const CustomSection = require("../models/CustomSection");
const Vote = require("../models/Vote");
const Comment = require("../models/Comment");

// Escape special regex chars to prevent ReDoS / injection
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Batch-fetch vote & comment counts for a list of items.
 * Runs 2 aggregation queries instead of N×3 countDocuments calls,
 * reducing explore page DB queries from ~240 down to 8 (2 per content type).
 */
const attachSocialCounts = async (items, contentType) => {
  if (!items.length) return [];
  const ids = items.map((item) => item._id);

  const [voteAgg, commentAgg] = await Promise.all([
    Vote.aggregate([
      { $match: { contentType, contentId: { $in: ids } } },
      {
        $group: {
          _id: { contentId: "$contentId", value: "$value" },
          count: { $sum: 1 },
        },
      },
    ]),
    Comment.aggregate([
      { $match: { contentType, contentId: { $in: ids } } },
      { $group: { _id: "$contentId", count: { $sum: 1 } } },
    ]),
  ]);

  const upvoteMap = {};
  const downvoteMap = {};
  for (const { _id, count } of voteAgg) {
    const id = String(_id.contentId);
    if (_id.value === 1) upvoteMap[id] = count;
    else downvoteMap[id] = count;
  }
  const commentMap = {};
  for (const { _id, count } of commentAgg) {
    commentMap[String(_id)] = count;
  }

  return items.map((item) => {
    const id = String(item._id);
    const upvotes = upvoteMap[id] || 0;
    const downvotes = downvoteMap[id] || 0;
    return {
      ...item,
      upvotes,
      downvotes,
      score: upvotes - downvotes,
      commentCount: commentMap[id] || 0,
    };
  });
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
    const isPopular = sort === "popular";
    // "all" view shows 6 items per category; specific type views use full pagination
    const perType = type === "all" ? 6 : lim;

    const filter = { visibility: "public" };
    if (search) {
      const safe = escapeRegex(search);
      filter.$or = [
        { title: { $regex: safe, $options: "i" } },
        { description: { $regex: safe, $options: "i" } },
      ];
    }

    // Section search uses 'name' instead of 'title'
    const sectionFilter = { visibility: "public" };
    if (search) {
      const safe = escapeRegex(search);
      sectionFilter.$or = [
        { name: { $regex: safe, $options: "i" } },
        { description: { $regex: safe, $options: "i" } },
      ];
    }

    const results = { books: [], courses: [], tools: [], sections: [] };
    const totals = { books: 0, courses: 0, tools: 0, sections: 0 };

    if (type === "all" || type === "books") {
      const bookFilter = { ...filter };
      if (search) {
        const safe = escapeRegex(search);
        bookFilter.$or = [
          ...(bookFilter.$or || []),
          { author: { $regex: safe, $options: "i" } },
        ];
      }
      // For latest sort: paginate at DB level; for popular: fetch all for in-memory scoring
      const dbSkip = isPopular ? 0 : (type === "books" ? skip : 0);
      let bookQuery = Book.find(bookFilter)
        .populate("addedBy", "name avatar")
        .sort({ createdAt: -1 })
        .lean();
      if (!isPopular) bookQuery = bookQuery.skip(dbSkip).limit(perType);

      const [books, bookCount] = await Promise.all([
        bookQuery,
        Book.countDocuments(bookFilter),
      ]);
      let scored = await attachSocialCounts(books, "book");
      if (isPopular) {
        scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
        results.books = scored.slice(0, perType);
      } else {
        results.books = scored;
      }
      totals.books = bookCount;
    }

    if (type === "all" || type === "courses") {
      const dbSkip = isPopular ? 0 : (type === "courses" ? skip : 0);
      let courseQuery = Course.find(filter)
        .populate("addedBy", "name avatar")
        .populate("category", "name")
        .sort({ createdAt: -1 })
        .lean();
      if (!isPopular) courseQuery = courseQuery.skip(dbSkip).limit(perType);

      const [courses, courseCount] = await Promise.all([
        courseQuery,
        Course.countDocuments(filter),
      ]);
      let scored = await attachSocialCounts(courses, "course");
      if (isPopular) {
        scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
        results.courses = scored.slice(0, perType);
      } else {
        results.courses = scored;
      }
      totals.courses = courseCount;
    }

    if (type === "all" || type === "tools") {
      const dbSkip = isPopular ? 0 : (type === "tools" ? skip : 0);
      let toolQuery = Tool.find(filter)
        .populate("addedBy", "name avatar")
        .sort({ createdAt: -1 })
        .lean();
      if (!isPopular) toolQuery = toolQuery.skip(dbSkip).limit(perType);

      const [tools, toolCount] = await Promise.all([
        toolQuery,
        Tool.countDocuments(filter),
      ]);
      let scored = await attachSocialCounts(tools, "tool");
      if (isPopular) {
        scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
        results.tools = scored.slice(0, perType);
      } else {
        results.tools = scored;
      }
      totals.tools = toolCount;
    }

    if (type === "all" || type === "sections") {
      const dbSkip = isPopular ? 0 : (type === "sections" ? skip : 0);
      let sectionQuery = CustomSection.find(sectionFilter)
        .populate("addedBy", "name avatar")
        .sort({ createdAt: -1 })
        .lean();
      if (!isPopular) sectionQuery = sectionQuery.skip(dbSkip).limit(perType);

      const [sections, sectionCount] = await Promise.all([
        sectionQuery,
        CustomSection.countDocuments(sectionFilter),
      ]);
      let scored = await attachSocialCounts(sections, "section");
      // Normalize 'name' → 'title' for consistent card rendering
      scored = scored.map((s) => ({ ...s, title: s.name }));
      if (isPopular) {
        scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
        results.sections = scored.slice(0, perType);
      } else {
        results.sections = scored;
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
