# Requirements — Rich Text (display, sanitising, editing, dark mode)

| Spec | Prefix | Status | Constitution |
|---|---|---|---|
| rich-text | RTX | ⚠️ Implemented · 1 partial criterion | III, VI, XI |

## Introduction
Executive summaries, use case notes and event meeting notes are rich text (HTML from the legacy Power Apps editor or
from Quill) or plain text. This spec covers detecting, sanitising, displaying, editing and theming that content.

---

### RTX-R1 — Detect and convert

#### RTX-CONV-001: Detect HTML values
- **Status:** ✅ Implemented
- **Criterion:** IF a value contains a tag-like pattern (`<x…>` or `</x>`) THEN it SHALL be treated as HTML; ELSE as plain text with line breaks preserved.
- **Source:** `src/lib/html.ts`

#### RTX-CONV-002: Convert HTML to text
- **Status:** ✅ Implemented
- **Criterion:** `htmlToText` SHALL return single-line text with a space at block ends, entities decoded, whitespace collapsed.
- **Source:** `src/lib/html.ts`

### RTX-R2 — Sanitise (security)
**User story:** As a user, I must never run script that came from stored content.

#### RTX-SAN-001: Sanitise with DOMPurify
- **Status:** ✅ Implemented
- **Criterion:** THE system SHALL pass every HTML value through DOMPurify before injecting it, forbidding `<style>`.
- **Source:** `src/lib/html.ts`

#### RTX-SAN-002: Allowed style properties
- **Status:** ✅ Implemented
- **Criterion:** `style` attributes SHALL keep only: color, background-color, font-size, font-weight, font-style, font-family, line-height, text-decoration(-line), text-align, text-indent, margin-left, padding-left; values must match the safe pattern and contain no `url(`, `expression`, `javascript`, `@import`, `var(`.
- **Source:** `src/lib/html.ts`

#### RTX-SAN-003: Allowed classes
- **Status:** ✅ Implemented
- **Criterion:** `class` attributes SHALL keep only `ql-*` classes.
- **Source:** `src/lib/html.ts`

#### RTX-SAN-004: Safe external links
- **Status:** ✅ Implemented
- **Criterion:** Links SHALL get `target="_blank"` and `rel="noopener noreferrer"`.
- **Source:** `src/lib/html.ts`

#### RTX-SAN-005: Never modify stored HTML
- **Status:** ✅ Implemented
- **Criterion:** Display logic SHALL never modify stored HTML.
- **Source:** `src/lib/html.ts`

### RTX-R3 — Dark mode

#### RTX-DARK-001: Adjust colours in dark mode
- **Status:** ✅ Implemented
- **Criterion:** WHILE the dark theme is active THE system SHALL lighten dark text colours (L → clamp(100−L, 62, 90)), darken light backgrounds (L → clamp(100−L, 14, 34)) and drop near-white backgrounds, keeping hue; legacy `color`/`bgcolor` attributes adapted as hex.
- **Source:** `src/lib/html.ts`, `src/index.css`, `src/components/customers/RichTextEditor.tsx`

#### RTX-DARK-002: Resolve colour formats
- **Status:** ✅ Implemented
- **Criterion:** Colours SHALL be resolved from hex, rgb(a), black/white or any browser-known colour; unknown values left as-is.
- **Source:** `src/lib/html.ts`, `src/index.css`, `src/components/customers/RichTextEditor.tsx`

#### RTX-DARK-003: Rich text class
- **Status:** ✅ Implemented
- **Criterion:** Rendered rich text SHALL use `RICH_TEXT_CLASS` (prose-sm, inverted in dark, headings in title colour, links primary, bold inherits colour).
- **Source:** `src/lib/html.ts`, `src/index.css`, `src/components/customers/RichTextEditor.tsx`

#### RTX-DARK-004: Dark editor content
- **Status:** ✅ Implemented
- **Criterion:** WHILE dark, the editor content SHALL be shown with `invert(1) hue-rotate(180deg)`; toolbar icons and pickers SHALL use theme colours.
- **Source:** `src/lib/html.ts`, `src/index.css`, `src/components/customers/RichTextEditor.tsx`

#### RTX-DARK-005: Quill classes outside editor
- **Status:** ✅ Implemented
- **Criterion:** Quill classes (`ql-align-*`, `ql-size-*`, `ql-font-*`, `ql-indent-1..4`) SHALL render outside the editor.
- **Source:** `src/lib/html.ts`, `src/index.css`, `src/components/customers/RichTextEditor.tsx`

### RTX-R4 — Editor

#### RTX-EDIT-001: Lazy-load editor
- **Status:** ✅ Implemented
- **Criterion:** THE editor SHALL be lazy-loaded.
- **Source:** `src/components/customers/RichTextEditor.tsx`

#### RTX-EDIT-002: Toolbar options
- **Status:** ✅ Implemented
- **Criterion:** THE toolbar SHALL offer heading, bold/italic/underline/strike, colour/background, size (10–24px, px labels), lists/indent, alignment, link, clear.
- **Source:** `src/components/customers/RichTextEditor.tsx`

#### RTX-EDIT-003: Inline styles for legacy formatting
- **Status:** ✅ Implemented
- **Criterion:** Size, font and alignment SHALL be stored as inline styles without a whitelist so legacy formatting survives.
- **Source:** `src/components/customers/RichTextEditor.tsx`

#### RTX-EDIT-004: Sanitised initial content
- **Status:** ✅ Implemented
- **Criterion:** Initial content SHALL be sanitised HTML, or plain text converted to paragraphs.
- **Source:** `src/components/customers/RichTextEditor.tsx`

#### RTX-EDIT-005: Report HTML on change
- **Status:** ✅ Implemented
- **Criterion:** THE editor SHALL report semantic HTML on change, `""` when blank, and focus at the end on open.
- **Source:** `src/components/customers/RichTextEditor.tsx`

#### RTX-EDIT-006: Sticky toolbar and sizes
- **Status:** ✅ Implemented
- **Criterion:** THE toolbar SHALL be sticky; full editor min 14rem; compact editor 7–14rem scrolling.
- **Source:** `src/components/customers/RichTextEditor.tsx`

#### RTX-EDIT-007: Placeholder per field
- **Status:** ⚠️ Partial — Always "Write the executive summary..."
- **Criterion:** THE placeholder SHALL match the field (summary / notes / meeting notes).
- **Source:** `src/components/customers/RichTextEditor.tsx`

### RTX-R5 — Rich text form field

#### RTX-FIELD-001: Textarea-like field
- **Status:** ✅ Implemented
- **Criterion:** THE field SHALL look like a textarea (64–160px, scrolls) with the rendered value or placeholder and a hover pencil.
- **Source:** `src/components/customers/RichTextField.tsx`

#### RTX-FIELD-002: Open compact editor
- **Status:** ✅ Implemented
- **Criterion:** WHEN clicked (not on a link) or Enter/Space THE field SHALL open the compact editor with a Done button that returns to preview.
- **Source:** `src/components/customers/RichTextField.tsx`

## Scenarios
- `<img src=x onerror=alert(1)>` in a note → rendered without the handler; no alert.
- `<span style="position:fixed;color:red">` → only `color: red` kept.
- Black text in dark mode → shown light grey; red stays red.
