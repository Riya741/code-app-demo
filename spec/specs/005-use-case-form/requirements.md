# Requirements — Add / Edit Use Case

| Spec | Prefix | Status | Constitution |
|---|---|---|---|
| use-case-form | UCF | ⚠️ Add and edit saved (2026-11-18) · edit normalisation tests and duplicate warning open | II, IV, V, IX |

## Introduction
A dialog to add one use case to the selected customer, or to edit an existing one. Pick-lists cascade so only valid
combinations can be chosen.

---

### UCF-R1 — Fields and cascades
**User story:** As a CSS, I want to choose only valid subsidiaries, departments, stakeholders, types and statuses.

#### UCF-FIELD-001: Form fields and order
- **Status:** ✅ Implemented
- **Criterion:** THE form SHALL show, in order: Subsidiary*, Department, Stakeholder, Solution*, Use case type, Status*, Content type (multi), CSS contributor (multi), Launch date, Value (plain text, "Short value statement"), Notes (rich text, "Click to add notes...").
- **Source:** `src/components/customers/UseCaseForm.tsx`, `src/lib/lookups.ts`, `src/hooks/useLookups.ts`

#### UCF-FIELD-002: Subsidiary and department options
- **Status:** ✅ Implemented
- **Criterion:** THE Subsidiary options SHALL be the customer's subsidiaries; Department options those of the chosen subsidiary, labelled "Name (Type)"; Stakeholder options those of the chosen department, labelled "Name - Title".
- **Source:** `src/components/customers/UseCaseForm.tsx`, `src/lib/lookups.ts`, `src/hooks/useLookups.ts`

#### UCF-FIELD-003: Type and status options per solution
- **Status:** ✅ Implemented
- **Criterion:** THE Use case type options SHALL be those allowed for the chosen solution; Status options those allowed for the solution, ordered by `sort_order`.
- **Source:** `src/components/customers/UseCaseForm.tsx`, `src/lib/lookups.ts`, `src/hooks/useLookups.ts`

#### UCF-FIELD-004: Cascade clearing
- **Status:** ✅ Implemented
- **Criterion:** WHEN Subsidiary changes THE system SHALL clear Department and Stakeholder; WHEN Department changes, Stakeholder; WHEN Solution changes, Use case type and Status.
- **Source:** `src/components/customers/UseCaseForm.tsx`, `src/lib/lookups.ts`, `src/hooks/useLookups.ts`

#### UCF-FIELD-005: Disabled dependent fields
- **Status:** ✅ Implemented
- **Criterion:** WHILE a parent field is empty THE dependent field SHALL be disabled with "Choose a subsidiary first" / "Choose a department first" / "Choose a solution first".
- **Source:** `src/components/customers/UseCaseForm.tsx`, `src/lib/lookups.ts`, `src/hooks/useLookups.ts`

#### UCF-FIELD-006: Empty option messages
- **Status:** ✅ Implemented
- **Criterion:** IF an option list is empty THEN it SHALL say "No subsidiaries found for this customer" / "No departments for this subsidiary" / "No stakeholders for this department" / "No use case types for this solution" / "No statuses for this solution".
- **Source:** `src/components/customers/UseCaseForm.tsx`, `src/lib/lookups.ts`, `src/hooks/useLookups.ts`

#### UCF-FIELD-007: Option loading and errors
- **Status:** ✅ Implemented
- **Criterion:** WHILE a list loads it SHALL show "Loading..." with a spinner; IF it fails THEN the error SHALL show under the field.
- **Source:** `src/components/customers/UseCaseForm.tsx`, `src/lib/lookups.ts`, `src/hooks/useLookups.ts`

#### UCF-FIELD-008: Option key from detectKey
- **Status:** ✅ Implemented
- **Criterion:** Subsidiary and department option values SHALL use the key column detected from existing rows (`detectKey`).
- **Source:** `src/components/customers/UseCaseForm.tsx`, `src/lib/lookups.ts`, `src/hooks/useLookups.ts`

### UCF-R2 — Add
**User story:** As a CSS, I want to record a new use case in one dialog.

#### UCF-ADD-001: Required field validation
- **Status:** ✅ Implemented
- **Criterion:** WHEN the user submits with a required field empty THE system SHALL show "Required" under each missing field and SHALL NOT send a request. Messages appear only after the first submit.
- **Source:** `src/components/customers/UseCaseForm.tsx`, `src/lib/parentData.ts`, `src/hooks/useParentActivity.ts`

#### UCF-ADD-002: Post UseCaseInput
- **Status:** ✅ Implemented
- **Criterion:** WHEN the user submits a valid form THE system SHALL post `UseCaseInput` (parent_id, selected ids, launch date, comma id lists, trimmed value, note, `premium_credit` from the solution, `deleted: false`).
- **Source:** `src/components/customers/UseCaseForm.tsx`, `src/lib/parentData.ts`, `src/hooks/useParentActivity.ts`

#### UCF-ADD-003: Saving state
- **Status:** ✅ Implemented
- **Criterion:** WHILE saving THE buttons SHALL be disabled, the primary SHALL show a spinner and the dialog SHALL NOT close.
- **Source:** `src/components/customers/UseCaseForm.tsx`, `src/lib/parentData.ts`, `src/hooks/useParentActivity.ts`

#### UCF-ADD-004: Success toast and refresh
- **Status:** ✅ Implemented
- **Criterion:** WHEN the save succeeds THE system SHALL toast "Use case added", close the dialog and refresh the list.
- **Source:** `src/components/customers/UseCaseForm.tsx`, `src/lib/parentData.ts`, `src/hooks/useParentActivity.ts`

#### UCF-ADD-005: Failure keeps input
- **Status:** ✅ Implemented
- **Criterion:** IF the save fails THEN THE dialog SHALL stay open with all input and show "Could not save: <message>".
- **Source:** `src/components/customers/UseCaseForm.tsx`, `src/lib/parentData.ts`, `src/hooks/useParentActivity.ts`

#### UCF-ADD-006: Blank dialog on open
- **Status:** ✅ Implemented
- **Criterion:** THE dialog SHALL start blank on every open; title "Add use case", description "Fields marked * are required.", button "Add use case".
- **Source:** `src/components/customers/UseCaseForm.tsx`, `src/lib/parentData.ts`, `src/hooks/useParentActivity.ts`

#### UCF-ADD-007: No target fields in form
- **Status:** ✅ Implemented
- **Criterion:** THE form SHALL NOT offer target users/credits/API calls.
- **Source:** `src/components/customers/UseCaseForm.tsx`, `src/lib/parentData.ts`, `src/hooks/useParentActivity.ts`

#### UCF-ADD-008: Warn on possible duplicate
- **Status:** 📝 Planned
- **Criterion:** WHEN the chosen subsidiary, department, solution and type match an existing use case THE form SHALL show a non-blocking duplicate warning.
- **Source:** `src/components/customers/UseCaseForm.tsx`, `src/lib/parentData.ts`, `src/hooks/useParentActivity.ts`

### UCF-R3 — Edit
**User story:** As a CSS, I want to correct or progress an existing use case (e.g. change its status).

#### UCF-EDIT-001: Edit dialog pre-filled
- **Status:** ✅ Implemented
- **Criterion:** WHEN Edit is opened THE dialog SHALL be titled "Edit use case", pre-filled from the row (value as plain text, note as HTML), with button "Save changes".
- **Source:** `src/components/customers/UseCaseForm.tsx`

#### UCF-EDIT-002: Save use case edits
- **Status:** ✅ Implemented
- **Criterion:** WHEN "Save changes" is submitted THE system SHALL post the full `UseCaseInput` with `id`, toast "Use case updated", close and refresh.
- **Source:** `src/components/customers/UseCaseForm.tsx`

#### UCF-EDIT-003: Cascades in edit mode
- **Status:** ✅ Implemented
- **Criterion:** WHEN editing THE cascades SHALL behave as in add mode.
- **Source:** `src/components/customers/UseCaseForm.tsx`

#### UCF-EDIT-004: Preserve target fields on edit
- **Status:** ✅ Implemented
- **Criterion:** WHEN saving an edit THE system SHALL send the row's current `target_users`, `target_credits_consumed`, `target_api_calls` so the full-replace API does not erase them.
- **Source:** `src/components/customers/UseCaseForm.tsx`

### UCF-R4 — Values an edit normalises (accepted by the owner, D4, CR-20261120-1)
**User story:** As the owner, I want the small changes an edit makes to stored values written down, so that they are
deliberate behaviour rather than surprises.

#### UCF-EDIT-005: Value saved as plain text on edit
- **Status:** ⚠️ Partial — implemented (`plain()` on load, trimmed text on save); no test names it yet (UCF-T11)
- **Criterion:** WHEN a use case whose `value_snippet` holds HTML is edited THE form SHALL show the value as plain text and "Save changes" SHALL write that plain text, so HTML formatting in the value is not kept after the first edit.
- **Source:** `src/components/customers/UseCaseForm.tsx`

#### UCF-EDIT-006: Launch date saved as a calendar date on edit
- **Status:** ⚠️ Partial — implemented (the form keeps the first 10 characters of `expected_launch_date`); no test names it yet (UCF-T11)
- **Criterion:** WHEN a use case whose `expected_launch_date` is stored with a time part is edited and saved THE system SHALL write the date as `YYYY-MM-DD`.
- **Source:** `src/components/customers/UseCaseForm.tsx`

#### UCF-EDIT-007: Premium credit from the solution, else the stored flag
- **Status:** ✅ Implemented — evidence: the three `premium_credit` tests in `tests/component/UseCaseForm.test.tsx` (titled UCF-EDIT-002; UCF-T11 retitles them)
- **Criterion:** WHEN an edit is saved THE system SHALL send `premium_credit` from the selected solution's flag, and IF that flag is unknown (lookup loading or failed, solution not listed, blank cell) THEN the row's stored flag.
- **Source:** `src/components/customers/UseCaseForm.tsx`

## Scenarios
- Pick Solution A and a Status, change to Solution B → type and status cleared; status list shows B's statuses in order.
- Only Subsidiary set → Solution and Status show "Required"; no request.
- Valid input with two contributors → "Use case added", new row on top with both contributors.
- **Target:** edit a status and save → new status shown, `last_modified` updated, one status-history row added.
- Edit a use case whose value is `<p><b>Faster</b> checkout</p>` → the Value box shows `Faster checkout`; Save changes stores `Faster checkout` (UCF-EDIT-005).
- Edit a use case with launch date `2026-12-01T00:00:00` → stored as `2026-12-01` (UCF-EDIT-006).
- Edit while the solutions list is still loading → the stored `premium_credit` is kept (UCF-EDIT-007).
