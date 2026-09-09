import { useState, useEffect, useRef } from 'react';
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
  FaPaste,
  FaChevronDown,
  FaChevronUp,
} from 'react-icons/fa';
import {
  IoClose,
  IoImageOutline,
  IoFlashOutline,
  IoTimeOutline,
  IoCheckmarkCircle,
  IoCloudUploadOutline,
} from 'react-icons/io5';
import {
  closeQuickCapture,
  createCapture,
  scrapeMetadata,
  clearScrapedData,
} from '../../redux/slices/captureSlice';
import { parseWhatsAppText } from '../../utils/whatsappParser';

const QuickCaptureModal = () => {
  const dispatch = useDispatch();
  const { isQuickCaptureOpen, initialData, scrapeLoading, scrapedData } =
    useSelector((state) => state.captures);

  // Main input
  const [inputText, setInputText] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  // Auto-detected state
  const [detectedType, setDetectedType] = useState('text'); // 'whatsapp', 'url', 'image', 'text'
  const [detectedSender, setDetectedSender] = useState('');
  const [cleanContent, setCleanContent] = useState('');
  const [extractedUrl, setExtractedUrl] = useState('');

  // Power-user optional drawer (hidden by default)
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [customRemindAt, setCustomRemindAt] = useState('');
  const [priority, setPriority] = useState('medium');

  const [saving, setSaving] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  // Reset and prefill on open
  useEffect(() => {
    if (isQuickCaptureOpen) {
      if (initialData) {
        if (initialData.url) setInputText(initialData.url);
        else if (initialData.text) setInputText(initialData.text);
        if (initialData.title) setCustomTitle(initialData.title);
        if (initialData.notes) setCustomNote(initialData.notes);
      }
      setTimeout(() => textareaRef.current?.focus(), 80);
    } else {
      setInputText('');
      setImageFile(null);
      setImagePreview('');
      setDetectedType('text');
      setDetectedSender('');
      setCleanContent('');
      setExtractedUrl('');
      setShowAdvanced(false);
      setCustomTitle('');
      setCustomNote('');
      setCustomRemindAt('');
      setPriority('medium');
      dispatch(clearScrapedData());
    }
  }, [isQuickCaptureOpen, initialData, dispatch]);

  // Global Ctrl+V listener for instant clipboard paste
  useEffect(() => {
    const handlePaste = (e) => {
      if (!isQuickCaptureOpen) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            setImageFile(blob);
            const previewUrl = URL.createObjectURL(blob);
            setImagePreview(previewUrl);
            setDetectedType('image');
            toast.success('Screenshot pasted!', { duration: 1500 });
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isQuickCaptureOpen]);

  // Auto-detect content as user types or pastes
  useEffect(() => {
    if (imageFile) {
      setDetectedType('image');
      return;
    }

    const trimmed = inputText.trim();
    if (!trimmed) {
      setDetectedType('text');
      setDetectedSender('');
      setCleanContent('');
      setExtractedUrl('');
      return;
    }

    // 1. Check WhatsApp format
    const wa = parseWhatsAppText(trimmed);
    if (wa.isWhatsApp) {
      setDetectedType('whatsapp');
      setDetectedSender(wa.sender);
      setCleanContent(wa.cleanText);
      setExtractedUrl(wa.extractedUrl);
      if (wa.extractedUrl && !scrapedData) {
        dispatch(scrapeMetadata(wa.extractedUrl));
      }
      return;
    }

    // 2. Check if text is or contains a URL
    const urlMatch = trimmed.match(/(https?:\/\/[^\s]+)/i);
    if (urlMatch) {
      setDetectedType('url');
      setExtractedUrl(urlMatch[0]);
      setCleanContent(trimmed);
      if (!scrapedData || scrapedData.url !== urlMatch[0]) {
        dispatch(scrapeMetadata(urlMatch[0]));
      }
      return;
    }

    // 3. Fallback: regular quick note/thought
    setDetectedType('text');
    setCleanContent(trimmed);
  }, [inputText, imageFile, dispatch]);

  // Fast paste from clipboard button
  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setInputText(text);
          toast.success('Pasted from clipboard!', { duration: 1500 });
          return;
        }
      }
      toast.error('Clipboard is empty or permission denied. Use Ctrl+V');
    } catch {
      toast.error('Use Ctrl+V to paste');
    }
  };

  // Helper for computing reminder date from preset
  const getPresetDate = (preset) => {
    const now = new Date();
    if (preset === '2h') {
      return new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
    }
    if (preset === 'tonight') {
      const d = new Date();
      d.setHours(20, 0, 0, 0);
      if (d <= now) d.setDate(d.getDate() + 1);
      return d.toISOString();
    }
    if (preset === 'tomorrow') {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      return d.toISOString();
    }
    if (preset === 'custom' && customRemindAt) {
      return new Date(customRemindAt).toISOString();
    }
    return null;
  };

  // 1-Click Unified Save Handler
  const handleFastSave = async (reminderPreset = 'none') => {
    if (!inputText.trim() && !imageFile) {
      toast.error('Please paste a link, message, or screenshot first');
      return;
    }

    setSaving(true);
    try {
      const remindAt = getPresetDate(reminderPreset);

      if (imageFile) {
        // Upload image file
        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('title', customTitle || imageFile.name || 'Pasted Image');
        formData.append('notes', customNote || cleanContent || '');
        formData.append('priority', priority);
        if (remindAt) formData.append('remindAt', remindAt);

        await dispatch(createCapture(formData)).unwrap();
      } else if (detectedType === 'whatsapp') {
        // WhatsApp message
        await dispatch(
          createCapture({
            platform: 'whatsapp',
            mediaType: 'message',
            title: customTitle || (detectedSender ? `WhatsApp from ${detectedSender}` : 'WhatsApp Message'),
            authorName: detectedSender,
            rawContent: cleanContent || inputText,
            sourceUrl: extractedUrl || '',
            notes: customNote,
            priority,
            remindAt,
          }),
        ).unwrap();
      } else if (detectedType === 'url') {
        // Social Reel or Web link
        const finalUrl = extractedUrl || inputText.trim();
        const isLinkedIn = /(?:linkedin\.com|lnkd\.in)/i.test(finalUrl);
        const platform = isLinkedIn ? 'linkedin' : scrapedData?.platform;

        await dispatch(
          createCapture({
            sourceUrl: finalUrl,
            platform,
            rawContent: scrapedData?.rawContent || scrapedData?.description || (cleanContent !== extractedUrl ? cleanContent : ''),
            mediaUrl: scrapedData?.mediaUrl || scrapedData?.thumbnailUrl,
            title: customTitle || scrapedData?.title || 'Saved Link',
            notes: customNote || (cleanContent !== extractedUrl && cleanContent !== scrapedData?.rawContent ? cleanContent : ''),
            embedId: scrapedData?.embedId,
            embedUrl: scrapedData?.embedUrl,
            thumbnailUrl: scrapedData?.thumbnailUrl,
            authorName: scrapedData?.authorName,
            priority,
            remindAt,
          }),
        ).unwrap();
      } else {
        // Quick text / thought
        await dispatch(
          createCapture({
            platform: 'other',
            mediaType: 'article',
            title: customTitle || inputText.trim().slice(0, 40) + '...',
            rawContent: inputText.trim(),
            notes: customNote,
            priority,
            remindAt,
          }),
        ).unwrap();
      }

      toast.success(remindAt ? 'Saved with reminder!' : 'Saved to Vault!', {
        icon: remindAt ? '⏰' : '⚡',
        style: {
          borderRadius: '12px',
          background: '#18181b',
          color: '#fff',
        },
      });

      dispatch(closeQuickCapture());
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Keyboard shortcut: Ctrl+Enter to save immediately
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleFastSave('none');
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
          className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-xl bg-surface-raised border border-strong rounded-3xl shadow-2xl shadow-black/70 overflow-hidden flex flex-col my-auto"
        >
          {/* Top glowing gradient accent */}
          <div className="h-1.5 w-full bg-gradient-to-r from-accent via-emerald-500 to-purple-500" />

          {/* Header Bar */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-subtle">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-accent-subtle text-accent">
                <IoFlashOutline size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold font-display text-primary flex items-center gap-2">
                  <span>Lightning Capture</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-surface text-secondary border border-subtle">
                    Ctrl+V anywhere
                  </span>
                </h2>
              </div>
            </div>

            <button
              onClick={() => dispatch(closeQuickCapture())}
              className="p-1.5 rounded-xl text-muted hover:text-primary hover:bg-surface transition-colors cursor-pointer"
            >
              <IoClose size={20} />
            </button>
          </div>

          {/* Main Omni-Dump Area */}
          <div className="p-5 space-y-3.5">
            {/* Input Container */}
            <div className="relative rounded-2xl bg-surface border border-subtle focus-within:border-accent focus-within:ring-1 focus-within:ring-accent transition-all p-3">
              <textarea
                ref={textareaRef}
                rows={3}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Paste anything here: WhatsApp chat, Instagram Reel link, Facebook video, screenshot, or quick thought..."
                className="w-full bg-transparent text-sm text-primary placeholder:text-muted focus:outline-none resize-none leading-relaxed"
              />

              {/* Action Bar inside textarea */}
              <div className="flex items-center justify-between pt-2 border-t border-subtle/40 mt-1">
                {/* Auto-detected pill */}
                <div className="flex items-center gap-1.5">
                  {detectedType === 'whatsapp' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20 animate-pulse">
                      <FaWhatsapp size={13} />
                      <span>WhatsApp {detectedSender ? `from ${detectedSender}` : 'Detected'}</span>
                    </span>
                  )}
                  {detectedType === 'url' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-accent bg-accent-subtle px-2.5 py-0.5 rounded-lg border border-accent/20">
                      {scrapedData?.platform === 'instagram' ? <FaInstagram size={13} className="text-pink-500" /> :
                       scrapedData?.platform === 'facebook' ? <FaFacebook size={13} className="text-blue-500" /> :
                       scrapedData?.platform === 'youtube' ? <FaYoutube size={13} className="text-red-500" /> :
                       (scrapedData?.platform === 'linkedin' || /(?:linkedin\.com|lnkd\.in)/i.test(extractedUrl)) ? <FaLinkedin size={13} className="text-sky-400" /> :
                       <FaGlobe size={13} />}
                      <span>
                        {(scrapedData?.platform === 'linkedin' || /(?:linkedin\.com|lnkd\.in)/i.test(extractedUrl))
                          ? 'LINKEDIN'
                          : scrapedData?.platform
                            ? scrapedData.platform.toUpperCase()
                            : 'Link Detected'}
                      </span>
                    </span>
                  )}
                  {detectedType === 'image' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-lg border border-purple-500/20">
                      <IoImageOutline size={13} />
                      <span>Image Ready</span>
                    </span>
                  )}
                </div>

                {/* Paste from clipboard and browse buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-raised hover:bg-surface border border-subtle text-[11px] font-medium text-secondary hover:text-primary transition-all cursor-pointer"
                    title="Upload image file"
                  >
                    <IoCloudUploadOutline size={14} />
                    <span>Upload</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePasteFromClipboard}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-raised hover:bg-surface border border-subtle text-[11px] font-semibold text-accent hover:text-accent-hover transition-all cursor-pointer"
                  >
                    <FaPaste size={12} />
                    <span>Paste Clipboard</span>
                  </button>
                </div>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  const file = e.target.files[0];
                  setImageFile(file);
                  setImagePreview(URL.createObjectURL(file));
                }
              }}
              className="hidden"
            />

            {/* Image Preview Thumbnail if attached */}
            {imagePreview && (
              <div className="relative inline-block max-h-36 rounded-xl overflow-hidden border border-subtle">
                <img src={imagePreview} alt="Screenshot" className="max-h-36 object-contain rounded-xl" />
                <button
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview('');
                  }}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white hover:bg-black"
                >
                  <IoClose size={14} />
                </button>
              </div>
            )}

            {/* Scraped Live Preview (Instagram Reel / Link) */}
            {scrapedData && (
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-surface border border-subtle">
                {scrapedData.thumbnailUrl && (
                  <img
                    src={scrapedData.thumbnailUrl}
                    alt="Preview"
                    className="w-12 h-12 object-cover rounded-lg flex-shrink-0 bg-surface border border-subtle"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-semibold text-primary truncate">
                    {scrapedData.title}
                  </h4>
                  <p className="text-[10px] text-muted truncate">
                    {scrapedData.description || scrapedData.url}
                  </p>
                </div>
              </div>
            )}

            {/* ONE-CLICK INSTANT SAVE BUTTONS (Zero Friction!) */}
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted font-display block">
                1-Click Save & Remind:
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* 1. Just Save */}
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleFastSave('none')}
                  className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-surface hover:bg-surface-raised border border-subtle hover:border-accent text-primary transition-all cursor-pointer group active:scale-95"
                >
                  <IoFlashOutline size={18} className="text-accent mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold">Just Save</span>
                  <span className="text-[10px] text-muted">Inbox (Ctrl+↵)</span>
                </button>

                {/* 2. Tonight 8 PM */}
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleFastSave('tonight')}
                  className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-accent-subtle/50 hover:bg-accent-subtle border border-accent/30 text-accent transition-all cursor-pointer group active:scale-95 shadow-sm"
                >
                  <span className="text-base mb-0.5">🌙</span>
                  <span className="text-xs font-bold">Tonight</span>
                  <span className="text-[10px] text-accent/80 font-medium">8:00 PM</span>
                </button>

                {/* 3. Tomorrow 9 AM */}
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleFastSave('tomorrow')}
                  className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 transition-all cursor-pointer group active:scale-95 shadow-sm"
                >
                  <span className="text-base mb-0.5">☀️</span>
                  <span className="text-xs font-bold">Tomorrow</span>
                  <span className="text-[10px] text-emerald-400/80 font-medium">9:00 AM</span>
                </button>

                {/* 4. In 2 Hours */}
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleFastSave('2h')}
                  className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 transition-all cursor-pointer group active:scale-95 shadow-sm"
                >
                  <span className="text-base mb-0.5">⏱️</span>
                  <span className="text-xs font-bold">In 2 Hours</span>
                  <span className="text-[10px] text-purple-300/80 font-medium">Quick Review</span>
                </button>
              </div>
            </div>

            {/* Collapsible Power User Drawer (Optional Details) */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors cursor-pointer"
              >
                {showAdvanced ? <FaChevronUp size={10} /> : <FaChevronDown size={10} />}
                <span>{showAdvanced ? 'Hide extra details' : '+ Add custom note, title, or exact calendar time...'}</span>
              </button>

              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pt-3 space-y-3 overflow-hidden"
                  >
                    <div>
                      <label className="block text-[11px] font-semibold text-secondary mb-1">
                        Custom Title (Optional)
                      </label>
                      <input
                        type="text"
                        value={customTitle}
                        onChange={(e) => setCustomTitle(e.target.value)}
                        placeholder="Give this resource a name..."
                        className="w-full px-3 py-1.5 rounded-xl bg-surface border border-subtle text-xs text-primary focus:outline-none focus:border-accent"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-secondary mb-1">
                        Personal Note / Reflection
                      </label>
                      <textarea
                        rows={2}
                        value={customNote}
                        onChange={(e) => setCustomNote(e.target.value)}
                        placeholder="Add why you saved this..."
                        className="w-full p-2.5 rounded-xl bg-surface border border-subtle text-xs text-primary focus:outline-none focus:border-accent resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-secondary mb-1">
                          Exact Reminder Date & Time
                        </label>
                        <input
                          type="datetime-local"
                          value={customRemindAt}
                          onChange={(e) => setCustomRemindAt(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-surface border border-subtle text-xs text-primary focus:outline-none focus:border-accent"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-secondary mb-1">
                          Priority
                        </label>
                        <select
                          value={priority}
                          onChange={(e) => setPriority(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-surface border border-subtle text-xs font-semibold text-primary focus:outline-none focus:border-accent cursor-pointer"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>
                    </div>

                    {customRemindAt && (
                      <button
                        type="button"
                        onClick={() => handleFastSave('custom')}
                        disabled={saving}
                        className="w-full py-2 rounded-xl bg-accent text-white font-bold text-xs shadow-md shadow-accent/20 cursor-pointer"
                      >
                        Save with Custom Schedule
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default QuickCaptureModal;
