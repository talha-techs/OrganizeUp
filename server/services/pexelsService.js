/**
 * Pexels Image Service
 * Automatically fetches relevant landscape banner images based on query keywords.
 */

async function fetchPexelsBanner(query) {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey || !apiKey.trim() || !query || !query.trim()) {
    return "";
  }

  try {
    // Clean up query: remove punctuation and extra spaces
    const cleanQuery = query.replace(/[^\w\s]/gi, " ").trim();
    if (!cleanQuery) return "";

    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(
      cleanQuery,
    )}&per_page=1&orientation=landscape`;

    const res = await fetch(url, {
      headers: {
        Authorization: apiKey.trim(),
        "User-Agent": "OrganizeUp/1.0",
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      console.warn(`Pexels API responded with status ${res.status} for query "${cleanQuery}"`);
      return "";
    }

    const data = await res.json();
    if (data.photos && data.photos.length > 0) {
      const photo = data.photos[0];
      return (
        photo.src?.large2x ||
        photo.src?.landscape ||
        photo.src?.large ||
        photo.src?.original ||
        ""
      );
    }

    return "";
  } catch (err) {
    console.warn("Pexels fetch banner error (non-fatal):", err.message);
    return "";
  }
}

module.exports = {
  fetchPexelsBanner,
};
