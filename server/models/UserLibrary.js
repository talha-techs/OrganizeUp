const mongoose = require("mongoose");

// Tracks which public content a user has added to their private space
const userLibrarySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    contentType: {
      type: String,
      enum: ["book", "course", "tool", "section"],
      required: true,
    },
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    personalNotes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

// Each user can only save a content item once
userLibrarySchema.index(
  { user: 1, contentType: 1, contentId: 1 },
  { unique: true },
);
userLibrarySchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("UserLibrary", userLibrarySchema);
