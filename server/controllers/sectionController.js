const CustomSection = require("../models/CustomSection");
const SubSection = require("../models/SubSection");

// @desc    Get all custom sections for current user (+ public ones)
// @route   GET /api/sections
const getSections = async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin";

    let filter;
    if (isAdmin) {
      filter = {};
    } else {
      // Non-admin users only see their own sections
      filter = { addedBy: req.user._id };
    }

    const sections = await CustomSection.find(filter)
      .populate("addedBy", "name avatar")
      .sort({ createdAt: -1 });

    res.json({ sections });
  } catch (error) {
    console.error("Get sections error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get a single custom section
// @route   GET /api/sections/:id
const getSection = async (req, res) => {
  try {
    const section = await CustomSection.findById(req.params.id).populate(
      "addedBy",
      "name avatar",
    );

    if (!section) {
      return res.status(404).json({ message: "Section not found" });
    }

    // Authorization check
    const isOwner = section.addedBy._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin && section.visibility !== "public") {
      return res.status(403).json({ message: "Not authorized" });
    }

    res.json({ section });
  } catch (error) {
    console.error("Get section error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Create a custom section
// @route   POST /api/sections
const createSection = async (req, res) => {
  try {
    const { name, description, icon, color } = req.body;

    const section = await CustomSection.create({
      name,
      description: description || "",
      icon: icon || "folder",
      color: color || "indigo",
      addedBy: req.user._id,
      visibility: "private",
    });

    const populated = await CustomSection.findById(section._id).populate(
      "addedBy",
      "name avatar",
    );

    res.status(201).json({ section: populated });
  } catch (error) {
    console.error("Create section error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Import Drive files into a custom section
// @route   POST /api/sections/:id/import
const importToSection = async (req, res) => {
  try {
    const { driveLink, driveFolderId, files, folders } = req.body;

    const section = await CustomSection.findById(req.params.id);
    if (!section) {
      return res.status(404).json({ message: "Section not found" });
    }

    const isOwner = section.addedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Update section with imported data
    if (driveLink) section.driveLink = driveLink;
    if (driveFolderId) section.driveFolderId = driveFolderId;

    // Add files (flat list for easy access)
    if (files && files.length > 0) {
      section.files.push(
        ...files.map((f, i) => ({
          driveFileId: f.driveFileId,
          name: f.name,
          path: f.path || "",
          mimeType: f.mimeType || "",
          fileType: f.fileType || "other",
          size: f.size || null,
          order: section.files.length + i,
        })),
      );
    }

    // Add folder structure
    if (folders && folders.length > 0) {
      section.folders.push(...folders);
    }

    await section.save();

    const populated = await CustomSection.findById(section._id).populate(
      "addedBy",
      "name avatar",
    );

    res.json({
      message: `Imported ${files?.length || 0} files`,
      section: populated,
    });
  } catch (error) {
    console.error("Import to section error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Update a custom section
// @route   PUT /api/sections/:id
const updateSection = async (req, res) => {
  try {
    const section = await CustomSection.findById(req.params.id);
    if (!section) {
      return res.status(404).json({ message: "Section not found" });
    }

    const isOwner = section.addedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { name, description, icon, color, visibility, publishMode } =
      req.body;
    if (name) section.name = name;
    if (description !== undefined) section.description = description;
    if (icon) section.icon = icon;
    if (color) section.color = color;
    // Admin can directly set visibility; owner or admin can set publishMode
    if (isAdmin && visibility && ["public", "private"].includes(visibility)) {
      section.visibility = visibility;
    }
    if (
      (isAdmin || isOwner) &&
      publishMode &&
      ["with_data", "without_data"].includes(publishMode)
    ) {
      section.publishMode = publishMode;
    }

    await section.save();

    const populated = await CustomSection.findById(section._id).populate(
      "addedBy",
      "name avatar",
    );

    res.json({ section: populated });
  } catch (error) {
    console.error("Update section error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Delete a custom section
// @route   DELETE /api/sections/:id
const deleteSection = async (req, res) => {
  try {
    const section = await CustomSection.findById(req.params.id);
    if (!section) {
      return res.status(404).json({ message: "Section not found" });
    }
    if (
      req.user.role !== "admin" &&
      section.addedBy.toString() !== req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this section" });
    }

    await SubSection.deleteMany({ sectionId: section._id });
    await section.deleteOne();
    res.json({ message: "Section deleted" });
  } catch (error) {
    console.error("Delete section error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Remove a file from a section
// @route   DELETE /api/sections/:id/files/:fileId
const removeFile = async (req, res) => {
  try {
    const section = await CustomSection.findById(req.params.id);
    if (!section) {
      return res.status(404).json({ message: "Section not found" });
    }

    const isOwner = section.addedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized" });
    }

    section.files = section.files.filter(
      (f) => f._id.toString() !== req.params.fileId,
    );

    await section.save();
    res.json({ message: "File removed", section });
  } catch (error) {
    console.error("Remove file error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Clone a published section into the current user's library
// @route   POST /api/sections/:id/clone
const cloneSection = async (req, res) => {
  try {
    const original = await CustomSection.findById(req.params.id);
    if (!original) {
      return res.status(404).json({ message: "Section not found" });
    }

    // Only allow cloning public sections
    if (original.visibility !== "public") {
      return res.status(403).json({ message: "Section is not public" });
    }

    // Prevent cloning own section
    if (original.addedBy.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "You already own this section" });
    }

    // Prevent duplicate clones
    const existingClone = await CustomSection.findOne({
      clonedFrom: original._id,
      addedBy: req.user._id,
    });
    if (existingClone) {
      return res
        .status(400)
        .json({ message: "You already cloned this section" });
    }

    // Create the cloned section (always private for the new user)
    const cloned = await CustomSection.create({
      name: original.name,
      description: original.description,
      icon: original.icon,
      color: original.color,
      addedBy: req.user._id,
      visibility: "private",
      clonedFrom: original._id,
    });

    // Clone sub-sections (blocks)
    const originalBlocks = await SubSection.find({
      sectionId: original._id,
    }).sort({ order: 1 });

    const isWithData = original.publishMode === "with_data";

    for (const block of originalBlocks) {
      const clonedBlock = {
        sectionId: cloned._id,
        name: block.name,
        type: block.type,
        order: block.order,
        addedBy: req.user._id,
      };

      if (isWithData) {
        // Copy all data
        clonedBlock.content = block.content;
        clonedBlock.todos = block.todos;
        clonedBlock.boardColumns = block.boardColumns;
        clonedBlock.boardItems = block.boardItems;
        clonedBlock.links = block.links;
        clonedBlock.code = block.code;
        clonedBlock.language = block.language;
        clonedBlock.imageUrl = block.imageUrl;
        clonedBlock.imageCaption = block.imageCaption;
      } else {
        // Template only — copy structure with placeholder/empty data
        clonedBlock.content = "";
        clonedBlock.todos = [];
        clonedBlock.boardColumns = block.boardColumns; // Keep column structure
        clonedBlock.boardItems = [];
        clonedBlock.links = [];
        clonedBlock.code = block.code
          ? `// Template: fill in your ${block.language || "code"} here`
          : "";
        clonedBlock.language = block.language;
        clonedBlock.imageUrl = "";
        clonedBlock.imageCaption = block.imageCaption || "";
      }

      await SubSection.create(clonedBlock);
    }

    const populated = await CustomSection.findById(cloned._id).populate(
      "addedBy",
      "name avatar",
    );

    res.status(201).json({
      message: isWithData
        ? "Section cloned with data"
        : "Section cloned as template",
      section: populated,
    });
  } catch (error) {
    console.error("Clone section error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getSections,
  getSection,
  createSection,
  importToSection,
  updateSection,
  deleteSection,
  removeFile,
  cloneSection,
};
