const Book = require("../models/Book");
const UserLibrary = require("../models/UserLibrary");
const librivoxService = require("../services/librivoxService");
const youtubeAudiobookService = require("../services/youtubeAudiobookService");

// @desc    Get explore audiobooks from LibriVox API
// @route   GET /api/audiobooks/explore?page=1&limit=20&genre=...&search=...
const getExploreAudiobooks = async (req, res) => {
  try {
    const { page = 1, limit = 20, genre = "", search = "" } = req.query;

    const data = await librivoxService.fetchAudiobooks({
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
      genre,
      search,
    });

    // Check which books the user already saved in their library
    if (req.user && data.books && data.books.length > 0) {
      const librivoxIds = data.books.map((b) => b.id);

      const existingBooks = await Book.find({
        librivoxId: { $in: librivoxIds },
      }).select("_id librivoxId");

      if (existingBooks.length > 0) {
        const bookIdToLibrivoxId = {};
        const bookObjectIds = existingBooks.map((b) => {
          bookIdToLibrivoxId[b._id.toString()] = b.librivoxId;
          return b._id;
        });

        const savedEntries = await UserLibrary.find({
          user: req.user._id,
          contentType: "book",
          contentId: { $in: bookObjectIds },
        });

        const savedMap = {};
        savedEntries.forEach((entry) => {
          const lId = bookIdToLibrivoxId[entry.contentId.toString()];
          if (lId) {
            savedMap[lId] = {
              saved: true,
              libraryId: entry._id,
              dbBookId: entry.contentId,
            };
          }
        });

        data.books = data.books.map((b) => ({
          ...b,
          isSaved: !!savedMap[b.id]?.saved,
          libraryId: savedMap[b.id]?.libraryId || null,
          dbBookId: savedMap[b.id]?.dbBookId || null,
        }));
      }
    }

    res.json(data);
  } catch (error) {
    console.error("Get explore audiobooks error:", error.message);
    res.status(500).json({
      message: "Failed to fetch audiobooks from LibriVox",
      error: error.message,
    });
  }
};

// @desc    Get single LibriVox audiobook details & chapter tracks
// @route   GET /api/audiobooks/:id
const getAudiobookById = async (req, res) => {
  try {
    const { id } = req.params;
    const book = await librivoxService.fetchAudiobookById(id);

    if (!book) {
      return res.status(404).json({ message: "Audiobook not found" });
    }

    let isSaved = false;
    let libraryId = null;
    let dbBookId = null;

    if (req.user) {
      const existingBook = await Book.findOne({ librivoxId: id });
      if (existingBook) {
        dbBookId = existingBook._id;
        const savedEntry = await UserLibrary.findOne({
          user: req.user._id,
          contentType: "book",
          contentId: existingBook._id,
        });
        if (savedEntry) {
          isSaved = true;
          libraryId = savedEntry._id;
        }
      }
    }

    res.json({
      book,
      isSaved,
      libraryId,
      dbBookId,
    });
  } catch (error) {
    console.error(`Get audiobook ${req.params.id} error:`, error.message);
    res.status(500).json({ message: "Failed to fetch audiobook details" });
  }
};

// @desc    Save a LibriVox audiobook reference into user's library
// @route   POST /api/audiobooks/:id/save
const saveAudiobookToLibrary = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // 1. Fetch audiobook data from LibriVox
    const lvBook = await librivoxService.fetchAudiobookById(id);
    if (!lvBook) {
      return res.status(404).json({ message: "LibriVox audiobook not found" });
    }

    // 2. Find or create the lightweight Book reference in DB
    let bookDoc = await Book.findOne({ librivoxId: id });

    if (!bookDoc) {
      bookDoc = await Book.create({
        title: lvBook.title,
        author: lvBook.author,
        type: "audio",
        description: lvBook.description,
        coverImage: lvBook.coverImage,
        copyrightYear: lvBook.copyrightYear,
        librivoxId: lvBook.id,
        source: "librivox",
        visibility: "public",
        addedBy: userId,
        audioFiles: lvBook.sections.map((s, idx) => ({
          title: s.title || `Chapter ${idx + 1}`,
          audioUrl: s.listenUrl,
          originalName: s.title || "",
          duration: s.playtimeFormatted || "",
          order: idx,
        })),
      });
    }

    // 3. Create or find UserLibrary entry
    let saved = await UserLibrary.findOne({
      user: userId,
      contentType: "book",
      contentId: bookDoc._id,
    });

    if (!saved) {
      saved = await UserLibrary.create({
        user: userId,
        contentType: "book",
        contentId: bookDoc._id,
      });
    }

    res.status(201).json({
      message: "Audiobook saved to your library",
      book: bookDoc,
      libraryId: saved._id,
      isSaved: true,
    });
  } catch (error) {
    console.error("Save audiobook to library error:", error);
    res.status(500).json({ message: "Failed to save audiobook to library" });
  }
};

// @desc    Remove a LibriVox audiobook from user's library
// @route   DELETE /api/audiobooks/:id/unsave
const unsaveAudiobookFromLibrary = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const bookDoc = await Book.findOne({ librivoxId: id });
    if (!bookDoc) {
      return res.status(404).json({ message: "Book reference not found" });
    }

    await UserLibrary.deleteOne({
      user: userId,
      contentType: "book",
      contentId: bookDoc._id,
    });

    res.json({ message: "Removed from your library", isSaved: false });
  } catch (error) {
    console.error("Unsave audiobook error:", error);
    res.status(500).json({ message: "Failed to remove audiobook from library" });
  }
};

// @desc    Get Modern Audiobooks & Book Summaries (YouTube)
// @route   GET /api/audiobooks/modern?topic=...&search=...
const getModernAudiobooks = async (req, res) => {
  try {
    const { topic = "All", search = "" } = req.query;

    const data = await youtubeAudiobookService.searchYouTubeAudiobooks({
      topic,
      query: search,
      limit: 24,
    });

    // Check which videos user already saved in library
    if (req.user && data.books && data.books.length > 0) {
      const videoIds = data.books.map((b) => b.videoId);

      const existingBooks = await Book.find({
        "videos.driveFileId": { $in: videoIds },
      }).select("_id videos");

      if (existingBooks.length > 0) {
        const videoIdToBookId = {};
        const bookObjectIds = existingBooks.map((b) => {
          const vId = b.videos?.[0]?.driveFileId;
          if (vId) videoIdToBookId[vId] = b._id;
          return b._id;
        });

        const savedEntries = await UserLibrary.find({
          user: req.user._id,
          contentType: "book",
          contentId: { $in: bookObjectIds },
        });

        const savedBookIds = new Set(savedEntries.map((e) => e.contentId.toString()));

        data.books = data.books.map((b) => {
          const dbId = videoIdToBookId[b.videoId];
          const isSaved = dbId ? savedBookIds.has(dbId.toString()) : false;
          return {
            ...b,
            isSaved,
            dbBookId: dbId || null,
          };
        });
      }
    }

    res.json(data);
  } catch (error) {
    console.error("Get modern audiobooks error:", error);
    res.status(500).json({ message: "Failed to search modern audiobooks" });
  }
};

// @desc    Save a Modern Audiobook (YouTube) to user's library
// @route   POST /api/audiobooks/modern/:videoId/save
const saveModernAudiobookToLibrary = async (req, res) => {
  try {
    const { videoId } = req.params;
    const { title, author, duration, thumbnail, description } = req.body;
    const userId = req.user._id;

    // Find or create Book document
    let bookDoc = await Book.findOne({ "videos.driveFileId": videoId });

    if (!bookDoc) {
      bookDoc = await Book.create({
        title: title || "Modern Audiobook",
        author: author || "Bestseller",
        type: "video",
        description: description || "Modern Audiobook & Summary",
        coverImage: thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        source: "drive",
        visibility: "public",
        addedBy: userId,
        videos: [
          {
            title: title || "Full Audiobook",
            driveFileId: videoId, // YouTube video ID mapped for player
            duration: duration || "",
            order: 0,
          },
        ],
      });
    }

    // Create UserLibrary entry
    let saved = await UserLibrary.findOne({
      user: userId,
      contentType: "book",
      contentId: bookDoc._id,
    });

    if (!saved) {
      saved = await UserLibrary.create({
        user: userId,
        contentType: "book",
        contentId: bookDoc._id,
      });
    }

    res.status(201).json({
      message: "Saved to your library",
      book: bookDoc,
      libraryId: saved._id,
      isSaved: true,
    });
  } catch (error) {
    console.error("Save modern audiobook error:", error);
    res.status(500).json({ message: "Failed to save modern audiobook" });
  }
};

module.exports = {
  getExploreAudiobooks,
  getAudiobookById,
  saveAudiobookToLibrary,
  unsaveAudiobookFromLibrary,
  getModernAudiobooks,
  saveModernAudiobookToLibrary,
};
