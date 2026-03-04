const mongoose = require("mongoose");

const publishRequestSchema = new mongoose.Schema(
  {
    contentType: {
      type: String,
      enum: ["book", "course", "tool", "section"],
      required: true,
    },
    publishMode: {
      type: String,
      enum: ["with_data", "without_data"],
      default: "with_data",
    },
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    category: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    adminNote: {
      type: String,
      default: "",
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

publishRequestSchema.index({ status: 1, createdAt: -1 });
publishRequestSchema.index({ requestedBy: 1, contentId: 1 }, { unique: true });

module.exports = mongoose.model("PublishRequest", publishRequestSchema);
