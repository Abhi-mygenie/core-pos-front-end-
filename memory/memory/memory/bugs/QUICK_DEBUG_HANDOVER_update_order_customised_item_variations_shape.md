# Quick Debugging Handover — `update-place-order` 500 on placed customised item qty-increase

**Status:** ❌ Not yet implemented — handover for Implementation Agent
**Type:** Bug
**Severity:** High — blocks any qty edit on placed customised items (variants/addons)
**Scope:** Frontend only, single-file patch

---

## 1. User Report
- **Raw user issue:** "When I am editing order any item, just making quantity increase it throws error. Works fine with non customised items. Customised items are ones which have variance and add-ons."
- **Backend response:** `{"error":"Undefined array key \"label\""}`
- **Endpoint:** `PUT /api/v2/vendoremployee/order/update-place-order`

### Failing payload (from user)
```json
{
  "order_id": "732006",
  "cart-update": [{
    "food_id": 187448,
    "quantity": 1,
    "variations": [{
      "name": "Choose",
      "type": "single",
      "min": 0,
      "max": 0,
      "required": "on",
      "values": [{ "label": "30ml", "optionPrice": "0" }]
    }],
    ...
  }]
}
```
The PHP backend does `$variation['values']['label']` and crashes because `values` is an **array of objects**, not an **object with a `label` array key**.

---

## 2. Scope
- **Included:** Quantity increase on a placed item that has variants and/or addons.
- **Excluded:** New customised items (work fine — they go through a different code path). Plain non-customised items (work fine — no variations sent). Non-qty edits.
- **Affected modules:** Order Entry → Update Order flow (`PUT /update-place-order`).

---

## 3. Root Cause (confirmed from code)

The codebase has **two** different `variations` shapes:

| Where | Shape | Example |
|---|---|---|
| Backend **REQUEST** (place-order, update-place-order) | `{name, values: { label: [...] }}` | `{name:"Choose", values:{label:["30ml"]}}` |
| Backend **RESPONSE** (running-orders, socket payload) | `{name, type, min, max, required, values: [{label, optionPrice}, …]}` | `{name:"Choose", values:[{label:"30ml",optionPrice:"0"}]}` |

When user increases qty of a placed customised item:
1. `OrderEntry.updateQuantity` (`OrderEntry.jsx:517-557`) creates an unplaced **delta cart item** by spread-copying the placed item.
2. That spread copy carries `variation` in **RESPONSE shape** (because the placed item was hydrated from the socket via `orderTransform.fromAPI.orderItem`).
3. `OrderEntry.handlePlaceOrder → orderTransform.toAPI.updateOrder → buildCartItem` (`orderTransform.js:347-448`).
4. In `buildCartItem`:
   - `selectedVariants` is undefined on the delta item → first branch (L364-381) is skipped.
   - `item.variation?.length > 0` is true → fallback branch (L382-393) runs.
   - **Bug:** `variations = item.variation;` passes the RESPONSE shape through unchanged.
5. Backend chokes on the wrong shape.

### Why each control case behaves correctly

| Case | `selectedVariants` | `item.variation` | Branch hit | Output shape | Status |
|---|---|---|---|---|---|
| New customised item | populated | empty | L364 (first) | REQUEST shape ✅ | works |
| Placed customised item, qty+1 delta | undefined | RESPONSE shape | L382 (fallback) | RESPONSE shape ❌ | **bug** |
| Plain non-customised item | undefined | empty | neither | `[]` | works |

---

## 4. Files To Modify

### `/app/frontend/src/api/transforms/orderTransform.js`
**Function:** `buildCartItem` (L347-448)
**Lines:** 382–393 (fallback branch only)

### Diff to apply
```diff
   } else if (item.variation?.length > 0) {
-    // Fallback for placed items from socket (already in API format or empty)
-    variations = item.variation;
-    // Socket format: [{name, values: [{label, optionPrice}]}] or [{name, values: {label: []}}]
+    // BUG-VARIATION-RESHAPE (Apr-2026): placed items hydrated from the socket /
+    // running-orders response carry `variation` in the BACKEND RESPONSE shape:
+    //   [{name, type, min, max, required, values: [{label, optionPrice}, ...]}]
+    // The place-order / update-place-order endpoints expect the REQUEST shape:
+    //   [{name, values: {label: [...]}}]
+    // When user increments the qty on a placed customised item, OrderEntry
+    // creates an unplaced delta cart item by spreading the placed item, so
+    // `item.variation` arrives here in RESPONSE shape. Without normalisation,
+    // the payload triggers PHP "Undefined array key 'label'".
+    // Accept either shape on input; always emit the REQUEST shape.
+    variations = item.variation.map(v => {
+      // Already in REQUEST shape — pass through (defensive).
+      if (v?.values && !Array.isArray(v.values) && Array.isArray(v.values.label)) {
+        return { name: v.name, values: { label: v.values.label } };
+      }
+      // RESPONSE shape — extract option labels into the label-array.
+      if (Array.isArray(v?.values)) {
+        return {
+          name: v.name,
+          values: { label: v.values.map(opt => opt?.label).filter(Boolean) },
+        };
+      }
+      // Defensive fallback for any other shape.
+      return { name: v?.name || 'Variant', values: { label: [] } };
+    });
+    // variation_amount math below already handles BOTH shapes — unchanged.
     variationAmount = item.variation.reduce((sum, v) => {
       if (v.price) return sum + (parseFloat(v.price) || 0);
       const vals = Array.isArray(v.values) ? v.values : (v.values?.label ? [] : []);
       return sum + vals.reduce((s, opt) => s + (parseFloat(opt.optionPrice) || 0), 0);
     }, 0);
   }
```

---

## 5. What NOT To Change
- ❌ `selectedVariants` branch (L364-381) — already correct, unchanged.
- ❌ `variation_amount` aggregator (L386-392) — handles both shapes; correct.
- ❌ `OrderEntry.updateQuantity` delta-item creation (L517-557) — works as designed.
- ❌ Add-ons handling (L348-356) — no reported bug; if a similar PHP "Undefined array key" surfaces on `add_ons` later, file a separate ticket.
- ❌ `placeOrder` / `placeOrderWithPayment` flows — they only consume new unplaced items (first branch).
- ❌ Backend payload contract — backend expects the request shape; we conform.

---

## 6. Edge Cases To Preserve
- New customised item → first branch → REQUEST shape ✅
- Placed customised item, qty unchanged → not in `unplaced` → not sent ✅
- Plain non-customised item → empty `variations: []` ✅
- Cancel item, food transfer, table shift, merge, split → separate code paths ✅
- Prepaid place-order with customised items → first branch ✅

---

## 7. QA Checklist

### Reproduction (before fix)
1. On a dine-in table with an existing order containing a customised item (variant: e.g. "Size: Large" or "Choose 30ml"), open OrderEntry.
2. Increment the placed item's qty by 1 → click **Update Order**.
3. Console: `[UpdateOrder] CRITICAL: 500 {"error":"Undefined array key \"label\""}`.

### After-fix expected
1. Same flow → 200 OK; socket `update-order` arrives; dashboard reflects new qty.
2. Variations on bill/order detail unchanged.
3. `variation_amount` per item unchanged.

### Regression
- New customised item to NEW empty order → place-order works.
- New customised item to EXISTING order (without touching placed-item qty) → update-place-order works.
- Plain (non-customised) item qty increase → works.
- Placed plain item qty increase → works.
- Prepaid customised items → works.
- Cancel item / food transfer / shift / merge / split — unaffected.

---

## 8. Risk Assessment

| Risk | Severity | Reason |
|---|---|---|
| New customised order regression | None | First branch unchanged. |
| Plain item regression | None | Fallback branch is skipped when variation is empty. |
| `variation_amount` math drift | None | Aggregator left untouched. |
| Backend payload schema | None | Now matches what `placeOrder` already sends. |
| Performance | None | One `.map` over typically 1–3 variant groups. |

---

## 9. Open Questions / Dependencies
- **None.** No backend coordination required. Pure frontend normalisation.

---

## 10. Implementation Agent Instruction
1. Read this handover and the referenced `IMPLEMENTATION_AGENT_RULES.md`.
2. Apply ONLY the diff in Section 4. Do not refactor adjacent code.
3. Lint the file → `eslint frontend/src/api/transforms/orderTransform.js`.
4. Run the QA scenarios in Section 7 on preprod.
5. If a similar PHP "Undefined array key" surfaces on `add_ons` during QA, log a separate ticket — do NOT bundle.
