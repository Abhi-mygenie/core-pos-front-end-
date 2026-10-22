# CR-414 — DASHBOARD TABLET RESPONSIVE REDESIGN
**Registered:** 2026-10-12
**Type:** CR (Responsive design implementation — new tablet layout behavior)
**Severity:** P1 — HIGH
**Risk:** HIGH
**Sprint:** oct_cr_batch
**Status:** GATE_1_INTAKE
**Parent BUG:** BUG-537 (problem report)

---

## Description

Implement responsive tablet support for the POS Dashboard based on the locked design decisions from BUG-537. Three components receive tablet-specific layout changes at breakpoints 600px and 768px. Desktop (1280px+) is completely unchanged.

This CR converts the design decisions from the mockup review (OD-537-01/02/03) into a concrete implementation plan covering:
1. **Header** — single-row compact tablet layout with channel dropdown
2. **Grid** — vertically stacked channels with fluid card widths on tablet

---

## Owner Decisions — LOCKED

**OD-537-01: Support both 600px (7-8") and 768px+ (10") tablets.** Two Tailwind breakpoints: `sm` = 640px, `md` = 768px.

**OD-537-02 — Header on tablet (<768px):**
- **Single row** (no second row — saves vertical space)
- **Remove** Web order counter badge + POS order counter badge (hidden with `md:flex hidden`)
- **Collapse** channel filter pills into compact **multiselect dropdown** button showing active channels
  - Same toggle behaviour as current pills — all selected by default
  - Dropdown opens on tap, shows all 4 channels with checkboxes
- Result layout: `[Logo] [≡ Channels ▼] [Search flex-1] [+ Add]` → fits 600px ✓

**OD-537-03 — Grid on tablet (<768px):**
- **Channels stack vertically** (one below the other — confirmed OK by owner)
- **Auto card count** (Option A) — `minmax(140px, 1fr)` fills row naturally
- `< >` arrows still work as manual column override
- **Desktop 1280px+ : completely unchanged** — side-by-side channels, 160px fixed cards

**Revalidation addendum (2026-10-13, Planning Gate 3 v2) — new decisions locked:**
- **OD-414-03 = A:** desktop/tablet threshold is **`lg` = 1024px** (not `md` = 768). Reason: header needs 1008px; at 768/800/960 the desktop header still overflows (evidence `INV-TABLET-001_layout_metrics.json`). Every "<768px" above now reads **"<1024px"**.
- **OD-414-04 = A:** stacked channels on tablet use **natural height**; whole dashboard scrolls; every card visible.
- **OD-414-05 = A:** tablet dropdown **mirrors the pill bar** — status filters + Schedule in channel view, channel filters in status view, multi-select with ticks, same handlers as the pills. (The "channel pills" wording in OD-537-02 described status view only; default channel view shows status pills.)
- Additional gaps covered in plan v2: ChannelColumn inline px width → 100% on tablet; search box fluid + results panel right-anchored on tablet; order-view fluid grid `minmax(280px,1fr)`.

---

## Duplicate Check

**DISTINCT** (companion to BUG-537, no prior CR for this implementation).

---

## Evidence / Design Guidelines

- **Investigation report:** `evidence/BUG-537/INV-TABLET-001_INVESTIGATION_REPORT.md`
- **Layout metrics:** `evidence/BUG-537/INV-TABLET-001_layout_metrics.json`
- **Design guidelines:** `/app/design_guidelines.json`
- **Mockup approach validated:** 2026-10-12 owner review

---

## Severity

**P1 — HIGH** — cashier cannot operate on tablet. BUG-537 confirms scope.

---

## Risk Classification

**HIGH** — 3 files, layout changes on a high-traffic screen. `DashboardPage.jsx` (R5) imports both Header and ChannelColumnsLayout — regressions would be immediately visible. No financial logic touched.

---

## Blast Radius

**Scope: MEDIUM — 3 files, pure CSS/layout + 1 new dropdown component**

| File | Change |
|---|---|
| `src/components/layout/Header.jsx` | Add `sm:hidden` on Web/POS counters; add tablet channel dropdown component (new sub-component or inline); add `md:flex` guard on existing pills section |
| `src/components/dashboard/ChannelColumn.jsx` | Change CSS grid from `repeat(N, 160px)` to `repeat(auto-fill, minmax(140px, 1fr))` at tablet breakpoint; keep fixed 160px on desktop |
| `src/components/dashboard/ChannelColumnsLayout.jsx` | Add `flex-col md:flex-row` so channels stack vertically on tablet and remain side-by-side on desktop; adjust container overflow behaviour |

**Files WILL NOT touch:** `DashboardPage.jsx` (R5) · `OrderEntry.jsx` (R5) · any transform or service file

---

## Code Reality

**NONE** for tablet behavior — no responsive code exists:
- `Header.jsx`: 0 `sm:/md:` breakpoints, 0 `flex-wrap`, 0 `useWindowSize`
- `ChannelColumn.jsx` L284: `repeat(${actualColumns}, ${TABLE_CARD_WIDTH}px)` — pixel-fixed, no `minmax`
- `ChannelColumnsLayout.jsx`: 0 `flex-col`, 0 breakpoints, 0 stacking

---

## Verification Matrix (seeds Gate 3 plan)

| # | What to verify | How |
|---|---|---|
| V-1 | Desktop layout unchanged at 1280px | Screenshot at 1280px — channels side-by-side, 160px cards |
| V-2 | Tablet 600px portrait — single row header | Screenshot 600px — no overflow, Add button visible |
| V-3 | Web/POS counters hidden on tablet | `sm:hidden` class + visual check |
| V-4 | Channel dropdown on tablet — all selected default | Open dropdown, all 4 channels checked |
| V-5 | Channel dropdown toggle — multiselect works | Uncheck Walk-In → grid hides Walk-In column |
| V-6 | Channels stack vertically at 600px | Screenshot — Dine-In above Walk-In above Delivery |
| V-7 | Cards auto-fill row at 600px | Each channel row shows 3-4 cards filling width |
| V-8 | `< >` arrows still adjust columns on tablet | Tap `>` on Dine-In → more cards per row |
| V-9 | Tablet 768px portrait — layout intact | Screenshot 768px |

---

## Open Questions for Planning

**OD-414-01:** Channel dropdown on tablet — where should it open?
- (A) Downward overlay below the header bar
- (B) Inline dropdown within the header row
- **Agent recommendation: A** (downward overlay — more tap-friendly on tablet)

**OD-414-02:** Does the `< >` column-count arrow persist to localStorage on tablet too, or tablet uses auto-only?
- (A) Yes — user adjustment saved and respected on tablet too
- (B) Tablet always auto — localStorage setting only applies on desktop
- **Agent recommendation: A** — consistent behaviour across devices

---

## Next

→ Owner answers OD-414-01/02 → Gate 2 GO → Impact Analysis
