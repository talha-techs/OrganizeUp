import React, { useState, useRef, useEffect } from 'react';
import {
  IoCalendarOutline,
  IoChevronBack,
  IoChevronForward,
  IoCloseOutline,
} from 'react-icons/io5';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Format helper: Date object to YYYY-MM-DD
 */
const formatDateStr = (dateObj) => {
  if (!dateObj || isNaN(dateObj.getTime())) return '';
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Human friendly display: YYYY-MM-DD to "Nov 16, 2026"
 */
const formatDisplayDate = (dateStr) => {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d) && m >= 0 && m < 12) {
      return `${MONTH_NAMES[m].slice(0, 3)} ${d}, ${y}`;
    }
  }
  return dateStr;
};

const ThemeDatePicker = ({
  value = '', // Format: YYYY-MM-DD
  onChange,
  placeholder = 'Select date',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Parse initial view month/year from value or current date
  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
      }
    }
    return new Date();
  });

  // Sync viewDate when value changes externally
  useEffect(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
        if (!isNaN(d.getTime())) setViewDate(d);
      }
    }
  }, [value]);

  // Handle outside click to close popover
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  const prevMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(viewYear, viewMonth - 1, 1));
  };

  const nextMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(viewYear, viewMonth + 1, 1));
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun

  const todayStr = formatDateStr(new Date());

  const handleSelectDay = (dayNum) => {
    const mStr = String(viewMonth + 1).padStart(2, '0');
    const dStr = String(dayNum).padStart(2, '0');
    const dateStr = `${viewYear}-${mStr}-${dStr}`;
    if (onChange) onChange(dateStr);
    setIsOpen(false);
  };

  const handleSetToday = (e) => {
    e.stopPropagation();
    if (onChange) onChange(todayStr);
    setViewDate(new Date());
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (onChange) onChange('');
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative inline-block text-xs">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface hover:bg-surface-raised border border-subtle focus:border-accent text-primary transition-all cursor-pointer select-none text-left min-w-[130px] justify-between ${
          isOpen ? 'ring-1 ring-accent border-accent' : ''
        } ${className}`}
      >
        <div className="flex items-center gap-1.5 truncate">
          <IoCalendarOutline size={14} className="text-accent shrink-0" />
          <span className={value ? 'text-primary font-medium' : 'text-muted'}>
            {value ? formatDisplayDate(value) : placeholder}
          </span>
        </div>

        {value && (
          <span
            onClick={handleClear}
            className="p-0.5 rounded hover:bg-surface text-muted hover:text-red-400 transition-colors ml-1"
            title="Clear date"
          >
            <IoCloseOutline size={13} />
          </span>
        )}
      </button>

      {/* Dark Theme Dropdown Calendar Popover */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 z-50 w-64 p-3.5 rounded-2xl bg-surface-raised/95 backdrop-blur-xl border border-subtle shadow-2xl animate-in fade-in zoom-in-95 duration-150 select-none">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 rounded-lg hover:bg-surface text-secondary hover:text-primary transition-colors cursor-pointer"
              title="Previous Month"
            >
              <IoChevronBack size={14} />
            </button>

            <span className="text-xs font-semibold text-primary">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>

            <button
              type="button"
              onClick={nextMonth}
              className="p-1 rounded-lg hover:bg-surface text-secondary hover:text-primary transition-colors cursor-pointer"
              title="Next Month"
            >
              <IoChevronForward size={14} />
            </button>
          </div>

          {/* Weekday Names Header */}
          <div className="grid grid-cols-7 gap-1 mb-1.5 text-center">
            {WEEKDAYS.map((wd) => (
              <span key={wd} className="text-[10px] font-bold text-muted uppercase">
                {wd}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Empty slots for days before 1st of month */}
            {Array.from({ length: startDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="w-7 h-7" />
            ))}

            {/* Days of Month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const mStr = String(viewMonth + 1).padStart(2, '0');
              const dStr = String(dayNum).padStart(2, '0');
              const fullDateStr = `${viewYear}-${mStr}-${dStr}`;

              const isSelected = value === fullDateStr;
              const isToday = todayStr === fullDateStr;

              return (
                <button
                  key={dayNum}
                  type="button"
                  onClick={() => handleSelectDay(dayNum)}
                  className={`w-7 h-7 rounded-lg text-xs font-medium flex items-center justify-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-accent text-white font-bold shadow-md shadow-accent/25'
                      : isToday
                      ? 'border border-accent text-accent hover:bg-accent/15'
                      : 'text-primary hover:bg-surface'
                  }`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          {/* Footer Shortcuts */}
          <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-subtle/60 text-[11px]">
            <button
              type="button"
              onClick={handleClear}
              className="text-muted hover:text-red-400 transition-colors cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleSetToday}
              className="font-semibold text-accent hover:underline cursor-pointer"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeDatePicker;
