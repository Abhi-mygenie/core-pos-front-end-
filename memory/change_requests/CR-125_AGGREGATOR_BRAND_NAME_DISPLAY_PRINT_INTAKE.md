# CR-125 — Aggregator Brand Name: Display + Print

**ID:** CR-125
**Type:** CR (Feature / Data Wire-up)
**Title:** Aggregator Brand Name — Display on OrderCard + Include in Print Payload
**Filed:** 2026-08-01
**Filed by:** Owner (screenshot + API response evidence)
**Severity:** P2 — MEDIUM (display important for multi-brand restaurants; print parity)
**Risk:** HIGH (touches print payload — R6 print semantics rule; display side alone is MEDIUM)
**Status:** INTAKE COMPLETE — Gate 1
**Sprint:** TBD (POS 5.x)

---

## 1. Owner Request (verbatim)

> "in aggregator order if there is brand name that needs to be displayed and send to printer"
> Screenshot: OrderCard showing aggregator order. API response shows `"brand_name": "sub brand"` in `get-order-list` → `orders[]`

---

## 2. Description

Multi-brand restaurants operating on Swiggy/Zomato via UrbanPiper may have multiple sub-brands on a single POS account. The backend `get-order-list` API already returns `brand_name` at the top level of each order object. Currently:

- **FE does not extract** `brand_name` in `aggregatorTransform.js`
- **OrderCard does not display** brand name anywhere
- **Print payload** (`manuallyPrintAggregator`) does not include `brand_name`

Required:
1. Extract `brand_name` in the aggregator transform
2. Display it on the OrderCard for aggregator orders (where `brand_name` is non-null)
3. Include `brand_name` in the `manuallyPrintAggregator` print payload so kitchen/counter staff see it on the printed ticket

---

## 3. Evidence

- **Source:** OWNER-REPORTED
- **Confidence:** CONFIRMED (owner provided screenshot + API response JSON)
- **Screenshot:** See owner-attached screenshot (OrderCard UI + DevTools JSON panel)
- **Evidence path:** `/app/memory/evidence/CR-125/`

**API field location:**
```
GET /api/v1/vendoremployee/urbanpiper/get-order-list
Response: {
  "orders": [
    {
      "rider_info": { ... },
      "brand_name": "sub brand",   ← THIS FIELD
      "order_details_order": { "id": 40508, "restaurant_order_id": "478\/002425", ... },
      ...
    }
  ]
}
```

**Field position in API:** Top-level property on each order object in `orders[]` — sibling of `rider_info`, `order_details_food`, `order_details_order`, `customer_details`.

**Current transform output:** `brand_name` is silently dropped. No FE field exists.

---

## 4. Duplicate Check

| Check | Result |
|---|---|
| Code: `grep brand_name` in `/app/frontend/src` | 0 hits — **CODE DOES NOT EXIST** |
| CR-110 — MyGenie Brand Badge | Different: own-delivery badge (M/S/Z letter). Not brand name text. **DISTINCT** |
| CR-118 — Aggregator Manual Print | **RELATED** — CR-118 implemented `manuallyPrintAggregator()`. This CR extends that payload. |
| BUG_TRACKER — brand keyword | 0 hits |

**Classification: DISTINCT** (new work). **Related: CR-118**.

---

## 5. Risk Classification

| Dimension | Risk | Trigger |
|---|---|---|
| Display (OrderCard) | MEDIUM | Component state, non-financial UI display |
| Print payload (aggregatorService) | HIGH | Printing — R6/CRITICAL boundary |
| Combined CR | **HIGH** | Print payload change; data-only additive (no financial mutation, no tax/settlement) |

**Risk: HIGH**
**Reason:** Touches the print payload. Per AGENT_PROMPT_ALPHA R6 and CRITICAL trigger list, printing changes require full gate flow. The actual mutation is additive only (one new string field), no financial/tax values changed. Owner may approve risk downgrade to MEDIUM at Gate 4 given purely additive nature.

**Fast Lane eligible:** NO (touches print service — excluded by rule).

---

## 6. Blast Radius

```bash
# Files touching aggregator transform + print:
/app/frontend/src/api/transforms/aggregatorTransform.js     ← add brandName field
/app/frontend/src/components/cards/OrderCard.jsx            ← display brandName chip
/app/frontend/src/api/services/aggregatorService.js         ← add brand_name to print payload
```

| File | Change | Hotspot? |
|---|---|---|
| `aggregatorTransform.js` | Add `brandName: raw.brand_name \|\| null` | NO |
| `OrderCard.jsx` | Render brand name label on aggregator cards | NO (not in R5 hotspot list) |
| `aggregatorService.js` | Add `brand_name` param to `manuallyPrintAggregator` | NO |

**Estimated scope: SMALL** — 3 files, ~15 total lines.

**Blast radius grep:**
- `aggregatorTransform.js` consumers: 2 (aggregatorService.js, OrderContext)
- `manuallyPrintAggregator` callers: 1 (OrderCard.jsx line ~255-270)
- `isAggregator` in OrderCard: ~30 occurrences (display is gated — safe addition)

---

## 7. Open Questions

| # | Question | Blocking? | Owner Decision |
|---|---|---|---|
| OQ-1 | Where on the OrderCard should `brand_name` be displayed? Below the Swiggy/Zomato chip? Above the order ID? | NO (suggest: small label below source badge) | Pending |
| OQ-2 | Display always, or only when `brand_name` is present and non-empty? | NO (suggest: only when non-null) | Default: conditional |
| OQ-3 | Does the backend print endpoint already read `brand_name` from the DB (send only order ID), or does it need the FE to pass `brand_name` explicitly in payload? | MAYBE — needs curl probe at Gate 2 | Pending |
| OQ-4 | Should `brand_name` appear on KOT only, Bill only, or both? | NO (suggest: both) | Pending |

**OQ-3 is the key question.** If the backend `manually-print-aggregator` endpoint reads `brand_name` from its own DB, FE only needs to handle display (reduces scope to 2 files, LOW risk). If FE must send it, scope stays at 3 files.

---

## 8. Scope Lock (for Planning)

**Files WILL change:**
- `src/api/transforms/aggregatorTransform.js`
- `src/components/cards/OrderCard.jsx`
- `src/api/services/aggregatorService.js` ← conditional on OQ-3

**Files WILL NOT touch:**
- `orderTransform.js` (POS orders — not aggregator)
- `printerAgentSelector.js` (POS print agent — not aggregator)
- `AppProviders.jsx`, `DashboardPage.jsx`, financial/settlement code

---

## 9. Proposed FE Changes (sketch — subject to Gate 2 confirmation)

### A — aggregatorTransform.js (~1 line)
```js
// CR-125: brand_name for multi-brand restaurants
brandName: raw.brand_name || null,
```

### B — OrderCard.jsx (~6 lines)
In the aggregator order header section (after source badge, line ~382):
```jsx
{/* CR-125: Brand name for multi-brand aggregator restaurants */}
{isAggregator && order.brandName && (
  <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded"
    style={{ backgroundColor: `${SOURCE_COLORS[source] || '#FC8019'}18`, color: SOURCE_COLORS[source] || '#FC8019' }}>
    {order.brandName}
  </span>
)}
```

### C — aggregatorService.js (~3 lines) — conditional on OQ-3
```js
// CR-125: Include brand_name in print payload for multi-brand kitchen printing
export async function manuallyPrintAggregator(aggrOrderId, aggrOrderType, brandName) {
  const payload = { aggr_order_id: String(aggrOrderId), aggr_order_type: aggrOrderType };
  if (brandName) payload.brand_name = brandName;
  const res = await api.post(AGGREGATOR_ENDPOINTS.MANUALLY_PRINT, payload);
  return res.data;
}
```
And caller in OrderCard:
```js
await manuallyPrintAggregator(printId, 'aggr_kot', order.brandName);
```

---

## 10. Gate Checklist

- [x] Gate 0 — Code reality check: NONE (field not in codebase)
- [x] Gate 1 — Intake: COMPLETE
- [ ] Gate 2 — Impact Analysis + OQ-3 API probe
- [ ] Gate 3 — Implementation Plan
- [ ] Gate 4 — Owner GO
- [ ] Gate 5a — Implementation
- [ ] Gate 5b — QA
- [ ] Gate 6 — Owner Smoke

---

## 11. Next

**Planning agent for Gate 2: Impact Analysis**
- Probe `manually-print-aggregator` endpoint to answer OQ-3 (does BE already have brand_name?)
- Confirm exact display location on OrderCard
- Write Verification Matrix (3 checks: transform, display, print)
