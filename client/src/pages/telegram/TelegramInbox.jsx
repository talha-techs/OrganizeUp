import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { FaTelegramPlane, FaCheck, FaTrash, FaPlus, FaLink } from 'react-icons/fa';
import api from '../../utils/api';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const TelegramInbox = () => {
  const { user } = useSelector((state) => state.auth);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [linkCode, setLinkCode] = useState(null);
  const [botUsername] = useState('Organize_Up_bot'); // Based on user input

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

  const dismissMessage = async (id) => {
    try {
      await api.delete(`/telegram/messages/${id}`);
      setMessages(messages.filter((m) => m._id !== id));
      toast.success('Message dismissed');
    } catch (error) {
      toast.error('Failed to dismiss message');
    }
  };

  // Mark as handled but actual saving is done in existing forms
  const markAsSaved = async (id) => {
    try {
      await api.put(`/telegram/messages/${id}/categorize`);
      setMessages(messages.filter((m) => m._id !== id));
    } catch (error) {
      console.error(error);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-blue-500/20 p-3 rounded-xl border border-blue-500/30">
          <FaTelegramPlane className="text-blue-400 text-2xl" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Telegram Inbox</h1>
          <p className="text-slate-400">Forward messages from Telegram straight to your library</p>
        </div>
      </div>

      {!isConnected ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-2xl mx-auto text-center">
          <FaTelegramPlane className="text-6xl text-blue-500 mx-auto mb-6 opacity-80" />
          <h2 className="text-2xl font-bold text-white mb-4">Connect Your Telegram Account</h2>
          <p className="text-slate-400 mb-8 leading-relaxed">
            Link your OrganizeUp account to our Telegram bot. Once connected, you can forward any useful message, 
            course link, or tool to the bot, and it will instantly appear in this inbox for you to organize.
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
                      className="bg-slate-800 hover:bg-slate-700 p-2 rounded text-slate-300"
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
            <h2 className="text-xl font-semibold text-white">Pending Messages ({messages.length})</h2>
            <div className="text-sm px-3 py-1 bg-green-500/10 text-green-400 rounded-full border border-green-500/20 flex items-center gap-2">
              <FaCheck /> Connected to Telegram
            </div>
          </div>

          {messages.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800 border-dashed rounded-2xl p-12 text-center">
              <p className="text-slate-400 text-lg">Your inbox is empty!</p>
              <p className="text-slate-500 mt-2">Forward a message to @{botUsername} on Telegram to see it here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {messages.map((msg) => (
                <div key={msg._id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-medium bg-slate-800 text-slate-300 px-2 py-1 rounded-md">
                      From: {msg.senderName}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(msg.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="text-slate-200 text-sm whitespace-pre-wrap mb-4 flex-1 max-h-40 overflow-y-auto custom-scrollbar">
                    {msg.text}
                  </div>

                  {msg.extractedUrl && (
                    <div className="mb-4 bg-slate-950 p-2 rounded flex items-center gap-2 overflow-hidden">
                      <FaLink className="text-slate-500 shrink-0" />
                      <a href={msg.extractedUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs truncate hover:underline">
                        {msg.extractedUrl}
                      </a>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-auto pt-4 border-t border-slate-800">
                    <div className="dropdown dropdown-top flex-1">
                      <button tabIndex={0} className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg transition-colors flex items-center justify-center gap-2">
                        <FaPlus /> Save To...
                      </button>
                      <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-slate-800 rounded-box w-full mb-2 border border-slate-700">
                        <li>
                           {/* Quick hack for V1: Copy the text to clipboard and open standard add modal */}
                          <button onClick={() => {
                            copyToClipboard(msg.extractedUrl || msg.text);
                            markAsSaved(msg._id);
                            toast.success("Text copied! Paste it in the new Course form.");
                          }} className="text-slate-200 hover:bg-slate-700">Course</button>
                        </li>
                        <li>
                          <button onClick={() => {
                            copyToClipboard(msg.extractedUrl || msg.text);
                            markAsSaved(msg._id);
                            toast.success("Text copied! Paste it in the new Tool form.");
                          }} className="text-slate-200 hover:bg-slate-700">Tool</button>
                        </li>
                      </ul>
                    </div>
                    <button
                      onClick={() => dismissMessage(msg._id)}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                      title="Dismiss"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TelegramInbox;
