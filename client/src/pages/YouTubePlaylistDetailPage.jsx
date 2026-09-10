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
  IoFilmOutline,
  IoFolderOutline,
  IoTimeOutline,
  IoListOutline,
  IoCodeSlashOutline,
} from 'react-icons/io5';
import {
  fetchPlaylist,
  clearCurrentPlaylist,
  saveVideoNotes,
  fetchCombinedNotes,
  refreshPlaylist,
  updatePlaylistVideoProgress,
} from '../redux/slices/youtubePlaylistSlice';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import api from '../utils/api';
import toast from 'react-hot-toast';
import useDocumentTitle from '../hooks/useDocumentTitle';

const YouTubePlaylistDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const {
    currentPlaylist,
    isLoading,
    isSavingNotes,
    combinedNotes,
    completedVideos = [],
    progress = 0,
  } = useSelector((state) => state.playlists);
  const { user } = useSelector((state) => state.auth);

  useDocumentTitle(currentPlaylist?.title || 'YouTube Item');

  const [activeVideoId, setActiveVideoId] = useState(null);
  const [localNotes, setLocalNotes] = useState('');
  const [showCombinedNotes, setShowCombinedNotes] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSavingToLibrary, setIsSavingToLibrary] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const saveTimeoutRef = useRef(null);
  const notesTextareaRef = useRef(null);

  const isOwner = Boolean(
    user?._id &&
      currentPlaylist?.addedBy &&
      String(currentPlaylist.addedBy?._id ?? currentPlaylist.addedBy) ===
        String(user._id),
  );

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

  const isSingleVideo =
    currentPlaylist?.type === 'video' ||
    (!currentPlaylist?.playlistId && currentPlaylist?.videos?.length === 1);

  const activeVideo = currentPlaylist?.videos?.find(
    (v) => v.videoId === activeVideoId,
  ) || currentPlaylist?.videos?.[0];

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
    const targetVideoId = activeVideoId || currentPlaylist?.videos?.[0]?.videoId;
    if (!targetVideoId) return;

    dispatch(
      saveVideoNotes({
        playlistId: id,
        videoId: targetVideoId,
        notes: localNotes,
      }),
    ).then((result) => {
      if (result.meta.requestStatus === 'fulfilled') {
        setLastSavedTime(
          new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        );
        toast.success('Notes saved to your private library');
        const newPlId = result.payload?.data?.playlistId;
        if (newPlId && String(newPlId) !== String(id)) {
          navigate(`/youtube-playlists/${newPlId}`, { replace: true });
        }
      }
    });
  }, [dispatch, id, activeVideoId, currentPlaylist, localNotes, navigate]);

  const handleSaveToMyLibrary = async () => {
    if (!currentPlaylist?._id) return;
    setIsSavingToLibrary(true);
    try {
      const res = await api.post(
        `/youtube-playlists/save-from-explore/${currentPlaylist._id}`,
      );
      toast.success('Added to your YouTube library with fresh blank notes!');
      if (res.data?.playlist?._id) {
        navigate(`/youtube-playlists/${res.data.playlist._id}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add to library');
    } finally {
      setIsSavingToLibrary(false);
    }
  };

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
    const val = e.target.value;
    setLocalNotes(val);

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      const targetVideoId = activeVideoId || currentPlaylist?.videos?.[0]?.videoId;
      if (targetVideoId) {
        dispatch(
          saveVideoNotes({
            playlistId: id,
            videoId: targetVideoId,
            notes: val,
          }),
        ).then(() => {
          setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        });
      }
    }, 3000);
  };

  const handleInsertSnippet = (snippet) => {
    const textarea = notesTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = localNotes;
    const updated = current.substring(0, start) + snippet + current.substring(end);
    setLocalNotes(updated);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + snippet.length, start + snippet.length);
    }, 0);
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
      toast.success(
        isSingleVideo
          ? 'Video metadata refreshed from YouTube'
          : 'Playlist refreshed from YouTube',
      );
    } else {
      toast.error(result.payload || 'Failed to refresh');
    }
  };

  const handleToggleVideoComplete = useCallback(
    async (videoId, e) => {
      if (e) e.stopPropagation();
      const targetId = videoId || activeVideoId || currentPlaylist?.videos?.[0]?.videoId;
      if (!targetId) return;

      const isCompleted = completedVideos.includes(targetId);
      try {
        await dispatch(
          updatePlaylistVideoProgress({
            playlistId: id,
            videoId: targetId,
            completed: !isCompleted,
            note: targetId === activeVideoId ? localNotes : undefined,
          }),
        ).unwrap();
        toast.success(!isCompleted ? 'Video completed!' : 'Marked as unwatched');
      } catch (err) {
        toast.error(err || 'Failed to update progress');
      }
    },
    [dispatch, id, completedVideos, activeVideoId, currentPlaylist, localNotes],
  );

  const handleCopyNotes = () => {
    const textToCopy = localNotes || '';
    if (!textToCopy) {
      toast.error('No notes to copy');
      return;
    }
    navigator.clipboard.writeText(textToCopy);
    toast.success('Notes copied to clipboard');
  };

  const handleDownloadNotes = () => {
    const textToSave = isSingleVideo ? localNotes : (combinedNotes || localNotes);
    const blob = new Blob([textToSave || ''], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = (activeVideo?.title || currentPlaylist?.title || 'youtube-notes')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');
    a.download = `${safeTitle}-notes.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded notes as .md');
  };

  if (isLoading || !currentPlaylist) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <LoadingSpinner text="Loading YouTube content..." />
      </div>
    );
  }

  const effectiveVideoId = activeVideoId || currentPlaylist?.videos?.[0]?.videoId || currentPlaylist?.videoId;
  const embedUrl = effectiveVideoId
    ? `https://www.youtube.com/embed/${effectiveVideoId}?autoplay=0&rel=0`
    : `https://www.youtube.com/embed/videoseries?list=${currentPlaylist.playlistId}`;

  const ytUrl =
    currentPlaylist.url ||
    currentPlaylist.playlistUrl ||
    (isSingleVideo && effectiveVideoId
      ? `https://www.youtube.com/watch?v=${effectiveVideoId}`
      : `https://www.youtube.com/playlist?list=${currentPlaylist.playlistId}`);

  const isCurrentVideoCompleted = completedVideos.includes(effectiveVideoId);

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Breadcrumbs & Meta Bar */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
        <button
          onClick={() => navigate('/youtube-playlists')}
          className="flex items-center gap-2 text-xs sm:text-sm text-secondary hover:text-primary mb-3 transition-colors cursor-pointer"
        >
          <IoArrowBack size={14} /> Back to YouTube Library
        </button>

        {/* Public Explore Preview Banner */}
        {!isOwner && (
          <div className="mb-4 bg-accent/10 border border-accent/20 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-accent/20 text-accent flex items-center justify-center flex-shrink-0">
                <IoGlobeOutline size={18} />
              </div>
              <div>
                <p className="text-xs font-semibold text-primary">Explore Public Preview</p>
                <p className="text-[11px] text-secondary">
                  Your notes are private. Add this to your library to create your personal copy with fresh blank notes.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSaveToMyLibrary}
              disabled={isSavingToLibrary}
              className="btn-primary text-xs py-1.5 px-3 flex-shrink-0 flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              {isSavingToLibrary ? 'Saving...' : '+ Add to My Library'}
            </button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 border-b border-subtle pb-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                  isSingleVideo
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                    : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                }`}
              >
                {isSingleVideo ? <IoFilmOutline size={13} /> : <IoFolderOutline size={13} />}
                {isSingleVideo ? 'Single Video' : 'Playlist'}
              </span>

              {isCurrentVideoCompleted && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <IoCheckmarkCircle size={13} /> Completed
                </span>
              )}

              {activeVideo?.duration && (
                <span className="text-xs text-muted flex items-center gap-1">
                  <IoTimeOutline size={13} /> {activeVideo.duration}
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary font-display leading-tight">
              {isSingleVideo ? (activeVideo?.title || currentPlaylist.title) : currentPlaylist.title}
            </h1>

            {currentPlaylist.channelTitle && (
              <p className="text-red-400 text-xs sm:text-sm font-medium flex items-center gap-1.5">
                <IoLogoYoutube size={14} /> {currentPlaylist.channelTitle}
              </p>
            )}

            {/* Playlist Progress bar (only for playlists) */}
            {!isSingleVideo && (
              <div className="pt-1">
                <div className="flex items-center gap-3 text-xs text-secondary mb-1">
                  <span>
                    {completedVideos.length} / {currentPlaylist.videos?.length || 0} completed ({progress}%)
                  </span>
                </div>
                <div className="w-full max-w-md h-1.5 rounded-full bg-surface border border-subtle overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#ff5722] to-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, progress || 0))}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="btn-secondary flex items-center gap-1.5 text-xs sm:text-sm cursor-pointer"
              title="Re-sync details from YouTube"
            >
              <IoRefreshOutline size={15} className={isRefreshing ? 'animate-spin' : ''} />
              {isRefreshing ? 'Syncing...' : 'Sync YouTube'}
            </button>

            {!isSingleVideo && (
              <button
                onClick={handleShowCombinedNotes}
                className={`btn-secondary flex items-center gap-1.5 text-xs sm:text-sm cursor-pointer ${
                  showCombinedNotes ? 'ring-1 ring-accent' : ''
                }`}
              >
                <IoDocumentTextOutline size={15} />
                All Notes
              </button>
            )}

            <a
              href={ytUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary flex items-center gap-1.5 text-xs sm:text-sm cursor-pointer text-red-400 hover:text-red-300"
            >
              <IoOpenOutline size={15} /> YouTube
            </a>
          </div>
        </div>
      </motion.div>

      {/* Combined Notes Modal/Panel for Playlists */}
      {showCombinedNotes && !isSingleVideo && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="glass-card p-6 border border-subtle"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-primary flex items-center gap-2">
              <IoDocumentTextOutline size={18} />
              Combined Notes — {currentPlaylist.title}
            </h3>
            {combinedNotes && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(combinedNotes);
                    toast.success('Notes copied');
                  }}
                  className="btn-secondary flex items-center gap-1.5 text-xs cursor-pointer"
                >
                  <IoClipboardOutline size={13} /> Copy
                </button>
                <button
                  onClick={handleDownloadNotes}
                  className="btn-secondary flex items-center gap-1.5 text-xs cursor-pointer"
                >
                  <IoDownloadOutline size={13} /> Download .md
                </button>
              </div>
            )}
          </div>
          {combinedNotes ? (
            <div className="bg-surface rounded-xl p-4 max-h-96 overflow-y-auto border border-subtle">
              <pre className="text-sm text-secondary whitespace-pre-wrap font-sans leading-relaxed">
                {combinedNotes}
              </pre>
            </div>
          ) : (
            <p className="text-sm text-muted">No notes yet. Select a video and begin writing notes below the player.</p>
          )}
        </motion.div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. SINGLE VIDEO LAYOUT: Side-by-Side Cinema Study Cockpit     */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isSingleVideo ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left / Top: Video Player */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card overflow-hidden border border-subtle rounded-2xl shadow-xl"
            >
              <div className="relative w-full aspect-video bg-black">
                <iframe
                  key={effectiveVideoId}
                  src={embedUrl}
                  className="absolute inset-0 w-full h-full"
                  title={activeVideo?.title || currentPlaylist.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  frameBorder="0"
                />
              </div>
            </motion.div>

            {/* Video Overview / Description */}
            <div className="glass-card p-4 border border-subtle">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-primary">Overview & Description</h3>
                <button
                  onClick={() => handleToggleVideoComplete(effectiveVideoId)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-lg border transition-all cursor-pointer ${
                    isCurrentVideoCompleted
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                      : 'bg-surface text-secondary hover:text-primary border-subtle'
                  }`}
                >
                  <IoCheckmarkCircle
                    size={14}
                    className={isCurrentVideoCompleted ? 'text-emerald-400' : 'text-muted'}
                  />
                  {isCurrentVideoCompleted ? 'Completed' : 'Mark as Completed'}
                </button>
              </div>
              <p className="text-xs text-secondary leading-relaxed whitespace-pre-line line-clamp-4">
                {currentPlaylist.description || 'No description provided by YouTube channel.'}
              </p>
            </div>
          </div>

          {/* Right: Study Notes Workspace */}
          <div className="lg:col-span-5 xl:col-span-4">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-5 border border-subtle flex flex-col h-full min-h-[500px]"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-subtle pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-red-500/10 text-red-400">
                    <IoDocumentTextOutline size={18} />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-primary">Study Notes</h2>
                    <p className="text-[11px] text-muted">
                      {lastSavedTime ? `Saved at ${lastSavedTime}` : 'Auto-saves after 3s'}
                    </p>
                  </div>
                </div>

                {isSavingNotes && (
                  <span className="text-[11px] text-accent flex items-center gap-1">
                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving...
                  </span>
                )}
              </div>

              {/* Quick Formatting Toolbar */}
              <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleInsertSnippet('\n- ')}
                  className="px-2 py-1 rounded bg-surface-raised hover:bg-surface border border-subtle text-[11px] text-secondary hover:text-primary flex items-center gap-1 cursor-pointer"
                  title="Insert Bullet Point"
                >
                  <IoListOutline size={12} /> Bullet
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertSnippet('[00:00] ')}
                  className="px-2 py-1 rounded bg-surface-raised hover:bg-surface border border-subtle text-[11px] text-secondary hover:text-primary flex items-center gap-1 cursor-pointer"
                  title="Insert Timestamp"
                >
                  <IoTimeOutline size={12} /> Timestamp
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertSnippet('\n```js\n\n```\n')}
                  className="px-2 py-1 rounded bg-surface-raised hover:bg-surface border border-subtle text-[11px] text-secondary hover:text-primary flex items-center gap-1 cursor-pointer"
                  title="Insert Code Block"
                >
                  <IoCodeSlashOutline size={12} /> Code
                </button>
              </div>

              {/* Textarea */}
              <div className="flex-1 flex flex-col">
                <textarea
                  ref={notesTextareaRef}
                  value={localNotes}
                  onChange={handleNotesChange}
                  placeholder="Capture key concepts, ideas, code snippets, or timestamps while watching... (Auto-saves after 3s, or press Ctrl+S)"
                  className="input-dark w-full flex-1 min-h-[300px] resize-y text-xs sm:text-sm leading-relaxed font-mono"
                />
              </div>

              {/* Notes Actions Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-subtle mt-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyNotes}
                    className="btn-secondary text-xs flex items-center gap-1 cursor-pointer py-1.5 px-2.5"
                    title="Copy Markdown"
                  >
                    <IoClipboardOutline size={13} /> Copy
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadNotes}
                    className="btn-secondary text-xs flex items-center gap-1 cursor-pointer py-1.5 px-2.5"
                    title="Download .md file"
                  >
                    <IoDownloadOutline size={13} /> Export .md
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes}
                  className="btn-primary text-xs flex items-center gap-1.5 cursor-pointer py-1.5 px-3"
                >
                  <IoSaveOutline size={14} /> Save Notes
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      ) : (
        /* ───────────────────────────────────────────────────────────── */
        /* 2. PLAYLIST LAYOUT: Player + Notes + Multi-Video Queue List   */
        /* ───────────────────────────────────────────────────────────── */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Player + Notes */}
          <div className="lg:col-span-2 space-y-4">
            {/* Video Player */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card overflow-hidden border border-subtle"
            >
              <div className="relative w-full aspect-video bg-black">
                <iframe
                  key={effectiveVideoId}
                  src={embedUrl}
                  className="absolute inset-0 w-full h-full"
                  title={activeVideo?.title || currentPlaylist.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  frameBorder="0"
                />
              </div>
            </motion.div>

            {/* Active video title */}
            {activeVideo && (
              <div className="px-1 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-primary">
                    {activeVideo.title}
                  </h2>
                  {activeVideo.duration && (
                    <span className="text-xs text-muted flex items-center gap-1 mt-0.5">
                      <IoTimeOutline size={12} /> Duration: {activeVideo.duration}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleToggleVideoComplete(activeVideo.videoId)}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer flex-shrink-0 ${
                    completedVideos.includes(activeVideo.videoId)
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-surface text-secondary hover:text-primary border-subtle'
                  }`}
                >
                  <IoCheckmarkCircle
                    size={14}
                    className={completedVideos.includes(activeVideo.videoId) ? 'text-emerald-400' : 'text-muted'}
                  />
                  {completedVideos.includes(activeVideo.videoId) ? 'Completed' : 'Mark Completed'}
                </button>
              </div>
            )}

            {/* Notes Section for Active Playlist Video */}
            {activeVideo && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-4 border border-subtle"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <IoDocumentTextOutline size={16} className="text-secondary" />
                    <h3 className="text-xs sm:text-sm font-semibold text-secondary">
                      Notes — {activeVideo.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    {isSavingNotes && (
                      <span className="text-xs text-muted flex items-center gap-1">
                        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Saving...
                      </span>
                    )}
                    <button
                      onClick={handleSaveNotes}
                      className="btn-secondary flex items-center gap-1.5 text-xs cursor-pointer"
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
                  placeholder="Write your notes for this chapter here... (auto-saves after 3s, or press Ctrl+S)"
                  className="input-dark w-full min-h-[160px] resize-y text-xs sm:text-sm leading-relaxed"
                />
                <p className="text-[11px] text-muted mt-1.5">
                  Notes are saved per video chapter and automatically aggregated under "All Notes".
                </p>
              </motion.div>
            )}
          </div>

          {/* Right: Multi-Video Queue List */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-1"
          >
            <div className="glass-card p-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-6rem)] overflow-hidden flex flex-col border border-subtle">
              <div className="flex items-center justify-between mb-3 border-b border-subtle pb-2">
                <h3 className="text-xs sm:text-sm font-semibold text-primary">
                  Chapters ({currentPlaylist.videos?.length || 0})
                </h3>
                <span className="text-[11px] text-muted">
                  {completedVideos.length} completed
                </span>
              </div>

              <div className="space-y-1.5 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                {currentPlaylist.videos?.map((video, i) => {
                  const isActive = video.videoId === activeVideoId;
                  const hasNotes = Boolean(video.notes && video.notes.trim().length > 0);
                  const isDone = completedVideos.includes(video.videoId);

                  return (
                    <button
                      key={video.videoId || i}
                      onClick={() => handleSelectVideo(video)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left group cursor-pointer ${
                        isActive
                          ? 'bg-accent-subtle ring-1 ring-accent/30'
                          : 'hover:bg-surface-raised'
                      }`}
                    >
                      {/* Number */}
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                          isActive
                            ? 'bg-accent/20 text-accent'
                            : 'bg-surface text-muted'
                        }`}
                      >
                        {isActive ? (
                          <IoPlayCircleOutline size={15} className="text-accent" />
                        ) : (
                          i + 1
                        )}
                      </div>

                      {/* Thumbnail */}
                      {video.thumbnail ? (
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-18 h-10 object-cover rounded-lg flex-shrink-0"
                        />
                      ) : (
                        <div className="w-18 h-10 bg-surface rounded-lg flex items-center justify-center flex-shrink-0">
                          <IoPlayCircleOutline size={16} className="text-muted" />
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-xs font-medium truncate ${
                            isActive ? 'text-accent' : 'text-secondary group-hover:text-primary'
                          }`}
                        >
                          {video.title || `Video ${i + 1}`}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {video.duration && (
                            <span className="text-[10px] text-muted">{video.duration}</span>
                          )}
                          {hasNotes && (
                            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded font-medium">
                              Notes
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Completion checkmark toggle */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleVideoComplete(video.videoId, e)}
                        className={`p-1 rounded-lg transition-colors cursor-pointer ${
                          isDone
                            ? 'text-emerald-400 hover:bg-emerald-500/20'
                            : 'text-muted/40 hover:text-secondary hover:bg-surface'
                        }`}
                        title={isDone ? 'Mark as unwatched' : 'Mark as completed'}
                      >
                        <IoCheckmarkCircle size={18} />
                      </button>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default YouTubePlaylistDetailPage;
