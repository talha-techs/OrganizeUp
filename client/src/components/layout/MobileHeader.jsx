import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IoMenuOutline,
  IoNotificationsOutline,
  IoCheckmarkDoneOutline,
} from 'react-icons/io5';
import { markNotificationsRead } from '../../redux/slices/authSlice';

const MobileHeader = ({ onOpenMenu }) => {
  const dispatch = useDispatch();
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
          <img src="/pwa-192x192.png" alt="OrganizeUp" className="w-7 h-7 rounded-lg shadow-sm" />
          <span className="text-base font-bold font-display text-primary">
            Organize<span className="gradient-text">Up</span>
          </span>
        </Link>
      </div>

      {/* Right: Notifications & Avatar */}
      <div className="flex items-center gap-2">
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
                className="absolute right-0 mt-2 w-72 rounded-2xl bg-surface border border-subtle shadow-2xl shadow-black/40 overflow-hidden z-50"
              >
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-subtle bg-surface-raised/50">
                  <span className="text-xs font-semibold text-primary">Notifications</span>
                  {unreadCount === 0 && (
                    <span className="text-[10px] text-muted flex items-center gap-1">
                      <IoCheckmarkDoneOutline size={12} /> All read
                    </span>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {!user?.notifications?.length ? (
                    <p className="text-center text-muted text-xs py-6">No notifications</p>
                  ) : (
                    [...(user.notifications)].reverse().map((n, i) => (
                      <div
                        key={i}
                        className={`px-3 py-2.5 border-b border-subtle last:border-0 ${
                          !n.read ? 'bg-accent-subtle/30' : ''
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span
                            className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                              n.type === 'approval'
                                ? 'bg-emerald-400'
                                : n.type === 'rejection'
                                ? 'bg-red-400'
                                : 'bg-accent'
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            {n.contentTitle && (
                              <p className="text-[11px] font-semibold text-primary truncate">
                                {n.contentTitle}
                              </p>
                            )}
                            <p className="text-[11px] text-secondary">{n.message}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
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
