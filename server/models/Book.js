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
      enum: ["video", "text", "audio", "youtube"],
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
    pdfR2Key: {
      type: String,
      default: null,
    },
    coverR2Key: {
      type: String,
      default: null,
    },
    storageProvider: {
      type: String,
      enum: ["gridfs", "r2"],
      default: "gridfs",
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
    // For audio books — each track uploaded to GridFS/R2 or streamed via audioUrl
    audioFiles: [
      {
        title: { type: String, default: "" },
        fileId: {
          type: mongoose.Schema.Types.ObjectId,
          default: null,
        },
        r2Key: {
          type: String,
          default: null,
        },
        storageProvider: {
          type: String,
          enum: ["gridfs", "r2"],
          default: "gridfs",
        },
        audioUrl: {
          type: String,
          default: "",
        },
        originalName: { type: String, default: "" },
        duration: { type: String, default: "" },
        size: { type: Number, default: 0 },
        order: { type: Number, default: 0 },
      },
    ],
    librivoxId: {
      type: String,
      default: null,
      index: true,
    },
    copyrightYear: {
      type: String,
      default: "",
    },
    source: {
      type: String,
      enum: ["local", "drive", "librivox", "youtube"],
      default: "local",
    },
    driveLink: {
      type: String,
      default: "",
    },
    externalUrl: {
      type: String,
      default: "",
    },
    sourceType: {
      type: String,
      enum: ["upload", "drive", "external"],
      default: "upload",
    },
    topic: {
      type: String,
      default: "",
      index: true,
      trim: true,
    },
    seedId: {
      type: String,
    },
    seedMeta: {
      license: { type: String, default: "" },
      level: { type: String, default: "" },
      cost: { type: String, default: "" },
      sourceUrl: { type: String, default: "" },
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
    // Reminders & completion state
    remindAt: {
      type: Date,
      default: null,
    },
    reminderNote: {
      type: String,
      default: "",
    },
    reminderFired: {
      type: Boolean,
      default: false,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

bookSchema.index({ visibility: 1, createdAt: -1 });
bookSchema.index({ addedBy: 1, createdAt: -1 });
bookSchema.index({ remindAt: 1, reminderFired: 1, isCompleted: 1 });
bookSchema.index(
  { seedId: 1 },
  { unique: true, partialFilterExpression: { seedId: { $type: "string" } } }
);

module.exports = mongoose.model("Book", bookSchema);
