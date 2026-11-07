const express = require("express");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const { processDueReminders } = require("../services/reminderService");

const router = express.Router();

// Dedicated rate limiter for internal cron triggers (max 120 requests per minute)
const internalCronLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { success: false, message: "Too many cron requests, please slow down" },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Middleware: Verify incoming x-cron-secret header with constant-time comparison
 */
const verifyCronSecret = (req, res, next) => {
  const provided = req.headers["x-cron-secret"];
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    console.error("[Internal] CRON_SECRET is not configured on this server");
    return res.status(500).json({
      success: false,
      message: "CRON_SECRET is not configured on the server",
    });
  }

  if (!provided) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Missing x-cron-secret header",
    });
  }

  const providedBuf = Buffer.from(String(provided), "utf-8");
  const expectedBuf = Buffer.from(String(expected), "utf-8");

  // Constant-time comparison: lengths must match before crypto.timingSafeEqual
  if (
    providedBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(providedBuf, expectedBuf)
  ) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid x-cron-secret",
    });
  }

  next();
};

/**
 * Trigger background reminder processing
 * POST /api/internal/run-reminders
 */
router.post(
  "/run-reminders",
  internalCronLimiter,
  verifyCronSecret,
  async (req, res) => {
    try {
      const result = await processDueReminders();
      return res.status(200).json({
        success: true,
        message: "Reminders processed successfully",
        ...result,
      });
    } catch (err) {
      console.error("[Internal] run-reminders processing error:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to process due reminders",
        error: err.message,
      });
    }
  }
);

module.exports = router;

