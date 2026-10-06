import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  IoArrowUpOutline,
  IoArrowDownOutline,
  IoChatbubbleOutline,
  IoAddCircleOutline,
  IoRemoveCircleOutline,
  IoCheckmarkCircle,
} from 'react-icons/io5';
import DefaultResourceCover from './DefaultResourceCover';

const DETAIL_ROUTE_BY_TYPE = {
  book: '/books',
  course: '/courses',
  tool: '/tools',
  section: '/workspaces',
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
    const [pendingVote, setPendingVote] = useState(null);
    const isVotingRef = useRef(false);

    // Sync / clear pendingVote whenever confirmed Redux props update
    useEffect(() => {
      setPendingVote(null);
    }, [item.userVote, item.upvotes, item.downvotes, item.score]);

    const confirmedUpvotes = item.upvotes ?? (item.score > 0 ? item.score : 0);
    const confirmedDownvotes = item.downvotes ?? (item.score < 0 ? Math.abs(item.score) : 0);
    const confirmedUserVote = item.userVote || 0;

    const currentVote =
      pendingVote !== null ? pendingVote : confirmedUserVote;

    // Independent optimistic counts for likes and dislikes (no likes - dislikes subtraction)
    let currentUpvotes = confirmedUpvotes;
    let currentDownvotes = confirmedDownvotes;

    if (currentVote !== confirmedUserVote) {
      if (confirmedUserVote === 1) currentUpvotes = Math.max(0, currentUpvotes - 1);
      if (confirmedUserVote === -1) currentDownvotes = Math.max(0, currentDownvotes - 1);

      if (currentVote === 1) currentUpvotes += 1;
      if (currentVote === -1) currentDownvotes += 1;
    }

    const thumbUrl = item.coverImage || item.bannerImage || item.thumbnail || item.videos?.[0]?.thumbnail || '';
    const hasValidImage = Boolean(thumbUrl) && !imageError;

    const handleVoteClick = async (targetVote) => {
      if (isVotingRef.current) return;

      // Toggle: if already voted this way, un-vote (0), otherwise set to targetVote (1 or -1)
      const nextVote = currentVote === targetVote ? 0 : targetVote;
      setPendingVote(nextVote);
      isVotingRef.current = true;

      try {
        await onVote?.(contentType, item._id, nextVote);
      } catch (err) {
        setPendingVote(null);
      } finally {
        isVotingRef.current = false;
      }
    };

    const handleUpvote = (e) => {
      e.stopPropagation();
      handleVoteClick(1);
    };

    const handleDownvote = (e) => {
      e.stopPropagation();
      handleVoteClick(-1);
    };

    const handleCardClick = () => {
      const routePrefix = DETAIL_ROUTE_BY_TYPE[contentType] || '/books';
      onNavigate?.(`${routePrefix}/${item._id}`);
    };

    const formatBadgeText = useMemo(() => {
      if (contentType === 'playlist') {
        if (item.type === 'video') return '📹 Single Video';
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
              src={thumbUrl}
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
              <div className="flex items-center bg-surface-raised/70 p-1 rounded-xl border border-subtle divide-x divide-subtle/60">
                {/* Likes / Upward Arrow */}
                <button
                  type="button"
                  onClick={handleUpvote}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    currentVote === 1
                      ? 'text-emerald-400 bg-emerald-500/15 font-bold shadow-sm'
                      : 'text-muted hover:text-emerald-400 hover:bg-emerald-500/10'
                  }`}
                  title="Like"
                >
                  <IoArrowUpOutline size={15} className={currentVote === 1 ? 'stroke-[2.5]' : ''} />
                  <span className="text-xs font-semibold">{currentUpvotes}</span>
                </button>

                {/* Dislikes / Downward Arrow */}
                <button
                  type="button"
                  onClick={handleDownvote}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    currentVote === -1
                      ? 'text-red-400 bg-red-500/15 font-bold shadow-sm'
                      : 'text-muted hover:text-red-400 hover:bg-red-500/10'
                  }`}
                  title="Dislike"
                >
                  <IoArrowDownOutline size={15} className={currentVote === -1 ? 'stroke-[2.5]' : ''} />
                  <span className="text-xs font-semibold">{currentDownvotes}</span>
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
                    <span
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 select-none cursor-default"
                      title="Saved in your personal library"
                    >
                      <IoCheckmarkCircle size={15} />
                      <span>Saved</span>
                    </span>
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
