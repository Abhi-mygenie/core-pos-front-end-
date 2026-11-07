# BUG-373 INTAKE — Service Charge Label Hardcoded, Custom Label Ignored
**Date:** 2026-09-01 | **Priority:** P2 | **Risk:** MEDIUM | **Severity:** MINOR | **Status:** INTAKE

## Description
The Service Charge label set in Restaurant Settings (Step 4 → Service Charge Label field) is ignored everywhere in the app. The UI always shows "Service Charge" hardcoded, and the Printer Agent also prints "Service Charge" regardless of what label was configured. The custom label is saved to the backend but never flows back to the app.

## Code Reality: NONE (same class as BUG-366)
```
restaurantSettingsTransform.js:135  → reads service_chrg_taxt from API ✓
restaurantSettingsTransform.js:258  → saves service_chrg_taxt to API ✓

profileTransform.settings()          → NO mapping for serviceChrgTaxt  ← BREAK POINT
                                       (restaurant.settings.serviceChrgTaxt = undefined always)

CollectPaymentPanel.jsx:2255  → hardcoded "Service Charge ..."
CollectPaymentPanel.jsx:2499  → hardcoded "Service Charge @ ..."
orderTransform.js buildBillPrintPayload → no service_charge_label field
```

**Root cause:** `profileTransform.settings()` doesn't map `service_chrg_taxt`. Exact same class as BUG-366 (`restaurantFor` was missing from profileTransform). Fix pattern is known.

## Duplicate Check: DISTINCT from BUG-006 (SC calculation) and BUG-009 (rounding)
## Blast Radius: MEDIUM — 3 files: profileTransform.js (1 line) + CollectPaymentPanel.jsx (~3 occurrences) + orderTransform.js buildBillPrintPayload
## Planning Skip: PARTIAL eligible — profileTransform is trivial; full fix is 3 files. Owner approval needed.
## Next: Gate 2 → fast-track planning (known fix pattern)
