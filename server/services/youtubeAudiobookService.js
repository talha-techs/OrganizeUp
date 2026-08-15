/**
 * YouTube Audiobook & Book Summaries Service
 * Searches and indexes full-length modern audiobooks and detailed book summaries from YouTube.
 */

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
 * Fetch and parse YouTube search results
 */
async function searchYouTubeAudiobooks({ topic = "All", query = "", limit = 20 } = {}) {
  const searchQuery = query.trim()
    ? `${query.trim()} audiobook`
    : TOPIC_QUERIES[topic] || `${topic} audiobook`;

  const cacheKey = `yt_${topic}_${searchQuery}_${limit}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;

  try {
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
    const match = html.match(/ytInitialData = ({.*?});<\/script>/);

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

        // Extract title
        const title = v.title?.runs?.[0]?.text || v.title?.simpleText || "Audiobook";

        // Extract channel / author
        const channel =
          v.ownerText?.runs?.[0]?.text ||
          v.shortBylineText?.runs?.[0]?.text ||
          "YouTube";

        // Extract duration
        const duration = v.lengthText?.simpleText || "";

        // Extract thumbnail
        const thumbs = v.thumbnail?.thumbnails || [];
        const thumbnail =
          thumbs[thumbs.length - 1]?.url ||
          `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;

        // Extract view count & published time
        const viewCount = v.viewCountText?.simpleText || "";
        const publishedTime = v.publishedTimeText?.simpleText || "";

        // Description snippet
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

    const result = {
      books: items,
      total: items.length,
      topic,
      query,
    };

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
