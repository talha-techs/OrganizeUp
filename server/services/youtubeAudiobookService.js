/**
 * YouTube Audiobook & Book Summaries Service
 * Uses Google YouTube Data API v3 (if GOOGLE_API_KEY is configured)
 * with automatic fallback to fast direct search parsing.
 */

const { google } = require("googleapis");

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
  if (cache.size > 300) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

// Convert ISO 8601 duration (PT2H35M36S) to human-readable string (2:35:36)
function formatDuration(iso) {
  if (!iso) return "";
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "";

  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// Curated search terms for topic presets
const TOPIC_QUERIES = {
  All: "Atomic Habits OR Psychology of Money OR 7 Habits full audiobook",
  "Habits & Mindset": "Atomic Habits OR The Power of Habit OR Mindset Carol Dweck audiobook",
  "Wealth & Finance": "The Psychology of Money OR Rich Dad Poor Dad OR Think and Grow Rich audiobook",
  "Productivity & Focus": "Deep Work Cal Newport OR Eat That Frog OR Essentialism audiobook",
  "Psychology & Influence": "48 Laws of Power OR Influence Robert Cialdini OR How to Win Friends audiobook",
  "Self-Discipline & Grit": "Can't Hurt Me David Goggins OR Discipline Equals Freedom audiobook",
  "Leadership & Business": "7 Habits of Highly Effective People OR Good to Great OR Zero to One audiobook",
};

/**
 * Search via Google YouTube Data API v3
 */
async function searchViaGoogleAPI(searchQuery, topic, limit) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;

  try {
    const youtube = google.youtube({
      version: "v3",
      auth: apiKey,
    });

    const searchRes = await youtube.search.list({
      part: "snippet",
      q: searchQuery,
      type: "video",
      maxResults: Math.min(limit, 50),
      videoEmbeddable: "true",
      videoDuration: "long", // Prioritize full audiobooks (>20 mins)
    });

    const items = searchRes.data.items || [];
    if (items.length === 0) return null;

    const videoIds = items.map((i) => i.id?.videoId).filter(Boolean);

    // Fetch video durations in bulk
    const durationsMap = {};
    if (videoIds.length > 0) {
      const detailsRes = await youtube.videos.list({
        part: "contentDetails",
        id: videoIds.join(","),
      });
      for (const v of detailsRes.data.items || []) {
        durationsMap[v.id] = formatDuration(v.contentDetails?.duration);
      }
    }

    const books = items.map((item) => {
      const vId = item.id.videoId;
      const snippet = item.snippet;
      return {
        id: vId,
        videoId: vId,
        title: snippet.title,
        author: snippet.channelTitle || "YouTube",
        duration: durationsMap[vId] || "",
        thumbnail:
          snippet.thumbnails?.high?.url ||
          snippet.thumbnails?.medium?.url ||
          snippet.thumbnails?.default?.url ||
          `https://i.ytimg.com/vi/${vId}/hqdefault.jpg`,
        description: snippet.description || "",
        publishedTime: snippet.publishedAt ? new Date(snippet.publishedAt).toLocaleDateString() : "",
        source: "youtube",
        topic: topic !== "All" ? topic : "Modern Bestseller",
      };
    });

    return {
      books,
      total: books.length,
      topic,
      query: searchQuery,
    };
  } catch (error) {
    console.warn("YouTube Google Data API search failed, falling back to direct search:", error.message);
    return null;
  }
}

/**
 * Search via direct YouTube parser (robust zero-config fallback)
 */
async function searchViaDirectParser(searchQuery, topic, limit) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  const response = await fetch(url, {
    signal: controller.signal,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  clearTimeout(timeout);

  if (!response.ok) {
    throw new Error(`YouTube search returned status ${response.status}`);
  }

  const html = await response.text();
  const match = html.match(/ytInitialData\s*=\s*({.+?});/);

  if (!match) {
    return { books: [], total: 0 };
  }

  const data = JSON.parse(match[1]);
  const sections =
    data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

  const items = [];

  for (const section of sections) {
    const contents = section.itemSectionRenderer?.contents || [];
    for (const item of contents) {
      const v = item.videoRenderer;
      if (!v || !v.videoId) continue;

      const title = v.title?.runs?.[0]?.text || v.title?.simpleText || "Audiobook";
      const channel =
        v.ownerText?.runs?.[0]?.text ||
        v.shortBylineText?.runs?.[0]?.text ||
        "YouTube";
      const duration = v.lengthText?.simpleText || "";
      const thumbs = v.thumbnail?.thumbnails || [];
      const thumbnail =
        thumbs[thumbs.length - 1]?.url ||
        `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;

      const viewCount = v.viewCountText?.simpleText || "";
      const publishedTime = v.publishedTimeText?.simpleText || "";
      const description =
        v.detailedMetadataSnippets?.[0]?.snippetText?.runs?.map((r) => r.text).join("") ||
        v.descriptionSnippet?.runs?.map((r) => r.text).join("") ||
        "";

      items.push({
        id: v.videoId,
        videoId: v.videoId,
        title,
        author: channel,
        duration,
        thumbnail,
        description,
        viewCount,
        publishedTime,
        source: "youtube",
        topic: topic !== "All" ? topic : "Modern Bestseller",
      });

      if (items.length >= limit) break;
    }
    if (items.length >= limit) break;
  }

  return {
    books: items,
    total: items.length,
    topic,
    query: searchQuery,
  };
}

/**
 * Main search function
 */
async function searchYouTubeAudiobooks({ topic = "All", query = "", limit = 24 } = {}) {
  const searchQuery = query.trim()
    ? `${query.trim()} audiobook`
    : TOPIC_QUERIES[topic] || `${topic} audiobook`;

  const cacheKey = `yt_${topic}_${searchQuery}_${limit}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    // 1. Try official Google YouTube Data API v3 if key is present
    let result = await searchViaGoogleAPI(searchQuery, topic, limit);

    // 2. Fallback to direct parser if API key not available or quota reached
    if (!result || !result.books || result.books.length === 0) {
      result = await searchViaDirectParser(searchQuery, topic, limit);
    }

    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error("YouTube audiobook search error:", error.message);
    return { books: [], total: 0, error: error.message };
  }
}

module.exports = {
  searchYouTubeAudiobooks,
  TOPIC_QUERIES,
};
