const express = require("express");
const router = express.Router();
const {
  getTools,
  getTool,
  createTool,
  updateTool,
  deleteTool,
  importToTool,
  removeFileFromTool,
} = require("../controllers/toolController");
const { protect } = require("../middleware/auth");
const { validate, toolRules } = require("../middleware/validators");
const upload = require("../middleware/upload");

router.get("/", protect, getTools);
router.get("/:id", protect, getTool);
router.post(
  "/",
  protect,
  upload.single("bannerImage"),
  toolRules,
  validate,
  createTool,
);
router.post("/:id/import", protect, importToTool);
router.put("/:id", protect, upload.single("bannerImage"), updateTool);
router.delete("/:id", protect, deleteTool);
router.delete("/:id/files/:fileId", protect, removeFileFromTool);

module.exports = router;
