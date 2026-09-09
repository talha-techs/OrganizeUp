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
    discordId: {
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
    // Telegram Integration
    telegramId: {
      type: String,
      default: null,
      sparse: true, // Allows nulls to not conflict with unique if we made it unique
    },
    telegramLinkCode: {
      type: String,
      default: null,
    },
    telegramLinkCodeExpires: {
      type: Date,
      default: null,
    },
    // WhatsApp Integration
    whatsappPhoneNumber: {
      type: String,
      default: null,
      sparse: true,
    },
    // Universal video progress - stores progress for videos across books, courses, YouTube playlists, etc.
    videoProgress: [
      {
        bookId: { type: mongoose.Schema.Types.ObjectId, ref: "Book", default: null },
        courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", default: null },
        playlistId: { type: mongoose.Schema.Types.ObjectId, ref: "YoutubePlaylist", default: null },
        contentType: {
          type: String,
          enum: ["book", "course", "youtube"],
          default: "book",
        },
        videoId: { type: String, default: "" }, // Drive file ID, YouTube video ID, or videoIndex
        videoIndex: { type: Number, default: 0 },
        title: { type: String, default: "" },
        progress: { type: Number, default: 0 }, // percentage 0-100
        completed: { type: Boolean, default: false },
        note: { type: String, default: "" }, // what user learned
        lastWatched: { type: Date, default: Date.now },
      },
    ],
    // Course progress - tracks completed files and course-level completion
    courseProgress: [
      {
        courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
        completedFiles: [{ type: String }], // Drive file IDs
        progress: { type: Number, default: 0 }, // percentage 0-100
        completed: { type: Boolean, default: false },
        lastAccessed: { type: Date, default: Date.now },
      },
    ],
    // YouTube playlist progress - tracks completed videos and playlist-level completion
    playlistProgress: [
      {
        playlistId: { type: mongoose.Schema.Types.ObjectId, ref: "YoutubePlaylist", required: true },
        completedVideos: [{ type: String }], // YouTube video IDs
        progress: { type: Number, default: 0 }, // percentage 0-100
        completed: { type: Boolean, default: false },
        lastWatched: { type: Date, default: Date.now },
      },
    ],
    // PDF / Text reading progress
    readingProgress: [
      {
        bookId: { type: mongoose.Schema.Types.ObjectId, ref: "Book" },
        currentPage: { type: Number, default: 1 },
        totalPages: { type: Number, default: 0 },
        progress: { type: Number, default: 0 }, // percentage 0-100
        completed: { type: Boolean, default: false },
        lastRead: { type: Date, default: Date.now },
      },
    ],
    // In-app notifications (e.g. reminders, publish request rejection)
    notifications: [
      {
        type: {
          type: String,
          enum: ["rejection", "approval", "info", "reminder"],
          default: "info",
        },
        message: { type: String, default: "" },
        contentTitle: { type: String, default: "" },
        adminNote: { type: String, default: "" },
        link: { type: String, default: "" },
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
