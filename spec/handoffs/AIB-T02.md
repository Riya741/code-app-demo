---
contract: task-handoff.v1
task: AIB-T02
agent: AGENT-IMPLEMENTER
covers: [AIB-CITE-001, AIB-SAFE-001, AIB-SAFE-003, AIB-FAITH-003]
files_changed: [server/ai/steps/retriever.ts, server/ai/tools.ts, tests/integration/retriever.test.ts, tests/unit/redaction.test.ts, tests/integration/tools.test.ts]
tests: [tests/integration/retriever.test.ts, tests/unit/redaction.test.ts, tests/integration/tools.test.ts]
gates: {G1: pass, G3: pass, G4: pass, G5: n/a}
verdict: pass
reviewer: AGENT-REVIEWER
---
# Hand-off: AIB-T02 Retriever step: fact sheet with fact IDs, field allow-list, redaction, data wrapping

## What changed
New file `server/ai/steps/retriever.ts` exports `retrieve({ customerId }, { store, runId, now? })`. It is a pure async
step with no SDK import; AOPS-T01 wraps it as the `retrieve` step. It returns fact-sheet.v1 and checks the result
against that contract itself before returning.
- **Fact IDs:** every record gets one built from its workbook `id` column: `CU-<id>`, `UC-<id>`, `EV-<id>`. Never
  `use_case_id`, `event_id` or a list position (AIB-CITE-001).
- **Allowed fields only:** use case and event items are built by `useCaseFact` / `eventFact` from `server/ai/tools.ts`,
  so the fact sheet and the tool results have the same item shapes. The customer gives only `id` and `parent_name`.
  The saved executive summary is never read. Soft-deleted rows never arrive.
- **Redaction:** emails, phone numbers and query-string links are redacted in **every string field**, and each field
  is cut to a length. That covers the customer name, the lookup names (solution, use case type, status, subsidiary,
  department, event type: 200), event `stage` (200), `value_snippet` (500), people's names (120), the notes (1 500)
  and the `by_status` keys. Every redaction and every cut is listed in `redactions`, one entry per replacement in the
  sheet (AIB-SAFE-003).
- **Free text as data:** long free text (use case notes, meeting notes) is cut to 1 500 characters and sits in `text`.
  Shorter free text sits in `value_snippet` (500) and `stage` (200): Stage is free text in the event form
  (EVF-FIELD-001). All of it is inside the block that the new `wrapFactSheet(sheet)` returns,
  `<fact_sheet contract="fact-sheet.v1">` + compact JSON + `</fact_sheet>`. In that JSON, `<`, `>`, `&`, U+2028 and
  U+2029 are written as `\u` escapes, so a note cannot close or open the block (AIB-SAFE-001).
- **Sparse or empty customers:** the sheet holds exactly the customer's records, or empty lists, with true counts. No
  padding (AIB-FAITH-003).
- **Dates:** written as `YYYY-MM-DD` (the stored day) or `null`. Excel serial numbers, Date cells and ISO strings with a
  time are all handled. Impossible days become `null`.
- **`generated_at`:** comes from `toISOString()`.
- **Over 200 records:** only the newest 200 use cases or events are kept, and the cut is listed as `truncated`. The
  counts still cover every live record.
- **Unknown customer:** throws `CustomerNotFoundError` (`code: "not_found"`, `status: 404`) with the catalogued text
  "Customer <id> was not found.".
- **Invalid output:** a sheet that fails its own contract throws `FactSheetInvalidError` (`code: "invalid_output"`).

`server/ai/tools.ts` has the AOPS-T02 review findings 5 and 6 fixed:
- **Phone redaction rewritten in three stages:** find runs of digits, keep the dates inside a run, then judge each
  space-separated span by shape. The rules and known limits are in the comment above `NUMBER_RUN`.
- **People cap:** when the 20-name cap trims `people`, it is listed as `truncated`.
- **`dataText` cuts by code points,** as the contracts' `maxLength` counts.
- **`calendarDay`** replaces `isoDate`, with the date handling described above. It is shared by both item builders and
  `list_events`.
- **`isLiveStatus` and `str` are now exported,** so the Retriever's counts use the same "Live" rule as the item flag.

### Changes made for the review (AIB-T02 review of 2026-11-20: one major, three minors)
1. **Major, AIB-SAFE-003: Stage and lookup names.**
   - `eventFact` sends `stage` through `dataText(row.stage, STAGE_MAX = 200, tally)`.
   - Every lookup name goes through the new `lookupName` = `dataText(v, LOOKUP_MAX = 200, tally)`.
   - Both caps are recorded in the code comments.
   - `eventFact` / `useCaseFact` are shared, so `get_event`, `list_events` and `get_use_case` are fixed as well.
   - The Retriever redacts each distinct status name once as a `by_status` key, so the counts carry no unredacted text.
   - New tests plant an email, a phone and a 3 000-character string in `stage`, plus emails in lookup names, for both
     the Retriever and the tools, and assert redaction, the cap and an exact tally.
2. **Minor: separators, currency rule, scheme-less links.**
   - **Phone separators** now include U+2010 to U+2015 and "/", written as escapes. Full-width digits are handled:
     they are judged as ASCII digits and the text itself is not rewritten.
   - **Currency or percent exemption** now applies only to amount-shaped numbers: thousands groups, a plain integer
     not starting with 0, or a decimal. So "USD 555-123-4567", "(euro sign) 555 123 4567", "555 123 4567 USD" and
     "Sum 555 123 4567%" are redacted.
   - **Links with a query string** are redacted with or without a scheme: "www.example.com/?q=1",
     "example.com/p?q=1".
   - **Glued numbers no longer cause backtracking.** A number glued to a following letter is now handled in code, so a
     long run of short groups stays linear.
   - **New limits**, each in the "Known limits" comments with a pinning test:
     - "USD 5551234567" is kept as an amount.
     - A bare domain with a query and no path ("example.com?q=1") is not redacted.
     - "12345/67890" and long numbers in a link path are redacted (over-redaction).
     - A full-width "+" stays in place.
3. **Minor: email performance.** EMAIL is bounded: local part 1-64, labels 1-63, at most 9 labels, top-level domain
   2-24. LINK_WITH_QUERY is bounded too (path and query up to 2 048 each). A timing test runs twelve worst-case
   32 767-character cells, each required to finish in under 500 ms.
4. **This hand-off:** corrected the free-text claim (Stage too), refreshed the gates and files.

The `result_too_large` test no longer relies on an uncapped lookup name, because every field is now capped. It fills a
full page to the caps with a character that JSON writes as six characters. The assertions are unchanged.

### Redaction cases (review finding 5)
| Case | Before | Now |
|---|---|---|
| "5551234567", "07700900123" (no separators) | missed | `[phone]` (fixed) |
| "20 7946 0958 2026-01-03" (number then ISO date) | missed | `[phone] 2026-01-03` (fixed; also for `03.01.2026` and a date-time) |
| "1-800-555-0199" | `1-[phone]` | `[phone]` (fixed) |
| "1 200 000 000" (amount) | `[phone]` | kept (fixed; also "1.200.000.000", "200 000 000", amounts next to a currency sign or code or before `%`) |
| "2024 2025 2026" (years) | `[phone]` | kept (fixed) |
| Two numbers in one run "555-123-4567 555-765-4321"; "Since 2026 5551234567" | one or no match | `[phone] [phone]`; `Since 2026 [phone]` (new) |
| Decimals "3.14159265358", IPv4 "192.168.100.200" | `[phone]` | kept (new) |
| Fewer than 9 digits ("7946 0958", "555-0199") | kept | kept: **documented limit**, test |
| Glued to letters ("5551234567x12", "tel5551234567") | kept | kept: **documented limit**, test |
| "612 345 678" vs "200 000 000" (same shape) | both `[phone]` | phone vs amount, decided by the trailing "000": **documented limit**, test |
| Unseparated 9-15-digit amounts or IDs, ranges "100000-200000", "12345/67890", long numbers in a link path | `[phone]` | `[phone]` (over-redaction, the safe side): **documented limit**, test |
| Unicode dashes U+2010-U+2015, "/" as separators; full-width digits | missed | `[phone]` (review fix 2) |
| "USD 555-123-4567", "555 123 4567 USD", "Sum 555 123 4567%" | kept | `[phone]` (review fix 2) |
| "USD 5551234567" (unseparated, not starting with 0) | kept | kept as an amount: **documented limit**, test |
| Full-width plus before the number | n/a | stays; the digits are redacted: **documented limit**, test |
| "www.example.com/?q=1", "example.com/p?q=1" | kept | `[link]` (review fix 2) |
| "example.com?q=1" (bare domain, no path) | kept | kept: **documented limit**, test |

## Criteria → evidence
| Requirement | Evidence (test title or manual check) |
|---|---|
| AIB-CITE-001 | `tests/integration/retriever.test.ts`: "AIB-CITE-001 gives the customer and every live use case and event a fact ID built from its workbook id" (all 8 fixture customers, compared with the read model and the `/api/workbook` use-cases and events endpoints); "AIB-CITE-001 takes fact IDs from the id column only, so they are stable across runs and edits" |
| AIB-SAFE-003 (contract) | "AIB-SAFE-003 every fixture customer's fact sheet validates against fact-sheet.v1 with counts matching its records" (also `run_id`, `generated_at` from `now()` and from `toISOString()`); "AIB-SAFE-003 fails as a code defect, not with a half-valid sheet, when its own output breaks the contract" |
| AIB-SAFE-003 (allow-list) | "AIB-SAFE-003 holds only the fields of the contract, each traceable to the ai-data-policy allow-list" (keys compared with `fact-sheet.v1.schema.json`; every field's source looked up in the policy §2 rows); "AIB-SAFE-003 never sends the saved summary, emails, attendee names, IDs or legacy columns"; "AIB-SAFE-003 never includes soft-deleted use cases or events"; "AIB-SAFE-003 fact-sheet items have the same shape and values as the read-only tools return for the same record" |
| AIB-SAFE-003 (redaction and list) | "AIB-SAFE-003 redacts emails, phone numbers and query-string links in every free-text field and lists them"; "AIB-SAFE-003 cuts free text to 1500 characters, names to 20 and records to 200, and lists each cut as truncated"; "AIB-SAFE-003 sends dates only as YYYY-MM-DD: …"; "AIB-SAFE-003 redacts and cuts event stage, lookup names and status keys, with an exact tally"; `tests/integration/tools.test.ts`: "AIB-SAFE-003 get_event, list_events and get_use_case redact and cut event stage and lookup names, with an exact tally"; `tests/unit/redaction.test.ts`: 24 tests "AIB-SAFE-003 …" (fixed cases, separators and full-width digits, the currency rule, links with and without a scheme, the 32 767-character timing test, every string field of a fact, kept amounts and years, tally, eight "documented limit" tests, code-point cut, 20-name cap, `calendarDay`) |
| AIB-SAFE-001 | "AIB-SAFE-001 an instruction planted in a note reaches the fact sheet only inside that record's text field" ("Ignore previous instructions…" in a use case note and in event notes: found only at `use_cases[i].text` and `events[j].text`, verbatim); "AIB-SAFE-001 the delimited data block cannot be closed or extended from inside a note" (`wrapFactSheet`: one opener and one closer, no `<>&` in the JSON line, `JSON.parse` gives the sheet back). That the *draft* does not obey such text is for AIB-T03 (prompts) and the eval (023). |
| AIB-FAITH-003 | "AIB-FAITH-003 a customer with no live use cases or events gets empty lists and zero counts, nothing invented"; "AIB-FAITH-003 a customer with one use case and one event gets exactly those two records and counts of one". The draft's one-sentence and no-padding behaviour belongs to the Analyst and Writer (AIB-T03) and the eval. |
| Read-only (Article XII.3) | "AIB-SAFE-003 retrieving every customer leaves the workbook byte-identical, and the step imports no write path" (SHA-256, mtime, directory listing, in-memory sheets; imports limited to `../contracts`, `../tools`, `../../workbook`) |
| Not found (supports AIB-API-001, AIB-T05) | "AIB-API-001 an unknown customer fails with a typed not-found error before anything is built" |
| Tool backstop (review finding 6, AOPS-ORCH-005) | `tests/integration/tools.test.ts`: "AOPS-ORCH-005 refuses a result over 200 000 characters with result_too_large instead of returning it" |

Fixture changes are made only in each test's in-memory `Store` and are never saved. The 14 tests that
`tests/integration/tools.test.ts` had before this task still pass with their assertions unchanged; two tests were
added.

## Gates
| Gate | Command | Result |
|---|---|---|
| G1 | `py -I spec/scripts/spec_lint.py` | 26 specs, 544 requirements, 239 tasks, 12 agents, 6 contracts, 5 prompts, 20 hand-offs, 0 error(s) (run after writing this file) |
| G3 | `npm run lint` · `npm run typecheck` | lint: 0 errors, 8 warnings (the existing react-refresh warnings in `src/components`; `npx eslint` on the five files of this task: clean); typecheck: exit 0 (both tsconfigs) |
| G4 | `npx vitest run tests/unit/redaction.test.ts tests/integration/retriever.test.ts tests/integration/tools.test.ts` (**targeted run only, as instructed**; the full `npm test` is left to the orchestrator because parallel full runs time out) | after the review fixes: 3 files passed; 58 passed (24 + 18 + 16) |

## Open questions
- **Files outside the task's Files line** (named by the orchestrator's plan):
  - `server/ai/tools.ts`: phone, link and email redaction; `stage` and lookup names through `dataText` (`STAGE_MAX`,
    `LOOKUP_MAX`, `lookupName`); the people-cap tally; code-point cuts; `calendarDay`; and exports of `isLiveStatus`
    / `str`.
  - `tests/integration/tools.test.ts`: two added tests. One is titled AOPS-ORCH-005 (`result_too_large`, not in this
    task's Covers); the other is AIB-SAFE-003 (Stage and lookup names).
  - `tests/unit/redaction.test.ts`: new file.

  Reviewer: confirm, or have the Files line amended at close.
- **`ctx.runId`:** the plan's signature was `ctx: { store, now? }`, but fact-sheet.v1 requires `run_id`. I added
  `runId`, matching `StepContext.runId` in the 024 design. AOPS-T01 should pass its `StepContext` (plus `store`).
- **Counts when lists are cut:** above 200 records, `counts` cover every live record while the lists hold the newest
  200. The retriever spec says "`counts` match the records". I read that as "the true numbers", for AIB-FAITH-002.
  The owner or reviewer should confirm.
- **`by_status`** leaves out use cases with no status, so it may sum to less than `use_cases`. This avoids an invented
  label.
- **`value_snippet` and `stage` are free text outside `text`.** The contract names them separately and the policy
  allows both. `value_snippet` is redacted and capped at 500, `stage` at 200 (EVF-FIELD-001: Stage is free text), and
  both sit inside the `wrapFactSheet` block. The design's sentence "every free-text field inside the fact sheet's text
  fields" is therefore broader than the contract; the coordinator is handling that wording.
- **Tally semantics:** `redactions` counts every replacement in the sheet. A redacted lookup name shared by n items
  counts n times, plus once more when it is also a `by_status` key.
- **Self-validation:** the step validates its own output, and the orchestrator validates again (AOPS-ORCH-002). The
  check is cheap; drop it if the reviewer prefers one place.
- **Article II.3 (review finding 3 on AOPS-T02):** `retrieve` calls `store.fresh()` like the tools do. It reads outside
  the plugin's `exclusive` queue, so AOPS-T01's choice of store applies here too.
- **AIB-SAFE-001 and AIB-FAITH-003 are only partly covered here.** The Retriever's part is done (data placement and
  wrapping; exact records and counts). The draft-side behaviour needs AIB-T03 prompts and the 023 eval, so both should
  stay ⚠️ Partial. AIB-CITE-001 and AIB-SAFE-003 are fully covered by this task's tests.
- G5: n/a (server only; no UI).
- Not closed here (orchestrator): task status, requirement status, gap register, README dashboard, traceability.

## Review
**Verdict: pass** on the second round (AGENT-REVIEWER, 2026-11-21). Gates at the second review: G1 pass (0 errors),
G3 pass (`npm run lint` 0 errors, 8 old warnings; `npm run typecheck` clean), G4 pass for the redaction, retriever and
tools tests (58 passed). The orchestrator then pinned the round-2 limits (redaction tests now 27) and ran the full
suite (24 files, 300 passed + 1 expected fail; the one failure was in an AOPS-T01 test, fixed and re-run).

**Round 1: fail** (one major, fixed): event `stage` (free text, EVF-FIELD-001) and the lookup names reached the model
unredacted and uncapped through the shared `eventFact`. Now `stage` goes through `dataText` (cap 200) and every lookup
name through `lookupName` (cap 200), which also fixes `get_event`, `list_events` and `get_use_case`; `by_status` keys
are redacted once as keys. Round-1 minors fixed: phone separators widened (U+2010-2015, "/"), full-width digits,
currency/percent exemption only for amount-shaped numbers, scheme-less query links, bounded EMAIL and link patterns
with a linear-time test on 32 767-character cells.

**Round 2 minors** (all about documenting pattern limits honestly):
1. The link-length limit comment was wrong (a path over 2 048 characters is not redacted at all).
2. Full-width brackets and the ideographic space were documented but not pinned.
3. Two or more spaces, tab, U+2009, U+202F, U+2212 and U+FF0D split a phone number and were not documented.
4. Email length bounds leave invalid shapes partly or wholly unredacted, undocumented.
**Fixed by the orchestrator:** all four are now in the "Known limits" comments in `server/ai/tools.ts` and pinned by
three tests in `tests/unit/redaction.test.ts`; AIB-SAFE-003 carries a note pointing to them.
5. The Files line named only the retriever; amended at close (tools.ts, the three test files).

Requirement status at close: AIB-CITE-001 ✅ and AIB-SAFE-003 ✅ (with the limits note); AIB-SAFE-001 and AIB-FAITH-003
⚠️ Partial until the AIB-T03 prompts and the 023 eval. Open questions resolved: counts cover every live record while
lists keep the newest 200, and `by_status` may sum to less than `use_cases` (both now in retriever.md 1.0.1); keep
validation in both the step and the orchestrator; `ctx.runId` matches the orchestrator's StepContext.
