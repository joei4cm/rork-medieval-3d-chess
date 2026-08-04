import path from "path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// GitHub Pages project site needs a subpath base; local / Rork stay at "/".
const pagesBase = process.env.GITHUB_PAGES === "true" ? "/rork-medieval-3d-chess/" : "/";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: pagesBase,
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Expose both VITE_* (Vite default) and EXPO_PUBLIC_* (Rork's cross-platform
  // public-env convention, written by tools like getOrCreateAuthConfig).
  envPrefix: ["VITE_", "EXPO_PUBLIC_"],
}));
