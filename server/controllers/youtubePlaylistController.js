const YoutubePlaylist = require("../models/YoutubePlaylist");
const User = require("../models/User");
const {
  fetchPlaylistDetails,
  fetchPlaylistVideos,
  fetchVideoDetails,
} = require("../services/youtubeService");

/**
 * Extract playlist ID from various YouTube URL formats
 */
function extractPlaylistId(input) {
  if (!input) return null;
  const trimmed = input.trim();

  // Already a raw ID (PL, UU, OL, etc.)
  if (/^[A-Za-z]{2}[a-zA-Z0-9_-]+$/.test(trimmed) && trimmed.length > 10)
    return trimmed;

  // https://www.youtube.com/playlist?list=PLxxxxxx
  const listMatch = trimmed.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  if (listMatch) return listMatch[1];

  return null;
}

/**
 * Extract video ID from various YouTube video URL formats
 */
function extractVideoId(input) {
  if (!input) return null;
  const trimmed = input.trim();

  // Already a raw 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // youtu.be/VIDEO_ID
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];

  // youtube.com/shorts/VIDEO_ID
  const shortsMatch = trimmed.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch) return shortsMatch[1];

  // youtube.com/watch?v=VIDEO_ID
  const vMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (vMatch) return vMatch[1];

  // youtube.com/embed/VIDEO_ID
  const embedMatch = trimmed.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];

  // youtube.com/v/VIDEO_ID
  const slashVMatch = trimmed.match(/\/v\/([a-zA-Z0-9_-]{11})/);
  if (slashVMatch) return slashVMatch[1];

  return null;
}

// @desc    Get all playlists and single videos (user's own + public)
// @route   GET /api/youtube-playlists
const getPlaylists = async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin";
    const { mine, type } = req.query;

    const baseConditions = [];

    if (mine === "true") {
      // Profile / My Uploads: return only the requesting user's own items
      baseConditions.push({ addedBy: req.user._id });
    } else if (!isAdmin) {
      baseConditions.push({
        $or: [{ addedBy: req.user._id }, { visibility: "public" }],
      });
    }

    if (type === "video") {
      baseConditions.push({ type: "video" });
    } else if (type === "playlist") {
      baseConditions.push({
        $or: [
          { type: "playlist" },
          { type: { $exists: false } },
          { type: null },
        ],
      });
    }

    const filter = baseConditions.length > 0 ? { $and: baseConditions } : {};

    const rawPlaylists = await YoutubePlaylist.find(filter)
      .populate("addedBy", "name avatar")
      .sort({ createdAt: -1 });

    const playlists = rawPlaylists.map((p) => {
      const obj = p.toObject();
      if (!obj.type) obj.type = "playlist";
      return obj;
    });

    const totalPlaylists = playlists.filter((p) => p.type === "playlist").length;
    const totalVideos = playlists.filter((p) => p.type === "video").length;

    res.json({ playlists, totalPlaylists, totalVideos });
  } catch (error) {
    console.error("Get playlists error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get single playlist or video
// @route   GET /api/youtube-playlists/:id
const getPlaylist = async (req, res) => {
  try {
    const playlist = await YoutubePlaylist.findById(req.params.id).populate(
      "addedBy",
      "name avatar",
    );

    if (!playlist) {
      return res.status(404).json({ message: "Item not found" });
    }

    const isOwner = playlist.addedBy._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin && playlist.visibility !== "public") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const user = await User.findById(req.user._id);
    const userProgress = (user?.playlistProgress || []).find(
      (pp) => pp.playlistId && pp.playlistId.toString() === playlist._id.toString(),
    );

    const playlistObj = playlist.toObject();
    if (!playlistObj.type) playlistObj.type = "playlist";

    res.json({
      playlist: playlistObj,
      completedVideos: userProgress?.completedVideos || [],
      progress: userProgress?.progress || 0,
    });
  } catch (error) {
    console.error("Get playlist error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Add a YouTube playlist or single video
// @route   POST /api/youtube-playlists
const addPlaylist = async (req, res) => {
  try {
    const { playlistUrl, url, type } = req.body;
    const targetUrl = (url || playlistUrl || "").trim();

    if (!targetUrl) {
      return res.status(400).json({ message: "YouTube URL is required" });
    }

    // Determine target type (explicit type or auto-detect)
    let itemType = type;
    const extractedPlaylistId = extractPlaylistId(targetUrl);
    const extractedVideoId = extractVideoId(targetUrl);

    if (!itemType) {
      if (extractedPlaylistId && (!extractedVideoId || targetUrl.includes("/playlist?"))) {
        itemType = "playlist";
      } else if (extractedVideoId) {
        itemType = "video";
      } else if (extractedPlaylistId) {
        itemType = "playlist";
      }
    }

    // ──────────────────────────────────────────────
    // 1. ADD SINGLE VIDEO
    // ──────────────────────────────────────────────
    if (itemType === "video") {
      const videoId = extractedVideoId;
      if (!videoId) {
        return res
          .status(400)
          .json({ message: "Invalid YouTube video URL or ID" });
      }

      // Check duplicate
      const existing = await YoutubePlaylist.findOne({
        $or: [{ videoId }, { playlistId: videoId }],
        addedBy: req.user._id,
        type: "video",
      });
      if (existing) {
        return res
          .status(400)
          .json({ message: "You have already saved this video" });
      }

      // Fetch video details (Google API with zero-key oEmbed fallback)
      const details = await fetchVideoDetails(videoId);
      const visibility = req.user.role === "admin" ? "public" : "private";

      const playlist = await YoutubePlaylist.create({
        type: "video",
        title: details.title,
        description: details.description || "",
        videoId,
        playlistId: "",
        url: targetUrl,
        playlistUrl: targetUrl,
        thumbnail: details.thumbnail,
        channelTitle: details.channelTitle,
        videoCount: 1,
        videos: [
          {
            title: details.title,
            videoId,
            thumbnail: details.thumbnail,
            duration: details.duration || "",
            position: 0,
            notes: "",
          },
        ],
        addedBy: req.user._id,
        visibility,
      });

      const populated = await YoutubePlaylist.findById(playlist._id).populate(
        "addedBy",
        "name avatar",
      );

      return res.status(201).json({ playlist: populated });
    }

    // ──────────────────────────────────────────────
    // 2. ADD PLAYLIST
    // ──────────────────────────────────────────────
    const playlistId = extractedPlaylistId;
    if (!playlistId) {
      return res
        .status(400)
        .json({ message: "Invalid YouTube playlist URL or ID" });
    }

    // Check for duplicate
    const existing = await YoutubePlaylist.findOne({
      playlistId,
      addedBy: req.user._id,
      $or: [{ type: "playlist" }, { type: { $exists: false } }],
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
      type: "playlist",
      title: details.title,
      description: details.description,
      playlistId,
      videoId: "",
      url: targetUrl,
      playlistUrl: targetUrl,
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
      "name avatar",
    );

    return res.status(201).json({ playlist: populated });
  } catch (error) {
    console.error("Add YouTube item error:", error);
    if (
      error.message === "Playlist not found on YouTube" ||
      error.message === "Video not found on YouTube"
    ) {
      return res.status(404).json({ message: error.message });
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
      "name avatar",
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

    // Also sync note into User.videoProgress
    const user = await User.findById(req.user._id);
    if (user) {
      if (!user.videoProgress) user.videoProgress = [];
      let vProg = user.videoProgress.find(
        (vp) => vp.contentType === "youtube" && vp.videoId === req.params.videoId,
      );
      if (vProg) {
        vProg.note = video.notes;
        vProg.title = video.title;
        vProg.lastWatched = new Date();
      } else {
        user.videoProgress.push({
          playlistId: playlist._id,
          contentType: "youtube",
          videoId: req.params.videoId,
          title: video.title,
          progress: 100,
          completed: true,
          note: video.notes,
          lastWatched: new Date(),
        });
      }
      await user.save();
    }

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
// @desc    Re-sync item from YouTube (refresh)
// @route   POST /api/youtube-playlists/:id/refresh
const refreshPlaylist = async (req, res) => {
  try {
    const playlist = await YoutubePlaylist.findById(req.params.id);
    if (!playlist) {
      return res.status(404).json({ message: "Item not found" });
    }

    const isOwner = playlist.addedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // ──────────────────────────────────────────────
    // 1. REFRESH SINGLE VIDEO
    // ──────────────────────────────────────────────
    if (playlist.type === "video") {
      const vId = playlist.videoId || playlist.videos?.[0]?.videoId;
      if (!vId) {
        return res.status(400).json({ message: "Missing video ID" });
      }

      const existingNotes = playlist.videos?.[0]?.notes || "";
      const details = await fetchVideoDetails(vId);

      playlist.title = details.title;
      playlist.thumbnail = details.thumbnail;
      playlist.channelTitle = details.channelTitle;
      playlist.videos = [
        {
          title: details.title,
          videoId: vId,
          thumbnail: details.thumbnail,
          duration: details.duration || playlist.videos?.[0]?.duration || "",
          position: 0,
          notes: existingNotes,
        },
      ];

      await playlist.save();

      const populated = await YoutubePlaylist.findById(playlist._id).populate(
        "addedBy",
        "name avatar",
      );

      return res.json({ playlist: populated });
    }

    // ──────────────────────────────────────────────
    // 2. REFRESH PLAYLIST
    // ──────────────────────────────────────────────
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
      "name avatar",
    );

    res.json({ playlist: populated });
  } catch (error) {
    console.error("Refresh item error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Delete a playlist
// @route   DELETE /api/youtube-playlists/:id
const deletePlaylist = async (req, res) => {
  try {
    const playlist = await YoutubePlaylist.findById(req.params.id);
    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }
    if (
      req.user.role !== "admin" &&
      playlist.addedBy.toString() !== req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this playlist" });
    }

    await playlist.deleteOne();
    res.json({ message: "Playlist deleted" });
  } catch (error) {
    console.error("Delete playlist error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Toggle or update completion status for a video in a playlist
// @route   PUT /api/youtube-playlists/:id/videos/:videoId/progress
const updatePlaylistVideoProgress = async (req, res) => {
  try {
    const { completed, note } = req.body;
    const playlist = await YoutubePlaylist.findById(req.params.id);
    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    const video = playlist.videos.find((v) => v.videoId === req.params.videoId);
    if (!video) {
      return res.status(404).json({ message: "Video not found in playlist" });
    }

    const user = await User.findById(req.user._id);
    if (!user.playlistProgress) user.playlistProgress = [];

    let pProg = user.playlistProgress.find(
      (pp) => pp.playlistId && pp.playlistId.toString() === playlist._id.toString(),
    );

    if (!pProg) {
      pProg = {
        playlistId: playlist._id,
        completedVideos: [],
        progress: 0,
        completed: false,
        lastWatched: new Date(),
      };
      user.playlistProgress.push(pProg);
      pProg = user.playlistProgress[user.playlistProgress.length - 1];
    }

    const isMarkedCompleted = completed !== false;

    if (isMarkedCompleted) {
      if (!pProg.completedVideos.includes(req.params.videoId)) {
        pProg.completedVideos.push(req.params.videoId);
      }
    } else {
      pProg.completedVideos = pProg.completedVideos.filter(
        (id) => id !== req.params.videoId,
      );
    }

    const totalVideos = playlist.videos?.length || 0;
    pProg.progress =
      totalVideos > 0
        ? Math.round((pProg.completedVideos.length / totalVideos) * 100)
        : 0;
    pProg.completed = totalVideos > 0 && pProg.completedVideos.length >= totalVideos;
    pProg.lastWatched = new Date();

    // Universal videoProgress sync
    if (!user.videoProgress) user.videoProgress = [];
    let vProg = user.videoProgress.find(
      (vp) => vp.contentType === "youtube" && vp.videoId === req.params.videoId,
    );

    if (vProg) {
      vProg.completed = isMarkedCompleted;
      vProg.progress = isMarkedCompleted ? 100 : 0;
      if (note !== undefined) vProg.note = note;
      vProg.title = video.title;
      vProg.lastWatched = new Date();
    } else {
      user.videoProgress.push({
        playlistId: playlist._id,
        contentType: "youtube",
        videoId: req.params.videoId,
        title: video.title,
        progress: isMarkedCompleted ? 100 : 0,
        completed: isMarkedCompleted,
        note: note || video.notes || "",
        lastWatched: new Date(),
      });
    }

    await user.save();

    res.json({
      message: "Playlist video progress updated",
      playlistProgress: pProg,
      completedVideos: pProg.completedVideos,
      videoProgress: user.videoProgress,
    });
  } catch (error) {
    console.error("Update playlist video progress error:", error);
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
  updatePlaylistVideoProgress,
};
