# Design — Add / Edit Use Case

## Overview
`UseCaseForm` is a controlled dialog mounted only while open. It reads lookups through hooks and saves through
`useSaveUseCase`.

## Components and files
| File | Role |
|---|---|
| `src/components/customers/UseCaseForm.tsx` | Dialog, state, option building, validation, submit; exports helpers `num`, `idList`, `splitIds`, `plain` |
| `src/components/customers/Combobox.tsx`, `FormBits.tsx`, `RichTextField.tsx` | Controls |
| `src/hooks/useLookups.ts` | Lookup queries (10-min cache) |
| `src/hooks/useParentActivity.ts` | `useSaveUseCase(parentId)` |
| `src/lib/lookups.ts` | `detectKey`, `Option` |

## Props
```ts
UseCaseForm({ parentId: number, customerKeys: number[], existing: UseCaseRow[], row?: UseCaseRow, onClose })
```

## State
One `string[]` per pick-list (`subsidiary`, `department`, `stakeholder`, `solution`, `useCaseType`, `status`,
`contentTypes`, `personnel`), strings for `launch`, `value`, `note`, and `touched` (set on first submit).

## Lookup wiring
| Hook | Enabled |
|---|---|
| `useSubsidiaries(customerKeys)` | always |
| `useDepartments(num(subsidiary))` | subsidiary chosen |
| `useStakeholders(num(department))` | department chosen |
| `useSolutions`, `useSolutionUseCaseTypes`, `useSolutionStatuses`, `useContentTypes`, `usePersonnel` | always |

## Payload mapping
| Form | `UseCaseInput` |
|---|---|
| subsidiary/department/stakeholder/solution/useCaseType/status | `num([...])` |
| launch | `expected_launch_date` or undefined |
| contentTypes / personnel | `idList()` comma string |
| value | trimmed or undefined |
| note | as-is if non-blank |
| — | `parent_id`, `premium_credit` (from the solution; on edit, the row's stored flag whenever the solution's flag is unknown), `deleted: false` |

## Implemented — edit save (UCF-EDIT-002, UCF-EDIT-004; UCF-T07, UCF-T08, 2026-11-18)
1. In `submit`, when `row` is set, build the same payload plus `id: row.id`, `target_users`, `target_credits_consumed`,
   `target_api_calls` from `row`.
2. Use the same mutation (`useSaveUseCase`); success toast "Use case updated".
3. Remove `NOT_WIRED`. Server already updates by `id` and appends status history when the status changes.
4. `premium_credit`: from the selected solution; when that is unknown (lookup loading or failed, solution not listed,
   blank cell) an edit keeps the row's stored flag, so a full-replace write never erases it (review finding, UCF-T07).
5. Values an edit normalises, accepted by the owner on 2026-11-20 (D4, CR-20261120-1) and now requirements:
   `value_snippet` HTML is saved as plain text (UCF-EDIT-005), `expected_launch_date` is saved as YYYY-MM-DD
   (UCF-EDIT-006), and `premium_credit` comes from the known solution, else the stored flag (UCF-EDIT-007).
   Hand-off questions: [UCF-T07](../../handoffs/UCF-T07.md) (premium credit), [EVF-T06](../../handoffs/EVF-T06.md) (same pattern for events).

## Link rows on edit (Article II.4, constitution v1.1.1)
An edit posts the full contributor and content-type id lists; the server replaces this use case's own link rows
(API-WRITE-004). Article II.4 as amended by CR-20261120-1 allows exactly this, so the earlier exception is closed.

## Planned design — duplicate warning (UCF-ADD-008)
Extract the bulk form's duplicate check into `src/lib/useCaseChecks.ts` (`findDuplicate(existing, candidate, excludeId?)`)
and show an amber note above the footer when it matches (excluding the row being edited).

## Error handling
Lookup errors under each field; save error banner; dialog close blocked while pending.

## Constitution check
| Article | Compliance |
|---|---|
| II | Edits persist through the API (UCF-T07/T08). An edit updates the use case in place and replaces its own link rows (API-WRITE-004), as Article II.4 (v1.1.1) allows. ✅ |
| IV | Cascades and required checks. ✅ |
| V | Pending/success/error feedback. ✅ |
| IX | Hooks + lib. ✅ |
| X | Edit normalisation written as UCF-EDIT-005..007; tests named after them in UCF-T11. ⚠️ until UCF-T11 |

**Exceptions:** none. (Article II.4 was an exception until the owner's decision of 2026-11-20; closed by CR-20261120-1, API-T13.)
