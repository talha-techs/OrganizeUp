const express = require("express");
const router = express.Router();
const {
  getComments,
  addComment,
  deleteComment,
  vote,
  getVotes,
  createPublishRequest,
  getPublishRequests,
  reviewPublishRequest,
} = require("../controllers/socialController");
const { protect, adminOnly } = require("../middleware/auth");

// Comments
router.get("/comments/:contentType/:contentId", protect, getComments);
router.post("/comments/:contentType/:contentId", protect, addComment);
router.delete("/comments/:commentId", protect, deleteComment);

// Votes
router.get("/votes/:contentType/:contentId", protect, getVotes);
router.post("/vote/:contentType/:contentId", protect, vote);

// Publish Requests
router.post(
  "/publish-request/:contentType/:contentId",
  protect,
  createPublishRequest,
);
router.get("/publish-requests", protect, adminOnly, getPublishRequests);
router.put("/publish-requests/:id", protect, adminOnly, reviewPublishRequest);

module.exports = router;
