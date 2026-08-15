# BUG-291 — Implementation Plan (Gate 3)

**ID:** BUG-291
**Title:** Aggregator Rider Details Not Displayed — `riderName`/`riderStatus` mapping gaps
**Date:** 2026-07-31
**Written by:** PLANNING AGENT
**Status:** GATE 3 COMPLETE — Awaiting Gate 4 GO (owner approval to implement)
**Risk:** LOW
**Scope:** 1 file, 1 block change (~8 net lines)
**Fast Lane eligible:** YES

---

## Pre-Implementation Checklist

- [x] Gate 1 — Intake: `/app/memory/change_requests/BUG-291_AGGREGATOR_RIDER_DETAILS_NOT_DISPLAYED_INTAKE.md`
- [x] Code Reality Check: NONE — no fix applied. Confirmed 2026-07-31.
- [x] Conflict Check: CLEAR — `aggregatorTransform.js` last touched CR-118 (2026-07-31), no rider fields changed
- [x] Owner Decisions: ALL LOCKED (Q-291-1 through Q-291-5)
- [x] Gate 4 — Owner GO (given: owner requested implementation role 2026-07-31)
- [x] Gate 5 — Implementation (COMPLETE 2026-07-31)
- [x] Gate 5a — Self-test (PASS: VS-1 ✅ VS-2 ✅ VS-5/compile ✅)
- [ ] Gate 6 — Owner Smoke

---

## Confirmed Decisions (from owner Q&A 2026-07-31)

| Decision | Rule |
|---|---|
| `rider:` field key | Add alongside `riderName:` (GAP-R1) |
| `riderStatus` derivation | `rider.id` + `fOrderStatus < 5` → `'riderAssigned'`; `fOrderStatus === 5` → `'dispatched'`; else `null` (Q-291-1 approved) |
| `deliveryManId` | NOT mapped — all footer buttons guarded by `!isAggregator` at OrderCard:1111, irrelevant |
| `riderInfo` block | DROP entirely (Q-291-4 approved) |
| `socketHandlers.js` | NOT touched — GAP-R5 was false alarm; `handleAggregatorOrderUpdate` already uses `aggregatorTransform` |
| `AggregatorDispatchModal.jsx` | NOT touched — uses local `riderName` useState, not order model |

---

## Change 1 of 1 — `aggregatorTransform.js`

**File:** `/app/frontend/src/api/transforms/aggregatorTransform.js`
**Lines affected:** 84–94 (the rider section — confirmed current as of 2026-07-31)
**Nature:** Additive + one block removal. No destructive rename of existing keys.

---

### BEFORE (lines 84–94, verbatim)

```js
      // Rider — GAP-3: inconsistent key casing (Phone, Cahnel)
      riderName: od.rider_name || rider.name || null,
      riderPhone: od.rider_phone_number || rider.Phone || rider.phone || null,
      riderInfo: {
        id: rider.id || null,
        name: rider.name || null,
        phone: rider.Phone || rider.phone || null,
        channel: rider.Cahnel || rider.channel || null,
        returnOtp: rider.order_return_otp || null,
        bagReturnOtp: rider.bag_return_otp || null,
      },
```

---

### AFTER (replacement block)

```js
      // Rider — GAP-3: inconsistent key casing (Phone, Cahnel)
      // BUG-291 R1: add `rider` key (OrderCard:912 reads order.rider, not order.riderName)
      rider: od.rider_name || rider.name || null,
      riderName: od.rider_name || rider.name || null,        // legacy key — retained for safety
      riderPhone: od.rider_phone_number || rider.Phone || rider.phone || null,
      // BUG-291 R2: derive riderStatus from rider_info presence + f_order_status
      // owner Q-291-1 approved: rider.id + fOS<5 → 'riderAssigned'; fOS===5 → 'dispatched'
      riderStatus: rider.id
        ? (Number(od.f_order_status) === 5 ? 'dispatched' : 'riderAssigned')
        : null,
      // BUG-291 R4: riderInfo nested block dropped — no UI consumer confirmed (owner Q-291-4)
```

---

### Diff summary

| Line | Change | Reason |
|---|---|---|
| After L85 (new L85) | ADD `rider:` | GAP-R1 — OrderCard:912 reads `order.rider` |
| L85 (was) | KEEP `riderName:` | Backward safety — no known consumer but zero cost to keep |
| L86 | UNCHANGED | `riderPhone` already correct |
| After L86 (new L88) | ADD `riderStatus:` 3-line expression | GAP-R2 — status badges at OrderCard:922/933 |
| L87–94 | REMOVE `riderInfo: { ... }` block (8 lines) | GAP-R4 — dead code, owner approved |

**Net: +4 lines, −8 lines = −4 lines total**

---

### Why `riderStatus` derivation is correct

```
rider.id is non-null  →  a Swiggy/Zomato rider is assigned
fOrderStatus === 5    →  'served' (order dispatched / rider en route to customer)
fOrderStatus < 5      →  'riderAssigned' (rider assigned, not yet dispatched)
rider.id is null      →  null (no rider, card shows "Awaiting Runner")
```

This matches the POS `orderTransform` pattern at `orderTransform.js:328–333`
and is what `OrderCard.jsx:922/933` renders:
- `'riderAssigned'` → orange **"Assigned"** pill
- `'dispatched'`    → green **"Order Accepted"** pill

---

## No Other Files Change

| File | Status | Reason |
|---|---|---|
| `socketHandlers.js` | NOT TOUCHED | GAP-R5 false alarm — `handleAggregatorOrderUpdate:945` already routes through `aggregatorTransform` |
| `OrderCard.jsx` | NOT TOUCHED | Already reads `order.rider` (L912) and `order.riderStatus` (L922/933) correctly |
| `DeliveryCard.jsx` | NOT TOUCHED | Frozen per FILE_OWNERSHIP owner directive |
| `TableCard.jsx` | NOT TOUCHED | Already reads `riderStatus` correctly |
| `AggregatorDispatchModal.jsx` | NOT TOUCHED | Uses local `riderName` useState — unrelated to order model |

---

## Coverage Analysis — All Update Paths Covered by 1 Fix

Fixing `aggregatorTransform.aggregatorOrder()` covers all paths:

| Path | Flow | Covered? |
|---|---|---|
| Page load / boot | `aggregatorService.getAggregatorOrderList()` → `fromAPI.aggregatorOrderList()` → `aggregatorOrder()` | ✅ |
| Socket new order | `handleAggregatorNewOrder:925` → `aggregatorTransform.fromAPI.aggregatorOrder(payload)` | ✅ |
| Socket order update (rider assigned) | `handleAggregatorOrderUpdate:951` → `aggregatorTransform.fromAPI.aggregatorOrder(payload)` | ✅ |
| API fallback (socket payload missing) | `getAggregatorOrderList()` → `aggregatorOrderList()` → `aggregatorOrder()` | ✅ |

---

## Rollback Plan

**If regression is detected after implementation:**

The change is purely additive (new `rider:` and `riderStatus:` fields) plus removal of the orphaned `riderInfo:` block.

1. If `rider:` or `riderStatus:` cause unexpected UI issues → revert those two additions only. `riderName:` and `riderPhone:` remain untouched.
2. If `riderInfo:` removal caused a regression → restore the `riderInfo:` block from this doc (verbatim BEFORE block above, lines 87–94).
3. Full git rollback command: `git checkout HEAD -- src/api/transforms/aggregatorTransform.js`

---

## Verification Steps (Self-Test for Gate 5a)

After implementation, the implementer MUST verify:

### VS-1 — Static: grep confirms new fields emitted
```bash
grep -n "rider:\|riderStatus:\|riderInfo" /app/frontend/src/api/transforms/aggregatorTransform.js
# Expected:
#   rider:        appears (new)
#   riderStatus:  appears (new)
#   riderInfo:    does NOT appear (removed)
```

### VS-2 — Static: OrderCard still compiles
```bash
grep -n "order\.rider\b\|order\.riderStatus" /app/frontend/src/components/cards/OrderCard.jsx
# Expected: lines 912, 914, 922, 933 still present and unchanged
```

### VS-3 — Browser: Aggregator order with rider shows name
```
1. Load dashboard with an active Swiggy/Zomato delivery order that has a rider assigned
   (rider_info.id non-null in API response)
2. Expected: Rider section shows "VEERJINDER SINGH" (or actual rider name) instead of "Awaiting Runner"
3. Expected: Orange "Assigned" pill visible if fOrderStatus < 5
4. Expected: Green "Order Accepted" pill visible if fOrderStatus === 5
```

### VS-4 — Browser: Aggregator order without rider shows "Awaiting Runner"
```
1. Load an aggregator order where rider_info.id is null
2. Expected: "Awaiting Runner" text (unchanged behaviour)
3. Expected: No status badge visible
```

### VS-5 — Browser: POS own-delivery orders unaffected
```
1. Load a POS delivery order (non-aggregator, own delivery)
2. Expected: Rider section behaviour identical to before — NOT regressed
3. Confirm: No "Awaiting Runner" shown for POS orders that have a rider
```

### VS-6 — Browser: Socket update propagates rider
```
1. Have an aggregator order without a rider open on dashboard
2. Trigger a rider assignment (via Swiggy/Zomato platform or simulate with socket emit)
3. Expected: Card updates in real-time with rider name + "Assigned" badge
   (both direct-payload and API-fallback paths now use the fixed transform)
```

---

## Verification Matrix

| Test | What it catches | Pass criteria |
|---|---|---|
| VS-1 grep | Code deployed correctly | `rider:` + `riderStatus:` present; `riderInfo:` absent |
| VS-2 grep | No OrderCard regression | Existing reads untouched |
| VS-3 browser | GAP-R1 + GAP-R2 fixed | Rider name + status badge visible |
| VS-4 browser | No false positive | "Awaiting Runner" for no-rider orders |
| VS-5 browser | POS regression check | POS rider display unaffected |
| VS-6 browser | Socket path | Real-time update works |

---

## Registry Checklist

- [x] registry.json — BUG-291 status: `OWNER DECISIONS LOCKED — Gate 3 ready`
- [x] BUG_TRACKER.md — BUG-291 row updated with revised decisions
- [ ] registry.json — Update to `GATE 3 COMPLETE — AWAITING GATE 4 GO` (done by this plan)
- [ ] registry.json — Update to `IMPLEMENTED` after Gate 5
- [ ] registry.json — Update to `QA PASS` after Gate 5a
- [ ] registry.json — Update to `OWNER VERIFIED` after Gate 6

---

## Artifact Completeness

| Gate | Artifact | Status |
|---|---|---|
| 1 — Intake | `/app/memory/change_requests/BUG-291_AGGREGATOR_RIDER_DETAILS_NOT_DISPLAYED_INTAKE.md` | ✅ DONE |
| 2 — Impact Analysis | SKIPPED per owner instruction (2026-07-31) | ✅ WAIVED |
| 3 — Implementation Plan | This document | ✅ DONE |
| 4 — Gate 4 GO | Owner approval required | ⏳ PENDING |
| 5 — Implementation | Code edit in `aggregatorTransform.js` | ⏳ PENDING |
| 5a — Self-test | VS-1 through VS-6 above | ⏳ PENDING |
| 6 — Owner Smoke | Owner verifies on live UI | ⏳ PENDING |
