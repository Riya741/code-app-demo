# Requirements — Workspace Layout, Top Bar and Theme

| Spec | Prefix | Status | Constitution |
|---|---|---|---|
| workspace-layout | LAY | ⚠️ Implemented with 2 partial criteria | II, V, VI, VIII |

## Introduction
The app is a single screen with two states: a landing page with a hero search, and a customer workspace showing the
Executive Summary, Use Cases and Events panels. The top bar carries the selected customer, the compact search,
refresh and theme toggle.

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
**User story:** As a CSS on a wide screen, I want all three panels visible at once and resizable; on a small screen I want them stacked.

#### LAY-PANEL-001: One-viewport desktop layout
- **Status:** ✅ Implemented
- **Criterion:** WHILE the viewport is ≥ 1024px and a customer is selected THE page SHALL be exactly one viewport tall and panels SHALL scroll internally.
- **Source:** `src/pages/Customers.tsx`, `src/hooks/useMediaQuery.ts`, `src/components/ui/resizable.tsx`

#### LAY-PANEL-002: Desktop split proportions
- **Status:** ✅ Implemented
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
- 1440px wide, customer open → three panels visible, no page scroll; vertical divider resizes Use Cases vs Events.
- Resize horizontal split, reload, open a customer → split restored.
- 800px wide → stacked Summary, Use Cases, Events; page scrolls.
- Filter on customer A, pick customer B → B shows unfiltered.
- Click × → landing page.
