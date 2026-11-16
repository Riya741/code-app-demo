# Requirements — Customer Search

| Spec | Prefix | Status | Constitution |
|---|---|---|---|
| customer-search | SRCH | ✅ Implemented · 1 open criterion | IV, V, VII, XI |

## Introduction
Users find a parent customer by typing part of its name or its parent ID, then open its workspace. The search is
instant and keyboard-friendly. It appears as a large "hero" box on the landing page and as a compact bar in the top bar
once a customer is open.

Status values: ✅ Implemented · ⚠️ Partial · ❌ Gap (expected behaviour missing or broken) · 📝 Planned (not built yet) · Deprecated.

---

### SRCH-R1 — Load searchable customers
**User story:** As a CSS, I want the customer list ready as soon as the app opens, so that searching is instant.

#### SRCH-LOAD-001: Load visible customers once at startup
- **Status:** ✅ Implemented
- **Criterion:** WHEN the app starts THE system SHALL load all customers once in the background and keep only rows whose `visible` is `true`, `1` or `"true"`.
- **Source:** `src/lib/customerSource.ts`, `src/hooks/useCustomers.ts`, `src/components/customers/SearchBox.tsx`

#### SRCH-LOAD-002: Never render the full customer list
- **Status:** ✅ Implemented
- **Criterion:** THE system SHALL never render the full customer list; customers appear only as search results.
- **Source:** `src/lib/customerSource.ts`, `src/hooks/useCustomers.ts`, `src/components/customers/SearchBox.tsx`

#### SRCH-LOAD-003: Disabled input while loading
- **Status:** ✅ Implemented
- **Criterion:** WHILE customers are loading THE search input SHALL be disabled, show a spinner and the placeholder "Loading parents...".
- **Source:** `src/lib/customerSource.ts`, `src/hooks/useCustomers.ts`, `src/components/customers/SearchBox.tsx`

#### SRCH-LOAD-004: Load error with Try again
- **Status:** ✅ Implemented
- **Criterion:** IF loading fails THEN THE input SHALL be disabled and the error message SHALL show below it with a "Try again" link that reloads the list.
- **Source:** `src/lib/customerSource.ts`, `src/hooks/useCustomers.ts`, `src/components/customers/SearchBox.tsx`

### SRCH-R2 — Match and rank
**User story:** As a CSS, I want the best matches first when I type a partial name or ID, so that I pick the right customer quickly.

#### SRCH-RANK-001: Normalise and tokenise the query
- **Status:** ✅ Implemented
- **Criterion:** WHEN the user types THE system SHALL trim and lower-case the query and split it into unique whitespace-separated tokens.
- **Source:** `src/components/customers/SearchBox.tsx`

#### SRCH-RANK-002: Match on all tokens or parent ID
- **Status:** ✅ Implemented
- **Criterion:** THE system SHALL treat a customer as a match WHEN every token is a substring of `parent_name`, OR WHEN `parent_id` contains the whole query.
- **Source:** `src/components/customers/SearchBox.tsx`

#### SRCH-RANK-003: Rank matches
- **Status:** ✅ Implemented
- **Criterion:** THE system SHALL rank matches: 0 = name or ID equals query; 1 = name starts with query; 2 = every token starts a word of the name (words split on whitespace and `- _ / . , ( ) &`); 3 = other name match; 4 = ID-only match; ties by name.
- **Source:** `src/components/customers/SearchBox.tsx`

#### SRCH-RANK-004: Cap at 100 results with match count
- **Status:** ✅ Implemented
- **Criterion:** THE system SHALL show at most 100 results and a header "N match(es)", adding "(showing top 100)" when more exist.
- **Source:** `src/components/customers/SearchBox.tsx`

#### SRCH-RANK-005: Highlight tokens, hide parent ID
- **Status:** ✅ Implemented
- **Criterion:** THE system SHALL highlight matched tokens in each result and SHALL NOT display the parent ID.
- **Source:** `src/components/customers/SearchBox.tsx`

#### SRCH-RANK-006: No-match message
- **Status:** ✅ Implemented
- **Criterion:** IF nothing matches THEN THE system SHALL show "No customers match "<query>"" and "Check the spelling or try a shorter name.".
- **Source:** `src/components/customers/SearchBox.tsx`

### SRCH-R3 — Select with mouse or keyboard
**User story:** As a keyboard user, I want to move through results and open one without the mouse.

#### SRCH-SEL-001: Open results on focus or input
- **Status:** ✅ Implemented
- **Criterion:** WHEN the input is focused or changed and the query is non-blank THE results panel SHALL open.
- **Source:** `src/components/customers/SearchBox.tsx`

#### SRCH-SEL-002: Arrow-key navigation
- **Status:** ✅ Implemented
- **Criterion:** WHEN ArrowDown/ArrowUp is pressed THE active result SHALL move (clamped) and scroll into view; hovering a result SHALL make it active; a new query SHALL reset the active result to the first.
- **Source:** `src/components/customers/SearchBox.tsx`

#### SRCH-SEL-003: Open customer on Enter or click
- **Status:** ✅ Implemented
- **Criterion:** WHEN Enter is pressed or a result is clicked THE system SHALL open that customer, clear the query and close the panel.
- **Source:** `src/components/customers/SearchBox.tsx`

#### SRCH-SEL-004: Close on Escape or outside click
- **Status:** ✅ Implemented
- **Criterion:** WHEN Escape is pressed or the user clicks outside THE panel SHALL close.
- **Source:** `src/components/customers/SearchBox.tsx`

#### SRCH-SEL-005: Clear button
- **Status:** ✅ Implemented
- **Criterion:** WHILE the query is non-empty a clear (×) button SHALL be shown that empties it.
- **Source:** `src/components/customers/SearchBox.tsx`

#### SRCH-SEL-006: Enter-to-open hint
- **Status:** ✅ Implemented
- **Criterion:** ON screens ≥ 640px the results header SHALL show an "↵ to open" hint.
- **Source:** `src/components/customers/SearchBox.tsx`

### SRCH-R4 — Two variants

#### SRCH-VAR-001: Hero search on landing page
- **Status:** ✅ Implemented
- **Criterion:** WHILE no customer is selected THE hero variant (64px, auto-focused, "Search Parent") SHALL be shown on the landing page.
- **Source:** `src/components/customers/SearchBox.tsx`, `src/pages/Customers.tsx`, `src/components/customers/TopBar.tsx`

#### SRCH-VAR-002: Bar search in top bar
- **Status:** ✅ Implemented
- **Criterion:** WHILE a customer is selected THE bar variant (32px, "Search another parent...") SHALL be shown in the top bar.
- **Source:** `src/components/customers/SearchBox.tsx`, `src/pages/Customers.tsx`, `src/components/customers/TopBar.tsx`

### SRCH-R5 — Accessible combobox

#### SRCH-ARIA-001: Combobox and listbox roles
- **Status:** ✅ Implemented
- **Criterion:** THE input SHALL have `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-autocomplete="list"`; the list `role="listbox"`; items `role="option"` with `aria-selected`.
- **Source:** `src/components/customers/SearchBox.tsx`

#### SRCH-ARIA-002: Expose active option with aria-activedescendant
- **Status:** ❌ Gap
- **Criterion:** THE input SHALL set `aria-activedescendant` to the active option's id.
- **Source:** `src/components/customers/SearchBox.tsx`

## Scenarios
- **Ranking:** customers "Acme Health", "Acmeville", "Health Acme Group"; query `acme` → order Acme Health, Acmeville, Health Acme Group.
- **Multi-token:** "Global Bank of Asia"; query `bank asia` → match, "Bank" and "Asia" highlighted.
- **ID only:** parent ID 48213; query `482` → listed, ID not shown.
- **Keyboard:** ↓ ↓ Enter → third result opens, search box empty.
- **Service down:** dev server stopped → input disabled with "Could not reach the workbook service…" and Try again.
