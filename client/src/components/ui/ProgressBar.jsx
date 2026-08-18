const ProgressBar = ({ progress = 0, height = 'h-1.5', showLabel = false, className = '' }) => {
  return (
    <div className={className}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-secondary">Progress</span>
          <span className="text-xs font-medium text-accent">{Math.round(progress)}%</span>
        </div>
      )}
      <div className={`w-full ${height} bg-surface-raised rounded-full overflow-hidden border border-subtle`}>
        <div
          className="h-full bg-gradient-to-r from-accent to-orange-400 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
