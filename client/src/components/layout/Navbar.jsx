import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { HiMenu, HiX } from 'react-icons/hi';
import { IoBookOutline, IoSchoolOutline, IoConstructOutline, IoPersonOutline, IoLogOutOutline, IoShieldCheckmarkOutline, IoCompassOutline, IoFolderOutline, IoLogoYoutube, IoNotificationsOutline, IoCheckmarkDoneOutline, IoBookmarkOutline } from 'react-icons/io5';
import { FaTelegramPlane, FaDiscord } from 'react-icons/fa';
import { logout, markNotificationsRead } from '../../redux/slices/authSlice';
import api from '../../utils/api';

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [telegramUnread, setTelegramUnread] = useState(0);
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const unreadCount = user?.notifications?.filter((n) => !n.read).length ?? 0;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
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
      
      // Re-fetch when window gets focus
      window.addEventListener('focus', fetchTelegramUnread);
      return () => window.removeEventListener('focus', fetchTelegramUnread);
    }
  }, [user]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
    setDropdownOpen(false);
  };

  const navLinks = [
    { to: '/explore', label: 'Explore', icon: <IoCompassOutline size={18} /> },
    { to: '/books', label: 'Books', icon: <IoBookOutline size={18} /> },
    { to: '/courses', label: 'Courses', icon: <IoSchoolOutline size={18} /> },
    { to: '/youtube-playlists', label: 'Playlists', icon: <IoLogoYoutube size={18} /> },
    { to: '/telegram-inbox', label: 'Library', icon: <FaTelegramPlane size={18} /> },
  ];

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
      isActive
        ? 'bg-accent-subtle text-accent shadow-lg shadow-black/5 font-semibold'
        : 'text-secondary hover:text-primary hover:bg-surface-raised'
    }`;

  return (
    <nav className="sticky top-0 z-50 border-b border-subtle bg-surface/85 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <img src="/pwa-192x192.png" alt="OrganizeUp" className="w-9 h-9 rounded-xl shadow-lg shadow-black/20 group-hover:shadow-accent/20 transition-shadow" />
            <span className="text-lg font-bold font-display hidden sm:block">
              <span className="text-primary">Organize</span>
              <span className="gradient-text">Up</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <NavLink 
                key={link.to} 
                to={link.to} 
                className={navLinkClass}
                onClick={() => link.to === '/telegram-inbox' && setTelegramUnread(0)}
              >
                <div className="relative">
                  {link.icon}
                  {link.to === '/telegram-inbox' && telegramUnread > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                  )}
                </div>
                {link.label}
              </NavLink>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <div ref={notifRef} className="relative">
              <button
                onClick={() => {
                  setNotifOpen((prev) => !prev);
                  if (unreadCount > 0) dispatch(markNotificationsRead());
                }}
                className="relative p-2 rounded-xl text-secondary hover:text-primary hover:bg-surface-raised transition-colors cursor-pointer"
              >
                <IoNotificationsOutline size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-80 rounded-2xl bg-surface-raised/95 backdrop-blur-xl border border-strong shadow-2xl shadow-black/40 overflow-hidden z-50"
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-subtle">
                      <span className="text-sm font-semibold text-primary">Notifications</span>
                      {unreadCount === 0 && (
                        <span className="text-xs text-muted flex items-center gap-1">
                          <IoCheckmarkDoneOutline size={13} /> All read
                        </span>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
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
                              <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                                n.type === 'approval' ? 'bg-emerald-400'
                                : n.type === 'rejection' ? 'bg-red-400'
                                : 'bg-accent'
                              }`} />
                              <div className="flex-1 min-w-0">
                                {n.contentTitle && (
                                  <p className="text-xs font-semibold text-primary truncate">{n.contentTitle}</p>
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

            {/* User avatar / menu trigger */}
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-9 h-9 rounded-xl overflow-hidden ring-2 ring-transparent hover:ring-accent/50 transition-all cursor-pointer"
              >
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-accent to-orange-400 flex items-center justify-center">
                    <span className="text-sm font-bold text-white">{user?.name?.charAt(0)?.toUpperCase()}</span>
                  </div>
                )}
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-56 rounded-2xl bg-surface-raised/95 backdrop-blur-xl border border-strong shadow-2xl shadow-black/40 overflow-hidden z-50"
                  >
                    <div className="flex items-center gap-3 p-3 border-b border-subtle">
                      <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
                        {user?.avatar ? (
                          <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-accent to-orange-400 flex items-center justify-center">
                            <span className="text-sm font-bold text-white">{user?.name?.charAt(0)?.toUpperCase()}</span>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-primary truncate">{user?.name}</p>
                        <p className="text-xs text-secondary truncate">{user?.email}</p>
                      </div>
                    </div>

                    <div className="p-1.5">
                      <Link
                        to="/profile"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-secondary hover:text-primary hover:bg-surface transition-all"
                      >
                        <IoPersonOutline size={16} />
                        Profile
                      </Link>

                      <Link
                        to="/saved"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-secondary hover:text-primary hover:bg-surface transition-all"
                      >
                        <IoBookmarkOutline size={16} />
                        Saved Library
                      </Link>

                      <Link
                        to="/sections"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-secondary hover:text-primary hover:bg-surface transition-all"
                      >
                        <IoFolderOutline size={16} />
                        Custom Sections
                      </Link>

                      <Link
                        to="/tools"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-secondary hover:text-primary hover:bg-surface transition-all"
                      >
                        <IoConstructOutline size={16} />
                        Tricks
                      </Link>

                      <Link
                        to="/discord-inbox"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#5865F2] hover:text-[#5865F2] hover:bg-[#5865F2]/10 transition-all"
                      >
                        <FaDiscord size={16} />
                        Discord Library
                      </Link>

                      {user?.role === 'admin' && (
                        <Link
                          to="/admin"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 transition-all"
                        >
                          <IoShieldCheckmarkOutline size={16} />
                          Admin Panel
                        </Link>
                      )}

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-500 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                      >
                        <IoLogOutOutline size={16} />
                        Logout
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-xl text-secondary hover:text-primary hover:bg-surface-raised transition-all cursor-pointer"
            >
              {mobileOpen ? <HiX size={22} /> : <HiMenu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden border-t border-subtle"
          >
            <div className="px-4 py-3 space-y-1 bg-surface">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => {
                    setMobileOpen(false);
                    if (link.to === '/telegram-inbox') setTelegramUnread(0);
                  }}
                  className={navLinkClass}
                >
                  <div className="relative">
                    {link.icon}
                    {link.to === '/telegram-inbox' && telegramUnread > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </span>
                    )}
                  </div>
                  {link.label}
                </NavLink>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => {
                    setMobileOpen(false);
                    if (link.to === '/telegram-inbox') setTelegramUnread(0);
                  }}
                  className={navLinkClass}
                >
                  <div className="relative">
                    {link.icon}
                    {link.to === '/telegram-inbox' && telegramUnread > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </span>
                    )}
                  </div>
                  {link.label}
                </NavLink>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
