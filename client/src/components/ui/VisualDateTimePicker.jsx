import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  IoCalendarOutline,
  IoTimeOutline,
  IoChevronBack,
  IoChevronForward,
  IoChevronUp,
  IoChevronDown,
  IoSunnyOutline,
  IoMoonOutline,
  IoTodayOutline,
  IoSparklesOutline,
  IoCheckmarkCircle,
  IoAlertCircleOutline,
} from 'react-icons/io5';

/**
 * Format helper: Pad single digits with leading zero
 */
const pad = (n) => String(n).padStart(2, '0');

/**
 * Convert Date object to local YYYY-MM-DDTHH:mm string
 */
export const toLocalISOString = (d) => {
  if (!d || isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/**
 * Parse a YYYY-MM-DDTHH:mm string or ISO string into a local Date object
 */
export const parseLocalDate = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
};

/**
 * Human friendly relative countdown helper
 */
const getRelativeCountdown = (targetDate) => {
  if (!targetDate) return null;
  const now = Date.now();
  const diffMs = targetDate.getTime() - now;

  if (diffMs <= 0) {
    return { isPast: true, text: 'Selected time has already passed' };
  }

  const diffMins = Math.round(diffMs / (1000 * 60));
  if (diffMins < 60) {
    return {
      isPast: false,
      text: `Fires in ${diffMins} min${diffMins === 1 ? '' : 's'}`,
    };
  }

  const diffHours = Math.floor(diffMins / 60);
  const remMins = diffMins % 60;
  if (diffHours < 24) {
    return {
      isPast: false,
      text: `Fires in ${diffHours}h ${remMins > 0 ? `${remMins}m` : ''}`.trim(),
    };
  }

  const diffDays = Math.floor(diffHours / 24);
  const remHours = diffHours % 24;
  if (diffDays === 1) {
    return {
      isPast: false,
      text: `Tomorrow (${remHours > 0 ? `+${remHours}h` : 'morning'})`,
    };
  }

  return {
    isPast: false,
    text: `Fires in ${diffDays} days`,
  };
};

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Captivating Visual Analog Clock Face
 */
const AnalogClockVisualizer = ({ hour12, minute, isPM }) => {
  // Convert 12h + PM to continuous degrees
  const hourAngle = ((hour12 % 12) + minute / 60) * 30; // 360 / 12 = 30 deg/hr
  const minuteAngle = minute * 6; // 360 / 60 = 6 deg/min

  return (
    <div className="relative w-28 h-28 sm:w-32 sm:h-32 mx-auto flex items-center justify-center select-none">
      {/* Outer Glow Halo */}
      <div className="absolute inset-0 rounded-full bg-accent/10 blur-md pointer-events-none" />

      {/* Clock Face SVG */}
      <svg
        viewBox="0 0 120 120"
        className="w-full h-full drop-shadow-md"
      >
        <defs>
          <linearGradient id="clock-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1f1f23" />
            <stop offset="60%" stopColor="#141417" />
            <stop offset="100%" stopColor="#09090b" />
          </linearGradient>
          <linearGradient id="hand-hour" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#e64a19" />
            <stop offset="100%" stopColor="#ff5722" />
          </linearGradient>
          <linearGradient id="hand-min" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#ff9100" />
            <stop offset="100%" stopColor="#ffc107" />
          </linearGradient>
        </defs>

        {/* Dial Background */}
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="url(#clock-grad)"
          stroke="#27272a"
          strokeWidth="3"
        />

        {/* Inner Accent Ring */}
        <circle
          cx="60"
          cy="60"
          r="48"
          fill="none"
          stroke="rgba(255, 87, 34, 0.15)"
          strokeWidth="1"
          strokeDasharray="2 3"
        />

        {/* 12, 3, 6, 9 Cardinal Ticks */}
        <line x1="60" y1="12" x2="60" y2="18" stroke="#ff5722" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="108" y1="60" x2="102" y2="60" stroke="#ff5722" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="60" y1="108" x2="60" y2="102" stroke="#ff5722" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="12" y1="60" x2="18" y2="60" stroke="#ff5722" strokeWidth="2.5" strokeLinecap="round" />

        {/* Intermediate Hour Dots */}
        {[30, 60, 120, 150, 210, 240, 300, 330].map((deg) => (
          <circle
            key={deg}
            cx={60 + 44 * Math.sin((deg * Math.PI) / 180)}
            cy={60 - 44 * Math.cos((deg * Math.PI) / 180)}
            r="1.5"
            fill="#52525b"
          />
        ))}

        {/* Smooth Dynamic Hour Hand */}
        <g style={{ transform: `rotate(${hourAngle}deg)`, transformOrigin: '60px 60px', transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)' }}>
          <line
            x1="60"
            y1="60"
            x2="60"
            y2="34"
            stroke="url(#hand-hour)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx="60" cy="34" r="2" fill="#ff7043" />
        </g>

        {/* Smooth Dynamic Minute Hand */}
        <g style={{ transform: `rotate(${minuteAngle}deg)`, transformOrigin: '60px 60px', transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)' }}>
          <line
            x1="60"
            y1="60"
            x2="60"
            y2="20"
            stroke="url(#hand-min)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="60" cy="20" r="1.5" fill="#ffc107" />
        </g>

        {/* Center Cap Pin */}
        <circle cx="60" cy="60" r="4.5" fill="#ff5722" />
        <circle cx="60" cy="60" r="1.8" fill="#ffffff" />
      </svg>

      {/* AM/PM Indicator Badge on Clock */}
      <div className="absolute bottom-2 bg-surface/90 border border-subtle px-1.5 py-0.2 rounded text-[10px] font-mono font-bold text-muted">
        {isPM ? 'PM' : 'AM'}
      </div>
    </div>
  );
};

/**
 * Visual Date & Time Picker Component
 */
const VisualDateTimePicker = ({
  value,
  onChange,
  className = '',
}) => {
  // Parse initial date or default to 2 hours from now rounded to next 15 mins
  const initialDate = useMemo(() => {
    const parsed = parseLocalDate(value);
    if (parsed) return parsed;
    const now = new Date();
    // Default to +2 hours, rounded to next 15-minute slot
    const defaultDate = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const mins = defaultDate.getMinutes();
    const roundedMins = Math.ceil(mins / 15) * 15;
    defaultDate.setMinutes(roundedMins, 0, 0);
    return defaultDate;
  }, [value]);

  // Selected date components
  const [selectedYear, setSelectedYear] = useState(initialDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(initialDate.getMonth()); // 0-11
  const [selectedDay, setSelectedDay] = useState(initialDate.getDate());

  // Viewing month/year in calendar view
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  // Selected time components
  const rawHours = initialDate.getHours();
  const [hour12, setHour12] = useState(rawHours % 12 === 0 ? 12 : rawHours % 12);
  const [minute, setMinute] = useState(initialDate.getMinutes());
  const [isPM, setIsPM] = useState(rawHours >= 12);

  // Sync internal states when value prop changes externally
  useEffect(() => {
    const parsed = parseLocalDate(value);
    if (parsed) {
      setSelectedYear(parsed.getFullYear());
      setSelectedMonth(parsed.getMonth());
      setSelectedDay(parsed.getDate());
      setViewYear(parsed.getFullYear());
      setViewMonth(parsed.getMonth());
      const h = parsed.getHours();
      setHour12(h % 12 === 0 ? 12 : h % 12);
      setMinute(parsed.getMinutes());
      setIsPM(h >= 12);
    }
  }, [value]);

  // Propagate changes upwards
  const emitChange = (y, m, d, h12, min, pm) => {
    let hour24 = h12 % 12;
    if (pm) hour24 += 12;
    const resultDate = new Date(y, m, d, hour24, min, 0, 0);
    const formatted = toLocalISOString(resultDate);
    if (onChange) {
      onChange(formatted);
    }
  };

  // Calendar calculations
  const today = useMemo(() => new Date(), []);
  const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const daysInMonth = useMemo(() => {
    return new Date(viewYear, viewMonth + 1, 0).getDate();
  }, [viewYear, viewMonth]);

  const firstDayOfWeek = useMemo(() => {
    return new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun
  }, [viewYear, viewMonth]);

  // Current selected full date object
  const currentSelectedDate = useMemo(() => {
    let hour24 = hour12 % 12;
    if (isPM) hour24 += 12;
    return new Date(selectedYear, selectedMonth, selectedDay, hour24, minute, 0, 0);
  }, [selectedYear, selectedMonth, selectedDay, hour12, minute, isPM]);

  const countdown = useMemo(() => {
    return getRelativeCountdown(currentSelectedDate);
  }, [currentSelectedDate]);

  // Handlers for month navigation
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleJumpToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth());
    setSelectedDay(now.getDate());
    emitChange(now.getFullYear(), now.getMonth(), now.getDate(), hour12, minute, isPM);
  };

  // Date selection
  const handleSelectDay = (day) => {
    setSelectedYear(viewYear);
    setSelectedMonth(viewMonth);
    setSelectedDay(day);
    emitChange(viewYear, viewMonth, day, hour12, minute, isPM);
  };

  // Time selection helpers
  const handleHourChange = (newH12) => {
    let clamped = newH12;
    if (clamped < 1) clamped = 12;
    if (clamped > 12) clamped = 1;
    setHour12(clamped);
    emitChange(selectedYear, selectedMonth, selectedDay, clamped, minute, isPM);
  };

  const handleMinuteChange = (newMin) => {
    let clamped = newMin;
    if (clamped < 0) clamped = 55;
    if (clamped > 59) clamped = 0;
    setMinute(clamped);
    emitChange(selectedYear, selectedMonth, selectedDay, hour12, clamped, isPM);
  };

  const handleToggleAMPM = (pmVal) => {
    setIsPM(pmVal);
    emitChange(selectedYear, selectedMonth, selectedDay, hour12, minute, pmVal);
  };

  // Quick Preset Slots
  const handlePresetTime = (h24, min) => {
    const isAfternoon = h24 >= 12;
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    setHour12(h12);
    setMinute(min);
    setIsPM(isAfternoon);
    emitChange(selectedYear, selectedMonth, selectedDay, h12, min, isAfternoon);
  };

  const handlePresetDate = (daysFromNow) => {
    const target = new Date();
    target.setDate(target.getDate() + daysFromNow);
    setSelectedYear(target.getFullYear());
    setSelectedMonth(target.getMonth());
    setSelectedDay(target.getDate());
    setViewYear(target.getFullYear());
    setViewMonth(target.getMonth());
    emitChange(target.getFullYear(), target.getMonth(), target.getDate(), hour12, minute, isPM);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl bg-surface-raised/75 border border-subtle/80 backdrop-blur-md p-3.5 sm:p-4 shadow-xl space-y-3.5 ${className}`}
    >
      {/* 1. Dynamic Live Summary Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-surface/90 border border-subtle/60">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-lg bg-accent/15 text-accent shrink-0">
            <IoAlarmOutline size={18} />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-muted block uppercase tracking-wider">
              Scheduled Trigger Time
            </span>
            <span className="text-xs sm:text-sm font-bold text-primary truncate block font-display">
              {currentSelectedDate.toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
              {' at '}
              {pad(hour12)}:{pad(minute)} {isPM ? 'PM' : 'AM'}
            </span>
          </div>
        </div>

        {/* Relative time pill */}
        {countdown && (
          <div className="shrink-0 flex items-center">
            {countdown.isPast ? (
              <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 rounded-lg flex items-center gap-1">
                <IoAlertCircleOutline size={13} /> Past time
              </span>
            ) : (
              <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {countdown.text}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Quick Date Jump Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[10px] font-bold text-muted uppercase tracking-wider mr-1 shrink-0">
          Quick Date:
        </span>
        {[
          { label: 'Today', days: 0 },
          { label: 'Tomorrow', days: 1 },
          { label: 'In 2 Days', days: 2 },
          { label: 'In 3 Days', days: 3 },
          { label: 'In 1 Week', days: 7 },
        ].map((pill) => {
          const testDate = new Date();
          testDate.setDate(testDate.getDate() + pill.days);
          const isSelected =
            testDate.getDate() === selectedDay &&
            testDate.getMonth() === selectedMonth &&
            testDate.getFullYear() === selectedYear;

          return (
            <button
              key={pill.label}
              type="button"
              onClick={() => handlePresetDate(pill.days)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-accent text-white shadow-xs'
                  : 'bg-surface hover:bg-surface-raised text-secondary hover:text-primary border border-subtle'
              }`}
            >
              {pill.label}
            </button>
          );
        })}
      </div>

      {/* 2. Side-by-side Dual Panels: Calendar (Date) + Clock (Time) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
        {/* LEFT COLUMN: Visual Month Calendar */}
        <div className="rounded-xl bg-surface/50 border border-subtle/60 p-3 flex flex-col justify-between">
          <div>
            {/* Calendar Month Header */}
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5">
                <IoCalendarOutline size={15} className="text-accent" />
                <span className="text-xs font-bold text-primary">
                  {MONTHS[viewMonth]} {viewYear}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleJumpToday}
                  className="px-1.5 py-0.5 rounded text-[10px] font-bold text-muted hover:text-primary hover:bg-surface transition-colors cursor-pointer mr-1"
                  title="Jump to current month"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1 rounded-lg hover:bg-surface text-secondary hover:text-primary transition-colors cursor-pointer"
                  title="Previous month"
                >
                  <IoChevronBack size={13} />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1 rounded-lg hover:bg-surface text-secondary hover:text-primary transition-colors cursor-pointer"
                  title="Next month"
                >
                  <IoChevronForward size={13} />
                </button>
              </div>
            </div>

            {/* Weekday Labels */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
              {WEEKDAYS.map((wd) => (
                <span key={wd} className="text-[10px] font-bold text-muted uppercase">
                  {wd}
                </span>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {/* Empty leading padding slots */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="h-7 w-7 sm:h-8 sm:w-8 mx-auto" />
              ))}

              {/* Month Days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const cellDate = new Date(viewYear, viewMonth, dayNum);
                const isPast = cellDate < todayDateOnly;
                const isSelected =
                  dayNum === selectedDay &&
                  viewMonth === selectedMonth &&
                  viewYear === selectedYear;
                const isToday =
                  cellDate.getTime() === todayDateOnly.getTime();

                return (
                  <button
                    key={dayNum}
                    type="button"
                    disabled={isPast}
                    onClick={() => handleSelectDay(dayNum)}
                    className={`h-7 w-7 sm:h-8 sm:w-8 mx-auto rounded-lg text-xs font-semibold flex items-center justify-center transition-all relative cursor-pointer ${
                      isSelected
                        ? 'bg-accent text-white font-bold shadow-md shadow-accent/30 scale-105 z-10'
                        : isPast
                        ? 'text-muted/30 cursor-not-allowed'
                        : 'text-secondary hover:text-primary hover:bg-surface-raised'
                    }`}
                  >
                    {dayNum}
                    {isToday && !isSelected && (
                      <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-accent" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Visual Clock & Time Dial */}
        <div className="rounded-xl bg-surface/50 border border-subtle/60 p-3 flex flex-col justify-between space-y-3">
          {/* Visual Analog Clock + Large Digital Display */}
          <div className="flex items-center justify-around gap-2 pt-1">
            {/* Analog Clock Face with live hands */}
            <AnalogClockVisualizer
              hour12={hour12}
              minute={minute}
              isPM={isPM}
            />

            {/* Digital Interactive Stepper Boxes */}
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider flex items-center gap-1">
                <IoTimeOutline size={12} className="text-accent" /> Time
              </span>

              {/* Hour & Minute Pickers */}
              <div className="flex items-center gap-1.5">
                {/* Hour Box */}
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => handleHourChange(hour12 + 1)}
                    className="p-1 rounded text-muted hover:text-primary hover:bg-surface transition-colors cursor-pointer"
                    title="Hour Up"
                  >
                    <IoChevronUp size={12} />
                  </button>
                  <div className="w-10 h-10 rounded-xl bg-surface border border-subtle flex items-center justify-center text-base font-bold text-primary font-mono shadow-xs">
                    {pad(hour12)}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleHourChange(hour12 - 1)}
                    className="p-1 rounded text-muted hover:text-primary hover:bg-surface transition-colors cursor-pointer"
                    title="Hour Down"
                  >
                    <IoChevronDown size={12} />
                  </button>
                </div>

                <span className="text-lg font-bold text-accent font-mono animate-pulse pb-1">
                  :
                </span>

                {/* Minute Box */}
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => handleMinuteChange(minute + 5)}
                    className="p-1 rounded text-muted hover:text-primary hover:bg-surface transition-colors cursor-pointer"
                    title="Minute Up (+5)"
                  >
                    <IoChevronUp size={12} />
                  </button>
                  <div className="w-10 h-10 rounded-xl bg-surface border border-subtle flex items-center justify-center text-base font-bold text-primary font-mono shadow-xs">
                    {pad(minute)}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleMinuteChange(minute - 5)}
                    className="p-1 rounded text-muted hover:text-primary hover:bg-surface transition-colors cursor-pointer"
                    title="Minute Down (-5)"
                  >
                    <IoChevronDown size={12} />
                  </button>
                </div>

                {/* AM / PM Segment Toggle */}
                <div className="flex flex-col gap-1 ml-1">
                  <button
                    type="button"
                    onClick={() => handleToggleAMPM(false)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      !isPM
                        ? 'bg-accent text-white shadow-xs'
                        : 'bg-surface hover:bg-surface-raised text-muted hover:text-primary border border-subtle'
                    }`}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleAMPM(true)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      isPM
                        ? 'bg-accent text-white shadow-xs'
                        : 'bg-surface hover:bg-surface-raised text-muted hover:text-primary border border-subtle'
                    }`}
                  >
                    PM
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Time-of-Day Slots */}
          <div>
            <div className="flex items-center justify-between mb-1.5 px-0.5">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
                Quick Slots
              </span>
              <div className="flex items-center gap-1">
                {[0, 15, 30, 45].map((mVal) => (
                  <button
                    key={mVal}
                    type="button"
                    onClick={() => handleMinuteChange(mVal)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                      minute === mVal
                        ? 'bg-accent-subtle text-accent font-bold border border-accent/30'
                        : 'text-muted hover:text-primary hover:bg-surface'
                    }`}
                  >
                    :{pad(mVal)}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {[
                { label: 'Morning', icon: <IoSunnyOutline size={12} />, h: 9, m: 0 },
                { label: 'Noon', icon: <IoSunnyOutline size={12} />, h: 12, m: 0 },
                { label: 'Evening', icon: <IoMoonOutline size={12} />, h: 20, m: 0 },
                { label: 'Night', icon: <IoMoonOutline size={12} />, h: 22, m: 0 },
              ].map((slot) => {
                const isSlotSelected =
                  hour12 === (slot.h % 12 === 0 ? 12 : slot.h % 12) &&
                  minute === slot.m &&
                  isPM === (slot.h >= 12);

                return (
                  <button
                    key={slot.label}
                    type="button"
                    onClick={() => handlePresetTime(slot.h, slot.m)}
                    className={`p-1.5 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      isSlotSelected
                        ? 'bg-accent text-white shadow-xs'
                        : 'bg-surface hover:bg-surface-raised text-secondary hover:text-primary border border-subtle'
                    }`}
                  >
                    {slot.icon}
                    <span>{slot.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default VisualDateTimePicker;
