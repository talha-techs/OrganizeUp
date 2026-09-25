const SubSection = require("../models/SubSection");
const { checkSectionAccess } = require("../middleware/sectionAuth");
const { broadcastToSection, broadcastActivity } = require("../socket");
const { fetchUrlMetadata, detectPlatformAndEmbed } = require("./captureController");

// Extract client socket ID to exclude sender from receiving duplicate broadcast echoes
const getSocketId = (req) => req.headers["x-socket-id"] || null;

// Helper: verify the parent section exists and resolve caller permissions
const checkAccess = async (req) => {
  const result = await checkSectionAccess(req.params.id, req.user);
  if (result.error) return { error: result.error, status: result.status };
  return {
    section: result.section,
    role: result.role,
    permissions: result.permissions,
    isOwner: result.role === "owner",
    isAdmin: req.user.role === "admin",
    canManage: result.permissions.canManage,
    canEdit: result.permissions.canEdit,
    canView: result.permissions.canView,
  };
};

// ─── Sub-section CRUD ────────────────────────────────────────────────────────

// @route   GET /api/sections/:id/subsections
const getSubSections = async (req, res) => {
  try {
    const { error, status, canView } = await checkAccess(req);
    if (error) return res.status(status).json({ message: error });
    if (!canView) return res.status(403).json({ message: "Not authorized" });

    const subSections = await SubSection.find({
      sectionId: req.params.id,
    })
      .populate("lastEditedBy", "name avatar")
      .populate("addedBy", "name avatar")
      .sort({ order: 1, createdAt: 1 });

    res.json({ subSections });
  } catch (err) {
    console.error("getSubSections:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// @route   POST /api/sections/:id/subsections
const createSubSection = async (req, res) => {
  try {
    const { error, status, canEdit } = await checkAccess(req);
    if (error) return res.status(status).json({ message: error });
    if (!canEdit) return res.status(403).json({ message: "Not authorized to create blocks" });

    const {
      name,
      type,
      content,
      code,
      language,
      boardColumns,
      imageUrl,
      imageCaption,
      todos,
      links,
      afterSubId,
    } = req.body;

    const count = await SubSection.countDocuments({ sectionId: req.params.id });
    let targetOrder = count;

    if (afterSubId) {
      const targetSub = await SubSection.findById(afterSubId);
      if (targetSub) {
        targetOrder = targetSub.order + 1;
        // Shift any subsequent blocks by 1
        await SubSection.updateMany(
          { sectionId: req.params.id, order: { $gte: targetOrder } },
          { $inc: { order: 1 } },
        );
      }
    }

    const defaultColumns = [
      { id: "todo", name: "To Do", color: "slate" },
      { id: "inprogress", name: "In Progress", color: "amber" },
      { id: "done", name: "Done", color: "emerald" },
    ];

    const subSection = await SubSection.create({
      sectionId: req.params.id,
      name,
      type,
      order: targetOrder,
      addedBy: req.user._id,
      lastEditedBy: req.user._id,
      version: 1,
      content: content || "",
      code: code || "",
      language: language || "javascript",
      boardColumns: type === "board" ? boardColumns || defaultColumns : [],
      imageUrl: imageUrl || "",
      imageCaption: imageCaption || "",
      todos: Array.isArray(todos) ? todos : [],
      links: Array.isArray(links) ? links : [],
    });

    const populated = await SubSection.findById(subSection._id)
      .populate("lastEditedBy", "name avatar")
      .populate("addedBy", "name avatar");

    const senderSocketId = getSocketId(req);
    broadcastToSection(req.params.id, "subsection_created", { subSection: populated }, senderSocketId);
    broadcastActivity(req.params.id, {
      user: { name: req.user.name, avatar: req.user.avatar },
      action: "created_block",
      blockName: populated.name,
      blockType: populated.type,
    });

    res.status(201).json({ subSection: populated });
  } catch (err) {
    console.error("createSubSection:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// @route   PUT /api/sections/:id/subsections/:subId
const updateSubSection = async (req, res) => {
  try {
    const { error, status, canEdit } = await checkAccess(req);
    if (error) return res.status(status).json({ message: error });
    if (!canEdit) return res.status(403).json({ message: "Not authorized to edit blocks" });

    const sub = await SubSection.findOne({
      _id: req.params.subId,
      sectionId: req.params.id,
    });
    if (!sub) return res.status(404).json({ message: "Sub-section not found" });

    // ── Optimistic Concurrency Control (OCC) ──
    const incomingVersion = req.body.version !== undefined ? Number(req.body.version) : null;
    const currentVersion = sub.version !== undefined ? Number(sub.version) : 1;

    // Check if the current user is the one who made the previous edit
    const isSameEditor = sub.lastEditedBy && String(sub.lastEditedBy) === String(req.user._id);

    // Also check if content is unchanged
    const isContentUnchanged =
      (req.body.content !== undefined && req.body.content === sub.content) ||
      (req.body.code !== undefined && req.body.code === sub.code);

    // Conflict ONLY occurs if another collaborator touched the block and changed it
    if (
      incomingVersion !== null &&
      incomingVersion !== currentVersion &&
      !isSameEditor &&
      !isContentUnchanged
    ) {
      const currentPopulated = await SubSection.findById(sub._id)
        .populate("lastEditedBy", "name avatar")
        .populate("addedBy", "name avatar");

      return res.status(409).json({
        message: "Conflict: This block was modified by another collaborator",
        currentBlock: currentPopulated,
      });
    }

    const {
      name,
      content,
      code,
      language,
      boardColumns,
      imageUrl,
      imageCaption,
    } = req.body;
    if (name !== undefined) sub.name = name;
    if (content !== undefined) sub.content = content;
    if (code !== undefined) sub.code = code;
    if (language !== undefined) sub.language = language;
    if (boardColumns !== undefined) sub.boardColumns = boardColumns;
    if (imageUrl !== undefined) sub.imageUrl = imageUrl;
    if (imageCaption !== undefined) sub.imageCaption = imageCaption;

    sub.version = (sub.version || 1) + 1;
    sub.lastEditedBy = req.user._id;

    await sub.save();

    const populated = await SubSection.findById(sub._id)
      .populate("lastEditedBy", "name avatar")
      .populate("addedBy", "name avatar");

    const senderSocketId = getSocketId(req);
    broadcastToSection(req.params.id, "subsection_updated", { subSection: populated }, senderSocketId);
    broadcastActivity(req.params.id, {
      user: { name: req.user.name, avatar: req.user.avatar },
      action: "updated_block",
      blockName: populated.name,
      blockType: populated.type,
    });

    res.json({ subSection: populated });
  } catch (err) {
    console.error("updateSubSection:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// @route   DELETE /api/sections/:id/subsections/:subId
const deleteSubSection = async (req, res) => {
  try {
    const { error, status, canEdit } = await checkAccess(req);
    if (error) return res.status(status).json({ message: error });
    if (!canEdit) return res.status(403).json({ message: "Not authorized to delete blocks" });

    const deleted = await SubSection.findOneAndDelete({
      _id: req.params.subId,
      sectionId: req.params.id,
    });
    const senderSocketId = getSocketId(req);
    broadcastToSection(req.params.id, "subsection_deleted", { subId: req.params.subId }, senderSocketId);
    broadcastActivity(req.params.id, {
      user: { name: req.user.name, avatar: req.user.avatar },
      action: "deleted_block",
      blockName: deleted?.name || "Block",
    });
    res.json({ message: "Deleted", subId: req.params.subId });
  } catch (err) {
    console.error("deleteSubSection:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── To-Do items ─────────────────────────────────────────────────────────────

// @route   POST /api/sections/:id/subsections/:subId/todos
const addTodoItem = async (req, res) => {
  try {
    const { error, status, canEdit } = await checkAccess(req);
    if (error) return res.status(status).json({ message: error });
    if (!canEdit) return res.status(403).json({ message: "Not authorized to add todo items" });

    const sub = await SubSection.findOne({
      _id: req.params.subId,
      sectionId: req.params.id,
    });
    if (!sub) return res.status(404).json({ message: "Sub-section not found" });

    const { text, priority, dueDate } = req.body;
    sub.todos.push({
      text,
      priority: priority || "medium",
      dueDate: dueDate || null,
      order: sub.todos.length,
    });

    sub.version = (sub.version || 1) + 1;
    sub.lastEditedBy = req.user._id;

    await sub.save();

    const populated = await SubSection.findById(sub._id)
      .populate("lastEditedBy", "name avatar")
      .populate("addedBy", "name avatar");

    const senderSocketId = getSocketId(req);
    broadcastToSection(req.params.id, "subsection_updated", { subSection: populated }, senderSocketId);
    broadcastActivity(req.params.id, {
      user: { name: req.user.name, avatar: req.user.avatar },
      action: "added_todo",
      blockName: populated.name,
      detail: text,
    });

    res.json({ subSection: populated });
  } catch (err) {
    console.error("addTodoItem:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// @route   PATCH /api/sections/:id/subsections/:subId/todos/:todoId
const updateTodoItem = async (req, res) => {
  try {
    const { error, status, canEdit } = await checkAccess(req);
    if (error) return res.status(status).json({ message: error });
    if (!canEdit) return res.status(403).json({ message: "Not authorized to edit todo items" });

    const sub = await SubSection.findOne({
      _id: req.params.subId,
      sectionId: req.params.id,
    });
    if (!sub) return res.status(404).json({ message: "Sub-section not found" });

    const todo = sub.todos.id(req.params.todoId);
    if (!todo) return res.status(404).json({ message: "Todo not found" });

    const { text, checked, priority, dueDate } = req.body;
    if (text !== undefined) todo.text = text;
    if (checked !== undefined) todo.checked = checked;
    if (priority !== undefined) todo.priority = priority;
    if (dueDate !== undefined) todo.dueDate = dueDate;

    sub.version = (sub.version || 1) + 1;
    sub.lastEditedBy = req.user._id;

    await sub.save();

    const populated = await SubSection.findById(sub._id)
      .populate("lastEditedBy", "name avatar")
      .populate("addedBy", "name avatar");

    const senderSocketId = getSocketId(req);
    broadcastToSection(req.params.id, "subsection_updated", { subSection: populated }, senderSocketId);

    res.json({ subSection: populated });
  } catch (err) {
    console.error("updateTodoItem:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// @route   DELETE /api/sections/:id/subsections/:subId/todos/:todoId
const deleteTodoItem = async (req, res) => {
  try {
    const { error, status, canEdit } = await checkAccess(req);
    if (error) return res.status(status).json({ message: error });
    if (!canEdit) return res.status(403).json({ message: "Not authorized to delete todo items" });

    const sub = await SubSection.findOne({
      _id: req.params.subId,
      sectionId: req.params.id,
    });
    if (!sub) return res.status(404).json({ message: "Sub-section not found" });

    sub.todos = sub.todos.filter((t) => t._id.toString() !== req.params.todoId);
    sub.version = (sub.version || 1) + 1;
    sub.lastEditedBy = req.user._id;

    await sub.save();

    const populated = await SubSection.findById(sub._id)
      .populate("lastEditedBy", "name avatar")
      .populate("addedBy", "name avatar");

    const senderSocketId = getSocketId(req);
    broadcastToSection(req.params.id, "subsection_updated", { subSection: populated }, senderSocketId);

    res.json({ subSection: populated });
  } catch (err) {
    console.error("deleteTodoItem:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// @route   POST /api/sections/:id/subsections/:subId/todos/bulk
const bulkAddTodos = async (req, res) => {
  try {
    const { error, status, canEdit } = await checkAccess(req);
    if (error) return res.status(status).json({ message: error });
    if (!canEdit) return res.status(403).json({ message: "Not authorized to add todos" });

    const sub = await SubSection.findOne({
      _id: req.params.subId,
      sectionId: req.params.id,
    });
    if (!sub) return res.status(404).json({ message: "Sub-section not found" });

    const { todos } = req.body;
    if (!Array.isArray(todos) || todos.length === 0) {
      return res.status(400).json({ message: "No todos provided" });
    }

    todos.forEach((item, idx) => {
      if (item && item.text && item.text.trim()) {
        sub.todos.push({
          text: item.text.trim(),
          checked: !!item.checked,
          priority: item.priority || "medium",
          dueDate: item.dueDate || null,
          order: sub.todos.length + idx,
        });
      }
    });

    sub.version = (sub.version || 1) + 1;
    sub.lastEditedBy = req.user._id;

    await sub.save();

    const populated = await SubSection.findById(sub._id)
      .populate("lastEditedBy", "name avatar")
      .populate("addedBy", "name avatar");

    const senderSocketId = getSocketId(req);
    broadcastToSection(req.params.id, "subsection_updated", { subSection: populated }, senderSocketId);
    broadcastActivity(req.params.id, {
      user: { name: req.user.name, avatar: req.user.avatar },
      action: "bulk_added_todos",
      blockName: populated.name,
      count: todos.length,
    });

    res.json({ subSection: populated });
  } catch (err) {
    console.error("bulkAddTodos:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── Board items ─────────────────────────────────────────────────────────────

// @route   POST /api/sections/:id/subsections/:subId/board
const addBoardItem = async (req, res) => {
  try {
    const { error, status, canEdit } = await checkAccess(req);
    if (error) return res.status(status).json({ message: error });
    if (!canEdit) return res.status(403).json({ message: "Not authorized to add board items" });

    const sub = await SubSection.findOne({
      _id: req.params.subId,
      sectionId: req.params.id,
    });
    if (!sub) return res.status(404).json({ message: "Sub-section not found" });

    const {
      title,
      description,
      status: itemStatus,
      priority,
      dueDate,
    } = req.body;

    sub.boardItems.push({
      title,
      description: description || "",
      status: itemStatus || "todo",
      priority: priority || "medium",
      dueDate: dueDate || null,
      order: sub.boardItems.length,
    });

    sub.version = (sub.version || 1) + 1;
    sub.lastEditedBy = req.user._id;

    await sub.save();

    const populated = await SubSection.findById(sub._id)
      .populate("lastEditedBy", "name avatar")
      .populate("addedBy", "name avatar");

    const senderSocketId = getSocketId(req);
    broadcastToSection(req.params.id, "subsection_updated", { subSection: populated }, senderSocketId);
    broadcastActivity(req.params.id, {
      user: { name: req.user.name, avatar: req.user.avatar },
      action: "added_card",
      blockName: populated.name,
      detail: title,
    });

    res.json({ subSection: populated });
  } catch (err) {
    console.error("addBoardItem:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// @route   PATCH /api/sections/:id/subsections/:subId/board/:itemId
const updateBoardItem = async (req, res) => {
  try {
    const { error, status, canEdit } = await checkAccess(req);
    if (error) return res.status(status).json({ message: error });
    if (!canEdit) return res.status(403).json({ message: "Not authorized to update board items" });

    const sub = await SubSection.findOne({
      _id: req.params.subId,
      sectionId: req.params.id,
    });
    if (!sub) return res.status(404).json({ message: "Sub-section not found" });

    const item = sub.boardItems.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: "Board item not found" });

    const {
      title,
      description,
      status: itemStatus,
      priority,
      dueDate,
    } = req.body;
    if (title !== undefined) item.title = title;
    if (description !== undefined) item.description = description;
    if (itemStatus !== undefined) item.status = itemStatus;
    if (priority !== undefined) item.priority = priority;
    if (dueDate !== undefined) item.dueDate = dueDate;

    sub.version = (sub.version || 1) + 1;
    sub.lastEditedBy = req.user._id;

    await sub.save();

    const populated = await SubSection.findById(sub._id)
      .populate("lastEditedBy", "name avatar")
      .populate("addedBy", "name avatar");

    const senderSocketId = getSocketId(req);
    broadcastToSection(req.params.id, "subsection_updated", { subSection: populated }, senderSocketId);

    res.json({ subSection: populated });
  } catch (err) {
    console.error("updateBoardItem:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// @route   DELETE /api/sections/:id/subsections/:subId/board/:itemId
const deleteBoardItem = async (req, res) => {
  try {
    const { error, status, canEdit } = await checkAccess(req);
    if (error) return res.status(status).json({ message: error });
    if (!canEdit) return res.status(403).json({ message: "Not authorized to delete board items" });

    const sub = await SubSection.findOne({
      _id: req.params.subId,
      sectionId: req.params.id,
    });
    if (!sub) return res.status(404).json({ message: "Sub-section not found" });

    sub.boardItems = sub.boardItems.filter(
      (i) => i._id.toString() !== req.params.itemId,
    );
    sub.version = (sub.version || 1) + 1;
    sub.lastEditedBy = req.user._id;

    await sub.save();

    const populated = await SubSection.findById(sub._id)
      .populate("lastEditedBy", "name avatar")
      .populate("addedBy", "name avatar");

    const senderSocketId = getSocketId(req);
    broadcastToSection(req.params.id, "subsection_updated", { subSection: populated }, senderSocketId);

    res.json({ subSection: populated });
  } catch (err) {
    console.error("deleteBoardItem:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── Links ───────────────────────────────────────────────────────────────────

// @route   POST /api/sections/:id/subsections/:subId/links
const addLink = async (req, res) => {
  try {
    const { error, status, canEdit } = await checkAccess(req);
    if (error) return res.status(status).json({ message: error });
    if (!canEdit) return res.status(403).json({ message: "Not authorized to add links" });

    const sub = await SubSection.findOne({
      _id: req.params.subId,
      sectionId: req.params.id,
    });
    if (!sub) return res.status(404).json({ message: "Sub-section not found" });

    let {
      title,
      url,
      description,
      platform,
      mediaType,
      embedUrl,
      embedId,
      mediaUrl,
      thumbnailUrl,
      authorName,
      siteName,
      rawContent,
      displayMode,
      aspectRatio,
    } = req.body;

    const trimmedUrl = (url || "").trim();
    if (!trimmedUrl) {
      return res.status(400).json({ message: "A valid URL is required" });
    }

    // If platform or embed details were not fully provided by client, auto-inspect via Quick Capture model
    if (!platform || platform === "web" || !embedUrl || mediaType !== "video") {
      try {
        const scraped = await fetchUrlMetadata(trimmedUrl);
        if (scraped) {
          if (!platform || platform === "web") {
            platform = scraped.platform || platform || "web";
          }
          if (!mediaType || mediaType === "article" || scraped.mediaType === "video") {
            mediaType = scraped.mediaType || mediaType || "article";
          }
          if (!embedUrl) embedUrl = scraped.embedUrl || "";
          if (!embedId) embedId = scraped.embedId || "";
          if (!mediaUrl) mediaUrl = scraped.mediaUrl || "";
          if (!thumbnailUrl) thumbnailUrl = scraped.thumbnailUrl || "";
          if (!authorName) authorName = scraped.authorName || "";
          if (!siteName) siteName = scraped.siteName || "";
          if (!rawContent) rawContent = scraped.rawContent || "";
          if (!title || title === "Saved Link" || title.includes(".")) {
            if (scraped.title) title = scraped.title;
          }
        } else {
          const detected = detectPlatformAndEmbed(trimmedUrl);
          platform = platform || detected.platform || "web";
          mediaType = mediaType || detected.mediaType || "article";
          embedUrl = embedUrl || detected.embedUrl || "";
          embedId = embedId || detected.embedId || "";
          mediaUrl = mediaUrl || detected.mediaUrl || "";
        }
      } catch (scrapeErr) {
        console.warn("subSection addLink scrape warning:", scrapeErr.message);
      }
    }

    if (!title || !title.trim()) {
      try {
        const u = new URL(trimmedUrl);
        title = u.hostname.replace(/^www\./, "");
      } catch {
        title = "Saved Link";
      }
    }

    // Default aspect ratio heuristic: vertical 9/16 for Instagram reels/shorts, 16/9 for standard videos
    let resolvedRatio = aspectRatio;
    if (!resolvedRatio) {
      if (platform === "instagram" && /reel/i.test(trimmedUrl)) {
        resolvedRatio = "9/16";
      } else if (platform === "youtube" && /shorts/i.test(trimmedUrl)) {
        resolvedRatio = "9/16";
      } else if (platform === "tiktok") {
        resolvedRatio = "9/16";
      } else {
        resolvedRatio = "16/9";
      }
    }

    sub.links.push({
      title: title.trim(),
      url: trimmedUrl,
      description: (description || "").trim(),
      platform: platform || "web",
      mediaType: mediaType || "article",
      embedUrl: embedUrl || "",
      embedId: embedId || "",
      mediaUrl: mediaUrl || "",
      thumbnailUrl: thumbnailUrl || "",
      authorName: authorName || "",
      siteName: siteName || "",
      rawContent: rawContent || "",
      displayMode: displayMode || "wide",
      aspectRatio: resolvedRatio,
    });

    sub.version = (sub.version || 1) + 1;
    sub.lastEditedBy = req.user._id;

    await sub.save();

    const populated = await SubSection.findById(sub._id)
      .populate("lastEditedBy", "name avatar")
      .populate("addedBy", "name avatar");

    const senderSocketId = getSocketId(req);
    broadcastToSection(req.params.id, "subsection_updated", { subSection: populated }, senderSocketId);
    broadcastActivity(req.params.id, {
      user: { name: req.user.name, avatar: req.user.avatar },
      action: "added_link",
      blockName: populated.name,
      detail: title,
    });

    res.json({ subSection: populated });
  } catch (err) {
    console.error("addLink:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// @route   PATCH /api/sections/:id/subsections/:subId/links/:linkId
const updateLink = async (req, res) => {
  try {
    const { error, status, canEdit } = await checkAccess(req);
    if (error) return res.status(status).json({ message: error });
    if (!canEdit) return res.status(403).json({ message: "Not authorized to update links" });

    const sub = await SubSection.findOne({
      _id: req.params.subId,
      sectionId: req.params.id,
    });
    if (!sub) return res.status(404).json({ message: "Sub-section not found" });

    const link = sub.links.id(req.params.linkId);
    if (!link) return res.status(404).json({ message: "Link not found" });

    const allowedFields = [
      "title",
      "description",
      "displayMode",
      "aspectRatio",
      "platform",
      "mediaType",
      "embedUrl",
      "mediaUrl",
      "thumbnailUrl",
    ];

    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        link[key] = req.body[key];
      }
    }

    sub.version = (sub.version || 1) + 1;
    sub.lastEditedBy = req.user._id;

    await sub.save();

    const populated = await SubSection.findById(sub._id)
      .populate("lastEditedBy", "name avatar")
      .populate("addedBy", "name avatar");

    const senderSocketId = getSocketId(req);
    broadcastToSection(req.params.id, "subsection_updated", { subSection: populated }, senderSocketId);

    res.json({ subSection: populated });
  } catch (err) {
    console.error("updateLink:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// @route   DELETE /api/sections/:id/subsections/:subId/links/:linkId
const removeLink = async (req, res) => {
  try {
    const { error, status, canEdit } = await checkAccess(req);
    if (error) return res.status(status).json({ message: error });
    if (!canEdit) return res.status(403).json({ message: "Not authorized to remove links" });

    const sub = await SubSection.findOne({
      _id: req.params.subId,
      sectionId: req.params.id,
    });
    if (!sub) return res.status(404).json({ message: "Sub-section not found" });

    sub.links = sub.links.filter((l) => l._id.toString() !== req.params.linkId);
    sub.version = (sub.version || 1) + 1;
    sub.lastEditedBy = req.user._id;

    await sub.save();

    const populated = await SubSection.findById(sub._id)
      .populate("lastEditedBy", "name avatar")
      .populate("addedBy", "name avatar");

    const senderSocketId = getSocketId(req);
    broadcastToSection(req.params.id, "subsection_updated", { subSection: populated }, senderSocketId);

    res.json({ subSection: populated });
  } catch (err) {
    console.error("removeLink:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getSubSections,
  createSubSection,
  updateSubSection,
  deleteSubSection,
  addTodoItem,
  bulkAddTodos,
  updateTodoItem,
  deleteTodoItem,
  addBoardItem,
  updateBoardItem,
  deleteBoardItem,
  addLink,
  updateLink,
  removeLink,
};
