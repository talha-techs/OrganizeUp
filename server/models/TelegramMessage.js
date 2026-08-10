const mongoose = require("mongoose");

const telegramMessageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    telegramMessageId: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    extractedUrl: {
      type: String,
      default: "",
    },
    senderName: {
      type: String,
      default: "Unknown",
    },
    bannerImageId: {
      type: String,
      default: null,
    },
    note: {
      type: String,
      default: "",
    },
    read: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["pending", "saved", "dismissed"],
      default: "saved", // Default to saved now since we removed pending
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("TelegramMessage", telegramMessageSchema);
