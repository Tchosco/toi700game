import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isDev = mode === "development";

  return {
    server: {
      host: "::",
      port: 8080,
    },
    // Somente plugins de desenvolvimento devem ser adicionados quando isDev for true.
    // Removido dyadComponentTagger de produção.
    plugins: [
      react(),
      // Exemplo: adicione aqui plugins dev-only se necessários, condicionados por isDev.
      // if (isDev) { plugins.push(lovableTagging()); }
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});