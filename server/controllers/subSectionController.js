const SubSection = require("../models/SubSection");
const CustomSection = require("../models/CustomSection");

// Helper: verify the parent section exists and the requester has access
const checkAccess = async (req) => {
  const section = await CustomSection.findById(req.params.id);
  if (!section) return { error: "Section not found", status: 404 };
  const isOwner = section.addedBy.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin";
  const isPublic = section.visibility === "public";
  if (!isOwner && !isAdmin && !isPublic)
    return { error: "Not authorized", status: 403 };
  return { section, isOwner, isAdmin, canManage: isOwner || isAdmin };
};

// ─── Sub-section CRUD ────────────────────────────────────────────────────────

// @route   GET /api/sections/:id/subsections
const getSubSections = async (req, res) => {
  try {
    const { error, status } = await checkAccess(req);
    if (error) return res.status(status).json({ message: error });

    const subSections = await SubSection.find({
      sectionId: req.params.id,
    }).sort({ order: 1, createdAt: 1 });

    res.json({ subSections });
  } catch (err) {
    console.error("getSubSections:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// @route   POST /api/sections/:id/subsections
const createSubSection = async (req, res) => {
  try {
    const { error, status, canManage } = await checkAccess(req);
    if (error) return res.status(status).json({ message: error });
    if (!canManage) return res.status(403).json({ message: "Not authorized" });

    const { name, type, content, code, language, boardColumns } = req.body;
    const count = await SubSection.countDocuments({ sectionId: req.params.id });

    const defaultColumns = [
      { id: "todo", name: "To Do", color: "slate" },
      { id: "inprogress", name: "In Progress", color: "amber" },
      { id: "done", name: "Done", color: "emerald" },
    ];

    const subSection = await SubSection.create({
      sectionId: req.params.id,
      name,
      type,
      order: count,
      addedBy: req.user._id,
      content: content || "",
      code: code || "",
      language: language || "javascript",
      boardColumns: type === "board" ? boardColumns || defaultColumns : [],
    });

    res.status(201).json({ subSection });
  } catch (err) {
    console.error("createSubSection:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// @route   PUT /api/sections/:id/subsections/:subId
const updateSubSection = async (req, res) => {
  try {
    const { error, status, canManage } = await checkAccess(req);
    if (error) return res.status(status).json({ message: error });
    if (!canManage) return res.status(403).json({ message: "Not authorized" });

    const sub = await SubSection.findOne({
      _id: req.params.subId,
      sectionId: req.params.id,
    });
    if (!sub) return res.status(404).json({ message: "Sub-section not found" });

    const { name, content, code, language, boardColumns } = req.body;
    if (name !== undefined) sub.name = name;
    if (content !== undefined) sub.content = content;
    if (code !== undefined) sub.code = code;
    if (language !== undefined) sub.language = language;
    if (boardColumns !== undefined) sub.boardColumns = boardColumns;

    await sub.save();
    res.json({ subSection: sub });
  } catch (err) {
    console.error("updateSubSection:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// @route   DELETE /api/sections/:id/subsections/:subId
const deleteSubSection = async (req, res) => {
  try {
    const { error, status, canManage } = await checkAccess(req);
    if (error) return res.status(status).json({ message: error });
    if (!canManage) return res.status(403).json({ message: "Not authorized" });

    await SubSection.findOneAndDelete({
      _id: req.params.subId,
      sectionId: req.params.id,
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
    const { error, status, canManage } = await checkAccess(req);
    if (error) return res.status(status).json({ message: error });
    if (!canManage) return res.status(403).json({ message: "Not authorized" });

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
    await sub.save();
    res.json({ subSection: sub });
  } catch (err) {
    console.error("addTodoItem:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// @route   PATCH /api/sections/:id/subsections/:subId/todos/:todoId
const updateTodoItem = async (req, res) => {
  try {
    const { error, status, canManage } = await checkAccess(req);
    if (error) return res.status(status).json({ message: error });
    if (!canManage) return res.status(403).json({ message: "Not authorized" });

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

    await sub.save();
    res.json({ subSection: sub });
  } catch (err) {
    console.error("updateTodoItem:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// @route   DELETE /api/sections/:id/subsections/:subId/todos/:todoId
const deleteTodoItem = async (req, res) => {
  try {
    const { error, status, canManage } = await checkAccess(req);
    if (error) return res.status(status).json({ message: error });
    if (!canManage) return res.status(403).json({ message: "Not authorized" });

    const sub = await SubSection.findOne({
      _id: req.params.subId,
      sectionId: req.params.id,
    });
    if (!sub) return res.status(404).json({ message: "Sub-section not found" });

    sub.todos = sub.todos.filter((t) => t._id.toString() !== req.params.todoId);
    await sub.save();
    res.json({ subSection: sub });
  } catch (err) {
    console.error("deleteTodoItem:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── Board items ─────────────────────────────────────────────────────────────

// @route   POST /api/sections/:id/subsections/:subId/board
const addBoardItem = async (req, res) => {
  try {
    const { error, status, canManage } = await checkAccess(req);
    if (error) return res.status(status).json({ message: error });
    if (!canManage) return res.status(403).json({ message: "Not authorized" });

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
    await sub.save();
    res.json({ subSection: sub });
  } catch (err) {
    console.error("addBoardItem:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// @route   PATCH /api/sections/:id/subsections/:subId/board/:itemId
const updateBoardItem = async (req, res) => {
  try {
    const { error, status, canManage } = await checkAccess(req);
    if (error) return res.status(status).json({ message: error });
    if (!canManage) return res.status(403).json({ message: "Not authorized" });

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

    await sub.save();
    res.json({ subSection: sub });
  } catch (err) {
    console.error("updateBoardItem:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// @route   DELETE /api/sections/:id/subsections/:subId/board/:itemId
const deleteBoardItem = async (req, res) => {
  try {
    const { error, status, canManage } = await checkAccess(req);
    if (error) return res.status(status).json({ message: error });
    if (!canManage) return res.status(403).json({ message: "Not authorized" });

    const sub = await SubSection.findOne({
      _id: req.params.subId,
      sectionId: req.params.id,
    });
    if (!sub) return res.status(404).json({ message: "Sub-section not found" });

    sub.boardItems = sub.boardItems.filter(
      (i) => i._id.toString() !== req.params.itemId,
    );
    await sub.save();
    res.json({ subSection: sub });
  } catch (err) {
    console.error("deleteBoardItem:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── Links ───────────────────────────────────────────────────────────────────

// @route   POST /api/sections/:id/subsections/:subId/links
const addLink = async (req, res) => {
  try {
    const { error, status, canManage } = await checkAccess(req);
    if (error) return res.status(status).json({ message: error });
    if (!canManage) return res.status(403).json({ message: "Not authorized" });

    const sub = await SubSection.findOne({
      _id: req.params.subId,
      sectionId: req.params.id,
    });
    if (!sub) return res.status(404).json({ message: "Sub-section not found" });

    const { title, url, description } = req.body;
    sub.links.push({ title, url, description: description || "" });
    await sub.save();
    res.json({ subSection: sub });
  } catch (err) {
    console.error("addLink:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// @route   DELETE /api/sections/:id/subsections/:subId/links/:linkId
const removeLink = async (req, res) => {
  try {
    const { error, status, canManage } = await checkAccess(req);
    if (error) return res.status(status).json({ message: error });
    if (!canManage) return res.status(403).json({ message: "Not authorized" });

    const sub = await SubSection.findOne({
      _id: req.params.subId,
      sectionId: req.params.id,
    });
    if (!sub) return res.status(404).json({ message: "Sub-section not found" });

    sub.links = sub.links.filter((l) => l._id.toString() !== req.params.linkId);
    await sub.save();
    res.json({ subSection: sub });
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
  updateTodoItem,
  deleteTodoItem,
  addBoardItem,
  updateBoardItem,
  deleteBoardItem,
  addLink,
  removeLink,
};
