const User = require("../models/User");
const Book = require("../models/Book");
const Course = require("../models/Course");
const Tool = require("../models/Tool");
const Category = require("../models/Category");
const Comment = require("../models/Comment");
const PublishRequest = require("../models/PublishRequest");
const { deleteFromGridFS } = require("../config/gridfs");

// @desc    Get admin dashboard stats
// @route   GET /api/admin/stats
const getStats = async (req, res) => {
  try {
    const [
      userCount,
      bookCount,
      courseCount,
      toolCount,
      categoryCount,
      pendingRequests,
    ] = await Promise.all([
      User.countDocuments(),
      Book.countDocuments(),
      Course.countDocuments(),
      Tool.countDocuments(),
      Category.countDocuments(),
      PublishRequest.countDocuments({ status: "pending" }),
    ]);

    const videoBooks = await Book.countDocuments({ type: "video" });
    const textBooks = await Book.countDocuments({ type: "text" });
    const publicBooks = await Book.countDocuments({ visibility: "public" });
    const publicCourses = await Course.countDocuments({ visibility: "public" });
    const publicTools = await Tool.countDocuments({ visibility: "public" });

    res.json({
      stats: {
        users: userCount,
        books: bookCount,
        videoBooks,
        textBooks,
        courses: courseCount,
        tools: toolCount,
        categories: categoryCount,
        pendingRequests,
        publicBooks,
        publicCourses,
        publicTools,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get all users (Admin)
// @route   GET /api/admin/users
const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });

    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get single user with progress data (Admin)
// @route   GET /api/admin/users/:id
const getUserDetail = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Populate book references in progress
    const populatedUser = await User.findById(req.params.id)
      .select("-password")
      .populate("videoProgress.bookId", "title author type")
      .populate("readingProgress.bookId", "title author type");

    res.json({ user: populatedUser });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Delete user (Admin)
// @route   DELETE /api/admin/users/:id
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.role === "admin") {
      return res.status(400).json({ message: "Cannot delete admin user" });
    }
    await user.deleteOne();
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Toggle visibility of any content (Admin)
// @route   PUT /api/admin/toggle-visibility
const toggleVisibility = async (req, res) => {
  try {
    const { contentType, contentId, visibility } = req.body;

    if (!["public", "private"].includes(visibility)) {
      return res
        .status(400)
        .json({ message: "Visibility must be 'public' or 'private'" });
    }

    let Model;
    switch (contentType) {
      case "book":
        Model = Book;
        break;
      case "course":
        Model = Course;
        break;
      case "tool":
        Model = Tool;
        break;
      case "section": {
        const CustomSection = require("../models/CustomSection");
        Model = CustomSection;
        break;
      }
      case "playlist": {
        const YoutubePlaylist = require("../models/YoutubePlaylist");
        Model = YoutubePlaylist;
        break;
      }
      default:
        return res.status(400).json({ message: "Invalid content type" });
    }

    const doc = await Model.findById(contentId);
    if (!doc) {
      return res.status(404).json({ message: "Content not found" });
    }

    doc.visibility = visibility;
    await doc.save();

    res.json({
      message: `Content set to ${visibility}`,
      contentType,
      contentId,
      visibility,
    });
  } catch (error) {
    console.error("Toggle visibility error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get all content of a type (Admin)
// @route   GET /api/admin/content/:type
const getAllContent = async (req, res) => {
  try {
    const { type } = req.params;
    const { search = "", page = 1, limit = 30 } = req.query;

    let Model;
    switch (type) {
      case "book":
        Model = Book;
        break;
      case "course":
        Model = Course;
        break;
      case "tool":
        Model = Tool;
        break;
      case "section": {
        const CustomSection = require("../models/CustomSection");
        Model = CustomSection;
        break;
      }
      case "playlist": {
        const YoutubePlaylist = require("../models/YoutubePlaylist");
        Model = YoutubePlaylist;
        break;
      }
      default:
        return res.status(400).json({ message: "Invalid content type" });
    }

    const filter = {};
    if (search) {
      // Sections use 'name' instead of 'title'
      const schemaPaths = Object.keys(Model.schema.paths);
      if (schemaPaths.includes("title")) {
        filter.title = { $regex: search, $options: "i" };
      } else if (schemaPaths.includes("name")) {
        filter.name = { $regex: search, $options: "i" };
      }
    }

    // Only populate fields that actually exist on this model's schema
    const schemaFields = Object.keys(Model.schema.paths);
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = Model.find(filter);
    if (schemaFields.includes("addedBy"))
      query = query.populate("addedBy", "name email");
    if (schemaFields.includes("category"))
      query = query.populate("category", "name");

    const [items, total] = await Promise.all([
      query.sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Model.countDocuments(filter),
    ]);

    res.json({ items, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error("getAllContent error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Delete any content (Admin)
// @route   DELETE /api/admin/content/:type/:id
const adminDeleteContent = async (req, res) => {
  try {
    const { type, id } = req.params;

    let Model;
    switch (type) {
      case "book":
        Model = Book;
        break;
      case "course":
        Model = Course;
        break;
      case "tool":
        Model = Tool;
        break;
      case "section": {
        const CustomSection = require("../models/CustomSection");
        Model = CustomSection;
        break;
      }
      case "playlist": {
        const YoutubePlaylist = require("../models/YoutubePlaylist");
        Model = YoutubePlaylist;
        break;
      }
      default:
        return res.status(400).json({ message: "Invalid content type" });
    }

    const doc = await Model.findById(id);
    if (!doc) return res.status(404).json({ message: "Content not found" });

    await doc.deleteOne();
    res.json({ message: "Content deleted", contentType: type, contentId: id });
  } catch (error) {
    console.error("adminDeleteContent error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getStats,
  getUsers,
  getUserDetail,
  deleteUser,
  toggleVisibility,
  getAllContent,
  adminDeleteContent,
};
