# CR-118 — Aggregator KOT & Bill Manual Print

**ID:** CR-118  
**Type:** CR (Feature / Enhancement to Aggregator Module)  
**Priority:** P1  
**Risk:** LOW  
**Area:** Print / KOT / Bill → Aggregator Orders  
**Sprint:** pos_5_0  
**Intake Date:** 2026-07-30  
**Gate:** 0-1  
**Related:** CR-106 (Aggregator Module — GATE 3, awaiting Gate 4), CR-108 (Auto-KOT on Accept)

---

## Owner Description

> "There is a CR where aggregator KOT and bill print is still pending — for manually print aggregator KOT and bill."

---

## Problem Statement

Aggregator orders (Swiggy/Zomato via UrbanPiper) currently have no way to **manually trigger a print** for:
1. KOT (Kitchen Order Ticket) — `aggr_kot`
2. Bill — `aggr_bill`

The backend has exposed a dedicated endpoint for this. The frontend has not wired it up yet. Staff need to be able to reprint/manually print an aggregator order's KOT or bill at any time (e.g., if the printer missed it, or for a reprint request).

---

## Feature Scope

### API
**Endpoint:** `POST /api/v1/urbanpiper/manually-print-aggregator`  
**Auth:** Bearer token  

**Request body:**
```json
{
  "aggr_order_id": "40475",
  "aggr_order_type": "aggr_bill"
}
```

**`aggr_order_type` values:**
| Value | Triggers |
|-------|----------|
| `aggr_bill` | Prints the customer bill for the aggregator order |
| `aggr_kot` | Prints the Kitchen Order Ticket (KOT) for the aggregator order |

**Verified response (live probe 2026-07-30):**
- `{ "error": "Failed to send print request" }` on non-existent order → endpoint is live, correct error
- Success response: expected `{ "status": "success" }` or similar (confirm from backend docs)

**`aggr_order_id` source:**  
The aggregator order's own ID (not the POS order_id). In `aggregatorTransform.js`, this would be the `id` field from the aggregator order object.

### UI Placement

1. **`AggregatorOrderPopOut.jsx`** — Primary location
   - Add two buttons: "Print KOT" and "Print Bill"
   - Only visible after order is accepted (status > 0)
   - Button states: idle / loading / success / error (brief toast)
   - `aggr_order_id` = from the order object in the popout

2. **`OrderCard.jsx`** — Secondary location (for accepted/active aggregator orders)
   - Add a print icon/button in the aggregator order card action row
   - Match existing OrderCard print button pattern
   - Guard with `isAggregator` flag

3. **Optional: `AllOrdersReportPage.jsx` reprint column** — If aggregator orders appear in the report, a "Reprint" action could call this endpoint instead of `order-temp-store`.

### New Service Function
In `aggregatorService.js`:
```javascript
export const manuallyPrintAggregator = async (aggrOrderId, aggrOrderType) => {
  const response = await axios.post(
    `${API_URL}${AGGREGATOR_ENDPOINTS.MANUALLY_PRINT}`,
    { aggr_order_id: aggrOrderId, aggr_order_type: aggrOrderType }
  );
  return response.data;
};
```

New constant in `constants.js` under `AGGREGATOR_ENDPOINTS`:
```javascript
MANUALLY_PRINT: '/api/v1/urbanpiper/manually-print-aggregator',
```

---

## Open Questions (OQs)

| # | Question | Blocking? |
|---|----------|-----------|
| OQ-1 | Should "Print KOT" and "Print Bill" buttons appear BEFORE accept (for pre-accept preview) or only AFTER accept? | YES |
| OQ-2 | Should error response be silent (console only) or shown as a toast to staff? | COSMETIC |
| OQ-3 | Is this CR blocked on CR-106 Gate 4 GO? Or can it be implemented independently? If AggregatorOrderPopOut doesn't exist yet (CR-106 awaiting GO), which existing component should host these buttons? | YES |
| OQ-4 | Should the "Reprint" action on `AllOrdersReportPage` also call this endpoint for aggregator rows (replacing the regular `order-temp-store` call)? | SCOPE |

---

## Duplicate / Related Check

| ID | Title | Verdict |
|----|-------|---------|
| CR-106 | Aggregator Integration Module | RELATED — CR-118 adds print capability to CR-106's UI |
| CR-108 | Auto-KOT on Accept | RELATED — CR-108 is auto-trigger; CR-118 is manual trigger → DISTINCT |
| No existing manual print for aggregator in codebase | DISTINCT |

**Verdict: DISTINCT**

---

## Blast Radius

| File | Change Type | Size Estimate |
|------|------------|---------------|
| `api/services/aggregatorService.js` | +1 function | ~15 lines |
| `api/constants.js` | +1 constant in AGGREGATOR_ENDPOINTS | ~1 line |
| `components/dashboard/AggregatorOrderPopOut.jsx` | +2 buttons + handler | ~30 lines |
| `components/cards/OrderCard.jsx` | +print icon for aggregator (conditional) | ~15 lines |

**Total: 4 files, ~60 net lines**  
**Risk: LOW** (isolated to aggregator UI and a new service function; no financial logic)

**Note:** If CR-106 is NOT yet implemented (Gate 4 pending), `AggregatorOrderPopOut.jsx` may not exist. In that case, this CR can be incorporated into CR-106's implementation plan as an addition.

---

## Acceptance Criteria

```
AC-1: "Print KOT" button in AggregatorOrderPopOut calls endpoint with aggr_order_type="aggr_kot"
AC-2: "Print Bill" button in AggregatorOrderPopOut calls endpoint with aggr_order_type="aggr_bill"
AC-3: aggr_order_id is correctly sourced from the aggregator order object
AC-4: Loading state shown during API call; error shown as toast on failure
AC-5: Buttons are guarded (only shown for aggregator orders, not regular POS orders)
AC-6: No regression to existing regular order print flow (order-temp-store)
```

---

## Evidence

- API probe: `/app/memory/evidence/CR-118/` — endpoint live at preprod, returns `{ error: "Failed to send print request" }` for non-existent order (expected behavior)
- Test credentials: `owner@18march.com` / `Qplazm@10` (preprod)
