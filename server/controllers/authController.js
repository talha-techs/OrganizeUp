const User = require("../models/User");
const Book = require("../models/Book");
const Course = require("../models/Course");
const YoutubePlaylist = require("../models/YoutubePlaylist");
const SubSection = require("../models/SubSection");
const CapturedResource = require("../models/CapturedResource");
const CustomSection = require("../models/CustomSection");
const { generateToken } = require("../middleware/auth");
const { uploadToGridFS, deleteFromGridFS } = require("../config/gridfs");

// Calculate consecutive streak statistics from a set of YYYY-MM-DD date strings
function calculateStreaks(daysSet) {
  const days = Array.from(daysSet).sort();
  if (days.length === 0) return { currentStreak: 0, maxStreak: 0 };

  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  let maxStreak = 0;
  let running = 0;
  let prevDate = null;

  for (const dayStr of days) {
    const cur = new Date(dayStr + "T00:00:00Z");
    if (prevDate) {
      const diffDays = Math.round((cur - prevDate) / 86400000);
      if (diffDays === 1) {
        running++;
      } else if (diffDays > 1) {
        running = 1;
      }
    } else {
      running = 1;
    }
    prevDate = cur;
    if (running > maxStreak) maxStreak = running;
  }

  // Current streak (must terminate on today or yesterday)
  let currentStreak = 0;
  const lastDay = days[days.length - 1];
  if (lastDay === today || lastDay === yesterday) {
    let checkDate = new Date(lastDay + "T00:00:00Z");
    currentStreak = 1;
    for (let i = days.length - 2; i >= 0; i--) {
      const prev = new Date(days[i] + "T00:00:00Z");
      const diffDays = Math.round((checkDate - prev) / 86400000);
      if (diffDays === 1) {
        currentStreak++;
        checkDate = prev;
      } else {
        break;
      }
    }
  }

  return { currentStreak, maxStreak: Math.max(maxStreak, currentStreak) };
}

// Record today's login / activity and backfill any historical activity timestamps
async function recordUserActivity(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) return null;

    const todayStr = new Date().toISOString().split("T")[0];
    const daysSet = new Set(user.activityDays || []);
    daysSet.add(todayStr);

    // Backfill historical activity dates if activityDays was empty or small
    if (daysSet.size <= 2) {
      (user.videoProgress || []).forEach((vp) => {
        if (vp.lastWatched) daysSet.add(new Date(vp.lastWatched).toISOString().split("T")[0]);
      });
      (user.readingProgress || []).forEach((rp) => {
        if (rp.lastRead) daysSet.add(new Date(rp.lastRead).toISOString().split("T")[0]);
      });
      (user.courseProgress || []).forEach((cp) => {
        if (cp.lastAccessed) daysSet.add(new Date(cp.lastAccessed).toISOString().split("T")[0]);
      });
      if (user.createdAt) {
        daysSet.add(new Date(user.createdAt).toISOString().split("T")[0]);
      }
    }

    const { currentStreak, maxStreak } = calculateStreaks(daysSet);
    user.activityDays = Array.from(daysSet).sort();
    user.currentStreak = currentStreak;
    user.maxStreak = Math.max(user.maxStreak || 0, maxStreak);

    await user.save();
    return user;
  } catch (err) {
    console.error("recordUserActivity error:", err.message);
    return null;
  }
}


// @desc    Register user
// @route   POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User already exists with this email" });
    }

    // Check if this email should be admin
    const isAdmin =
      process.env.ADMIN_EMAIL &&
      email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase();

    const user = await User.create({
      name,
      email,
      password,
      role: isAdmin ? "admin" : "user",
      isVerified: true,
    });

    const token = generateToken(user._id);

    // Set HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.status(201).json({
      message: "Registration successful",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error during registration" });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.password) {
      return res.status(401).json({
        message: "This account uses Google sign-in. Please login with Google.",
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = generateToken(user._id);

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({
      message: "Login successful",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
};

// @desc    Google OAuth callback
// @route   GET /api/auth/google/callback
const googleCallback = async (req, res) => {
  let clientUrl = process.env.CLIENT_URL || "https://organizeup.app";
  // Remove trailing slash if it exists
  if (clientUrl.endsWith('/')) {
    clientUrl = clientUrl.slice(0, -1);
  }
  
  try {
    const token = generateToken(req.user._id);

    // Redirect to frontend with token in URL parameter so the frontend can set the cookie via AJAX
    // This avoids Safari/Chrome cross-site 302 cookie dropping.
    res.redirect(`${clientUrl}/auth/google/success?token=${token}`);
  } catch (error) {
    console.error("Google callback error:", error);
    res.redirect(`${clientUrl}/login?error=google_auth_failed`);
  }
};

// @desc    Set HTTP-only cookie from URL token (for OAuth cross-origin fix)
// @route   POST /api/auth/set-cookie
const setCookie = async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ message: "No token provided" });

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  res.json({ success: true });
};

// @desc    Get current user
// @route   GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    // Asynchronously ensure today's activity is marked
    recordUserActivity(req.user._id).catch(() => {});

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        activityDays: user.activityDays || [],
        currentStreak: user.currentStreak || 0,
        maxStreak: user.maxStreak || 0,
        whatsappPhoneNumber: user.whatsappPhoneNumber || "",
        videoProgress: user.videoProgress || [],
        readingProgress: user.readingProgress || [],
        courseProgress: user.courseProgress || [],
        playlistProgress: user.playlistProgress || [],
        notifications: user.notifications || [],
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/auth/notifications/mark-read
const markNotificationsRead = async (req, res) => {
  try {
    await User.updateOne(
      { _id: req.user._id },
      { $set: { "notifications.$[].read": true } },
    );
    res.json({ message: "Notifications marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
const logout = (req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    expires: new Date(0),
  });
  res.json({ message: "Logged out successfully" });
};

// @desc    Update profile
// @route   PUT /api/auth/profile
const updateProfile = async (req, res) => {
  try {
    const { name, whatsappPhoneNumber } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    if (whatsappPhoneNumber !== undefined) {
      user.whatsappPhoneNumber = whatsappPhoneNumber.trim();
    }

    // Handle avatar image upload
    if (req.file) {
      // Delete old avatar from GridFS if it exists
      if (user.avatarImageId) {
        await deleteFromGridFS(user.avatarImageId, "image");
      }
      const avatarImageId = await uploadToGridFS(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        "image",
      );
      user.avatarImageId = avatarImageId;
      user.avatar = `/api/images/${avatarImageId}`;
    } else if (req.body.removeAvatar === "true") {
      // Allow removing avatar
      if (user.avatarImageId) {
        await deleteFromGridFS(user.avatarImageId, "image");
      }
      user.avatarImageId = null;
      user.avatar = "";
    }

    await user.save();

    res.json({
      message: "Profile updated",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        whatsappPhoneNumber: user.whatsappPhoneNumber || "",
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get user profile learning statistics & aggregated notes
// @route   GET /api/auth/stats
const getUserStats = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // 1. Completed Videos:
    // Gather distinct completed videos from:
    // - user.videoProgress where completed is true
    // - completed videos in user.playlistProgress
    // - completed video files in user.courseProgress
    const completedVideosSet = new Set();

    (user.videoProgress || []).forEach((vp) => {
      if (vp.completed) {
        const key = vp.videoId
          ? `${vp.contentType || "video"}_${vp.videoId}`
          : `book_${vp.bookId}_${vp.videoIndex}`;
        completedVideosSet.add(key);
      }
    });

    (user.playlistProgress || []).forEach((pp) => {
      (pp.completedVideos || []).forEach((vId) => {
        completedVideosSet.add(`youtube_${vId}`);
      });
    });

    const videosCompleted = completedVideosSet.size;

    // 2. Books Stats:
    // Fetch books referenced in user's reading/video progress or created by user
    const bookIds = [
      ...(user.videoProgress || []).map((vp) => vp.bookId).filter(Boolean),
      ...(user.readingProgress || []).map((rp) => rp.bookId).filter(Boolean),
    ];

    const books = await Book.find({
      $or: [{ _id: { $in: bookIds } }, { addedBy: user._id }],
    }).lean();

    const bookMap = new Map(books.map((b) => [b._id.toString(), b]));

    let booksReading = 0;
    let booksCompleted = 0;

    (user.readingProgress || []).forEach((rp) => {
      if (
        rp.completed ||
        rp.progress >= 100 ||
        (rp.totalPages > 0 && rp.currentPage >= rp.totalPages)
      ) {
        booksCompleted++;
      } else if (rp.progress > 0) {
        booksReading++;
      }
    });

    // Check video books completion
    const videoBooksEncountered = new Set();
    (user.videoProgress || []).forEach((vp) => {
      if (vp.bookId && (!vp.contentType || vp.contentType === "book")) {
        videoBooksEncountered.add(vp.bookId.toString());
      }
    });

    videoBooksEncountered.forEach((bId) => {
      const book = bookMap.get(bId);
      if (book && book.type === "video" && book.videos?.length > 0) {
        const totalVids = book.videos.length;
        const finishedVids = (user.videoProgress || []).filter(
          (vp) => vp.bookId && vp.bookId.toString() === bId && vp.completed,
        ).length;
        if (finishedVids >= totalVids) {
          booksCompleted++;
        } else if (finishedVids > 0) {
          booksReading++;
        }
      }
    });

    // 3. Courses Stats:
    const coursesInProgress = (user.courseProgress || []).filter(
      (cp) =>
        !cp.completed &&
        ((cp.completedFiles && cp.completedFiles.length > 0) || cp.progress > 0),
    ).length;
    const coursesCompleted = (user.courseProgress || []).filter(
      (cp) => cp.completed || cp.progress >= 100,
    ).length;

    // 4. Playlists Stats:
    const playlistsInProgress = (user.playlistProgress || []).filter(
      (pp) =>
        !pp.completed &&
        ((pp.completedVideos && pp.completedVideos.length > 0) ||
          pp.progress > 0),
    ).length;
    const playlistsCompleted = (user.playlistProgress || []).filter(
      (pp) => pp.completed || pp.progress >= 100,
    ).length;

    // 5. Unified Notes Aggregation:
    const notesList = [];

    // a) Video Progress notes (books, courses, youtube)
    (user.videoProgress || []).forEach((vp) => {
      if (vp.note && vp.note.trim()) {
        let sourceTitle = vp.title || "Video Reflection";
        if (vp.bookId && bookMap.has(vp.bookId.toString())) {
          sourceTitle = bookMap.get(vp.bookId.toString()).title;
        }
        notesList.push({
          id: vp._id ? vp._id.toString() : `${vp.contentType}_${vp.videoId}`,
          type: vp.contentType || "book",
          sourceTitle,
          content: vp.note.trim(),
          date: vp.lastWatched || new Date(),
        });
      }
    });

    // b) YouTube Playlist video notes
    const playlists = await YoutubePlaylist.find({ addedBy: user._id }).lean();
    playlists.forEach((p) => {
      (p.videos || []).forEach((v) => {
        if (v.notes && v.notes.trim()) {
          const alreadyInList = notesList.some(
            (n) =>
              n.type === "youtube" &&
              (n.content === v.notes.trim() || n.id === v.videoId),
          );
          if (!alreadyInList) {
            notesList.push({
              id: `yt_${p._id}_${v.videoId}`,
              type: "youtube",
              sourceTitle: `${p.title} · ${v.title}`,
              content: v.notes.trim(),
              date: p.updatedAt || new Date(),
            });
          }
        }
      });
    });

    // c) SubSection Notes (custom notebook sections)
    const subSections = await SubSection.find({
      addedBy: user._id,
      type: "note",
    }).lean();
    subSections.forEach((s) => {
      if (s.content && s.content.trim()) {
        notesList.push({
          id: s._id.toString(),
          type: "notebook",
          sourceTitle: s.name,
          content: s.content.trim(),
          date: s.updatedAt || s.createdAt || new Date(),
        });
      }
    });

    // d) Captured Resources notes
    const capturedItems = await CapturedResource.find({
      user: user._id,
      status: { $ne: "archived" },
    }).lean();

    capturedItems.forEach((c) => {
      if (c.notes && c.notes.trim()) {
        notesList.push({
          id: c._id.toString(),
          type: c.platform,
          sourceTitle: c.title || `${c.platform.toUpperCase()} Capture`,
          content: c.notes.trim(),
          date: c.updatedAt || c.createdAt || new Date(),
        });
      }
    });

    // Sort notes descending by date
    notesList.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      stats: {
        videosCompleted,
        booksReading,
        booksCompleted,
        coursesInProgress,
        coursesCompleted,
        playlistsInProgress,
        playlistsCompleted,
        capturesSaved: capturedItems.length,
        capturesCompleted: capturedItems.filter((c) => c.status === "completed").length,
        totalNotes: notesList.length,
      },
      notes: notesList,
    });
  } catch (error) {
    console.error("Get user stats error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get user dashboard hub data, streak calendar, and in-progress shelf
// @route   GET /api/auth/dashboard
const getDashboardData = async (req, res) => {
  try {
    // 1. Record activity for today and update streaks
    const user = await recordUserActivity(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // 2. Counts for the 4 core pillars
    const [booksCount, coursesCount, capturesCount, sectionsCount] = await Promise.all([
      Book.countDocuments({
        $or: [{ addedBy: user._id }, { visibility: "public" }],
      }),
      Course.countDocuments({
        $or: [{ addedBy: user._id }, { visibility: "public" }],
      }),
      CapturedResource.countDocuments({
        user: user._id,
        status: { $ne: "archived" },
      }),
      CustomSection.countDocuments({
        addedBy: user._id,
      }),
    ]);

    // 3. Continue Learning Shelf
    // In-progress books:
    const inProgressBookIds = (user.readingProgress || [])
      .filter((rp) => !rp.completed && rp.progress > 0 && rp.progress < 100)
      .sort((a, b) => new Date(b.lastRead) - new Date(a.lastRead))
      .slice(0, 4)
      .map((rp) => rp.bookId);

    const inProgressBooks = await Book.find({ _id: { $in: inProgressBookIds } })
      .select("title author type coverImage coverImageId totalPages")
      .lean();

    const continueBooks = inProgressBooks.map((b) => {
      const rp = (user.readingProgress || []).find(
        (r) => r.bookId && r.bookId.toString() === b._id.toString(),
      );
      return {
        _id: b._id,
        title: b.title,
        author: b.author,
        type: b.type,
        coverImage: b.coverImage,
        coverImageId: b.coverImageId,
        progress: rp ? rp.progress : 0,
        currentPage: rp ? rp.currentPage : 1,
        totalPages: rp?.totalPages || b.totalPages || 0,
        lastActive: rp?.lastRead || new Date(),
        link: `/books/${b._id}`,
      };
    });

    // In-progress courses:
    const inProgressCourseIds = (user.courseProgress || [])
      .filter((cp) => !cp.completed && cp.progress > 0 && cp.progress < 100)
      .sort((a, b) => new Date(b.lastAccessed) - new Date(a.lastAccessed))
      .slice(0, 3)
      .map((cp) => cp.courseId);

    const inProgressCourses = await Course.find({ _id: { $in: inProgressCourseIds } })
      .select("title category driveLink")
      .populate("category", "name")
      .lean();

    const continueCourses = inProgressCourses.map((c) => {
      const cp = (user.courseProgress || []).find(
        (p) => p.courseId && p.courseId.toString() === c._id.toString(),
      );
      return {
        _id: c._id,
        title: c.title,
        category: c.category?.name || "Course",
        progress: cp ? cp.progress : 0,
        lastActive: cp?.lastAccessed || new Date(),
        link: `/courses/${c._id}`,
      };
    });

    // 4. Actionable Reminders:
    const dueReminders = await CapturedResource.find({
      user: user._id,
      reminderAt: { $ne: null },
      status: { $nin: ["archived", "completed"] },
    })
      .sort({ reminderAt: 1 })
      .limit(4)
      .select("title platform reminderAt url isPriority notes")
      .lean();

    // 5. Recent Learning Reflections:
    const recentNotes = [];
    (user.videoProgress || []).forEach((vp) => {
      if (vp.note && vp.note.trim()) {
        recentNotes.push({
          id: vp._id ? vp._id.toString() : `${vp.contentType}_${vp.videoId}`,
          sourceTitle: vp.title || "Video Reflection",
          type: vp.contentType || "book",
          content: vp.note.trim(),
          date: vp.lastWatched || new Date(),
        });
      }
    });

    const subSections = await SubSection.find({ addedBy: user._id, type: "note" })
      .sort({ updatedAt: -1 })
      .limit(3)
      .lean();

    subSections.forEach((s) => {
      if (s.content && s.content.trim()) {
        recentNotes.push({
          id: s._id.toString(),
          sourceTitle: s.name,
          type: "notebook",
          content: s.content.trim(),
          date: s.updatedAt || s.createdAt || new Date(),
        });
      }
    });

    recentNotes.sort((a, b) => new Date(b.date) - new Date(a.date));

    // 6. Active days this month:
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const activeDaysThisMonth = (user.activityDays || []).filter((d) =>
      d.startsWith(currentYearMonth),
    ).length;

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
      activity: {
        activityDays: user.activityDays || [],
        currentStreak: user.currentStreak || 0,
        maxStreak: user.maxStreak || 0,
        activeDaysThisMonth,
      },
      counts: {
        books: booksCount,
        courses: coursesCount,
        captures: capturesCount,
        sections: sectionsCount,
      },
      continueLearning: {
        books: continueBooks,
        courses: continueCourses,
      },
      dueReminders,
      recentNotes: recentNotes.slice(0, 4),
    });
  } catch (error) {
    console.error("Get dashboard data error:", error);
    res.status(500).json({ message: "Failed to load dashboard data" });
  }
};

module.exports = {
  register,
  login,
  googleCallback,
  getMe,
  logout,
  updateProfile,
  markNotificationsRead,
  setCookie,
  getUserStats,
  getDashboardData,
};
