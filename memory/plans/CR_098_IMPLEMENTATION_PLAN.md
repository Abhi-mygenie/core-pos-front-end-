# CR-098 — Implementation Plan (Gate 3)

**Date:** 2026-07-24
**Impact Analysis:** `impact/CR_098_IMPACT_ANALYSIS.md` (Gate 2 ✅)
**Code Reality:** NONE
**Risk:** LOW
**Scope Lock:** 3 files WILL change, all others WILL NOT touch

---

## Verification Matrix

| Edit # | File | Change Description | How to Verify | Automated? |
|--------|------|--------------------|---------------|:---:|
| 1 | `orderTransform.js:117` | Add `itemCode` field to item mapping | Code inspection: field present after transform | NO |
| 2 | `OrderEntry.jsx:66` | Add `itemCode` to `adaptProduct()` | Code inspection: product carries itemCode | NO |
| 3 | `OrderEntry.jsx:531` | Extend search filter to match itemCode | Browser: type short code in search → item found | NO |
| 4 | `OrderEntry.jsx:1653` | Show short code on menu item pills | Browser: pills show `[SC01]` prefix when enabled | NO |
| 5 | `OrderCard.jsx:659` | Show short code on Preparing item rows | Browser: OrderCard items show `[SC01] item (qty)` | NO |
| 6 | `OrderCard.jsx:734` | Show short code on Served item rows | Browser: Served items show code | NO |
| 7 | `OrderCard.jsx:779` | Show short code on Cancelled item rows | Browser: Cancelled items show code | NO |

---

## Edits (Execution Sequence)

### Edit 1: `api/transforms/orderTransform.js` — Map `item_code` from food_details

**File:** `api/transforms/orderTransform.js`
**Line:** After L117 (`name: foodDetails.name || 'Unknown Item',`)
**Current:** No `itemCode` field in the returned object
**New:** Add one line:
```js
      itemCode: foodDetails.item_code || '',               // CR-098: short code for OrderCard display
```

### Edit 2: `components/order-entry/OrderEntry.jsx` — Add `itemCode` to `adaptProduct()`

**File:** `components/order-entry/OrderEntry.jsx`
**Line:** After L90 (`giveDiscount: product.giveDiscount !== false,`)
**Current:** `adaptProduct()` does not carry `itemCode`
**New:** Add one line:
```js
    itemCode: product.itemCode || '',                      // CR-098: short code for display + search
```

### Edit 3: `components/order-entry/OrderEntry.jsx` — Search by itemCode too

**File:** `components/order-entry/OrderEntry.jsx`
**Line:** L531
**Current:**
```js
      items = items.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
```
**New:**
```js
      // CR-098: search by name OR short code
      const q = searchQuery.toLowerCase();
      items = items.filter(item => item.name.toLowerCase().includes(q) || (item.itemCode && item.itemCode.toLowerCase().includes(q)));
```

### Edit 4: `components/order-entry/OrderEntry.jsx` — Show short code on menu pills

**File:** `components/order-entry/OrderEntry.jsx`
**Line:** L1653
**Current:**
```jsx
                    <span>{item.name}</span>
```
**New:**
```jsx
                    <span>{item.itemCode ? `[${item.itemCode}] ` : ''}{item.name}</span>
```
**Gate:** This is always visible when `itemCode` exists. The Short Code toggle gates the *backend print* behavior (BUG-143), not FE display. If owner wants to gate on toggle, use `useToken` from `useRestaurant()` in OrderEntry (already imported at L93).

### Edit 5-7: `components/cards/OrderCard.jsx` — Show short code on item rows

**File:** `components/cards/OrderCard.jsx`

**Edit 5 — L659 (Preparing/Ready items):**
```
Current: {item.name} ({item.qty})
New:     {item.itemCode ? `[${item.itemCode}] ` : ''}{item.name} ({item.qty})
```

**Edit 6 — L734 (Served items):**
```
Current: {item.name} ({item.qty})
New:     {item.itemCode ? `[${item.itemCode}] ` : ''}{item.name} ({item.qty})
```

**Edit 7 — L779 (Cancelled items):**
```
Current: {item.name} ({item.qty})
New:     {item.itemCode ? `[${item.itemCode}] ` : ''}{item.name} ({item.qty})
```

---

## Scope Lock

**Files WILL change:**
- `api/transforms/orderTransform.js` (1 line)
- `components/order-entry/OrderEntry.jsx` (4 edits, ~6 lines)
- `components/cards/OrderCard.jsx` (3 edits, ~3 lines)

**Files WILL NOT touch:**
- CartPanel.jsx, CollectPaymentPanel.jsx, productTransform.js, RestaurantSettingsPage.jsx, categoryPanel.jsx, orderService.js, profileTransform.js

## Post-Code Registry Checklist

- [ ] registry.json: CR-098 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: add orderTransform.js, OrderEntry.jsx, OrderCard.jsx
- [ ] Code markers: // CR-098 comment in every modified file

---

**Next:** Gate 4 GO → Implementation
