# BUG-287 — Aggregator: "This is order level instructions" Default Placeholder Not Stripped

**ID:** BUG-287
**Type:** BUG
**Priority:** P2
**Risk:** LOW
**Area:** Transforms → aggregatorTransform.js → OrderCard + AggregatorOrderPopOut display
**Sprint:** pos_5_0
**Intake Date:** 2026-07-31
**Gate:** 0-1
**Source:** OWNER-REPORTED (screenshot: order note label showing placeholder text on cards and popup)
**Related:** BUG-283 (prefix strip — IMPLEMENTED)

---

## Description

After BUG-283 strips the Zomato `"Order Instructions :::"` prefix, the remaining text `"This is order level instructions"` is a UrbanPiper/Zomato default placeholder — not a real customer instruction. It should be treated as empty/null.

This placeholder shows on:
1. **OrderCard** (L622-632) — FileText icon + text in header
2. **AggregatorOrderPopOut** (L270-275) — amber note block in acceptance popup

Owner directive: strip this placeholder. If no meaningful instructions remain, hide the entire note section.

## Evidence

- Screenshot: Owner provided — order note label showing "This is order level instructions" on card
- API data (8 orders probed):
  - 4 Zomato orders: `"Order Instructions ::: This is order level instructions"` → after BUG-283 → `"This is order level instructions"` ← **placeholder, should be null**
  - 2 Swiggy orders: `"This is order level instructions"` ← **same placeholder, never had prefix**
  - 2 orders with REAL notes: `"this is mallu's order"`, `"mallu ka aunty"` ← **should remain**
- Code: `aggregatorTransform.js:24` — BUG-283 regex strips prefix only, does not filter placeholder body

## Steps to Reproduce

1. Login as owner@18march.com
2. Dashboard shows aggregator orders
3. OrderCard and popup show "This is order level instructions" note label
4. This is a default placeholder, not a real customer instruction

## Blast Radius

- 1 file: `aggregatorTransform.js` — 1 line change (L24)
- 0 UI files — OrderCard (L622) and PopOut (L270) already gate on `order.orderNote && (...)` — once transform returns `null`, both auto-hide
- Risk: LOW — transform-level filter, no state/API change

## Fix

In `aggregatorTransform.js` L24, after the BUG-283 regex strip, add a known-placeholder filter:

```javascript
const stripped = rawNote.replace(/^Order Instructions\s*:::\s*/i, '').trim();
const orderNote = (stripped && !/^this is order level instructions$/i.test(stripped)) ? stripped : null;
```

## Acceptance Criteria

```
AC-1: Orders with note "This is order level instructions" (any case) → note section hidden on OrderCard
AC-2: Orders with note "This is order level instructions" → note section hidden on AggregatorOrderPopOut
AC-3: Orders with note "Order Instructions ::: This is order level instructions" → both stripped → hidden
AC-4: Orders with REAL notes (e.g., "this is mallu's order") → note section visible, text shown
AC-5: Orders with no note → note section hidden (existing behavior preserved)
```

## Duplicate Check: RELATED to BUG-283 (extends prefix strip with placeholder filter)
