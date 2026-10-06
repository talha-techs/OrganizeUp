const Course = require("../models/Course");
const Category = require("../models/Category");
const User = require("../models/User");
const UserLibrary = require("../models/UserLibrary");
const { uploadFile, deleteFile } = require("../services/storageService");
const { fetchPexelsBanner } = require("../services/pexelsService");

// Escape special regex chars to prevent ReDoS / injection
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// @desc    Get courses (user sees own + saved from library; admin sees all)
// @route   GET /api/courses?category=categoryId&mine=true
const getCourses = async (req, res) => {
  try {
    const filter = {};
    if (req.query.category) {
      filter.category = req.query.category;
    }

    const savedCourseIdMap = new Map();

    if (req.query.mine === "true") {
      filter.addedBy = req.user._id;
    } else if (req.user.role === "admin") {
      const saved = await UserLibrary.find({
        user: req.user._id,
        contentType: "course",
      }).select("contentId _id");
      saved.forEach((s) => savedCourseIdMap.set(s.contentId.toString(), s._id));
    } else {
      const saved = await UserLibrary.find({
        user: req.user._id,
        contentType: "course",
      }).select("contentId _id");
      const savedIds = saved.map((s) => s.contentId);
      saved.forEach((s) => savedCourseIdMap.set(s.contentId.toString(), s._id));

      filter.$or = [
        { addedBy: req.user._id },
        { _id: { $in: savedIds } },
      ];
    }

    const courses = await Course.find(filter)
      .populate("category", "name")
      .populate("addedBy", "name avatar")
      .sort({ createdAt: -1 });

    const coursesWithSaved = courses.map((c) => {
      const obj = c.toObject();
      const cIdStr = c._id.toString();
      const isOwner = c.addedBy && String(c.addedBy._id || c.addedBy) === String(req.user._id);
      if (savedCourseIdMap.has(cIdStr)) {
        obj.isSaved = true;
        obj.libraryEntryId = savedCourseIdMap.get(cIdStr);
      } else {
        obj.isSaved = false;
      }
      obj.isOwner = isOwner;
      return obj;
    });

    res.json({ courses: coursesWithSaved });
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
      .populate("addedBy", "name avatar");

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const isOwner = course.addedBy && String(course.addedBy._id || course.addedBy) === String(req.user._id);
    const savedEntry = await UserLibrary.findOne({
      user: req.user._id,
      contentType: "course",
      contentId: course._id,
    });

    if (
      req.user.role !== "admin" &&
      !isOwner &&
      course.visibility !== "public" &&
      !savedEntry
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const courseObj = course.toObject();
    courseObj.isSaved = !!savedEntry;
    courseObj.libraryEntryId = savedEntry?._id || null;
    courseObj.isOwner = isOwner;

    res.json({ course: courseObj });
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

    // If new category name is provided, find or create it
    if (newCategory && newCategory.trim()) {
      const trimmedName = newCategory.trim();
      const isAdmin = req.user && req.user.role === "admin";

      // 1. Check if matching global category exists
      let existingCategory = await Category.findOne({
        name: {
          $regex: new RegExp(`^${escapeRegex(trimmedName)}$`, "i"),
        },
        isGlobal: true,
      });

      // 2. If not, check if user already has this category in their personal space
      if (!existingCategory && req.user) {
        existingCategory = await Category.findOne({
          name: {
            $regex: new RegExp(`^${escapeRegex(trimmedName)}$`, "i"),
          },
          createdBy: req.user._id,
        });
      }

      // 3. If still not found, create a new category (global if admin, personal if user)
      if (!existingCategory) {
        let pexelsQuery = trimmedName;
        if (pexelsQuery.toLowerCase() === "ai") pexelsQuery = "Artificial Intelligence";
        const pexelsUrl = await fetchPexelsBanner(pexelsQuery);
        existingCategory = await Category.create({
          name: trimmedName,
          createdBy: req.user._id,
          isGlobal: isAdmin,
          image: pexelsUrl || "",
          bannerImage: pexelsUrl || "",
        });
      }
      categoryId = existingCategory._id;
    }

    if (!categoryId) {
      return res.status(400).json({ message: "Category is required" });
    }

    let bannerImage = "";
    let bannerImageId = null;
    let bannerR2Key = null;
    let storageProvider = "gridfs";

    if (req.file) {
      const uploaded = await uploadFile({
        buffer: req.file.buffer,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        folder: "courses",
        isPublic: true,
        bucketType: "image",
      });
      bannerImage = uploaded.url;
      bannerImageId = uploaded.fileId;
      bannerR2Key = uploaded.key;
      storageProvider = uploaded.provider;
    } else if (req.body.bannerImage) {
      bannerImage = req.body.bannerImage;
      storageProvider = "external";
    }

    if (!bannerImage) {
      bannerImage = (await fetchPexelsBanner(title.trim())) || "";
      if (bannerImage) storageProvider = "external";
    }

    const visibility = req.user.role === "admin" ? "public" : "private";

    const course = await Course.create({
      title,
      description,
      bannerImage,
      bannerImageId,
      bannerR2Key,
      storageProvider,
      driveLink,
      category: categoryId,
      addedBy: req.user._id,
      visibility,
    });

    const populated = await course.populate([
      { path: "category", select: "name" },
      { path: "addedBy", select: "name avatar" },
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
      const trimmedName = newCategory.trim();
      const isAdmin = req.user && req.user.role === "admin";

      // 1. Check if matching global category exists
      let existingCategory = await Category.findOne({
        name: {
          $regex: new RegExp(`^${escapeRegex(trimmedName)}$`, "i"),
        },
        isGlobal: true,
      });

      // 2. If not, check if user already has this category in their personal space
      if (!existingCategory && req.user) {
        existingCategory = await Category.findOne({
          name: {
            $regex: new RegExp(`^${escapeRegex(trimmedName)}$`, "i"),
          },
          createdBy: req.user._id,
        });
      }

      // 3. If still not found, create a new category (global if admin, personal if user)
      if (!existingCategory) {
        let pexelsQuery = trimmedName;
        if (pexelsQuery.toLowerCase() === "ai") pexelsQuery = "Artificial Intelligence";
        const pexelsUrl = await fetchPexelsBanner(pexelsQuery);
        existingCategory = await Category.create({
          name: trimmedName,
          createdBy: req.user._id,
          isGlobal: isAdmin,
          image: pexelsUrl || "",
          bannerImage: pexelsUrl || "",
        });
      }
      course.category = existingCategory._id;
    } else if (category) {
      course.category = category;
    }

    if (req.file) {
      // Delete old image from R2 or GridFS
      if (course.bannerR2Key || course.bannerImageId) {
        await deleteFile({
          provider: course.storageProvider,
          key: course.bannerR2Key,
          fileId: course.bannerImageId,
          isPublic: true,
          bucketType: "image",
        });
      }
      const uploaded = await uploadFile({
        buffer: req.file.buffer,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        folder: "courses",
        isPublic: true,
        bucketType: "image",
      });
      course.bannerImageId = uploaded.fileId;
      course.bannerR2Key = uploaded.key;
      course.storageProvider = uploaded.provider;
      course.bannerImage = uploaded.url;
    } else if (req.body.bannerImage !== undefined) {
      if (course.bannerR2Key || course.bannerImageId) {
        await deleteFile({
          provider: course.storageProvider,
          key: course.bannerR2Key,
          fileId: course.bannerImageId,
          isPublic: true,
          bucketType: "image",
        });
        course.bannerImageId = null;
        course.bannerR2Key = null;
      }
      course.bannerImage = req.body.bannerImage;
      course.storageProvider = "external";
    }

    if (title) course.title = title;
    if (description !== undefined) course.description = description;
    if (driveLink) course.driveLink = driveLink;

    await course.save();

    const populated = await course.populate([
      { path: "category", select: "name" },
      { path: "addedBy", select: "name avatar" },
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

    if (course.bannerR2Key || course.bannerImageId) {
      await deleteFile({
        provider: course.storageProvider,
        key: course.bannerR2Key,
        fileId: course.bannerImageId,
        isPublic: true,
        bucketType: "image",
      });
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
      { path: "addedBy", select: "name avatar" },
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
      { path: "addedBy", select: "name avatar" },
    ]);

    res.json({ message: "File removed", course: populated });
  } catch (error) {
    console.error("Remove file from course error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// === Category Controllers ===

// @desc    Get categories (Global categories + current user's personal categories)
// @route   GET /api/courses/categories
const getCategories = async (req, res) => {
  try {
    let filter = {};
    if (req.user) {
      if (req.user.role === "admin") {
        // Admins can see all categories
        filter = {};
      } else {
        // Regular users only see global categories and their own personal categories
        filter = {
          $or: [
            { isGlobal: true },
            { createdBy: req.user._id },
          ],
        };
      }
    } else {
      filter = { isGlobal: true };
    }

    const categories = await Category.find(filter)
      .populate("createdBy", "name email")
      .sort({ isGlobal: -1, name: 1 });

    // Asynchronously backfill any categories missing images
    categories.forEach((cat) => {
      if (!cat.image && !cat.bannerImage) {
        let pexelsQuery = cat.name;
        if (pexelsQuery.toLowerCase() === "ai") pexelsQuery = "Artificial Intelligence";
        fetchPexelsBanner(pexelsQuery)
          .then(async (url) => {
            if (url) {
              cat.image = url;
              cat.bannerImage = url;
              await cat.save().catch(() => {});
            }
          })
          .catch(() => {});
      }
    });
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Create category (Admin creates global, User creates personal)
// @route   POST /api/courses/categories
const createCategory = async (req, res) => {
  try {
    let { name, description, icon, image, bannerImage } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const trimmedName = name.trim();
    const isAdmin = req.user && req.user.role === "admin";
    const isGlobal = isAdmin ? true : false;

    // Check if category already exists in user's visible scope
    const existing = await Category.findOne({
      name: { $regex: new RegExp(`^${escapeRegex(trimmedName)}$`, "i") },
      ...(isAdmin
        ? { isGlobal: true }
        : {
            $or: [{ isGlobal: true }, { createdBy: req.user._id }],
          }),
    });

    if (existing) {
      return res.status(400).json({
        message: existing.isGlobal
          ? `Global category "${existing.name}" already exists`
          : `You already have a personal category named "${existing.name}"`,
      });
    }

    let pexelsQuery = trimmedName;
    if (pexelsQuery.toLowerCase() === "ai") pexelsQuery = "Artificial Intelligence";
    let finalImage = image || bannerImage || "";
    if (!finalImage) {
      finalImage = (await fetchPexelsBanner(pexelsQuery)) || "";
    }

    const category = await Category.create({
      name: trimmedName,
      description: description || "",
      icon: icon || "",
      image: finalImage,
      bannerImage: finalImage,
      createdBy: req.user._id,
      isGlobal,
    });

    res.status(201).json({
      message: isGlobal ? "Global category created" : "Personal category created",
      category,
    });
  } catch (error) {
    console.error("Create category error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Delete category (Admin or Category Owner for personal category)
// @route   DELETE /api/courses/categories/:id
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const isAdmin = req.user.role === "admin";
    const isOwner =
      category.createdBy &&
      category.createdBy.toString() === req.user._id.toString();

    // Regular users can only delete their own personal categories
    if (!isAdmin && (!isOwner || category.isGlobal)) {
      return res.status(403).json({
        message: "You can only delete your own personal categories",
      });
    }

    // Check if courses exist in this category
    const courseFilter = isAdmin
      ? { category: req.params.id }
      : { category: req.params.id, addedBy: req.user._id };

    const courseCount = await Course.countDocuments(courseFilter);
    if (courseCount > 0) {
      return res.status(400).json({
        message: `Cannot delete category with ${courseCount} course(s). Remove or reassign courses first.`,
      });
    }

    await category.deleteOne();
    res.json({ message: "Category deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Helper to count all files in course
const countCourseFiles = (course) => {
  let count = course.files?.length || 0;
  const countFolderFiles = (folders) => {
    for (const folder of folders || []) {
      count += folder.files?.length || 0;
      if (folder.subfolders?.length) countFolderFiles(folder.subfolders);
    }
  };
  countFolderFiles(course.folders);
  return count;
};

// @desc    Get user progress for a course
// @route   GET /api/courses/:id/progress
const getCourseProgress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const courseId = req.params.id;

    const progress = (user.courseProgress || []).find(
      (cp) => cp.courseId && cp.courseId.toString() === courseId,
    );

    const videoProgress = (user.videoProgress || []).filter(
      (vp) => vp.courseId && vp.courseId.toString() === courseId,
    );

    res.json({
      courseProgress: progress || {
        courseId,
        completedFiles: [],
        progress: 0,
        completed: false,
      },
      videoProgress,
    });
  } catch (error) {
    console.error("Get course progress error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Update progress for a file/video in a course
// @route   PUT /api/courses/:id/progress
const updateCourseProgress = async (req, res) => {
  try {
    const { fileId, completed, isVideo, title, note } = req.body;
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const user = await User.findById(req.user._id);
    if (!user.courseProgress) user.courseProgress = [];

    let cProg = user.courseProgress.find(
      (cp) => cp.courseId && cp.courseId.toString() === course._id.toString(),
    );

    if (!cProg) {
      cProg = {
        courseId: course._id,
        completedFiles: [],
        progress: 0,
        completed: false,
        lastAccessed: new Date(),
      };
      user.courseProgress.push(cProg);
      cProg = user.courseProgress[user.courseProgress.length - 1];
    }

    const isMarkedCompleted = completed !== false;

    if (isMarkedCompleted) {
      if (!cProg.completedFiles.includes(fileId)) {
        cProg.completedFiles.push(fileId);
      }
    } else {
      cProg.completedFiles = cProg.completedFiles.filter((id) => id !== fileId);
    }

    const totalFiles = countCourseFiles(course);
    cProg.progress = totalFiles > 0 ? Math.round((cProg.completedFiles.length / totalFiles) * 100) : 0;
    cProg.completed = totalFiles > 0 && cProg.completedFiles.length >= totalFiles;
    cProg.lastAccessed = new Date();

    // If it's a video file, also sync with universal videoProgress
    if (isVideo) {
      if (!user.videoProgress) user.videoProgress = [];
      let vProg = user.videoProgress.find(
        (vp) => vp.contentType === "course" && vp.videoId === fileId,
      );

      if (vProg) {
        vProg.completed = isMarkedCompleted;
        vProg.progress = isMarkedCompleted ? 100 : 0;
        if (title) vProg.title = title;
        if (note !== undefined) vProg.note = note;
        vProg.lastWatched = new Date();
      } else {
        user.videoProgress.push({
          courseId: course._id,
          contentType: "course",
          videoId: fileId,
          title: title || "Course Video",
          progress: isMarkedCompleted ? 100 : 0,
          completed: isMarkedCompleted,
          note: note || "",
          lastWatched: new Date(),
        });
      }
    }

    await user.save();

    res.json({
      message: "Course progress updated",
      courseProgress: cProg,
      videoProgress: user.videoProgress,
    });
  } catch (error) {
    console.error("Update course progress error:", error);
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
  getCourseProgress,
  updateCourseProgress,
};
