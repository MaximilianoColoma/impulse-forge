import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  preview: {
    allowedHosts: [".trycloudflare.com"],
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "robots.txt"],
      manifest: {
        name: "Synapse — Dein Second Brain für ADHS",
        short_name: "Synapse",
        description: "Verwandle dein ADHS in deine Superkraft. Erfasse Gedanken sofort und mache aus Chaos Klarheit.",
        theme_color: "#0A0E1A",
        background_color: "#0A0E1A",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/icon.svg",
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any maskable"
          },
          {
            src: "/icon.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ],
        share_target: {
          action: "/share",
          method: "GET",
          params: {
            title: "title",
            text: "text",
            url: "url"
          }
        }
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
      }
    }),
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "vendor-react",
              test: /[\\/]node_modules[\\/](?:react|react-dom|react-router|react-router-dom)(?:[\\/]|$)/,
            },
            {
              name: "vendor-charts",
              test: /[\\/]node_modules[\\/]recharts(?:[\\/]|$)/,
            },
            {
              name: "vendor-ui",
              test: /[\\/]node_modules[\\/]@radix-ui[\\/]react-(?:dialog|dropdown-menu|popover|select|tabs|tooltip|toast)(?:[\\/]|$)/,
            },
            {
              name: "vendor-dnd",
              test: /[\\/]node_modules[\\/]@dnd-kit[\\/](?:core|sortable|utilities)(?:[\\/]|$)/,
            },
            {
              name: "vendor-supabase",
              test: /[\\/]node_modules[\\/]@supabase[\\/]supabase-js(?:[\\/]|$)/,
            },
          ],
        },
      },
    },
  },
}));
