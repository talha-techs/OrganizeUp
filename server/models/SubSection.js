const mongoose = require("mongoose");

const todoItemSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    checked: { type: Boolean, default: false },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    dueDate: { type: Date, default: null },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const boardItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    status: { type: String, default: "todo" },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    order: { type: Number, default: 0 },
    dueDate: { type: Date, default: null },
  },
  { timestamps: true },
);

const linkItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    url: { type: String, required: true },
    description: { type: String, default: "" },
  },
  { timestamps: true },
);

const boardColumnSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  color: { type: String, default: "slate" },
});

const subSectionSchema = new mongoose.Schema(
  {
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomSection",
      required: true,
    },
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["note", "todo", "board", "links", "snippet", "image"],
      required: true,
    },
    order: { type: Number, default: 0 },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ── Note ──────────────────────────────────────────────
    content: { type: String, default: "" },

    // ── To-Do ─────────────────────────────────────────────
    todos: [todoItemSchema],

    // ── Board ─────────────────────────────────────────────
    boardColumns: [boardColumnSchema],
    boardItems: [boardItemSchema],

    // ── Links ─────────────────────────────────────────────
    links: [linkItemSchema],

    // ── Snippet ───────────────────────────────────────────
    code: { type: String, default: "" },
    language: { type: String, default: "javascript" },

    // ── Image ─────────────────────────────────────────────
    imageUrl: { type: String, default: "" },
    imageCaption: { type: String, default: "" },
  },
  { timestamps: true },
);

subSectionSchema.index({ sectionId: 1, order: 1 });

module.exports = mongoose.model("SubSection", subSectionSchema);
