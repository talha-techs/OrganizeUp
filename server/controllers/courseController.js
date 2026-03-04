const Course = require("../models/Course");
const Category = require("../models/Category");
const { uploadToGridFS, deleteFromGridFS } = require("../config/gridfs");

// @desc    Get courses (user sees own + public; admin sees all)
// @route   GET /api/courses?category=categoryId
const getCourses = async (req, res) => {
  try {
    const filter = {};
    if (req.query.category) {
      filter.category = req.query.category;
    }

    if (req.user.role !== "admin") {
      // Non-admin users only see their own courses
      filter.addedBy = req.user._id;
    }
    // Admin with no filter sees all courses

    const courses = await Course.find(filter)
      .populate("category", "name")
      .populate("addedBy", "name email avatar")
      .sort({ createdAt: -1 });

    res.json({ courses });
  } catch (error) {
    console.error("Get courses error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get single course
// @route   GET /api/courses/:id
const getCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate("category", "name")
      .populate("addedBy", "name email avatar");

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (
      req.user.role !== "admin" &&
      course.addedBy._id.toString() !== req.user._id.toString() &&
      course.visibility !== "public"
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    res.json({ course });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Create course (any user)
// @route   POST /api/courses
const createCourse = async (req, res) => {
  try {
    const { title, description, driveLink, category, newCategory } = req.body;

    let categoryId = category;

    // If new category name is provided, create it
    if (newCategory && newCategory.trim()) {
      let existingCategory = await Category.findOne({
        name: { $regex: new RegExp(`^${newCategory.trim()}$`, "i") },
      });

      if (!existingCategory) {
        existingCategory = await Category.create({
          name: newCategory.trim(),
          createdBy: req.user._id,
        });
      }
      categoryId = existingCategory._id;
    }

    if (!categoryId) {
      return res.status(400).json({ message: "Category is required" });
    }

    let bannerImage = "";
    let bannerImageId = null;
    if (req.file) {
      bannerImageId = await uploadToGridFS(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        "image",
      );
      bannerImage = `/api/images/${bannerImageId}`;
    } else if (req.body.bannerImage) {
      bannerImage = req.body.bannerImage;
    }

    const visibility = req.user.role === "admin" ? "public" : "private";

    const course = await Course.create({
      title,
      description,
      bannerImage,
      bannerImageId,
      driveLink,
      category: categoryId,
      addedBy: req.user._id,
      visibility,
    });

    const populated = await course.populate([
      { path: "category", select: "name" },
      { path: "addedBy", select: "name email avatar" },
    ]);

    res
      .status(201)
      .json({ message: "Course created successfully", course: populated });
  } catch (error) {
    console.error("Create course error:", error);
    res.status(500).json({ message: "Server error creating course" });
  }
};

// @desc    Update course (owner or admin)
// @route   PUT /api/courses/:id
const updateCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (
      req.user.role !== "admin" &&
      course.addedBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { title, description, driveLink, category, newCategory } = req.body;

    if (newCategory && newCategory.trim()) {
      let existingCategory = await Category.findOne({
        name: { $regex: new RegExp(`^${newCategory.trim()}$`, "i") },
      });
      if (!existingCategory) {
        existingCategory = await Category.create({
          name: newCategory.trim(),
          createdBy: req.user._id,
        });
      }
      course.category = existingCategory._id;
    } else if (category) {
      course.category = category;
    }

    if (req.file) {
      // Delete old image from GridFS
      if (course.bannerImageId) {
        await deleteFromGridFS(course.bannerImageId, "image");
      }
      const bannerImageId = await uploadToGridFS(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        "image",
      );
      course.bannerImageId = bannerImageId;
      course.bannerImage = `/api/images/${bannerImageId}`;
    } else if (req.body.bannerImage !== undefined) {
      course.bannerImage = req.body.bannerImage;
    }

    if (title) course.title = title;
    if (description !== undefined) course.description = description;
    if (driveLink) course.driveLink = driveLink;

    await course.save();

    const populated = await course.populate([
      { path: "category", select: "name" },
      { path: "addedBy", select: "name email avatar" },
    ]);

    res.json({ message: "Course updated successfully", course: populated });
  } catch (error) {
    console.error("Update course error:", error);
    res.status(500).json({ message: "Server error updating course" });
  }
};

// @desc    Delete course (owner or admin)
// @route   DELETE /api/courses/:id
const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    if (
      req.user.role !== "admin" &&
      course.addedBy.toString() !== req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this course" });
    }

    if (course.bannerImageId) {
      await deleteFromGridFS(course.bannerImageId, "image");
    }

    await course.deleteOne();
    res.json({ message: "Course deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error deleting course" });
  }
};

// @desc    Import Drive files into a course
// @route   POST /api/courses/:id/import
const importToCourse = async (req, res) => {
  try {
    const { driveLink, driveFolderId, files, folders } = req.body;

    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const isOwner = course.addedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (driveLink) course.driveLink = driveLink;
    if (driveFolderId) course.driveFolderId = driveFolderId;

    if (files && files.length > 0) {
      course.files.push(
        ...files.map((f, i) => ({
          driveFileId: f.driveFileId,
          name: f.name,
          path: f.path || "",
          mimeType: f.mimeType || "",
          fileType: f.fileType || "other",
          size: f.size || null,
          order: course.files.length + i,
        })),
      );
    }

    if (folders && folders.length > 0) {
      course.folders.push(...folders);
    }

    await course.save();

    const populated = await course.populate([
      { path: "category", select: "name" },
      { path: "addedBy", select: "name email avatar" },
    ]);

    res.json({
      message: `Imported ${files?.length || 0} files`,
      course: populated,
    });
  } catch (error) {
    console.error("Import to course error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Remove a file from a course
// @route   DELETE /api/courses/:id/files/:fileId
const removeFileFromCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const isOwner = course.addedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized" });
    }

    course.files = course.files.filter(
      (f) => f._id.toString() !== req.params.fileId,
    );

    await course.save();

    const populated = await course.populate([
      { path: "category", select: "name" },
      { path: "addedBy", select: "name email avatar" },
    ]);

    res.json({ message: "File removed", course: populated });
  } catch (error) {
    console.error("Remove file from course error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// === Category Controllers ===

// @desc    Get all categories
// @route   GET /api/categories
const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Create category (Admin only)
// @route   POST /api/categories
const createCategory = async (req, res) => {
  try {
    const { name, description, icon } = req.body;

    const existing = await Category.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
    });

    if (existing) {
      return res.status(400).json({ message: "Category already exists" });
    }

    const category = await Category.create({
      name: name.trim(),
      description,
      icon,
      createdBy: req.user._id,
    });

    res.status(201).json({ message: "Category created", category });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Delete category (Admin only)
// @route   DELETE /api/categories/:id
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Check if courses exist in this category
    const courseCount = await Course.countDocuments({
      category: req.params.id,
    });
    if (courseCount > 0) {
      return res.status(400).json({
        message: `Cannot delete category with ${courseCount} course(s). Remove courses first.`,
      });
    }

    await category.deleteOne();
    res.json({ message: "Category deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
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
};
