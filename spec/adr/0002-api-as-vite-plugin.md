# ADR-0002: Serve the API as a Vite plugin

- **Status:** Accepted (recorded retroactively, 2026-11-11)

## Context
The app needs a small backend to read/write the workbook. Users already run `npm run dev`. A separate server process
would mean a second command, a second port and CORS/proxy configuration.

## Decision
Implement the API in `server/workbook.ts` as a Vite plugin (`local-workbook`) that mounts middleware at
`/api/workbook` on both the dev server (`configureServer`) and the preview server (`configurePreviewServer`).
`configureServer` must return nothing so the middleware runs before Vite's own handlers.

## Consequences
- One command starts everything; same origin, no CORS.
- The API does **not** exist in a static deployment of `dist/`. The client detects this (non-JSON response) and shows
  a clear message (CDL-HTTP-003, ARC-005).
- Server code runs inside the Vite process; `jszip` and `exceljs` must be installed (jszip is a devDependency).
- To host the app for real, extract the handler into a standalone Node/Express server; the handler is already
  framework-agnostic (`(req, res)`).
