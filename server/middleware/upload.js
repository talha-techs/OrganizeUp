const multer = require("multer");
const path = require("path");

// Use memory storage for all uploads (GridFS)
const storage = multer.memoryStorage();

const imageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase(),
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Only image files (jpeg, jpg, png, gif, webp, svg) are allowed",
      ),
      false,
    );
  }
};

// Image uploader (for cover images / banners → stored in GridFS)
const upload = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
});

// PDF-only uploader for books (stored in MongoDB GridFS)
const pdfUpload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"), false);
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
});

// Combined uploader for book form (PDF + cover image)
const bookUpload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "pdfFile" && file.mimetype === "application/pdf") {
      cb(null, true);
    } else if (
      file.fieldname === "coverImage" &&
      /jpeg|jpg|png|gif|webp/.test(file.mimetype)
    ) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"), false);
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

module.exports = upload;
module.exports.pdfUpload = pdfUpload;
module.exports.bookUpload = bookUpload;
