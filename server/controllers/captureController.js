const CapturedResource = require("../models/CapturedResource");
const { uploadToGridFS, deleteFromGridFS } = require("../config/gridfs");

// Helper to auto-detect platform, media type, and embed details from URL
const detectPlatformAndEmbed = (url = "") => {
  const trimmed = url.trim();
  if (!trimmed) return { platform: "other", mediaType: "article" };

  // Instagram Reel / Post / TV
  const igMatch = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/i,
  );
  if (igMatch) {
    const shortcode = igMatch[1];
    return {
      platform: "instagram",
      mediaType: trimmed.includes("/reel") ? "video" : "post",
      embedId: shortcode,
      embedUrl: `https://www.instagram.com/reel/${shortcode}/embed`,
    };
  }

  // Facebook Video / Watch / Post
  if (/(?:facebook\.com|fb\.watch)/i.test(trimmed)) {
    return {
      platform: "facebook",
      mediaType: "video",
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(trimmed)}&show_text=false&t=0`,
    };
  }

  // LinkedIn Post / Article
  if (/linkedin\.com/i.test(trimmed)) {
    return {
      platform: "linkedin",
      mediaType: "post",
    };
  }

  // YouTube Video / Short
  const ytMatch = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i,
  );
  if (ytMatch) {
    const videoId = ytMatch[1];
    return {
      platform: "youtube",
      mediaType: "video",
      embedId: videoId,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
    };
  }

  // Direct Image URLs
  if (/\.(jpeg|jpg|gif|png|webp|svg)(\?.*)?$/i.test(trimmed)) {
    return {
      platform: "web_image",
      mediaType: "image",
      mediaUrl: trimmed,
    };
  }

  // Default web article/page
  return {
    platform: "web",
    mediaType: "article",
  };
};

// @desc    Scrape OpenGraph metadata from given URL for live preview
// @route   POST /api/captures/scrape
const scrapeMetadata = async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ message: "A valid URL is required" });
    }

    const detected = detectPlatformAndEmbed(url);

    let html = "";
    let finalTitle = "";
    let finalDescription = "";
    let finalImage = "";
    let siteName = "";
    let author = "";

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        },
        signal: AbortSignal.timeout(6000),
      });

      if (response.ok) {
        html = await response.text();

        // Extract <title>
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) finalTitle = titleMatch[1].trim();

        // Extract og:title
        const ogTitleMatch = html.match(
          /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
        ) || html.match(
          /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i,
        );
        if (ogTitleMatch) finalTitle = ogTitleMatch[1].trim();

        // Extract og:description / meta description
        const ogDescMatch = html.match(
          /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
        ) || html.match(
          /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i,
        ) || html.match(
          /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
        );
        if (ogDescMatch) finalDescription = ogDescMatch[1].trim();

        // Extract og:image
        const ogImgMatch = html.match(
          /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
        ) || html.match(
          /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
        );
        if (ogImgMatch) finalImage = ogImgMatch[1].trim();

        // Extract og:site_name
        const ogSiteMatch = html.match(
          /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i,
        );
        if (ogSiteMatch) siteName = ogSiteMatch[1].trim();

        // Extract author
        const authorMatch = html.match(
          /<meta[^>]+name=["']author["'][^>]+content=["']([^"']+)["']/i,
        );
        if (authorMatch) author = authorMatch[1].trim();
      }
    } catch (fetchErr) {
      // If scrape fails or times out, proceed with fallback heuristics
      console.warn("Metadata scrape warning:", fetchErr.message);
    }

    // Heuristics for title fallback
    if (!finalTitle) {
      try {
        const parsed = new URL(url);
        finalTitle = `${parsed.hostname.replace(/^www\./, "")} resource`;
      } catch {
        finalTitle = "Saved Resource";
      }
    }

    return res.json({
      success: true,
      data: {
        url,
        title: finalTitle,
        description: finalDescription,
        thumbnailUrl: finalImage,
        siteName: siteName || detected.platform,
        authorName: author,
        ...detected,
      },
    });
  } catch (error) {
    console.error("Scrape metadata error:", error);
    res.status(500).json({ message: "Failed to scrape metadata" });
  }
};

// @desc    Get all captures for user with category filtering, search, and stats
// @route   GET /api/captures
const getCaptures = async (req, res) => {
  try {
    const { platform, status, remindersOnly, search, sortBy } = req.query;

    const query = { user: req.user._id };

    // Platform filtering
    if (platform && platform !== "all") {
      if (platform === "web_image" || platform === "web") {
        // Raw uploads + web images + generic web unified in one category
        query.platform = { $in: ["web_image", "web"] };
      } else {
        query.platform = platform;
      }
    }

    // Status filtering (default excludes archived unless explicitly requested)
    if (status === "archived") {
      query.status = "archived";
    } else if (status && status !== "all") {
      query.status = status;
    } else {
      query.status = { $ne: "archived" };
    }

    // Reminders-only filter
    if (remindersOnly === "true") {
      query.remindAt = { $ne: null };
    }

    // Keyword search in title, notes, author, raw content, or tags
    if (search && search.trim()) {
      const term = search.trim();
      query.$or = [
        { title: { $regex: term, $options: "i" } },
        { notes: { $regex: term, $options: "i" } },
        { authorName: { $regex: term, $options: "i" } },
        { rawContent: { $regex: term, $options: "i" } },
        { tags: { $in: [new RegExp(term, "i")] } },
      ];
    }

    // Sort definition
    let sortOptions = { createdAt: -1 };
    if (sortBy === "remindAt") {
      sortOptions = { remindAt: 1, createdAt: -1 };
    } else if (sortBy === "priority") {
      // Urgent / high first
      sortOptions = { priority: -1, createdAt: -1 };
    } else if (sortBy === "oldest") {
      sortOptions = { createdAt: 1 };
    }

    const captures = await CapturedResource.find(query)
      .sort(sortOptions)
      .lean();

    // Compute aggregated stats for the user's dashboard/vault view
    const allUserCaptures = await CapturedResource.find({
      user: req.user._id,
      status: { $ne: "archived" },
    })
      .select("platform status remindAt reminderFired")
      .lean();

    const now = new Date();
    const stats = {
      total: allUserCaptures.length,
      inbox: allUserCaptures.filter((c) => c.status === "inbox").length,
      completed: allUserCaptures.filter((c) => c.status === "completed").length,
      remindersDue: allUserCaptures.filter(
        (c) => c.remindAt && new Date(c.remindAt) <= now && !c.reminderFired,
      ).length,
      activeReminders: allUserCaptures.filter(
        (c) => c.remindAt && new Date(c.remindAt) > now,
      ).length,
      platforms: {
        all: allUserCaptures.length,
        whatsapp: allUserCaptures.filter((c) => c.platform === "whatsapp").length,
        instagram: allUserCaptures.filter((c) => c.platform === "instagram").length,
        facebook: allUserCaptures.filter((c) => c.platform === "facebook").length,
        linkedin: allUserCaptures.filter((c) => c.platform === "linkedin").length,
        web_image: allUserCaptures.filter((c) =>
          ["web_image", "web"].includes(c.platform),
        ).length,
      },
    };

    res.json({
      success: true,
      count: captures.length,
      captures,
      stats,
    });
  } catch (error) {
    console.error("Get captures error:", error);
    res.status(500).json({ message: "Failed to retrieve captures" });
  }
};

// @desc    Get single capture by ID
// @route   GET /api/captures/:id
const getCaptureById = async (req, res) => {
  try {
    const capture = await CapturedResource.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!capture) {
      return res.status(404).json({ message: "Capture not found" });
    }

    res.json({ success: true, capture });
  } catch (error) {
    console.error("Get capture error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Create a new captured resource (Link, WhatsApp text, Direct Image file, or Web Image)
// @route   POST /api/captures
const createCapture = async (req, res) => {
  try {
    const {
      sourceUrl,
      title,
      rawContent,
      authorName,
      platform: rawPlatform,
      mediaType: rawMediaType,
      embedId: rawEmbedId,
      embedUrl: rawEmbedUrl,
      mediaUrl: rawMediaUrl,
      thumbnailUrl,
      notes,
      tags,
      priority,
      remindAt,
    } = req.body;

    let platform = rawPlatform;
    let mediaType = rawMediaType || "post";
    let embedId = rawEmbedId || "";
    let embedUrl = rawEmbedUrl || "";
    let mediaUrl = rawMediaUrl || "";
    let mediaGridFsId = null;

    // Handle uploaded file (image file or clipboard paste)
    if (req.file) {
      mediaGridFsId = await uploadToGridFS(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        "image",
      );
      mediaUrl = `/api/images/${mediaGridFsId}`;
      platform = "web_image";
      mediaType = "image";
    }

    // If sourceUrl provided and platform was not manually set, auto-detect platform and embed
    if (sourceUrl && (!platform || platform === "auto")) {
      const detected = detectPlatformAndEmbed(sourceUrl);
      platform = detected.platform;
      mediaType = detected.mediaType;
      embedId = detected.embedId || embedId;
      embedUrl = detected.embedUrl || embedUrl;
      if (detected.mediaUrl) mediaUrl = detected.mediaUrl;
    }

    // Default fallback platform
    if (!platform) {
      platform = rawContent ? "whatsapp" : "other";
    }

    // Format tags
    let parsedTags = [];
    if (Array.isArray(tags)) {
      parsedTags = tags.map((t) => String(t).trim()).filter(Boolean);
    } else if (typeof tags === "string") {
      parsedTags = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }

    // Parse reminder date
    let parsedRemindAt = null;
    if (remindAt) {
      const d = new Date(remindAt);
      if (!isNaN(d.getTime())) {
        parsedRemindAt = d;
      }
    }

    // Heuristic title if empty
    let computedTitle = title?.trim();
    if (!computedTitle) {
      if (platform === "whatsapp") {
        computedTitle = authorName
          ? `WhatsApp from ${authorName}`
          : "WhatsApp Message";
      } else if (platform === "instagram") {
        computedTitle = "Instagram Reel";
      } else if (platform === "facebook") {
        computedTitle = "Facebook Video";
      } else if (platform === "linkedin") {
        computedTitle = "LinkedIn Post";
      } else if (sourceUrl) {
        try {
          const u = new URL(sourceUrl);
          computedTitle = `Saved from ${u.hostname.replace(/^www\./, "")}`;
        } catch {
          computedTitle = "Saved Resource";
        }
      } else {
        computedTitle = "Saved Resource";
      }
    }

    const capture = await CapturedResource.create({
      user: req.user._id,
      platform,
      mediaType,
      title: computedTitle,
      sourceUrl: sourceUrl?.trim() || "",
      rawContent: rawContent?.trim() || "",
      authorName: authorName?.trim() || "",
      embedId,
      embedUrl,
      mediaUrl,
      mediaGridFsId,
      thumbnailUrl: thumbnailUrl || "",
      notes: notes?.trim() || "",
      tags: parsedTags,
      priority: priority || "medium",
      remindAt: parsedRemindAt,
      reminderFired: false,
      status: "inbox",
    });

    res.status(201).json({
      success: true,
      message: "Resource saved to your Vault",
      capture,
    });
  } catch (error) {
    console.error("Create capture error:", error);
    res.status(500).json({ message: "Failed to save resource" });
  }
};

// @desc    Update a capture (notes, tags, priority, remindAt, title, status)
// @route   PUT /api/captures/:id
const updateCapture = async (req, res) => {
  try {
    const capture = await CapturedResource.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!capture) {
      return res.status(404).json({ message: "Capture not found" });
    }

    const {
      title,
      notes,
      tags,
      priority,
      remindAt,
      status,
      authorName,
      rawContent,
    } = req.body;

    if (title !== undefined) capture.title = title.trim();
    if (notes !== undefined) capture.notes = notes.trim();
    if (authorName !== undefined) capture.authorName = authorName.trim();
    if (rawContent !== undefined) capture.rawContent = rawContent.trim();
    if (priority !== undefined) capture.priority = priority;
    if (status !== undefined) capture.status = status;

    if (tags !== undefined) {
      if (Array.isArray(tags)) {
        capture.tags = tags.map((t) => String(t).trim()).filter(Boolean);
      } else if (typeof tags === "string") {
        capture.tags = tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
      }
    }

    if (remindAt !== undefined) {
      if (remindAt) {
        const d = new Date(remindAt);
        if (!isNaN(d.getTime())) {
          capture.remindAt = d;
          // If set to future, re-enable reminder
          if (d > new Date()) {
            capture.reminderFired = false;
          }
        }
      } else {
        capture.remindAt = null;
        capture.reminderFired = false;
      }
    }

    await capture.save();

    res.json({
      success: true,
      message: "Capture updated successfully",
      capture,
    });
  } catch (error) {
    console.error("Update capture error:", error);
    res.status(500).json({ message: "Failed to update capture" });
  }
};

// @desc    Toggle capture status between completed and inbox
// @route   PATCH /api/captures/:id/toggle
const toggleCaptureComplete = async (req, res) => {
  try {
    const capture = await CapturedResource.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!capture) {
      return res.status(404).json({ message: "Capture not found" });
    }

    capture.status = capture.status === "completed" ? "inbox" : "completed";
    if (capture.status === "completed") {
      capture.lastViewedAt = new Date();
    }

    await capture.save();

    res.json({
      success: true,
      message: `Marked as ${capture.status}`,
      capture,
    });
  } catch (error) {
    console.error("Toggle capture complete error:", error);
    res.status(500).json({ message: "Failed to toggle status" });
  }
};

// @desc    Delete capture and cleanup GridFS file if attached
// @route   DELETE /api/captures/:id
const deleteCapture = async (req, res) => {
  try {
    const capture = await CapturedResource.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!capture) {
      return res.status(404).json({ message: "Capture not found" });
    }

    // Clean up GridFS storage if local file was uploaded
    if (capture.mediaGridFsId) {
      try {
        await deleteFromGridFS(capture.mediaGridFsId, "image");
      } catch (gridErr) {
        console.warn("GridFS delete warning:", gridErr.message);
      }
    }

    await CapturedResource.findByIdAndDelete(capture._id);

    res.json({
      success: true,
      message: "Capture deleted from your Vault",
    });
  } catch (error) {
    console.error("Delete capture error:", error);
    res.status(500).json({ message: "Failed to delete capture" });
  }
};

module.exports = {
  scrapeMetadata,
  getCaptures,
  getCaptureById,
  createCapture,
  updateCapture,
  toggleCaptureComplete,
  deleteCapture,
  detectPlatformAndEmbed,
};
