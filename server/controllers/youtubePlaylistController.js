const YoutubePlaylist = require("../models/YoutubePlaylist");
const {
  fetchPlaylistDetails,
  fetchPlaylistVideos,
} = require("../services/youtubeService");

/**
 * Extract playlist ID from various YouTube URL formats
 */
function extractPlaylistId(input) {
  const trimmed = input.trim();

  // Already a raw ID (PL, UU, OL, etc.)
  if (/^[A-Za-z]{2}[a-zA-Z0-9_-]+$/.test(trimmed) && trimmed.length > 10)
    return trimmed;

  // https://www.youtube.com/playlist?list=PLxxxxxx
  const listMatch = trimmed.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  if (listMatch) return listMatch[1];

  return null;
}

// @desc    Get all playlists (user's own + public)
// @route   GET /api/youtube-playlists
const getPlaylists = async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin";

    let filter;
    if (isAdmin) {
      filter = {};
    } else if (req.query.mine === "true") {
      filter = { addedBy: req.user._id };
    } else {
      filter = {
        $or: [{ addedBy: req.user._id }, { visibility: "public" }],
      };
    }

    const playlists = await YoutubePlaylist.find(filter)
      .populate("addedBy", "name email avatar")
      .sort({ createdAt: -1 });

    res.json({ playlists });
  } catch (error) {
    console.error("Get playlists error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get single playlist
// @route   GET /api/youtube-playlists/:id
const getPlaylist = async (req, res) => {
  try {
    const playlist = await YoutubePlaylist.findById(req.params.id).populate(
      "addedBy",
      "name email avatar",
    );

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    const isOwner = playlist.addedBy._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin && playlist.visibility !== "public") {
      return res.status(403).json({ message: "Not authorized" });
    }

    res.json({ playlist });
  } catch (error) {
    console.error("Get playlist error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Add a YouTube playlist (auto-fetches metadata + videos from YouTube API)
// @route   POST /api/youtube-playlists
const addPlaylist = async (req, res) => {
  try {
    const { playlistUrl } = req.body;

    if (!playlistUrl) {
      return res.status(400).json({ message: "Playlist URL is required" });
    }

    const playlistId = extractPlaylistId(playlistUrl);
    if (!playlistId) {
      return res.status(400).json({ message: "Invalid YouTube playlist URL" });
    }

    // Check for duplicate
    const existing = await YoutubePlaylist.findOne({
      playlistId,
      addedBy: req.user._id,
    });
    if (existing) {
      return res
        .status(400)
        .json({ message: "You have already saved this playlist" });
    }

    // Fetch from YouTube Data API
    const [details, videos] = await Promise.all([
      fetchPlaylistDetails(playlistId),
      fetchPlaylistVideos(playlistId),
    ]);

    const visibility = req.user.role === "admin" ? "public" : "private";

    const playlist = await YoutubePlaylist.create({
      title: details.title,
      description: details.description,
      playlistId,
      playlistUrl,
      thumbnail: details.thumbnail,
      channelTitle: details.channelTitle,
      videoCount: videos.length,
      videos: videos.map((v, i) => ({
        title: v.title,
        videoId: v.videoId,
        thumbnail: v.thumbnail,
        duration: v.duration,
        position: i,
        notes: "",
      })),
      addedBy: req.user._id,
      visibility,
    });

    const populated = await YoutubePlaylist.findById(playlist._id).populate(
      "addedBy",
      "name email avatar",
    );

    res.status(201).json({ playlist: populated });
  } catch (error) {
    console.error("Add playlist error:", error);
    if (error.message === "Playlist not found on YouTube") {
      return res.status(404).json({ message: "Playlist not found on YouTube" });
    }
    if (error.code === 403 || error.status === 403) {
      return res.status(403).json({
        message:
          "YouTube API access denied. Please enable the YouTube Data API v3 in your Google Cloud Console.",
      });
    }
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Update a playlist
// @route   PUT /api/youtube-playlists/:id
const updatePlaylist = async (req, res) => {
  try {
    const playlist = await YoutubePlaylist.findById(req.params.id);
    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    const isOwner = playlist.addedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { title, description, thumbnail, videos } = req.body;
    if (title) playlist.title = title;
    if (description !== undefined) playlist.description = description;
    if (thumbnail !== undefined) playlist.thumbnail = thumbnail;
    if (videos) {
      playlist.videos = videos.map((v, i) => ({
        title: v.title || "",
        videoId: v.videoId || "",
        thumbnail: v.thumbnail || "",
        duration: v.duration || "",
        position: i,
        notes: v.notes || "",
      }));
      playlist.videoCount = videos.length;
    }

    await playlist.save();

    const populated = await YoutubePlaylist.findById(playlist._id).populate(
      "addedBy",
      "name email avatar",
    );

    res.json({ playlist: populated });
  } catch (error) {
    console.error("Update playlist error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Save notes for a specific video in a playlist
// @route   PUT /api/youtube-playlists/:id/videos/:videoId/notes
const saveVideoNotes = async (req, res) => {
  try {
    const playlist = await YoutubePlaylist.findById(req.params.id);
    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    const isOwner = playlist.addedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const video = playlist.videos.find((v) => v.videoId === req.params.videoId);
    if (!video) {
      return res.status(404).json({ message: "Video not found in playlist" });
    }

    video.notes = req.body.notes || "";
    await playlist.save();

    res.json({ message: "Notes saved", video });
  } catch (error) {
    console.error("Save video notes error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get combined sequential notes for all videos in a playlist
// @route   GET /api/youtube-playlists/:id/notes
const getCombinedNotes = async (req, res) => {
  try {
    const playlist = await YoutubePlaylist.findById(req.params.id);
    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    const isOwner = playlist.addedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin && playlist.visibility !== "public") {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Build combined notes document
    const sections = playlist.videos
      .sort((a, b) => a.position - b.position)
      .filter((v) => v.notes && v.notes.trim())
      .map((v) => `## ${v.position + 1}. ${v.title}\n\n${v.notes}`);

    const combinedNotes =
      sections.length > 0
        ? `# ${playlist.title} — Notes\n\n${sections.join("\n\n---\n\n")}`
        : "";

    res.json({ combinedNotes, playlistTitle: playlist.title });
  } catch (error) {
    console.error("Get combined notes error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Re-sync videos from YouTube (refresh)
// @route   POST /api/youtube-playlists/:id/refresh
const refreshPlaylist = async (req, res) => {
  try {
    const playlist = await YoutubePlaylist.findById(req.params.id);
    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    const isOwner = playlist.addedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Build a map of existing notes by videoId
    const existingNotesMap = {};
    for (const v of playlist.videos) {
      if (v.notes) existingNotesMap[v.videoId] = v.notes;
    }

    const [details, videos] = await Promise.all([
      fetchPlaylistDetails(playlist.playlistId),
      fetchPlaylistVideos(playlist.playlistId),
    ]);

    playlist.title = details.title;
    playlist.description = details.description;
    playlist.thumbnail = details.thumbnail;
    playlist.channelTitle = details.channelTitle;
    playlist.videoCount = videos.length;
    playlist.videos = videos.map((v, i) => ({
      title: v.title,
      videoId: v.videoId,
      thumbnail: v.thumbnail,
      duration: v.duration,
      position: i,
      notes: existingNotesMap[v.videoId] || "",
    }));

    await playlist.save();

    const populated = await YoutubePlaylist.findById(playlist._id).populate(
      "addedBy",
      "name email avatar",
    );

    res.json({ playlist: populated });
  } catch (error) {
    console.error("Refresh playlist error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Delete a playlist
// @route   DELETE /api/youtube-playlists/:id
const deletePlaylist = async (req, res) => {
  try {
    const playlist =
      req.user.role === "admin"
        ? await YoutubePlaylist.findById(req.params.id)
        : await YoutubePlaylist.findOne({
            _id: req.params.id,
            addedBy: req.user._id,
          });
    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    await playlist.deleteOne();
    res.json({ message: "Playlist deleted" });
  } catch (error) {
    console.error("Delete playlist error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getPlaylists,
  getPlaylist,
  addPlaylist,
  updatePlaylist,
  deletePlaylist,
  saveVideoNotes,
  getCombinedNotes,
  refreshPlaylist,
};
