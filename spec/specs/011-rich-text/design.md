# Design — Rich Text

## Components and files
| File | Role |
|---|---|
| `src/lib/html.ts` | `looksLikeHtml`, `htmlToText`, `sanitizeHtml(html, dark)`, colour helpers, DOMPurify hooks, `RICH_TEXT_CLASS` |
| `src/components/customers/RichTextEditor.tsx` | Quill wrapper `{ html, onChange, compact? }` |
| `src/components/customers/RichTextField.tsx` | Click-to-edit form field `{ value, onChange, placeholder? }` |
| `src/index.css` | Quill class rendering, `.terra-editor` styles, dark-mode editor rules |

## Sanitiser pipeline
```
sanitizeHtml(html, dark):
  darkDisplay = dark                      (module flag, synchronous use only)
  DOMPurify.sanitize(html, { FORBID_TAGS: ["style"] })
     hook uponSanitizeAttribute:
       style  → cleanStyle (allow-list, safe value, dark adapt colours)
       color/bgcolor (dark) → adaptForDark(asHex)
       class  → keep /^ql-[\w-]+$/
     hook afterSanitizeAttributes: <a> → target=_blank, rel=noopener noreferrer
  darkDisplay = false (finally)
```
Hooks are registered once at module load and apply to every DOMPurify call in the app.

## Colour adaptation
`resolveColor` → `[r,g,b]` (direct parse or canvas probe) → HSL → perceived brightness
`0.299r+0.587g+0.114b`. Text: keep if bright ≥ 0.5 else lighten. Background: keep if bright < 0.5; drop if sat < 12
and L > 88; else darken.

## Editor
Quill `snow` theme; style attributors for size/font/align registered with `whitelist = null`. Mounted into a fresh
child div; the host is cleared on unmount (StrictMode double mount). `text-change` → `getSemanticHTML()` or `""`.

## Planned change — RTX-EDIT-007
Add `placeholder` prop to `RichTextEditor`; `CustomerDetails` passes "Write the executive summary...",
`RichTextField` forwards its own placeholder.

## Constitution check
| Article | Compliance |
|---|---|
| III | Allow-list sanitising; link hardening. ✅ |
| VI | Dark-mode colour adaptation without changing stored data. ✅ |
| XI | Editor lazy-loaded. ✅ |
