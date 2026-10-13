# 🎨 Design System: Link-in-Bio Platform
**Standard**: Google Stitch & Modern Web UI/UX Architecture

---

## Configuration — Dial Settings

| Dial | Level | Description |
|---|---|---|
| **Creativity** | `7` | Balanced between aesthetic personal branding and ultra-clean utility. |
| **Density** | `6` | Compact mobile cards for public links; clean 60/40 split-screen for Creator Studio. |
| **Variance** | `5` | Consistent recognizable link structures with high polish. |
| **Motion Intent** | `6` | Tactile spring physics on tap, subtle hover lift, skeleton shimmer loaders. |

---

## 1. Visual Theme & Atmosphere
The platform combines a **modern architectural minimalism** with high-converting creator aesthetics. It feels premium, responsive, and tactile. Surfaces are crisp, elevation is handled with delicate whisper borders and diffused shadows, and interactions give immediate haptic/visual feedback.

---

## 2. Color Palette & Semantic Roles

### 2.1 Default Theme: "Obsidian Slate" (Dark Mode)
- **Canvas Background**: `#0f172a` (Slate 900)
- **Surface / Card Fill**: `#1e293b` (Slate 800)
- **Primary Text**: `#f8fafc` (Slate 50)
- **Secondary / Meta Text**: `#94a3b8` (Slate 400)
- **Accent Brand Color**: `#6366f1` (Indigo 500)
- **Border / Outline**: `rgba(51, 65, 85, 0.6)` (Slate 700 / 60%)
- **Card Hover State**: `#334155` (Slate 700)
- **Success / Positive**: `#10b981` (Emerald 500)

### 2.2 Alternate Theme: "Minimalist Paper" (Light Mode)
- **Canvas Background**: `#f8fafc` (Slate 50)
- **Surface / Card Fill**: `#ffffff` (Pure White)
- **Primary Text**: `#0f172a` (Slate 900)
- **Secondary / Meta Text**: `#64748b` (Slate 500)
- **Accent Brand Color**: `#4f46e5` (Indigo 600)
- **Border / Outline**: `rgba(226, 232, 240, 0.8)` (Slate 200)

---

## 3. Typography Rules
- **Display & Headlines**: `Outfit, Space Grotesk, sans-serif` — Tracking `-0.025em`, font-weight `600` to `700`.
- **Interface & Link Labels**: `Inter, system-ui, sans-serif` — Tracking normal, font-weight `500` (Medium).
- **Numbers & Metrics (Analytics)**: `JetBrains Mono, monospace` — For click counters, CTR percentages, timestamps.

---

## 4. Component Geometry & Tokens

### 4.1 Link Cards (Public Profile)
- **Geometry**: `border-radius: 9999px` (Default Pill) or `12px` (Soft Rect).
- **Height**: Minimum 54px touch target for mobile thumbs.
- **Padding**: `14px 20px`.
- **States**:
  - *Default*: Background fill with whisper border.
  - *Hover/Focus*: Subtle scale `scale(1.015)` and background brightness increase.
  - *Active / Pressed*: `scale(0.985)` with active click beacon dispatch.

### 4.2 Creator Studio Layout (Desktop)
- **Two-Column Split**:
  - Left Column (60%): Link management list with drag handles, edit drawers, toggle switches.
  - Right Column (40%): Fixed position realistic smartphone frame (390x844px) with dynamic live preview.

---

## 5. Screen Specifications

1. **Screen 1**: Public Creator Profile (`/@alexrivera`) — Viewport `390px` width, centered layout, avatar, bio, active links.
2. **Screen 2**: Creator Studio Dashboard (`/dashboard`) — Viewport `1440px` width, 60/40 split screen.
3. **Screen 3**: Theme & Appearance Studio (`/dashboard/appearance`) — Palette selection grid, typography picker.
4. **Screen 4**: Analytics Studio (`/dashboard/analytics`) — Time-series line chart (Views vs Clicks), CTR metrics, geo map.
