# SchoolOS design system

Phase 1 foundations: shared tokens and contracts in `@schoolos/ui`, consumed by web (Tailwind / shadcn-style) and mobile (NativeWind). Screens and full component kits are not rebuilt here.

## Principles

Swiss / International: clear hierarchy, functional layout, no decoration without purpose.

- **One palette.** Tenant branding from `GET /public/tenants/:slug/branding` is the only brand source. Fallbacks exist so UI can render before branding loads. Do not invent a second colour system.
- **Tokens, not shared views.** `@schoolos/ui` is platform-agnostic: tokens, contracts, `createTheme`. No React DOM or React Native components in `packages/ui`.
- **Permissioned product, not a generic SaaS kit.** Components exist to serve approved SchoolOS flows (attendance, fees, reports, etc.). Do not add library, transport, or EMIS chrome.
- **Tamil is first-class.** Body/display fonts come from the allowlist; Tamil uses Noto Sans Tamil (or another allowlisted Tamil face) at 1.8 line-height on Tamil text.
- **4px spacing.** Spacing scale is 0, 4, 8, 12, 16, 20, 24, 32, 40, 48.

## Architecture

```
                 packages/ui
         tokens + contracts + createTheme
                      │
         ┌────────────┴────────────┐
         │                         │
     apps/web                 apps/mobile
  Next.js + Tailwind       Expo + NativeWind
  shadcn-style (Radix      RN primitives
  Slot, CVA, Lucide)       (AppButton / AppText)
```

Runtime:

```
GET branding → createTheme(branding)
  → cssVars applied on web (documentElement)
  → colors / typography on mobile (BrandingProvider)
  → same CSS custom property names in web + NativeWind theme
```

Dark mode is **not** implemented. Tokens are light-canvas. A future dark theme would add a second resolved map, not a parallel product palette.

## Token inventory

### Brand (tenant-overridable)

| Token | Fallback | CSS var |
|---|---|---|
| `primary` | `#0B3A6E` | `--color-primary` |
| `primaryDark` | `#082A50` | `--color-primary-dark` |
| `accent` | `#E8A317` | `--color-accent` |
| `background` | `#F4F7FB` | `--color-background` |
| `success` | `#16A34A` | `--color-success` |
| `warning` | `#F59E0B` | `--color-warning` |
| `danger` | `#DC2626` | `--color-danger` |

These seven fields match `BrandingTheme` on the branding API.

### Surfaces

Derived after brand merge. `canvas` follows tenant `background`. Other surfaces are neutrals that sit on canvas/ink — not a competing brand.

| Token | Fallback | CSS var |
|---|---|---|
| `canvas` | `#F4F7FB` (same as background) | `--color-canvas` |
| `surface` | `#FFFFFF` | `--color-surface` |
| `surfaceMuted` | `#E8EEF5` | `--color-surface-muted` |
| `border` | `#D6DEE8` | `--color-border` |
| `borderStrong` | `#94A3B8` | `--color-border-strong` |

### Text

| Token | Fallback | CSS var |
|---|---|---|
| `ink` | `#0F172A` | `--color-ink` |
| `inkMuted` | `#475569` | `--color-ink-muted` |
| `inkInverse` | `#FFFFFF` | `--color-ink-inverse` |
| `link` | primary | `--color-link` |

### Typography

Fallbacks: Plus Jakarta Sans (display + body), Noto Sans Tamil. Scale: 12 / 14 / 16 / 18 / 22 / 28. CSS vars: `--font-display`, `--font-body`, `--font-tamil`, `--text-xs` … `--text-display`. Families must stay on `FONT_ALLOWLIST`.

### Spacing, radius, shadows

Exported from `@schoolos/ui` as JS tokens (`spacing`, `radius`, `shadows`). Not currently mirrored as CSS vars.

## Status vocabulary

`STATUS_CHIPS`: `present` | `absent` | `late` | `holiday` | `feeDue` | `published`.

Each chip maps to a semantic role (`STATUS_CHIP_SEMANTIC`). `createTheme` resolves that role to a hex from the tenant brand (or fallbacks).

| Chip | Role | CSS var |
|---|---|---|
| present | success | `--color-status-present` |
| absent | danger | `--color-status-absent` |
| late | warning | `--color-status-late` |
| holiday | inkMuted | `--color-status-holiday` |
| feeDue | warning | `--color-status-fee-due` |
| published | primary | `--color-status-published` |

Attendance letters P / A / L / H correspond to present / absent / late / holiday. Do not add extra chip names in screens without updating this contract.

## Do / don’t

**Do**

- Resolve colour through `createTheme` or CSS vars it emits.
- Use semantic names (`canvas`, `inkMuted`, `status.present`) in new work.
- Keep web Button/Input as shadcn-style copies of contracts; keep mobile primitives local.

**Don’t**

- Put DOM or React Native components in `packages/ui`.
- Hardcode Inter or system UI as the product typeface.
- Copy St. Joseph branding, crest, or school name.
- Introduce Material / Chakra / gluestack as a foundation.
- Treat teacher-only users as admins because a colour token exists.

## How branding works

1. Client loads `GET /public/tenants/:slug/branding`.
2. `createTheme(payload)` spreads fallbacks, then overwrites the seven brand fields, sets `canvas` from `background`, sets `link` from `primary`, and remaps status chips.
3. Web: `applyBrandingToDocument` writes every `cssVars` entry onto `document.documentElement`. Tailwind colour keys (`bg-canvas`, `text-ink-muted`, `bg-status-present`, …) read those vars.
4. Mobile: `BrandingProvider` holds `createTheme` output. Screens use `theme.colors.*`. NativeWind `theme.extend.colors` uses the **same var names** as web (`var(--color-primary)`, …) with matching `:root` fallbacks in `apps/mobile/global.css`.

Ink, surfaces (except canvas), and typography scale stay on shared fallbacks unless a later branding API field is approved.

## Phase 2 preview (primitives only)

Contracts already named; implement per platform, do not share views:

- Button (`primary` | `secondary` | `ghost` | `danger`)
- Input (+ empty / filled / error)
- Text / AppText (`display` | `title` | `body` | `caption` | `label`)
- Badge / StatusChip (`STATUS_CHIPS`)
- Label
- Card / surface
- Dialog
- Select
- Table (web)
- Skeleton
- Toast / Feedback

No domain screen redesign in Phase 2 primitives work.
