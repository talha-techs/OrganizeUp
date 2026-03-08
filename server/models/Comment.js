const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    // What type of content is being commented on
    contentType: {
      type: String,
      enum: ["book", "course", "tool", "section"],
      required: true,
    },
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "contentType",
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: [true, "Comment text is required"],
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  },
);

// Index for fast lookup
commentSchema.index({ contentType: 1, contentId: 1, createdAt: -1 });

module.exports = mongoose.model("Comment", commentSchema);
