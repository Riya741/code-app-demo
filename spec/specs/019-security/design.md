# Design — Security

## Controls in place
| Control | Where |
|---|---|
| HTML sanitising | `src/lib/html.ts` (`sanitizeHtml`, DOMPurify hooks) |
| CSV guard | `src/lib/csv.ts` (`escape`) |
| Word export sanitising | `src/lib/wordDoc.ts` |
| Message-only errors | `server/workbook.ts` (`handle` catch) |
| Atomic writes | `Store.save()` |

## Implemented — SEC-EXPO-001 localhost binding (SEC-T01)
```ts
// vite.config.ts
server: { host: process.env.HOST ?? "localhost", port: 3000 },
preview: { host: process.env.HOST ?? "localhost" },
```
The opt-in (`HOST=0.0.0.0 npm run dev`) is documented in steering/tech.md.

## Planned — SEC-SUPPLY-004 dependency cleanup
Remove: `@hookform/resolvers`, `react-hook-form`, `zod`, `date-fns`, `react-day-picker`, `react-router-dom`,
`recharts`, `embla-carousel-react`, `input-otp`, `vaul`, and Radix `accordion`, `aspect-ratio`, `avatar`,
`collapsible`, `context-menu`, `hover-card`, `label`, `menubar`, `navigation-menu`, `progress`, `radio-group`,
`scroll-area`, `select`, `separator`, `slider`, `switch`, `tabs`, `toast`, `toggle`, `toggle-group`.
Verify with `npm run build` and a smoke test afterwards.

## Implemented — SEC-SUPPLY-001 repository hygiene (SEC-T02)
`git init`; `.gitignore`: `node_modules/`, `dist/`, `*.xlsx`, `~tmp-*`, `.env*`.

## Constitution check
| Article | Compliance |
|---|---|
| III | Content safety ✅; dev/preview bound to localhost (III.3) ✅ |
| VIII | Unused dependencies ⚠️ |
| XII | The model keys (`ANTHROPIC_API_KEY`; `PORTKEY_API_KEY` for the opt-in gateway route, CR-20261123-1) are read from the environment only and covered by SEC-SUPPLY-002 (`.env*` ignored); SEC-SUPPLY-005 (planned, AOPS-T12) adds: never from a file, never logged, traced, checkpointed or sent to the browser, each key only to its own route's host. Data sent to a model follows the [AI data policy](../../steering/ai-data-policy.md) on both routes. ✅ |

**Exceptions:** none. (III.3 was an exception until SEC-T01 closed it on 2026-11-16.)
