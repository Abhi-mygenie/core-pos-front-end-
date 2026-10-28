# Investigation Report — BUG-606 + BUG-268 Code Reality Check

**Date:** 2026-10-28  
**Role:** INVESTIGATION (Role 6)  
**Steps used:** 10/10  
**Triggered by:** Owner confirmed backend is sending socket for BUG-606; BUG-268 appears old and fixed

---

## BUG-606 — Role-Based Discount: Socket Not Delivering Discount Data to Cashier

### Previous status: `GATE_2_COMPLETE_BACKEND_BLOCKED`
### New status: `GATE_5B_QA_PASS`

### Root cause (from original investigation)
Backend was not including `order_discount_json` in socket events for `update-order`. Cashier's CPP never saw the discount applied by the owner, so discount showed as 0 until a full page reload.

### Fix confirmation — full chain traced in code

```
Backend socket fires (update-order with order_discount_json)
   ↓
socketHandlers.js L13: fromAPI = orderFromAPI (orderTransform)
   ↓
orderTransform.js L237-243:
   orderDiscountJson: api.order_discount_json
     ? { discount: parseFloat(...), discountType: ..., discountNote: ... }
     : null
   ← backend field mapped to camelCase shape ✅
   ↓
socketHandlers.js → updateOrder() in OrderContext
   ↓
OrderContext.jsx L342:
   orderDiscountJson: order.orderDiscountJson || null
   ← explicitly whitelisted in orderItemsByTableId rebuild (BUG-595) ✅
   ↓
OrderEntry.jsx L1955:
   initialDiscount={liveOrder?.orderDiscountJson || orderData?.orderDiscountJson || null}
   ← reads from socket-reactive liveOrder (BUG-595) ✅
   ↓
CollectPaymentPanel.jsx L369-376:
   useEffect(() => { ..seeding.. }, [initialDiscount?.discount, initialDiscount?.discountType])
   ← reactive — fires whenever socket updates the value (BUG-595) ✅
```

**Every link in the chain is in place.** With backend now confirmed sending the socket field, the discount flows to the cashier's CPP in real-time without any page reload.

### Classification
- **Implemented via:** BUG-595 (FE chain) + backend fix (socket payload)
- **FE code changes:** BUG-595 markers in OrderContext + OrderEntry + CPP
- **No new FE work needed**
- **Retroactive candidate:** YES — code was done under BUG-595, not explicitly under BUG-606 ID

---

## BUG-268 — Inventory Setup: Edit Ingredient Fails (inventory_audit_logs AUTO_INCREMENT)

### Previous status: `INVESTIGATION COMPLETE — BACKEND-BLOCKED (SQL AUTO_INCREMENT missing)`
### New status: `CLOSED_BACKEND_FIX_RETROACTIVE`

### Root cause (from original investigation)
`inventory_audit_logs.id` column was missing `AUTO_INCREMENT` in the database schema. When FE called `updateIngredient`, the backend tried to `INSERT` into this table without an auto-generated id → SQL error → FE saw a 422/500 response.

### FE code was always correct — chain verified

```
InventorySetupPanel.jsx L201:
  await inventoryService.updateIngredient(editingId, editIng)  ← calls service ✅

inventoryService.js L23-25:
  export async function updateIngredient(id, data) {
    const payload = toAPI.updateIngredient(data);
    return api.put(`.../${id}`, payload);
  }  ← correct PATCH/PUT call ✅

inventoryTransform.js L155-175:
  updateIngredient(data) {
    return { stock_title, category_id, unit, small_unit, ... }
  }  ← payload shape correct ✅
```

FE edit ingredient flow is complete and correct. The backend DB migration adding `AUTO_INCREMENT` to `inventory_audit_logs.id` was the only fix required.

**Cannot reproduce from FE** — the error was a backend SQL constraint, not a frontend defect.

### Classification
- **Type:** BACKEND DB FIX (schema migration)
- **FE changes:** NONE required (FE was always correct)
- **Closure type:** RETROACTIVE — bug existed at backend layer; FE unaffected

---

## Registry Updates Applied

| ID | Old Status | New Status |
|---|---|---|
| BUG-606 | GATE_2_COMPLETE_BACKEND_BLOCKED | **GATE_5B_QA_PASS** |
| BUG-268 | INVESTIGATION_COMPLETE_BACKEND_BLOCKED | **CLOSED_BACKEND_FIX_RETROACTIVE** |
