const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");

const Book = require("../models/Book");
const Course = require("../models/Course");
const Tool = require("../models/Tool");
const CustomSection = require("../models/CustomSection");
const YoutubePlaylist = require("../models/YoutubePlaylist");

// @desc    Owner toggles their own content visibility (public ↔ private)
// @route   PUT /api/content/toggle-visibility
router.put("/toggle-visibility", protect, async (req, res) => {
  try {
    const { contentType, contentId, visibility } = req.body;

    if (!["public", "private"].includes(visibility)) {
      return res
        .status(400)
        .json({ message: "Visibility must be 'public' or 'private'" });
    }

    const models = {
      book: Book,
      course: Course,
      tool: Tool,
      section: CustomSection,
      playlist: YoutubePlaylist,
    };

    const Model = models[contentType];
    if (!Model) {
      return res.status(400).json({ message: "Invalid content type" });
    }

    const doc = await Model.findById(contentId);
    if (!doc) {
      return res.status(404).json({ message: "Content not found" });
    }

    const isOwner = doc.addedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized" });
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
});

module.exports = router;
