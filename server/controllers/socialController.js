const Comment = require("../models/Comment");
const Vote = require("../models/Vote");
const PublishRequest = require("../models/PublishRequest");
const Book = require("../models/Book");
const Course = require("../models/Course");
const Tool = require("../models/Tool");
const User = require("../models/User");

const CustomSection = require("../models/CustomSection");

// ───── Helper to get the model by content type ─────
const getModel = (contentType) => {
  const map = {
    book: Book,
    course: Course,
    tool: Tool,
    section: CustomSection,
  };
  return map[contentType] || null;
};

// ═══════════════════════════ COMMENTS ═══════════════════════════

// @desc    Get comments for a content item
// @route   GET /api/social/comments/:contentType/:contentId
const getComments = async (req, res) => {
  try {
    const { contentType, contentId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const comments = await Comment.find({ contentType, contentId })
      .populate("user", "name avatar")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Comment.countDocuments({ contentType, contentId });

    res.json({ comments, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Get comments error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Add a comment
// @route   POST /api/social/comments/:contentType/:contentId
const addComment = async (req, res) => {
  try {
    const { contentType, contentId } = req.params;
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ message: "Comment text is required" });
    }

    const comment = await Comment.create({
      contentType,
      contentId,
      user: req.user._id,
      text: text.trim(),
    });

    const populated = await comment.populate("user", "name avatar");
    res.status(201).json({ comment: populated });
  } catch (error) {
    console.error("Add comment error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Delete a comment (owner or admin)
// @route   DELETE /api/social/comments/:commentId
const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Only comment owner or admin can delete
    if (
      comment.user.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await comment.deleteOne();
    res.json({ message: "Comment deleted" });
  } catch (error) {
    console.error("Delete comment error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ═══════════════════════════ VOTES ═══════════════════════════

// @desc    Vote on a content item (upvote/downvote/remove)
// @route   POST /api/social/vote/:contentType/:contentId
const vote = async (req, res) => {
  try {
    const { contentType, contentId } = req.params;
    const { value } = req.body; // 1, -1, or 0 (remove)

    if (![1, -1, 0].includes(value)) {
      return res.status(400).json({ message: "Value must be 1, -1, or 0" });
    }

    const existing = await Vote.findOne({
      contentType,
      contentId,
      user: req.user._id,
    });

    if (value === 0) {
      // Remove vote
      if (existing) await existing.deleteOne();
    } else if (existing) {
      existing.value = value;
      await existing.save();
    } else {
      await Vote.create({
        contentType,
        contentId,
        user: req.user._id,
        value,
      });
    }

    // Return updated vote counts
    const [upvotes, downvotes] = await Promise.all([
      Vote.countDocuments({ contentType, contentId, value: 1 }),
      Vote.countDocuments({ contentType, contentId, value: -1 }),
    ]);

    // Get user's current vote
    const userVote = await Vote.findOne({
      contentType,
      contentId,
      user: req.user._id,
    });

    res.json({
      upvotes,
      downvotes,
      score: upvotes - downvotes,
      userVote: userVote?.value || 0,
    });
  } catch (error) {
    console.error("Vote error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get vote counts for a content item
// @route   GET /api/social/votes/:contentType/:contentId
const getVotes = async (req, res) => {
  try {
    const { contentType, contentId } = req.params;

    const [upvotes, downvotes] = await Promise.all([
      Vote.countDocuments({ contentType, contentId, value: 1 }),
      Vote.countDocuments({ contentType, contentId, value: -1 }),
    ]);

    let userVote = 0;
    if (req.user) {
      const vote = await Vote.findOne({
        contentType,
        contentId,
        user: req.user._id,
      });
      userVote = vote?.value || 0;
    }

    res.json({ upvotes, downvotes, score: upvotes - downvotes, userVote });
  } catch (error) {
    console.error("Get votes error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ═══════════════════════════ PUBLISH REQUESTS ═══════════════════════════

// @desc    Request to publish a private content item
// @route   POST /api/social/publish-request/:contentType/:contentId
const createPublishRequest = async (req, res) => {
  try {
    const { contentType, contentId } = req.params;
    const Model = getModel(contentType);
    if (!Model) {
      return res.status(400).json({ message: "Invalid content type" });
    }

    const content = await Model.findById(contentId);
    if (!content) {
      return res.status(404).json({ message: "Content not found" });
    }

    // Only owner can request publish
    if (content.addedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (content.visibility === "public") {
      return res.status(400).json({ message: "Content is already public" });
    }

    // Check for existing pending request
    const existing = await PublishRequest.findOne({
      contentType,
      contentId,
      status: "pending",
    });

    if (existing) {
      return res
        .status(400)
        .json({ message: "A publish request is already pending" });
    }

    const request = await PublishRequest.create({
      contentType,
      contentId,
      requestedBy: req.user._id,
      category: req.body.category || "",
      publishMode: req.body.publishMode || "with_data",
    });

    // Mark content as pending
    content.visibility = "pending";
    await content.save();

    res.status(201).json({ message: "Publish request submitted", request });
  } catch (error) {
    console.error("Create publish request error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get all publish requests (Admin)
// @route   GET /api/social/publish-requests
const getPublishRequests = async (req, res) => {
  try {
    const status = req.query.status || "pending";

    const requests = await PublishRequest.find({ status })
      .populate("requestedBy", "name email avatar")
      .populate("reviewedBy", "name email")
      .sort({ createdAt: -1 });

    // Populate content details for each request
    const populated = await Promise.all(
      requests.map(async (req) => {
        const Model = getModel(req.contentType);
        const content = Model
          ? await Model.findById(req.contentId).select(
              req.contentType === "section"
                ? "name description publishMode"
                : "title description",
            )
          : null;
        // Normalize title for sections
        const normalized = content
          ? {
              ...content.toObject(),
              title: content.title || content.name,
            }
          : null;
        return { ...req.toObject(), content: normalized };
      }),
    );

    res.json({ requests: populated });
  } catch (error) {
    console.error("Get publish requests error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Review a publish request (Admin: approve/reject)
// @route   PUT /api/social/publish-requests/:id
const reviewPublishRequest = async (req, res) => {
  try {
    const { status, adminNote } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res
        .status(400)
        .json({ message: "Status must be approved or rejected" });
    }

    const request = await PublishRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Request has already been reviewed" });
    }

    request.status = status;
    request.adminNote = adminNote || "";
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    await request.save();

    // Update content visibility
    const Model = getModel(request.contentType);
    if (Model) {
      const content = await Model.findById(request.contentId);
      if (content) {
        content.visibility = status === "approved" ? "public" : "private";
        // Store publishMode on sections when approved
        if (
          status === "approved" &&
          request.contentType === "section" &&
          request.publishMode
        ) {
          content.publishMode = request.publishMode;
        }
        await content.save();

        const contentTitle = content.title || content.name || "Unknown content";

        // Notify the requester if rejected
        if (status === "rejected") {
          const requester = await User.findById(request.requestedBy);
          if (requester) {
            requester.notifications.push({
              type: "rejection",
              message: `Your publish request was reviewed by an admin.`,
              contentTitle,
              adminNote: adminNote || "",
              read: false,
            });
            await requester.save();
          }
        }

        // Also notify on approval
        if (status === "approved") {
          const requester = await User.findById(request.requestedBy);
          if (requester) {
            requester.notifications.push({
              type: "approval",
              message: `Your content was approved and is now public!`,
              contentTitle,
              adminNote: adminNote || "",
              read: false,
            });
            await requester.save();
          }
        }
      }
    }

    res.json({ message: `Request ${status}`, request });
  } catch (error) {
    console.error("Review publish request error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getComments,
  addComment,
  deleteComment,
  vote,
  getVotes,
  createPublishRequest,
  getPublishRequests,
  reviewPublishRequest,
};
