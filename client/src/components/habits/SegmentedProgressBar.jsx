import React from 'react';

/**
 * Segmented progress bar (10 blocks) matching Notion's aesthetic
 */
const SegmentedProgressBar = ({
  percent = 0,
  totalSegments = 10,
  showLabel = true,
  size = 'md', // 'sm' | 'md' | 'lg'
  activeColor = 'bg-primary/90 dark:bg-white',
  inactiveColor = 'bg-zinc-800 dark:bg-zinc-800/80',
}) => {
  const clampedPercent = Math.max(0, Math.min(100, Math.round(percent || 0)));
  const filledCount = Math.round((clampedPercent / 100) * totalSegments);

  const blockHeight =
    size === 'sm' ? 'h-2 w-1.5' : size === 'lg' ? 'h-3.5 w-2.5' : 'h-2.5 w-2';

  return (
    <div className="inline-flex items-center gap-2 select-none">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: totalSegments }).map((_, idx) => {
          const isFilled = idx < filledCount;
          return (
            <div
              key={idx}
              className={`rounded-[2px] transition-all duration-200 ${blockHeight} ${
                isFilled
                  ? activeColor
                  : inactiveColor
              }`}
            />
          );
        })}
      </div>
      {showLabel && (
        <span className="text-[11px] font-mono text-secondary font-medium min-w-[28px] text-right">
          {clampedPercent}%
        </span>
      )}
    </div>
  );
};

export default SegmentedProgressBar;
