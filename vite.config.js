import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Service Worker tự cập nhật; toàn bộ app shell được precache => mở được khi offline
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-192.png'],
      manifest: {
        name: 'VKU Field Survey',
        short_name: 'VKU Survey',
        description: 'Khảo sát nhu cầu việc làm của sinh viên VKU tại hiện trường (offline-first)',
        lang: 'vi',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#0a3a5c',
        background_color: '#eef2f6',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true
      }
    })
  ]
});
