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
  IoChevronDown,
  IoCheckmarkDoneOutline,
  IoFlashOutline,
  IoHelpCircleOutline,
  IoOpenOutline,
} from 'react-icons/io5';
import { FaTelegramPlane, FaDiscord } from 'react-icons/fa';
import { logout, markNotificationsRead } from '../../redux/slices/authSlice';
import { openQuickCapture } from '../../redux/slices/captureSlice';
import ThemeToggle from '../ui/ThemeToggle';
import api from '../../utils/api';
import { getDocsUrl } from '../../utils/docs';

const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);

  const [notifOpen, setNotifOpen] = useState(false);
  const [telegramUnread, setTelegramUnread] = useState(0);
  const notifRef = useRef(null);

  // Group collapsible dropdown states (persisted in localStorage)
  const [openGroups, setOpenGroups] = useState(() => {
    try {
      const saved = localStorage.getItem('organizeup-sidebar-groups');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse sidebar group states', e);
    }
    return {
      overview: true,
      library: true,
      knowledge: true,
      inboxes: true,
      account: true,
    };
  });

  const toggleGroup = (groupId) => {
    setOpenGroups((prev) => {
      const next = { ...prev, [groupId]: !prev[groupId] };
      try {
        localStorage.setItem('organizeup-sidebar-groups', JSON.stringify(next));
      } catch (e) {
        console.error('Failed to save sidebar group states', e);
      }
      return next;
    });
  };

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
      id: 'overview',
      title: 'Overview',
      collapsible: false,
      items: [
        { to: '/dashboard', label: 'Dashboard', icon: IoGridOutline },
      ],
    },
    {
      id: 'library',
      title: 'Library',
      collapsible: true,
      items: [
        { to: '/books', label: 'Books', icon: IoBookOutline },
        { to: '/courses', label: 'Courses', icon: IoSchoolOutline },
        { to: '/tools', label: 'Tricks & Tools', icon: IoConstructOutline },
        { to: '/youtube-playlists', label: 'Playlists', icon: IoLogoYoutube },
        { to: '/saved', label: 'Saved Library', icon: IoBookmarkOutline },
      ],
    },
    {
      id: 'knowledge',
      title: 'Knowledge',
      collapsible: true,
      items: [
        { to: '/workspaces', label: 'Workspaces', icon: IoFolderOutline },
        { to: '/explore', label: 'Explore Hub', icon: IoCompassOutline },
      ],
    },
    {
      id: 'inboxes',
      title: 'Inboxes',
      collapsible: true,
      items: [
        {
          to: '/captures',
          label: 'Vault & Captures',
          icon: IoFlashOutline,
        },
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
      id: 'account',
      title: 'Account',
      collapsible: true,
      items: [
        { to: '/profile', label: 'My Profile', icon: IoPersonOutline },
        { href: getDocsUrl(), label: 'Documentation', icon: IoHelpCircleOutline, isExternal: true },
        ...(user?.role === 'admin'
          ? [{ to: '/admin', label: 'Admin Panel', icon: IoShieldCheckmarkOutline }]
          : []),
      ],
    },
  ];

  const isItemActive = (item) => {
    if (item.isExternal || !item.to) return false;
    return (
      location.pathname === item.to ||
      (item.to !== '/dashboard' && location.pathname.startsWith(item.to))
    );
  };

  // Automatically expand group if user is on an active route inside it
  useEffect(() => {
    const currentPath = location.pathname;
    navGroups.forEach((group) => {
      if (group.collapsible && openGroups[group.id] === false) {
        const hasActive = group.items.some((item) => {
          if (!item.to) return false;
          return currentPath === item.to || (item.to !== '/dashboard' && currentPath.startsWith(item.to));
        });
        if (hasActive) {
          setOpenGroups((prev) => {
            const next = { ...prev, [group.id]: true };
            try {
              localStorage.setItem('organizeup-sidebar-groups', JSON.stringify(next));
            } catch (e) {}
            return next;
          });
        }
      }
    });
  }, [location.pathname]);

  const renderNavItem = (item) => {
    const Icon = item.icon;
    const isExt = item.isExternal;
    const isActive = isItemActive(item);

    const commonClasses = `group relative flex items-center h-10 w-full rounded-xl text-sm font-medium transition-colors duration-150 cursor-pointer overflow-hidden ${
      isActive
        ? 'bg-accent-subtle text-accent font-semibold shadow-sm'
        : 'text-secondary hover:text-primary hover:bg-surface-raised'
    }`;

    const innerContent = (
      <>
        {/* Fixed 40px icon slot pinned at the exact same left coordinate (never moves or snaps) */}
        <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center relative">
          <Icon
            size={19}
            className={
              isActive
                ? 'text-accent'
                : 'text-secondary group-hover:text-primary transition-colors'
            }
          />
          {item.badge && (
            <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
              {item.badge}
            </span>
          )}
        </div>

        {/* Smoothly animated text label container */}
        <div
          className={`flex-1 flex items-center justify-between min-w-0 pr-2 transition-all duration-300 overflow-hidden whitespace-nowrap ${
            isCollapsed ? 'opacity-0 max-w-0 pointer-events-none' : 'opacity-100 max-w-[180px] ml-0.5'
          }`}
        >
          <span className="truncate">{item.label}</span>

          {isExt && (
            <IoOpenOutline
              size={13}
              className="text-muted group-hover:text-cyan-400 opacity-60 flex-shrink-0 ml-1.5"
            />
          )}

          {isActive && (
            <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0 ml-2 shadow-[0_0_8px_rgba(255,87,34,0.6)]" />
          )}
        </div>
      </>
    );

    if (isExt) {
      return (
        <a
          key={item.label}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          title={isCollapsed ? `${item.label} (opens in new tab)` : undefined}
          className={commonClasses}
        >
          {innerContent}
        </a>
      );
    }

    return (
      <NavLink
        key={item.to}
        to={item.to}
        onClick={item.onClick}
        title={isCollapsed ? item.label : undefined}
        className={commonClasses}
      >
        {innerContent}
      </NavLink>
    );
  };

  return (
    <aside
      className={`hidden md:flex flex-col fixed top-0 left-0 bottom-0 z-40 bg-surface border-r border-subtle transition-[width] duration-300 ease-in-out will-change-[width] overflow-visible ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Floating edge collapse/expand toggle button affixed to the right border */}
      <button
        onClick={() => {
          const nextState = !isCollapsed;
          setIsCollapsed(nextState);
          localStorage.setItem('organizeup-sidebar-collapsed', String(nextState));
        }}
        className="absolute -right-3 top-5 w-6 h-6 rounded-full bg-surface border border-subtle shadow-md hover:shadow-lg flex items-center justify-center text-muted hover:text-accent hover:border-accent/40 transition-all duration-200 cursor-pointer z-50 hover:scale-110 active:scale-95"
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? <IoChevronForwardOutline size={13} /> : <IoChevronBackOutline size={13} />}
      </button>

      {/* Header / Brand */}
      <div className="h-16 flex items-center px-3 border-b border-subtle flex-shrink-0 relative overflow-hidden">
        <Link to="/dashboard" className="flex items-center min-w-0 group" title="OrganizeUp">
          <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
            <img
              src="/organizeup-logo.svg"
              alt="OrganizeUp"
              className="w-8 h-8 object-contain flex-shrink-0 group-hover:scale-105 transition-transform drop-shadow-[0_2px_8px_rgba(255,87,34,0.25)]"
            />
          </div>
          <div
            className={`transition-all duration-300 overflow-hidden whitespace-nowrap ml-1 ${
              isCollapsed ? 'opacity-0 max-w-0 pointer-events-none' : 'opacity-100 max-w-[140px]'
            }`}
          >
            <span className="text-base font-bold font-display tracking-tight text-primary truncate block">
              Organize<span className="gradient-text">Up</span>
            </span>
          </div>
        </Link>

        {!isCollapsed && (
          <button
            onClick={() => {
              setIsCollapsed(true);
              localStorage.setItem('organizeup-sidebar-collapsed', 'true');
            }}
            className="ml-auto p-1.5 rounded-lg text-muted hover:text-primary hover:bg-surface-raised transition-colors cursor-pointer flex-shrink-0"
            title="Collapse sidebar"
          >
            <IoChevronBackOutline size={17} />
          </button>
        )}
      </div>

      {/* Quick Capture Button */}
      <div className="px-3 pt-3 pb-1 flex-shrink-0">
        <button
          onClick={() => dispatch(openQuickCapture())}
          title={isCollapsed ? 'Quick Capture (Ctrl+K)' : undefined}
          className="w-full h-10 rounded-xl bg-gradient-to-r from-accent to-accent-hover text-white font-bold text-xs shadow-md shadow-accent/25 hover:shadow-lg hover:shadow-accent/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center overflow-hidden cursor-pointer"
        >
          <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
            <IoFlashOutline size={18} />
          </div>
          <div
            className={`flex items-center justify-between flex-1 min-w-0 pr-2.5 transition-all duration-300 overflow-hidden whitespace-nowrap ${
              isCollapsed ? 'opacity-0 max-w-0 pointer-events-none' : 'opacity-100 max-w-[180px]'
            }`}
          >
            <span>Quick Capture</span>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-mono font-normal">
              ⌘K
            </span>
          </div>
        </button>
      </div>

      {/* Navigation Sections with Collapsible Dropdowns */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-3 space-y-3 custom-scrollbar">
        {navGroups.map((group) => {
          const isOpen = openGroups[group.id] ?? true;
          const hasActiveItem = group.items.some(isItemActive);
          const unreadInGroup = group.items.reduce(
            (acc, it) => acc + (typeof it.badge === 'number' ? it.badge : 0),
            0
          );

          return (
            <div key={group.id} className="space-y-1">
              {/* Expanded Sidebar: Interactive Dropdown Header */}
              {!isCollapsed && group.collapsible && (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center justify-between px-2 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider text-muted hover:text-primary hover:bg-surface-raised/50 transition-colors cursor-pointer group/hdr select-none mb-0.5"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-display truncate">{group.title}</span>
                    {!isOpen && unreadInGroup > 0 && (
                      <span className="min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                        {unreadInGroup}
                      </span>
                    )}
                    {!isOpen && hasActiveItem && (
                      <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    )}
                  </div>
                  <div className="text-muted group-hover/hdr:text-primary transition-transform duration-200">
                    <IoChevronDown
                      size={13}
                      className={`transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`}
                    />
                  </div>
                </button>
              )}

              {!isCollapsed && !group.collapsible && (
                <h3 className="px-2 text-[11px] font-bold uppercase tracking-wider text-muted font-display mb-0.5">
                  {group.title}
                </h3>
              )}

              {/* Collapsed Sidebar: Clean category divider */}
              {isCollapsed && group.id !== 'overview' && (
                <div className="my-1.5 border-t border-subtle/60 mx-1" />
              )}

              {/* Items List */}
              {isCollapsed ? (
                <div className="space-y-1">
                  {group.items.map((item) => renderNavItem(item))}
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {(!group.collapsible || isOpen) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                      className="overflow-hidden space-y-0.5"
                    >
                      {group.items.map((item) => renderNavItem(item))}
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer User & Utility Controls */}
      <div className="border-t border-subtle p-3 space-y-2 flex-shrink-0 bg-surface-raised/30 overflow-hidden">
        {/* Notifications & Theme Toggle Toolbar */}
        <div className="flex items-center justify-between px-1 h-9">
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
        <div className="flex items-center h-12 w-full rounded-xl bg-surface border border-subtle overflow-hidden">
          <Link
            to="/profile"
            className="flex items-center flex-1 min-w-0"
            title={isCollapsed ? `${user?.name} (View Profile)` : undefined}
          >
            <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-accent-subtle flex items-center justify-center text-accent font-bold text-xs border border-accent/20">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  user?.name?.charAt(0)?.toUpperCase() || 'U'
                )}
              </div>
            </div>

            <div
              className={`flex-1 min-w-0 pl-1 transition-all duration-300 overflow-hidden whitespace-nowrap ${
                isCollapsed ? 'opacity-0 max-w-0 pointer-events-none' : 'opacity-100 max-w-[130px]'
              }`}
            >
              <p className="text-xs font-semibold text-primary truncate leading-tight">
                {user?.name || 'My Account'}
              </p>
              <p className="text-[10px] text-muted truncate">{user?.email}</p>
            </div>
          </Link>

          {!isCollapsed && (
            <button
              onClick={handleLogout}
              className="p-1.5 text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer flex-shrink-0 mr-2"
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
