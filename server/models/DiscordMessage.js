const mongoose = require("mongoose");

const discordMessageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    discordMessageId: {
      type: String,
      required: true,
    },
    guildId: {
      type: String,
      default: null,
    },
    guildName: {
      type: String,
      default: "Direct Message",
    },
    channelId: {
      type: String,
      default: null,
    },
    text: {
      type: String,
      default: "",
    },
    authorName: {
      type: String,
      default: "Unknown",
    },
    extractedUrls: {
      type: [String],
      default: [],
    },
    media: [
      {
        gridFsId: String,
        type: { type: String }, // e.g. 'image/png'
        filename: String,
      }
    ],
    videoLink: {
      type: String,
      default: null, // A direct link to the Discord message for videos
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
      default: "saved",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("DiscordMessage", discordMessageSchema);
