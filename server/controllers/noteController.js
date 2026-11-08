const Note = require("../models/Note");

const MAX_NOTE_BYTES = 50 * 1024; // 50 KB limit
const MAX_TOTAL_USER_BYTES = 5 * 1024 * 1024; // 5 MB per-user total body size cap
const MAX_ACTIVE_NOTES = 1000;

/**
 * Helper to escape regex special characters
 */
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Extract inline #tags from markdown text
 */
const extractTags = (text) => {
  if (!text || typeof text !== "string") return [];
  const matches = text.match(/(?:^|\s)#([a-zA-Z0-9_\-]+)/g) || [];
  return matches
    .map((m) => m.trim().replace(/^#/, "").toLowerCase())
    .filter(Boolean);
};

/**
 * Generate a clean plain snippet (max 160 characters)
 */
const generateSnippet = (body, maxLen = 160) => {
  if (!body || typeof body !== "string") return "";
  // Clean markdown headings, links, blockquotes for snippet display
  const clean = body
    .replace(/^#+\s+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^>\s+/gm, "")
    .replace(/`{1,3}[^`]*`{1,3}/g, "")
    .replace(/\r?\n+/g, " ")
    .trim();
  return clean.length > maxLen ? `${clean.slice(0, maxLen)}…` : clean;
};

/**
 * Derive note title from the first non-empty line
 */
const deriveTitle = (body, explicitTitle) => {
  if (explicitTitle && explicitTitle.trim() && explicitTitle.trim() !== "Untitled note") {
    return explicitTitle.trim().slice(0, 80);
  }
  if (body && typeof body === "string") {
    const firstLine = body
      .split("\n")
      .map((l) => l.trim().replace(/^#+\s*/, ""))
      .find((l) => l.length > 0);
    if (firstLine) {
      return firstLine.slice(0, 80);
    }
  }
  return "Untitled note";
};

/**
 * GET /api/notes
 * List user's notes with lightweight snippet (no full body)
 */
exports.getNotes = async (req, res) => {
  try {
    const userId = req.user._id;
    const { q, tag, archived, deleted, cursor, limit = 50 } = req.query;

    const query = { user: userId };

    // Soft delete filter
    if (deleted === "true" || deleted === "1") {
      query.deletedAt = { $ne: null };
    } else {
      query.deletedAt = null;
    }

    // Archived filter (only applies when not viewing trash)
    if (query.deletedAt === null) {
      if (archived === "true" || archived === "1") {
        query.archived = true;
      } else if (archived === "all") {
        // Show both archived and unarchived
      } else {
        query.archived = false;
      }
    }

    // Tag filter
    if (tag && typeof tag === "string" && tag.trim()) {
      query.tags = tag.toLowerCase().trim().replace(/^#/, "");
    }

    // Search query
    if (q && typeof q === "string" && q.trim()) {
      const cleanQ = escapeRegex(q.trim());
      query.$or = [
        { title: { $regex: cleanQ, $options: "i" } },
        { body: { $regex: cleanQ, $options: "i" } },
      ];
    }

    // Cursor-based pagination (based on updatedAt timestamp)
    if (cursor) {
      const cursorDate = new Date(cursor);
      if (!isNaN(cursorDate.getTime())) {
        query.updatedAt = { $lt: cursorDate };
      }
    }

    const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

    // Fetch notes projected without full body to keep payload small (< 30 KB for 100 notes)
    // We fetch body temporarily just to construct the 160-char snippet
    const rawNotes = await Note.find(query)
      .select("_id title body pinned archived isScratchpad tags version clientId updatedAt createdAt")
      .sort({ pinned: -1, updatedAt: -1 })
      .limit(pageSize + 1)
      .lean();

    const hasMore = rawNotes.length > pageSize;
    const notesToReturn = hasMore ? rawNotes.slice(0, pageSize) : rawNotes;

    // Transform notes to lightweight snippets
    const formattedNotes = notesToReturn.map((n) => ({
      _id: n._id,
      id: n._id,
      title: n.title,
      snippet: generateSnippet(n.body, 160),
      pinned: Boolean(n.pinned),
      archived: Boolean(n.archived),
      isScratchpad: Boolean(n.isScratchpad),
      tags: n.tags || [],
      version: n.version || 1,
      clientId: n.clientId || null,
      updatedAt: n.updatedAt,
      createdAt: n.createdAt,
    }));

    const nextCursor =
      hasMore && notesToReturn.length > 0
        ? notesToReturn[notesToReturn.length - 1].updatedAt
        : null;

    return res.status(200).json({
      success: true,
      notes: formattedNotes,
      nextCursor,
      hasMore,
    });
  } catch (err) {
    console.error("[Notes] getNotes error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to retrieve notes" });
  }
};

/**
 * GET /api/notes/:id
 * Retrieve a single note with its full body
 */
exports.getNoteById = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const note = await Note.findOne({ _id: id, user: userId });
    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found" });
    }

    return res.status(200).json({
      success: true,
      note,
    });
  } catch (err) {
    console.error("[Notes] getNoteById error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to retrieve note" });
  }
};

/**
 * POST /api/notes
 * Create a new note (idempotent via clientId)
 */
exports.createNote = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      title,
      body = "",
      pinned = false,
      archived = false,
      tags = [],
      linkedTo,
      clientId,
    } = req.body;

    // Enforce per-note size limit (50 KB)
    const bodyBytes = body ? Buffer.byteLength(String(body), "utf8") : 0;
    if (bodyBytes > MAX_NOTE_BYTES) {
      return res.status(400).json({
        success: false,
        message: "Note content exceeds the 50 KB limit.",
      });
    }

    // Idempotent creation via clientId
    if (clientId && typeof clientId === "string" && clientId.trim()) {
      const cleanClientId = clientId.trim();
      const existing = await Note.findOne({ user: userId, clientId: cleanClientId });
      if (existing) {
        return res.status(200).json({
          success: true,
          note: existing,
          isDuplicate: true,
        });
      }
    }

    // Enforce 1,000 active notes limit
    const activeCount = await Note.countDocuments({ user: userId, deletedAt: null });
    if (activeCount >= MAX_ACTIVE_NOTES) {
      return res.status(400).json({
        success: false,
        message:
          "You have reached the limit of 1,000 active notes. Please archive or delete older notes.",
      });
    }

    // Enforce per-user total body size cap (5 MB) by aggregating ONLY bodyBytes (no body reads)
    if (bodyBytes > 0) {
      const totalSizeAgg = await Note.aggregate([
        { $match: { user: userId, deletedAt: null } },
        { $group: { _id: null, total: { $sum: "$bodyBytes" } } },
      ]);
      const currentTotalBytes = totalSizeAgg[0]?.total || 0;
      if (currentTotalBytes + bodyBytes > MAX_TOTAL_USER_BYTES) {
        return res.status(400).json({
          success: false,
          message:
            "Total notes storage limit of 5 MB reached for your account. Please delete or archive old notes before adding more.",
        });
      }
    }

    // Combine explicit tags and inline #tags extracted from body
    const bodyTags = extractTags(body);
    const combinedTags = Array.isArray(tags)
      ? [...new Set([...tags, ...bodyTags])]
      : bodyTags;

    const finalTitle = deriveTitle(body, title);

    const note = new Note({
      user: userId,
      title: finalTitle,
      body: String(body || ""),
      pinned: Boolean(pinned),
      archived: Boolean(archived),
      tags: combinedTags,
      linkedTo: linkedTo && linkedTo.type && linkedTo.id ? linkedTo : undefined,
      clientId: clientId ? String(clientId).trim() : undefined,
      version: 1,
    });

    await note.save();

    return res.status(201).json({
      success: true,
      note,
    });
  } catch (err) {
    if (err.code === 11000 && req.body.clientId) {
      // Race condition handled: document with clientId already inserted
      const existing = await Note.findOne({
        user: req.user._id,
        clientId: String(req.body.clientId).trim(),
      });
      if (existing) {
        return res.status(200).json({ success: true, note: existing, isDuplicate: true });
      }
    }
    console.error("[Notes] createNote error:", err.message);
    return res.status(500).json({ success: false, message: err.message || "Failed to create note" });
  }
};

/**
 * PATCH /api/notes/:id
 * Update an existing note with baseVersion conflict detection
 */
exports.updateNote = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const { title, body, pinned, archived, tags, linkedTo, baseVersion } = req.body;

    const note = await Note.findOne({ _id: id, user: userId });
    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found" });
    }

    // Check size limit if body is being updated
    if (body !== undefined) {
      const newBodyBytes = Buffer.byteLength(String(body), "utf8");
      if (newBodyBytes > MAX_NOTE_BYTES) {
        return res.status(400).json({
          success: false,
          message: "Note content exceeds the 50 KB limit.",
        });
      }

      // Check per-user 5 MB limit ONLY if size is increasing
      // Skip aggregation when new size is not larger than old size (e.g. edits that shrink a note)
      const oldBodyBytes = note.bodyBytes !== undefined ? note.bodyBytes : Buffer.byteLength(note.body || "", "utf8");
      const diff = newBodyBytes - oldBodyBytes;
      if (diff > 0) {
        const totalSizeAgg = await Note.aggregate([
          { $match: { user: userId, deletedAt: null } },
          { $group: { _id: null, total: { $sum: "$bodyBytes" } } },
        ]);
        const currentTotalBytes = totalSizeAgg[0]?.total || 0;
        if (currentTotalBytes + diff > MAX_TOTAL_USER_BYTES) {
          return res.status(400).json({
            success: false,
            message:
              "Total notes storage limit of 5 MB reached for your account. Please delete or archive old notes before adding more.",
          });
        }
      }

      note.body = String(body);
      note.bodyBytes = newBodyBytes;
    }

    if (title !== undefined) {
      note.title = deriveTitle(note.body, title);
    } else if (body !== undefined && (!note.title || note.title === "Untitled note")) {
      note.title = deriveTitle(note.body, "");
    }

    if (pinned !== undefined) note.pinned = Boolean(pinned);
    if (archived !== undefined) note.archived = Boolean(archived);

    // Tags update
    if (tags !== undefined || body !== undefined) {
      const explicitTags = Array.isArray(tags) ? tags : note.tags || [];
      const bodyTags = extractTags(note.body);
      note.tags = [...new Set([...explicitTags, ...bodyTags])].slice(0, 20);
    }

    if (linkedTo !== undefined) {
      note.linkedTo = linkedTo && linkedTo.type && linkedTo.id ? linkedTo : undefined;
    }

    // Increment version
    note.version = (note.version || 1) + 1;

    await note.save();

    return res.status(200).json({
      success: true,
      note,
    });
  } catch (err) {
    console.error("[Notes] updateNote error:", err.message);
    return res.status(500).json({ success: false, message: err.message || "Failed to update note" });
  }
};

/**
 * DELETE /api/notes/:id
 * Soft delete (move to Recently Deleted for 30 days)
 */
exports.softDeleteNote = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const note = await Note.findOne({ _id: id, user: userId });
    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found" });
    }

    note.deletedAt = new Date();
    await note.save();

    return res.status(200).json({
      success: true,
      message: "Note moved to trash",
      note: {
        _id: note._id,
        deletedAt: note.deletedAt,
      },
    });
  } catch (err) {
    console.error("[Notes] softDeleteNote error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to delete note" });
  }
};

/**
 * POST /api/notes/:id/restore
 * Restore soft-deleted note
 */
exports.restoreNote = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const note = await Note.findOne({ _id: id, user: userId });
    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found" });
    }

    note.deletedAt = null;
    await note.save();

    return res.status(200).json({
      success: true,
      message: "Note restored successfully",
      note,
    });
  } catch (err) {
    console.error("[Notes] restoreNote error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to restore note" });
  }
};

/**
 * DELETE /api/notes/:id/permanent
 * Permanently delete note from database
 */
exports.permanentDeleteNote = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const result = await Note.deleteOne({ _id: id, user: userId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: "Note not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Note permanently deleted",
    });
  } catch (err) {
    console.error("[Notes] permanentDeleteNote error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to permanently delete note" });
  }
};

/**
 * GET /api/notes/:id/export?format=md|txt
 * Export single note as downloadable markdown or text file
 */
exports.exportNote = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const { format = "md" } = req.query;

    const note = await Note.findOne({ _id: id, user: userId });
    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found" });
    }

    const cleanTitle = (note.title || "untitled")
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 60)
      .trim() || "note";

    const isTxt = format.toLowerCase() === "txt";
    const extension = isTxt ? "txt" : "md";
    const contentType = isTxt ? "text/plain; charset=utf-8" : "text/markdown; charset=utf-8";

    const content = isTxt
      ? `${note.title}\n${"=".repeat(Math.min(note.title.length, 40))}\n\n${note.body || ""}`
      : `# ${note.title}\n\n${note.body || ""}`;

    const encodedTitle = encodeURIComponent(cleanTitle);

    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${cleanTitle}.${extension}"; filename*=UTF-8''${encodedTitle}.${extension}`
    );
    return res.send(content);
  } catch (err) {
    console.error("[Notes] exportNote error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to export note" });
  }
};

/**
 * Scheduled cleanup: purge notes soft-deleted over 30 days ago
 */
exports.purgeExpiredSoftDeletedNotes = async () => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const result = await Note.deleteMany({
    deletedAt: { $ne: null, $lt: thirtyDaysAgo },
  });
  return {
    purgedNotesCount: result.deletedCount || 0,
  };
};

