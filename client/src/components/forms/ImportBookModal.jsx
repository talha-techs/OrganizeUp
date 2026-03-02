import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IoCloudUploadOutline,
  IoFolderOpenOutline,
  IoVideocamOutline,
  IoCheckmarkCircle,
  IoChevronForward,
  IoChevronBack,
  IoClose,
  IoSearchOutline,
} from 'react-icons/io5';
import { scanDriveFolder, importDriveBook, clearDriveScanned } from '../../redux/slices/bookSlice';
import toast from 'react-hot-toast';

const ImportBookModal = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const { driveScanned, isScanningDrive, isImporting } = useSelector((state) => state.books);

  const [step, setStep] = useState(1); // 1: Enter link, 2: Review & confirm
  const [driveLink, setDriveLink] = useState('');
  const [bookName, setBookName] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (driveScanned) {
      setBookName(driveScanned.folderName || '');
      setStep(2);
    }
  }, [driveScanned]);

  useEffect(() => {
    if (!isOpen) {
      // Reset on close
      setStep(1);
      setDriveLink('');
      setBookName('');
      setAuthor('');
      setDescription('');
      dispatch(clearDriveScanned());
    }
  }, [isOpen, dispatch]);

  const handleScan = async (e) => {
    e.preventDefault();
    if (!driveLink.trim()) {
      toast.error('Please enter a Drive folder link');
      return;
    }
    const result = await dispatch(scanDriveFolder(driveLink.trim()));
    if (result.meta.requestStatus === 'rejected') {
      toast.error(result.payload || 'Failed to scan folder');
    }
  };

  const handleImport = async () => {
    if (!bookName.trim()) {
      toast.error('Book name is required');
      return;
    }
    if (!author.trim()) {
      toast.error('Author is required');
      return;
    }

    const result = await dispatch(
      importDriveBook({
        title: bookName.trim(),
        author: author.trim(),
        description: description.trim(),
        folderId: driveScanned.folderId,
        videos: driveScanned.videos,
      }),
    );

    if (result.meta.requestStatus === 'fulfilled') {
      toast.success(`Imported "${bookName}" with ${driveScanned.videos.length} videos`);
      onClose();
    } else {
      toast.error(result.payload || 'Import failed');
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
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
              <h2 className="text-lg font-semibold text-white">Import from Google Drive</h2>
              <p className="text-xs text-slate-400">Step {step} of 2</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors">
            <IoClose size={20} />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 px-6 pt-4">
          <div className={`h-1 flex-1 rounded-full transition-colors ${step >= 1 ? 'bg-indigo-500' : 'bg-slate-700'}`} />
          <div className={`h-1 flex-1 rounded-full transition-colors ${step >= 2 ? 'bg-indigo-500' : 'bg-slate-700'}`} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {/* Step 1: Enter Drive Link */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <div className="text-center mb-6">
                  <IoFolderOpenOutline size={48} className="mx-auto text-indigo-400 mb-3" />
                  <h3 className="text-white font-medium mb-1">Paste your Google Drive folder link</h3>
                  <p className="text-sm text-slate-400">
                    The folder must be shared as "Anyone with the link" and contain video files
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
                    disabled={isScanningDrive || !driveLink.trim()}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {isScanningDrive ? (
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

            {/* Step 2: Review & Confirm */}
            {step === 2 && driveScanned && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                {/* Found Summary */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-6">
                  <IoCheckmarkCircle size={20} className="text-emerald-400 flex-shrink-0" />
                  <span className="text-sm text-emerald-300">
                    Found <strong>{driveScanned.videoCount}</strong> video{driveScanned.videoCount > 1 ? 's' : ''} in "{driveScanned.folderName}"
                  </span>
                </div>

                {/* Book Details */}
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Book Name</label>
                    <input
                      type="text"
                      value={bookName}
                      onChange={(e) => setBookName(e.target.value)}
                      className="input-dark w-full"
                      placeholder="Enter book name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Author</label>
                    <input
                      type="text"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      className="input-dark w-full"
                      placeholder="Enter author name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Description (optional)</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="input-dark w-full h-20 resize-none"
                      placeholder="Brief description..."
                    />
                  </div>
                </div>

                {/* Video List */}
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-3">
                    Videos ({driveScanned.videoCount})
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {driveScanned.videos.map((video, i) => (
                      <div
                        key={video.driveFileId}
                        className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-white/5"
                      >
                        <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-indigo-400">{i + 1}</span>
                        </div>
                        <IoVideocamOutline size={16} className="text-slate-500 flex-shrink-0" />
                        <span className="text-sm text-white truncate flex-1">{video.title}</span>
                        {video.size && (
                          <span className="text-xs text-slate-500 flex-shrink-0">{formatFileSize(video.size)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {step === 2 && (
          <div className="flex items-center justify-between p-6 border-t border-white/5">
            <button
              onClick={() => { setStep(1); dispatch(clearDriveScanned()); }}
              className="btn-secondary flex items-center gap-2"
            >
              <IoChevronBack size={16} />
              Back
            </button>
            <button
              onClick={handleImport}
              disabled={isImporting || !bookName.trim() || !author.trim()}
              className="btn-primary flex items-center gap-2"
            >
              {isImporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  Import Book
                  <IoChevronForward size={16} />
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ImportBookModal;
