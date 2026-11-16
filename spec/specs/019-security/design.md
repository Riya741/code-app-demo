# Design — Security

## Controls in place
| Control | Where |
|---|---|
| HTML sanitising | `src/lib/html.ts` (`sanitizeHtml`, DOMPurify hooks) |
| CSV guard | `src/lib/csv.ts` (`escape`) |
| Word export sanitising | `src/lib/wordDoc.ts` |
| Message-only errors | `server/workbook.ts` (`handle` catch) |
| Atomic writes | `Store.save()` |

## Planned — SEC-EXPO-001 localhost binding
```ts
// vite.config.ts
server: { host: process.env.HOST ?? "localhost", port: 3000 },
preview: { host: process.env.HOST ?? "localhost" },
```
Document `HOST=0.0.0.0 npm run dev` as the opt-in in steering/tech.md.

## Planned — SEC-SUPPLY-004 dependency cleanup
Remove: `@hookform/resolvers`, `react-hook-form`, `zod`, `date-fns`, `react-day-picker`, `react-router-dom`,
`recharts`, `embla-carousel-react`, `input-otp`, `vaul`, and Radix `accordion`, `aspect-ratio`, `avatar`,
`collapsible`, `context-menu`, `hover-card`, `label`, `menubar`, `navigation-menu`, `progress`, `radio-group`,
`scroll-area`, `select`, `separator`, `slider`, `switch`, `tabs`, `toast`, `toggle`, `toggle-group`.
Verify with `npm run build` and a smoke test afterwards.

## Planned — SEC-SUPPLY-001 repository hygiene
`git init`; `.gitignore`: `node_modules/`, `dist/`, `*.xlsx`, `~tmp-*`, `.env*`.

## Constitution check
| Article | Compliance |
|---|---|
| III | Content safety ✅; network exposure violates III.3 ⚠️ |
| VIII | Unused dependencies ⚠️ |

**Exceptions:** III.3 until SEC-T01 is done — users are told to run on trusted networks only.
