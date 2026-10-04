# QA Handover — BUG-395
**Date:** 2026-09-10
**Item:** BUG-395 — `buildBillPrintPayload` missing 4 delivery address sub-fields
**Sprint:** pos_7_0
**Risk:** MEDIUM (hotspot file `orderTransform.js`, additive change only)
**Retroactive note:** Registered retroactively after gate violation. Owner approved 2026-09-10.

---

## 1. What Was Changed

**File:** `src/api/transforms/orderTransform.js`
**Lines:** L2193–2205
**Change type:** ADDITIVE — 4 new keys added to `buildBillPrintPayload` output object.

| Key | Source | Delivery orders | Non-delivery orders |
|---|---|---|---|
| `deliveryCustHouse` | `order.deliveryAddress.house` | populated string or `''` | always `''` |
| `deliveryCustFloor` | `order.deliveryAddress.floor` | populated string or `''` | always `''` |
| `deliveryCustCity` | `order.deliveryAddress.city` | populated string or `''` | always `''` |
| `deliveryCustState` | `order.deliveryAddress.state` | populated string or `''` | always `''` |

Pattern follows existing keys: `deliveryCustAddress`, `deliveryCustPincode`, `deliveryCustPhone`.
Override branch also supported: `overrides.deliveryAddress?.house` etc.

---

## 2. Verification Matrix

| Edit | File | What to verify | Method |
|---|---|---|---|
| E1 | `orderTransform.js:2194-2205` | 4 keys present in output object | Code inspection ✅ (self-test done) |
| E1 | `orderTransform.js:2194-2205` | Delivery order: keys populated from `deliveryAddress` | Network tab on delivery order bill print |
| E1 | `orderTransform.js:2194-2205` | Non-delivery order: keys present as empty strings | Network tab on dine-in bill print |

**Self-test result:** Verified — keys present at L2194-2205, follow exact same pattern as L2184-2192. EXIT GATE 5/5 PASS.

---

## 3. Test Cases

| # | Test ID | Description | Steps | Expected | Priority |
|---|---|---|---|---|---|
| 1 | TC-395-01 | Delivery order bill print — 4 keys present and populated | 1. Login as `delivery_assign_no` (RID 478). 2. Place a delivery order with a full address (house + floor + city + state). 3. Trigger bill print (Place Order auto-print or Print button). 4. Inspect Network tab → POST order-temp-store payload. | Payload contains `deliveryCustHouse`, `deliveryCustFloor`, `deliveryCustCity`, `deliveryCustState` with non-empty values matching the order address. | P0 |
| 2 | TC-395-02 | Delivery order with partial address — missing sub-fields default to `''` | 1. Place delivery order where house/floor are blank. 2. Trigger bill print. 3. Inspect Network tab → order-temp-store payload. | Missing sub-fields appear as `''` (empty string), not `undefined` or `null`. | P1 |
| 3 | TC-395-03 | Non-delivery order (dine-in) — 4 keys present as empty strings | 1. Place a dine-in order. 2. Trigger bill print. 3. Inspect Network tab → order-temp-store payload. | All 4 keys present with value `''`. No undefined keys. | P1 |
| 4 | TC-395-04 | Collect Bill auto-print path — 4 keys included | 1. Settle a delivery order (collect bill with auto-print). 2. Inspect Network tab → order-temp-store payload from CollectPaymentPanel path. | 4 keys present with correct address values. | P1 |

---

## 4. Regression Tests

| # | What to verify | Why |
|---|---|---|
| R1 | Existing delivery fields still present: `deliveryCustName`, `deliveryCustAddress`, `deliveryCustPincode`, `deliveryCustPhone` | Ensure additive change didn't accidentally overwrite adjacent keys |
| R2 | Non-delivery bill print payload is not corrupted (dine-in order: verify `rtype`, `order_type`, `station_kot` still present) | orderTransform.js is hotspot — confirm no regression to surrounding keys |
| R3 | Financial fields intact: `grand_total`, `subtotalBeforeTax`, `round_off`, `tax_amount` on any order type | No financial logic was touched — confirm as safety net |

---

## 5. Registry Sync Confirmation

- Registry synced: **YES**
- Item: BUG-395
- Sprint: pos_7_0
- Gate: 5 (IMPLEMENTED)
- EXIT GATE: **5/5 PASS**
- BUG_TRACKER.md: **UPDATED**
- FILE_OWNERSHIP.md: **UPDATED**
- Code marker `// BUG-395` at `orderTransform.js:2193`: **PRESENT**

---

## 6. Credentials + Environment

| Account alias | RID | Use for |
|---|---|---|
| `delivery_assign_no` | 478 | Delivery flow where `deliveryAssign=No` (TC-395-01, 02, 04) |
| `cafe103_no_rooms_postpaid_gst` | 644 | Dine-in regression (TC-395-03) |

- Preprod URL: `https://preprod.mygenie.online`
- Login: `POST /api/v1/auth/vendoremployee/login`
- Credentials: see `/app/memory/test_credentials.md` (masked — use alias)

---

## 7. Scope Declaration

**Files WILL be tested:** `api/transforms/orderTransform.js` (1 file)
**Files WILL NOT be touched by QA:** Any other file
**Scope expansion:** NONE

---

*QA handover written by BUG FIX agent — 2026-09-10*
*Retroactive registration: gate violation resolved — owner approved 2026-09-10*
