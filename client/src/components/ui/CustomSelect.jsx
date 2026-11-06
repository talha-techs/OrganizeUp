import { useState, useRef, useEffect, useId, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoChevronDown, IoCheckmark } from 'react-icons/io5';

/**
 * Universal theme-compliant custom select dropdown for OrganizeUp.
 * Replaces native OS <select> elements with an accessible, keyboard-friendly,
 * and visually consistent glassmorphic dropdown.
 */
const CustomSelect = ({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Select an option...',
  disabled = false,
  className = '',
  buttonClassName = '',
  menuClassName = '',
  size = 'md', // 'xs' | 'sm' | 'md'
  align = 'auto', // 'left' | 'right' | 'auto'
  name,
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const generatedId = useId();
  const selectId = id || generatedId;

  // Normalize options: supports both array of strings and array of objects
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'string' || typeof opt === 'number') {
      return { value: opt, label: String(opt) };
    }
    return opt;
  });

  const selectedIndex = normalizedOptions.findIndex((opt) => opt.value === value);
  const selectedOption = selectedIndex >= 0 ? normalizedOptions[selectedIndex] : null;

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

  // Handle option selection
  const handleSelect = useCallback(
    (optValue) => {
      if (disabled) return;
      if (onChange) {
        // Synthetic event for consumers expecting e.target.value or raw value
        const syntheticEvent = {
          target: { value: optValue, name },
          currentTarget: { value: optValue, name },
          value: optValue,
        };
        onChange(optValue, syntheticEvent);
      }
      setIsOpen(false);
      buttonRef.current?.focus();
    },
    [disabled, onChange, name],
  );

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        buttonRef.current?.focus();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < normalizedOptions.length - 1 ? prev + 1 : 0,
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : normalizedOptions.length - 1,
        );
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < normalizedOptions.length) {
          handleSelect(normalizedOptions[highlightedIndex].value);
        }
        break;
      case 'Tab':
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && menuRef.current) {
      const items = menuRef.current.querySelectorAll('[role="option"]');
      if (items[highlightedIndex]) {
        items[highlightedIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [isOpen, highlightedIndex]);

  // Sizing styles
  const sizeStyles = {
    xs: {
      button: 'px-2 py-1 text-xs rounded-lg gap-1.5',
      icon: 12,
      option: 'p-1.5 text-xs rounded-md gap-2',
    },
    sm: {
      button: 'px-3 py-1.5 text-xs font-medium rounded-xl gap-2',
      icon: 13,
      option: 'p-2 text-xs rounded-lg gap-2.5',
    },
    md: {
      button: 'px-3.5 py-2.5 text-xs sm:text-sm rounded-xl gap-2.5',
      icon: 15,
      option: 'p-2.5 text-xs sm:text-sm rounded-xl gap-3',
    },
  }[size] || sizeStyles.md;

  // Alignment styles for the dropdown popover
  const alignmentStyles = {
    right: 'right-0 left-auto',
    left: 'left-0 right-auto',
    auto: 'left-0 right-0 sm:right-auto sm:min-w-[190px]',
  }[align] || alignmentStyles.auto;

  return (
    <div
      className={`relative inline-block ${className}`}
      ref={containerRef}
      onKeyDown={handleKeyDown}
    >
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-semibold text-secondary block mb-1.5 select-none"
        >
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        ref={buttonRef}
        id={selectId}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full bg-surface-raised border transition-all text-left flex items-center justify-between cursor-pointer select-none ${
          sizeStyles.button
        } ${
          isOpen
            ? 'border-accent shadow-sm shadow-accent/20 bg-surface'
            : 'border-subtle hover:border-strong hover:bg-surface'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${buttonClassName}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 min-w-0">
          {selectedOption?.icon && (
            <span
              className={`p-1 rounded-md shrink-0 ${
                selectedOption.color || 'bg-accent-subtle text-accent'
              }`}
            >
              <selectedOption.icon size={sizeStyles.icon} />
            </span>
          )}
          <div className="truncate">
            <span className="text-primary font-medium block truncate">
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
          transition={{ duration: 0.15 }}
          className="text-secondary shrink-0 ml-1.5"
        >
          <IoChevronDown size={sizeStyles.icon} />
        </motion.div>
      </button>

      {/* Dropdown Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute top-full mt-1.5 z-[200] bg-surface-raised/95 backdrop-blur-xl border border-subtle/80 rounded-2xl p-1.5 shadow-2xl shadow-black/70 max-h-64 overflow-y-auto focus:outline-none min-w-full ${alignmentStyles} ${menuClassName}`}
            role="listbox"
            tabIndex={-1}
          >
            <div className="space-y-0.5">
              {normalizedOptions.map((opt, index) => {
                const isSelected = opt.value === value;
                const isHighlighted = index === highlightedIndex;
                const OptIcon = opt.icon;

                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    role="option"
                    aria-selected={isSelected}
                    className={`w-full text-left flex items-center justify-between transition-all cursor-pointer select-none ${
                      sizeStyles.option
                    } ${
                      isSelected
                        ? 'bg-accent/15 text-accent border border-accent/30 font-semibold shadow-sm shadow-accent/10'
                        : isHighlighted
                        ? 'bg-surface text-primary border border-transparent'
                        : 'text-secondary hover:text-primary hover:bg-surface border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {OptIcon && (
                        <span
                          className={`p-1 rounded-md shrink-0 ${
                            opt.color ||
                            (isSelected
                              ? 'bg-accent/20 text-accent'
                              : 'bg-surface text-secondary')
                          }`}
                        >
                          <OptIcon size={sizeStyles.icon} />
                        </span>
                      )}

                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate">{opt.label}</span>
                          {opt.badge && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-surface border border-subtle text-muted">
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
                      <span className="text-accent shrink-0 ml-2">
                        <IoCheckmark size={sizeStyles.icon + 1} />
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
