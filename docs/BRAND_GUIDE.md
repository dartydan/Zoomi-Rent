# Zoomi Brand Guide

Reference for brand identity, visual system, and voice. Use existing design tokens; do not introduce new colors, gradients, or variants without approval.

---

## Brand & Product

- **Name:** Zoomi (rent.zoomi.co)
- **Product:** Washer and dryer rental for tenants — Standard and Premium plans, month-to-month, professional installation and support.
- **Positioning:** Simple, reliable, no long-term contracts. “Relax, no headache.”

---

## Color Palette

Colors are defined in `app/globals.css`. Use CSS variables only.

### Light mode

| Role        | Hex       | Use                    |
|------------|-----------|------------------------|
| Background | `#e7e5e4` | Page and surface base  |
| Foreground | `#1e293b` | Primary text           |
| Primary    | `#6366f1` | CTAs, links, focus ring |
| Primary fg | `#ffffff` | Text on primary        |
| Secondary  | `#d6d3d1` | Secondary surfaces     |
| Muted      | `#e7e5e4` | Muted backgrounds      |
| Muted fg   | `#6b7280` | Secondary text         |
| Accent     | `#f3e5f5` | Hover/highlight        |
| Destructive| `#ef4444` | Errors, destructive actions |
| Border     | `#d6d3d1` | Borders, dividers      |

### Dark mode

| Role        | Hex       |
|------------|-----------|
| Background | `#1e1b18` |
| Foreground | `#e2e8f0` |
| Primary    | `#818cf8` |
| Card       | `#2c2825` |
| Border     | `#3a3633` |

Use `var(--primary)`, `var(--foreground)`, etc. in code. Do not add new hex values or gradients.

---

## Typography

| Use    | Font stack                          | Variable        |
|--------|-------------------------------------|-----------------|
| Sans   | Plus Jakarta Sans, sans-serif        | `--font-sans`   |
| Serif  | Lora, serif                         | `--font-serif`  |
| Mono   | Roboto Mono, monospace              | `--font-mono`   |

Body and UI: `--font-sans`. Serif and mono only where explicitly needed (e.g. editorial, code).

---

## Radius & Shadow

- **Base radius:** `1.25rem` (`--radius`). Components use `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl` as defined in the theme.
- **Shadows:** Use theme variables (`--shadow-sm` through `--shadow-2xl`). No custom shadow values.

---

## UI Principles

- **Simple and dense.** Minimal decoration, compact layouts. No decorative gradients or motion.
- **Implement, don’t design.** Build to spec; don’t invent new layouts or treatments.
- **Components.** shadcn/ui + Tailwind only. No new Button/Card/input variants without approval.
- **Accessibility.** Semantic HTML, visible focus states, ARIA where needed, keyboard and screen reader friendly. Minimum touch target ~44px where applicable.

---

## Voice & Tone

- **Clear and direct.** Short sentences, no jargon.
- **Helpful, not salesy.** Explain benefits simply (e.g. installation, month-to-month, AutoPay savings).
- **Consistent terms.** Use “Standard” and “Premium” for plans; “rent.zoomi.co” or “Zoomi” as appropriate.

---

## Do Not

- Introduce new colors or gradients.
- Add new typography (weights, sizes, or font families) outside the existing scale.
- Create new component variants (e.g. new button styles) without explicit approval.
- Use decorative animations or motion beyond existing utilities.
