const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  subscribe,
  unsubscribe,
  getStatus,
} = require("../controllers/pushController");

router.use(protect);

router.post("/subscribe", subscribe);
router.post("/unsubscribe", unsubscribe);
router.get("/status", getStatus);

module.exports = router;

