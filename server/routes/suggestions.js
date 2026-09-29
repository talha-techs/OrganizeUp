const express = require("express");
const router = express.Router();
const {
  createSuggestion,
  getMySuggestions,
  updateMySuggestion,
  getAllSuggestions,
  getSuggestionStats,
  updateSuggestionStatus,
  deleteSuggestion,
} = require("../controllers/suggestionController");
const { protect, adminOnly } = require("../middleware/auth");

// User routes (accessible by author)
router.post("/", protect, createSuggestion);
router.get("/my", protect, getMySuggestions);
router.put("/my/:id", protect, updateMySuggestion);
router.delete("/:id", protect, deleteSuggestion); // Handles both owner deletion and admin deletion

// Admin-only routes
router.get("/stats", protect, adminOnly, getSuggestionStats);
router.get("/", protect, adminOnly, getAllSuggestions);
router.put("/:id", protect, adminOnly, updateSuggestionStatus);

module.exports = router;
