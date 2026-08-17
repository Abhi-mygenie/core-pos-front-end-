# BUG-195: Takeaway Orders — "Name Mandatory" Toggle Not Working

**Registered:** 2026-07-11
**Updated:** 2026-07-11 (Investigation complete)
**Source:** OWNER-REPORTED
**Confidence:** HIGH
**Duplicate check:** DISTINCT
**Risk:** MEDIUM
**Severity:** P1
**Classification:** FE_BUG (hardcoded condition ignores restaurant setting)

## Description
In Settings, Takeaway "Name mandatory" toggle exists but doesn't affect validation behavior.

## Investigation Findings

**Code trace:**
- `CartPanel.jsx:805`: `const isNameRequired = orderType === 'takeAway' || orderType === 'delivery';`
- This is **HARDCODED** — always requires name for takeaway/delivery regardless of the toggle
- The Settings page toggle saves to a restaurant setting, but CartPanel never reads it
- The restaurant context likely has a field like `settings.takeaway_name_mandatory` but it's not referenced

**Two interpretations:**
1. If toggle is OFF but name still required → hardcoded override is the bug
2. If toggle is ON but order goes through anyway → `nameMissing` blocks place-order but the code path may have a bypass

**Root cause:** `isNameRequired` is hardcoded. Should read the restaurant-level mandatory setting from the restaurant context/profile.

## Fix Required
- **FE ONLY** — change `isNameRequired` to read from restaurant settings:
  ```js
  const isNameRequired = (orderType === 'takeAway' && restaurant?.settings?.takeawayNameMandatory) 
    || (orderType === 'delivery' && restaurant?.settings?.deliveryNameMandatory)
    || false;
  ```
- Need to verify the exact field name from `profileTransform.js`
- ~10 lines, 1 file

## Files
- `CartPanel.jsx` L805
- `profileTransform.js` (check field name for mandatory settings)
