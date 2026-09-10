import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IoBookOutline,
  IoSchoolOutline,
  IoBookmarkOutline,
  IoFolderOutline,
  IoArrowForward,
  IoSparkles,
  IoFlame,
  IoFlash,
  IoCalendarOutline,
  IoTimeOutline,
  IoChevronBack,
  IoChevronForward,
  IoCheckmarkCircle,
  IoNotificationsOutline,
  IoCopyOutline,
  IoCheckmark,
  IoPlayOutline,
  IoCompassOutline,
  IoAddCircleOutline,
} from 'react-icons/io5';
import api from '../utils/api';
import AnimatedCounter from '../components/ui/AnimatedCounter';
import ProgressBar from '../components/ui/ProgressBar';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import DefaultResourceCover from '../components/ui/DefaultResourceCover';
import { openQuickCapture } from '../redux/slices/captureSlice';
import useDocumentTitle from '../hooks/useDocumentTitle';
import toast from 'react-hot-toast';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const Dashboard = () => {
  useDocumentTitle('Dashboard');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user: authUser } = useSelector((state) => state.auth);

  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [copiedNoteId, setCopiedNoteId] = useState(null);

  // Calendar month state
  const [calendarDate, setCalendarDate] = useState(() => new Date());

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/auth/dashboard');
      setDashboardData(res.data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const handleCopyText = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedNoteId(id);
    toast.success('Reflection copied to clipboard');
    setTimeout(() => setCopiedNoteId(null), 2000);
  };

  // Calendar Calculations
  const calendarInfo = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth(); // 0-indexed
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const monthName = calendarDate.toLocaleString('default', {
      month: 'long',
      year: 'numeric',
    });

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Monday-based index: 0 = Mon, ..., 6 = Sun
    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;

    const activitySet = new Set(dashboardData?.activity?.activityDays || []);

    const days = [];
    // Leading blanks
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ blank: true, key: `b-${i}` });
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = dateStr === todayStr;
      const isActive = activitySet.has(dateStr);
      const isFuture = new Date(dateStr + 'T23:59:59') > today;

      days.push({
        blank: false,
        dayNum: d,
        dateStr,
        isToday,
        isActive,
        isFuture,
        key: `d-${d}`,
      });
    }

    const currentYearMonth = `${year}-${String(month + 1).padStart(2, '0')}`;
    const activeThisMonthCount = Array.from(activitySet).filter((d) =>
      d.startsWith(currentYearMonth)
    ).length;

    return {
      monthName,
      daysInMonth,
      days,
      todayStr,
      activeThisMonthCount,
    };
  }, [calendarDate, dashboardData?.activity?.activityDays]);

  const handlePrevMonth = () => {
    setCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleResetToToday = () => {
    setCalendarDate(new Date());
  };

  const user = dashboardData?.user || authUser;
  const activity = dashboardData?.activity || {
    activityDays: [],
    currentStreak: 0,
    maxStreak: 0,
    activeDaysThisMonth: 0,
  };
  const counts = dashboardData?.counts || {
    books: 0,
    courses: 0,
    captures: 0,
    sections: 0,
  };
  const continueBooks = dashboardData?.continueLearning?.books || [];
  const continueCourses = dashboardData?.continueLearning?.courses || [];
  const dueReminders = dashboardData?.dueReminders || [];
  const recentNotes = dashboardData?.recentNotes || [];

  const coreSections = [
    {
      title: 'Books & Reading',
      desc: 'Video, audio & text books with live progress',
      count: counts.books,
      to: '/books',
      icon: <IoBookOutline size={26} />,
      gradient: 'from-orange-500 to-amber-600',
      bgGlow: 'bg-orange-500/15',
      badge: 'Reading Hub',
    },
    {
      title: 'Courses & Modules',
      desc: 'Structured video modules & Drive materials',
      count: counts.courses,
      to: '/courses',
      icon: <IoSchoolOutline size={26} />,
      gradient: 'from-purple-500 to-indigo-600',
      bgGlow: 'bg-purple-500/15',
      badge: 'Learning Tracks',
    },
    {
      title: 'Knowledge Vault',
      desc: 'Saved WhatsApp, Reels, LinkedIn & Web captures',
      count: counts.captures,
      to: '/captures',
      icon: <IoBookmarkOutline size={26} />,
      gradient: 'from-emerald-500 to-teal-600',
      bgGlow: 'bg-emerald-500/15',
      badge: 'Omni-Captures',
    },
    {
      title: 'Custom Notebooks',
      desc: 'Personal workspaces, sections & study notes',
      count: counts.sections,
      to: '/sections',
      icon: <IoFolderOutline size={26} />,
      gradient: 'from-rose-500 to-pink-600',
      bgGlow: 'bg-rose-500/15',
      badge: 'Notebooks',
    },
  ];

  if (loading && !dashboardData) {
    return <LoadingSpinner text="Launching your personal study command center…" />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* 1. HERO GREETING & STREAK BANNER */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-surface border border-subtle shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        {/* Ambient Gradient Glow */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />

        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-accent-subtle text-accent border border-accent/25">
            <IoSparkles size={13} className="animate-pulse" />
            <span>{getGreeting()}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-primary font-display tracking-tight">
            Welcome back,{' '}
            <span className="gradient-text">{user?.name?.split(' ')[0] || 'Scholar'}</span>
          </h1>
          <p className="text-secondary text-sm max-w-xl">
            Consistency is your superpower. Continue where you left off or capture new insights into your vault.
          </p>
        </div>

        {/* Quick Actions & Streak Pill */}
        <div className="relative z-10 flex flex-wrap items-center gap-3">
          {/* Streak Indicator Pill */}
          <div className="px-4 py-2.5 rounded-2xl bg-surface-raised border border-subtle flex items-center gap-3 shadow-md">
            <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <IoFlame size={22} className="animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                <span>{activity.currentStreak || 0} Day Streak</span>
              </div>
              <p className="text-[10px] text-muted">
                {activity.currentStreak > 0 ? 'Active & Burning' : 'Log in daily to build'}
              </p>
            </div>
          </div>

          {/* Quick Capture Button */}
          <button
            onClick={() => dispatch(openQuickCapture())}
            className="btn-primary py-2.5 px-4 text-xs font-bold rounded-2xl shadow-lg shadow-accent/20 hover:scale-105 transition-all cursor-pointer flex items-center gap-2"
          >
            <IoAddCircleOutline size={17} />
            <span>Quick Capture</span>
          </button>
        </div>
      </motion.div>

      {/* 2. 4-PILLAR RESOURCE HUB (REPLACING TOOLS & TRICKS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {coreSections.map((section, i) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Link to={section.to} className="block group h-full">
              <div className="glass-card p-5 relative overflow-hidden h-full border border-subtle hover:border-accent/40 transition-all duration-300 rounded-3xl flex flex-col justify-between shadow-md hover:shadow-xl hover:-translate-y-1">
                {/* Glow Backdrop */}
                <div
                  className={`absolute -top-10 -right-10 w-28 h-28 ${section.bgGlow} rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500`}
                />

                <div className="relative z-10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${section.gradient} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform duration-300`}
                    >
                      {section.icon}
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-surface-raised border border-subtle text-secondary">
                      {section.badge}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-baseline justify-between mb-1">
                      <h3 className="text-base font-bold text-primary font-display group-hover:text-accent transition-colors">
                        {section.title}
                      </h3>
                      <AnimatedCounter
                        value={section.count}
                        duration={0.8}
                        delay={i * 0.05}
                        className="text-2xl font-bold text-primary font-display"
                      />
                    </div>
                    <p className="text-xs text-secondary leading-relaxed line-clamp-2">
                      {section.desc}
                    </p>
                  </div>
                </div>

                <div className="relative z-10 flex items-center gap-1.5 pt-4 text-xs font-semibold text-accent group-hover:underline">
                  <span>Enter Hub</span>
                  <IoArrowForward size={13} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* 3. MONTHLY LOGIN & STREAK CALENDAR */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-3xl p-6 sm:p-8 bg-surface border border-subtle shadow-xl space-y-6"
      >
        {/* Calendar Header with Navigation and Streak Badges */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-subtle">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-accent uppercase tracking-wider mb-1">
              <IoCalendarOutline size={16} />
              <span>Study Habit & Login Tracker</span>
            </div>
            <h2 className="text-2xl font-bold text-primary font-display flex items-center gap-3">
              <span>{calendarInfo.monthName}</span>
              <div className="flex items-center gap-1 ml-2">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-surface-raised border border-subtle transition-colors cursor-pointer"
                  title="Previous Month"
                >
                  <IoChevronBack size={14} />
                </button>
                <button
                  onClick={handleResetToToday}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded-lg text-secondary hover:text-primary hover:bg-surface-raised border border-subtle transition-colors cursor-pointer"
                >
                  Today
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-surface-raised border border-subtle transition-colors cursor-pointer"
                  title="Next Month"
                >
                  <IoChevronForward size={14} />
                </button>
              </div>
            </h2>
          </div>

          {/* Streak Statistics Summary Panel (No Consistency Rate) */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {/* Current Streak */}
            <div className="px-4 py-2.5 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400">
                <IoFlame size={18} />
              </div>
              <div>
                <p className="text-[10px] text-orange-300 font-semibold uppercase tracking-wider">
                  Current Streak
                </p>
                <p className="text-base font-bold text-white font-display">
                  {activity.currentStreak || 0} <span className="text-xs font-normal text-orange-200/80">Days</span>
                </p>
              </div>
            </div>

            {/* Max Record Streak */}
            <div className="px-4 py-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                <IoFlash size={18} />
              </div>
              <div>
                <p className="text-[10px] text-indigo-300 font-semibold uppercase tracking-wider">
                  Max Streak
                </p>
                <p className="text-base font-bold text-white font-display">
                  {activity.maxStreak || 0} <span className="text-xs font-normal text-indigo-200/80">Days Record</span>
                </p>
              </div>
            </div>

            {/* Days Active this Month */}
            <div className="px-4 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <IoCheckmarkCircle size={18} />
              </div>
              <div>
                <p className="text-[10px] text-emerald-300 font-semibold uppercase tracking-wider">
                  Active This Month
                </p>
                <p className="text-base font-bold text-white font-display">
                  {calendarInfo.activeThisMonthCount}{' '}
                  <span className="text-xs font-normal text-emerald-200/80">
                    / {calendarInfo.daysInMonth} Days
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Day Grid */}
        <div>
          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-2 mb-2 text-center">
            {WEEKDAYS.map((day) => (
              <div key={day} className="text-xs font-bold uppercase tracking-wider text-muted py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-2">
            {calendarInfo.days.map((item) => {
              if (item.blank) {
                return <div key={item.key} className="h-16 sm:h-20 rounded-2xl bg-transparent" />;
              }

              return (
                <div
                  key={item.key}
                  className={`relative h-16 sm:h-20 rounded-2xl p-2 flex flex-col justify-between border transition-all duration-200 ${
                    item.isActive
                      ? 'bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent border-emerald-500/40 shadow-sm'
                      : item.isToday
                      ? 'bg-surface-raised border-accent shadow-md ring-2 ring-accent/30'
                      : 'bg-surface-raised/40 border-subtle/60 hover:border-subtle'
                  } ${item.isFuture ? 'opacity-40' : ''}`}
                >
                  {/* Top Day Number & Today Marker */}
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs sm:text-sm font-bold ${
                        item.isActive
                          ? 'text-emerald-400'
                          : item.isToday
                          ? 'text-accent font-extrabold'
                          : 'text-secondary'
                      }`}
                    >
                      {item.dayNum}
                    </span>

                    {item.isToday && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-accent text-white uppercase tracking-wider">
                        Today
                      </span>
                    )}
                  </div>

                  {/* Bottom Activity Marker */}
                  <div className="flex items-center justify-end">
                    {item.isActive ? (
                      <span
                        className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xs"
                        title={`Active on ${item.dateStr}`}
                      >
                        <IoFlame size={14} className="text-emerald-400" />
                      </span>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-subtle" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Calendar Legend */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-subtle mt-4 text-xs text-muted">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500/30 border border-emerald-500/50" />
                <span>Logged In / Active Study</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-accent ring-2 ring-accent/30" />
                <span>Current Day</span>
              </span>
            </div>
            <span>Streaks increase when you log in or study on consecutive days</span>
          </div>
        </div>
      </motion.div>

      {/* 4. CONTINUE WHERE YOU LEFT OFF (IN-PROGRESS SHELF) */}
      {(continueBooks.length > 0 || continueCourses.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-primary font-display flex items-center gap-2">
              <IoPlayOutline className="text-accent" size={22} />
              <span>Continue Where You Left Off</span>
            </h2>
            <Link to="/books" className="text-xs font-semibold text-accent hover:underline flex items-center gap-1">
              <span>View All Library</span>
              <IoArrowForward size={12} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* In-Progress Books */}
            {continueBooks.map((b) => (
              <Link
                key={b._id}
                to={b.link}
                className="glass-card p-4 rounded-3xl border border-subtle hover:border-accent/40 transition-all duration-300 flex items-center gap-4 group shadow-md hover:shadow-xl hover:-translate-y-1"
              >
                <div className="w-16 h-20 rounded-2xl overflow-hidden bg-surface-raised flex-shrink-0 border border-subtle">
                  {b.coverImage ? (
                    <img src={b.coverImage} alt={b.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <DefaultResourceCover contentType="book" itemType={b.type} title={b.title} />
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                      {b.type === 'video' ? 'Video Book' : 'Reading'}
                    </span>
                    <h4 className="text-sm font-bold text-primary truncate group-hover:text-accent transition-colors">
                      {b.title}
                    </h4>
                    <p className="text-xs text-secondary truncate">{b.author || 'Author'}</p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-muted">
                      <span>Progress</span>
                      <span className="font-semibold text-primary">{Math.round(b.progress)}%</span>
                    </div>
                    <ProgressBar progress={b.progress} height="h-1.5" />
                  </div>
                </div>
              </Link>
            ))}

            {/* In-Progress Courses */}
            {continueCourses.map((c) => (
              <Link
                key={c._id}
                to={c.link}
                className="glass-card p-4 rounded-3xl border border-subtle hover:border-purple-500/40 transition-all duration-300 flex items-center gap-4 group shadow-md hover:shadow-xl hover:-translate-y-1"
              >
                <div className="w-16 h-20 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex-shrink-0 flex items-center justify-center text-purple-400">
                  <IoSchoolOutline size={28} />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                      {c.category}
                    </span>
                    <h4 className="text-sm font-bold text-primary truncate group-hover:text-purple-300 transition-colors">
                      {c.title}
                    </h4>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-muted">
                      <span>Course Progress</span>
                      <span className="font-semibold text-primary">{Math.round(c.progress)}%</span>
                    </div>
                    <ProgressBar progress={c.progress} height="h-1.5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* 5. DUE REMINDERS & RECENT LEARNING REFLECTIONS (2-COLUMN GRID) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Actionable Vault Reminders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="lg:col-span-5 rounded-3xl p-6 bg-surface border border-subtle shadow-md space-y-4 flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-primary font-display flex items-center gap-2">
                <IoNotificationsOutline className="text-accent" size={20} />
                <span>Vault Reminders</span>
                {dueReminders.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-accent text-white">
                    {dueReminders.length}
                  </span>
                )}
              </h3>
              <Link to="/captures" className="text-xs text-accent font-semibold hover:underline">
                View Vault
              </Link>
            </div>

            {dueReminders.length === 0 ? (
              <div className="py-8 text-center text-secondary text-xs space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-surface-raised flex items-center justify-center mx-auto text-muted">
                  <IoNotificationsOutline size={20} />
                </div>
                <p>No due reminders at this moment.</p>
                <p className="text-[11px] text-muted">
                  Set reminders on any WhatsApp, Reel, or Web capture in your Vault!
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {dueReminders.map((r) => {
                  const remDate = new Date(r.reminderAt);
                  const isPast = remDate < new Date();
                  return (
                    <Link
                      key={r._id}
                      to="/captures"
                      className="p-3 rounded-2xl bg-surface-raised border border-subtle hover:border-accent/40 transition-colors flex items-start justify-between gap-3 block"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-accent-subtle text-accent">
                            {r.platform}
                          </span>
                          {r.isPriority && (
                            <span className="text-[9px] font-bold text-red-400">★ High</span>
                          )}
                        </div>
                        <h5 className="text-xs font-semibold text-primary truncate">
                          {r.title || r.notes || 'Captured Resource'}
                        </h5>
                      </div>
                      <span
                        className={`text-[10px] font-semibold whitespace-nowrap px-2 py-1 rounded-lg ${
                          isPast
                            ? 'bg-red-500/15 text-red-400 border border-red-500/25'
                            : 'bg-surface text-muted'
                        }`}
                      >
                        {remDate.toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <button
            onClick={() => dispatch(openQuickCapture())}
            className="w-full py-2.5 rounded-2xl bg-surface-raised hover:bg-surface border border-subtle text-xs font-semibold text-primary transition-colors cursor-pointer flex items-center justify-center gap-2 mt-2"
          >
            <IoAddCircleOutline size={16} className="text-accent" />
            <span>Add Capture with Reminder</span>
          </button>
        </motion.div>

        {/* Right: Recent Learning Reflections & Notes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-7 rounded-3xl p-6 bg-surface border border-subtle shadow-md space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-primary font-display flex items-center gap-2">
              <IoSparkles className="text-accent" size={18} />
              <span>Recent Learning Reflections</span>
            </h3>
            <span className="text-xs text-muted">Aggregated across all learning</span>
          </div>

          {recentNotes.length === 0 ? (
            <div className="py-12 text-center text-secondary text-xs space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-surface-raised flex items-center justify-center mx-auto text-muted">
                <IoBookOutline size={20} />
              </div>
              <p>No study notes or reflections recorded yet.</p>
              <p className="text-[11px] text-muted">
                Take notes while watching video books or inside custom notebooks to see them here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentNotes.map((note) => (
                <div
                  key={note.id}
                  className="p-3.5 rounded-2xl bg-surface-raised border border-subtle hover:border-subtle/80 transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-primary/10 text-primary">
                        {note.type}
                      </span>
                      <h5 className="text-xs font-bold text-primary truncate">
                        {note.sourceTitle}
                      </h5>
                    </div>
                    <button
                      onClick={() => handleCopyText(note.content, note.id)}
                      className="p-1 rounded-lg text-muted hover:text-white hover:bg-surface transition-colors cursor-pointer"
                      title="Copy Note"
                    >
                      {copiedNoteId === note.id ? (
                        <IoCheckmark size={14} className="text-emerald-400" />
                      ) : (
                        <IoCopyOutline size={14} />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-secondary leading-relaxed line-clamp-3 italic bg-surface/50 p-2.5 rounded-xl border border-subtle/40">
                    "{note.content}"
                  </p>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
