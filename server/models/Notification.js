const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["reminder", "rejection", "approval", "info"],
      default: "reminder",
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      default: "",
      trim: true,
    },
    url: {
      type: String,
      default: "",
      trim: true,
    },
    refId: {
      type: String,
      default: null,
    },
    readAt: {
      type: Date,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for backward-compatibility with UI expecting .read
notificationSchema.virtual("read").get(function () {
  return this.readAt != null;
});

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, readAt: 1 });

module.exports =
  mongoose.models.Notification ||
  mongoose.model("Notification", notificationSchema);

