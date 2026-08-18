# CR-125 — Implementation Plan (Gate 3)

**ID:** CR-125
**Title:** Aggregator Brand Name — Display on OrderCard + Include in Print Payload
**Gate 3 completed:** 2026-08-01
**Based on:** Gate 2 Impact Analysis (`impact/CR-125_BRAND_NAME_IMPACT_ANALYSIS_2026_08_01.md`)
**Risk:** HIGH (print payload — R6); display side MEDIUM
**Files:** 3 files, ~15 lines total

---

## Pre-flight Checks

```bash
# Confirm current state: brand_name must be 0 hits
grep -rn "brand_name\|brandName" /app/frontend/src/
# Expected: 0 results

# Confirm live field
TOKEN=$(curl -s -X POST "https://preprod.mygenie.online/api/v1/auth/vendoremployee/login" \
  -H "Content-Type: application/json" -H "X-localization: en" \
  -d '{"email":"owner@18march.com","password":"Qplazm@10"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
curl -s "https://preprod.mygenie.online/api/v1/vendoremployee/urbanpiper/get-order-list" \
  -H "Authorization: Bearer $TOKEN" -H "X-localization: en" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('brand_name:', d['orders'][0].get('brand_name'))"
# Expected: brand_name: sub brand
```

---

## EDIT 1 — aggregatorTransform.js (1 line)

**File:** `src/api/transforms/aggregatorTransform.js`
**Line:** After line 34 (`orderNumber: od.restaurant_order_id || '',`)
**Insert after:** `aggrId: String(od.aggrigator_id || ''), // CR-118`

### Exact search_replace

```
OLD (lines 33–34):
      aggrId: String(od.aggrigator_id || ''), // CR-118: actual Swiggy/Zomato order ID for display + print
      orderNumber: od.restaurant_order_id || '',

NEW:
      aggrId: String(od.aggrigator_id || ''), // CR-118: actual Swiggy/Zomato order ID for display + print
      brandName: raw.brand_name || null,      // CR-125: multi-brand sub-brand name (top-level field, not in od)
      orderNumber: od.restaurant_order_id || '',
```

**Key:** `raw.brand_name` — NOT `od.brand_name`. Field lives at `raw` (top-level), not inside `order_details_order`.

**Verify:**
```bash
grep -n "brandName" /app/frontend/src/api/transforms/aggregatorTransform.js
# Expected: line 34 → brandName: raw.brand_name || null,
```

---

## EDIT 2 — OrderCard.jsx — Brand Strip Display (~9 lines)

**File:** `src/components/cards/OrderCard.jsx`
**Insert point:** After Header Row 3 (order note, lines 625–637), before items section (line 655)
**Anchor:** after the closing `</div>` of the order note block (line 637)

### Card Layout Context

```
Header Row 1: [Z] [#aggrId] [₹amount]          lines 455–607
Header Row 2: OrderTimeline                     lines 609–623
Header Row 3: Order Note (if present)           lines 625–637
→ INSERT CR-125 brand strip HERE ←              (new — lines after 637)
Items Section                                   lines 655–875
Customer Row: Test Customer · phone             lines 881–896
Rider Section                                   lines 898–930
Action Buttons                                  lines 1018+
```

### Exact search_replace

```
OLD:
      {/* ── ADDRESS POPUP (own delivery) ── */}

NEW:
      {/* CR-125: Header Row 4 — Brand name for multi-brand aggregator restaurants.
          Shown only when isAggregator && brandName non-null.
          Styled as header-zone row (same getHeaderBgColor()) with SOURCE_COLOR pill. */}
      {isAggregator && order.brandName && (
        <div
          className="px-3 pb-1.5 flex items-center"
          style={{ backgroundColor: getHeaderBgColor() }}
          onClick={(e) => e.stopPropagation()}
          data-testid={`brand-name-strip-${orderId}`}
        >
          <span
            className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: `${SOURCE_COLORS[source] || '#FC8019'}18`,
              color: SOURCE_COLORS[source] || '#FC8019',
            }}
          >
            {order.brandName}
          </span>
        </div>
      )}

      {/* ── ADDRESS POPUP (own delivery) ── */}
```

### Visual Result

```
┌──────────────────────────────────────────────┐
│  [Z]  #IHL8OP7K                        ₹147  │  ← Header Row 1 (unchanged)
│  ░░░░░ timeline ░░░░░░░░░░░░░░░░░░░░░░░░░░░  │  ← Header Row 2 (unchanged)
│  📄 This is order level instructions         │  ← Header Row 3 (unchanged, if note present)
│  ●SUB BRAND●  (Zomato red pill, tinted bg)   │  ← NEW Header Row 4 (CR-125)
│  Test Customer   +919999999999               │  ← Customer row (unchanged)
│  Schezwan Dosa  ×1                           │  ← Items (unchanged)
│  [🖨 KOT]  [Ready to Dispatch]               │  ← Actions (unchanged)
└──────────────────────────────────────────────┘
```

**Design decisions:**
- `getHeaderBgColor()` background → brand strip stays in the header zone (same tint as platform header)
- `SOURCE_COLORS[source]` at `18` opacity (12% hex) → consistent with existing action button style at lines 1070/1081
- `uppercase tracking-wide` → brand name reads as a label, not customer data
- `rounded-full px-2 py-0.5` → pill shape, compact, consistent with PAID/HOLD badges at lines 515/523
- Zero effect on POS cards: `isAggregator` guard
- Zero effect on aggregator cards without `brand_name`: `order.brandName` guard

---

## EDIT 3a — aggregatorService.js — Add brandName param (~3 lines)

**File:** `src/api/services/aggregatorService.js`
**Change:** Add optional `brandName` param, conditionally append `brand_name` to payload

### Exact search_replace

```
OLD:
// CR-118: Manual KOT/Bill print for aggregator orders
export async function manuallyPrintAggregator(aggrOrderId, aggrOrderType) {
  const res = await api.post(AGGREGATOR_ENDPOINTS.MANUALLY_PRINT, {
    aggr_order_id: String(aggrOrderId),
    aggr_order_type: aggrOrderType, // 'aggr_kot' | 'aggr_bill'
  });
  return res.data;
}

NEW:
// CR-118: Manual KOT/Bill print for aggregator orders
// CR-125: added optional brandName param → appended as brand_name in payload (key confirmed 2026-08-01)
export async function manuallyPrintAggregator(aggrOrderId, aggrOrderType, brandName) {
  const payload = {
    aggr_order_id: String(aggrOrderId),
    aggr_order_type: aggrOrderType, // 'aggr_kot' | 'aggr_bill'
  };
  if (brandName) payload.brand_name = brandName; // CR-125: optional — backend renders if template supports it
  const res = await api.post(AGGREGATOR_ENDPOINTS.MANUALLY_PRINT, payload);
  return res.data;
}
```

**Why conditional (`if (brandName)`):** Restaurants without `brand_name` send the exact same payload as before. Zero regression risk.

---

## EDIT 3b — OrderCard.jsx — Update print caller (1 line)

**File:** `src/components/cards/OrderCard.jsx`
**Line 265:** Update `manuallyPrintAggregator` call to pass `order.brandName`

### Exact search_replace

```
OLD:
      await manuallyPrintAggregator(printId, printType);

NEW:
      await manuallyPrintAggregator(printId, printType, order.brandName); // CR-125: pass brandName for print
```

**Note:** `order.brandName` is `null` for restaurants without brand_name — the `if (brandName)` guard in `aggregatorService.js` will skip the field cleanly.

---

## Implementation Order

Execute in this sequence (each edit is independent but ordered for safety):

| Step | File | Edit | Lines changed |
|---|---|---|---|
| 1 | `aggregatorTransform.js` | Add `brandName: raw.brand_name \|\| null` after `aggrId` line | 1 |
| 2 | `aggregatorService.js` | Add `brandName` param + conditional payload field | 6 |
| 3 | `OrderCard.jsx` | Add brand strip block after order note (line 637) | 9 |
| 4 | `OrderCard.jsx` | Update `manuallyPrintAggregator` caller (line 265) | 1 |

**Total: 17 lines across 3 files**

---

## Verification Steps

### Step V1 — Transform (after Edit 1)
```bash
# Browser console on 18march.com dashboard:
# Open DevTools > Sources > aggregatorTransform.js
# Confirm brandName field present in order object
# OR: grep
grep -n "brandName" /app/frontend/src/api/transforms/aggregatorTransform.js
```

### Step V2 — Display (after Edit 3)
1. Login as `owner@18march.com` / `Qplazm@10`
2. Navigate to Delivery section
3. Find any Zomato order card (red Z badge)
4. Confirm: thin `SUB BRAND` pill appears in header zone, below order note area
5. Confirm: Zomato red color (`#E23744`) with tinted background
6. Navigate to Dine-In section → confirm NO brand strip on any POS card

### Step V3 — Print payload (after Edits 2+4)
1. Open Network tab in DevTools
2. Press KOT button on a Zomato order card
3. Find the POST to `manually-print-aggregator`
4. Confirm payload includes: `{ "aggr_order_id": "...", "aggr_order_type": "aggr_kot", "brand_name": "sub brand" }`
5. Confirm payload for POS orders: unchanged (no `brand_name` field)

### Step V4 — Regression check
1. Confirm non-aggregator cards: header unchanged, no brand strip
2. Confirm aggregator cards with no `brand_name` (other restaurants): no strip rendered
3. Confirm `aggrId` chip still shows correctly in header
4. Confirm KOT/Bill print still triggers successfully (200 response)

---

## Rollback Plan

All 3 edits are purely additive:
- **Transform:** Remove `brandName` line → `order.brandName` evaluates to `undefined` → JSX guards `order.brandName` prevent render
- **Service:** Remove `if (brandName)` line → function reverts to original 2-param signature
- **OrderCard strip:** Remove the brand-strip JSX block → zero visual change
- **OrderCard caller:** Revert `manuallyPrintAggregator(printId, printType)` → no `brandName` argument, ignored by service

No data mutations, no API changes, no state management changes.

---

## Out of Scope (explicitly excluded)

| Item | Reason |
|---|---|
| Zomato/Swiggy `aggrId` key in print payload (`aggr_id`) | OQ-3 pending backend confirm |
| Backend KOT template rendering `brand_name` | Backend brief required — separate item |
| G-1 (Zomato ID on KOT) | Separate backend brief |
| G-3 (Order Instructions strip on KOT) | Backend only |
| `TableCard.jsx` brand_name | Not requested — TableCard shows `customer` field only |

---

## Gate Checklist

- [x] Gate 0 — Code reality: NONE
- [x] Gate 1 — Intake: COMPLETE
- [x] Gate 2 — Impact analysis: COMPLETE
- [x] Gate 3 — Implementation plan: COMPLETE (this doc)
- [ ] Gate 4 — Owner GO
- [ ] Gate 5a — Implementation
- [ ] Gate 5b — QA
- [ ] Gate 6 — Owner smoke test

---

## Implementation Deviations (Gate 5a — 2026-08-01)

### Deviation 1: TableCard.jsx was the correct component (not OrderCard.jsx for display)

**Original plan:** Edit 3 + Edit 4 in `OrderCard.jsx`  
**Actual:** Dashboard uses `TableCard.jsx` for Delivery column cards (viewType='table')

| Plan said | Reality |
|---|---|
| `OrderCard.jsx` renders aggregator delivery cards | `TableCard.jsx` renders them (testid: `table-card-delivery-{id}`) |
| Edit 3: brand strip in OrderCard after line 637 | Edit 3 applied to TableCard after header pill (line 384) |
| Edit 4: caller in OrderCard line 265 | Edit 4b: caller in TableCard line 249 |

**OrderCard.jsx edits retained:** OrderCard is still used in `viewType='order'` (list view). Brand strip + caller update there are also correct for that view.

**Additional edit (5 total, not 4):**
| # | File | Edit | Status |
|---|---|---|---|
| 1 | `aggregatorTransform.js` | `brandName: raw.brand_name \|\| null` | ✅ |
| 2 | `aggregatorService.js` | `brandName` param + conditional payload | ✅ |
| 3 | `OrderCard.jsx` | Brand strip (list/order view) | ✅ |
| 4 | `OrderCard.jsx` | Print caller update | ✅ |
| **5** | **`TableCard.jsx`** | **Brand strip + print caller (table/delivery view)** | **✅ (deviation)** |

**Files changed: 4 (not 3). Lines: ~25 (not ~17).**

### Verification (Gate 5a — live)

```
DOM check: BRAND STRIPS: {'count': 1, 'items': [
  {'testid': 'brand-name-strip-delivery-40509', 'text': 'SUB BRAND', 'visible': True}
]}
webpack compiled successfully ✅
```

**Visual:** SUB BRAND pill in Zomato red with tinted background, between header and customer row on Delivery column card.

### Gate 5b: PENDING QA
