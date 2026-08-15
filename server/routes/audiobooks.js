const express = require("express");
const router = express.Router();
const {
  getExploreAudiobooks,
  getAudiobookById,
  saveAudiobookToLibrary,
  unsaveAudiobookFromLibrary,
  getModernAudiobooks,
  saveModernAudiobookToLibrary,
} = require("../controllers/audiobookController");
const { protect } = require("../middleware/auth");

// LibriVox Classics routes
router.get("/explore", protect, getExploreAudiobooks);
router.get("/:id", protect, getAudiobookById);
router.post("/:id/save", protect, saveAudiobookToLibrary);
router.delete("/:id/unsave", protect, unsaveAudiobookFromLibrary);

// Modern Audiobooks & Summaries (YouTube) routes
router.get("/modern", protect, getModernAudiobooks);
router.post("/modern/:videoId/save", protect, saveModernAudiobookToLibrary);

module.exports = router;
