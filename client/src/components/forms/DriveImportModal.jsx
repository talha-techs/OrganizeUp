import { useState, useEffect, useCallback } from 'react';
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
  IoChevronUp,
  IoClose,
  IoSearchOutline,
  IoCheckboxOutline,
  IoSquareOutline,
  IoRemoveOutline,
  IoCreateOutline,
} from 'react-icons/io5';
import { scanDriveUniversal, clearDriveScan } from '../../redux/slices/sectionSlice';
import toast from 'react-hot-toast';

const FILE_ICONS = {
  pdf: <IoDocumentOutline size={14} className="text-red-400" />,
  html: <IoCodeSlashOutline size={14} className="text-orange-400" />,
  text: <IoDocumentOutline size={14} className="text-slate-400" />,
  image: <IoImageOutline size={14} className="text-emerald-400" />,
  video: <IoVideocamOutline size={14} className="text-purple-400" />,
  gdoc: <IoDocumentOutline size={14} className="text-blue-400" />,
  gsheet: <IoDocumentOutline size={14} className="text-green-400" />,
  gslides: <IoDocumentOutline size={14} className="text-yellow-400" />,
  folder: <IoFolderOutline size={14} className="text-cyan-400" />,
  other: <IoDocumentOutline size={14} className="text-slate-500" />,
};

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

const TreeItem = ({ item, selectedIds, onToggle, depth = 0 }) => {
  const [expanded, setExpanded] = useState(true);
  const isFolder = item.fileType === 'folder' && item.children;

  if (isFolder) {
    const childFileIds = flattenIds(item.children);
    const selectedCount = childFileIds.filter((id) => selectedIds.has(id)).length;
    const allSelected = selectedCount === childFileIds.length && childFileIds.length > 0;
    const someSelected = selectedCount > 0 && !allSelected;

    const toggleFolder = () => {
      if (allSelected || someSelected) {
        // Deselect all children
        childFileIds.forEach((id) => onToggle(id, false));
      } else {
        // Select all children
        childFileIds.forEach((id) => onToggle(id, true));
      }
    };

    return (
      <div>
        <div
          className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-white/5 cursor-pointer group"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-slate-500 hover:text-white transition-colors"
          >
            {expanded ? <IoChevronDown size={12} /> : <IoChevronForward size={12} />}
          </button>

          <button onClick={toggleFolder} className="flex-shrink-0">
            {allSelected ? (
              <IoCheckboxOutline size={16} className="text-indigo-400" />
            ) : someSelected ? (
              <IoRemoveOutline size={16} className="text-indigo-400" />
            ) : (
              <IoSquareOutline size={16} className="text-slate-500" />
            )}
          </button>

          <IoFolderOutline size={14} className="text-cyan-400 flex-shrink-0" />
          <span className="text-sm text-white truncate flex-1">{item.name}</span>
          <span className="text-xs text-slate-500">{childFileIds.length} files</span>
        </div>

        {expanded && (
          <div>
            {item.children.map((child) => (
              <TreeItem
                key={child.driveFileId}
                item={child}
                selectedIds={selectedIds}
                onToggle={onToggle}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Regular file
  const isSelected = selectedIds.has(item.driveFileId);

  return (
    <div
      className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-white/5 cursor-pointer"
      style={{ paddingLeft: `${depth * 16 + 24}px` }}
      onClick={() => onToggle(item.driveFileId, !isSelected)}
    >
      <div className="flex-shrink-0">
        {isSelected ? (
          <IoCheckboxOutline size={16} className="text-indigo-400" />
        ) : (
          <IoSquareOutline size={16} className="text-slate-500" />
        )}
      </div>
      {FILE_ICONS[item.fileType] || FILE_ICONS.other}
      <span className={`text-sm truncate flex-1 ${isSelected ? 'text-white' : 'text-slate-400'}`}>
        {item.name}
      </span>
      {item.size && (
        <span className="text-xs text-slate-600 flex-shrink-0">
          {item.size > 1048576
            ? `${(item.size / 1048576).toFixed(1)} MB`
            : `${(item.size / 1024).toFixed(0)} KB`}
        </span>
      )}
    </div>
  );
};

/**
 * Universal Drive Import Modal
 *
 * Props:
 * - isOpen: boolean
 * - onClose: () => void
 * - onImport: (data: { driveLink, driveFolderId, files, folders, folderName, details }) => void
 * - title: string (e.g. "Import to Courses")
 * - detailsFields: array of field configs for a step 3 form (optional)
 *     Each field: { name, label, type: 'text'|'textarea'|'select'|'file', required, placeholder, options }
 *   When provided, the modal becomes 3 steps: link → file selection → details → import
 */
const DriveImportModal = ({ isOpen, onClose, onImport, title = 'Import from Google Drive', detailsFields }) => {
  const dispatch = useDispatch();
  const { driveScan, isScanning } = useSelector((state) => state.sections);
  const [step, setStep] = useState(1);
  const [driveLink, setDriveLink] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [details, setDetails] = useState({});
  const [imagePreview, setImagePreview] = useState(null);

  const hasDetails = detailsFields && detailsFields.length > 0;
  const totalSteps = hasDetails ? 3 : 2;

  useEffect(() => {
    if (driveScan) {
      // Select all files by default
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
      dispatch(clearDriveScan());
    }
  }, [isOpen, dispatch]);

  // Pre-fill title from folder name when scan completes
  useEffect(() => {
    if (driveScan && hasDetails) {
      setDetails((prev) => ({ ...prev, title: prev.title || driveScan.folderName || '' }));
    }
  }, [driveScan, hasDetails]);

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
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleScan = async (e) => {
    e.preventDefault();
    if (!driveLink.trim()) {
      toast.error('Please enter a Drive folder link');
      return;
    }
    const result = await dispatch(scanDriveUniversal(driveLink.trim()));
    if (result.meta.requestStatus === 'rejected') {
      toast.error(result.payload || 'Failed to scan folder');
    }
  };

  const handleImport = async () => {
    if (selectedIds.size === 0) {
      toast.error('Select at least one file');
      return;
    }

    // If there are details fields and we're on step 2, go to step 3 instead
    if (hasDetails && step === 2) {
      setStep(3);
      return;
    }

    // Validate required details fields
    if (hasDetails) {
      for (const field of detailsFields) {
        if (field.required && !details[field.name] && field.type !== 'file') {
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
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl max-h-[85vh] bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center">
              <IoCloudUploadOutline size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{title}</h2>
              <p className="text-xs text-slate-400">Step {step} of {totalSteps}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors">
            <IoClose size={20} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 px-6 pt-4">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${step >= i + 1 ? 'bg-indigo-500' : 'bg-slate-700'}`} />
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <div className="text-center mb-6">
                  <IoFolderOpenOutline size={48} className="mx-auto text-indigo-400 mb-3" />
                  <h3 className="text-white font-medium mb-1">Paste your Google Drive folder link</h3>
                  <p className="text-sm text-slate-400">
                    The folder must be shared as "Anyone with the link". All files and subfolders will be scanned.
                  </p>
                </div>

                <form onSubmit={handleScan}>
                  <div className="relative mb-4">
                    <input
                      type="text"
                      value={driveLink}
                      onChange={(e) => setDriveLink(e.target.value)}
                      placeholder="https://drive.google.com/drive/folders/..."
                      className="input-dark w-full pr-12"
                      autoFocus
                    />
                    <IoSearchOutline size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  </div>

                  <button
                    type="submit"
                    disabled={isScanning || !driveLink.trim()}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {isScanning ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Scanning folder...
                      </>
                    ) : (
                      <>
                        <IoSearchOutline size={18} />
                        Scan Folder
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            )}

            {step === 2 && driveScan && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                {/* Summary */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
                  <IoCheckmarkCircle size={20} className="text-emerald-400 flex-shrink-0" />
                  <span className="text-sm text-emerald-300">
                    Found <strong>{driveScan.totalFiles}</strong> file{driveScan.totalFiles !== 1 ? 's' : ''} in "{driveScan.folderName}"
                  </span>
                </div>

                {/* Select / Deselect */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-slate-400">
                    {selectedCount} of {allIds.length} selected
                  </span>
                  <div className="flex gap-2">
                    <button onClick={handleSelectAll} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                      Select All
                    </button>
                    <span className="text-slate-600">|</span>
                    <button onClick={handleDeselectAll} className="text-xs text-slate-400 hover:text-white transition-colors">
                      Deselect All
                    </button>
                  </div>
                </div>

                {/* File tree */}
                <div className="max-h-[45vh] overflow-y-auto rounded-xl border border-white/5 bg-slate-800/30 p-2">
                  {driveScan.items.map((item) => (
                    <TreeItem
                      key={item.driveFileId}
                      item={item}
                      selectedIds={selectedIds}
                      onToggle={handleToggle}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {step === 3 && hasDetails && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                    <IoCreateOutline size={18} className="text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium text-sm">Fill in the details</h3>
                    <p className="text-xs text-slate-400">{selectedCount} file{selectedCount !== 1 ? 's' : ''} selected</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {detailsFields.map((field) => (
                    <div key={field.name}>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">
                        {field.label} {field.required && <span className="text-red-400">*</span>}
                      </label>
                      {field.type === 'textarea' ? (
                        <textarea
                          value={details[field.name] || ''}
                          onChange={(e) => handleDetailChange(field.name, e.target.value)}
                          placeholder={field.placeholder || ''}
                          className="input-dark min-h-[80px] resize-y"
                          rows={3}
                        />
                      ) : field.type === 'select' ? (
                        <>
                          <select
                            value={details[field.name] || ''}
                            onChange={(e) => handleDetailChange(field.name, e.target.value)}
                            className="input-dark"
                          >
                            <option value="">{field.placeholder || `Select ${field.label.toLowerCase()}`}</option>
                            {(field.options || []).map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          {field.allowNew && (
                            <input
                              type="text"
                              value={details[`${field.name}New`] || ''}
                              onChange={(e) => {
                                handleDetailChange(`${field.name}New`, e.target.value);
                                if (e.target.value.trim()) handleDetailChange(field.name, '');
                              }}
                              placeholder={field.newPlaceholder || 'Or type a new name'}
                              className="input-dark mt-2"
                            />
                          )}
                        </>
                      ) : field.type === 'file' ? (
                        <div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileChange(field.name, e.target.files[0])}
                            className="input-dark text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-500/10 file:text-indigo-400 file:text-sm file:cursor-pointer"
                          />
                          {imagePreview && (
                            <img src={imagePreview} alt="Preview" className="mt-2 h-24 w-auto rounded-lg object-cover border border-white/10" />
                          )}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={details[field.name] || ''}
                          onChange={(e) => handleDetailChange(field.name, e.target.value)}
                          placeholder={field.placeholder || ''}
                          className="input-dark"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {step >= 2 && (
          <div className="flex items-center justify-between p-6 border-t border-white/5">
            <button
              onClick={() => {
                if (step === 3) {
                  setStep(2);
                } else {
                  setStep(1);
                  dispatch(clearDriveScan());
                }
              }}
              className="btn-secondary flex items-center gap-2"
            >
              <IoChevronBack size={16} />
              Back
            </button>

            {step === 2 && hasDetails ? (
              <button
                onClick={() => {
                  if (selectedIds.size === 0) {
                    toast.error('Select at least one file');
                    return;
                  }
                  setStep(3);
                }}
                disabled={selectedIds.size === 0}
                className="btn-primary flex items-center gap-2"
              >
                Next: Details
                <IoChevronForward size={16} />
              </button>
            ) : (
              <button
                onClick={handleImport}
                disabled={isImporting || selectedIds.size === 0}
                className="btn-primary flex items-center gap-2"
              >
                {isImporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    Import {selectedCount} file{selectedCount !== 1 ? 's' : ''}
                    <IoChevronForward size={16} />
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
