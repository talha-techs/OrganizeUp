import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SplashScreen = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate loading progress
    const duration = 2000;
    const interval = 20;
    let current = 0;

    const timer = setInterval(() => {
      current += (interval / duration) * 100;
      if (current >= 100) {
        clearInterval(timer);
        setProgress(100);
        setTimeout(onComplete, 300); // Wait a bit after 100%
      } else {
        setProgress(current);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed inset-0 z-[9999] bg-canvas flex items-center justify-center overflow-hidden"
      >
        <div className="relative w-full h-full max-w-[500px] flex items-center justify-center">
          {/* The Static Splash Image */}
          <img
            src="/splash-screen.png"
            alt="Loading..."
            className="w-full h-full object-cover"
          />

          {/* 
            We draw a brand new, working loading bar precisely where the static one is.
          */}
          <div 
            className="absolute"
            style={{
              bottom: '39%', 
              left: '50%',
              transform: 'translateX(-50%)',
              width: '32%',
              height: '4px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              overflow: 'hidden'
            }}
          >
            <div 
              className="h-full bg-accent rounded-full shadow-[0_0_10px_var(--accent-glow)]"
              style={{
                width: `${progress}%`,
                transition: 'width 0.1s linear'
              }}
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SplashScreen;
