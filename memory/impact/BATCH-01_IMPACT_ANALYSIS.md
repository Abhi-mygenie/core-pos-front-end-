# Impact Analysis — BATCH-01: GST Gating
**Items:** BUG-336 (P0), BUG-337 (P1), BUG-338 (P1)
**Date:** 2026-08-18
**Role:** PLANNING (Gate 2)
**Status:** COMPLETE — awaiting Gate 3 (Implementation Plan)

---

## Code Reality
- BUG-336: FULL — bug confirmed at `CollectPaymentPanel.jsx` lines 248–281 (`taxTotals` useMemo, no `gstStatus` gate)
- BUG-337: FULL — confirmed at `RestaurantSettingsPage.jsx` line 282 (`navigate('/dashboard')` with no profile re-fetch)
- BUG-338: FULL — confirmed at `CollectPaymentPanel.jsx` same `taxTotals` block; `isRoom` available, `roomGstApplicable` available, gate absent

---

## Conflict Pre-Check

| File | Last Modified By | Conflict? |
|---|---|---|
| `CollectPaymentPanel.jsx` | BUG-304 (2026-08-11) — added `dSgst/dCgst/dVat` buckets to same `taxTotals` block | NO conflict. BUG-304 changes are additive (new fields). Our edit adds guards at the top. No overlap. |
| `RestaurantSettingsPage.jsx` | CR-132 (8-step rewrite) — no recent modifications after CR-132 | NO conflict. |

No items in registry.json have status ≠ CLOSED touching these files currently.

---

## BUG-337 — Profile Stale After Settings Save

### Data Flow
```
Owner saves → RestaurantSettingsPage.saveStep()
  → updateSettings() → POST /update-settings   ← backend saves ✅
  → navigate('/dashboard')                      ← NO profile re-fetch ❌

App reads settings from → RestaurantContext.restaurant
  → populated ONCE at boot: LoadingPage → profileService.getProfile()
  → setRestaurant(data.profile.restaurant)
  → NEVER called again after settings save
```

### Fix Path
```
RestaurantSettingsPage.jsx (line 282) — in handleNext(), last-step success branch:
  BEFORE: navigate('/dashboard')
  AFTER:  await getProfile() → setRestaurant(fresh.restaurant) → navigate('/dashboard')
```

### Imports Needed
- Add `useRestaurant` from `"../contexts"` (already exported: `contexts/index.js:6`)
- Add `getProfile` from `"../api/services/profileService"` (already exported: `profileService.js:11`)
- `setRestaurant` destructured from `useRestaurant()` inside component

### Downstream Consumers — All Unblocked Immediately
After this fix, every profile-sourced flag refreshes on save:
- `restaurant.tax.gstStatus` → feeds BUG-336 fix
- `restaurant.settings.roomGstApplicable` → feeds BUG-338 fix
- `restaurant.features.*` (dineIn, delivery, tip, SC, etc.)
- `restaurant.paymentMethods`, `restaurant.autoServiceCharge`, etc.

### Risk Assessment
**HIGH** — touches `RestaurantContext` state update path (cross-cutting). However:
- `setRestaurant` is a simple `useState` setter (RestaurantContext.jsx:24-27), used identically in LoadingPage
- `getProfile` is a read-only GET with no side effects
- Wrapped in try/catch → non-blocking: if re-fetch fails, navigate still proceeds
- No provider order change, no localStorage change

---

## BUG-336 — GST Applied When gstStatus = false

### Data Flow
```
profile.gstStatus → restaurant.tax.gstStatus (profileTransform.js:183)
  → consumed by: BulkEditor.jsx:213 (validation warning only)
  → NOT consumed by: CollectPaymentPanel.taxTotals ← BUG

CollectPaymentPanel.taxTotals (lines 248–281):
  billableItems.forEach(item => {
    if (!tax || tax.percentage === 0) return;  ← only exits for 0% items
    // ← ZERO gate on gstStatus
    sgst += taxAmt / 2; cgst += taxAmt / 2;
  })
```

### Fix Path
```
CollectPaymentPanel.jsx — taxTotals useMemo, inside forEach loop:
  BEFORE first compute line, add:
    const taxType = (tax.type || 'GST').toUpperCase();
    if (taxType === 'GST' && restaurant?.tax?.gstStatus === false) return; // BUG-336
```

**Design decision: per-item gate (not early return)**
- VAT items (tax.type === 'VAT') must continue to accumulate — no `vatStatus` flag exists
- Gate is type-specific: only GST items are skipped when `gstStatus === false`
- `=== false` guard: if profile not loaded (undefined), defaults to enabled (safe)

### Risk Assessment
**CRITICAL** — financial logic, billing, tax.
- `CollectPaymentPanel` is a hotspot file (R5)
- Tax computation is R6 (Financial Logic is Sacred)
- Change is additive (early-return guard inside loop) — does NOT alter existing math when gstStatus is true
- Dependency array: add `restaurant` to useMemo deps (currently only `[billableItems]`)

---

## BUG-338 — Room GST Applied When roomGstApplicable = false

### Data Flow
```
profile.settings.roomGstApplicable → restaurant.settings.roomGstApplicable (profileTransform.js:240)
  → consumed by: RestaurantSettingsPage.jsx (UI toggle only)
  → NOT consumed by: CollectPaymentPanel.taxTotals ← BUG

CollectPaymentPanel receives `isRoom` prop (line 36) — already used at:
  line 183:  isRoom && roomInfo (roomBalance)
  line 596:  scApplicable = ... || isRoom  (service charge gate ← PATTERN TO FOLLOW)
  → never checked in taxTotals
```

### Fix Path
```
CollectPaymentPanel.jsx — taxTotals useMemo, same forEach loop, line after BUG-336 gate:
  if (taxType === 'GST' && isRoom && restaurant?.settings?.roomGstApplicable === false) return; // BUG-338
```

**Same per-item pattern as BUG-336.** isRoom is a prop in closure scope, accessible inside useMemo.

### Risk Assessment
**HIGH** — room billing, financial.
- Same hotspot file as BUG-336 — implement in same edit pass
- `isRoom` must be added to useMemo dependency array
- Gate is narrow: only fires when `isRoom === true` AND `roomGstApplicable === false`
- Non-room orders: zero impact (isRoom guard)

---

## Scope Declaration

### Files WILL Change
| File | Bugs | Nature |
|---|---|---|
| `src/pages/RestaurantSettingsPage.jsx` | BUG-337 | 2 new imports + 1 new hook call + ~6 lines in handleNext |
| `src/components/order-entry/CollectPaymentPanel.jsx` | BUG-336 + BUG-338 | ~5 lines added inside taxTotals + deps array update |

### Files Will NOT Touch
- `orderTransform.js` — no payload change needed
- `profileTransform.js` — `gstStatus` and `roomGstApplicable` already mapped correctly
- `restaurantSettingsTransform.js` — save/load already correct
- `LoadingPage.jsx` — boot profile fetch untouched
- `RestaurantContext.jsx` — no change; `setRestaurant` already exported
- `CartPanel.jsx` — tax preview uses a different calculation path (out of scope for this batch)
- All report files — no change

---

## Owner Decisions
None — root causes confirmed, fixes are unambiguous.

---

**Gate 2 Complete. Proceed to Gate 3 (Implementation Plan).**
