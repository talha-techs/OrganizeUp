import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import {
  IoArrowBack, IoPlayCircle, IoPauseCircle, IoCheckmarkCircle,
  IoBookOutline, IoSaveOutline, IoMusicalNote,
  IoPlaySkipBack, IoPlaySkipForward, IoVolumeMediumOutline, IoTrashOutline,
} from 'react-icons/io5';
import { fetchBook, fetchBookProgress, updateVideoProgress, updateReadingProgress, clearCurrentBook, removeAudioFromBook } from '../redux/slices/bookSlice';
import { getMe } from '../redux/slices/authSlice';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ProgressBar from '../components/ui/ProgressBar';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';
import useDocumentTitle from '../hooks/useDocumentTitle';

const BookDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentBook, isLoading } = useSelector((state) => state.books);
  const { user } = useSelector((state) => state.auth);
  useDocumentTitle(currentBook?.title || 'Book');

  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [note, setNote] = useState('');
  const [completedVideoIndex, setCompletedVideoIndex] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  // Audio player state
  const audioRef = useRef(null);
  const [currentTrackIdx, setCurrentTrackIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioVolume, setAudioVolume] = useState(1);

  // Waveform bar heights (decorative)
  const BAR_HEIGHTS = [4,8,14,22,28,20,12,6,10,18,28,32,24,16,8,6,10,20,30,26,18,12,6,8,16,24,30,22,14,8];

  const fmtTime = (s) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // Wire up audio element events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setAudioDuration(isFinite(audio.duration) ? audio.duration : 0);
    const onEnded = () => {
      const tracks = currentBook?.audioFiles || [];
      if (currentTrackIdx < tracks.length - 1) {
        setCurrentTrackIdx((i) => i + 1);
      } else {
        setIsPlaying(false);
      }
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
    };
  }, [currentBook, currentTrackIdx]);

  // Load new track when index changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentBook?.audioFiles?.length) return;
    const track = currentBook.audioFiles[currentTrackIdx];
    if (!track?.fileId) return;
    const wasPlaying = isPlaying;
    audio.src = `/api/books/audio/${track.fileId}`;
    audio.load();
    setCurrentTime(0);
    setAudioDuration(0);
    if (wasPlaying) audio.play().catch(() => setIsPlaying(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrackIdx, currentBook]);

  const playTrack = (idx) => {
    if (idx === currentTrackIdx) {
      // Toggle play/pause on same track
      const audio = audioRef.current;
      if (!audio) return;
      if (isPlaying) audio.pause();
      else audio.play().catch(() => {});
    } else {
      setCurrentTrackIdx(idx);
      setIsPlaying(true); // will start after src loads
    }
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.pause();
    else audio.play().catch(() => setIsPlaying(false));
  };

  const handleSeek = (e) => {
    const val = parseFloat(e.target.value);
    if (audioRef.current) audioRef.current.currentTime = val;
    setCurrentTime(val);
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setAudioVolume(val);
    if (audioRef.current) audioRef.current.volume = val;
  };

  const handleRemoveAudio = async (audioId) => {
    const audio = audioRef.current;
    if (audio) { audio.pause(); setIsPlaying(false); }
    const result = await dispatch(removeAudioFromBook({ bookId: id, audioId }));
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success('Track removed');
      setCurrentTrackIdx(0);
    } else {
      toast.error(result.payload || 'Failed to remove track');
    }
  };

  useEffect(() => {
    dispatch(fetchBook(id));
    dispatch(fetchBookProgress(id));
    return () => dispatch(clearCurrentBook());
  }, [id, dispatch]);

  // Sync reading progress from user data
  useEffect(() => {
    const rp = user?.readingProgress?.find((rp) => rp.bookId === id);
    if (rp) {
      setCurrentPage(rp.currentPage || 1);
      setTotalPages(rp.totalPages || currentBook?.totalPages || 0);
    } else if (currentBook?.totalPages) {
      setTotalPages(currentBook.totalPages);
    }
  }, [user, id, currentBook]);

  const getVideoProgress = (videoIndex) => {
    return user?.videoProgress?.find(
      (vp) => vp.bookId === id && vp.videoIndex === videoIndex
    );
  };

  const handleVideoEnd = (videoIndex) => {
    setCompletedVideoIndex(videoIndex);
    setShowNoteModal(true);
  };

  const handleNoteSubmit = async () => {
    await dispatch(
      updateVideoProgress({
        bookId: id,
        progressData: {
          videoIndex: completedVideoIndex,
          progress: 100,
          completed: true,
          note,
        },
      })
    );
    dispatch(getMe());
    toast.success('Progress saved!');
    setShowNoteModal(false);
    setNote('');
    setCompletedVideoIndex(null);
  };

  const handleVideoProgress = (videoIndex, progress) => {
    dispatch(
      updateVideoProgress({
        bookId: id,
        progressData: { videoIndex, progress, completed: progress >= 100 },
      })
    );
  };

  const handleSaveReadingProgress = useCallback(async () => {
    if (totalPages <= 0) {
      toast.error('Please set total pages first');
      return;
    }
    const page = Math.max(1, Math.min(currentPage, totalPages));
    const progress = Math.round((page / totalPages) * 100);
    await dispatch(
      updateReadingProgress({
        bookId: id,
        progressData: { currentPage: page, totalPages, progress },
      })
    );
    dispatch(getMe());
    toast.success(`Progress saved: Page ${page}/${totalPages} (${progress}%)`);
  }, [currentPage, totalPages, id, dispatch]);

  if (isLoading || !currentBook) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <LoadingSpinner text="Loading book..." />
      </div>
    );
  }

  const isVideoBook = currentBook.type === 'video';
  const isTextBook = currentBook.type === 'text';
  const isAudioBook = currentBook.type === 'audio';
  const isAdmin = user?.role === 'admin';
  const isOwner = user?._id && String(currentBook.addedBy?._id || currentBook.addedBy) === String(user._id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back button */}
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => navigate('/books')}
        className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <IoArrowBack size={18} /> Back to Books
      </motion.button>

      {/* Book Title */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-white font-display">{currentBook.title}</h1>
        <p className="text-indigo-400 mt-1">{currentBook.author}</p>
        {currentBook.description && (
          <p className="text-slate-400 text-sm mt-3 max-w-2xl">{currentBook.description}</p>
        )}
      </motion.div>

      {/* Video Book View */}
      {isVideoBook && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Video Player */}
          <div className="lg:col-span-2">
            <div className="glass-card overflow-hidden">
              {selectedVideo !== null ? (
                <>
                  <div className="aspect-video bg-black rounded-t-2xl overflow-hidden">
                    <iframe
                      src={`https://drive.google.com/file/d/${currentBook.videos[selectedVideo]?.driveFileId}/preview`}
                      width="100%"
                      height="100%"
                      allow="autoplay"
                      allowFullScreen
                      className="w-full h-full"
                      onLoad={() => {
                        // Track progress
                        const interval = setInterval(() => {
                          const progress = getVideoProgress(selectedVideo);
                          if (!progress?.completed) {
                            handleVideoProgress(selectedVideo, Math.min((progress?.progress || 0) + 5, 95));
                          }
                        }, 30000); // Update every 30 seconds
                        return () => clearInterval(interval);
                      }}
                    />
                  </div>
                  {/* Progress bar under video */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-white">
                        {currentBook.videos[selectedVideo]?.title || `Video ${selectedVideo + 1}`}
                      </h3>
                      <span className="text-xs text-slate-400">
                        {currentBook.videos[selectedVideo]?.duration || ''}
                      </span>
                    </div>
                    <ProgressBar
                      progress={getVideoProgress(selectedVideo)?.progress || 0}
                      showLabel
                    />
                    <div className="flex gap-3 mt-3">
                      <button
                        onClick={() => handleVideoEnd(selectedVideo)}
                        className="btn-primary text-xs py-2 px-4"
                      >
                        <IoCheckmarkCircle size={14} /> Mark Complete
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="aspect-video flex items-center justify-center bg-slate-900/50 rounded-t-2xl">
                  <div className="text-center">
                    <IoPlayCircle className="text-indigo-500/30 mx-auto mb-3" size={64} />
                    <p className="text-slate-400 text-sm">Select a video to start watching</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Video List */}
          <div className="lg:col-span-1">
            <div className="glass-card p-4">
              <h3 className="text-sm font-semibold text-white mb-3 font-display">
                Videos ({currentBook.videos?.length || 0})
              </h3>
              <div className="space-y-1 max-h-[600px] overflow-y-auto">
                {currentBook.videos?.map((video, i) => {
                  const progress = getVideoProgress(i);
                  const isActive = selectedVideo === i;
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedVideo(i)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                        isActive
                          ? 'bg-indigo-500/15 border border-indigo-500/20'
                          : 'hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                        progress?.completed
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : isActive
                          ? 'bg-indigo-500/20 text-indigo-400'
                          : 'bg-slate-700/50 text-slate-400'
                      }`}>
                        {progress?.completed ? '✓' : i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm truncate ${isActive ? 'text-white' : 'text-slate-300'}`}>
                          {video.title || `Video ${i + 1}`}
                        </p>
                        {video.duration && (
                          <p className="text-xs text-slate-500">{video.duration}</p>
                        )}
                        {progress && !progress.completed && (
                          <ProgressBar progress={progress.progress} className="mt-1.5" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Text Book (PDF) View */}
      {isTextBook && (
        <div className="glass-card overflow-hidden">
          {/* Reading progress bar + page tracking */}
          <div className="p-4 border-b border-white/5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Progress bar */}
              <div className="flex-1 w-full">
                <ProgressBar
                  progress={
                    totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0
                  }
                  showLabel
                  height="h-2"
                />
              </div>

              {/* Page tracking inputs */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <IoBookOutline className="text-indigo-400" size={16} />
                <span className="text-xs text-slate-400">Page</span>
                <input
                  type="number"
                  min="1"
                  max={totalPages || 99999}
                  value={currentPage}
                  onChange={(e) => setCurrentPage(parseInt(e.target.value) || 1)}
                  className="w-16 px-2 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-white text-sm text-center focus:border-indigo-500 focus:outline-none transition-colors"
                  placeholder="#"
                />
                <span className="text-slate-500 text-sm">/</span>
                <input
                  type="number"
                  min="1"
                  value={totalPages}
                  onChange={(e) => setTotalPages(parseInt(e.target.value) || 0)}
                  className="w-16 px-2 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-white text-sm text-center focus:border-indigo-500 focus:outline-none transition-colors"
                  placeholder="Total"
                />
                <button
                  onClick={handleSaveReadingProgress}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 text-sm font-medium transition-colors"
                  title="Save reading progress"
                >
                  <IoSaveOutline size={14} />
                  Save
                </button>
              </div>
            </div>
          </div>

          {currentBook.embedLink ? (
            <div className="relative w-full" style={{ height: '85vh' }}>
              {/* Loading overlay */}
              {pdfLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 z-10">
                  <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4" />
                  <p className="text-slate-300 text-sm font-medium">Loading PDF...</p>
                  <p className="text-slate-500 text-xs mt-1">This may take a moment for large files</p>
                </div>
              )}
              <iframe
                src={`${currentBook.embedLink}#toolbar=1&navpanes=1&scrollbar=1`}
                width="100%"
                height="100%"
                className="border-0 rounded-xl"
                title={currentBook.title}
                onLoad={() => setPdfLoading(false)}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center py-20">
              <p className="text-slate-400">No PDF file uploaded for this book.</p>
            </div>
          )}
        </div>
      )}

      {/* Audio Book Player */}
      {isAudioBook && (
        <>
          {/* Waveform keyframe */}
          <style>{`
            @keyframes audioBar {
              0%   { transform: scaleY(0.25); }
              100% { transform: scaleY(1); }
            }
          `}</style>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Player */}
            <div className="lg:col-span-2">
              <div className="glass-card overflow-hidden">
                {currentBook.audioFiles?.length > 0 ? (
                  <>
                    {/* Waveform + Track info */}
                    <div className="p-6 bg-gradient-to-br from-slate-900 to-indigo-950/30 text-center">
                      {/* Cover art or waveform */}
                      <div className="flex items-end justify-center gap-[3px] h-20 mb-5">
                        {BAR_HEIGHTS.map((h, i) => (
                          <div
                            key={i}
                            style={{
                              height: `${h * 2.4}px`,
                              animationDelay: `${(i * 0.06) % 0.9}s`,
                              animationDuration: `${0.45 + (i % 6) * 0.1}s`,
                              animation: isPlaying
                                ? `audioBar ${0.45 + (i % 6) * 0.1}s ease-in-out ${(i * 0.06) % 0.9}s infinite alternate`
                                : 'none',
                            }}
                            className={`w-1.5 rounded-full flex-shrink-0 transition-colors duration-300 ${
                              isPlaying ? 'bg-indigo-400' : 'bg-slate-600'
                            }`}
                          />
                        ))}
                      </div>
                      <h3 className="text-white font-semibold text-lg truncate">
                        {currentBook.audioFiles[currentTrackIdx]?.title ||
                          currentBook.audioFiles[currentTrackIdx]?.originalName ||
                          `Track ${currentTrackIdx + 1}`}
                      </h3>
                      <p className="text-indigo-400 text-sm mt-1">{currentBook.author}</p>
                      <p className="text-slate-500 text-xs mt-1">
                        Track {currentTrackIdx + 1} of {currentBook.audioFiles.length}
                      </p>
                    </div>

                    {/* Controls */}
                    <div className="p-5 space-y-5">
                      {/* Seek bar */}
                      <div>
                        <div className="relative h-9 flex items-center cursor-pointer">
                          {/* Track background */}
                          <div className="absolute inset-x-0 h-2 rounded-full bg-slate-700 pointer-events-none">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400"
                              style={{ width: `${audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0}%` }}
                            />
                          </div>
                          {/* Scrubber dot */}
                          <div
                            className="absolute w-4 h-4 rounded-full bg-white shadow-md shadow-indigo-500/40 -translate-x-1/2 pointer-events-none transition-none"
                            style={{ left: `${audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0}%` }}
                          />
                          <input
                            type="range"
                            min={0}
                            max={audioDuration || 100}
                            value={currentTime}
                            step={0.1}
                            onChange={handleSeek}
                            className="absolute inset-x-0 w-full opacity-0 cursor-pointer h-2"
                          />
                        </div>
                        <div className="flex justify-between text-xs text-slate-500 -mt-1">
                          <span>{fmtTime(currentTime)}</span>
                          <span>{fmtTime(audioDuration)}</span>
                        </div>
                      </div>

                      {/* Play controls */}
                      <div className="flex items-center justify-center gap-8">
                        <button
                          onClick={() => playTrack(Math.max(0, currentTrackIdx - 1))}
                          disabled={currentTrackIdx === 0}
                          className="p-2 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                          title="Previous track"
                        >
                          <IoPlaySkipBack size={24} />
                        </button>
                        <button
                          onClick={togglePlay}
                          className="w-16 h-16 rounded-full bg-indigo-500 hover:bg-indigo-400 active:scale-95 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 transition-all"
                        >
                          {isPlaying
                            ? <IoPauseCircle size={36} />
                            : <IoPlayCircle size={36} />}
                        </button>
                        <button
                          onClick={() => playTrack(Math.min((currentBook.audioFiles?.length || 1) - 1, currentTrackIdx + 1))}
                          disabled={currentTrackIdx === (currentBook.audioFiles?.length || 1) - 1}
                          className="p-2 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                          title="Next track"
                        >
                          <IoPlaySkipForward size={24} />
                        </button>
                      </div>

                      {/* Volume */}
                      <div className="flex items-center gap-3">
                        <IoVolumeMediumOutline className="text-slate-400 flex-shrink-0" size={18} />
                        <div className="relative flex-1 h-7 flex items-center">
                          <div className="absolute inset-x-0 h-1.5 rounded-full bg-slate-700 pointer-events-none">
                            <div
                              className="h-full rounded-full bg-slate-400"
                              style={{ width: `${audioVolume * 100}%` }}
                            />
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.02}
                            value={audioVolume}
                            onChange={handleVolumeChange}
                            className="absolute inset-x-0 w-full opacity-0 cursor-pointer h-1.5"
                          />
                        </div>
                        <span className="text-xs text-slate-500 w-9 text-right">{Math.round(audioVolume * 100)}%</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-16 text-center">
                    <IoMusicalNote className="mx-auto text-slate-700 mb-3" size={44} />
                    <p className="text-slate-400">No audio tracks uploaded yet.</p>
                    <p className="text-slate-500 text-sm mt-1">Edit the book to add audio files.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Track list */}
            <div className="lg:col-span-1">
              <div className="glass-card p-4">
                <h3 className="text-sm font-semibold text-white mb-3 font-display flex items-center gap-2">
                  <IoMusicalNote className="text-indigo-400" size={16} />
                  Tracks ({currentBook.audioFiles?.length || 0})
                </h3>
                <div className="space-y-1 max-h-[540px] overflow-y-auto">
                  {currentBook.audioFiles?.map((track, i) => {
                    const isActive = currentTrackIdx === i;
                    return (
                      <div
                        key={track._id || i}
                        className={`group flex items-center gap-3 p-3 rounded-xl transition-all ${
                          isActive
                            ? 'bg-indigo-500/15 border border-indigo-500/20'
                            : 'hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        <button
                          onClick={() => playTrack(i)}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold transition-colors ${
                            isActive && isPlaying
                              ? 'bg-indigo-500/30 text-indigo-300'
                              : isActive
                              ? 'bg-indigo-500/20 text-indigo-400'
                              : 'bg-slate-700/50 text-slate-400 group-hover:bg-indigo-500/20 group-hover:text-indigo-400'
                          }`}
                        >
                          {isActive && isPlaying ? '▶' : i + 1}
                        </button>
                        <div
                          className="min-w-0 flex-1 cursor-pointer"
                          onClick={() => playTrack(i)}
                        >
                          <p className={`text-sm truncate ${isActive ? 'text-white' : 'text-slate-300'}`}>
                            {track.title || track.originalName || `Track ${i + 1}`}
                          </p>
                          {track.size > 0 && (
                            <p className="text-xs text-slate-500">
                              {track.size < 1024 * 1024
                                ? `${(track.size / 1024).toFixed(0)} KB`
                                : `${(track.size / 1024 / 1024).toFixed(1)} MB`}
                            </p>
                          )}
                        </div>
                        {(isOwner || isAdmin) && (
                          <button
                            onClick={() => handleRemoveAudio(track._id)}
                            className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                            title="Remove track"
                          >
                            <IoTrashOutline size={13} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Hidden audio element */}
          <audio ref={audioRef} preload="metadata" className="hidden" />
        </>
      )}

      {/* Note Modal (after video completion) */}
      <Modal
        isOpen={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        title="What did you learn?"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            Great job completing the video! Write down what you learned.
          </p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="I learned that..."
            className="input-dark min-h-[120px] resize-y"
            rows={4}
            autoFocus
          />
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setShowNoteModal(false);
                handleNoteSubmit();
              }}
              className="btn-secondary"
            >
              Skip
            </button>
            <button onClick={handleNoteSubmit} className="btn-primary">
              Save Note
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default BookDetailPage;
