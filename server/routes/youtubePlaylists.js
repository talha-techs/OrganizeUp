const express = require("express");
const router = express.Router();
const {
  getPlaylists,
  getPlaylist,
  addPlaylist,
  updatePlaylist,
  deletePlaylist,
  saveVideoNotes,
  getCombinedNotes,
  refreshPlaylist,
} = require("../controllers/youtubePlaylistController");
const { protect } = require("../middleware/auth");

router.get("/", protect, getPlaylists);
router.get("/:id", protect, getPlaylist);
router.post("/", protect, addPlaylist);
router.put("/:id", protect, updatePlaylist);
router.delete("/:id", protect, deletePlaylist);

// Notes
router.put("/:id/videos/:videoId/notes", protect, saveVideoNotes);
router.get("/:id/notes", protect, getCombinedNotes);

// Refresh from YouTube
router.post("/:id/refresh", protect, refreshPlaylist);

module.exports = router;
