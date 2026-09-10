const CapturedResource = require("../models/CapturedResource");
const { uploadToGridFS, deleteFromGridFS } = require("../config/gridfs");

// Helper to decode HTML/XML entities and strip zero-width chars
const decodeHtmlEntities = (str) => {
  if (!str || typeof str !== "string") return "";
  return str
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      try {
        return String.fromCodePoint(parseInt(hex, 16));
      } catch {
        return "";
      }
    })
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/[\u200B-\u200D\uFEFF\u200E\u200F]/g, "")
    .trim();
};

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

  // Facebook Video / Watch / Post / Reel
  if (/(?:facebook\.com|fb\.watch|fb\.me)/i.test(trimmed)) {
    let cleanUrl = trimmed;
    try {
      const u = new URL(trimmed);
      if (u.pathname.includes("/reel/")) {
        cleanUrl = `${u.origin}${u.pathname}`;
      } else if (u.pathname.includes("/watch") && u.searchParams.has("v")) {
        cleanUrl = `${u.origin}${u.pathname}?v=${u.searchParams.get("v")}`;
      }
    } catch {}
    return {
      platform: "facebook",
      mediaType: "video",
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(cleanUrl)}&show_text=false&t=0`,
    };
  }

  // LinkedIn Post / Article / Video / Shortlink (lnkd.in)
  if (/(?:linkedin\.com|lnkd\.in)/i.test(trimmed)) {
    const liMatch =
      trimmed.match(/(?:ugcPost|share|activity)[-_](\d+)/i) ||
      trimmed.match(/(?:urn:li:(?:ugcPost|share|activity):)(\d+)/i);
    let embedId = "";
    let embedUrl = "";
    if (liMatch) {
      embedId = liMatch[1];
      const type = trimmed.includes("ugcPost")
        ? "ugcPost"
        : trimmed.includes("share")
        ? "share"
        : "activity";
      embedUrl = `https://www.linkedin.com/embed/feed/update/urn:li:${type}:${embedId}`;
    }
    return {
      platform: "linkedin",
      mediaType: "post",
      embedId,
      embedUrl,
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

  // Direct Video URLs (.mp4, .webm, .ogg, .mov, .m4v)
  if (/\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(trimmed)) {
    return {
      platform: "web",
      mediaType: "video",
      mediaUrl: trimmed,
    };
  }

  // Vimeo Video
  const vimeoMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)/i);
  if (vimeoMatch) {
    const videoId = vimeoMatch[1];
    return {
      platform: "web",
      mediaType: "video",
      embedId: videoId,
      embedUrl: `https://player.vimeo.com/video/${videoId}`,
    };
  }

  // Loom Video
  const loomMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.)?loom\.com\/share\/([a-zA-Z0-9]+)/i);
  if (loomMatch) {
    const videoId = loomMatch[1];
    return {
      platform: "web",
      mediaType: "video",
      embedId: videoId,
      embedUrl: `https://www.loom.com/embed/${videoId}`,
    };
  }

  // TikTok Video
  const tiktokMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[^/]+\/video\/(\d+)/i);
  if (tiktokMatch) {
    const videoId = tiktokMatch[1];
    return {
      platform: "web",
      mediaType: "video",
      embedId: videoId,
      embedUrl: `https://www.tiktok.com/embed/v2/${videoId}`,
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

  // Twitter / X (x.com, twitter.com)
  const twitterMatch = trimmed.match(
    /(?:https?:\/\/)?(?:www\.|mobile\.)?(?:twitter\.com|x\.com)\/(?:#!\/)?([a-zA-Z0-9_]+)\/status(?:es)?\/(\d+)/i,
  );
  if (twitterMatch) {
    const username = twitterMatch[1];
    const tweetId = twitterMatch[2];
    return {
      platform: "twitter",
      mediaType: "post",
      embedId: tweetId,
      authorName: `@${username}`,
      embedUrl: `https://platform.twitter.com/embed/Tweet.html?id=${tweetId}&theme=dark`,
    };
  }

  // Generic X.com / Twitter link (profile, etc.)
  if (/(?:twitter\.com|x\.com)/i.test(trimmed)) {
    return {
      platform: "twitter",
      mediaType: "post",
    };
  }

  // Default web article/page
  return {
    platform: "web",
    mediaType: "article",
  };
};

// Internal helper to scrape OpenGraph & social metadata from a URL
const fetchUrlMetadata = async (url) => {
  if (!url || typeof url !== "string") return null;

  try {
    let detected = detectPlatformAndEmbed(url);

    let html = "";
    let finalTitle = "";
    let finalDescription = "";
    let finalImage = "";
    let directVideoUrl = "";
    let directPosterUrl = "";
    let siteName = "";
    let author = "";
    let finalUrl = url;

    // Special scraper for X.com / Twitter links
    if (detected.platform === "twitter" && detected.embedId) {
      try {
        const username = (detected.authorName || "").replace(/^@/, "");
        const vxtwitterUrl = username
          ? `https://api.vxtwitter.com/${username}/status/${detected.embedId}`
          : `https://api.vxtwitter.com/status/${detected.embedId}`;

        const vxRes = await fetch(vxtwitterUrl, {
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(5000),
        });

        if (vxRes.ok) {
          const vxData = await vxRes.json();
          if (vxData && vxData.text) {
            finalTitle = `${vxData.user_name || username} (@${vxData.user_screen_name || username}) on X`;
            finalDescription = vxData.text;
            author = `${vxData.user_name || username} (@${vxData.user_screen_name || username})`;
            siteName = "X (Twitter)";
            if (vxData.media_extended && vxData.media_extended.length > 0) {
              const videoItem = vxData.media_extended.find(
                (m) => m.type === "video" || m.type === "gif",
              );
              if (videoItem) {
                detected.mediaType = "video";
                directVideoUrl = videoItem.url;
                directPosterUrl = videoItem.thumbnail_url || "";
                finalImage = directPosterUrl || directVideoUrl;
              } else {
                finalImage =
                  vxData.media_extended[0].thumbnail_url ||
                  vxData.media_extended[0].url;
              }
            } else if (vxData.mediaURLs && vxData.mediaURLs.length > 0) {
              const mp4Url = vxData.mediaURLs.find((u) => /\.(mp4|webm|m4v)/i.test(u));
              if (mp4Url) {
                detected.mediaType = "video";
                directVideoUrl = mp4Url;
              }
              finalImage = vxData.mediaURLs[0];
            } else if (vxData.user_profile_image_url) {
              finalImage = vxData.user_profile_image_url;
            }
          }
        }
      } catch (twErr) {
        console.warn("vxtwitter fetch error, falling back to oEmbed:", twErr.message);
      }

      // Fallback to publish.twitter.com/oembed if description is still empty
      if (!finalDescription) {
        try {
          const oembedRes = await fetch(
            `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`,
            {
              headers: { "User-Agent": "Mozilla/5.0" },
              signal: AbortSignal.timeout(4000),
            },
          );
          if (oembedRes.ok) {
            const oembedData = await oembedRes.json();
            if (oembedData) {
              if (oembedData.author_name && !author) author = oembedData.author_name;
              if (oembedData.author_name && !finalTitle) finalTitle = `${oembedData.author_name} on X`;
              siteName = "X (Twitter)";
              if (oembedData.html) {
                const textMatch = oembedData.html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
                if (textMatch) {
                  finalDescription = textMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
                }
              }
            }
          }
        } catch (oembedErr) {
          console.warn("oembed fetch error:", oembedErr.message);
        }
      }
    }

    // Use facebookexternalhit or linkedin-friendly UA to prevent authwalls on social links
    const isSocialLink = /(?:linkedin\.com|lnkd\.in|facebook\.com|fb\.watch|fb\.me|instagram\.com)/i.test(url);
    const userAgent = isSocialLink
      ? "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)"
      : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": userAgent,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(7000),
      });

      if (response.url) {
        finalUrl = response.url;
      }

      if (response.ok) {
        html = await response.text();

        // Extract <title>
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) finalTitle = titleMatch[1].trim();

        // Extract og:title
        const ogTitleMatch =
          html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
          html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
        if (ogTitleMatch) finalTitle = ogTitleMatch[1].trim();

        // Extract og:description / meta description
        const ogDescMatch =
          html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
          html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i) ||
          html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
        if (ogDescMatch) finalDescription = ogDescMatch[1].trim();

        // Extract og:image
        const ogImgMatch =
          html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
          html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
        if (ogImgMatch) finalImage = ogImgMatch[1].trim();

        // Extract og:video / og:video:url / og:video:secure_url / twitter:player:stream
        const ogVideoMatch =
          html.match(/<meta[^>]+property=["']og:video(?:(?::secure)?_url)?["'][^>]+content=["']([^"']+)["']/i) ||
          html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:video(?:(?::secure)?_url)?["']/i) ||
          html.match(/<meta[^>]+name=["']twitter:player:stream["'][^>]+content=["']([^"']+)["']/i);
        if (ogVideoMatch && !directVideoUrl) {
          const ogVid = ogVideoMatch[1].trim().replace(/&amp;/g, "&");
          if (/\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(ogVid) || ogVid.includes("video")) {
            directVideoUrl = ogVid;
            detected.mediaType = "video";
            if (!directPosterUrl && finalImage) directPosterUrl = finalImage;
          }
        }

        // Extract twitter:player or og:video embed iframe
        const ogPlayerMatch =
          html.match(/<meta[^>]+name=["']twitter:player["'][^>]+content=["']([^"']+)["']/i) ||
          html.match(/<meta[^>]+property=["']twitter:player["'][^>]+content=["']([^"']+)["']/i);
        if (ogPlayerMatch && !detected.embedUrl && !directVideoUrl) {
          const playerUrl = ogPlayerMatch[1].trim().replace(/&amp;/g, "&");
          if (/^https?:\/\//i.test(playerUrl)) {
            detected.embedUrl = playerUrl;
            detected.mediaType = "video";
          }
        }

        // Extract HTML5 <video><source src="..."> if available
        if (!directVideoUrl) {
          const videoTagMatch =
            html.match(/<video[^>]*>[\s\S]*?<source[^>]+src=["']([^"']+\.(?:mp4|webm|ogg|mov|m4v)[^"']*)["']/i) ||
            html.match(/<video[^>]+src=["']([^"']+\.(?:mp4|webm|ogg|mov|m4v)[^"']*)["']/i);
          if (videoTagMatch) {
            directVideoUrl = videoTagMatch[1].trim().replace(/&amp;/g, "&");
            detected.mediaType = "video";
            if (!directPosterUrl && finalImage) directPosterUrl = finalImage;
          }
        }

        // Extract og:url if present
        const ogUrlMatch =
          html.match(/<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i) ||
          html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:url["']/i);
        const ogUrl = ogUrlMatch ? ogUrlMatch[1].trim() : "";

        // Re-detect on redirected or og:url for shortlinks (like lnkd.in)
        if (ogUrl && ogUrl !== url) {
          const reDetected = detectPlatformAndEmbed(ogUrl);
          if (reDetected.platform !== "other" && reDetected.platform !== "web") {
            detected = { ...detected, ...reDetected };
          }
        }
        if (finalUrl !== url) {
          const reDetected = detectPlatformAndEmbed(finalUrl);
          if (reDetected.platform !== "other" && reDetected.platform !== "web") {
            detected = { ...detected, ...reDetected };
          }
        }

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

        // Heuristics for author on LinkedIn
        if (!author && detected.platform === "linkedin") {
          if (finalTitle.includes("|")) {
            const parts = finalTitle.split("|");
            author = parts[parts.length - 1].trim();
          } else if (finalTitle.includes("on LinkedIn:")) {
            author = finalTitle.split("on LinkedIn:")[0].trim();
          }
        }

        // Facebook specific author, title and canonical embed handling
        if (detected.platform === "facebook" || /(?:facebook\.com|fb\.watch|fb\.me)/i.test(url)) {
          const canonicalFb = ogUrl || finalUrl || url;
          let cleanFbUrl = canonicalFb;
          try {
            const u = new URL(canonicalFb);
            if (u.pathname.includes("/reel/")) {
              cleanFbUrl = `${u.origin}${u.pathname}`;
            } else if (u.pathname.includes("/watch") && u.searchParams.has("v")) {
              cleanFbUrl = `${u.origin}${u.pathname}?v=${u.searchParams.get("v")}`;
            }
          } catch {}

          detected.embedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(cleanFbUrl)}&show_text=false&t=0`;
          detected.platform = "facebook";
          detected.mediaType = "video";

          finalTitle = decodeHtmlEntities(finalTitle);
          finalDescription = decodeHtmlEntities(finalDescription);

          if (finalTitle.includes(" | ")) {
            const parts = finalTitle.split(" | ").map((p) => p.trim()).filter(Boolean);
            if (parts.length > 1) {
              if (!author) author = parts[parts.length - 1];
              const nonStatsPart =
                parts
                  .slice(0, -1)
                  .find(
                    (p) =>
                      !p.includes("ویوز") &&
                      !p.includes("views") &&
                      !p.includes("ردعمل") &&
                      !p.includes("reactions"),
                  ) || parts[0];
              const lines = nonStatsPart
                .split(/\r?\n/)
                .map((l) => l.trim())
                .filter(Boolean);
              finalTitle = lines[0] || nonStatsPart;
            }
          }
        }
      }
    } catch (fetchErr) {
      console.warn("Metadata scrape warning:", fetchErr.message);
    }

    // Clean up XML / HTML entities in image URL (e.g. &amp; -> &)
    if (finalImage) {
      finalImage = finalImage.replace(/&amp;/g, "&");
    }
    if (directPosterUrl) {
      directPosterUrl = directPosterUrl.replace(/&amp;/g, "&");
    }
    if (directVideoUrl) {
      directVideoUrl = directVideoUrl.replace(/&amp;/g, "&");
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

    finalTitle = decodeHtmlEntities(finalTitle);
    finalDescription = decodeHtmlEntities(finalDescription);

    const resolvedMediaType =
      detected.mediaType === "video" || directVideoUrl || detected.embedUrl
        ? "video"
        : detected.mediaType || "article";

    return {
      url,
      resolvedUrl: finalUrl,
      title: finalTitle,
      description: finalDescription,
      rawContent: finalDescription,
      thumbnailUrl: directPosterUrl || finalImage,
      mediaUrl: directVideoUrl || detected.mediaUrl || finalImage,
      siteName: siteName || detected.platform,
      authorName: author,
      ...detected,
      mediaType: resolvedMediaType,
    };
  } catch (error) {
    console.error("Fetch URL metadata error:", error);
    return null;
  }
};

// @desc    Scrape OpenGraph metadata from given URL for live preview
// @route   POST /api/captures/scrape
const scrapeMetadata = async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ message: "A valid URL is required" });
    }

    const data = await fetchUrlMetadata(url);
    return res.json({
      success: true,
      data,
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
        twitter: allUserCaptures.filter((c) => c.platform === "twitter").length,
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
      thumbnailUrl: rawThumbnailUrl,
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
    let thumbnailUrl = rawThumbnailUrl || "";
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

    // Force LinkedIn platform if sourceUrl matches LinkedIn or lnkd.in
    if (sourceUrl && /(?:linkedin\.com|lnkd\.in)/i.test(sourceUrl)) {
      platform = "linkedin";
      const detected = detectPlatformAndEmbed(sourceUrl);
      if (detected.embedId && !embedId) embedId = detected.embedId;
      if (detected.embedUrl && !embedUrl) embedUrl = detected.embedUrl;
    }

    // Force Twitter/X platform if sourceUrl matches twitter.com or x.com
    if (sourceUrl && /(?:twitter\.com|x\.com)/i.test(sourceUrl)) {
      platform = "twitter";
      const detected = detectPlatformAndEmbed(sourceUrl);
      if (detected.embedId && !embedId) embedId = detected.embedId;
      if (detected.embedUrl && !embedUrl) embedUrl = detected.embedUrl;
      if (detected.authorName && !authorName) authorName = detected.authorName;
    }

    // Force Facebook platform if sourceUrl matches facebook.com, fb.watch, or fb.me
    if (sourceUrl && /(?:facebook\.com|fb\.watch|fb\.me)/i.test(sourceUrl)) {
      platform = "facebook";
      mediaType = "video";
      const detected = detectPlatformAndEmbed(sourceUrl);
      if (detected.embedUrl && !embedUrl) embedUrl = detected.embedUrl;
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

    // Auto-enrich metadata from sourceUrl if thumbnail/author/content missing, or for Facebook/LinkedIn
    if (sourceUrl && (!thumbnailUrl || !authorName || !rawContent || platform === "facebook" || platform === "linkedin")) {
      try {
        const meta = await fetchUrlMetadata(sourceUrl);
        if (meta) {
          if (!thumbnailUrl && meta.thumbnailUrl) thumbnailUrl = meta.thumbnailUrl;
          if (!mediaUrl && meta.mediaUrl) mediaUrl = meta.mediaUrl;
          if (!authorName && meta.authorName) authorName = meta.authorName;
          if (!rawContent && (meta.rawContent || meta.description)) rawContent = meta.rawContent || meta.description;
          if (!title || title === "Saved Link" || title === "Saved Resource" || title === "Facebook Video" || title === "LinkedIn Post") {
            if (meta.title) title = meta.title;
          }
          if (platform === "facebook" && meta.embedUrl) {
            embedUrl = meta.embedUrl;
          }
          if (!embedId && meta.embedId) embedId = meta.embedId;
        }
      } catch (autoErr) {
        console.warn("createCapture auto-scrape error:", autoErr.message);
      }
    }

    // Auto-promote mediaType to "video" if video stream, video URL, or video platform detected
    const isVideoFile =
      /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(mediaUrl) ||
      /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(sourceUrl) ||
      (typeof mediaUrl === "string" && mediaUrl.includes("video.twimg.com"));

    if (isVideoFile || ["youtube"].includes(platform) || rawMediaType === "video") {
      mediaType = "video";
    }

    // Ensure mediaUrl and thumbnailUrl are synced and unescaped
    if (typeof mediaUrl === "string") mediaUrl = mediaUrl.replace(/&amp;/g, "&");
    if (typeof thumbnailUrl === "string") thumbnailUrl = thumbnailUrl.replace(/&amp;/g, "&");

    // Clean up if an mp4 file was passed as thumbnailUrl
    if (thumbnailUrl && /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(thumbnailUrl)) {
      if (!mediaUrl) mediaUrl = thumbnailUrl;
      thumbnailUrl = "";
    }

    if (!mediaUrl && thumbnailUrl) {
      mediaUrl = thumbnailUrl;
    }
    if (!thumbnailUrl && mediaUrl && !isVideoFile) {
      thumbnailUrl = mediaUrl;
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
      mediaUrl,
      thumbnailUrl,
      mediaType: updateMediaType,
      embedUrl,
    } = req.body;

    if (title !== undefined) capture.title = title.trim();
    if (notes !== undefined) capture.notes = notes.trim();
    if (authorName !== undefined) capture.authorName = authorName.trim();
    if (rawContent !== undefined) capture.rawContent = rawContent.trim();
    if (priority !== undefined) capture.priority = priority;
    if (status !== undefined) capture.status = status;
    if (mediaUrl !== undefined) capture.mediaUrl = mediaUrl;
    if (thumbnailUrl !== undefined) capture.thumbnailUrl = thumbnailUrl;
    if (updateMediaType !== undefined) capture.mediaType = updateMediaType;
    if (embedUrl !== undefined) capture.embedUrl = embedUrl;

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

// @desc    Proxy video stream with Range support to bypass CDN hotlinking / 403 referer blocks
// @route   GET /api/captures/stream
const streamVideo = async (req, res) => {
  try {
    const { url } = req.query;
    if (!url || typeof url !== "string" || !/^https?:\/\//i.test(url)) {
      return res.status(400).send("A valid video URL is required");
    }

    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: "*/*",
      "Accept-Encoding": "identity",
    };

    if (req.headers.range) {
      headers["Range"] = req.headers.range;
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok && response.status !== 206) {
      return res
        .status(response.status)
        .send(`Failed to stream video: ${response.statusText}`);
    }

    const resHeaders = {
      "Content-Type": response.headers.get("content-type") || "video/mp4",
      "Accept-Ranges": "bytes",
      "Access-Control-Allow-Origin": "*",
    };

    if (response.headers.get("content-length")) {
      resHeaders["Content-Length"] = response.headers.get("content-length");
    }
    if (response.headers.get("content-range")) {
      resHeaders["Content-Range"] = response.headers.get("content-range");
    }

    res.writeHead(response.status, resHeaders);

    const { Readable } = require("stream");
    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body);
      nodeStream.pipe(res);
      req.on("close", () => {
        nodeStream.destroy();
      });
    } else {
      res.end();
    }
  } catch (err) {
    console.error("Stream video error:", err.message);
    if (!res.headersSent) {
      res.status(500).send("Video streaming error");
    }
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
  streamVideo,
};

