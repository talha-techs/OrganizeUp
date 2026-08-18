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
} from 'react-icons/io5';
import { FaTelegramPlane, FaDiscord } from 'react-icons/fa';
import { logout } from '../../redux/slices/authSlice';
import ThemeToggle from '../ui/ThemeToggle';
import api from '../../utils/api';

const MobileDrawer = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const [telegramUnread, setTelegramUnread] = useState(0);

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
                      src="/pwa-192x192.png"
                      alt="OrganizeUp"
                      className="w-8 h-8 rounded-xl shadow-md shadow-accent/20"
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

                {/* Navigation Items */}
                <div className="flex-1 overflow-y-auto py-5 px-4 space-y-6">
                  {navGroups.map((group, groupIdx) => (
                    <div key={groupIdx} className="space-y-1.5">
                      <h3 className="px-3 text-[11px] font-bold uppercase tracking-wider text-muted font-display">
                        {group.title}
                      </h3>
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive =
                          location.pathname === item.to ||
                          (item.to !== '/dashboard' && location.pathname.startsWith(item.to));

                        return (
                          <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={() => {
                              if (item.onClick) item.onClick();
                              onClose();
                            }}
                            className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                              isActive
                                ? 'bg-accent-subtle text-accent font-semibold shadow-sm'
                                : 'text-secondary hover:text-primary hover:bg-surface-raised'
                            }`}
                          >
                            <div className="relative flex-shrink-0 flex items-center justify-center">
                              <Icon size={18} className={isActive ? 'text-accent' : 'text-secondary'} />
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
                    </div>
                  ))}
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
