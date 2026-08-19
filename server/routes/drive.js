const express = require("express");
const router = express.Router();
const {
  scanDriveUniversal,
  getDriveFileContent,
  getDriveFileImage,
} = require("../controllers/driveController");
const { protect } = require("../middleware/auth");

// POST /api/drive/scan — universal recursive folder scan
router.post("/scan", protect, scanDriveUniversal);

// GET /api/drive/file/:fileId/content — get text / code content
router.get("/file/:fileId/content", protect, getDriveFileContent);

// GET /api/drive/file/:fileId/image — stream / proxy image
router.get("/file/:fileId/image", getDriveFileImage);

module.exports = router;
