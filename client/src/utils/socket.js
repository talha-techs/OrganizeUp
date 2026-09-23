import { io } from 'socket.io-client';
import api from './api';

let socket = null;

export const getSocketUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // In local development, connect directly to port 5000
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5000';
  }
  // In production (organizeup.app or vercel preview), connect directly to Render backend
  if (
    window.location.hostname.includes('organizeup') ||
    window.location.hostname.includes('vercel.app')
  ) {
    return 'https://organizeup.onrender.com';
  }
  return window.location.origin;
};

/**
 * Ensures a valid JWT token exists in localStorage.
 * If missing (e.g. user was logged in via cookie), fetches a fresh one from /api/auth/socket-token.
 */
export const ensureSocketToken = async () => {
  let token = localStorage.getItem('token');
  if (token) return token;

  try {
    const res = await api.get('/auth/socket-token');
    if (res.data?.token) {
      token = res.data.token;
      localStorage.setItem('token', token);
      console.log('🔑 [Realtime] Acquired fresh socket token from session');
      return token;
    }
  } catch (err) {
    console.warn('⚠️ [Realtime] Failed to retrieve socket token via cookie session:', err?.message);
  }
  return null;
};

export const getSocket = (explicitToken = null) => {
  const token = explicitToken || localStorage.getItem('token') || '';
  const url = getSocketUrl();

  if (!socket) {
    socket = io(url, {
      auth: { token },
      query: { token },
      withCredentials: true,
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      console.log('⚡ [Realtime] Connected to WebSocket gateway:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.warn('⚠️ [Realtime] Socket connection error:', err.message);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 [Realtime] Disconnected:', reason);
    });
  }

  if (socket && token) {
    if (!socket.auth) socket.auth = {};
    socket.auth.token = token;
    if (socket.io?.opts) {
      socket.io.opts.query = { token };
    }
  }

  return socket;
};

export const connectSocket = (explicitToken = null) => {
  const s = getSocket(explicitToken);
  const token = explicitToken || localStorage.getItem('token');
  if (s) {
    if (token) {
      s.auth = { token };
    }
    if (!s.connected) {
      s.connect();
    }
  }
  return s;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
