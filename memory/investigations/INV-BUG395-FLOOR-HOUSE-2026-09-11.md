# Investigation Report — BUG-395 Extended: house/floor missing from order-temp-store payload

**Date:** 2026-09-11
**Role:** INVESTIGATION
**Reported by:** Owner (Hogwarts env, customer 9696759712)
**Parent item:** BUG-395 (pos_7_0)
**Steps used:** 6 / 10

---

## 1. Summary

**Root cause:** `fromAPI.crossRestaurantAddress` in `customerTransform.js` (L187–204) is missing `house`, `floor`, and `road` field mappings. The CRM `/pos/address-lookup` endpoint **does return** these fields but they are silently dropped by the transform. All saved addresses fetched via `lookupAddresses()` arrive at `OrderEntry` with `house = undefined`, `floor = undefined` — so both the `order-temp-store` payload and the `delivery_address` write path emit empty/null for these fields.

**Classification:** FE_BUG — CODE_ERROR (transform omission)
**Confidence:** HIGH (live CRM probe confirms data exists; code trace confirms drop point)
**Steps used:** 6 / 10

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Steps Used | Result | Evidence |
|---|---|---|---|:---:|---|
| H1 | `crossRestaurantAddress` transform missing `house`/`floor` | Code trace `customerTransform.js` L187–204 | 1 | **CONFIRMED** | See §3 |
| H2 | CRM API doesn't return `house`/`floor` at all (data issue) | Live curl probe POST `/pos/address-lookup` | 1 | **ELIMINATED** | `evidence/BUG-395/crm_address_lookup_hogwarts_9696759712.json` |
| H3 | `buildDeliveryAddress` missing `house`/`floor` | Code trace `orderTransform.js` L930–950 | 1 | **ELIMINATED** — both fields ARE present here | See §3 |
| H4 | `buildBillPrintPayload` missing `house`/`floor` | Code trace `orderTransform.js` L2195–2206 | 1 | **ELIMINATED** — added by BUG-395 fix | See §3 |

---

## 3. Data Flow Trace

```
CRM API: POST /pos/address-lookup
  Response: { house: 'G-12', floor: '1', road: 'Agonda Beach Road', city: 'Agonda', state: 'Goa', ... }
  ↓
customerService.js:122 → fromAPI.crossRestaurantAddresses(response.data.data.addresses)
  ↓
customerTransform.js:187 → crossRestaurantAddress(api)
  MAPS:   city, state, pincode, address, addressType, latitude, longitude
  DROPS:  house ❌  floor ❌  road ❌  contactPersonName ❌  contactPersonNumber ❌
  ↓
OrderEntry.jsx:262 → setDeliveryAddresses(addresses)
OrderEntry.jsx:265 → setSelectedAddress(defaultAddr)   [auto-select default]
OrderEntry.jsx:2822 → onSelect={(addr) => setSelectedAddress(addr)}   [manual pick]
  selectedAddress.house = undefined
  selectedAddress.floor = undefined
  ↓
WRITE PATH — when order is placed:
  orderTransform.js:1134 → buildDeliveryAddress(selectedAddress)
    floor: addr.floor || null  →  null   (floor was undefined)
    house: addr.house || null  →  null   (house was undefined)
    city:  addr.city  || ''    →  'Agonda'  ✓ (city IS in crossRestaurantAddress)
    state: addr.state || ''    →  'Goa'     ✓ (state IS in crossRestaurantAddress)
  → Backend receives delivery_address: { house: null, floor: null, city: 'Agonda', state: 'Goa' }
  → Backend stores delivery_address with house=null, floor=null
  ↓
PRINT PATH — order-temp-store:
  orderTransform.js:2196 → buildBillPrintPayload
    deliveryCustHouse: overrides.deliveryAddress?.house  →  undefined → ''   ❌
    deliveryCustFloor: overrides.deliveryAddress?.floor  →  undefined → ''   ❌
    deliveryCustCity:  overrides.deliveryAddress?.city   →  'Agonda'          ✓
    deliveryCustState: overrides.deliveryAddress?.state  →  'Goa'             ✓

BREAK POINT: customerTransform.js:187 — crossRestaurantAddress omits house/floor/road
```

---

## 4. Why city/state work but house/floor don't

The BUG-395 addendum (2026-09-10) added `city` and `state` to `buildDeliveryAddress` (the write path). However, that fix addressed the **wrong layer**. The real gap was always in `crossRestaurantAddress` — which DID already map `city`/`state` (explaining why those fields work at the transform level), but had NEVER mapped `house`, `floor`, or `road`.

The prior BUG-395 work chain:
1. BUG-395 main fix → added 4 keys to `buildBillPrintPayload` ✓ (print path)
2. BUG-395 addendum → added `city`/`state` to `buildDeliveryAddress` ✓ (write path)
3. **Gap remaining (this investigation):** `crossRestaurantAddress` drops `house`/`floor` → selectedAddress never carries them → both write path and print path receive null/undefined

---

## 5. Evidence Artifacts

| File | Description |
|---|---|
| `/app/memory/evidence/BUG-395/crm_address_lookup_hogwarts_9696759712.json` | Live CRM probe — 6 addresses returned, first has `house: 'G-12'`, `floor: '1'`, `road: 'Agonda Beach Road'` |

**Key proof from probe (first address):**
```json
{
  "house": "G-12",
  "floor": "1",
  "road": "Agonda Beach Road",
  "city": "Agonda",
  "state": "Goa",
  "address_type": "Home",
  "contact_person_name": "Parth",
  "contact_person_number": "9696759712"
}
```

**What `crossRestaurantAddress` currently maps (customerTransform.js L187–204):**
```
id, posAddressId, address, city, state, pincode, country,
latitude, longitude, addressType, lastUsedAt, sourceRestaurant
```

**Missing from `crossRestaurantAddress` (present in standard `address` transform L153–172):**
```
house, floor, road, contactPersonName, contactPersonNumber, deliveryInstructions, isDefault
```

---

## 6. Fix Scope

**File:** `src/api/transforms/customerTransform.js`
**Function:** `fromAPI.crossRestaurantAddress` (L187–204)
**Change:** Add missing fields — `house`, `floor`, `road`, `contactPersonName`, `contactPersonNumber`

**Lines to add (~5 lines):**
```js
house:                api.house || '',
floor:                api.floor || '',
road:                 api.road  || '',
contactPersonName:    api.contact_person_name || '',
contactPersonNumber:  api.contact_person_number || '',
```

**Planning skip eligibility check:**
- ≤10 lines: ✅ (5 lines)
- 1 file only: ✅ (`customerTransform.js`)
- Not R5 hotspot: ✅ (hotspots are OrderEntry, CollectPaymentPanel, orderTransform, DashboardPage, LoadingPage)
- Not financial: ✅ (address fields only)
- No API contract change: ✅ (read transform enrichment, additive only)
- No open conflict in FILE_OWNERSHIP: needs verification

**Planning skip eligible: YES — owner must approve.**

---

## 7. Retroactive Candidates

NONE.

---

## 8. Recommendation

- **Classification:** FE_FIX
- **Scope:** `customerTransform.js` only (1 file, ~5 lines)
- **Path A (RECOMMENDED):** Owner approves DIRECT_BUG_FIX skip → BUG FIX agent applies 5-line fix to `crossRestaurantAddress`
- **Path B:** Full Gate 2–3 planning cycle (adds ~1 session of overhead for a clearly bounded 5-line fix)

---

*Investigation by INVESTIGATION agent — 2026-09-11*
*Evidence saved to: /app/memory/evidence/BUG-395/*
