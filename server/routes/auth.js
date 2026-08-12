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
  passport.authenticate("google", {
    failureRedirect: "/login",
    session: false,
  }),
  googleCallback,
);

// Protected routes
router.get("/me", protect, getMe);
router.put("/profile", protect, upload.single("avatar"), updateProfile);
router.put("/notifications/mark-read", protect, markNotificationsRead);

module.exports = router;
