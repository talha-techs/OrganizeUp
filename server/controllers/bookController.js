const Book = require("../models/Book");
const User = require("../models/User");
const {
  uploadToGridFS,
  streamFromGridFS,
  streamAudioFromGridFS,
  deleteFromGridFS,
} = require("../config/gridfs");

// @desc    Get books (user sees own + public; admin sees all)
// @route   GET /api/books?type=video|text|audio
const getBooks = async (req, res) => {
  try {
    const filter = {};
    if (req.query.type) {
      filter.type = req.query.type;
    }

    if (req.user.role !== "admin") {
      // Non-admin users only see their own books
      filter.addedBy = req.user._id;
    }
    // Admin with no filter sees all books
    const books = await Book.find(filter)
      .populate("addedBy", "name avatar")
      .sort({ createdAt: -1 });

    res.json({ books });
  } catch (error) {
    console.error("Get books error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get single book by ID
// @route   GET /api/books/:id
const getBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id).populate(
      "addedBy",
      "name avatar",
    );
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }
    // Users can only view their own or public content
    if (
      req.user.role !== "admin" &&
      book.addedBy._id.toString() !== req.user._id.toString() &&
      book.visibility !== "public"
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }
    res.json({ book });
  } catch (error) {
    console.error("Get book error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Create a new book (any user can create in their space)
// @route   POST /api/books
const createBook = async (req, res) => {
  try {
    const {
      title,
      author,
      type,
      description,
      embedLink,
      driveLink,
      totalPages,
      videos,
    } = req.body;

    // Handle PDF file upload to MongoDB GridFS
    let pdfFileId = null;
    const pdfFile =
      req.files?.pdfFile?.[0] ||
      (req.file?.fieldname === "pdfFile" ? req.file : null);
    if (pdfFile && pdfFile.mimetype === "application/pdf") {
      pdfFileId = await uploadToGridFS(
        pdfFile.buffer,
        pdfFile.originalname,
        pdfFile.mimetype,
        "pdf",
      );
    }

    // Handle cover image upload to GridFS
    let coverImageId = null;
    const coverFile =
      req.files?.coverImage?.[0] ||
      (req.file?.fieldname === "coverImage" ? req.file : null);
    if (coverFile) {
      coverImageId = await uploadToGridFS(
        coverFile.buffer,
        coverFile.originalname,
        coverFile.mimetype,
        "image",
      );
    }

    // Admin content is public by default, user content is private
    const visibility = req.user.role === "admin" ? "public" : "private";

    // Handle multiple audio file uploads
    const audioFileUploads = req.files?.audioFiles || [];
    const parsedAudioMeta = req.body.audioFileMeta
      ? JSON.parse(req.body.audioFileMeta)
      : [];
    const audioFiles = [];
    for (let i = 0; i < audioFileUploads.length; i++) {
      const af = audioFileUploads[i];
      const meta = parsedAudioMeta[i] || {};
      const fileId = await uploadToGridFS(
        af.buffer,
        af.originalname,
        af.mimetype,
        "audio",
      );
      audioFiles.push({
        title: meta.title || af.originalname.replace(/\.[^.]+$/, ""),
        fileId,
        originalName: af.originalname,
        duration: meta.duration || "",
        size: af.size || af.buffer?.length || 0,
        order: i,
      });
    }

    const book = await Book.create({
      title,
      author,
      type,
      description,
      coverImage: coverImageId
        ? `/api/images/${coverImageId}`
        : req.body.coverImage || "",
      coverImageId,
      embedLink: pdfFileId ? `/api/books/pdf/${pdfFileId}` : embedLink || "",
      pdfFileId: pdfFileId || null,
      driveLink,
      totalPages: totalPages || 0,
      videos: videos ? JSON.parse(videos) : [],
      audioFiles,
      addedBy: req.user._id,
      visibility,
    });

    res.status(201).json({ message: "Book created successfully", book });
  } catch (error) {
    console.error("Create book error:", error);
    res.status(500).json({ message: "Server error creating book" });
  }
};

// @desc    Update a book (owner or admin)
// @route   PUT /api/books/:id
const updateBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    // Owner or admin can update
    if (
      req.user.role !== "admin" &&
      book.addedBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const {
      title,
      author,
      type,
      description,
      embedLink,
      driveLink,
      totalPages,
      videos,
    } = req.body;

    // Handle new PDF file upload to GridFS
    const pdfFile =
      req.files?.pdfFile?.[0] ||
      (req.file?.fieldname === "pdfFile" ? req.file : null);
    if (pdfFile && pdfFile.mimetype === "application/pdf") {
      if (book.pdfFileId) {
        await deleteFromGridFS(book.pdfFileId, "pdf");
      }
      const pdfFileId = await uploadToGridFS(
        pdfFile.buffer,
        pdfFile.originalname,
        pdfFile.mimetype,
        "pdf",
      );
      book.pdfFileId = pdfFileId;
      book.embedLink = `/api/books/pdf/${pdfFileId}`;
    }

    // Handle cover image upload to GridFS
    const coverFile =
      req.files?.coverImage?.[0] ||
      (req.file?.fieldname === "coverImage" ? req.file : null);
    if (coverFile) {
      if (book.coverImageId) {
        await deleteFromGridFS(book.coverImageId, "image");
      }
      const coverImageId = await uploadToGridFS(
        coverFile.buffer,
        coverFile.originalname,
        coverFile.mimetype,
        "image",
      );
      book.coverImageId = coverImageId;
      book.coverImage = `/api/images/${coverImageId}`;
    }

    if (title) book.title = title;
    if (author) book.author = author;
    if (type) book.type = type;
    if (description !== undefined) book.description = description;
    if (embedLink !== undefined && !pdfFile) book.embedLink = embedLink;
    if (driveLink !== undefined) book.driveLink = driveLink;
    if (totalPages !== undefined) book.totalPages = totalPages;
    if (videos) book.videos = JSON.parse(videos);

    // Append new audio file uploads (existing tracks are preserved unless explicitly removed)
    const newAudioUploads = req.files?.audioFiles || [];
    const parsedAudioMeta = req.body.audioFileMeta
      ? JSON.parse(req.body.audioFileMeta)
      : [];
    for (let i = 0; i < newAudioUploads.length; i++) {
      const af = newAudioUploads[i];
      const meta = parsedAudioMeta[i] || {};
      const fileId = await uploadToGridFS(
        af.buffer,
        af.originalname,
        af.mimetype,
        "audio",
      );
      book.audioFiles.push({
        title: meta.title || af.originalname.replace(/\.[^.]+$/, ""),
        fileId,
        originalName: af.originalname,
        duration: meta.duration || "",
        size: af.size || af.buffer?.length || 0,
        order: book.audioFiles.length,
      });
    }

    await book.save();
    res.json({ message: "Book updated successfully", book });
  } catch (error) {
    console.error("Update book error:", error);
    res.status(500).json({ message: "Server error updating book" });
  }
};

// @desc    Delete a book (owner or admin)
// @route   DELETE /api/books/:id
const deleteBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }
    if (
      req.user.role !== "admin" &&
      book.addedBy.toString() !== req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this book" });
    }

    // Clean up GridFS files
    if (book.pdfFileId) {
      await deleteFromGridFS(book.pdfFileId, "pdf");
    }
    if (book.coverImageId) {
      await deleteFromGridFS(book.coverImageId, "image");
    }
    // Clean up audio files
    for (const af of book.audioFiles || []) {
      if (af.fileId) await deleteFromGridFS(af.fileId, "audio");
    }

    await book.deleteOne();
    res.json({ message: "Book deleted successfully" });
  } catch (error) {
    console.error("Delete book error:", error);
    res.status(500).json({ message: "Server error deleting book" });
  }
};

// @desc    Update video progress for a user
// @route   PUT /api/books/:id/video-progress
const updateVideoProgress = async (req, res) => {
  try {
    const { videoIndex, progress, completed, note } = req.body;
    const user = await User.findById(req.user._id);
    const bookId = req.params.id;

    const existingProgress = user.videoProgress.find(
      (vp) => vp.bookId.toString() === bookId && vp.videoIndex === videoIndex,
    );

    if (existingProgress) {
      existingProgress.progress = progress;
      if (completed !== undefined) existingProgress.completed = completed;
      if (note) existingProgress.note = note;
      existingProgress.lastWatched = new Date();
    } else {
      user.videoProgress.push({
        bookId,
        videoIndex,
        progress,
        completed: completed || false,
        note: note || "",
        lastWatched: new Date(),
      });
    }

    await user.save();
    res.json({
      message: "Video progress updated",
      videoProgress: user.videoProgress,
    });
  } catch (error) {
    console.error("Update video progress error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Update reading progress for a user
// @route   PUT /api/books/:id/reading-progress
const updateReadingProgress = async (req, res) => {
  try {
    const { currentPage, totalPages, progress } = req.body;
    const user = await User.findById(req.user._id);
    const bookId = req.params.id;

    const existingProgress = user.readingProgress.find(
      (rp) => rp.bookId.toString() === bookId,
    );

    if (existingProgress) {
      existingProgress.currentPage = currentPage;
      if (totalPages) existingProgress.totalPages = totalPages;
      existingProgress.progress = progress;
      existingProgress.lastRead = new Date();
    } else {
      user.readingProgress.push({
        bookId,
        currentPage,
        totalPages: totalPages || 0,
        progress,
        lastRead: new Date(),
      });
    }

    await user.save();
    res.json({
      message: "Reading progress updated",
      readingProgress: user.readingProgress,
    });
  } catch (error) {
    console.error("Update reading progress error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get user's progress for a specific book
// @route   GET /api/books/:id/progress
const getBookProgress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const bookId = req.params.id;

    const videoProgress = user.videoProgress.filter(
      (vp) => vp.bookId.toString() === bookId,
    );
    const readingProgress = user.readingProgress.find(
      (rp) => rp.bookId.toString() === bookId,
    );

    res.json({ videoProgress, readingProgress });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Serve a PDF file from GridFS
// @route   GET /api/books/pdf/:fileId
const servePdf = async (req, res) => {
  try {
    const book = await Book.findOne({ pdfFileId: req.params.fileId });
    if (!book) return res.status(404).json({ message: "PDF not found" });

    const isOwner = book.addedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin && book.visibility !== "public") {
      return res.status(403).json({ message: "Not authorized to access this file" });
    }

    // Only allow same-origin framing for owned/public PDFs
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    await streamFromGridFS(req.params.fileId, res, "pdf");
  } catch (error) {
    console.error("Serve PDF error:", error);
    res.status(500).json({ message: "Error serving PDF" });
  }
};

// @desc    Remove a single video from a book
// @route   DELETE /api/books/:id/videos/:videoId
const removeVideoFromBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }
    if (
      req.user.role !== "admin" &&
      book.addedBy.toString() !== req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to modify this book" });
    }

    const before = book.videos.length;
    book.videos = book.videos.filter(
      (v) => v._id.toString() !== req.params.videoId,
    );

    if (book.videos.length === before) {
      return res.status(404).json({ message: "Video not found" });
    }

    await book.save();
    res.json({ message: "Video removed", book });
  } catch (error) {
    console.error("Remove video error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Serve an audio file from GridFS (with Range/seek support)
// @route   GET /api/books/audio/:fileId
const serveAudio = async (req, res) => {
  try {
    const book = await Book.findOne({ "audioFiles.fileId": req.params.fileId });
    if (!book) return res.status(404).json({ message: "Audio not found" });

    const isOwner = book.addedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin && book.visibility !== "public") {
      return res.status(403).json({ message: "Not authorized to access this file" });
    }

    await streamAudioFromGridFS(req.params.fileId, req, res, "audio");
  } catch (error) {
    console.error("Serve audio error:", error);
    res.status(500).json({ message: "Error serving audio" });
  }
};

// @desc    Remove a single audio track from a book
// @route   DELETE /api/books/:id/audio/:audioId
const removeAudioFromBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: "Book not found" });
    if (
      req.user.role !== "admin" &&
      book.addedBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const track = book.audioFiles.find(
      (a) => a._id.toString() === req.params.audioId,
    );
    if (!track) return res.status(404).json({ message: "Track not found" });

    // Delete the file from GridFS
    if (track.fileId) await deleteFromGridFS(track.fileId, "audio");

    book.audioFiles = book.audioFiles.filter(
      (a) => a._id.toString() !== req.params.audioId,
    );
    await book.save();
    res.json({ message: "Audio track removed", book });
  } catch (error) {
    console.error("Remove audio error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Serve an image from GridFS
// @route   GET /api/images/:fileId
const serveImage = async (req, res) => {
  try {
    await streamFromGridFS(req.params.fileId, res, "image");
  } catch (error) {
    console.error("Serve image error:", error);
    res.status(500).json({ message: "Error serving image" });
  }
};

module.exports = {
  getBooks,
  getBook,
  createBook,
  updateBook,
  deleteBook,
  removeVideoFromBook,
  removeAudioFromBook,
  servePdf,
  serveAudio,
  serveImage,
  updateVideoProgress,
  updateReadingProgress,
  getBookProgress,
};
