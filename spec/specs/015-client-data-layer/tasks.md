# Tasks — Client Data Layer

**Legend:** ✅ Done · 🔄 In progress · ⬜ Not started · ⛔ Blocked
**Summary:** 7 tasks — ✅ 5 · 🔄 0 · ⬜ 1 · ⛔ 1

- [x] **CDL-T01** HTTP client with service-down, non-JSON and HTTP error messages.
  - Status: ✅ Done · Covers: CDL-HTTP-001..005 · Files: `lib/workbookApi.ts`
- [x] **CDL-T02** Typed fetchers for customers, lookups and activity.
  - Status: ✅ Done · Covers: CDL-FETCH-001..004 · Files: `lib/customerSource.ts`, `lib/lookups.ts`, `lib/parentData.ts`, `lib/types.ts`
- [x] **CDL-T03** Query client defaults and lookup hooks with 10-min cache.
  - Status: ✅ Done · Covers: CDL-QUERY-001, CDL-QUERY-002, CDL-QUERY-006 · Files: `App.tsx`, `hooks/useLookups.ts`
- [x] **CDL-T04** Activity hooks with invalidation.
  - Status: ✅ Done · Covers: CDL-QUERY-004 · Files: `hooks/useParentActivity.ts`
- [x] **CDL-T05** Sequential bulk save with progress and failure list.
  - Status: ✅ Done · Covers: CDL-QUERY-005
- [ ] **CDL-T06** Remove `detectKey` and always use `id`.
  - Status: ⛔ Blocked by DATA-T04 (data audit) · Covers: CDL-QUERY-003
- [ ] **CDL-T07** Unit tests for `api()` error paths and `detectKey`.
  - Status: ⬜ Not started · Covers: CDL-HTTP-002..004 · Depends on: QA-T01
