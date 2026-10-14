# 🎨 Design System: OneLink Platform
**Brand**: OneLink (`onelink.bio`)  
**Aesthetic Standard**: Monochromatic Modern Off-Black (Zinc / Carbon Minimalism)  
**Standard**: Google Stitch & Clean Architecture Tokens  

---

## 1. Visual Theme & Brand Philosophy

OneLink is engineered with a **minimalist, hyper-refined, monochromatic aesthetic**. 
- **Zero Blue/Navy Tint**: Avoids dated saturated blues and navies (`#0b1326`, `#1e293b`).
- **Modern Off-Black Canvas**: Built on `#09090b` (Zinc 950) — a warm, architectural carbon off-black that feels luxurious on OLED displays without the harshness of pure `#000000`.
- **Architectural Framing**: Depth is expressed through hair-thin borders (`rgba(255, 255, 255, 0.08)` or `#27272a`), subtle micro-gradients, and tactile scale responses on click.

---

## 2. Core Palette: OneLink Monochromatic Carbon

| Role | Hex Token | CSS Variable / Tailwind | Usage |
|---|---|---|---|
| **Canvas Background** | `#09090b` | `bg-zinc-950` | Primary app canvas, deep off-black |
| **Card / Container** | `#121215` | `bg-zinc-900/80` | Elevated link cards, editing panels, modals |
| **Hover Surface** | `#27272a` | `bg-zinc-800` | Mouse hover, active drag target, select states |
| **Borders & Dividers** | `rgba(255,255,255,0.08)` | `border-white/10` / `border-zinc-800` | 1px delicate structural lines |
| **Primary Text** | `#fafafa` | `text-zinc-50` | High-contrast headings, link labels, titles |
| **Secondary Text** | `#a1a1aa` | `text-zinc-400` | Subtitles, click counters, URLs |
| **Muted Metadata** | `#71717a` | `text-zinc-500` | Timestamps, inactive states, footers |
| **Monochrome Accent** | `#ffffff` | `bg-white text-zinc-950` | High-converting primary CTA (pill button) |
| **Success Indicator** | `#10b981` | `text-emerald-500` | Toggle active, link live status dot |

---

## 3. Platform Studio vs. Creator Profile Themes

It is crucial to distinguish between the **Platform Chrome** and the **Creator's Custom Page**:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              ONELINK PLATFORM ARCHITECTURE                             │
├────────────────────────────────────────────┬───────────────────────────────────────────┤
│ 🛠️ ONELINK STUDIO DASHBOARD                │ 📱 CREATOR PUBLIC PROFILES (`/@username`) │
├────────────────────────────────────────────┼───────────────────────────────────────────┤
│ • Fixed Brand Aesthetic                    │ • Fully Customizable by the Creator       │
│ • Monochromatic Carbon (`#09090b`)         │ • Presets:                                │
│ • Hair-thin Zinc borders (`#27272a`)       │   1. Obsidian Kinetic (Monochrome Dark)   │
│ • White high-contrast CTAs                 │   2. Minimalist Paper (Pure Light)        │
│ • Consistent productivity UX               │   3. Cyberpunk Neon (Glow Cyan / Violet)  │
│                                            │   4. Sakura (Rose Pastel)                 │
│                                            │   5. Emerald Forest (Deep Green)          │
│ • The right-hand phone preview dynamically reflects the theme chosen by the creator!   │
└────────────────────────────────────────────┴───────────────────────────────────────────┘
```

---

## 4. Typography Hierarchy
- **Brand & Headings**: `Space Grotesk` or `Outfit` — Tracked `-0.025em`, font-weight `600` / `700`.
- **Interface & Link Labels**: `Inter, system-ui, sans-serif` — Tracking normal, font-weight `500` (Medium).
- **Data & Analytics**: `JetBrains Mono, monospace` — For click counters, percentages, and timestamps.

---

## 5. Component Geometry Tokens

- **Buttons & Link Cards**: `border-radius: 9999px` (Pill `rounded-full`) with minimum 54px touch target.
- **Surface Elevation**: Level 1: `bg-zinc-900 border border-white/5 shadow-lg shadow-black/20`.
- **Active Tactile Press**: `transform: scale(0.985); transition: transform 0.1s ease;`.
