# Requirements — Design System and Shared Components

| Spec | Prefix | Status | Constitution |
|---|---|---|---|
| design-system | DS | ✅ Implemented · cleanup pending | V, VI, VIII |

## Introduction
Visual language (tokens, type, colour, motion), shared UI components and the catalog of user-facing messages
([messages-catalog.md](messages-catalog.md)).

---

### DS-R1 — Tokens and theming

#### DS-TOKEN-001: Colour tokens only
- **Status:** ✅ Implemented
- **Criterion:** ALL colours in feature UI SHALL come from tokens (`background`, `foreground`, `card`, `primary`, `muted`, `accent`, `destructive`, `border`, `ring`, `title` …), except status tones (DS-COLOR-001).
- **Source:** `src/index.css`, `tailwind.config.ts`

#### DS-TOKEN-002: Light and dark values
- **Status:** ✅ Implemented
- **Criterion:** EVERY token SHALL have a light and a dark value; dark mode SHALL be applied by the `dark` class.
- **Source:** `src/index.css`, `tailwind.config.ts`

#### DS-TOKEN-003: Radius token
- **Status:** ✅ Implemented
- **Criterion:** Radius SHALL derive from `--radius` = 0.75rem.
- **Source:** `src/index.css`, `tailwind.config.ts`

### DS-R2 — Typography and density

#### DS-TYPE-001: Type scale
- **Status:** ✅ Implemented
- **Criterion:** THE type scale SHALL be xs 11/16, sm 12/18, base 13/20, lg 15/22, xl 17/24, 2xl 20/28, 3xl 24/32; font Inter with system fallbacks.
- **Source:** `tailwind.config.ts`, `src/index.css`

#### DS-TYPE-002: Compact controls
- **Status:** ✅ Implemented
- **Criterion:** Controls SHALL be compact: inputs/comboboxes 32px, header buttons 24px.
- **Source:** `tailwind.config.ts`, `src/index.css`

#### DS-TYPE-003: Panel title style
- **Status:** ✅ Implemented
- **Criterion:** Panel titles SHALL be 11px semibold uppercase in `title` colour.
- **Source:** `tailwind.config.ts`, `src/index.css`

### DS-R3 — Status colours

#### DS-COLOR-001: Status pill colours
- **Status:** ✅ Implemented
- **Criterion:** Status/stage pills SHALL be coloured by first matching pattern: complete/launch/live/done/adopt → emerald; progress/active/plan/pilot/develop/schedul → sky; block → red; risk/hold/delay/cancel → amber; else slate. Text always shown.
- **Source:** `src/components/customers/ParentActivity.tsx`

### DS-R4 — Shared components

#### DS-COMP-001: Combobox
- **Status:** ✅ Implemented
- **Criterion:** `Combobox`: searchable single/multi select; single re-pick clears; multi keeps open with count badge and "Clear selection"; loading/disabled/error/invalid states; modal popover.
- **Source:** `src/components/customers/Combobox.tsx`, `src/components/customers/FormBits.tsx`, `src/components/customers/ConfirmDelete.tsx`, `src/components/customers/ExportButton.tsx`, `src/components/customers/Panel.tsx`

#### DS-COMP-002: Field
- **Status:** ✅ Implemented
- **Criterion:** `Field`: label in title colour, red `*` when required, optional hint.
- **Source:** `src/components/customers/Combobox.tsx`, `src/components/customers/FormBits.tsx`, `src/components/customers/ConfirmDelete.tsx`, `src/components/customers/ExportButton.tsx`, `src/components/customers/Panel.tsx`

#### DS-COMP-003: ConfirmDelete
- **Status:** ✅ Implemented
- **Criterion:** `ConfirmDelete`: alert dialog that stays open while pending and on error.
- **Source:** `src/components/customers/Combobox.tsx`, `src/components/customers/FormBits.tsx`, `src/components/customers/ConfirmDelete.tsx`, `src/components/customers/ExportButton.tsx`, `src/components/customers/Panel.tsx`

#### DS-COMP-004: Reuse shared components
- **Status:** ⚠️ Partial — `Pill` defined twice (ParentActivity, UseCaseBulkForm)
- **Criterion:** `ExportButton`, `Panel`, `ListState`, `Pill`, `Tally` SHALL be reused rather than re-implemented.
- **Source:** `src/components/customers/Combobox.tsx`, `src/components/customers/FormBits.tsx`, `src/components/customers/ConfirmDelete.tsx`, `src/components/customers/ExportButton.tsx`, `src/components/customers/Panel.tsx`

#### DS-COMP-005: Vendored primitives unchanged
- **Status:** ✅ Implemented
- **Criterion:** Vendored shadcn primitives in `src/components/ui/` SHALL only change for app-wide fixes.
- **Source:** `src/components/customers/Combobox.tsx`, `src/components/customers/FormBits.tsx`, `src/components/customers/ConfirmDelete.tsx`, `src/components/customers/ExportButton.tsx`, `src/components/customers/Panel.tsx`

### DS-R5 — Messages

#### DS-MSG-001: Messages catalog
- **Status:** ✅ Implemented — (catalog complete as of 2026-11-11)
- **Criterion:** EVERY user-facing message SHALL be listed in [messages-catalog.md](messages-catalog.md) before it ships.

### DS-R6 — Motion and chrome

#### DS-MOTION-001: Enter animations
- **Status:** ✅ Implemented
- **Criterion:** Panels, chip, popovers and result lists SHALL animate in (fade/slide 200–500ms).
- **Source:** `src/index.css`, `tailwind.config.ts`

#### DS-MOTION-002: Slim scrollbars
- **Status:** ✅ Implemented
- **Criterion:** Scrollbars SHALL be slim (12px), rounded, in title colour at 28/50/70% (rest/hover/active).
- **Source:** `src/index.css`, `tailwind.config.ts`

#### DS-MOTION-003: Remove unused theme extras
- **Status:** 📝 Planned
- **Criterion:** Unused theme extras (`soft-purple`, `pastel-blue`, `muted-gray`, `soft-gradient`, `sidebar-*`) SHALL be removed.
- **Source:** `src/index.css`, `tailwind.config.ts`
