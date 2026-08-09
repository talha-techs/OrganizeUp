const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const User = require("../models/User");
const TelegramMessage = require("../models/TelegramMessage");
const { protect } = require("../middleware/auth");

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

// @desc    Get pending Telegram messages
// @route   GET /api/telegram/messages
// @access  Private
router.get("/messages", protect, async (req, res) => {
  try {
    const messages = await TelegramMessage.find({
      user: req.user._id,
      status: "pending",
    }).sort({ createdAt: -1 });

    res.json(messages);
  } catch (error) {
    console.error("Get telegram messages error:", error);
    res.status(500).json({ message: "Server error fetching messages" });
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

// @desc    Mark a Telegram message as saved
// @route   PUT /api/telegram/messages/:id/categorize
// @access  Private
router.put("/messages/:id/categorize", protect, async (req, res) => {
  try {
    const message = await TelegramMessage.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { status: "saved" },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    res.json(message);
  } catch (error) {
    console.error("Categorize telegram message error:", error);
    res.status(500).json({ message: "Server error updating message status" });
  }
});

module.exports = router;
