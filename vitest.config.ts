import { defineConfig } from "vitest/config";
import path from "path";

// Unit tests (QA-TEST-001) and component tests with Testing Library (QA-TEST-002). Kept separate from vite.config.ts
// so tests never load the workbook plugin.
// Every test title starts with the requirement ID it verifies (QA-TRACE-001, enforced by spec lint check 9).

// Windows drive-letter case (QA-T02). When Vitest is started from a lower-case cwd such as `c:\…` (VS Code terminals
// open this workspace that way), Node loads Vitest's own worker modules under `file:///c:/…`, but Vite resolves the
// test files' `vitest` imports to `file:///C:/…`. Node caches modules by URL, so the worker ends up with two Vitest
// instances and every suite fails with "Vitest failed to find the current suite" or "reading 'config'". This module
// resolve hook, loaded into each test worker, upper-cases the drive letter of every file URL so there is one instance.
const driveLetterHook =
  "export async function resolve(specifier, context, next) {" +
  "  const result = await next(specifier, context);" +
  "  const m = /^file:\\/\\/\\/([a-z]):/.exec(result.url);" +
  "  return m ? { ...result, url: 'file:///' + m[1].toUpperCase() + result.url.slice(9) } : result;" +
  "}";
const registerDriveLetterHook = `import { register } from "node:module"; register(${JSON.stringify(
  "data:text/javascript," + encodeURIComponent(driveLetterHook),
)});`;

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx", "src/**/*.test.ts", "src/**/*.test.tsx"],
    execArgv:
      process.platform === "win32" ? ["--import", "data:text/javascript," + encodeURIComponent(registerDriveLetterHook)] : [],
  },
});
