import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import {
  IoArrowBack,
  IoLogoYoutube,
  IoPlayCircleOutline,
  IoOpenOutline,
  IoDocumentTextOutline,
  IoRefreshOutline,
  IoCheckmarkCircle,
  IoSaveOutline,
  IoClipboardOutline,
  IoDownloadOutline,
} from 'react-icons/io5';
import {
  fetchPlaylist,
  clearCurrentPlaylist,
  saveVideoNotes,
  fetchCombinedNotes,
  refreshPlaylist,
} from '../redux/slices/youtubePlaylistSlice';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

const YouTubePlaylistDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentPlaylist, isLoading, isSavingNotes, combinedNotes } = useSelector(
    (state) => state.playlists,
  );

  const [activeVideoId, setActiveVideoId] = useState(null);
  const [localNotes, setLocalNotes] = useState('');
  const [showCombinedNotes, setShowCombinedNotes] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const saveTimeoutRef = useRef(null);
  const notesTextareaRef = useRef(null);

  useEffect(() => {
    dispatch(fetchPlaylist(id));
    return () => {
      dispatch(clearCurrentPlaylist());
    };
  }, [dispatch, id]);

  // Set first video as active on load
  useEffect(() => {
    if (currentPlaylist?.videos?.length > 0 && !activeVideoId) {
      setActiveVideoId(currentPlaylist.videos[0].videoId);
      setLocalNotes(currentPlaylist.videos[0].notes || '');
    }
  }, [currentPlaylist, activeVideoId]);

  const activeVideo = currentPlaylist?.videos?.find(
    (v) => v.videoId === activeVideoId,
  );

  const handleSelectVideo = useCallback(
    (video) => {
      // Auto-save current notes before switching
      if (activeVideoId && localNotes !== (activeVideo?.notes || '')) {
        dispatch(
          saveVideoNotes({
            playlistId: id,
            videoId: activeVideoId,
            notes: localNotes,
          }),
        );
      }
      setActiveVideoId(video.videoId);
      setLocalNotes(video.notes || '');
    },
    [activeVideoId, activeVideo, localNotes, dispatch, id],
  );

  const handleSaveNotes = useCallback(() => {
    if (!activeVideoId) return;
    dispatch(
      saveVideoNotes({
        playlistId: id,
        videoId: activeVideoId,
        notes: localNotes,
      }),
    ).then((result) => {
      if (result.meta.requestStatus === 'fulfilled') {
        toast.success('Notes saved');
      }
    });
  }, [dispatch, id, activeVideoId, localNotes]);

  // Auto-save on Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveNotes();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSaveNotes]);

  // Auto-save after 3 seconds of inactivity
  const handleNotesChange = (e) => {
    setLocalNotes(e.target.value);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      if (activeVideoId) {
        dispatch(
          saveVideoNotes({
            playlistId: id,
            videoId: activeVideoId,
            notes: e.target.value,
          }),
        );
      }
    }, 3000);
  };

  const handleShowCombinedNotes = () => {
    if (!showCombinedNotes) {
      dispatch(fetchCombinedNotes(id));
    }
    setShowCombinedNotes(!showCombinedNotes);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const result = await dispatch(refreshPlaylist(id));
    setIsRefreshing(false);
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success('Playlist refreshed from YouTube');
    } else {
      toast.error(result.payload || 'Failed to refresh');
    }
  };

  const handleCopyCombinedNotes = () => {
    navigator.clipboard.writeText(combinedNotes);
    toast.success('Notes copied to clipboard');
  };

  const handleDownloadNotes = () => {
    const blob = new Blob([combinedNotes], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentPlaylist?.title || 'playlist'}-notes.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading || !currentPlaylist) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <LoadingSpinner text="Loading playlist..." />
      </div>
    );
  }

  const embedUrl = activeVideoId
    ? `https://www.youtube.com/embed/${activeVideoId}?autoplay=0&rel=0`
    : `https://www.youtube.com/embed/videoseries?list=${currentPlaylist.playlistId}`;
  const ytUrl = currentPlaylist.playlistUrl || `https://www.youtube.com/playlist?list=${currentPlaylist.playlistId}`;

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button
          onClick={() => navigate('/youtube-playlists')}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-4 transition-colors"
        >
          <IoArrowBack size={14} /> All Playlists
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-display">{currentPlaylist.title}</h1>
            {currentPlaylist.channelTitle && (
              <p className="text-red-400 text-sm mt-1">{currentPlaylist.channelTitle}</p>
            )}
            <p className="text-xs text-slate-500 mt-1">
              {currentPlaylist.videoCount || 0} video{currentPlaylist.videoCount !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="btn-secondary flex items-center gap-2 text-sm"
              title="Re-sync videos from YouTube"
            >
              <IoRefreshOutline size={16} className={isRefreshing ? 'animate-spin' : ''} />
              {isRefreshing ? 'Syncing...' : 'Refresh'}
            </button>
            <button
              onClick={handleShowCombinedNotes}
              className={`btn-secondary flex items-center gap-2 text-sm ${showCombinedNotes ? 'ring-1 ring-indigo-500' : ''}`}
            >
              <IoDocumentTextOutline size={16} />
              All Notes
            </button>
            <a
              href={ytUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <IoOpenOutline size={16} /> YouTube
            </a>
          </div>
        </div>
      </motion.div>

      {/* Combined Notes Panel */}
      {showCombinedNotes && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="glass-card p-6 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <IoDocumentTextOutline size={20} />
              Combined Notes — {currentPlaylist.title}
            </h3>
            {combinedNotes && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCombinedNotes}
                  className="btn-secondary flex items-center gap-1.5 text-xs"
                >
                  <IoClipboardOutline size={14} /> Copy
                </button>
                <button
                  onClick={handleDownloadNotes}
                  className="btn-secondary flex items-center gap-1.5 text-xs"
                >
                  <IoDownloadOutline size={14} /> Download .md
                </button>
              </div>
            )}
          </div>
          {combinedNotes ? (
            <div className="bg-slate-900/50 rounded-xl p-4 max-h-96 overflow-y-auto">
              <pre className="text-sm text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
                {combinedNotes}
              </pre>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No notes yet. Select a video and start writing notes below the player.</p>
          )}
        </motion.div>
      )}

      {/* Main Layout: Player + Video List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Player + Notes */}
        <div className="lg:col-span-2 space-y-4">
          {/* Video Player */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card overflow-hidden"
          >
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                key={activeVideoId}
                src={embedUrl}
                className="absolute inset-0 w-full h-full rounded-2xl"
                title={activeVideo?.title || currentPlaylist.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                frameBorder="0"
              />
            </div>
          </motion.div>

          {/* Active video title */}
          {activeVideo && (
            <div className="px-1">
              <h2 className="text-lg font-semibold text-white">{activeVideo.title}</h2>
              {activeVideo.duration && (
                <span className="text-xs text-slate-500">Duration: {activeVideo.duration}</span>
              )}
            </div>
          )}

          {/* Notes Section */}
          {activeVideo && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <IoDocumentTextOutline size={16} />
                  Notes — {activeVideo.title}
                </h3>
                <div className="flex items-center gap-2">
                  {isSavingNotes && (
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Saving...
                    </span>
                  )}
                  <button
                    onClick={handleSaveNotes}
                    className="btn-secondary flex items-center gap-1.5 text-xs"
                    disabled={isSavingNotes}
                  >
                    <IoSaveOutline size={14} /> Save
                  </button>
                </div>
              </div>
              <textarea
                ref={notesTextareaRef}
                value={localNotes}
                onChange={handleNotesChange}
                placeholder="Write your notes for this video here... (auto-saves after 3s, or press Ctrl+S)"
                className="input-dark w-full min-h-[160px] resize-y text-sm leading-relaxed"
              />
              <p className="text-xs text-slate-600 mt-1.5">
                Notes are saved per video and combined sequentially under "All Notes".
              </p>
            </motion.div>
          )}
        </div>

        {/* Right: Video List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="lg:col-span-1"
        >
          <div className="glass-card p-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-6rem)] overflow-hidden flex flex-col">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">
              Videos ({currentPlaylist.videos?.length || 0})
            </h3>
            <div className="space-y-1 overflow-y-auto flex-1 pr-1 custom-scrollbar">
              {currentPlaylist.videos?.map((video, i) => {
                const isActive = video.videoId === activeVideoId;
                const hasNotes = video.notes && video.notes.trim().length > 0;

                return (
                  <button
                    key={video.videoId || i}
                    onClick={() => handleSelectVideo(video)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left group ${
                      isActive
                        ? 'bg-indigo-500/15 ring-1 ring-indigo-500/30'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    {/* Number */}
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                        isActive
                          ? 'bg-indigo-500/20 text-indigo-400'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {isActive ? (
                        <IoPlayCircleOutline size={16} className="text-indigo-400" />
                      ) : (
                        i + 1
                      )}
                    </div>

                    {/* Thumbnail */}
                    {video.thumbnail ? (
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-20 h-11 object-cover rounded-lg flex-shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-11 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">
                        <IoPlayCircleOutline size={18} className="text-slate-600" />
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs font-medium truncate ${
                          isActive ? 'text-indigo-300' : 'text-slate-300 group-hover:text-white'
                        }`}
                      >
                        {video.title || `Video ${i + 1}`}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {video.duration && (
                          <span className="text-[10px] text-slate-500">{video.duration}</span>
                        )}
                        {hasNotes && (
                          <IoCheckmarkCircle size={12} className="text-emerald-500" title="Has notes" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default YouTubePlaylistDetailPage;
