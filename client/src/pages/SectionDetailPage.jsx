import { useEffect, useState } from 'react';
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
} from 'react-icons/io5';
import {
  fetchSection,
  importToSection,
  removeFileFromSection,
  clearCurrentSection,
  fetchSubSections,
  createSubSection,
} from '../redux/slices/sectionSlice';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import DriveImportModal from '../components/forms/DriveImportModal';
import FileViewer from '../components/ui/FileViewer';
import SubSectionBlock from '../components/sections/SubSectionBlock';
import toast from 'react-hot-toast';
import useDocumentTitle from '../hooks/useDocumentTitle';

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

// â”€â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SectionDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { currentSection, isLoading, subSections, subSectionsLoading } =
    useSelector((state) => state.sections);
  const { user } = useSelector((state) => state.auth);
  useDocumentTitle(currentSection?.name || 'Section');
  const isAdmin = user?.role === 'admin';

  const [showImport,    setShowImport]    = useState(false);
  const [selectedFile,  setSelectedFile]  = useState(null);
  const [showAddBlock,  setShowAddBlock]  = useState(false);
  const [driveExpanded, setDriveExpanded] = useState(true);

  useEffect(() => {
    dispatch(fetchSection(id));
    dispatch(fetchSubSections(id));
    return () => { dispatch(clearCurrentSection()); };
  }, [dispatch, id]);

  const isOwner =
    !!(user?._id && currentSection?.addedBy &&
      String(currentSection.addedBy?._id ?? currentSection.addedBy) === String(user._id));
  const canManage = isAdmin || isOwner;

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
    } else {
      toast.error(result.payload || 'Failed to create block');
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
        <LoadingSpinner text="Loading sectionâ€¦" />
      </div>
    );
  }

  const hasFolders   = currentSection.folders?.length > 0;
  const hasFiles     = currentSection.files?.length > 0;
  const hasDriveData = hasFolders || hasFiles;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <button onClick={() => navigate('/sections')}
          className="flex items-center gap-2 text-sm text-secondary hover:text-primary mb-4 transition-colors cursor-pointer">
          <IoArrowBack size={14} /> All Sections
        </button>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary font-display">{currentSection.name}</h1>
            {currentSection.description && (
              <p className="text-secondary text-sm mt-1">{currentSection.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted flex-wrap">
              {hasDriveData && <span>{currentSection.files?.length || 0} drive file{currentSection.files?.length !== 1 ? 's' : ''}</span>}
              {hasDriveData && <span>·</span>}
              <span>{subSections.length} block{subSections.length !== 1 ? 's' : ''}</span>
              {currentSection.addedBy?.name && <><span>·</span><span>by {currentSection.addedBy.name}</span></>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {canManage && (
              <button onClick={() => setShowImport(true)} className="btn-secondary flex items-center gap-2 text-sm cursor-pointer">
                <IoCloudDownloadOutline size={16} /> Drive Import
              </button>
            )}
            {canManage && (
              <button onClick={() => setShowAddBlock(true)} className="btn-primary flex items-center gap-2 text-sm cursor-pointer">
                <IoAddOutline size={16} /> Add Block
              </button>
            )}
          </div>
        </div>
      </motion.div>

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
                <SubSectionBlock key={block._id} block={block} sectionId={id} canManage={canManage} />
              ))}
            </AnimatePresence>

            {/* Empty state */}
            {subSections.length === 0 && !hasDriveData && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
                <IoLayersOutline className="mx-auto text-muted mb-4" size={52} />
                <h3 className="text-lg font-medium text-secondary mb-2">Empty workspace</h3>
                <p className="text-sm text-muted mb-6 max-w-sm mx-auto">
                  Add blocks to organize notes, tasks, links, code snippets — or import files from Google Drive.
                </p>
                {canManage && (
                  <div className="flex flex-wrap justify-center gap-3">
                    <button onClick={() => setShowAddBlock(true)} className="btn-primary flex items-center gap-2">
                      <IoAddOutline size={16} /> Add Block
                    </button>
                    <button onClick={() => setShowImport(true)} className="btn-secondary flex items-center gap-2">
                      <IoCloudDownloadOutline size={16} /> Import Drive
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* "+ Add another block" row at bottom */}
            {canManage && subSections.length > 0 && (
              <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                onClick={() => setShowAddBlock(true)}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-dashed border-subtle text-sm text-muted hover:text-primary hover:border-strong hover:bg-surface-raised transition-all cursor-pointer">
                <IoAddOutline size={16} /> Add another block
              </motion.button>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <DriveImportModal isOpen={showImport} onClose={() => setShowImport(false)} onImport={handleImport}
        title={`Import to "${currentSection.name}"`} />
      <AnimatePresence>
        {showAddBlock && <AddBlockModal onClose={() => setShowAddBlock(false)} onAdd={handleAddBlock} />}
      </AnimatePresence>
    </div>
  );
};

export default SectionDetailPage;
