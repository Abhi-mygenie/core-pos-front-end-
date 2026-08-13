# CR-081: Inventory V5 Mockup Design Alignment Pass

**ID:** CR-081
**Type:** CR (Design Alignment — pixel-match existing screens to locked v5 mockup)
**Priority:** P1 (HIGH — all inventory screens visually diverge from owner-approved mockup)
**Risk:** HIGH (touches 10+ files across all inventory screens, 2 hot files: Sidebar.jsx + App.js)
**Sprint:** POS 5.0
**Reported by:** Owner (2026-07-19 — "all the pages which are done, design is not followed")
**Source:** OWNER-REPORTED + AGENT-INVESTIGATED
**Date:** 2026-07-19

---

## Description

All inventory screens have code implemented (CR-072/CR-078/CR-079) but the live UI does NOT match the locked v5 mockup (`cr072-inventory-mockup-v5-full.html`). The code is **skeleton/scaffold** — basic structure + API wiring — but missing the mockup's design polish: KPI cards, color coding, status badges, charts, vendor reasoning, unit conversion, and critically the **horizontal pill tab bar** navigation.

Owner directive: "all the pages which are done, design is not followed... we need LHS navigation as well as tabs in mockup screen to navigate."

---

## Code Reality: PARTIAL

All 18 inventory component files exist (3,400 lines total). API wiring works. But design elements from v5 mockup are missing across every screen.

---

## Duplicate Check: DISTINCT

- CR-075 (UX Overhaul) was split into CR-075-A/B + CR-077/CR-078/CR-079. Those covered functionality, not design alignment.
- No existing CR covers "match live UI to locked v5 mockup."
- CR-081 absorbs remaining CR-075 polish items (S2 filter UX, PC1 wastage recording).

---

## Evidence

- **V5 Mockup (locked):** `/app/frontend/public/cr072-inventory-mockup-v5-full.html`
- **Investigation Report:** `/app/memory/test_reports/INVESTIGATION_V5_MOCKUP_FULL_DESIGN_AUDIT_2026_07_19.md`
- **Screenshots:** Live vs mockup comparison captured 2026-07-19
- **Owner quote:** "I am not getting exact design... there was a re-exercise done for this"

---

## Scope — 4 Phases

### Phase A (P0): Navigation — Horizontal Pill Tab Bar
**Gap:** Mockup has dual navigation (LHS icon sidebar + top pill tab bar with OPERATIONS/SETUP groups). Live has only LHS expanded sidebar.

| Item | Description | Est. Lines |
|---|---|---|
| A1 | Create `InventoryTabBar.jsx` component — horizontal pill bar with OPERATIONS group (Dashboard · Current Stock · Smart Purchase · Receive · Stock Audit) + SETUP group (Ingredients · Recipes · Vendors · Wastage Reasons) | ~60 |
| A2 | Pill styling: rounded-full, dark bg (#1A1A1A) + white text when active, orange border on hover, 12px font, 600 weight | ~15 |
| A3 | OPERATIONS / SETUP group labels (10px, uppercase, tracking-wider, #999) with vertical divider between groups | ~10 |
| A4 | Receive pill: orange badge with pending count (from pending-queues API), conditionally hidden for normal restaurants | ~15 |
| A5 | Mount tab bar inside each inventory page wrapper (or create shared `InventoryLayout.jsx`) | ~20 |
| A6 | Tab click navigates to route (same as sidebar) — keep LHS sidebar + add top tabs | ~10 |
| **Total Phase A** | | **~130 lines** |

### Phase B (P1): Dashboard — Stock Intelligence
**Gap:** Dashboard shows "Loading..." or empty. Mockup has 4 KPI cards, Low-Stock Alerts, 6 data widgets.

| Item | Description | Est. Lines |
|---|---|---|
| B1 | **4 KPI cards row:** Reorder Alerts (count), Wastage Value (₹ + Phase 2 badge), Cost Change (↑X% · 30d), Recipes at Risk (count) | ~50 |
| B2 | **Low-Stock Alerts strip:** Horizontal list of ≤5 items with qty + "~X days left" / "Out of stock" | ~35 |
| B3 | **Time range chips** (7d/14d/30d) + "All Categories" dropdown + Export button in header | ~25 |
| B4 | **Reorder Forecast widget:** Add missing columns — Current qty, Suggest Reorder qty, Preferred Vendor. Days-left color badges (red ≤3d, amber ≤7d, green >7d) | ~35 |
| B5 | **Consumption Trends widget:** Render recharts line chart with ingredient selector dropdown, avg/day, total, Δ vs prev % | ~50 |
| B6 | **Cost Trend widget:** Table with ingredient, current rate, sparkline (recharts Sparkline), Δ vs prev % | ~40 |
| B7 | **Recipe Cost & Margin widget:** Already close — verify margin bands + Δ vs prev column | ~15 |
| B8 | **Vendor widgets:** Performance cards + Directory table with spend rollup | ~25 |
| B9 | Restaurant context subtitle: "Palm India · Franchise · parent #813 · Last synced X min ago" | ~5 |
| **Total Phase B** | | **~280 lines** |

### Phase C (P1): Smart Purchase — Design Polish
**Gap:** 16 design gaps identified in investigation. Functional but doesn't match mockup.

| Item | Description | Est. Lines |
|---|---|---|
| C1 | **Vendor suggestion reasoning:** "Cheapest · 8% below X", "Stable · same rate × 6", "Only vendor with history", "Override · X% costlier" | ~50 |
| C2 | **Stock status badges per ingredient:** "Out of stock" (red), "Low · X days left" (amber), "X days left · trending ↑/stable" (green) | ~30 |
| C3 | **ON-HAND color coding:** Red (out), Amber (low), Green (ok) + unit conversion (gm→kg, ml→ltr) | ~25 |
| C4 | **"suggest: X" hint** below QTY input in orange text | ~10 |
| C5 | **"Review & Submit" button** (green, top-right) + **"AUTO SHOPPING LIST · X-DAY HORIZON"** section header with "N items suggested" badge | ~20 |
| C6 | **"Add Ad-hoc Item"** orange link in section header | ~5 |
| C7 | **Override warning row:** Orange bg tint + warning text when user picks costlier vendor | ~20 |
| C8 | **Row status backgrounds:** Red tint (out of stock), Amber tint (low), Blue tint (ad-hoc) | ~15 |
| C9 | **Grouped Vendor Preview** at bottom: "Will submit as X vendor POs" with per-vendor cards + Payment Method | ~25 |
| C10 | **Column names:** "PROJECTED NEED · 7D", "QTY TO BUY *", "VENDOR * (suggested)" instead of abbreviated | ~5 |
| C11 | **Horizon picker:** "Purchase for" label + description text | ~5 |
| **Total Phase C** | | **~210 lines** |

### Phase D (P2): Other Screens Polish
**Gap:** Current Stock, Stock Audit, Setup screens need design alignment.

| Item | Description | Est. Lines |
|---|---|---|
| D1 | **Current Stock:** "Stock Intelligence Phase 2" banner CTA styling, data loading fix investigation (Kunafa Mahal shows 0s) | ~15 |
| D2 | **Stock Audit:** Save Adjustments button visibility, drift color coding (red −, green +/match with icons), reason dropdown disabled when no drift | ~30 |
| D3 | **Setup — Ingredients:** Add Export, Import, Bulk Edit toolbar buttons. Category orange highlight + count badge styling | ~30 |
| D4 | **Setup — Vendors:** Table with type badges (Wholesale blue, Retail green, Grocery purple), contact/phone/GST columns per mockup | ~20 |
| D5 | **Setup — Wastage Reasons:** Card-style list with edit/delete icons + inline add form with orange border | ~15 |
| D6 | **Absorb CR-075 S2:** Filter UX polish (result count, clear button, active filter indicator) | ~15 |
| **Total Phase D** | | **~125 lines** |

---

## Total Estimated Effort

| Phase | Priority | Screens | Est. Lines |
|---|---|---|---|
| **A** Navigation Tab Bar | P0 | ALL | ~130 |
| **B** Dashboard Widgets | P1 | Dashboard | ~280 |
| **C** Smart Purchase Polish | P1 | Smart Purchase | ~210 |
| **D** Other Screens | P2 | Current Stock, Stock Audit, Setup | ~125 |
| **TOTAL** | | | **~745 lines** |

---

## Blast Radius

- **New files:** 1–2 (InventoryTabBar.jsx, possibly InventoryLayout.jsx)
- **Modified files:** ~12 (all inventory panels + widgets + page wrappers)
- **Hotspot files:** Sidebar.jsx (additive only — keep existing, add tab bar), App.js (no change needed if tab bar is per-page)
- **No API changes, no new endpoints, no transform changes**
- **Risk:** MEDIUM per phase (mostly UI/CSS work), HIGH overall due to file count

---

## Open Questions

| # | Question | Default |
|---|---|---|
| OQ-1 | Should the horizontal tab bar REPLACE the sidebar inventory children, or exist ALONGSIDE them? | **ALONGSIDE** — owner said "LHS navigation as well as tabs" |
| OQ-2 | Should Receive tab show pending count badge for normal restaurants (where pill is hidden)? | **NO** — hide entire pill for normal |
| OQ-3 | Should the tab bar be sticky (fixed at top when scrolling)? | **YES** — mockup shows it fixed below the header |

---

## Fast Lane Eligibility: NO
- 745 lines, 12+ files, HIGH risk
- Full gate flow required

---

## Absorbs / Supersedes

| Item | Relationship |
|---|---|
| CR-075 S2 (filter UX polish) | **ABSORBED** into Phase D |
| CR-075 remaining polish items | **ABSORBED** |
| CR-079 "nav restructure" remaining design debt | **ABSORBED** |

---

## Next: Planning Gate 2 (Impact Analysis) → Gate 3 (Phased Implementation Plans)
