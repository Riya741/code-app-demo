# Design — Design System and Shared Components

## Files
`src/index.css` (tokens, base, Quill/scrollbar styles) · `tailwind.config.ts` (scale, colour mapping, plugins) ·
`components.json` (shadcn: default style, slate, CSS variables) · `src/components/customers/{Panel,Combobox,FormBits,ConfirmDelete,ExportButton}.tsx` ·
`src/components/ui/*`.

## Colour tokens (HSL)
| Token | Light | Dark |
|---|---|---|
| background | 214 25% 97% | 228 35% 7% |
| foreground | 224 40% 12% | 220 30% 96% |
| card / popover | 0 0% 100% | 228 30% 10% |
| primary | 215 50% 28% | 210 60% 68% |
| secondary / muted | 226 40% 95% | 228 25% 16% |
| muted-foreground | 224 12% 46% | 224 15% 65% |
| accent | 213 35% 94% | 217 25% 20% |
| destructive | 0 84% 60% | 0 62% 45% |
| border / input | 226 30% 90% | 228 25% 18% |
| ring | 215 45% 40% | 210 55% 60% |
| title | 215 62% 26% | 205 80% 78% |

## Surfaces
Page wash (radial gradients) · Panel (card, `rounded-2xl`, soft shadow, slate header strip) · Executive Summary
(stone palette; a full-width collapsible band from LAY-T09, CR-20261120-1) · Top bar (75% background, blur) · Dialogs (shadcn).

## Component APIs
```ts
Combobox({ options: Option[], value: string[], onChange, multiple?, placeholder?, disabled?, loading?, error?, invalid?, emptyText?, className? })
Field({ label, required?, hint?, className?, children })
ConfirmDelete({ open, title, description, pending, error?, onCancel, onConfirm })
ExportButton({ onClick, disabled?, title? })
Panel({ title, count?, badges?, headerRight?, className?, bodyClassName?, headerClassName?, children })
```

## Planned changes
- **DS-COMP-004:** move `Pill` (+ tone maps) and `statusPill` to `src/components/customers/Pill.tsx`; reuse in both files.
- **DS-MOTION-003:** delete unused colour groups and `soft-gradient` from `tailwind.config.ts`.

## Constitution check
| Article | Compliance |
|---|---|
| V | Messages catalog maintained. ✅ |
| VI | Tokens with dark values; shared components. ✅ |
| VIII | Duplicate `Pill`, unused palette. ⚠️ |
