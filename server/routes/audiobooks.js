const express = require("express");
const router = express.Router();
const {
  getExploreAudiobooks,
  getAudiobookById,
  saveAudiobookToLibrary,
  unsaveAudiobookFromLibrary,
} = require("../controllers/audiobookController");
const { protect } = require("../middleware/auth");

// All routes require authenticated user
router.get("/explore", protect, getExploreAudiobooks);
router.get("/:id", protect, getAudiobookById);
router.post("/:id/save", protect, saveAudiobookToLibrary);
router.delete("/:id/unsave", protect, unsaveAudiobookFromLibrary);

module.exports = router;
