const express = require("express");
const router = express.Router();
const {
  getStats,
  getAnalytics,
  getUsers,
  getUserDetail,
  deleteUser,
  toggleVisibility,
  unpublishContent,
  getAllContent,
  getContentPreview,
  adminDeleteContent,
  getContentCounts,
  getAuditLogs,
} = require("../controllers/adminController");
const { protect, adminOnly } = require("../middleware/auth");

// Prevent caching of any sensitive admin responses
router.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, private, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  next();
});

// Enforce strict admin access on all admin routes
router.use(protect, adminOnly);

router.get("/stats", getStats);
router.get("/analytics", getAnalytics);
router.get("/counts", getContentCounts);
router.get("/audit-logs", getAuditLogs);
router.get("/users", getUsers);
router.get("/users/:id", getUserDetail);
router.delete("/users/:id", deleteUser);

// Moderation & Content Management
router.get("/content/:type", getAllContent);
router.get("/content/:type/:id/preview", getContentPreview);
router.put("/content/:type/:id/unpublish", unpublishContent);
router.delete("/content/:type/:id", adminDeleteContent);
router.put("/toggle-visibility", toggleVisibility);

module.exports = router;
