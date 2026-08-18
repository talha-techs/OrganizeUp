import React from 'react';
import { motion } from 'framer-motion';
import { IoSunnyOutline, IoMoonOutline } from 'react-icons/io5';
import { useTheme } from '../../theme/ThemeContext';

const ThemeToggle = ({ className = '', showLabel = false, size = 'default' }) => {
  const { isDark, toggleTheme } = useTheme();

  const isSmall = size === 'sm';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`relative inline-flex items-center gap-2.5 rounded-xl border border-subtle bg-surface hover:bg-surface-raised transition-all duration-200 cursor-pointer ${
        isSmall ? 'p-1.5 text-xs' : 'px-3 py-2 text-sm'
      } ${className}`}
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        <motion.div
          key={isDark ? 'dark-icon' : 'light-icon'}
          initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="flex items-center justify-center text-secondary hover:text-primary"
        >
          {isDark ? (
            <IoSunnyOutline className="w-4 h-4 text-amber-400" />
          ) : (
            <IoMoonOutline className="w-4 h-4 text-zinc-700" />
          )}
        </motion.div>
      </div>

      {showLabel && (
        <span className="text-secondary font-medium select-none">
          {isDark ? 'Light mode' : 'Dark mode'}
        </span>
      )}
    </button>
  );
};

export default ThemeToggle;
