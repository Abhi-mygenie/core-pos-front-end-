# CR-132 — Gate 3 Implementation Plan
**Date:** 2026-08-11
**Based on:** impact/CR-132_IMPACT_ANALYSIS.md (Design Freeze 2026-08-11)
**Gate 4 GO:** Owner confirmed (implementation role instruction 2026-08-11)
**Risk:** MEDIUM (3 fields HIGH: prepaid_auto_sattle, ordersAutoPaid, order_auto_serve)

---

## Scope Lock

**WILL change:**
- `src/api/transforms/restaurantSettingsTransform.js` — full rewrite (6 steps → 8 steps, 49 new fields)
- `src/pages/RestaurantSettingsPage.jsx` — full rewrite (6 steps → 8 steps UI)

**WILL NOT touch:**
- `src/api/services/restaurantSettingsService.js`
- `src/api/transforms/profileTransform.js`
- `src/api/constants.js`
- Any order/billing/payment files

---

## Entry Verification (confirmed this session)

| File | Expected current state | Verified |
|---|---|---|
| `restaurantSettingsTransform.js:59` | `room: toBool(advanced.room)` — regression bug | ✅ Confirmed line 59 |
| `restaurantSettingsTransform.js:163` | `room: toYesNo(s2.room)` in `advanced{}` — wrong | ✅ Confirmed line 163 |
| `restaurantSettingsTransform.js:1` | 224 lines, 6 steps (step1..step6) | ✅ Confirmed |
| `RestaurantSettingsPage.jsx:17` | STEPS array with 6 entries | ✅ Confirmed line 17-23 |
| `RestaurantSettingsPage.jsx:31` | INITIAL_FORM with step1..step6 | ✅ Confirmed line 31-37 |
| `RestaurantSettingsPage.jsx:253` | `phone` required validation in step1 | ✅ Confirmed line 253-254 |

---

## Execution Sequence

### E1 — `restaurantSettingsTransform.js` (full rewrite)

New step mapping:
- `step1` = Basic Settings (Screen 1)
- `step2` = Printer Settings (Screen 2) — NEW
- `step3` = Channels, Payments & Info (Screen 3) — room moves from advanced→basic here
- `step4` = Tax & Charges (Screen 4) — GST/VAT moves here from old step1
- `step5` = Order & Kitchen (Screen 5) — print_kot/billing_auto moved to step2
- `step6` = Online Ordering (Screen 6) — thin: onlineOrderingLink
- `step7` = Inventory (Screen 7)
- `step8` = Room & Hospitality (Screen 8) — conditional

Key regression fix: `room: toBool(basic.room)` — remove from `advanced{}` in toAPI

### E2 — `RestaurantSettingsPage.jsx` (full rewrite)

Changes:
- STEPS array: 6 → 8 entries (+ Printer icon, Globe icon)
- INITIAL_FORM: 6 → 8 step objects (matches transform step keys exactly)
- Validation: step1 removes phone requirement; step3 channels/payments; step4 GST code
- Step 8 conditional: only shown when `step3.room === true`
- Navigation: `effectiveLastStep` = 7 if room OFF, 8 if room ON
- All 8 step UIs per design freeze

---

## Verification Matrix

| # | File | Change | How to verify |
|---|---|---|---|
| V1 | transform.js | `room` reads `basic.room` | Curl GET + confirm room value matches API |
| V2 | transform.js | `room` removed from `advanced{}` in toAPI | Code inspection |
| V3 | transform.js | 8 step keys present | Code inspection |
| V4 | transform.js | All printer fields in step2 | Code inspection: printKot, noOfBill etc |
| V5 | transform.js | defOrdStatus reads advanced but stored in step1 | Code inspection |
| V6 | transform.js | CR-135 pass-throughs present in step5 + toAPI | Code inspection |
| V7 | page.jsx | STEPS array has 8 entries | Browser: 8 steps in left rail |
| V8 | page.jsx | Step 2 Printer Settings renders with 8 fields | Browser: navigate to step 2 |
| V9 | page.jsx | Show Popular Category label = "Show Popular Items" | Browser: step 1 display section |
| V10 | page.jsx | Step 8 Room & Hospitality hidden when room=OFF | Browser: toggle room off in step3 |
| V11 | compile | 0 new errors | webpack compile check |

---

## Post-Code Registry Checklist

- [ ] registry.json: CR-132 → status: IMPLEMENTED, sprint_key: pos_5_1
- [ ] CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: restaurantSettingsTransform.js + RestaurantSettingsPage.jsx → CR-132 + date
- [ ] Code markers: // CR-132 in both modified files
- [ ] Compile: webpack 0 new warnings
