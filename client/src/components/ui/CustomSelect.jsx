import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoChevronDown, IoCheckmark } from 'react-icons/io5';

const CustomSelect = ({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Select an option...',
  disabled = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="text-xs font-semibold text-secondary block mb-1.5">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full px-3.5 py-2.5 rounded-xl bg-surface border transition-all text-left flex items-center justify-between gap-2.5 cursor-pointer ${
          isOpen
            ? 'border-accent shadow-sm shadow-accent/20 bg-surface-raised'
            : 'border-subtle hover:border-strong hover:bg-surface-raised/80'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {selectedOption?.icon && (
            <span
              className={`p-1.5 rounded-lg shrink-0 ${
                selectedOption.color || 'bg-accent-subtle text-accent'
              }`}
            >
              <selectedOption.icon size={15} />
            </span>
          )}
          <div className="truncate">
            <span className="text-xs font-semibold text-primary block truncate">
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            {selectedOption?.desc && (
              <span className="text-[10px] text-muted block truncate">
                {selectedOption.desc}
              </span>
            )}
          </div>
        </div>

        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-secondary shrink-0"
        >
          <IoChevronDown size={15} />
        </motion.div>
      </button>

      {/* Dropdown Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute left-0 right-0 top-full mt-1.5 z-[150] bg-surface-raised/95 backdrop-blur-xl border border-subtle rounded-2xl p-1.5 shadow-2xl shadow-black/50 max-h-64 overflow-y-auto focus:outline-none"
            role="listbox"
          >
            <div className="space-y-1">
              {options.map((opt) => {
                const isSelected = opt.value === value;
                const OptIcon = opt.icon;

                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    role="option"
                    aria-selected={isSelected}
                    className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-accent/15 text-accent border border-accent/30 font-semibold'
                        : 'text-secondary hover:text-primary hover:bg-surface border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {OptIcon && (
                        <span
                          className={`p-1.5 rounded-lg shrink-0 ${
                            opt.color ||
                            (isSelected
                              ? 'bg-accent/20 text-accent'
                              : 'bg-surface text-secondary')
                          }`}
                        >
                          <OptIcon size={14} />
                        </span>
                      )}

                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium truncate">
                            {opt.label}
                          </span>
                          {opt.badge && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-surface border border-subtle text-muted">
                              {opt.badge}
                            </span>
                          )}
                        </div>
                        {opt.desc && (
                          <span className="text-[10px] text-muted block truncate mt-0.5">
                            {opt.desc}
                          </span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <span className="text-accent shrink-0">
                        <IoCheckmark size={15} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomSelect;
