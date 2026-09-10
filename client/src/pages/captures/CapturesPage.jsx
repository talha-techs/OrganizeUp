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
} from 'react-icons/io5';
import {
  fetchCaptures,
  toggleCaptureComplete,
  deleteCapture,
  updateCapture,
  openQuickCapture,
} from '../../redux/slices/captureSlice';

const isVideoUrl = (url) =>
  typeof url === 'string' &&
  (/\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(url) || url.includes('video.twimg.com'));

const CapturesPage = () => {
  const dispatch = useDispatch();
  const { captures, stats, loading } = useSelector((state) => state.captures);

  // Filter tabs: 'all', 'whatsapp', 'instagram', 'facebook', 'linkedin', 'web_image', 'reminders'
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

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this from your Vault?')) return;
    try {
      await dispatch(deleteCapture(id)).unwrap();
      toast.success('Removed from Vault');
    } catch (err) {
      toast.error('Failed to delete capture');
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
      await dispatch(
        updateCapture({
          id: reminderModalItem._id,
          data: { remindAt: newRemindDate || null },
        }),
      ).unwrap();
      setReminderModalItem(null);
      toast.success(newRemindDate ? 'Reminder updated!' : 'Reminder removed');
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
    { id: 'whatsapp', label: 'WhatsApp', icon: FaWhatsapp },
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
              A unified powerhouse for all your untracked external resources: play Instagram Reels, review WhatsApp chats, save internet images, and never miss actionable reminders.
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
                : 'Your Vault is empty. Start capturing Instagram Reels, WhatsApp insights, or screenshots!'}
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
              hasReminder && new Date(capture.remindAt) <= new Date() && !capture.reminderFired;

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
                  isVideoUrl(capture.mediaUrl) ? (
                    <div className="w-full bg-black relative aspect-[9/16] max-h-[440px] overflow-hidden flex items-center justify-center border-b border-subtle">
                      <video
                        src={capture.mediaUrl}
                        poster={capture.thumbnailUrl}
                        controls
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : capture.embedUrl ? (
                    <div className="w-full bg-black/40 relative aspect-[9/14] max-h-96 overflow-hidden flex items-center justify-center">
                      <iframe
                        src={capture.embedUrl}
                        className="w-full h-full border-0"
                        allowTransparency="true"
                        allow="encrypted-media"
                        title={capture.title || 'Instagram Reel'}
                        loading="lazy"
                      />
                    </div>
                  ) : null
                )}

                {/* 2. Facebook Video Player (Playable in-app) */}
                {capture.platform === 'facebook' && (
                  isVideoUrl(capture.mediaUrl) ? (
                    <div className="w-full bg-black relative aspect-video overflow-hidden flex items-center justify-center border-b border-subtle">
                      <video
                        src={capture.mediaUrl}
                        poster={capture.thumbnailUrl}
                        controls
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : capture.embedUrl ? (
                    <div className="w-full bg-black/40 relative aspect-video overflow-hidden flex items-center justify-center">
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
                  ) : null
                )}

                {/* 3. YouTube Embed Video (Playable in-app) */}
                {capture.platform === 'youtube' && capture.embedUrl && (
                  <div className="w-full bg-black relative aspect-video overflow-hidden">
                    <iframe
                      src={capture.embedUrl}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={capture.title || 'YouTube Video'}
                    />
                  </div>
                )}

                {/* 4. Web Image, Article Banner, or Direct Video Player */}
                {['web_image', 'web', 'other'].includes(capture.platform) && (
                  (capture.mediaType === 'video' || isVideoUrl(capture.mediaUrl)) && capture.mediaUrl ? (
                    <div className="w-full bg-black relative aspect-video overflow-hidden border-b border-subtle flex items-center justify-center">
                      <video
                        src={capture.mediaUrl}
                        poster={capture.thumbnailUrl}
                        controls
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : capture.embedUrl ? (
                    <div className="w-full bg-black relative aspect-video overflow-hidden border-b border-subtle">
                      <iframe
                        src={capture.embedUrl}
                        className="w-full h-full border-0"
                        allowFullScreen
                        title={capture.title || 'Embedded Video'}
                        loading="lazy"
                      />
                    </div>
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

                {/* 6. LinkedIn Interactive Embed or Image Card */}
                {capture.platform === 'linkedin' && (
                  <>
                    {/* Media Display: Interactive Embed if expanded, else Direct Video if video stream, else High-Res Visual Banner */}
                    {expandedEmbeds[capture._id] ? (
                      <div className="w-full bg-surface-raised relative h-[440px] overflow-hidden border-b border-subtle">
                        <iframe
                          src={capture.embedUrl}
                          className="w-full h-full border-0"
                          allowFullScreen={true}
                          title={capture.title || 'LinkedIn Post'}
                          loading="lazy"
                        />
                      </div>
                    ) : (capture.mediaType === 'video' || isVideoUrl(capture.mediaUrl)) && capture.mediaUrl ? (
                      <div className="w-full bg-black relative aspect-video overflow-hidden border-b border-subtle flex items-center justify-center">
                        <video
                          src={capture.mediaUrl}
                          poster={capture.thumbnailUrl}
                          controls
                          playsInline
                          preload="metadata"
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
                        <div className="flex items-center gap-2">
                          <FaLinkedin size={18} className="text-sky-400 flex-shrink-0" />
                          <span className="text-xs font-bold text-sky-200 truncate">
                            {capture.authorName || 'LinkedIn Post'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {capture.embedUrl && (capture.mediaUrl || capture.thumbnailUrl) && (
                            <button
                              onClick={() => toggleEmbed(capture._id)}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-sky-900/40 hover:bg-sky-800/60 text-sky-300 transition-colors cursor-pointer border border-sky-700/40"
                              title={expandedEmbeds[capture._id] ? 'Show Video/Banner' : 'View Live Interactive Post'}
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
                      {capture.rawContent && (
                        <p className="text-xs text-secondary line-clamp-3 leading-relaxed">
                          {capture.rawContent}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* 7. Twitter / X Interactive Embed, Direct Video Player, or Image Card */}
                {capture.platform === 'twitter' && (
                  <>
                    {/* Media Display: Direct Video Player, Interactive Embed, or High-Res Image */}
                    {expandedEmbeds[capture._id] ? (
                      <div className="w-full bg-[#000000] relative h-[480px] overflow-hidden border-b border-subtle flex items-center justify-center">
                        <iframe
                          src={capture.embedUrl}
                          className="w-full h-full border-0"
                          allowFullScreen={true}
                          title={capture.title || 'X Post'}
                          loading="lazy"
                        />
                      </div>
                    ) : (capture.mediaType === 'video' || isVideoUrl(capture.mediaUrl)) && capture.mediaUrl ? (
                      <div className="w-full bg-black relative aspect-video overflow-hidden border-b border-subtle flex items-center justify-center">
                        <video
                          src={capture.mediaUrl}
                          poster={capture.thumbnailUrl}
                          controls
                          playsInline
                          preload="metadata"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : capture.embedUrl && !(capture.mediaUrl || capture.thumbnailUrl) ? (
                      <div className="w-full bg-[#000000] relative h-[480px] overflow-hidden border-b border-subtle flex items-center justify-center">
                        <iframe
                          src={capture.embedUrl}
                          className="w-full h-full border-0"
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

                    {/* Author & Post Excerpt Header */}
                    <div className="p-4 bg-zinc-950/40 border-b border-subtle">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <FaXTwitter size={16} className="text-white flex-shrink-0" />
                          <span className="text-xs font-bold text-white truncate">
                            {capture.authorName || 'Post on X'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {capture.embedUrl && (
                            <button
                              onClick={() => toggleEmbed(capture._id)}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer border border-zinc-700/50"
                              title={expandedEmbeds[capture._id] ? 'Show Video/Banner' : 'View Live Interactive Post'}
                            >
                              {expandedEmbeds[capture._id] ? 'Show Media' : 'Interactive'}
                            </button>
                          )}
                          {capture.rawContent && (
                            <button
                              onClick={() => handleCopyText(capture.rawContent, capture._id)}
                              className="text-[10px] text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                              title="Copy tweet text"
                            >
                              {copiedId === capture._id ? <FaCheck size={11} /> : <FaRegCopy size={11} />}
                              <span>Copy</span>
                            </button>
                          )}
                        </div>
                      </div>
                      {capture.rawContent && (
                        <p className="text-xs text-secondary line-clamp-4 leading-relaxed whitespace-pre-wrap font-sans">
                          {capture.rawContent}
                        </p>
                      )}
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
                        {(capture.mediaType === 'video' || isVideoUrl(capture.mediaUrl)) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            Video
                          </span>
                        )}
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
                            ? new Date(capture.remindAt).toISOString().slice(0, 16)
                            : '',
                        );
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
                          ? new Date(capture.remindAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '+ Set Reminder'}
                      </span>
                    </button>

                    {/* Delete action */}
                    <button
                      onClick={() => handleDelete(capture._id)}
                      className="p-1.5 rounded-lg text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="Delete capture"
                    >
                      <FaTrashAlt size={13} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

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
                  className="text-muted hover:text-primary p-1"
                >
                  <IoClose size={18} />
                </button>
              </div>

              <p className="text-xs text-muted">
                Set a custom notification date and time to review "{reminderModalItem.title}".
              </p>

              <div>
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
                  className="text-xs text-red-400 hover:underline"
                >
                  Remove
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setReminderModalItem(null)}
                    className="px-3 py-1.5 rounded-xl text-xs text-secondary hover:bg-surface"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveReminder}
                    className="px-4 py-1.5 rounded-xl bg-accent text-white text-xs font-bold shadow"
                  >
                    Save
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CapturesPage;
