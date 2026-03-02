const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      minlength: 6,
      select: false,
    },
    avatar: {
      type: String,
      default: "",
    },
    avatarImageId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    googleId: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    // Video book progress - stores progress for each video
    videoProgress: [
      {
        bookId: { type: mongoose.Schema.Types.ObjectId, ref: "Book" },
        videoIndex: Number,
        progress: { type: Number, default: 0 }, // percentage 0-100
        completed: { type: Boolean, default: false },
        note: { type: String, default: "" }, // what user learned
        lastWatched: { type: Date, default: Date.now },
      },
    ],
    // PDF reading progress
    readingProgress: [
      {
        bookId: { type: mongoose.Schema.Types.ObjectId, ref: "Book" },
        currentPage: { type: Number, default: 1 },
        totalPages: { type: Number, default: 0 },
        progress: { type: Number, default: 0 }, // percentage 0-100
        lastRead: { type: Date, default: Date.now },
      },
    ],
    // In-app notifications (e.g. publish request rejection)
    notifications: [
      {
        type: {
          type: String,
          enum: ["rejection", "approval", "info"],
          default: "info",
        },
        message: { type: String, default: "" },
        contentTitle: { type: String, default: "" },
        adminNote: { type: String, default: "" },
        read: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  },
);

// Hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
