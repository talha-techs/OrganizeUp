const Tool = require("../models/Tool");
const UserLibrary = require("../models/UserLibrary");
const { uploadToGridFS, deleteFromGridFS } = require("../config/gridfs");

// @desc    Get tools (user sees own + saved from library; admin sees all)
// @route   GET /api/tools?mine=true
const getTools = async (req, res) => {
  try {
    const filter = {};
    const savedToolIdMap = new Map();

    if (req.query.mine === "true") {
      filter.addedBy = req.user._id;
    } else if (req.user.role === "admin") {
      const saved = await UserLibrary.find({
        user: req.user._id,
        contentType: "tool",
      }).select("contentId _id");
      saved.forEach((s) => savedToolIdMap.set(s.contentId.toString(), s._id));
    } else {
      const saved = await UserLibrary.find({
        user: req.user._id,
        contentType: "tool",
      }).select("contentId _id");
      const savedIds = saved.map((s) => s.contentId);
      saved.forEach((s) => savedToolIdMap.set(s.contentId.toString(), s._id));

      filter.$or = [
        { addedBy: req.user._id },
        { _id: { $in: savedIds } },
      ];
    }

    const tools = await Tool.find(filter)
      .populate("addedBy", "name avatar")
      .sort({ createdAt: -1 });

    const toolsWithSaved = tools.map((t) => {
      const obj = t.toObject();
      const tIdStr = t._id.toString();
      const isOwner = t.addedBy && String(t.addedBy._id || t.addedBy) === String(req.user._id);
      if (savedToolIdMap.has(tIdStr)) {
        obj.isSaved = true;
        obj.libraryEntryId = savedToolIdMap.get(tIdStr);
      } else {
        obj.isSaved = false;
      }
      obj.isOwner = isOwner;
      return obj;
    });

    res.json({ tools: toolsWithSaved });
  } catch (error) {
    console.error("Get tools error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get single tool
// @route   GET /api/tools/:id
const getTool = async (req, res) => {
  try {
    const tool = await Tool.findById(req.params.id).populate(
      "addedBy",
      "name avatar",
    );
    if (!tool) {
      return res.status(404).json({ message: "Tool not found" });
    }

    const isOwner = tool.addedBy && String(tool.addedBy._id || tool.addedBy) === String(req.user._id);
    const savedEntry = await UserLibrary.findOne({
      user: req.user._id,
      contentType: "tool",
      contentId: tool._id,
    });

    if (
      req.user.role !== "admin" &&
      !isOwner &&
      tool.visibility !== "public" &&
      !savedEntry
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const toolObj = tool.toObject();
    toolObj.isSaved = !!savedEntry;
    toolObj.libraryEntryId = savedEntry?._id || null;
    toolObj.isOwner = isOwner;

    res.json({ tool: toolObj });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Create tool (any user)
// @route   POST /api/tools
const createTool = async (req, res) => {
  try {
    const { title, description, link } = req.body;

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

    const tool = await Tool.create({
      title,
      description,
      bannerImage,
      bannerImageId,
      link,
      addedBy: req.user._id,
      visibility,
    });

    res.status(201).json({ message: "Tool created successfully", tool });
  } catch (error) {
    console.error("Create tool error:", error);
    res.status(500).json({ message: "Server error creating tool" });
  }
};

// @desc    Update tool (owner or admin)
// @route   PUT /api/tools/:id
const updateTool = async (req, res) => {
  try {
    const tool = await Tool.findById(req.params.id);
    if (!tool) {
      return res.status(404).json({ message: "Tool not found" });
    }

    if (
      req.user.role !== "admin" &&
      tool.addedBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { title, description, link } = req.body;

    if (req.file) {
      if (tool.bannerImageId) {
        await deleteFromGridFS(tool.bannerImageId, "image");
      }
      const bannerImageId = await uploadToGridFS(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        "image",
      );
      tool.bannerImageId = bannerImageId;
      tool.bannerImage = `/api/images/${bannerImageId}`;
    } else if (req.body.bannerImage !== undefined) {
      tool.bannerImage = req.body.bannerImage;
    }

    if (title) tool.title = title;
    if (description !== undefined) tool.description = description;
    if (link) tool.link = link;

    await tool.save();
    res.json({ message: "Tool updated successfully", tool });
  } catch (error) {
    console.error("Update tool error:", error);
    res.status(500).json({ message: "Server error updating tool" });
  }
};

// @desc    Delete tool (owner or admin)
// @route   DELETE /api/tools/:id
const deleteTool = async (req, res) => {
  try {
    const tool = await Tool.findById(req.params.id);
    if (!tool) {
      return res.status(404).json({ message: "Tool not found" });
    }
    if (
      req.user.role !== "admin" &&
      tool.addedBy.toString() !== req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this tool" });
    }

    if (tool.bannerImageId) {
      await deleteFromGridFS(tool.bannerImageId, "image");
    }

    await tool.deleteOne();
    res.json({ message: "Tool deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error deleting tool" });
  }
};

// @desc    Import Drive files into a tool
// @route   POST /api/tools/:id/import
const importToTool = async (req, res) => {
  try {
    const { driveLink, driveFolderId, files, folders } = req.body;

    const tool = await Tool.findById(req.params.id);
    if (!tool) {
      return res.status(404).json({ message: "Tool not found" });
    }

    const isOwner = tool.addedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (driveLink) {
      if (!tool.link) tool.link = driveLink;
      tool.driveLink = driveLink;
    }
    if (driveFolderId) tool.driveFolderId = driveFolderId;

    if (files && files.length > 0) {
      tool.files.push(
        ...files.map((f, i) => ({
          driveFileId: f.driveFileId,
          name: f.name,
          path: f.path || "",
          mimeType: f.mimeType || "",
          fileType: f.fileType || "other",
          size: f.size || null,
          order: tool.files.length + i,
        })),
      );
    }

    if (folders && folders.length > 0) {
      tool.folders.push(...folders);
    }

    await tool.save();

    const populated = await tool.populate("addedBy", "name avatar");

    res.json({
      message: `Imported ${files?.length || 0} files`,
      tool: populated,
    });
  } catch (error) {
    console.error("Import to tool error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Remove a file from a tool
// @route   DELETE /api/tools/:id/files/:fileId
const removeFileFromTool = async (req, res) => {
  try {
    const tool = await Tool.findById(req.params.id);
    if (!tool) {
      return res.status(404).json({ message: "Tool not found" });
    }

    const isOwner = tool.addedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized" });
    }

    tool.files = tool.files.filter(
      (f) => f._id.toString() !== req.params.fileId,
    );

    await tool.save();

    const populated = await tool.populate("addedBy", "name avatar");

    res.json({ message: "File removed", tool: populated });
  } catch (error) {
    console.error("Remove file from tool error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getTools,
  getTool,
  createTool,
  updateTool,
  deleteTool,
  importToTool,
  removeFileFromTool,
};
