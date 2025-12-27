import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [dyadComponentTagger(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
