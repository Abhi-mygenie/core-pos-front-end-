# INV-APS-WEB-ORDER — ₹1 (APS) Items: Missing Price Entry in Banner & Missing Price Edit for Placed Items

**Date:** 2026-11-16
**Role:** INVESTIGATION
**Classification:** HIGH risk (order flow, pricing, financial)
**Steps Used:** 9/10
**Confidence:** HIGH — code-traced end-to-end, live screenshots provided by owner
**Restaurant:** RID 672 (Ruby ZAP), Table 5 and 7

---

## 1. Summary

**Root Cause: FEATURE_GAP — two missing capabilities, not a code bug.**

The POS has a working "dynamic-price" mechanism for ₹1 items (BUG-035, Apr-2026) that triggers ONLY when a cashier **taps a menu item** in OrderEntry. But when ₹1 items arrive via **web/scan order** (already placed), two gaps exist:

1. **ScanOrderPopOut (banner):** Has NO price-entry input, NO APS tag/indicator, and NO item-level cancel. It's a presentation-only overlay — Accept/Reject/Edit/Mute only. A ₹1 item displays as "₹1.00" with no way to set the real price before accepting.

2. **CartPanel (placed items in OrderEntry):** The pencil icon edits **quantity only** (not price). There is NO price-editing capability for already-placed items. The existing dynamic-price flow (`dynamicPriceItem` state + "Enter Price" modal) fires only for UNPLACED items added from the menu grid — it never activates for items that arrive pre-placed via socket/API.

**Impact:** Staff must accept the order at ₹1 (wrong), then there's no way to correct the price in the POS. The order goes to kitchen with wrong financials.

---

## 2. Existing Dynamic-Price Mechanism (₹1 Items)

### What EXISTS today (BUG-035, working correctly):

```
When CASHIER clicks a menu item with price === 1:
  → OrderEntry.jsx:849: if (Number(item.price) === 1) → intercepted
  → setDynamicPriceItem(item) → shows "Enter Price" modal
  → Cashier types actual price → confirmDynamicPriceAndAdd()
  → Item added to cart with _isDynamicPrice: true, price: entered value
  → All downstream (totals, payment, print) use entered price
```

### What EXISTS for customizable ₹1 items:

```
When ₹1 item ALSO has variants/addons:
  → ItemCustomizationModal.jsx:21-25
  → "Set Price" input field renders inline when isDynamicEntry=true
  → basePriceOverride state → price override flows into cart
  → Same downstream behavior
```

### What DOES NOT EXIST:

| Capability | ScanOrderPopOut | CartPanel (placed) | Menu Grid (unplaced) |
|-----------|----------------|-------------------|---------------------|
| APS tag / ₹1 indicator | ❌ MISSING | ❌ MISSING | N/A (price shown) |
| Price input for ₹1 items | ❌ MISSING | ❌ MISSING | ✅ EXISTS (BUG-035) |
| Item-level cancel | ❌ MISSING | ✅ EXISTS (cancel button) | ✅ EXISTS (delete) |
| Quantity edit | ❌ MISSING | ✅ EXISTS (pencil icon) | ✅ EXISTS (+/- buttons) |
| Accept with price entry | ❌ MISSING | N/A | N/A |

---

## 3. Hypotheses Tested

| # | Hypothesis | Test Method | Steps | Result | Evidence |
|---|-----------|-------------|-------|--------|----------|
| H1 | ScanOrderPopOut has price-editing | grep for input/price/edit in ScanOrderPopOut.jsx | 1 | **ELIMINATED** | Zero input fields in ScanOrderPopOut. Only renders item display (name, qty, unitPrice, lineTotal). |
| H2 | ScanOrderPopOut has item-level cancel | Code trace (ScanOrderPopOut.jsx:447-557) | 1 | **ELIMINATED** | Items render as read-only `<li>` rows. No delete/cancel button per item. Only whole-order Reject. |
| H3 | CartPanel has price edit for placed items | Code trace (CartPanel.jsx:65 PlacedItemRow) | 1 | **ELIMINATED** | Pencil icon (L189-190) triggers `setEditingQtyItemId` → shows qty stepper. NO price input anywhere in PlacedItemRow. |
| H4 | OrderEntry dynamic-price activates for placed items | Code trace (OrderEntry.jsx:847-854) | 1 | **ELIMINATED** | `addToCart()` intercepts `price===1` → but only called when cashier clicks menu item. Placed items from socket never go through `addToCart()`. |
| H5 | There's a backend API to update placed item price | Endpoint search | 1 | **PARTIAL** | `EDIT_ORDER_ITEM` and `EDIT_ORDER_ITEM_QTY` are defined in constants.js but both show `'TBD'` — not implemented yet. |
| H6 | The order transform preserves ₹1 on placed items | Code trace (orderTransform.js:204, L171) | 1 | **CONFIRMED** | `fOrderStatus`, `price`, `food_price` from API are pass-through. ₹1 stays as ₹1. |
| H7 | Menu product data has an APS/open-price marker | grep for aps/openPrice in productTransform | 1 | **ELIMINATED** | No APS/open-price field in product transform. ₹1 is the ONLY signal for dynamic pricing (BUG-035 convention). |

---

## 4. Data Flow Trace — Web Order with ₹1 Item

### What happens today:

```
Step 1: Customer orders "melo fish" (₹1 APS item) + "Hot Garlic Sauce" (₹299) via QR
  → Backend creates order with melo fish at price=₹1, fOS=7 (YTC)
  → Socket: scan-new-order with full payload including ₹1 price

Step 2: ScanOrderPopOut renders
  → Shows: "1× melo fish  ₹1.00" and "1× Hot Garlic Sauce  ₹299.00"
  → Total: ₹347.01 (includes tax on ₹1 base — wrong)
  → NO APS tag, NO price input, NO item-level actions
  → Staff can ONLY: Accept (at ₹1), Reject (whole order), Edit (opens OrderEntry), Mute

Step 3: If staff clicks "Accept"
  → confirmOrder() API called → order confirmed at ₹1 price
  → Kitchen gets KOT with ₹1 melo fish → WRONG PRICE
  → Settlement will record ₹1 → FINANCIAL ERROR

Step 4: If staff clicks "Edit"
  → handleTableClick → navigates to OrderEntry for this table
  → CartPanel shows placed items: melo fish ₹1, Hot Garlic Sauce ₹299
  → Pencil icon → edits QTY only, not price
  → Cancel button → can cancel the item (item-level cancel EXISTS)
  → BUT: no way to change ₹1 to actual price
  → Staff can cancel melo fish and re-add from menu → triggers BUG-035 price entry
  → WORKAROUND exists but is clunky: cancel + re-add
```

---

## 5. What Needs to Be Built (2 Feature Gaps)

### GAP 1: ScanOrderPopOut — APS Tag + Price Input + Item-Level Cancel

**Current state:** Items render as read-only rows (L447-557). No interactivity.

**Required:**
1. **APS Tag:** When `item.unitPrice === 1` or `item.price === 1`, show an "APS" badge (similar to "PAID" badge at L379-389)
2. **Price Input:** Inline price input field for APS items — cashier enters actual price before accepting
3. **Item-Level Cancel:** Per-item cancel button (X icon) that removes the item from the order before accepting (or marks it for backend cancellation on accept)
4. **Accept behavior:** When APS items have no price entered, Accept button should be disabled or show validation error

**Files affected:**
- `ScanOrderPopOut.jsx` — UI changes (APS tag, price input, item cancel)
- `DashboardPage.jsx` — may need new handlers for item-level actions from popup
- `orderService.js` — may need item-cancel API call if cancelling before accept

**Complexity:** MEDIUM — ScanOrderPopOut is currently presentation-only with strict anti-rules (no service/API/socket calls). Adding price input breaks the "no mutation" contract and requires owner approval.

### GAP 2: CartPanel — Price Edit for Placed ₹1 Items

**Current state:** PlacedItemRow (L65) has qty edit via pencil icon. No price edit.

**Required:**
1. **Price input for placed ₹1 items:** When a placed item has `price === 1` (or `_isDynamicPrice: true`), the price column should show an editable input (similar to qty edit mode)
2. **Backend API:** Needs an endpoint to update placed item price. Currently `EDIT_ORDER_ITEM: 'TBD'` and `EDIT_ORDER_ITEM_QTY: 'TBD'` — both are placeholder strings.

**Files affected:**
- `CartPanel.jsx` — PlacedItemRow needs price edit UI
- `OrderEntry.jsx` — needs `updateItemPrice` handler
- `orderService.js` — needs API call for price update (backend must implement endpoint first)
- `constants.js` — EDIT_ORDER_ITEM endpoint URL (currently 'TBD')

**Complexity:** HIGH — requires backend API (currently TBD). Frontend change is straightforward once API exists.

---

## 6. Existing Workaround

Staff can work around both gaps today:

1. In ScanOrderPopOut: Click **Edit** (opens OrderEntry)
2. In OrderEntry: **Cancel** the ₹1 item (item-level cancel exists)
3. Re-add the item from the menu grid → ₹1 triggers BUG-035 "Enter Price" modal → enter actual price
4. Click "Update Order"

**Downsides:** Requires 4 extra steps per APS item. Slower than direct price entry. Cancel generates a cancellation record on backend.

---

## 7. Backend Dependency Assessment

| Requirement | Backend Ready? | Details |
|-------------|---------------|---------|
| Accept order at modified price | ❌ UNKNOWN | confirm-order endpoint may not accept item-level price overrides |
| Item-level cancel before accept | ❌ UNKNOWN | No API for cancelling individual items on a YTC (fOS=7) order |
| Edit placed item price | ❌ NOT READY | `EDIT_ORDER_ITEM: 'TBD'` — endpoint not implemented |
| Edit placed item qty | ❌ NOT READY | `EDIT_ORDER_ITEM_QTY: 'TBD'` — endpoint not implemented |

**Backend brief needed** for all 4 capabilities before frontend implementation can begin.

---

## 8. Recommendations

**Classification:** FEATURE_GAP — requires new CR, not a bug fix.

### Recommended Approach:

**Phase 1 (FE-only, no backend dependency):**
- Add APS tag in ScanOrderPopOut for ₹1 items (visual indicator only)
- Add item-level cancel in ScanOrderPopOut (reuses existing cancel-food-item API)
- Disable Accept button when any APS item has no price override

**Phase 2 (requires backend):**
- Price input in ScanOrderPopOut → needs API to update item price on YTC order
- Price edit in CartPanel for placed items → needs EDIT_ORDER_ITEM endpoint
- Backend brief: define the API contract for item-level price update

**Risk:** HIGH — financial logic, order flow, R5 hotspot files (OrderEntry, CartPanel, ScanOrderPopOut).

**Planning skip eligible:** NO — multiple files, financial impact, backend dependency.

---

## 9. Evidence Artifacts

### Screenshots (provided by owner):
- Screenshot 1: ScanOrderPopOut showing "melo fish ₹1.00" with no APS tag or price input
- Screenshot 2: OrderEntry showing placed "melo fish ₹1" with qty edit pencil but no price edit

### Code References:
| File | Lines | Finding |
|------|-------|---------|
| `OrderEntry.jsx` | 160-165, 847-854 | Dynamic-price state + intercept for unplaced items ONLY |
| `OrderEntry.jsx` | 3014-3081 | "Enter Price" modal — fires only for menu-added items |
| `ItemCustomizationModal.jsx` | 21-25, 381-407 | Inline price entry for customizable ₹1 items (unplaced only) |
| `ScanOrderPopOut.jsx` | 447-557 | Item rows — read-only `<li>`, no input, no cancel |
| `ScanOrderPopOut.jsx` | 589-648 | Action row — Accept/Reject/Edit/Mute only |
| `CartPanel.jsx` | 65, 179-190 | PlacedItemRow — pencil edits QTY only, no price edit |
| `constants.js` | 92-93 | `EDIT_ORDER_ITEM: 'TBD'`, `EDIT_ORDER_ITEM_QTY: 'TBD'` |

Saved to: `/app/memory/evidence/INV-APS-WEB-ORDER-2026-11-16/`

---

## Report Footer

```
Root cause: FEATURE_GAP — two missing capabilities:
  1. ScanOrderPopOut has no APS tag, no price input, no item-level cancel
  2. CartPanel has no price edit for placed items (qty edit only)
  Existing BUG-035 dynamic-price mechanism works ONLY for menu-added items.
  Web orders arrive pre-placed at ₹1 — no price correction path exists.
Confidence: HIGH. Steps: 9/10.
Classification: FEATURE_GAP (new CR needed)
Backend dependency: YES — EDIT_ORDER_ITEM endpoint is 'TBD'
FE fix alone: Partial (APS tag + item cancel in popup). Full fix needs backend.
Planning skip eligible: NO — multiple files, financial, backend-blocked.
Retroactive candidates: NONE.
Investigation report at: /app/memory/investigations/INV-APS-WEB-ORDER-2026-11-16.md
```
