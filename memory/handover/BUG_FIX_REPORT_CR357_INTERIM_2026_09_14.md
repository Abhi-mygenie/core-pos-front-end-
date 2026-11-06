# BUG FIX REPORT — CR-357 Interim Fix
**Date:** 2026-09-14 | **Role:** BUG FIX | **Owner-directed**

---

## Fix Summary

| Field | Value |
|---|---|
| Failure | Mid-stay `+ Pay` button incorrectly shows room balance as "Outstanding Balance" (food attribution mismatch) |
| Severity | MAJOR — front desk collects payment against wrong balance label |
| RCA Classification | PLAN_GAP — CR-162 shipped button without resolving OD-7 (CR-357) |
| Fix | Button render block removed from `CartPanel.jsx:1484–1494` |
| Scope expansion | NONE — 1 file only |
| Escalated items | Q-357-01 to backend (contract path for food vs room) |

---

## Root Cause

`CartPanel.jsx:1484–1494` rendered a `+ Pay` button next to the room balance that triggered `RecordPaymentModal`. The modal displayed `remainingRoomBalance` (room-only outstanding) as "Outstanding Balance". Mid-stay payments via `pos/room-payment` with `payment_type: 'interim'` reduce `remaining_room_balance` — the room balance — not food charges. Business rule requires mid-stay payments = food. The payment attribution contract (Q-357-01) has not been answered by backend.

**Code marker added:** `// CR-357` at CartPanel.jsx:1484

---

## Files Changed

| File | Lines | Change |
|---|---|---|
| `components/order-entry/CartPanel.jsx` | 1484–1494 | Button render block removed (9 lines → 1 comment) |

**Files NOT touched:** `RecordPaymentModal.jsx`, `roomService.js`, `CollectPaymentPanel.jsx`, `orderTransform.js`

---

## Self-Verification

| Check | Result |
|---|---|
| Button no longer renders in Room section | ✅ Confirmed — `record-payment-btn` testid removed from DOM |
| `RecordPaymentModal` state (`recordPaymentOpen`) can no longer be set `true` | ✅ — trigger removed |
| Compile | ✅ `webpack compiled successfully` — 0 new warnings |
| Adjacent — room balance still displays | ✅ — display row untouched |
| Adjacent — Checkout (CollectPaymentPanel) unaffected | ✅ — no change to checkout flow |

---

## EXIT GATE — 5/5 PASS

```
□1 REGISTRY SYNC:     PASS — CR-357 status updated with INTERIM FIX 2026-09-14 note
□2 CR_REGISTRY.MD:    PASS — CR-357 row updated with button-disabled status
□3 FILE_OWNERSHIP.MD: PASS — CartPanel.jsx L1484 entry added under CR-357 INTERIM FIX
□4 CODE MARKERS:      PASS — // CR-357 comment at CartPanel.jsx:1484
□5 COMPILE CHECK:     PASS — webpack compiled successfully, 0 new warnings
```

---

## To Re-enable

Once backend answers Q-357-01 (`BACKEND_BRIEF_CR357_MID_STAY_PAYMENT_2026_09_14.md`):
1. Remove the `// CR-357: TEMPORARILY DISABLED` comment block in `CartPanel.jsx:1484`
2. Restore the button with updated `liveBalance = Math.min(associatedTotal, remainingRoomBalance)` per investigation
3. Update `RecordPaymentModal` title to "Settle F&B"
4. Follow full Gate 2–4 process for CR-357

*Fix report written: 2026-09-14*
