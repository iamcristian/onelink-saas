# 🪄 Stitch Enhanced Prompts for Platform Screens

> Generated using the **`enhance-prompt`** and **`taste-design`** skills.  
> Ready for input to Stitch MCP or the Stitch Web Interface.

---

## Screen 1: Public Creator Profile (`/@username`)

```markdown
A high-converting, mobile-first Link-in-Bio landing page for a creative software engineer and content creator.

PLATFORM: Mobile-first Web, viewport 390x844px (iPhone 14 frame).

PAGE STRUCTURE:
1. Header & Identity:
   - Centered circular avatar photo (96x96px) with a subtle 2px Slate border.
   - Display name "Alex Rivera" with a verified badge icon in Outfit bold typography.
   - Subtitle handle "@alexrivera • Tech & Minimalist Living" in muted slate text.
   - Bio paragraph (max 2 lines): "Building open-source tools & writing about distributed systems."
   - Horizontal icon row with micro-hover scale: GitHub, YouTube, X (Twitter), LinkedIn, and Mail.

2. Primary Link Stack (Vertical Stack with 12px gap):
   - Active Pill Card 1: "🚀 Latest Video: Building a 10M req/sec URL Shortener" with a YouTube play icon.
   - Active Pill Card 2: "📚 Free System Design Architecture Guide (PDF)" with a document download icon.
   - Active Pill Card 3: "🛍️ My Desk Setup & Hardware Gear (2026 Edition)" with an external shopping tag icon.
   - Section Header: "── 📖 Courses & Newsletter ──" in clean muted uppercase tracking.
   - Active Pill Card 4: "💌 Join 15,000+ Engineers on my Substack" with a newsletter icon.
   - Active Pill Card 5: "☕ Support my Work (Buy Me a Coffee)" with a coffee cup icon.

3. Minimal Footer:
   - Subtle brand text: "🔗 Powered by LinkTree Clone" in Slate 500 with a clean modern aesthetic.
```

---

## Screen 2: Creator Studio Dashboard (`/dashboard`) — Split Screen

```markdown
A professional, productivity-focused 2-column creator studio dashboard for managing links and real-time profile appearance.

PLATFORM: Desktop Web, 1440x900px viewport.

PAGE STRUCTURE:
1. Top Navigation Bar:
   - Left: Platform brand logo "Linktree Studio" with an indigo link glyph.
   - Center: Segmented tab navigation: [Links (Active)] | [Appearance] | [Analytics] | [Settings].
   - Right: Profile switcher dropdown "alexrivera.bio/@alex" with avatar thumbnail and "Share URL" button.

2. Main Body Layout (60% Left / 40% Right Split View):
   - Left Editing Panel (60% width):
     - Action toolbar: Primary button "+ Add Link", secondary "+ Add Header", tertiary "+ Add Divider".
     - Draggable Link Cards List:
       * Card 1: 6-dot drag handle, icon thumbnail, editable title "Latest YouTube Video", destination URL, click counter badge "1,420 clicks", visibility toggle switch (green active), kebab menu (edit, delete).
       * Card 2: 6-dot drag handle, editable title "Free System Design Guide", destination URL, click counter badge "2,150 clicks", visibility toggle switch.
       * Card 3: Section Header block "Courses & Newsletter" with inline edit pencil.
   - Right Preview Panel (40% width, background light neutral gray):
     - Centered realistic smartphone frame (iPhone 14 model, 390x844px) with floating shadow.
     - Inside phone frame: Live rendering of the public profile with active theme colors and buttons.
```

---

## Screen 3: Appearance & Theme Customizer (`/dashboard/appearance`)

```markdown
An intuitive visual theme and styling customizer tab within the Creator Studio.

PLATFORM: Desktop Web, 1440x900px viewport.

PAGE STRUCTURE:
1. Profile Identity Section:
   - Avatar upload zone with drag-and-drop file target and current 96px preview.
   - Input fields for "Profile Title" and "Bio" with character counter (42 / 500).

2. Preset Themes Showcase (Grid of 5 curated cards with live preview thumbnails):
   - Theme 1: "Obsidian" (Dark Slate, Indigo accent) — [Active checkmark].
   - Theme 2: "Minimalist" (Clean White, Slate typography).
   - Theme 3: "Cyberpunk" (Pitch Black, Cyan neon glow borders).
   - Theme 4: "Sakura" (Soft Rose pastel gradient, Deep ruby buttons).
   - Theme 5: "Forest Emerald" (Deep Forest Green, Mint text).

3. Custom Theme Styling Controls (Collapsible accordion):
   - Background type selector: Segmented control [Solid Color] | [Gradient] | [Custom Image].
   - Button Shape Selector: Dropdown with visual icons [Pill (9999px)] | [Rounded (8px)] | [Sharp (0px)] | [Brutalist Shadow].
   - Font Family Selector: Dropdown with typography preview [Outfit] | [Inter] | [Space Grotesk] | [Poppins].
```

---

## Screen 4: High-Performance Analytics (`/dashboard/analytics`)

```markdown
A data-dense, executive performance analytics dashboard displaying time-series traffic metrics.

PLATFORM: Desktop Web, 1440x900px viewport.

PAGE STRUCTURE:
1. Header & Date Range Filter:
   - Title: "Audience & Link Engagement" with a 7-day / 30-day / 90-day range selector and "Export CSV" button.

2. 4 Top Metric KPI Cards:
   - Card 1: Total Page Views — "24,510" (↗ +12.4% vs last week).
   - Card 2: Total Link Clicks — "8,920" (↗ +8.2% vs last week).
   - Card 3: Average Click-Through Rate (CTR) — "36.4%" (↗ +1.8%).
   - Card 4: Daily Unique Visitors — "18,340" (↗ +15.1%).

3. Time-Series Area Chart (Hourly / Daily TimescaleDB Rollups):
   - Dual-line graph comparing "Page Views" (Indigo solid line with soft gradient fill) and "Link Clicks" (Emerald green dashed line).

4. Bottom Two-Column Breakdown:
   - Left Column: "Top Performing Links" table with rank #1-5, destination, click volume, and percentage share.
   - Right Column: "Top Geographic Regions" with ISO country flag icons (United States 42%, Germany 14%, UK 11%, Brazil 8%).
```
