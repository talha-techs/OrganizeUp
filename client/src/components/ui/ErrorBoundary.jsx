import React from 'react';
import { IoAlertCircleOutline, IoRefreshOutline, IoHomeOutline } from 'react-icons/io5';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled React Rendering Error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
          <div className="glass-card max-w-md w-full p-8 border border-red-500/20 bg-slate-900/90 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4 text-red-400">
              <IoAlertCircleOutline size={36} />
            </div>

            <h2 className="text-xl font-bold text-white mb-2 font-display">
              Something went wrong
            </h2>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              An unexpected error occurred while rendering this page. You can reload or return to the dashboard.
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="btn-primary text-xs py-2.5 px-4 flex items-center gap-2"
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
