# Requirements — Security

| Spec | Prefix | Status | Constitution |
|---|---|---|---|
| security | SEC | ⚠️ Content safety done · network exposure open | III, VIII |

## Introduction
The app handles internal customer data (names, contacts, meeting notes) on a single user's machine, with no
authentication. This spec covers content safety, exposure and data handling.

## Threat summary
| Threat | Control | Status |
|---|---|---|
| Stored XSS via rich text | DOMPurify allow-lists (rich-text spec) | ✅ |
| CSV formula injection | `'` prefix (export spec) | ✅ |
| Reverse tabnabbing | `rel="noopener noreferrer"` | ✅ |
| Corrupt writes | Atomic save, serial queue | ✅ |
| Network access to an unauthenticated read/write API | none (`host: "::"`) | ❌ |
| Full-table reads via `/table/:name` | none | ⚠️ accepted while local |
| Unused dependencies (supply chain) | none | ⚠️ |
| Font CDN request | none | ⚠️ accepted |

---

### SEC-R1 — Content safety

#### SEC-SAFE-001: Sanitise HTML
- **Status:** ✅ Implemented
- **Criterion:** ALL HTML from data SHALL be sanitised before rendering or Word export.
- **Source:** `src/lib/html.ts`, `src/lib/csv.ts`, `server/workbook.ts`

#### SEC-SAFE-002: CSV formula guard
- **Status:** ✅ Implemented
- **Criterion:** ALL CSV exports SHALL apply the formula-injection guard.
- **Source:** `src/lib/html.ts`, `src/lib/csv.ts`, `server/workbook.ts`

#### SEC-SAFE-003: No stack traces to browser
- **Status:** ✅ Implemented
- **Criterion:** Errors to the browser SHALL contain messages only, never stack traces.
- **Source:** `src/lib/html.ts`, `src/lib/csv.ts`, `server/workbook.ts`

### SEC-R2 — Exposure

#### SEC-EXPO-001: Bind to localhost
- **Status:** ✅ Implemented
- **Criterion:** THE dev and preview servers SHALL bind to `localhost` by default; binding to other interfaces SHALL require an explicit opt-in (env `HOST`).
- **Source:** `vite.config.ts`

#### SEC-EXPO-002: Auth before multi-user hosting
- **Status:** 📝 Planned — Future
- **Criterion:** IF the app is ever hosted for more than one user THEN authentication, authorisation, an audit trail and an allow-list for `/table/:name` SHALL be specified first.
- **Source:** `vite.config.ts`

### SEC-R3 — Data handling and supply chain

#### SEC-SUPPLY-001: Workbook never committed
- **Status:** ✅ Implemented
- **Criterion:** THE workbook SHALL live outside the repository and SHALL NOT be committed (`.gitignore` *.xlsx).
- **Source:** `.gitignore`

#### SEC-SUPPLY-002: No secrets
- **Status:** ✅ Implemented
- **Criterion:** No secrets SHALL be committed. The only secret, the optional Anthropic API key, lives in the environment (Article XII, ai-data-policy §1); `.env` and `.env.*` are git-ignored.
- **Source:** `package.json`

#### SEC-SUPPLY-003: No high npm audit issues
- **Status:** ⚠️ Partial — Not verified
- **Criterion:** `npm audit` SHALL show no high/critical issues before a release.
- **Source:** `package.json`

#### SEC-SUPPLY-004: Remove unused dependencies
- **Status:** ❌ Gap — 30 unused
- **Criterion:** Unused dependencies SHALL be removed.
- **Source:** `package.json`
