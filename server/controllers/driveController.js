const { google } = require("googleapis");
const Book = require("../models/Book");

const VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/x-msvideo",
  "video/quicktime",
  "video/x-matroska",
  "video/webm",
  "video/x-flv",
  "video/mp2t",
  "video/3gpp",
  "video/x-ms-wmv",
  "video/mpeg",
];

// All supported file MIME types for the universal scanner
const FILE_TYPE_MAP = {
  "application/pdf": "pdf",
  "text/html": "html",
  "text/plain": "text",
  "text/css": "text",
  "text/javascript": "text",
  "application/javascript": "text",
  "application/json": "text",
  "text/markdown": "text",
  "text/csv": "text",
  "text/xml": "text",
  "application/xml": "text",
  "image/png": "image",
  "image/jpeg": "image",
  "image/gif": "image",
  "image/webp": "image",
  "image/svg+xml": "image",
  "application/vnd.google-apps.document": "gdoc",
  "application/vnd.google-apps.spreadsheet": "gsheet",
  "application/vnd.google-apps.presentation": "gslides",
  "application/vnd.google-apps.folder": "folder",
};

// Add video types to the map
VIDEO_MIME_TYPES.forEach((m) => {
  FILE_TYPE_MAP[m] = "video";
});

function getDrive() {
  return google.drive({
    version: "v3",
    auth: process.env.GOOGLE_API_KEY,
  });
}

/**
 * Extract folder ID from various Google Drive URL formats
 */
function extractFolderId(input) {
  const trimmed = input.trim();

  // Already a raw ID (no slashes, no URL)
  if (/^[a-zA-Z0-9_-]+$/.test(trimmed)) return trimmed;

  // https://drive.google.com/drive/folders/FOLDER_ID
  const folderMatch = trimmed.match(
    /drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]+)/,
  );
  if (folderMatch) return folderMatch[1];

  // https://drive.google.com/open?id=FOLDER_ID
  const openMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (openMatch) return openMatch[1];

  return null;
}

/**
 * Recursively scan a Google Drive folder and return tree structure
 */
async function scanFolderRecursive(drive, folderId, path = "") {
  let allItems = [];
  let pageToken = null;

  do {
    const listRes = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType, size)",
      orderBy: "name",
      pageSize: 1000,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      ...(pageToken && { pageToken }),
    });

    const files = listRes.data.files || [];

    for (const file of files) {
      const filePath = path ? `${path}/${file.name}` : file.name;
      const fileType =
        FILE_TYPE_MAP[file.mimeType] ||
        (file.mimeType?.startsWith("video/") ? "video" : "other");

      if (file.mimeType === "application/vnd.google-apps.folder") {
        // It's a subfolder — scan recursively
        const children = await scanFolderRecursive(drive, file.id, filePath);
        allItems.push({
          driveFileId: file.id,
          name: file.name,
          path: filePath,
          mimeType: file.mimeType,
          fileType: "folder",
          size: null,
          children,
        });
      } else {
        allItems.push({
          driveFileId: file.id,
          name: file.name,
          path: filePath,
          mimeType: file.mimeType,
          fileType,
          size: file.size ? parseInt(file.size) : null,
        });
      }
    }

    pageToken = listRes.data.nextPageToken;
  } while (pageToken);

  return allItems.sort((a, b) => {
    // Folders first, then files alphabetically
    if (a.fileType === "folder" && b.fileType !== "folder") return -1;
    if (a.fileType !== "folder" && b.fileType === "folder") return 1;
    return a.name.localeCompare(b.name, undefined, { numeric: true });
  });
}

// @desc    Scan a public Google Drive folder for video files (legacy books)
// @route   POST /api/books/scan-drive
const scanDriveFolder = async (req, res) => {
  try {
    const { driveLink } = req.body;

    if (!driveLink) {
      return res.status(400).json({ message: "Drive link is required" });
    }

    const folderId = extractFolderId(driveLink);
    if (!folderId) {
      return res.status(400).json({ message: "Invalid Google Drive link" });
    }

    // Strictly validate the extracted folderId (alphanumeric + hyphens/underscores only)
    if (!/^[a-zA-Z0-9_-]+$/.test(folderId)) {
      return res.status(400).json({ message: "Invalid folder ID" });
    }

    const drive = getDrive();

    // Get folder metadata (name)
    let folderName = "";
    try {
      const folderRes = await drive.files.get({
        fileId: folderId,
        fields: "name",
        supportsAllDrives: true,
      });
      folderName = folderRes.data.name || "";
    } catch (err) {
      return res.status(400).json({
        message:
          "Cannot access this folder. Make sure it is shared as 'Anyone with the link'.",
      });
    }

    // List all files in the folder
    let allFiles = [];
    let pageToken = null;

    do {
      const listRes = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: "nextPageToken, files(id, name, mimeType, size)",
        orderBy: "name",
        pageSize: 1000,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        ...(pageToken && { pageToken }),
      });

      allFiles = allFiles.concat(listRes.data.files || []);
      pageToken = listRes.data.nextPageToken;
    } while (pageToken);

    // Filter video files
    const videoFiles = allFiles
      .filter((f) => VIDEO_MIME_TYPES.includes(f.mimeType))
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true }),
      )
      .map((f, index) => ({
        driveFileId: f.id,
        title: f.name.replace(/\.[^/.]+$/, ""), // remove extension
        mimeType: f.mimeType,
        size: f.size,
        order: index,
      }));

    if (videoFiles.length === 0) {
      return res.status(404).json({
        message: "No video files found in this folder",
        folderName,
        totalFiles: allFiles.length,
      });
    }

    res.json({
      folderName,
      folderId,
      videoCount: videoFiles.length,
      videos: videoFiles,
    });
  } catch (error) {
    console.error("Scan drive error:", error);
    res.status(500).json({
      message: error.message || "Failed to scan Drive folder",
    });
  }
};

// @desc    Scan a Drive folder recursively (all file types, tree structure)
// @route   POST /api/drive/scan
const scanDriveUniversal = async (req, res) => {
  try {
    const { driveLink } = req.body;

    if (!driveLink) {
      return res.status(400).json({ message: "Drive link is required" });
    }

    const folderId = extractFolderId(driveLink);
    if (!folderId) {
      return res.status(400).json({ message: "Invalid Google Drive link" });
    }

    // Strictly validate the extracted folderId (alphanumeric + hyphens/underscores only)
    if (!/^[a-zA-Z0-9_-]+$/.test(folderId)) {
      return res.status(400).json({ message: "Invalid folder ID" });
    }

    const drive = getDrive();

    // Get folder metadata
    let folderName = "";
    try {
      const folderRes = await drive.files.get({
        fileId: folderId,
        fields: "name",
        supportsAllDrives: true,
      });
      folderName = folderRes.data.name || "";
    } catch (err) {
      return res.status(400).json({
        message:
          "Cannot access this folder. Make sure it is shared as 'Anyone with the link'.",
      });
    }

    const items = await scanFolderRecursive(drive, folderId);

    // Count files (flatten)
    function countFiles(list) {
      let count = 0;
      for (const item of list) {
        if (item.fileType === "folder" && item.children) {
          count += countFiles(item.children);
        } else {
          count++;
        }
      }
      return count;
    }

    res.json({
      folderName,
      folderId,
      totalFiles: countFiles(items),
      items,
    });
  } catch (error) {
    console.error("Universal scan error:", error);
    res.status(500).json({
      message: error.message || "Failed to scan Drive folder",
    });
  }
};

// @desc    Import a book from scanned Drive folder
// @route   POST /api/books/import-drive
const importDriveBook = async (req, res) => {
  try {
    const { title, author, description, folderId, videos } = req.body;

    if (!title || !author || !videos || !videos.length) {
      return res
        .status(400)
        .json({ message: "Title, author, and videos are required" });
    }

    const book = await Book.create({
      title,
      author,
      type: "video",
      description: description || "",
      driveLink: `https://drive.google.com/drive/folders/${folderId}`,
      videos: videos.map((v, index) => ({
        title: v.title,
        driveFileId: v.driveFileId,
        duration: v.duration || "",
        order: index,
      })),
      addedBy: req.user._id,
    });

    const populated = await Book.findById(book._id).populate(
      "addedBy",
      "name email",
    );

    res.status(201).json({
      message: `Book imported with ${videos.length} videos`,
      book: populated,
    });
  } catch (error) {
    console.error("Import drive book error:", error);
    res.status(500).json({ message: "Failed to import book from Drive" });
  }
};

module.exports = {
  scanDriveFolder,
  importDriveBook,
  scanDriveUniversal,
  extractFolderId,
};
