import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { workbookPlugin } from "./server/workbook";

// https://vitejs.dev/config/
export default defineConfig({
  base: "./",
  // Local machine only by default (SEC-EXPO-001); set HOST (e.g. HOST=0.0.0.0) to opt in to other interfaces.
  server: {
    host: process.env.HOST ?? "localhost",
    port: 3000,
  },
  preview: {
    host: process.env.HOST ?? "localhost",
  },
  // The app's data comes from ../data/code-app-data.xlsx, served at /api/workbook/* (set WORKBOOK_PATH to use another file).
  plugins: [react(), workbookPlugin(path.resolve(__dirname, "../data/code-app-data.xlsx"))],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
