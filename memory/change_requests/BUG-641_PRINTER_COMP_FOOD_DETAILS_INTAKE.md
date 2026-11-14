# BUG-641 — Printer Bill Shows Runtime Comp Item as Non-Comp — food_details.complementary Not Overridden

**ID:** BUG-641  **Type:** BUG  **Registered:** 2026-11-02  **Sprint:** nov_cr_batch
**Severity:** P0  **Risk:** MEDIUM  **Status:** GATE_5A_IMPLEMENTED
**Source:** OWNER-REPORTED (live printer output + network payload, 2026-11-02)
**Related:** BUG-018 (comp carve-out), BUG-628 (dispatch status)

## Description
When a cashier marks a dish as complimentary at runtime (not a catalog-comp item), the printed bill does NOT show it as complementary. The printer agent reads `food_details.complementary` (the catalog/product-level field) which stays `"no"` for runtime-comp items. The order-line `is_complementary: "Yes"` is correct but the printer agent does not use that field.

**Owner evidence:** Cheese Nan marked comp at runtime. Printer payload shows:
- `billFoodList[0].is_complementary: "Yes"` ← correct at order-line
- `billFoodList[0].food_details.complementary: "no"` ← stale catalog value, NOT overridden
- Printed bill does NOT show item as complementary

## Root Cause
`buildBillPrintPayload()` in `orderTransform.js` L1867-1879: when a comp item is detected, the code spreads `{...d}` (which includes the original `food_details` with `complementary: "no"`), then sets `is_complementary: "Yes"` and zeros amounts. But it does NOT override `food_details.complementary` to `"Yes"`. The printer agent reads `food_details.complementary`, not the order-line `is_complementary`.

## Evidence
- Owner screenshot: printed bill shows Cheese Nan as regular item (not comp)
- Owner network payload: `food_details.complementary: "no"` with `is_complementary: "Yes"`
- Code: `orderTransform.js` L1867-1879 — `{...d}` spread does not override `food_details.complementary`
- Confidence: CONFIRMED

## Duplicate Check
**DISTINCT.** BUG-018 added the comp carve-out but only set `is_complementary`. BUG-639 is about expandCompItems (different issue). This is specifically about the printer payload `food_details.complementary` field.

## Code Reality
**FULL** — fix already applied this session.

## Fix Applied
`orderTransform.js` L1868:
```js
food_details: { ...d.food_details, complementary: 'Yes' }, // BUG-641
```

## Blast Radius
**SMALL** — 1 file, 1 line. Only affects the printer payload for runtime-comp items.

## Risk Classification
- **Risk:** MEDIUM (orderTransform.js R5, printer payload)
- **Financial:** YES — printed bill must correctly show comp items at ₹0
