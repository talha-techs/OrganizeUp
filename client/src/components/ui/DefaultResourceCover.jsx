import React from 'react';
import {
  IoBookOutline,
  IoSchoolOutline,
  IoConstructOutline,
  IoHeadsetOutline,
  IoVideocamOutline,
  IoPlayOutline,
  IoFolderOutline,
  IoSparklesOutline,
} from 'react-icons/io5';

// Configuration for each card category's sharp, clean aesthetic
// No text, no neon glows, sharp graphics matching both light and dark themes
const CATEGORY_CONFIG = {
  book: {
    icon: IoBookOutline,
    lightColor: 'text-sky-600',
    darkColor: 'text-sky-400',
    lightBg: 'bg-sky-500/[0.08]',
    darkBg: 'bg-sky-500/[0.12]',
    lightBorder: 'border-sky-200/80',
    darkBorder: 'border-sky-500/25',
  },
  course: {
    icon: IoSchoolOutline,
    lightColor: 'text-emerald-600',
    darkColor: 'text-emerald-400',
    lightBg: 'bg-emerald-500/[0.08]',
    darkBg: 'bg-emerald-500/[0.12]',
    lightBorder: 'border-emerald-200/80',
    darkBorder: 'border-emerald-500/25',
  },
  tool: {
    icon: IoConstructOutline,
    lightColor: 'text-amber-600',
    darkColor: 'text-amber-400',
    lightBg: 'bg-amber-500/[0.08]',
    darkBg: 'bg-amber-500/[0.12]',
    lightBorder: 'border-amber-200/80',
    darkBorder: 'border-amber-500/25',
  },
  audio: {
    icon: IoHeadsetOutline,
    lightColor: 'text-purple-600',
    darkColor: 'text-purple-400',
    lightBg: 'bg-purple-500/[0.08]',
    darkBg: 'bg-purple-500/[0.12]',
    lightBorder: 'border-purple-200/80',
    darkBorder: 'border-purple-500/25',
  },
  video: {
    icon: IoVideocamOutline,
    lightColor: 'text-rose-600',
    darkColor: 'text-rose-400',
    lightBg: 'bg-rose-500/[0.08]',
    darkBg: 'bg-rose-500/[0.12]',
    lightBorder: 'border-rose-200/80',
    darkBorder: 'border-rose-500/25',
  },
  playlist: {
    icon: IoPlayOutline,
    lightColor: 'text-cyan-600',
    darkColor: 'text-cyan-400',
    lightBg: 'bg-cyan-500/[0.08]',
    darkBg: 'bg-cyan-500/[0.12]',
    lightBorder: 'border-cyan-200/80',
    darkBorder: 'border-cyan-500/25',
  },
  section: {
    icon: IoFolderOutline,
    lightColor: 'text-teal-600',
    darkColor: 'text-teal-400',
    lightBg: 'bg-teal-500/[0.08]',
    darkBg: 'bg-teal-500/[0.12]',
    lightBorder: 'border-teal-200/80',
    darkBorder: 'border-teal-500/25',
  },
  default: {
    icon: IoSparklesOutline,
    lightColor: 'text-orange-600',
    darkColor: 'text-orange-400',
    lightBg: 'bg-orange-500/[0.08]',
    darkBg: 'bg-orange-500/[0.12]',
    lightBorder: 'border-orange-200/80',
    darkBorder: 'border-orange-500/25',
  },
};

const resolveCategoryKey = ({ contentType, itemType, type }) => {
  const c = (contentType || '').toLowerCase();
  const i = (itemType || '').toLowerCase();
  const t = (type || '').toLowerCase();

  // Courses
  if (c === 'course' || t === 'course' || i === 'course') return 'course';

  // Tools
  if (c === 'tool' || t === 'tool' || i === 'tool') return 'tool';

  // Sections / Workspaces
  if (c === 'section' || t === 'section' || i === 'section' || c === 'workspace' || t === 'workspace') return 'section';

  // Playlists
  if (c === 'playlist' || t === 'playlist' || i === 'playlist' || c === 'youtube') return 'playlist';

  // Audio / Audiobook
  if (i === 'audio' || t === 'audio' || c === 'audio' || c === 'audiobook' || t === 'audiobook') return 'audio';

  // Video
  if (i === 'video' || t === 'video' || c === 'video') return 'video';

  // Book (PDF / Text)
  if (i === 'pdf' || t === 'pdf' || i === 'text' || t === 'text' || c === 'book' || t === 'book') return 'book';

  return 'book';
};

const DefaultResourceCover = ({
  contentType = 'book',
  itemType = '',
  type = '',
  title = '',
  className = '',
}) => {
  const categoryKey = resolveCategoryKey({ contentType, itemType, type });
  const config = CATEGORY_CONFIG[categoryKey] || CATEGORY_CONFIG.book;
  const { icon: Icon } = config;

  return (
    <div
      className={`relative w-full h-full overflow-hidden select-none flex items-center justify-center bg-[#f1f3f7] dark:bg-[#16171a] transition-colors duration-200 ${className}`}
    >
      {/* Subtle Minimal Drafting Grid */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-40 dark:opacity-20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id={`cover-grid-${categoryKey}`}
            width="32"
            height="32"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 32 0 L 0 0 0 32"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.8"
              className="text-zinc-400 dark:text-zinc-600"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#cover-grid-${categoryKey})`} />
      </svg>

      {/* Clean Geometric Concentric Guide Rings (Simple drafting cues, NO neon glow) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-56 h-56 rounded-full border border-dashed border-zinc-300/50 dark:border-zinc-700/35" />
        <div className="w-40 h-40 rounded-full border border-zinc-300/40 dark:border-zinc-700/25 absolute" />
      </div>

      {/* Central Sharp Graphic Badge (No text, crisp cue of what it is) */}
      <div className="relative z-10 transition-transform duration-300 group-hover:scale-105">
        <div
          className={`w-18 h-18 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center bg-white dark:bg-[#222328] border ${config.lightBorder} dark:${config.darkBorder} shadow-sm dark:shadow-xl shadow-black/5 dark:shadow-black/40 overflow-hidden`}
        >
          <div
            className={`w-full h-full flex items-center justify-center ${config.lightBg} dark:${config.darkBg}`}
          >
            <Icon
              size={36}
              className={`${config.lightColor} dark:${config.darkColor} transition-colors drop-shadow-none`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DefaultResourceCover;
