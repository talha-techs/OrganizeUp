const path = require("path");
const mongoose = require("mongoose");
const Book = require("../models/Book");
const User = require("../models/User");
const UserLibrary = require("../models/UserLibrary");
const { fetchBookCover } = require("../services/bookCoverService");
const { R2_CONFIG } = require("../config/r2");
const {
  uploadFile,
  deleteFile,
  getPresignedDownloadUrl,
  streamFromR2,
  streamFromGridFS,
  streamAudioFromGridFS,
  isR2Configured,
  isR2Active,
  extractGridFsId,
} = require("../services/storageService");

const BOOK_LIST_SELECT = [
  "title author type description source coverImage driveLink totalPages",
  "addedBy visibility videos audioFiles._id audioFiles.title audioFiles.originalName audioFiles.size",
].join(" ");

const getOptionalPagination = (query) => {
  const hasPagination = query.page !== undefined || query.limit !== undefined;
  if (!hasPagination) return null;

  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

// @desc    Get books (user sees own + saved from library; admin sees all)
// @route   GET /api/books?type=video|text|audio&mine=true
const getBooks = async (req, res) => {
  try {
    const filter = {};
    if (req.query.type) {
      filter.type = req.query.type;
    }

    const savedBookIdMap = new Map();

    const isAdmin = req.user.role === "admin";
    const saved = await UserLibrary.find({
      user: req.user._id,
      contentType: "book",
    }).select("contentId _id");
    const savedIds = saved.map((s) => s.contentId);
    saved.forEach((s) => savedBookIdMap.set(s.contentId.toString(), s._id));

    if (req.query.mine === "true") {
      filter.addedBy = req.user._id;
    } else if (isAdmin && req.query.all === "true") {
      // Explicit administrative overview parameter only
    } else {
      // Personal library for all users (including admins): authored books + saved books
      filter.$or = [{ addedBy: req.user._id }, { _id: { $in: savedIds } }];
    }

    let booksQuery = Book.find(filter)
      .select(BOOK_LIST_SELECT)
      .populate("addedBy", "name avatar")
      .sort({ createdAt: -1 });
    const pagination = getOptionalPagination(req.query);
    if (pagination)
      booksQuery = booksQuery.skip(pagination.skip).limit(pagination.limit);
    const books = await booksQuery.lean();

    const booksWithSaved = books.map((b) => {
      const obj = { ...b };
      const bIdStr = b._id.toString();
      const isOwner =
        b.addedBy &&
        String(b.addedBy._id || b.addedBy) === String(req.user._id);
      if (savedBookIdMap.has(bIdStr)) {
        obj.isSaved = true;
        obj.libraryEntryId = savedBookIdMap.get(bIdStr);
      } else {
        obj.isSaved = false;
      }
      obj.isOwner = isOwner;
      // Ensure YouTube books have type: 'youtube' so they never appear in video books
      if (
        obj.source === "youtube" ||
        obj.description === "Modern Audiobook & Summary" ||
        obj.videos?.some(
          (v) => v.driveFileId && /^[a-zA-Z0-9_-]{11}$/.test(v.driveFileId),
        )
      ) {
        obj.type = "youtube";
      }
      return obj;
    });

    res.json({ books: booksWithSaved });
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

    const isOwner =
      book.addedBy &&
      String(book.addedBy._id || book.addedBy) === String(req.user._id);
    const savedEntry = await UserLibrary.findOne({
      user: req.user._id,
      contentType: "book",
      contentId: book._id,
    });

    // Users can only view their own or public content, or content saved in their library
    if (
      req.user.role !== "admin" &&
      !isOwner &&
      book.visibility !== "public" &&
      !savedEntry
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const bookObj = book.toObject();
    bookObj.isSaved = !!savedEntry;
    bookObj.libraryEntryId = savedEntry?._id || null;
    bookObj.isOwner = isOwner;

    res.json({ book: bookObj });
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
      autoCover,
    } = req.body;

    // Handle PDF file upload
    let pdfFileId = null;
    let pdfR2Key = null;
    let bookStorageProvider = "gridfs";

    const pdfFile =
      req.files?.pdfFile?.[0] ||
      (req.file?.fieldname === "pdfFile" ? req.file : null);
    if (pdfFile && pdfFile.mimetype === "application/pdf") {
      const uploadedPdf = await uploadFile({
        buffer: pdfFile.buffer,
        originalname: pdfFile.originalname,
        mimetype: pdfFile.mimetype,
        folder: "books/pdfs",
        isPublic: false,
        bucketType: "pdf",
      });
      pdfFileId = uploadedPdf.fileId;
      pdfR2Key = uploadedPdf.key;
      bookStorageProvider = uploadedPdf.provider;
    }

    // Handle cover image upload
    let coverImageId = null;
    let coverR2Key = null;
    let coverImageUrl = req.body.coverImage || "";
    const coverFile =
      req.files?.coverImage?.[0] ||
      (req.file?.fieldname === "coverImage" ? req.file : null);
    if (coverFile) {
      const uploadedCover = await uploadFile({
        buffer: coverFile.buffer,
        originalname: coverFile.originalname,
        mimetype: coverFile.mimetype,
        folder: "books/covers",
        isPublic: true,
        bucketType: "image",
      });
      coverImageId = uploadedCover.fileId;
      coverR2Key = uploadedCover.key;
      coverImageUrl = uploadedCover.url;
    }

    if (!coverFile && !coverImageUrl && autoCover === "true") {
      try {
        const fetchedCover = await fetchBookCover(title, author);
        if (fetchedCover) {
          const uploadedCover = await uploadFile({
            buffer: fetchedCover.buffer,
            originalname: fetchedCover.originalname,
            mimetype: fetchedCover.mimetype,
            folder: "books/covers",
            isPublic: true,
            bucketType: "image",
          });
          coverImageId = uploadedCover.fileId;
          coverR2Key = uploadedCover.key;
          coverImageUrl = uploadedCover.url;
        }
      } catch (coverError) {
        console.warn("Automatic book cover lookup failed:", coverError.message);
      }
    }

    // All uploaded content is private by default, unless explicitly passed in the request
    const visibility = req.body.visibility || "private";

    // Handle multiple audio file uploads
    const audioFileUploads = req.files?.audioFiles || [];
    const parsedAudioMeta = req.body.audioFileMeta
      ? JSON.parse(req.body.audioFileMeta)
      : [];
    const audioFiles = [];
    for (let i = 0; i < audioFileUploads.length; i++) {
      const af = audioFileUploads[i];
      const meta = parsedAudioMeta[i] || {};
      const uploadedAudio = await uploadFile({
        buffer: af.buffer,
        originalname: af.originalname,
        mimetype: af.mimetype,
        folder: "books/audios",
        isPublic: false,
        bucketType: "audio",
      });
      audioFiles.push({
        title: meta.title || af.originalname.replace(/\.[^.]+$/, ""),
        fileId: uploadedAudio.fileId,
        r2Key: uploadedAudio.key,
        storageProvider: uploadedAudio.provider,
        originalName: af.originalname,
        duration: meta.duration || "",
        size: af.size || af.buffer?.length || 0,
        order: i,
      });
    }

    const newBookId = new mongoose.Types.ObjectId();
    const slug = encodeURIComponent(title.replace(/[^a-zA-Z0-9-]/g, "-"));
    const generatedEmbedLink =
      pdfFileId || pdfR2Key
        ? `/api/books/pdf/${newBookId}/${slug}.pdf`
        : embedLink || "";

    const book = await Book.create({
      _id: newBookId,
      title,
      author,
      type,
      description,
      coverImage: coverImageUrl,
      coverImageId,
      coverR2Key,
      embedLink: generatedEmbedLink,
      pdfFileId: pdfFileId || null,
      pdfR2Key: pdfR2Key || null,
      storageProvider: bookStorageProvider,
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

// @desc    Download an external PDF and create a private text book
// @route   POST /api/books/from-pdf-url
const createBookFromPdfUrl = async (req, res) => {
  try {
    const { url, title, description = "" } = req.body;
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return res.status(400).json({ message: "A valid PDF URL is required" });
    }

    if (!/^https?:$/.test(parsedUrl.protocol)) {
      return res
        .status(400)
        .json({ message: "Only HTTP(S) PDF URLs are supported" });
    }
    if (!isR2Active()) {
      return res.status(503).json({
        message: "R2 storage is not active; PDF cannot be imported",
      });
    }

    const response = await fetch(parsedUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(60000),
      headers: { Accept: "application/pdf,application/octet-stream;q=0.9" },
    });
    if (!response.ok) {
      return res
        .status(400)
        .json({ message: "The PDF could not be downloaded" });
    }

    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > 50 * 1024 * 1024) {
      return res.status(413).json({ message: "PDF must be 50 MB or smaller" });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > 50 * 1024 * 1024) {
      return res.status(413).json({ message: "PDF must be 50 MB or smaller" });
    }
    const contentType = response.headers.get("content-type") || "";
    if (
      !contentType.toLowerCase().includes("application/pdf") &&
      buffer.subarray(0, 5).toString() !== "%PDF-"
    ) {
      return res
        .status(400)
        .json({ message: "The URL did not return a PDF file" });
    }

    const filename = decodeURIComponent(
      parsedUrl.pathname.split("/").pop() || "document.pdf",
    ).replace(/[^a-zA-Z0-9._-]/g, "-");
    const cleanTitle = String(
      title || filename.replace(/\.pdf$/i, "") || "Imported PDF",
    ).trim();
    const uploadedPdf = await uploadFile({
      buffer,
      originalname: filename.toLowerCase().endsWith(".pdf")
        ? filename
        : `${filename}.pdf`,
      mimetype: "application/pdf",
      folder: "books/pdfs",
      isPublic: false,
      bucketType: "pdf",
    });
    if (uploadedPdf.provider !== "r2" || !uploadedPdf.key) {
      return res.status(503).json({
        message: "R2 storage is not active; PDF was not saved to Book Library",
      });
    }
    if (uploadedPdf.size !== buffer.length) {
      return res.status(502).json({
        message: "R2 PDF upload verification failed",
      });
    }

    const bookId = new mongoose.Types.ObjectId();
    const slug = encodeURIComponent(cleanTitle.replace(/[^a-zA-Z0-9-]/g, "-"));
    const book = await Book.create({
      _id: bookId,
      title: cleanTitle,
      author: req.user.name || req.user.email || "My Library",
      type: "text",
      description: String(description || "").trim(),
      driveLink: parsedUrl.toString(),
      embedLink: `/api/books/pdf/${bookId}/${slug}.pdf`,
      pdfFileId: uploadedPdf.fileId || null,
      pdfR2Key: uploadedPdf.key || null,
      storageProvider: uploadedPdf.provider,
      addedBy: req.user._id,
      visibility: "private",
    });

    return res.status(201).json({ message: "PDF saved to Book Library", book });
  } catch (error) {
    console.error("Create book from PDF URL error:", error.message);
    return res.status(500).json({ message: "Server error importing PDF" });
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

    // Handle new PDF file upload
    const pdfFile =
      req.files?.pdfFile?.[0] ||
      (req.file?.fieldname === "pdfFile" ? req.file : null);
    if (pdfFile && pdfFile.mimetype === "application/pdf") {
      if (book.pdfR2Key || book.pdfFileId) {
        await deleteFile({
          provider: book.storageProvider,
          key: book.pdfR2Key,
          fileId: book.pdfFileId,
          isPublic: false,
          bucketType: "pdf",
        });
      }
      const uploadedPdf = await uploadFile({
        buffer: pdfFile.buffer,
        originalname: pdfFile.originalname,
        mimetype: pdfFile.mimetype,
        folder: "books/pdfs",
        isPublic: false,
        bucketType: "pdf",
      });
      book.pdfFileId = uploadedPdf.fileId;
      book.pdfR2Key = uploadedPdf.key;
      book.storageProvider = uploadedPdf.provider;
      const slug = encodeURIComponent(
        (title || book.title).replace(/[^a-zA-Z0-9-]/g, "-"),
      );
      book.embedLink = `/api/books/pdf/${book._id}/${slug}.pdf`;
    }

    // Handle cover image upload
    const coverFile =
      req.files?.coverImage?.[0] ||
      (req.file?.fieldname === "coverImage" ? req.file : null);
    if (coverFile) {
      if (book.coverR2Key || book.coverImageId) {
        await deleteFile({
          provider: book.storageProvider,
          key: book.coverR2Key,
          fileId: book.coverImageId,
          isPublic: true,
          bucketType: "image",
        });
      }
      const uploadedCover = await uploadFile({
        buffer: coverFile.buffer,
        originalname: coverFile.originalname,
        mimetype: coverFile.mimetype,
        folder: "books/covers",
        isPublic: true,
        bucketType: "image",
      });
      book.coverImageId = uploadedCover.fileId;
      book.coverR2Key = uploadedCover.key;
      book.coverImage = uploadedCover.url;
    } else if (req.body.coverImage !== undefined) {
      if (book.coverR2Key || book.coverImageId) {
        await deleteFile({
          provider: book.storageProvider,
          key: book.coverR2Key,
          fileId: book.coverImageId,
          isPublic: true,
          bucketType: "image",
        });
        book.coverImageId = null;
        book.coverR2Key = null;
      }
      book.coverImage = req.body.coverImage;
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
      const uploadedAudio = await uploadFile({
        buffer: af.buffer,
        originalname: af.originalname,
        mimetype: af.mimetype,
        folder: "books/audios",
        isPublic: false,
        bucketType: "audio",
      });
      book.audioFiles.push({
        title: meta.title || af.originalname.replace(/\.[^.]+$/, ""),
        fileId: uploadedAudio.fileId,
        r2Key: uploadedAudio.key,
        storageProvider: uploadedAudio.provider,
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
    const isOwner =
      book.addedBy && book.addedBy.toString() === req.user._id.toString();
    if (!isOwner) {
      return res.status(403).json({
        message:
          "Only the author can delete this book. To remove saved content from your library, unsave it. To moderate content as admin, use Content Management.",
      });
    }

    // Clean up files (R2 and GridFS)
    if (book.pdfR2Key || book.pdfFileId) {
      await deleteFile({
        provider: book.storageProvider,
        key: book.pdfR2Key,
        fileId: book.pdfFileId,
        isPublic: false,
        bucketType: "pdf",
      });
    }
    if (book.coverR2Key || book.coverImageId) {
      await deleteFile({
        provider: book.storageProvider,
        key: book.coverR2Key,
        fileId: book.coverImageId,
        isPublic: true,
        bucketType: "image",
      });
    }
    // Clean up audio files
    for (const af of book.audioFiles || []) {
      if (af.r2Key || af.fileId) {
        await deleteFile({
          provider: af.storageProvider,
          key: af.r2Key,
          fileId: af.fileId,
          isPublic: false,
          bucketType: "audio",
        });
      }
    }

    // Clean up UserLibrary entries if any
    await UserLibrary.deleteMany({
      contentType: "book",
      contentId: book._id,
    });

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
    const { videoIndex, progress, completed, note, title } = req.body;
    const user = await User.findById(req.user._id);
    const bookId = req.params.id;

    const existingProgress = user.videoProgress.find(
      (vp) =>
        vp.bookId &&
        vp.bookId.toString() === bookId &&
        vp.videoIndex === videoIndex,
    );

    const isCompleted =
      completed === true ||
      (progress !== undefined && progress >= 100) ||
      (existingProgress && existingProgress.completed && completed !== false);

    if (existingProgress) {
      if (progress !== undefined) {
        existingProgress.progress = isCompleted
          ? 100
          : Math.max(existingProgress.progress || 0, progress);
      }
      existingProgress.completed = isCompleted;
      if (note !== undefined) existingProgress.note = note;
      if (title) existingProgress.title = title;
      existingProgress.lastWatched = new Date();
    } else {
      user.videoProgress.push({
        bookId,
        contentType: "book",
        videoIndex,
        title: title || "",
        progress: isCompleted ? 100 : progress || 0,
        completed: isCompleted,
        note: note !== undefined ? note : "",
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

// @desc    Get combined sequential notes for all videos in a video book
// @route   GET /api/books/:id/notes
const getCombinedBookNotes = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    const user = await User.findById(req.user._id);
    const bookIdStr = req.params.id.toString();

    // If text book, return reading progress note
    if (book.type === "text") {
      const rp = (user?.readingProgress || []).find(
        (p) => p.bookId && p.bookId.toString() === bookIdStr,
      );
      const noteText = rp?.note?.trim() || "";
      const combinedNotes = noteText
        ? `# ${book.title} — Study Notes\n\n${noteText}`
        : "";
      return res.json({
        combinedNotes,
        bookTitle: book.title,
        totalNotesCount: noteText ? 1 : 0,
      });
    }

    const userVideoProgress = (user?.videoProgress || []).filter(
      (vp) => vp.bookId && vp.bookId.toString() === bookIdStr,
    );

    // Build combined notes document
    const videos = book.videos || [];
    const sections = [];

    videos.forEach((video, index) => {
      const vProg = userVideoProgress.find((vp) => vp.videoIndex === index);
      const noteText = vProg?.note?.trim();
      if (noteText) {
        const title = video.title || `Video ${index + 1}`;
        sections.push(`## ${index + 1}. ${title}\n\n${noteText}`);
      }
    });

    const combinedNotes =
      sections.length > 0
        ? `# ${book.title} — Study Notes\n\n${sections.join("\n\n---\n\n")}`
        : "";

    res.json({
      combinedNotes,
      bookTitle: book.title,
      totalNotesCount: sections.length,
    });
  } catch (error) {
    console.error("Get combined book notes error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Update reading progress for a user
// @route   PUT /api/books/:id/reading-progress
const updateReadingProgress = async (req, res) => {
  try {
    const { currentPage, totalPages, progress, note } = req.body;
    const user = await User.findById(req.user._id);
    const bookId = req.params.id;

    const existingProgress = user.readingProgress.find(
      (rp) => rp.bookId && rp.bookId.toString() === bookId,
    );

    const isCompleted =
      (progress !== undefined && progress >= 100) ||
      (totalPages > 0 && currentPage >= totalPages) ||
      (existingProgress && existingProgress.completed);

    if (existingProgress) {
      if (currentPage !== undefined) existingProgress.currentPage = currentPage;
      if (totalPages) existingProgress.totalPages = totalPages;
      if (progress !== undefined) existingProgress.progress = progress;
      if (note !== undefined) existingProgress.note = note;
      existingProgress.completed = isCompleted;
      existingProgress.lastRead = new Date();
    } else {
      user.readingProgress.push({
        bookId,
        currentPage: currentPage || 1,
        totalPages: totalPages || 0,
        progress: progress || 0,
        completed: isCompleted,
        note: note || "",
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

    const videoProgress = (user?.videoProgress || []).filter(
      (vp) => vp.bookId && vp.bookId.toString() === bookId,
    );
    const readingProgress = (user?.readingProgress || []).find(
      (rp) => rp.bookId && rp.bookId.toString() === bookId,
    );

    res.json({ videoProgress, readingProgress: readingProgress || null });
  } catch (error) {
    console.error("Get book progress error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get presigned R2 URL for book PDF (direct CDN Range streaming)
// @route   GET /api/books/:id/pdf-url
const getBookPdfUrl = async (req, res) => {
  try {
    const rawParam = decodeURIComponent(req.params.id);
    const isValidId = mongoose.isValidObjectId(rawParam);

    const queryConditions = [{ pdfR2Key: rawParam }];
    if (isValidId) {
      queryConditions.push({ _id: rawParam });
      queryConditions.push({ pdfFileId: rawParam });
    }

    const book = await Book.findOne({ $or: queryConditions });
    if (!book) return res.status(404).json({ message: "PDF not found" });

    const ownerId = book.addedBy?._id || book.addedBy;
    const isOwner = Boolean(
      ownerId && String(ownerId) === String(req.user._id),
    );
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin && book.visibility !== "public") {
      return res
        .status(403)
        .json({ message: "Not authorized to access this file" });
    }

    const slug = encodeURIComponent(
      (book.title || "document").replace(/[^a-zA-Z0-9-]/g, "-"),
    );

    if (book.pdfR2Key && isR2Configured()) {
      try {
        const presignedUrl = await getPresignedDownloadUrl(book.pdfR2Key, {
          expiresIn: 7200,
          isPublic: false,
        });
        return res.json({
          url: presignedUrl,
          expiresAt: Date.now() + 7200 * 1000,
          provider: "r2",
          bookId: book._id,
          title: book.title,
        });
      } catch (err) {
        console.warn(
          `[getBookPdfUrl] Presigned URL failed for book ${book._id}: ${err.message}`,
        );
      }
    }

    // Fallback: Express proxy URL
    const fallbackUrl = `/api/books/pdf/${book._id}/${slug}.pdf?proxy=true`;
    return res.json({
      url: fallbackUrl,
      expiresAt: null,
      provider: "gridfs",
      bookId: book._id,
      title: book.title,
    });
  } catch (error) {
    console.error("getBookPdfUrl error:", error);
    res.status(500).json({ message: "Error generating PDF URL" });
  }
};

// @desc    Serve a PDF file from R2 or GridFS (redirects to direct presigned R2 URL, stream as fallback)
// @route   GET /api/books/pdf/:fileId
const servePdf = async (req, res) => {
  try {
    const rawParam = decodeURIComponent(req.params.fileId);
    const isValidId = mongoose.isValidObjectId(rawParam);

    const queryConditions = [{ pdfR2Key: rawParam }];
    if (isValidId) {
      queryConditions.push({ pdfFileId: rawParam });
      queryConditions.push({ _id: rawParam });
    }

    const book = await Book.findOne({ $or: queryConditions });
    if (!book) return res.status(404).json({ message: "PDF not found" });

    const ownerId = book.addedBy?._id || book.addedBy;
    const isOwner = Boolean(
      ownerId && String(ownerId) === String(req.user._id),
    );
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin && book.visibility !== "public") {
      return res
        .status(403)
        .json({ message: "Not authorized to access this file" });
    }

    // Only allow same-origin framing for owned/public PDFs
    res.setHeader("X-Frame-Options", "SAMEORIGIN");

    const filename = `${encodeURIComponent((book.title || "document").replace(/[^a-zA-Z0-9-]/g, "-"))}.pdf`;

    // Direct fetch via 302 redirect to presigned R2 URL (bypasses Render network)
    if (book.pdfR2Key && isR2Configured() && req.query.proxy !== "true") {
      try {
        const presignedUrl = await getPresignedDownloadUrl(book.pdfR2Key, {
          expiresIn: 7200,
          isPublic: false,
        });
        return res.redirect(302, presignedUrl);
      } catch (presignErr) {
        console.warn(
          `[servePdf] Presigned redirect failed for book ${book._id}, falling back to proxy stream:`,
          presignErr.message,
        );
      }
    }

    // Fallback: proxy streaming via streamFromR2
    let streamed = false;
    if (book.pdfR2Key && isR2Configured()) {
      try {
        await streamFromR2({
          key: book.pdfR2Key,
          res,
          req,
          contentType: "application/pdf",
          filename,
        });
        streamed = true;
      } catch (r2Err) {
        console.warn(
          `[servePdf] R2 stream failed for book ${book._id} (${r2Err.message}), falling back to GridFS`,
        );
      }
    }

    // GridFS fallback
    if (!streamed) {
      if (book.pdfFileId) {
        await streamFromGridFS(book.pdfFileId, res, "pdf", req);
      } else {
        res.status(404).json({ message: "PDF file unavailable" });
      }
    }
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

// @desc    Get presigned R2 URL for book audio track (direct streaming, bypasses Render bandwidth)
// @route   GET /api/books/:id/audio-url/:trackId
const getBookAudioUrl = async (req, res) => {
  try {
    const { id, trackId } = req.params;
    const book = await Book.findById(id);
    if (!book) return res.status(404).json({ message: "Book not found" });

    const ownerId = book.addedBy?._id || book.addedBy;
    const isOwner = Boolean(
      ownerId && String(ownerId) === String(req.user._id),
    );
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin && book.visibility !== "public") {
      return res
        .status(403)
        .json({ message: "Not authorized to access this file" });
    }

    const rawTrackParam = decodeURIComponent(trackId);
    let track = book.audioFiles.find(
      (a, idx) =>
        a._id?.toString() === rawTrackParam ||
        a.fileId?.toString() === rawTrackParam ||
        a.r2Key === rawTrackParam ||
        String(idx) === rawTrackParam,
    );

    if (!track && book.audioFiles.length > 0) {
      const parsedIdx = parseInt(rawTrackParam, 10);
      if (
        !isNaN(parsedIdx) &&
        parsedIdx >= 0 &&
        parsedIdx < book.audioFiles.length
      ) {
        track = book.audioFiles[parsedIdx];
      }
    }

    if (!track)
      return res.status(404).json({ message: "Audio track not found" });

    if (track.audioUrl && track.audioUrl.startsWith("http")) {
      return res.json({
        url: track.audioUrl,
        expiresAt: null,
        provider: "external",
        title: track.title,
      });
    }

    if (track.r2Key && isR2Configured()) {
      try {
        const presignedUrl = await getPresignedDownloadUrl(track.r2Key, {
          expiresIn: 7200,
          isPublic: false,
        });
        return res.json({
          url: presignedUrl,
          expiresAt: Date.now() + 7200 * 1000,
          provider: "r2",
          title: track.title,
        });
      } catch (err) {
        console.warn(
          `[getBookAudioUrl] Presigned URL failed for track ${track._id}: ${err.message}`,
        );
      }
    }

    // Fallback: Express proxy
    const fallbackUrl = `/api/books/audio/${track.fileId || track._id}?proxy=true`;
    return res.json({
      url: fallbackUrl,
      expiresAt: null,
      provider: "gridfs",
      title: track.title,
    });
  } catch (error) {
    console.error("getBookAudioUrl error:", error);
    res.status(500).json({ message: "Error generating audio URL" });
  }
};

// @desc    Serve an audio file from R2 or GridFS (redirects to direct presigned R2 URL, stream as fallback)
// @route   GET /api/books/audio/:fileId
const serveAudio = async (req, res) => {
  try {
    const rawParam = decodeURIComponent(req.params.fileId);
    const isValidId = mongoose.isValidObjectId(rawParam);

    const queryConditions = [{ "audioFiles.r2Key": rawParam }];
    if (isValidId) {
      queryConditions.push({ "audioFiles.fileId": rawParam });
      queryConditions.push({ "audioFiles._id": rawParam });
    }

    const book = await Book.findOne({ $or: queryConditions });
    if (!book) return res.status(404).json({ message: "Audio not found" });

    const ownerId = book.addedBy?._id || book.addedBy;
    const isOwner = Boolean(
      ownerId && String(ownerId) === String(req.user._id),
    );
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin && book.visibility !== "public") {
      return res
        .status(403)
        .json({ message: "Not authorized to access this file" });
    }

    const track = book.audioFiles.find(
      (a) =>
        (a.fileId && a.fileId.toString() === rawParam) ||
        a.r2Key === rawParam ||
        a._id.toString() === rawParam,
    );

    if (!track)
      return res.status(404).json({ message: "Audio track not found" });

    // Direct fetch via 302 redirect to presigned R2 URL (bypasses Render network)
    if (track.r2Key && isR2Configured() && req.query.proxy !== "true") {
      try {
        const presignedUrl = await getPresignedDownloadUrl(track.r2Key, {
          expiresIn: 7200,
          isPublic: false,
        });
        return res.redirect(302, presignedUrl);
      } catch (presignErr) {
        console.warn(
          `[serveAudio] Presigned redirect failed for track ${track._id}, falling back to proxy stream:`,
          presignErr.message,
        );
      }
    }

    // Fallback: proxy streaming via streamFromR2
    let streamed = false;
    if (track.r2Key && isR2Configured()) {
      try {
        const filename = `${encodeURIComponent((track.title || "audio").replace(/[^a-zA-Z0-9-]/g, "-"))}.mp3`;
        await streamFromR2({
          key: track.r2Key,
          res,
          req,
          contentType: track.contentType || "audio/mpeg",
          filename,
        });
        streamed = true;
      } catch (r2Err) {
        console.warn(
          `[serveAudio] R2 audio stream failed for track ${track._id} (${r2Err.message}), falling back to GridFS`,
        );
      }
    }

    // GridFS fallback
    if (!streamed) {
      if (track.fileId) {
        await streamAudioFromGridFS(track.fileId, req, res, "audio");
      } else {
        res.status(404).json({ message: "Audio track unavailable" });
      }
    }
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

    // Delete the file from R2 or GridFS
    if (track.r2Key || track.fileId) {
      await deleteFile({
        provider: track.storageProvider,
        key: track.r2Key,
        fileId: track.fileId,
        isPublic: false,
        bucketType: "audio",
      });
    }

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

// @desc    Serve an image from GridFS or redirect to R2 (supports both public & private buckets)
// @route   GET /api/images/:fileId, GET /api/images/r2/*, and GET /api/files/r2/*
const serveImage = async (req, res) => {
  try {
    let rawParam = req.params.key || req.params[0] || req.params.fileId;
    if (Array.isArray(rawParam)) {
      rawParam = rawParam.join("/");
    }
    if (rawParam) {
      rawParam = decodeURIComponent(rawParam);
      // Remove any leading slash
      rawParam = rawParam.replace(/^\/+/, "");
    }

    if (rawParam && mongoose.isValidObjectId(rawParam)) {
      await streamFromGridFS(rawParam, res, "image");
    } else if (rawParam && isR2Configured()) {
      // Keys in captures/, telegram/, discord/, books/pdfs/, books/audio/ reside in the private bucket
      const isPrivate =
        rawParam.startsWith("captures/") ||
        rawParam.startsWith("telegram/") ||
        rawParam.startsWith("discord/") ||
        rawParam.startsWith("books/pdfs/") ||
        rawParam.startsWith("books/audio/");

      const targetBucket = isPrivate
        ? R2_CONFIG.privateBucket
        : R2_CONFIG.publicBucket;

      // Stream directly if explicitly requested via query parameter
      if (req.query.proxy === "true") {
        const ext = path.extname(rawParam).toLowerCase();
        const contentType =
          ext === ".png"
            ? "image/png"
            : ext === ".webp"
            ? "image/webp"
            : ext === ".gif"
            ? "image/gif"
            : ext === ".svg"
            ? "image/svg+xml"
            : "image/jpeg";

        return await streamFromR2({
          key: rawParam,
          res,
          req,
          bucket: targetBucket,
          contentType,
          filename: rawParam.split("/").pop() || "image.jpg",
        });
      }

      try {
        const signedUrl = await getPresignedDownloadUrl(rawParam, {
          expiresIn: 86400,
          isPublic: !isPrivate,
        });
        return res.redirect(302, signedUrl);
      } catch (presignErr) {
        console.warn(
          `[serveImage] Presigned URL failed for ${rawParam} (${presignErr.message}), falling back to direct stream`,
        );
        const ext = path.extname(rawParam).toLowerCase();
        const contentType =
          ext === ".png"
            ? "image/png"
            : ext === ".webp"
            ? "image/webp"
            : ext === ".gif"
            ? "image/gif"
            : ext === ".svg"
            ? "image/svg+xml"
            : "image/jpeg";

        return await streamFromR2({
          key: rawParam,
          res,
          req,
          bucket: targetBucket,
          contentType,
          filename: rawParam.split("/").pop() || "image.jpg",
        });
      }
    } else if (rawParam) {
      const gridId = extractGridFsId(rawParam);
      if (gridId && mongoose.isValidObjectId(gridId)) {
        await streamFromGridFS(gridId, res, "image");
      } else {
        res.status(404).json({ message: "Image not found" });
      }
    } else {
      res.status(404).json({ message: "Image not found" });
    }
  } catch (error) {
    console.error("Serve image error:", error);
    res.status(500).json({ message: "Error serving image" });
  }
};

module.exports = {
  getBooks,
  getBook,
  createBook,
  createBookFromPdfUrl,
  updateBook,
  deleteBook,
  removeVideoFromBook,
  removeAudioFromBook,
  servePdf,
  serveAudio,
  getBookPdfUrl,
  getBookAudioUrl,
  serveImage,
  updateVideoProgress,
  updateReadingProgress,
  getBookProgress,
  getCombinedBookNotes,
};
