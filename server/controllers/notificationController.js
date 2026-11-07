const Notification = require("../models/Notification");
const User = require("../models/User");

/**
 * Fetch all notifications for the authenticated user
 * GET /api/notifications
 */
const getNotifications = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments({ user: req.user._id }),
      Notification.countDocuments({ user: req.user._id, readAt: null }),
    ]);

    // Map `read` boolean property for consumer convenience
    const formatted = notifications.map((n) => ({
      ...n,
      read: n.readAt != null,
    }));

    return res.status(200).json({
      success: true,
      notifications: formatted,
      unreadCount,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("[NotificationController] getNotifications error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
    });
  }
};

/**
 * Mark a single notification as read
 * PATCH /api/notifications/:id/read
 */
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, user: req.user._id },
      { $set: { readAt: new Date() } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      notification: {
        ...notification.toObject(),
        read: true,
      },
    });
  } catch (err) {
    console.error("[NotificationController] markAsRead error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to mark notification as read",
    });
  }
};

/**
 * Mark all notifications as read for current user
 * PATCH /api/notifications/read-all
 * (or PUT /api/notifications/mark-read)
 */
const markAllAsRead = async (req, res) => {
  try {
    const now = new Date();
    await Promise.all([
      Notification.updateMany(
        { user: req.user._id, readAt: null },
        { $set: { readAt: now } }
      ),
      // Also update embedded User.notifications for backwards compatibility
      User.updateOne(
        { _id: req.user._id, "notifications.read": false },
        { $set: { "notifications.$[elem].read": true } },
        { arrayFilters: [{ "elem.read": false }] }
      ).catch(() => {}),
    ]);

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (err) {
    console.error("[NotificationController] markAllAsRead error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to mark all notifications as read",
    });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
};

