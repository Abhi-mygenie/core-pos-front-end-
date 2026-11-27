# Investigation Report: CR-493 B5 — Cancel Note Mandatory Toggle Not Working

**Date:** 2026-11-17
**Investigator:** Agent (Investigation Role)
**Confidence:** HIGH (reproduced + traced)
**Steps used:** 5/10

---

## 1. Summary

**Root cause:** The `cancelNoteMandatory` field is correctly parsed from the API response in `profileTransform.js → fromAPI.settings()` (line 429), but it is placed inside `restaurant.settings` — NOT inside `restaurant.cancellation`. The `RestaurantContext.jsx` reads from `restaurant.cancellation.cancelNoteMandatory`, which is `undefined`, falling back to `false`. The toggle is ALWAYS false regardless of backend setting.

**Classification:** FE_BUG — Transform mapping error (field in wrong sub-object)

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Steps | Result | Evidence |
|---|-----------|-------------|-------|--------|----------|
| H1 | Backend doesn't return cancel_note_mandatory | Curl probe: /api/v1/vendoremployee/profile for Palm House | 1 | ELIMINATED | API returns `settings.cancel_note_mandatory: "Yes"` |
| H2 | profileTransform doesn't parse the field | Code trace: profileTransform.js | 1 | ELIMINATED | Line 429 correctly parses: `cancelNoteMandatory: apiSettings.settings?.cancel_note_mandatory === 'Yes'` |
| H3 | Field parsed into wrong object in restaurant data | Code trace: cancellation object vs settings object | 2 | CONFIRMED | Field is in `fromAPI.settings()` (line 429) but `restaurant.cancellation` (lines 225-230) lacks it |
| H4 | Consumer reads from wrong path | Code trace: RestaurantContext.jsx | 1 | CONFIRMED | Reads `restaurant?.cancellation.cancelNoteMandatory` → undefined → false |

---

## 3. Data Flow Trace

```
API: restaurants[0].settings.cancel_note_mandatory = "Yes"
  ↓
profileTransform.js line 429 (fromAPI.settings):
  cancelNoteMandatory: apiSettings.settings?.cancel_note_mandatory === 'Yes'  → true
  ↓ STORED AT: restaurant.settings.cancelNoteMandatory = true  ✅

profileTransform.js lines 225-230 (restaurant.cancellation):
  cancellation: {
    allowPostServeCancel: ...,
    allowPostServeCancel2: ...,
    orderCancelWindowMinutes: ...,
    itemCancelWindowMinutes: ...,
    // ❌ cancelNoteMandatory: MISSING!
  }
  ↓
RestaurantContext.jsx line 51-58:
  const cancellation = restaurant?.cancellation || { ... cancelNoteMandatory: false }
  → cancelNoteMandatory = undefined (from actual object) → NOT false from default because object EXISTS
  → reads as undefined
  ↓
OrderEntry.jsx line 3180:
  cancelNoteMandatory={cancellation.cancelNoteMandatory}  → undefined (falsy)
  ↓
CancelOrderModal.jsx line 8:
  cancelNoteMandatory = false (default param)
  ↓
UI: "Notes (Optional)" instead of "Notes *"
```

**BREAK POINT:** `profileTransform.js` line 225-230 — `cancelNoteMandatory` missing from `cancellation` object.

---

## 4. Evidence Artifacts

- API response: `/app/memory/evidence/CR-493-B5/profile_response.json` — confirms `cancel_note_mandatory: "Yes"`
- Screenshot: User-provided — shows "Notes (Optional)" label + backend DevTools showing `cancel_note_mandatory: "Yes"`
- Code: `profileTransform.js:225-230` (missing field), `profileTransform.js:429` (field parsed but in wrong place)

---

## 5. Recommendations

**Classification:** FE_FIX — DIRECT_BUG_FIX eligible

### Fix (≤5 lines, 1 file):
Add `cancelNoteMandatory` to the `cancellation` object in `profileTransform.js` line 225-230:
```js
cancellation: {
  allowPostServeCancel: toBoolean(api.cancle_post_serve),
  allowPostServeCancel2: toBoolean(api.allow_cancel_post_server),
  orderCancelWindowMinutes: parseInt(api.cancel_order_time) || 0,
  itemCancelWindowMinutes: parseInt(api.cancel_food_timings) || 0,
  cancelNoteMandatory: api.settings?.cancel_note_mandatory === 'Yes', // CR-493 B5 FIX
},
```

### Secondary fix — missing prop in other consumers:
These pages use `CancelOrderModal` WITHOUT passing `cancelNoteMandatory`:
- `AllOrdersReportPage.jsx:1129` — no `cancelNoteMandatory` prop
- `OrderReportBetaPage.jsx:899` — no `cancelNoteMandatory` prop  
- `DashboardPage.jsx:2266` — no `cancelNoteMandatory` prop

All 3 need `cancelNoteMandatory={cancellation.cancelNoteMandatory}` added.

**Planning skip eligible:** YES — ≤10 lines, 1-4 files, not a hotspot. OWNER APPROVAL REQUIRED.

---

## 6. Retroactive Candidates
None.
