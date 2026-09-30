import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  FaWhatsapp,
  FaInstagram,
  FaFacebook,
  FaLinkedin,
  FaYoutube,
  FaGlobe,
  FaRegCopy,
  FaCheck,
  FaRegClock,
  FaExternalLinkAlt,
  FaTrashAlt,
  FaEdit,
} from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import {
  IoFlashOutline,
  IoImageOutline,
  IoTimeOutline,
  IoCheckmarkCircle,
  IoCheckmarkCircleOutline,
  IoSearchOutline,
  IoFilterOutline,
  IoClose,
  IoCalendarOutline,
  IoDocumentTextOutline,
  IoAddOutline,
  IoPlayCircleOutline,
  IoChevronBack,
  IoChevronForward,
  IoOpenOutline,
  IoExpandOutline,
  IoContractOutline,
  IoSaveOutline,
} from 'react-icons/io5';
import {
  fetchCaptures,
  toggleCaptureComplete,
  deleteCapture,
  updateCapture,
  openQuickCapture,
} from '../../redux/slices/captureSlice';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import UniversalVideoPlayer from '../../components/capture/UniversalVideoPlayer';
import { getInstagramEmbedUrl, getFacebookEmbedUrl } from '../../utils/linkMediaUtils';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  scheduleClientReminder,
  cancelClientReminder,
  testOSNotification,
} from '../../utils/notificationService';

const toLocalISOString = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};


const isVideoUrl = (url) => {
  if (typeof url !== 'string' || /(?:pmvhaven\.com)/i.test(url)) return false;
  return (
    /\.(mp4|webm|ogg|mov|m4v|m3u8|mpd)(\?.*)?$/i.test(url) ||
    url.includes('video.twimg.com') ||
    url.includes('twimg.com') ||
    url.includes('.m3u8') ||
    url.includes('fbcdn.net') ||
    url.includes('cdninstagram.com') ||
    url.includes('/api/captures/stream')
  );
};

// Stricter check: is the URL a direct video file/stream that a <video> element can play?
// Returns false for embed/plugin page URLs (e.g. facebook.com/plugins/video.php)
const isDirectVideoFile = (url) => {
  if (!url || typeof url !== 'string' || /(?:pmvhaven\.com)/i.test(url)) return false;
  // Reject known embed/plugin page URLs and non-direct video sites
  if (url.includes('facebook.com/plugins/') || url.includes('youtube.com/embed/') ||
      url.includes('instagram.com/') || url.includes('linkedin.com/embed/') ||
      url.includes('platform.twitter.com/embed/') || url.includes('tiktok.com/embed/') ||
      url.includes('player.vimeo.com/') || url.includes('loom.com/embed/')) {
    return false;
  }
  return isVideoUrl(url);
};

const getVideoSrc = (url) => {
  if (!url) return '';
  // Twitter/X video CDN returns 403 if a foreign Referer header is present.
  // Route through our backend Range-supporting stream proxy to ensure instant in-app playback.
  if (url.includes('twimg.com') || url.includes('video.twimg.com')) {
    const apiBase = import.meta.env.VITE_API_URL || '';
    return `${apiBase}/api/captures/stream?url=${encodeURIComponent(url)}`;
  }
  return url;
};

// Robust helper to extract/build a playable YouTube iframe embed URL (ONLY genuine YouTube links)
const getYouTubeEmbedUrl = (capture) => {
  if (!capture) return null;
  const embedUrl = capture.embedUrl || '';
  if (
    embedUrl.includes('youtube.com/embed') ||
    embedUrl.includes('youtube-nocookie.com/embed')
  ) {
    return embedUrl;
  }
  const rawUrl = capture.sourceUrl || capture.url || capture.mediaUrl || embedUrl;
  if (rawUrl) {
    const match = rawUrl.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})/,
    );
    if (match) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
  }
  if (capture.platform === 'youtube' && capture.embedId && /^[a-zA-Z0-9_-]{11}$/.test(capture.embedId)) {
    return `https://www.youtube.com/embed/${capture.embedId}`;
  }
  return null;
};

const CapturesPage = () => {
  const dispatch = useDispatch();
  const { captures, stats, loading } = useSelector((state) => state.captures);

  // Filter tabs: 'all', 'youtube', 'instagram', 'facebook', 'linkedin', 'web_image', 'reminders'
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'inbox', 'completed'
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'remindAt', 'priority'

  // Card modal states
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [lightboxImage, setLightboxImage] = useState(null);
  const [reminderModalItem, setReminderModalItem] = useState(null);
  const [newRemindDate, setNewRemindDate] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [expandedEmbeds, setExpandedEmbeds] = useState({});
  const [docPageIndexes, setDocPageIndexes] = useState({});
  const [deleteCaptureItem, setDeleteCaptureItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [maximizedCapture, setMaximizedCapture] = useState(null);
  const [maximizedNoteDraft, setMaximizedNoteDraft] = useState('');
  const [isSavingMaximizedNote, setIsSavingMaximizedNote] = useState(false);
  const [notificationPerm, setNotificationPerm] = useState(() => getNotificationPermission());

  const handleRequestOSPermission = async () => {
    const res = await requestNotificationPermission();
    setNotificationPerm(res);
    if (res === 'granted') {
      toast.success('OS notifications enabled! System alerts are active.', { icon: '🔔' });
    } else if (res === 'denied') {
      toast.error('Notification permission was blocked in browser settings.');
    }
  };

  const handleTestOSAlert = async () => {
    const res = await testOSNotification();
    if (res.success) {
      toast.success('Test alert pushed to your operating system!');
    } else if (res.reason === 'denied') {
      toast.error('Browser blocked notification. Please allow notifications.');
    } else {
      toast.error('Failed to deliver test notification.');
    }
    setNotificationPerm(getNotificationPermission());
  };

  const setReminderPresetTime = (preset) => {
    const now = new Date();
    if (preset === '1h') {
      setNewRemindDate(toLocalISOString(new Date(now.getTime() + 60 * 60 * 1000)));
    } else if (preset === 'tonight') {
      const d = new Date();
      d.setHours(20, 0, 0, 0);
      if (d <= now) d.setDate(d.getDate() + 1);
      setNewRemindDate(toLocalISOString(d));
    } else if (preset === 'tomorrow') {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      setNewRemindDate(toLocalISOString(d));
    } else if (preset === '2d') {
      const d = new Date();
      d.setDate(d.getDate() + 2);
      d.setHours(9, 0, 0, 0);
      setNewRemindDate(toLocalISOString(d));
    }
  };

  const handleOpenMaximize = (capture) => {
    setMaximizedCapture(capture);
    setMaximizedNoteDraft(capture.notes || '');
  };

  const handleSaveMaximizedNote = async () => {
    if (!maximizedCapture) return;
    setIsSavingMaximizedNote(true);
    try {
      await dispatch(
        updateCapture({
          id: maximizedCapture._id,
          notes: maximizedNoteDraft,
        }),
      ).unwrap();
      toast.success('Note saved in Vault');
      setMaximizedCapture((prev) => (prev ? { ...prev, notes: maximizedNoteDraft } : null));
    } catch (err) {
      toast.error('Failed to save note');
    } finally {
      setIsSavingMaximizedNote(false);
    }
  };

  const toggleEmbed = (id) => {
    setExpandedEmbeds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    loadCaptures();
  }, [activeTab, statusFilter, sortBy]);

  const loadCaptures = () => {
    const params = {
      sortBy,
    };
    if (activeTab === 'reminders') {
      params.remindersOnly = 'true';
    } else if (activeTab !== 'all') {
      params.platform = activeTab;
    }

    if (statusFilter !== 'all') {
      params.status = statusFilter;
    }

    if (searchTerm.trim()) {
      params.search = searchTerm.trim();
    }

    dispatch(fetchCaptures(params));
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadCaptures();
  };

  const handleCopyText = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleComplete = async (id) => {
    try {
      await dispatch(toggleCaptureComplete(id)).unwrap();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteCaptureItem) return;
    setIsDeleting(true);
    try {
      await dispatch(deleteCapture(deleteCaptureItem._id)).unwrap();
      toast.success('Removed from Vault');
      setDeleteCaptureItem(null);
    } catch (err) {
      toast.error('Failed to remove from Vault');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveNote = async (id) => {
    try {
      await dispatch(updateCapture({ id, data: { notes: noteDraft } })).unwrap();
      setEditingNoteId(null);
      toast.success('Note updated');
    } catch (err) {
      toast.error('Failed to update note');
    }
  };

  const handleSaveReminder = async () => {
    if (!reminderModalItem) return;
    try {
      const formattedDate = newRemindDate ? new Date(newRemindDate).toISOString() : null;
      const res = await dispatch(
        updateCapture({
          id: reminderModalItem._id,
          data: { remindAt: formattedDate },
        }),
      ).unwrap();

      if (newRemindDate) {
        if (isNotificationSupported() && getNotificationPermission() === 'default') {
          await requestNotificationPermission();
          setNotificationPerm(getNotificationPermission());
        }
        scheduleClientReminder(res || { ...reminderModalItem, remindAt: formattedDate });
        toast.success('Reminder scheduled! You will receive an OS alert.', { icon: '⏰' });
      } else {
        cancelClientReminder(reminderModalItem._id);
        toast.success('Reminder removed');
      }
      setReminderModalItem(null);
    } catch (err) {
      toast.error('Failed to update reminder');
    }
  };

  // Helper for platform badge
  const getPlatformMeta = (plat) => {
    switch (plat) {
      case 'whatsapp':
        return {
          label: 'WhatsApp',
          icon: <FaWhatsapp size={15} className="text-emerald-500" />,
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        };
      case 'instagram':
        return {
          label: 'Instagram',
          icon: <FaInstagram size={15} className="text-pink-500" />,
          bg: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
        };
      case 'facebook':
        return {
          label: 'Facebook',
          icon: <FaFacebook size={15} className="text-blue-500" />,
          bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        };
      case 'linkedin':
        return {
          label: 'LinkedIn',
          icon: <FaLinkedin size={15} className="text-sky-500" />,
          bg: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
        };
      case 'twitter':
        return {
          label: 'X (Twitter)',
          icon: <FaXTwitter size={14} className="text-white" />,
          bg: 'bg-zinc-800 text-white border-zinc-700',
        };
      case 'web_image':
      case 'web':
        return {
          label: 'Web & Image',
          icon: <IoImageOutline size={15} className="text-purple-400" />,
          bg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        };
      case 'youtube':
        return {
          label: 'YouTube',
          icon: <FaYoutube size={15} className="text-red-500" />,
          bg: 'bg-red-500/10 text-red-400 border-red-500/20',
        };
      default:
        return {
          label: 'Resource',
          icon: <FaGlobe size={15} className="text-accent" />,
          bg: 'bg-accent/10 text-accent border-accent/20',
        };
    }
  };

  // Platform tab counts helper
  const getTabCount = (tabId) => {
    if (!stats || !stats.platforms) return 0;
    if (tabId === 'all') return stats.total || 0;
    if (tabId === 'reminders') return stats.activeReminders || 0;
    return stats.platforms[tabId] || 0;
  };

  // Tab definitions
  const tabs = [
    { id: 'all', label: 'All Vault', icon: IoFlashOutline },
    { id: 'youtube', label: 'YouTube', icon: FaYoutube },
    { id: 'instagram', label: 'Instagram Reels', icon: FaInstagram },
    { id: 'facebook', label: 'Facebook', icon: FaFacebook },
    { id: 'linkedin', label: 'LinkedIn', icon: FaLinkedin },
    { id: 'twitter', label: 'X (Twitter)', icon: FaXTwitter },
    { id: 'web_image', label: 'Web & Images', icon: IoImageOutline },
    { id: 'reminders', label: '⏰ Reminders', icon: IoTimeOutline },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Vault Header with Glow & Stats */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-surface-raised via-surface to-surface-raised border border-subtle p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-subtle border border-accent/20 text-accent text-xs font-semibold">
              <IoFlashOutline size={15} />
              <span>Unified Knowledge Vault</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-display text-primary tracking-tight">
              Captures, Reels & <span className="gradient-text">Reminders</span>
            </h1>
            <p className="text-sm text-secondary max-w-xl">
              A unified powerhouse for all your untracked external resources: play YouTube videos & Shorts, watch Instagram Reels, review LinkedIn posts, save internet images, and never miss actionable reminders.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => dispatch(openQuickCapture())}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-accent to-accent-hover text-white text-sm font-bold shadow-xl shadow-accent/25 hover:shadow-accent/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <IoAddOutline size={20} />
              <span>+ Quick Capture</span>
              <span className="hidden sm:inline-block ml-1 text-[10px] bg-white/20 px-2 py-0.5 rounded-lg font-mono">
                Ctrl+K
              </span>
            </button>
          </div>
        </div>

        {/* Quick Stats Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-subtle">
          <div className="bg-surface/60 rounded-2xl p-3.5 border border-subtle">
            <span className="text-xs text-muted font-medium block">Total Saved</span>
            <span className="text-xl font-bold font-display text-primary">
              {stats?.total || 0}
            </span>
          </div>
          <div className="bg-surface/60 rounded-2xl p-3.5 border border-subtle">
            <span className="text-xs text-muted font-medium block">Inbox Review</span>
            <span className="text-xl font-bold font-display text-accent">
              {stats?.inbox || 0}
            </span>
          </div>
          <div className="bg-surface/60 rounded-2xl p-3.5 border border-subtle">
            <span className="text-xs text-muted font-medium block">Completed</span>
            <span className="text-xl font-bold font-display text-emerald-400">
              {stats?.completed || 0}
            </span>
          </div>
          <div className="bg-surface/60 rounded-2xl p-3.5 border border-subtle">
            <span className="text-xs text-muted font-medium block">Reminders Due</span>
            <span className="text-xl font-bold font-display text-amber-400">
              {stats?.remindersDue || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Categorized Platform Tabs & Search Toolbar */}
      <div className="space-y-4">
        {/* Platform Tabs Scroll Area */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const count = getTabCount(tab.id);
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-accent text-white shadow-md shadow-accent/25 scale-[1.02]'
                    : 'bg-surface hover:bg-surface-raised text-secondary hover:text-primary border border-subtle'
                }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-surface-raised text-muted'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Status Filters Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface p-3 rounded-2xl border border-subtle">
          {/* Search form */}
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search notes, links, sender..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface-raised border border-subtle text-xs text-primary placeholder:text-muted focus:outline-none focus:border-accent transition-all"
            />
            <IoSearchOutline
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
          </form>

          {/* Filters and Sort */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-surface-raised border border-subtle text-xs font-semibold text-primary focus:outline-none focus:border-accent cursor-pointer"
            >
              <option value="all">Status: All</option>
              <option value="inbox">Status: Inbox</option>
              <option value="completed">Status: Completed</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 rounded-xl bg-surface-raised border border-subtle text-xs font-semibold text-primary focus:outline-none focus:border-accent cursor-pointer"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="remindAt">Sort: Reminder Date</option>
              <option value="priority">Sort: Priority</option>
              <option value="oldest">Sort: Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid of Captured Resources */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="h-72 rounded-3xl bg-surface-raised/40 animate-pulse border border-subtle"
            />
          ))}
        </div>
      ) : captures.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-3xl bg-surface border border-subtle space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-accent-subtle text-accent flex items-center justify-center mx-auto shadow-inner">
            <IoFlashOutline size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-primary">No captures found</h3>
            <p className="text-xs text-muted max-w-sm mx-auto">
              {activeTab !== 'all'
                ? `You haven't saved any items under ${activeTab} yet.`
                : 'Your Vault is empty. Start capturing YouTube videos, Instagram Reels, or screenshots!'}
            </p>
          </div>
          <button
            onClick={() => dispatch(openQuickCapture({ tab: activeTab !== 'all' ? activeTab : 'link' }))}
            className="px-5 py-2.5 rounded-xl bg-accent text-white text-xs font-bold shadow-md shadow-accent/20 hover:scale-105 transition-all cursor-pointer"
          >
            Capture Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {captures.map((capture) => {
            const meta = getPlatformMeta(capture.platform);
            const isCompleted = capture.status === 'completed';
            const hasReminder = Boolean(capture.remindAt);
            const isReminderDue =
              hasReminder && new Date(capture.remindAt) <= new Date() && !isCompleted;

            return (
              <motion.div
                key={capture._id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`relative group rounded-3xl bg-surface border transition-all duration-300 flex flex-col overflow-hidden shadow-lg ${
                  isCompleted
                    ? 'border-subtle opacity-75 hover:opacity-100'
                    : isReminderDue
                      ? 'border-amber-500/50 shadow-amber-500/10'
                      : 'border-subtle hover:border-accent/40 hover:shadow-2xl hover:shadow-black/20'
                }`}
              >
                {/* Top Media / Player / Preview Area */}

                {/* 1. Instagram Reel Embed Player (Playable in-app) */}
                {capture.platform === 'instagram' && (
                  (() => {
                    const igEmbed = capture.embedUrl || getInstagramEmbedUrl(capture.sourceUrl || capture.url);
                    if (igEmbed) {
                      return (
                        <div className="w-full bg-black/40 relative aspect-[9/14] max-h-96 overflow-hidden flex items-center justify-center">
                          <iframe
                            src={igEmbed}
                            className="w-full h-full border-0"
                            allowTransparency="true"
                            allow="encrypted-media; clipboard-write;"
                            scrolling="no"
                            title={capture.title || 'Instagram Reel'}
                            loading="lazy"
                          />
                        </div>
                      );
                    }
                    if (isVideoUrl(capture.mediaUrl)) {
                      return (
                        <div className="w-full bg-black relative aspect-[9/16] max-h-[440px] overflow-hidden flex items-center justify-center border-b border-subtle">
                          <video
                            src={getVideoSrc(capture.mediaUrl)}
                            poster={capture.thumbnailUrl}
                            controls
                            playsInline
                            preload="metadata"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain"
                          />
                        </div>
                      );
                    }
                    return null;
                  })()
                )}

                {/* 2. Facebook Video / Reel / Post */}
                {capture.platform === 'facebook' && (
                  <>
                    {/* Media Display: Interactive Embed if expanded, else Direct Video if video file, else Visual Poster with Play Button */}
                    {expandedEmbeds[capture._id] ? (
                      <div className="w-full bg-black/60 relative aspect-video overflow-hidden border-b border-subtle flex items-center justify-center">
                        <iframe
                          src={capture.embedUrl || getFacebookEmbedUrl(capture.sourceUrl || capture.url)}
                          className="w-full h-full border-0"
                          scrolling="no"
                          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                          allowFullScreen={true}
                          title={capture.title || 'Facebook Video'}
                          loading="lazy"
                        />
                      </div>
                    ) : isDirectVideoFile(capture.mediaUrl) && capture.mediaUrl ? (
                      <UniversalVideoPlayer
                        src={capture.mediaUrl}
                        poster={capture.thumbnailUrl}
                        title={capture.title || 'Facebook Video'}
                        embedUrl={capture.embedUrl}
                        sourceUrl={capture.sourceUrl || capture.url}
                        platform="facebook"
                        className="border-b border-subtle"
                      />
                    ) : (capture.mediaUrl || capture.thumbnailUrl) ? (
                      <div
                        onClick={() => {
                          if (capture.embedUrl) {
                            toggleEmbed(capture._id);
                          } else {
                            setLightboxImage(capture.mediaUrl || capture.thumbnailUrl);
                          }
                        }}
                        className="w-full bg-surface-raised relative max-h-72 overflow-hidden cursor-pointer group/img flex items-center justify-center border-b border-subtle"
                      >
                        <img
                          src={capture.mediaUrl || capture.thumbnailUrl}
                          alt={capture.title || 'Facebook Video'}
                          className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500"
                          onError={(e) => {
                            e.currentTarget.parentElement.style.display = 'none';
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col items-center justify-center transition-all group-hover/img:bg-black/40">
                          <div className="w-12 h-12 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-lg transform group-hover/img:scale-110 transition-transform">
                            <IoPlayCircleOutline size={30} />
                          </div>
                          <span className="mt-2 text-[11px] font-semibold text-white/90 drop-shadow">
                            {capture.embedUrl ? 'Click to Play Embed' : 'View Media'}
                          </span>
                        </div>
                      </div>
                    ) : capture.embedUrl ? (
                      <div className="w-full bg-black/40 relative aspect-video overflow-hidden flex items-center justify-center border-b border-subtle">
                        <iframe
                          src={capture.embedUrl}
                          className="w-full h-full border-0"
                          scrolling="no"
                          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                          allowFullScreen={true}
                          title={capture.title || 'Facebook Video'}
                          loading="lazy"
                        />
                      </div>
                    ) : null}

                    {/* Author & Post Excerpt Header */}
                    <div className="p-4 bg-blue-950/20 border-b border-subtle">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <FaFacebook size={16} className="text-blue-500 flex-shrink-0" />
                          <span className="text-xs font-bold text-blue-200 truncate">
                            {capture.authorName || 'Facebook Video'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {capture.embedUrl && (
                            <button
                              onClick={() => toggleEmbed(capture._id)}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-blue-900/40 hover:bg-blue-800/60 text-blue-300 transition-colors cursor-pointer border border-blue-700/40"
                              title={expandedEmbeds[capture._id] ? 'Show Video Thumbnail' : 'Play Live Interactive Video'}
                            >
                              {expandedEmbeds[capture._id] ? 'Show Media' : 'Interactive'}
                            </button>
                          )}
                          {capture.rawContent && (
                            <button
                              onClick={() => handleCopyText(capture.rawContent, capture._id)}
                              className="text-[10px] text-blue-400 hover:text-blue-200 transition-colors cursor-pointer flex items-center gap-1"
                              title="Copy post content"
                            >
                              {copiedId === capture._id ? <FaCheck size={11} /> : <FaRegCopy size={11} />}
                              <span>Copy</span>
                            </button>
                          )}
                        </div>
                      </div>
                      {capture.rawContent && (
                        <p className="text-xs text-secondary line-clamp-3 leading-relaxed whitespace-pre-wrap font-sans">
                          {capture.rawContent}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* 3. YouTube Embed Video (Playable in-app) */}
                {(capture.platform === 'youtube' || Boolean(getYouTubeEmbedUrl(capture))) && (
                  <div className="w-full bg-black relative aspect-video overflow-hidden border-b border-subtle">
                    <iframe
                      src={getYouTubeEmbedUrl(capture)}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      title={capture.title || 'YouTube Video'}
                    />
                  </div>
                )}

                {/* 4. Web Image, Article Banner, or Direct Video Player */}
                {['web_image', 'web', 'other'].includes(capture.platform) && !getYouTubeEmbedUrl(capture) && (
                  (capture.mediaType === 'video' || isDirectVideoFile(capture.mediaUrl) || (capture.embedUrl && !['facebook', 'instagram', 'youtube', 'linkedin', 'twitter', 'whatsapp'].includes(capture.platform))) ? (
                    <UniversalVideoPlayer
                      src={capture.mediaUrl}
                      poster={capture.thumbnailUrl}
                      title={capture.title || 'Video Player'}
                      embedUrl={capture.embedUrl}
                      sourceUrl={capture.sourceUrl || capture.url}
                      platform={capture.platform}
                      className="border-b border-subtle"
                    />
                  ) : (capture.mediaUrl || capture.thumbnailUrl) ? (
                    <div
                      onClick={() => setLightboxImage(capture.mediaUrl || capture.thumbnailUrl)}
                      className="w-full bg-surface-raised relative max-h-64 overflow-hidden cursor-zoom-in group/img flex items-center justify-center border-b border-subtle"
                    >
                      <img
                        src={capture.mediaUrl || capture.thumbnailUrl}
                        alt={capture.title}
                        className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-semibold">
                        Click to Enlarge Image
                      </div>
                    </div>
                  ) : null
                )}

                {/* 5. WhatsApp Chat Bubble Card */}
                {capture.platform === 'whatsapp' && (
                  <div className="p-4 bg-gradient-to-b from-emerald-950/20 to-transparent border-b border-subtle">
                    <div className="bg-emerald-900/40 text-emerald-100 p-4 rounded-2xl rounded-tl-none border border-emerald-700/30 text-xs leading-relaxed shadow-sm relative">
                      {capture.authorName && (
                        <div className="font-bold text-xs text-emerald-300 mb-1 flex items-center justify-between">
                          <span>~ {capture.authorName}</span>
                          <button
                            onClick={() => handleCopyText(capture.rawContent, capture._id)}
                            className="text-[10px] text-emerald-400 hover:text-emerald-200 transition-colors cursor-pointer"
                            title="Copy message"
                          >
                            {copiedId === capture._id ? <FaCheck size={11} /> : <FaRegCopy size={11} />}
                          </button>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap font-sans text-xs">
                        {capture.rawContent}
                      </p>
                      <div className="text-[10px] text-emerald-300/60 text-right mt-2 flex items-center justify-end gap-1 font-mono">
                        <span>{new Date(capture.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>✓✓</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. LinkedIn Interactive Embed, Document / PDF Viewer, or Image Card */}
                {capture.platform === 'linkedin' && (
                  (() => {
                    const isDoc =
                      Boolean(capture.documentInfo) ||
                      capture.mediaType === 'document' ||
                      capture.mediaType === 'pdf';
                    const coverPages = capture.documentInfo?.coverPages || [];
                    const currentPageIdx = docPageIndexes[capture._id] || 0;
                    const activeCover = coverPages[currentPageIdx] || capture.thumbnailUrl || capture.mediaUrl;

                    return (
                      <>
                        {/* Media Display: Interactive Embed if expanded */}
                        {expandedEmbeds[capture._id] ? (
                          <div className="w-full bg-surface-raised relative h-[460px] overflow-hidden border-b border-subtle">
                            <iframe
                              src={capture.embedUrl}
                              className="w-full h-full border-0"
                              allowFullScreen={true}
                              title={capture.title || 'LinkedIn Post'}
                              loading="lazy"
                            />
                          </div>
                        ) : isDoc && activeCover ? (
                          /* Document / PDF Cover Carousel & Multi-page Preview */
                          <div className="w-full bg-neutral-950 relative overflow-hidden border-b border-subtle flex flex-col">
                            <div
                              onClick={() => setLightboxImage(activeCover)}
                              className="relative w-full aspect-[4/3] max-h-72 bg-neutral-900 overflow-hidden cursor-zoom-in group/img flex items-center justify-center select-none"
                            >
                              <img
                                src={activeCover}
                                alt={capture.documentInfo?.title || capture.title || 'LinkedIn Document'}
                                className="w-full h-full object-contain group-hover/img:scale-105 transition-transform duration-300"
                                onError={(e) => {
                                  e.currentTarget.parentElement.style.display = 'none';
                                }}
                              />

                              {/* Floating Document Badge & Actions */}
                              <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold backdrop-blur-md bg-sky-950/85 border border-sky-400/40 text-sky-200 shadow-md">
                                  <IoDocumentTextOutline size={13} className="text-sky-400" />
                                  <span>
                                    {capture.documentInfo?.totalPages
                                      ? `${capture.documentInfo.totalPages} Pages ${capture.documentInfo.type === 'presentation' ? 'Presentation' : 'PDF'}`
                                      : 'PDF Document'}
                                  </span>
                                </div>

                                <div className="pointer-events-auto flex items-center gap-1.5">
                                  {capture.documentInfo?.fileUrl && (
                                    <a
                                      href={capture.documentInfo.fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-950/85 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 backdrop-blur-md transition-all cursor-pointer shadow"
                                      title="Open original PDF / Google Drive file"
                                    >
                                      <span>Open File</span>
                                      <IoOpenOutline size={12} />
                                    </a>
                                  )}
                                  {capture.embedUrl && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleEmbed(capture._id);
                                      }}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-black/70 hover:bg-black border border-white/20 text-gray-200 backdrop-blur-md transition-all cursor-pointer shadow"
                                      title="View live interactive LinkedIn post"
                                    >
                                      <span>Interactive</span>
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Carousel Controls if multiple cover pages */}
                              {coverPages.length > 1 && (
                                <>
                                  {currentPageIdx > 0 && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDocPageIndexes((prev) => ({
                                          ...prev,
                                          [capture._id]: Math.max(0, currentPageIdx - 1),
                                        }));
                                      }}
                                      className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/75 hover:bg-black text-white border border-white/20 transition-all cursor-pointer z-10 shadow-lg"
                                      title="Previous page"
                                    >
                                      <IoChevronBack size={16} />
                                    </button>
                                  )}
                                  {currentPageIdx < coverPages.length - 1 && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDocPageIndexes((prev) => ({
                                          ...prev,
                                          [capture._id]: Math.min(coverPages.length - 1, currentPageIdx + 1),
                                        }));
                                      }}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/75 hover:bg-black text-white border border-white/20 transition-all cursor-pointer z-10 shadow-lg"
                                      title="Next page"
                                    >
                                      <IoChevronForward size={16} />
                                    </button>
                                  )}
                                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-black/75 backdrop-blur-sm border border-white/20 text-[10px] font-mono font-medium text-gray-200 z-10">
                                    Page {currentPageIdx + 1} of {coverPages.length}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        ) : isDirectVideoFile(capture.mediaUrl) && capture.mediaUrl ? (
                          <div className="w-full bg-black relative aspect-video overflow-hidden border-b border-subtle flex items-center justify-center">
                            <video
                              src={getVideoSrc(capture.mediaUrl)}
                              poster={capture.thumbnailUrl}
                              controls
                              playsInline
                              preload="metadata"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-contain"
                            />
                          </div>
                        ) : capture.embedUrl && !(capture.mediaUrl || capture.thumbnailUrl) ? (
                          <div className="w-full bg-surface-raised relative h-[440px] overflow-hidden border-b border-subtle">
                            <iframe
                              src={capture.embedUrl}
                              className="w-full h-full border-0"
                              allowFullScreen={true}
                              title={capture.title || 'LinkedIn Post'}
                              loading="lazy"
                            />
                          </div>
                        ) : (capture.mediaUrl || capture.thumbnailUrl) ? (
                          <div
                            onClick={() => setLightboxImage(capture.mediaUrl || capture.thumbnailUrl)}
                            className="w-full bg-surface-raised relative max-h-72 overflow-hidden cursor-zoom-in group/img flex items-center justify-center border-b border-subtle"
                          >
                            <img
                              src={capture.mediaUrl || capture.thumbnailUrl}
                              alt={capture.title || 'LinkedIn Post'}
                              className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500"
                              onError={(e) => {
                                e.currentTarget.parentElement.style.display = 'none';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-semibold gap-1.5">
                              <span>Click to Enlarge</span>
                            </div>
                          </div>
                        ) : null}

                        {/* Author & Post Excerpt Header */}
                        <div className="p-4 bg-sky-950/20 border-b border-subtle">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <FaLinkedin size={18} className="text-sky-400 flex-shrink-0" />
                              <span className="text-xs font-bold text-sky-200 truncate">
                                {capture.authorName || 'LinkedIn Post'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button
                                onClick={() => handleOpenMaximize(capture)}
                                className="text-[10px] px-2 py-0.5 rounded-md bg-sky-900/60 hover:bg-sky-800 text-sky-200 transition-colors cursor-pointer border border-sky-700/50 flex items-center gap-1"
                                title="Maximize to Wide Screen & Notes"
                              >
                                <IoExpandOutline size={11} />
                                <span>Maximize</span>
                              </button>
                              {capture.embedUrl && !isDoc && (
                                <button
                                  onClick={() => toggleEmbed(capture._id)}
                                  className="text-[10px] px-2 py-0.5 rounded-md bg-sky-900/40 hover:bg-sky-800/60 text-sky-300 transition-colors cursor-pointer border border-sky-700/40"
                                  title={expandedEmbeds[capture._id] ? 'Show Media' : 'View Live Interactive Post'}
                                >
                                  {expandedEmbeds[capture._id] ? 'Show Media' : 'Interactive'}
                                </button>
                              )}
                              {capture.rawContent && (
                                <button
                                  onClick={() => handleCopyText(capture.rawContent, capture._id)}
                                  className="text-[10px] text-sky-400 hover:text-sky-200 transition-colors cursor-pointer flex items-center gap-1"
                                  title="Copy post content"
                                >
                                  {copiedId === capture._id ? <FaCheck size={11} /> : <FaRegCopy size={11} />}
                                  <span>Copy</span>
                                </button>
                              )}
                            </div>
                          </div>
                          {capture.documentInfo?.title && (
                            <p className="text-xs font-bold text-sky-300 line-clamp-1 mb-1 flex items-center gap-1.5">
                              <IoDocumentTextOutline size={13} className="text-sky-400 flex-shrink-0" />
                              <span>{capture.documentInfo.title}</span>
                            </p>
                          )}
                          {capture.rawContent && (
                            <p className="text-xs text-secondary line-clamp-3 leading-relaxed">
                              {capture.rawContent}
                            </p>
                          )}
                        </div>
                      </>
                    );
                  })()
                )}

                {/* 7. Twitter / X Interactive Fast Embed or High-Res Image (CloudStream removed per user request) */}
                {capture.platform === 'twitter' && (
                  <>
                    {/* Media Display: Fast Interactive Embed (clean single view without congested 3 panels) */}
                    {capture.embedUrl ? (
                      <div className="w-full bg-[#000000] relative min-h-[380px] max-h-[520px] overflow-y-auto border-b border-subtle flex items-center justify-center">
                        <iframe
                          src={capture.embedUrl}
                          className="w-full h-full min-h-[380px] border-0"
                          allowFullScreen={true}
                          title={capture.title || 'X Post'}
                          loading="lazy"
                        />
                      </div>
                    ) : (capture.mediaUrl || capture.thumbnailUrl) ? (
                      <div
                        onClick={() => setLightboxImage(capture.mediaUrl || capture.thumbnailUrl)}
                        className="w-full bg-surface-raised relative max-h-72 overflow-hidden cursor-zoom-in group/img flex items-center justify-center border-b border-subtle"
                      >
                        <img
                          src={capture.mediaUrl || capture.thumbnailUrl}
                          alt={capture.title || 'X Post'}
                          className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500"
                          onError={(e) => {
                            e.currentTarget.parentElement.style.display = 'none';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-semibold gap-1.5">
                          <span>Click to Enlarge</span>
                        </div>
                      </div>
                    ) : null}

                    {/* Compact Author & Actions Bar (without duplicate repeated text) */}
                    <div className="px-4 py-2 bg-zinc-950/60 border-b border-subtle flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FaXTwitter size={14} className="text-white flex-shrink-0" />
                        <span className="text-xs font-bold text-white truncate">
                          {capture.authorName || 'Post on X'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleOpenMaximize(capture)}
                          className="text-[10px] text-zinc-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/50"
                          title="Maximize to Wide Screen & Notes"
                        >
                          <IoExpandOutline size={12} />
                          <span>Maximize</span>
                        </button>
                        {capture.rawContent && (
                          <button
                            onClick={() => handleCopyText(capture.rawContent, capture._id)}
                            className="text-[10px] text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800/60 hover:bg-zinc-700 border border-zinc-700/40"
                            title="Copy tweet text"
                          >
                            {copiedId === capture._id ? <FaCheck size={11} className="text-emerald-400" /> : <FaRegCopy size={11} />}
                            <span>Copy Text</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Card Body Details */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    {/* Platform Tag & Priority */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold uppercase tracking-wider border ${meta.bg}`}
                        >
                          {meta.icon}
                          <span>{meta.label}</span>
                        </span>
                        {capture.platform === 'linkedin' && (capture.documentInfo || capture.mediaType === 'document' || capture.mediaType === 'pdf') ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30">
                            <IoDocumentTextOutline size={11} />
                            <span>{capture.documentInfo?.totalPages ? `${capture.documentInfo.totalPages}P Document` : 'PDF / Doc'}</span>
                          </span>
                        ) : (capture.mediaType === 'video' || isVideoUrl(capture.mediaUrl)) && !['twitter', 'linkedin'].includes(capture.platform) ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            Video
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Priority Badge */}
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            capture.priority === 'urgent'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : capture.priority === 'high'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-surface-raised text-muted'
                          }`}
                        >
                          {capture.priority}
                        </span>

                        {/* Maximize to Wide View Button */}
                        <button
                          onClick={() => handleOpenMaximize(capture)}
                          title="Maximize to Wide Screen & Notes"
                          className="p-1 rounded-lg text-muted hover:text-accent hover:bg-surface-raised transition-all cursor-pointer flex items-center justify-center"
                        >
                          <IoExpandOutline size={18} />
                        </button>

                        {/* Status Checkbox Button */}
                        <button
                          onClick={() => handleToggleComplete(capture._id)}
                          title={isCompleted ? 'Mark as Inbox' : 'Mark as Done'}
                          className={`p-1 rounded-lg transition-all cursor-pointer ${
                            isCompleted
                              ? 'text-emerald-400 bg-emerald-500/10'
                              : 'text-muted hover:text-emerald-400 hover:bg-surface-raised'
                          }`}
                        >
                          {isCompleted ? (
                            <IoCheckmarkCircle size={20} />
                          ) : (
                            <IoCheckmarkCircleOutline size={20} />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Title */}
                    <h3
                      className={`text-sm sm:text-base font-bold text-primary line-clamp-2 ${
                        isCompleted ? 'line-through text-muted' : ''
                      }`}
                    >
                      {capture.title || 'Saved Resource'}
                    </h3>

                    {/* Source URL link if available */}
                    {capture.sourceUrl && (
                      <a
                        href={capture.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline font-medium break-all line-clamp-1"
                      >
                        <FaExternalLinkAlt size={10} />
                        <span className="truncate">{capture.sourceUrl}</span>
                      </a>
                    )}

                    {/* Personal Notes Section */}
                    <div className="pt-2">
                      {editingNoteId === capture._id ? (
                        <div className="space-y-2">
                          <textarea
                            rows={3}
                            value={noteDraft}
                            onChange={(e) => setNoteDraft(e.target.value)}
                            placeholder="Add your note or reflection..."
                            className="w-full p-2.5 rounded-xl bg-surface-raised border border-accent text-xs text-primary focus:outline-none resize-none"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditingNoteId(null)}
                              className="px-2 py-1 rounded-lg text-[11px] text-muted hover:text-primary"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveNote(capture._id)}
                              className="px-3 py-1 rounded-lg bg-accent text-white text-[11px] font-bold"
                            >
                              Save Note
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => {
                            setEditingNoteId(capture._id);
                            setNoteDraft(capture.notes || '');
                          }}
                          className="group/note p-2.5 rounded-xl bg-surface-raised/60 hover:bg-surface-raised border border-subtle transition-all cursor-pointer"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold text-muted uppercase tracking-wider flex items-center gap-1">
                              <IoDocumentTextOutline size={12} className="text-accent" />
                              <span>Personal Note</span>
                            </span>
                            <FaEdit size={11} className="text-muted group-hover/note:text-accent transition-colors" />
                          </div>
                          <p className="text-xs text-secondary line-clamp-3">
                            {capture.notes ? capture.notes : <span className="text-muted italic">+ Click to add note or reflection...</span>}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Tags */}
                    {capture.tags && capture.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {capture.tags.map((t, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-surface-raised text-muted border border-subtle font-mono"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Bottom Bar (Reminder Status & Actions) */}
                  <div className="pt-3 border-t border-subtle flex items-center justify-between text-xs">
                    {/* Reminder indicator / click to edit */}
                    <button
                      onClick={() => {
                        setReminderModalItem(capture);
                        setNewRemindDate(
                          capture.remindAt
                            ? toLocalISOString(capture.remindAt)
                            : toLocalISOString(new Date(Date.now() + 60 * 60 * 1000)),
                        );
                        setNotificationPerm(getNotificationPermission());
                      }}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                        hasReminder
                          ? isReminderDue
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse'
                            : 'bg-surface-raised text-primary border border-subtle'
                          : 'text-muted hover:text-primary hover:bg-surface-raised'
                      }`}
                    >
                      <IoTimeOutline size={14} />
                      <span>
                        {hasReminder
                          ? (isReminderDue ? 'Due: ' : '') +
                            new Date(capture.remindAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '+ Set Reminder'}
                      </span>
                    </button>

                    <div className="flex items-center gap-1">
                      {/* Maximize action */}
                      <button
                        onClick={() => handleOpenMaximize(capture)}
                        className="p-1.5 rounded-lg text-muted hover:text-accent hover:bg-surface-raised transition-colors cursor-pointer"
                        title="Maximize to Wide Screen & Notes"
                      >
                        <IoExpandOutline size={15} />
                      </button>

                      {/* Delete action */}
                      <button
                        onClick={() => setDeleteCaptureItem(capture)}
                        className="p-1.5 rounded-lg text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Remove from Vault"
                      >
                        <FaTrashAlt size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Fullscreen Wide Screen / Maximize Modal with Side-by-Side Notes Workspace */}
      <AnimatePresence>
        {maximizedCapture && (() => {
          const cap = maximizedCapture;
          const meta = getPlatformMeta(cap.platform);
          const isCompleted = cap.status === 'completed';
          const isDoc = Boolean(cap.documentInfo) || cap.mediaType === 'document' || cap.mediaType === 'pdf';
          const coverPages = cap.documentInfo?.coverPages || [];
          const maxDocPageIdx = docPageIndexes[cap._id] || 0;
          const activeCover = coverPages[maxDocPageIdx] || cap.thumbnailUrl || cap.mediaUrl;
          const docFileUrl = cap.documentInfo?.fileUrl || (cap.sourceUrl && (cap.sourceUrl.includes('drive.google.com') || cap.sourceUrl.toLowerCase().endsWith('.pdf')) ? cap.sourceUrl : null);

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-xl">
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 15 }}
                transition={{ duration: 0.2 }}
                className="relative w-full max-w-7xl h-[92vh] max-h-[920px] rounded-3xl bg-surface border border-subtle shadow-2xl flex flex-col overflow-hidden"
              >
                {/* Modal Header */}
                <div className="px-5 py-3.5 bg-surface-raised/80 border-b border-subtle flex items-center justify-between gap-4 flex-shrink-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold uppercase tracking-wider border ${meta.bg}`}>
                      {meta.icon}
                      <span>{meta.label}</span>
                    </span>
                    {isDoc && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30">
                        <IoDocumentTextOutline size={11} />
                        <span>{cap.documentInfo?.totalPages ? `${cap.documentInfo.totalPages}P Document` : 'Document / PDF'}</span>
                      </span>
                    )}
                    <h2 className="text-sm sm:text-base font-bold text-primary truncate max-w-lg">
                      {cap.title || 'Saved Resource'}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Status Toggle */}
                    <button
                      onClick={() => {
                        handleToggleComplete(cap._id);
                        setMaximizedCapture((prev) => prev ? { ...prev, status: prev.status === 'completed' ? 'inbox' : 'completed' } : null);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                        isCompleted
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-surface text-secondary border-subtle hover:text-emerald-400'
                      }`}
                      title={isCompleted ? 'Mark as Inbox' : 'Mark as Done'}
                    >
                      {isCompleted ? <IoCheckmarkCircle size={16} /> : <IoCheckmarkCircleOutline size={16} />}
                      <span className="hidden sm:inline">{isCompleted ? 'Completed' : 'Mark as Done'}</span>
                    </button>

                    {/* Set Reminder */}
                    <button
                      onClick={() => {
                        setReminderModalItem(cap);
                        setNewRemindDate(cap.remindAt ? new Date(cap.remindAt).toISOString().slice(0, 16) : '');
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface border border-subtle text-secondary hover:text-primary transition-all cursor-pointer"
                      title="Schedule Reminder"
                    >
                      <IoTimeOutline size={16} />
                      <span className="hidden sm:inline">Reminder</span>
                    </button>

                    {/* Open External URL */}
                    {cap.sourceUrl && (
                      <a
                        href={cap.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl text-muted hover:text-primary hover:bg-surface border border-subtle transition-colors"
                        title="Open source in new tab"
                      >
                        <IoOpenOutline size={16} />
                      </a>
                    )}

                    {/* Close Modal */}
                    <button
                      onClick={() => setMaximizedCapture(null)}
                      className="p-2 rounded-xl text-muted hover:text-primary hover:bg-surface border border-subtle transition-colors cursor-pointer"
                      title="Close"
                    >
                      <IoClose size={18} />
                    </button>
                  </div>
                </div>

                {/* Modal Body: Left Media Viewer (65%) + Right Notes & Meta Sidebar (35%) */}
                <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
                  {/* Left Viewer Section */}
                  <div className="flex-1 lg:w-3/5 xl:w-2/3 bg-black flex flex-col justify-center items-center relative overflow-hidden border-b lg:border-b-0 lg:border-r border-subtle p-2 sm:p-4">
                    {/* 1. YouTube */}
                    {(cap.platform === 'youtube' || Boolean(getYouTubeEmbedUrl(cap))) ? (
                      <div className="w-full h-full max-w-4xl aspect-video rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center bg-black">
                        <iframe
                          src={getYouTubeEmbedUrl(cap)}
                          className="w-full h-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          title={cap.title || 'YouTube Video'}
                        />
                      </div>
                    ) : cap.platform === 'twitter' ? (
                      /* 2. Twitter / X Wide Embed */
                      <div className="w-full h-full overflow-y-auto flex items-center justify-center p-2 bg-black">
                        {cap.embedUrl ? (
                          <iframe
                            src={cap.embedUrl}
                            className="w-full max-w-xl h-full min-h-[520px] border-0 rounded-2xl shadow-2xl"
                            allowFullScreen={true}
                            title={cap.title || 'X Post'}
                          />
                        ) : (cap.mediaUrl || cap.thumbnailUrl) ? (
                          <img
                            src={cap.mediaUrl || cap.thumbnailUrl}
                            alt={cap.title || 'X Post'}
                            className="max-h-[80vh] max-w-full object-contain rounded-2xl shadow-2xl"
                          />
                        ) : (
                          <div className="text-center p-8 text-muted">
                            <p>Post on X</p>
                          </div>
                        )}
                      </div>
                    ) : cap.platform === 'linkedin' ? (
                      /* 3. LinkedIn Document Carousel or Embed */
                      isDoc && activeCover ? (
                        <div className="w-full h-full flex flex-col items-center justify-center relative p-2 select-none">
                          <div className="relative max-h-[72vh] max-w-full flex items-center justify-center group/docimg">
                            <img
                              src={activeCover}
                              alt={cap.documentInfo?.title || cap.title || 'LinkedIn Document'}
                              className="max-h-[72vh] max-w-full object-contain rounded-2xl shadow-2xl border border-white/10"
                            />
                            {/* Document actions & slide counter overlay */}
                            <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md bg-sky-950/85 border border-sky-400/40 text-sky-200 shadow-md">
                                <IoDocumentTextOutline size={14} />
                                <span>{cap.documentInfo?.totalPages ? `${cap.documentInfo.totalPages} Pages Document` : 'Presentation / PDF'}</span>
                              </span>
                              {docFileUrl && (
                                <a
                                  href={docFileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-400/40 text-emerald-200 backdrop-blur-md transition-all cursor-pointer shadow"
                                >
                                  <span>Open Original File</span>
                                  <IoOpenOutline size={13} />
                                </a>
                              )}
                            </div>

                            {/* Carousel Next/Prev */}
                            {coverPages.length > 1 && (
                              <>
                                {maxDocPageIdx > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setDocPageIndexes((prev) => ({ ...prev, [cap._id]: Math.max(0, maxDocPageIdx - 1) }))}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/80 hover:bg-black text-white border border-white/20 transition-all cursor-pointer shadow-xl z-20"
                                    title="Previous slide"
                                  >
                                    <IoChevronBack size={20} />
                                  </button>
                                )}
                                {maxDocPageIdx < coverPages.length - 1 && (
                                  <button
                                    type="button"
                                    onClick={() => setDocPageIndexes((prev) => ({ ...prev, [cap._id]: Math.min(coverPages.length - 1, maxDocPageIdx + 1) }))}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/80 hover:bg-black text-white border border-white/20 transition-all cursor-pointer shadow-xl z-20"
                                    title="Next slide"
                                  >
                                    <IoChevronForward size={20} />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                          {coverPages.length > 1 && (
                            <div className="mt-3 px-3 py-1 rounded-full bg-black/80 backdrop-blur-sm border border-white/20 text-xs font-mono font-medium text-gray-200">
                              Slide {maxDocPageIdx + 1} of {coverPages.length}
                            </div>
                          )}
                        </div>
                      ) : cap.embedUrl ? (
                        <div className="w-full h-full max-w-2xl bg-surface-raised relative rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center">
                          <iframe
                            src={cap.embedUrl}
                            className="w-full h-full border-0"
                            allowFullScreen={true}
                            title={cap.title || 'LinkedIn Post'}
                            loading="lazy"
                          />
                        </div>
                      ) : (cap.mediaUrl || cap.thumbnailUrl) ? (
                        <img
                          src={cap.mediaUrl || cap.thumbnailUrl}
                          alt={cap.title || 'LinkedIn Post'}
                          className="max-h-[80vh] max-w-full object-contain rounded-2xl shadow-2xl"
                        />
                      ) : null
                    ) : cap.platform === 'instagram' ? (
                      /* 4. Instagram */
                      <div className="w-full h-full flex items-center justify-center p-2 bg-black">
                        {cap.embedUrl || getInstagramEmbedUrl(cap.sourceUrl || cap.url) ? (
                          <iframe
                            src={cap.embedUrl || getInstagramEmbedUrl(cap.sourceUrl || cap.url)}
                            className="w-full max-w-[420px] h-full max-h-[80vh] border-0 rounded-2xl shadow-2xl"
                            allowTransparency="true"
                            allow="encrypted-media; clipboard-write;"
                            scrolling="no"
                            title={cap.title || 'Instagram Reel'}
                          />
                        ) : isVideoUrl(cap.mediaUrl) ? (
                          <video
                            src={getVideoSrc(cap.mediaUrl)}
                            poster={cap.thumbnailUrl}
                            controls
                            playsInline
                            preload="metadata"
                            referrerPolicy="no-referrer"
                            className="max-h-[80vh] max-w-full rounded-2xl shadow-2xl"
                          />
                        ) : null}
                      </div>
                    ) : cap.platform === 'facebook' ? (
                      /* 5. Facebook */
                      <div className="w-full h-full max-w-4xl aspect-video rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center bg-black">
                        {cap.embedUrl || getFacebookEmbedUrl(cap.sourceUrl || cap.url) ? (
                          <iframe
                            src={cap.embedUrl || getFacebookEmbedUrl(cap.sourceUrl || cap.url)}
                            className="w-full h-full border-0"
                            scrolling="no"
                            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                            allowFullScreen={true}
                            title={cap.title || 'Facebook Video'}
                          />
                        ) : isDirectVideoFile(cap.mediaUrl) ? (
                          <UniversalVideoPlayer
                            src={cap.mediaUrl}
                            poster={cap.thumbnailUrl}
                            title={cap.title || 'Facebook Video'}
                            embedUrl={cap.embedUrl}
                            sourceUrl={cap.sourceUrl || cap.url}
                            platform="facebook"
                            className="w-full h-full"
                          />
                        ) : (cap.mediaUrl || cap.thumbnailUrl) ? (
                          <img
                            src={cap.mediaUrl || cap.thumbnailUrl}
                            alt={cap.title}
                            className="max-h-[80vh] max-w-full object-contain rounded-2xl shadow-2xl"
                          />
                        ) : null}
                      </div>
                    ) : (cap.mediaUrl || cap.thumbnailUrl) ? (
                      /* 6. Default Image or Video */
                      isDirectVideoFile(cap.mediaUrl) ? (
                        <video
                          src={getVideoSrc(cap.mediaUrl)}
                          poster={cap.thumbnailUrl}
                          controls
                          playsInline
                          className="max-h-[80vh] max-w-full rounded-2xl shadow-2xl"
                        />
                      ) : (
                        <img
                          src={cap.mediaUrl || cap.thumbnailUrl}
                          alt={cap.title}
                          className="max-h-[80vh] max-w-full object-contain rounded-2xl shadow-2xl"
                        />
                      )
                    ) : (
                      <div className="text-center p-8 text-muted">
                        <p className="text-sm">Resource content</p>
                      </div>
                    )}
                  </div>

                  {/* Right Notes & Details Sidebar */}
                  <div className="w-full lg:w-2/5 xl:w-1/3 flex flex-col h-full bg-surface-raised/40 overflow-y-auto p-5 sm:p-6 space-y-6">
                    {/* Meta & Excerpt */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-muted">
                        <span className="font-semibold text-primary">{cap.authorName || meta.label}</span>
                        <span>{new Date(cap.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>

                      <h3 className="text-base sm:text-lg font-bold text-primary leading-snug">
                        {cap.title || 'Saved Resource'}
                      </h3>

                      {cap.sourceUrl && (
                        <a
                          href={cap.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline font-medium break-all line-clamp-2"
                        >
                          <FaExternalLinkAlt size={11} />
                          <span>{cap.sourceUrl}</span>
                        </a>
                      )}

                      {/* Raw Content Excerpt if present */}
                      {cap.rawContent && (
                        <div className="p-3.5 rounded-2xl bg-surface border border-subtle space-y-2">
                          <div className="flex items-center justify-between text-[11px] text-muted">
                            <span className="font-semibold uppercase tracking-wider">Original Post Content</span>
                            <button
                              onClick={() => handleCopyText(cap.rawContent, `max-${cap._id}`)}
                              className="text-accent hover:underline flex items-center gap-1 cursor-pointer font-medium"
                            >
                              {copiedId === `max-${cap._id}` ? <FaCheck size={11} className="text-emerald-400" /> : <FaRegCopy size={11} />}
                              <span>Copy</span>
                            </button>
                          </div>
                          <p className="text-xs text-secondary leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap font-sans">
                            {cap.rawContent}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Dedicated Notes Workspace */}
                    <div className="flex-1 flex flex-col space-y-3 pt-2 border-t border-subtle">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                          <IoDocumentTextOutline size={15} className="text-accent" />
                          <span>Personal Notes & Reflections</span>
                        </span>
                        <span className="text-[11px] text-muted font-mono">
                          {maximizedNoteDraft.length} chars
                        </span>
                      </div>

                      <textarea
                        rows={8}
                        value={maximizedNoteDraft}
                        onChange={(e) => setMaximizedNoteDraft(e.target.value)}
                        placeholder="Capture key insights, quotes, action items, or study notes for this resource..."
                        className="w-full flex-1 min-h-[160px] p-4 rounded-2xl bg-surface border border-subtle focus:border-accent text-xs text-primary leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-accent transition-all placeholder:text-muted/60"
                      />

                      <div className="flex items-center justify-between gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => setMaximizedNoteDraft('')}
                          className="text-xs text-muted hover:text-red-400 transition-colors cursor-pointer"
                        >
                          Clear Note
                        </button>

                        <button
                          type="button"
                          onClick={handleSaveMaximizedNote}
                          disabled={isSavingMaximizedNote}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent/90 active:scale-95 text-white text-xs font-bold shadow-md shadow-accent/20 transition-all cursor-pointer disabled:opacity-60"
                        >
                          {isSavingMaximizedNote ? (
                            <span>Saving...</span>
                          ) : (
                            <>
                              <IoSaveOutline size={15} />
                              <span>Save Note</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Lightbox Modal for Full-Resolution Image Viewing */}
      <AnimatePresence>
        {lightboxImage && (
          <div
            onClick={() => setLightboxImage(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-zoom-out"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl"
            >
              <img
                src={lightboxImage}
                alt="Full preview"
                className="max-h-[85vh] w-auto object-contain rounded-2xl shadow-2xl"
              />
              <button
                onClick={() => setLightboxImage(null)}
                className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black transition-colors"
              >
                <IoClose size={20} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reminder Edit Modal */}
      <AnimatePresence>
        {reminderModalItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-3xl bg-surface-raised border border-strong p-6 space-y-4 shadow-2xl shadow-black/80"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-accent-subtle text-accent">
                    <IoTimeOutline size={18} />
                  </div>
                  <h3 className="text-sm font-bold text-primary font-display">
                    Schedule Reminder
                  </h3>
                </div>
                <button
                  onClick={() => setReminderModalItem(null)}
                  className="text-muted hover:text-primary p-1 cursor-pointer"
                >
                  <IoClose size={18} />
                </button>
              </div>

              <div className="p-2.5 rounded-xl bg-surface border border-subtle flex items-center gap-2.5">
                {reminderModalItem.thumbnailUrl && (
                  <img
                    src={reminderModalItem.thumbnailUrl}
                    alt=""
                    className="w-9 h-9 object-cover rounded-lg border border-subtle flex-shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-primary truncate">
                    {reminderModalItem.title || 'Untitled Resource'}
                  </p>
                  <p className="text-[10px] text-muted uppercase font-mono tracking-wider">
                    {reminderModalItem.platform}
                  </p>
                </div>
              </div>

              {/* OS System Notification Status / Permission Banner */}
              <div className="rounded-xl border transition-all text-xs overflow-hidden">
                {notificationPerm === 'granted' ? (
                  <div className="flex items-center justify-between text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span className="text-[11px] font-semibold text-emerald-300">
                        OS System Alerts Active
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleTestOSAlert}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 transition-colors cursor-pointer"
                      title="Test push notification right on your OS"
                    >
                      Test Alert
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-amber-400 bg-amber-500/10 border border-amber-500/20 p-2.5">
                    <span className="text-[11px] font-medium text-amber-300">
                      OS notifications disabled
                    </span>
                    <button
                      type="button"
                      onClick={handleRequestOSPermission}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-accent text-white shadow hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1"
                    >
                      🔔 Enable
                    </button>
                  </div>
                )}
              </div>

              {/* Quick Presets */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-muted block">Quick Presets</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setReminderPresetTime('1h')}
                    className="px-2.5 py-1.5 rounded-xl bg-surface hover:bg-surface-raised border border-subtle text-xs text-secondary hover:text-primary transition-colors text-left cursor-pointer"
                  >
                    ⚡ +1 Hour
                  </button>
                  <button
                    type="button"
                    onClick={() => setReminderPresetTime('tonight')}
                    className="px-2.5 py-1.5 rounded-xl bg-surface hover:bg-surface-raised border border-subtle text-xs text-secondary hover:text-primary transition-colors text-left cursor-pointer"
                  >
                    🌙 Tonight (8 PM)
                  </button>
                  <button
                    type="button"
                    onClick={() => setReminderPresetTime('tomorrow')}
                    className="px-2.5 py-1.5 rounded-xl bg-surface hover:bg-surface-raised border border-subtle text-xs text-secondary hover:text-primary transition-colors text-left cursor-pointer"
                  >
                    ☀️ Tomorrow (9 AM)
                  </button>
                  <button
                    type="button"
                    onClick={() => setReminderPresetTime('2d')}
                    className="px-2.5 py-1.5 rounded-xl bg-surface hover:bg-surface-raised border border-subtle text-xs text-secondary hover:text-primary transition-colors text-left cursor-pointer"
                  >
                    📅 In 2 Days
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted block mb-1">
                  Custom Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={newRemindDate}
                  onChange={(e) => setNewRemindDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-surface border border-subtle text-xs text-primary focus:outline-none focus:border-accent"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setNewRemindDate('')}
                  className="text-xs text-red-400 hover:underline cursor-pointer"
                >
                  Clear Reminder
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setReminderModalItem(null)}
                    className="px-3 py-1.5 rounded-xl text-xs text-secondary hover:bg-surface cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveReminder}
                    className="px-4 py-1.5 rounded-xl bg-accent text-white text-xs font-bold shadow hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    Save Reminder
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Remove from Vault Confirmation Popup */}
      <ConfirmDialog
        isOpen={Boolean(deleteCaptureItem)}
        title="Remove from Vault"
        message={
          deleteCaptureItem ? (
            <div className="space-y-3">
              <p className="text-secondary text-sm">
                Are you sure you want to remove this item from your Vault? This action cannot be undone.
              </p>
              <div className="p-3 rounded-xl bg-surface border border-subtle flex items-center gap-3">
                {deleteCaptureItem.thumbnailUrl && (
                  <img
                    src={deleteCaptureItem.thumbnailUrl}
                    alt=""
                    className="w-12 h-12 object-cover rounded-lg flex-shrink-0 border border-subtle"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-primary truncate">
                    {deleteCaptureItem.title || 'Untitled Resource'}
                  </h4>
                  <p className="text-[11px] text-muted truncate mt-0.5">
                    {deleteCaptureItem.authorName || deleteCaptureItem.platform?.toUpperCase()}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            'Are you sure you want to remove this item from your Vault?'
          )
        }
        confirmText="Remove"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteCaptureItem(null)}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default CapturesPage;
