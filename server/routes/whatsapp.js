const express = require("express");
const router = express.Router();
const CapturedResource = require("../models/CapturedResource");
const User = require("../models/User");

const VERIFY_TOKEN =
  process.env.WHATSAPP_VERIFY_TOKEN || "organizeup_whatsapp_verify_token";

// @desc    WhatsApp Webhook Verification (Meta WhatsApp Cloud API Challenge)
// @route   GET /api/whatsapp/webhook
router.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("✅ WhatsApp Webhook verified successfully");
      return res.status(200).send(challenge);
    } else {
      console.warn("❌ WhatsApp Webhook token mismatch");
      return res.sendStatus(403);
    }
  }

  res.status(400).send("Missing hub.mode or hub.verify_token parameters");
});

// @desc    WhatsApp Incoming Message Webhook (Meta Cloud API, Twilio, Baileys, or Custom bot)
// @route   POST /api/whatsapp/webhook
router.post("/webhook", async (req, res) => {
  try {
    const body = req.body;
    let senderNumber = "";
    let senderName = "";
    let messageText = "";
    let mediaUrl = "";

    // 1. Meta WhatsApp Cloud API format
    if (body.object === "whatsapp_business_account" && Array.isArray(body.entry)) {
      for (const entry of body.entry) {
        for (const change of entry.changes || []) {
          const value = change.value;
          if (value && Array.isArray(value.messages)) {
            for (const msg of value.messages) {
              senderNumber = msg.from || "";
              // Contact profile name
              if (Array.isArray(value.contacts) && value.contacts[0]) {
                senderName = value.contacts[0].profile?.name || "";
              }

              if (msg.type === "text") {
                messageText = msg.text?.body || "";
              } else if (msg.type === "image") {
                messageText = msg.image?.caption || "[Image message]";
              } else if (msg.type === "video") {
                messageText = msg.video?.caption || "[Video message]";
              } else if (msg.type === "document") {
                messageText = msg.document?.caption || `[Document: ${msg.document?.filename || ""}]`;
              }
            }
          }
        }
      }
    }
    // 2. Twilio WhatsApp Webhook format
    else if (body.From && (body.Body !== undefined || body.MessageSid)) {
      senderNumber = String(body.From).replace("whatsapp:", "").trim();
      senderName = body.ProfileName || senderNumber;
      messageText = body.Body || "";
      if (body.MediaUrl0) mediaUrl = body.MediaUrl0;
    }
    // 3. Custom / Baileys bot JSON format
    else if (body.message || body.text || body.rawContent) {
      senderNumber = body.from || body.sender || body.phoneNumber || "";
      senderName = body.senderName || body.author || senderNumber;
      messageText = body.message || body.text || body.rawContent || "";
      if (body.mediaUrl) mediaUrl = body.mediaUrl;
    }

    if (!messageText.trim() && !mediaUrl) {
      // Acknowledge webhook events like delivery receipts without error
      return res.status(200).json({ status: "acknowledged", message: "No message text found" });
    }

    // Resolve target User in OrganizeUp
    let targetUser = null;

    // Check explicit userId passed in query or headers
    const explicitUserId = req.query.userId || req.headers["x-user-id"];
    if (explicitUserId) {
      targetUser = await User.findById(explicitUserId);
    }

    // Match by linked WhatsApp phone number
    if (!targetUser && senderNumber) {
      const sanitizedPhone = senderNumber.replace(/[^0-9]/g, "");
      targetUser = await User.findOne({
        $or: [
          { whatsappPhoneNumber: senderNumber },
          { whatsappPhoneNumber: sanitizedPhone },
          { whatsappPhoneNumber: `+${sanitizedPhone}` },
        ],
      });
    }

    // Fallback: Primary admin or first user in the database
    if (!targetUser) {
      targetUser = await User.findOne({ role: "admin" }) || await User.findOne();
    }

    if (!targetUser) {
      return res.status(404).json({ message: "No user found to assign WhatsApp capture" });
    }

    // Check for reminder directives in message text (e.g., "remind me tomorrow: buy milk" or "remind in 2h")
    let parsedRemindAt = null;
    const remindMatch = messageText.match(/^remind(?:\s+me)?\s+(?:in\s+(\d+)\s*(m|h|d)|tomorrow|tonight):?\s*(.*)/i);
    if (remindMatch) {
      const now = new Date();
      if (remindMatch[1] && remindMatch[2]) {
        const num = parseInt(remindMatch[1], 10);
        const unit = remindMatch[2].toLowerCase();
        if (unit === "m") parsedRemindAt = new Date(now.getTime() + num * 60 * 1000);
        if (unit === "h") parsedRemindAt = new Date(now.getTime() + num * 60 * 60 * 1000);
        if (unit === "d") parsedRemindAt = new Date(now.getTime() + num * 24 * 60 * 60 * 1000);
      } else if (/tomorrow/i.test(messageText)) {
        parsedRemindAt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0, 0);
      } else if (/tonight/i.test(messageText)) {
        parsedRemindAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 20, 0, 0);
      }
    }

    // Default actionable reminder: if user didn't specify, default to Tonight 8 PM or Tomorrow 9 AM
    // so forwarded items are never forgotten like in native WhatsApp chat!
    if (!parsedRemindAt) {
      const now = new Date();
      if (now.getHours() < 19) {
        parsedRemindAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 20, 0, 0);
      } else {
        parsedRemindAt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0, 0);
      }
    }

    // Auto-detect Instagram, Facebook or YouTube links inside WhatsApp message
    const { detectPlatformAndEmbed } = require("../controllers/captureController");
    const urlMatch = messageText.match(/(https?:\/\/[^\s]+)/i);
    let platform = "whatsapp";
    let mediaType = "message";
    let embedId = "";
    let embedUrl = "";
    let sourceUrl = "";

    if (urlMatch) {
      sourceUrl = urlMatch[0];
      const detected = detectPlatformAndEmbed(sourceUrl);
      if (["instagram", "facebook", "youtube"].includes(detected.platform)) {
        platform = detected.platform;
        mediaType = detected.mediaType;
        embedId = detected.embedId || "";
        embedUrl = detected.embedUrl || "";
      }
    }

    const captureTitle = senderName
      ? `WhatsApp from ${senderName}`
      : `WhatsApp from ${senderNumber || "Direct"}`;

    const newCapture = await CapturedResource.create({
      user: targetUser._id,
      platform,
      mediaType,
      title: captureTitle,
      sourceUrl,
      rawContent: messageText.trim(),
      authorName: senderName || senderNumber || "WhatsApp",
      embedId,
      embedUrl,
      mediaUrl: mediaUrl || "",
      remindAt: parsedRemindAt,
      priority: "medium",
      status: "inbox",
    });

    console.log(`📥 WhatsApp capture saved for user ${targetUser.email} (ID: ${newCapture._id})`);

    return res.status(200).json({
      success: true,
      message: "WhatsApp capture ingested successfully",
      captureId: newCapture._id,
    });
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    res.status(500).json({ message: "Webhook processing failed" });
  }
});

// @desc    Get WhatsApp Webhook configuration & integration instructions
// @route   GET /api/whatsapp/status
router.get("/status", (req, res) => {
  res.json({
    status: "active",
    verifyToken: VERIFY_TOKEN,
    endpoints: {
      webhookUrl: "/api/whatsapp/webhook",
      verificationMethod: "GET with hub.mode=subscribe & hub.verify_token",
      ingestionMethod: "POST with Meta Cloud API, Twilio, or JSON body",
    },
    samplePayload: {
      from: "+1234567890",
      senderName: "Sarah Connor",
      message: "Check out this AI learning resource: https://organizeup.app",
    },
  });
});

module.exports = router;
