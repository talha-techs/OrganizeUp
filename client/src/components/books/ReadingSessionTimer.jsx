import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IoHourglassOutline,
  IoPlayOutline,
  IoPauseOutline,
  IoRefreshOutline,
  IoSettingsOutline,
  IoSparkles,
  IoCheckmarkCircle,
  IoCafeOutline,
  IoClose,
  IoDocumentTextOutline,
  IoVolumeMediumOutline,
  IoVolumeMuteOutline,
  IoTrophyOutline,
  IoBookOutline,
  IoChevronUp,
  IoChevronDown,
} from 'react-icons/io5';
import toast from 'react-hot-toast';
import { sendOSNotification } from '../../utils/notificationService';

// Audio chime using Web Audio API (smooth celebratory chord: C5 -> E5 -> G5 -> C6)
const playCelebrationChime = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);

      gain.gain.setValueAtTime(0, now + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.12 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.85);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.9);
    });
  } catch (err) {
    console.warn('Audio chime skipped', err);
  }
};

const INSPIRING_QUOTES = [
  {
    quote: 'Reading is to the mind what exercise is to the body.',
    author: 'Joseph Addison',
  },
  {
    quote: 'A reader lives a thousand lives before he dies. The man who never reads lives only one.',
    author: 'George R.R. Martin',
  },
  {
    quote: 'The more that you read, the more things you will know. The more that you learn, the more places you’ll go.',
    author: 'Dr. Seuss',
  },
  {
    quote: 'Books are a uniquely portable magic.',
    author: 'Stephen King',
  },
  {
    quote: 'Continuous learning is the minimum requirement for success in any field.',
    author: 'Brian Tracy',
  },
  {
    quote: 'You do not rise to the level of your goals. You fall to the level of your systems.',
    author: 'James Clear',
  },
  {
    quote: 'An investment in knowledge pays the best interest.',
    author: 'Benjamin Franklin',
  },
];

// Presets from 5 min to 8 hours
const PRESETS = [
  { label: '15m', minutes: 15, desc: 'Quick Read' },
  { label: '25m', minutes: 25, desc: 'Pomodoro' },
  { label: '30m', minutes: 30, desc: 'Standard' },
  { label: '45m', minutes: 45, desc: 'Deep Focus' },
  { label: '1h', minutes: 60, desc: '1 Hour' },
  { label: '2h', minutes: 120, desc: '2 Hours' },
  { label: '4h', minutes: 240, desc: 'Deep Dive' },
];

export default function ReadingSessionTimer({
  bookId,
  bookTitle = 'Book',
  currentPage = 1,
  totalPages = 0,
  userName = 'Scholar',
  onSessionComplete,
  onOpenNotes,
}) {
  const storageKey = `organizeup_reading_timer_${bookId || 'default'}`;
  const prefKey = 'organizeup_reading_timer_pref';

  // Read initial preference or default 30 min
  const getSavedTargetMinutes = () => {
    try {
      const savedPref = localStorage.getItem(prefKey);
      if (savedPref) {
        const parsed = parseInt(savedPref, 10);
        if (parsed >= 5 && parsed <= 480) return parsed;
      }
    } catch {}
    return 30;
  };

  const [targetMinutes, setTargetMinutes] = useState(getSavedTargetMinutes);
  const [timeLeft, setTimeLeft] = useState(() => targetMinutes * 60);
  const [isRunning, setIsRunning] = useState(true); // Auto-starts when opened!
  const [isBreakMode, setIsBreakMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);
  const [startPage, setStartPage] = useState(currentPage || 1);
  const [completedStats, setCompletedStats] = useState(null);

  // Custom modal inputs
  const [customHours, setCustomHours] = useState(() => Math.floor(targetMinutes / 60));
  const [customMinutes, setCustomMinutes] = useState(() => targetMinutes % 60);

  // Quote selected for celebration
  const [quoteIndex, setQuoteIndex] = useState(0);

  // Sync start page on initial load if not set
  useEffect(() => {
    if (currentPage && (!startPage || startPage === 1)) {
      setStartPage(currentPage);
    }
  }, [currentPage, startPage]);

  // Restore active timer state from localStorage on mount if recently saved
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const data = JSON.parse(raw);
        const elapsedSinceSave = Math.floor((Date.now() - data.savedAt) / 1000);
        if (data.isRunning && data.timeLeft - elapsedSinceSave > 0) {
          setTimeLeft(data.timeLeft - elapsedSinceSave);
          setTargetMinutes(data.targetMinutes || 30);
          setIsRunning(true);
          if (data.startPage) setStartPage(data.startPage);
          if (data.isBreakMode) setIsBreakMode(data.isBreakMode);
        } else if (!data.isRunning && data.timeLeft > 0) {
          setTimeLeft(data.timeLeft);
          setTargetMinutes(data.targetMinutes || 30);
          setIsRunning(false);
          if (data.startPage) setStartPage(data.startPage);
        }
      }
    } catch {}
  }, [storageKey]);

  // Persist timer state to localStorage periodically
  useEffect(() => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          targetMinutes,
          timeLeft,
          isRunning,
          isBreakMode,
          startPage,
          savedAt: Date.now(),
        })
      );
    } catch {}
  }, [storageKey, targetMinutes, timeLeft, isRunning, isBreakMode, startPage]);

  // Main countdown ticker
  useEffect(() => {
    let interval = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft]);

  // Handle Timer Reaching Zero (Celebration!)
  useEffect(() => {
    if (timeLeft === 0 && isRunning) {
      setIsRunning(false);

      if (isBreakMode) {
        toast.success('☕ Break finished! Ready to resume reading?', { icon: '🔔' });
        setIsBreakMode(false);
        setTimeLeft(targetMinutes * 60);
        return;
      }

      // Calculate stats
      const endPage = currentPage || startPage;
      const pagesCovered = Math.max(0, endPage - startPage);
      const stats = {
        durationMinutes: targetMinutes,
        startPage,
        endPage,
        pagesCovered,
        completedAt: new Date(),
      };
      setCompletedStats(stats);
      setQuoteIndex(Math.floor(Math.random() * INSPIRING_QUOTES.length));
      setShowCelebrationModal(true);

      // Play pleasant audio chime
      if (soundEnabled) {
        playCelebrationChime();
      }

      // Trigger OS notification
      sendOSNotification(`🎉 Reading Goal Reached!`, {
        body: `Great job reading "${bookTitle}" for ${targetMinutes} minutes!`,
        url: window.location.pathname,
      });

      if (onSessionComplete) {
        onSessionComplete(stats);
      }
    }
  }, [
    timeLeft,
    isRunning,
    isBreakMode,
    targetMinutes,
    currentPage,
    startPage,
    soundEnabled,
    bookTitle,
    onSessionComplete,
  ]);

  // Formatted display helper
  const formattedTime = useMemo(() => {
    const hours = Math.floor(timeLeft / 3600);
    const minutes = Math.floor((timeLeft % 3600) / 60);
    const seconds = timeLeft % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, [timeLeft]);

  // Progress percentage (0% to 100%)
  const totalSeconds = targetMinutes * 60;
  const progressPercent = totalSeconds > 0 ? Math.min(100, Math.max(0, ((totalSeconds - timeLeft) / totalSeconds) * 100)) : 0;

  // Actions
  const togglePlayPause = () => {
    if (timeLeft === 0) {
      setTimeLeft(targetMinutes * 60);
      setIsRunning(true);
    } else {
      setIsRunning((prev) => !prev);
    }
  };

  const handleResetTimer = () => {
    setIsRunning(false);
    setTimeLeft(targetMinutes * 60);
    setStartPage(currentPage || 1);
    toast.success('Reading timer reset');
  };

  const handleOpenConfig = () => {
    setCustomHours(Math.floor(targetMinutes / 60));
    setCustomMinutes(targetMinutes % 60);
    setShowConfigModal(true);
  };

  const applyCustomDuration = (minutes) => {
    const clamped = Math.min(480, Math.max(5, minutes));
    setTargetMinutes(clamped);
    setTimeLeft(clamped * 60);
    setIsRunning(true);
    setIsBreakMode(false);
    setStartPage(currentPage || 1);
    setShowConfigModal(false);

    try {
      localStorage.setItem(prefKey, String(clamped));
    } catch {}

    toast.success(`Reading timer set to ${clamped >= 60 ? `${Math.floor(clamped / 60)}h ${clamped % 60 > 0 ? `${clamped % 60}m` : ''}` : `${clamped} minutes`}`);
  };

  const handleSaveModalConfig = (e) => {
    e.preventDefault();
    const totalMins = parseInt(customHours, 10) * 60 + parseInt(customMinutes, 10);
    if (totalMins < 5) {
      toast.error('Minimum reading timer is 5 minutes');
      return;
    }
    if (totalMins > 480) {
      toast.error('Maximum reading timer is 8 hours (480 minutes)');
      return;
    }
    applyCustomDuration(totalMins);
  };

  const handleExtendReading = (extraMinutes = 15) => {
    setShowCelebrationModal(false);
    setTargetMinutes((prev) => prev + extraMinutes);
    setTimeLeft(extraMinutes * 60);
    setIsRunning(true);
    toast.success(`Added +${extraMinutes} minutes! Keep reading! 📖`);
  };

  const handleStartBreak = (breakMinutes = 5) => {
    setShowCelebrationModal(false);
    setIsBreakMode(true);
    setTargetMinutes(breakMinutes);
    setTimeLeft(breakMinutes * 60);
    setIsRunning(true);
    toast.success(`Enjoy your ${breakMinutes}-minute coffee break! ☕`);
  };

  return (
    <>
      {/* ── Compact Header / In-Bar Widget ── */}
      <div className="inline-flex items-center gap-1.5 p-1 rounded-xl bg-surface-raised/90 border border-subtle backdrop-blur-md shadow-xs select-none">
        {/* Timer Time & Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlayPause}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
            isBreakMode
              ? 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30'
              : isRunning
              ? 'bg-accent/15 text-accent hover:bg-accent/25 border border-accent/30 shadow-xs'
              : 'bg-surface text-secondary hover:text-primary border border-subtle'
          }`}
          title={
            isRunning
              ? 'Pause session timer'
              : timeLeft === 0
              ? 'Restart session timer'
              : 'Start reading timer'
          }
        >
          {isBreakMode ? (
            <IoCafeOutline size={14} className="text-amber-400" />
          ) : isRunning ? (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
            </span>
          ) : (
            <IoPlayOutline size={13} className="text-secondary" />
          )}

          <span className="tabular-nums font-bold tracking-tight text-primary">
            {formattedTime}
          </span>

          <span className="text-[10px] uppercase font-sans font-semibold text-muted">
            {isBreakMode ? 'Break' : isRunning ? 'Reading' : 'Paused'}
          </span>
        </button>

        {/* Small Visual Progress Ring / Bar */}
        <div
          className="w-12 h-1.5 rounded-full bg-surface border border-subtle overflow-hidden hidden sm:block"
          title={`${Math.round(progressPercent)}% elapsed of ${targetMinutes}m`}
        >
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              isBreakMode ? 'bg-amber-400' : 'bg-accent'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Settings / Adjust Duration Button */}
        <button
          type="button"
          onClick={handleOpenConfig}
          className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-surface border border-transparent hover:border-subtle transition-colors cursor-pointer"
          title="Adjust timer duration (5 min to 8 hours)"
        >
          <IoSettingsOutline size={14} />
        </button>

        {/* Reset Button */}
        <button
          type="button"
          onClick={handleResetTimer}
          className="p-1.5 rounded-lg text-muted hover:text-secondary hover:bg-surface border border-transparent hover:border-subtle transition-colors cursor-pointer"
          title="Reset timer to beginning"
        >
          <IoRefreshOutline size={14} />
        </button>
      </div>

      {/* ── Configuration / Custom Duration Modal ── */}
      <AnimatePresence>
        {showConfigModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md rounded-3xl bg-surface border border-subtle shadow-2xl overflow-hidden p-6 space-y-6"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-subtle pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-accent-subtle text-accent flex items-center justify-center border border-accent/20">
                    <IoHourglassOutline size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-primary font-display">
                      Set Reading Session Timer
                    </h3>
                    <p className="text-xs text-secondary mt-0.5">
                      Focus duration (min 5 min, max 8 hours)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="p-2 rounded-xl text-muted hover:text-primary hover:bg-surface-raised transition-colors cursor-pointer"
                >
                  <IoClose size={18} />
                </button>
              </div>

              {/* Quick Presets */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-secondary uppercase tracking-wider">
                  Quick Presets
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {PRESETS.map((p) => {
                    const isSelected = targetMinutes === p.minutes;
                    return (
                      <button
                        key={p.minutes}
                        type="button"
                        onClick={() => applyCustomDuration(p.minutes)}
                        className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                          isSelected
                            ? 'bg-accent text-white border-accent shadow-md shadow-accent/25'
                            : 'bg-surface-raised/70 hover:bg-surface-raised border-subtle text-secondary hover:text-primary'
                        }`}
                      >
                        <span className="text-sm font-bold font-mono">{p.label}</span>
                        <span className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-muted'}`}>
                          {p.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Hours & Minutes Stepper */}
              <form onSubmit={handleSaveModalConfig} className="space-y-4 pt-1 border-t border-subtle">
                <label className="text-xs font-bold text-secondary uppercase tracking-wider block">
                  Custom Target Duration
                </label>

                <div className="grid grid-cols-2 gap-4">
                  {/* Hours */}
                  <div className="p-3 rounded-2xl bg-surface-raised border border-subtle flex flex-col items-center justify-center">
                    <span className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                      Hours (0-8)
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setCustomHours((h) => Math.max(0, h - 1))}
                        className="w-8 h-8 rounded-xl bg-surface hover:bg-surface-raised border border-subtle flex items-center justify-center text-primary font-bold transition-colors cursor-pointer"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0"
                        max="8"
                        value={customHours}
                        onChange={(e) => setCustomHours(Math.min(8, Math.max(0, parseInt(e.target.value) || 0)))}
                        className="w-12 text-center text-xl font-bold font-mono text-primary bg-transparent focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setCustomHours((h) => Math.min(8, h + 1))}
                        className="w-8 h-8 rounded-xl bg-surface hover:bg-surface-raised border border-subtle flex items-center justify-center text-primary font-bold transition-colors cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Minutes */}
                  <div className="p-3 rounded-2xl bg-surface-raised border border-subtle flex flex-col items-center justify-center">
                    <span className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                      Minutes (0-59)
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setCustomMinutes((m) => Math.max(0, m - 5))}
                        className="w-8 h-8 rounded-xl bg-surface hover:bg-surface-raised border border-subtle flex items-center justify-center text-primary font-bold transition-colors cursor-pointer"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        step="1"
                        value={customMinutes}
                        onChange={(e) => setCustomMinutes(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                        className="w-12 text-center text-xl font-bold font-mono text-primary bg-transparent focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setCustomMinutes((m) => Math.min(59, m + 5))}
                        className="w-8 h-8 rounded-xl bg-surface hover:bg-surface-raised border border-subtle flex items-center justify-center text-primary font-bold transition-colors cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Validation summary banner */}
                {(() => {
                  const total = customHours * 60 + customMinutes;
                  const isValid = total >= 5 && total <= 480;
                  return (
                    <div className="flex items-center justify-between text-xs px-2">
                      <span className="text-secondary">
                        Total:{' '}
                        <strong className="text-primary font-mono">
                          {customHours > 0 ? `${customHours}h ` : ''}
                          {customMinutes}m ({total} mins)
                        </strong>
                      </span>
                      {!isValid && (
                        <span className="text-red-400 font-semibold">
                          Must be 5 min - 8 hours
                        </span>
                      )}
                    </div>
                  );
                })()}

                {/* Chime audio toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-subtle text-xs">
                  <span className="flex items-center gap-2 text-secondary">
                    {soundEnabled ? (
                      <IoVolumeMediumOutline size={16} className="text-accent" />
                    ) : (
                      <IoVolumeMuteOutline size={16} className="text-muted" />
                    )}
                    Play completion chime
                  </span>
                  <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={(e) => setSoundEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-accent focus:ring-accent accent-accent cursor-pointer"
                  />
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowConfigModal(false)}
                    className="btn-secondary flex-1 text-xs py-2.5 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={customHours * 60 + customMinutes < 5 || customHours * 60 + customMinutes > 480}
                    className="btn-primary flex-1 text-xs py-2.5 shadow-md shadow-accent/25 cursor-pointer disabled:opacity-40"
                  >
                    Apply & Start Timer
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Encouraging Session Completion Modal ── */}
      <AnimatePresence>
        {showCelebrationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            {/* Confetti particles */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(24)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{
                    opacity: 1,
                    y: -20,
                    x: Math.random() * (window.innerWidth || 800) - (window.innerWidth || 800) / 2,
                    rotate: 0,
                    scale: Math.random() * 0.8 + 0.5,
                  }}
                  animate={{
                    opacity: [1, 1, 0],
                    y: (window.innerHeight || 600) + 50,
                    rotate: Math.random() * 720 - 360,
                  }}
                  transition={{
                    duration: Math.random() * 2 + 2,
                    ease: 'easeOut',
                    delay: Math.random() * 0.4,
                  }}
                  className={`absolute top-0 left-1/2 w-3 h-3 rounded-sm ${
                    [
                      'bg-orange-500',
                      'bg-amber-400',
                      'bg-emerald-400',
                      'bg-sky-400',
                      'bg-purple-400',
                      'bg-rose-400',
                    ][i % 6]
                  }`}
                />
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 20 }}
              transition={{ type: 'spring', damping: 20, stiffness: 260 }}
              className="relative z-10 w-full max-w-lg rounded-3xl bg-surface border border-accent/40 shadow-2xl overflow-hidden p-6 sm:p-8 text-center space-y-6"
            >
              {/* Close corner button */}
              <button
                type="button"
                onClick={() => setShowCelebrationModal(false)}
                className="absolute right-4 top-4 p-2 rounded-xl text-muted hover:text-primary hover:bg-surface-raised transition-colors cursor-pointer"
              >
                <IoClose size={20} />
              </button>

              {/* Trophy & Glow Backdrop */}
              <div className="relative mx-auto w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-xl shadow-orange-500/30">
                <motion.div
                  animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                >
                  <IoTrophyOutline size={42} />
                </motion.div>
                <div className="absolute -inset-4 bg-accent/20 rounded-full blur-xl pointer-events-none" />
              </div>

              {/* Headline & Personalized Encouragement */}
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-accent/15 text-accent border border-accent/30 shadow-xs">
                  <IoSparkles size={13} />
                  <span>Session Accomplished!</span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-primary font-display tracking-tight">
                  Phenomenal Focus, {userName}! 🎉
                </h2>

                <p className="text-sm text-secondary leading-relaxed max-w-md mx-auto">
                  You set a dedicated reading goal of{' '}
                  <strong className="text-primary font-mono">{targetMinutes} minutes</strong> and
                  focused without stopping. Every page you read sharpens your intellect!
                </p>
              </div>

              {/* Session Stats Grid */}
              <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-surface-raised border border-subtle">
                <div>
                  <p className="text-[10px] text-muted uppercase font-bold tracking-wider">
                    ⏱️ Time Read
                  </p>
                  <p className="text-lg font-black text-primary font-mono mt-0.5">
                    {targetMinutes}m
                  </p>
                </div>

                <div className="border-x border-subtle">
                  <p className="text-[10px] text-muted uppercase font-bold tracking-wider">
                    📖 Current Page
                  </p>
                  <p className="text-lg font-black text-accent font-mono mt-0.5">
                    p. {currentPage}
                    {totalPages > 0 && (
                      <span className="text-xs text-muted font-normal"> / {totalPages}</span>
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] text-muted uppercase font-bold tracking-wider">
                    🔥 Habit Streak
                  </p>
                  <p className="text-lg font-black text-emerald-400 font-mono mt-0.5">
                    +1 Day
                  </p>
                </div>
              </div>

              {/* Inspiring Quote of the Day */}
              <div className="p-4 rounded-2xl bg-surface-raised/50 border border-subtle/80 text-left space-y-1 relative overflow-hidden">
                <div className="absolute top-2 right-2 text-accent/10 pointer-events-none">
                  <IoBookOutline size={40} />
                </div>
                <p className="text-xs sm:text-sm text-secondary italic leading-relaxed">
                  "{INSPIRING_QUOTES[quoteIndex].quote}"
                </p>
                <p className="text-[11px] font-bold text-accent text-right">
                  — {INSPIRING_QUOTES[quoteIndex].author}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCelebrationModal(false)}
                  className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-accent text-white font-bold text-xs shadow-lg shadow-accent/25 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <IoCheckmarkCircle size={16} />
                  <span>Done for Now</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleExtendReading(15)}
                  className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-surface-raised hover:bg-surface border border-subtle hover:border-accent text-primary font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  title="Add 15 more minutes to this reading session"
                >
                  <IoHourglassOutline size={15} className="text-accent" />
                  <span>+15m Keep Reading</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleStartBreak(5)}
                  className="w-full sm:w-auto py-3 px-3.5 rounded-xl bg-surface-raised hover:bg-surface border border-subtle hover:border-amber-400 text-amber-400 font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  title="Take a 5-minute coffee break"
                >
                  <IoCafeOutline size={16} />
                  <span className="sm:hidden">5m Break</span>
                </button>

                {onOpenNotes && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowCelebrationModal(false);
                      onOpenNotes();
                    }}
                    className="w-full sm:w-auto py-3 px-3.5 rounded-xl bg-surface-raised hover:bg-surface border border-subtle hover:border-emerald-400 text-emerald-400 font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    title="Write your study notes and key takeaways"
                  >
                    <IoDocumentTextOutline size={16} />
                    <span className="sm:hidden">Take Notes</span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
