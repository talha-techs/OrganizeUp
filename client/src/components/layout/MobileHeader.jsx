import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IoMenuOutline,
  IoNotificationsOutline,
  IoCheckmarkDoneOutline,
  IoFlashOutline,
  IoTimeOutline,
  IoCheckmarkCircleOutline,
  IoAlertCircleOutline,
  IoNotificationsOffOutline,
  IoArrowForwardOutline,
} from 'react-icons/io5';
import { markNotificationsRead } from '../../redux/slices/authSlice';
import { openQuickCapture } from '../../redux/slices/captureSlice';

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now - d) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const MobileHeader = ({ onOpenMenu }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  const unreadCount = user?.notifications?.filter((n) => !n.read).length ?? 0;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="md:hidden sticky top-0 z-30 h-14 bg-surface/85 backdrop-blur-xl border-b border-subtle flex items-center justify-between px-4">
      {/* Left: Hamburger & Brand */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMenu}
          className="p-1.5 rounded-xl text-secondary hover:text-primary hover:bg-surface-raised transition-colors cursor-pointer"
          aria-label="Open Navigation"
        >
          <IoMenuOutline size={24} />
        </button>

        <Link to="/dashboard" className="flex items-center gap-2">
          <img src="/organizeup-logo.svg" alt="OrganizeUp" className="w-7 h-7 object-contain drop-shadow-[0_1px_4px_rgba(255,87,34,0.25)]" />
          <span className="text-base font-bold font-display text-primary">
            Organize<span className="gradient-text">Up</span>
          </span>
        </Link>
      </div>

      {/* Right: Quick Capture, Notifications & Avatar */}
      <div className="flex items-center gap-2">
        {/* Quick Capture Button */}
        <button
          onClick={() => dispatch(openQuickCapture())}
          className="p-1.5 rounded-xl bg-accent-subtle text-accent hover:bg-accent hover:text-white transition-colors cursor-pointer"
          title="Quick Capture"
          aria-label="Quick Capture"
        >
          <IoFlashOutline size={19} />
        </button>

        {/* Notification Button */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => {
              setNotifOpen((prev) => !prev);
              if (unreadCount > 0) dispatch(markNotificationsRead());
            }}
            className="p-1.5 rounded-xl text-secondary hover:text-primary hover:bg-surface-raised transition-colors cursor-pointer relative"
          >
            <IoNotificationsOutline size={22} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-3.5 h-3.5 px-0.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: 5, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 5, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl bg-surface-raised/98 backdrop-blur-2xl border border-strong shadow-2xl shadow-black/70 overflow-hidden z-50 flex flex-col"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-subtle bg-surface/60">
                  <div className="flex items-center gap-1.5">
                    <IoNotificationsOutline size={14} className="text-accent" />
                    <span className="text-xs font-semibold text-primary font-display">Notifications</span>
                  </div>
                  {unreadCount === 0 ? (
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-500/20">
                      <IoCheckmarkDoneOutline size={11} /> All read
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-accent bg-accent/10 px-1.5 py-0.5 rounded-full border border-accent/20">
                      {unreadCount} new
                    </span>
                  )}
                </div>

                {/* Notifications List */}
                <div className="max-h-72 overflow-y-auto custom-scrollbar divide-y divide-subtle/50">
                  {!user?.notifications?.length ? (
                    <div className="py-6 px-4 text-center space-y-1.5">
                      <div className="w-8 h-8 rounded-xl bg-surface border border-subtle flex items-center justify-center mx-auto text-muted">
                        <IoNotificationsOffOutline size={16} />
                      </div>
                      <p className="text-xs font-medium text-primary">No notifications</p>
                      <p className="text-[10px] text-muted">Reminders will appear here</p>
                    </div>
                  ) : (
                    [...(user.notifications)].reverse().map((n, i) => {
                      const isReminder = n.type === 'reminder';
                      const isApproval = n.type === 'approval';
                      const isRejection = n.type === 'rejection';

                      return (
                        <div
                          key={i}
                          onClick={() => {
                            setNotifOpen(false);
                            if (n.link) navigate(n.link);
                          }}
                          className={`px-3 py-2.5 transition-colors ${
                            n.link ? 'cursor-pointer hover:bg-surface/80' : ''
                          } ${!n.read ? 'bg-accent-subtle/20' : ''}`}
                        >
                          <div className="flex items-start gap-2">
                            <div
                              className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                isReminder
                                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                                  : isApproval
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                                  : isRejection
                                  ? 'bg-red-500/15 text-red-400 border border-red-500/25'
                                  : 'bg-accent/15 text-accent border border-accent/25'
                              }`}
                            >
                              {isReminder ? (
                                <IoTimeOutline size={13} />
                              ) : isApproval ? (
                                <IoCheckmarkCircleOutline size={13} />
                              ) : isRejection ? (
                                <IoAlertCircleOutline size={13} />
                              ) : (
                                <IoNotificationsOutline size={13} />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              {n.contentTitle && (
                                <p className="text-[11px] font-semibold text-primary truncate leading-tight">
                                  {n.contentTitle}
                                </p>
                              )}
                              <p className="text-[11px] text-secondary mt-0.5 line-clamp-2 leading-relaxed">
                                {n.message}
                              </p>
                              <div className="flex items-center justify-between mt-1">
                                <p className="text-[9px] text-muted">
                                  {formatTimeAgo(n.createdAt)}
                                </p>
                                {n.link && (
                                  <span className="text-[9px] text-accent font-medium flex items-center gap-0.5">
                                    View <IoArrowForwardOutline size={9} />
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Popover Footer */}
                <div className="px-3 py-2 border-t border-subtle bg-surface/70 flex items-center justify-between">
                  <Link
                    to="/captures"
                    onClick={() => setNotifOpen(false)}
                    className="text-[11px] text-accent hover:text-accent-hover font-medium flex items-center gap-1 transition-colors"
                  >
                    <IoFlashOutline size={12} /> Open Vault Reminders
                  </Link>
                  <span className="text-[9px] text-muted">
                    {user?.notifications?.length || 0} total
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Profile Avatar Link */}
        <Link
          to="/profile"
          className="w-8 h-8 rounded-lg overflow-hidden bg-accent-subtle flex items-center justify-center text-accent font-bold text-xs border border-accent/20"
        >
          {user?.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            user?.name?.charAt(0)?.toUpperCase() || 'U'
          )}
        </Link>
      </div>
    </header>
  );
};

export default MobileHeader;
