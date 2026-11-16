import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { workbookPlugin } from "./server/workbook";

// https://vitejs.dev/config/
export default defineConfig({
  base: "./",
  server: {
    host: "::",
    port: 3000,
  },
  // The app's data comes from ../data/code-app-data.xlsx, served at /api/workbook/* (set WORKBOOK_PATH to use another file).
  plugins: [react(), workbookPlugin(path.resolve(__dirname, "../data/code-app-data.xlsx"))],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
