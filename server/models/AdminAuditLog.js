const mongoose = require("mongoose");

const adminAuditLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    adminEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
      enum: [
        "view_private_content",
        "preview_content",
        "unpublish_content",
        "delete_content",
        "delete_user",
        "review_publish_request",
        "update_suggestion",
        "export_data",
        "list_content",
        "read_stats",
      ],
    },
    targetType: {
      type: String,
      required: true,
      enum: [
        "book",
        "course",
        "tool",
        "section",
        "playlist",
        "capture",
        "telegram",
        "discord",
        "user",
        "publish_request",
        "suggestion",
        "comment",
        "analytics",
      ],
      index: true,
    },
    targetId: {
      type: String,
      default: null,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    reason: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    ipAddress: {
      type: String,
      default: "",
    },
    userAgent: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying audit history
adminAuditLogSchema.index({ createdAt: -1 });
adminAuditLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model("AdminAuditLog", adminAuditLogSchema);
