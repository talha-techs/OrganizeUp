const PushSubscription = require("../models/PushSubscription");

/**
 * Register or update a push subscription for the logged-in user
 * POST /api/push/subscribe
 */
const subscribe = async (req, res) => {
  try {
    const { endpoint, keys } = req.body || {};

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscription payload: endpoint and keys (p256dh, auth) are required",
      });
    }

    const userAgent = req.headers["user-agent"] || "";

    const subscription = await PushSubscription.findOneAndUpdate(
      { endpoint },
      {
        user: req.user._id,
        endpoint,
        keys: {
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
        userAgent,
        lastSeen: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      success: true,
      message: "Push subscription registered successfully",
      subscriptionId: subscription._id,
    });
  } catch (err) {
    console.error("[PushController] subscribe error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to register push subscription",
    });
  }
};

/**
 * Remove a push subscription for the logged-in user
 * POST /api/push/unsubscribe
 */
const unsubscribe = async (req, res) => {
  try {
    const { endpoint } = req.body || {};

    if (!endpoint) {
      return res.status(400).json({
        success: false,
        message: "Endpoint is required to unsubscribe",
      });
    }

    await PushSubscription.deleteOne({
      endpoint,
      user: req.user._id,
    });

    return res.status(200).json({
      success: true,
      message: "Push subscription removed successfully",
    });
  } catch (err) {
    console.error("[PushController] unsubscribe error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to remove push subscription",
    });
  }
};

/**
 * Check if current user has any active push subscriptions
 * GET /api/push/status
 */
const getStatus = async (req, res) => {
  try {
    const count = await PushSubscription.countDocuments({ user: req.user._id });
    return res.status(200).json({
      success: true,
      isSubscribed: count > 0,
      subscriptionCount: count,
    });
  } catch (err) {
    console.error("[PushController] getStatus error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to check subscription status",
    });
  }
};

module.exports = {
  subscribe,
  unsubscribe,
  getStatus,
};

