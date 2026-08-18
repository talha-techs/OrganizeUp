import { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IoGridOutline,
  IoBookOutline,
  IoSchoolOutline,
  IoConstructOutline,
  IoLogoYoutube,
  IoBookmarkOutline,
  IoFolderOutline,
  IoCompassOutline,
  IoPersonOutline,
  IoShieldCheckmarkOutline,
  IoNotificationsOutline,
  IoLogOutOutline,
  IoChevronBackOutline,
  IoChevronForwardOutline,
  IoCheckmarkDoneOutline,
} from 'react-icons/io5';
import { FaTelegramPlane, FaDiscord } from 'react-icons/fa';
import { logout, markNotificationsRead } from '../../redux/slices/authSlice';
import ThemeToggle from '../ui/ThemeToggle';
import api from '../../utils/api';

const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);

  const [notifOpen, setNotifOpen] = useState(false);
  const [telegramUnread, setTelegramUnread] = useState(0);
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

  useEffect(() => {
    if (user) {
      const fetchTelegramUnread = async () => {
        try {
          const res = await api.get('/telegram/unread-count');
          setTelegramUnread(res.data.unreadCount);
        } catch (error) {
          console.error('Failed to fetch telegram unread count', error);
        }
      };
      fetchTelegramUnread();
      window.addEventListener('focus', fetchTelegramUnread);
      return () => window.removeEventListener('focus', fetchTelegramUnread);
    }
  }, [user]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  const navGroups = [
    {
      title: 'Overview',
      items: [
        { to: '/dashboard', label: 'Dashboard', icon: IoGridOutline },
      ],
    },
    {
      title: 'Library',
      items: [
        { to: '/books', label: 'Books', icon: IoBookOutline },
        { to: '/courses', label: 'Courses', icon: IoSchoolOutline },
        { to: '/tools', label: 'Tricks & Tools', icon: IoConstructOutline },
        { to: '/youtube-playlists', label: 'Playlists', icon: IoLogoYoutube },
        { to: '/saved', label: 'Saved Library', icon: IoBookmarkOutline },
      ],
    },
    {
      title: 'Knowledge',
      items: [
        { to: '/sections', label: 'Custom Sections', icon: IoFolderOutline },
        { to: '/explore', label: 'Explore Hub', icon: IoCompassOutline },
      ],
    },
    {
      title: 'Inboxes',
      items: [
        {
          to: '/telegram-inbox',
          label: 'Telegram Inbox',
          icon: FaTelegramPlane,
          badge: telegramUnread > 0 ? telegramUnread : null,
          onClick: () => setTelegramUnread(0),
        },
        {
          to: '/discord-inbox',
          label: 'Discord Inbox',
          icon: FaDiscord,
        },
      ],
    },
    {
      title: 'Account',
      items: [
        { to: '/profile', label: 'My Profile', icon: IoPersonOutline },
        ...(user?.role === 'admin'
          ? [{ to: '/admin', label: 'Admin Panel', icon: IoShieldCheckmarkOutline }]
          : []),
      ],
    },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col fixed top-0 left-0 bottom-0 z-40 bg-surface border-r border-subtle transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Header / Brand */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-subtle flex-shrink-0">
        <Link to="/dashboard" className="flex items-center gap-3 min-w-0 group">
          <img
            src="/pwa-192x192.png"
            alt="OrganizeUp"
            className="w-9 h-9 rounded-xl shadow-md shadow-accent/20 flex-shrink-0 group-hover:scale-105 transition-transform"
          />
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              className="min-w-0"
            >
              <span className="text-base font-bold font-display tracking-tight text-primary truncate block">
                Organize<span className="gradient-text">Up</span>
              </span>
            </motion.div>
          )}
        </Link>

        <button
          onClick={() => {
            const nextState = !isCollapsed;
            setIsCollapsed(nextState);
            localStorage.setItem('organizeup-sidebar-collapsed', String(nextState));
          }}
          className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-surface-raised transition-colors cursor-pointer"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <IoChevronForwardOutline size={18} /> : <IoChevronBackOutline size={18} />}
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-6 custom-scrollbar">
        {navGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-1">
            {!isCollapsed && (
              <h3 className="px-3 text-[11px] font-bold uppercase tracking-wider text-muted font-display mb-1.5">
                {group.title}
              </h3>
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive =
                location.pathname === item.to ||
                (item.to !== '/dashboard' && location.pathname.startsWith(item.to));

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={item.onClick}
                  title={isCollapsed ? item.label : undefined}
                  className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-accent-subtle text-accent font-semibold shadow-sm'
                      : 'text-secondary hover:text-primary hover:bg-surface-raised'
                  } ${isCollapsed ? 'justify-center' : ''}`}
                >
                  <div className="relative flex-shrink-0 flex items-center justify-center">
                    <Icon size={19} className={isActive ? 'text-accent' : 'text-secondary group-hover:text-primary transition-colors'} />
                    {item.badge && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                        {item.badge}
                      </span>
                    )}
                  </div>

                  {!isCollapsed && (
                    <span className="truncate flex-1">{item.label}</span>
                  )}

                  {isActive && !isCollapsed && (
                    <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer User & Utility Controls */}
      <div className="border-t border-subtle p-3 space-y-2 flex-shrink-0 bg-surface-raised/30">
        {/* Notifications & Theme Toggle Toolbar */}
        <div className={`flex items-center ${isCollapsed ? 'flex-col gap-2' : 'justify-between px-1'}`}>
          {/* Notification Button */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => {
                setNotifOpen((prev) => !prev);
                if (unreadCount > 0) dispatch(markNotificationsRead());
              }}
              className="relative p-2 rounded-xl text-secondary hover:text-primary hover:bg-surface-raised transition-colors cursor-pointer flex items-center justify-center"
              title="Notifications"
            >
              <IoNotificationsOutline size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Popover */}
            <AnimatePresence>
              {notifOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-12 left-0 w-80 rounded-2xl bg-surface border border-subtle shadow-2xl shadow-black/40 overflow-hidden z-50"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-subtle bg-surface-raised/50">
                    <span className="text-sm font-semibold text-primary">Notifications</span>
                    {unreadCount === 0 && (
                      <span className="text-xs text-muted flex items-center gap-1">
                        <IoCheckmarkDoneOutline size={13} /> All read
                      </span>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {!user?.notifications?.length ? (
                      <p className="text-center text-muted text-sm py-8">No notifications</p>
                    ) : (
                      [...(user.notifications)].reverse().map((n, i) => (
                        <div
                          key={i}
                          className={`px-4 py-3 border-b border-subtle last:border-0 ${
                            !n.read ? 'bg-accent-subtle/30' : ''
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <span
                              className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                                n.type === 'approval'
                                  ? 'bg-emerald-400'
                                  : n.type === 'rejection'
                                  ? 'bg-red-400'
                                  : 'bg-accent'
                              }`}
                            />
                            <div className="flex-1 min-w-0">
                              {n.contentTitle && (
                                <p className="text-xs font-semibold text-primary truncate">
                                  {n.contentTitle}
                                </p>
                              )}
                              <p className="text-xs text-secondary mt-0.5">{n.message}</p>
                              {n.adminNote && (
                                <p className="text-xs text-muted italic mt-0.5">"{n.adminNote}"</p>
                              )}
                              <p className="text-[10px] text-muted mt-1">
                                {new Date(n.createdAt).toLocaleString()}
                              </p>
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

          <ThemeToggle />
        </div>

        {/* User Profile Card & Logout */}
        <div
          className={`flex items-center gap-2 p-2 rounded-xl bg-surface border border-subtle ${
            isCollapsed ? 'justify-center p-1.5' : 'justify-between'
          }`}
        >
          <Link
            to="/profile"
            className={`flex items-center gap-2.5 min-w-0 ${isCollapsed ? '' : 'flex-1'}`}
            title={isCollapsed ? `${user?.name} (View Profile)` : undefined}
          >
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-accent-subtle flex-shrink-0 flex items-center justify-center text-accent font-bold text-xs border border-accent/20">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user?.name?.charAt(0)?.toUpperCase() || 'U'
              )}
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-primary truncate leading-tight">
                  {user?.name || 'My Account'}
                </p>
                <p className="text-[10px] text-muted truncate">{user?.email}</p>
              </div>
            )}
          </Link>

          {!isCollapsed && (
            <button
              onClick={handleLogout}
              className="p-1.5 text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer flex-shrink-0"
              title="Log out"
            >
              <IoLogOutOutline size={17} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
