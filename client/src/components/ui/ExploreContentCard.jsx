import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  IoArrowUpOutline,
  IoArrowDownOutline,
  IoChatbubbleOutline,
  IoAddCircleOutline,
  IoRemoveCircleOutline,
} from 'react-icons/io5';
import DefaultResourceCover from './DefaultResourceCover';

const DETAIL_ROUTE_BY_TYPE = {
  book: '/books',
  course: '/courses',
  tool: '/tools',
  section: '/sections',
  playlist: '/youtube-playlists',
};

const ExploreContentCard = React.memo(
  ({
    item,
    contentType,
    isSaved = false,
    isOwn = false,
    onVote,
    onOpenComments,
    onAddToLibrary,
    onRemoveFromLibrary,
    onNavigate,
  }) => {
    const [imageError, setImageError] = useState(false);
    const [optimisticVote, setOptimisticVote] = useState(null);
    const [optimisticScoreDelta, setOptimisticScoreDelta] = useState(0);

    // Sync optimistic state whenever confirmed Redux props update
    useEffect(() => {
      setOptimisticVote(null);
      setOptimisticScoreDelta(0);
    }, [item.userVote, item.score]);

    const currentVote =
      optimisticVote !== null ? optimisticVote : item.userVote || 0;
    const currentScore = (item.score || 0) + optimisticScoreDelta;

    const hasValidImage = (item.coverImage || item.bannerImage || item.thumbnail) && !imageError;

    const handleUpvote = (e) => {
      e.stopPropagation();
      const nextVote = currentVote === 1 ? 0 : 1;
      const scoreDiff = nextVote - currentVote;
      setOptimisticVote(nextVote);
      setOptimisticScoreDelta((prev) => prev + scoreDiff);
      onVote?.(contentType, item._id, nextVote);
    };

    const handleDownvote = (e) => {
      e.stopPropagation();
      const nextVote = currentVote === -1 ? 0 : -1;
      const scoreDiff = nextVote - currentVote;
      setOptimisticVote(nextVote);
      setOptimisticScoreDelta((prev) => prev + scoreDiff);
      onVote?.(contentType, item._id, nextVote);
    };

    const handleCardClick = () => {
      const routePrefix = DETAIL_ROUTE_BY_TYPE[contentType] || '/books';
      onNavigate?.(`${routePrefix}/${item._id}`);
    };

    const formatBadgeText = useMemo(() => {
      if (contentType === 'playlist') {
        const count = item.videoCount || (item.videos ? item.videos.length : 0);
        return `📹 Playlist${count ? ` • ${count} vids` : ''}`;
      }
      if (contentType === 'book') {
        if (item.type === 'video') return '📹 Video Book';
        if (item.type === 'text') return '📄 PDF Book';
        if (item.type === 'audio') return '🎧 Audio Book';
        return '📖 Book';
      }
      if (contentType === 'course') return '🎓 Course';
      if (contentType === 'tool') return '⚡ Trick & Tool';
      return '📁 Section';
    }, [contentType, item.type, item.videoCount, item.videos]);

    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        whileHover={{ y: -4 }}
        transition={{ duration: 0.25 }}
        className="relative group rounded-3xl bg-surface border border-subtle hover:border-accent/40 hover:shadow-2xl hover:shadow-black/25 transition-all duration-300 flex flex-col overflow-hidden h-full"
      >
        {/* Top Media / Cover Area - Large, cinematic & responsive */}
        <div className="relative h-56 sm:h-64 bg-surface-raised overflow-hidden flex-shrink-0 border-b border-subtle">
          {hasValidImage ? (
            <img
              src={item.coverImage || item.bannerImage || item.thumbnail}
              alt={item.title}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
              onClick={handleCardClick}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full cursor-pointer" onClick={handleCardClick}>
              <DefaultResourceCover
                contentType={contentType}
                itemType={item.type}
                title={item.title}
              />
            </div>
          )}

          {/* Floating Platform / Format Badge */}
          <div className="absolute top-3 left-3 z-10 pointer-events-none">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold uppercase tracking-wider backdrop-blur-md bg-black/65 text-white border border-white/15 shadow-md">
              {formatBadgeText}
            </span>
          </div>
        </div>

        {/* Card Body Details */}
        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <h3
              className="text-base sm:text-lg font-bold text-primary group-hover:text-accent transition-colors line-clamp-2 leading-snug cursor-pointer"
              onClick={handleCardClick}
            >
              {item.title}
            </h3>

            {(item.author || item.channelTitle) && (
              <p className="text-xs sm:text-sm font-medium text-accent/90 truncate">
                by {item.author || item.channelTitle}
              </p>
            )}

            {item.description && (
              <p className="text-xs sm:text-sm text-secondary line-clamp-2 leading-relaxed">
                {item.description}
              </p>
            )}
          </div>

          <div className="space-y-3 pt-2">
            {/* Added By & Date row */}
            <div className="flex items-center gap-2 pt-3 border-t border-subtle">
              {item.addedBy?.avatar ? (
                <img
                  src={item.addedBy.avatar}
                  alt={item.addedBy.name}
                  className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#ff5722] to-[#f4511e] flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold text-white">
                    {item.addedBy?.name?.[0]?.toUpperCase() || '?'}
                  </span>
                </div>
              )}
              <span className="text-xs text-secondary truncate flex-1 font-medium">
                {item.addedBy?.name || 'Community'}
              </span>
              {item.createdAt && (
                <span className="text-[11px] text-muted flex-shrink-0">
                  {new Date(item.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              )}
            </div>

            {/* Voting, Comments & Save Library Footer */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1 bg-surface-raised/60 px-1.5 py-1 rounded-xl border border-subtle">
                <button
                  type="button"
                  onClick={handleUpvote}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    currentVote === 1
                      ? 'text-emerald-400 bg-emerald-500/10'
                      : 'text-muted hover:text-emerald-400 hover:bg-emerald-500/5'
                  }`}
                  title="Upvote"
                >
                  <IoArrowUpOutline size={15} />
                </button>
                <span
                  className={`text-xs font-bold min-w-[20px] text-center ${
                    currentScore > 0
                      ? 'text-emerald-400'
                      : currentScore < 0
                      ? 'text-red-400'
                      : 'text-muted'
                  }`}
                >
                  {currentScore}
                </span>
                <button
                  type="button"
                  onClick={handleDownvote}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    currentVote === -1
                      ? 'text-red-400 bg-red-500/10'
                      : 'text-muted hover:text-red-400 hover:bg-red-500/5'
                  }`}
                  title="Downvote"
                >
                  <IoArrowDownOutline size={15} />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenComments?.(item, contentType);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-surface-raised/60 border border-subtle text-muted hover:text-accent transition-colors cursor-pointer"
                  title="Open comments"
                >
                  <IoChatbubbleOutline size={14} />
                  <span className="text-xs font-semibold">{item.commentCount || 0}</span>
                </button>

                {!isOwn &&
                  (isSaved ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveFromLibrary?.(item._id);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-400 hover:text-red-400 hover:bg-red-500/10 border border-emerald-500/20 transition-colors cursor-pointer"
                      title="Remove from library"
                    >
                      <IoRemoveCircleOutline size={15} />
                      <span>Saved</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToLibrary?.(contentType, item._id);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-accent hover:opacity-90 shadow-sm shadow-accent/20 transition-all cursor-pointer"
                      title="Add to my library"
                    >
                      <IoAddCircleOutline size={15} />
                      <span>Save</span>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }
);

ExploreContentCard.displayName = 'ExploreContentCard';

export default ExploreContentCard;
