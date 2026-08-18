import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { HiX } from 'react-icons/hi';

const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) => {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AnimatePresence>
        {isOpen && (
          <Dialog.Portal forceMount>
            {/* Backdrop */}
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
              />
            </Dialog.Overlay>

            {/* Modal Content */}
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
              <Dialog.Content asChild>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  transition={{ duration: 0.2 }}
                  className={`pointer-events-auto relative w-full ${maxWidth} bg-surface-raised border border-subtle rounded-2xl shadow-2xl shadow-black/40 max-h-[90vh] overflow-y-auto focus:outline-none`}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between p-5 border-b border-subtle">
                    <Dialog.Title className="text-lg font-semibold text-primary font-display">
                      {title}
                    </Dialog.Title>
                    <Dialog.Close asChild>
                      <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-surface transition-all cursor-pointer"
                        aria-label="Close dialog"
                      >
                        <HiX size={18} />
                      </button>
                    </Dialog.Close>
                  </div>

                  {/* Body */}
                  <div className="p-5">{children}</div>
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
};

export default Modal;
