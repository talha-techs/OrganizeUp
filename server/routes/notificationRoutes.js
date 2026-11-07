const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
} = require("../controllers/notificationController");

router.use(protect);

router.get("/", getNotifications);
router.patch("/read-all", markAllAsRead);
router.put("/mark-read", markAllAsRead); // Compatibility alias
router.patch("/:id/read", markAsRead);

module.exports = router;

