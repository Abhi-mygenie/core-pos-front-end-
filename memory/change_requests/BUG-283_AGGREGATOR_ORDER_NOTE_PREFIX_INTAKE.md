# BUG-283 — Aggregator: "Order Instructions :::" Prefix Not Stripped

**ID:** BUG-283
**Type:** BUG
**Priority:** P2
**Risk:** LOW
**Area:** Transforms → aggregatorTransform.js
**Sprint:** pos_5_0
**Intake Date:** 2026-07-31
**Gate:** 0-1
**Source:** INVESTIGATION (Aggregator Investigation Report 2026-07-31)

---

## Description

Zomato orders arrive with `order_note: "Order Instructions ::: This is order level instructions"` — the `"Order Instructions :::"` prefix is injected by UrbanPiper/Zomato and should be stripped before display. Swiggy orders do NOT have this prefix. The prefix shows in:
- AggregatorOrderPopOut (acceptance popup)
- OrderCard (dashboard card)

## Evidence

- Live data: 5 Zomato orders have prefix `"Order Instructions :::"`, 3 Swiggy orders do not
- Endpoint: `GET /api/v1/vendoremployee/urbanpiper/get-order-list`
- Account: owner@18march.com (rid=478)

## Blast Radius

- 1 file: `api/transforms/aggregatorTransform.js` (~1 line change)
- Risk: LOW

## Fix

In `aggregatorTransform.js`, after computing `orderNote`:
```javascript
const orderNote = (raw_note || '').replace(/^Order Instructions\s*:::\s*/i, '').trim() || null;
```

## Acceptance Criteria

```
AC-1: Zomato order notes display without "Order Instructions :::" prefix
AC-2: Swiggy order notes unaffected
AC-3: Empty notes after stripping prefix → hidden (null)
```

## Duplicate Check: DISTINCT
