# BUG-284 — Aggregator: Address Shows "Bangalore, Bangalore" (Duplicate City)

**ID:** BUG-284
**Type:** BUG
**Priority:** P2
**Risk:** LOW
**Area:** Components → AggregatorOrderPopOut → formatAddress()
**Sprint:** pos_5_0
**Intake Date:** 2026-07-31
**Gate:** 0-1
**Source:** INVESTIGATION (Aggregator Investigation Report 2026-07-31)

---

## Description

Swiggy orders show address as "Bangalore, Bangalore" because the aggregator sets `line_1`, `sub_locality`, and `city` all to the same value ("Bangalore"). The `formatAddress()` function joins all parts without deduplication.

Also missing: `sub_locality` and `landmark` fields are not included in the format.

## Evidence

- Live Swiggy address: `{"city": "Bangalore", "line_1": "Bangalore", "sub_locality": "Bangalore", "line_2": null, "pin": null, "landmark": null}`
- Live Zomato address: `{"city": "Delhi NCR", "line_1": "Test Are", "sub_locality": null}` — works better
- Current: `formatAddress = (addr) => [addr.line_1, addr.line_2, addr.city, addr.pin].filter(Boolean).join(', ')`

## Blast Radius

- 1 file: `AggregatorOrderPopOut.jsx` line 27–31 (~3 line change)
- Risk: LOW

## Fix

```javascript
const formatAddress = (addr) => {
  if (!addr) return null;
  const parts = [addr.line_1, addr.line_2, addr.sub_locality, addr.landmark, addr.city, addr.pin]
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i); // deduplicate
  return parts.length > 0 ? parts.join(', ') : null;
};
```

## Acceptance Criteria

```
AC-1: Swiggy address no longer shows "Bangalore, Bangalore" — deduplicated
AC-2: Zomato address unaffected (already has distinct values)
AC-3: sub_locality and landmark included when available
```

## Duplicate Check: DISTINCT
