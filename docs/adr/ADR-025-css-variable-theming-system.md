# ADR-025: CSS Variable Theming System (shadcn/ui Pattern)

## Status
Accepted

## Context
BafatorioApp's dark mode used Tailwind's `dark:` prefix on every element. This approach had 79% coverage (150/189 components), with 6 fully broken components using hardcoded light colors. The pattern doesn't scale — every element needs duplicate classes, missing `dark:` variants are easy to introduce, and changing a color requires find/replace across 150+ files.

## Decision
Adopt the shadcn/ui CSS custom properties pattern:
- Semantic color tokens defined as CSS variables in `:root` (light) and `.dark` (dark) in `src/index.css`
- Variables mapped in `tailwind.config.js` so Tailwind classes reference them
- Components use single semantic classes (e.g., `bg-card text-card-foreground`) — no `dark:` needed
- Existing shade scales (primary-50 through primary-950) preserved alongside new tokens

### Token Reference
See `docs/plans/2026-03-15-dark-mode-css-variables-design.md` for the full token table.

### Migration Pattern
```jsx
// Before (verbose, error-prone)
<div className="bg-white dark:bg-background-800 text-text-700 dark:text-text-200 border-background-200 dark:border-background-700">

// After (clean, auto-switches)
<div className="bg-card text-card-foreground border-border">
```

### Key Tokens
| Class | Purpose |
|-------|---------|
| `bg-background` / `text-foreground` | Page-level |
| `bg-card` / `text-card-foreground` | Cards, panels, surfaces |
| `bg-popover` / `text-popover-foreground` | Dropdowns, tooltips |
| `bg-muted` / `text-muted-foreground` | Subtle backgrounds, secondary text |
| `bg-accent` / `text-accent-foreground` | Highlighted/active items |
| `bg-primary` / `text-primary-foreground` | Primary actions |
| `bg-destructive` / `text-destructive-foreground` | Destructive actions |
| `bg-success` / `text-success-foreground` | Success states |
| `bg-warning` / `text-warning-foreground` | Warning states |
| `bg-sidebar` / `text-sidebar-foreground` | Sidebar |
| `border-border` | Default borders |
| `border-input` | Form input borders |
| `ring-ring` | Focus rings |

### Component Conventions

**Modal (`src/Components/UI/Modal.jsx`):**
- Modal component provides visual container: `bg-card rounded-2xl shadow-2xl overflow-hidden`
- Backdrop: `bg-black/50 backdrop-blur-sm`
- Children should NOT wrap content in `<Card>` — the Modal already provides the surface
- Use `Modal.Header`, `Modal.Body`, `Modal.Footer` for structure

**Card (`src/Components/UI/Card.jsx`):**
- Default variant: `bg-card text-card-foreground`
- `bordered` defaults to `true` — all cards have `border border-border`
- Use props for configuration (`elevated`, `padded`, `bordered`) — avoid className overrides
- Dark mode shadows are minimal (`shadow-dark-card`, `shadow-dark-elevated`)

**Dynamic color badges (`StatusBadge`, `RoleBadge`):**
- Use `.color-badge` CSS class with inline CSS variables (`--badge-dot`, `--badge-light-bg`, etc.)
- CSS handles light/dark switching via `.dark .color-badge` selector
- RoleBadge: minimal style (dot + `text-muted-foreground`, no background)

## Consequences
- Components become theme-agnostic — write once, works in all modes
- Both old (`dark:` prefix) and new (CSS variable) systems coexist during migration
- Shade scales (primary-50 to primary-950) remain for fine-grained styling
- CSS variables use space-separated RGB channels (e.g., `--primary: 64 105 255`) so Tailwind opacity modifiers (`bg-card/50`, `text-foreground/60`) work natively
- Shadow tokens still require `dark:` prefix (to be addressed in future phase)
