# Investigation Report — PMS Room GST Missing
**ID:** INV-PMS-GST-001
**Date:** 2026-09-08
**Role:** INVESTIGATION agent (ALPHA v0.7)
**Source doc:** `pms_gst.md` (owner-supplied FE handoff spec)
**Steps used:** 8/10
**No code was edited.**

---

## 1. Summary

| Field | Value |
|---|---|
| Root cause | FE hardcodes `gst_tax: '0.00'` in every PMS check-in payload — GST is never computed or sent |
| Classification | **FE_BUG** (primary) + CONFIG_ISSUE (profile slab never parsed) |
| Confidence | **HIGH** — confirmed via direct code trace |
| Planning skip eligible | NO — 6 files, multi-step, HIGH risk (financial/billing) |

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Steps | Result | Evidence |
|---|---|---|---|---|---|
| H1 | `pmsCheckIn` hardcodes `gst_tax: '0.00'` | Code trace | 1 | ✅ CONFIRMED | `pmsService.js:162` |
| H2 | `balance_payment` formula excludes GST | Code trace | 1 | ✅ CONFIRMED | `pmsService.js:159` |
| H3 | `room_gst` slab is never parsed from profile | grep + profileTransform trace | 2 | ✅ CONFIRMED | `profileTransform.js:241` |
| H4 | CheckInPage has no GST computation or display | Full file read | 1 | ✅ CONFIRMED | `CheckInPage.jsx:158–184` |
| H5 | InHouseGuestsPage balance is derived from server-stored (wrong) value | Code trace | 1 | ✅ CONFIRMED | `pmsService.js:64` |
| H6 | Backend is sending/computing GST wrong | Eliminated — doc confirms BE stores what FE sends | 1 | ❌ ELIMINATED | `pms_gst.md §2` |
| H7 | Checkout drawer also missing room GST | Code trace — collectBillExisting sends food GST only | 1 | ✅ CONFIRMED | `PmsCheckoutDrawer:138` / `orderTransform:1636` |

---

## 3. Data Flow Trace (GST break point)

```
Profile API: GET /api/v1/vendoremployee/profile
  → restaurants[].settings.room_gst  { basis, slabs: [{min,max,gst_percent}] }
  → restaurants[].room_gst_applicable  "Yes"/"No"
             ↓
profileTransform.js:241
  roomGstApplicable: toBoolean(api.room_gst_applicable)   ← ONLY boolean parsed
  room_gst slab object: *** NOT PARSED — SILENTLY DROPPED ***
             ↓
RestaurantContext / any context
  roomGstSlabs: *** NOT AVAILABLE ANYWHERE IN FE ***
             ↓
CheckInPage.jsx: handleConfirm() L158
  No GST computation.
  No GST field in form.
  Calls pmsCheckIn({ ...form }) — no gst_tax passed
             ↓
pmsService.js: pmsCheckIn() L132
  gst_tax:         '0.00'   ← HARDCODED ZERO — always sent regardless of rate/slab
  balance_payment: to2dp(orderAmount - advance)  ← MISSING GST (should be + gst_tax)
             ↓
POST /api/v1/vendoremployee/pos/user-group-check-in
  user_id_documents.gst_tax = 0   ← stored as ZERO on backend
  remaining_room_balance = room_price + 0 - paid = UNDERSTATED
             ↓
GET employee-orders-list (InHouseGuestsPage)
  remaining_room_balance returned as room_price - paid (no GST)
             ↓
pmsService.js: getInHouseGuests() L64
  row.balance = match.res.amount_after_tax   ← derived from wrong server value
             ↓
InHouseGuestsPage: "Outstanding" column
  Displays ₹ MINUS the GST that should have been collected ← UNDERSTATED
```

**BREAK POINT: `profileTransform.js:241` + `pmsService.js:162`**

---

## 4. All Gaps

### GAP-1 — `gst_tax` hardcoded `'0.00'` in check-in payload
**Severity:** CRITICAL (financial — GST never stored in `user_id_documents`)
**File:** `src/api/services/pmsService.js` line 162
**Code:** `gst_tax: '0.00',`
**Impact:** Every room check-in stores zero GST. All room stays are under-taxed. GST compliance broken.
**Fix scope:** Replace `'0.00'` with computed GST from slab logic.

---

### GAP-2 — `balance_payment` excludes GST
**Severity:** CRITICAL (financial — guest balance is understated at check-in)
**File:** `src/api/services/pmsService.js` line 159
**Code:** `balance_payment: to2dp(orderAmount - advance),`
**Per spec:** `balance_payment` = `room_price + gst_tax - advance` (₹4000 + ₹200 = ₹4200)
**Impact:** Backend stores wrong balance. Receptionist collects wrong amount at checkout.
**Fix scope:** `to2dp(orderAmount + gstTax - advance)`

---

### GAP-3 — `room_gst` slab object never parsed from profile
**Severity:** HIGH (prerequisite for all GST computation)
**File:** `src/api/transforms/profileTransform.js` line 241
**Code:** `roomGstApplicable: toBoolean(api.room_gst_applicable)` — only boolean, slab object dropped
**What profile returns:**
```json
{
  "room_gst_applicable": "Yes",
  "settings": {
    "room_gst": "{\"basis\":\"unit_accommodation_per_day\",\"slabs\":[{\"min\":0,\"max\":7500,\"gst_percent\":5},{\"min\":7500.01,\"max\":null,\"gst_percent\":18}]}"
  }
}
```
**Note:** `room_gst` arrives as a **JSON string** (may need `JSON.parse`) under `restaurants[].settings.room_gst`.
**Impact:** FE can never know the applicable GST rate — has no data to compute with.
**Fix scope:** Parse `room_gst` string → object in `profileTransform.js`; expose `roomGstSlabs` in context.

---

### GAP-4 — No GST slab computation utility exists
**Severity:** HIGH (prerequisite for GAP-1 fix)
**Location:** Nowhere — this function does not exist
**Required logic (per spec):**
```
nightly_unit_price = order_amount / rooms_count / nights
slab_rate = first slab where nightly_unit_price >= slab.min AND (slab.max == null OR nightly_unit_price <= slab.max)
gst_per_unit_per_night = nightly_unit_price × (slab_rate / 100)
total_gst = gst_per_unit_per_night × rooms_count × nights
```
**Constraint:** All rooms in one group check-in must have equal nightly prices (spec §5).
**Fix scope:** New pure utility function e.g. `src/utils/roomGstCalculator.js`.

---

### GAP-5 — CheckInPage UI shows no GST breakdown to receptionist
**Severity:** MEDIUM (UX — receptionist cannot verify or communicate GST to guest)
**File:** `src/pages/pms/CheckInPage.jsx` — no GST field in form, no GST display
**Impact:** Receptionist has no visibility into GST applicable on the stay. Guest receives no tax disclosure at check-in.
**Fix scope:** After `orderAmount` field, add read-only GST computed display: `"GST (X%): ₹Y"` + `"Total with GST: ₹Z"`.

---

### GAP-6 — Outstanding balance in In-House Guests is understated
**Severity:** MEDIUM (display incorrect — downstream of GAP-1)
**File:** `src/api/services/pmsService.js` line 64
**Code:** `row.balance = match.res.amount_after_tax`
**Root cause:** `amount_after_tax` / `remaining_room_balance` from BE = `room_price + gst_tax - paid` — but `gst_tax` was stored as 0 → balance is understated.
**Note:** This is a downstream consequence of GAP-1. Once GAP-1 is fixed for new check-ins, new outstanding balances will be correct. Historical bookings made before the fix will remain understated.
**Fix scope:** GAP-1 fix; no additional FE code change needed for new bookings. Historical data: backend migration/correction required (out of FE scope).

---

### GAP-7 — Checkout drawer sends food-order GST, not room accommodation GST
**Severity:** MEDIUM (partial — room GST should be pre-stored at check-in, not at checkout)
**File:** `src/components/pms/PmsCheckoutDrawer.jsx` line 138 → `orderToAPI.collectBillExisting`
**Detail:** `collectBillExisting` computes `gst_tax` from food-order items (F&B GST). The room accommodation GST was supposed to be stored at check-in. Per spec §4: "FE sends `gst_tax` amount for the folio; BE stores it on the **order**".
**Current state:** No room-accommodation `gst_tax` is explicitly passed in the checkout payload.
**Impact:** If room accommodation GST is expected in the bill-payment payload separately from food GST, the checkout will be missing it.
**Open question for backend (Q-GST-01):** Does `order-bill-payment` expect a separate room `gst_tax` field, or does it derive the room tax from the check-in `user_id_documents.gst_tax`? → **Backend brief required.**

---

### GAP-8 — No enforcement of equal-room-rate constraint for group check-in
**Severity:** LOW (edge case — only affects multi-room group bookings with different rates)
**File:** `src/pages/pms/CheckInPage.jsx` — `room_id[]` accepts any rooms in one call
**Per spec §5:** "Group check-in assumes equal room rates. FE must not mix rooms with different nightly prices in one `room_id[]`."
**Current state:** CheckInPage only allows single room selection (`restaurantTableId` is a single value → `room_id: [Number(p.restaurantTableId)]`). This constraint is naturally met for single-room check-ins. For future multi-room check-in support, this constraint must be enforced.
**Fix scope:** No immediate action needed (single-room only today). Note for future multi-room work.

---

## 5. Backend Brief — Q-GST-01

```markdown
# BACKEND_BRIEF_INV-PMS-GST-001_2026-09-08

## Summary
- Issue: FE currently sends gst_tax: '0.00' at check-in. Now implementing slab-based GST. 
  Need confirmation of checkout payload contract.
- Classification: CONTRACT_MISMATCH (FE needs clarification before fixing GAP-7)
- Frontend impact: Checkout drawer may be missing room accommodation GST in bill-payment payload
- Priority/Risk: P1 / HIGH

## Endpoint
- Method: POST
- URL: /api/v2/vendoremployee/order/order-bill-payment
- Auth: Bearer {TOKEN}

## Question Q-GST-01
Does `order-bill-payment` for room orders require a separate `gst_tax` field for room accommodation tax?
  (a) YES — FE must send room accommodation gst_tax separately in the checkout payload
  (b) NO  — BE derives it from `user_id_documents.gst_tax` stored at check-in; FE only sends food-order GST

## Current behaviour
- PmsCheckoutDrawer calls orderToAPI.collectBillExisting → sends food-order gst_tax (from F&B items)
- No explicit room accommodation gst_tax sent in checkout payload
- pms_gst.md §4 says "FE sends gst_tax amount for the folio" — ambiguous

## Evidence
- spec: pms_gst.md §4
- checkout path: src/components/pms/PmsCheckoutDrawer.jsx:138
- payload builder: src/api/transforms/orderTransform.js:1472 (collectBillExisting)
```

---

## 6. Proposed Fix — Summary (FE only, no code in this session)

Implementation must happen via normal gate cycle (INTAKE → PLANNING → Gate 4 → IMPL).

```
New item to register: BUG-PMS-GST (or CR-PMS-GST)

Files WILL change:
  src/api/transforms/profileTransform.js     — parse room_gst slab object (GAP-3)
  src/api/services/pmsService.js             — replace gst_tax:'0.00' + fix balance_payment (GAP-1/2)
  src/pages/pms/CheckInPage.jsx              — GST compute on form + display (GAP-4/5)

NEW file:
  src/utils/roomGstCalculator.js             — pure slab computation utility (GAP-4)

Files to investigate (pending Q-GST-01 answer):
  src/components/pms/PmsCheckoutDrawer.jsx   — may need room gst_tax in checkout (GAP-7)

Files will NOT touch:
  InHouseGuestsPage.jsx  (self-heals once GAP-1 is fixed for new check-ins)
  aiosellTransform.js    (no change needed)
  CollectPaymentPanel    (R6 — sacred, never modify)

Execution order (once registered + Gate 4 GO):
  E1: roomGstCalculator.js (new pure util — no compile risk)
  E2: profileTransform.js  (parse slab)
  E3: pmsService.js        (use computed gst_tax + fix balance_payment)
  E4: CheckInPage.jsx      (compute + display + pass gst_tax to pmsCheckIn)
  E5: PmsCheckoutDrawer    (pending Q-GST-01 answer from backend)
```

---

## 7. Retroactive Candidates
None — no existing GST code to register retroactively.

---

*2026-09-08 | INVESTIGATION role | 8/10 steps | ROOT CAUSE CONFIRMED | FE_BUG | No code edited*
