import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  IoCalendarOutline,
  IoChevronBack,
  IoChevronForward,
  IoFlameOutline,
  IoGridOutline,
  IoListOutline,
  IoTodayOutline,
  IoCheckmarkCircleOutline,
} from 'react-icons/io5';
import useDocumentTitle from '../hooks/useDocumentTitle';
import HabitListCard from '../components/habits/HabitListCard';
import HabitTable from '../components/habits/HabitTable';
import MonthlyOverviewGallery from '../components/habits/MonthlyOverviewGallery';
import MyWinsTable from '../components/habits/MyWinsTable';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import {
  fetchHabitProfile,
  fetchHabitLogs,
  fetchHabitStats,
  updateHabitProfile,
} from '../redux/slices/habitSlice';
import toast from 'react-hot-toast';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const HabitTrackerPage = () => {
  useDocumentTitle('Habit Tracker');
  const dispatch = useDispatch();
  const { profile, isLoading, stats } = useSelector((state) => state.habits);

  const [activeTab, setActiveTab] = useState('week'); // 'week' | 'month' | 'gallery' | 'wins'

  // Editable Tagline
  const [isEditingTagline, setIsEditingTagline] = useState(false);
  const [taglineDraft, setTaglineDraft] = useState('');

  // Weekly Date Navigation (Reference Date)
  const [currentWeekRef, setCurrentWeekRef] = useState(new Date());

  // Monthly Date Navigation (Reference Year & Month)
  const [currentMonthRef, setCurrentMonthRef] = useState(new Date());

  // Gallery Year
  const [galleryYear, setGalleryYear] = useState(new Date().getFullYear());

  // Initial Data Load
  useEffect(() => {
    dispatch(fetchHabitProfile());
    dispatch(fetchHabitStats(new Date().getFullYear()));
  }, [dispatch]);

  // Sync tagline draft
  useEffect(() => {
    if (profile?.tagline) {
      setTaglineDraft(profile.tagline);
    }
  }, [profile?.tagline]);

  // Compute 7 days of the active week (Sunday to Saturday)
  const weekDates = useMemo(() => {
    const ref = new Date(currentWeekRef);
    const dayOfWeek = ref.getDay(); // 0 = Sun, 1 = Mon ...
    const startOfWeek = new Date(ref);
    startOfWeek.setDate(ref.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);

    const todayStr = new Date().toISOString().slice(0, 10);
    const dates = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);

      const y = d.getFullYear();
      const mStr = String(d.getMonth() + 1).padStart(2, '0');
      const dayStr = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${mStr}-${dayStr}`;

      const mName = MONTH_NAMES[d.getMonth()];
      const displayDate = `${mName} ${d.getDate()}, ${y}`;
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });

      dates.push({
        dateStr,
        displayDate,
        dayName,
        monthName: mName,
        isToday: dateStr === todayStr,
      });
    }

    return dates;
  }, [currentWeekRef]);

  // Compute all days of the active month
  const monthDates = useMemo(() => {
    const year = currentMonthRef.getFullYear();
    const month = currentMonthRef.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = new Date().toISOString().slice(0, 10);
    const mName = MONTH_NAMES[month];

    const dates = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const mStr = String(month + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const dateStr = `${year}-${mStr}-${dayStr}`;

      const d = new Date(year, month, day);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const displayDate = `${mName} ${day}, ${year}`;

      dates.push({
        dateStr,
        displayDate,
        dayName,
        monthName: mName,
        isToday: dateStr === todayStr,
      });
    }

    return dates;
  }, [currentMonthRef]);

  // Fetch logs whenever active range changes
  useEffect(() => {
    let startDate = '';
    let endDate = '';

    if (activeTab === 'week' && weekDates.length > 0) {
      startDate = weekDates[0].dateStr;
      endDate = weekDates[weekDates.length - 1].dateStr;
    } else if (activeTab === 'month' && monthDates.length > 0) {
      startDate = monthDates[0].dateStr;
      endDate = monthDates[monthDates.length - 1].dateStr;
    }

    if (startDate && endDate) {
      dispatch(fetchHabitLogs({ startDate, endDate }));
    }
  }, [dispatch, activeTab, weekDates, monthDates]);

  // Week navigation
  const prevWeek = () => {
    const prev = new Date(currentWeekRef);
    prev.setDate(prev.getDate() - 7);
    setCurrentWeekRef(prev);
  };

  const nextWeek = () => {
    const next = new Date(currentWeekRef);
    next.setDate(next.getDate() + 7);
    setCurrentWeekRef(next);
  };

  const jumpToTodayWeek = () => {
    setCurrentWeekRef(new Date());
  };

  // Month navigation
  const prevMonth = () => {
    const prev = new Date(currentMonthRef);
    prev.setMonth(prev.getMonth() - 1);
    setCurrentMonthRef(prev);
  };

  const nextMonth = () => {
    const next = new Date(currentMonthRef);
    next.setMonth(next.getMonth() + 1);
    setCurrentMonthRef(next);
  };

  const jumpToTodayMonth = () => {
    setCurrentMonthRef(new Date());
  };

  // Save Tagline
  const handleSaveTagline = async () => {
    if (!taglineDraft.trim()) return;
    try {
      await dispatch(updateHabitProfile({ tagline: taglineDraft.trim() })).unwrap();
      toast.success('Tagline updated');
      setIsEditingTagline(false);
    } catch (err) {
      toast.error('Failed to update tagline');
    }
  };

  if (isLoading && !profile?.habits?.length) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Aesthetic Top Tagline Banner */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 text-xs">
          <span className="w-1 h-4 bg-accent rounded-full inline-block" />
          {isEditingTagline ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={taglineDraft}
                onChange={(e) => setTaglineDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTagline();
                  if (e.key === 'Escape') setIsEditingTagline(false);
                }}
                autoFocus
                className="text-xs px-2 py-0.5 rounded bg-surface border border-accent text-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSaveTagline}
                className="text-[11px] font-medium text-accent hover:underline cursor-pointer"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setIsEditingTagline(false)}
                className="text-[11px] text-muted hover:text-primary cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <span
              onClick={() => setIsEditingTagline(true)}
              className="text-secondary hover:text-primary transition-colors cursor-pointer tracking-wide font-medium"
              title="Click to edit tagline"
            >
              {profile?.tagline || 'Progress not Perfection'}
            </span>
          )}
        </div>

        {/* Quick Streak Pill */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('wins')}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 hover:bg-orange-500/15 border border-orange-500/20 text-orange-400 text-xs font-semibold transition-colors cursor-pointer"
            title="View Streaks & Wins"
          >
            <IoFlameOutline size={15} />
            <span>{stats?.currentStreak || 0}d Streak</span>
          </button>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center justify-between gap-4 flex-wrap border-b border-subtle pb-3">
        <div className="flex items-center gap-1 bg-surface-raised p-1 rounded-xl border border-subtle">
          <button
            type="button"
            onClick={() => setActiveTab('week')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'week'
                ? 'bg-accent text-white shadow-sm'
                : 'text-secondary hover:text-primary hover:bg-surface'
            }`}
          >
            <IoCalendarOutline size={15} />
            <span>This Week</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('month')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'month'
                ? 'bg-accent text-white shadow-sm'
                : 'text-secondary hover:text-primary hover:bg-surface'
            }`}
          >
            <IoTodayOutline size={15} />
            <span>This Month</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gallery')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'gallery'
                ? 'bg-accent text-white shadow-sm'
                : 'text-secondary hover:text-primary hover:bg-surface'
            }`}
          >
            <IoGridOutline size={15} />
            <span>Monthly Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('wins')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'wins'
                ? 'bg-accent text-white shadow-sm'
                : 'text-secondary hover:text-primary hover:bg-surface'
            }`}
          >
            <IoCheckmarkCircleOutline size={15} />
            <span>My Wins</span>
          </button>
        </div>

        {/* Date Jump Navigator (for Week or Month views) */}
        {activeTab === 'week' && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-secondary hidden sm:inline">
              {weekDates[0]?.displayDate} – {weekDates[6]?.displayDate}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevWeek}
                className="p-1.5 rounded-lg bg-surface hover:bg-surface-raised border border-subtle text-secondary hover:text-primary transition-colors cursor-pointer"
                title="Previous Week"
              >
                <IoChevronBack size={15} />
              </button>
              <button
                type="button"
                onClick={jumpToTodayWeek}
                className="px-2.5 py-1 rounded-lg bg-surface hover:bg-surface-raised border border-subtle text-xs font-medium text-secondary hover:text-primary transition-colors cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={nextWeek}
                className="p-1.5 rounded-lg bg-surface hover:bg-surface-raised border border-subtle text-secondary hover:text-primary transition-colors cursor-pointer"
                title="Next Week"
              >
                <IoChevronForward size={15} />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'month' && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-secondary hidden sm:inline">
              {MONTH_NAMES[currentMonthRef.getMonth()]} {currentMonthRef.getFullYear()}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1.5 rounded-lg bg-surface hover:bg-surface-raised border border-subtle text-secondary hover:text-primary transition-colors cursor-pointer"
                title="Previous Month"
              >
                <IoChevronBack size={15} />
              </button>
              <button
                type="button"
                onClick={jumpToTodayMonth}
                className="px-2.5 py-1 rounded-lg bg-surface hover:bg-surface-raised border border-subtle text-xs font-medium text-secondary hover:text-primary transition-colors cursor-pointer"
              >
                Current Month
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1.5 rounded-lg bg-surface hover:bg-surface-raised border border-subtle text-secondary hover:text-primary transition-colors cursor-pointer"
                title="Next Month"
              >
                <IoChevronForward size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {activeTab === 'week' && (
        <div className="flex flex-col md:flex-row items-start gap-6">
          {/* Left: Habit List Card */}
          <HabitListCard />

          {/* Right: This Week Table */}
          <div className="flex-1 w-full overflow-hidden space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <IoCalendarOutline size={18} className="text-secondary" />
                <h2 className="text-base font-semibold text-primary">This Week</h2>
              </div>
              <span className="text-xs text-muted">
                Tip: Drag habit icons to reorder columns
              </span>
            </div>

            <HabitTable dates={weekDates} tableName="This Week" />
          </div>
        </div>
      )}

      {activeTab === 'month' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <IoTodayOutline size={18} className="text-secondary" />
              <h2 className="text-base font-semibold text-primary">
                This Month ({MONTH_NAMES[currentMonthRef.getMonth()]})
              </h2>
            </div>
            <span className="text-xs text-muted">
              Drag habit icons to change column positions
            </span>
          </div>

          <HabitTable
            dates={monthDates}
            showMonthColumn={true}
            tableName={`Month - ${MONTH_NAMES[currentMonthRef.getMonth()]}`}
          />
        </div>
      )}

      {activeTab === 'gallery' && (
        <MonthlyOverviewGallery
          year={galleryYear}
          onYearChange={(newYear) => {
            setGalleryYear(newYear);
            dispatch(fetchHabitStats(newYear));
          }}
        />
      )}

      {activeTab === 'wins' && <MyWinsTable />}
    </div>
  );
};

export default HabitTrackerPage;
