const mongoose = require("mongoose");
const { GridFSBucket } = require("mongodb");
const { Readable } = require("stream");

let pdfBucket;
let imageBucket;

/**
 * Initialize GridFS buckets (call after mongoose connects)
 */
const initGridFS = () => {
  const db = mongoose.connection.db;
  pdfBucket = new GridFSBucket(db, { bucketName: "pdfs" });
  imageBucket = new GridFSBucket(db, { bucketName: "images" });
  console.log("📁 GridFS buckets initialized (pdfs + images)");
};

/**
 * Get a bucket by type
 */
const getBucket = (type = "pdf") => {
  if (type === "image") {
    if (!imageBucket) initGridFS();
    return imageBucket;
  }
  if (!pdfBucket) initGridFS();
  return pdfBucket;
};

/**
 * Upload a buffer to GridFS
 * @param {Buffer} buffer - file buffer from multer
 * @param {string} filename - original filename
 * @param {string} contentType - MIME type
 * @param {string} bucketType - "pdf" or "image"
 * @returns {Promise<ObjectId>} - the stored file's _id
 */
const uploadToGridFS = (buffer, filename, contentType, bucketType = "pdf") => {
  return new Promise((resolve, reject) => {
    const b = getBucket(bucketType);
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);

    const uploadStream = b.openUploadStream(filename, {
      contentType,
    });

    readable.pipe(uploadStream);

    uploadStream.on("finish", () => {
      resolve(uploadStream.id);
    });

    uploadStream.on("error", (err) => {
      reject(err);
    });
  });
};

/**
 * Stream a file from GridFS to an HTTP response
 * @param {ObjectId|string} fileId
 * @param {Response} res - Express response
 * @param {string} bucketType - "pdf" or "image"
 */
const streamFromGridFS = async (fileId, res, bucketType = "pdf") => {
  const b = getBucket(bucketType);
  const _id = new mongoose.Types.ObjectId(fileId);

  const files = await b.find({ _id }).toArray();
  if (!files || files.length === 0) {
    return res.status(404).json({ message: "File not found" });
  }

  const file = files[0];
  res.set("Content-Type", file.contentType || "application/octet-stream");
  res.set("Content-Disposition", "inline");
  res.set("Content-Length", file.length);
  res.set("Accept-Ranges", "bytes");
  res.set("Cache-Control", "public, max-age=86400");

  const downloadStream = b.openDownloadStream(_id);
  downloadStream.pipe(res);

  downloadStream.on("error", (err) => {
    console.error("GridFS stream error:", err);
    res.status(500).json({ message: "Error streaming file" });
  });
};

/**
 * Delete a file from GridFS
 * @param {ObjectId|string} fileId
 * @param {string} bucketType - "pdf" or "image"
 */
const deleteFromGridFS = async (fileId, bucketType = "pdf") => {
  try {
    const b = getBucket(bucketType);
    const _id = new mongoose.Types.ObjectId(fileId);
    await b.delete(_id);
  } catch (err) {
    console.error("GridFS delete error:", err);
  }
};

module.exports = {
  initGridFS,
  getBucket,
  uploadToGridFS,
  streamFromGridFS,
  deleteFromGridFS,
};
