import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { FaTelegramPlane, FaCheck, FaTrash, FaLink, FaTimes, FaTag, FaSync } from 'react-icons/fa';
import api from '../../utils/api';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const TelegramLibrary = () => {
  const { user } = useSelector((state) => state.auth);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [linkCode, setLinkCode] = useState(null);
  const [botUsername] = useState('Organize_Up_bot');
  
  // Modal State
  const [selectedMsg, setSelectedMsg] = useState(null);
  const [editingNote, setEditingNote] = useState(false);
  const [noteInput, setNoteInput] = useState('');

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      setLoading(true);
      const res = await api.get('/telegram/status');
      setIsConnected(res.data.isConnected);
      if (res.data.isConnected) {
        fetchMessages();
      }
    } catch (error) {
      toast.error('Failed to check Telegram status');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await api.get('/telegram/messages');
      setMessages(res.data);
      // Mark as read in background
      api.put('/telegram/read').catch(err => console.error(err));
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

  const deleteMessage = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await api.delete(`/telegram/messages/${id}`);
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
      const res = await api.put(`/telegram/messages/${selectedMsg._id}/note`, { note: noteInput });
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

  const recentMessages = messages.slice(0, 3);
  const libraryMessages = messages.slice(3);

  const renderMessageCards = (msgs) => {
    if (msgs.length === 0) return null;
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {msgs.map((msg) => (
          <div 
            key={msg._id} 
            onClick={() => setSelectedMsg(msg)}
            className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-blue-500/50 cursor-pointer transition-all flex flex-col h-auto min-h-[16rem] group"
          >
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-medium bg-slate-800 text-slate-300 px-2 py-1 rounded-md">
                From: {msg.senderName}
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

            {msg.bannerImageId && (
              <div className="w-full h-48 mb-3 rounded-lg overflow-hidden shrink-0 border border-slate-700/50 bg-slate-950">
                <img 
                  src={`/api/telegram/image/${msg.bannerImageId}`} 
                  alt="Telegram Attachment" 
                  className="w-full h-full object-cover object-top opacity-80 group-hover:opacity-100 transition-opacity" 
                />
              </div>
            )}

            <div className="text-slate-300 text-sm whitespace-pre-wrap flex-1 overflow-hidden relative">
              <div className="line-clamp-4">{msg.text}</div>
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-900 to-transparent"></div>
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800">
              {msg.extractedUrl ? (
                <div className="flex items-center gap-2 text-blue-400 text-xs overflow-hidden">
                  <FaLink className="shrink-0" />
                  <span className="truncate">Contains link</span>
                </div>
              ) : <div></div>}
              
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
        <div className="bg-blue-500/20 p-3 rounded-xl border border-blue-500/30">
          <FaTelegramPlane className="text-blue-400 text-2xl" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Telegram Library</h1>
          <p className="text-slate-400">Your permanent vault for Telegram resources</p>
        </div>
      </div>

      {!isConnected ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-2xl mx-auto text-center">
          <FaTelegramPlane className="text-6xl text-blue-500 mx-auto mb-6 opacity-80" />
          <h2 className="text-2xl font-bold text-white mb-4">Connect Your Telegram Account</h2>
          <p className="text-slate-400 mb-8 leading-relaxed">
            Link your OrganizeUp account to our Telegram bot. Once connected, you can forward any useful message, 
            course link, or tool to the bot, and it will instantly be saved in this library.
          </p>

          {!linkCode ? (
            <button
              onClick={generateLinkCode}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
            >
              Generate Link Code
            </button>
          ) : (
            <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl text-left">
              <h3 className="text-lg font-semibold text-white mb-4">Follow these steps:</h3>
              <ol className="text-slate-300 space-y-4 list-decimal list-inside">
                <li>
                  Open Telegram and search for <strong className="text-blue-400">@{botUsername}</strong> or click <a href={`https://t.me/${botUsername}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">here</a>.
                </li>
                <li>Start a chat with the bot (click Start).</li>
                <li>
                  Send the bot this exact code:
                  <div className="mt-2 flex items-center gap-4 bg-slate-900 p-3 rounded-lg border border-slate-800">
                    <code className="text-xl font-mono text-blue-400 flex-1">#link-{linkCode}</code>
                    <button 
                      onClick={() => copyToClipboard(`#link-${linkCode}`)}
                      className="bg-slate-800 hover:bg-slate-700 p-2 rounded text-slate-300 transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </li>
                <li>Once the bot replies "Success", click the button below.</li>
              </ol>
              <div className="mt-8 text-center">
                <button
                  onClick={checkStatus}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
                >
                  I've Linked My Account
                </button>
              </div>
            </div>
          )}
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
                <FaCheck /> Connected to Telegram
              </div>
            </div>
          </div>

          {messages.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800 border-dashed rounded-2xl p-12 text-center">
              <p className="text-slate-400 text-lg">Your library is empty!</p>
              <p className="text-slate-500 mt-2">Forward a message to @{botUsername} on Telegram to see it here.</p>
            </div>
          ) : (
            <div className="space-y-10">
              {recentMessages.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-slate-300 mb-4 border-b border-slate-800 pb-2">Recently Added</h3>
                  {renderMessageCards(recentMessages)}
                </div>
              )}
              
              {libraryMessages.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-slate-300 mb-4 border-b border-slate-800 pb-2">Library</h3>
                  {renderMessageCards(libraryMessages)}
                </div>
              )}
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
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">From: {selectedMsg.senderName}</h3>
                <p className="text-xs text-slate-500 mt-1">{new Date(selectedMsg.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={(e) => deleteMessage(selectedMsg._id, e)} className="text-slate-400 hover:text-red-400 transition-colors bg-slate-800 p-2 rounded-lg">
                  <FaTrash />
                </button>
                <button onClick={() => { setSelectedMsg(null); setEditingNote(false); }} className="text-slate-400 hover:text-white transition-colors bg-slate-800 p-2 rounded-lg">
                  <FaTimes />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              {/* Note Section */}
              <div className="mb-6 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    <FaTag className="text-yellow-500" /> Custom Tag / Note
                  </h4>
                  {!editingNote && (
                    <button 
                      onClick={() => { setEditingNote(true); setNoteInput(selectedMsg.note); }}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      {selectedMsg.note ? 'Edit' : 'Add Note'}
                    </button>
                  )}
                </div>
                
                {editingNote ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      placeholder="Add a tag like 'React Course' or 'Must Read'..."
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      autoFocus
                    />
                    <button onClick={saveNote} className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-lg text-sm transition-colors">
                      Save
                    </button>
                    <button onClick={() => setEditingNote(false)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 rounded-lg text-sm transition-colors">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <p className={`text-sm ${selectedMsg.note ? 'text-yellow-400/90' : 'text-slate-500 italic'}`}>
                    {selectedMsg.note || 'No note added yet.'}
                  </p>
                )}
              </div>

              {/* Message Content */}
              {selectedMsg.bannerImageId && (
                <div className="mb-6 w-full rounded-xl overflow-hidden shadow-lg border border-slate-700 max-h-64 flex justify-center bg-slate-950">
                  <img 
                    src={`/api/telegram/image/${selectedMsg.bannerImageId}`} 
                    alt="Message Attachment" 
                    className="max-w-full h-full object-contain" 
                  />
                </div>
              )}

              <div className="text-slate-200 text-base leading-relaxed whitespace-pre-wrap">
                {renderTextWithLinks(selectedMsg.text)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TelegramLibrary;
