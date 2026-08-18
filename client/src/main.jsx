import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { store } from './redux/store';
import { ThemeProvider } from './theme/ThemeContext';
import App from './App';
import './index.css';

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
