# CR-079: Inventory Information Architecture Restructure — Intelligence-as-Dashboard

**Type:** CR (IA / Navigation Restructure)
**Priority:** P2 (Medium)
**Risk:** MEDIUM (sidebar + routing + labels · non-financial · UX-facing)
**Status:** INTAKE
**Registered:** 2026-07-18
**Sprint:** pos_5_0_wave_2

---

## Summary

Reshape the Inventory module's top-level navigation so that the **Intelligence view is the default Dashboard** — the first screen an operator sees when opening Inventory. Rename the old "Dashboard" (a KPI + stock-list surface) to **"Current Stock"** to reflect what it actually is. Wire the new **"Smart Purchase"** (CR-078) label and **"Stock Audit"** (renamed from "Physical Stock Count" · owner-locked B7 / FB-4) into the same nav restructure, and expose the future **"Receive"** pill (CR-077) conditionally on `restaurant_type_flag ∈ {franchise, master}`.

Small in code footprint but structural in impact — this is what shifts the module's mental model from "inventory list" to "inventory intelligence."

---

## Owner Context

- Feedback origin: FB-4 (Stock Audit rename · already locked as B7 in Gate 2 for CR-075) + FB-5 (Intelligence = Dashboard · owner ruling 2026-07-18)
- Design phase **COMPLETE** — mock v5 nav pill row shows exact final labels and order
- Q1-b locked: rename old-Dashboard → **"Current Stock"**
- Q2 locked: Purchase Entry → **"Smart Purchase"**
- Q3-d locked: KPIs differ per screen (Current Stock keeps inventory counts · Dashboard shows forward-looking KPIs)

## Code Reality Check

**Code Reality: NONE** — no file currently uses these labels/routes in the way CR-079 requires

- `Sidebar.jsx` — existing "Inventory" section with children: Stock Dashboard, Purchase Entry, Physical Stock Count, Inventory Setup, Recipes. All labels change.
- `App.js` — 5 existing inventory routes · needs 1-2 additions (receive) and 3-4 renames
- `pages/InventoryDashboardPage.jsx` — currently the stock-list; will become `InventoryCurrentStockPage.jsx` (rename only)
- `pages/InventoryPurchaseEntryPage.jsx` → `InventorySmartPurchasePage.jsx` (rename · body swap is CR-078)
- `pages/InventoryPhysicalCountPage.jsx` → `InventoryStockAuditPage.jsx` (rename · CR-075-B may cover this)
- No `InventoryIntelligencePage.jsx` currently exists — needs to be CREATED as the new default landing
- Deep-links in emails/docs may reference old URLs — soft-redirect layer needed

## Duplicate Check

- **Classification: DISTINCT · but overlaps with CR-075-B**
- CR-075-B covers the **"Physical Count → Stock Audit"** rename in isolation (~55 lines)
- CR-079 subsumes it as part of the larger IA restructure · **recommended to fold CR-075-B into CR-079** to avoid dependency ordering
- **Owner decision needed:** absorb CR-075-B into CR-079, or ship CR-075-B first?

## Blast Radius (preliminary · refine at impact analysis)

- **Estimated scope: SMALL-MEDIUM** — ~55-80 lines across 6-8 files
- New files (planned):
  - `pages/InventoryIntelligencePage.jsx` (or promote to `InventoryDashboardPage.jsx` if we swap ids)
  - `components/inventory/intelligence/*` — Reorder Forecast · Consumption Trends · Cost Trend · Vendor Performance · Recipe Cost & Margin · Vendor Directory widgets (though these may live inside CR-078 for reuse)
- Modified files:
  - `Sidebar.jsx` — restructure inventory section · new labels · conditional Receive item (depends on CR-077 having shipped `restaurantTypeFlag` in context)
  - `App.js` — route additions/renames · default `/inventory` redirect to Intelligence Dashboard
  - `pages/Inventory*Page.jsx` — rename files (git mv to preserve history)
  - `constants.js` — update any hardcoded route strings
  - Breadcrumb components if any
- Hotspot files: NONE
- **Fast Lane eligible: PARTIAL** — the pure rename portion (CR-079-a) might qualify · the full IA restructure (CR-079-b) does not

## Endpoints

**No new endpoints** — pure client-side navigation restructure. Consumes:
- `GET /profile` (via RestaurantContext) — for `restaurant_type_flag` gate on Receive pill (added by CR-077)

## Evidence

- Mock v5 nav pill row: `cr072-inventory-mockup-v5-full.html` — full final navigation state visible
- Preview: `https://react-pos-frontend-4.preview.emergentagent.com/cr072-inventory-mockup-v5-full.html`

## Open Questions (deferred to Impact Analysis · Gate 2)

| # | Question | Notes |
|---|---|---|
| OQ-1 | Absorb CR-075-B (Physical Count → Stock Audit rename) into CR-079 or keep separate? | Recommend: absorb |
| OQ-2 | Default `/inventory` route redirects to Intelligence Dashboard — hard redirect or soft? | Hard: `<Navigate to="/inventory/dashboard"/>` recommended |
| OQ-3 | Legacy deep-link handling — should `/inventory/purchase` still work (redirect to `/inventory/smart-purchase`)? | Owner ruling needed |
| OQ-4 | Are the widgets on Intelligence Dashboard owned by CR-079 (this) or by CR-078 Smart Purchase (since they share logic)? | Design suggests: widgets live in CR-078's file tree · CR-079 just orchestrates the page |
| OQ-5 | Sidebar Receive pill — visible for `master` too or just `franchise`? Master outlets typically use Dispatch flow, not Receive | Owner ruling needed (probably: BOTH visible, different sub-tabs) |
| OQ-6 | Should the Intelligence Dashboard show for all outlets or only ones with sufficient purchase/consumption history? | Design: show always · empty states inside widgets |

## Design Note

Design **COMPLETE** — mock v5 already shows the final nav pill row, screen order, and default-active state. No new mock iteration expected.

The main planning question is **whether CR-079 ships before, after, or bundled with CR-078**:
- If **before**: users see renamed nav + empty Smart Purchase page (bad UX for the interim)
- If **after**: nav rename delayed unnecessarily
- If **bundled**: cleanest ship — same PR

**Recommended:** bundle CR-079 with CR-078 as a single ship (CR-078+079 combo) since they share files and mock.

---

## References

- Preview: `https://react-pos-frontend-4.preview.emergentagent.com/cr072-inventory-mockup-v5-full.html`
- Impact Analysis (§FB Round 2 §FB-5): `/app/memory/impact/CR-075_CR-076_BUG-201_IMPACT_ANALYSIS.md`
- Handover: `/app/memory/handover/SESSION_HANDOVER_2026_07_18_INVENTORY_PLANNING.md`
- Parent CR: CR-075 (split origin)
- Related CRs: CR-075-B (Stock Audit rename · candidate for absorption) · CR-077 (adds Receive pill dependency) · CR-078 (uses Smart Purchase label from this restructure)
