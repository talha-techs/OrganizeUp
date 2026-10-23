const AdminAuditLog = require("../models/AdminAuditLog");

/**
 * Log an administrative action to the immutable audit collection
 * Strictly excludes passwords, tokens, credentials, and raw content bodies.
 */
const logAdminAction = async ({
  adminId,
  adminEmail,
  action,
  targetType,
  targetId = null,
  owner = null,
  reason = "",
  metadata = null,
  req = null,
}) => {
  try {
    const ipAddress = req?.headers
      ? (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "")
          .toString()
          .split(",")[0]
          .trim()
      : (req?.socket?.remoteAddress || "");
    const userAgent = req?.headers ? (req.headers["user-agent"] || "").slice(0, 200) : "";

    // Sanitize metadata to guarantee no secrets, credentials, or raw user bodies are recorded
    let cleanMetadata = null;
    if (metadata && typeof metadata === "object") {
      const sanitized = { ...metadata };
      delete sanitized.password;
      delete sanitized.token;
      delete sanitized.secret;
      delete sanitized.rawContent;
      delete sanitized.body;
      delete sanitized.notes;
      delete sanitized.buffer;
      cleanMetadata = sanitized;
    }

    await AdminAuditLog.create({
      adminId,
      adminEmail: (adminEmail || "").toLowerCase(),
      action,
      targetType,
      targetId: targetId ? targetId.toString() : null,
      owner: owner ? owner.toString() : null,
      reason: reason ? reason.slice(0, 500) : "",
      metadata: cleanMetadata,
      ipAddress,
      userAgent,
    });
  } catch (err) {
    console.error("[auditLogger] Failed to write admin audit log:", err.message);
  }
};

module.exports = { logAdminAction };
