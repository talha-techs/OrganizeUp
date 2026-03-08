const { validationResult, body } = require("express-validator");

// Validation result checker middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Validation failed",
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  next();
};

// Auth validation rules
const registerRules = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ max: 50 })
    .withMessage("Name must be under 50 characters"),
  body("email")
    .trim()
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error("Passwords do not match");
    }
    return true;
  }),
];

const loginRules = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

// Book validation rules
const bookRules = [
  body("title").trim().notEmpty().withMessage("Title is required"),
  body("author").trim().notEmpty().withMessage("Author is required"),
  body("type")
    .isIn(["video", "text", "audio"])
    .withMessage("Type must be video, text, or audio"),
];

// Course validation rules
const courseRules = [
  body("title").trim().notEmpty().withMessage("Title is required"),
  body("category").custom((value, { req }) => {
    if (!value && !req.body.newCategory) {
      throw new Error("Category is required");
    }
    return true;
  }),
];

// Tool validation rules
const toolRules = [
  body("title").trim().notEmpty().withMessage("Title is required"),
];

// Category validation rules
const categoryRules = [
  body("name").trim().notEmpty().withMessage("Category name is required"),
];

module.exports = {
  validate,
  registerRules,
  loginRules,
  bookRules,
  courseRules,
  toolRules,
  categoryRules,
};
