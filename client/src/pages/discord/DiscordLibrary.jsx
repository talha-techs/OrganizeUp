import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { FaDiscord, FaCheck, FaTrash, FaLink, FaTimes, FaTag, FaSync, FaExternalLinkAlt, FaEdit } from 'react-icons/fa';
import api from '../../utils/api';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const DiscordLibrary = () => {
  const { user } = useSelector((state) => state.auth);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Modal State
  const [selectedMsg, setSelectedMsg] = useState(null);
  const [editingNote, setEditingNote] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [editingGuildName, setEditingGuildName] = useState(false);
  const [guildNameInput, setGuildNameInput] = useState('');

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
      
      // Remove code from URL
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
        fetchMessages();
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
      if (!clientId) throw new Error("Missing client ID");
      
      const redirectUri = window.location.origin + '/discord-inbox';
      const oauthUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=identify%20applications.commands&integration_type=1`;
      
      window.location.href = oauthUrl;
    } catch (error) {
      toast.error('Failed to initialize Discord login');
      setLoading(false);
    }
  };

  const deleteMessage = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await api.delete(`/discord/messages/${id}`);
      setMessages(messages.filter((m) => m._id !== id));
      if (selectedMsg?._id === id) setSelectedMsg(null);
      toast.success('Message deleted');
    } catch (error) {
      toast.error('Failed to delete message');
    }
  };

  const saveNote = async () => {
    if (!selectedMsg) return;
    try {
      const res = await api.put(`/discord/messages/${selectedMsg._id}/note`, { note: noteInput });
      setMessages(messages.map((m) => (m._id === selectedMsg._id ? res.data : m)));
      setSelectedMsg(res.data);
      setEditingNote(false);
      toast.success('Note saved');
    } catch (error) {
      toast.error('Failed to save note');
    }
  };

  const saveGuildName = async () => {
    if (!selectedMsg || !guildNameInput.trim()) return;
    try {
      const res = await api.put(`/discord/messages/${selectedMsg._id}/guildName`, { guildName: guildNameInput });
      setMessages(messages.map((m) => (m._id === selectedMsg._id ? res.data : m)));
      setSelectedMsg(res.data);
      setEditingGuildName(false);
      toast.success('Server name saved');
    } catch (error) {
      toast.error('Failed to save server name');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const renderTextWithLinks = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
            {part}
          </a>
        );
      }
      return part;
    });
  };

  const renderMessageCards = (msgs) => {
    if (msgs.length === 0) return null;
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {msgs.map((msg) => (
          <div 
            key={msg._id} 
            onClick={() => setSelectedMsg(msg)}
            className="bg-surface border border-subtle rounded-xl p-5 hover:border-accent/50 cursor-pointer transition-all flex flex-col h-auto min-h-[16rem] group"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium bg-surface-raised text-secondary px-2 py-1 rounded-md w-fit">
                  From: {msg.authorName}
                </span>
                {msg.guildName && (
                  <span className="text-[10px] text-muted px-1 font-medium">
                    in {msg.guildName}
                  </span>
                )}
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-xs text-muted">
                  {new Date(msg.createdAt).toLocaleDateString()}
                </span>
                <span className="text-[10px] text-muted">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
            
            {msg.note && (
              <div className="mb-3 flex items-start gap-2 text-xs text-amber-400 bg-amber-400/10 p-2 rounded border border-amber-400/20">
                <FaTag className="mt-0.5 shrink-0" />
                <span className="line-clamp-2">{msg.note}</span>
              </div>
            )}

            {/* Images Render */}
            {msg.media && msg.media.length > 0 && (
              <div className="w-full h-48 mb-3 rounded-lg overflow-hidden shrink-0 border border-subtle bg-canvas grid gap-1 grid-cols-2">
                {msg.media.map(mediaFile => (
                  <img 
                    key={mediaFile.gridFsId}
                    src={`/api/discord/media/${mediaFile.gridFsId}`} 
                    alt="Discord Attachment" 
                    className="w-full h-full object-cover object-top opacity-80 group-hover:opacity-100 transition-opacity col-span-2" 
                  />
                ))}
              </div>
            )}

            <div className="text-secondary text-sm whitespace-pre-wrap flex-1 overflow-hidden relative">
              <div className="line-clamp-4">{msg.text}</div>
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-surface to-transparent"></div>
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-subtle">
              <div className="flex items-center gap-2">
                {msg.extractedUrls?.length > 0 && (
                  <div className="flex items-center gap-1 text-accent text-xs overflow-hidden">
                    <FaLink className="shrink-0" />
                    <span className="truncate">Links</span>
                  </div>
                )}
                {msg.videoLink && (
                  <a 
                    href={msg.videoLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-accent text-xs hover:underline z-10"
                  >
                    <FaExternalLinkAlt className="shrink-0" />
                    <span>Video Message</span>
                  </a>
                )}
              </div>
              
              <button
                onClick={(e) => deleteMessage(msg._id, e)}
                className="text-muted hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                title="Delete"
              >
                <FaTrash />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-accent-subtle p-3 rounded-xl border border-accent/30">
            <FaDiscord className="text-accent text-2xl" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-primary">Discord Library</h1>
            <p className="text-secondary">Your permanent vault for Discord resources</p>
          </div>
        </div>
        {isConnected && (
          <button
            onClick={unlinkDiscord}
            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer"
          >
            <FaTimes /> Unlink Account
          </button>
        )}
      </div>

      {!isConnected ? (
        <div className="bg-surface border border-subtle rounded-2xl p-8 max-w-2xl mx-auto text-center">
          <FaDiscord className="text-6xl text-accent mx-auto mb-6 opacity-80" />
          <h2 className="text-2xl font-bold text-primary mb-4">Connect Your Discord Account</h2>
          <p className="text-secondary mb-8 leading-relaxed">
            Link your OrganizeUp account to our Discord User App. Once connected, you can right-click any message 
            in any server and select <b>Apps → Save to OrganizeUp</b> to instantly save it here!
          </p>

          <button
            onClick={linkDiscord}
            className="btn-primary px-8 py-3 rounded-lg font-medium transition-colors cursor-pointer"
          >
            Connect Account
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-primary">Saved Messages ({messages.length})</h2>
            <div className="flex items-center gap-4">
              <button 
                onClick={fetchMessages}
                className="text-secondary hover:text-primary bg-surface-raised hover:bg-surface px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors text-sm border border-subtle cursor-pointer"
              >
                <FaSync className={loading ? "animate-spin" : ""} /> Refresh
              </button>
              <div className="text-sm px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 flex items-center gap-2">
                <FaCheck /> Connected to Discord
              </div>
            </div>
          </div>

          {messages.length === 0 ? (
            <div className="bg-surface border border-subtle border-dashed rounded-2xl p-12 text-center">
              <p className="text-secondary text-lg">Your library is empty!</p>
              <p className="text-muted mt-2">Right-click any message in Discord → Apps → Save to OrganizeUp to see it here.</p>
            </div>
          ) : (
            <div className="space-y-10">
              {renderMessageCards(messages)}
            </div>
          )}
        </div>
      )}

      {/* Full Message Modal */}
      {selectedMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => { setSelectedMsg(null); setEditingNote(false); }}>
          <div 
            className="bg-surface border border-strong rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-subtle bg-surface-raised rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center text-primary font-bold border border-subtle">
                  {selectedMsg.authorName?.charAt(0) || 'U'}
                </div>
                <div>
                  <h3 className="text-primary font-medium flex items-center gap-2">
                    {selectedMsg.authorName}
                    {editingGuildName ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={guildNameInput}
                          onChange={(e) => setGuildNameInput(e.target.value)}
                          placeholder="Save server name manually"
                          title="Save server name manually. Unfortunately the original server name cannot be displayed due to discord's policy"
                          className="bg-surface border border-subtle text-primary text-xs px-2 py-0.5 rounded w-48 focus:outline-none focus:border-accent"
                          autoFocus
                          onKeyDown={(e) => e.key === 'Enter' && saveGuildName()}
                        />
                        <button onClick={saveGuildName} className="text-emerald-400 hover:text-emerald-300 bg-surface p-1 rounded cursor-pointer">
                          <FaCheck size={10} />
                        </button>
                        <button onClick={() => setEditingGuildName(false)} className="text-muted hover:text-primary bg-surface p-1 rounded cursor-pointer">
                          <FaTimes size={10} />
                        </button>
                      </div>
                    ) : (
                      selectedMsg.guildName && (
                        <span 
                          className="text-xs font-normal text-secondary bg-surface px-2 py-0.5 rounded-full flex items-center gap-1 group/guild cursor-pointer hover:bg-surface-raised transition-colors border border-subtle"
                          onClick={() => {
                            setGuildNameInput(selectedMsg.guildName === "External Server" ? "" : selectedMsg.guildName);
                            setEditingGuildName(true);
                          }}
                          title={selectedMsg.guildName === "External Server" ? "Save server name manually. Unfortunately the original server name cannot be displayed due to discord's policy" : "Edit server name"}
                        >
                          in {selectedMsg.guildName}
                          <FaEdit className="opacity-0 group-hover/guild:opacity-100 transition-opacity text-muted hover:text-primary" size={10} />
                        </span>
                      )
                    )}
                  </h3>
                  <p className="text-xs text-muted mt-1">{new Date(selectedMsg.createdAt).toLocaleString()}</p>
                </div>
              </div>
              <button 
                onClick={() => { setSelectedMsg(null); setEditingNote(false); }}
                className="text-muted hover:text-primary p-2 rounded-lg hover:bg-surface transition-colors cursor-pointer"
              >
                <FaTimes />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              {selectedMsg.note && !editingNote && (
                <div className="mb-6 bg-amber-400/10 border border-amber-400/20 rounded-xl p-4 flex gap-3">
                  <FaTag className="text-amber-400 mt-1 shrink-0" />
                  <div className="flex-1">
                    <p className="text-amber-400 text-sm whitespace-pre-wrap">{selectedMsg.note}</p>
                  </div>
                </div>
              )}

              {selectedMsg.videoLink && (
                <div className="mb-6">
                  <a href={selectedMsg.videoLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-accent-subtle text-accent hover:bg-accent/20 px-4 py-2 rounded-lg transition-colors border border-accent/20 cursor-pointer">
                    <FaExternalLinkAlt /> Open Discord Video Message
                  </a>
                </div>
              )}

              {selectedMsg.media && selectedMsg.media.length > 0 && (
                <div className="mb-6 rounded-xl overflow-hidden border border-subtle bg-canvas flex flex-col gap-2">
                  {selectedMsg.media.map(mediaFile => (
                    <img key={mediaFile.gridFsId} src={`/api/discord/media/${mediaFile.gridFsId}`} alt="Attachment" className="w-full max-h-96 object-contain" />
                  ))}
                </div>
              )}

              <div className="text-primary whitespace-pre-wrap text-[15px] leading-relaxed font-sans">
                {renderTextWithLinks(selectedMsg.text)}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-subtle bg-surface-raised rounded-b-2xl flex items-center justify-between gap-4">
              <div className="flex-1">
                {editingNote ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      placeholder="Add a searchable note..."
                      className="flex-1 bg-surface border border-subtle rounded-lg px-4 py-2 text-sm text-primary focus:outline-none focus:border-accent"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && saveNote()}
                    />
                    <button onClick={saveNote} className="btn-primary px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer">
                      Save
                    </button>
                    <button onClick={() => setEditingNote(false)} className="text-muted hover:text-primary px-3 py-2 text-sm transition-colors cursor-pointer">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button onClick={() => { setNoteInput(selectedMsg.note || ''); setEditingNote(true); }} className="text-secondary hover:text-primary flex items-center gap-2 text-sm transition-colors cursor-pointer">
                    <FaTag /> {selectedMsg.note ? 'Edit Note' : 'Add Note'}
                  </button>
                )}
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                {selectedMsg.text && (
                  <button 
                    onClick={() => copyToClipboard(selectedMsg.text)}
                    className="bg-surface hover:bg-surface-raised p-2 rounded-lg text-secondary hover:text-primary transition-colors border border-subtle cursor-pointer"
                    title="Copy Text"
                  >
                    Copy Text
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscordLibrary;
