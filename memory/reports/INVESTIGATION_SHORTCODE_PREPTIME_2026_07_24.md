# Investigation Report — Short Code + Prep/Serve Time on OrderCard — 2026-07-24

**Requested by:** Owner
**Agent Role:** INVESTIGATION
**Steps Used:** 10/10
**Confidence:** HIGH (code traced end-to-end)

---

## Issue 1: Short Code Not Working

### Hypotheses Tested

| # | Hypothesis | Test Method | Result | Evidence |
|---|---|---|---|---|
| H1 | Short code toggle removed in branch merge | Grep codebase for shortCode/short_code | **ELIMINATED** | Toggle EXISTS at `RestaurantSettingsPage.jsx:424`, transform reads/writes at `restaurantSettingsTransform.js:44,153` |
| H2 | Short code not saving to backend | Trace transform toAPI path | **ELIMINATED** | `short_code: toYesNo(s1.shortCode)` at L153 — sends to backend on save |
| H3 | Short code not displayed on POS order cards | Grep OrderCard + CartPanel for shortCode/itemCode | **CONFIRMED** | ZERO references to itemCode/shortCode in OrderCard.jsx or CartPanel.jsx |
| H4 | Per-item item_code not in order transform | Grep orderTransform for item_code | **CONFIRMED** | orderTransform does NOT map `item_code` from order detail items |

### Data Flow Trace

```
MENU MANAGEMENT PATH (EXISTS ✅):
  API food.item_code → productTransform.js:143 (itemCode) → ProductForm.jsx, BulkEditor.jsx
  ↳ Menu admin can see/edit item codes per food item

SETTINGS PATH (EXISTS ✅):
  API restaurants[0].short_code → restaurantSettingsTransform.js:44 (shortCode bool)
  → RestaurantSettingsPage.jsx:424 (toggle ON/OFF) → saves back to API
  ↳ Toggle enables/disables short code feature

ORDER DISPLAY PATH (MISSING ❌):
  API orderDetails[].food_details.item_code → NOT mapped in orderTransform.js
  → OrderCard.jsx → ZERO references to itemCode or shortCode
  → CartPanel.jsx → ZERO references to itemCode or shortCode
  ↳ Short code NEVER appears on order cards or cart

PRINT/BILL PATH (BACKEND-OWNED — NOT FE TERRITORY):
  print_order / order-temp-store API → backend print agent
  → bill/KOT PDF template → backend controls rendering
  ↳ Whether short code appears on printed bill/KOT is entirely backend print agent
```

### Root Cause

**Classification: FEATURE_GAP (not a regression)**

The short code feature has TWO layers:
1. **Settings toggle + per-item code entry** — FE-complete, exists, saves correctly ✅
2. **Display on order cards / bills / KOT** — NEVER IMPLEMENTED in FE. Bills/KOT are backend print agent territory.

**This is NOT a branch merge loss.** BUG-143 was closed as "FE COMPLETE, BACKEND-OWNED" on 2026-07-11. The investigation at that time already identified that the FE toggle is wired but the consumer (where the code appears on output) was not located.

### Existing Registration
- **BUG-143** — CLOSED (FE COMPLETE, BACKEND-OWNED)
- No open CR/BUG for "display short code on OrderCard"

### Recommendation
If owner wants short codes visible on POS order cards (not just printed bills):
→ **NEW CR needed** — map `food_details.item_code` in orderTransform, display next to item name in OrderCard. Small scope (~3 lines in orderTransform + ~5 lines in OrderCard).

If owner wants short codes on printed bills/KOT:
→ **BACKEND team** — the print agent controls bill/KOT template rendering.

---

## Issue 2: Preparation & Serve Time on Order View Card (Item Level)

### Hypotheses Tested

| # | Hypothesis | Test Method | Result | Evidence |
|---|---|---|---|---|
| H1 | Item-level prep/serve time display was removed in merge | Grep OrderCard for prepTime/serveTime/readyAt/serveAt per item | **ELIMINATED** | NEVER existed — no code trace found in any branch artifact |
| H2 | OrderTimeline shows item-level times | Read OrderTimeline.jsx | **ELIMINATED** | OrderTimeline uses ORDER-LEVEL timestamps only (L559-561: `order.createdAt`, `order.readyAt`) |
| H3 | Per-item readyAt/serveAt data available but not rendered | Trace orderTransform item mapping | **CONFIRMED** | orderTransform.js:137-140 maps `item.readyAt`, `item.serveAt`, `item.createdAt` per item — DATA EXISTS but OrderCard DOESN'T USE IT |
| H4 | Configured prep/serve time (from food catalog) available | Check productTransform | **CONFIRMED (menu only)** | productTransform.js:139-140 maps `prepTimeMin`, `serveTimeMin` — but this is MENU catalog data, not order item data |

### Data Flow Trace

```
ORDER-LEVEL TIMELINE (EXISTS ✅):
  orderTransform.js:254-263 computes order.readyAt (first item ready) + order.servedAt (last item served)
  → OrderCard.jsx:559-563 passes to <OrderTimeline>
  → OrderTimeline.jsx renders: ●──14m──●──3m──● (Placed → Ready → Served)
  ↳ ORDER-LEVEL timeline works. Shows elapsed time between stages.

ITEM-LEVEL TIMESTAMPS (DATA EXISTS, NOT DISPLAYED ❌):
  API orderDetails[].ready_at → orderTransform.js:137 → item.readyAt
  API orderDetails[].serve_at → orderTransform.js:138 → item.serveAt
  API orderDetails[].created_at → orderTransform.js:140 → item.createdAt
  → OrderCard.jsx item rendering (L639-700): DOES NOT USE readyAt/serveAt/createdAt
  ↳ Per-item elapsed prep time (createdAt → readyAt) and serve time (readyAt → serveAt)
     are COMPUTABLE but NEVER RENDERED

CONFIGURED PREP/SERVE TIME (MENU-LEVEL ONLY ❌):
  API food.prepration_time_min → productTransform.js:139 → product.prepTimeMin
  API food.serve_time_in_min → productTransform.js:140 → product.serveTimeMin
  → Available in menu management only (ProductCard, etc.)
  → NOT mapped in orderTransform (food_details.prepration_time_min not extracted)
  → NOT displayed on OrderCard
  ↳ Could be added to orderTransform from food_details, then shown on OrderCard
```

### Root Cause

**Classification: FEATURE_GAP (never implemented)**

Per-item preparation and serve time has NEVER been displayed on the OrderCard. The data exists in the order payload (`ready_at`, `serve_at`, `created_at` per item) and is already mapped in `orderTransform.js:137-140`, but the OrderCard rendering (L639-700) only shows: name, qty, variants, addons, notes, and status action buttons.

**This is NOT a branch merge loss.** No prior CR/BUG implemented this feature. The closest items are:
- BUG-146 (CLOSED) — schedule badge on OrderCard (different: schedule time, not prep/serve time)
- BUG-192 (INTAKE) — Insights Kitchen Ops report showing 0 (different: reporting page, not order card)

### Existing Registration
- **BUG-192** — INTAKE (Insights report, not OrderCard display)
- **BUG-146** — CLOSED (schedule time badge, not prep/serve time)
- No open CR/BUG for "display per-item prep/serve time on OrderCard"

### Recommendation
**NEW CR needed** — two options:

**Option A (Elapsed time per item):**
- Use existing `item.readyAt`, `item.serveAt`, `item.createdAt` from orderTransform
- Compute elapsed prep time: `readyAt - createdAt` → display "Prep: 8m" per item
- Compute elapsed serve time: `serveAt - readyAt` → display "Serve: 3m" per item
- Scope: ~15-20 lines in OrderCard.jsx. Zero new API calls.

**Option B (Configured time + elapsed):**
- ALSO map `food_details.prepration_time_min` and `food_details.serve_time_in_min` in orderTransform
- Display configured vs actual: "Prep: 8m / 5m target" per item
- Scope: ~5 lines in orderTransform + ~20 lines in OrderCard.jsx

---

## Combined Summary

| Issue | Root Cause | Classification | Is Regression? | Existing Item | Action |
|---|---|---|---|---|---|
| Short code not working | FE toggle wired, but display on order cards/bills NEVER implemented in FE. Print is backend-owned. | FEATURE_GAP | **NO** — never existed | BUG-143 (CLOSED) | New CR for FE display OR backend print fix |
| Prep/serve time on order card | Item-level data available in transform but OrderCard doesn't render it. Never implemented. | FEATURE_GAP | **NO** — never existed | None (BUG-192 is different scope) | New CR for OrderCard item-level time display |

**Neither issue is a branch merge loss.** Both are features that were partially wired (data/settings layer) but never connected to the order card display layer.

---

## Retroactive Candidates
NONE — no unregistered code found for these features.

## Evidence Artifacts
All evidence is inline (grep results + code line references). No separate files saved.
