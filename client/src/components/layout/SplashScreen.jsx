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
        className="fixed inset-0 z-[9999] bg-[#020617] flex items-center justify-center overflow-hidden"
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
            You can tweak these percentages if it doesn't align perfectly!
          */}
          <div 
            className="absolute"
            style={{
              bottom: '39%', 
              left: '50%',
              transform: 'translateX(-50%)',
              width: '32%', // Approximate width of the bar in the image
              height: '4px', // Approximate height
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              overflow: 'hidden'
            }}
          >
            <div 
              className="h-full bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"
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
