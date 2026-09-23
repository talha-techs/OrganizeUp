const mongoose = require("mongoose");

const sectionInviteSchema = new mongoose.Schema(
  {
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomSection",
      required: true,
    },
    invitedEmail: {
      type: String,
      required: [true, "Invited email is required"],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    invitedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["editor", "viewer"],
      default: "editor",
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "revoked"],
      default: "pending",
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

sectionInviteSchema.index({ sectionId: 1, status: 1 });
sectionInviteSchema.index({ invitedEmail: 1, status: 1 });
sectionInviteSchema.index({ invitedUser: 1, status: 1 });

module.exports = mongoose.model("SectionInvite", sectionInviteSchema);
