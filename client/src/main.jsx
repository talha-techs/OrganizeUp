import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { store } from './redux/store';
import { ThemeProvider } from './theme/ThemeContext';
import App from './App';
import './index.css';

// ── Automatic Deployment Recovery ──────────────────────────────────────────
// When a new build is deployed, old hashed chunks are removed from the server.
// These listeners ensure open tabs seamlessly reload and fetch the fresh assets
// instead of crashing into an ErrorBoundary.

// 1. Vite's official event fired on dynamic module preload/fetch failure
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  const lastReload = Number(sessionStorage.getItem('last_chunk_preload_reload') || 0);
  // Debounce to at most once per 10s to avoid reload loops if offline
  if (Date.now() - lastReload > 10000) {
    sessionStorage.setItem('last_chunk_preload_reload', String(Date.now()));
    window.location.reload();
  }
});

// 2. Service Worker controller change (PWA autoUpdate activated new build)
if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

// 3. Global unhandled chunk import error catcher
window.addEventListener('error', (event) => {
  const msg = event?.message || '';
  if (
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg)
  ) {
    const lastReload = Number(sessionStorage.getItem('last_chunk_preload_reload') || 0);
    if (Date.now() - lastReload > 10000) {
      sessionStorage.setItem('last_chunk_preload_reload', String(Date.now()));
      window.location.reload();
    }
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <BrowserRouter>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: 'var(--bg-surface-raised, #18181b)',
                color: 'var(--text-primary, #fafafa)',
                border: '1px solid var(--border-strong, rgba(255, 255, 255, 0.16))',
                borderRadius: '12px',
                fontSize: '0.875rem',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
              },
              success: {
                iconTheme: { primary: '#10b981', secondary: '#18181b' },
              },
              error: {
                iconTheme: { primary: '#ef4444', secondary: '#18181b' },
              },
            }}
          />
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  </React.StrictMode>
);
