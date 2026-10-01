# BUG-369 INTAKE — Print Customer Copy: Flag Not Passed to Printer Agent
**Date:** 2026-09-01 | **Priority:** P1 | **Risk:** MEDIUM | **Severity:** MAJOR | **Status:** INTAKE — OWNER DECISION LOCKED

## Description
When "Print Customer Copy" is enabled in Restaurant Settings, the Printer Agent device should print an extra copy of the bill. It does not — because the `print_bill_customer_copy` flag is never included in the print payload sent to the Printer Agent device.

## Owner Clarification (2026-09-01)
> "That is taken care from printer agent — are we passing it to print if customer copy is needed? Is there in print config/settings?"

**Confirmed:** Customer copy printing is the Printer Agent device's responsibility. The FE just needs to pass the correct flag in the bill print payload. The device reads the flag and prints the extra copy. No second FE-triggered print needed.

## Root Cause (Updated)
**Two missing pieces:**

1. `profileTransform.settings()` — missing `printBillCustomerCopy` mapping (same class as BUG-366/BUG-373). `restaurant.settings.printBillCustomerCopy` is always `undefined`.

2. `orderTransform.js buildBillPrintPayload` — `print_bill_customer_copy` field is NOT included in the payload sent to the Printer Agent device. Device never receives the flag.

```
restaurantSettingsTransform.js:67  → reads print_bill_customer_copy ✓
profileTransform.settings()        → NO mapping  ← BREAK POINT 1
buildBillPrintPayload               → no print_bill_customer_copy in payload  ← BREAK POINT 2
Printer Agent device               → never knows to print extra copy
```

## Fix Scope
| File | Change | Lines |
|---|---|---|
| `profileTransform.js` | Add `printBillCustomerCopy: toBoolean(apiSettings.settings?.print_bill_customer_copy)` | 1 |
| `orderTransform.js buildBillPrintPayload` | Add `print_bill_customer_copy: restaurant?.settings?.printBillCustomerCopy ? 'Yes' : 'No'` | 1-2 |

## Planning Skip: YES eligible — 2 files, ~3 lines. Owner approval needed.
## Duplicate Check: DISTINCT
## Blast Radius: MEDIUM (profileTransform.js + orderTransform.js hotspot — R5 caution on orderTransform)
