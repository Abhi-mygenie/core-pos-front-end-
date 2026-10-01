# BUG-360 — Room Checkout: Uses Stale `balance_payment` Instead of Live `remaining_room_balance`

**Date:** 2026-08-26
**Registered by:** INTAKE agent (session investigation)
**Source:** AGENT-DISCOVERED (investigation session 2026-08-26 — advance/deposit lifecycle trace)
**Sprint:** POS 5.1 backlog
**Related:** CR-162 (mid-stay payment feature, Gate 2 CLOSED) · INV-ROOM-001 (investigation COMPLETE)

---

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Severity | **P1** |
| Risk | **CRITICAL** |
| Side | Frontend |
| Root cause | CODE_ERROR |
| Duplicate check | **DISTINCT** · Related: CR-162, INV-ROOM-001 |
| Code reality | NONE (bug confirmed in code — fix not present) |
| Blast radius | **MEDIUM** (1 targeted fix line; 13 files touch these fields) |
| Fast Lane eligible | **NO** — CRITICAL risk, R5 hotspot, full gate flow required |
| Owner approval | **MANDATORY** before implementation |

---

## Description

When a guest makes one or more mid-stay payments (via CR-162's `recordPartialPayment` API), the backend correctly updates `room_payment_summary.remaining_room_balance` to reflect the live outstanding balance. However, the checkout screen (`CollectPaymentPanel.jsx`) **ignores this live field entirely** — it reads the original `balance_payment` value that was computed and stored at check-in time.

This means a cashier at checkout will be asked to collect the same amount that was already paid during the stay — a **double-collection**.

---

## Root Cause

**`CollectPaymentPanel.jsx` lines 194–196:**
```js
const roomBalance = useMemo(
  () => (isRoom && roomInfo ? Math.max(0, roomInfo.balancePayment || 0) : 0),
  [isRoom, roomInfo]
);
```

`roomInfo.balancePayment` = **static snapshot** (`room_price − advance_payment` computed at check-in, never updated).

The live field is already fetched and available on the same `roomInfo` object:
`roomInfo.roomPaymentSummary?.remainingRoomBalance` = **live outstanding** (backend updates on every `recordPartialPayment` call).

The `orderTransform.js` comment at line 427 explicitly documents this: *"Use `roomPaymentSummary?.remainingRoomBalance ?? balancePayment` for live-safe reads."* — the pattern was documented but never applied to the checkout screen.

---

## Concrete Examples

### Example A — Mid-stay double collection
| Event | Amount |
|---|---|
| Room price | ₹2,000 |
| Advance at check-in | ₹500 |
| `balancePayment` stored at check-in | ₹1,500 |
| Mid-stay payment during stay | ₹1,500 |
| `remaining_room_balance` (backend, live) | **₹0** |
| What checkout screen shows as roomBalance | **₹1,500** (stale) |
| **Double-collection risk** | **₹1,500 asked again** |

### Example B — Excess advance (advance > room price)
| Event | Amount |
|---|---|
| Room price | ₹2,000 |
| Advance at check-in | ₹3,000 |
| `balancePayment` stored | −₹1,000 (negative) |
| `roomBalance` at checkout | `Math.max(0, -1000)` = **₹0** |
| Refund due to guest | **₹1,000 — not shown anywhere** |

Both problems stem from the same line. Fixing to use `remainingRoomBalance` resolves Example A. Example B still needs a separate "refund due" display (logged as a secondary gap below).

---

## Proposed Fix (Gate 3 will lock exact implementation)

Change `CollectPaymentPanel.jsx:195` from:
```js
() => (isRoom && roomInfo ? Math.max(0, roomInfo.balancePayment || 0) : 0),
```
to:
```js
// BUG-360: use live remaining balance from mid-stay payment ledger if available
() => (isRoom && roomInfo
  ? Math.max(0, roomInfo.roomPaymentSummary?.remainingRoomBalance ?? roomInfo.balancePayment ?? 0)
  : 0),
```

This follows the pattern documented in `orderTransform.js` line 427.

---

## Secondary Gap (out of scope for this fix — register separately if owner approves)

When `remainingRoomBalance < 0` (advance covers everything plus more), the guest is owed a refund. Currently this is clamped to ₹0 and never surfaced. A "Refund Due" or "Change Due" display would be a separate CR.

---

## Evidence

- File: `src/components/order-entry/CollectPaymentPanel.jsx` line 194–196
- Live field available at: `roomInfo.roomPaymentSummary?.remainingRoomBalance` (mapped in `orderTransform.js:429`)
- CR-162 introduced `recordPartialPayment` API + backend returns updated `room_payment_summary` — but checkout screen was never updated to read the live field
- `orderTransform.js:427` comment explicitly calls out the correct read pattern — was never applied to checkout
- Confidence: **HIGH** (code-confirmed, no live test needed to validate root cause)

## Hotspot Files

| File | Risk | Notes |
|---|---|---|
| `CollectPaymentPanel.jsx` | R5 CRITICAL | Core checkout, financial, payment payload |
| `orderTransform.js` | R5 CRITICAL | `collectBillExisting` passes `roomBalance` through to grand_total |

## Owner Decisions — LOCKED 2026-08-26

| OD | Decision | Owner directive |
|---|---|---|
| **OD-1** | When `remainingRoomBalance ≤ 0` (advance covers everything) — **pass ₹0 in payment payload, proceed with checkout normally. No "Refund Due" display.** No refund process exists in the system. | "we dont have refund process so check out will happen and zero will be passed in pay" |
| **OD-2** | Fix `RoomRowCard.jsx` (Room Orders Report) **in the same BUG-360 fix** — not a separate CR. | "if this can be done in same CR will be part of this CR" |

**Implementation consequence of OD-1:**
The `Math.max(0, ...)` clamp is correct behaviour — it must stay. The bug is specifically that the *wrong input* is being clamped. Once fixed to use `remainingRoomBalance`, the clamp will correctly resolve:
- Unpaid balance → positive → collected at checkout ✓
- Fully paid via mid-stay → ₹0 → checkout passes 0 ✓
- Excess advance → negative → clamped to ₹0 → checkout passes 0 ✓ (no refund UI needed)

## Process Required

Full gate flow + **owner approval** before implementation. CRITICAL (money, room billing). No Fast Lane.
