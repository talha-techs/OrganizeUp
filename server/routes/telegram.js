const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const User = require("../models/User");
const TelegramMessage = require("../models/TelegramMessage");
const { protect } = require("../middleware/auth");
const { streamFromGridFS } = require("../config/gridfs");

// @desc    Generate a link code for Telegram
// @route   POST /api/telegram/link
// @access  Private
router.post("/link", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    // Generate a 6-character random alphanumeric code
    const linkCode = crypto.randomBytes(3).toString("hex").toUpperCase();
    
    // Expires in 15 minutes
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    user.telegramLinkCode = linkCode;
    user.telegramLinkCodeExpires = expires;
    await user.save();

    res.json({
      linkCode,
      expires,
      telegramId: user.telegramId,
    });
  } catch (error) {
    console.error("Generate link code error:", error);
    res.status(500).json({ message: "Server error generating link code" });
  }
});

// @desc    Get user's Telegram connection status
// @route   GET /api/telegram/status
// @access  Private
router.get("/status", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      isConnected: !!user.telegramId,
    });
  } catch (error) {
    console.error("Get telegram status error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @desc    Serve banner image for Telegram message
// @route   GET /api/telegram/image/:fileId
// @access  Public (or protected if needed, but usually images are fine)
router.get("/image/:fileId", async (req, res) => {
  try {
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    await streamFromGridFS(req.params.fileId, res, "image");
  } catch (error) {
    console.error("Serve telegram image error:", error);
    res.status(500).json({ message: "Error serving image" });
  }
});

// @desc    Get all Telegram messages
// @route   GET /api/telegram/messages
// @access  Private
router.get("/messages", protect, async (req, res) => {
  try {
    const messages = await TelegramMessage.find({
      user: req.user._id,
    }).sort({ createdAt: -1 });

    res.json(messages);
  } catch (error) {
    console.error("Get telegram messages error:", error);
    res.status(500).json({ message: "Server error fetching messages" });
  }
});

// @desc    Get unread Telegram messages count
// @route   GET /api/telegram/unread-count
// @access  Private
router.get("/unread-count", protect, async (req, res) => {
  try {
    const count = await TelegramMessage.countDocuments({
      user: req.user._id,
      read: false,
    });
    res.json({ unreadCount: count });
  } catch (error) {
    console.error("Get telegram unread count error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @desc    Mark all Telegram messages as read
// @route   PUT /api/telegram/read
// @access  Private
router.put("/read", protect, async (req, res) => {
  try {
    await TelegramMessage.updateMany(
      { user: req.user._id, read: false },
      { $set: { read: true } }
    );
    res.json({ message: "Messages marked as read" });
  } catch (error) {
    console.error("Mark telegram messages read error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @desc    Dismiss a Telegram message
// @route   DELETE /api/telegram/messages/:id
// @access  Private
router.delete("/messages/:id", protect, async (req, res) => {
  try {
    const message = await TelegramMessage.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    res.json({ message: "Message dismissed" });
  } catch (error) {
    console.error("Dismiss telegram message error:", error);
    res.status(500).json({ message: "Server error dismissing message" });
  }
});

// @desc    Update a Telegram message note/tag
// @route   PUT /api/telegram/messages/:id/note
// @access  Private
router.put("/messages/:id/note", protect, async (req, res) => {
  try {
    const { note } = req.body;
    const message = await TelegramMessage.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { note },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    res.json(message);
  } catch (error) {
    console.error("Update telegram message note error:", error);
    res.status(500).json({ message: "Server error updating message note" });
  }
});

module.exports = router;
