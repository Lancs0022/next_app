---
trigger: glob
globs: ["**/*.tsx", "**/*.jsx", "**/*.css"]
---

# UI Spacing & Layout Rules — CRITICAL REFERENCE

These rules are **non-negotiable** when building or modifying any UI component.
Spacing is the #1 quality differentiator between a polished app and a broken one.

## 0. NEVER Use Inline Pixels — Use Tailwind Classes

**FORBIDDEN:**
```tsx
// ❌ Rigid, non-responsive, unmaintainable
<div style={{ padding: '40px', marginTop: '24px' }}>
```

**CORRECT:**
```tsx
// ✅ Responsive, maintainable, consistent
<div className="p-4 md:p-10 mt-6">
```

**Only use `style={{ }}` for:**
- Colors not in the theme palette (and even then, prefer extending the theme)
- Dynamic values computed at runtime
- `animation` / `transition` properties that Tailwind can't express

**Tailwind spacing grid** (multiples of 4px):
| Class | px | Use case |
|-------|----|----------|
| `p-1` | 4px | Micro gaps |
| `p-2` | 8px | Tight spacing |
| `p-3` | 12px | Medium-tight |
| `p-4` | 16px | Default comfortable |
| `p-5` | 20px | Between groups |
| `p-6` | 24px | Section padding |
| `p-8` | 32px | Card padding (desktop) |
| `p-10` | 40px | Generous card padding (desktop) |
| `p-12` | 48px | Hero / large sections |

## 1. Card / Container Padding

- Desktop: `p-8` or `p-10` (32–40px).
- Mobile: `p-4` or `p-6` (16–24px).
- **Always responsive:** `p-4 md:p-10`
- **NEVER** let any child element touch the card edge.

## 2. Form Inputs

- Height: `h-11` (44px).
- Internal horizontal padding: `px-4` or `px-5` (16–20px).
- Label-to-input gap: `mb-2` (8px).
- Between input groups: `mb-5` (20px).
- Inputs must **never touch the container edges** — parent `p-4 md:p-10` handles that.

## 3. Buttons

- Height: `h-12` (48px).
- Margin above button (from last input): `mt-7` (28px) or `mt-6` (24px).
- Margin below button (to next section): `mb-8` (32px).
- Buttons inherit container padding — no extra horizontal margin needed.

## 4. Logo / Header Elements

- Logo from card top: `pt-12` (48px) or responsive `pt-8 md:pt-12`.
- Logo-to-title: `mb-6` (24px).
- Title-to-subtitle: `mb-2` (8px).
- Subtitle-to-form: `mt-8` (32px).

## 5. Toast Notifications

- Internal padding: `p-4` (16px).
- Min-width: `min-w-[300px]`.
- Gap between stacked toasts: `gap-2` (8px).
- Container offset from top: `top-20` (80px, below topbar).
- Container offset from right: `right-6` (24px).

## 6. Sidebar

- Nav container: `py-6 px-3` (24px/12px).
- Nav items: `px-4 py-3` (16px/12px).
- Between items: `space-y-2` (8px).
- Nested children: `px-6 py-2` (24px/8px).

## 7. Topbar

- Height: `h-16` (64px).
- Horizontal padding: `px-4 md:px-6`.
- Gap between actions: `gap-4`.

## 8. User Overlay / Modals

- Panel width: `w-80` (320px).
- Header padding: `p-4`.
- Action buttons container: `p-2`, buttons: `px-3 py-2`.
- Divider margins: `my-2`.

## 9. General Spacing Principles

- **Tailwind grid first**: Use Tailwind utility classes for all spacing.
- **Responsive by default**: Always pair desktop values with mobile (`p-4 md:p-10`).
- **NEVER use 0 margin/padding** between distinct UI sections.
- **NEVER let text, inputs, or buttons touch container edges.**
- **8px visual grid**: Most spacing should be multiples of 8px.
- When in doubt, **add more space**.

## 10. Verification Checklist

Before considering any UI component done:
- [ ] No element touches the card/container edge on any side
- [ ] No `style={{ padding: '...' }}` or `style={{ margin: '...' }}` — Tailwind classes only
- [ ] Inputs have visible internal padding (`px-4` or more)
- [ ] Buttons have adequate margin above and below
- [ ] Logo/header has top padding separating it from card edge
- [ ] Responsive variants exist (`p-4 md:p-10`, not just `p-10`)
- [ ] The design looks breathable on both mobile and desktop viewports
