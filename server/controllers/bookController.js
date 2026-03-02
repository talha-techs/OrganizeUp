const Book = require("../models/Book");
const User = require("../models/User");
const {
  uploadToGridFS,
  streamFromGridFS,
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

    // Users see their own content + public content
    // Admin sees everything
    if (req.user.role !== "admin") {
      filter.$or = [{ addedBy: req.user._id }, { visibility: "public" }];
    }

    const books = await Book.find(filter)
      .populate("addedBy", "name email avatar")
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
      "name email avatar",
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
    const book =
      req.user.role === "admin"
        ? await Book.findById(req.params.id)
        : await Book.findOne({ _id: req.params.id, addedBy: req.user._id });
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    // Clean up GridFS files
    if (book.pdfFileId) {
      await deleteFromGridFS(book.pdfFileId, "pdf");
    }
    if (book.coverImageId) {
      await deleteFromGridFS(book.coverImageId, "image");
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
    // Remove X-Frame-Options so PDF can load in iframe
    res.removeHeader("X-Frame-Options");
    await streamFromGridFS(req.params.fileId, res, "pdf");
  } catch (error) {
    console.error("Serve PDF error:", error);
    res.status(500).json({ message: "Error serving PDF" });
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
  servePdf,
  serveImage,
  updateVideoProgress,
  updateReadingProgress,
  getBookProgress,
};
