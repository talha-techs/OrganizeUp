const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const upload = require("../middleware/upload");
const {
  scrapeMetadata,
  getCaptures,
  getCaptureById,
  createCapture,
  updateCapture,
  toggleCaptureComplete,
  deleteCapture,
} = require("../controllers/captureController");

// Scrape link metadata for live modal preview
router.post("/scrape", protect, scrapeMetadata);

// Get list of captures with filtering / stats
router.get("/", protect, getCaptures);

// Create capture (with optional image file upload)
router.post("/", protect, upload.single("image"), createCapture);

// Single capture operations
router.get("/:id", protect, getCaptureById);
router.put("/:id", protect, updateCapture);
router.patch("/:id/toggle", protect, toggleCaptureComplete);
router.delete("/:id", protect, deleteCapture);

module.exports = router;
