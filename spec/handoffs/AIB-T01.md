---
contract: task-handoff.v1
task: AIB-T01
agent: AGENT-IMPLEMENTER
covers: [AIB-CITE-001, AOPS-ORCH-002]
files_changed: [server/ai/contracts.ts, tests/unit/contracts.test.ts]
tests: [tests/unit/contracts.test.ts]
gates: {G1: pass, G3: pass, G4: pass, G5: n/a}
verdict: pass
reviewer: AGENT-REVIEWER
---
# Hand-off: AIB-T01 zod contracts in `server/ai/contracts.ts`, checked against `spec/contracts/*.schema.json`

## What changed
New `server/ai/contracts.ts` has one exported zod schema per contract file in `spec/contracts/`, each with an
inferred type: `FactSheetV1Schema`, `AnalystToWriterV1Schema`, `WriterToCriticV1Schema`, `CriticVerdictV1Schema`,
`BriefDraftV1Schema` and `TaskHandoffV1Schema`. It also has a `CONTRACTS` map keyed by `<name>.v<version>`
(the same string as each contract's `contract` const) and `validateContract(id, value)`. That function returns
`{ ok: true, value } | { ok: false, errors }`.

Every object is `.strict()`, and the schemas have no defaults, transforms or coercion. So a step output is either
accepted as it is (deep-equal to the input) or rejected with no value, and it is never stripped or repaired
(AOPS-ORCH-002). Each fact ID field is checked against its record kind's pattern (`CU-`, `UC-` or `EV-` followed by
digits). Citations accept any of the three kinds (AIB-CITE-001).

Each error string has the form `<path>: <rule>`. The text is built only from the schema side of the zod issue, never
from the value received. Path segments that are not property-name-like, such as a `by_status` key with spaces, are
shown as `[?]`. Duplicate lines are removed, and the list stops at 20 lines plus a `(N more errors)` line. This keeps
free text out of traces and logs (Article III).

`maxLength` counts code points, as JSON Schema does; zod's `.max()` would count UTF-16 units. `format: date` and
`date-time` are enforced in RFC 3339 form: the date must exist on the calendar, and a date-time needs seconds and an
offset written `Z` or `+hh:mm` / `-hh:mm`. zod's own `datetime()` also accepts times without seconds and offsets
without the colon.

`tests/unit/contracts.test.ts` adds no dependency and does not touch `package.json`. It compares each zod schema with
its JSON Schema file in two ways:
1. **Structure.** Walking the zod schema and the JSON Schema together: the same properties, the same required set,
   the same strictness (`additionalProperties: false` matches `.strict()`), the same nullability, and arrays and maps
   in the same places.
2. **Behaviour.** A small reference validator handles exactly the keywords used in `spec/contracts/` and throws on any
   other keyword. Starting from one valid sample per contract, the test generates variants:
   - each required property removed, and each optional property removed
   - an extra property
   - wrong JSON types, and `null`
   - every enum value and a value outside the enum
   - padded strings and other near misses for each pattern, and bad keys for `propertyNames`
   - `maxLength` boundaries, in ASCII and in astral code points
   - `minItems` / `maxItems`, `minimum` / `maximum` and format boundaries

   zod must give the same accept/reject answer as the reference validator on every variant. Variants built to have a
   known answer also check the reference validator itself.

Red check: I added three deliberate faults to `contracts.ts`: `customer` not strict, `point` using `.max(400)`, and
the fact-ID pattern without `$`. The run gave 6 failed and 15 passed, naming each fault. I then reverted the faults,
and all 21 tests pass.

## Criteria → evidence
| Requirement | Evidence (test title or manual check) |
|---|---|
| AIB-CITE-001 (fact ID shape per record kind) | `tests/unit/contracts.test.ts`: "AIB-CITE-001 the fact sheet accepts only CU-, UC- and EV- fact IDs built from a numeric id, each on its own record kind" |
| AIB-CITE-001 (every record has a fact ID) | "AIB-CITE-001 every record in the fact sheet must carry its fact ID" |
| AIB-CITE-001 (citations downstream use the same IDs) | "AIB-CITE-001 citations in later hand-offs accept fact IDs of any record kind and nothing else" |
| AOPS-ORCH-002 (a schema for every contract) | "AOPS-ORCH-002 has one zod schema per contract file in spec/contracts, keyed by name and version" |
| AOPS-ORCH-002 (validated against the full contract) | For each of the 6 contracts: "AOPS-ORCH-002 `<id>`: same properties, required set, strictness and nullability as the JSON Schema" and "AOPS-ORCH-002 `<id>`: zod accepts and rejects exactly what the JSON Schema accepts and rejects" (12 tests) |
| AOPS-ORCH-002 (never silently repaired) | "AOPS-ORCH-002 returns a valid hand-off unchanged: nothing added, stripped or coerced"; "AOPS-ORCH-002 rejects an invalid hand-off with errors and no value, never repairing it" |
| AOPS-ORCH-002 (checked against the step's own contract) | "AOPS-ORCH-002 checks a hand-off against the contract it names, not any contract" |
| AOPS-ORCH-002 / Article III (errors without values) | "AOPS-ORCH-002 error strings name the path and the rule but never a field value"; "AOPS-ORCH-002 caps the error strings and counts the rest" |

## Gates
| Gate | Command | Result |
|---|---|---|
| G1 | `py -I spec/scripts/spec_lint.py` | 26 specs, 544 requirements, 239 tasks, 12 agents, 6 contracts, 5 prompts, 17 hand-offs, 0 error(s) (run after writing this file) |
| G3 | `npm run lint` · `npm run typecheck` | **fail, outside this task's files.** lint: 1 error, 8 warnings. The error is `react-hooks/rules-of-hooks` at `tests/integration/tools.test.ts:333`, a file from the parallel AOPS-T02 work. The 8 warnings are the existing react-refresh warnings in `src/components`. typecheck: 1 error, TS2550 `Object.hasOwn` at `server/ai/tools.ts:460` (AOPS-T02). This task's files are clean: `npx eslint server/ai/contracts.ts tests/unit/contracts.test.ts` exits 0, `tsc -p tsconfig.app.json` reports no error in them, and `tsc -p tsconfig.node.json` (strict; includes `server/`) is clean |
| G4 | `npx vitest run tests/unit/contracts.test.ts` (targeted run by instruction; the orchestrator runs the full `npm test`) | 1 file, 21 passed |
| G5 | manual UI check | n/a: server code only, no UI |

## Open questions
- **G3 must be re-run** once AOPS-T02 is fixed (`Object.hasOwn` needs lib ES2022, which `tsconfig.app.json` does not
  have; `tests/integration/tools.test.ts` calls a function named `use…` in a loop). Neither file belongs to this
  task. Owner: the AOPS-T02 implementer or the orchestrator.
- **Full G4:** only the targeted file was run, as instructed. The orchestrator runs `npm test`.
- **Format assertion (reviewer to confirm):** JSON Schema 2020-12 treats `format` as an annotation by default. Here it
  is enforced for `generated_at`, `expected_launch_date` and `event_date`, in line with the contracts README ("validates
  the response against the full schema with zod"). If the Retriever (AIB-T02) emits dates in another form, those runs
  will fail validation.
- **AIB-CITE-001 scope:** this task enforces the fact ID shape and record kind in the contract. Building the ID from
  the workbook `id` is the Retriever's job (AIB-T02), and is tested there.
- **Error-string paths:** a record key that looks like a property name (for example a `by_status` status such as
  `Live`) is shown in the path. Other keys are masked as `[?]`. Unknown property names are reported, because they are
  structure rather than field values. Reviewer to confirm this meets the observability rule.
- Not closed here (orchestrator): task status, requirement statuses, gap register, README dashboard, traceability.

## Review
**Verdict: pass** (AGENT-REVIEWER, 2026-11-20). Gates at review: G1 pass (0 errors), G3 pass (`npm run lint` 0 errors,
8 old warnings; `npm run typecheck` clean; the AOPS-T02 errors noted above were fixed by that task), G4 pass for
`npx vitest run tests/unit/contracts.test.ts` (21 passed); the full suite is run by the orchestrator before commit.

Findings (all minor):
1. AOPS-ORCH-002: `validateContract` returned zod's parsed copy, and zod's record parser drops a `__proto__` map key,
   so a valid hand-off was not always returned unchanged. **Fixed by the orchestrator:** the caller's own value is now
   returned on success (the schemas have no transforms), with a variant in the "returns a valid hand-off unchanged" test.
2. Article III / AOPS observability: error paths print record-map keys and unknown property names that look like
   identifiers. Acceptable now (`by_status` keys come from the status lookup table and nothing traces errors yet).
   **Carried to AOPS-T01**, which owns the trace writer: mask map keys and report unknown properties as a count.
3. Hand-off G3 was stale (fail → pass); updated with this review.
4. AIB-CITE-001 and AOPS-ORCH-002 are only partly met by this task (ID built from the workbook `id` → AIB-T02;
   orchestrator validation before passing on → AOPS-T01); they stay ⚠️ Partial at close.
5. `@anthropic-ai/sdk` in package.json is not this task's change; it is assigned to AOPS-T01 (client factory).

Open questions: (2) keep enforcing `format: date`/`date-time`; AIB-T02 must emit `YYYY-MM-DD` or `null` and
`toISOString()` for `generated_at`, and spec/contracts/README.md gets a note that `format` is asserted (RFC 3339,
upper-case `T`/`Z`, seconds required). (4) see finding 2.
