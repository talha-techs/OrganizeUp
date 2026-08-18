import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        navigateFallbackDenylist: [/^\/api/],
      },
      includeAssets: ["pwa-192x192.png", "pwa-512x512.png", "maskable-icon-512x512.png", "splash-screen.png"],
      manifest: {
        name: "OrganizeUp",
        short_name: "OrganizeUp",
        description: "Import. Organize. Learn. Anywhere.",
        theme_color: "#09090b", // zinc-950
        background_color: "#09090b",
        display: "standalone",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ],
        screenshots: [
          {
            src: "screenshot-mobile.png",
            sizes: "688x1224", // Approximate based on 9:16 aspect
            type: "image/png",
            form_factor: "narrow"
          },
          {
            src: "screenshot-desktop.png",
            sizes: "1280x720", // Approximate based on 16:9 aspect
            type: "image/png",
            form_factor: "wide"
          }
        ]
      }
    })
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-redux": ["@reduxjs/toolkit", "react-redux"],
          "vendor-motion": ["framer-motion"],
          "vendor-icons": ["react-icons"],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
