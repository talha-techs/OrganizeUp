import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IoClose,
  IoBookmarkOutline,
  IoBookmark,
  IoLogoYoutube,
  IoTimeOutline,
  IoSparklesOutline,
  IoCheckmarkCircle,
} from 'react-icons/io5';

const YouTubeAudioPlayerModal = ({
  book,
  isOpen,
  onClose,
  onSave,
  isSaving = false,
}) => {
  const videoId = book?.videoId || book?.id;
  const [justSaved, setJustSaved] = useState(false);
  const isSaved = !!book?.isSaved || justSaved;

  const handleSave = async () => {
    if (isSaved || isSaving) return;
    try {
      await onSave(book);
      setJustSaved(true);
    } catch (err) {
      // Handled by parent toast
    }
  };

  // Update browser tab title dynamically while modal is active
  useEffect(() => {
    if (!isOpen || !book) return;
    const prevTitle = document.title;
    document.title = `▶ ${book.title} | OrganizeUp`;
    return () => {
      document.title = prevTitle;
    };
  }, [isOpen, book]);

  if (!isOpen || !book) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25 }}
          className="relative w-full max-w-4xl bg-surface-raised border border-strong rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-subtle bg-surface">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-red-500/10 border border-red-500/20 flex-shrink-0 flex items-center justify-center">
                <IoLogoYoutube className="text-red-500" size={22} />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-primary truncate">
                  {book.title}
                </h2>
                <p className="text-xs text-accent truncate">
                  {book.author} {book.duration ? `· ${book.duration}` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={isSaving || isSaved}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  isSaved
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 cursor-default'
                    : 'bg-surface text-secondary border-subtle hover:text-primary hover:bg-surface-raised active:scale-95 cursor-pointer'
                }`}
                title={isSaved ? 'Saved in personal library' : 'Save to my library'}
              >
                {isSaving ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : isSaved ? (
                  <>
                    <IoCheckmarkCircle size={15} className="text-emerald-400" />
                    <span>Saved</span>
                  </>
                ) : (
                  <>
                    <IoBookmarkOutline size={14} />
                    <span>Save to Library</span>
                  </>
                )}
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-secondary hover:text-primary hover:bg-surface transition-colors cursor-pointer"
                title="Close"
              >
                <IoClose size={20} />
              </button>
            </div>
          </div>

          {/* Body: Responsive Player & Details */}
          <div className="p-6 overflow-y-auto space-y-4 bg-canvas">
            {/* Embedded Responsive Player */}
            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-xl border border-subtle">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
                title={book.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>

            {/* Book Meta & Notes Card */}
            <div className="glass-card p-4 space-y-2 border border-subtle">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-accent-subtle text-accent border border-accent/20">
                  <IoSparklesOutline size={12} />
                  {book.topic || 'Modern Audiobook'}
                </span>
                {book.duration && (
                  <span className="text-xs text-muted font-mono flex items-center gap-1">
                    <IoTimeOutline size={13} /> {book.duration}
                  </span>
                )}
              </div>

              <h3 className="text-base font-bold text-primary">
                {book.title}
              </h3>
              {book.description && (
                <p className="text-xs text-secondary leading-relaxed">
                  {book.description}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default YouTubeAudioPlayerModal;
