const express = require("express");
const router = express.Router();
const {
  getExploreContent,
  getExploreItem,
} = require("../controllers/exploreController");
const { protect } = require("../middleware/auth");

// Public feed — still requires auth to get user-specific vote data
router.get("/", protect, getExploreContent);
router.get("/:contentType/:contentId", protect, getExploreItem);

module.exports = router;
