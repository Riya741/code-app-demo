# Change Request: Owner decisions of 2026-11-20 (Article II.4, summary band with AI auto-draft, summary POST check, edit normalisation)

- **ID:** CR-20261120-1
- **Author / date:** Project owner (decisions D1–D4), drafted with Claude Code (spec author, AGENT-SPEC-AUTHOR@1.0.0) · 2026-11-20
- **Type:** Constitution amendment + Behaviour change + Defect fix
- **Specs affected:** specs/002-workspace-layout, specs/003-executive-summary, specs/005-use-case-form,
  specs/008-event-form, specs/014-workbook-api, specs/017-design-system (messages catalog, design surfaces),
  specs/022-ai-account-brief, specs/024-agent-ops (design note and scenarios only)
- **Constitution articles affected:** Article II.4 reworded (v1.1.0 → **v1.1.1**, PATCH); compliance re-checked for
  II, IV, V, VI, VII, X and XII in the specs above
- **Status:** Approved 2026-11-20 by the project owner · branch `cr-owner-decisions-summary-band`

## 1. Problem

Four questions were open after Phase 2 (hand-offs [UCF-T07](../handoffs/UCF-T07.md), [EVF-T06](../handoffs/EVF-T06.md),
[API-T09](../handoffs/API-T09.md); task API-T13). The owner answered all four on 2026-11-20.

1. **Article II.4 vs link-row replacement (API-T13).** Article II.4 said "history and link rows are never destroyed
   by the app", but API-WRITE-004 (✅ since the specs were reverse-engineered on 2026-11-11) replaces a record's link
   rows on every write, and since UCF-T07/EVF-T06 every edit does. This was a recorded Constitution exception.
2. **The Executive Summary takes 40% of the width on the right**, squeezing the Use Cases and Events grids, which are
   where most work happens. The planned AI Account Brief needed a click on *Draft with AI* even for a customer with
   no summary at all, the case where a draft helps most.
3. **`POST /customers/:id/summary` without `executive_summary` clears the stored summary** (`text(undefined) → null`),
   so a malformed request silently destroys data (API-T09 open question).
4. **Edits normalise some stored values** (HTML → plain text in two fields, dates cut to `YYYY-MM-DD`, the premium
   credit fallback). This was behaviour without a requirement (Article I.1).

## 2. Proposed behaviour

### D1. Article II.4 says what the app does (constitution v1.1.1)
New text: *"Use cases and events are soft-deleted; their rows and their status history are never destroyed by the app.
An edit updates the record in place (same `id`) and replaces that record's own link rows (personnel, content types,
solutions) with the set the user saved; no other record's link rows are touched."*

- **Version: PATCH (1.1.0 → 1.1.1).** The governance rule is "MAJOR: article removed/redefined · MINOR: article added ·
  PATCH: wording". No article is added, removed or redefined: Article II's principle (the workbook is the single
  source of truth, atomic and serialised writes, soft delete) is unchanged. The clause is worded to match the write
  rule that was already specified and implemented when the constitution was ratified (API-WRITE-004 ✅ on 2026-11-11),
  so this corrects wording. If the owner reads it as a redefinition, it becomes MAJOR 2.0.0 (open question f).
- API-WRITE-004 wording is already consistent ("replace the record's link rows"); a note records that `relink`
  filters by the saved record's id, so only that record's rows are replaced.
- The II.4 exception is removed from steering/constitution-mapping.md §3, the 005 and 008 designs, and the ⚠️ markers
  in the matrix. **API-T13** is reworded to the decision and set to 🔄 In progress; it is spec-only and closes (✅)
  when this CR is approved.

### D2. A full-width, collapsible Executive Summary band, with the AI draft in it

**Layout (spec 002).** No right-hand panel. With a customer selected the workspace shows the Executive Summary as a
full-width band above the Use Cases / Events split; the grids keep their 60/40 vertical split, now full width.
- Built on the shared `Panel` shell, which gains an optional `collapse` prop (Article VI.3 reuse; other panels unchanged).
- **Collapse/expand:** a button in the band header, named "Collapse executive summary" / "Expand executive summary",
  with `aria-expanded` and `aria-controls`, Enter/Space, visible focus; focus moves to it if the body it hides held
  focus. Collapsed = header row only (title, Last modified, actions, and any AI progress or "AI draft — not saved"
  badge). Disabled while the editor is open or saving, so a typed edit is never hidden. The body stays mounted when
  collapsed, so an AI run keeps going. Starts expanded.
- **Persistence (proposed):** the collapsed state is a UI preference in `localStorage` (`terra-summary-band-v1`),
  restored after reload and across customers, like the split sizes (Article II.1). Owner to confirm (open question a).
- **Height:** ≥ 1024px, the band is as tall as its content up to 40% of the workspace height and scrolls inside;
  the grids fill the rest of the single viewport. < 1024px, it is first in the stack, at most 60vh, scrolls inside.
  Not draggable (open question b).
- **Themes:** the band keeps the stone tokens of SUM-VIEW-001; G5 covers light and dark, both widths, collapsed and expanded.
- The horizontal split (`terra-split-h-v3`) goes; LAY-T08 (persist the vertical split) must ship with it, or
  LAY-PANEL-004 would regress from ⚠️ to ❌.

**Summary (spec 003).** Every existing behaviour moves into the band unchanged: sanitised render, empty-state text,
Last modified, click/Enter to edit, lazy rich-text editor, Cancel/Save, pending/success/failure states and toasts,
Word export of the *stored* summary (SUM-VIEW-005). SUM-VIEW-001 is reworded "panel" → "panel or band" (no
behaviour change).

**AI Account Brief (spec 022).**
- WHEN a customer is selected AND it has no saved summary AND AI is available, one brief run starts automatically
  and its progress shows in the band (AIB-GEN-007). One automatic run per selection; selecting the same customer again
  later is a new selection and drafts again if it still has no summary (owner decision).
- Changing or clearing the customer cancels an unfinished run; nothing from it is shown for the next customer
  (AIB-GEN-008). Opening the editor during a run cancels it, so a draft never overwrites typing (AIB-GEN-015, proposed).
- The finished draft is shown in the band, **unsaved**, sanitised, with its citation markers, under the label
  "AI draft — not saved" and the actions *Save* (through SUM-EDIT-001), *Edit* (opens the editor with the draft),
  *Discard*; ignoring it and working in the grids writes nothing (AIB-HUMAN-004..007). Unverified drafts keep their
  banner (AIB-HUMAN-002). A collapsed band shows the progress or the "AI draft — not saved" badge and never expands by
  itself (AIB-HUMAN-008).
- With a saved summary: no automatic run; the band shows the summary and *Regenerate with AI* (AIB-GEN-009), which
  replaces *Draft with AI*. The confirm-before-replacing-unsaved-edits rule still applies (AIB-GEN-011).
- Breaker open: no automatic run; *Regenerate with AI* disabled with the existing tooltip (AIB-GEN-012).
- AI off: no automatic run, no AI action or label; the band is exactly the plain summary (AIB-GEN-013, Article XII.8).
- Failures show "Could not draft the summary: … (run <id>)" with *Try again* in the band; the grids are never blocked
  (AIB-GEN-004 unchanged, AIB-GEN-014).
- The pipeline (024), evaluation (023), agent specs and ADRs are unchanged: none names the button. The fact sheet
  still never contains the old summary (ai-data-policy), including on Regenerate.

### D3. Summary POST must carry a string summary
`POST /customers/:id/summary` without `executive_summary` → 400 "Missing: executive_summary"; with a non-string value
(including `null`) → 400 "executive_summary must be a string."; in both cases the stored summary, its timestamp and the
file are unchanged. An explicit `""` still clears it (stored as null, API-SUMM-001 unchanged). New requirement
API-SUMM-002 (❌ Gap, defect), task API-T14; the check must not reuse `required()`, which treats `""` as missing.

### D4. Edit normalisation is specified behaviour
Verified against `src/components/customers/UseCaseForm.tsx`, `src/components/customers/EventForm.tsx` and
`server/workbook.ts` on 2026-11-20:

| Requirement | Behaviour | Code | Evidence today | Status |
|---|---|---|---|---|
| UCF-EDIT-005 | HTML `value_snippet` shown and saved as plain text | `plain()` on load, `value.trim()` on save | none | ⚠️ Partial → UCF-T11 |
| UCF-EDIT-006 | `expected_launch_date` with a time saved as `YYYY-MM-DD` | `slice(0, 10)` on load | none (fixtures hold date-only values) | ⚠️ Partial → UCF-T11 |
| UCF-EDIT-007 | `premium_credit` from the selected solution, else the row's stored flag | `sol?.premium_credit ?? row?.premium_credit ?? false` | three `UseCaseForm.test.tsx` tests titled UCF-EDIT-002 | ✅ (UCF-T11 retitles) |
| EVF-EDIT-003 | HTML `attendee_names` shown and saved as plain text | `plain()` on load, `trim()` on save | none | ⚠️ Partial → EVF-T10 |
| EVF-EDIT-004 | `event_date` with a time saved as `YYYY-MM-DD` | form and server both `slice(0, 10)` | `EventForm.test.tsx` "EVF-EDIT-002 Save changes posts the full event …" (row `2026-03-05T00:00:00`, posted `2026-03-05`) | ✅ (EVF-T10 adds a titled test) |

The hand-off open questions are records and stay as they are; the 005 and 008 designs now link to them.

## 3. Spec impact

| File | IDs | Change |
|---|---|---|
| constitution.md | — | Article II.4 reworded; v1.1.1; amendment log row |
| steering/constitution-mapping.md | — | II.4 exception removed; ⚠️ removed for 005/008 column II; 002 gains XII ○; II, IV, V, VI, VII, X, XII rows updated (closed gaps from 2026-11-18 removed); §6 amendment re-check |
| steering/tech.md, product.md, glossary.md | — | panel memory keys; AI brief scope; terms "Summary band", "AI draft", "Automatic draft"; premium credit fallback |
| specs/002-workspace-layout/requirements.md | LAY-PANEL-002 | retire (Deprecated) |
| | LAY-PANEL-006, LAY-BAND-001..007 | add (📝 Planned); intro, user story, scenarios updated |
| specs/002-workspace-layout/design.md | — | planned layout tree, `Panel` `collapse` prop, tests to update, Constitution check (II, VI, VII, VIII, XII) |
| specs/002-workspace-layout/tasks.md | LAY-T09, LAY-T10 | new (⬜); LAY-T08 note (ship with LAY-T09); Summary line |
| specs/003-executive-summary/requirements.md | SUM-VIEW-001 | reworded, no behaviour change |
| | SUM-VIEW-005 | add (📝 Planned); intro and scenario |
| specs/003-executive-summary/design.md | — | band section; tests note; Constitution check (VI, VII, XII) |
| specs/003-executive-summary/tasks.md | SUM-T13 | new (⬜); Summary line |
| specs/005-use-case-form/requirements.md | UCF-EDIT-005, UCF-EDIT-006, UCF-EDIT-007 | add (⚠️, ⚠️, ✅); scenarios; header status |
| specs/005-use-case-form/design.md | — | normalisation linked to the IDs; link rows section; II.4 exception removed; Constitution check X row |
| specs/005-use-case-form/tasks.md | UCF-T11 | new (⬜); Summary line |
| specs/008-event-form/requirements.md | EVF-EDIT-003, EVF-EDIT-004 | add (⚠️, ✅); scenarios; header status |
| specs/008-event-form/design.md | — | as 005 |
| specs/008-event-form/tasks.md | EVF-T10 | new (⬜); Summary line |
| specs/014-workbook-api/requirements.md | API-SUMM-002 | add (❌ Gap) |
| | API-WRITE-004 | note only, wording unchanged; scenarios; section title "(planned)" dropped |
| specs/014-workbook-api/design.md | — | API-SUMM-002 design (open owner question closed); link rows section; Constitution check II, IV |
| specs/014-workbook-api/tasks.md | API-T13 | reworded to the decision, ⬜ → 🔄 |
| | API-T14 | new (⬜); Summary line |
| specs/017-design-system/messages-catalog.md | — | "Draft with AI" and the old "AI draft, not saved" banner retired; "Regenerate with AI", automatic-draft text, band/editor/badge labels, re-pointed IDs; §3 new 400 text; §6 band control names |
| specs/017-design-system/design.md | — | Executive Summary surface is a band |
| specs/022-ai-account-brief/requirements.md | AIB-GEN-001, -002, -003, -005, -006, AIB-HUMAN-001 | retire (Deprecated) |
| | AIB-GEN-007..015, AIB-HUMAN-004..008 | add (📝 Planned); intro, AIB-API-004 note, out of scope, scenarios |
| specs/022-ai-account-brief/design.md | — | overview, files, band-state flows, automatic start and cancel, error table, tests, alternatives, Constitution check |
| specs/022-ai-account-brief/tasks.md | AIB-T06, AIB-T07, AIB-T09 | Covers updated; AIB-T07 and AIB-T09 ⛔ → ⬜ (their blockers SUM-T09 and QA-T02 are done) |
| | AIB-T10 | new (⬜); Summary line |
| specs/024-agent-ops/design.md, requirements.md | — | run-volume note; AIB-GEN-006 → AIB-GEN-012; scenarios (Regenerate, cancel on switch) |
| contracts/brief-draft.v1.schema.json, contracts/README.md | — | requirement list: AIB-HUMAN-001 → AIB-HUMAN-004 (metadata only; schema shape unchanged, so no v2) |
| gates/gap-register.md | API-SUMM-002, UCF-EDIT-005, UCF-EDIT-006, EVF-EDIT-003 | new open rows; LAY-PANEL-004 row note |
| traceability.md | — | source rows, test rows, shared task, dependency chain |
| README.md | — | constitution v1.1.1, changes list, dashboard 2026-11-20 counts, next steps (API-T13 line) |
| changes/CR-20261120-1-owner-decisions-summary-band.md | — | this CR |

Checked and unchanged: specs/023-ai-evaluation, agents/*.md (no agent names the button; Guard keeps AIB-HUMAN-002),
adr/0007, adr/0008 (no ADR needed: no new dependency, layer or store), specs/018-accessibility (LAY-BAND-006 cites
A11Y-KEY-005), steering/ai-data-policy.md, handoffs/*.md, workflow.md, templates.

**New task Covers lines:**
- LAY-T09: LAY-PANEL-006, LAY-BAND-001, LAY-BAND-002, LAY-BAND-004, LAY-BAND-005, LAY-BAND-006, LAY-BAND-007
- LAY-T10: LAY-BAND-003
- SUM-T13: SUM-VIEW-001, SUM-VIEW-005, LAY-BAND-007
- API-T14: API-SUMM-002
- UCF-T11: UCF-EDIT-005, UCF-EDIT-006, UCF-EDIT-007
- EVF-T10: EVF-EDIT-003, EVF-EDIT-004
- AIB-T10: AIB-GEN-007, AIB-GEN-008, AIB-GEN-015
- AIB-T06 (changed): AIB-GEN-009, AIB-GEN-012, AIB-GEN-013, AIB-API-004
- AIB-T07 (changed): AIB-GEN-004, AIB-GEN-009..014, AIB-HUMAN-002..008, AIB-CITE-004
- AIB-T09 (changed): AIB-GEN-004, AIB-GEN-007..015, AIB-HUMAN-002..008
- API-T13 (reworded): API-WRITE-004

## 4. Risks and rollout

- **No workbook schema change**, no data migration. Article II.5 is untouched.
- **API compatibility (D3):** a body without a string `executive_summary` that used to clear the summary now gets 400.
  The app's own client always sends a string, so only hand-made requests change; that is the point of the fix.
- **Layout:** the saved horizontal split (`terra-split-h-v3`) stops being read; users see the default 60/40 grid split
  until they resize once (LAY-T08). The G5 checks recorded for LAY-T03, SUM-T09/T10, UCF-T07 and EVF-T06 assumed the
  right-hand panel and are repeated in LAY-T09's G5 check. No automated test asserts LAY-PANEL-002 today (checked:
  `tests/component` has only the LAY-SHELL-001 `Panel` tests; `CustomerDetails.test.tsx` renders the component on its
  own), so no test needs rewriting; any added before LAY-T09 must be.
- **AI cost:** automatic runs add one run per selection of a customer without a summary (≤ $0.50 and 60 s each,
  AOPS-BUDG-001), cut short by cancel on customer change. Fictional data only (ADR-0006). AI stays off by default.
- **Order:** LAY-T09 + SUM-T13 + LAY-T08 ship together; AIB-T07 needs them and AIB-T06/AIB-T10. Each task follows the
  workflow (🔄, hand-off, review, G1–G5).
- **Rollback:** revert the spec commits; the constitution returns to v1.1.0 with the II.4 exception restored.

## 5. Review

- [x] requirements.md approved by: project owner, 2026-11-20
- [x] design.md approved by: project owner, 2026-11-20
- [x] tasks.md approved by: project owner, 2026-11-20
- [ ] Implementation verified on:

## 6. Open questions for the owner

**Resolved 2026-11-20:** the owner approved the CR as written ("approved") without changing any proposed answer, so
each proposal below stands: (a) persist, (b) content height up to 40%, (c) draft replaces the view, (d) opening the
editor cancels the run, (e) Regenerate also shown without a summary, (f) PATCH 1.1.1, (h) accept without a
requirement, (i) Medium. Question (g) had no proposal and is **not adopted**: abandoned runs stay as specified today
(they run to their budget); raise it as its own change if it matters.


a. **Persist the band's collapsed state?** Proposed: yes, in `localStorage`, restored after reload and for every
   customer (LAY-BAND-003, LAY-T10 waits for this answer). Alternative: per session only, or per customer.
b. **Band height on desktop.** Proposed: content height up to 40% of the workspace, scrolling inside, not draggable
   (LAY-BAND-004). Alternatives: a different cap, a fixed default height, or a draggable band whose size is saved like
   the splits.
c. **Regenerate with AI on a customer with a saved summary:** proposed (AIB-HUMAN-004) that the draft *replaces the
   view* in the band until it is saved, edited or discarded, with the stored summary one *Discard* away. Alternative:
   show the draft side by side with the stored summary (needs more width and a layout rule for < 1024px).
d. **Opening the editor while a run is in progress** cancels the run (AIB-GEN-015, proposed). Alternative: keep the
   run going and offer its draft afterwards without replacing the user's text.
e. **Regenerate with AI on a customer without a summary** after its automatic draft was discarded, cancelled or failed:
   proposed visible (AIB-GEN-009), so the user can draft again without reselecting. Alternative: only on customers
   with a saved summary, as in the decision's wording.
f. **Constitution version:** PATCH 1.1.1 (wording aligned with the ratified write rule) as proposed, or MAJOR 2.0.0
   if the owner treats the II.4 change as a redefinition.
g. **Abandoned runs:** a run is cancelled when the user changes customer, but not if the tab is closed or reloaded
   mid-run (it runs to its budget). Add a server-side "cancel when the last progress subscriber disconnects" rule to
   024 (AOPS-REC)?
h. **Stage is trimmed on event edit** (EVF-T06 review). Not part of D4; proposed: accept without a requirement
   (whitespace only), or add one alongside EVF-EDIT-003/004.
i. **API-SUMM-002 severity** recorded as Medium (data loss only from a hand-made request). Raise to High?
