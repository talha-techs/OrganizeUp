import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  FaInstagram,
  FaFacebook,
  FaLinkedin,
  FaYoutube,
  FaGlobe,
} from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import {
  IoClose,
  IoImageOutline,
  IoLinkOutline,
  IoTimeOutline,
  IoDocumentTextOutline,
  IoCloudUploadOutline,
  IoFlashOutline,
  IoCheckmarkCircleOutline,
  IoLogoYoutube,
  IoCheckmarkCircle,
} from 'react-icons/io5';
import {
  closeQuickCapture,
  createCapture,
  scrapeMetadata,
  clearScrapedData,
} from '../../redux/slices/captureSlice';
import { addPlaylist } from '../../redux/slices/youtubePlaylistSlice';

/**
 * Inspect a YouTube URL to determine its exact category:
 * - 'shorts': YouTube Shorts URL
 * - 'playlist': Playlist page or playlist link
 * - 'single': Single video URL
 * - 'other': Channel or user profile link
 */
export const inspectYouTubeUrl = (inputUrl) => {
  if (!inputUrl || typeof inputUrl !== 'string') return null;
  const trimmed = inputUrl.trim();
  if (!/(?:youtube\.com|youtu\.be)/i.test(trimmed)) return null;

  // 1. Shorts: youtube.com/shorts/{videoId} or youtu.be/shorts/{videoId}
  const shortsMatch = trimmed.match(/(?:youtube\.com|youtu\.be)\/shorts\/([a-zA-Z0-9_-]+)/i);
  if (shortsMatch) {
    const videoId = shortsMatch[1];
    return {
      type: 'shorts',
      videoId,
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      label: 'YouTube Short',
    };
  }

  // 2. Playlist: youtube.com/playlist?list={playlistId} or list=PL... without video parameter
  const listMatch = trimmed.match(/[?&]list=([a-zA-Z0-9_-]+)/i);
  const isExplicitPlaylistPage = /youtube\.com\/playlist/i.test(trimmed);
  const hasVideoParam =
    /[?&]v=([a-zA-Z0-9_-]{11})/i.test(trimmed) ||
    /youtu\.be\/([a-zA-Z0-9_-]{11})/i.test(trimmed);

  if (listMatch && (isExplicitPlaylistPage || !hasVideoParam)) {
    return {
      type: 'playlist',
      playlistId: listMatch[1],
      label: 'YouTube Playlist',
    };
  }

  // 3. Single Video:
  // watch?v=..., youtu.be/..., /embed/..., /v/...
  let videoId = null;
  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/i);
  if (watchMatch) {
    videoId = watchMatch[1];
  } else {
    const beMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/i);
    if (beMatch) {
      videoId = beMatch[1];
    } else {
      const embedMatch = trimmed.match(/\/embed\/([a-zA-Z0-9_-]{11})/i);
      if (embedMatch) {
        videoId = embedMatch[1];
      }
    }
  }

  if (videoId) {
    return {
      type: 'single',
      videoId,
      playlistId: listMatch ? listMatch[1] : null,
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      label: 'Single Video',
    };
  }

  // 4. Other (channel link, user, about, etc.)
  return {
    type: 'other',
    label: 'YouTube Channel / Page',
  };
};

const QuickCaptureModal = () => {
  const dispatch = useDispatch();
  const { isQuickCaptureOpen, initialData, scrapeLoading, scrapedData } =
    useSelector((state) => state.captures);

  // Tab mode: 'link' | 'image' (WhatsApp capture completely removed)
  const [activeTab, setActiveTab] = useState('link');

  // Form fields
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');
  const [priority, setPriority] = useState('medium');

  // YouTube single video destination choice: 'vault' | 'youtube_page' | null
  const [singleVideoChoice, setSingleVideoChoice] = useState(null);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  // Image specific
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [webImageUrl, setWebImageUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Reminder
  const [reminderPreset, setReminderPreset] = useState('none');
  const [customRemindAt, setCustomRemindAt] = useState('');

  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  // Computed YouTube inspection
  const ytInfo = activeTab === 'link' ? inspectYouTubeUrl(url) : null;

  // Reset form when modal opens or closes
  useEffect(() => {
    if (isQuickCaptureOpen) {
      if (initialData) {
        if (initialData.tab && ['link', 'image'].includes(initialData.tab)) {
          setActiveTab(initialData.tab);
        }
        if (initialData.url) {
          setUrl(initialData.url);
          dispatch(scrapeMetadata(initialData.url));
        }
        if (initialData.title) setTitle(initialData.title);
        if (initialData.notes) setNotes(initialData.notes);
      }
    } else {
      setUrl('');
      setTitle('');
      setNotes('');
      setTags('');
      setPriority('medium');
      setSingleVideoChoice(null);
      setHasAttemptedSubmit(false);
      setImageFile(null);
      setImagePreview('');
      setWebImageUrl('');
      setReminderPreset('none');
      setCustomRemindAt('');
      dispatch(clearScrapedData());
    }
  }, [isQuickCaptureOpen, initialData, dispatch]);

  // Global Ctrl+V listener for instant clipboard image paste
  useEffect(() => {
    const handlePaste = (e) => {
      if (!isQuickCaptureOpen) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            setActiveTab('image');
            setImageFile(blob);
            const previewUrl = URL.createObjectURL(blob);
            setImagePreview(previewUrl);
            toast.success('Screenshot pasted from clipboard!');
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isQuickCaptureOpen]);

  // Auto-fill title from scraped metadata (never use generic "resource" fallbacks)
  useEffect(() => {
    if (scrapedData && scrapedData.title) {
      const cleanScrapedTitle = scrapedData.title.trim();
      const isGeneric =
        cleanScrapedTitle.toLowerCase().includes('resource') ||
        cleanScrapedTitle.toLowerCase() === 'youtube' ||
        cleanScrapedTitle === 'Saved Link';
      if (!isGeneric && (!title || title.toLowerCase().includes('resource'))) {
        setTitle(cleanScrapedTitle);
      }
    }
  }, [scrapedData, title]);

  // Handle URL change with auto scrape
  const handleUrlBlur = () => {
    if (url.trim() && (!scrapedData || scrapedData.url !== url.trim())) {
      dispatch(scrapeMetadata(url.trim()));
    }
  };

  // Helper for computing reminder date
  const computeRemindAt = () => {
    const now = new Date();
    if (reminderPreset === '2h') {
      return new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
    }
    if (reminderPreset === 'tonight') {
      const d = new Date();
      d.setHours(20, 0, 0, 0);
      if (d <= now) d.setDate(d.getDate() + 1);
      return d.toISOString();
    }
    if (reminderPreset === 'tomorrow') {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      return d.toISOString();
    }
    if (reminderPreset === 'weekend') {
      const d = new Date();
      const day = d.getDay();
      const daysUntilSat = (6 - day + 7) % 7 || 7;
      d.setDate(d.getDate() + daysUntilSat);
      d.setHours(10, 0, 0, 0);
      return d.toISOString();
    }
    if (reminderPreset === 'custom' && customRemindAt) {
      return new Date(customRemindAt).toISOString();
    }
    return null;
  };

  // Handle file drop
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
      } else {
        toast.error('Please drop an image file (PNG, JPG, WebP, etc.)');
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Platform icon helper
  const renderDetectedIcon = () => {
    if (activeTab === 'image') {
      return <IoImageOutline className="text-purple-400" size={18} />;
    }
    if (ytInfo || scrapedData?.platform === 'youtube' || /youtube\.com|youtu\.be/i.test(url)) {
      return <FaYoutube className="text-red-500" size={18} />;
    }
    if (scrapedData?.platform === 'instagram' || /instagram\.com/i.test(url)) {
      return <FaInstagram className="text-pink-500" size={18} />;
    }
    if (scrapedData?.platform === 'facebook' || /facebook\.com|fb\.watch/i.test(url)) {
      return <FaFacebook className="text-blue-500" size={18} />;
    }
    if (scrapedData?.platform === 'linkedin' || /(?:linkedin\.com|lnkd\.in)/i.test(url)) {
      return <FaLinkedin className="text-sky-400" size={18} />;
    }
    if (scrapedData?.platform === 'twitter' || /(?:twitter\.com|x\.com)/i.test(url)) {
      return <FaXTwitter className="text-white" size={18} />;
    }
    return <FaGlobe className="text-accent" size={18} />;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const remindAt = computeRemindAt();

      if (activeTab === 'image' && imageFile) {
        // Multipart upload for direct image file
        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('title', title || imageFile.name || 'Uploaded Image');
        formData.append('notes', notes);
        formData.append('tags', tags);
        formData.append('priority', priority);
        if (remindAt) formData.append('remindAt', remindAt);

        await dispatch(createCapture(formData)).unwrap();
        toast.success('Saved to your Vault!', { icon: '⚡' });
        dispatch(closeQuickCapture());
      } else if (activeTab === 'image' && webImageUrl) {
        // Web image URL
        await dispatch(
          createCapture({
            platform: 'web_image',
            mediaType: 'image',
            mediaUrl: webImageUrl,
            title: title || 'Web Image',
            notes,
            tags,
            priority,
            remindAt,
          }),
        ).unwrap();
        toast.success('Saved to your Vault!', { icon: '⚡' });
        dispatch(closeQuickCapture());
      } else {
        // TAB: 'link'
        if (!url.trim()) {
          toast.error('Please enter a URL or link to save');
          setSaving(false);
          return;
        }

        // ─────────────────────────────────────────────────────────────
        // YOUTUBE LINK INTELLIGENCE & ROUTING
        // ─────────────────────────────────────────────────────────────
        if (ytInfo) {
          // 1. PLAYLIST: Add directly to playlists page and inform user
          if (ytInfo.type === 'playlist') {
            const result = await dispatch(
              addPlaylist({
                url: url.trim(),
                playlistUrl: url.trim(),
                type: 'playlist',
              }),
            );

            if (result.meta.requestStatus === 'fulfilled') {
              toast.success(
                'YouTube Playlist saved directly to your Playlists page! You can find it under YouTube Library → Playlists.',
                {
                  duration: 5000,
                  icon: '📺',
                  style: {
                    borderRadius: '12px',
                    background: '#18181b',
                    color: '#fff',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                  },
                },
              );
              dispatch(closeQuickCapture());
              return;
            } else {
              toast.error(result.payload || 'Failed to save YouTube playlist');
              setSaving(false);
              return;
            }
          }

          // 2. SHORTS: Add directly to the vault (playable in-app)
          if (ytInfo.type === 'shorts') {
            await dispatch(
              createCapture({
                sourceUrl: url.trim(),
                platform: 'youtube',
                mediaType: 'video',
                title: title || scrapedData?.title || 'YouTube Short',
                notes,
                tags,
                priority,
                remindAt,
                rawContent: scrapedData?.rawContent || scrapedData?.description || notes,
                embedId: ytInfo.videoId,
                embedUrl: ytInfo.embedUrl,
                mediaUrl: ytInfo.embedUrl,
                thumbnailUrl: scrapedData?.thumbnailUrl || ytInfo.thumbnailUrl,
                authorName: scrapedData?.authorName || 'YouTube',
              }),
            ).unwrap();

            toast.success('YouTube Short saved to your Vault! Playable directly in your Vault.', {
              icon: '⚡',
              style: {
                borderRadius: '12px',
                background: '#18181b',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.1)',
              },
            });
            dispatch(closeQuickCapture());
            return;
          }

          // 3. SINGLE VIDEO: Ask user choice between Vault or OrganizeUp YouTube Page (Single Video)
          if (ytInfo.type === 'single') {
            if (!singleVideoChoice) {
              setHasAttemptedSubmit(true);
              toast('Please choose whether to save in Vault or YouTube Library', {
                icon: '👆',
              });
              setSaving(false);
              return;
            }

            // Resolve clean title (ignore generic "resource" string if present)
            const cleanTitle =
              title && !title.toLowerCase().includes('resource') && title !== 'Saved Link' && title !== 'YouTube Video'
                ? title.trim()
                : scrapedData?.title && !scrapedData.title.toLowerCase().includes('resource')
                ? scrapedData.title.trim()
                : '';

            // Choice A: Save in Vault (playable right inside Vault)
            if (singleVideoChoice === 'vault') {
              await dispatch(
                createCapture({
                  sourceUrl: url.trim(),
                  platform: 'youtube',
                  mediaType: 'video',
                  title: cleanTitle,
                  notes,
                  tags,
                  priority,
                  remindAt,
                  rawContent: scrapedData?.rawContent || scrapedData?.description || notes,
                  embedId: ytInfo.videoId,
                  embedUrl: ytInfo.embedUrl,
                  mediaUrl: ytInfo.embedUrl,
                  thumbnailUrl: scrapedData?.thumbnailUrl || ytInfo.thumbnailUrl,
                  authorName: scrapedData?.authorName || 'YouTube',
                }),
              ).unwrap();

              toast.success('Saved to your Vault! You can play the video directly in your Vault.', {
                icon: '⚡',
                style: {
                  borderRadius: '12px',
                  background: '#18181b',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.1)',
                },
              });
              dispatch(closeQuickCapture());
              return;
            }

            // Choice B: Save in OrganizeUp YouTube Page (categorized under Single Videos)
            if (singleVideoChoice === 'youtube_page') {
              const result = await dispatch(
                addPlaylist({
                  url: url.trim(),
                  playlistUrl: url.trim(),
                  type: 'video',
                  title: cleanTitle,
                  notes: notes || '',
                }),
              );

              if (result.meta.requestStatus === 'fulfilled') {
                toast.success(
                  'Saved under Single Videos in your OrganizeUp YouTube Library!',
                  {
                    duration: 4500,
                    icon: '📺',
                    style: {
                      borderRadius: '12px',
                      background: '#18181b',
                      color: '#fff',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                    },
                  },
                );
                dispatch(closeQuickCapture());
                return;
              } else {
                toast.error(result.payload || 'Failed to save to YouTube Library');
                setSaving(false);
                return;
              }
            }
          }

          // 4. OTHER: Channel or other YouTube link -> save into Vault
          if (ytInfo.type === 'other') {
            await dispatch(
              createCapture({
                sourceUrl: url.trim(),
                platform: 'youtube',
                mediaType: 'post',
                title: title || scrapedData?.title || 'YouTube Resource',
                notes,
                tags,
                priority,
                remindAt,
                rawContent: scrapedData?.rawContent || scrapedData?.description || notes,
                thumbnailUrl: scrapedData?.thumbnailUrl,
                authorName: scrapedData?.authorName || 'YouTube',
              }),
            ).unwrap();

            toast.success('YouTube link saved to your Vault!', {
              icon: '⚡',
            });
            dispatch(closeQuickCapture());
            return;
          }
        }

        // ─────────────────────────────────────────────────────────────
        // OTHER SOCIAL / WEB LINKS (Instagram, LinkedIn, Facebook, etc.)
        // ─────────────────────────────────────────────────────────────
        const isLinkedIn = /(?:linkedin\.com|lnkd\.in)/i.test(url);
        const isTwitter = /(?:twitter\.com|x\.com)/i.test(url);
        const isFacebook = /(?:facebook\.com|fb\.watch|fb\.me)/i.test(url);
        const isInstagram = /(?:instagram\.com)/i.test(url);
        const platform = isTwitter
          ? 'twitter'
          : isLinkedIn
          ? 'linkedin'
          : isFacebook
          ? 'facebook'
          : isInstagram
          ? 'instagram'
          : scrapedData?.platform;

        const isVideo =
          scrapedData?.mediaType === 'video' ||
          /\.(mp4|webm|ogg|mov|m4v|m3u8|mpd)(\?.*)?$/i.test(scrapedData?.mediaUrl || url) ||
          Boolean(scrapedData?.embedUrl) ||
          ['youtube', 'instagram', 'facebook'].includes(platform);

        const mediaType = isVideo ? 'video' : (scrapedData?.mediaType || 'post');
        const resolvedPlatform = (platform === 'web_image' && isVideo) ? 'web' : platform;

        await dispatch(
          createCapture({
            sourceUrl: url.trim(),
            platform: resolvedPlatform,
            mediaType,
            title: title || scrapedData?.title || 'Saved Link',
            notes,
            tags,
            priority,
            remindAt,
            rawContent: scrapedData?.rawContent || scrapedData?.description || notes,
            mediaUrl: scrapedData?.mediaUrl || (isVideo ? scrapedData?.embedUrl : scrapedData?.thumbnailUrl),
            thumbnailUrl: scrapedData?.thumbnailUrl,
            embedId: scrapedData?.embedId,
            embedUrl: scrapedData?.embedUrl,
            authorName: scrapedData?.authorName,
          }),
        ).unwrap();

        toast.success('Saved to your Vault!', {
          icon: '⚡',
          style: {
            borderRadius: '12px',
            background: '#18181b',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
          },
        });

        dispatch(closeQuickCapture());
      }
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to save resource');
    } finally {
      setSaving(false);
    }
  };

  if (!isQuickCaptureOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => dispatch(closeQuickCapture())}
          className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', duration: 0.3, bounce: 0.1 }}
          className="relative w-full max-w-2xl bg-surface-raised/95 border border-strong rounded-2xl shadow-2xl shadow-black/60 overflow-hidden flex flex-col my-auto max-h-[90vh]"
        >
          {/* Top glowing gradient border */}
          <div className="h-1 w-full bg-gradient-to-r from-accent via-red-500 to-purple-500" />

          {/* Modal Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-subtle">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-accent-subtle text-accent">
                <IoFlashOutline size={20} />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold font-display text-primary flex items-center gap-2">
                  <span>Quick Capture</span>
                  <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-surface text-secondary border border-subtle">
                    Ctrl+V to Paste Image
                  </span>
                </h2>
                <p className="text-xs text-muted">
                  Inspect & save YouTube videos, Reels, LinkedIn posts, images & web clips
                </p>
              </div>
            </div>

            <button
              onClick={() => dispatch(closeQuickCapture())}
              className="p-1.5 rounded-xl text-muted hover:text-primary hover:bg-surface transition-colors cursor-pointer"
            >
              <IoClose size={20} />
            </button>
          </div>

          {/* Tabs Navigation (WhatsApp removed completely) */}
          <div className="flex items-center gap-1 px-5 pt-3 pb-2 border-b border-subtle bg-surface/50">
            <button
              type="button"
              onClick={() => setActiveTab('link')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'link'
                  ? 'bg-accent text-white shadow-md shadow-accent/20'
                  : 'text-secondary hover:text-primary hover:bg-surface'
              }`}
            >
              <IoLinkOutline size={16} />
              <span>Link, YouTube & Reels</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('image')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'image'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'text-secondary hover:text-primary hover:bg-surface'
              }`}
            >
              <IoImageOutline size={16} />
              <span>Image & Screenshots</span>
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
            {/* TAB 1: Link, YouTube, & Social Media */}
            {activeTab === 'link' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-secondary mb-1.5">
                    Resource Link (YouTube Video / Playlist / Short, Instagram Reel, Facebook, LinkedIn, Web URL)
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => {
                        const val = e.target.value;
                        setUrl(val);
                        setSingleVideoChoice(null);
                        setHasAttemptedSubmit(false);
                        const trimmed = val.trim();
                        if (trimmed && /(?:youtube\.com|youtu\.be)/i.test(trimmed)) {
                          dispatch(scrapeMetadata(trimmed));
                        }
                      }}
                      onBlur={handleUrlBlur}
                      placeholder="https://www.youtube.com/watch?v=... or https://instagram.com/reel/... or https://..."
                      required
                      className="w-full pl-10 pr-24 py-2.5 rounded-xl bg-surface border border-subtle text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      {renderDetectedIcon()}
                    </div>
                    {url && (
                      <button
                        type="button"
                        onClick={() => dispatch(scrapeMetadata(url.trim()))}
                        disabled={scrapeLoading}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-surface-raised hover:bg-surface border border-subtle text-[11px] font-semibold text-primary transition-all cursor-pointer"
                      >
                        {scrapeLoading ? 'Inspecting...' : 'Inspect / Preview'}
                      </button>
                    )}
                  </div>
                </div>

                {/* ─────────────────────────────────────────────────────────────
                    YOUTUBE INSPECTION BANNERS & CHOICE PROMPT
                ───────────────────────────────────────────────────────────── */}

                {/* Case 1: YouTube Playlist Detected */}
                {ytInfo?.type === 'playlist' && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-start gap-3"
                  >
                    <div className="p-2 rounded-xl bg-red-600 text-white shadow-md flex-shrink-0">
                      <IoLogoYoutube size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-red-400 uppercase tracking-wider">
                          YouTube Playlist Detected
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 font-mono">
                          Playlists Page
                        </span>
                      </div>
                      <p className="text-xs text-secondary mt-1 leading-relaxed">
                        This playlist will be saved directly into your OrganizeUp <strong>YouTube Library → Playlists</strong> page.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Case 2: YouTube Short Detected */}
                {ytInfo?.type === 'shorts' && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/25 flex items-start gap-3"
                  >
                    <div className="p-2 rounded-xl bg-purple-600 text-white shadow-md flex-shrink-0">
                      <IoFlashOutline size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                          YouTube Short Detected
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono">
                          Direct to Vault
                        </span>
                      </div>
                      <p className="text-xs text-secondary mt-1 leading-relaxed">
                        Shorts are saved directly to your <strong>Vault</strong> with full in-app playable video!
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Case 3: YouTube Single Video — User Choice Selection */}
                {ytInfo?.type === 'single' && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-2xl bg-surface border transition-all space-y-3 ${
                      hasAttemptedSubmit && !singleVideoChoice
                        ? 'border-amber-500/60 ring-2 ring-amber-500/20'
                        : 'border-subtle'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <IoLogoYoutube size={18} className="text-red-500" />
                        <span className="text-xs font-bold text-primary">
                          Single Video Detected — Choose Save Location
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-secondary px-2 py-0.5 rounded-full bg-surface-raised border border-subtle">
                        Select Destination
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Option 1: Save in Vault */}
                      <button
                        type="button"
                        onClick={() => {
                          setSingleVideoChoice('vault');
                          setHasAttemptedSubmit(false);
                        }}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative group flex flex-col justify-between ${
                          singleVideoChoice === 'vault'
                            ? 'bg-accent/10 border-accent text-primary shadow-md shadow-accent/10 ring-1 ring-accent'
                            : 'bg-surface-raised/70 border-subtle hover:border-accent/40 text-secondary hover:text-primary'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div
                                className={`p-1.5 rounded-lg ${
                                  singleVideoChoice === 'vault'
                                    ? 'bg-accent text-white'
                                    : 'bg-surface text-accent'
                                }`}
                              >
                                <IoFlashOutline size={16} />
                              </div>
                              <span className="text-xs font-bold text-primary">Save in Vault</span>
                            </div>
                            {singleVideoChoice === 'vault' && (
                              <IoCheckmarkCircle size={18} className="text-accent" />
                            )}
                          </div>
                          <p className="text-[11px] leading-relaxed text-secondary">
                            Store in Quick Capture Vault. The video is{' '}
                            <strong className="text-primary">fully playable right inside your Vault card</strong>.
                          </p>
                        </div>
                        <div className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold text-accent">
                          <span>⚡ Built-in Vault Player</span>
                        </div>
                      </button>

                      {/* Option 2: OrganizeUp YouTube Page (Single Video) */}
                      <button
                        type="button"
                        onClick={() => {
                          setSingleVideoChoice('youtube_page');
                          setHasAttemptedSubmit(false);
                        }}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative group flex flex-col justify-between ${
                          singleVideoChoice === 'youtube_page'
                            ? 'bg-red-500/10 border-red-500 text-primary shadow-md shadow-red-500/10 ring-1 ring-red-500'
                            : 'bg-surface-raised/70 border-subtle hover:border-red-500/40 text-secondary hover:text-primary'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div
                                className={`p-1.5 rounded-lg ${
                                  singleVideoChoice === 'youtube_page'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-surface text-red-500'
                                }`}
                              >
                                <IoLogoYoutube size={16} />
                              </div>
                              <span className="text-xs font-bold text-primary">YouTube Page</span>
                            </div>
                            {singleVideoChoice === 'youtube_page' && (
                              <IoCheckmarkCircle size={18} className="text-red-500" />
                            )}
                          </div>
                          <p className="text-[11px] leading-relaxed text-secondary">
                            Categorized under <strong className="text-primary">Single Videos</strong> in OrganizeUp
                            YouTube Library with notes & timestamps.
                          </p>
                        </div>
                        <div className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold text-red-400">
                          <span>📺 YouTube Library → Single Videos</span>
                        </div>
                      </button>
                    </div>

                    {hasAttemptedSubmit && !singleVideoChoice && (
                      <p className="text-[11px] font-semibold text-amber-400 animate-pulse pt-1">
                        ⚠️ Please choose where to save this video: Vault or YouTube Library.
                      </p>
                    )}
                  </motion.div>
                )}

                {/* Case 4: Other YouTube Link (Channel, etc.) */}
                {ytInfo?.type === 'other' && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 rounded-2xl bg-surface border border-subtle flex items-start gap-3"
                  >
                    <div className="p-2 rounded-xl bg-accent text-white shadow-md flex-shrink-0">
                      <IoLinkOutline size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-accent uppercase tracking-wider">
                        YouTube Resource Detected
                      </span>
                      <p className="text-xs text-secondary mt-0.5">
                        Channel or link will be saved directly into your <strong>Vault</strong>.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Scraped Preview Card for Careful Inspection */}
                {scrapedData && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3 p-3 rounded-xl bg-surface/70 border border-subtle"
                  >
                    {scrapedData.thumbnailUrl ? (
                      <div className="relative w-20 h-20 flex-shrink-0">
                        <img
                          src={scrapedData.thumbnailUrl}
                          alt="Preview"
                          className="w-20 h-20 object-cover rounded-lg bg-surface border border-subtle"
                        />
                        {(scrapedData.mediaType === 'video' || scrapedData.embedUrl) && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
                            <span className="w-6 h-6 rounded-full bg-accent/90 text-white flex items-center justify-center text-[10px] pl-0.5 shadow-md">
                              ▶
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-accent-subtle flex items-center justify-center text-accent flex-shrink-0">
                        {renderDetectedIcon()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-surface border border-subtle text-accent">
                          {scrapedData.platform || 'WEB'}
                        </span>
                        {(scrapedData.mediaType === 'video' || scrapedData.embedUrl) && (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            VIDEO
                          </span>
                        )}
                        {scrapedData.authorName && (
                          <span className="text-xs font-semibold text-primary truncate">
                            · {scrapedData.authorName}
                          </span>
                        )}
                        {scrapedData.siteName && !scrapedData.authorName && (
                          <span className="text-xs text-muted truncate">
                            · {scrapedData.siteName}
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-semibold text-primary line-clamp-1">
                        {scrapedData.title}
                      </h4>
                      {scrapedData.description && (
                        <p className="text-[11px] text-secondary line-clamp-2 mt-0.5 leading-relaxed">
                          {scrapedData.description}
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* TAB 2: Image & Screenshots */}
            {activeTab === 'image' && (
              <div className="space-y-3">
                {/* Drag and Drop Zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-subtle hover:border-purple-400/50 bg-surface/50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {imagePreview ? (
                    <div className="relative group max-h-56 overflow-hidden rounded-xl">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="max-h-52 object-contain rounded-xl"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-xl">
                        <span className="text-xs font-semibold text-white bg-purple-600 px-3 py-1.5 rounded-lg shadow">
                          Click to Change Image
                        </span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400 mb-2">
                        <IoCloudUploadOutline size={28} />
                      </div>
                      <p className="text-xs font-semibold text-primary">
                        Drop image here or click to browse
                      </p>
                      <p className="text-[11px] text-muted mt-1">
                        Or press <kbd className="px-1.5 py-0.5 rounded bg-surface border border-subtle text-primary font-mono text-[10px]">Ctrl+V</kbd> anywhere to paste a screenshot directly!
                      </p>
                    </>
                  )}
                </div>

                {/* Direct Image URL input */}
                <div>
                  <label className="block text-xs font-semibold text-secondary mb-1">
                    Or save image from web URL
                  </label>
                  <input
                    type="url"
                    value={webImageUrl}
                    onChange={(e) => {
                      setWebImageUrl(e.target.value);
                      if (e.target.value) setImagePreview(e.target.value);
                    }}
                    placeholder="https://images.unsplash.com/... or https://...jpg"
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-subtle text-xs text-primary placeholder:text-muted focus:outline-none focus:border-purple-500 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Common: Title */}
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1.5">
                Title / Headline
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give this saved resource a quick meaningful title..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-subtle text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent transition-all"
              />
            </div>

            {/* Common: Personal Notes & Reflections */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-secondary flex items-center gap-1.5">
                  <IoDocumentTextOutline size={14} className="text-accent" />
                  <span>Personal Notes & Reflections</span>
                </label>
                <span className="text-[11px] text-muted">Why is this important?</span>
              </div>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Write your thoughts, key takeaways, action steps, or why you wanted to save this..."
                className="w-full p-3 rounded-xl bg-surface border border-subtle text-xs text-primary placeholder:text-muted focus:outline-none focus:border-accent transition-all resize-none"
              />
            </div>

            {/* Actionable Notification / Reminder */}
            <div className="p-3.5 rounded-2xl bg-surface/70 border border-subtle space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-accent-subtle text-accent">
                    <IoTimeOutline size={16} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-primary block">
                      Remind Me to View This
                    </span>
                    <span className="text-[11px] text-muted block">
                      Get an in-app notification when it's time to review
                    </span>
                  </div>
                </div>

                {reminderPreset !== 'none' && (
                  <button
                    type="button"
                    onClick={() => {
                      setReminderPreset('none');
                      setCustomRemindAt('');
                    }}
                    className="text-[11px] text-muted hover:text-red-400 transition-colors cursor-pointer"
                  >
                    Clear Reminder
                  </button>
                )}
              </div>

              {/* Reminder Presets Chips */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'none', label: 'No Reminder' },
                  { id: '2h', label: 'In 2 Hours' },
                  { id: 'tonight', label: 'Tonight (8:00 PM)' },
                  { id: 'tomorrow', label: 'Tomorrow (9:00 AM)' },
                  { id: 'weekend', label: 'This Weekend' },
                  { id: 'custom', label: 'Custom Date & Time...' },
                ].map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setReminderPreset(chip.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      reminderPreset === chip.id
                        ? 'bg-accent text-white shadow-sm font-semibold'
                        : 'bg-surface hover:bg-surface-raised text-secondary hover:text-primary border border-subtle'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Custom DateTime picker */}
              {reminderPreset === 'custom' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="pt-1"
                >
                  <input
                    type="datetime-local"
                    value={customRemindAt}
                    onChange={(e) => setCustomRemindAt(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-subtle text-xs text-primary focus:outline-none focus:border-accent transition-all"
                  />
                </motion.div>
              )}
            </div>

            {/* Tags & Priority Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1.5">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="marketing, reels, ai-tools"
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-subtle text-xs text-primary placeholder:text-muted focus:outline-none focus:border-accent transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary mb-1.5">
                  Priority
                </label>
                <div className="flex items-center gap-1.5">
                  {['low', 'medium', 'high', 'urgent'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`flex-1 py-1.5 rounded-xl text-[11px] font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                        priority === p
                          ? p === 'urgent'
                            ? 'bg-red-500 text-white shadow-sm'
                            : p === 'high'
                              ? 'bg-amber-500 text-white shadow-sm'
                              : p === 'medium'
                                ? 'bg-accent text-white shadow-sm'
                                : 'bg-surface-raised text-primary border border-subtle'
                          : 'bg-surface text-muted hover:text-primary border border-subtle'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Submit Actions */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-subtle">
              <button
                type="button"
                onClick={() => dispatch(closeQuickCapture())}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-secondary hover:text-primary hover:bg-surface transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-lg transition-all cursor-pointer disabled:opacity-50 ${
                  ytInfo?.type === 'playlist' || singleVideoChoice === 'youtube_page'
                    ? 'bg-gradient-to-r from-red-600 to-red-500 shadow-red-600/25 hover:shadow-red-600/40 hover:scale-[1.02] active:scale-[0.98]'
                    : 'bg-gradient-to-r from-accent to-accent-hover shadow-accent/25 hover:shadow-accent/40 hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : ytInfo?.type === 'playlist' ? (
                  <>
                    <IoLogoYoutube size={17} />
                    <span>Add to Playlists Page</span>
                  </>
                ) : ytInfo?.type === 'shorts' ? (
                  <>
                    <IoFlashOutline size={17} />
                    <span>Save Short to Vault</span>
                  </>
                ) : ytInfo?.type === 'single' ? (
                  singleVideoChoice === 'youtube_page' ? (
                    <>
                      <IoLogoYoutube size={17} />
                      <span>Save to YouTube Library (Single Video)</span>
                    </>
                  ) : singleVideoChoice === 'vault' ? (
                    <>
                      <IoFlashOutline size={17} />
                      <span>Save to Vault (Playable)</span>
                    </>
                  ) : (
                    <>
                      <IoCheckmarkCircleOutline size={17} />
                      <span>Choose Destination to Save</span>
                    </>
                  )
                ) : (
                  <>
                    <IoCheckmarkCircleOutline size={17} />
                    <span>Save to Vault</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default QuickCaptureModal;
