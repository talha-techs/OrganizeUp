import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaDiscord,
  FaCheck,
  FaLink,
  FaTimes,
  FaTag,
  FaSync,
  FaExternalLinkAlt,
  FaEdit,
  FaRegCopy,
  FaTrashAlt,
} from 'react-icons/fa';
import {
  IoSearchOutline,
  IoImageOutline,
  IoDocumentTextOutline,
  IoSparklesOutline,
  IoVideocamOutline,
  IoCloseOutline,
  IoChatbubbleOutline,
} from 'react-icons/io5';
import api from '../../utils/api';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const DiscordLibrary = () => {
  const { user } = useSelector((state) => state.auth);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'media' | 'notes' | 'links'
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest'

  // Modal & Interactive State
  const [selectedMsg, setSelectedMsg] = useState(null);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [editingGuildName, setEditingGuildName] = useState(false);
  const [guildNameInput, setGuildNameInput] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [deleteMsgItem, setDeleteMsgItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      handleOAuthCallback(code);
    } else {
      checkStatus();
    }
  }, []);

  const handleOAuthCallback = async (code) => {
    setLoading(true);
    try {
      const redirectUri = window.location.origin + '/discord-inbox';
      await api.post('/discord/oauth', { code, redirectUri });
      toast.success('Discord linked successfully!');
      searchParams.delete('code');
      setSearchParams(searchParams);
      checkStatus();
    } catch (error) {
      toast.error('Failed to link Discord account');
      searchParams.delete('code');
      setSearchParams(searchParams);
      checkStatus();
    }
  };

  const checkStatus = async () => {
    try {
      setLoading(true);
      const res = await api.get('/discord/status');
      setIsConnected(res.data.isConnected);
      if (res.data.isConnected) {
        await fetchMessages();
      }
    } catch (error) {
      toast.error('Failed to check Discord status');
    } finally {
      setLoading(false);
    }
  };

  const unlinkDiscord = async () => {
    try {
      setLoading(true);
      await api.delete('/discord/unlink');
      setIsConnected(false);
      setMessages([]);
      toast.success('Discord account disconnected');
    } catch (error) {
      toast.error('Failed to disconnect Discord');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await api.get('/discord/messages');
      setMessages(res.data);
    } catch (error) {
      toast.error('Failed to load messages');
    }
  };

  const linkDiscord = async () => {
    try {
      setLoading(true);
      const res = await api.get('/discord/client-id');
      const clientId = res.data.clientId;
      if (!clientId) throw new Error('Missing client ID');

      const redirectUri = window.location.origin + '/discord-inbox';
      const oauthUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&scope=identify%20applications.commands&integration_type=1`;

      window.location.href = oauthUrl;
    } catch (error) {
      toast.error('Failed to initialize Discord login');
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteMsgItem) return;
    setIsDeleting(true);
    try {
      await api.delete(`/discord/messages/${deleteMsgItem._id}`);
      setMessages((prev) => prev.filter((m) => m._id !== deleteMsgItem._id));
      if (selectedMsg?._id === deleteMsgItem._id) setSelectedMsg(null);
      toast.success('Removed from Discord Library');
      setDeleteMsgItem(null);
    } catch (error) {
      toast.error('Failed to delete message');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveInlineNote = async (id) => {
    try {
      const res = await api.put(`/discord/messages/${id}/note`, { note: noteDraft });
      setMessages((prev) => prev.map((m) => (m._id === id ? res.data : m)));
      if (selectedMsg?._id === id) setSelectedMsg(res.data);
      setEditingNoteId(null);
      toast.success('Personal note saved');
    } catch (error) {
      toast.error('Failed to save note');
    }
  };

  const saveGuildName = async () => {
    if (!selectedMsg || !guildNameInput.trim()) return;
    try {
      const res = await api.put(`/discord/messages/${selectedMsg._id}/guildName`, {
        guildName: guildNameInput,
      });
      setMessages((prev) => prev.map((m) => (m._id === selectedMsg._id ? res.data : m)));
      setSelectedMsg(res.data);
      setEditingGuildName(false);
      toast.success('Server name saved');
    } catch (error) {
      toast.error('Failed to save server name');
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success('Copied to clipboard!');
  };

  const renderTextWithLinks = (text) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-accent hover:underline break-all"
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  // Filter and Sort Calculations
  const filteredMessages = useMemo(() => {
    return messages
      .filter((msg) => {
        // Tab Filters
        if (activeFilter === 'media') {
          const hasMedia = msg.media && msg.media.length > 0;
          const hasVideo = Boolean(msg.videoLink);
          if (!hasMedia && !hasVideo) return false;
        } else if (activeFilter === 'notes') {
          if (!msg.note || !msg.note.trim()) return false;
        } else if (activeFilter === 'links') {
          const hasLinks = msg.extractedUrls && msg.extractedUrls.length > 0;
          if (!hasLinks) return false;
        }

        // Search Query Filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchAuthor = msg.authorName?.toLowerCase().includes(q);
          const matchGuild = msg.guildName?.toLowerCase().includes(q);
          const matchText = msg.text?.toLowerCase().includes(q);
          const matchNote = msg.note?.toLowerCase().includes(q);
          if (!matchAuthor && !matchGuild && !matchText && !matchNote) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'oldest') {
          return new Date(a.createdAt) - new Date(b.createdAt);
        }
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
  }, [messages, activeFilter, searchQuery, sortBy]);

  const counts = useMemo(() => {
    return {
      all: messages.length,
      media: messages.filter((m) => (m.media && m.media.length > 0) || m.videoLink).length,
      notes: messages.filter((m) => m.note && m.note.trim()).length,
      links: messages.filter((m) => m.extractedUrls && m.extractedUrls.length > 0).length,
    };
  }, [messages]);

  if (loading) return <LoadingSpinner text="Connecting to Discord Library..." />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#5865F2]/10 border border-[#5865F2]/25 shadow-lg shadow-[#5865F2]/10 flex items-center justify-center text-[#5865F2]">
            <FaDiscord size={30} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-primary font-display">Discord Library</h1>
              {isConnected && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Discord Active
                </span>
              )}
            </div>
            <p className="text-secondary text-sm mt-1">
              Your permanent vault for saved Discord discussions, attachments & insights
            </p>
          </div>
        </div>

        {isConnected && (
          <div className="flex items-center gap-3">
            <button
              onClick={fetchMessages}
              className="btn-secondary flex items-center gap-2 text-xs py-2 px-3.5 cursor-pointer shadow-sm"
              title="Refresh messages"
            >
              <FaSync className={loading ? 'animate-spin' : ''} size={13} />
              <span>Refresh</span>
            </button>
            <button
              onClick={unlinkDiscord}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all cursor-pointer shadow-sm"
            >
              <FaTimes size={12} />
              <span>Disconnect</span>
            </button>
          </div>
        )}
      </motion.div>

      {!isConnected ? (
        /* Disconnected State */
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card border border-subtle rounded-3xl p-10 max-w-2xl mx-auto text-center space-y-6 shadow-2xl"
        >
          <div className="w-20 h-20 rounded-3xl bg-[#5865F2]/15 border border-[#5865F2]/30 flex items-center justify-center mx-auto text-[#5865F2] shadow-inner">
            <FaDiscord size={42} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-primary font-display">
              Connect Your Discord Account
            </h2>
            <p className="text-secondary text-sm leading-relaxed max-w-md mx-auto">
              Link your OrganizeUp account to our Discord User App. Right-click any message in
              any Discord server or direct chat and select{' '}
              <span className="text-accent font-semibold">Apps → Save to OrganizeUp</span> to
              instantly organize it here!
            </p>
          </div>
          <button
            onClick={linkDiscord}
            className="btn-primary px-8 py-3.5 rounded-2xl text-sm font-bold shadow-lg shadow-accent/20 hover:scale-105 transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <FaDiscord size={18} />
            <span>Connect Account</span>
          </button>
        </motion.div>
      ) : (
        /* Connected Library View */
        <div className="space-y-6">
          {/* Controls Bar: Search & Filter Tabs */}
          <div className="p-4 rounded-3xl bg-surface border border-subtle shadow-md space-y-4">
            {/* Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
              {[
                { id: 'all', label: 'All', count: counts.all },
                { id: 'media', label: 'Media', count: counts.media, icon: IoImageOutline },
                { id: 'notes', label: 'Notes', count: counts.notes, icon: IoDocumentTextOutline },
                { id: 'links', label: 'Links', count: counts.links, icon: FaLink },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveFilter(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      activeFilter === tab.id
                        ? 'bg-[#5865F2] text-white shadow-md shadow-[#5865F2]/25'
                        : 'text-secondary hover:text-primary hover:bg-surface-raised'
                    }`}
                  >
                    {Icon && <Icon size={14} />}
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        activeFilter === tab.id
                          ? 'bg-white/20 text-white'
                          : 'bg-surface-raised text-muted'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search Bar & Sort Dropdown */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-subtle">
              <div className="relative w-full sm:w-80">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Discord messages, authors, notes..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface-raised border border-subtle text-xs text-primary placeholder:text-muted focus:outline-none focus:border-accent"
                />
                <IoSearchOutline
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-surface-raised border border-subtle text-xs font-semibold text-primary focus:outline-none focus:border-accent cursor-pointer"
                >
                  <option value="newest">Sort: Newest First</option>
                  <option value="oldest">Sort: Oldest First</option>
                </select>
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          {filteredMessages.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-3xl bg-surface border border-subtle space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-[#5865F2]/10 text-[#5865F2] flex items-center justify-center mx-auto shadow-inner">
                <FaDiscord size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-primary">No messages found</h3>
                <p className="text-xs text-muted max-w-sm mx-auto">
                  {searchQuery
                    ? 'No messages match your search term.'
                    : 'Right-click any message in Discord → Apps → Save to OrganizeUp to see it in your Vault.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {filteredMessages.map((msg) => {
                  const hasMedia = msg.media && msg.media.length > 0;
                  const firstMedia = hasMedia ? msg.media[0] : null;

                  return (
                    <motion.div
                      key={msg._id}
                      layout
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="group relative flex flex-col rounded-3xl bg-surface border border-subtle hover:border-[#5865F2]/40 transition-all duration-300 overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-black/20 hover:-translate-y-1"
                    >
                      {/* Top Media Cover (Vault Style) */}
                      {hasMedia && (
                        <div
                          onClick={() =>
                            setLightboxImage(`/api/discord/media/${firstMedia.gridFsId}`)
                          }
                          className="relative h-48 sm:h-52 overflow-hidden bg-black/40 border-b border-subtle cursor-zoom-in"
                        >
                          <img
                            src={`/api/discord/media/${firstMedia.gridFsId}`}
                            alt="Discord Attachment"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

                          {/* Media count pill if multiple */}
                          {msg.media.length > 1 && (
                            <div className="absolute top-3 right-3 px-2 py-1 rounded-lg text-[10px] font-bold bg-black/70 text-white backdrop-blur-md border border-white/20 shadow-md">
                              +{msg.media.length - 1} photos
                            </div>
                          )}

                          {/* Platform pill overlay */}
                          <div className="absolute top-3 left-3 px-2 py-1 rounded-lg text-[10px] font-bold bg-[#5865F2]/90 text-white backdrop-blur-md flex items-center gap-1 shadow-md">
                            <FaDiscord size={12} />
                            <span>DISCORD</span>
                          </div>
                        </div>
                      )}

                      {/* Video Message Banner */}
                      {msg.videoLink && !hasMedia && (
                        <div className="p-3.5 bg-gradient-to-r from-purple-500/15 to-indigo-500/15 border-b border-subtle flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                            <IoVideocamOutline size={16} />
                            <span>Video Message Attached</span>
                          </div>
                          <a
                            href={msg.videoLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[11px] px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 flex items-center gap-1 transition-colors"
                          >
                            <FaExternalLinkAlt size={10} /> Play
                          </a>
                        </div>
                      )}

                      {/* Card Content Details */}
                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-3">
                          {/* Header: Author + Origin Badge + Date */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5865F2] to-indigo-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-md shadow-[#5865F2]/20">
                                {msg.authorName?.charAt(0)?.toUpperCase() || 'D'}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs sm:text-sm font-bold text-primary truncate leading-tight">
                                  {msg.authorName}
                                </h4>
                                <div className="flex items-center gap-1 text-[11px] text-muted truncate mt-0.5">
                                  <span className="truncate">
                                    {msg.guildName || 'Direct Message'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className="text-[10px] text-muted whitespace-nowrap">
                                {formatDate(msg.createdAt)}
                              </span>
                              {/* 1-Click Copy Text Button */}
                              {msg.text && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard(msg.text, msg._id);
                                  }}
                                  className="p-1 rounded-lg text-muted hover:text-white hover:bg-surface-raised transition-colors cursor-pointer"
                                  title="Copy message text"
                                >
                                  {copiedId === msg._id ? (
                                    <FaCheck size={11} className="text-emerald-400" />
                                  ) : (
                                    <FaRegCopy size={11} />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Message Chat Bubble */}
                          {msg.text && (
                            <div
                              onClick={() => setSelectedMsg(msg)}
                              className="p-3 rounded-2xl bg-surface-raised/40 hover:bg-surface-raised/70 border border-subtle/70 transition-all cursor-pointer"
                            >
                              <p className="text-xs sm:text-[13px] text-secondary group-hover:text-primary line-clamp-4 leading-relaxed whitespace-pre-wrap font-sans">
                                {renderTextWithLinks(msg.text)}
                              </p>
                            </div>
                          )}

                          {/* Personal Note Box (Vault Style) */}
                          <div className="pt-1">
                            {editingNoteId === msg._id ? (
                              <div className="space-y-2 p-3 rounded-2xl bg-surface-raised border border-accent">
                                <textarea
                                  rows={3}
                                  value={noteDraft}
                                  onChange={(e) => setNoteDraft(e.target.value)}
                                  placeholder="Add your note or reflection..."
                                  className="w-full p-2 rounded-xl bg-surface border border-subtle text-xs text-primary focus:outline-none resize-none"
                                  autoFocus
                                />
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => setEditingNoteId(null)}
                                    className="px-2.5 py-1 rounded-lg text-[11px] text-muted hover:text-primary cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleSaveInlineNote(msg._id)}
                                    className="px-3 py-1 rounded-lg bg-accent text-white text-[11px] font-bold shadow-sm cursor-pointer"
                                  >
                                    Save Note
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div
                                onClick={() => {
                                  setEditingNoteId(msg._id);
                                  setNoteDraft(msg.note || '');
                                }}
                                className="group/note p-2.5 rounded-2xl bg-surface-raised/60 hover:bg-surface-raised border border-subtle transition-all cursor-pointer"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[10px] font-bold text-muted uppercase tracking-wider flex items-center gap-1">
                                    <IoDocumentTextOutline size={12} className="text-accent" />
                                    <span>Personal Note</span>
                                  </span>
                                  <FaEdit
                                    size={11}
                                    className="text-muted group-hover/note:text-accent transition-colors"
                                  />
                                </div>
                                <p className="text-xs text-secondary line-clamp-2">
                                  {msg.note ? (
                                    msg.note
                                  ) : (
                                    <span className="text-muted italic">
                                      + Click to add note or reflection...
                                    </span>
                                  )}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Extracted URLs Pills */}
                          {msg.extractedUrls && msg.extractedUrls.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {msg.extractedUrls.slice(0, 2).map((url, idx) => (
                                <a
                                  key={idx}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-medium bg-[#5865F2]/10 text-[#5865F2] hover:underline border border-[#5865F2]/20"
                                >
                                  <FaLink size={10} />
                                  <span className="truncate max-w-[140px]">{url}</span>
                                </a>
                              ))}
                              {msg.extractedUrls.length > 2 && (
                                <span className="text-[10px] text-muted self-center">
                                  +{msg.extractedUrls.length - 2} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Card Bottom Bar */}
                        <div className="pt-3 border-t border-subtle flex items-center justify-between">
                          <button
                            onClick={() => setSelectedMsg(msg)}
                            className="flex items-center gap-1 text-xs text-secondary hover:text-primary transition-colors cursor-pointer"
                          >
                            <IoChatbubbleOutline size={13} />
                            <span>Details</span>
                          </button>

                          <div className="flex items-center gap-2">
                            {msg.videoLink && (
                              <a
                                href={msg.videoLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-1.5 rounded-lg text-muted hover:text-accent transition-colors cursor-pointer"
                                title="Open Video Link"
                              >
                                <FaExternalLinkAlt size={12} />
                              </a>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteMsgItem(msg);
                              }}
                              className="p-1.5 rounded-lg text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                              title="Delete Message"
                            >
                              <FaTrashAlt size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* Full Message Detail Modal */}
      {selectedMsg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => {
            setSelectedMsg(null);
            setEditingGuildName(false);
          }}
        >
          <div
            className="glass-card border border-strong rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-subtle bg-surface-raised">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#5865F2]/20 border border-[#5865F2]/30 flex items-center justify-center text-[#5865F2] font-bold text-sm shadow-md">
                  {selectedMsg.authorName?.charAt(0) || 'D'}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-primary">{selectedMsg.authorName}</h3>
                    {editingGuildName ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={guildNameInput}
                          onChange={(e) => setGuildNameInput(e.target.value)}
                          placeholder="Server/Channel name..."
                          className="bg-surface border border-subtle text-primary text-xs px-2.5 py-1 rounded-lg w-44 focus:outline-none focus:border-accent"
                          autoFocus
                          onKeyDown={(e) => e.key === 'Enter' && saveGuildName()}
                        />
                        <button
                          onClick={saveGuildName}
                          className="text-emerald-400 hover:text-emerald-300 p-1 rounded-lg bg-surface"
                        >
                          <FaCheck size={11} />
                        </button>
                        <button
                          onClick={() => setEditingGuildName(false)}
                          className="text-muted hover:text-primary p-1 rounded-lg bg-surface"
                        >
                          <FaTimes size={11} />
                        </button>
                      </div>
                    ) : (
                      <span
                        className="text-xs text-secondary bg-surface px-2.5 py-0.5 rounded-full flex items-center gap-1 group/guild cursor-pointer hover:bg-surface-raised border border-subtle"
                        onClick={() => {
                          setGuildNameInput(
                            selectedMsg.guildName === 'External Server'
                              ? ''
                              : selectedMsg.guildName
                          );
                          setEditingGuildName(true);
                        }}
                        title="Click to edit server name"
                      >
                        in {selectedMsg.guildName || 'Direct Message'}
                        <FaEdit
                          className="opacity-0 group-hover/guild:opacity-100 text-muted"
                          size={10}
                        />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted mt-0.5">{formatDate(selectedMsg.createdAt)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDeleteMsgItem(selectedMsg)}
                  className="p-2 rounded-xl text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                  title="Delete message"
                >
                  <FaTrashAlt size={14} />
                </button>
                <button
                  onClick={() => setSelectedMsg(null)}
                  className="p-2 rounded-xl text-muted hover:text-primary hover:bg-surface-raised transition-colors cursor-pointer"
                >
                  <IoCloseOutline size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1">
              {/* Media gallery if available */}
              {selectedMsg.media && selectedMsg.media.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
                    <IoImageOutline size={14} /> Attachments ({selectedMsg.media.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedMsg.media.map((mediaFile) => (
                      <div
                        key={mediaFile.gridFsId}
                        onClick={() =>
                          setLightboxImage(`/api/discord/media/${mediaFile.gridFsId}`)
                        }
                        className="rounded-2xl overflow-hidden border border-subtle bg-black/40 aspect-video cursor-zoom-in group/img"
                      >
                        <img
                          src={`/api/discord/media/${mediaFile.gridFsId}`}
                          alt="Attachment"
                          className="w-full h-full object-cover group-hover/img:scale-105 transition-transform"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Video Link if available */}
              {selectedMsg.videoLink && (
                <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    <IoVideocamOutline size={16} /> Discord Video Link
                  </span>
                  <a
                    href={selectedMsg.videoLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-sm"
                  >
                    <FaExternalLinkAlt size={11} /> Open Video
                  </a>
                </div>
              )}

              {/* Message text content */}
              <div className="p-5 rounded-2xl bg-surface-raised/40 border border-subtle text-primary whitespace-pre-wrap text-sm leading-relaxed font-sans">
                {renderTextWithLinks(selectedMsg.text)}
              </div>

              {/* Personal Notes Editor */}
              <div className="p-4 rounded-2xl bg-surface-raised/50 border border-subtle space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <IoDocumentTextOutline size={15} className="text-accent" /> Personal Notes & Takeaways
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="Record key learnings, actions, or summary..."
                  className="w-full p-3 rounded-xl bg-surface border border-subtle text-xs text-primary focus:outline-none focus:border-accent resize-none"
                />
                <div className="flex justify-end">
                  <button
                    onClick={() => handleSaveInlineNote(selectedMsg._id)}
                    className="btn-primary text-xs py-1.5 px-4 rounded-xl font-bold shadow-sm"
                  >
                    Save Note
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-subtle bg-surface-raised flex items-center justify-between">
              <button
                onClick={() => copyToClipboard(selectedMsg.text, selectedMsg._id)}
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                <FaRegCopy size={12} />
                <span>Copy Text</span>
              </button>
              <button
                onClick={() => setSelectedMsg(null)}
                className="btn-secondary text-xs py-1.5 px-4"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox for Full-Resolution Image Viewing */}
      <AnimatePresence>
        {lightboxImage && (
          <div
            onClick={() => setLightboxImage(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-zoom-out"
          >
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <IoCloseOutline size={24} />
            </button>
            <img
              src={lightboxImage}
              alt="Full Preview"
              className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Themed Confirmation Modal for Deletion */}
      <ConfirmDialog
        isOpen={Boolean(deleteMsgItem)}
        title="Remove from Discord Library"
        message={
          deleteMsgItem ? (
            <div className="space-y-3">
              <p className="text-secondary text-sm">
                Are you sure you want to delete this Discord message? This action cannot be undone.
              </p>
              <div className="p-3 rounded-xl bg-surface border border-subtle flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#5865F2]/20 text-[#5865F2] flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {deleteMsgItem.authorName?.charAt(0) || 'D'}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-primary truncate">
                    {deleteMsgItem.authorName}
                  </h4>
                  <p className="text-[11px] text-muted truncate mt-0.5">
                    {deleteMsgItem.text || 'Discord Attachment'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            'Are you sure you want to remove this message?'
          )
        }
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteMsgItem(null)}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default DiscordLibrary;
