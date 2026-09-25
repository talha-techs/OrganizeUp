import { useState, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
void motion;
import {
  IoTrashOutline,
  IoCopyOutline,
  IoOpenOutline,
  IoVideocamOutline,
  IoTvOutline,
  IoChevronDown,
  IoChevronUp,
  IoPlay,
  IoCheckmark,
  IoSparklesOutline,
} from 'react-icons/io5';
import toast from 'react-hot-toast';
import UniversalVideoPlayer from '../capture/UniversalVideoPlayer';
import { updateLink } from '../../redux/slices/sectionSlice';
import {
  detectLinkMediaInfo,
  getPlatformBadge,
} from '../../utils/linkMediaUtils';

/**
 * Workspace Wide & Adjustable Video Card Component
 */
const WorkspaceVideoCard = ({
  link,
  sectionId,
  subId,
  canEdit,
  onDelete,
}) => {
  const dispatch = useDispatch();
  const [copied, setCopied] = useState(false);
  const [showDesc, setShowDesc] = useState(false);

  // Safely compute detected media data if not stored
  const detected = useMemo(() => {
    return detectLinkMediaInfo(link?.url) || {};
  }, [link?.url]);

  const resolvedPlatform = link?.platform && link?.platform !== 'web'
    ? link.platform
    : detected.platform || 'web';

  const resolvedEmbedUrl = link?.embedUrl || detected.embedUrl || '';
  const resolvedMediaUrl = link?.mediaUrl || detected.mediaUrl || '';
  const resolvedThumbnail = link?.thumbnailUrl || detected.thumbnailUrl || '';

  // Local state for interactive size & aspect ratio adjustment
  const [displayMode, setDisplayMode] = useState(link?.displayMode || 'wide'); // 'wide' | 'theater' | 'compact'
  const [aspectRatio, setAspectRatio] = useState(
    link?.aspectRatio || detected.aspectRatio || (resolvedPlatform === 'instagram' ? '9/16' : '16/9')
  );

  const badge = getPlatformBadge(resolvedPlatform);

  const handleCopyLink = (e) => {
    e.stopPropagation();
    if (!link?.url) return;
    navigator.clipboard.writeText(link.url);
    setCopied(true);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleDisplayMode = (newMode) => {
    setDisplayMode(newMode);
    if (canEdit && sectionId && subId && link?._id) {
      dispatch(
        updateLink({
          sectionId,
          subId,
          linkId: link._id,
          displayMode: newMode,
        })
      );
    }
  };

  const handleToggleAspectRatio = (newRatio) => {
    setAspectRatio(newRatio);
    if (canEdit && sectionId && subId && link?._id) {
      dispatch(
        updateLink({
          sectionId,
          subId,
          linkId: link._id,
          aspectRatio: newRatio,
        })
      );
    }
  };

  // Determine aspect-ratio class
  const getAspectClass = () => {
    switch (aspectRatio) {
      case '9/16':
        return 'aspect-[9/16] max-h-[640px]';
      case '4/3':
        return 'aspect-[4/3] max-h-[560px]';
      case '21/9':
        return 'aspect-[21/9] min-h-[300px]';
      case '16/9':
      default:
        return 'aspect-video min-h-[320px] max-h-[620px]';
    }
  };

  if (!link) return null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className={`rounded-2xl transition-all duration-300 overflow-hidden border ${
        displayMode === 'theater'
          ? 'w-full shadow-2xl shadow-black/40 border-accent/40 bg-surface-raised ring-1 ring-accent/20 my-3'
          : 'w-full bg-surface border-subtle hover:border-accent/30 shadow-md my-2'
      }`}
    >
      {/* ── Top Bar / Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-surface-raised/70 border-b border-subtle">
        {/* Left: Platform badge & title */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border flex-shrink-0 shadow-sm ${badge.bgCls}`}
          >
            {badge.icon}
            <span>{badge.label}</span>
          </span>

          <h4
            className="text-sm font-semibold text-primary truncate leading-snug cursor-pointer hover:text-accent transition-colors"
            title={link.title || link.url}
            onClick={() => link.url && window.open(link.url, '_blank')}
          >
            {link.title || 'Video Resource'}
          </h4>

          {link.authorName && (
            <span className="hidden sm:inline-block text-xs text-muted truncate flex-shrink-0">
              by <strong className="text-secondary font-medium">{link.authorName}</strong>
            </span>
          )}
        </div>

        {/* Right: Controls (Aspect Ratio, Theater/Wide, Copy, Open, Delete) */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Aspect Ratio pills (only when player is visible) */}
          {displayMode !== 'compact' && (
            <div className="hidden sm:flex items-center gap-1 bg-surface p-0.5 rounded-lg border border-subtle text-[11px]">
              {['16/9', '9/16', '21/9'].map((ratio) => (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => handleToggleAspectRatio(ratio)}
                  className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                    aspectRatio === ratio
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-muted hover:text-primary hover:bg-surface-raised'
                  }`}
                  title={`Switch to ${ratio} aspect ratio`}
                >
                  {ratio}
                </button>
              ))}
            </div>
          )}

          {/* Size / Theater Toggle */}
          <button
            type="button"
            onClick={() =>
              handleToggleDisplayMode(displayMode === 'theater' ? 'wide' : 'theater')
            }
            className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer border ${
              displayMode === 'theater'
                ? 'bg-accent/20 text-accent border-accent/40 font-semibold'
                : 'text-secondary hover:text-primary hover:bg-surface-raised border-transparent'
            }`}
            title={displayMode === 'theater' ? 'Exit Theater Mode' : 'Wide Theater Mode'}
          >
            <IoTvOutline size={15} />
            <span className="hidden md:inline">
              {displayMode === 'theater' ? 'Theater On' : 'Theater'}
            </span>
          </button>

          {/* Compact / Expand Toggle */}
          <button
            type="button"
            onClick={() =>
              handleToggleDisplayMode(displayMode === 'compact' ? 'wide' : 'compact')
            }
            className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-surface-raised transition-colors cursor-pointer"
            title={displayMode === 'compact' ? 'Expand Video' : 'Minimize Player'}
          >
            {displayMode === 'compact' ? <IoChevronDown size={15} /> : <IoChevronUp size={15} />}
          </button>

          {/* Copy Link */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="p-1.5 rounded-lg text-secondary hover:text-accent hover:bg-accent-subtle transition-colors cursor-pointer"
            title="Copy Video URL"
          >
            {copied ? <IoCheckmark size={15} className="text-emerald-400" /> : <IoCopyOutline size={15} />}
          </button>

          {/* Open Link */}
          {link.url && (
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-secondary hover:text-accent hover:bg-accent-subtle transition-colors"
              title="Open in new tab"
            >
              <IoOpenOutline size={15} />
            </a>
          )}

          {/* Delete Link */}
          {canEdit && (
            <button
              type="button"
              onClick={() => onDelete?.(link._id)}
              className="p-1.5 rounded-lg text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
              title="Remove Video Card"
            >
              <IoTrashOutline size={15} />
            </button>
          )}
        </div>
      </div>

      {/* ── Main Player Area ── */}
      <AnimatePresence mode="wait">
        {displayMode === 'compact' ? (
          /* Compact Minimized View */
          <motion.div
            key="compact"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onClick={() => handleToggleDisplayMode('wide')}
            className="flex items-center gap-3 p-3 cursor-pointer group hover:bg-surface-raised/40 transition-colors"
          >
            <div className="relative w-28 h-16 rounded-xl overflow-hidden bg-black/60 flex-shrink-0 flex items-center justify-center border border-subtle">
              {resolvedThumbnail ? (
                <img
                  src={resolvedThumbnail}
                  alt={link.title || 'Video'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center text-muted">
                  <IoVideocamOutline size={22} />
                </div>
              )}
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/10 transition-colors">
                <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <IoPlay size={14} className="ml-0.5" />
                </div>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-primary group-hover:text-accent transition-colors truncate">
                {link.title || link.url}
              </p>
              <p className="text-xs text-muted truncate mt-0.5">{link.url}</p>
              <span className="inline-flex items-center gap-1 text-[11px] text-accent mt-1 font-medium">
                <IoPlay size={11} /> Click to expand & play
              </span>
            </div>
          </motion.div>
        ) : (
          /* Wide / Screen-Wide Responsive Player Container */
          <motion.div
            key="player"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`w-full relative bg-black flex items-center justify-center overflow-hidden ${
              displayMode === 'theater' ? 'py-1' : ''
            }`}
          >
            {/* 1. YouTube Player */}
            {resolvedPlatform === 'youtube' && (
              <div className={`w-full ${getAspectClass()} overflow-hidden relative`}>
                <iframe
                  src={resolvedEmbedUrl || (detected.embedId ? `https://www.youtube-nocookie.com/embed/${detected.embedId}?rel=0` : '')}
                  className="w-full h-full border-0 absolute inset-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  title={link.title || 'YouTube Video'}
                  loading="lazy"
                />
              </div>
            )}

            {/* 2. Instagram Player (Reels / Posts) */}
            {resolvedPlatform === 'instagram' && (
              <div
                className={`w-full ${
                  aspectRatio === '9/16'
                    ? 'aspect-[9/16] max-h-[640px] max-w-[400px] mx-auto py-2'
                    : 'aspect-video min-h-[380px] max-h-[620px]'
                } relative flex items-center justify-center overflow-hidden bg-black/80`}
              >
                {resolvedMediaUrl && /\.(mp4|webm)/i.test(resolvedMediaUrl) ? (
                  <UniversalVideoPlayer
                    src={resolvedMediaUrl}
                    poster={resolvedThumbnail}
                    title={link.title || 'Instagram Video'}
                    embedUrl={resolvedEmbedUrl}
                    sourceUrl={link.url}
                    platform="instagram"
                    className="w-full h-full"
                  />
                ) : resolvedEmbedUrl ? (
                  <iframe
                    src={resolvedEmbedUrl}
                    className="w-full h-full border-0 rounded-xl"
                    allowTransparency="true"
                    allow="encrypted-media"
                    title={link.title || 'Instagram Reel'}
                    loading="lazy"
                  />
                ) : (
                  <div className="text-center p-6 text-muted">
                    <p className="text-sm">Instagram player loading…</p>
                  </div>
                )}
              </div>
            )}

            {/* 3. Facebook Video Player */}
            {resolvedPlatform === 'facebook' && (
              <div className={`w-full ${getAspectClass()} relative flex items-center justify-center overflow-hidden bg-black/80`}>
                {resolvedMediaUrl && /\.(mp4|webm)/i.test(resolvedMediaUrl) ? (
                  <UniversalVideoPlayer
                    src={resolvedMediaUrl}
                    poster={resolvedThumbnail}
                    title={link.title || 'Facebook Video'}
                    embedUrl={resolvedEmbedUrl}
                    sourceUrl={link.url}
                    platform="facebook"
                    className="w-full h-full"
                  />
                ) : resolvedEmbedUrl ? (
                  <iframe
                    src={resolvedEmbedUrl}
                    className="w-full h-full border-0"
                    scrolling="no"
                    allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                    allowFullScreen={true}
                    title={link.title || 'Facebook Video'}
                    loading="lazy"
                  />
                ) : (
                  <div className="text-center p-6 text-muted">
                    <p className="text-sm">Facebook video player</p>
                  </div>
                )}
              </div>
            )}

            {/* 4. Twitter / X Player */}
            {resolvedPlatform === 'twitter' && (
              <div className={`w-full ${getAspectClass()} relative flex items-center justify-center overflow-hidden bg-black`}>
                {resolvedMediaUrl && /\.(mp4|webm|m3u8)/i.test(resolvedMediaUrl) ? (
                  <UniversalVideoPlayer
                    src={resolvedMediaUrl}
                    poster={resolvedThumbnail}
                    title={link.title || 'X Video'}
                    embedUrl={resolvedEmbedUrl}
                    sourceUrl={link.url}
                    platform="twitter"
                    className="w-full h-full"
                  />
                ) : resolvedEmbedUrl ? (
                  <iframe
                    src={resolvedEmbedUrl}
                    className="w-full h-full border-0"
                    allowFullScreen={true}
                    title={link.title || 'X Post'}
                    loading="lazy"
                  />
                ) : (
                  <div className="text-center p-6 text-muted">
                    <p className="text-sm">X video player</p>
                  </div>
                )}
              </div>
            )}

            {/* 5. Direct Video Streams, Vimeo, Loom, TikTok, or Generic Video */}
            {!['youtube', 'instagram', 'facebook', 'twitter'].includes(resolvedPlatform) && (
              <div className={`w-full ${getAspectClass()} relative flex items-center justify-center overflow-hidden bg-black`}>
                {resolvedEmbedUrl && !resolvedMediaUrl ? (
                  <iframe
                    src={resolvedEmbedUrl}
                    className="w-full h-full border-0"
                    allowFullScreen={true}
                    title={link.title || 'Video Player'}
                    loading="lazy"
                  />
                ) : (
                  <UniversalVideoPlayer
                    src={resolvedMediaUrl || link.url}
                    poster={resolvedThumbnail}
                    title={link.title || 'Video Resource'}
                    embedUrl={resolvedEmbedUrl}
                    sourceUrl={link.url}
                    platform={resolvedPlatform}
                    className="w-full h-full"
                  />
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Footer / Description / Notes ── */}
      {(link.description || link.rawContent) && (
        <div className="px-4 py-2.5 bg-surface border-t border-subtle flex flex-col gap-1 text-xs">
          <div className="flex items-center justify-between text-muted">
            <span className="font-semibold text-secondary flex items-center gap-1">
              <IoSparklesOutline size={12} className="text-accent" /> Notes & Context
            </span>
            <button
              type="button"
              onClick={() => setShowDesc(!showDesc)}
              className="text-[11px] text-accent hover:underline cursor-pointer"
            >
              {showDesc ? 'Collapse' : 'Expand'}
            </button>
          </div>
          <p
            className={`text-secondary text-xs leading-relaxed whitespace-pre-wrap font-sans ${
              showDesc ? '' : 'line-clamp-2'
            }`}
          >
            {link.description || link.rawContent}
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default WorkspaceVideoCard;
