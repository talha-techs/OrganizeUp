import React from 'react';
import {
  IoBookOutline,
  IoVideocamOutline,
  IoMusicalNotesOutline,
  IoSchoolOutline,
  IoConstructOutline,
  IoFolderOutline,
  IoDocumentTextOutline,
  IoSparklesOutline,
} from 'react-icons/io5';

// Configuration for each resource type's aesthetic styling
const THEMES = {
  pdf: {
    bg: 'from-[#0a0f1d] via-[#151c38] to-[#070a14]',
    glow: 'rgba(59, 130, 246, 0.22)',
    iconColor: 'text-sky-400',
    iconBg: 'bg-sky-500/10 border-sky-500/25 text-sky-300',
    pill: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    accentColor: '#38bdf8',
    label: 'PDF Book',
    tag: 'E-BOOK',
    Icon: IoDocumentTextOutline,
  },
  video: {
    bg: 'from-[#170810] via-[#2f0d1e] to-[#090508]',
    glow: 'rgba(244, 63, 94, 0.22)',
    iconColor: 'text-rose-400',
    iconBg: 'bg-rose-500/10 border-rose-500/25 text-rose-300',
    pill: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    accentColor: '#fb7185',
    label: 'Video Book',
    tag: 'VIDEO LECTURE',
    Icon: IoVideocamOutline,
  },
  audio: {
    bg: 'from-[#12061e] via-[#240b3b] to-[#08040d]',
    glow: 'rgba(168, 85, 247, 0.22)',
    iconColor: 'text-purple-400',
    iconBg: 'bg-purple-500/10 border-purple-500/25 text-purple-300',
    pill: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    accentColor: '#c084fc',
    label: 'Audiobook',
    tag: 'AUDIO STREAM',
    Icon: IoMusicalNotesOutline,
  },
  course: {
    bg: 'from-[#031510] via-[#083325] to-[#030d0a]',
    glow: 'rgba(16, 185, 129, 0.22)',
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300',
    pill: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    accentColor: '#34d399',
    label: 'Course',
    tag: 'CURRICULUM',
    Icon: IoSchoolOutline,
  },
  tool: {
    bg: 'from-[#190d03] via-[#331805] to-[#0a0602]',
    glow: 'rgba(245, 158, 11, 0.22)',
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/10 border-amber-500/25 text-amber-300',
    pill: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    accentColor: '#fbbf24',
    label: 'Trick & Tool',
    tag: 'DEV TRICK',
    Icon: IoConstructOutline,
  },
  section: {
    bg: 'from-[#041712] via-[#073024] to-[#030d0a]',
    glow: 'rgba(20, 184, 166, 0.22)',
    iconColor: 'text-teal-400',
    iconBg: 'bg-teal-500/10 border-teal-500/25 text-teal-300',
    pill: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
    accentColor: '#2dd4bf',
    label: 'Notebook Section',
    tag: 'NOTEBOOK',
    Icon: IoFolderOutline,
  },
  default: {
    bg: 'from-[#121216] via-[#1c1c24] to-[#09090b]',
    glow: 'rgba(255, 87, 34, 0.2)',
    iconColor: 'text-accent',
    iconBg: 'bg-accent/10 border-accent/25 text-accent',
    pill: 'bg-accent-subtle text-accent border-accent/30',
    accentColor: '#ff5722',
    label: 'Book',
    tag: 'RESOURCE',
    Icon: IoBookOutline,
  },
};

const resolveThemeKey = (contentType, itemType) => {
  if (contentType === 'course') return 'course';
  if (contentType === 'tool') return 'tool';
  if (contentType === 'section') return 'section';
  if (contentType === 'book') {
    if (itemType === 'video') return 'video';
    if (itemType === 'text' || itemType === 'pdf') return 'pdf';
    if (itemType === 'audio') return 'audio';
    return 'default';
  }
  return 'default';
};

const DefaultResourceCover = ({
  contentType = 'book',
  itemType = '',
  title = '',
  className = '',
}) => {
  const themeKey = resolveThemeKey(contentType, itemType);
  const theme = THEMES[themeKey] || THEMES.default;
  const { Icon } = theme;

  const initialLetter = title?.trim()?.charAt(0)?.toUpperCase() || 'O';

  return (
    <div
      className={`relative w-full h-full overflow-hidden bg-gradient-to-br ${theme.bg} select-none flex flex-col justify-between p-5 ${className}`}
      style={{
        boxShadow: `inset 0 0 60px ${theme.glow}`,
      }}
    >
      {/* Dynamic Ambient Background Elements */}
      <div
        className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-40"
        style={{ backgroundColor: theme.accentColor }}
      />
      <div
        className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-30"
        style={{ backgroundColor: '#ff5722' }}
      />

      {/* Decorative Vector Grid & Iso Lines Pattern */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.07] pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id={`grid-${themeKey}`}
            width="28"
            height="28"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 28 0 L 0 0 0 28"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.8"
            />
            <circle cx="2" cy="2" r="1" fill="currentColor" opacity="0.6" />
          </pattern>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill={`url(#grid-${themeKey})`}
          className="text-white"
        />
      </svg>

      {/* Subtle Title Monogram Watermark in Background */}
      <div className="absolute right-3 bottom-0 font-black text-8xl text-white/[0.04] font-display pointer-events-none leading-none select-none">
        {initialLetter}
      </div>

      {/* Top Header: OrganizeUp Brand Watermark & Tag */}
      <div className="relative z-10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {/* Stylized OrganizeUp Monogram Emblem */}
          <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-[#ff7043] to-[#d84315] flex items-center justify-center shadow-sm">
            <span className="text-[10px] font-black text-white font-display">O</span>
          </div>
          <span className="text-[10px] font-bold tracking-widest text-white/50 uppercase font-mono">
            Organize<span className="text-[#ff5722]">Up</span>
          </span>
        </div>

        {/* Micro Format Pill */}
        <span
          className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border backdrop-blur-md ${theme.pill}`}
        >
          {theme.tag}
        </span>
      </div>

      {/* Center 3D Frosted Glass Tile with Glowing Icon */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto py-2">
        <div className="relative group/tile">
          {/* Glow backdrop behind tile */}
          <div
            className="absolute -inset-1 rounded-2xl blur-md opacity-50 group-hover/tile:opacity-75 transition-opacity"
            style={{ backgroundColor: theme.accentColor }}
          />

          {/* Frosted glass tile */}
          <div
            className={`relative w-16 h-16 sm:w-18 sm:h-18 rounded-2xl backdrop-blur-xl bg-white/[0.06] border border-white/15 flex items-center justify-center shadow-2xl transition-transform duration-300 group-hover:scale-105`}
          >
            <Icon size={32} className={`${theme.iconColor} drop-shadow-md`} />
          </div>
        </div>

        {/* Subtle Resource Type Descriptor */}
        <p className="text-[11px] font-semibold text-white/60 mt-2.5 tracking-wide text-center uppercase font-mono">
          {theme.label}
        </p>
      </div>

      {/* Bottom Footer: Sleek Brand Accent Line */}
      <div className="relative z-10 flex items-center justify-between pt-2 border-t border-white/5">
        <span className="text-[9px] font-medium text-white/30 tracking-wider uppercase font-mono">
          Knowledge Vault
        </span>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ff5722] animate-pulse" />
          <span className="text-[9px] font-bold text-white/40 tracking-wider font-mono">
            OFFICIAL
          </span>
        </div>
      </div>
    </div>
  );
};

export default DefaultResourceCover;
