const FeatureSuggestion = require("../models/FeatureSuggestion");

// @desc    Submit a new feature suggestion
// @route   POST /api/suggestions
// @access  Private
const createSuggestion = async (req, res) => {
  try {
    const { title, targetArea, problemStatement, proposedSolution, impact } =
      req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Please provide a title" });
    }
    if (!problemStatement || !problemStatement.trim()) {
      return res
        .status(400)
        .json({ message: "Please describe the problem you are experiencing" });
    }
    if (!proposedSolution || !proposedSolution.trim()) {
      return res.status(400).json({
        message:
          "Please describe where and how OrganizeUp can solve this for you",
      });
    }

    const suggestion = await FeatureSuggestion.create({
      user: req.user._id,
      title: title.trim(),
      targetArea: targetArea || "general",
      problemStatement: problemStatement.trim(),
      proposedSolution: proposedSolution.trim(),
      impact: impact || "medium",
    });

    const populated = await FeatureSuggestion.findById(suggestion._id).populate(
      "user",
      "name email avatar role",
    );

    res.status(201).json({
      message: "Thank you! Your suggestion has been submitted successfully.",
      suggestion: populated,
    });
  } catch (error) {
    console.error("Create suggestion error:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// @desc    Get suggestions submitted by logged-in user
// @route   GET /api/suggestions/my
// @access  Private
const getMySuggestions = async (req, res) => {
  try {
    const suggestions = await FeatureSuggestion.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate("reviewedBy", "name");

    res.json({ suggestions });
  } catch (error) {
    console.error("Get my suggestions error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get all suggestions (Admin only)
// @route   GET /api/suggestions
// @access  Private/Admin
const getAllSuggestions = async (req, res) => {
  try {
    const { status, targetArea, search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (status && status !== "all") {
      query.status = status;
    }

    if (targetArea && targetArea !== "all") {
      query.targetArea = targetArea;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      query.$or = [
        { title: searchRegex },
        { problemStatement: searchRegex },
        { proposedSolution: searchRegex },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await FeatureSuggestion.countDocuments(query);

    const suggestions = await FeatureSuggestion.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("user", "name email avatar role createdAt")
      .populate("reviewedBy", "name email");

    res.json({
      suggestions,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error("Get all suggestions error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get suggestion statistics (Admin only)
// @route   GET /api/suggestions/stats
// @access  Private/Admin
const getSuggestionStats = async (req, res) => {
  try {
    const [total, pending, underReview, planned, completed, dismissed] =
      await Promise.all([
        FeatureSuggestion.countDocuments(),
        FeatureSuggestion.countDocuments({ status: "pending" }),
        FeatureSuggestion.countDocuments({ status: "under_review" }),
        FeatureSuggestion.countDocuments({ status: "planned" }),
        FeatureSuggestion.countDocuments({ status: "completed" }),
        FeatureSuggestion.countDocuments({ status: "dismissed" }),
      ]);

    res.json({
      total,
      pending,
      underReview,
      planned,
      completed,
      dismissed,
    });
  } catch (error) {
    console.error("Get suggestion stats error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Update suggestion status and admin response notes (Admin only)
// @route   PUT /api/suggestions/:id
// @access  Private/Admin
const updateSuggestionStatus = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const suggestion = await FeatureSuggestion.findById(req.params.id);

    if (!suggestion) {
      return res.status(404).json({ message: "Suggestion not found" });
    }

    if (status !== undefined) {
      suggestion.status = status;
    }
    if (adminNotes !== undefined) {
      suggestion.adminNotes = adminNotes.trim();
    }

    suggestion.reviewedBy = req.user._id;
    suggestion.reviewedAt = new Date();

    await suggestion.save();

    const populated = await FeatureSuggestion.findById(suggestion._id)
      .populate("user", "name email avatar role createdAt")
      .populate("reviewedBy", "name email");

    res.json({
      message: "Suggestion updated successfully",
      suggestion: populated,
    });
  } catch (error) {
    console.error("Update suggestion error:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// @desc    Update user's own suggestion
// @route   PUT /api/suggestions/my/:id
// @access  Private
const updateMySuggestion = async (req, res) => {
  try {
    const { title, targetArea, problemStatement, proposedSolution, impact } =
      req.body;

    const suggestion = await FeatureSuggestion.findById(req.params.id);
    if (!suggestion) {
      return res.status(404).json({ message: "Suggestion not found" });
    }

    if (suggestion.user.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to edit this suggestion" });
    }

    if (title && title.trim()) suggestion.title = title.trim();
    if (targetArea) suggestion.targetArea = targetArea;
    if (problemStatement && problemStatement.trim())
      suggestion.problemStatement = problemStatement.trim();
    if (proposedSolution && proposedSolution.trim())
      suggestion.proposedSolution = proposedSolution.trim();
    if (impact) suggestion.impact = impact;

    await suggestion.save();

    const populated = await FeatureSuggestion.findById(suggestion._id)
      .populate("user", "name email avatar role")
      .populate("reviewedBy", "name");

    res.json({
      message: "Suggestion updated successfully",
      suggestion: populated,
    });
  } catch (error) {
    console.error("Update my suggestion error:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// @desc    Delete suggestion (Admin or Owner)
// @route   DELETE /api/suggestions/:id
// @access  Private
const deleteSuggestion = async (req, res) => {
  try {
    const suggestion = await FeatureSuggestion.findById(req.params.id);
    if (!suggestion) {
      return res.status(404).json({ message: "Suggestion not found" });
    }

    const isOwner = suggestion.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this suggestion" });
    }

    await FeatureSuggestion.findByIdAndDelete(req.params.id);

    res.json({ message: "Suggestion deleted successfully" });
  } catch (error) {
    console.error("Delete suggestion error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createSuggestion,
  getMySuggestions,
  updateMySuggestion,
  getAllSuggestions,
  getSuggestionStats,
  updateSuggestionStatus,
  deleteSuggestion,
};
