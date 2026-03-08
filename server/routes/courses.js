const express = require("express");
const router = express.Router();
const {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  importToCourse,
  removeFileFromCourse,
  getCategories,
  createCategory,
  deleteCategory,
} = require("../controllers/courseController");
const { protect, adminOnly } = require("../middleware/auth");
const {
  validate,
  courseRules,
  categoryRules,
} = require("../middleware/validators");
const upload = require("../middleware/upload");

// Category routes
router.get("/categories", protect, getCategories);
router.post(
  "/categories",
  protect,
  adminOnly,
  categoryRules,
  validate,
  createCategory,
);
router.delete("/categories/:id", protect, adminOnly, deleteCategory);

// Course routes
router.get("/", protect, getCourses);
router.get("/:id", protect, getCourse);
router.post(
  "/",
  protect,
  upload.single("bannerImage"),
  courseRules,
  validate,
  createCourse,
);
router.post("/:id/import", protect, importToCourse);
router.put(
  "/:id",
  protect,
  upload.single("bannerImage"),
  courseRules,
  validate,
  updateCourse,
);
router.delete("/:id", protect, deleteCourse);
router.delete("/:id/files/:fileId", protect, removeFileFromCourse);

module.exports = router;
