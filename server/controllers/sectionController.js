const CustomSection = require("../models/CustomSection");

// @desc    Get all custom sections for current user (+ public ones)
// @route   GET /api/sections
const getSections = async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin";

    let filter;
    if (req.query.mine === "true") {
      // Profile / My Uploads: return only the requesting user's own items (all visibilities)
      filter = { addedBy: req.user._id };
    } else if (isAdmin) {
      filter = {};
    } else {
      filter = {
        $or: [{ addedBy: req.user._id }, { visibility: "public" }],
      };
    }

    const sections = await CustomSection.find(filter)
      .populate("addedBy", "name email avatar")
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
      "name email avatar",
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

    const visibility = req.user.role === "admin" ? "public" : "private";

    const section = await CustomSection.create({
      name,
      description: description || "",
      icon: icon || "folder",
      color: color || "indigo",
      addedBy: req.user._id,
      visibility,
    });

    const populated = await CustomSection.findById(section._id).populate(
      "addedBy",
      "name email avatar",
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
      "name email avatar",
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

    const { name, description, icon, color } = req.body;
    if (name) section.name = name;
    if (description !== undefined) section.description = description;
    if (icon) section.icon = icon;
    if (color) section.color = color;

    await section.save();

    const populated = await CustomSection.findById(section._id).populate(
      "addedBy",
      "name email avatar",
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

module.exports = {
  getSections,
  getSection,
  createSection,
  importToSection,
  updateSection,
  deleteSection,
  removeFile,
};
