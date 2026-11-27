# Impact Analysis — BUG-386
## PMS Check-In: Room Accommodation GST Never Computed or Sent

**ID:** BUG-386
**Gate:** 2 — Impact Analysis
**Written by:** PLANNING agent (ALPHA v0.7)
**Date:** 2026-09-08
**Sprint:** pos_pms_1
**Risk:** CRITICAL (financial — billing, tax, GST compliance)
**Code Reality:** NONE — no slab computation logic exists anywhere in FE
**Conflict Pre-Check:** See §1

---

## §1. Conflict Pre-Check

| File | Last modifier | Conflict? |
|---|---|---|
| `profileTransform.js` | BUG-369 / BUG-374 / CR-352 / BUG-366 — multiple recent modifiers | ⚠ HIGH-TRAFFIC HOTSPOT — additive only, no existing keys modified |
| `pmsService.js` | CR-358-P5 (2026-09-08 — this session) | ✅ Safe — P5 appended new exports; we modify `pmsCheckIn` (L132–168) which P5 did NOT touch |
| `CheckInPage.jsx` | CR-358-P2 (2026-09-03) | ✅ Safe — no open items touching this file |
| `orderTransform.js` | CR-013 / BUG-232 / CR-004 | ⚠ R5 HOTSPOT — additive only (add 1 field to `roomPaymentSummary`) |
| `PmsCheckoutDrawer.jsx` | CR-358-P3 (2026-09-03) | ✅ Safe — no open items |
| `roomGstCalculator.js` | NEW FILE | ✅ No conflict |

**Ruling:** No blocking conflicts. All changes are additive. `profileTransform.js` and `orderTransform.js` are hotspots — edits must be strictly additive with no key renames or removals.

---

## §2. Data Flow Trace (current → fixed)

### 2a. Current (broken) flow

```
GET /api/v1/vendoremployee/profile
  → restaurants[0].settings.room_gst  =  '{"basis":"unit_accommodation_per_day","slabs":[...]}'  ← JSON STRING
  → restaurants[0].room_gst_applicable  =  "Yes"
             ↓
profileTransform.js:237-244  (checkInFlags block)
  roomGstApplicable: toBoolean("Yes")  → true   ✅ parsed
  room_gst JSON string                 → *** SILENTLY DROPPED ***
             ↓
RestaurantContext: restaurant.checkInFlags.roomGstApplicable = true
RestaurantContext: restaurant.checkInFlags.roomGstSlabs      = UNDEFINED
             ↓
CheckInPage.jsx: handleConfirm() → calls pmsCheckIn({ ...form })
  No gstTax computed. No GST shown to receptionist.
             ↓
pmsService.js:pmsCheckIn():
  gst_tax:         '0.00'                       ← HARDCODED ZERO
  balance_payment: to2dp(orderAmount - advance) ← MISSING GST
             ↓
POST /api/v1/vendoremployee/pos/user-group-check-in
  user_id_documents.gst_tax = 0  (stored wrong)
  remaining_room_balance    = room_price + 0 - paid = UNDERSTATED
```

### 2b. Fixed flow (after BUG-386)

```
GET /api/v1/vendoremployee/profile
  → restaurants[0].settings.room_gst (JSON string)
  → restaurants[0].room_gst_applicable
             ↓
profileTransform.js:checkInFlags block  [E1]
  roomGstApplicable: toBoolean(api.room_gst_applicable)      ← unchanged
  roomGstSlabs: parseRoomGstSlabs(api.settings?.room_gst)   ← NEW
    parseRoomGstSlabs():
      if null/missing → return null
      if string → JSON.parse(s), catch malformed → null
      validate: has .slabs[] → return { basis, slabs: [{min,max,gst_percent}] }
             ↓
RestaurantContext: restaurant.checkInFlags.roomGstSlabs = { basis, slabs: [...] }
             ↓
CheckInPage.jsx  [E3 + E4]
  const { restaurant } = useRestaurant()
  const { roomGstApplicable, roomGstSlabs } = restaurant?.checkInFlags ?? {}
  const gstTax = computeRoomGst(roomGstApplicable, roomGstSlabs, orderAmount, nights=1, rooms=1)
  // gstTax shown in UI as GST strip
  // handleConfirm passes gstTax to pmsCheckIn
             ↓
roomGstCalculator.js  [E2]
  computeRoomGst(applicable, slabs, totalAmount, nights, roomCount):
    if (!applicable || !slabs) return 0
    nightlyUnit = totalAmount / roomCount / nights   ← per pms_gst.md §1 "unit_accommodation_per_day"
    slab = slabs.find(s => nightlyUnit >= s.min && (s.max == null || nightlyUnit <= s.max))
    gstPerUnit = nightlyUnit × (slab.gst_percent / 100)
    return round2dp(gstPerUnit × roomCount × nights)
             ↓
pmsService.js:pmsCheckIn()  [E5]
  gst_tax:         to2dp(p.gstTax ?? 0)                          ← COMPUTED VALUE
  balance_payment: to2dp(orderAmount + (p.gstTax ?? 0) - advance) ← INCLUDES GST
             ↓
POST /api/v1/vendoremployee/pos/user-group-check-in
  user_id_documents.gst_tax = computed value (e.g. 1440)  ✅
  remaining_room_balance    = room_price + gst_tax - paid  ✅

--- checkout path (OD-386-02 Option A) ---

PmsCheckoutDrawer fetches detail via SINGLE_ORDER_NEW
  detail.roomInfo.roomPaymentSummary.gstTax ← needs to be mapped  [E6]
             ↓
orderTransform.js:roomPaymentSummary  [E6]
  ADD: gstTax: parseFloat(api.room_info.room_payment_summary.gst_tax) || 0
             ↓
PmsCheckoutDrawer.jsx:handlePaymentComplete()  [E7]
  const roomGstTax = detail.roomInfo?.roomPaymentSummary?.gstTax ?? 0
  const payload = orderToAPI.collectBillExisting(...)
  if (roomGstTax > 0) payload.room_gst_tax = roomGstTax   ← field name TBD (see §5)
  await api.post(API_ENDPOINTS.BILL_PAYMENT, payload)
```

---

## §3. Affected Files

| # | File | Action | Risk | Hotspot? | Lines affected |
|---|---|---|---|---|---|
| E1 | `src/api/transforms/profileTransform.js` | MOD — add `roomGstSlabs` to `checkInFlags` at L241 | HIGH | YES (high-traffic) | ~4 lines additive |
| E2 | `src/utils/roomGstCalculator.js` | NEW — pure slab computation utility | LOW | NO | ~25 lines |
| E3 | `src/pages/pms/CheckInPage.jsx` | MOD — import utility, read context, compute GST | HIGH | NO | ~25 lines |
| E4 | `src/pages/pms/CheckInPage.jsx` | MOD — render GST strip in form UI | MEDIUM | NO | ~20 lines |
| E5 | `src/api/services/pmsService.js` | MOD — replace `gst_tax:'0.00'`, fix `balance_payment` | CRITICAL | NO | 2 lines |
| E6 | `src/api/transforms/orderTransform.js` | MOD — add `gstTax` to `roomPaymentSummary` (additive) | CRITICAL | YES (R5) | 1 line |
| E7 | `src/components/pms/PmsCheckoutDrawer.jsx` | MOD — read `gstTax`, inject in BILL_PAYMENT payload | HIGH | NO | ~8 lines |

**Files will NOT touch:** `CollectPaymentPanel.jsx` (R5/R6 sacred), `InHouseGuestsPage.jsx` (self-heals), `App.js`, `DeparturesPage.jsx`, `FrontDeskPage.jsx` (callers of PmsCheckoutDrawer — no change needed)

---

## §4. Downstream Consumers of `profileTransform.checkInFlags`

`restaurant.checkInFlags` is consumed only by PMS pages and one existing guard. Confirmed by grep:

| Consumer | Field used | Impact of adding `roomGstSlabs` |
|---|---|---|
| `CollectPaymentPanel.jsx:275` | `roomGstApplicable` | None — only reads boolean, not slabs |
| `RestaurantSettingsPage.jsx:86` | `roomGstApplicable` | None — form default only |
| `CheckInPage.jsx` (NEW) | `roomGstApplicable` + `roomGstSlabs` | New consumer — safe |

Adding `roomGstSlabs` to `checkInFlags` is strictly additive. Existing consumers only read `roomGstApplicable`.

---

## §5. Open Technical Question — Prerequisite for E7

**Before E7 can be coded**, a curl probe to `BILL_PAYMENT` is required to confirm the field name for room accommodation GST in the checkout payload.

Two candidates:
- `room_gst_tax` — a new dedicated field
- Additive to existing `gst_tax` — add room GST to food-order GST

**This probe MUST happen in the Implementation Plan session before E7 is written.**
If probe unavailable, E7 can be written with a TODO comment and the field name confirmed via QA testing.

---

## §6. GST Computation Spec (from `pms_gst.md §1`)

```
basis: "unit_accommodation_per_day"
→ nightly_unit = order_amount / room_count / nights
→ find slab: slabs.find(s => nightly_unit >= s.min && (s.max == null || nightly_unit <= s.max))
→ gst_per_unit = nightly_unit × (slab.gst_percent / 100)
→ total_gst    = gst_per_unit × room_count × nights

Example (pms_gst.md §1):
  order_amount = 8000, rooms = 2, nights = 1
  nightly_unit = 8000 / 2 / 1 = 4000
  slab: 4000 <= 7500 → 5%
  gst_per_unit = 4000 × 0.05 = 200
  total_gst = 200 × 2 × 1 = 400  ✓ (matches spec)

Constraint (pms_gst.md §5):
  All rooms in one group check-in MUST have equal nightly rates.
  Current CheckInPage sends single room_id[] → constraint naturally met.
  No validation enforcement needed in this fix.
```

---

## §7. Edge Cases

| Case | Behaviour |
|---|---|
| `roomGstApplicable = false` | `computeRoomGst()` returns 0; GST strip shows "Not Applicable"; `gst_tax: '0.00'` sent (correct) |
| `roomGstSlabs = null` (profile has no `room_gst` field) | `computeRoomGst()` returns 0; GST strip hidden; `gst_tax: '0.00'` sent |
| `room_gst` is malformed JSON string | `parseRoomGstSlabs()` catches parse error → returns null → GST = 0 (safe fallback) |
| Checkout: `roomPaymentSummary = null` (older order, no payment summary) | `gstTax = 0` → `room_gst_tax` not added to payload (no regression) |
| Checkout: `gstTax = 0` (historical booking before fix) | OD-386-03: fix forward only — no UI flag; checkout proceeds normally |

---

## §8. Regression Risk

| Area | Risk | Why |
|---|---|---|
| `CollectPaymentPanel` F&B GST | ✅ NONE | Not touched. Room accommodation GST is separate from food-order GST |
| Existing check-in flow (`roomService.checkIn` FormData path) | ✅ NONE | Not touched — `pmsCheckIn` (JSON path) only |
| Non-room orders via `orderTransform.js` | ✅ NONE | `roomPaymentSummary` is only populated when `api.room_info.room_payment_summary` exists — food orders return null |
| `profileTransform.js` existing consumers | ✅ NONE | Purely additive key in `checkInFlags` |
| `PmsCheckoutDrawer` food GST | ✅ NONE | `collectBillExisting` food-GST logic unchanged; room GST is an additional field |

---

## §9. Design Approval

Design mockup: `/bug-386-design-review.html` (live at `<preview>/bug-386-design-review.html`)

**UI change is confined to CheckInPage — one new GST strip between the amount fields and the info strip:**

| State | Visual |
|---|---|
| GST applicable + slabs loaded | Green strip: nightly unit → **CGST (rate/2%)** → **SGST (rate/2%)** → Total GST (CGST + SGST) → Total incl. GST. Slab threshold NOT shown to user. |
| GST not applicable / slabs null | Grey strip: "Not Applicable" badge + "gst_tax: 0.00" note |
| `PmsCheckoutDrawer` | No visual change — payload-only change |

**Design decision locked (2026-09-08):**
- OD-386-D1: Show CGST + SGST individual lines (each = total_gst / 2). ✅ LOCKED
- OD-386-D2: Do NOT show slab threshold (">₹7,500 → 18%") in UI — internal computation only. ✅ LOCKED

**Design is owner-approved (pending this IA).**

---

## §10. Verification Matrix (seeds Implementation Plan + QA handover)

| Edit | File | Change | Verify | Automated? |
|---|---|---|---|---|
| V1 | roomGstCalculator.js | computeRoomGst(true, slabs, 8000, 1, 2) = 400 | Unit test | YES |
| V2 | roomGstCalculator.js | computeRoomGst(true, slabs, 8000, 1, 1) = 1440 (18% slab) | Unit test | YES |
| V3 | roomGstCalculator.js | computeRoomGst(false, slabs, 8000, 1, 1) = 0 | Unit test | YES |
| V4 | roomGstCalculator.js | computeRoomGst(true, null, 8000, 1, 1) = 0 | Unit test | YES |
| V5 | profileTransform.js | roomGstSlabs parsed from JSON string → {basis,slabs} | Unit test | YES |
| V6 | profileTransform.js | roomGstSlabs = null when field missing | Unit test | YES |
| V7 | CheckInPage.jsx | GST strip visible when applicable | Browser | NO |
| V8 | CheckInPage.jsx | GST strip shows "Not Applicable" when flag=false | Browser | NO |
| V9 | pmsService.js | pmsCheckIn payload has correct gst_tax (not 0.00) | curl probe | YES |
| V10 | pmsService.js | balance_payment = orderAmount + gstTax − advance | curl probe | YES |
| V11 | orderTransform.js | roomPaymentSummary.gstTax mapped from room_info | Unit test | YES |
| V12 | PmsCheckoutDrawer.jsx | BILL_PAYMENT payload includes room_gst_tax field | Browser/Network | NO |

---

## §11. Post-Code Registry Checklist (for Implementation agent)

```
□ registry.json: BUG-386 → status: IMPLEMENTED, gate: 5a
□ BUG_TRACKER.md: row updated IMPLEMENTED
□ FILE_OWNERSHIP.md: 6 files listed with BUG-386 + date
□ Code markers: // BUG-386 in every modified file
□ webpack: 0 new errors
```

---

*Gate 2 CLOSED. Design approved (2026-09-08). 7 edits (1 NEW + 6 MOD). 12 verification checks.*
*Design decisions locked: OD-386-D1 (CGST+SGST split) · OD-386-D2 (no slab threshold in UI).*
*Awaiting Gate 4 GO → Implementation.*
