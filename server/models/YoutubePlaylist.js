const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema({
  title: { type: String, default: "" },
  videoId: { type: String, default: "" },
  thumbnail: { type: String, default: "" },
  duration: { type: String, default: "" },
  position: { type: Number, default: 0 },
  notes: { type: String, default: "" },
});

const youtubePlaylistSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Playlist title is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    playlistId: {
      type: String,
      required: [true, "YouTube playlist ID is required"],
    },
    playlistUrl: {
      type: String,
      default: "",
    },
    thumbnail: {
      type: String,
      default: "",
    },
    channelTitle: {
      type: String,
      default: "",
    },
    videoCount: {
      type: Number,
      default: 0,
    },
    videos: [videoSchema],
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    visibility: {
      type: String,
      enum: ["public", "private", "pending"],
      default: "private",
    },
  },
  {
    timestamps: true,
  },
);

youtubePlaylistSchema.index({ addedBy: 1, createdAt: -1 });
youtubePlaylistSchema.index({ visibility: 1, createdAt: -1 });

module.exports = mongoose.model("YoutubePlaylist", youtubePlaylistSchema);
