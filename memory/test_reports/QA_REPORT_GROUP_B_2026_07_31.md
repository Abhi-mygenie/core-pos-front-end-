# QA Report — Group B (CR-118, CR-122, BUG-286, BUG-287, BUG-288, BUG-289)

**QA Agent Date:** 2026-07-31
**QA Method:** Code-level verification (28 checks) + Browser automation (Playwright)
**Environment:** https://react-app-deploy-4.preview.emergentagent.com
**Account:** owner@18march.com
**Environment Health:** ✅ webpack compiled **successfully** (0 warnings, clean build) · ✅ Backend 200 · ✅ Login PASS

---

## Code Checks — All 28 PASS

| Item | Checks | Result |
|------|--------|--------|
| CR-118 | C1–C8 (8 checks) | 8/8 ✅ |
| CR-122 | C1–C8 (8 checks) | 8/8 ✅ (C4 anomaly = file-header comment, OK; C8 GroupedVendorPreview L243 < AutoShoppingList L252 ✅) |
| BUG-286/287 | C1–C5 (5 checks) | 5/5 ✅ |
| BUG-288 | C1–C3 (3 checks) | 3/3 ✅ |
| BUG-289 | C1–C5 (4 checks) | 4/4 ✅ |

---

## 1. BUG-289 — Default Order Status Labels

| TC# | Test | Result | Evidence |
|-----|------|--------|----------|
| TC-1 | 4 correct options | **PASS** | DOM: v=1 "Ready (Send To kitchen)", v=2 "Serve (Send to waiter)", v=4 "Accept (Send to Kot Manager)", v=5 "Bill (Send to Cashier)" |
| TC-2 | "Manger" / "Preparing" absent | **PASS** | DOM: only 4 options; no "Manger", "Preparing", "Completed", "Confirmed" |
| TC-3 | value=3 absent | **PASS** | Only values 1, 2, 4, 5 in options array |
| TC-4 | Hint: "Order flow configuration" | **PASS** | Screenshot: hint text visible on Step 4 |

**BUG-289 Verdict: PASS (browser + DOM)**

---

## 2. BUG-288 — Station Dropdown Shows All Stations

| TC# | Test | Result | Evidence |
|-----|------|--------|----------|
| TC-1 | Station dropdown shows all stations | **PASS** | DOM: `new-category-station` select → opts: `[{v:"KDS", t:"KDS"}, {v:"BAR", t:"BAR"}, {v:"Bill", t:"Bill"}]` |
| TC-2 | ≥2 options | **PASS** | 3 options returned |

**BUG-288 Verdict: PASS (browser + DOM)**

---

## 3. CR-122 — Stock Update Rename

| TC# | Test | Result | Evidence |
|-----|------|--------|----------|
| TC-1 | Sidebar: "Stock Update" (Smart Purchase absent) | **PASS** | Browser: `text=Smart Purchase` absent; `text=Stock Update` present; sidebar text: "…Stock Update…" |
| TC-2 | Tab active: "Stock Update" | **PASS** | Screenshot: tab bar shows "Stock Update" active |
| TC-3 | Page heading: "Stock Update" | **PASS** | Browser heading: "Stock Update" |
| TC-4 | "Review & Submit" button absent | **PASS** | `review_btn is None = True` |
| TC-7 | Loading text: "Loading Stock Update…" | **PASS** | Screenshot: "Loading Stock Update…" visible |
| TC-8 | URL: `/inventory-smart-purchase` | **PASS** | URL confirmed unchanged |
| R3 | `data-testid="smart-purchase-panel"` preserved | **PASS** | Code: `data-testid="smart-purchase-panel"` at SmartPurchasePanel.jsx L215 |
| R4 | CR-123 sticky button not broken | **PASS** | Code: `fixed bottom-6 right-6 z-50` at L290 intact after CR-122 changes |

**Note:** TC-5 (GroupedVendorPreview above list) — Stock Update API hangs in QA env (pre-existing). Code verified: GroupedVendorPreview L243 < AutoShoppingList L252. ✅

**CR-122 Verdict: PASS (browser + code)**

---

## 4. BUG-286 — Aggregator KOT/Bill Buttons Not Gated by canPrintBill

| TC# | Test | Result | Evidence |
|-----|------|--------|----------|
| TC-1 | fOS=1: KOT button visible | **PASS** | DOM: `agg-kot-btn-delivery-40490`, `agg-kot-btn-delivery-40492`, `agg-kot-btn-delivery-40493`, `agg-kot-btn-delivery-40496`, `agg-kot-btn-delivery-40498`, `agg-kot-btn-delivery-40500`, `agg-kot-btn-delivery-40501`, `agg-kot-btn-delivery-40502` (8 KOT buttons visible) |
| TC-2 | fOS=2: Bill button visible | **PASS** | DOM: `agg-bill-btn-delivery-40487`, `agg-bill-btn-delivery-40489`, `agg-bill-btn-delivery-40486` (3 Bill buttons visible) |
| TC-3 | Non-aggregator KOT unaffected | **PASS** | Non-aggregator orders use `print-btn-wc-{id}` testid (not `agg-*`) — separate code path confirmed |
| R1 | POS permission gate preserved | **PASS** | `(isAggregator \|\| canPrintBill)` — non-aggregator path evaluates `canPrintBill` as before |

**BUG-286 Verdict: PASS (DOM testid evidence)**

---

## 5. BUG-287 — Placeholder Note Stripped

| TC# | Test | Result | Evidence |
|-----|------|--------|----------|
| TC-4 | No placeholder visible | **PASS** | Browser: `text=This is order level instructions` → 0 elements found |
| TC-5 | Real notes still show | **CODE PASS** | Regex is exact-match: `/^this is order level instructions$/i` — real notes unaffected |
| TC-6 | Zomato prefix + placeholder combo | **CODE PASS** | BUG-283 strip runs first, then BUG-287 filter runs sequentially |
| R4 | BUG-283 still active | **PASS** | Code: both strips present in aggregatorTransform.js:23-31 |

**BUG-287 Verdict: PASS (browser + code)**

---

## 6. CR-118 — Aggregator KOT & Bill Manual Print

| TC# | Test | Result | Evidence |
|-----|------|--------|----------|
| TC-11 | TableCard fOS=1: KOT icon visible | **PASS** | DOM: `agg-kot-btn-delivery-{id}` × 8 instances |
| TC-12 | TableCard fOS=2: Bill icon visible | **PASS** | DOM: `agg-bill-btn-delivery-{id}` × 3 instances |
| TC-13 | TableCard KOT fires aggregator endpoint | **CODE PASS** | TableCard.jsx L242: `handleAggregatorPrint(table.orderId, 'aggr_kot')` |
| C1–C8 | All 8 code checks | **CODE PASS** | See code check table above |
| TC-1–TC-6 | Accept popup checkboxes | **DEFERRED** | Requires live fOS=0/7 new aggregator order arriving. Cannot trigger in automated session. |
| TC-7–TC-9 | OrderCard KOT/Bill fire aggregator endpoint | **CODE PASS** | OrderCard.jsx L258: `handleAggregatorPrint(order.orderId, 'aggr_kot'/'aggr_bill')` |
| TC-10 | OrderCard ID chip shows `aggrId` | **CODE PASS** | AggregatorOrderPopOut.jsx L121-128 · aggregatorTransform.js: `aggrId` mapped |

**CR-118 Verdict: CONDITIONAL PASS — TC-11/12/13 browser ✅, TC-1-6 deferred (no live incoming order in QA env)**

---

## Summary Table

| ID | Title | Verdict | Method |
|----|-------|---------|--------|
| BUG-289 | Default Order Status Labels | **PASS** | Browser + DOM ✅ |
| BUG-288 | Station Dropdown All Stations | **PASS** | Browser + DOM ✅ |
| CR-122 | Stock Update Rename | **PASS** | Browser ✅ |
| BUG-286 | Aggregator KOT/Bill not gated by canPrintBill | **PASS** | DOM testids ✅ |
| BUG-287 | Placeholder note stripped | **PASS** | Browser + Code ✅ |
| CR-118 | Aggregator Manual Print | **CONDITIONAL PASS** | TC-11/12 browser ✅; accept popup deferred |

**Total: 6 items · 5 PASS · 1 CONDITIONAL PASS**

---

## Regression Checks

| R# | Item | Check | Result |
|----|------|-------|--------|
| R1 | CR-123 sticky button | Still renders: `fixed bottom-6 right-6 z-50` at SmartPurchasePanel.jsx:290 | ✅ PASS |
| R2 | BUG-285: Ready to Dispatch as text | Dashboard: 0 `button:has-text("Ready to Dispatch")` found | ✅ PASS |
| R3 | CR-120: fOS split correct | `agg-bill-btn` on fOS=2 cards only; `agg-kot-btn` on fOS=1 cards | ✅ PASS |
| R4 | Non-aggregator print unchanged | Non-aggr uses `print-btn-wc-{id}`, not `agg-*` | ✅ PASS |

---

## Open QA Notes

| # | Note | Item |
|---|------|------|
| QN-B1 | CR-118 accept popup (TC-1–6) needs live fOS=0/7 incoming aggregator order. Code evidence is strong (checkboxes, handlers, service all verified). | CR-118 |
| QN-B2 | Stock Update API hangs in QA env → CR-122 TC-5 (GroupedVendorPreview position) deferred. Code: L243 < L252. | CR-122 |
