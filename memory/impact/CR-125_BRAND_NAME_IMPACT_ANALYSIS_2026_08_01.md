# CR-125 — Impact Analysis (Gate 2)

**ID:** CR-125  
**Title:** Aggregator Brand Name — Display on OrderCard + Include in Print Payload  
**Filed:** 2026-08-01  
**Gate 2 completed:** 2026-08-01  
**Evidence restaurant:** owner@18march.com (live orders DB#40508, DB#40509)  
**Code Reality:** NONE — `brand_name` is 0 hits anywhere in `/app/frontend/src`  
**Risk:** HIGH (touches print payload — R6 print semantics)

---

## 1. Code Reality Check

```bash
grep -rn "brand_name\|brandName" /app/frontend/src/
# Result: 0 hits
```

**Code Reality: NONE.** Field exists in API, never extracted, never displayed, never printed.

---

## 2. Live API Confirmation

**Endpoint:** `GET /api/v1/vendoremployee/urbanpiper/get-order-list`  
**Restaurant:** owner@18march.com  
**Live value:** `"brand_name": "sub brand"` (top-level field, both orders)

```json
{
  "rider_info": { ... },
  "brand_name": "sub brand",       ← TOP-LEVEL, sibling of rider_info
  "order_details_order": { "id": 40508, ... },
  "order_details_food": [ ... ],
  "customer_details": { ... }
}
```

`brand_name` is **top-level on the raw order object** — not nested inside `order_details_order`.  
In `aggregatorTransform.js`, the transform destructures `const od = raw.order_details_order` — `brand_name` is on `raw`, not `od`. Extract as `raw.brand_name`.

---

## 3. Current OrderCard Anatomy (live screenshot — 18march.com)

```
┌──────────────────────────────────────────┐
│  [Z]  #IHL8OP7K                    ₹147  │  ← header row (px-3 py-2)
│                                          │  ← ← ← PROPOSED BRAND STRIP HERE
│  Test Customer   +919999999999           │  ← customer row (px-3 py-1.5 border-b)
│  ─────────────────────────────────────   │
│  [item row]                              │
│  ─────────────────────────────────────   │
│  [🖨]  Ready to Dispatch                 │  ← action row
└──────────────────────────────────────────┘
```

**Code landmarks (OrderCard.jsx):**
- Header row: lines 455–510 (closes `</div>` at 505)
- Customer section: lines 881–896 (`isAggregator && (customerName || phone)`)

**Brand strip insert point:** After header close (line ~510), before customer section (line 881)  
→ This is the only clean unoccupied zone between header and customer row.

---

## 4. Placement Decision: Brand Strip (between header and customer row)

**Chosen: Option B — dedicated thin strip**

```
┌──────────────────────────────────────────┐
│  [Z]  #IHL8OP7K                    ₹147  │  header (unchanged)
│  sub brand  ← tinted strip              │  ← NEW (Option B)
│  Test Customer   +919999999999           │  customer row (unchanged)
│  ...                                     │
└──────────────────────────────────────────┘
```

**Why not inline in header (Option A):**  
Cards are ~130px wide. Header already holds: Z badge + bike icon + customer name + `#aggrId` chip + ₹amount. Adding brand name inline would overflow or truncate `aggrId` (the primary identity field for kitchen staff).

**Why Option B:**
- Zero impact on existing header layout
- Full readable width for brand name
- Same tinted styling already used by action buttons at lines 1070 / 1081:
  ```js
  backgroundColor: `${SOURCE_COLORS[source] || '#FC8019'}15`
  color: SOURCE_COLORS[source] || '#FC8019'
  ```
- Visually connects to the platform badge (same Zomato red / Swiggy orange family)
- Conditional: only shown when `isAggregator && order.brandName` — zero effect on non-aggregator and aggregator orders without `brand_name`

**Proposed brand strip JSX (~6 lines):**
```jsx
{/* CR-125: Brand name strip for multi-brand aggregator restaurants */}
{isAggregator && order.brandName && (
  <div
    className="px-3 py-1 border-b"
    style={{
      backgroundColor: `${SOURCE_COLORS[source] || '#FC8019'}12`,
      borderColor: COLORS.borderGray,
    }}
    onClick={(e) => e.stopPropagation()}
    data-testid={`brand-name-strip-${orderId}`}
  >
    <span
      className="text-[10px] font-semibold uppercase tracking-wide"
      style={{ color: SOURCE_COLORS[source] || '#FC8019' }}
    >
      {order.brandName}
    </span>
  </div>
)}
```

**Result on live card:**
```
┌──────────────────────────────────────────┐
│  [Z]  #IHL8OP7K                    ₹147  │
│  SUB BRAND  (Zomato red, tinted bg)      │  ← brand strip
│  Test Customer   +919999999999           │
│  ...                                     │
└──────────────────────────────────────────┘
```

---

## 5. Blast Radius — All 3 Files

### File 1: `aggregatorTransform.js`
**Change:** 1 line — add `brandName` to the mapped object

```js
// CR-125: multi-brand name from UrbanPiper top-level field
brandName: raw.brand_name || null,
```

**Insert after** `aggrId: String(od.aggrigator_id || '')` (line 33)  
**Risk:** NONE — additive, no existing consumer reads `brandName`

---

### File 2: `OrderCard.jsx`
**Change:** ~9 lines — add brand strip block after header close, before customer row

**Insert point:** After line ~510 (header `</div>` closes), before line 881 (customer section)

```jsx
{/* CR-125: Brand name strip for multi-brand aggregator restaurants */}
{isAggregator && order.brandName && (
  <div
    className="px-3 py-1 border-b"
    style={{ backgroundColor: `${SOURCE_COLORS[source] || '#FC8019'}12`, borderColor: COLORS.borderGray }}
    onClick={(e) => e.stopPropagation()}
    data-testid={`brand-name-strip-${orderId}`}
  >
    <span className="text-[10px] font-semibold uppercase tracking-wide"
      style={{ color: SOURCE_COLORS[source] || '#FC8019' }}>
      {order.brandName}
    </span>
  </div>
)}
```

**Risk:** MEDIUM — UI display change. `isAggregator && order.brandName` guard ensures zero effect on POS orders and aggregator orders without brand name.

---

### File 3: `aggregatorService.js`
**Change:** ~3 lines — add `brand_name` to print payload

```js
// CR-125: Include brand_name in print payload (key confirmed: brand_name)
export async function manuallyPrintAggregator(aggrOrderId, aggrOrderType, brandName) {
  const payload = {
    aggr_order_id: String(aggrOrderId),
    aggr_order_type: aggrOrderType,
  };
  if (brandName) payload.brand_name = brandName;
  const res = await api.post(AGGREGATOR_ENDPOINTS.MANUALLY_PRINT, payload);
  return res.data;
}
```

**Caller update in OrderCard.jsx:**
```js
await manuallyPrintAggregator(printId, printType, order.brandName);
```

**Key confirmed:** `brand_name` — same as API field, accepted by endpoint without error, snake_case consistent with `aggr_order_id` / `aggr_order_type`.

**Risk:** HIGH — print payload change (R6). Change is purely additive: one optional string field. No financial values, no order routing, no authentication.

**Note:** Backend print template may or may not render `brand_name` yet. FE sends it — backend team activates the field in their KOT template. Sending a field the template ignores is harmless. **Backend brief required** to activate rendering.

---

## 6. Files NOT Touched

| File | Why safe |
|---|---|
| `orderTransform.js` | POS orders only — no aggregator |
| `printerAgentSelector.js` | POS print agent — aggregator bypasses it |
| `AllOrdersReportPage.jsx` | Reports — read-only, no card rendering |
| `OrderReportBetaPage.jsx` | Reports — just changed for CR-117, no card rendering |
| `TableCard.jsx` | Uses `customer` field (already `#aggrId`), no brand_name needed |
| `constants/colors.js` | No change — `SOURCE_COLORS` already has `zomato` and `swiggy` |
| `App.js`, `AppProviders.jsx` | No change |

---

## 7. Open Questions — Updated

| OQ | Question | Status |
|---|---|---|
| OQ-1 | Display location on OrderCard | ✅ RESOLVED — brand strip between header and customer row |
| OQ-2 | Show only when brand_name non-null? | ✅ RESOLVED — guarded by `order.brandName` |
| OQ-3 | Print key for Zomato/Swiggy aggrId | ⚠️ STILL PENDING — backend to confirm (`aggr_id` vs `aggrigator_id`) |
| OQ-4 | KOT only, Bill only, or both? | ✅ DEFAULT — both (print payload sent for `aggr_kot` and `aggr_bill`) |
| OQ-NEW | Does backend KOT template render `brand_name` from payload? | ⚠️ PENDING — backend brief required |

---

## 8. Scope Lock

**Files WILL change (3):**
1. `src/api/transforms/aggregatorTransform.js` — 1 line
2. `src/components/cards/OrderCard.jsx` — ~10 lines (brand strip + caller update)
3. `src/api/services/aggregatorService.js` — ~4 lines

**Total: 3 files, ~15 lines**

**OQ-3 scope boundary:**  
Zomato/Swiggy aggrId in print payload (`aggr_id` key) is **NOT part of CR-125** until backend confirms the key name. CR-125 implementation proceeds with `brand_name` only. `aggr_id` key filed separately as G-1 backend brief.

---

## 9. Verification Matrix

| Check | Method | Expected |
|---|---|---|
| `brandName` in transform | `console.log(order.brandName)` on 18march | `"sub brand"` |
| Brand strip visible on card | Browser, 18march Delivery tab | Thin tinted strip reading "SUB BRAND" below header |
| Strip absent on POS orders | Browser, 18march Dine-In tab | No strip on any POS card |
| Strip absent if brand_name null | Separate restaurant with no brand_name | No strip |
| `brand_name` in print payload | Network tab on KOT button press | Payload includes `brand_name: "sub brand"` |

---

## 10. Gate Checklist

- [x] Gate 0 — Code Reality: NONE (0 hits in codebase)
- [x] Gate 1 — Intake: COMPLETE
- [x] Gate 2 — Impact Analysis: COMPLETE (this doc)
- [ ] Gate 3 — Implementation Plan: READY TO GO (scope locked, no blockers for display + brand_name in payload)
- [ ] Gate 4 — Owner GO
- [ ] Gate 5a — Implementation
- [ ] Gate 5b — QA
- [ ] Gate 6 — Owner Smoke

---

## 11. Risk Summary

| Concern | Level | Mitigation |
|---|---|---|
| Header layout broken | LOW | Brand strip is a new conditional block — never inline with existing header elements |
| Print side effect | HIGH (R6) | Purely additive field — backend ignores silently if not in template |
| Non-aggregator orders affected | NONE | `isAggregator && order.brandName` double guard |
| Performance | NONE | 1 string field, conditional render |

**Overall: MEDIUM** (display change only is LOW; print payload makes combined HIGH by rule — however actual risk is LOW given purely additive nature)

---

**Next: Gate 4 Owner GO → Implementation**  
Scope locked. Display + `brand_name` print key ready. Blocked only on OQ-3 (Zomato aggrId key) which is out of CR-125 scope.
