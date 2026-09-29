const mongoose = require("mongoose");

const featureSuggestionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Please provide a title for your suggestion"],
      trim: true,
      maxlength: [150, "Title cannot exceed 150 characters"],
    },
    targetArea: {
      type: String,
      enum: [
        "workspaces",
        "books",
        "courses",
        "captures",
        "inboxes",
        "explore",
        "tools",
        "general",
        "other",
      ],
      default: "general",
    },
    problemStatement: {
      type: String,
      required: [true, "Please describe the problem you are experiencing"],
      trim: true,
      maxlength: [3000, "Problem statement cannot exceed 3000 characters"],
    },
    proposedSolution: {
      type: String,
      required: [
        true,
        "Please describe where and how OrganizeUp can solve this for you",
      ],
      trim: true,
      maxlength: [3000, "Proposed solution cannot exceed 3000 characters"],
    },
    impact: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["pending", "under_review", "planned", "completed", "dismissed"],
      default: "pending",
      index: true,
    },
    adminNotes: {
      type: String,
      default: "",
      trim: true,
      maxlength: [2000, "Admin notes cannot exceed 2000 characters"],
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

featureSuggestionSchema.index({ status: 1, createdAt: -1 });
featureSuggestionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("FeatureSuggestion", featureSuggestionSchema);
