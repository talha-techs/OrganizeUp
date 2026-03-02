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

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Course title is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    bannerImage: {
      type: String,
      default: "",
    },
    driveLink: {
      type: String,
      default: "",
    },
    driveFolderId: {
      type: String,
      default: "",
    },
    files: [driveFileSchema],
    folders: [folderSchema],
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
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
    bannerImageId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

courseSchema.index({ visibility: 1, createdAt: -1 });
courseSchema.index({ addedBy: 1, createdAt: -1 });

module.exports = mongoose.model("Course", courseSchema);
