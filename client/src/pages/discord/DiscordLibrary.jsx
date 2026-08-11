import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { FaDiscord, FaCheck, FaTrash, FaLink, FaTimes, FaTag, FaSync, FaExternalLinkAlt } from 'react-icons/fa';
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
      const oauthUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=identify%20applications.commands`;
      
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
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
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
            className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-[#5865F2]/50 cursor-pointer transition-all flex flex-col h-auto min-h-[16rem] group"
          >
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-medium bg-slate-800 text-slate-300 px-2 py-1 rounded-md">
                From: {msg.authorName}
              </span>
              <span className="text-xs text-slate-500">
                {new Date(msg.createdAt).toLocaleDateString()}
              </span>
            </div>
            
            {msg.note && (
              <div className="mb-3 flex items-start gap-2 text-xs text-yellow-400 bg-yellow-400/10 p-2 rounded border border-yellow-400/20">
                <FaTag className="mt-0.5 shrink-0" />
                <span className="line-clamp-2">{msg.note}</span>
              </div>
            )}

            {/* Images Render */}
            {msg.media && msg.media.length > 0 && (
              <div className="w-full h-48 mb-3 rounded-lg overflow-hidden shrink-0 border border-slate-700/50 bg-slate-950 grid gap-1 grid-cols-2">
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

            <div className="text-slate-300 text-sm whitespace-pre-wrap flex-1 overflow-hidden relative">
              <div className="line-clamp-4">{msg.text}</div>
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-900 to-transparent"></div>
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800">
              <div className="flex items-center gap-2">
                {msg.extractedUrls?.length > 0 && (
                  <div className="flex items-center gap-1 text-blue-400 text-xs overflow-hidden">
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
                    className="flex items-center gap-1 text-[#5865F2] text-xs hover:underline z-10"
                  >
                    <FaExternalLinkAlt className="shrink-0" />
                    <span>Video Message</span>
                  </a>
                )}
              </div>
              
              <button
                onClick={(e) => deleteMessage(msg._id, e)}
                className="text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
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
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-[#5865F2]/20 p-3 rounded-xl border border-[#5865F2]/30">
          <FaDiscord className="text-[#5865F2] text-2xl" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Discord Library</h1>
          <p className="text-slate-400">Your permanent vault for Discord resources</p>
        </div>
      </div>

      {!isConnected ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-2xl mx-auto text-center">
          <FaDiscord className="text-6xl text-[#5865F2] mx-auto mb-6 opacity-80" />
          <h2 className="text-2xl font-bold text-white mb-4">Connect Your Discord Account</h2>
          <p className="text-slate-400 mb-8 leading-relaxed">
            Link your OrganizeUp account to our Discord User App. Once connected, you can right-click any message 
            in any server and select <b>Apps -> Save to OrganizeUp</b> to instantly save it here!
          </p>

          <button
            onClick={linkDiscord}
            className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-8 py-3 rounded-lg font-medium transition-colors"
          >
            Connect Account
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white">Saved Messages ({messages.length})</h2>
            <div className="flex items-center gap-4">
              <button 
                onClick={fetchMessages}
                className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors text-sm"
              >
                <FaSync className={loading ? "animate-spin" : ""} /> Refresh
              </button>
              <div className="text-sm px-3 py-1 bg-green-500/10 text-green-400 rounded-full border border-green-500/20 flex items-center gap-2">
                <FaCheck /> Connected to Discord
              </div>
            </div>
          </div>

          {messages.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800 border-dashed rounded-2xl p-12 text-center">
              <p className="text-slate-400 text-lg">Your library is empty!</p>
              <p className="text-slate-500 mt-2">Right-click any message in Discord -> Apps -> Save to OrganizeUp to see it here.</p>
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
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold">
                  {selectedMsg.authorName?.charAt(0) || 'U'}
                </div>
                <div>
                  <h3 className="text-white font-medium">{selectedMsg.authorName}</h3>
                  <p className="text-xs text-slate-500">{new Date(selectedMsg.createdAt).toLocaleString()}</p>
                </div>
              </div>
              <button 
                onClick={() => { setSelectedMsg(null); setEditingNote(false); }}
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <FaTimes />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              {selectedMsg.note && !editingNote && (
                <div className="mb-6 bg-yellow-400/10 border border-yellow-400/20 rounded-xl p-4 flex gap-3">
                  <FaTag className="text-yellow-400 mt-1 shrink-0" />
                  <div className="flex-1">
                    <p className="text-yellow-400/90 text-sm whitespace-pre-wrap">{selectedMsg.note}</p>
                  </div>
                </div>
              )}

              {selectedMsg.videoLink && (
                <div className="mb-6">
                  <a href={selectedMsg.videoLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-[#5865F2]/10 text-[#5865F2] hover:bg-[#5865F2]/20 px-4 py-2 rounded-lg transition-colors border border-[#5865F2]/20">
                    <FaExternalLinkAlt /> Open Discord Video Message
                  </a>
                </div>
              )}

              {selectedMsg.media && selectedMsg.media.length > 0 && (
                <div className="mb-6 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex flex-col gap-2">
                  {selectedMsg.media.map(mediaFile => (
                    <img key={mediaFile.gridFsId} src={`/api/discord/media/${mediaFile.gridFsId}`} alt="Attachment" className="w-full max-h-96 object-contain" />
                  ))}
                </div>
              )}

              <div className="text-slate-300 whitespace-pre-wrap text-[15px] leading-relaxed font-sans">
                {renderTextWithLinks(selectedMsg.text)}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/50 rounded-b-2xl flex items-center justify-between gap-4">
              <div className="flex-1">
                {editingNote ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      placeholder="Add a searchable note..."
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && saveNote()}
                    />
                    <button onClick={saveNote} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                      Save
                    </button>
                    <button onClick={() => setEditingNote(false)} className="text-slate-400 hover:text-white px-3 py-2 text-sm transition-colors">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button onClick={() => { setNoteInput(selectedMsg.note || ''); setEditingNote(true); }} className="text-slate-400 hover:text-white flex items-center gap-2 text-sm transition-colors">
                    <FaTag /> {selectedMsg.note ? 'Edit Note' : 'Add Note'}
                  </button>
                )}
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                {selectedMsg.text && (
                  <button 
                    onClick={() => copyToClipboard(selectedMsg.text)}
                    className="bg-slate-800 hover:bg-slate-700 p-2 rounded-lg text-slate-300 transition-colors"
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

      )}
    </div>
  );
};

export default DiscordLibrary;
