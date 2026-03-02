const express = require("express");
const router = express.Router();
const {
  getLibrary,
  addToLibrary,
  removeFromLibrary,
  updateNotes,
  checkInLibrary,
} = require("../controllers/libraryController");
const { protect } = require("../middleware/auth");

router.get("/", protect, getLibrary);
router.get("/check/:contentType/:contentId", protect, checkInLibrary);
router.post("/:contentType/:contentId", protect, addToLibrary);
router.put("/:id/notes", protect, updateNotes);
router.delete("/:id", protect, removeFromLibrary);

module.exports = router;
