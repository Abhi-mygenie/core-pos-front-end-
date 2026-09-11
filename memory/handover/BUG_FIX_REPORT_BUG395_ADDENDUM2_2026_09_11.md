# BUG FIX REPORT — BUG-395 addendum-2
**Date:** 2026-09-11
**Agent role:** BUG FIX
**Parent:** BUG-395 (pos_7_0)
**Escalated from:** INVESTIGATION agent (INV-BUG395-FLOOR-HOUSE-2026-09-11)
**Planning skip:** YES — owner approved (1 file, 5 lines, non-hotspot, non-financial)

---

## Fix Summary

| Test # | Severity | RCA Classification | Root Cause | Fix | File Changed | Verified |
|---|---|---|---|---|---|:---:|
| TC-395-A1 | BLOCKER | CODE_ERROR | `crossRestaurantAddress` in `customerTransform.js` missing `house`, `floor`, `road`, `contactPersonName`, `contactPersonNumber` — CRM API returns them, transform dropped them silently | Added 5 fields to `crossRestaurantAddress` (L199-210) | `customerTransform.js` | ✅ |

---

## Root Cause Detail

- **Symptom:** Delivery order `order-temp-store` payload has empty `deliveryCustHouse` / `deliveryCustFloor` even when saved address has values
- **Break point:** `customerTransform.js:187` — `crossRestaurantAddress` map omitted `house`, `floor`, `road`
- **Data chain:** CRM `/pos/address-lookup` → `crossRestaurantAddresses()` → `crossRestaurantAddress()` → `selectedAddress` in OrderEntry (missing fields) → `buildDeliveryAddress(selectedAddress)` sends `null` to backend → `buildBillPrintPayload` emits `''`
- **Why city/state worked:** They were already in `crossRestaurantAddress`. BUG-395 addendum-1 (2026-09-10) added them to `buildDeliveryAddress` (the write path), but the transform gap was never the bottleneck for city/state.

---

## Code Change

**File:** `src/api/transforms/customerTransform.js`
**Lines added:** L199-201 (house, floor, road), L209-210 (contactPersonName, contactPersonNumber)

```js
// BEFORE — crossRestaurantAddress (lines 192-204)
id:                api.pos_address_id || api.id || api.address_id || '',
posAddressId:      api.pos_address_id || null,
address:           api.address || '',
city:              api.city || '',
state:             api.state || '',
...

// AFTER — crossRestaurantAddress (lines 192-213)
id:                   api.pos_address_id || api.id || api.address_id || '',
posAddressId:         api.pos_address_id || null,
address:              api.address || '',
house:                api.house || '',          // ← ADDED
floor:                api.floor || '',          // ← ADDED
road:                 api.road  || '',          // ← ADDED
city:                 api.city  || '',
state:                api.state || '',
...
contactPersonName:    api.contact_person_name || '',   // ← ADDED
contactPersonNumber:  api.contact_person_number || '', // ← ADDED
lastUsedAt:           api.last_used_at || null,
sourceRestaurant:     api.source_restaurant || '',
```

---

## Self-Verification

- Code inspection: 5 new fields present at L199-210 ✅
- Compile: webpack `Compiled successfully` — 0 new warnings ✅
- Code marker `// BUG-395 addendum-2` at L195-198 ✅
- Live CRM probe confirms API returns `house: 'G-12'`, `floor: '1'` for 9696759712 ✅
- Additive only — no existing fields renamed or removed ✅

---

## Scope Declaration

- **File changed:** `src/api/transforms/customerTransform.js` (1 file)
- **Files NOT touched:** `orderTransform.js`, `OrderEntry.jsx`, `customerService.js`, any other file
- **Scope expansion:** NONE

---

## EXIT GATE

- ☑ 1. REGISTRY SYNC: `registry.json` BUG-395 status updated with addendum-2 note
- ☑ 2. BUG_TRACKER.MD: Last Updated row prepended (2026-09-11 addendum-2)
- ☑ 3. FILE_OWNERSHIP.MD: `customerTransform.js` addendum-2 entry added
- ☑ 4. CODE MARKERS: `// BUG-395 addendum-2` comment at L195-198
- ☑ 5. COMPILE CHECK: webpack clean — `Compiled successfully`, 0 new warnings

**EXIT GATE: 5/5 PASS**

---

*Fix report by BUG FIX agent — 2026-09-11*
