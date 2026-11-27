# BUG-369 IMPACT ANALYSIS — Print Customer Copy: Flag Not Passed to Printer Agent
**Date:** 2026-09-01 | **Stage:** Gate 2 — Impact Analysis
**Code Reality:** NONE (profileTransform missing; payload missing)
**Conflict Pre-Check:** profileTransform.js — last touched by BUG-366 (2026-08-31, restaurantFor fix). Same file, DIFFERENT field — no conflict. orderTransform.js — last touched by BUG-305/CR-348. buildBillPrintPayload is a hotspot (R5 adjacent) — additive-only change, verified safe.
**Risk:** MEDIUM

---

## Root Cause — HIGH Confidence

```
STEP 1: Restaurant Settings wizard saves print_bill_customer_copy ✓
  restaurantSettingsTransform.js:67 reads it, :238 saves it via API ✓

STEP 2: Profile load (boot) — flag never mapped  ← BREAK POINT 1
  profileTransform.settings() — NO printBillCustomerCopy field
  restaurant.settings.printBillCustomerCopy = undefined always

STEP 3: Print payload sent to Printer Agent device — flag missing  ← BREAK POINT 2
  orderTransform.js buildBillPrintPayload — print_bill_customer_copy NOT in payload
  Printer Agent device never receives the flag → prints single copy only
```

---

## Fix Scope

### Edit 1 — profileTransform.js
Add after `serviceChrgTaxt` line (same dual-path pattern as BUG-366, BUG-373):
```js
// BUG-369: print_bill_customer_copy missing from transform — Printer Agent never received flag
printBillCustomerCopy: toBoolean(apiSettings.settings?.print_bill_customer_copy ?? apiSettings.print_bill_customer_copy),
```

### Edit 2 — orderTransform.js buildBillPrintPayload
The payload is assembled near line 1794. `overrides` object is passed at call site.

Add `print_bill_customer_copy` to the returned payload object:
```js
print_bill_customer_copy: overrides.printBillCustomerCopy ? 'Yes' : 'No',
```

### Edit 3 — CollectPaymentPanel.jsx (call site — pass the flag in overrides)
Where `buildBillPrintPayload` is called, pass the restaurant flag via overrides:
```js
// existing call becomes:
buildBillPrintPayload(order, scPct, { ...existingOverrides, printBillCustomerCopy: restaurant?.settings?.printBillCustomerCopy })
```

---

## Affected Files

| File | Change | Risk | Notes |
|---|---|---|---|
| `profileTransform.js` | Add `printBillCustomerCopy` mapping (1 line) | LOW | Same pattern as BUG-366/373 |
| `orderTransform.js` | Add `print_bill_customer_copy` to buildBillPrintPayload output (1-2 lines) | MEDIUM | R5 hotspot — additive-only |
| `CollectPaymentPanel.jsx` | Pass `printBillCustomerCopy` in overrides at print call site (1 line) | MEDIUM | R5 hotspot |

## Scope Lock
**Files WILL change:** `profileTransform.js`, `orderTransform.js`, `CollectPaymentPanel.jsx`
**Files will NOT touch:** `restaurantSettingsTransform.js`, `printerAgentConfigTransform.js`, all UI components

## Owner Decisions: NONE (locked — Printer Agent handles extra copy)
## Blast Radius: MEDIUM (3 files, ~4 lines total)
## Next: Gate 3 Implementation Plan → Gate 4 GO
