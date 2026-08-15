/**
 * LibriVox API Service
 * Fetches and transforms public domain audiobooks from LibriVox and Internet Archive.
 */

// Simple in-memory cache with TTL (1 hour default)
const cache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function getCache(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    cache.delete(key);
    return null;
  }
  return item.data;
}

function setCache(key, data, ttlMs = CACHE_TTL_MS) {
  // Keep cache size bounded
  if (cache.size > 500) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

// Clean HTML tags and decode common entities
function cleanDescription(raw = "") {
  if (!raw) return "";
  return raw
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// Format author list
function formatAuthors(authors = []) {
  if (!Array.isArray(authors) || authors.length === 0) return "Unknown Author";
  return authors
    .map((a) => {
      const parts = [a.first_name, a.last_name].filter(Boolean);
      return parts.join(" ") || "Unknown Author";
    })
    .join(", ");
}

// Format seconds into a clean duration string (e.g. 5h 24m)
function formatDuration(totalTime, totalTimeSecs) {
  if (totalTime && totalTime !== "00:00:00") {
    const parts = totalTime.split(":");
    if (parts.length === 3) {
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (h > 0) return `${h}h ${m}m`;
      return `${m}m`;
    }
  }
  if (totalTimeSecs && !isNaN(totalTimeSecs)) {
    const secs = Number(totalTimeSecs);
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }
  return "";
}

// Transform raw LibriVox book object into OrganizeUp clean format
function transformLibriVoxBook(raw) {
  const authorName = formatAuthors(raw.authors);
  const durationFormatted = formatDuration(raw.totaltime, raw.totaltimesecs);

  const sections = Array.isArray(raw.sections)
    ? raw.sections.map((s, idx) => ({
        id: s.id || String(idx + 1),
        sectionNumber: parseInt(s.section_number, 10) || idx + 1,
        title: (s.title || `Chapter ${idx + 1}`).trim(),
        listenUrl: s.listen_url || "",
        playtime: s.playtime || "",
        playtimeFormatted: formatDuration(null, s.playtime),
        readers: (s.readers || []).map((r) => r.display_name).filter(Boolean),
        order: idx,
      }))
    : [];

  const genreNames = Array.isArray(raw.genres)
    ? raw.genres.map((g) => (typeof g === "string" ? g : g.name)).filter(Boolean)
    : [];

  return {
    id: String(raw.id),
    title: (raw.title || "Untitled Audiobook").trim(),
    author: authorName,
    description: cleanDescription(raw.description),
    coverImage: raw.coverart_jpg || raw.coverart_thumbnail || "",
    copyrightYear: raw.copyright_year || "",
    language: raw.language || "English",
    totalTime: raw.totaltime || "",
    totalTimeSecs: raw.totaltimesecs || 0,
    durationFormatted,
    numSections: parseInt(raw.num_sections, 10) || sections.length,
    genres: genreNames,
    sections,
    urlLibrivox: raw.url_librivox || "",
    urlArchive: raw.url_iarchive || "",
    source: "librivox",
  };
}

/**
 * Fetch list of audiobooks with pagination, genre filter, and search
 */
async function fetchAudiobooks({
  page = 1,
  limit = 20,
  genre = "",
  search = "",
} = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  const cacheKey = `feed_${pageNum}_${limitNum}_${genre || "all"}_${search || "none"}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    format: "json",
    extended: "1",
    coverart: "1",
    limit: String(limitNum),
    offset: String(offset),
  });

  if (genre && genre !== "all" && genre !== "All") {
    // Anchor genre search with ^ to prevent slow unindexed lookups
    const cleanGenre = genre.startsWith("^") ? genre : `^${genre}`;
    params.set("genre", cleanGenre);
  }

  if (search && search.trim()) {
    const q = search.trim();
    // Anchor search if not already anchored
    const cleanQuery = q.startsWith("^") ? q : `^${q}`;
    params.set("title", cleanQuery);
  }

  const url = `https://librivox.org/api/feed/audiobooks/?${params.toString()}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "OrganizeUp-Audiobooks/1.0",
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      if (response.status === 404) {
        const emptyResult = {
          books: [],
          page: pageNum,
          limit: limitNum,
          total: 0,
          totalPages: 0,
          hasMore: false,
        };
        setCache(cacheKey, emptyResult, 10 * 60 * 1000);
        return emptyResult;
      }
      throw new Error(`LibriVox API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      // Empty search or not found
      const emptyResult = {
        books: [],
        page: pageNum,
        limit: limitNum,
        total: 0,
        totalPages: 0,
        hasMore: false,
      };
      setCache(cacheKey, emptyResult, 10 * 60 * 1000);
      return emptyResult;
    }

    const rawBooks = Array.isArray(data.books) ? data.books : [];
    const books = rawBooks.map(transformLibriVoxBook);

    // If search had no title results, try searching by author if appropriate
    const result = {
      books,
      page: pageNum,
      limit: limitNum,
      hasMore: books.length === limitNum,
    };

    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error("LibriVox API fetch error:", error.message);
    throw error;
  }
}

/**
 * Fetch a single audiobook with all chapter tracks
 */
async function fetchAudiobookById(id) {
  if (!id) throw new Error("Audiobook ID is required");

  const cacheKey = `book_${id}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const url = `https://librivox.org/api/feed/audiobooks/?id=${encodeURIComponent(id)}&format=json&extended=1&coverart=1`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "OrganizeUp-Audiobooks/1.0",
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`LibriVox API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.error || !data.books || data.books.length === 0) {
      return null;
    }

    const book = transformLibriVoxBook(data.books[0]);
    setCache(cacheKey, book, 2 * 60 * 60 * 1000); // 2 hours cache
    return book;
  } catch (error) {
    console.error(`LibriVox API fetch book ${id} error:`, error.message);
    throw error;
  }
}

module.exports = {
  fetchAudiobooks,
  fetchAudiobookById,
  cleanDescription,
  formatAuthors,
};
