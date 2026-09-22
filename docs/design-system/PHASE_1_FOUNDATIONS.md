# Phase 1 — design system foundations

What this phase changed. Not a second source of truth; see [README.md](./README.md) for the living inventory.

## In scope (done)

- Expanded `@schoolos/ui` colour tokens with semantic surfaces, text roles, and status colours mapped from `STATUS_CHIPS`.
- `createTheme` still merges branding API fields over fallbacks, then emits CSS variables for **all** colour tokens (legacy + new).
- Status contract gained `STATUS_CHIP_SEMANTIC` (role mapping). Chip **names** are unchanged.
- Web `globals.css` + Tailwind theme, and mobile `global.css` + NativeWind theme, now share the same `--color-*` / `--font-*` / `--text-*` names.
- Design-system docs added under `docs/design-system/`.

## Out of scope (unchanged)

- Shared Button/Input implementations in `packages/ui`
- Domain screen redesigns
- Dark mode
- Library, transport, EMIS, or other deferred modules

## Files

| Area | Path |
|---|---|
| Brand + semantic colours | `packages/ui/src/tokens/colors.ts` |
| Status contract | `packages/ui/src/contracts/Status.ts` |
| Theme + CSS vars | `packages/ui/src/theme/createTheme.ts`, `cssVars.ts` |
| Web fallbacks | `apps/web/app/globals.css`, `apps/web/tailwind.config.ts` |
| Mobile fallbacks | `apps/mobile/global.css`, `apps/mobile/tailwind.config.js` |
| Tests | `packages/ui/src/theme/createTheme.test.ts` |

## Compatibility

Existing keys remain: `theme.colors.primary`, `background`, `ink`, `success`, `warning`, `danger`, and `--color-background`. `bg-canvas` now reads `--color-canvas` (same value as background after `createTheme`).
