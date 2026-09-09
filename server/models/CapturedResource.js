const mongoose = require("mongoose");

const capturedResourceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    platform: {
      type: String,
      enum: [
        "instagram",
        "facebook",
        "linkedin",
        "whatsapp",
        "web_image",
        "youtube",
        "twitter",
        "web",
        "other",
      ],
      required: true,
      index: true,
    },
    mediaType: {
      type: String,
      enum: ["video", "image", "post", "message", "article"],
      default: "post",
    },
    title: {
      type: String,
      default: "",
      trim: true,
    },
    sourceUrl: {
      type: String,
      default: "",
      trim: true,
    },
    // Raw text content, chat message, or post caption
    rawContent: {
      type: String,
      default: "",
    },
    // Author or sender name
    authorName: {
      type: String,
      default: "",
      trim: true,
    },
    // Extracted embed identifier (e.g. Instagram reel shortcode, FB video id, YT id)
    embedId: {
      type: String,
      default: "",
    },
    embedUrl: {
      type: String,
      default: "",
    },
    // Direct media URL (for web images or hotlinked files)
    mediaUrl: {
      type: String,
      default: "",
    },
    // GridFS file ID for uploaded local images / clipboard screenshots
    mediaGridFsId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    thumbnailUrl: {
      type: String,
      default: "",
    },
    // Personal notes & reflections
    notes: {
      type: String,
      default: "",
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    // Custom Reminder & Notification
    remindAt: {
      type: Date,
      default: null,
      index: true,
    },
    reminderFired: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["inbox", "viewed", "completed", "archived"],
      default: "inbox",
      index: true,
    },
    lastViewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

capturedResourceSchema.index({ user: 1, platform: 1, createdAt: -1 });
capturedResourceSchema.index({ user: 1, remindAt: 1, reminderFired: 1 });

module.exports = mongoose.model("CapturedResource", capturedResourceSchema);
