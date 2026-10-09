# QA Handover — BUG-395 addendum-2
**Date:** 2026-09-11
**Item:** BUG-395 addendum-2 — `crossRestaurantAddress` missing house/floor/road/contactPersonName/contactPersonNumber
**Sprint:** pos_7_0
**Risk:** MEDIUM (delivery address data path — additive transform fix, not financial)

---

## 1. What Was Changed

**File:** `src/api/transforms/customerTransform.js`
**Lines:** L199-210
**Change type:** ADDITIVE — 5 new fields added to `crossRestaurantAddress`

| Field added | Maps from API | Used by |
|---|---|---|
| `house` | `api.house` | `buildDeliveryAddress`, `buildBillPrintPayload` → `deliveryCustHouse` |
| `floor` | `api.floor` | `buildDeliveryAddress`, `buildBillPrintPayload` → `deliveryCustFloor` |
| `road` | `api.road` | `buildDeliveryAddress` |
| `contactPersonName` | `api.contact_person_name` | `buildDeliveryAddress` → `contact_person_name` |
| `contactPersonNumber` | `api.contact_person_number` | `buildDeliveryAddress` → `contact_person_number` |

---

## 2. Verification Matrix

| Edit | File | What to verify | Method |
|---|---|---|---|
| E1 | `customerTransform.js:199-210` | 5 new fields present in `crossRestaurantAddress` output | Code inspection ✅ (self-test done) |
| E1 | `customerTransform.js:199-210` | `house`/`floor` populated from saved address | Network tab → `order-temp-store` payload after selecting saved address |
| E1 | `customerTransform.js:199-210` | `contactPersonName`/`contactPersonNumber` populated | Network tab → place-order payload |

**Self-test: 5/5 fields verified at L199-210. Compile: PASS. EXIT GATE: 5/5.**

---

## 3. Test Cases

| # | Test ID | Description | Steps | Expected |
|---|---|---|---|---|
| 1 | TC-395-A1 | Saved address with house+floor selected → both in order-temp-store | 1. Login as `owner@hogwarts.com`. 2. Create Delivery order. 3. Search customer `9696759712`. 4. Select first customer. 5. Select **first address** (house: G-12, floor: 1, city: Agonda, state: Goa). 6. Inspect Network → `order-temp-store` payload. | `deliveryCustHouse: 'G-12'`, `deliveryCustFloor: '1'`, `deliveryCustCity: 'Agonda'`, `deliveryCustState: 'Goa'` — all 4 populated |
| 2 | TC-395-A2 | Saved address → house+floor in place-order `delivery_address` | Same steps as TC-A1, inspect Network → place-order or update-order request body → `delivery_address` object | `delivery_address.house: 'G-12'`, `delivery_address.floor: '1'` — not null |
| 3 | TC-395-A3 | Address with no house/floor → empty string (not undefined/null) | Select a saved address where house/floor are blank. Inspect payloads. | `deliveryCustHouse: ''`, `deliveryCustFloor: ''` — present as empty string |
| 4 | TC-395-A4 | Regression: city/state still populated (addendum-1 not broken) | Same as TC-A1 | `deliveryCustCity` and `deliveryCustState` still populated correctly |
| 5 | TC-395-A5 | Regression: existing delivery fields intact | Check `deliveryCustName`, `deliveryCustAddress`, `deliveryCustPincode`, `deliveryCustPhone` in payload | All present and correct |

---

## 4. Regression Tests

| # | What to verify | Why |
|---|---|---|
| R1 | `crossRestaurantAddresses` array still works (multiple addresses) | Additive change to the map function used in a `.map()` call |
| R2 | Auto-select default address still fires | `selectedAddress` state assignment path unchanged |
| R3 | Place-order payload `delivery_address` complete | `buildDeliveryAddress(selectedAddress)` now receives populated `house`/`floor` |

---

## 5. Registry Sync Confirmation

- Registry synced: **YES**
- Item: BUG-395 (addendum-2)
- Sprint: pos_7_0
- Gate: 5 (IMPLEMENTED)
- EXIT GATE: **5/5 PASS**
- BUG_TRACKER.md: **UPDATED** (2026-09-11 Last Updated row)
- FILE_OWNERSHIP.md: **UPDATED** (addendum-2 section)
- Code marker `// BUG-395 addendum-2` at `customerTransform.js:195-198`: **PRESENT**

---

## 6. Credentials + Environment

| Account | URL | Use for |
|---|---|---|
| `owner@hogwarts.com` / `***` | `https://preprod.mygenie.online` | TC-395-A1 through A5 (customer 9696759712, first address has house+floor) |

**Confirmed live:** CRM probe 2026-09-11 — address 1 of 6 for `9696759712`:
- `house: "G-12"`, `floor: "1"`, `road: "Agonda Beach Road"`, `city: "Agonda"`, `state: "Goa"`

---

*QA handover written by BUG FIX agent — 2026-09-11*
