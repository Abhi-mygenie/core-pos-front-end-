# BUG-537 — DASHBOARD LAYOUT BROKEN ON ANDROID TABLETS (FIXED PIXEL WIDTHS, NO RESPONSIVE DESIGN)
**Registered:** 2026-10-12
**Type:** BUG
**Severity:** P1 — HIGH
**Risk:** HIGH
**Sprint:** oct_cr_batch
**Status:** GATE_1_INTAKE

---

## Description

The POS Dashboard is **unusable on Android tablets** in both portrait and landscape orientations. The header bar overflows — Search and Add buttons are pushed off the right edge of the screen. The table/order grid uses pixel-fixed column widths with no viewport awareness, causing either horizontal overflow or large empty gaps depending on screen orientation.

**Affected devices:** Android tablets ~600–960px wide (portrait 7–10 inch typical).
**Not affected:** Desktop browsers (1000px+), which the layout was designed for.

---

## Root Cause — 2 components

### Component A: `Header.jsx` — no flex-wrap, no responsive breakpoints

The header is a single `flex items-center` row with the full left cluster (logo, filter pills, channel counts) and right cluster (search, Web/POS counter, Add button) in one non-wrapping line. Confirmed at HEAD:

```
grep -c "flex-wrap|sm:|md:|lg:|window.inner" Header.jsx → 0
```

At tablet widths (~600–800px), the right cluster overflows off-screen. The Search input and Add Order button become unreachable.

### Component B: `ChannelColumn.jsx` + `ChannelColumnsLayout.jsx` — pixel-fixed grid

**`ChannelColumn.jsx` L9, L191, L284 (confirmed at HEAD):**
```javascript
const TABLE_CARD_WIDTH = 160;
const columnWidth = (actualColumns * cardWidth) + ((actualColumns - 1) * GAP) + PADDING;
// CSS grid:
`repeat(${actualColumns}, ${TABLE_CARD_WIDTH}px)`   // ← pixel-fixed, no minmax, no fr
```

**`ChannelColumnsLayout.jsx` L19, L92 (confirmed at HEAD):**
- `maxColumns` driven entirely by `localStorage` — never checks `window.innerWidth`
- No breakpoints, no `useWindowSize`, no viewport hook anywhere in the dashboard chain

On a 600px portrait tablet with default 2-column dine-in setting: total grid width = 2 × 160 + gaps = ~344px (fits), but header overflow still makes the screen unusable.
On landscape at 960px: grid renders but empty space wastes ~600px.

---

## Duplicate Check

**DISTINCT** — no prior CR/BUG in registry for tablet/responsive layout.

---

## Evidence

- **Source:** OWNER (via agent INV-TABLET-001, 2026-10-12)
- **Confidence:** HIGH — code trace confirmed + layout metrics JSON captured on real devices
- **Investigation report:** `evidence/BUG-537/INV-TABLET-001_INVESTIGATION_REPORT.md`
- **Layout metrics:** `evidence/BUG-537/INV-TABLET-001_layout_metrics.json`

**Metric snapshot (from INV-TABLET-001):**

| Viewport | Header overflows? | Header scroll width | Off-screen elements |
|---|---|---|---|
| p600 (portrait 600px) | ✗ YES | 1008px (1.68× viewport) | Search, Add |
| l960 (landscape 960px) | partial | 1008px (1.05× viewport) | Add |
| p800 (portrait 800px) | partial | 1008px (1.26× viewport) | Add |
| l1280 (landscape 1280px) | ✓ NO | 1008px | none |

---

## Severity Rubric

**P1 — HIGH:** Cashier operating a tablet cannot reach the Add Order button or Search — core order-entry entry points are inaccessible. Any restaurant deploying this POS on a tablet is effectively blocked.

---

## Risk Classification

**HIGH** — 3 layout component files (`Header.jsx`, `ChannelColumn.jsx`, `ChannelColumnsLayout.jsx`). `DashboardPage.jsx` (R5) imports both Header and ChannelColumnsLayout — any layout regression would be visible in the most-used screen.

- Not CRITICAL (no financial logic, no R5 file directly modified)
- Fast Lane eligible: **NO** (3 files, 2 of which affect the R5 DashboardPage render)
- Full gate flow required: YES

---

## Blast Radius

```
Files WILL change:   Header.jsx · ChannelColumn.jsx · ChannelColumnsLayout.jsx
Files WILL NOT touch: DashboardPage.jsx (R5) · OrderEntry.jsx · any transform
```

- **Scope:** MEDIUM — 3 files, pure CSS/layout changes, no logic/formula changes
- **Hotspot indirect:** DashboardPage.jsx (R5) renders both Header and ChannelColumnsLayout

---

## Code Reality

**FULL** — the broken code is present and confirmed at HEAD:
- `Header.jsx`: `flex items-center` with 0 flex-wrap/breakpoints
- `ChannelColumn.jsx` L284: `repeat(${actualColumns}, ${TABLE_CARD_WIDTH}px)` — pixel-fixed CSS grid
- `ChannelColumnsLayout.jsx` L19/L92: localStorage-only column count, zero viewport awareness

---

## Owner Decisions — LOCKED (2026-10-12)

**OD-537-01: LOCKED** — Support **both** 600px (7-8 inch portrait) AND 768px+ (10 inch portrait) tablets.

**OD-537-02: LOCKED** — **Single-row header on tablet.** Remove Web/POS order counters (informational only — not needed at a glance on tablet). Collapse channel filter pills into a **compact multiselect dropdown** button (shows active channels, all selected by default, same toggle behaviour as current pills). Result: single row fits in 600px: `[Logo] [≡ Channels ▼] [Search ──────] [+ Add]`. NO second row.

**OD-537-03: LOCKED** — **Channels stack vertically on tablet (<768px).** Cards use `minmax(140px, 1fr)` auto-fill — fill the row with as many cards as fit naturally (Option A). `< >` arrows still work as manual override. Desktop (1280px+) is **completely unchanged** — channels still side-by-side, 160px cards, same as today.

---

## Next

→ Owner answers OD-537-01/02/03 → Gate 2 GO → Impact Analysis
