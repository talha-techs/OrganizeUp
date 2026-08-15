import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IoClose,
  IoPlayCircle,
  IoPauseCircle,
  IoPlaySkipBack,
  IoPlaySkipForward,
  IoVolumeMediumOutline,
  IoVolumeMuteOutline,
  IoBookmarkOutline,
  IoBookmark,
  IoMusicalNotesOutline,
  IoSparklesOutline,
  IoTimeOutline,
} from 'react-icons/io5';

const BAR_HEIGHTS = [
  6, 12, 18, 26, 32, 22, 14, 8, 12, 20, 30, 36, 26, 18, 10, 8, 14, 24, 32,
  28, 20, 14, 8, 10, 18, 26, 32, 24, 16, 10, 6, 14, 22, 30, 20, 12,
];

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 1.75, 2];

const AudiobookPlayerModal = ({
  book,
  isOpen,
  onClose,
  onSave,
  onUnsave,
}) => {
  const audioRef = useRef(null);
  const [currentTrackIdx, setCurrentTrackIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isAudioLoading, setIsAudioLoading] = useState(false);

  const sections = book?.sections || [];
  const currentTrack = sections[currentTrackIdx] || null;
  const isSaved = !!book?.isSaved;

  // Format seconds to mm:ss or hh:mm:ss
  const fmtTime = (s) => {
    if (!s || isNaN(s)) return '0:00';
    const totalSecs = Math.floor(s);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Reset or setup track on book change
  useEffect(() => {
    if (isOpen) {
      setCurrentTrackIdx(0);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    }
  }, [isOpen, book?.id]);

  // Update browser tab title dynamically when playing
  useEffect(() => {
    if (!isOpen || !book) return;
    const prevTitle = document.title;
    if (isPlaying) {
      const trackName = currentTrack?.title ? ` · ${currentTrack.title}` : '';
      document.title = `▶ ${book.title}${trackName} | OrganizeUp`;
    } else {
      document.title = `⏸ ${book.title} | OrganizeUp`;
    }
    return () => {
      document.title = prevTitle;
    };
  }, [isOpen, book, isPlaying, currentTrack]);

  // Load new audio source when track changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack?.listenUrl) return;

    setIsAudioLoading(true);
    audio.src = currentTrack.listenUrl;
    audio.playbackRate = playbackRate;
    audio.load();

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
          setIsAudioLoading(false);
        })
        .catch((err) => {
          // Autoplay policy or pause
          setIsPlaying(false);
          setIsAudioLoading(false);
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrackIdx, currentTrack?.listenUrl]);

  // Handle audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => {
      if (isFinite(audio.duration)) setDuration(audio.duration);
    };
    const onWaiting = () => setIsAudioLoading(true);
    const onCanPlay = () => setIsAudioLoading(false);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      if (currentTrackIdx < sections.length - 1) {
        setCurrentTrackIdx((prev) => prev + 1);
      } else {
        setIsPlaying(false);
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
    };
  }, [currentTrackIdx, sections.length]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
  };

  const handleSeek = (e) => {
    const val = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
    setCurrentTime(val);
  };

  const skipSeconds = (secs) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + secs));
  };

  const changeSpeed = (rate) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isMuted) {
      audio.volume = volume || 1;
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  };

  const handleClose = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    onClose();
  };

  if (!isOpen || !book) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25 }}
          className="relative w-full max-w-4xl bg-slate-900/95 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-800 flex-shrink-0 flex items-center justify-center border border-white/10">
                {book.coverImage ? (
                  <img
                    src={book.coverImage}
                    alt={book.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <IoMusicalNotesOutline className="text-indigo-400" size={20} />
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-white truncate">
                  {book.title}
                </h2>
                <p className="text-xs text-indigo-400 truncate">
                  {book.author} {book.copyrightYear ? `· (${book.copyrightYear})` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => (isSaved ? onUnsave(book) : onSave(book))}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  isSaved
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                    : 'bg-white/5 text-slate-300 border-white/10 hover:text-white hover:bg-white/10'
                }`}
              >
                {isSaved ? (
                  <>
                    <IoBookmark size={14} className="text-emerald-400" /> Saved
                  </>
                ) : (
                  <>
                    <IoBookmarkOutline size={14} /> Save to Library
                  </>
                )}
              </button>

              <button
                onClick={handleClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                title="Close"
              >
                <IoClose size={20} />
              </button>
            </div>
          </div>

          {/* Body: Player & Chapter List */}
          <div className="grid lg:grid-cols-12 flex-1 overflow-hidden">
            {/* Player Column */}
            <div className="lg:col-span-7 p-6 flex flex-col justify-between overflow-y-auto border-b lg:border-b-0 lg:border-r border-white/5 bg-gradient-to-b from-slate-900 to-indigo-950/20">
              {/* Waveform Visualization */}
              <div className="py-6 flex flex-col items-center justify-center">
                <div className="flex items-end justify-center gap-1 h-24 w-full max-w-sm mb-4 px-2">
                  {BAR_HEIGHTS.map((h, i) => (
                    <div
                      key={i}
                      style={{
                        height: isPlaying
                          ? `${Math.max(6, (h * 2.2) * (0.6 + Math.sin((i + currentTime * 3) * 0.4) * 0.4))}px`
                          : `${h * 0.8}px`,
                        transition: 'height 0.15s ease-in-out',
                      }}
                      className={`w-1 sm:w-1.5 rounded-full transition-colors ${
                        isPlaying
                          ? 'bg-gradient-to-t from-indigo-500 to-cyan-400'
                          : 'bg-slate-700/60'
                      }`}
                    />
                  ))}
                </div>

                {/* Current Chapter Badge & Title */}
                <div className="text-center max-w-md px-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 mb-2">
                    <IoSparklesOutline size={12} />
                    Track {currentTrackIdx + 1} of {sections.length || 1}
                  </span>
                  <h3 className="text-lg font-bold text-white line-clamp-2 leading-tight">
                    {currentTrack?.title || `Track ${currentTrackIdx + 1}`}
                  </h3>
                  {currentTrack?.readers?.length > 0 && (
                    <p className="text-xs text-slate-400 mt-1">
                      Read by {currentTrack.readers.join(', ')}
                    </p>
                  )}
                </div>
              </div>

              {/* Progress Scrubber */}
              <div className="space-y-1.5 my-2">
                <div className="relative h-6 flex items-center cursor-pointer group">
                  <div className="absolute inset-x-0 h-1.5 rounded-full bg-slate-800 pointer-events-none group-hover:h-2 transition-all">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400"
                      style={{
                        width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    step={0.1}
                    onChange={handleSeek}
                    className="absolute inset-x-0 w-full opacity-0 cursor-pointer h-4"
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-400 font-mono">
                  <span>{fmtTime(currentTime)}</span>
                  <span>{fmtTime(duration)}</span>
                </div>
              </div>

              {/* Controls Toolbar */}
              <div className="space-y-4 pt-2">
                {/* Main Play/Skip Buttons */}
                <div className="flex items-center justify-center gap-4 sm:gap-6">
                  {/* Rewind 10s */}
                  <button
                    onClick={() => skipSeconds(-10)}
                    className="p-2 text-slate-400 hover:text-white transition-colors cursor-pointer text-xs flex flex-col items-center"
                    title="Rewind 10s"
                  >
                    <span className="font-mono text-[10px]">-10s</span>
                  </button>

                  {/* Previous Track */}
                  <button
                    onClick={() =>
                      setCurrentTrackIdx((idx) => Math.max(0, idx - 1))
                    }
                    disabled={currentTrackIdx === 0}
                    className="p-2.5 rounded-full text-slate-400 hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
                    title="Previous Chapter"
                  >
                    <IoPlaySkipBack size={20} />
                  </button>

                  {/* Play / Pause Large Glow Button */}
                  <button
                    onClick={togglePlay}
                    disabled={isAudioLoading}
                    className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 active:scale-95 text-white flex items-center justify-center shadow-xl shadow-indigo-500/30 transition-all cursor-pointer"
                  >
                    {isAudioLoading ? (
                      <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : isPlaying ? (
                      <IoPauseCircle size={40} />
                    ) : (
                      <IoPlayCircle size={40} />
                    )}
                  </button>

                  {/* Next Track */}
                  <button
                    onClick={() =>
                      setCurrentTrackIdx((idx) =>
                        Math.min(sections.length - 1, idx + 1),
                      )
                    }
                    disabled={currentTrackIdx >= sections.length - 1}
                    className="p-2.5 rounded-full text-slate-400 hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
                    title="Next Chapter"
                  >
                    <IoPlaySkipForward size={20} />
                  </button>

                  {/* Forward 10s */}
                  <button
                    onClick={() => skipSeconds(10)}
                    className="p-2 text-slate-400 hover:text-white transition-colors cursor-pointer text-xs flex flex-col items-center"
                    title="Forward 10s"
                  >
                    <span className="font-mono text-[10px]">+10s</span>
                  </button>
                </div>

                {/* Sub-controls: Speed & Volume */}
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  {/* Speed Selector */}
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-slate-500 font-medium mr-1">
                      Speed:
                    </span>
                    {SPEED_OPTIONS.map((rate) => (
                      <button
                        key={rate}
                        onClick={() => changeSpeed(rate)}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                          playbackRate === rate
                            ? 'bg-indigo-500 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>

                  {/* Volume Slider */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleMute}
                      className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      {isMuted ? (
                        <IoVolumeMuteOutline size={18} />
                      ) : (
                        <IoVolumeMediumOutline size={18} />
                      )}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-16 sm:w-20 accent-indigo-500 h-1 bg-slate-700 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Chapter List Column */}
            <div className="lg:col-span-5 p-5 flex flex-col overflow-hidden bg-slate-900/60">
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <IoMusicalNotesOutline className="text-indigo-400" size={15} />
                  Chapters ({sections.length})
                </h4>
                {book.durationFormatted && (
                  <span className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                    <IoTimeOutline size={13} /> {book.durationFormatted}
                  </span>
                )}
              </div>

              <div className="space-y-1.5 overflow-y-auto flex-1 pr-1.5 max-h-[380px] lg:max-h-[480px]">
                {sections.map((track, i) => {
                  const isCurrent = currentTrackIdx === i;
                  return (
                    <button
                      key={track.id || i}
                      onClick={() => setCurrentTrackIdx(i)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-indigo-500/20 text-white border border-indigo-500/30'
                          : 'hover:bg-white/5 text-slate-300 border border-transparent'
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                          isCurrent
                            ? 'bg-indigo-500 text-white shadow-sm'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {isCurrent && isPlaying ? '▶' : i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">
                          {track.title || `Chapter ${i + 1}`}
                        </p>
                        {track.readers?.length > 0 && (
                          <p className="text-[10px] text-slate-500 truncate">
                            {track.readers.join(', ')}
                          </p>
                        )}
                      </div>
                      {track.playtimeFormatted && (
                        <span className="text-[11px] text-slate-500 font-mono flex-shrink-0">
                          {track.playtimeFormatted}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Hidden Audio Element */}
          <audio ref={audioRef} preload="metadata" className="hidden" />
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AudiobookPlayerModal;
