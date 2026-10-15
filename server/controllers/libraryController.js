const mongoose = require("mongoose");
const UserLibrary = require("../models/UserLibrary");
const Book = require("../models/Book");
const Course = require("../models/Course");
const Tool = require("../models/Tool");
const CustomSection = require("../models/CustomSection");
const YoutubePlaylist = require("../models/YoutubePlaylist");

const models = {
  book: Book,
  course: Course,
  tool: Tool,
  section: CustomSection,
  playlist: YoutubePlaylist,
  video: YoutubePlaylist,
};

const CONTENT_LIST_SELECT = {
  book: "title name type author coverImage videos.thumbnail addedBy",
  course: "title name description bannerImage category addedBy",
  tool: "title name description bannerImage addedBy",
  section: "title name description bannerImage addedBy",
  playlist:
    "title name type thumbnail thumbnailUrl videoCount videos.thumbnail addedBy",
};

const getOptionalPagination = (query) => {
  const hasPagination = query.page !== undefined || query.limit !== undefined;
  if (!hasPagination) return null;

  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  return { skip: (page - 1) * limit, limit };
};

const applyPagination = (query, pagination) =>
  pagination ? query.skip(pagination.skip).limit(pagination.limit) : query;

// @desc    Get user's library (saved public items + own private items)
// @route   GET /api/library?type=all|books|courses|tools
const getLibrary = async (req, res) => {
  try {
    const userId = req.user._id;
    const { type = "all" } = req.query;
    const pagination = getOptionalPagination(req.query);

    const result = { books: [], courses: [], tools: [], saved: [] };

    // 1. Get user's own content (private + pending)
    if (type === "all" || type === "books") {
      result.books = await applyPagination(
        Book.find({ addedBy: userId }).select(
          "title author type description coverImage driveLink totalPages addedBy visibility videos audioFiles._id audioFiles.title audioFiles.originalName audioFiles.size",
        ),
        pagination,
      )
        .populate("addedBy", "name avatar")
        .sort({ createdAt: -1 })
        .lean();
    }
    if (type === "all" || type === "courses") {
      result.courses = await applyPagination(
        Course.find({ addedBy: userId }).select(
          "title description driveLink bannerImage visibility addedBy category",
        ),
        pagination,
      )
        .populate("addedBy", "name avatar")
        .populate("category", "name")
        .sort({ createdAt: -1 })
        .lean();
    }
    if (type === "all" || type === "tools") {
      result.tools = await applyPagination(
        Tool.find({ addedBy: userId }).select(CONTENT_LIST_SELECT.tool),
        pagination,
      )
        .populate("addedBy", "name avatar")
        .sort({ createdAt: -1 })
        .lean();
    }

    // 2. Get saved public items from library
    const savedItems = await applyPagination(
      UserLibrary.find({ user: userId }).sort({ createdAt: -1 }),
      pagination,
    ).lean();

    // Populate each saved item
    const populated = await Promise.all(
      savedItems.map(async (item) => {
        const Model = models[item.contentType];
        if (!Model) return null;
        let contentQuery = Model.findById(item.contentId)
          .select(
            CONTENT_LIST_SELECT[item.contentType] ||
              "title name description addedBy",
          )
          .populate("addedBy", "name avatar");
        if (item.contentType === "course") {
          contentQuery = contentQuery.populate("category", "name");
        }
        const content = await contentQuery.lean();
        if (!content) return null;
        return {
          _id: item._id,
          contentType: item.contentType,
          contentId: item.contentId,
          personalNotes: item.personalNotes,
          savedAt: item.createdAt,
          content,
        };
      }),
    );

    result.saved = populated.filter(Boolean);

    res.json(result);
  } catch (error) {
    console.error("Get library error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Add a public content item to user's library
// @route   POST /api/library/:contentType/:contentId
const addToLibrary = async (req, res) => {
  try {
    const { contentType, contentId } = req.params;
    const normType = contentType === "video" ? "playlist" : contentType;
    const Model = models[normType] || models[contentType];

    if (!Model) {
      return res.status(400).json({ message: "Invalid content type" });
    }

    const content = await Model.findById(contentId);
    if (!content || content.visibility !== "public") {
      return res.status(404).json({ message: "Public content not found" });
    }

    // Don't add your own content
    const ownerId = content.addedBy?._id || content.addedBy;
    if (ownerId && String(ownerId) === String(req.user._id)) {
      return res.status(400).json({
        message: "This is your own content — it's already in your space",
      });
    }

    let saved = await UserLibrary.findOne({
      user: req.user._id,
      contentType: normType,
      contentId,
    });

    if (!saved) {
      saved = await UserLibrary.create({
        user: req.user._id,
        contentType: normType,
        contentId,
      });
    }

    // If saving a published playlist, also auto-create a user-isolated private copy with BLANK notes
    if (normType === "playlist") {
      let existingClone = null;
      if (content.playlistId) {
        existingClone = await YoutubePlaylist.findOne({
          playlistId: content.playlistId,
          addedBy: req.user._id,
        });
      } else if (content.videoId) {
        existingClone = await YoutubePlaylist.findOne({
          videoId: content.videoId,
          addedBy: req.user._id,
        });
      }

      if (!existingClone) {
        await YoutubePlaylist.create({
          type:
            content.type || (contentType === "video" ? "video" : "playlist"),
          title: content.title,
          description: content.description || "",
          playlistId: content.playlistId || "",
          videoId: content.videoId || "",
          url: content.url || content.playlistUrl || "",
          playlistUrl: content.playlistUrl || "",
          thumbnail: content.thumbnail || content.videos?.[0]?.thumbnail || "",
          channelTitle: content.channelTitle || "",
          videoCount:
            content.videoCount || (content.videos ? content.videos.length : 0),
          videos: (content.videos || []).map((v, i) => ({
            title: v.title,
            videoId: v.videoId,
            thumbnail: v.thumbnail,
            duration: v.duration,
            position: i,
            notes: "", // GUARANTEED BLANK NOTES
          })),
          addedBy: req.user._id,
          visibility: "private",
        });
      }
    }

    res.status(201).json({ message: "Added to your library", saved });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(200).json({ message: "Already in your library" });
    }
    console.error("Add to library error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Remove an item from user's library
// @route   DELETE /api/library/:id or DELETE /api/library/:contentType/:contentId
const removeFromLibrary = async (req, res) => {
  try {
    const targetId = req.params.contentId || req.params.id;
    if (!mongoose.isValidObjectId(targetId)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const item = await UserLibrary.findOne({
      user: req.user._id,
      $or: [{ _id: targetId }, { contentId: targetId }],
    });

    if (!item) {
      return res.status(404).json({ message: "Item not found in library" });
    }

    const deletedContentId = item.contentId;
    const deletedLibraryId = item._id;
    const contentType = item.contentType;
    await item.deleteOne();

    // If removing a playlist, also clean up the user's clone from YoutubePlaylist
    if (contentType === "playlist") {
      const publicPl = await YoutubePlaylist.findById(deletedContentId);
      if (publicPl) {
        await YoutubePlaylist.deleteMany({
          addedBy: req.user._id,
          $or: [
            { playlistId: publicPl.playlistId },
            { videoId: publicPl.videoId },
          ],
        });
      }
    }

    // If removing a book that was saved privately for this user (e.g. YouTube book), delete the private Book document
    if (contentType === "book") {
      await Book.deleteMany({
        _id: deletedContentId,
        addedBy: req.user._id,
        $or: [
          { type: "youtube" },
          { source: "youtube" },
          { description: "Modern Audiobook & Summary" },
          { "videos.driveFileId": /^[a-zA-Z0-9_-]{11}$/ },
        ],
      });
    }

    res.json({
      message: "Removed from library",
      id: deletedLibraryId,
      contentId: deletedContentId,
      contentType,
    });
  } catch (error) {
    console.error("Remove from library error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Update personal notes on a library item
// @route   PUT /api/library/:id/notes
const updateNotes = async (req, res) => {
  try {
    const item = await UserLibrary.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!item) {
      return res.status(404).json({ message: "Item not found in library" });
    }

    item.personalNotes = req.body.personalNotes || "";
    await item.save();

    res.json({ message: "Notes updated", item });
  } catch (error) {
    console.error("Update notes error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Check if content is in user's library
// @route   GET /api/library/check/:contentType/:contentId
const checkInLibrary = async (req, res) => {
  try {
    const { contentType, contentId } = req.params;
    const item = await UserLibrary.findOne({
      user: req.user._id,
      contentType,
      contentId,
    });

    res.json({ inLibrary: !!item, libraryItemId: item?._id || null });
  } catch (error) {
    console.error("Check library error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getLibrary,
  addToLibrary,
  removeFromLibrary,
  updateNotes,
  checkInLibrary,
};
