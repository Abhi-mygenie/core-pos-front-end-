# CR-010 — Implementation Plan: Weight-Based Menu Item Support

**Date:** 2026-06-09
**Sprint:** POS 4.0
**Priority:** P1
**Gate:** 3 (Implementation Plan)
**Prerequisite:** Gate 2 Impact Analysis — COMPLETE
**Reference:** `CR_010_WEIGHT_BASED_BILLING_IMPACT_ANALYSIS_2026_06_09.md`

---

## Execution Strategy

**12 atomic steps** grouped into 5 phases. Each step is independently testable.
Rollback: revert the step's file(s) only — no cross-step dependencies until Phase 4 (integration).

---

## Phase 1: Data Layer (Steps 1–3)

### Step 1 — Inbound Product Transform
**File:** `src/api/transforms/productTransform.js`
**Line:** ~L54 (`fromAPI.product`)
**Change:** Add 2 fields after `deliveryCharge` (L128):
```js
// CR-010: Weight-based billing fields
itemUnit: api.item_unit || null,
itemUnitPrice: parseFloat(api.item_unit_price) || 0,
```
**Test:** Log a product with `item_unit` set — verify fields appear in transformed shape.

---

### Step 2 — Inbound Menu Management Transform
**File:** `src/api/transforms/menuManagementTransform.js`
**Line:** ~L112 (end of `fromAPI.food`, after `portionSize`)
**Change:** Add 2 fields:
```js
// CR-010: Weight-based billing fields
itemUnit: api.item_unit || null,
itemUnitPrice: parseFloat(api.item_unit_price) || 0,
```
**Line:** ~L252 (end of `toAPI.foodInfo`)
**Change:** Add 2 fields to outbound payload:
```js
// CR-010: Weight-based billing fields
item_unit: form.itemUnit || '',
item_unit_price: String(form.itemUnitPrice || ''),
```
**Test:** Menu Management panel — verify weight fields appear in form and are sent on save.

---

### Step 3 — Inbound Order Transform (Rehydration)
**File:** `src/api/transforms/orderTransform.js`
**Line:** ~L153 (end of `fromAPI.orderItem`, after `isComplementaryRuntime`)
**Change:** Add 3 fields:
```js
// CR-010: Weight-based billing — rehydrate from backend echo
itemUnit: detail.item_unit || detail.food_details?.item_unit || null,
itemUnitPrice: parseFloat(detail.item_unit_price || detail.food_details?.item_unit_price) || 0,
isWeightItem: !!(detail.item_unit || detail.food_details?.item_unit),
```
**Test:** Open an existing order with a weight item from dashboard — verify fields are present on cart items.

---

## Phase 2: Weight Prefs + Weight Entry Modal (Steps 4–5)

### Step 4 — Weight Prefs (Visibility Settings)
**New file:** `src/utils/weightEntryPrefs.js`
**Pattern:** Follows `qsrModePrefs.js` (localStorage getter/setter).
```js
// CR-010: Weight entry prompt preference
export const WEIGHT_PROMPT_KEY = 'mygenie_weight_prompt_enabled';

export const getWeightPromptEnabled = () => {
  try { return localStorage.getItem(WEIGHT_PROMPT_KEY) !== 'false'; }
  catch (_) { return true; }  // default ON
};

export const setWeightPromptEnabled = (value) => {
  try { localStorage.setItem(WEIGHT_PROMPT_KEY, value ? 'true' : 'false'); }
  catch (_) {}
};
```
**File:** `src/pages/StatusConfigPage.jsx`
**Change:** Add a toggle in the "UI Elements" section (alongside QSR Mode, Stay on Order, etc.):
- Import `getWeightPromptEnabled`, `setWeightPromptEnabled` from `weightEntryPrefs.js`
- Add state: `const [weightPromptEnabled, setWeightPromptLocal] = useState(getWeightPromptEnabled())`
- Add toggle row: "Weight Entry Prompt — Show weight input before adding weight items to cart"
- On toggle: `setWeightPromptEnabled(val); setWeightPromptLocal(val);`

**Test:** Toggle on/off in visibility settings, verify localStorage persists.

---

### Step 5 — Weight Entry Modal (NEW component)
**New file:** `src/components/order-entry/WeightEntryModal.jsx`
**Props:** `{ item, onConfirm(weightInBaseUnit), onClose }`
**Spec:**
- Detects unit family from `item.itemUnit`:
  - Kg/gm → `{ small: 'gm', base: 'Kg', factor: 1000 }`
  - L/ml → `{ small: 'ml', base: 'L', factor: 1000 }`
  - gm → `{ small: 'gm', base: 'gm', factor: 1 }`
  - ml → `{ small: 'ml', base: 'ml', factor: 1 }`
- Input always in **small unit** (gm / ml)
- Default value: 1000 (= 1 Kg or 1 L) for Kg/L items; 100 for gm/ml items
- **+/− buttons:** step = 50 (gm or ml)
- **Quick-pick pills:**
  - Kg/gm family: `100 | 250 | 500 | 1 Kg | 2 Kg | 5 Kg` (values: 100, 250, 500, 1000, 2000, 5000)
  - L/ml family: `100 | 250 | 500 | 1 L | 2 L | 5 L` (values: 100, 250, 500, 1000, 2000, 5000)
- Shows: item name, unit price (`₹10/Kg`), live total (`₹25.00`)
- **Confirm button:** calls `onConfirm(inputValue / factor)` — converts to base unit
- Validation: value must be > 0
- **Visual:** Same modal pattern as dynamic-price modal (L2276-2320 in OrderEntry.jsx)

**Test:** Render modal with a Kg item, verify pills, +/−, total calc, and output in base unit.

---

## Phase 3: Order Entry + Cart (Steps 6–8)

### Step 6 — adaptProduct + addToCart (OrderEntry.jsx)
**File:** `src/components/order-entry/OrderEntry.jsx`

**L61-82 (`adaptProduct`):** Add 3 fields:
```js
itemUnit: product.itemUnit || null,
itemUnitPrice: product.itemUnitPrice || 0,
isWeightItem: !!product.itemUnit,
```

**L115-121 (state):** Add weight modal state:
```js
const [weightEntryItem, setWeightEntryItem] = useState(null);
```
Import `getWeightPromptEnabled` from `weightEntryPrefs.js`.
Import `WeightEntryModal` from `./WeightEntryModal`.

**L533-558 (`addToCart`):** Insert weight-item gate BEFORE the existing `price === 1` dynamic-price check (L536):
```js
// CR-010: Weight item intercept — before dynamic-price check
if (item.isWeightItem) {
  if (getWeightPromptEnabled()) {
    setWeightEntryItem(item);
    return;
  }
  // Prompt disabled → add with default 1 base unit
  const defaultWeight = (item.itemUnit === 'gm' || item.itemUnit === 'ml') ? 100 : 1;
  setCartItems([...cartItems, {
    ...item,
    qty: defaultWeight,
    price: item.itemUnitPrice,
    totalPrice: item.itemUnitPrice * defaultWeight,
    status: 'preparing',
    placed: false,
    addedAt: new Date().toISOString(),
  }]);
  return;
}
```

**NEW handler — `confirmWeightAndAdd`:**
```js
const confirmWeightAndAdd = (weightInBaseUnit) => {
  const item = weightEntryItem;
  setCartItems([...cartItems, {
    ...item,
    qty: weightInBaseUnit,
    price: item.itemUnitPrice,
    totalPrice: item.itemUnitPrice * weightInBaseUnit,
    status: 'preparing',
    placed: false,
    addedAt: new Date().toISOString(),
  }]);
  setWeightEntryItem(null);
};
```

**JSX (after dynamic-price modal, ~L2320):** Add WeightEntryModal render:
```jsx
{weightEntryItem && (
  <WeightEntryModal
    item={weightEntryItem}
    onConfirm={confirmWeightAndAdd}
    onClose={() => setWeightEntryItem(null)}
  />
)}
```

**L713-735 (local subtotal/tax):** No change needed — existing `item.totalPrice || (item.price * item.qty)` will use `totalPrice` which we set correctly above.

**Test:** Click a weight item → modal appears → enter weight → item in cart with correct total.

---

### Step 7 — Cart Panel Weight Display
**File:** `src/components/order-entry/CartPanel.jsx`

**Placed items section (~L139):** For weight items, replace qty stepper with weight display:
```js
// CR-010: Weight items show weight display, not integer stepper
{item.isWeightItem ? (
  <span className="font-bold text-sm" style={{ color: COLORS.primaryGreen }}>
    {formatWeight(item.qty, item.itemUnit)}
  </span>
) : (
  // existing qty stepper for placed items
)}
```

**Unplaced items section (~L230-232):** For weight items, replace ±1 stepper with weight stepper:
```js
{item.isWeightItem ? (
  <WeightStepper
    value={item.qty}
    unit={item.itemUnit}
    step={0.05}  // 50gm = 0.05 Kg
    onChange={(newWeight) => updateQuantity(item.id, newWeight)}
  />
) : (
  // existing ±1 stepper
)}
```

**Line total display (~L235):** For weight items, show breakdown:
```js
{item.isWeightItem ? (
  <span className="font-bold text-sm" style={{ color: COLORS.primaryOrange }}>
    {formatWeight(item.qty, item.itemUnit)} @ ₹{item.itemUnitPrice}/{item.itemUnit}
    {' = '}₹{(item.totalPrice || (item.itemUnitPrice * item.qty)).toLocaleString()}
  </span>
) : (
  // existing price display
)}
```

**NEW helper — `formatWeight`:**
```js
const formatWeight = (qty, unit) => {
  if (unit === 'Kg' || unit === 'L') {
    if (qty < 1) return `${Math.round(qty * 1000)} ${unit === 'Kg' ? 'gm' : 'ml'}`;
    return `${parseFloat(qty.toFixed(2))} ${unit}`;
  }
  return `${parseFloat(qty.toFixed(2))} ${unit}`;
};
```

**Inline `WeightStepper` subcomponent** (within CartPanel or extracted):
- +/− buttons with step = 50gm (0.05 Kg for Kg items, 0.05 L for L items, 50 for gm/ml items)
- Quick-pick pills row beneath
- Minimum weight: step value (prevent going to 0)

**Test:** Add weight item → verify cart shows weight format, +/− works in 50gm steps, pills work.

---

### Step 8 — Menu Card Weight Badge
**File:** `src/components/order-entry/OrderEntry.jsx` (menu grid rendering)
**Location:** Where product cards render (~L1477 and the ProductGrid component)

**Change:** For weight items, show a small badge on the menu card:
```jsx
{item.isWeightItem && (
  <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
    ₹{item.itemUnitPrice}/{item.itemUnit}
  </span>
)}
```
The catalog `price` (₹23) remains as the main price display (owner confirmed).

**Test:** Weight items show "₹10/Kg" badge on menu card alongside ₹23.

---

## Phase 4: Payload + Billing (Steps 9–10)

### Step 9 — buildCartItem (Weight-Aware)
**File:** `src/api/transforms/orderTransform.js`
**Line:** L469-604 (`buildCartItem`)

**Change at L553-555** (price/amount calc):
```js
// CR-010: Weight items use itemUnitPrice as billing rate
const isWeight = !!item.itemUnit;
const basePrice = isWeight ? (item.itemUnitPrice || item.price || 0) : (item.price || 0);
const foodAmount = basePrice * (item.qty || 1);
const fullUnitPrice = basePrice + (isWeight ? 0 : addonAmount + variationAmount);
// Weight items: no addons/variations (D13)
```

**Change at L576-604** (return object): Add new fields:
```js
return {
  food_id:             item.foodId || item.id,
  quantity:            item.qty || 1,          // decimal for weight items
  price:               basePrice,              // item_unit_price for weight items
  // CR-010: Weight-based billing fields
  ...(isWeight ? {
    item_unit:         item.itemUnit,
    item_unit_price:   String(item.itemUnitPrice || ''),
  } : {}),
  // ... rest unchanged
  food_amount:         isRuntimeComp ? 0 : foodAmount,
  // ... rest unchanged
};
```

**Change at L562** (lineTotal): Ensure no integer coercion:
```js
const lineTotal = fullUnitPrice * (item.qty || 1);  // qty is decimal for weight — already works
```

**Test:** Place an order with a weight item → verify payload has `item_unit`, `item_unit_price`, decimal `quantity`, correct `food_amount`.

---

### Step 10 — calcOrderTotals Audit
**File:** `src/api/transforms/orderTransform.js`
**Line:** L624-700 (`calcOrderTotals`)

**Audit L649:**
```js
const lineTotal = (item._fullUnitPrice || item.price || 0) * (item.quantity || 1);
```
This already works for weight items because:
- `_fullUnitPrice` = `item_unit_price` (from Step 9)
- `item.quantity` = weight (decimal)
- Result = correct line total

**Action:** Verify no `parseInt()` or `Math.floor()` on `item.quantity` anywhere in the function. Add a comment:
```js
// CR-010: item.quantity may be decimal for weight-based items — do not parseInt/floor
```

**Test:** Mixed cart (piece + weight items) → verify subtotal, tax, grand total are correct.

---

## Phase 5: Supporting Features (Steps 11–12)

### Step 11 — Partial Cancel (CancelFoodModal)
**File:** `src/components/order-entry/CancelFoodModal.jsx`

**L9-14 (state + qty logic):** For weight items, replace integer cancel qty with weight input:
```js
const isWeight = !!item?.itemUnit;
const [cancelQty, setCancelQty] = useState(isWeight ? item.qty : 1);  // full weight default
const itemQty = item?.qty || 1;
// Show qty/weight selector always for weight items (even if qty <= 1)
const showQtySelector = isWeight || itemQty > 1;
```

**L16-17 (increase/decrease):** For weight items, step by 50gm equivalent:
```js
const step = isWeight
  ? ((item.itemUnit === 'Kg' || item.itemUnit === 'L') ? 0.05 : 50)
  : 1;
const decreaseQty = () => { if (cancelQty > step) setCancelQty(Math.round((cancelQty - step) * 100) / 100); };
const increaseQty = () => { if (cancelQty < itemQty) setCancelQty(Math.round((cancelQty + step) * 100) / 100); };
```

**UI:** For weight items, show weight display with unit label instead of integer.

**Test:** Cancel partial weight from a placed weight item → verify payload sends correct partial quantity.

---

### Step 12 — Menu Management Wiring (ProductForm + BulkEditor)
**File:** `src/components/panels/menu/ProductForm.jsx`
**Change:** Add two fields in the form:
- `item_unit` dropdown: options = `['', 'Kg', 'gm', 'L', 'ml']` (empty = piece-based)
- `item_unit_price` number input: shown only when `item_unit` is non-empty

**File:** `src/components/panels/menu/BulkEditor.jsx`
**L51-52:** Already has stub columns. Wire to actual data:
- `itemUnit`: read from food data, write via `toAPI.foodInfo`
- `itemUnitPrice`: read from food data, write via `toAPI.foodInfo`
- Make `itemUnit` a dropdown type (Kg/gm/L/ml/empty)

**Test:** Edit an item in ProductForm → set unit to Kg, price to 10 → save → verify API payload includes `item_unit` and `item_unit_price`.

---

## Phase 6: Reports + Print (Post-MVP, can ship separately)

### Step 13 (Post-MVP) — Reports Weight Display
**Files:** `ItemSalesHybridMockup.jsx`, `OrderLedgerMockup.jsx`, `OrderDetailSheet.jsx`
**Change:** In quantity columns, show `"2.5 Kg"` for weight items instead of raw number.

### Step 14 (Post-MVP) — Bill Print Weight Display
**File:** `orderTransform.js` — `buildBillPrintPayload`
**Change:** For weight items in `billFoodList`, append unit info to display.

---

## Verification Matrix

| # | Test Case | Expected Result |
|---|---|---|
| T1 | Click weight item (prompt ON) | Weight modal appears with pills, +/−, total |
| T2 | Enter 500gm → confirm | Cart shows "0.5 Kg @ ₹10/Kg = ₹5" |
| T3 | Click weight item (prompt OFF) | Item added with default 1 Kg, total = ₹10 |
| T4 | Cart +/− stepper on weight item | Steps by 50gm (0.05 Kg) |
| T5 | Cart quick-pick pill "2 Kg" | Weight jumps to 2 Kg, total updates |
| T6 | Place order with weight item | Payload: `quantity: 0.5`, `price: 10`, `item_unit: "Kg"`, `item_unit_price: "10"`, `food_amount: 5` |
| T7 | Mixed cart: Burger ×2 + Sweets 1.5Kg | Subtotal = (burger_price × 2) + (10 × 1.5) = correct |
| T8 | Tax on weight item (5% GST exclusive) | `gst_amount = line_total × 0.05` |
| T9 | Complementary weight item | Weight captured, line total = ₹0 |
| T10 | Cancel partial weight (2.5Kg → cancel 1Kg) | Payload sends `cancelQuantity: 1`, remaining = 1.5 Kg |
| T11 | Edit placed weight item (should fail) | No weight edit option — only cancel + re-add |
| T12 | Menu card shows weight badge | "₹10/Kg" badge visible alongside ₹23 |
| T13 | ProductForm: set item_unit + item_unit_price | API payload includes both fields |
| T14 | BulkEditor: edit weight fields | Save sends correct values |
| T15 | Rehydrate weight item from backend | Cart shows correct weight, unit, and total |
| T16 | Visibility toggle OFF/ON | Prompt behavior changes accordingly |
| T17 | L/ml item (e.g. Juice, item_unit=L) | Pills show ml values, billing in L |
| T18 | gm item (item_unit=gm) | No conversion needed, quantity = input directly |

---

## Execution Order (Recommended)

```
Step 1 → Step 2 → Step 3     (data layer — independent, can parallel)
Step 4                         (prefs — independent)
Step 5                         (modal — independent)
Step 6                         (OrderEntry — depends on Steps 1, 4, 5)
Step 7                         (CartPanel — depends on Step 6)
Step 8                         (menu badge — depends on Step 6)
Step 9 → Step 10               (payload — depends on Step 6)
Step 11                        (cancel — depends on Step 9)
Step 12                        (menu mgmt — depends on Step 2)
Step 13 → Step 14              (post-MVP)
```

---

## Estimated Effort

| Phase | Steps | Files | Complexity |
|---|---|---|---|
| Phase 1: Data Layer | 1–3 | 3 modified | LOW |
| Phase 2: Prefs + Modal | 4–5 | 1 new + 1 modified + 1 new | MEDIUM |
| Phase 3: Order Entry + Cart | 6–8 | 2 modified | HIGH |
| Phase 4: Payload | 9–10 | 1 modified | MEDIUM |
| Phase 5: Supporting | 11–12 | 3 modified | MEDIUM |
| Post-MVP | 13–14 | 4 modified | LOW |

---

## Next Steps

1. ✅ Intake (Gate 1) — COMPLETE
2. ✅ Impact Analysis (Gate 2) — COMPLETE
3. ✅ Implementation Plan (Gate 3) — **THIS DOCUMENT**
4. ⬜ Code Gate / Scope Lock (Gate 4)
5. ⬜ Owner GO → Implementation
6. ⬜ Impl Summary + QA (Gate 5)
7. ⬜ Owner Smoke Sign-off (Gate 6)

---

*Generated: 2026-06-09 — CR-010 Implementation Plan Session*
