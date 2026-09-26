import { useEffect, useState } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import * as Dialog from '@radix-ui/react-dialog';
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
  IoCloseOutline,
  IoLogOutOutline,
  IoFlashOutline,
  IoChevronDown,
  IoHelpCircleOutline,
  IoOpenOutline,
} from 'react-icons/io5';
import { FaTelegramPlane, FaDiscord } from 'react-icons/fa';
import { logout } from '../../redux/slices/authSlice';
import { openQuickCapture } from '../../redux/slices/captureSlice';
import ThemeToggle from '../ui/ThemeToggle';
import api from '../../utils/api';
import { getDocsUrl } from '../../utils/docs';

const MobileDrawer = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const [telegramUnread, setTelegramUnread] = useState(0);

  // Group collapsible dropdown states
  const [openGroups, setOpenGroups] = useState(() => {
    try {
      const saved = localStorage.getItem('organizeup-sidebar-groups');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
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
      } catch (e) {}
      return next;
    });
  };

  // Auto-close on route change
  useEffect(() => {
    onClose();
  }, [location.pathname]);

  useEffect(() => {
    if (user && isOpen) {
      const fetchTelegramUnread = async () => {
        try {
          const res = await api.get('/telegram/unread-count');
          setTelegramUnread(res.data.unreadCount);
        } catch (error) {
          console.error('Failed to fetch telegram unread count', error);
        }
      };
      fetchTelegramUnread();
    }
  }, [user, isOpen]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
    onClose();
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

  // Auto-expand group if current route is active inside it
  useEffect(() => {
    const currentPath = location.pathname;
    navGroups.forEach((group) => {
      if (group.collapsible && openGroups[group.id] === false) {
        const hasActive = group.items.some((item) => {
          if (!item.to) return false;
          return currentPath === item.to || (item.to !== '/dashboard' && currentPath.startsWith(item.to));
        });
        if (hasActive) {
          setOpenGroups((prev) => ({ ...prev, [group.id]: true }));
        }
      }
    });
  }, [location.pathname]);

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AnimatePresence>
        {isOpen && (
          <Dialog.Portal forceMount>
            {/* Backdrop */}
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden"
              />
            </Dialog.Overlay>

            {/* Drawer Content */}
            <Dialog.Content asChild>
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                className="fixed top-0 bottom-0 left-0 w-[82%] max-w-sm bg-surface border-r border-subtle shadow-2xl z-50 flex flex-col md:hidden focus:outline-none"
              >
                {/* Header */}
                <div className="h-16 flex items-center justify-between px-5 border-b border-subtle flex-shrink-0 bg-surface-raised/40">
                  <div className="flex items-center gap-3">
                    <img
                      src="/organizeup-logo.svg"
                      alt="OrganizeUp"
                      className="w-8 h-8 object-contain drop-shadow-[0_2px_6px_rgba(255,87,34,0.25)]"
                    />
                    <span className="text-base font-bold font-display text-primary">
                      Organize<span className="gradient-text">Up</span>
                    </span>
                  </div>

                  <Dialog.Close asChild>
                    <button
                      className="p-2 rounded-xl text-secondary hover:text-primary hover:bg-surface-raised transition-colors cursor-pointer"
                      aria-label="Close menu"
                    >
                      <IoCloseOutline size={22} />
                    </button>
                  </Dialog.Close>
                </div>

                {/* Quick Capture Button */}
                <div className="px-4 pt-3 pb-1 flex-shrink-0">
                  <button
                    onClick={() => {
                      onClose();
                      dispatch(openQuickCapture());
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-accent to-accent-hover text-white font-bold text-xs shadow-md shadow-accent/25 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <IoFlashOutline size={17} />
                    <span>Quick Capture</span>
                  </button>
                </div>

                {/* Navigation Items with Accordion Groups */}
                <div className="flex-1 overflow-y-auto py-3 px-4 space-y-4 custom-scrollbar">
                  {navGroups.map((group) => {
                    const isOpen = openGroups[group.id] ?? true;
                    const hasActiveItem = group.items.some(isItemActive);
                    const unreadInGroup = group.items.reduce(
                      (acc, it) => acc + (typeof it.badge === 'number' ? it.badge : 0),
                      0
                    );

                    return (
                      <div key={group.id} className="space-y-1">
                        {group.collapsible ? (
                          <button
                            type="button"
                            onClick={() => toggleGroup(group.id)}
                            className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider text-muted hover:text-primary hover:bg-surface-raised/50 transition-colors cursor-pointer group/hdr select-none"
                          >
                            <div className="flex items-center gap-2 min-w-0">
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
                                size={14}
                                className={`transition-transform duration-200 ${
                                  isOpen ? 'rotate-0' : '-rotate-90'
                                }`}
                              />
                            </div>
                          </button>
                        ) : (
                          <h3 className="px-3 text-[11px] font-bold uppercase tracking-wider text-muted font-display mb-1">
                            {group.title}
                          </h3>
                        )}

                        <AnimatePresence initial={false}>
                          {(!group.collapsible || isOpen) && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                              className="overflow-hidden space-y-1"
                            >
                              {group.items.map((item) => {
                                const Icon = item.icon;
                                const isExt = item.isExternal;
                                const isActive = isItemActive(item);

                                const commonClasses = `flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                  isActive
                                    ? 'bg-accent-subtle text-accent font-semibold shadow-sm'
                                    : 'text-secondary hover:text-primary hover:bg-surface-raised'
                                }`;

                                if (isExt) {
                                  return (
                                    <a
                                      key={item.label}
                                      href={item.href}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={onClose}
                                      className={commonClasses}
                                    >
                                      <div className="relative flex-shrink-0 flex items-center justify-center">
                                        <Icon size={18} className="text-secondary" />
                                      </div>
                                      <span className="truncate flex-1">{item.label}</span>
                                      <IoOpenOutline size={13} className="text-muted opacity-60 flex-shrink-0" />
                                    </a>
                                  );
                                }

                                return (
                                  <NavLink
                                    key={item.to}
                                    to={item.to}
                                    onClick={() => {
                                      if (item.onClick) item.onClick();
                                      onClose();
                                    }}
                                    className={commonClasses}
                                  >
                                    <div className="relative flex-shrink-0 flex items-center justify-center">
                                      <Icon
                                        size={18}
                                        className={isActive ? 'text-accent' : 'text-secondary'}
                                      />
                                      {item.badge && (
                                        <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                                          {item.badge}
                                        </span>
                                      )}
                                    </div>
                                    <span className="truncate flex-1">{item.label}</span>
                                    {isActive && (
                                      <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                                    )}
                                  </NavLink>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>

                {/* Footer Section */}
                <div className="border-t border-subtle p-4 space-y-3 bg-surface-raised/40 flex-shrink-0">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-medium text-secondary">Appearance</span>
                    <ThemeToggle />
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface border border-subtle">
                    <Link
                      to="/profile"
                      onClick={onClose}
                      className="flex items-center gap-3 min-w-0 flex-1"
                    >
                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-accent-subtle flex-shrink-0 flex items-center justify-center text-accent font-bold text-xs border border-accent/20">
                        {user?.avatar ? (
                          <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          user?.name?.charAt(0)?.toUpperCase() || 'U'
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-primary truncate">
                          {user?.name || 'Account'}
                        </p>
                        <p className="text-[10px] text-muted truncate">{user?.email}</p>
                      </div>
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="p-2 text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                      title="Log out"
                    >
                      <IoLogOutOutline size={18} />
                    </button>
                  </div>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
};

export default MobileDrawer;
