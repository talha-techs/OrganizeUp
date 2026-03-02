const mongoose = require("mongoose");

const driveFileSchema = new mongoose.Schema({
  driveFileId: { type: String, required: true },
  name: { type: String, required: true },
  path: { type: String, default: "" },
  mimeType: { type: String, default: "" },
  fileType: {
    type: String,
    enum: [
      "pdf",
      "html",
      "text",
      "image",
      "video",
      "gdoc",
      "gsheet",
      "gslides",
      "folder",
      "other",
    ],
    default: "other",
  },
  size: { type: Number, default: null },
  order: { type: Number, default: 0 },
});

const folderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  driveFileId: { type: String, default: "" },
  path: { type: String, default: "" },
  files: [driveFileSchema],
  subfolders: [{ type: mongoose.Schema.Types.Mixed }],
});

const customSectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Section name is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    icon: {
      type: String,
      default: "folder",
    },
    color: {
      type: String,
      default: "indigo",
    },
    driveLink: {
      type: String,
      default: "",
    },
    driveFolderId: {
      type: String,
      default: "",
    },
    // Flat list of all imported files (for easy querying)
    files: [driveFileSchema],
    // Tree structure preserving folder hierarchy
    folders: [folderSchema],
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

customSectionSchema.index({ addedBy: 1, createdAt: -1 });
customSectionSchema.index({ visibility: 1, createdAt: -1 });

module.exports = mongoose.model("CustomSection", customSectionSchema);
