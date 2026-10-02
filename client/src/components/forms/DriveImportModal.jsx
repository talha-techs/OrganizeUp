import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IoCloudUploadOutline,
  IoFolderOpenOutline,
  IoFolderOutline,
  IoDocumentOutline,
  IoImageOutline,
  IoVideocamOutline,
  IoCodeSlashOutline,
  IoCheckmarkCircle,
  IoChevronForward,
  IoChevronBack,
  IoChevronDown,
  IoClose,
  IoSearchOutline,
  IoCheckboxOutline,
  IoSquareOutline,
  IoRemoveOutline,
  IoCreateOutline,
  IoClipboardOutline,
  IoSparklesOutline,
  IoInformationCircleOutline,
  IoCheckmarkDoneOutline,
  IoLayersOutline,
} from 'react-icons/io5';
import { scanDriveUniversal, clearDriveScan } from '../../redux/slices/sectionSlice';
import toast from 'react-hot-toast';

const FILE_ICONS = {
  pdf: <IoDocumentOutline size={15} className="text-red-400" />,
  html: <IoCodeSlashOutline size={15} className="text-orange-400" />,
  text: <IoDocumentOutline size={15} className="text-zinc-400" />,
  image: <IoImageOutline size={15} className="text-emerald-400" />,
  video: <IoVideocamOutline size={15} className="text-rose-400" />,
  gdoc: <IoDocumentOutline size={15} className="text-blue-400" />,
  gsheet: <IoDocumentOutline size={15} className="text-emerald-400" />,
  gslides: <IoDocumentOutline size={15} className="text-amber-400" />,
  folder: <IoFolderOutline size={15} className="text-accent" />,
  other: <IoDocumentOutline size={15} className="text-zinc-500" />,
};

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Flatten a tree of items (with children) into a flat list of file ids
 */
function flattenIds(items) {
  const ids = [];
  for (const item of items) {
    if (item.fileType === 'folder' && item.children) {
      ids.push(...flattenIds(item.children));
    } else {
      ids.push(item.driveFileId);
    }
  }
  return ids;
}

/**
 * Extract all file objects with their metadata
 */
function getAllFilesList(items) {
  const files = [];
  for (const item of items) {
    if (item.fileType === 'folder' && item.children) {
      files.push(...getAllFilesList(item.children));
    } else {
      files.push(item);
    }
  }
  return files;
}

/**
 * Build a folder tree structure from selected items
 */
function buildFolderTree(items, selectedIds) {
  const folders = [];
  const files = [];

  for (const item of items) {
    if (item.fileType === 'folder' && item.children) {
      const childResult = buildFolderTree(item.children, selectedIds);
      if (childResult.files.length > 0 || childResult.folders.length > 0) {
        folders.push({
          name: item.name,
          driveFileId: item.driveFileId,
          path: item.path,
          files: childResult.files,
          subfolders: childResult.folders,
        });
      }
    } else if (selectedIds.has(item.driveFileId)) {
      files.push({
        driveFileId: item.driveFileId,
        name: item.name,
        path: item.path,
        mimeType: item.mimeType,
        fileType: item.fileType,
        size: item.size,
      });
    }
  }

  return { folders, files };
}

/**
 * Flatten all files from tree (non-folder items) for the flat files list
 */
function flattenFiles(items, selectedIds) {
  const result = [];
  for (const item of items) {
    if (item.fileType === 'folder' && item.children) {
      result.push(...flattenFiles(item.children, selectedIds));
    } else if (selectedIds.has(item.driveFileId)) {
      result.push({
        driveFileId: item.driveFileId,
        name: item.name,
        path: item.path,
        mimeType: item.mimeType,
        fileType: item.fileType,
        size: item.size,
      });
    }
  }
  return result;
}

const TreeItem = ({ item, selectedIds, onToggle, searchQuery = '', depth = 0 }) => {
  const [expanded, setExpanded] = useState(true);
  const isFolder = item.fileType === 'folder' && item.children;

  if (isFolder) {
    const childFileIds = flattenIds(item.children);
    const selectedCount = childFileIds.filter((id) => selectedIds.has(id)).length;
    const allSelected = selectedCount === childFileIds.length && childFileIds.length > 0;
    const someSelected = selectedCount > 0 && !allSelected;

    const toggleFolder = () => {
      if (allSelected || someSelected) {
        childFileIds.forEach((id) => onToggle(id, false));
      } else {
        childFileIds.forEach((id) => onToggle(id, true));
      }
    };

    return (
      <div className="select-none">
        <div
          className="flex items-center gap-2 py-1.5 px-2.5 rounded-lg hover:bg-zinc-800/50 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer group"
          style={{ paddingLeft: `${depth * 18 + 10}px` }}
        >
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer p-0.5"
          >
            {expanded ? <IoChevronDown size={13} /> : <IoChevronForward size={13} />}
          </button>

          <button type="button" onClick={toggleFolder} className="flex-shrink-0 cursor-pointer text-accent">
            {allSelected ? (
              <IoCheckboxOutline size={17} className="text-accent" />
            ) : someSelected ? (
              <IoRemoveOutline size={17} className="text-accent" />
            ) : (
              <IoSquareOutline size={17} className="text-zinc-500 hover:text-zinc-300" />
            )}
          </button>

          <IoFolderOutline size={15} className="text-accent flex-shrink-0" />
          <span className="text-sm font-medium text-zinc-100 truncate flex-1">{item.name}</span>
          <span className="text-xs text-zinc-400 font-mono px-2 py-0.5 rounded-md bg-zinc-800/60 border border-zinc-700/50">
            {childFileIds.length} file{childFileIds.length !== 1 ? 's' : ''}
          </span>
        </div>

        {expanded && (
          <div className="space-y-0.5">
            {item.children.map((child) => (
              <TreeItem
                key={child.driveFileId}
                item={child}
                selectedIds={selectedIds}
                onToggle={onToggle}
                searchQuery={searchQuery}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Regular file filter by search query
  if (searchQuery.trim() && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) {
    return null;
  }

  const isSelected = selectedIds.has(item.driveFileId);

  return (
    <div
      onClick={() => onToggle(item.driveFileId, !isSelected)}
      className={`flex items-center gap-2.5 py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer select-none group ${
        isSelected
          ? 'bg-accent/10 border border-accent/20'
          : 'hover:bg-zinc-800/40 border border-transparent'
      }`}
      style={{ paddingLeft: `${depth * 18 + 10}px` }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle(item.driveFileId, !isSelected);
        }}
        className="flex-shrink-0 cursor-pointer"
      >
        {isSelected ? (
          <IoCheckboxOutline size={16} className="text-accent" />
        ) : (
          <IoSquareOutline size={16} className="text-zinc-500 group-hover:text-zinc-300" />
        )}
      </button>

      <span className="flex-shrink-0">
        {FILE_ICONS[item.fileType] || FILE_ICONS.other}
      </span>

      <span className={`text-xs truncate flex-1 ${isSelected ? 'text-zinc-100 font-medium' : 'text-zinc-300'}`}>
        {item.name}
      </span>

      {item.size ? (
        <span className="text-[11px] text-zinc-500 font-mono">
          {formatBytes(item.size)}
        </span>
      ) : null}
    </div>
  );
};

const DriveImportModal = ({
  isOpen,
  onClose,
  onImport,
  title = 'Import from Google Drive',
  detailsFields,
}) => {
  const dispatch = useDispatch();
  const { driveScan, isScanning } = useSelector((state) => state.sections);
  const [step, setStep] = useState(1);
  const [driveLink, setDriveLink] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [details, setDetails] = useState({});
  const [imagePreview, setImagePreview] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'video' | 'pdf' | 'doc'

  const hasDetails = detailsFields && detailsFields.length > 0;
  const totalSteps = hasDetails ? 3 : 2;

  useEffect(() => {
    if (driveScan) {
      const allIds = flattenIds(driveScan.items || []);
      setSelectedIds(new Set(allIds));
      setStep(2);
    }
  }, [driveScan]);

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setDriveLink('');
      setSelectedIds(new Set());
      setIsImporting(false);
      setDetails({});
      setImagePreview(null);
      setSearchQuery('');
      setActiveFilter('all');
      dispatch(clearDriveScan());
    }
  }, [isOpen, dispatch]);

  // Pre-fill title from folder name when scan completes
  useEffect(() => {
    if (driveScan && hasDetails) {
      setDetails((prev) => ({ ...prev, title: prev.title || driveScan.folderName || '' }));
    }
  }, [driveScan, hasDetails]);

  const allFiles = useMemo(() => {
    return driveScan?.items ? getAllFilesList(driveScan.items) : [];
  }, [driveScan]);

  const totalSize = useMemo(() => {
    return allFiles
      .filter((f) => selectedIds.has(f.driveFileId))
      .reduce((acc, f) => acc + (f.size || 0), 0);
  }, [allFiles, selectedIds]);

  const handleToggle = useCallback((id, select) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (select) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = () => {
    if (!driveScan?.items) return;
    const allIds = flattenIds(driveScan.items);
    setSelectedIds(new Set(allIds));
    setActiveFilter('all');
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
    setActiveFilter('none');
  };

  const handleFilterSelect = (type) => {
    setActiveFilter(type);
    if (!driveScan?.items) return;
    if (type === 'all') {
      handleSelectAll();
      return;
    }
    if (type === 'video') {
      const videoIds = allFiles.filter((f) => f.fileType === 'video').map((f) => f.driveFileId);
      setSelectedIds(new Set(videoIds));
      return;
    }
    if (type === 'pdf') {
      const pdfIds = allFiles.filter((f) => f.fileType === 'pdf').map((f) => f.driveFileId);
      setSelectedIds(new Set(pdfIds));
      return;
    }
    if (type === 'docs') {
      const docIds = allFiles.filter((f) => ['pdf', 'gdoc', 'gsheet', 'gslides', 'text'].includes(f.fileType)).map((f) => f.driveFileId);
      setSelectedIds(new Set(docIds));
    }
  };

  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setDriveLink(text.trim());
          toast.success('Pasted from clipboard!');
        } else {
          toast.error('Clipboard is empty');
        }
      } else {
        toast.error('Clipboard permission not supported');
      }
    } catch {
      toast.error('Could not access clipboard');
    }
  };

  const handleScan = async (e) => {
    e.preventDefault();
    if (!driveLink.trim()) {
      toast.error('Please enter a Drive folder link');
      return;
    }
    const result = await dispatch(scanDriveUniversal(driveLink.trim()));
    if (result.meta.requestStatus === 'rejected') {
      toast.error(result.payload || 'Failed to scan folder. Ensure folder is public ("Anyone with the link").');
    }
  };

  const handleImport = async () => {
    if (selectedIds.size === 0) {
      toast.error('Select at least one file to import');
      return;
    }

    if (hasDetails && step === 2) {
      setStep(3);
      return;
    }

    if (hasDetails) {
      for (const field of detailsFields) {
        if (field.required && !details[field.name] && !details[`${field.name}New`] && field.type !== 'file') {
          toast.error(`${field.label} is required`);
          return;
        }
      }
    }

    setIsImporting(true);

    try {
      const files = flattenFiles(driveScan.items, selectedIds);
      const { folders } = buildFolderTree(driveScan.items, selectedIds);

      await onImport({
        driveLink,
        driveFolderId: driveScan.folderId,
        files,
        folders,
        folderName: driveScan.folderName,
        details,
      });

      onClose();
    } catch {
      toast.error('Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDetailChange = (name, value) => {
    setDetails((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (name, file) => {
    setDetails((prev) => ({ ...prev, [name]: file }));
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    } else {
      setImagePreview(null);
    }
  };

  if (!isOpen) return null;

  const allIds = driveScan ? flattenIds(driveScan.items || []) : [];
  const selectedCount = selectedIds.size;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        className="relative w-full max-w-2xl max-h-[88vh] bg-zinc-950 dark:bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800/80 bg-zinc-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-accent to-orange-500 flex items-center justify-center shadow-lg shadow-accent/20">
              <IoCloudUploadOutline size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">{title}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-zinc-400">Step {step} of {totalSteps}:</span>
                <span className="text-xs text-accent font-medium">
                  {step === 1 ? 'Connect Drive Folder' : step === 2 ? 'Select Files & Notes' : 'Course Details'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors cursor-pointer"
          >
            <IoClose size={20} />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="grid grid-cols-3 gap-2 px-6 pt-4">
          <div className={`h-1.5 rounded-full transition-all duration-300 ${step >= 1 ? 'bg-accent shadow-sm shadow-accent/50' : 'bg-zinc-800'}`} />
          <div className={`h-1.5 rounded-full transition-all duration-300 ${step >= 2 ? 'bg-accent shadow-sm shadow-accent/50' : 'bg-zinc-800'}`} />
          {hasDetails && (
            <div className={`h-1.5 rounded-full transition-all duration-300 ${step >= 3 ? 'bg-accent shadow-sm shadow-accent/50' : 'bg-zinc-800'}`} />
          )}
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <AnimatePresence mode="wait">
            {/* Step 1: Connect Drive */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="text-center max-w-md mx-auto">
                  <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-3 shadow-inner">
                    <IoFolderOpenOutline size={32} className="text-accent animate-pulse" />
                  </div>
                  <h3 className="text-lg font-bold text-white tracking-tight">Paste Public Drive Folder Link</h3>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    OrganizeUp will scan the folder, preserve your directory structure, and stream videos and PDFs directly into your personal course player.
                  </p>
                </div>

                {/* Interactive Guide Callout */}
                <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                    <IoInformationCircleOutline size={16} className="text-accent" />
                    <span>How to share your Google Drive folder:</span>
                  </div>
                  <ol className="text-xs text-zinc-400 space-y-1.5 pl-6 list-decimal">
                    <li>Right-click your folder in <strong className="text-zinc-200">Google Drive</strong> and choose <strong className="text-zinc-200">Share</strong>.</li>
                    <li>Under General access, switch from <span className="text-rose-400 font-mono">"Restricted"</span> to <span className="text-emerald-400 font-mono">"Anyone with the link"</span>.</li>
                    <li>Click <strong className="text-zinc-200">Copy link</strong> and paste it below.</li>
                  </ol>
                </div>

                <form onSubmit={handleScan} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-2">Drive Folder URL</label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={driveLink}
                        onChange={(e) => setDriveLink(e.target.value)}
                        placeholder="https://drive.google.com/drive/folders/..."
                        className="w-full bg-zinc-900 border border-zinc-700/80 focus:border-accent focus:ring-1 focus:ring-accent rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 pr-24 transition-all"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handlePasteClipboard}
                        className="absolute right-2 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                        title="Paste from clipboard"
                      >
                        <IoClipboardOutline size={13} />
                        Paste
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isScanning || !driveLink.trim()}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-accent to-orange-500 text-white text-sm font-semibold hover:opacity-90 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-accent/25 transition-all cursor-pointer"
                  >
                    {isScanning ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Scanning folder & files...</span>
                      </>
                    ) : (
                      <>
                        <IoSearchOutline size={18} />
                        <span>Scan Drive Folder</span>
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            )}

            {/* Step 2: Select Files */}
            {step === 2 && driveScan && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                className="space-y-4"
              >
                {/* Folder Summary Banner */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <IoCheckmarkCircle size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white truncate max-w-xs sm:max-w-sm">
                        {driveScan.folderName}
                      </h4>
                      <p className="text-xs text-zinc-400">
                        {driveScan.totalFiles} total files indexed
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-accent block">
                      {selectedCount} selected
                    </span>
                    <span className="text-[11px] text-zinc-500 font-mono">
                      {formatBytes(totalSize)}
                    </span>
                  </div>
                </div>

                {/* Filter Chips & Selection Controls */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    <button
                      type="button"
                      onClick={() => handleFilterSelect('all')}
                      className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                        activeFilter === 'all'
                          ? 'bg-accent text-white'
                          : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                      }`}
                    >
                      All ({allFiles.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFilterSelect('video')}
                      className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                        activeFilter === 'video'
                          ? 'bg-accent text-white'
                          : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                      }`}
                    >
                      Videos ({allFiles.filter((f) => f.fileType === 'video').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFilterSelect('pdf')}
                      className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                        activeFilter === 'pdf'
                          ? 'bg-accent text-white'
                          : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                      }`}
                    >
                      PDFs ({allFiles.filter((f) => f.fileType === 'pdf').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFilterSelect('docs')}
                      className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                        activeFilter === 'docs'
                          ? 'bg-accent text-white'
                          : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                      }`}
                    >
                      Docs & Sheets
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-accent hover:underline font-medium cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-zinc-600">•</span>
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="text-zinc-400 hover:text-zinc-200 cursor-pointer"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                {/* Search within Tree */}
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter scanned files by name..."
                    className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 pl-9 focus:border-accent transition-colors"
                  />
                  <IoSearchOutline size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* File Tree Container */}
                <div className="max-h-[42vh] overflow-y-auto rounded-2xl border border-zinc-800/90 bg-zinc-900/50 p-2 space-y-0.5 scrollbar-thin">
                  {driveScan.items.map((item) => (
                    <TreeItem
                      key={item.driveFileId}
                      item={item}
                      selectedIds={selectedIds}
                      onToggle={handleToggle}
                      searchQuery={searchQuery}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 3: Course Details */}
            {step === 3 && hasDetails && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800">
                  <div className="w-10 h-10 rounded-xl bg-accent-subtle border border-accent/20 flex items-center justify-center text-accent">
                    <IoCreateOutline size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Course Configuration</h4>
                    <p className="text-xs text-zinc-400">
                      Finalize name, category, and presentation for your {selectedCount} imported file{selectedCount !== 1 ? 's' : ''}.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {detailsFields.map((field) => (
                    <div key={field.name} className="space-y-1.5">
                      <label className="block text-xs font-semibold text-zinc-300">
                        {field.label} {field.required && <span className="text-rose-400">*</span>}
                      </label>

                      {field.type === 'textarea' ? (
                        <textarea
                          value={details[field.name] || ''}
                          onChange={(e) => handleDetailChange(field.name, e.target.value)}
                          placeholder={field.placeholder || ''}
                          className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-accent focus:ring-1 focus:ring-accent transition-colors resize-y min-h-[75px]"
                          rows={3}
                        />
                      ) : field.type === 'select' ? (
                        <div className="space-y-2">
                          <select
                            value={details[field.name] || ''}
                            onChange={(e) => handleDetailChange(field.name, e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                          >
                            <option value="">{field.placeholder || `Select ${field.label.toLowerCase()}`}</option>
                            {(field.options || []).map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>

                          {field.allowNew && (
                            <div className="space-y-1">
                              <input
                                type="text"
                                value={details[`${field.name}New`] || ''}
                                onChange={(e) => {
                                  handleDetailChange(`${field.name}New`, e.target.value);
                                  if (e.target.value.trim()) handleDetailChange(field.name, '');
                                }}
                                placeholder={field.newPlaceholder || 'Or type a new category name'}
                                className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-accent transition-colors"
                              />
                              <p className="text-[11px] text-accent flex items-center gap-1.5 pt-0.5">
                                <IoSparklesOutline size={12} />
                                <span>New categories automatically fetch high-res landscape banners from Pexels!</span>
                              </p>
                            </div>
                          )}
                        </div>
                      ) : field.type === 'file' ? (
                        <div className="space-y-2">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileChange(field.name, e.target.files[0])}
                            className="w-full text-xs text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-zinc-800 file:text-zinc-200 file:text-xs file:font-semibold hover:file:bg-zinc-700 file:cursor-pointer transition-all"
                          />
                          {imagePreview ? (
                            <div className="relative inline-block mt-1">
                              <img
                                src={imagePreview}
                                alt="Course Cover Preview"
                                className="h-28 w-48 rounded-xl object-cover border border-zinc-700 shadow-md"
                              />
                              <button
                                type="button"
                                onClick={() => handleFileChange(field.name, null)}
                                className="absolute -top-2 -right-2 p-1 rounded-full bg-rose-600 text-white hover:bg-rose-500"
                              >
                                <IoClose size={12} />
                              </button>
                            </div>
                          ) : (
                            <p className="text-[11px] text-zinc-400 flex items-center gap-1">
                              <IoSparklesOutline size={12} className="text-accent" />
                              <span>Leave blank to automatically discover and attach a Pexels photo based on course title!</span>
                            </p>
                          )}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={details[field.name] || ''}
                          onChange={(e) => handleDetailChange(field.name, e.target.value)}
                          placeholder={field.placeholder || ''}
                          className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Modal Footer Controls */}
        {step >= 2 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800/80 bg-zinc-900/40">
            <button
              type="button"
              onClick={() => {
                if (step === 3) {
                  setStep(2);
                } else {
                  setStep(1);
                  dispatch(clearDriveScan());
                }
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <IoChevronBack size={15} />
              <span>Back</span>
            </button>

            {step === 2 && hasDetails ? (
              <button
                type="button"
                onClick={() => {
                  if (selectedIds.size === 0) {
                    toast.error('Select at least one file');
                    return;
                  }
                  setStep(3);
                }}
                disabled={selectedIds.size === 0}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-accent to-orange-500 text-white text-xs font-bold hover:opacity-90 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-md shadow-accent/20 transition-all cursor-pointer"
              >
                <span>Continue: Course Details</span>
                <IoChevronForward size={15} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleImport}
                disabled={isImporting || selectedIds.size === 0}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-accent to-orange-500 text-white text-xs font-bold hover:opacity-90 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-accent/25 transition-all cursor-pointer"
              >
                {isImporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Importing & Setting Up Course...</span>
                  </>
                ) : (
                  <>
                    <IoCheckmarkDoneOutline size={16} />
                    <span>Import {selectedCount} file{selectedCount !== 1 ? 's' : ''}</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default DriveImportModal;
