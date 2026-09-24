import React from 'react';
import { IoAlertCircleOutline, IoRefreshOutline, IoHomeOutline, IoSparklesOutline } from 'react-icons/io5';
import { isChunkLoadError } from '../../utils/lazyWithRetry';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isChunkError: false,
      isAutoReloading: false,
    };
  }

  static getDerivedStateFromError(error) {
    const isChunk = isChunkLoadError(error);
    return {
      hasError: true,
      error,
      isChunkError: isChunk,
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled React Error:', error, errorInfo);

    if (isChunkLoadError(error)) {
      const alreadyRetried = sessionStorage.getItem('eb_chunk_reload');
      if (!alreadyRetried) {
        sessionStorage.setItem('eb_chunk_reload', 'true');
        this.setState({ isAutoReloading: true });
        // Give browser 200ms to update state and reload
        setTimeout(() => {
          window.location.reload();
        }, 200);
      }
    }
  }

  handleReset = () => {
    sessionStorage.removeItem('eb_chunk_reload');
    this.setState({ hasError: false, error: null, isChunkError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // ── Stale deployment / New build released ──
      if (this.state.isChunkError) {
        return (
          <div className="min-h-screen bg-canvas flex items-center justify-center p-6 text-center">
            <div className="glass-card max-w-md w-full p-8 border border-accent/30 bg-surface/95 shadow-2xl">
              <div className="w-16 h-16 rounded-2xl bg-accent-subtle border border-accent/30 flex items-center justify-center mx-auto mb-4 text-accent">
                <IoSparklesOutline size={32} className="animate-spin" style={{ animationDuration: '3s' }} />
              </div>

              <h2 className="text-xl font-bold text-primary mb-2 font-display">
                New Version Available
              </h2>
              <p className="text-sm text-secondary mb-6 leading-relaxed">
                A fresh update was just deployed. Click below to load the latest features and improvements.
              </p>

              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={this.handleReset}
                  className="btn-primary text-xs py-2.5 px-5 flex items-center gap-2 cursor-pointer shadow-lg shadow-accent/20"
                >
                  <IoRefreshOutline size={16} /> Update Now
                </button>
              </div>
            </div>
          </div>
        );
      }

      // ── Generic runtime error ──
      return (
        <div className="min-h-screen bg-canvas flex items-center justify-center p-6 text-center">
          <div className="glass-card max-w-md w-full p-8 border border-red-500/20 bg-surface/90 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4 text-red-400">
              <IoAlertCircleOutline size={36} />
            </div>

            <h2 className="text-xl font-bold text-primary mb-2 font-display">
              Something went wrong
            </h2>
            <p className="text-sm text-secondary mb-6 leading-relaxed">
              An unexpected error occurred while rendering this page. You can reload or return to the dashboard.
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="btn-primary text-xs py-2.5 px-4 flex items-center gap-2 cursor-pointer"
              >
                <IoRefreshOutline size={15} /> Reload Page
              </button>
              <a
                href="/dashboard"
                className="btn-secondary text-xs py-2.5 px-4 flex items-center gap-2"
              >
                <IoHomeOutline size={15} /> Dashboard
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
