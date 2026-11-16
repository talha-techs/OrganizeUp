const { HabitProfile, defaultHabits, defaultWins } = require("../models/HabitProfile");
const HabitLog = require("../models/HabitLog");

// Keyword to icon mapping for auto-icon detection
const KEYWORD_ICONS = [
  { keywords: ["sleep", "rest", "bed", "nap"], icon: "💤" },
  { keywords: ["eat", "meal", "food", "salad", "diet", "nutrition", "healthy", "breakfast", "lunch", "dinner"], icon: "🥗" },
  { keywords: ["water", "drink", "hydrate", "hydration", "fluid"], icon: "💧" },
  { keywords: ["social", "phone", "media", "screen", "instagram", "tiktok", "twitter", "youtube"], icon: "📱" },
  { keywords: ["corn", "alcohol", "smoke", "smoking", "beer", "quit", "stop", "no"], icon: "🚫" },
  { keywords: ["study", "learn", "course", "lecture", "class", "exam"], icon: "📚" },
  { keywords: ["exercise", "gym", "workout", "fitness", "train", "lift", "cardio", "pushup"], icon: "🏋️" },
  { keywords: ["run", "jog", "running"], icon: "🏃" },
  { keywords: ["read", "book", "reading", "pages", "novel"], icon: "📖" },
  { keywords: ["journal", "write", "writing", "reflect", "reflection", "diary"], icon: "✍️" },
  { keywords: ["plan", "todo", "task", "tasks", "organize", "schedule"], icon: "📋" },
  { keywords: ["code", "leetcode", "program", "programming", "dev", "develop", "software", "bug"], icon: "💻" },
  { keywords: ["pray", "namaz", "salah", "prayer", "mosque", "fajr", "maghrib", "isha", "dhuhr", "asr"], icon: "🕌" },
  { keywords: ["darood", "quran", "zikr", "dhikr", "dua", "hadith", "tasbeeh"], icon: "🤲" },
  { keywords: ["meditate", "mindfulness", "breathe", "breathing", "zen"], icon: "🧘" },
  { keywords: ["walk", "steps", "walking"], icon: "🚶" },
  { keywords: ["stretch", "yoga", "flexibility"], icon: "🤸" },
  { keywords: ["money", "save", "budget", "finance", "invest"], icon: "💰" },
  { keywords: ["teeth", "brush", "floss", "hygiene"], icon: "🪥" },
  { keywords: ["shower", "bath", "cold shower"], icon: "🚿" },
  { keywords: ["sun", "morning", "wake", "early"], icon: "☀️" },
  { keywords: ["clean", "tidy", "room", "chores"], icon: "🧹" },
];

const detectIcon = (name) => {
  if (!name) return "✨";
  const lower = name.toLowerCase();
  for (const item of KEYWORD_ICONS) {
    if (item.keywords.some((k) => lower.includes(k))) {
      return item.icon;
    }
  }
  return "✨";
};

// @desc    Get user's habit profile (or create default)
// @route   GET /api/habits/profile
const getHabitProfile = async (req, res) => {
  try {
    let profile = await HabitProfile.findOne({ user: req.user._id });
    if (!profile) {
      profile = new HabitProfile({
        user: req.user._id,
        tagline: "Progress not Perfection",
        habits: defaultHabits,
        wins: defaultWins,
      });
      profile.columnOrder = profile.habits.map((h) => String(h._id));
      await profile.save();
    } else {
      // Clean up removed default habits if present
      const removedPatterns = ["no corn/alcohol", "pray namaz", "recite darood"];
      const hadRemoved = profile.habits.some((h) =>
        removedPatterns.some((pattern) => h.name.toLowerCase().includes(pattern))
      );
      if (hadRemoved) {
        const removedIds = new Set(
          profile.habits
            .filter((h) =>
              removedPatterns.some((pattern) => h.name.toLowerCase().includes(pattern))
            )
            .map((h) => String(h._id))
        );
        profile.habits = profile.habits.filter((h) => !removedIds.has(String(h._id)));
        profile.columnOrder = (profile.columnOrder || []).filter((id) => !removedIds.has(id));
      }

      // Ensure columnOrder has all habits
      const existingIds = profile.habits.map((h) => String(h._id));
      const currentOrder = profile.columnOrder || [];
      const missingIds = existingIds.filter((id) => !currentOrder.includes(id));
      if (missingIds.length > 0 || hadRemoved) {
        profile.columnOrder = [...currentOrder.filter((id) => existingIds.includes(id)), ...missingIds];
        await profile.save();
      }
    }

    res.json({ success: true, profile });
  } catch (error) {
    console.error("Get habit profile error:", error);
    res.status(500).json({ message: "Failed to load habit profile" });
  }
};

// @desc    Update habit profile tagline or wins
// @route   PUT /api/habits/profile
const updateHabitProfile = async (req, res) => {
  try {
    let profile = await HabitProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    const { tagline, wins } = req.body;
    if (tagline !== undefined) profile.tagline = tagline.trim();
    if (Array.isArray(wins)) profile.wins = wins;

    await profile.save();
    res.json({ success: true, profile });
  } catch (error) {
    console.error("Update habit profile error:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
};

// @desc    Add a new habit
// @route   POST /api/habits
const addHabit = async (req, res) => {
  try {
    const { name, icon } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Habit name is required" });
    }

    let profile = await HabitProfile.findOne({ user: req.user._id });
    if (!profile) {
      profile = new HabitProfile({
        user: req.user._id,
        habits: defaultHabits,
        wins: defaultWins,
      });
      profile.columnOrder = profile.habits.map((h) => String(h._id));
    }

    const assignedIcon = icon && icon.trim() ? icon.trim() : detectIcon(name);
    const newOrder = profile.habits.length;

    profile.habits.push({
      name: name.trim(),
      icon: assignedIcon,
      order: newOrder,
      active: true,
    });

    const newHabit = profile.habits[profile.habits.length - 1];
    profile.columnOrder.push(String(newHabit._id));

    await profile.save();
    res.json({ success: true, profile, habit: newHabit });
  } catch (error) {
    console.error("Add habit error:", error);
    res.status(500).json({ message: "Failed to add habit" });
  }
};

// @desc    Update an existing habit
// @route   PUT /api/habits/:habitId
const updateHabit = async (req, res) => {
  try {
    const profile = await HabitProfile.findOne({ user: req.user._id });
    if (!profile) return res.status(404).json({ message: "Profile not found" });

    const habit = profile.habits.id(req.params.habitId);
    if (!habit) return res.status(404).json({ message: "Habit not found" });

    const { name, icon, active, order } = req.body;
    if (name !== undefined) habit.name = name.trim();
    if (icon !== undefined) habit.icon = icon.trim();
    if (active !== undefined) habit.active = Boolean(active);
    if (order !== undefined) habit.order = Number(order);

    await profile.save();
    res.json({ success: true, profile, habit });
  } catch (error) {
    console.error("Update habit error:", error);
    res.status(500).json({ message: "Failed to update habit" });
  }
};

// @desc    Delete a habit
// @route   DELETE /api/habits/:habitId
const deleteHabit = async (req, res) => {
  try {
    const profile = await HabitProfile.findOne({ user: req.user._id });
    if (!profile) return res.status(404).json({ message: "Profile not found" });

    const habitId = req.params.habitId;
    profile.habits = profile.habits.filter((h) => String(h._id) !== habitId);
    profile.columnOrder = (profile.columnOrder || []).filter((id) => id !== habitId);

    await profile.save();

    // Also pull deleted habitId from HabitLogs
    await HabitLog.updateMany(
      { user: req.user._id, completedHabits: habitId },
      { $pull: { completedHabits: habitId } }
    );

    res.json({ success: true, profile, deletedHabitId: habitId });
  } catch (error) {
    console.error("Delete habit error:", error);
    res.status(500).json({ message: "Failed to delete habit" });
  }
};

// @desc    Reorder habit columns for table view
// @route   PUT /api/habits/columns/reorder
const reorderColumns = async (req, res) => {
  try {
    const { columnOrder } = req.body;
    if (!Array.isArray(columnOrder)) {
      return res.status(400).json({ message: "Invalid column order format" });
    }

    const profile = await HabitProfile.findOne({ user: req.user._id });
    if (!profile) return res.status(404).json({ message: "Profile not found" });

    profile.columnOrder = columnOrder;
    await profile.save();

    res.json({ success: true, columnOrder: profile.columnOrder });
  } catch (error) {
    console.error("Reorder columns error:", error);
    res.status(500).json({ message: "Failed to reorder columns" });
  }
};

// @desc    Reorder habits in habit list
// @route   PUT /api/habits/reorder
const reorderHabits = async (req, res) => {
  try {
    const { habitIds } = req.body;
    if (!Array.isArray(habitIds)) {
      return res.status(400).json({ message: "Invalid habitIds format" });
    }

    const profile = await HabitProfile.findOne({ user: req.user._id });
    if (!profile) return res.status(404).json({ message: "Profile not found" });

    const habitMap = new Map();
    profile.habits.forEach((h) => habitMap.set(String(h._id), h));

    const reordered = [];
    habitIds.forEach((id, idx) => {
      const h = habitMap.get(String(id));
      if (h) {
        h.order = idx;
        reordered.push(h);
        habitMap.delete(String(id));
      }
    });

    // Add any remaining habits that weren't in the list
    habitMap.forEach((h) => {
      h.order = reordered.length;
      reordered.push(h);
    });

    profile.habits = reordered;
    await profile.save();

    res.json({ success: true, profile });
  } catch (error) {
    console.error("Reorder habits error:", error);
    res.status(500).json({ message: "Failed to reorder habits" });
  }
};

// @desc    Get habit logs for a date range (YYYY-MM-DD to YYYY-MM-DD)
// @route   GET /api/habits/logs
const getHabitLogs = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = { user: req.user._id };

    if (startDate && endDate) {
      query.date = { $gte: String(startDate), $lte: String(endDate) };
    } else if (startDate) {
      query.date = { $gte: String(startDate) };
    } else if (endDate) {
      query.date = { $lte: String(endDate) };
    }

    const logs = await HabitLog.find(query).lean();
    res.json({ success: true, logs });
  } catch (error) {
    console.error("Get habit logs error:", error);
    res.status(500).json({ message: "Failed to load logs" });
  }
};

// @desc    Toggle completion of a habit for a date
// @route   PUT /api/habits/logs/:date/toggle
const toggleHabitCompletion = async (req, res) => {
  try {
    const { date } = req.params;
    const { habitId } = req.body;
    if (!habitId) {
      return res.status(400).json({ message: "Habit ID is required" });
    }

    let log = await HabitLog.findOne({ user: req.user._id, date });
    if (!log) {
      log = new HabitLog({
        user: req.user._id,
        date,
        completedHabits: [habitId],
      });
    } else {
      const index = log.completedHabits.indexOf(habitId);
      if (index > -1) {
        log.completedHabits.splice(index, 1);
      } else {
        log.completedHabits.push(habitId);
      }
    }

    await log.save();
    res.json({ success: true, log });
  } catch (error) {
    console.error("Toggle habit completion error:", error);
    res.status(500).json({ message: "Failed to toggle habit" });
  }
};

// @desc    Save daily note for a date
// @route   PUT /api/habits/logs/:date/note
const saveHabitNote = async (req, res) => {
  try {
    const { date } = req.params;
    const { notes } = req.body;

    let log = await HabitLog.findOne({ user: req.user._id, date });
    if (!log) {
      log = new HabitLog({
        user: req.user._id,
        date,
        notes: (notes || "").trim(),
      });
    } else {
      log.notes = (notes || "").trim();
    }

    await log.save();
    res.json({ success: true, log });
  } catch (error) {
    console.error("Save habit note error:", error);
    res.status(500).json({ message: "Failed to save note" });
  }
};

// @desc    Update a specific win milestone
// @route   PUT /api/habits/wins/:winId
const updateWinMilestone = async (req, res) => {
  try {
    const profile = await HabitProfile.findOne({ user: req.user._id });
    if (!profile) return res.status(404).json({ message: "Profile not found" });

    const win = profile.wins.id(req.params.winId);
    if (!win) return res.status(404).json({ message: "Milestone not found" });

    const { reward, notes, achievedDate } = req.body;
    if (reward !== undefined) win.reward = reward.trim();
    if (notes !== undefined) win.notes = notes.trim();
    if (achievedDate !== undefined) win.achievedDate = achievedDate;

    await profile.save();
    res.json({ success: true, profile, win });
  } catch (error) {
    console.error("Update win milestone error:", error);
    res.status(500).json({ message: "Failed to update milestone" });
  }
};

// @desc    Get overall stats, streak, and monthly completion for gallery view
// @route   GET /api/habits/stats
const getHabitStats = async (req, res) => {
  try {
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    const profile = await HabitProfile.findOne({ user: req.user._id });
    const totalHabits = profile?.habits?.filter((h) => h.active !== false).length || 1;

    // Fetch all logs for the user
    const allLogs = await HabitLog.find({ user: req.user._id }).sort({ date: 1 }).lean();

    // Map by date for quick lookup
    const logsByDate = new Map();
    allLogs.forEach((l) => logsByDate.set(l.date, l));

    // Calculate winning days (>= 75% completed)
    const isWinningDay = (log) => {
      if (!log || !Array.isArray(log.completedHabits)) return false;
      const count = log.completedHabits.length;
      return totalHabits > 0 && count / totalHabits >= 0.75;
    };

    // Calculate streaks
    // Sort all unique dates with >= 75% completion
    const winningDates = new Set();
    allLogs.forEach((l) => {
      if (isWinningDay(l)) {
        winningDates.add(l.date);
      }
    });

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    let currentStreak = 0;
    // Check if streak is active starting today or yesterday
    let checkDate = winningDates.has(todayStr) ? new Date(now) : (winningDates.has(yesterdayStr) ? new Date(yesterday) : null);

    if (checkDate) {
      while (true) {
        const dStr = checkDate.toISOString().slice(0, 10);
        if (winningDates.has(dStr)) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // Longest streak
    let longestStreak = 0;
    let tempStreak = 0;
    let prevWinningDate = null;

    const sortedDates = Array.from(winningDates).sort();
    for (const dStr of sortedDates) {
      const curDate = new Date(dStr);
      if (prevWinningDate) {
        const diffDays = Math.round((curDate - prevWinningDate) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      } else {
        tempStreak = 1;
      }
      if (tempStreak > longestStreak) longestStreak = tempStreak;
      prevWinningDate = curDate;
    }

    // Monthly completion rates for the requested year (1 to 12)
    const monthlyProgress = {};
    for (let m = 1; m <= 12; m++) {
      const monthStr = String(m).padStart(2, "0");
      const daysInMonth = new Date(year, m, 0).getDate();
      const prefix = `${year}-${monthStr}-`;

      let totalCheckedInMonth = 0;
      const maxPossibleInMonth = daysInMonth * totalHabits;

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${prefix}${String(day).padStart(2, "0")}`;
        const log = logsByDate.get(dateStr);
        if (log && Array.isArray(log.completedHabits)) {
          totalCheckedInMonth += log.completedHabits.length;
        }
      }

      const percent = maxPossibleInMonth > 0 ? Math.round((totalCheckedInMonth / maxPossibleInMonth) * 100) : 0;
      monthlyProgress[m] = percent;
    }

    res.json({
      success: true,
      stats: {
        year,
        currentStreak,
        longestStreak: Math.max(longestStreak, currentStreak),
        totalWinningDays: winningDates.size,
        monthlyProgress,
      },
    });
  } catch (error) {
    console.error("Get habit stats error:", error);
    res.status(500).json({ message: "Failed to calculate habit stats" });
  }
};

module.exports = {
  getHabitProfile,
  updateHabitProfile,
  addHabit,
  updateHabit,
  deleteHabit,
  reorderColumns,
  reorderHabits,
  getHabitLogs,
  toggleHabitCompletion,
  saveHabitNote,
  updateWinMilestone,
  getHabitStats,
};
