const express = require("express");
const passport = require("passport");
const router = express.Router();
const {
  register,
  login,
  googleCallback,
  getMe,
  logout,
  updateProfile,
  markNotificationsRead,
  setCookie,
  getUserStats,
  getDashboardData,
  getSocketToken,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");
const upload = require("../middleware/upload");
const {
  validate,
  registerRules,
  loginRules,
} = require("../middleware/validators");

// Email/Password auth
router.post("/register", registerRules, validate, register);
router.post("/login", loginRules, validate, login);
router.post("/logout", logout);
router.post("/set-cookie", setCookie); // Used to fix cross-domain OAuth cookie drops

// Google OAuth
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

router.get(
  "/google/callback",
  (req, res, next) => {
    let clientUrl = process.env.CLIENT_URL || "https://organizeup.app";
    if (clientUrl.endsWith("/")) {
      clientUrl = clientUrl.slice(0, -1);
    }
    passport.authenticate("google", {
      failureRedirect: `${clientUrl}/login?error=google_oauth_rejected`,
      session: false,
    })(req, res, next);
  },
  googleCallback,
);

// Protected routes
router.get("/me", protect, getMe);
router.get("/socket-token", protect, getSocketToken);
router.get("/stats", protect, getUserStats);
router.get("/dashboard", protect, getDashboardData);
router.put("/profile", protect, upload.single("avatar"), updateProfile);
router.put("/notifications/mark-read", protect, markNotificationsRead);

module.exports = router;
