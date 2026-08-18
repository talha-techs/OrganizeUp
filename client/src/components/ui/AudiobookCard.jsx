import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  IoPlayCircle,
  IoBookmarkOutline,
  IoBookmark,
  IoTimeOutline,
  IoCalendarOutline,
  IoListOutline,
  IoLanguageOutline,
  IoMusicalNotesOutline,
} from 'react-icons/io5';

const GENRE_COLORS = {
  Fiction: 'bg-accent-subtle text-accent border-accent/30',
  Philosophy: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  History: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  Literature: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  Science: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  Mystery: 'bg-red-500/15 text-red-400 border-red-500/30',
  Poetry: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
  Default: 'bg-surface text-secondary border-subtle',
};

const AudiobookCard = ({
  book,
  onPlay,
  onSave,
  onUnsave,
  isSaving = false,
}) => {
  const [imageError, setImageError] = useState(false);
  const isSaved = !!book.isSaved;

  const firstGenre = book.genres?.[0] || 'Audiobook';
  const genreStyle =
    GENRE_COLORS[firstGenre] || GENRE_COLORS.Default;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25 }}
      className="glass-card group flex flex-col h-full overflow-hidden border border-subtle hover:border-strong transition-all duration-300 hover:shadow-xl hover:shadow-black/20"
    >
      {/* Cover Image & Header */}
      <div className="relative h-48 sm:h-52 bg-surface-raised overflow-hidden flex-shrink-0">
        {book.coverImage && !imageError ? (
          <img
            src={book.coverImage}
            alt={book.title}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-surface-raised border-b border-subtle">
            <div className="w-14 h-14 rounded-2xl bg-accent-subtle flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <IoMusicalNotesOutline className="text-accent" size={28} />
            </div>
            <p className="text-xs text-secondary font-medium line-clamp-2 px-2">
              {book.title}
            </p>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none">
          <span
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold backdrop-blur-md border ${genreStyle} pointer-events-auto shadow-sm`}
          >
            {firstGenre}
          </span>
          {book.language && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-black/60 backdrop-blur-md text-white/80 border border-white/10 flex items-center gap-1">
              <IoLanguageOutline size={11} /> {book.language}
            </span>
          )}
        </div>

        {/* Quick Play Hover Overlay */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <button
            onClick={() => onPlay(book)}
            className="w-14 h-14 rounded-full bg-accent hover:bg-accent-hover text-white flex items-center justify-center shadow-lg shadow-black/40 transform scale-90 group-hover:scale-100 transition-all active:scale-95 cursor-pointer"
            title="Listen now"
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
          className="text-sm font-semibold text-primary group-hover:text-accent transition-colors line-clamp-2 cursor-pointer mb-1 leading-snug"
          title={book.title}
        >
          {book.title}
        </h3>

        {/* Author */}
        <p className="text-xs text-accent font-medium truncate mb-2.5">
          {book.author}
        </p>

        {/* Metadata Details Grid */}
        <div className="grid grid-cols-2 gap-1.5 text-[11px] text-secondary mb-3 bg-surface p-2 rounded-xl border border-subtle">
          {book.copyrightYear && (
            <div className="flex items-center gap-1 truncate" title={`Year: ${book.copyrightYear}`}>
              <IoCalendarOutline size={12} className="text-muted flex-shrink-0" />
              <span className="truncate">{book.copyrightYear}</span>
            </div>
          )}
          {book.durationFormatted && (
            <div className="flex items-center gap-1 truncate" title={`Duration: ${book.durationFormatted}`}>
              <IoTimeOutline size={12} className="text-accent flex-shrink-0" />
              <span className="truncate">{book.durationFormatted}</span>
            </div>
          )}
          {book.numSections > 0 && (
            <div className="flex items-center gap-1 truncate col-span-2" title={`${book.numSections} Chapters`}>
              <IoListOutline size={12} className="text-muted flex-shrink-0" />
              <span className="truncate">{book.numSections} Chapters</span>
            </div>
          )}
        </div>

        {/* Description Snippet */}
        {book.description && (
          <p className="text-xs text-muted line-clamp-2 mb-4 leading-relaxed flex-1">
            {book.description}
          </p>
        )}

        {/* Action Buttons */}
        <div className="mt-auto pt-3 border-t border-subtle flex items-center gap-2">
          <button
            onClick={() => onPlay(book)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-accent-subtle hover:bg-accent-glow text-accent text-xs font-semibold border border-subtle transition-all active:scale-[0.98] cursor-pointer"
          >
            <IoPlayCircle size={15} /> Listen Now
          </button>

          <button
            onClick={() => (isSaved ? onUnsave(book) : onSave(book))}
            disabled={isSaving}
            className={`p-2 rounded-xl text-xs font-medium border transition-all active:scale-95 cursor-pointer ${
              isSaved
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                : 'bg-surface text-secondary border-subtle hover:text-primary hover:bg-surface-raised'
            }`}
            title={isSaved ? 'Remove from library' : 'Save to my library'}
          >
            {isSaved ? (
              <IoBookmark size={15} className="text-emerald-400" />
            ) : (
              <IoBookmarkOutline size={15} />
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default AudiobookCard;
