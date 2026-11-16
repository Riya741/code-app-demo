# Design — Accessibility

## Approach
Rely on Radix primitives (dialog, popover, dropdown, checkbox, alert-dialog) for focus management and roles; fix gaps
in custom components.

## Planned changes
| Gap | Design |
|---|---|
| A11Y-NAME-003 | See customer-search design (option ids + `aria-activedescendant`). |
| A11Y-KEY-001 | See data-grid design (chevron button with `aria-expanded` / `aria-controls`). |
| A11Y-FORM-001 | `Field` generates an id with `useId()`, renders `<label htmlFor={id}>`, and passes `id` to its child via a render prop or context; `Combobox` accepts `id` and `aria-labelledby`. |
| A11Y-FORM-002 | `Field` accepts `error`; renders `<p id={id+"-err"}>`; child gets `aria-invalid` and `aria-describedby`. Combobox's own error text moves into `Field`. |
| A11Y-SEE-001 | Audit with axe DevTools in both themes; raise muted-foreground lightness or font size where < 4.5:1. |

## Verification
- Automated: `@axe-core/playwright` scan in E2E (QA-T04) for landing, workspace and each dialog, in both themes.
- Manual: keyboard-only pass of the smoke test; NVDA on Windows.

## Constitution check
| Article | Compliance |
|---|---|
| VII | Partially compliant; exit plan A11Y-T02..T06. ⚠️ |

**Exceptions:** Article VII gaps accepted until the tasks below are done.
