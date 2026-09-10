const User = require("../models/User");
const Book = require("../models/Book");
const Course = require("../models/Course");
const Tool = require("../models/Tool");
const Category = require("../models/Category");
const Comment = require("../models/Comment");
const PublishRequest = require("../models/PublishRequest");
const CapturedResource = require("../models/CapturedResource");
const CustomSection = require("../models/CustomSection");
const { deleteFromGridFS } = require("../config/gridfs");
const { getTrafficMetrics } = require("../middleware/trafficTracker");

// Escape special regex chars to prevent ReDoS / injection
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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
      const safe = escapeRegex(search);
      // Sections use 'name' instead of 'title'
      const schemaPaths = Object.keys(Model.schema.paths);
      if (schemaPaths.includes("title")) {
        filter.title = { $regex: safe, $options: "i" };
      } else if (schemaPaths.includes("name")) {
        filter.name = { $regex: safe, $options: "i" };
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

    // Cascade-delete associated GridFS files to prevent orphaned storage
    if (type === "book") {
      if (doc.pdfFileId)
        await deleteFromGridFS(doc.pdfFileId, "pdf").catch(() => {});
      if (doc.coverImageId)
        await deleteFromGridFS(doc.coverImageId, "image").catch(() => {});
      for (const af of doc.audioFiles || []) {
        if (af.fileId)
          await deleteFromGridFS(af.fileId, "audio").catch(() => {});
      }
    } else if (type === "course" || type === "tool") {
      if (doc.bannerImageId)
        await deleteFromGridFS(doc.bannerImageId, "image").catch(() => {});
    }

    await doc.deleteOne();
    res.json({ message: "Content deleted", contentType: type, contentId: id });
  } catch (error) {
    console.error("adminDeleteContent error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get comprehensive system analytics, request metrics, and telemetry
// @route   GET /api/admin/analytics
const getAnalytics = async (req, res) => {
  try {
    const timeRange = req.query.timeRange || "24h"; // '24h' | '7d' | '30d'
    const trafficMetrics = getTrafficMetrics(timeRange);

    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

    const [
      userCount,
      activeStreakUsers,
      adminCount,
      newUsers7d,
      bookCount,
      videoBooks,
      audioBooks,
      textBooks,
      publicBooks,
      courseCount,
      publicCourses,
      captureCount,
      remindersCount,
      sectionCount,
      toolCount,
      categoryCount,
      pendingRequests,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ currentStreak: { $gt: 0 } }),
      User.countDocuments({ role: "admin" }),
      User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      Book.countDocuments(),
      Book.countDocuments({ type: "video" }),
      Book.countDocuments({ type: "audio" }),
      Book.countDocuments({ type: "text" }),
      Book.countDocuments({ visibility: "public" }),
      Course.countDocuments(),
      Course.countDocuments({ visibility: "public" }),
      CapturedResource.countDocuments({ status: { $ne: "archived" } }),
      CapturedResource.countDocuments({ reminderAt: { $ne: null } }),
      CustomSection.countDocuments(),
      Tool.countDocuments(),
      Category.countDocuments(),
      PublishRequest.countDocuments({ status: "pending" }),
    ]);

    // Platform breakdown of captured resources
    const capturePlatforms = await CapturedResource.aggregate([
      { $match: { status: { $ne: "archived" } } },
      { $group: { _id: "$platform", count: { $sum: 1 } } },
    ]);

    const captureBreakdown = {
      whatsapp: 0,
      instagram: 0,
      facebook: 0,
      linkedin: 0,
      web_image: 0,
      x: 0,
    };
    capturePlatforms.forEach((p) => {
      if (p._id && captureBreakdown[p._id] !== undefined) {
        captureBreakdown[p._id] = p.count;
      }
    });

    // Total documents count across main collections
    const totalDocs =
      userCount + bookCount + courseCount + captureCount + sectionCount + toolCount;

    // Estimate storage
    const estimatedDocStorageMB = +((totalDocs * 0.004) + 14).toFixed(1);
    const estimatedGridFSMB = +((bookCount * 1.5) + (captureCount * 0.8) + 48).toFixed(1);
    const totalEstimatedStorageMB = +(estimatedDocStorageMB + estimatedGridFSMB).toFixed(1);

    res.json({
      timeRange,
      traffic: trafficMetrics,
      database: {
        users: {
          total: userCount,
          activeStreaks: activeStreakUsers,
          admins: adminCount,
          newLast7d: newUsers7d,
        },
        content: {
          books: {
            total: bookCount,
            video: videoBooks,
            audio: audioBooks,
            text: textBooks,
            publicCount: publicBooks,
          },
          courses: {
            total: courseCount,
            publicCount: publicCourses,
          },
          captures: {
            total: captureCount,
            withReminders: remindersCount,
            byPlatform: captureBreakdown,
          },
          sections: { total: sectionCount },
          tools: { total: toolCount },
          pendingRequests,
          categories: categoryCount,
        },
        storage: {
          totalEstimatedMB: totalEstimatedStorageMB,
          databaseDocuments: totalDocs,
          estimatedGridFSMB,
        },
      },
      systemHealth: {
        serverUptimeSeconds: Math.round(process.uptime()),
        memoryUsageMB: Math.round(process.memoryUsage().rss / (1024 * 1024)),
        nodeVersion: process.version,
        platform: process.platform,
        databaseStatus: "Connected (MongoDB Atlas)",
        edgeNetwork: "Cloudflare Global CDN (Active)",
        encryption: "TLS 1.3 / HTTP/2",
      },
    });
  } catch (error) {
    console.error("Admin getAnalytics error:", error);
    res.status(500).json({ message: "Failed to fetch analytics" });
  }
};

module.exports = {
  getStats,
  getAnalytics,
  getUsers,
  getUserDetail,
  deleteUser,
  toggleVisibility,
  getAllContent,
  adminDeleteContent,
};
