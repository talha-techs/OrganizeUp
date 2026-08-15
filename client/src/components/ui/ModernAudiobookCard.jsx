import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  IoPlayCircle,
  IoBookmarkOutline,
  IoBookmark,
  IoTimeOutline,
  IoLogoYoutube,
  IoSparklesOutline,
  IoCheckmarkCircle,
} from 'react-icons/io5';

const TOPIC_BADGES = {
  'Habits & Mindset': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'Wealth & Finance': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'Productivity & Focus': 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  'Psychology & Influence': 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  'Self-Discipline & Grit': 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  'Leadership & Business': 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  Default: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
};

const ModernAudiobookCard = ({
  book,
  onPlay,
  onSave,
  isSaving = false,
}) => {
  const [imageError, setImageError] = useState(false);
  const isSaved = !!book.isSaved;

  const topicStyle =
    TOPIC_BADGES[book.topic] || TOPIC_BADGES.Default;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25 }}
      className="glass-card group flex flex-col h-full overflow-hidden border border-white/5 hover:border-indigo-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/5"
    >
      {/* Thumbnail & Badges */}
      <div className="relative h-44 sm:h-48 bg-slate-900 overflow-hidden flex-shrink-0">
        {book.thumbnail && !imageError ? (
          <img
            src={book.thumbnail}
            alt={book.title}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-slate-900 via-indigo-950/60 to-slate-900">
            <IoLogoYoutube className="text-red-500 mb-2" size={32} />
            <p className="text-xs text-slate-400 font-medium line-clamp-2 px-2">
              {book.title}
            </p>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none">
          <span
            className={`px-2.5 py-0.5 rounded-lg text-[11px] font-semibold backdrop-blur-md border ${topicStyle} pointer-events-auto shadow-sm`}
          >
            {book.topic || 'Modern Bestseller'}
          </span>
          {book.duration && (
            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-black/80 backdrop-blur-md text-white border border-white/10 flex items-center gap-1 font-mono">
              <IoTimeOutline size={11} className="text-indigo-400" /> {book.duration}
            </span>
          )}
        </div>

        {/* Quick Play Hover Overlay */}
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <button
            onClick={() => onPlay(book)}
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-red-600 to-indigo-500 hover:scale-105 text-white flex items-center justify-center shadow-lg shadow-indigo-500/40 transform scale-90 group-hover:scale-100 transition-all active:scale-95 cursor-pointer"
            title="Listen / Watch now"
          >
            <IoPlayCircle size={36} />
          </button>
        </div>
      </div>

      {/* Book Information */}
      <div className="p-4 flex flex-col flex-1">
        {/* Title */}
        <h3
          onClick={() => onPlay(book)}
          className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors line-clamp-2 cursor-pointer mb-1 leading-snug"
          title={book.title}
        >
          {book.title}
        </h3>

        {/* Author / Channel */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium truncate mb-2">
          <IoLogoYoutube className="text-red-500 flex-shrink-0" size={13} />
          <span className="truncate">{book.author}</span>
        </div>

        {/* Description snippet */}
        {book.description && (
          <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed flex-1">
            {book.description}
          </p>
        )}

        {/* Action Buttons */}
        <div className="mt-auto pt-3 border-t border-white/5 flex items-center gap-2">
          <button
            onClick={() => onPlay(book)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 hover:from-indigo-500/30 hover:to-cyan-500/30 text-indigo-300 hover:text-indigo-200 text-xs font-semibold border border-indigo-500/25 transition-all active:scale-[0.98] cursor-pointer"
          >
            <IoPlayCircle size={15} /> Listen / Watch
          </button>

          <button
            onClick={() => onSave(book)}
            disabled={isSaving || isSaved}
            className={`p-2 rounded-xl text-xs font-medium border transition-all active:scale-95 cursor-pointer ${
              isSaved
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-white/5 text-slate-400 border-white/10 hover:text-white hover:bg-white/10'
            }`}
            title={isSaved ? 'Saved in library' : 'Save to my library'}
          >
            {isSaved ? (
              <IoCheckmarkCircle size={15} className="text-emerald-400" />
            ) : (
              <IoBookmarkOutline size={15} />
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ModernAudiobookCard;
