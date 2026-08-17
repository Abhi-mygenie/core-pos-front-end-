# BACKEND_BRIEF_WEIGHT_RECEIPT_DISPLAY_2026_07_20

## Summary
- Issue: Receipt/KOT prints weight items as decimal Kg (e.g., "0.1Kg") instead of human-readable grams (e.g., "100gm") for small quantities
- Classification: DISPLAY_ISSUE
- Frontend impact: Receipt looks confusing to customers; per-gram price (e.g., ₹0.6) appears instead of per-Kg price (₹600)
- Priority/Risk: P2 / LOW (display-only, math is correct)

## Endpoint
- Method: POST
- URL: `/api/v2/vendoremployee/order/place-order` → triggers print
- Print payload endpoint: order bill print (internal)
- Auth: Bearer token (vendoremployee)

## Reproduction
1. Login as owner@aura.com (restaurant_id=788)
2. Order a weight item configured as `item_unit: "Kg"` (e.g., ANGAARA DRUMSTICKS 1000GM, ₹830/Kg)
3. Enter quantity 500gm (FE sends `quantity: 0.5, item_unit: "Kg"`)
4. Place order → print receipt/KOT
5. Receipt shows: QTY=0.5Kg, PRICE=830, AMT=415
6. **Expected:** QTY=500gm, PRICE=830/Kg, AMT=415

## Payload / Response

### What FE sends (place-order):
```json
{
  "food_id": 211009,
  "quantity": 0.5,
  "price": 830,
  "item_unit": "Kg",
  "item_unit_price": "830"
}
```

### What backend stores (bill_food_list):
```json
{
  "quantity": 0.5,
  "price": 415,
  "item_unit": "Kg",
  "item_unit_price": 830,
  "unit_price": "830.00"
}
```

### What receipt currently shows:
```
ITEM            QTY       PRICE    AMT
Drumsticks      0.5Kg     830      415
```

### What receipt SHOULD show:
```
ITEM            QTY       PRICE    AMT
Drumsticks      500gm     830/Kg   415
```

## Evidence
- Order #000911, restaurant 788 (Aura), 2026-07-20
- Receipt photo provided by owner (attached to session)
- Full payload captured in `/app/memory/change_requests/BUG-209_WEIGHT_DISPLAY_BILL_SUMMARY.md`

## Recommended Backend Fix
In the receipt/KOT print template, add smart quantity display:

```php
// Pseudocode for receipt template
if ($item->item_unit === 'Kg' && $item->quantity < 1) {
    $displayQty = round($item->quantity * 1000) . 'gm';
    $displayPrice = $item->unit_price . '/Kg';
} elseif ($item->item_unit === 'L' && $item->quantity < 1) {
    $displayQty = round($item->quantity * 1000) . 'ml';
    $displayPrice = $item->unit_price . '/L';
} else {
    $displayQty = $item->quantity . $item->item_unit;
    $displayPrice = $item->unit_price;
}
```

This covers both Kg→gm and L→ml conversions for fractional quantities.

## Frontend Workaround
- Available: PARTIAL — Cart already shows "500gm" instead of "0.5Kg" (line 170 of CartPanel.jsx)
- Bill Summary fix (BUG-209 Gap 1) will add unit labels to the Collect Payment panel
- Receipt is backend-controlled — no FE workaround possible for printed output

## Questions
- Q1: Does the receipt template live in the Laravel backend or in the printer agent (native app)?
- Q2: Should the `/Kg` suffix be shown in the PRICE column, or just the quantity conversion?
- Q3: For items configured as `gm` unit with per-gram price (e.g., ₹10/gm), should the receipt show ₹10/gm or convert to ₹10,000/Kg?
