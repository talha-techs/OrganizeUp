const express = require("express");
const router = express.Router();
const {
  getSections,
  getSection,
  createSection,
  importToSection,
  updateSection,
  deleteSection,
  removeFile,
  cloneSection,
} = require("../controllers/sectionController");
const {
  getSubSections,
  createSubSection,
  updateSubSection,
  deleteSubSection,
  addTodoItem,
  updateTodoItem,
  deleteTodoItem,
  addBoardItem,
  updateBoardItem,
  deleteBoardItem,
  addLink,
  removeLink,
} = require("../controllers/subSectionController");
const { protect } = require("../middleware/auth");

// ── Section ──────────────────────────────────────────────────────────────────
router.get("/", protect, getSections);
router.get("/:id", protect, getSection);
router.post("/", protect, createSection);
router.post("/:id/import", protect, importToSection);
router.post("/:id/clone", protect, cloneSection);
router.put("/:id", protect, updateSection);
router.delete("/:id", protect, deleteSection);
router.delete("/:id/files/:fileId", protect, removeFile);

// ── Sub-sections ─────────────────────────────────────────────────────────────
router.get("/:id/subsections", protect, getSubSections);
router.post("/:id/subsections", protect, createSubSection);
router.put("/:id/subsections/:subId", protect, updateSubSection);
router.delete("/:id/subsections/:subId", protect, deleteSubSection);

// To-Do items
router.post("/:id/subsections/:subId/todos", protect, addTodoItem);
router.patch("/:id/subsections/:subId/todos/:todoId", protect, updateTodoItem);
router.delete("/:id/subsections/:subId/todos/:todoId", protect, deleteTodoItem);

// Board items
router.post("/:id/subsections/:subId/board", protect, addBoardItem);
router.patch("/:id/subsections/:subId/board/:itemId", protect, updateBoardItem);
router.delete(
  "/:id/subsections/:subId/board/:itemId",
  protect,
  deleteBoardItem,
);

// Links
router.post("/:id/subsections/:subId/links", protect, addLink);
router.delete("/:id/subsections/:subId/links/:linkId", protect, removeLink);

module.exports = router;
