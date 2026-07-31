# CR-010 — Impact Analysis: Weight-Based Menu Item Support

**Date:** 2026-06-09
**Sprint:** POS 4.0
**Priority:** P1
**Status:** COMPLETE
**Author:** Implementation Agent (brainstorming session with owner)

---

## 1. Summary

Introduce weight-based billing alongside existing piece-based billing. Menu items with a non-empty `item_unit` field (Kg, gm, L, ml) are billed as `item_unit_price × weight_entered` instead of `price × qty`. All tax, discount, service charge, and rounding rules apply identically — only the price base changes.

---

## 2. Detection Rule

**A menu item is weight-based if and only if `item_unit` is non-empty.**

Possible values: `Kg`, `gm`, `L`, `ml` — no other values expected.

Mutually exclusive with dynamic-price items (`price = ₹1` / MISC-001). One item cannot have both.

---

## 3. Confirmed Business Decisions

| # | Decision | Source |
|---|---|---|
| D1 | `line_total = item_unit_price × weight_entered` | Owner confirmed |
| D2 | Cashier always types in **small unit** (gm / ml). System auto-converts to base unit (Kg / L) for billing & payload. No switcher. | Owner confirmed |
| D3 | Payload: `price = item_unit_price`, `quantity = weight` (decimal, 2dp max) | Owner confirmed |
| D4 | New payload fields: `item_unit` + `item_unit_price` sent in cart item | Owner confirmed |
| D5 | Menu card shows catalog `price` (₹23). Visual badge indicates weight item. | Owner confirmed |
| D6 | Weight entry prompt appears BEFORE adding to cart. **Configurable** in visibility settings. | Owner confirmed |
| D7 | When prompt disabled: default weight = 1 Kg or 1 L | Owner confirmed |
| D8 | Cart: +/− with 50 gm/ml step. Quick-pick pills: 100, 250, 500, 1Kg, 2Kg, 5Kg (gm values: 100, 250, 500, 1000, 2000, 5000). For L/ml: 100ml, 250ml, 500ml, 1L, 2L, 5L. | Owner confirmed |
| D9 | Cart display: `"Sweets — 2.5 Kg @ ₹10/Kg = ₹25"` | Owner confirmed |
| D10 | Edit placed weight item: NOT allowed — cancel + re-add | Owner confirmed |
| D11 | Partial cancel: YES — cashier enters weight to cancel | Owner confirmed |
| D12 | Complementary: YES — weight captured, line total = ₹0 | Owner confirmed |
| D13 | Addons/variations on weight items: NO — not for now | Owner confirmed |
| D14 | KOT: weight + unit only, no price. Bill: weight + unit + price. | Owner confirmed |
| D15 | Reports: show "2.5 Kg" alongside quantity | Owner confirmed |
| D16 | Mixed cart: piece + weight items in same order | Owner confirmed |
| D17 | No min/max weight restriction | Owner confirmed |
| D18 | Wire `item_unit` + `item_unit_price` in Menu Management (ProductForm + BulkEditor) | Owner confirmed |
| D19 | Backend echoes `item_unit`, `item_unit_price`, weight in `orderDetails[]` | Owner confirmed |
| D20 | POS-only for now. Scanner/web support is future CR. | Owner confirmed |

---

## 4. Flagged — Owner Decision Needed

| # | Item | Status |
|---|---|---|
| F1 | **Role of `price` field (₹23) on weight items.** Not used in billing math. Displayed on menu card. Unclear if backend uses it for anything. | FLAGGED — owner said "not sure" |

---

## 5. Baseline Rules Affected

### 5.1 Rules Requiring Amendment

| Rule ID | Current Frozen Text | Amendment |
|---|---|---|
| **TOTALS-001** | "Item Total = sum of (item price × qty) for all non-cancelled, non-complementary items." | Amend: "For weight items, Item Total = sum of (item_unit_price × weight). For piece items, unchanged." |
| **PAY-001** | "Place payload: cart + totals + ..." | Amend: "Cart item payload includes `item_unit` + `item_unit_price` for weight items." |
| **PAY-002** | "Update order: only NEW items in cart-update" | Amend: same as PAY-001 — new weight items carry weight fields. |

### 5.2 Rules NOT Affected (Confirmed Safe)

TAX-001 through TAX-008 (formula unchanged — base changes, not the formula itself), SC-001 through SC-006, DEL-001 through DEL-005, TIP-001 through TIP-003, ROUND-001/002, TOTALS-002/003/004, PAY-003/004/006/007/008, SCAN-001/002, DASH-001 through DASH-004, PRINT-001/002, POLL-001/002/004, BOOT-001/002, ROOM-001, MISC-001 (mutually exclusive — no conflict), MISC-002 (complementary logic unchanged, just line total base changes).

---

## 6. Affected Files — Layer-by-Layer

### Layer 1: Inbound Data Transforms (API → Frontend)

| File | Lines | Change |
|---|---|---|
| `src/api/transforms/productTransform.js` | L54-140 (`fromAPI.product`) | Add `itemUnit: api.item_unit \|\| null` and `itemUnitPrice: parseFloat(api.item_unit_price) \|\| 0` to product shape. |
| `src/api/transforms/menuManagementTransform.js` | L34-113 (`fromAPI.food`) | Add `itemUnit: api.item_unit \|\| null` and `itemUnitPrice: parseFloat(api.item_unit_price) \|\| 0` to food shape. |
| `src/api/transforms/orderTransform.js` | L109-153 (`fromAPI.orderItem`) | Add `itemUnit: detail.item_unit \|\| detail.food_details?.item_unit \|\| null` and `itemUnitPrice: parseFloat(detail.item_unit_price \|\| detail.food_details?.item_unit_price) \|\| 0` to order item shape. Read weight from `detail.quantity` (decimal). |

### Layer 2: Outbound Data Transforms (Frontend → API)

| File | Lines | Change |
|---|---|---|
| `src/api/transforms/menuManagementTransform.js` | L218-252 (`toAPI.foodInfo`) | Add `item_unit: form.itemUnit \|\| ''` and `item_unit_price: String(form.itemUnitPrice \|\| '')` to the food_info JSON payload. |
| `src/api/transforms/orderTransform.js` | L469-604 (`buildCartItem`) | For weight items (`item.itemUnit`): set `price: item.itemUnitPrice`, `quantity: item.qty` (decimal weight), `food_amount: item.itemUnitPrice * item.qty`. Add `item_unit` and `item_unit_price` to returned object. |
| `src/api/transforms/orderTransform.js` | L624-700 (`calcOrderTotals`) | No formula change needed — `lineTotal = _fullUnitPrice * quantity` already works because `_fullUnitPrice = item_unit_price` and `quantity = weight`. Verify no integer coercion on `quantity`. |

### Layer 3: Context / State

| File | Lines | Change |
|---|---|---|
| `src/contexts/MenuContext.jsx` | — | No structural change. Product shape just carries 2 new fields (`itemUnit`, `itemUnitPrice`). |

### Layer 4: Order Entry UX

| File | Lines | Change |
|---|---|---|
| `src/components/order-entry/OrderEntry.jsx` | L61-82 (`adaptProduct`) | Add `itemUnit: product.itemUnit`, `itemUnitPrice: product.itemUnitPrice`, `isWeightItem: !!product.itemUnit` to adapted product shape. |
| `src/components/order-entry/OrderEntry.jsx` | L533-558 (`addToCart`) | Before adding: check `item.isWeightItem`. If true AND weight prompt enabled → show weight entry modal. If prompt disabled → add with default weight (1000 gm or 1000 ml = 1 Kg/L). |
| `src/components/order-entry/OrderEntry.jsx` | L713-735 (local subtotal/tax calc) | Replace `item.price * item.qty` with: for weight items `item.itemUnitPrice * item.qty`, for piece items unchanged. Or rely on `item.totalPrice` which should already be set correctly. |
| `src/components/order-entry/OrderEntry.jsx` | NEW | Add state for weight entry modal: `weightEntryItem`, `weightEntryValue`. Add `WeightEntryModal` component or inline modal. |

### Layer 5: Weight Entry Modal (NEW component)

| File | Change |
|---|---|
| `src/components/order-entry/WeightEntryModal.jsx` | **NEW FILE.** Modal with: number input (in gm/ml), +/− buttons (50 step), quick-pick pills (100, 250, 500, 1000, 2000, 5000 for gm; same pattern for ml), unit label, confirm button. Returns weight in **base unit** (Kg/L) by dividing by 1000. |

### Layer 6: Cart Panel

| File | Lines | Change |
|---|---|---|
| `src/components/order-entry/CartPanel.jsx` | L139, L230-232 (qty stepper) | For weight items: replace integer ±1 stepper with weight input. +/− with 50 gm/ml step. Show quick-pick pills. Display unit label. |
| `src/components/order-entry/CartPanel.jsx` | L159-166, L235, L291-300 (line total display) | For weight items: show `"2.5 Kg @ ₹10/Kg = ₹25"` format. Convert decimal Kg/L to display string. |

### Layer 7: Cancel Food Modal (Partial Cancel)

| File | Lines | Change |
|---|---|---|
| `src/components/order-entry/CancelFoodModal.jsx` | — | For weight items: show weight input (same pills/stepper pattern) instead of qty input. Validate entered weight ≤ item's current weight. Send partial weight in cancel payload. |

### Layer 8: Menu Management

| File | Lines | Change |
|---|---|---|
| `src/components/panels/menu/ProductForm.jsx` | — | Add `item_unit` dropdown (Kg, gm, L, ml, empty) and `item_unit_price` number input to the form. |
| `src/components/panels/menu/BulkEditor.jsx` | L51-52 (already stub columns) | Wire `itemUnit` and `itemUnitPrice` columns to actual data read/write. Already in ALL_COLUMNS as Tier 4. |
| `src/api/services/menuManagementService.js` | — | Confirm add-food and edit-food API calls include `item_unit` + `item_unit_price` in `food_info` payload. |

### Layer 9: Visibility Settings

| File | Lines | Change |
|---|---|---|
| `src/pages/StatusConfigPage.jsx` | — | Add toggle: "Weight Entry Prompt" (on/off). Store in localStorage via existing prefs pattern. |

### Layer 10: Reports

| File | Change |
|---|---|
| `src/pages/reports-module/ItemSalesHybridMockup.jsx` | Show "2.5 Kg" unit info for weight items in quantity column. |
| `src/pages/reports-module/OrderLedgerMockup.jsx` | Show unit info in quantity column for weight item lines. |
| `src/components/reports/OrderDetailSheet.jsx` | Show weight + unit in item detail view. |

### Layer 11: Print Transforms

| File | Change |
|---|---|
| `src/api/transforms/orderTransform.js` — KOT/Bill print sections | KOT: show weight + unit, no price (e.g. "Sweets 2.5 Kg"). Bill: show weight + unit + price breakdown. |

---

## 7. Files NOT Affected (Confirmed Safe)

- `src/contexts/OrderContext.jsx` — no structural change
- `src/contexts/AuthContext.jsx` — unrelated
- `src/contexts/RestaurantContext.jsx` — unrelated
- `src/contexts/SocketContext.jsx` — socket handler passes data through, no item-level logic
- `src/contexts/TableContext.jsx` — unrelated
- `src/contexts/SettingsContext.jsx` — unrelated
- `src/components/order-entry/ItemCustomizationModal.jsx` — weight items have no addons/variations
- `src/components/order-entry/MergeTableModal.jsx` — unrelated
- `src/components/order-entry/ShiftTableModal.jsx` — unrelated
- `src/components/order-entry/TransferFoodModal.jsx` — transfers full item (weight preserved)
- `src/components/order-entry/AddressFormModal.jsx` — unrelated
- `src/components/order-entry/CollectPaymentPanel.jsx` — totals flow in from calcOrderTotals (unchanged formula)
- `src/components/modals/SplitBillModal.jsx` — splits by line total (weight items produce a line total same as piece items)
- `src/components/dashboard/ScanOrderPopOut.jsx` — POS-only for now (D20)
- `src/utils/businessDay.js` — unrelated
- `src/utils/soundManager.js` — unrelated
- `src/api/services/orderService.js` — API calls unchanged, payload changes are in transforms

---

## 8. Unit Conversion Reference

| Base Unit | Small Unit | Conversion | Input Default | Billing Unit |
|---|---|---|---|---|
| Kg | gm | 1 Kg = 1000 gm | gm | Kg |
| L | ml | 1 L = 1000 ml | ml | L |
| gm | gm | 1:1 | gm | gm |
| ml | ml | 1:1 | ml | ml |

Cashier always enters in small unit. Payload `quantity` is in **base unit** (Kg or L). Conversion: `quantity = input_gm / 1000` for Kg items, `quantity = input_ml / 1000` for L items. For items where `item_unit` is already `gm` or `ml`, no conversion needed — `quantity = input` directly.

---

## 9. Cart Item Shape (Weight Item)

```javascript
{
  id: 123,
  name: "Sweets",
  price: 23,                    // catalog price (display only, NOT used in billing)
  itemUnit: "Kg",               // NEW
  itemUnitPrice: 10,            // NEW — billing rate per unit
  isWeightItem: true,           // NEW — derived from itemUnit non-empty
  qty: 2.5,                     // weight in base unit (Kg/L)
  totalPrice: 25,               // item_unit_price × qty = 10 × 2.5
  tax: { percentage: 5, type: "GST", calculation: "Exclusive" },
  // ... rest same as piece items
}
```

---

## 10. Payload Shape (Weight Item in `buildCartItem`)

```javascript
{
  food_id: 123,
  quantity: 2.5,                // weight in base unit (decimal)
  price: 10,                   // item_unit_price (billing rate)
  item_unit: "Kg",             // NEW
  item_unit_price: "10",       // NEW (string, matching API contract)
  food_amount: 25,             // item_unit_price × weight
  variation_amount: 0,
  addon_amount: 0,
  gst_amount: "1.25",          // 25 × 5% = 1.25
  vat_amount: "0.00",
  // ... rest same as piece items
}
```

---

## 11. Risk Register

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | Backend may not return `item_unit` / `item_unit_price` in orderDetails yet | MEDIUM | Check API response first. If missing, fallback to product catalog lookup via `food_id`. |
| R2 | Integer coercion on `quantity` in existing math (`item.qty \|\| 1`) | HIGH | Audit all `qty` references — ensure no `parseInt()` or `Math.floor()` on weight items. |
| R3 | Existing `qty += 1` increment in `addToCart` triggers for weight items | HIGH | Gate: if `isWeightItem`, skip the `qty += 1` dedup path. Weight items always add as new cart line or show weight prompt. |
| R4 | `price` field ambiguity (catalog ₹23 vs billing ₹10) | MEDIUM | `buildCartItem` uses `itemUnitPrice` for weight items, `price` for piece items. Document clearly. |
| R5 | Quick-pick pills may not cover all use cases (e.g. 750gm) | LOW | Pills are shortcuts only. Manual input always available. |
| R6 | Partial cancel weight validation — cancel more than ordered | MEDIUM | Validate: cancel_weight ≤ placed_weight. Reject if exceeds. |

---

## 12. Dependencies

| Dependency | Status | Blocker? |
|---|---|---|
| Backend add-food API accepts `item_unit` + `item_unit_price` | ✅ Confirmed (curl provided) | No |
| Backend edit-food API accepts `item_unit` + `item_unit_price` | ✅ Confirmed (owner directive) | No |
| Backend GET foods-list returns `item_unit` + `item_unit_price` | ⚠️ TO VERIFY | Potential — check before implementation |
| Backend orderDetails echo includes weight fields | ✅ Owner confirmed | No |
| Backend place-order accepts decimal `quantity` | ✅ Owner confirmed | No |
| Backend partial cancel accepts weight | ⚠️ TO VERIFY | Potential |

---

## 13. Estimated Scope

| Category | Count |
|---|---|
| Files modified | ~15 |
| New files | 1 (WeightEntryModal.jsx) |
| New business rules to freeze | 3 (WEIGHT-001: billing formula, WEIGHT-002: unit conversion, WEIGHT-003: detection rule) |
| Baseline amendments | 3 (TOTALS-001, PAY-001, PAY-002) |

---

## 14. Next Steps

1. ✅ Impact Analysis (this document) — COMPLETE
2. ⬜ Implementation Plan (artifact #3) — file:line changes, execution sequence, test matrix
3. ⬜ Code Gate / Scope Lock (artifact #4)
4. ⬜ Owner GO → Implementation
5. ⬜ Impl Summary + QA (artifact #5)
6. ⬜ Owner Smoke Sign-off (artifact #6)

---

*Generated: 2026-06-09 — CR-010 Impact Analysis Session*
