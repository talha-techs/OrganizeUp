const express = require("express");
const router = express.Router();
const {
  getStats,
  getUsers,
  getUserDetail,
  deleteUser,
  toggleVisibility,
  getAllContent,
  adminDeleteContent,
} = require("../controllers/adminController");
const { protect, adminOnly } = require("../middleware/auth");

router.use(protect, adminOnly);

router.get("/stats", getStats);
router.get("/users", getUsers);
router.get("/users/:id", getUserDetail);
router.delete("/users/:id", deleteUser);
router.put("/toggle-visibility", toggleVisibility);
router.get("/content/:type", getAllContent);
router.delete("/content/:type/:id", adminDeleteContent);

module.exports = router;
