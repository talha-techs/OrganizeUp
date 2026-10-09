const crypto = require("crypto");
const path = require("path");
const {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { getR2Client, isR2Configured, R2_CONFIG } = require("../config/r2");
const {
  uploadToGridFS,
  deleteFromGridFS,
  streamFromGridFS,
  streamAudioFromGridFS,
} = require("../config/gridfs");

/**
 * Determine if R2 should be used for new writes
 */
const isR2Active = () => {
  const driver = (process.env.STORAGE_DRIVER || "gridfs").toLowerCase();
  return driver === "r2" && isR2Configured();
};

/**
 * Sanitize a filename to be safe for S3 object keys
 */
const sanitizeKeyPart = (name = "") => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
};

/**
 * Extract GridFS ObjectId from URLs like "/api/images/<hex24>"
 */
const extractGridFsId = (urlPath) => {
  if (!urlPath || typeof urlPath !== "string") return null;
  const match = urlPath.match(/\/api\/images\/([a-f0-9]{24})/);
  return match ? match[1] : null;
};

/**
 * Upload a file to R2 or GridFS depending on active storage driver
 *
 * @param {Object} params
 * @param {Buffer} params.buffer - Raw binary data
 * @param {string} params.originalname - Original filename
 * @param {string} params.mimetype - MIME content type
 * @param {string} params.folder - Subfolder prefix in R2 (e.g., 'avatars', 'courses', 'pdfs')
 * @param {boolean} params.isPublic - Whether this asset should be placed in the public CDN bucket
 * @param {string} params.bucketType - Fallback GridFS bucket type: 'image' | 'pdf' | 'audio'
 * @returns {Promise<{ provider: 'r2' | 'gridfs', key: string|null, fileId: string|null, url: string }>}
 */
const uploadFile = async ({
  buffer,
  originalname = "file",
  mimetype = "application/octet-stream",
  folder = "uploads",
  isPublic = false,
  bucketType = "image",
}) => {
  if (!buffer) {
    throw new Error("storageService.uploadFile requires a file buffer");
  }

  // 1. Try R2 if active
  if (isR2Active()) {
    const client = getR2Client();
    if (client) {
      const ext = path.extname(originalname) || "";
      const base = sanitizeKeyPart(path.basename(originalname, ext));
      const hash = crypto.randomBytes(6).toString("hex");
      const key = `${folder}/${Date.now()}-${hash}-${base}${ext}`;
      const bucket = isPublic ? R2_CONFIG.publicBucket : R2_CONFIG.privateBucket;

      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: mimetype,
        })
      );

      // Construct public URL if in public bucket and domain is configured
      let url = "";
      if (isPublic) {
        if (R2_CONFIG.publicDomain) {
          url = `${R2_CONFIG.publicDomain}/${key}`;
        } else {
          url = `/api/images/r2/${encodeURIComponent(key)}`;
        }
      } else {
        // For private assets, default to gateway URL that verifies auth
        url = `/api/files/r2/${encodeURIComponent(key)}`;
      }

      return {
        provider: "r2",
        key,
        fileId: null,
        url,
        bucket,
        size: buffer.length,
      };
    }
  }

  // 2. Fallback to GridFS
  const fileId = await uploadToGridFS(buffer, originalname, mimetype, bucketType);
  const url = bucketType === "pdf" ? `/api/books/pdf/${fileId}` : `/api/images/${fileId}`;

  return {
    provider: "gridfs",
    key: null,
    fileId: fileId.toString(),
    url,
    size: buffer.length,
  };
};

/**
 * Delete a file from R2 or GridFS
 *
 * @param {Object} params
 * @param {string} [params.provider] - 'r2' | 'gridfs'
 * @param {string} [params.key] - R2 object key
 * @param {string} [params.fileId] - GridFS ObjectId
 * @param {boolean} [params.isPublic] - Target bucket for R2
 * @param {string} [params.bucketType] - Target bucket for GridFS ('image' | 'pdf' | 'audio')
 */
const deleteFile = async ({
  provider = "gridfs",
  key = null,
  fileId = null,
  isPublic = false,
  bucketType = "image",
}) => {
  try {
    // Delete from R2 if key is specified
    if ((provider === "r2" || key) && isR2Configured()) {
      const client = getR2Client();
      if (client && key) {
        const bucket = isPublic ? R2_CONFIG.publicBucket : R2_CONFIG.privateBucket;
        await client.send(
          new DeleteObjectCommand({
            Bucket: bucket,
            Key: key,
          })
        );
        return;
      }
    }

    // Delete from GridFS if fileId is specified
    const idToDelete = fileId || extractGridFsId(key);
    if (idToDelete) {
      await deleteFromGridFS(idToDelete, bucketType);
    }
  } catch (error) {
    console.warn(`[storageService] deleteFile warning (${provider}):`, error.message);
  }
};

/**
 * Generate a time-limited signed download URL for private R2 assets
 *
 * @param {string} key - R2 object key
 * @param {Object} options
 * @param {number} [options.expiresIn=3600] - Expiry in seconds (default 1 hour)
 * @param {boolean} [options.isPublic=false] - Bucket selector
 * @returns {Promise<string>}
 */
const getPresignedDownloadUrl = async (
  key,
  { expiresIn = 3600, isPublic = false } = {}
) => {
  const client = getR2Client();
  if (!client) {
    throw new Error("R2 Client is not configured. Cannot generate presigned URL.");
  }

  const bucket = isPublic ? R2_CONFIG.publicBucket : R2_CONFIG.privateBucket;
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return await getSignedUrl(client, command, { expiresIn });
};

/**
 * Stream an object from R2 to an Express HTTP response with Range/chunk streaming support
 *
 * @param {Object} params
 * @param {string} params.key - R2 object key
 * @param {Response} params.res - Express response
 * @param {Request} [params.req] - Express request (inspects Range header)
 * @param {string} [params.bucket] - Target bucket (defaults to privateBucket)
 * @param {string} [params.contentType] - Fallback content type
 * @param {string} [params.filename] - Inline disposition filename
 */
const streamFromR2 = async ({
  key,
  res,
  req = null,
  bucket = null,
  contentType = "application/pdf",
  filename = "document.pdf",
}) => {
  const client = getR2Client();
  if (!client) {
    throw new Error("R2 Client is not configured. Cannot stream from R2.");
  }

  const targetBucket = bucket || R2_CONFIG.privateBucket;
  const rangeHeader = req?.headers?.range;

  const commandInput = {
    Bucket: targetBucket,
    Key: key,
  };
  if (rangeHeader) {
    commandInput.Range = rangeHeader;
  }

  const s3Response = await client.send(new GetObjectCommand(commandInput));

  const resolvedContentType = s3Response.ContentType || contentType;
  const isPartial = s3Response.$metadata.httpStatusCode === 206 || Boolean(s3Response.ContentRange);

  res.status(isPartial ? 206 : 200);

  const headers = {
    "Content-Type": resolvedContentType,
    "Content-Disposition": `inline; filename="${filename}"`,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=86400",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Expose-Headers": "Content-Range, Accept-Ranges, Content-Length",
  };

  if (s3Response.ContentLength !== undefined) {
    headers["Content-Length"] = String(s3Response.ContentLength);
  }
  if (s3Response.ContentRange) {
    headers["Content-Range"] = s3Response.ContentRange;
  }
  if (s3Response.ETag) {
    headers["ETag"] = s3Response.ETag;
  }

  res.set(headers);

  if (s3Response.Body) {
    s3Response.Body.pipe(res);
    s3Response.Body.on("error", (err) => {
      console.error("[storageService] R2 stream error:", err);
      if (!res.headersSent) {
        res.status(500).json({ message: "Error streaming file" });
      }
    });
  } else {
    res.end();
  }
};

module.exports = {
  isR2Active,
  uploadFile,
  deleteFile,
  getPresignedDownloadUrl,
  streamFromR2,
  extractGridFsId,
  streamFromGridFS,
  streamAudioFromGridFS,
  R2_CONFIG,
};
