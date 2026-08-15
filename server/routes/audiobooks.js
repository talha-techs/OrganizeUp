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

// 1. Static & Collection Routes (must come BEFORE parameterized /:id routes)
router.get("/explore", protect, getExploreAudiobooks);
router.get("/modern", protect, getModernAudiobooks);
router.post("/modern/:videoId/save", protect, saveModernAudiobookToLibrary);

// 2. Parameterized Routes (:id)
router.get("/:id", protect, getAudiobookById);
router.post("/:id/save", protect, saveAudiobookToLibrary);
router.delete("/:id/unsave", protect, unsaveAudiobookFromLibrary);

module.exports = router;
