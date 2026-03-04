const UserLibrary = require("../models/UserLibrary");
const Book = require("../models/Book");
const Course = require("../models/Course");
const Tool = require("../models/Tool");
const CustomSection = require("../models/CustomSection");

const models = {
  book: Book,
  course: Course,
  tool: Tool,
  section: CustomSection,
};

// @desc    Get user's library (saved public items + own private items)
// @route   GET /api/library?type=all|books|courses|tools
const getLibrary = async (req, res) => {
  try {
    const userId = req.user._id;
    const { type = "all" } = req.query;

    const result = { books: [], courses: [], tools: [], saved: [] };

    // 1. Get user's own content (private + pending)
    if (type === "all" || type === "books") {
      result.books = await Book.find({ addedBy: userId })
        .populate("addedBy", "name avatar")
        .sort({ createdAt: -1 });
    }
    if (type === "all" || type === "courses") {
      result.courses = await Course.find({ addedBy: userId })
        .populate("addedBy", "name avatar")
        .populate("category", "name")
        .sort({ createdAt: -1 });
    }
    if (type === "all" || type === "tools") {
      result.tools = await Tool.find({ addedBy: userId })
        .populate("addedBy", "name avatar")
        .sort({ createdAt: -1 });
    }

    // 2. Get saved public items from library
    const savedItems = await UserLibrary.find({ user: userId }).sort({
      createdAt: -1,
    });

    // Populate each saved item
    const populated = await Promise.all(
      savedItems.map(async (item) => {
        const Model = models[item.contentType];
        if (!Model) return null;
        const content = await Model.findById(item.contentId).populate(
          "addedBy",
          "name avatar",
        );
        if (!content) return null;
        return {
          _id: item._id,
          contentType: item.contentType,
          contentId: item.contentId,
          personalNotes: item.personalNotes,
          savedAt: item.createdAt,
          content: content.toObject(),
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
    const Model = models[contentType];

    if (!Model) {
      return res.status(400).json({ message: "Invalid content type" });
    }

    const content = await Model.findById(contentId);
    if (!content || content.visibility !== "public") {
      return res.status(404).json({ message: "Public content not found" });
    }

    // Don't add your own content
    if (content.addedBy.toString() === req.user._id.toString()) {
      return res.status(400).json({
        message: "This is your own content — it's already in your space",
      });
    }

    const saved = await UserLibrary.create({
      user: req.user._id,
      contentType,
      contentId,
    });

    res.status(201).json({ message: "Added to your library", saved });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Already in your library" });
    }
    console.error("Add to library error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Remove an item from user's library
// @route   DELETE /api/library/:id
const removeFromLibrary = async (req, res) => {
  try {
    const item = await UserLibrary.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!item) {
      return res.status(404).json({ message: "Item not found in library" });
    }

    await item.deleteOne();
    res.json({ message: "Removed from library" });
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
