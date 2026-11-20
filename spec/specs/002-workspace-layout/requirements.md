# Requirements — Workspace Layout, Top Bar and Theme

| Spec | Prefix | Status | Constitution |
|---|---|---|---|
| workspace-layout | LAY | ⚠️ Implemented with 2 partial criteria · summary band planned (CR-20261120-1) | II, V, VI, VII, VIII |

## Introduction
The app is a single screen with two states: a landing page with a hero search, and a customer workspace showing the
Executive Summary, Use Cases and Events panels. The top bar carries the selected customer, the compact search,
refresh and theme toggle. CR-20261120-1 (owner decision D2) replaces the right-hand Executive Summary panel with a
full-width, collapsible summary band above the Use Cases and Events grids (LAY-R6); until LAY-T09 ships, the
deprecated LAY-PANEL-002 split is what the app shows.

---

### LAY-R1 — Landing and workspace states
**User story:** As a CSS, I want to go from search to the customer's workspace without page navigation.

#### LAY-STATE-001: Landing page with hero search
- **Status:** ✅ Implemented
- **Criterion:** WHILE no customer is selected THE system SHALL show the top bar and a centred hero search (max 672px wide, 14vh from the top).
- **Source:** `src/pages/Customers.tsx`

#### LAY-STATE-002: Workspace keyed by customer
- **Status:** ✅ Implemented
- **Criterion:** WHEN a customer is selected THE system SHALL show the workspace for it, keyed by customer so that filters, sorting, selections and dialogs reset on every customer change.
- **Source:** `src/pages/Customers.tsx`

#### LAY-STATE-003: Pass customer keys to panels
- **Status:** ✅ Implemented
- **Criterion:** THE system SHALL pass the panels `parentId = customer.id` and `customerKeys = [customer.id, customer.parent_id]` (non-null, numeric).
- **Source:** `src/pages/Customers.tsx`

#### LAY-STATE-004: Workspace width and padding
- **Status:** ✅ Implemented
- **Criterion:** THE workspace SHALL be at most 1920px wide with 16px (24px from 640px) side padding.
- **Source:** `src/pages/Customers.tsx`

#### LAY-STATE-005: Decorative backdrop
- **Status:** ✅ Implemented
- **Criterion:** THE page SHALL show a decorative, `aria-hidden`, non-interactive backdrop (two blurred glows, masked 44px grid).
- **Source:** `src/pages/Customers.tsx`

### LAY-R2 — Responsive panels
**User story:** As a CSS on a wide screen, I want the summary and both grids visible at once, with the grids resizable; on a small screen I want them stacked.

#### LAY-PANEL-001: One-viewport desktop layout
- **Status:** ✅ Implemented
- **Criterion:** WHILE the viewport is ≥ 1024px and a customer is selected THE page SHALL be exactly one viewport tall and panels SHALL scroll internally.
- **Source:** `src/pages/Customers.tsx`, `src/hooks/useMediaQuery.ts`, `src/components/ui/resizable.tsx`

#### LAY-PANEL-002: Desktop split proportions
- **Status:** Deprecated — retired by CR-20261120-1 (owner decision D2, 2026-11-20): the right-hand Executive Summary panel is removed; replaced by LAY-PANEL-006 and the summary band (LAY-BAND-001..007). Still the shipped layout until LAY-T09.
- **Criterion:** THE desktop layout SHALL split horizontally: left 60% (min 25%) holding Use Cases 60% (min 20%) over Events 40% (min 20%); right 40% (min 20%) Executive Summary.
- **Source:** `src/pages/Customers.tsx`, `src/hooks/useMediaQuery.ts`, `src/components/ui/resizable.tsx`

#### LAY-PANEL-003: Draggable dividers
- **Status:** ✅ Implemented
- **Criterion:** THE dividers SHALL be draggable with a visible grip and a 12px hit area highlighting on hover/drag.
- **Source:** `src/pages/Customers.tsx`, `src/hooks/useMediaQuery.ts`, `src/components/ui/resizable.tsx`

#### LAY-PANEL-004: Persist all split sizes
- **Status:** ⚠️ Partial — Only the horizontal split is saved
- **Criterion:** WHEN the user resizes any split THE sizes SHALL be restored after reload.
- **Source:** `src/pages/Customers.tsx`, `src/hooks/useMediaQuery.ts`, `src/components/ui/resizable.tsx`

#### LAY-PANEL-005: Stacked panels below 1024px
- **Status:** ✅ Implemented
- **Criterion:** WHILE the viewport is < 1024px THE panels SHALL stack (Summary, Use Cases, Events), each at most 60vh, and the page SHALL scroll.
- **Source:** `src/pages/Customers.tsx`, `src/hooks/useMediaQuery.ts`, `src/components/ui/resizable.tsx`

#### LAY-PANEL-006: Desktop band over full-width grids
- **Status:** 📝 Planned
- **Criterion:** WHILE the viewport is ≥ 1024px and a customer is selected THE layout SHALL show the summary band across the full workspace width and, below it, a full-width vertical split of Use Cases 60% (min 20%) over Events 40% (min 20%), with no right-hand panel.
- **Source:** `src/pages/Customers.tsx`, `src/components/ui/resizable.tsx`

### LAY-R6 — Executive Summary band
**User story:** As a CSS, I want the account narrative above my use cases and events, and out of the way when I am
working in the grids, so that the grids get the full screen width.

#### LAY-BAND-001: Full-width summary band
- **Status:** 📝 Planned
- **Criterion:** WHEN a customer is selected THE workspace SHALL show the Executive Summary in one full-width band, built on the shared panel shell (LAY-SHELL-001), above the Use Cases and Events grids at every viewport width.
- **Source:** `src/pages/Customers.tsx`, `src/components/customers/Panel.tsx`, `src/components/customers/CustomerDetails.tsx`

#### LAY-BAND-002: Collapse and expand the band
- **Status:** 📝 Planned
- **Criterion:** WHEN the user activates the band's collapse control THE band SHALL collapse to its header row (title, Last modified and actions stay visible) and the grids SHALL take the freed height; WHEN the user activates it again THE band SHALL expand; THE band SHALL start expanded unless a stored state says otherwise (LAY-BAND-003).
- **Source:** `src/components/customers/Panel.tsx`, `src/pages/Customers.tsx`

#### LAY-BAND-003: Remember the collapsed state
- **Status:** 📝 Planned — proposed default, owner to confirm (CR-20261120-1 open question a)
- **Criterion:** WHEN the user collapses or expands the band THE system SHALL store the state in browser storage as a UI preference and SHALL restore it after a reload and for every customer opened afterwards.
- **Source:** `src/pages/Customers.tsx`

#### LAY-BAND-004: Band height on desktop
- **Status:** 📝 Planned — 40% is a proposed value (CR-20261120-1 open question b)
- **Criterion:** WHILE the viewport is ≥ 1024px THE expanded band SHALL be as tall as its content up to 40% of the workspace height, its body SHALL scroll internally beyond that, and the Use Cases / Events split SHALL fill the rest of the single viewport (LAY-PANEL-001).
- **Source:** `src/pages/Customers.tsx`, `src/components/customers/Panel.tsx`

#### LAY-BAND-005: Band on narrow screens
- **Status:** 📝 Planned
- **Criterion:** WHILE the viewport is < 1024px THE band SHALL be first in the stack (LAY-PANEL-005), at most 60vh tall with internal scrolling when expanded, and only its header row when collapsed.
- **Source:** `src/pages/Customers.tsx`, `src/components/customers/Panel.tsx`

#### LAY-BAND-006: Accessible collapse control
- **Status:** 📝 Planned
- **Criterion:** THE collapse control SHALL be a button named "Collapse executive summary" or "Expand executive summary" with `aria-expanded` and `aria-controls` pointing at the band body, operable with Enter and Space and with visible focus (A11Y-KEY-005); WHEN the band collapses while focus is inside its body THE focus SHALL move to the control.
- **Source:** `src/components/customers/Panel.tsx`

#### LAY-BAND-007: No collapse while editing
- **Status:** 📝 Planned
- **Criterion:** WHILE the summary editor is open or a summary save is in progress THE collapse control SHALL be disabled, so that an unsaved edit is never hidden.
- **Source:** `src/components/customers/Panel.tsx`, `src/components/customers/CustomerDetails.tsx`

### LAY-R3 — Top bar

#### LAY-TOP-001: Sticky translucent top bar
- **Status:** ✅ Implemented
- **Criterion:** THE top bar SHALL be sticky, 48px tall, translucent with backdrop blur.
- **Source:** `src/components/customers/TopBar.tsx`

#### LAY-TOP-002: Customer chip
- **Status:** ✅ Implemented
- **Criterion:** WHILE a customer is selected THE top bar SHALL show a chip with icon, name (truncated), "Parent ID: <id>" when present, and a × button labelled "Clear selected customer" that returns to the landing page.
- **Source:** `src/components/customers/TopBar.tsx`

#### LAY-TOP-003: Bar search in top bar
- **Status:** ✅ Implemented
- **Criterion:** WHILE a customer is selected THE top bar SHALL show the bar search, max 448px, centred.
- **Source:** `src/components/customers/TopBar.tsx`

#### LAY-TOP-004: Refresh reloads all data
- **Status:** ⚠️ Partial — Only the customer list reloads
- **Criterion:** WHEN Refresh ("Refresh data") is clicked THE system SHALL reload the customer list, the open customer's use cases and events, and lookups; the icon SHALL spin while reloading.
- **Source:** `src/components/customers/TopBar.tsx`

### LAY-R4 — Theme

#### LAY-THEME-001: Light default theme, persisted
- **Status:** ✅ Implemented
- **Criterion:** THE default theme SHALL be light; OS theme SHALL be ignored; the choice SHALL persist across reloads.
- **Source:** `src/App.tsx`, `src/components/customers/TopBar.tsx`

#### LAY-THEME-002: Theme toggle
- **Status:** ✅ Implemented
- **Criterion:** WHEN the theme toggle ("Toggle theme") is clicked THE theme SHALL switch light ↔ dark; the icon is a moon in light and a sun in dark.
- **Source:** `src/App.tsx`, `src/components/customers/TopBar.tsx`

### LAY-R5 — Panel shell

#### LAY-SHELL-001: Shared panel shell
- **Status:** ✅ Implemented
- **Criterion:** THE panels SHALL share one shell: rounded card, header bar with uppercase title, optional count and tally badges, right-aligned actions, body scrolling only when needed, fade/slide-in on mount.
- **Source:** `src/components/customers/Panel.tsx`

## Scenarios
- 1440px wide, customer open → summary band on top across the full width, Use Cases over Events below it, no page scroll; the divider resizes Use Cases vs Events (LAY-PANEL-006).
- Collapse the band → only its header row remains, the grids grow; reload and open another customer → still collapsed (LAY-BAND-002, LAY-BAND-003).
- Long summary at 1440px → band stops at 40% of the workspace height and scrolls inside (LAY-BAND-004).
- Editing the summary → the collapse control is disabled until Save or Cancel (LAY-BAND-007).
- Resize the Use Cases / Events split, reload, open a customer → split restored (LAY-PANEL-004, LAY-T08).
- 800px wide → stacked summary band, Use Cases, Events; page scrolls.
- Filter on customer A, pick customer B → B shows unfiltered.
- Click × → landing page.
