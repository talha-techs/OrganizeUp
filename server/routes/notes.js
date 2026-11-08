const express = require("express");
const rateLimit = require("express-rate-limit");
const { protect } = require("../middleware/auth");
const {
  getNotes,
  getNoteById,
  createNote,
  updateNote,
  softDeleteNote,
  restoreNote,
  permanentDeleteNote,
  exportNote,
} = require("../controllers/noteController");

const router = express.Router();

// Dedicated rate limiter for note write operations (autosaves / creation)
const noteWriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 150, // Allows rapid debounced typing sync without false positive blocks
  message: { success: false, message: "Too many note saves, please slow down" },
  standardHeaders: true,
  legacyHeaders: false,
});

// All note routes require authenticated user
router.use(protect);

router.get("/", getNotes);
router.post("/", noteWriteLimiter, createNote);

router.get("/:id", getNoteById);
router.patch("/:id", noteWriteLimiter, updateNote);
router.delete("/:id", softDeleteNote);
router.post("/:id/restore", restoreNote);
router.delete("/:id/permanent", permanentDeleteNote);
router.get("/:id/export", exportNote);

module.exports = router;

