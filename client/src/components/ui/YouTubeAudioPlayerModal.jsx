import { motion, AnimatePresence } from 'framer-motion';
import {
  IoClose,
  IoBookmarkOutline,
  IoBookmark,
  IoLogoYoutube,
  IoTimeOutline,
  IoSparklesOutline,
} from 'react-icons/io5';

const YouTubeAudioPlayerModal = ({
  book,
  isOpen,
  onClose,
  onSave,
  isSaving = false,
}) => {
  if (!isOpen || !book) return null;

  const videoId = book.videoId || book.id;
  const isSaved = !!book.isSaved;

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
          className="relative w-full max-w-4xl bg-slate-900/95 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-red-500/10 border border-red-500/20 flex-shrink-0 flex items-center justify-center">
                <IoLogoYoutube className="text-red-500" size={22} />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-white truncate">
                  {book.title}
                </h2>
                <p className="text-xs text-indigo-400 truncate">
                  {book.author} {book.duration ? `· ${book.duration}` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onSave(book)}
                disabled={isSaving || isSaved}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  isSaved
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
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
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                title="Close"
              >
                <IoClose size={20} />
              </button>
            </div>
          </div>

          {/* Body: Responsive Player & Details */}
          <div className="p-6 overflow-y-auto space-y-4 bg-gradient-to-b from-slate-900 to-indigo-950/20">
            {/* Embedded Responsive Player */}
            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-xl border border-white/10">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
                title={book.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>

            {/* Book Meta & Notes Card */}
            <div className="glass-card p-4 space-y-2 border border-white/5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                  <IoSparklesOutline size={12} />
                  {book.topic || 'Modern Audiobook'}
                </span>
                {book.duration && (
                  <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                    <IoTimeOutline size={13} /> {book.duration}
                  </span>
                )}
              </div>

              <h3 className="text-base font-bold text-white">
                {book.title}
              </h3>
              {book.description && (
                <p className="text-xs text-slate-400 leading-relaxed">
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
