const mongoose = require("mongoose");
const Book = require("../models/Book");
const User = require("../models/User");
const UserLibrary = require("../models/UserLibrary");
const {
  uploadFile,
  deleteFile,
  getPresignedDownloadUrl,
  streamFromR2,
  streamFromGridFS,
  streamAudioFromGridFS,
  isR2Configured,
  extractGridFsId,
} = require("../services/storageService");

// @desc    Get books (user sees own + saved from library; admin sees all)
// @route   GET /api/books?type=video|text|audio&mine=true
const getBooks = async (req, res) => {
  try {
    const filter = {};
    if (req.query.type) {
      filter.type = req.query.type;
    }

    const savedBookIdMap = new Map();

    if (req.query.mine === "true") {
      filter.addedBy = req.user._id;
    } else if (req.user.role === "admin") {
      const saved = await UserLibrary.find({
        user: req.user._id,
        contentType: "book",
      }).select("contentId _id");
      saved.forEach((s) => savedBookIdMap.set(s.contentId.toString(), s._id));
    } else {
      const saved = await UserLibrary.find({
        user: req.user._id,
        contentType: "book",
      }).select("contentId _id");
      const savedIds = saved.map((s) => s.contentId);
      saved.forEach((s) => savedBookIdMap.set(s.contentId.toString(), s._id));

      filter.$or = [
        { addedBy: req.user._id },
        { _id: { $in: savedIds } },
      ];
    }

    const books = await Book.find(filter)
      .populate("addedBy", "name avatar")
      .sort({ createdAt: -1 });

    const booksWithSaved = books.map((b) => {
      const obj = b.toObject();
      const bIdStr = b._id.toString();
      const isOwner = b.addedBy && String(b.addedBy._id || b.addedBy) === String(req.user._id);
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
        obj.videos?.some((v) => v.driveFileId && /^[a-zA-Z0-9_-]{11}$/.test(v.driveFileId))
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

    const isOwner = book.addedBy && String(book.addedBy._id || book.addedBy) === String(req.user._id);
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

    const targetPdfIdentifier = pdfFileId || (pdfR2Key ? encodeURIComponent(pdfR2Key) : null);
    const generatedEmbedLink = targetPdfIdentifier
      ? `/api/books/pdf/${targetPdfIdentifier}/${encodeURIComponent(title.replace(/[^a-zA-Z0-9-]/g, '-'))}.pdf`
      : embedLink || "";

    const book = await Book.create({
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
      const targetPdfId = uploadedPdf.fileId || encodeURIComponent(uploadedPdf.key);
      book.embedLink = `/api/books/pdf/${targetPdfId}/${encodeURIComponent((title || book.title).replace(/[^a-zA-Z0-9-]/g, '-'))}.pdf`;
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
    if (
      req.user.role !== "admin" &&
      book.addedBy.toString() !== req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this book" });
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
      (vp) => vp.bookId && vp.bookId.toString() === bookId && vp.videoIndex === videoIndex,
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
        progress: isCompleted ? 100 : (progress || 0),
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
        (p) => p.bookId && p.bookId.toString() === bookIdStr
      );
      const noteText = rp?.note?.trim() || "";
      const combinedNotes = noteText ? `# ${book.title} — Study Notes\n\n${noteText}` : "";
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

// @desc    Serve a PDF file from R2 or GridFS (with Range/chunk streaming support)
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
    const isOwner = Boolean(ownerId && String(ownerId) === String(req.user._id));
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin && book.visibility !== "public") {
      return res
        .status(403)
        .json({ message: "Not authorized to access this file" });
    }

    // Only allow same-origin framing for owned/public PDFs
    res.setHeader("X-Frame-Options", "SAMEORIGIN");

    const filename = `${encodeURIComponent((book.title || 'document').replace(/[^a-zA-Z0-9-]/g, '-'))}.pdf`;

    // Dual-Read Resolution: If stored in R2 and R2 is configured, try R2 first
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
          `[servePdf] R2 stream failed for book ${book._id} (${r2Err.message}), falling back to GridFS`
        );
      }
    }

    // GridFS fallback (runs if R2 is not configured, or R2 streaming threw an error, or book only in GridFS)
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

// @desc    Serve an audio file from R2 or GridFS (with Range/seek support)
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
    const isOwner = Boolean(ownerId && String(ownerId) === String(req.user._id));
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
        a._id.toString() === rawParam
    );

    if (!track) return res.status(404).json({ message: "Audio track not found" });

    // Dual-Read Resolution: If stored in R2 and R2 is configured, try R2 first
    let streamed = false;
    if (track.r2Key && isR2Configured()) {
      try {
        const filename = `${encodeURIComponent((track.title || 'audio').replace(/[^a-zA-Z0-9-]/g, '-'))}.mp3`;
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
          `[serveAudio] R2 audio stream failed for track ${track._id} (${r2Err.message}), falling back to GridFS`
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

// @desc    Serve an image from GridFS or redirect to R2
// @route   GET /api/images/:fileId and GET /api/images/r2/*
const serveImage = async (req, res) => {
  try {
    let rawParam = req.params.key || req.params[0] || req.params.fileId;
    if (rawParam) rawParam = decodeURIComponent(rawParam);

    if (rawParam && mongoose.isValidObjectId(rawParam)) {
      await streamFromGridFS(rawParam, res, "image");
    } else if (rawParam && isR2Configured()) {
      // If it's an R2 key or public asset and R2 is configured
      const signedUrl = await getPresignedDownloadUrl(rawParam, {
        expiresIn: 86400,
        isPublic: true,
      });
      res.redirect(302, signedUrl);
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
  getCombinedBookNotes,
};
