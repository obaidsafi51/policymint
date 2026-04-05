# PolicyMint — DESIGN.md

## Design system specification: "Mint Sentinel"

Source of truth for the PolicyMint operator console. Merged from the Stitch project export and the Design System v1.0 document. Every component, token, and rule referenced here is authoritative. If code contradicts this file, the code is wrong.

Optimized for light and dark modes, data-dense trading dashboards, and hackathon demo presentations. Kraken-inspired palette with mint-teal brand identity.

---

## 1. Color palette

Six ramps, seven stops each. Use the 50 stop for light fills, 400 for mid-tone accents, 800–900 for text on colored backgrounds.

### Brand mint — primary

Identity color. Primary CTAs, active nav states, focus rings, reputation score, brand moments.

| 50 | 100 | 200 | 400 | 600 | 800 | 900 |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| `#E6FBF3` | `#B0F0DA` | `#6DE4B8` | `#34D399` | `#10B981` | `#0B6B4F` | `#064430` |

### Surface — teal-tinted neutrals

Backgrounds, cards, borders. Carries a faint teal cast to unify every surface with the brand.

| 50 | 100 | 200 | 400 | 600 | 800 | 900 |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| `#F3F7F6` | `#E4EDEA` | `#C8D8D3` | `#7EAA9A` | `#4A6E62` | `#243D35` | `#0A1210` |

### Success — emerald green

Allow badges, positive PnL, reputation gains, policy pass. Warmer than brand mint to maintain distinction.

| 50 | 100 | 200 | 400 | 600 | 800 | 900 |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| `#ECFDF5` | `#A7F3D0` | `#6EE7A0` | `#22C55E` | `#16A34A` | `#166534` | `#0A3D1E` |

### Danger — coral pink

Block badges, negative PnL, violations, reputation losses. Warm pink-red that contrasts against cool teal surfaces.

| 50 | 100 | 200 | 400 | 600 | 800 | 900 |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| `#FDE8EE` | `#F9B8CA` | `#F287A3` | `#E74C6F` | `#C42B50` | `#8C1E3D` | `#5E1229` |

### Warning — amber

Pending tx states, near-limit drawdown, confirming indicators.

| 50 | 100 | 200 | 400 | 600 | 800 | 900 |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| `#FEF4E0` | `#FCD98A` | `#F5B731` | `#D4960F` | `#A0700A` | `#7A5A0B` | `#4A3504` |

### Info — slate blue

Links, tx hash highlights, block explorer CTAs, informational badges.

| 50 | 100 | 200 | 400 | 600 | 800 | 900 |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| `#E8EFF8` | `#B3CCE8` | `#7AA8D6` | `#4A86C2` | `#2D6AA0` | `#1E3A5F` | `#0F2240` |

---

## 2. Semantic tokens (CSS variables)

Every component references tokens, never raw hex values.

```css
:root {
  /* Backgrounds */
  --bg-page: #F3F7F6;
  --bg-card: #FFFFFF;
  --bg-surface: #E4EDEA;
  --bg-elevated: #FFFFFF;
  --bg-brand: #E6FBF3;
  --bg-success: #ECFDF5;
  --bg-danger: #FDE8EE;
  --bg-warning: #FEF4E0;
  --bg-info: #E8EFF8;

  /* Text */
  --text-primary: #1A1A1A;
  --text-secondary: #4A6E62;
  --text-tertiary: #7EAA9A;
  --text-brand: #10B981;
  --text-success: #16A34A;
  --text-danger: #C42B50;
  --text-warning: #A0700A;
  --text-info: #2D6AA0;
  --text-on-brand: #064430;

  /* Borders */
  --border-default: #C8D8D3;
  --border-hover: #7EAA9A;
  --border-focus: #34D399;
  --border-success: #6EE7A0;
  --border-danger: #F287A3;
}

[data-theme='dark'] {
  /* Backgrounds */
  --bg-page: #0A1210;
  --bg-card: #243D35;
  --bg-surface: #243D35;
  --bg-elevated: #1A2E28;
  --bg-brand: #064430;
  --bg-success: #0A3D1E;
  --bg-danger: #5E1229;
  --bg-warning: #4A3504;
  --bg-info: #0F2240;

  /* Text */
  --text-primary: #E4EDEA;
  --text-secondary: #7EAA9A;
  --text-tertiary: #4A6E62;
  --text-brand: #34D399;
  --text-success: #22C55E;
  --text-danger: #E74C6F;
  --text-warning: #D4960F;
  --text-info: #4A86C2;
  --text-on-brand: #E6FBF3;

  /* Borders */
  --border-default: #243D35;
  --border-hover: #4A6E62;
  --border-focus: #34D399;
  --border-success: #166534;
  --border-danger: #8C1E3D;
}
```

---

## 3. Typography

Two font stacks. A sans-serif for all UI and body text, and a monospace for code, hashes, addresses, and JSON payloads.

### Font stacks

| Token | Value | Usage |
| :-- | :-- | :-- |
| `--font-sans` | `Inter, system-ui, sans-serif` | All UI text, headings, body |
| `--font-mono` | `JetBrains Mono, monospace` | Tx hashes, wallet addresses, JSON, code |

### Type scale

| Name | Size / Line height | Weight | Usage |
| :-- | :-- | :-- | :-- |
| Display | 32px / 40px | 500 | Cover titles, hero numbers |
| H1 | 24px / 32px | 500 | Page titles (Dashboard, Simulate) |
| H2 | 18px / 26px | 500 | Section headers, chart titles |
| H3 | 16px / 24px | 500 | Card headers, subsections |
| Body | 14px / 22px | 400 | Default text, descriptions |
| Small | 13px / 20px | 400 | Decision feed items, secondary info |
| Caption | 12px / 18px | 400 | Timestamps, labels, helper text |
| Micro | 11px / 16px | 500 | Badges, tags, metadata |

### Typography rules

- Two weights only: 400 (regular) and 500 (medium). Never use 600 or 700.
- Sentence case everywhere. No Title Case. No ALL CAPS except badge labels.
- Monospace for all on-chain data: addresses, tx hashes, evaluation IDs, JSON payloads.
- No mid-sentence bolding. Entity names go in monospace, not bold.
- Minimum font size: 11px. Nothing smaller.

---

## 4. Spacing and layout

### Spacing scale

| Token | Value | Usage |
| :-- | :-- | :-- |
| 4xs | 2px | Inline icon gaps |
| 3xs | 4px | Swatch gaps, tight padding |
| 2xs | 6px | Badge padding, compact gaps |
| xs | 8px | Card internal gaps, tag spacing |
| sm | 10px | Tile grid gap, feed item padding |
| md | 12px | Chart padding, form field gaps |
| base | 14px | Dashboard column gap |
| lg | 16px | Card padding, section gaps |
| xl | 20px | Page padding, simulate body |
| 2xl | 24px | Major section spacing |
| 3xl | 32px | Page-level vertical rhythm |

### Border radius

| Token | Value | Usage |
| :-- | :-- | :-- |
| `--radius-sm` | 4px | Checkboxes, small indicators |
| `--radius-md` | 6px | Badges, tags, pills, swatch corners |
| `--radius-base` | 8px | Inputs, buttons, metric tiles, form fields |
| `--radius-lg` | 12px | Cards, drawers, chart containers |
| `--radius-xl` | 16px | Modal dialogs, page wrapper |
| `--radius-full` | 9999px | Avatars, connection dots, circular indicators, progress bars, toggle switches |

### Layout grid

The dashboard uses a two-column layout: a flexible main area (charts + tiles) and a fixed 240px right rail for the live decision feed. The sidebar nav is 52px collapsed and 200px expanded.

| Region | Width / height | Notes |
| :-- | :-- | :-- |
| Sidebar (collapsed) | 52px | Icon-only nav, always visible |
| Sidebar (expanded) | 200px | Labeled nav, wider viewports |
| Top bar | 44px height | Title, agent selector, wallet pill |
| Main content | flex: 1 | Tiles + charts, fluid width |
| Decision feed rail | 240px | Live feed, fixed right column |
| Metric tile grid | 4 columns | `repeat(4, minmax(0, 1fr))` |
| Chart grid | 2 columns | Full-width top row, 2-up bottom |

#### Simulate layout

| Region | Width | Notes |
| :-- | :-- | :-- |
| Left column (intent form) | 280px fixed | Intent composition form |
| Right column (verdict) | flex: 1 | Result panel + policy checklist |

### Breakpoints

| Name | Range | Layout change |
| :-- | :-- | :-- |
| Desktop (default) | ≥ 1024px | Full layout, sidebar + feed rail |
| Tablet | 768–1023px | Collapsed sidebar, feed below charts |
| Mobile | < 768px | Single column, stacked tiles, sidebar hidden |

### Standard border

All card and container borders: `0.5px solid var(--border-default)`.

---

## 5. Components

### Status badge

Pill-shaped label used across decision cards, policy rows, and metric tiles.

| Variant | Background | Text | Border |
| :-- | :-- | :-- | :-- |
| allowed | Success 50 bg | Success 800 text | Success 200 border |
| blocked | Danger 50 bg | Danger 800 text | Danger 200 border |
| active | Mint 50 bg | Mint 800 text | Mint 200 border |
| inactive | Surface 100 bg | Surface 600 text | Surface 200 border |
| pending | Warning 50 bg | Warning 800 text | Warning 200 border |
| error | Danger 50 bg | Danger 800 text | Danger 200 border |

Specs: font-size 11px, font-weight 500, padding 2px 8px, border-radius 6px.

### Decision card

Primary unit of the live feed. Color-coded left border: 3px solid Success 400 (allow) or Danger 400 (block). White card background, 0.5px border in Surface 200.

Collapsed state shows: agent name, action badge, trade summary, verdict badge, timestamp.

Expanded state adds: evaluation ID, policy matched, validation tx link, reputation signal, signed intent JSON block.

| Element | Value | Notes |
| :-- | :-- | :-- |
| Left border (allow) | 3px solid `#22C55E` | Visible in both states |
| Left border (block) | 3px solid `#E74C6F` | Visible in both states |
| Card background | `--bg-card` | White / Surface 800 |
| Card border | `--border-default` | 0.5px solid |
| Card padding | 12px 14px | Head area |
| Detail drawer bg | `--bg-surface` | Expanded content area |
| Chevron | 16x16px | Rotates 180° on expand |

### Metric tile

Summary number cards in the dashboard header row. Grid of 4 with 10px gap.

| Element | Value | Notes |
| :-- | :-- | :-- |
| Background | `--bg-card` | White card surface |
| Border | `--border-default` | 0.5px solid |
| Border radius | `--radius-base` | 8px |
| Padding | 12px 14px | Internal spacing |
| Label | 11px, `--text-tertiary` | Muted descriptor |
| Value | 20px, weight 500 | Primary metric number |
| Subtitle | 11px, `--text-secondary` | Context or delta |

### Simulation result panel

Large verdict display on the simulate screen. Top border accent: 3px solid Success 400 (allow), Danger 400 (block), or Surface 200 (idle). Centered layout.

Three states:

- **Idle:** shows active policies and thresholds before any evaluation
- **Allowed:** Success-colored icon + verdict, meta row with eval ID, latency, reputation signal
- **Blocked:** Danger-colored icon + verdict + reason text, meta row with eval ID, latency

| Element | Value | Notes |
| :-- | :-- | :-- |
| Icon container | 48px circle | Success/Danger/Surface bg |
| Verdict text | 18px, weight 500 | Colored by state |
| Reason text | 13px, Danger 600 | Block state only |
| Latency | 12px mono | Displayed in all result states |
| Meta row | flex, centered, 20px gap | Eval ID, latency, reputation |

### Policy checklist

Shows per-policy pass/fail/skipped state below the simulation result.

| Element | Value | Notes |
| :-- | :-- | :-- |
| Pass indicator | 14px square, radius 3px | Success 50 bg, Success check icon |
| Fail indicator | 14px square, radius 3px | Danger 50 bg, Danger x icon |
| Skipped indicator | 14px square, radius 3px | Surface 100 bg, no icon |
| Policy name | 12px, `--text-primary` | e.g. `venue_allowlist` |
| Parameter detail | 11px mono, `--text-secondary` | e.g. `$8,500 < $10,000 cap` |

Short-circuits on first failure. Skipped policies show "skipped (prior rule failed)".

### Form inputs

Used in agent registration, policy configuration, and the simulate intent form.

| Property | Value | Notes |
| :-- | :-- | :-- |
| Height | 32px | Compact for dense forms |
| Border | 0.5px solid `--border-default` | Surface 200 |
| Border (hover) | `--border-hover` | Surface 400 |
| Border (focus) | 2px solid `--border-focus` | Mint 400, with focus ring |
| Border radius | `--radius-base` | 8px |
| Font | 13px `--font-sans` | `--font-mono` for address fields |
| Background | `--bg-card` | White / Surface 800 |
| Placeholder | `--text-tertiary` | Surface 400 light, 600 dark |

### Buttons

| Variant | Style | Notes |
| :-- | :-- | :-- |
| Primary | Mint 400 bg, Mint 900 text | 36px height, full width in forms |
| Secondary | Transparent bg, Surface border | 32px height, `--text-secondary` |
| Danger | Danger 400 bg, white text | Destructive actions |
| Ghost | Transparent, Mint 600 text | Inline link-style actions, no padding |

All buttons: radius 8px, font-size 13px, weight 500, transition 0.15s. Hover scales to 0.98. Focus shows 2px Mint 400 ring.

---

## 6. State rules

### Active
High contrast, brand borders, opacity 100%.

### Inactive
`--text-tertiary` color, `opacity: 0.8`. Used for inactive agents, disabled toggles.

### Hover
`--border-hover` border, slight background shift. Transition 150ms ease-out.

### Focus
`outline: none`, `box-shadow: 0 0 0 2px var(--border-focus)`. Applied on `:focus-visible` only.

### Restricted / unavailable

```css
.restricted {
  opacity: 0.4;
  filter: grayscale(1);
  pointer-events: none;
  cursor: not-allowed;
}
```

Used for coming-soon features (e.g. Export CSV, multi-agent delegation), locked policy types, unavailable venues, and any feature gated behind permissions. The combination ensures restricted items are visually distinct from both active and inactive states without introducing a new color.

### Loading
`--bg-surface` background with shimmer keyframe animation. 1.5s ease-in-out infinite.

### Error
`--bg-danger` background, `--text-danger` text, `--border-danger` border. Same treatment as blocked badge.

---

## 7. Iconography

Use stroke-style icons at 16x16px default size. Stroke width 1.2px. Color inherits from text color tokens. No emoji anywhere in the UI.

| Type | Size | Specs |
| :-- | :-- | :-- |
| Nav icons | 16x16px | Stroke 1.2px, `--text-secondary` (inactive), `--text-primary` (active) |
| Status dots | 6x6px | Filled circles, Success/Danger/Warning 400 |
| Chevrons | 16x16px | Stroke 1.5px, `--text-tertiary`, rotate on expand |
| Action icons | 16x16px | Stroke 1.2px, same color as parent text |
| Result icons | 24x24px | Stroke 2.5px, inside 48px circle bg |

---

## 8. Motion and animation

Motion is functional, not decorative. Every animation communicates state change.

| Category | Duration | Easing | Applied to |
| :-- | :-- | :-- | :-- |
| Micro transitions | 150ms | ease-out | Border color, bg color, opacity |
| Expand/collapse | 200ms | ease-in-out | Chevron rotation, drawer height |
| Page transitions | 250ms | ease-out | Route changes, tab switches |
| Loading skeleton | 1.5s | ease-in-out, infinite | Shimmer pulse on placeholders |
| Toast entrance | 200ms | ease-out | Slide up + fade in |
| Toast exit | 150ms | ease-in | Fade out after 5s auto-dismiss |
| New feed items | 200ms | ease-out | Slide down + fade in |

All animations respect `prefers-reduced-motion`. When reduced motion is active, all `transition-duration` and `animation-duration` resolve to `0ms`.

---

## 9. Dark mode

Dark mode swaps light and dark stops within each ramp. The `[data-theme='dark']` selector activates dark tokens. Charts invert their grid lines and axis labels but keep data colors constant (Success 400, Danger 400, Mint 400 are the same in both modes) for consistency when comparing screenshots.

| Element | Light | Dark |
| :-- | :-- | :-- |
| Page background | `#F3F7F6` | `#0A1210` |
| Card background | `#FFFFFF` | `#243D35` |
| Card border | `#C8D8D3` | `#243D35` |
| Primary text | `#1A1A1A` | `#E4EDEA` |
| Secondary text | `#4A6E62` | `#7EAA9A` |
| Primary CTA bg | `#34D399` | `#34D399` (same) |
| Allow border | `#22C55E` | `#22C55E` (same) |
| Block border | `#E74C6F` | `#E74C6F` (same) |

---

## 10. Usage guidelines

### Brand mint vs. success green

Brand mint (`#34D399`) and success emerald (`#22C55E`) are both green but serve different purposes. Brand mint is for identity: primary buttons, active nav, reputation scores, focus rings. Success emerald is for status: allow badges, positive PnL, policy pass indicators. Never swap them. The reputation score tile uses brand mint. The PnL tile uses success emerald. They sit side by side and must remain distinguishable.

### On-chain data formatting

All blockchain data uses the monospace font stack. Wallet addresses and tx hashes are truncated with an ellipsis: `0x8f3a…c41d` (first 4 + last 4 characters). Full values are available via copy-on-click. Evaluation IDs follow the same pattern: `eval_01J7K…` Contract addresses are never truncated in policy configuration views.

### Color on color

When placing text on a colored background (badges, tags, metric tile values), always use the 800 or 900 stop from the same ramp. Never use black, gray, or `--text-primary` on colored fills. Example: text on Mint 50 (`#E6FBF3`) must use Mint 800 (`#0B6B4F`), not `#1A1A1A`.

### Chart colors

- **Drawdown vs. baseline:** Mint 600 (`#10B981`) solid line for protected portfolio, Surface 200 (`#C8D8D3`) dashed line for unprotected baseline, Mint 50 (`#E6FBF3`) fill at 60% opacity for prevention delta area.
- **PnL chart:** Success 400 (`#22C55E`) solid line with Success 50 (`#ECFDF5`) area fill.
- **Reputation chart:** Mint 600 (`#10B981`) step line with Surface 200 (`#C8D8D3`) dashed target benchmark.

### Accessibility

All text/background combinations meet WCAG 2.1 AA contrast requirements (4.5:1 for body text, 3:1 for large text). Interactive elements have visible focus rings using Mint 400 at 2px width. Status is never communicated by color alone: badges include text labels, chart lines use solid vs. dashed patterns, and decision cards use left-border width as a secondary indicator alongside color.

### Restricted items

Any element representing a restricted, locked, or unavailable action receives `opacity: 0.4` combined with `filter: grayscale(1)` and `pointer-events: none`. This applies to: disabled buttons, coming-soon features (Export CSV, multi-agent delegation), locked policy types, unavailable venues, and any feature gated behind permissions. Do not use a separate color or badge for restricted items — the opacity + grayscale combination is the only treatment.

### File exports

This design system is delivered as CSS custom properties. Each token maps to a CSS variable. Components are implemented as React functional components with Tailwind utility classes where possible, falling back to CSS variables for the custom palette.
