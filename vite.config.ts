import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { sourceInjector } from "./plugins/SourceInjectorPlugin.ts";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 8085,
    allowedHosts: ['preview-aionspacesandbox-ons.offlineonspace.cc', 'preview.onspace.ai','9b5kd4.onspace.meme','9b5kd4.preview.offlineonspace.com'],
    hmr: {
            overlay: false,
    }
  },
  plugins: [
sourceInjector(),

    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
