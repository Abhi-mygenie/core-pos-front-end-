# BUG-360 — Impact Analysis: Room Checkout Uses Stale balance_payment

**Gate:** 2 — Impact Analysis
**Date:** 2026-08-26
**Code Reality:** NONE (bug confirmed at CollectPaymentPanel.jsx:195)
**Conflict Pre-Check:** CollectPaymentPanel.jsx last touched by BUG-304 (2026-08-11, taxTotals split at lines ~700-900). This fix targets lines 194-196 (roomBalance useMemo). Different section — PARALLEL-SAFE. Mark as RELATED: BUG-304.
**Risk:** CRITICAL (room billing, financial checkout payload)

---

## Data Flow Trace

### Current (broken)
```
roomInfo.balancePayment                    ← static, computed at check-in: room_price − advance
        ↓ CollectPaymentPanel:195
Math.max(0, roomInfo.balancePayment || 0)  ← stale snapshot, never updates
        = roomBalance
        ↓ line 725
effectiveTotal = finalTotal + associatedTotal + roomBalance
        ↓ checkout payload grand_total
```

### Fixed
```
roomInfo.roomPaymentSummary?.remainingRoomBalance  ← live, backend updates on every mid-stay payment
        ?? roomInfo.balancePayment                  ← fallback: when no mid-stay payments exist
        ↓ CollectPaymentPanel:195
Math.max(0, liveBalance)                           ← correct: 0 when fully paid, positive otherwise
        = roomBalance  (same downstream)
        ↓ effectiveTotal, grand_total — unchanged
```

---

## What Changes

### E1 — `CollectPaymentPanel.jsx:195` (1-line fix)

**Current:**
```js
() => (isRoom && roomInfo ? Math.max(0, roomInfo.balancePayment || 0) : 0),
```

**Fixed:**
```js
// BUG-360: use live remaining balance when mid-stay payments have been recorded
() => (isRoom && roomInfo
  ? Math.max(0, roomInfo.roomPaymentSummary?.remainingRoomBalance ?? roomInfo.balancePayment ?? 0)
  : 0),
```

**Downstream impact of E1:**
- `effectiveTotal` (line 725): unchanged formula, value now correct
- `roomBalance > 0` guard (line 2645): unchanged, now triggers correctly when there is still a balance
- Checkout payload `grand_total`: automatically correct — passes through `effectiveTotal`
- **Math.max(0,...) clamp stays** — by owner OD-1: when balance ≤ 0 (advance covered everything or excess), checkout shows ₹0 and passes ₹0 in payload

### E2 — `RoomRowCard.jsx` — NUANCED (OD-2: fix in same CR)

**Current issue:** `balance` (line 393) reads `ri.balancePayment` — used in TWO ways:

| Usage | Code | Needs |
|---|---|---|
| `roomService` stripping formula (line 402-403) | `roomOrderAmount - balance - associatedTotal` | `balancePayment` (original agreed balance for correct arithmetic) |
| Display via `RoomBillingCard` (line 594) | `balance={numbers.balance}` | Live `remainingRoomBalance` (shows what was actually still owed) |

**Fix: split into two variables**

```js
// BUG-360: balanceForFormula = original agreed balance (correct for roomService arithmetic)
// displayBalance = live remaining (correct for display in report)
const balance          = parseFloat(ri.balancePayment) || 0;  // keep for formula
const displayBalance   = parseFloat(
  ri.roomPaymentSummary?.remainingRoomBalance ?? ri.balancePayment
) || 0;  // for display
```

**RoomBillingCard call (line 594):** Change `balance={numbers.balance}` → `balance={numbers.displayBalance}`

**Outstanding calc (line 411):** Uses `total - paid`, not `balance` directly — unaffected.

---

## Files WILL Change

| File | Edit | Lines | Risk |
|---|---|---|---|
| `components/order-entry/CollectPaymentPanel.jsx` | Line 195: read `remainingRoomBalance ?? balancePayment` | 1 | CRITICAL (R5 hotspot) |
| `components/reports/RoomRowCard.jsx` | Line 393: add `displayBalance` variable + line 594: pass to RoomBillingCard | ~3 | MEDIUM |

## Files Will NOT Touch

`orderTransform.js` — `roomBalance` is passed through as-is to `grand_total`, no formula change needed there. `roomService.js`, `RoomOrdersReportPage.jsx`, any other file.

---

## Critical Safety Note

The `Math.max(0, ...)` clamp at CollectPaymentPanel:195 **must remain**. By OD-1, when `remainingRoomBalance` is 0 or negative (advance covered everything), checkout passes ₹0 in the payload — no refund UI. The clamp is the mechanism. Only the input to the clamp changes.

The `??` fallback (`?? roomInfo.balancePayment`) ensures that if `room_payment_summary` is null (no mid-stay payments were ever made), the behaviour is identical to today — `balancePayment` is used as before.

---

## Verification Matrix

| Edit | File | How to Verify | Automated? |
|---|---|---|---|
| E1 — mid-stay paid | CollectPaymentPanel | Book room → make mid-stay payment → open checkout → roomBalance should be ₹0 (or reduced amount) | NO — needs live room |
| E1 — no mid-stay | CollectPaymentPanel | Book room → no mid-stay payment → checkout shows `balancePayment` (unchanged behaviour) | NO |
| E1 — excess advance | CollectPaymentPanel | Book room ₹1000 + advance ₹1500 → checkout roomBalance = ₹0 (clamped) | NO |
| E2 display | RoomRowCard | Room Orders Report → in-house room → Balance card shows `remainingRoomBalance`, not stale `balancePayment` | NO |
| E2 formula safe | RoomRowCard | Settled room → food and total columns unchanged after fix | NO |

---

## Owner Approval Gate

**MANDATORY before Gate 3.** This is CRITICAL (room billing / money). Owner must approve the Implementation Plan before any code is written.

---

## Post-Code Registry Checklist

- [ ] registry.json: BUG-360 → status: IMPLEMENTED, gate: 5
- [ ] BUG_TRACKER.md: row updated  
- [ ] FILE_OWNERSHIP.md: CollectPaymentPanel.jsx + RoomRowCard.jsx listed
- [ ] Code markers: `// BUG-360` on every modified line
- [ ] Compile: 0 new warnings
