const Book = require("../models/Book");
const Course = require("../models/Course");
const Tool = require("../models/Tool");
const CustomSection = require("../models/CustomSection");
const YoutubePlaylist = require("../models/YoutubePlaylist");
const Vote = require("../models/Vote");
const Comment = require("../models/Comment");

const EXPLORE_LIST_SELECT = {
  book: "title author type description coverImage videos.thumbnail addedBy",
  course: "title description bannerImage addedBy",
  tool: "title description bannerImage addedBy",
  section: "title name description bannerImage addedBy",
  playlist:
    "title type channelTitle thumbnail videoCount videos.thumbnail addedBy",
};

// Escape special regex chars to prevent ReDoS / injection
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Batch-fetch vote & comment counts for a list of items.
 * Runs 2 aggregation queries instead of N×3 countDocuments calls,
 * reducing explore page DB queries from ~240 down to 8 (2 per content type).
 */
const attachSocialCounts = async (items, contentType, userId = null) => {
  if (!items.length) return [];
  const ids = items.map((item) => item._id);

  const [voteAgg, commentAgg, userVotes] = await Promise.all([
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
    userId
      ? Vote.find({
          contentType,
          contentId: { $in: ids },
          user: userId,
        }).lean()
      : Promise.resolve([]),
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
  const userVoteMap = {};
  if (userVotes && userVotes.length) {
    for (const v of userVotes) {
      userVoteMap[String(v.contentId)] = v.value;
    }
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
      userVote: userVoteMap[id] || 0,
    };
  });
};

const fetchPopularItems = async ({
  Model,
  filter,
  contentType,
  select,
  populate,
  skip,
  limit,
  userId,
}) => {
  const projection = Object.fromEntries(
    select.split(/\s+/).map((field) => [field, 1]),
  );
  projection._id = 1;

  let items = await Model.aggregate([
    { $match: filter },
    {
      $lookup: {
        from: Vote.collection.name,
        let: { contentId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$contentType", contentType] },
                  { $eq: ["$contentId", "$$contentId"] },
                ],
              },
            },
          },
          { $project: { value: 1, _id: 0 } },
        ],
        as: "votesForScore",
      },
    },
    {
      $addFields: {
        _sortScore: {
          $subtract: [
            {
              $size: {
                $filter: {
                  input: "$votesForScore",
                  as: "vote",
                  cond: { $eq: ["$$vote.value", 1] },
                },
              },
            },
            {
              $size: {
                $filter: {
                  input: "$votesForScore",
                  as: "vote",
                  cond: { $eq: ["$$vote.value", -1] },
                },
              },
            },
          ],
        },
      },
    },
    { $sort: { _sortScore: -1, createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
    { $project: { ...projection, _sortScore: 1, votesForScore: 1 } },
    { $unset: ["_sortScore", "votesForScore"] },
  ]);

  items = await Model.populate(items, populate);
  return attachSocialCounts(items, contentType, userId);
};

// @desc    Get all public content (explore feed)
// @route   GET /api/explore?type=all|books|courses|tools|sections|playlists&sort=latest|popular&search=...
const getExploreContent = async (req, res) => {
  try {
    const {
      type = "all",
      sort = "latest",
      search = "",
      page = 1,
      limit = 20,
    } = req.query;

    let normalizedType = (type || "all").toLowerCase().trim();
    if (normalizedType === "tricks" || normalizedType === "trick")
      normalizedType = "tools";
    if (normalizedType === "playlist") normalizedType = "playlists";
    if (normalizedType === "book") normalizedType = "books";
    if (normalizedType === "course") normalizedType = "courses";
    if (normalizedType === "tool") normalizedType = "tools";

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const lim = parseInt(limit);
    const isPopular = sort === "popular";
    // "all" view shows 6 items per category; specific type views use full pagination
    const perType = normalizedType === "all" ? 6 : lim;

    const filter = { visibility: /^public$/i };
    if (search) {
      const safe = escapeRegex(search);
      filter.$or = [
        { title: { $regex: safe, $options: "i" } },
        { description: { $regex: safe, $options: "i" } },
      ];
    }

    // Section search uses 'name' instead of 'title'
    const sectionFilter = { visibility: /^public$/i };
    if (search) {
      const safe = escapeRegex(search);
      sectionFilter.$or = [
        { name: { $regex: safe, $options: "i" } },
        { description: { $regex: safe, $options: "i" } },
      ];
    }

    // Playlist search includes channelTitle
    const playlistFilter = { visibility: /^public$/i };
    if (search) {
      const safe = escapeRegex(search);
      playlistFilter.$or = [
        { title: { $regex: safe, $options: "i" } },
        { description: { $regex: safe, $options: "i" } },
        { channelTitle: { $regex: safe, $options: "i" } },
      ];
    }

    const bookFilter = { ...filter };
    if (search) {
      const safe = escapeRegex(search);
      bookFilter.$or = [
        ...(bookFilter.$or || []),
        { author: { $regex: safe, $options: "i" } },
      ];
    }

    // Always fetch global totals for all categories
    const [bookCount, courseCount, toolCount, sectionCount, playlistCount] =
      await Promise.all([
        Book.countDocuments(bookFilter),
        Course.countDocuments(filter),
        Tool.countDocuments(filter),
        CustomSection.countDocuments(sectionFilter),
        YoutubePlaylist.countDocuments(playlistFilter),
      ]);

    const totals = {
      books: bookCount,
      courses: courseCount,
      tools: toolCount,
      sections: sectionCount,
      playlists: playlistCount,
    };

    const results = {
      books: [],
      courses: [],
      tools: [],
      sections: [],
      playlists: [],
    };

    if (normalizedType === "all" || normalizedType === "books") {
      // For latest sort: paginate at DB level; for popular: fetch all for in-memory scoring
      const dbSkip = isPopular ? 0 : normalizedType === "books" ? skip : 0;
      let bookQuery = Book.find(bookFilter)
        .select(EXPLORE_LIST_SELECT.book)
        .populate("addedBy", "name avatar")
        .sort({ createdAt: -1 })
        .lean();
      if (!isPopular) bookQuery = bookQuery.skip(dbSkip).limit(perType);

      if (isPopular) {
        results.books = await fetchPopularItems({
          Model: Book,
          filter: bookFilter,
          contentType: "book",
          select: EXPLORE_LIST_SELECT.book,
          populate: { path: "addedBy", select: "name avatar" },
          skip,
          limit: perType,
          userId: req.user?._id,
        });
      } else {
        const books = await bookQuery.lean();
        results.books = await attachSocialCounts(books, "book", req.user?._id);
      }
    }

    if (normalizedType === "all" || normalizedType === "courses") {
      const dbSkip = isPopular ? 0 : normalizedType === "courses" ? skip : 0;
      let courseQuery = Course.find(filter)
        .select(EXPLORE_LIST_SELECT.course)
        .populate("addedBy", "name avatar")
        .populate("category", "name")
        .sort({ createdAt: -1 })
        .lean();
      if (!isPopular) courseQuery = courseQuery.skip(dbSkip).limit(perType);

      if (isPopular) {
        results.courses = await fetchPopularItems({
          Model: Course,
          filter,
          contentType: "course",
          select: EXPLORE_LIST_SELECT.course,
          populate: { path: "addedBy", select: "name avatar" },
          skip,
          limit: perType,
          userId: req.user?._id,
        });
      } else {
        const courses = await courseQuery.lean();
        results.courses = await attachSocialCounts(
          courses,
          "course",
          req.user?._id,
        );
      }
    }

    if (normalizedType === "all" || normalizedType === "tools") {
      const dbSkip = isPopular ? 0 : normalizedType === "tools" ? skip : 0;
      let toolQuery = Tool.find(filter)
        .select(EXPLORE_LIST_SELECT.tool)
        .populate("addedBy", "name avatar")
        .sort({ createdAt: -1 })
        .lean();
      if (!isPopular) toolQuery = toolQuery.skip(dbSkip).limit(perType);

      if (isPopular) {
        results.tools = await fetchPopularItems({
          Model: Tool,
          filter,
          contentType: "tool",
          select: EXPLORE_LIST_SELECT.tool,
          populate: { path: "addedBy", select: "name avatar" },
          skip,
          limit: perType,
          userId: req.user?._id,
        });
      } else {
        const tools = await toolQuery.lean();
        results.tools = await attachSocialCounts(tools, "tool", req.user?._id);
      }
    }

    if (normalizedType === "all" || normalizedType === "sections") {
      const dbSkip = isPopular ? 0 : normalizedType === "sections" ? skip : 0;
      let sectionQuery = CustomSection.find(sectionFilter)
        .select(EXPLORE_LIST_SELECT.section)
        .populate("addedBy", "name avatar")
        .sort({ createdAt: -1 })
        .lean();
      if (!isPopular) sectionQuery = sectionQuery.skip(dbSkip).limit(perType);

      if (isPopular) {
        const popularSections = await fetchPopularItems({
          Model: CustomSection,
          filter: sectionFilter,
          contentType: "section",
          select: EXPLORE_LIST_SELECT.section,
          populate: { path: "addedBy", select: "name avatar" },
          skip,
          limit: perType,
          userId: req.user?._id,
        });
        results.sections = popularSections.map((s) => ({
          ...s,
          title: s.name,
        }));
      } else {
        const sections = await sectionQuery.lean();
        let scored = await attachSocialCounts(
          sections,
          "section",
          req.user?._id,
        );
        // Normalize 'name' → 'title' for consistent card rendering
        results.sections = scored.map((s) => ({ ...s, title: s.name }));
      }
    }

    if (normalizedType === "all" || normalizedType === "playlists") {
      const dbSkip = isPopular ? 0 : normalizedType === "playlists" ? skip : 0;
      let playlistQuery = YoutubePlaylist.find(playlistFilter)
        .select(EXPLORE_LIST_SELECT.playlist)
        .populate("addedBy", "name avatar")
        .sort({ createdAt: -1 })
        .lean();
      if (!isPopular) playlistQuery = playlistQuery.skip(dbSkip).limit(perType);

      if (isPopular) {
        results.playlists = await fetchPopularItems({
          Model: YoutubePlaylist,
          filter: playlistFilter,
          contentType: "playlist",
          select: EXPLORE_LIST_SELECT.playlist,
          populate: { path: "addedBy", select: "name avatar" },
          skip,
          limit: perType,
          userId: req.user?._id,
        });
      } else {
        const rawPlaylists = await playlistQuery.lean();
        // CRITICAL PRIVACY FIX:
        // Guarantee that all notes are wiped out in public Explore feeds!
        const sanitizedPlaylists = rawPlaylists.map((pl) => ({
          ...pl,
          videos: (pl.videos || []).map((v) => ({ ...v, notes: "" })),
        }));

        results.playlists = await attachSocialCounts(
          sanitizedPlaylists,
          "playlist",
          req.user?._id,
        );
      }
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
      playlist: YoutubePlaylist,
      video: YoutubePlaylist,
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

    const itemObj = item.toObject();
    // Guarantee that video notes are never leaked in public explore details
    if (itemObj.videos && Array.isArray(itemObj.videos)) {
      itemObj.videos = itemObj.videos.map((v) => ({ ...v, notes: "" }));
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
        ...itemObj,
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
