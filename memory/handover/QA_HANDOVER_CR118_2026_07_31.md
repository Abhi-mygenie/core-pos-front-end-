# QA Handover — CR-118 — Aggregator KOT & Bill Manual Print

**Document:** QA_HANDOVER_CR118_2026_07_31.md
**Implementation Agent Date:** 2026-07-31
**QA Agent:** Pending

---

## 1. Registry Sync Confirmation

```
Registry synced: YES
Item: CR-118
Status: IMPLEMENTED
Gate: 5a
Sprint: pos_5_0
EXIT GATE checks:
  ✅ registry.json — CR-118 IMPLEMENTED, gate 5a
  ✅ Code markers — // CR-118 in all 7 modified files
  ✅ Compile — webpack compiled with 1 warning (pre-existing SettlementReportMockup.jsx:140, 0 new)
```

---

## 2. Files Changed

| File | Lines | Change |
|------|-------|--------|
| `api/transforms/aggregatorTransform.js` | ~27-28, 70 | `aggrId` field added; `customer` display uses `aggrigator_id` |
| `api/transforms/profileTransform.js` | ~337-338 | `aggregatorAutoBill` + `aggregatorAutoBillStage` mapped |
| `api/constants.js` | ~469 | `MANUALLY_PRINT` endpoint added to `AGGREGATOR_ENDPOINTS` |
| `api/services/aggregatorService.js` | ~19-24 | `manuallyPrintAggregator(aggrOrderId, aggrOrderType)` function |
| `components/dashboard/AggregatorOrderPopOut.jsx` | ~12, 64-68, 106-108, 120-128, UI block | KOT/Bill checkboxes + print-on-accept handler |
| `components/cards/OrderCard.jsx` | ~7, 257-325, 485-487, 1015-1016, ~1060+ | import, handler, ID chip, KOT rewire, Bill button |
| `components/cards/TableCard.jsx` | ~11, 241-252, 464-469, 496-499, 512 | import, handler, KOT+Bill at fOS=1, KOT+Bill at fOS=2 |

---

## 3. Verification Matrix — Code Checks (QA must confirm)

| Check | Command | Expected |
|-------|---------|---------|
| C1 | `grep -c 'aggrId' /app/frontend/src/api/transforms/aggregatorTransform.js` | ≥1 |
| C2 | `grep -c 'MANUALLY_PRINT' /app/frontend/src/api/constants.js` | 1 |
| C3 | `grep -c 'manuallyPrintAggregator' /app/frontend/src/api/services/aggregatorService.js` | 1 |
| C4 | `grep -c 'aggregatorAutoBill' /app/frontend/src/api/transforms/profileTransform.js` | 2 |
| C5 | `grep -c 'agg-print-kot-checkbox\|agg-print-bill-checkbox' /app/frontend/src/components/dashboard/AggregatorOrderPopOut.jsx` | 2 |
| C6 | `grep -c 'handleAggregatorPrint' /app/frontend/src/components/cards/OrderCard.jsx` | ≥2 |
| C7 | `grep -c 'handleAggregatorPrint' /app/frontend/src/components/cards/TableCard.jsx` | ≥2 |
| C8 | `grep -c 'agg-kot-btn\|agg-bill-btn' /app/frontend/src/components/cards/TableCard.jsx` | ≥2 |

---

## 4. Test Cases

| TC# | Description | Steps | Expected |
|-----|-------------|-------|---------|
| TC-1 | KOT/Bill checkboxes in accept popup | Dashboard: aggregator order at fOS=0/7 arrives → popup opens → observe UI | "Print KOT" + "Print Bill" checkboxes visible above prep time pills |
| TC-2 | KOT checkbox default reflects `aggregatorAutoKot` setting | Same popup → observe KOT checkbox state | Checked if `aggregatorAutoKot=true` in restaurant settings; unchecked otherwise |
| TC-3 | Bill checkbox default reflects `aggregatorAutoBill` + stage | Same popup → observe Bill checkbox state | Checked only if `aggregatorAutoBill=true` AND `aggregatorAutoBillStage=acknowledged` |
| TC-4 | Accept with KOT checked fires print | Open popup → ensure KOT checked → accept order → check console | Console log: `[AggregatorPopOut] CR-118: KOT print` OR Network: POST `/api/v1/urbanpiper/manually-print-aggregator` with `aggr_order_type: "aggr_kot"` |
| TC-5 | Accept with Bill checked fires print | Open popup → ensure Bill checked → accept → check console/network | Network: POST `/manually-print-aggregator` with `aggr_order_type: "aggr_bill"` |
| TC-6 | Print failure is non-blocking | Accept order while print API returns 500 → observe accept flow | Order accepted successfully; console shows warn (not error that blocks accept) |
| TC-7 | OrderCard KOT button wired to aggregator endpoint | Expand aggregator order card → click printer icon (KOT) | Network: POST `/manually-print-aggregator` with `aggr_order_type: "aggr_kot"` (NOT `order-temp-store`) |
| TC-8 | OrderCard Bill button visible at fOS=2 | Aggregator order at fOS=2 → expand → observe footer | "Bill" button visible + printer icon |
| TC-9 | OrderCard Bill button wired to aggregator endpoint | fOS=2 card → click Bill → check network | Network: POST `/manually-print-aggregator` with `aggr_order_type: "aggr_bill"` |
| TC-10 | OrderCard ID chip shows `aggrId` | Expand aggregator card → observe ID chip | Shows `#1783932198` (actual Swiggy ID) not `#002327` (restaurant ID) |
| TC-11 | TableCard fOS=1 shows KOT icon | Dashboard delivery column: fOS=1 card → observe | Printer icon + "Ready" button visible |
| TC-12 | TableCard fOS=2 shows KOT + Bill icons | Dashboard delivery column: fOS=2 card → observe | Printer (KOT) icon + "Ready to Dispatch" text visible |
| TC-13 | TableCard KOT fires aggregator endpoint | fOS=1 tile → click printer → check console | Console/network: POST `/manually-print-aggregator` with `aggr_kot` |

---

## 5. Regression Tests

| R# | What | Why |
|----|------|-----|
| R1 | POS KOT (non-aggregator) still calls `printOrder` | KOT click uses ternary: `isAggregator ? handleAggregatorPrint : handlePrintKot` |
| R2 | POS tiles unchanged on dashboard | `handleAggregatorPrint` only called inside `isAggregator &&` blocks |
| R3 | Order accept still completes even if print fails | `.catch()` on print calls is non-blocking |
| R4 | BUG-285: "Ready to Dispatch" still text label (TableCard fOS=2) | CR-118 adds KOT icon + Bill icon alongside existing text label |

---

## 6. Credentials + Environment

| Field | Value |
|---|---|
| Login | `owner@18march.com` / `Qplazm@10` |
| URL | From `REACT_APP_BACKEND_URL` in `/app/frontend/.env` |
| Route | Dashboard (default) → Delivery column |
| Prerequisite | Live aggregator orders needed for TC-1 through TC-6 (fOS=0/7 popup); fOS=1 and fOS=2 orders typically present |
| Note | TC-4/5/6 require Network tab or console inspection. TC-7–13 are browser-verifiable. |
