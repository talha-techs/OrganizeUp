/**
 * LibriVox & Internet Archive Public Domain Audiobooks Service
 * High-performance, dual-engine service delivering over 21,000 free legal public domain classics.
 * Uses Internet Archive's LibriVox collection for lightning-fast sub-second responses,
 * with seamless fallback to LibriVox official feed API.
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

// Genre mapping between Explore UI genres and API query specifications
const GENRE_MAP = {
  Fiction: {
    ia: "subject:fiction OR title:fiction",
    librivox: "^Literary Fiction",
  },
  Philosophy: {
    ia: "subject:philosophy OR title:philosophy",
    librivox: "^Philosophy",
  },
  History: {
    ia: "subject:history OR title:history",
    librivox: "^History",
  },
  Literature: {
    ia: "subject:literature OR title:literature",
    librivox: "^Literary Fiction",
  },
  Science: {
    ia: "subject:science OR title:science",
    librivox: "^Science",
  },
  Mystery: {
    ia: "subject:mystery OR title:mystery OR subject:detective",
    librivox: "^Detective Fiction",
  },
  Poetry: {
    ia: "subject:poetry OR title:poetry",
    librivox: "^Poetry",
  },
  "Self-Help": {
    ia: 'subject:psychology OR subject:"self-help" OR title:"self-help"',
    librivox: "^*Non-fiction",
  },
  Biography: {
    ia: "subject:biography OR title:biography",
    librivox: "^Biography",
  },
  Adventure: {
    ia: "subject:adventure OR title:adventure",
    librivox: "^Action & Adventure Fiction",
  },
  Children: {
    ia: 'subject:children OR title:children OR subject:"juvenile"',
    librivox: "^Children's Fiction",
  },
};

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
    numSections: parseInt(raw.num_sections, 10) || sections.length || 1,
    genres: genreNames,
    sections,
    urlLibrivox: raw.url_librivox || "",
    urlArchive: raw.url_iarchive || "",
    source: "librivox",
  };
}

/**
 * Fetch from Internet Archive's LibriVox Collection (High-speed primary engine)
 */
async function fetchFromArchiveOrg({ page = 1, limit = 20, genre = "", search = "" }) {
  let query = "collection:(librivoxaudio)";

  if (genre && genre !== "all" && genre !== "All") {
    const gConf = GENRE_MAP[genre];
    if (gConf && gConf.ia) {
      query += ` AND (${gConf.ia})`;
    } else {
      query += ` AND (subject:${genre} OR title:${genre})`;
    }
  }

  if (search && search.trim()) {
    // Sanitize user query against Lucene reserved characters
    const cleanSearch = search.trim().replace(/[:()\[\]{}^"~*?]/g, " ").trim();
    if (cleanSearch) {
      query += ` AND (${cleanSearch})`;
    }
  }

  const params = new URLSearchParams({
    q: query,
    "fl[]": "identifier,title,creator,description,year,downloads,publicdate,item_size",
    "sort[]": "downloads desc",
    rows: String(limit),
    page: String(page),
    output: "json",
  });

  const url = `https://archive.org/advancedsearch.php?${params.toString()}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "OrganizeUp-Audiobooks/1.0",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`Internet Archive status: ${res.status}`);
    }

    const data = await res.json();
    const docs = data.response?.docs || [];
    const total = data.response?.numFound || 0;

    const books = docs.map((doc) => {
      return {
        id: doc.identifier,
        title: (doc.title || "Untitled Audiobook").trim(),
        author: doc.creator || "Unknown Author",
        description: cleanDescription(doc.description),
        coverImage: `https://archive.org/services/img/${doc.identifier}`,
        copyrightYear: doc.year ? String(doc.year) : "",
        language: "English",
        durationFormatted: "Full Audiobook",
        numSections: 1,
        genres: [genre && genre !== "All" && genre !== "all" ? genre : "Classic"],
        sections: [],
        urlLibrivox: "https://librivox.org",
        urlArchive: `https://archive.org/details/${doc.identifier}`,
        source: "librivox",
        downloads: doc.downloads || 0,
      };
    });

    return {
      books,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fetch from official LibriVox API feed (Fallback secondary engine)
 */
async function fetchFromLibriVox({ page = 1, limit = 20, genre = "", search = "" }) {
  const offset = (page - 1) * limit;

  const params = new URLSearchParams({
    format: "json",
    coverart: "1",
    limit: String(limit),
    offset: String(offset),
  });

  if (genre && genre !== "all" && genre !== "All") {
    const gConf = GENRE_MAP[genre];
    const lvGenre = gConf ? gConf.librivox : `^${genre}`;
    params.set("genre", lvGenre);
  }

  if (search && search.trim()) {
    const q = search.trim();
    const cleanQuery = q.startsWith("^") ? q : `^${q}`;
    params.set("title", cleanQuery);
  }

  const url = `https://librivox.org/api/feed/audiobooks/?${params.toString()}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
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
        return {
          books: [],
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasMore: false,
        };
      }
      throw new Error(`LibriVox API error: ${response.status}`);
    }

    const data = await response.json();
    if (data.error) {
      return {
        books: [],
        page,
        limit,
        total: 0,
        totalPages: 0,
        hasMore: false,
      };
    }

    const rawBooks = Array.isArray(data.books) ? data.books : [];
    const books = rawBooks.map(transformLibriVoxBook);

    return {
      books,
      page,
      limit,
      total: books.length,
      totalPages: 1,
      hasMore: books.length === limit,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fetch list of audiobooks with dual-engine reliability (Internet Archive primary, LibriVox fallback)
 */
async function fetchAudiobooks({
  page = 1,
  limit = 20,
  genre = "",
  search = "",
} = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

  const cacheKey = `feed_${pageNum}_${limitNum}_${genre || "all"}_${search || "none"}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    // 1. Try high-speed Internet Archive LibriVox collection
    const result = await fetchFromArchiveOrg({
      page: pageNum,
      limit: limitNum,
      genre,
      search,
    });

    if (result && result.books && result.books.length > 0) {
      setCache(cacheKey, result);
      return result;
    }
  } catch (iaErr) {
    console.warn("Internet Archive search warning:", iaErr.message, "Trying LibriVox API fallback...");
  }

  try {
    // 2. Fallback to official LibriVox API
    const lvResult = await fetchFromLibriVox({
      page: pageNum,
      limit: limitNum,
      genre,
      search,
    });

    setCache(cacheKey, lvResult, 15 * 60 * 1000);
    return lvResult;
  } catch (lvErr) {
    console.error("LibriVox API fetch error:", lvErr.message);
    // Return empty graceful result rather than throwing 500
    const emptyResult = {
      books: [],
      page: pageNum,
      limit: limitNum,
      total: 0,
      totalPages: 0,
      hasMore: false,
    };
    return emptyResult;
  }
}

/**
 * Fetch detailed audiobook with all chapter tracks from Internet Archive
 */
async function fetchArchiveOrgBookById(id) {
  const url = `https://archive.org/metadata/${encodeURIComponent(id)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "OrganizeUp-Audiobooks/1.0",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`Archive.org metadata error: ${res.status}`);
    const data = await res.json();
    if (!data.metadata) return null;

    const meta = data.metadata;
    const allFiles = data.files || [];

    // Filter for actual MP3 tracks
    // Prefer original or standard MP3s, ignore 64kb downsamples if full version exists
    const hasFullMp3 = allFiles.some((f) => f.name?.endsWith(".mp3") && !f.name?.includes("_64kb"));
    const mp3Files = allFiles.filter((f) => {
      if (!f.name || !f.name.toLowerCase().endsWith(".mp3")) return false;
      if (hasFullMp3 && f.name.includes("_64kb")) return false;
      return true;
    });

    // Sort files by track number or natural file name
    mp3Files.sort((a, b) => {
      const trackA = parseInt(a.track || "0", 10);
      const trackB = parseInt(b.track || "0", 10);
      if (trackA && trackB) return trackA - trackB;
      return (a.name || "").localeCompare(b.name || "", undefined, { numeric: true });
    });

    let totalSecs = 0;
    const sections = mp3Files.map((f, idx) => {
      const secs = parseFloat(f.length || "0") || 0;
      totalSecs += secs;

      const rawTitle = f.title || f.name.replace(/\.mp3$/i, "");
      const cleanTitle = rawTitle.replace(/^[0-9]+[_\s-]+/, "").trim();

      return {
        id: f.name,
        sectionNumber: idx + 1,
        title: cleanTitle || `Chapter ${idx + 1}`,
        listenUrl: `https://archive.org/download/${id}/${encodeURIComponent(f.name)}`,
        playtime: String(Math.round(secs)),
        playtimeFormatted: formatDuration(null, secs),
        readers: f.artist ? [f.artist] : (meta.creator ? [meta.creator] : []),
        order: idx,
      };
    });

    const durationFormatted = formatDuration(null, totalSecs);

    return {
      id,
      title: (meta.title || "Untitled Audiobook").trim(),
      author: meta.creator || "Unknown Author",
      description: cleanDescription(meta.description),
      coverImage: `https://archive.org/services/img/${id}`,
      copyrightYear: meta.year ? String(meta.year) : "",
      language: meta.language || "English",
      totalTimeSecs: totalSecs,
      durationFormatted: durationFormatted || "Full Audiobook",
      numSections: sections.length || 1,
      genres: Array.isArray(meta.subject) ? meta.subject : [meta.subject || "Classic"],
      sections,
      urlLibrivox: "https://librivox.org",
      urlArchive: `https://archive.org/details/${id}`,
      source: "librivox",
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fetch a single audiobook with all chapter tracks (handles both Archive.org IDs & LibriVox numeric IDs)
 */
async function fetchAudiobookById(id) {
  if (!id) throw new Error("Audiobook ID is required");

  const cacheKey = `book_${id}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const isNumeric = /^[0-9]+$/.test(String(id).trim());

  if (!isNumeric) {
    // Internet Archive identifier
    try {
      const book = await fetchArchiveOrgBookById(id);
      if (book) {
        setCache(cacheKey, book, 2 * 60 * 60 * 1000);
        return book;
      }
    } catch (iaErr) {
      console.warn(`Archive.org book ${id} warning:`, iaErr.message);
    }
  }

  // Official LibriVox API by numeric ID
  const url = `https://librivox.org/api/feed/audiobooks/?id=${encodeURIComponent(id)}&format=json&extended=1&coverart=1`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "OrganizeUp-Audiobooks/1.0",
      },
    });
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      if (!data.error && data.books && data.books.length > 0) {
        const book = transformLibriVoxBook(data.books[0]);
        setCache(cacheKey, book, 2 * 60 * 60 * 1000);
        return book;
      }
    }
  } catch (error) {
    console.warn(`LibriVox API fetch book ${id} warning:`, error.message);
  } finally {
    clearTimeout(timeout);
  }

  // Fallback: If numeric ID wasn't found or timed out, attempt search on Archive.org
  if (isNumeric) {
    try {
      const iaSearchRes = await fetch(
        `https://archive.org/advancedsearch.php?q=collection:(librivoxaudio)+AND+description:(${encodeURIComponent(id)})&fl[]=identifier&rows=1&output=json`
      );
      if (iaSearchRes.ok) {
        const sData = await iaSearchRes.json();
        const docId = sData.response?.docs?.[0]?.identifier;
        if (docId) {
          const book = await fetchArchiveOrgBookById(docId);
          if (book) {
            book.id = String(id); // Preserve requested id
            setCache(cacheKey, book, 2 * 60 * 60 * 1000);
            return book;
          }
        }
      }
    } catch (fallbackErr) {
      console.error(`Archive.org fallback for book ${id} error:`, fallbackErr.message);
    }
  }

  return null;
}

module.exports = {
  fetchAudiobooks,
  fetchAudiobookById,
  cleanDescription,
  formatAuthors,
};
