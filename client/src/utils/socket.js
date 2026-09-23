import { io } from 'socket.io-client';

let socket = null;

const getSocketUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // In development, default to port 5000 if running on localhost
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5000';
  }
  return window.location.origin;
};

export const getSocket = () => {
  if (!socket) {
    const token = localStorage.getItem('token');
    socket = io(getSocketUrl(), {
      auth: { token },
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect_error', (err) => {
      console.warn('Real-time socket connection error:', err.message);
    });
  }

  // Update token in case it was refreshed/changed
  const currentToken = localStorage.getItem('token');
  if (socket && socket.auth) {
    socket.auth.token = currentToken;
  }

  return socket;
};

export const connectSocket = () => {
  const s = getSocket();
  if (s && !s.connected) {
    const currentToken = localStorage.getItem('token');
    s.auth = { token: currentToken };
    s.connect();
  }
  return s;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
