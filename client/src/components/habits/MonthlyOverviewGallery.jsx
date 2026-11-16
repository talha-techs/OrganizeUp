import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { IoCalendarOutline, IoArrowBack, IoChevronBack, IoChevronForward } from 'react-icons/io5';
import SegmentedProgressBar from './SegmentedProgressBar';
import HabitTable from './HabitTable';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MonthlyOverviewGallery = ({ year = new Date().getFullYear(), onYearChange }) => {
  const { stats } = useSelector((state) => state.habits);
  const monthlyProgress = stats?.monthlyProgress || {};

  const [selectedMonthIndex, setSelectedMonthIndex] = useState(null); // 0-indexed (0 = Jan, 11 = Dec)

  // Generate days for selected month
  const getDaysForMonth = (yearVal, monthIdx) => {
    const daysInMonth = new Date(yearVal, monthIdx + 1, 0).getDate();
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const mName = MONTH_NAMES[monthIdx];

    const days = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const monthStr = String(monthIdx + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const dateStr = `${yearVal}-${monthStr}-${dayStr}`;

      const dateObj = new Date(yearVal, monthIdx, day);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      const displayDate = `${mName} ${day}, ${yearVal}`;

      days.push({
        dateStr,
        displayDate,
        dayName,
        monthName: mName,
        isToday: dateStr === todayStr,
      });
    }
    return days;
  };

  // If a month is selected, render its detailed daily breakdown view (Image 6)
  if (selectedMonthIndex !== null) {
    const monthName = MONTH_NAMES[selectedMonthIndex];
    const monthPercent = monthlyProgress[selectedMonthIndex + 1] || 0;
    const days = getDaysForMonth(year, selectedMonthIndex);

    return (
      <div className="space-y-4">
        {/* Detail Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-surface/80 border border-subtle">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelectedMonthIndex(null)}
              className="p-2 rounded-xl bg-surface-raised hover:bg-surface border border-subtle text-secondary hover:text-primary transition-colors cursor-pointer"
              title="Back to Monthly Overview"
            >
              <IoArrowBack size={18} />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <IoCalendarOutline size={20} className="text-accent" />
                <h2 className="text-xl font-bold text-primary tracking-tight">{monthName} {year}</h2>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted">Monthly progress:</span>
                <SegmentedProgressBar percent={monthPercent} size="md" />
              </div>
            </div>
          </div>

          {/* Month Switcher */}
          <div className="flex items-center gap-1 self-end sm:self-auto">
            <button
              type="button"
              onClick={() =>
                setSelectedMonthIndex((prev) => (prev > 0 ? prev - 1 : 11))
              }
              className="p-2 rounded-lg bg-surface-raised hover:bg-surface border border-subtle text-secondary hover:text-primary transition-colors cursor-pointer"
              title="Previous Month"
            >
              <IoChevronBack size={16} />
            </button>
            <button
              type="button"
              onClick={() =>
                setSelectedMonthIndex((prev) => (prev < 11 ? prev + 1 : 0))
              }
              className="p-2 rounded-lg bg-surface-raised hover:bg-surface border border-subtle text-secondary hover:text-primary transition-colors cursor-pointer"
              title="Next Month"
            >
              <IoChevronForward size={16} />
            </button>
          </div>
        </div>

        {/* Full month table */}
        <HabitTable dates={days} showMonthColumn={true} tableName={monthName} />
      </div>
    );
  }

  // 12-Month Gallery View (Image 3)
  return (
    <div className="space-y-4">
      {/* Gallery Header Toolbar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <IoCalendarOutline size={18} className="text-secondary" />
          <h3 className="text-base font-semibold text-primary">Monthly Overview</h3>
          <span className="text-xs px-2 py-0.5 rounded-md bg-surface-raised text-muted font-mono border border-subtle">
            {year}
          </span>
        </div>

        {onYearChange && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onYearChange(year - 1)}
              className="p-1.5 rounded-lg bg-surface hover:bg-surface-raised border border-subtle text-secondary hover:text-primary transition-colors cursor-pointer"
            >
              <IoChevronBack size={14} />
            </button>
            <span className="text-xs font-mono font-medium px-2 text-primary">{year}</span>
            <button
              type="button"
              onClick={() => onYearChange(year + 1)}
              className="p-1.5 rounded-lg bg-surface hover:bg-surface-raised border border-subtle text-secondary hover:text-primary transition-colors cursor-pointer"
            >
              <IoChevronForward size={14} />
            </button>
          </div>
        )}
      </div>

      {/* 12 Month Cards Grid (3 cols on large, 2 cols on medium, 1 on small) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {MONTH_NAMES.map((name, idx) => {
          const monthNumber = idx + 1;
          const progressPercent = monthlyProgress[monthNumber] || 0;

          return (
            <div
              key={name}
              onClick={() => setSelectedMonthIndex(idx)}
              className="group cursor-pointer rounded-2xl overflow-hidden bg-surface/90 hover:bg-surface border border-subtle hover:border-accent/40 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col"
            >
              {/* Minimalist Spaced Typography Banner Cover (Inspired by template) */}
              <div className="h-28 w-full bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-900 dark:to-zinc-800 flex items-center justify-center p-4 border-b border-subtle relative overflow-hidden group-hover:scale-[1.01] transition-transform">
                <span className="text-xl sm:text-2xl font-light tracking-[0.35em] text-zinc-900 dark:text-zinc-100 select-none uppercase transition-colors">
                  {name.split('').join(' ')}
                </span>
                <div className="absolute inset-0 bg-accent/0 group-hover:bg-accent/[0.03] transition-colors" />
              </div>

              {/* Card Footer Details */}
              <div className="p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <IoCalendarOutline size={14} className="text-accent" />
                  <span>{name}</span>
                </div>

                {/* Monthly Progress Bar */}
                <SegmentedProgressBar
                  percent={progressPercent}
                  totalSegments={10}
                  size="sm"
                  showLabel={true}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MonthlyOverviewGallery;
