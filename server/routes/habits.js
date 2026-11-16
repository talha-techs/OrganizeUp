const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
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
} = require("../controllers/habitController");

// All habit routes require authentication
router.use(protect);

// Profile & Habit List management
router.get("/profile", getHabitProfile);
router.put("/profile", updateHabitProfile);
router.post("/", addHabit);
router.put("/reorder", reorderHabits);
router.put("/columns/reorder", reorderColumns);
router.put("/wins/:winId", updateWinMilestone);
router.put("/:habitId", updateHabit);
router.delete("/:habitId", deleteHabit);

// Daily Logs & Actions
router.get("/logs", getHabitLogs);
router.put("/logs/:date/toggle", toggleHabitCompletion);
router.put("/logs/:date/note", saveHabitNote);

// Stats & Monthly Overview
router.get("/stats", getHabitStats);

module.exports = router;
