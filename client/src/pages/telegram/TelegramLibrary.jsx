import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaTelegramPlane,
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

const TelegramLibrary = () => {
  const { user } = useSelector((state) => state.auth);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [linkCode, setLinkCode] = useState(null);
  const [botUsername] = useState('Organize_Up_bot');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'media' | 'notes' | 'links'
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest'

  // Modal & Interactive State
  const [selectedMsg, setSelectedMsg] = useState(null);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [deleteMsgItem, setDeleteMsgItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      setLoading(true);
      const res = await api.get('/telegram/status');
      setIsConnected(res.data.isConnected);
      if (res.data.isConnected) {
        await fetchMessages();
      }
    } catch (error) {
      toast.error('Failed to check Telegram status');
    } finally {
      setLoading(false);
    }
  };

  const unlinkTelegram = async () => {
    try {
      setLoading(true);
      await api.delete('/telegram/unlink');
      setIsConnected(false);
      setMessages([]);
      toast.success('Telegram account disconnected');
    } catch (error) {
      toast.error('Failed to disconnect Telegram');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await api.get('/telegram/messages');
      setMessages(res.data);
      // Mark as read in background
      api.put('/telegram/read').catch((err) => console.error(err));
    } catch (error) {
      toast.error('Failed to load messages');
    }
  };

  const generateLinkCode = async () => {
    try {
      const res = await api.post('/telegram/link');
      setLinkCode(res.data.linkCode);
      toast.success('Code generated!');
    } catch (error) {
      toast.error('Failed to generate code');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteMsgItem) return;
    setIsDeleting(true);
    try {
      await api.delete(`/telegram/messages/${deleteMsgItem._id}`);
      setMessages((prev) => prev.filter((m) => m._id !== deleteMsgItem._id));
      if (selectedMsg?._id === deleteMsgItem._id) setSelectedMsg(null);
      toast.success('Removed from Telegram Library');
      setDeleteMsgItem(null);
    } catch (error) {
      toast.error('Failed to delete message');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveInlineNote = async (id) => {
    try {
      const res = await api.put(`/telegram/messages/${id}/note`, { note: noteDraft });
      setMessages((prev) => prev.map((m) => (m._id === id ? res.data : m)));
      if (selectedMsg?._id === id) setSelectedMsg(res.data);
      setEditingNoteId(null);
      toast.success('Personal note saved');
    } catch (error) {
      toast.error('Failed to save note');
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
          if (!msg.bannerImageId) return false;
        } else if (activeFilter === 'notes') {
          if (!msg.note || !msg.note.trim()) return false;
        } else if (activeFilter === 'links') {
          const hasLink = Boolean(msg.extractedUrl);
          if (!hasLink) return false;
        }

        // Search Query Filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchSender = msg.senderName?.toLowerCase().includes(q);
          const matchText = msg.text?.toLowerCase().includes(q);
          const matchNote = msg.note?.toLowerCase().includes(q);
          if (!matchSender && !matchText && !matchNote) return false;
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
      media: messages.filter((m) => Boolean(m.bannerImageId)).length,
      notes: messages.filter((m) => m.note && m.note.trim()).length,
      links: messages.filter((m) => Boolean(m.extractedUrl)).length,
    };
  }, [messages]);

  if (loading) return <LoadingSpinner text="Connecting to Telegram Library..." />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#229ED9]/10 border border-[#229ED9]/25 shadow-lg shadow-[#229ED9]/10 flex items-center justify-center text-[#229ED9]">
            <FaTelegramPlane size={30} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-primary font-display">Telegram Library</h1>
              {isConnected && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Telegram Active
                </span>
              )}
            </div>
            <p className="text-secondary text-sm mt-1">
              Your permanent vault for forwarded Telegram notes, media & links
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
              onClick={unlinkTelegram}
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
          <div className="w-20 h-20 rounded-3xl bg-[#229ED9]/15 border border-[#229ED9]/30 flex items-center justify-center mx-auto text-[#229ED9] shadow-inner">
            <FaTelegramPlane size={42} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-primary font-display">
              Connect Your Telegram Account
            </h2>
            <p className="text-secondary text-sm leading-relaxed max-w-md mx-auto">
              Link your Telegram to forward text messages, media, voice notes, and documents
              directly to your OrganizeUp Library.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-surface-raised/60 border border-subtle text-left space-y-4 max-w-md mx-auto">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center text-xs font-bold shrink-0">
                1
              </span>
              <p className="text-xs text-secondary leading-relaxed">
                Click below to generate your unique connection code.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center text-xs font-bold shrink-0">
                2
              </span>
              <p className="text-xs text-secondary leading-relaxed">
                Open{' '}
                <a
                  href={`https://t.me/${botUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent font-semibold hover:underline"
                >
                  @{botUsername}
                </a>{' '}
                in Telegram.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center text-xs font-bold shrink-0">
                3
              </span>
              <p className="text-xs text-secondary leading-relaxed">
                Send <span className="font-mono font-bold text-primary">/start &lt;code&gt;</span> to the bot!
              </p>
            </div>
          </div>

          {linkCode ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-accent-subtle/40 border border-accent/30 max-w-xs mx-auto">
                <span className="text-xs text-muted block mb-1">Your Link Code:</span>
                <span className="text-2xl font-mono font-bold text-accent tracking-widest">
                  {linkCode}
                </span>
              </div>
              <a
                href={`https://t.me/${botUsername}?start=${linkCode}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary px-8 py-3.5 rounded-2xl text-sm font-bold shadow-lg shadow-accent/20 hover:scale-105 transition-all inline-flex items-center gap-2"
              >
                <FaTelegramPlane size={18} />
                <span>Open in Telegram</span>
              </a>
            </div>
          ) : (
            <button
              onClick={generateLinkCode}
              className="btn-primary px-8 py-3.5 rounded-2xl text-sm font-bold shadow-lg shadow-accent/20 hover:scale-105 transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <FaTelegramPlane size={18} />
              <span>Generate Connection Code</span>
            </button>
          )}
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
                        ? 'bg-[#229ED9] text-white shadow-md shadow-[#229ED9]/25'
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
                  placeholder="Search Telegram messages, senders, notes..."
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
              <div className="w-16 h-16 rounded-3xl bg-[#229ED9]/10 text-[#229ED9] flex items-center justify-center mx-auto shadow-inner">
                <FaTelegramPlane size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-primary">No messages found</h3>
                <p className="text-xs text-muted max-w-sm mx-auto">
                  {searchQuery
                    ? 'No messages match your search query.'
                    : `Forward any post, link, or note to @${botUsername} on Telegram to see it in your Vault.`}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {filteredMessages.map((msg) => {
                  const hasMedia = Boolean(msg.bannerImageId);

                  return (
                    <motion.div
                      key={msg._id}
                      layout
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="group relative flex flex-col rounded-3xl bg-surface border border-subtle hover:border-[#229ED9]/40 transition-all duration-300 overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-black/20 hover:-translate-y-1"
                    >
                      {/* Top Media Cover (Vault Style) */}
                      {hasMedia && (
                        <div
                          onClick={() =>
                            setLightboxImage(`/api/telegram/image/${msg.bannerImageId}`)
                          }
                          className="relative h-48 sm:h-52 overflow-hidden bg-black/40 border-b border-subtle cursor-zoom-in"
                        >
                          <img
                            src={`/api/telegram/image/${msg.bannerImageId}`}
                            alt="Telegram Attachment"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

                          {/* Platform pill overlay */}
                          <div className="absolute top-3 left-3 px-2 py-1 rounded-lg text-[10px] font-bold bg-[#229ED9]/90 text-white backdrop-blur-md flex items-center gap-1 shadow-md">
                            <FaTelegramPlane size={12} />
                            <span>TELEGRAM</span>
                          </div>
                        </div>
                      )}

                      {/* Card Content Details */}
                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-3">
                          {/* Header: Sender + Date */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#229ED9] to-cyan-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-md shadow-[#229ED9]/20">
                                {msg.senderName?.charAt(0)?.toUpperCase() || 'T'}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs sm:text-sm font-bold text-primary truncate leading-tight">
                                  {msg.senderName}
                                </h4>
                                <div className="flex items-center gap-1 text-[11px] text-muted truncate mt-0.5">
                                  <span className="truncate">@{msg.senderName}</span>
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

                          {/* Extracted URL Pill */}
                          {msg.extractedUrl && (
                            <div className="pt-1">
                              <a
                                href={msg.extractedUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#229ED9]/10 text-[#229ED9] hover:underline border border-[#229ED9]/20"
                              >
                                <FaLink size={10} />
                                <span className="truncate max-w-[200px]">{msg.extractedUrl}</span>
                              </a>
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
          onClick={() => setSelectedMsg(null)}
        >
          <div
            className="glass-card border border-strong rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-subtle bg-surface-raised">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#229ED9]/20 border border-[#229ED9]/30 flex items-center justify-center text-[#229ED9] font-bold text-sm shadow-md">
                  {selectedMsg.senderName?.charAt(0) || 'T'}
                </div>
                <div>
                  <h3 className="text-base font-bold text-primary">From: {selectedMsg.senderName}</h3>
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
              {/* Media banner if available */}
              {selectedMsg.bannerImageId && (
                <div
                  onClick={() =>
                    setLightboxImage(`/api/telegram/image/${selectedMsg.bannerImageId}`)
                  }
                  className="rounded-2xl overflow-hidden border border-subtle bg-black/40 max-h-80 flex justify-center cursor-zoom-in group/img"
                >
                  <img
                    src={`/api/telegram/image/${selectedMsg.bannerImageId}`}
                    alt="Telegram Attachment"
                    className="max-w-full h-full object-contain group-hover/img:scale-105 transition-transform"
                  />
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
        title="Remove from Telegram Library"
        message={
          deleteMsgItem ? (
            <div className="space-y-3">
              <p className="text-secondary text-sm">
                Are you sure you want to delete this Telegram message? This action cannot be undone.
              </p>
              <div className="p-3 rounded-xl bg-surface border border-subtle flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#229ED9]/20 text-[#229ED9] flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {deleteMsgItem.senderName?.charAt(0) || 'T'}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-primary truncate">
                    {deleteMsgItem.senderName}
                  </h4>
                  <p className="text-[11px] text-muted truncate mt-0.5">
                    {deleteMsgItem.text || 'Telegram Attachment'}
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

export default TelegramLibrary;
