# Requirements — Accessibility

| Spec | Prefix | Status | Constitution |
|---|---|---|---|
| accessibility | A11Y | ⚠️ Partial | VII |

## Introduction
Cross-cutting accessibility requirements. Target: WCAG 2.1 AA.

---

### A11Y-R1 — Names and roles

#### A11Y-NAME-001: Icon buttons labelled
- **Status:** ✅ Implemented
- **Criterion:** EVERY icon-only button SHALL have an `aria-label`.
- **Source:** `src/components/customers/SearchBox.tsx`, `src/components/customers/DataGrid.tsx`

#### A11Y-NAME-002: Search combobox pattern
- **Status:** ✅ Implemented
- **Criterion:** THE customer search SHALL implement the combobox/listbox pattern.
- **Source:** `src/components/customers/SearchBox.tsx`, `src/components/customers/DataGrid.tsx`

#### A11Y-NAME-003: Search active option
- **Status:** ❌ Gap
- **Criterion:** THE search SHALL expose the active option with `aria-activedescendant`.
- **Source:** `src/components/customers/SearchBox.tsx`, `src/components/customers/DataGrid.tsx`

#### A11Y-NAME-004: Grid sort and checkbox labels
- **Status:** ✅ Implemented
- **Criterion:** Sorted grid headers SHALL expose `aria-sort`; row checkboxes SHALL be labelled.
- **Source:** `src/components/customers/SearchBox.tsx`, `src/components/customers/DataGrid.tsx`

#### A11Y-NAME-005: Decorative elements hidden
- **Status:** ✅ Implemented
- **Criterion:** Decorative elements SHALL be `aria-hidden`.
- **Source:** `src/components/customers/SearchBox.tsx`, `src/components/customers/DataGrid.tsx`

### A11Y-R2 — Keyboard

#### A11Y-KEY-001: Keyboard row expansion
- **Status:** ❌ Gap
- **Criterion:** Expandable grid rows SHALL be operable by keyboard and expose `aria-expanded`.
- **Source:** `src/components/customers/DataGrid.tsx`, `src/components/customers/CustomerDetails.tsx`, `src/components/customers/RichTextField.tsx`, `src/components/ui/resizable.tsx`

#### A11Y-KEY-002: Keyboard click-to-edit
- **Status:** ✅ Implemented
- **Criterion:** Click-to-edit areas SHALL be focusable and open with Enter/Space.
- **Source:** `src/components/customers/DataGrid.tsx`, `src/components/customers/CustomerDetails.tsx`, `src/components/customers/RichTextField.tsx`, `src/components/ui/resizable.tsx`

#### A11Y-KEY-003: Dialog focus trap
- **Status:** ✅ Implemented
- **Criterion:** Dialogs SHALL trap focus and close with Esc (except while saving).
- **Source:** `src/components/customers/DataGrid.tsx`, `src/components/customers/CustomerDetails.tsx`, `src/components/customers/RichTextField.tsx`, `src/components/ui/resizable.tsx`

#### A11Y-KEY-004: Keyboard dividers
- **Status:** ✅ Implemented
- **Criterion:** Resizable dividers SHALL be keyboard-operable.
- **Source:** `src/components/customers/DataGrid.tsx`, `src/components/customers/CustomerDetails.tsx`, `src/components/customers/RichTextField.tsx`, `src/components/ui/resizable.tsx`

#### A11Y-KEY-005: Visible focus
- **Status:** ✅ Implemented
- **Criterion:** Focus SHALL always be visible.
- **Source:** `src/components/customers/DataGrid.tsx`, `src/components/customers/CustomerDetails.tsx`, `src/components/customers/RichTextField.tsx`, `src/components/ui/resizable.tsx`

### A11Y-R3 — Forms

#### A11Y-FORM-001: Labels associated with controls
- **Status:** ⚠️ Partial — `Field` label has no `htmlFor`; comboboxes have no accessible name
- **Criterion:** EVERY form control SHALL be programmatically associated with its label.
- **Source:** `src/components/customers/FormBits.tsx`, `src/components/customers/Combobox.tsx`

#### A11Y-FORM-002: Announce validation errors
- **Status:** ❌ Gap
- **Criterion:** Validation errors SHALL be announced (`aria-invalid`, `aria-describedby`).
- **Source:** `src/components/customers/FormBits.tsx`, `src/components/customers/Combobox.tsx`

### A11Y-R4 — Perception

#### A11Y-SEE-001: AA contrast
- **Status:** ⚠️ Partial — Not verified (small 10.5–11px text)
- **Criterion:** Text and UI contrast SHALL meet AA in both themes.
- **Source:** `src/index.css`, `src/components/ui/sonner.tsx`

#### A11Y-SEE-002: Not colour alone
- **Status:** ✅ Implemented
- **Criterion:** Status SHALL not be conveyed by colour alone.
- **Source:** `src/index.css`, `src/components/ui/sonner.tsx`

#### A11Y-SEE-003: Announce toasts
- **Status:** ✅ Implemented
- **Criterion:** Toasts SHALL be announced via a live region.
- **Source:** `src/index.css`, `src/components/ui/sonner.tsx`
