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
  updatePlaylistVideoProgress,
  saveFromExplore,
} = require("../controllers/youtubePlaylistController");
const { protect } = require("../middleware/auth");

router.get("/", protect, getPlaylists);
router.get("/:id", protect, getPlaylist);
router.post("/", protect, addPlaylist);
router.post("/save-from-explore/:id", protect, saveFromExplore);
router.put("/:id", protect, updatePlaylist);
router.delete("/:id", protect, deletePlaylist);

// Video Progress & Notes
router.put("/:id/videos/:videoId/progress", protect, updatePlaylistVideoProgress);
router.put("/:id/videos/:videoId/notes", protect, saveVideoNotes);
router.get("/:id/notes", protect, getCombinedNotes);

// Refresh from YouTube
router.post("/:id/refresh", protect, refreshPlaylist);

module.exports = router;
