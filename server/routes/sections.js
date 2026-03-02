const express = require("express");
const router = express.Router();
const {
  getSections,
  getSection,
  createSection,
  importToSection,
  updateSection,
  deleteSection,
  removeFile,
} = require("../controllers/sectionController");
const { protect } = require("../middleware/auth");

router.get("/", protect, getSections);
router.get("/:id", protect, getSection);
router.post("/", protect, createSection);
router.post("/:id/import", protect, importToSection);
router.put("/:id", protect, updateSection);
router.delete("/:id", protect, deleteSection);
router.delete("/:id/files/:fileId", protect, removeFile);

module.exports = router;
