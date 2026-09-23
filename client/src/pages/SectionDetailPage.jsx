import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IoArrowBack,
  IoCloudDownloadOutline,
  IoFolderOutline,
  IoDocumentOutline,
  IoImageOutline,
  IoVideocamOutline,
  IoCodeSlashOutline,
  IoChevronDown,
  IoChevronForward,
  IoTrashOutline,
  IoCloseOutline,
  IoAddOutline,
  IoLayersOutline,
  IoSparklesOutline,
  IoCloudUploadOutline,
  IoLinkOutline,
  IoRefreshOutline,
  IoCheckmarkOutline,
  IoPeopleOutline,
  IoEyeOutline,
  IoPulseOutline,
} from 'react-icons/io5';
import {
  fetchSection,
  importToSection,
  removeFileFromSection,
  clearCurrentSection,
  fetchSubSections,
  createSubSection,
  updateSubSection,
  deleteSubSection,
  uploadSectionImage,
  updateSectionBanner,
  bulkAddTodos,
  addLink,
} from '../redux/slices/sectionSlice';
import { classifyClipboard } from '../utils/clipboardClassifier';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import DriveImportModal from '../components/forms/DriveImportModal';
import FileViewer from '../components/ui/FileViewer';
import SubSectionBlock from '../components/sections/SubSectionBlock';
import TeamShareModal from '../components/sections/TeamShareModal';
import ConflictResolutionModal from '../components/sections/ConflictResolutionModal';
import ActivityFeedDrawer from '../components/sections/ActivityFeedDrawer';
import useSectionRealtime from '../hooks/useSectionRealtime';
import toast from 'react-hot-toast';
import useDocumentTitle from '../hooks/useDocumentTitle';

// ─── Color Palettes ──────────────────────────────────────────────────────────
const COLORS = [
  { name: 'coral', from: 'from-[#ff5722]', to: 'to-[#f4511e]' },
  { name: 'amber', from: 'from-amber-500', to: 'to-orange-600' },
  { name: 'purple', from: 'from-purple-500', to: 'to-pink-600' },
  { name: 'emerald', from: 'from-emerald-500', to: 'to-green-600' },
  { name: 'rose', from: 'from-rose-500', to: 'to-red-600' },
  { name: 'zinc', from: 'from-zinc-700', to: 'to-zinc-900' },
  { name: 'indigo', from: 'from-indigo-500', to: 'to-indigo-700' },
];

function getColorClasses(color) {
  return COLORS.find((c) => c.name === color) || COLORS[0];
}

// ─── Block type definitions ──────────────────────────────────────────────────
const BLOCK_TYPES = [
  { type: 'note',    icon: '📝', label: 'Note',         desc: 'Write notes, thoughts, or documentation',       accent: 'border-subtle hover:border-accent hover:bg-accent-subtle' },
  { type: 'todo',    icon: '✅', label: 'To-Do List',   desc: 'Manage tasks with priorities and due dates',     accent: 'border-subtle hover:border-emerald-500/60 hover:bg-emerald-500/5' },
  { type: 'board',   icon: '📋', label: 'Status Board', desc: 'Visual kanban to track work across stages',      accent: 'border-subtle hover:border-purple-500/60 hover:bg-purple-500/5' },
  { type: 'links',   icon: '🔗', label: 'Links',        desc: 'Collect and organize important URLs',            accent: 'border-subtle hover:border-accent hover:bg-accent-subtle' },
  { type: 'snippet', icon: '</>', label: 'Code Snippet', desc: 'Save reusable code with syntax highlighting',    accent: 'border-subtle hover:border-amber-500/60 hover:bg-amber-500/5' },
  { type: 'image',   icon: '🖼️', label: 'Image',        desc: 'Add an image with an optional caption',          accent: 'border-subtle hover:border-rose-500/60 hover:bg-rose-500/5' },
];

// ─── Drive file icons ────────────────────────────────────────────────────────
const FILE_ICONS = {
  pdf:     <IoDocumentOutline  size={16} className="text-red-400" />,
  html:    <IoCodeSlashOutline size={16} className="text-orange-400" />,
  text:    <IoDocumentOutline  size={16} className="text-secondary" />,
  image:   <IoImageOutline     size={16} className="text-emerald-400" />,
  video:   <IoVideocamOutline  size={16} className="text-rose-400" />,
  gdoc:    <IoDocumentOutline  size={16} className="text-amber-400" />,
  gsheet:  <IoDocumentOutline  size={16} className="text-emerald-400" />,
  gslides: <IoDocumentOutline  size={16} className="text-yellow-400" />,
  other:   <IoDocumentOutline  size={16} className="text-muted" />,
};

// ─── Folder tree ─────────────────────────────────────────────────────────────
const FolderTree = ({ folder, onFileClick, depth = 0 }) => {
  const [expanded, setExpanded] = useState(true);
  return (
    <div>
      <button onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 py-2 px-3 w-full rounded-lg hover:bg-surface-raised transition-colors cursor-pointer"
        style={{ paddingLeft: `${depth * 16 + 12}px` }}>
        {expanded ? <IoChevronDown size={12} /> : <IoChevronForward size={12} />}
        <IoFolderOutline size={16} className="text-accent" />
        <span className="text-sm font-medium text-primary">{folder.name}</span>
        <span className="text-xs text-muted ml-auto">{folder.files?.length || 0} files</span>
      </button>
      {expanded && (
        <div>
          {folder.files?.map((file) => (
            <button key={file._id || file.driveFileId} onClick={() => onFileClick(file)}
              className="flex items-center gap-2 py-2 px-3 w-full rounded-lg hover:bg-surface-raised transition-colors cursor-pointer"
              style={{ paddingLeft: `${(depth + 1) * 16 + 24}px` }}>
              {FILE_ICONS[file.fileType] || FILE_ICONS.other}
              <span className="text-sm text-secondary truncate">{file.name}</span>
            </button>
          ))}
          {folder.subfolders?.map((sub, i) => (
            <FolderTree key={sub.driveFileId || i} folder={sub} onFileClick={onFileClick} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Add Block Modal ─────────────────────────────────────────────────────────
const AddBlockModal = ({ onClose, onAdd }) => {
  const [selectedType, setSelectedType] = useState(null);
  const [blockName, setBlockName]       = useState('');
  const [creating, setCreating]         = useState(false);

  const handleCreate = async () => {
    if (!selectedType || !blockName.trim()) return;
    setCreating(true);
    await onAdd(selectedType, blockName.trim());
    setCreating(false);
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
        className="glass-card w-full max-w-lg p-6 space-y-5 border border-strong bg-surface-raised" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-primary font-semibold text-lg">Add a Block</h3>
          <button onClick={onClose} className="text-muted hover:text-primary transition-colors cursor-pointer">
            <IoCloseOutline size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {BLOCK_TYPES.map((t) => (
            <button key={t.type}
              onClick={() => { setSelectedType(t.type); if (!blockName || BLOCK_TYPES.some((x) => x.label === blockName)) setBlockName(t.label); }}
              className={`flex flex-col items-start gap-1.5 p-3 rounded-xl border transition-all text-left cursor-pointer ${
                selectedType === t.type
                  ? 'border-accent bg-accent-subtle ring-1 ring-accent/30'
                  : `border-subtle bg-surface ${t.accent}`
              }`}>
              <span className="text-xl leading-none">{t.icon}</span>
              <span className="text-sm font-semibold text-primary">{t.label}</span>
              <span className="text-[11px] text-muted leading-snug">{t.desc}</span>
            </button>
          ))}
        </div>

        <AnimatePresence>
          {selectedType && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
              <label className="text-xs text-secondary mb-1.5 block">Block name</label>
              <input autoFocus value={blockName} onChange={(e) => setBlockName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') onClose(); }}
                placeholder="e.g. My Notes, Sprint Tasks…"
                className="w-full bg-surface border border-subtle rounded-xl px-4 py-2.5 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent transition-colors" />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-end gap-3 pt-1">
          <button onClick={onClose} className="btn-secondary text-sm px-4 py-2 cursor-pointer">Cancel</button>
          <button onClick={handleCreate} disabled={!selectedType || !blockName.trim() || creating} className="btn-primary text-sm px-4 py-2 cursor-pointer">
            {creating ? 'Creating…' : 'Add Block'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Change Banner Modal ─────────────────────────────────────────────────────
const ChangeBannerModal = ({ isOpen, onClose, currentBanner, sectionId, sectionName }) => {
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);
  const [tab, setTab] = useState('upload'); // 'upload' | 'url' | 'pexels'
  const [webUrl, setWebUrl] = useState('');
  const [pexelsQuery, setPexelsQuery] = useState(sectionName || '');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleUploadFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    setLoading(true);
    const fd = new FormData();
    fd.append('image', file);
    const res = await dispatch(updateSectionBanner({ sectionId, bannerData: fd }));
    setLoading(false);
    if (res.meta.requestStatus === 'fulfilled') {
      toast.success('Banner updated');
      onClose();
    } else {
      toast.error(res.payload || 'Failed to update banner');
    }
  };

  const handleApplyUrl = async () => {
    if (!webUrl.trim()) return;
    setLoading(true);
    const res = await dispatch(
      updateSectionBanner({
        sectionId,
        bannerData: { bannerImage: webUrl.trim() },
      }),
    );
    setLoading(false);
    if (res.meta.requestStatus === 'fulfilled') {
      toast.success('Banner updated');
      onClose();
    } else {
      toast.error(res.payload || 'Failed to update banner');
    }
  };

  const handlePexelsFetch = async () => {
    setLoading(true);
    const res = await dispatch(
      updateSectionBanner({
        sectionId,
        bannerData: { autoFetch: true, query: pexelsQuery.trim() || sectionName },
      }),
    );
    setLoading(false);
    if (res.meta.requestStatus === 'fulfilled') {
      toast.success('Cover image discovered & applied!');
      onClose();
    } else {
      toast.error(res.payload || 'Failed to fetch cover from Pexels');
    }
  };

  const handleRemoveBanner = async () => {
    setLoading(true);
    const res = await dispatch(
      updateSectionBanner({ sectionId, bannerData: { bannerImage: '' } }),
    );
    setLoading(false);
    if (res.meta.requestStatus === 'fulfilled') {
      toast.success('Banner removed (reverted to gradient)');
      onClose();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95 }}
        className="glass-card w-full max-w-md p-6 space-y-5 border border-strong bg-surface-raised"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-primary font-semibold text-lg flex items-center gap-2">
            <IoImageOutline className="text-accent" size={20} />
            <span>Customize Workspace Banner</span>
          </h3>
          <button onClick={onClose} className="text-muted hover:text-primary transition-colors cursor-pointer">
            <IoCloseOutline size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-subtle gap-2">
          <button
            onClick={() => setTab('upload')}
            className={`pb-2.5 text-xs font-medium cursor-pointer transition-colors border-b-2 flex items-center gap-1.5 ${
              tab === 'upload'
                ? 'border-accent text-accent font-semibold'
                : 'border-transparent text-secondary hover:text-primary'
            }`}
          >
            <IoCloudUploadOutline size={14} /> Upload File
          </button>
          <button
            onClick={() => setTab('url')}
            className={`pb-2.5 text-xs font-medium cursor-pointer transition-colors border-b-2 flex items-center gap-1.5 ${
              tab === 'url'
                ? 'border-accent text-accent font-semibold'
                : 'border-transparent text-secondary hover:text-primary'
            }`}
          >
            <IoLinkOutline size={14} /> Web URL
          </button>
          <button
            onClick={() => setTab('pexels')}
            className={`pb-2.5 text-xs font-medium cursor-pointer transition-colors border-b-2 flex items-center gap-1.5 ${
              tab === 'pexels'
                ? 'border-accent text-accent font-semibold'
                : 'border-transparent text-secondary hover:text-primary'
            }`}
          >
            <IoSparklesOutline size={14} /> Pexels Discover
          </button>
        </div>

        {/* Tab 1: Upload */}
        {tab === 'upload' && (
          <div className="space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleUploadFile(e.target.files[0]);
              }}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-subtle hover:border-accent hover:bg-surface rounded-xl p-8 text-center cursor-pointer transition-all"
            >
              <IoCloudUploadOutline size={36} className="mx-auto text-accent mb-2" />
              <p className="text-sm font-medium text-primary">Click to select banner image</p>
              <p className="text-xs text-muted mt-1">PNG, JPG, WebP up to 5MB (stored securely in GridFS)</p>
            </div>
          </div>
        )}

        {/* Tab 2: URL */}
        {tab === 'url' && (
          <div className="space-y-3">
            <label className="text-xs text-secondary block">Direct Web Image Address</label>
            <input
              value={webUrl}
              onChange={(e) => setWebUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full bg-surface border border-subtle rounded-xl px-4 py-2.5 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent transition-colors"
            />
            {webUrl && (
              <div className="h-28 rounded-lg overflow-hidden border border-subtle relative">
                <img src={webUrl} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
            <button
              onClick={handleApplyUrl}
              disabled={!webUrl.trim() || loading}
              className="btn-primary w-full text-sm py-2"
            >
              {loading ? 'Applying…' : 'Apply Image Address'}
            </button>
          </div>
        )}

        {/* Tab 3: Pexels */}
        {tab === 'pexels' && (
          <div className="space-y-3">
            <label className="text-xs text-secondary block">Search Keywords for Pexels</label>
            <div className="flex gap-2">
              <input
                value={pexelsQuery}
                onChange={(e) => setPexelsQuery(e.target.value)}
                placeholder="e.g. React, Cyberpunk, Nature…"
                className="flex-1 bg-surface border border-subtle rounded-xl px-4 py-2 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent"
              />
              <button
                onClick={handlePexelsFetch}
                disabled={loading}
                className="btn-primary text-xs px-3 py-2 flex items-center gap-1.5 whitespace-nowrap"
              >
                <IoSparklesOutline size={14} />
                <span>{loading ? 'Searching…' : 'Auto-Fetch'}</span>
              </button>
            </div>
            <p className="text-[11px] text-muted">
              Uses the configured Pexels API key to find high-resolution landscape photography for this topic.
            </p>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-subtle">
          {currentBanner ? (
            <button
              type="button"
              onClick={handleRemoveBanner}
              disabled={loading}
              className="text-xs text-red-400 hover:text-red-300 transition-colors cursor-pointer"
            >
              Reset to Gradient
            </button>
          ) : (
            <div />
          )}
          <button onClick={onClose} className="btn-secondary text-xs px-4 py-2 cursor-pointer">
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Main Section Detail Page ────────────────────────────────────────────────
const SectionDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { currentSection, isLoading, subSections, subSectionsLoading, myRole, permissions } =
    useSelector((state) => state.sections);
  const { user } = useSelector((state) => state.auth);
  useDocumentTitle(currentSection?.name || 'Workspace');
  const isAdmin = user?.role === 'admin';

  const [showImport, setShowImport]           = useState(false);
  const [selectedFile, setSelectedFile]       = useState(null);
  const [showAddBlock, setShowAddBlock]       = useState(false);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [showTeamModal, setShowTeamModal]     = useState(false);
  const [showActivity, setShowActivity]       = useState(false);
  const [conflictData, setConflictData]       = useState(null);
  const [driveExpanded, setDriveExpanded]     = useState(true);
  const [activeBlockId, setActiveBlockId]     = useState(null);
  const [pasteNotice, setPasteNotice]         = useState(null); // { message, lastBlockId }

  // ── Real-Time Synchronization & Presence ─────────────────────────────────
  const {
    activeCollaborators,
    remoteFocusedBlocks,
    activityStream,
    isConnected,
    emitBlockFocus,
    emitBlockBlur,
  } = useSectionRealtime(id);

  const handleConflictKeepMine = async () => {
    if (!conflictData) return;
    const subId = conflictData.block?._id || conflictData.subId;
    if (!subId) return;
    try {
      await dispatch(
        updateSubSection({
          sectionId: id,
          subId,
          content: conflictData.localDraft,
        }),
      ).unwrap();
      toast.success('Your version was preserved');
    } catch (_) {
      toast.error('Failed to overwrite version');
    }
    setConflictData(null);
  };

  const handleConflictAcceptRemote = () => {
    dispatch(fetchSubSections(id));
    toast.success('Loaded latest remote version');
    setConflictData(null);
  };

  const handleConflictMerge = async (mergedText) => {
    if (!conflictData) return;
    const subId = conflictData.block?._id || conflictData.subId;
    if (!subId) return;
    try {
      const textToSave =
        typeof mergedText === 'string' && mergedText
          ? mergedText
          : `${conflictData.localDraft || ''}\n\n--- Remote Changes ---\n${conflictData.remoteBlock?.content || conflictData.serverVersion || ''}`.trim();

      await dispatch(
        updateSubSection({
          sectionId: id,
          subId,
          content: textToSave,
        }),
      ).unwrap();
      toast.success('Merged both versions successfully');
    } catch (_) {
      toast.error('Failed to save merged version');
    }
    setConflictData(null);
  };

  useEffect(() => {
    dispatch(fetchSection(id));
    dispatch(fetchSubSections(id));
    return () => {
      dispatch(clearCurrentSection());
    };
  }, [dispatch, id]);

  const isOwner =
    myRole === 'owner' ||
    isAdmin ||
    !!(
      user?._id &&
      currentSection?.addedBy &&
      String(currentSection.addedBy?._id ?? currentSection.addedBy) === String(user._id)
    );
  const isViewer = myRole === 'viewer';
  const canEdit = permissions?.canEdit ?? !isViewer;
  const canManage = isOwner || isAdmin;

  const colorClasses = getColorClasses(currentSection?.color);

  // ── Smart Clipboard Handler (Ctrl+V) ──────────────────────────────────────
  const handleGlobalPaste = useCallback(
    async (e) => {
      if (!canEdit) return;

      const activeEl = document.activeElement;
      const isTypingInField =
        activeEl &&
        (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable);

      // Inspect clipboard contents
      const classified = await classifyClipboard(e);
      if (!classified) return;

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Case 1: Image Paste (interception even inside text fields / notes)
      if (classified.type === 'image') {
        e.preventDefault();
        const toastId = toast.loading('Uploading screenshot to section…');
        try {
          const uploadRes = await dispatch(
            uploadSectionImage({ sectionId: id, file: classified.file }),
          );
          if (uploadRes.meta.requestStatus === 'fulfilled' && uploadRes.payload?.imageUrl) {
            const imageUrl = uploadRes.payload.imageUrl;

            // Option A: If currently working on a Note block, place Image block directly below it!
            const activeBlock = subSections.find((b) => b._id === activeBlockId);

            if (activeBlock && activeBlock.type === 'image' && !activeBlock.imageUrl) {
              // Update existing empty image block
              await dispatch(
                updateSubSection({
                  sectionId: id,
                  subId: activeBlock._id,
                  imageUrl,
                  imageCaption: `Pasted at ${timeStr}`,
                }),
              );
              toast.success('Image placed into active block!', { id: toastId });
            } else if (activeBlock && activeBlock.type === 'note') {
              // Create linked Image block right below the Note block
              const createRes = await dispatch(
                createSubSection({
                  sectionId: id,
                  name: `Screenshot - ${timeStr}`,
                  type: 'image',
                  imageUrl,
                  imageCaption: `Pasted from ${activeBlock.name}`,
                  afterSubId: activeBlock._id,
                }),
              );
              toast.success('Screenshot placed below your Note!', { id: toastId });
              if (createRes.payload?.subSection?._id) {
                setActiveBlockId(createRes.payload.subSection._id);
                setPasteNotice({
                  message: 'Created Image block below note',
                  createdBlockId: createRes.payload.subSection._id,
                });
              }
            } else {
              // Create a brand new image block
              const createRes = await dispatch(
                createSubSection({
                  sectionId: id,
                  name: `Screenshot - ${timeStr}`,
                  type: 'image',
                  imageUrl,
                  imageCaption: `Pasted at ${timeStr}`,
                  afterSubId: activeBlockId || undefined,
                }),
              );
              toast.success('Smart Paste: Created Image block!', { id: toastId });
              if (createRes.payload?.subSection?._id) {
                setActiveBlockId(createRes.payload.subSection._id);
                setPasteNotice({
                  message: 'Created Image block',
                  createdBlockId: createRes.payload.subSection._id,
                });
              }
            }
          } else {
            toast.error('Failed to upload image', { id: toastId });
          }
        } catch (_) {
          toast.error('Upload failed', { id: toastId });
        }
        return;
      }

      // If user is actively typing in a native input/textarea, let normal text paste proceed
      if (isTypingInField) {
        return;
      }

      // Case 2: Page-Level Paste (no text input focused)
      e.preventDefault();
      const activeBlock = subSections.find((b) => b._id === activeBlockId);

      // To-Do list
      if (classified.type === 'todo') {
        if (activeBlock && activeBlock.type === 'todo') {
          await dispatch(
            bulkAddTodos({ sectionId: id, subId: activeBlock._id, todos: classified.todos }),
          );
          toast.success(`Appended ${classified.todos.length} tasks to ${activeBlock.name}!`);
        } else {
          const res = await dispatch(
            createSubSection({
              sectionId: id,
              name: classified.blockName,
              type: 'todo',
              todos: classified.todos,
              afterSubId: activeBlockId || undefined,
            }),
          );
          toast.success(`Smart Paste: Created To-Do block with ${classified.todos.length} tasks!`);
          if (res.payload?.subSection?._id) {
            setActiveBlockId(res.payload.subSection._id);
            setPasteNotice({
              message: `Created Tasks block (${classified.todos.length} items)`,
              createdBlockId: res.payload.subSection._id,
            });
          }
        }
        return;
      }

      // Link
      if (classified.type === 'links') {
        if (activeBlock && activeBlock.type === 'links') {
          await dispatch(
            addLink({
              sectionId: id,
              subId: activeBlock._id,
              url: classified.url,
              title: classified.title,
            }),
          );
          toast.success(`Added link to ${activeBlock.name}!`);
        } else {
          const res = await dispatch(
            createSubSection({
              sectionId: id,
              name: classified.blockName,
              type: 'links',
              links: [{ url: classified.url, title: classified.title }],
              afterSubId: activeBlockId || undefined,
            }),
          );
          toast.success(`Smart Paste: Created Links block!`);
          if (res.payload?.subSection?._id) {
            setActiveBlockId(res.payload.subSection._id);
            setPasteNotice({
              message: 'Created Links block',
              createdBlockId: res.payload.subSection._id,
            });
          }
        }
        return;
      }

      // Code Snippet
      if (classified.type === 'snippet') {
        if (activeBlock && activeBlock.type === 'snippet') {
          await dispatch(
            updateSubSection({
              sectionId: id,
              subId: activeBlock._id,
              code: classified.code,
              language: classified.language,
            }),
          );
          toast.success(`Updated ${activeBlock.name} with code!`);
        } else {
          const res = await dispatch(
            createSubSection({
              sectionId: id,
              name: classified.blockName,
              type: 'snippet',
              code: classified.code,
              language: classified.language,
              afterSubId: activeBlockId || undefined,
            }),
          );
          toast.success(`Smart Paste: Created ${classified.language} Snippet!`);
          if (res.payload?.subSection?._id) {
            setActiveBlockId(res.payload.subSection._id);
            setPasteNotice({
              message: `Created ${classified.language} snippet`,
              createdBlockId: res.payload.subSection._id,
            });
          }
        }
        return;
      }

      // Note
      if (classified.type === 'note') {
        if (activeBlock && activeBlock.type === 'note') {
          const combined = (activeBlock.content ? activeBlock.content + '\n\n' : '') + classified.content;
          await dispatch(
            updateSubSection({ sectionId: id, subId: activeBlock._id, content: combined }),
          );
          toast.success(`Appended note to ${activeBlock.name}!`);
        } else {
          const res = await dispatch(
            createSubSection({
              sectionId: id,
              name: classified.blockName,
              type: 'note',
              content: classified.content,
              afterSubId: activeBlockId || undefined,
            }),
          );
          toast.success(`Smart Paste: Created Note block!`);
          if (res.payload?.subSection?._id) {
            setActiveBlockId(res.payload.subSection._id);
            setPasteNotice({
              message: 'Created Note block',
              createdBlockId: res.payload.subSection._id,
            });
          }
        }
      }
    },
    [canManage, id, subSections, activeBlockId, dispatch],
  );

  useEffect(() => {
    window.addEventListener('paste', handleGlobalPaste);
    return () => {
      window.removeEventListener('paste', handleGlobalPaste);
    };
  }, [handleGlobalPaste]);

  const handleImport = async (data) => {
    const result = await dispatch(importToSection({ sectionId: id, importData: data }));
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success(result.payload.message || 'Files imported');
    } else {
      toast.error(result.payload || 'Import failed');
      throw new Error('Import failed');
    }
  };

  const handleRemoveFile = async (fileId) => {
    if (!window.confirm('Remove this file?')) return;
    const result = await dispatch(removeFileFromSection({ sectionId: id, fileId }));
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success('File removed');
      if (selectedFile?._id === fileId) setSelectedFile(null);
    }
  };

  const handleAddBlock = async (type, name) => {
    const result = await dispatch(createSubSection({ sectionId: id, name, type }));
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success(`${name} created`);
      if (result.payload?.subSection?._id) {
        setActiveBlockId(result.payload.subSection._id);
      }
    } else {
      toast.error(result.payload || 'Failed to create block');
    }
  };

  const handleUndoPaste = async () => {
    if (pasteNotice?.createdBlockId) {
      await dispatch(
        deleteSubSection({ sectionId: id, subId: pasteNotice.createdBlockId }),
      );
      toast.success('Undone paste action');
      setPasteNotice(null);
    }
  };

  if (selectedFile) {
    return (
      <div className="h-[calc(100vh-64px)] flex flex-col">
        <FileViewer file={selectedFile} onBack={() => setSelectedFile(null)} />
      </div>
    );
  }

  if (isLoading || !currentSection) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <LoadingSpinner text="Loading section…" />
      </div>
    );
  }

  const hasFolders   = currentSection.folders?.length > 0;
  const hasFiles     = currentSection.files?.length > 0;
  const hasDriveData = hasFolders || hasFiles;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* ─── Hero Banner Header ────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl overflow-hidden border border-subtle shadow-xl bg-surface"
      >
        {/* Banner Media Backdrop */}
        {currentSection.bannerImage ? (
          <div className="h-48 sm:h-60 w-full relative overflow-hidden">
            <img
              src={currentSection.bannerImage}
              alt={currentSection.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30 backdrop-blur-[0.5px]" />
          </div>
        ) : (
          <div
            className={`h-40 sm:h-52 w-full bg-gradient-to-br ${colorClasses.from} ${colorClasses.to} relative overflow-hidden`}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
          </div>
        )}

        {/* Content Overlaid on Banner */}
        <div className="absolute inset-0 p-5 sm:p-6 flex flex-col justify-between z-10">
          {/* Top Bar on Banner */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/workspaces')}
              className="flex items-center gap-1.5 text-xs font-medium text-white/90 hover:text-white bg-black/40 hover:bg-black/60 px-3 py-1.5 rounded-xl backdrop-blur-md border border-white/10 transition-colors cursor-pointer"
            >
              <IoArrowBack size={13} /> All Workspaces
            </button>

            <div className="flex items-center gap-2">
              {/* Live Presence Pill */}
              {activeCollaborators.length > 0 && (
                <div
                  className="flex items-center gap-1.5 text-xs font-medium text-emerald-300 bg-black/50 px-2.5 py-1.5 rounded-xl backdrop-blur-md border border-emerald-500/40 shadow-sm"
                  title={`${activeCollaborators.length} collaborator${activeCollaborators.length !== 1 ? 's' : ''} online right now`}
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="hidden sm:inline text-[11px] font-semibold tracking-wide">Live</span>
                  <div className="flex items-center -space-x-1.5 ml-1">
                    {activeCollaborators.slice(0, 3).map((collab) => (
                      <div
                        key={collab._id || collab.socketId}
                        className="w-5 h-5 rounded-full bg-surface-raised border border-white/40 flex items-center justify-center text-[9px] font-bold text-white overflow-hidden shrink-0 shadow-sm"
                        title={collab.name}
                      >
                        {collab.avatar ? (
                          <img src={collab.avatar} alt={collab.name} className="w-full h-full object-cover" />
                        ) : (
                          (collab.name || 'U').charAt(0).toUpperCase()
                        )}
                      </div>
                    ))}
                    {activeCollaborators.length > 3 && (
                      <div className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-400/50 flex items-center justify-center text-[8px] font-bold text-white shrink-0">
                        +{activeCollaborators.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Activity Drawer Toggle */}
              <button
                onClick={() => setShowActivity(true)}
                className="relative flex items-center gap-1.5 text-xs font-medium text-white/90 hover:text-white bg-black/40 hover:bg-black/60 px-3 py-1.5 rounded-xl backdrop-blur-md border border-white/10 hover:border-amber-400/70 transition-colors cursor-pointer shadow-sm"
                title="View live activity feed"
              >
                <IoPulseOutline size={15} className="text-amber-400" />
                <span className="hidden sm:inline">Activity</span>
                {activityStream.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                )}
              </button>

              <button
                onClick={() => setShowTeamModal(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-white/90 hover:text-white bg-black/40 hover:bg-black/60 px-3 py-1.5 rounded-xl backdrop-blur-md border border-white/10 hover:border-cyan-400 transition-colors cursor-pointer shadow-sm"
                title="Manage team collaborators & share access"
              >
                <IoPeopleOutline size={15} className="text-cyan-400" />
                <span>
                  Team {currentSection.collaborators?.length ? `(${1 + currentSection.collaborators.length})` : ''}
                </span>
              </button>

              {canManage && (
                <button
                  onClick={() => setShowBannerModal(true)}
                  className="flex items-center gap-1.5 text-xs font-medium text-white/90 hover:text-white bg-black/40 hover:bg-black/60 px-3 py-1.5 rounded-xl backdrop-blur-md border border-white/10 hover:border-accent transition-colors cursor-pointer shadow-sm"
                  title="Change banner via Web URL, custom file, or Pexels"
                >
                  <IoImageOutline size={14} />
                  <span>Change Banner</span>
                </button>
              )}
            </div>
          </div>

          {/* Bottom Title & Actions on Banner */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold text-white font-display truncate drop-shadow-md">
                  {currentSection.name}
                </h1>
                {myRole === 'owner' ? (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/25 text-amber-300 border border-amber-500/40 backdrop-blur-sm">
                    Owner
                  </span>
                ) : myRole === 'editor' ? (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 backdrop-blur-sm">
                    Editor
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-zinc-500/25 text-zinc-300 border border-zinc-500/40 backdrop-blur-sm">
                    Viewer (Read-only)
                  </span>
                )}
              </div>

              {currentSection.description && (
                <p className="text-white/80 text-sm mt-1 max-w-xl line-clamp-2 drop-shadow">
                  {currentSection.description}
                </p>
              )}

              <div className="flex items-center gap-2.5 mt-2.5 text-xs text-white/70 flex-wrap">
                {hasDriveData && (
                  <span>
                    {currentSection.files?.length || 0} drive file{currentSection.files?.length !== 1 ? 's' : ''}
                  </span>
                )}
                {hasDriveData && <span>·</span>}
                <span>
                  {subSections.length} block{subSections.length !== 1 ? 's' : ''}
                </span>
                {currentSection.addedBy?.name && (
                  <>
                    <span>·</span>
                    <span>by {currentSection.addedBy.name}</span>
                  </>
                )}
                {/* Collaborators avatar stack preview */}
                {currentSection.collaborators?.length > 0 && (
                  <>
                    <span>·</span>
                    <button
                      onClick={() => setShowTeamModal(true)}
                      className="inline-flex items-center -space-x-1.5 hover:opacity-80 transition-opacity cursor-pointer"
                      title="View all team members"
                    >
                      {currentSection.collaborators.slice(0, 3).map((collab, i) => (
                        <div
                          key={collab._id || i}
                          className="w-5 h-5 rounded-full bg-surface-raised border border-white/40 flex items-center justify-center text-[9px] font-bold text-white overflow-hidden shrink-0"
                        >
                          {collab.user?.avatar ? (
                            <img src={collab.user.avatar} alt={collab.user?.name} className="w-full h-full object-cover" />
                          ) : (
                            (collab.user?.name || 'U').charAt(0).toUpperCase()
                          )}
                        </div>
                      ))}
                      {currentSection.collaborators.length > 3 && (
                        <div className="w-5 h-5 rounded-full bg-black/70 border border-white/40 flex items-center justify-center text-[8px] font-bold text-white shrink-0">
                          +{currentSection.collaborators.length - 3}
                        </div>
                      )}
                    </button>
                  </>
                )}
                {canEdit && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-accent-light font-mono bg-black/40 border border-white/10 px-2 py-0.5 rounded-full">
                    <IoSparklesOutline size={11} className="text-accent" /> Smart Paste (Ctrl+V) enabled
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
              {canManage && (
                <button
                  onClick={() => setShowImport(true)}
                  className="btn-secondary flex items-center gap-1.5 text-xs sm:text-sm px-3 py-2 bg-black/50 text-white hover:bg-black/70 border-white/15 backdrop-blur-md cursor-pointer"
                >
                  <IoCloudDownloadOutline size={16} /> Drive Import
                </button>
              )}
              {canEdit && (
                <button
                  onClick={() => setShowAddBlock(true)}
                  className="btn-primary flex items-center gap-1.5 text-xs sm:text-sm px-3.5 py-2 shadow-lg shadow-accent/25 cursor-pointer"
                >
                  <IoAddOutline size={16} /> Add Block
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Read-Only Viewer Notice */}
      {isViewer && (
        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-700/60 flex items-center gap-2.5 text-xs text-zinc-300">
          <IoEyeOutline size={16} className="text-zinc-400 shrink-0" />
          <span>You have <strong>Viewer</strong> access to this shared section. Editing controls, adding blocks, and clipboard pasting are disabled.</span>
        </div>
      )}

      {/* Drive Files – collapsible */}
      {hasDriveData && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card overflow-hidden border border-subtle">
          <button onClick={() => setDriveExpanded((e) => !e)}
            className="flex items-center gap-3 w-full px-4 py-3 border-b border-subtle hover:bg-surface-raised transition-colors cursor-pointer">
            <IoFolderOutline size={16} className="text-accent" />
            <span className="text-sm font-semibold text-primary flex-1 text-left">Drive Files</span>
            <span className="text-xs text-muted mr-2">{currentSection.files?.length || 0} files</span>
            {driveExpanded ? <IoChevronDown size={14} className="text-muted" /> : <IoChevronForward size={14} className="text-muted" />}
          </button>
          <AnimatePresence initial={false}>
            {driveExpanded && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                transition={{ duration: 0.15 }} className="overflow-hidden">
                <div className="p-2">
                  {hasFolders && currentSection.folders.map((folder, i) => (
                    <FolderTree key={folder.driveFileId || i} folder={folder} onFileClick={setSelectedFile} />
                  ))}
                  {hasFiles && (
                    <div className="space-y-0.5">
                      {currentSection.files.map((file) => (
                        <div key={file._id}
                          className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-surface-raised transition-colors group cursor-pointer"
                          onClick={() => setSelectedFile(file)}>
                          {FILE_ICONS[file.fileType] || FILE_ICONS.other}
                          <span className="text-sm text-primary truncate flex-1">{file.name}</span>
                          {file.size && (
                            <span className="text-xs text-muted">
                              {file.size > 1048576
                                ? `${(file.size / 1048576).toFixed(1)} MB`
                                : `${(file.size / 1024).toFixed(0)} KB`}
                            </span>
                          )}
                          {canManage && (
                            <button onClick={(e) => { e.stopPropagation(); handleRemoveFile(file._id); }}
                              className="p-1 rounded hover:bg-red-500/10 text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                              <IoTrashOutline size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Workspace Blocks */}
      <div className="space-y-4">
        {subSectionsLoading ? (
          <div className="py-8"><LoadingSpinner text="Loading blocks…" /></div>
        ) : (
          <>
            <AnimatePresence mode="popLayout">
              {subSections.map((block) => (
                <SubSectionBlock
                  key={block._id}
                  block={block}
                  sectionId={id}
                  canManage={canManage}
                  canEdit={canEdit}
                  myRole={myRole}
                  isActive={activeBlockId === block._id}
                  onSelectBlock={(bId) => setActiveBlockId(bId)}
                  remoteFocusUser={remoteFocusedBlocks[block._id]}
                  onFocusBlock={emitBlockFocus}
                  onBlurBlock={emitBlockBlur}
                  onConflict={(conf) => setConflictData(conf)}
                />
              ))}
            </AnimatePresence>

            {/* Empty state */}
            {subSections.length === 0 && !hasDriveData && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
                <IoLayersOutline className="mx-auto text-muted mb-4" size={52} />
                <h3 className="text-lg font-medium text-secondary mb-2">Empty workspace</h3>
                <p className="text-sm text-muted mb-6 max-w-sm mx-auto">
                  Add blocks or hit <kbd className="px-1.5 py-0.5 rounded bg-surface border border-subtle text-xs font-mono">Ctrl+V</kbd> anywhere to smart-paste screenshots, tasks, links, code, or notes.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  {canEdit && (
                    <button onClick={() => setShowAddBlock(true)} className="btn-primary flex items-center gap-2">
                      <IoAddOutline size={16} /> Add Block
                    </button>
                  )}
                  {canManage && (
                    <button onClick={() => setShowImport(true)} className="btn-secondary flex items-center gap-2">
                      <IoCloudDownloadOutline size={16} /> Import Drive
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* "+ Add another block" row at bottom */}
            {canEdit && subSections.length > 0 && (
              <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                onClick={() => setShowAddBlock(true)}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-dashed border-subtle text-sm text-muted hover:text-primary hover:border-strong hover:bg-surface-raised transition-all cursor-pointer">
                <IoAddOutline size={16} /> Add another block
              </motion.button>
            )}
          </>
        )}
      </div>

      {/* Floating Smart Paste Notification Pill */}
      <AnimatePresence>
        {pasteNotice && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-40 glass-card p-3 rounded-xl border border-accent/40 shadow-xl bg-surface/95 backdrop-blur-md flex items-center gap-3"
          >
            <div className="p-1 rounded-full bg-accent/15 text-accent">
              <IoSparklesOutline size={16} />
            </div>
            <div className="text-xs">
              <p className="font-semibold text-primary">{pasteNotice.message}</p>
              <p className="text-[11px] text-muted">Automatically detected & placed</p>
            </div>
            <div className="flex items-center gap-2 ml-2">
              <button
                onClick={handleUndoPaste}
                className="text-xs text-red-400 hover:text-red-300 font-medium px-2 py-1 rounded bg-red-500/10 cursor-pointer"
              >
                Undo
              </button>
              <button
                onClick={() => setPasteNotice(null)}
                className="text-muted hover:text-primary p-1 cursor-pointer"
              >
                <IoCloseOutline size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <DriveImportModal isOpen={showImport} onClose={() => setShowImport(false)} onImport={handleImport}
        title={`Import to "${currentSection.name}"`} />
      <AnimatePresence>
        {showAddBlock && <AddBlockModal onClose={() => setShowAddBlock(false)} onAdd={handleAddBlock} />}
      </AnimatePresence>
      <AnimatePresence>
        {showBannerModal && (
          <ChangeBannerModal
            isOpen={showBannerModal}
            onClose={() => setShowBannerModal(false)}
            currentBanner={currentSection.bannerImage}
            sectionId={id}
            sectionName={currentSection.name}
          />
        )}
      </AnimatePresence>
      <TeamShareModal
        isOpen={showTeamModal}
        onClose={() => setShowTeamModal(false)}
        sectionId={id}
        sectionName={currentSection.name}
        isOwner={isOwner}
        canManage={canManage}
      />
      <ActivityFeedDrawer
        isOpen={showActivity}
        onClose={() => setShowActivity(false)}
        activeCollaborators={activeCollaborators}
        activityStream={activityStream}
      />
      <ConflictResolutionModal
        isOpen={!!conflictData}
        onClose={() => setConflictData(null)}
        blockName={conflictData?.block?.name || conflictData?.blockTitle || 'Block'}
        localDraft={conflictData?.localDraft || ''}
        remoteBlock={conflictData?.remoteBlock}
        serverVersion={conflictData?.remoteBlock?.content || conflictData?.serverVersion || ''}
        onKeepMine={handleConflictKeepMine}
        onAcceptRemote={handleConflictAcceptRemote}
        onMerge={handleConflictMerge}
      />
    </div>
  );
};

export default SectionDetailPage;
