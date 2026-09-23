import axios from "axios";
import { getSocket } from "./socket";

const API_URL = import.meta.env.VITE_API_URL || "";

const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: Attach JWT token and x-socket-id from active socket if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const sock = getSocket();
    if (sock?.id) {
      config.headers["x-socket-id"] = sock.id;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Public paths where a 401 should NEVER trigger an automatic hard redirect to /login
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/auth/google/success",
  "/docs",
  "/explore",
];

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("user");
      localStorage.removeItem("token");

      const currentPath = window.location.pathname;
      const isPublicPath = PUBLIC_PATHS.some(
        (path) => currentPath === path || currentPath.startsWith("/docs")
      );

      // Only redirect if the user is on a protected route that requires authentication
      if (!isPublicPath) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
