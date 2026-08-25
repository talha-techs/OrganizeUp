import { useEffect, useState, useRef } from 'react';
import { animate } from 'framer-motion';

/**
 * AnimatedCounter component for sequential count-up animations.
 * Smoothly animates from 0 (or previous value) to target value in <= 1 second.
 *
 * Props:
 * - value: number (Target number to animate to)
 * - duration: number (in seconds, default: 0.85s)
 * - delay: number (in seconds, default: 0)
 * - className: string (Tailwind/CSS classes for styling)
 * - prefix: string (optional prefix before number)
 * - suffix: string (optional suffix after number)
 */
const AnimatedCounter = ({
  value = 0,
  duration = 0.85,
  delay = 0,
  className = '',
  prefix = '',
  suffix = '',
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const prevValueRef = useRef(0);

  useEffect(() => {
    const target = typeof value === 'number' ? value : parseInt(value, 10) || 0;
    const startValue = prevValueRef.current;
    
    // Adaptive duration: smooth and never exceeding 1.0 second
    const actualDuration = Math.min(1.0, Math.max(0.4, duration));

    let controls;
    const timeoutId = setTimeout(() => {
      controls = animate(startValue, target, {
        duration: actualDuration,
        ease: [0.16, 1, 0.3, 1], // Custom smooth ease-out curve
        onUpdate: (latest) => {
          setDisplayValue(Math.round(latest));
        },
        onComplete: () => {
          setDisplayValue(target);
          prevValueRef.current = target;
        },
      });
    }, delay * 1000);

    return () => {
      clearTimeout(timeoutId);
      if (controls) controls.stop();
    };
  }, [value, duration, delay]);

  return (
    <span className={className}>
      {prefix}
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  );
};

export default AnimatedCounter;
