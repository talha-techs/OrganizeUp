const express = require("express");
const router = express.Router();
const { scanDriveUniversal } = require("../controllers/driveController");
const { protect } = require("../middleware/auth");

// POST /api/drive/scan — universal recursive folder scan
router.post("/scan", protect, scanDriveUniversal);

module.exports = router;
