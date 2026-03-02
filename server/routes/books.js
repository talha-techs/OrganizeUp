const express = require("express");
const router = express.Router();
const {
  getBooks,
  getBook,
  createBook,
  updateBook,
  deleteBook,
  removeVideoFromBook,
  servePdf,
  serveImage,
  updateVideoProgress,
  updateReadingProgress,
  getBookProgress,
} = require("../controllers/bookController");
const {
  scanDriveFolder,
  importDriveBook,
} = require("../controllers/driveController");
const { protect } = require("../middleware/auth");
const { validate, bookRules } = require("../middleware/validators");
const { bookUpload } = require("../middleware/upload");

// Public routes (still need auth)
router.get("/", protect, getBooks);

// PDF serve route (must be BEFORE /:id to avoid conflict)
router.get("/pdf/:fileId", servePdf);

router.get("/:id", protect, getBook);

// Progress routes (authenticated users)
router.get("/:id/progress", protect, getBookProgress);
router.put("/:id/video-progress", protect, updateVideoProgress);
router.put("/:id/reading-progress", protect, updateReadingProgress);

// Drive import routes (any authenticated user)
router.post("/scan-drive", protect, scanDriveFolder);
router.post("/import-drive", protect, importDriveBook);

// Any authenticated user can create books (visibility is set based on role)
router.post(
  "/",
  protect,
  bookUpload.fields([
    { name: "pdfFile", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  bookRules,
  validate,
  createBook,
);

// Owner or admin can update/delete
router.put(
  "/:id",
  protect,
  bookUpload.fields([
    { name: "pdfFile", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  updateBook,
);
router.delete("/:id", protect, deleteBook);
router.delete("/:id/videos/:videoId", protect, removeVideoFromBook);

module.exports = router;
