import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoCloseOutline, IoDownloadOutline } from 'react-icons/io5';

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      
      // Optionally delay showing the prompt so it's not too aggressive
      const timer = setTimeout(() => {
        // Check if user previously dismissed it in localStorage
        const hasDismissed = localStorage.getItem('organizeup_install_dismissed');
        if (!hasDismissed) {
          setShowPrompt(true);
        }
      }, 3000);

      return () => clearTimeout(timer);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    // We no longer need the prompt. Clear it up
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('organizeup_install_dismissed', 'true');
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm"
        >
          <div className="bg-surface-raised border border-strong shadow-2xl shadow-black/40 rounded-2xl p-4 flex items-start gap-4">
            <div className="bg-accent-subtle text-accent p-3 rounded-xl shrink-0 mt-0.5">
              <IoDownloadOutline size={24} />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-primary font-semibold text-sm">Install OrganizeUp</h3>
              <p className="text-secondary text-xs mt-1">
                Install our app on your device for a faster, app-like experience with offline access!
              </p>
              
              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={handleInstallClick}
                  className="btn-primary text-xs !py-1.5 !px-3"
                >
                  Install Now
                </button>
                <button
                  onClick={handleDismiss}
                  className="text-muted hover:text-primary text-xs font-medium transition-colors cursor-pointer"
                >
                  Maybe Later
                </button>
              </div>
            </div>
            
            <button
              onClick={handleDismiss}
              className="text-muted hover:text-primary shrink-0 p-1 cursor-pointer"
            >
              <IoCloseOutline size={20} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InstallPrompt;
