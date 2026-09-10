const { google } = require("googleapis");

const youtube = google.youtube({
  version: "v3",
  auth: process.env.GOOGLE_API_KEY,
});

/**
 * Convert ISO 8601 duration (PT1H2M3S) to human-readable string (1:02:03)
 */
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

/**
 * Fetch playlist metadata (title, description, thumbnail, channelTitle)
 */
async function fetchPlaylistDetails(playlistId) {
  const response = await youtube.playlists.list({
    part: "snippet",
    id: playlistId,
  });

  const item = response.data.items?.[0];
  if (!item) {
    throw new Error("Playlist not found on YouTube");
  }

  return {
    title: item.snippet.title,
    description: item.snippet.description || "",
    channelTitle: item.snippet.channelTitle || "",
    thumbnail:
      item.snippet.thumbnails?.maxres?.url ||
      item.snippet.thumbnails?.high?.url ||
      item.snippet.thumbnails?.medium?.url ||
      item.snippet.thumbnails?.default?.url ||
      "",
  };
}

/**
 * Fetch all videos from a playlist (handles pagination)
 */
async function fetchPlaylistVideos(playlistId) {
  const videos = [];
  let nextPageToken = null;

  do {
    const response = await youtube.playlistItems.list({
      part: "snippet",
      playlistId,
      maxResults: 50,
      pageToken: nextPageToken || undefined,
    });

    const videoIds = response.data.items
      .filter((item) => item.snippet.resourceId?.videoId)
      .map((item) => item.snippet.resourceId.videoId);

    // Fetch durations in bulk via videos.list
    let durationsMap = {};
    if (videoIds.length > 0) {
      const detailsRes = await youtube.videos.list({
        part: "contentDetails",
        id: videoIds.join(","),
      });
      for (const v of detailsRes.data.items || []) {
        durationsMap[v.id] = formatDuration(v.contentDetails.duration);
      }
    }

    for (const item of response.data.items) {
      const videoId = item.snippet.resourceId?.videoId;
      if (!videoId) continue; // skip deleted/private items

      videos.push({
        title: item.snippet.title,
        videoId,
        thumbnail:
          item.snippet.thumbnails?.medium?.url ||
          item.snippet.thumbnails?.default?.url ||
          "",
        duration: durationsMap[videoId] || "",
        position: item.snippet.position,
      });
    }

    nextPageToken = response.data.nextPageToken;
  } while (nextPageToken);

  return videos;
}

/**
 * Fetch metadata for a single YouTube video.
 * Uses Google YouTube Data API v3 if GOOGLE_API_KEY is available,
 * with immediate fallback to YouTube oEmbed API for zero-config reliability.
 */
async function fetchVideoDetails(videoId) {
  if (!videoId) {
    throw new Error("Video ID is required");
  }

  // 1. Try Google YouTube Data API v3 if API key exists
  if (process.env.GOOGLE_API_KEY) {
    try {
      const response = await youtube.videos.list({
        part: "snippet,contentDetails",
        id: videoId,
      });

      const item = response.data.items?.[0];
      if (item) {
        return {
          title: item.snippet.title || "YouTube Video",
          description: item.snippet.description || "",
          channelTitle: item.snippet.channelTitle || "",
          thumbnail:
            item.snippet.thumbnails?.maxres?.url ||
            item.snippet.thumbnails?.high?.url ||
            item.snippet.thumbnails?.medium?.url ||
            item.snippet.thumbnails?.default?.url ||
            `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          duration: formatDuration(item.contentDetails?.duration),
        };
      }
    } catch (apiErr) {
      console.warn(
        "YouTube Data API fetchVideoDetails error, falling back to oEmbed:",
        apiErr.message,
      );
    }
  }

  // 2. Fallback to YouTube oEmbed (Free, official, zero-key required)
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const res = await fetch(oembedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (res.ok) {
      const data = await res.json();
      return {
        title: data.title || "YouTube Video",
        description: "",
        channelTitle: data.author_name || "YouTube",
        thumbnail:
          data.thumbnail_url ||
          `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        duration: "",
      };
    }
  } catch (oembedErr) {
    console.warn("YouTube oEmbed fetch error:", oembedErr.message);
  }

  // 3. Last fallback
  return {
    title: `YouTube Video (${videoId})`,
    description: "",
    channelTitle: "YouTube",
    thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    duration: "",
  };
}

module.exports = {
  fetchPlaylistDetails,
  fetchPlaylistVideos,
  fetchVideoDetails,
};
