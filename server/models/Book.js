const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Book title is required"],
      trim: true,
    },
    author: {
      type: String,
      required: [true, "Author name is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: ["video", "text", "audio"],
      required: [true, "Book type is required"],
    },
    description: {
      type: String,
      default: "",
    },
    coverImage: {
      type: String,
      default: "",
    },
    // For text books - single PDF embed link
    embedLink: {
      type: String,
      default: "",
    },
    // GridFS file ID for stored PDFs
    pdfFileId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    // For video books - list of video episodes
    videos: [
      {
        title: { type: String, default: "" },
        driveFileId: { type: String, required: false },
        duration: { type: String, default: "" },
        order: { type: Number, default: 0 },
      },
    ],
    // For audio books — each track uploaded to GridFS
    audioFiles: [
      {
        title: { type: String, default: "" },
        fileId: {
          type: mongoose.Schema.Types.ObjectId,
          default: null,
        },
        originalName: { type: String, default: "" },
        duration: { type: String, default: "" },
        size: { type: Number, default: 0 },
        order: { type: Number, default: 0 },
      },
    ],
    driveLink: {
      type: String,
      default: "",
    },
    totalPages: {
      type: Number,
      default: 0,
    },
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
    coverImageId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

bookSchema.index({ visibility: 1, createdAt: -1 });
bookSchema.index({ addedBy: 1, createdAt: -1 });

module.exports = mongoose.model("Book", bookSchema);
