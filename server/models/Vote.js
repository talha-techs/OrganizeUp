const mongoose = require("mongoose");

const voteSchema = new mongoose.Schema(
  {
    contentType: {
      type: String,
      enum: ["book", "course", "tool"],
      required: true,
    },
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    value: {
      type: Number,
      enum: [1, -1], // 1 = upvote, -1 = downvote
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Each user can only vote once per content item
voteSchema.index({ contentType: 1, contentId: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("Vote", voteSchema);
