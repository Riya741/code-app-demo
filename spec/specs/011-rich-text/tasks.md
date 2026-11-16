# Tasks — Rich Text

**Legend:** ✅ Done · 🔄 In progress · ⬜ Not started · ⛔ Blocked
**Summary:** 7 tasks — ✅ 5 · 🔄 0 · ⬜ 2 · ⛔ 0

- [x] **RTX-T01** HTML detection and `htmlToText`.
  - Status: ✅ Done · Covers: RTX-CONV-001, RTX-CONV-002 · Files: `lib/html.ts`
- [x] **RTX-T02** DOMPurify sanitiser with style/class allow-lists and link hardening.
  - Status: ✅ Done · Covers: RTX-SAN-001..005 · Files: `lib/html.ts`
- [x] **RTX-T03** Dark-mode colour adaptation and prose classes.
  - Status: ✅ Done · Covers: RTX-DARK-001..005 · Files: `lib/html.ts`, `index.css`
- [x] **RTX-T04** Lazy Quill editor with toolbar, inline-style attributors, initial content conversion.
  - Status: ✅ Done · Covers: RTX-EDIT-001..006 · Files: `RichTextEditor.tsx`, `index.css`
- [x] **RTX-T05** `RichTextField` click-to-edit field.
  - Status: ✅ Done · Covers: RTX-FIELD-001, RTX-FIELD-002 · Files: `RichTextField.tsx`
- [ ] **RTX-T06** Field-specific editor placeholder.
  - Status: ⬜ Not started · Covers: RTX-EDIT-007 · Files: `RichTextEditor.tsx`, `RichTextField.tsx`, `CustomerDetails.tsx`
- [ ] **RTX-T07** Unit tests: XSS vectors, style allow-list, dark adaptation, `htmlToText`.
  - Status: ⬜ Not started · Covers: RTX-CONV-002, RTX-SAN-001..004, RTX-DARK-001 · Depends on: QA-T01
