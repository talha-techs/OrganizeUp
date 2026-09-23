import { motion, AnimatePresence } from 'framer-motion';
import {
  IoAlertCircleOutline,
  IoCheckmarkCircleOutline,
  IoCloseOutline,
  IoGitMergeOutline,
  IoArrowForwardOutline,
  IoCloudDownloadOutline,
  IoCloudUploadOutline,
} from 'react-icons/io5';

const ConflictResolutionModal = ({
  isOpen,
  onClose,
  blockName = 'Block',
  localDraft = '',
  remoteBlock = null,
  onKeepMine,
  onAcceptRemote,
  onMerge,
}) => {
  if (!isOpen) return null;

  const remoteContent = remoteBlock?.content || remoteBlock?.code || '';
  const editorName = remoteBlock?.lastEditedBy?.name || 'A teammate';
  const editorAvatar = remoteBlock?.lastEditedBy?.avatar;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/75 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="relative w-full max-w-3xl glass-card rounded-2xl border border-amber-500/30 bg-surface/95 shadow-2xl p-6 overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-subtle">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <IoAlertCircleOutline size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-primary font-display flex items-center gap-2">
                  Concurrent Edit Detected
                </h3>
                <p className="text-xs text-secondary mt-0.5">
                  Another collaborator modified <span className="font-semibold text-primary">"{blockName}"</span> while you were editing.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-surface-raised transition-colors cursor-pointer"
            >
              <IoCloseOutline size={20} />
            </button>
          </div>

          {/* Side-by-Side Comparison */}
          <div className="grid md:grid-cols-2 gap-4 py-4 overflow-y-auto flex-1 my-2">
            {/* Left: Your Draft */}
            <div className="flex flex-col rounded-xl border border-subtle bg-surface-raised overflow-hidden">
              <div className="px-3.5 py-2.5 border-b border-subtle bg-surface/60 flex items-center justify-between">
                <span className="text-xs font-semibold text-accent flex items-center gap-1.5">
                  <IoCloudUploadOutline size={14} /> Your Unsaved Draft
                </span>
                <span className="text-[10px] text-muted font-mono">Local</span>
              </div>
              <div className="p-3 text-xs text-primary font-mono whitespace-pre-wrap overflow-y-auto max-h-60 leading-relaxed">
                {localDraft || <span className="text-muted italic">Empty draft</span>}
              </div>
            </div>

            {/* Right: Remote Version */}
            <div className="flex flex-col rounded-xl border border-amber-500/20 bg-amber-500/5 overflow-hidden">
              <div className="px-3.5 py-2.5 border-b border-amber-500/20 bg-amber-500/10 flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                  <IoCloudDownloadOutline size={14} /> Latest Remote Version
                </span>
                <span className="text-[10px] text-muted flex items-center gap-1">
                  {editorAvatar ? (
                    <img src={editorAvatar} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />
                  ) : null}
                  {editorName}
                </span>
              </div>
              <div className="p-3 text-xs text-primary font-mono whitespace-pre-wrap overflow-y-auto max-h-60 leading-relaxed">
                {remoteContent || <span className="text-muted italic">Empty content</span>}
              </div>
            </div>
          </div>

          {/* Action Resolution Buttons */}
          <div className="pt-3 border-t border-subtle flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-muted">
              Choose how you want to resolve this conflict:
            </span>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onAcceptRemote}
                className="btn-secondary text-xs py-2 px-3 flex items-center justify-center gap-1.5 flex-1 sm:flex-initial cursor-pointer hover:border-amber-500/40"
              >
                <IoCheckmarkCircleOutline size={15} className="text-amber-400" />
                <span>Accept Remote</span>
              </button>

              <button
                type="button"
                onClick={onMerge}
                className="btn-secondary text-xs py-2 px-3 flex items-center justify-center gap-1.5 flex-1 sm:flex-initial cursor-pointer hover:border-accent"
              >
                <IoGitMergeOutline size={15} className="text-accent" />
                <span>Merge Both</span>
              </button>

              <button
                type="button"
                onClick={onKeepMine}
                className="btn-primary text-xs py-2 px-3 flex items-center justify-center gap-1.5 flex-1 sm:flex-initial cursor-pointer"
              >
                <IoArrowForwardOutline size={15} />
                <span>Overwrite with Mine</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ConflictResolutionModal;
