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
| — | `parent_id`, `premium_credit` (solution), `deleted: false` |

## Planned design — edit save (UCF-EDIT-002, UCF-EDIT-004)
1. In `submit`, when `row` is set, build the same payload plus `id: row.id`, `target_users`, `target_credits_consumed`,
   `target_api_calls` from `row`.
2. Use the same mutation (`useSaveUseCase`); success toast "Use case updated".
3. Remove `NOT_WIRED`. Server already updates by `id` and appends status history when the status changes.

## Planned design — duplicate warning (UCF-ADD-008)
Extract the bulk form's duplicate check into `src/lib/useCaseChecks.ts` (`findDuplicate(existing, candidate, excludeId?)`)
and show an amber note above the footer when it matches (excluding the row being edited).

## Error handling
Lookup errors under each field; save error banner; dialog close blocked while pending.

## Constitution check
| Article | Compliance |
|---|---|
| II | Edit not persisted (UI pretends to save but tells the user it did not). ⚠️ |
| IV | Cascades and required checks. ✅ |
| V | Pending/success/error feedback. ✅ |
| IX | Hooks + lib. ✅ |

**Exceptions:** Article II for edit mode until UCF-T07/T08 are done.
