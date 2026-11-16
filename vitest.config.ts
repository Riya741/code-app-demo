import { defineConfig } from "vitest/config";
import path from "path";

// Unit tests (QA-TEST-001). Kept separate from vite.config.ts so tests never load the workbook plugin.
// Every test title starts with the requirement ID it verifies (QA-TRACE-001, enforced by spec lint check 9).
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx", "src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
