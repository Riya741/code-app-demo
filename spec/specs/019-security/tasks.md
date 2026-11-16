# Tasks — Security

**Legend:** ✅ Done · 🔄 In progress · ⬜ Not started · ⛔ Blocked
**Summary:** 6 tasks — ✅ 2 · 🔄 0 · ⬜ 4 · ⛔ 0

- [x] **SEC-T00** Content safety controls (sanitising, CSV guard, message-only errors).
  - Status: ✅ Done · Covers: SEC-SAFE-001..003, SEC-SUPPLY-002
- [ ] **SEC-T01** Bind dev/preview to localhost by default with `HOST` opt-in.
  - Status: ⬜ Not started · Covers: SEC-EXPO-001, API-GEN-005 · Files: `vite.config.ts`, `steering/tech.md`
- [x] **SEC-T02** Initialise git with `.gitignore` excluding workbooks and build output.
  - Status: ✅ Done · Covers: SEC-SUPPLY-001 · Files: `.gitignore`, `.gitattributes`
  - Verified 2026-11-16: `git diff --cached --name-only` lists no `.xlsx`, `.csv`, `.env*` or `node_modules` files; LF line endings enforced by `.gitattributes`.
- [ ] **SEC-T03** Remove the 30 unused dependencies; rebuild and smoke test.
  - Status: ⬜ Not started · Covers: SEC-SUPPLY-004
- [ ] **SEC-T04** Run `npm audit`; fix or record accepted issues.
  - Status: ⬜ Not started · Covers: SEC-SUPPLY-003 · Depends on: SEC-T03
- [ ] **SEC-T05** XSS regression tests (shared with RTX-T07).
  - Status: ⬜ Not started · Covers: SEC-SAFE-001 · Depends on: QA-T01
