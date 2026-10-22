# BUG-586 — Search: phone number off by default + room search missing phone field entirely

**ID:** BUG-586
**Type:** BUG
**Registered:** 2026-10-17
**Sprint:** nov_cr_batch
**Status:** GATE_1_INTAKE
**Priority:** P2
**Risk:** LOW
**Area:** Dashboard — Search

---

## Description

Two related gaps make phone number search non-functional:

**Gap A — Default searchOptions missing 'phone no':**

`profileTransform.js` L236:
```javascript
searchOptions: api.search_by || ['order id', 'table no', 'user id']
//                                                       no 'phone no' ↑
```
The default opts list does not include `'phone no'`. Every search check for phone is gated by `opts.includes('phone no')` — if it's not in opts, phone is never searched for any bucket (tables, delivery, takeaway).

**Gap B — Room search: phone field entirely absent:**

Room search `all[]` (DashboardPage.jsx L1259):
```javascript
all: [opts.includes('table no') && item.id, opts.includes('user id') && (item.guestName || item.guest || '')].filter(Boolean)
```
There is no phone field here at all. Even if a restaurant has `search_by: ['phone no']` configured, searching by guest phone still returns nothing for rooms.

---

## What works / what doesn't (full picture as of 2026-10-17)

| Field | Tables | Rooms | Delivery | Takeaway |
|---|---|---|---|---|
| Display name | ❌ BUG-584/576 | ❌ BUG-576 | N/A | N/A |
| Customer / guest name | ✅ | ✅ | ✅ | ✅ |
| Phone number | ❌ default off | ❌ field missing | ❌ default off | ❌ default off |
| Order number | ❌ not wired | ❌ not wired | ✅ | ✅ |

---

## Fix Required

**Gap A:** Add `'phone no'` to default in profileTransform.js L236:
```javascript
searchOptions: api.search_by || ['order id', 'table no', 'phone no', 'user id']
```

**Gap B:** Add phone field to room search all[] in DashboardPage.jsx L1259:
```javascript
all: [
  opts.includes('table no') && item.label,
  opts.includes('user id') && (item.guestName || item.guest || ''),
  opts.includes('phone no') && item.phone
].filter(Boolean)
```

---

## Open Question

**OD-586-01: LOCKED (2026-10-17)** — Order number search is for Delivery and Takeaway ONLY. Tables and rooms do NOT get order number search. No scope change to BUG-586.

---

## Blast Radius

- **Files:** 2 — `profileTransform.js` L236 + `DashboardPage.jsx` L1259
- **Scope:** SMALL — additive fields only, no logic change
- **Hotspot:** DashboardPage.jsx is R5 — needs explicit plan

---

## Duplicate Check

- BUG-332: gating structure — RELATED (same opts gating pattern), DISTINCT (different gap)
- **Result: DISTINCT**

---

## Evidence

- **Source:** OWNER-REPORTED + code trace (2026-10-17)
- **Confidence:** CONFIRMED — code verified at profileTransform.js L236 + DashboardPage.jsx L1259
