# INV-APS-PHASE1-PHASE2 — ₹1 (APS) Web Order: Implementation Investigation + Backend Brief

**Date:** 2026-11-16
**Role:** INVESTIGATION
**Classification:** HIGH risk (order flow, pricing, financial, R5 hotspot)
**Steps Used:** 10/10
**Confidence:** HIGH — all code paths traced, API contracts verified, anti-rules documented

---

## 1. Summary

Two phases investigated. Phase 1 is **partially FE-only** — APS tag + item cancel in popup are clean FE changes, but price-entry-then-accept requires a **cancel + re-add + confirm** multi-step orchestration that breaks the ScanOrderPopOut anti-rules (owner approval needed). Phase 2 is **fully backend-blocked** — no endpoint exists to edit a placed item's price.

**Critical finding:** The ScanOrderPopOut has **5 hard anti-rules** (documented in its header, L1-44) that explicitly forbid direct API calls, OrderContext mutations, and backend writes. Any Phase 1 work that goes beyond pure display (APS tag) requires **owner approval to lift these anti-rules**.

---

## 2. Phase 1 Investigation: ScanOrderPopOut Enhancements

### 2A. APS Tag on ₹1 Items — ✅ CLEAN FE-ONLY

**Complexity:** LOW (5-10 lines)
**Anti-rule impact:** NONE — purely visual, same pattern as PAID badge (L379-389)

**Implementation approach:**
```
Inside ScanOrderPopOut.jsx item rows (L454-556):
  → Detect: Number(it?.unitPrice ?? it?.price) === 1
  → Render: <span className="...">APS</span> badge (mirrors PAID badge pattern)
  → No API, no state mutation, no context change
```

**Files:** `ScanOrderPopOut.jsx` only (~5 lines)

---

### 2B. Item-Level Cancel in Popup — ⚠️ REQUIRES ANTI-RULE LIFT

**Complexity:** MEDIUM (20-30 lines in popup + 15 lines in DashboardPage)
**Anti-rule impact:** PARTIAL — the popup itself stays prop-driven (no direct API), but DashboardPage must wire a new `onCancelItem` handler.

**Current anti-rules blocking this (ScanOrderPopOut.jsx L22-36):**
```
- NO direct service / API / socket call. Every action goes through
  the props the caller already wires for normal YTC cards.
- NO mutation of order.status / fOrderStatus / OrderContext.
```

**Proposed approach (stays within anti-rule spirit):**
```
1. ScanOrderPopOut receives new prop: onCancelItem(order, item)
2. Per-item X button renders next to each item row
3. On click: calls onCancelItem(activeOrder, item)
4. DashboardPage wires onCancelItem to open CancelFoodModal
   (same modal already used in OrderEntry for item-level cancel)
5. CancelFoodModal → handleCancelFood equivalent → cancel-food-item API
6. Socket updates order → ScanOrderPopOut re-renders with item removed
```

**Why this respects the anti-rule spirit:** The popup itself makes ZERO API calls — it delegates to DashboardPage via props, identical to how onAccept/onReject/onEdit work today.

**Backend dependency:** `cancel-food-item` API (`PUT /api/v2/vendoremployee/order/cancel-food-item`) already exists and is used in OrderEntry. **BUT:** needs verification that it works on YTC (fOS=7) orders — see Backend Brief §B1 below.

**New files needed:** None
**Files modified:**
- `ScanOrderPopOut.jsx` — add per-item cancel button + onCancelItem prop (~20 lines)
- `DashboardPage.jsx` — wire `onCancelItem` handler + open CancelFoodModal (~15 lines)

**Cancel-item API payload (existing contract):**
```json
{
  "order_id":      "<orderId>",
  "order_food_id": "<food catalog ID>",
  "item_id":       "<order line item ID>",
  "cancel_qty":    1,
  "order_status":  "cancelled",
  "reason_type":   "<reasonId>",
  "reason":        "<reasonText>",
  "cancel_type":   "Pre-Serve",
  "printer_agent": [],
  "cancel_item_note": ""
}
```

---

### 2C. Price Entry + Accept in Popup — ⚠️ COMPLEX, BREAKS ANTI-RULES

**Complexity:** HIGH (60+ lines)
**Anti-rule impact:** MAJOR — requires direct API orchestration from popup context

**The problem:** The current `confirmOrder` API sends ONLY `{order_id, role_name, order_status}`. It does NOT accept item-level price overrides. There is no API to update a placed item's price.

**Three design options investigated:**

#### Option A: Cancel + Re-add + Confirm (FE-only, multi-step)
```
1. Staff enters custom price for ₹1 item in popup
2. On Accept click, orchestrate 3 API calls:
   a) cancel-food-item → cancel the ₹1 item
   b) update-place-order → add same item at custom price (as new unplaced item)
   c) waiter-dinein-order-status-update → confirm the order
3. Wait for socket updates between each step
```

**Pros:** No backend changes needed
**Cons:**
- 3 sequential API calls → slow, race conditions
- Creates a cancellation record (audit trail noise)
- Requires product metadata (food_id, category, tax) from the order item → may not be available in socket payload
- `update-place-order` on a YTC (fOS=7) order → **UNKNOWN if backend allows this** (see B2)
- Breaks ALL ScanOrderPopOut anti-rules
- Very fragile — if any step fails, order is in inconsistent state

**Verdict: NOT RECOMMENDED for Phase 1**

#### Option B: Confirm with price overrides (needs backend)
```
1. Staff enters custom price in popup
2. On Accept: single API call with item-level price overrides
   confirmOrder(orderId, role, orderStatus, { priceOverrides: [{item_id, new_price}] })
3. Backend applies prices + confirms in one transaction
```

**Pros:** Clean, atomic, single API call
**Cons:** Requires new backend contract
**Verdict: RECOMMENDED — but Phase 2 (backend-blocked)**

#### Option C: Accept-as-is + deferred price edit (pragmatic Phase 1)
```
1. APS tag shows on ₹1 items
2. Accept button shows warning: "Order contains APS items at ₹1. Edit order to set prices."
3. Accept is NOT blocked — staff can confirm at ₹1 if they choose
4. Staff clicks Edit → OrderEntry opens → cancel ₹1 item → re-add with price → Update Order
5. OR: staff clicks Accept → order confirmed at ₹1 → edit price later (Phase 2)
```

**Pros:** No anti-rule violation, minimal code, no backend dependency
**Cons:** Doesn't solve the core UX problem — staff still needs extra steps
**Verdict: THIS IS THE OWNER-APPROVED APPROACH (2026-11-16) — Accept works normally, price edit happens afterward in OrderEntry**

---

### Phase 1 Recommended Scope

| Feature | Approach | Anti-Rule Impact | Backend Dep? | Lines |
|---------|----------|-----------------|-------------|-------|
| APS tag | Visual badge on ₹1 items | NONE | NO | ~5 |
| Item-level cancel | New `onCancelItem` prop delegated to DashboardPage | PARTIAL (stays prop-driven) | B1: verify on YTC orders | ~35 |
| Price entry + accept | Option C: warning + Edit redirect | NONE | NO | ~15 |
| Accept behavior | Accept works normally — NOT gated by ₹1 items. Staff accepts at ₹1, edits price afterward in OrderEntry. | NONE | NO | 0 |

**Total Phase 1:** ~40 lines across 2 files (ScanOrderPopOut + DashboardPage)

**CORRECTED (owner directive 2026-11-16):** Accept is NOT disabled when ₹1 items have no price override. The workflow is: Accept → open OrderEntry → edit price. This avoids blocking the confirmation flow and lets staff handle price entry at their pace.

---

## 3. Phase 2 Investigation: Price Edit for Placed Items

### 3A. Price Input in ScanOrderPopOut (needs backend)

Requires a backend endpoint to update an individual placed item's price on a YTC order. This is Option B from §2C above.

**Proposed API contract (see Backend Brief §B3):**
```
PUT /api/v2/vendoremployee/order/update-food-price
{
  "order_id":      123456,
  "item_id":       789,         // order_details[].id
  "order_food_id": 456,         // food catalog ID
  "new_price":     350.00,      // new unit price
  "reason":        "APS - actual price entered by cashier"
}
```

**FE implementation once API exists:**
- `ScanOrderPopOut.jsx` — inline price input per ₹1 item, local state for overrides
- `DashboardPage.jsx` — new `onUpdateItemPrice` handler → API call before confirm
- `orderService.js` — new `updateFoodPrice()` function
- Accept flow: update prices → then confirm → single Accept click

### 3B. Price Edit in CartPanel for Placed Items (needs backend)

Same backend endpoint as §3A. Additionally needs:

**FE changes:**
- `CartPanel.jsx` — PlacedItemRow: add price edit mode (mirrors qty edit pattern)
  - New state: `editingPriceItemId` (mirrors `editingQtyItemId`)
  - Pencil icon on price column for ₹1 items
  - Input field with ₹ prefix, confirm/cancel
- `OrderEntry.jsx` — new `updateItemPrice` handler → API call
- `orderService.js` — reuse `updateFoodPrice()` from §3A

**Lines estimate:** ~40 in CartPanel, ~15 in OrderEntry, ~10 in orderService

### 3C. EDIT_ORDER_ITEM Endpoint (currently TBD)

```javascript
// constants.js:92-93 — currently placeholder
EDIT_ORDER_ITEM:       'TBD',   // CHG-040: Edit placed item qty/notes
EDIT_ORDER_ITEM_QTY:   'TBD',   // CHG-040 future: Edit placed item qty only
```

These endpoints are planned (CHG-040) but not implemented. Phase 2 price edit could either:
- Use the new `update-food-price` endpoint (§3A — dedicated for price)
- Wait for CHG-040 `EDIT_ORDER_ITEM` which would handle qty + price + notes in one endpoint

---

## 4. Backend Brief

### B1: Can `cancel-food-item` work on YTC (fOS=7) orders?

**Question:** Does `PUT /api/v2/vendoremployee/order/cancel-food-item` accept requests where the parent order has `f_order_status = 7` (Yet To Confirm)?

**Context:** Currently, item-level cancel is only triggered from OrderEntry on confirmed orders (fOS ≥ 1). The ScanOrderPopOut enhancement (Phase 1) would call it on unconfirmed orders.

**Expected behavior:** Cancel should work — the item exists in the order regardless of confirmation status. But backend may have a guard that rejects modifications on unconfirmed orders.

**Test:** `curl -X PUT .../cancel-food-item` with an order at fOS=7. If 200 → works. If 4xx → needs backend change.

**Priority:** P0 (blocks Phase 1 item-cancel feature)

---

### B2: Can `update-place-order` add items to a YTC (fOS=7) order?

**Question:** Does `PUT /api/v2/vendoremployee/order/update-place-order` accept requests where the parent order has `f_order_status = 7`?

**Context:** If Phase 1 uses the cancel+re-add approach (Option A), it needs to add a new item to a YTC order. If backend rejects this, Option A is not viable.

**Test:** `curl -X PUT .../update-place-order` with `{order_id: <ytc_order>, cart-update: [{...new item}]}`. If 200 → works. If 4xx → Option A dead.

**Priority:** P1 (only if Option A is chosen for Phase 1)

---

### B3: New endpoint — Update placed item price

**Request:** New API endpoint to update the unit price of a placed order item.

**Use case:** APS (As Per Size) items are stored at ₹1 placeholder price in the catalog. When a web customer orders an APS item, the order arrives at ₹1. Staff needs to set the actual price before or after confirming.

**Proposed contract:**
```
PUT /api/v2/vendoremployee/order/update-food-price

Request:
{
  "order_id":      <int>,       // parent order ID
  "item_id":       <int>,       // order_details[].id (order line item)
  "order_food_id": <int>,       // food catalog ID
  "new_price":     <float>,     // new unit price (replaces existing)
  "reason":        <string>     // audit trail reason (e.g. "APS price entry")
}

Response (success):
{
  "status": true,
  "message": "Item price updated",
  "data": { /* updated order snapshot */ }
}

Side effects:
  - Recalculate order totals (subtotal, tax, order_amount)
  - Emit update-order socket event with new totals
  - Audit trail: log price change with reason + old_price + new_price + user_id
```

**Considerations:**
- Should this work on orders at ANY fOrderStatus? Or only YTC (fOS=7)?
- Should it update the catalog price or only the order-level price?
  - **Recommendation:** Order-level only. Catalog stays at ₹1. Each order gets its own price.
- Tax recalculation: use the item's existing tax rate on the new price base
- Validation: `new_price > 0`, `item_id` belongs to `order_id`

**Priority:** P0 for Phase 2

---

### B4: Alternative — Extend `waiter-dinein-order-status-update` with price overrides

**Request:** Add optional `price_overrides` field to the confirm order endpoint.

```
PUT /api/v2/vendoremployee/order/waiter-dinein-order-status-update

Existing payload:
{
  "order_id":     <string>,
  "role_name":    <string>,
  "order_status": <string>
}

Extended payload (backward-compatible):
{
  "order_id":     <string>,
  "role_name":    <string>,
  "order_status": <string>,
  "price_overrides": [                    // OPTIONAL — new field
    { "item_id": 789, "new_price": 350 },
    { "item_id": 790, "new_price": 500 }
  ]
}
```

**Benefit:** Single atomic API call — set prices AND confirm in one shot. No race conditions.
**Fallback:** If `price_overrides` is absent or empty, behavior is unchanged (backward-compatible).

**Priority:** P1 — alternative to B3 (either approach works; B4 is more atomic)

---

## 5. Anti-Rules Assessment

### Current ScanOrderPopOut Anti-Rules (L22-36):

| Rule | Description | Phase 1 Impact | Phase 2 Impact |
|------|------------|----------------|----------------|
| No direct service/API/socket call | Every action through props | ✅ Respected (item cancel via prop) | ⚠️ VIOLATED (price update API) |
| No NotificationContext import | Popup stays silent layer | ✅ Respected | ✅ Respected |
| No localStorage/sessionStorage/IndexedDB/backend writes | No persistence | ✅ Respected | ⚠️ VIOLATED (price update) |
| No mutation of order.status/fOrderStatus/OrderContext | No state change | ⚠️ PARTIAL (item cancel changes order via socket) | ⚠️ VIOLATED (price changes order) |
| No business workflow definition | Reuses existing handlers | ⚠️ PARTIAL (item cancel is new workflow path) | ⚠️ VIOLATED (price entry is new workflow) |

**Owner approval needed for:** Item-level cancel in popup (Phase 1), all Phase 2 popup features.

---

## 6. File Impact Matrix

### Phase 1 (FE-only, pending B1 verification):

| File | Change | Lines | Risk |
|------|--------|-------|------|
| `ScanOrderPopOut.jsx` | APS badge + item cancel button + Accept warning for ₹1 | ~25 | MEDIUM |
| `DashboardPage.jsx` | Wire `onCancelItem` prop + open CancelFoodModal | ~20 | HIGH (R5) |
| `CancelFoodModal.jsx` | No change — reused as-is | 0 | — |
| `orderService.js` | No change — `cancel-food-item` already exists | 0 | — |

### Phase 2 (needs backend B3 or B4):

| File | Change | Lines | Risk |
|------|--------|-------|------|
| `ScanOrderPopOut.jsx` | Inline price input per APS item + Accept with price overrides | ~40 | HIGH |
| `DashboardPage.jsx` | Wire `onUpdateItemPrice` handler → API call before confirm | ~20 | HIGH (R5) |
| `CartPanel.jsx` | PlacedItemRow price edit mode (mirrors qty edit) | ~40 | HIGH (R5) |
| `OrderEntry.jsx` | `updateItemPrice` handler | ~15 | HIGH (R5) |
| `orderService.js` | New `updateFoodPrice()` function | ~10 | LOW |
| `constants.js` | New endpoint URL | ~1 | LOW |
| `orderTransform.js` | New `updateFoodPrice` payload builder | ~10 | LOW |

---

## 7. Recommendations

### Immediate (before coding):
1. **Owner approval** to lift ScanOrderPopOut anti-rules for item-cancel and price-entry
2. **Backend probe B1:** curl `cancel-food-item` on a fOS=7 order → confirm it works
3. **Backend brief B3/B4** sent to backend team for Phase 2 endpoint

### Phase 1 implementation order:
1. APS tag (zero risk, 5 lines)
2. Accept warning/gating for ₹1 items (zero risk, 5 lines)
3. Item-level cancel via prop delegation (pending B1 + owner anti-rule approval)

### Phase 2 implementation order:
1. Backend implements B3 or B4
2. FE: price input in ScanOrderPopOut
3. FE: price edit in CartPanel PlacedItemRow
4. FE: Accept-with-price-overrides flow

**Planning skip eligible:** NO — R5 hotspot files, financial logic, anti-rule changes, backend dependency.

---

## Report Footer

```
Root cause: FEATURE_GAP — ₹1 items from web orders have no price-entry path.
  Phase 1 (FE-only): APS tag ✅ + item cancel ⚠️(B1 + anti-rule approval) + Accept gating ✅
  Phase 2 (backend): price input in popup + CartPanel price edit (needs B3 or B4 endpoint)
Confidence: HIGH. Steps: 10/10.
Backend brief: B1 (cancel-food-item on YTC), B2 (update-place-order on YTC),
               B3 (new update-food-price endpoint), B4 (extend confirm with price_overrides)
Planning skip eligible: NO — R5 hotspots + financial + backend dependency + anti-rule lift
Investigation report at: /app/memory/investigations/INV-APS-PHASE1-PHASE2-2026-11-16.md
Backend brief at: /app/memory/backend_briefs/BACKEND_BRIEF_APS_PRICE_EDIT_2026-11-16.md
```
