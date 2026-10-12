# BUG-526 — IMPACT ANALYSIS (Gate 2)
## Folio Checkout Button Gray When Room Split + CPP Split Both Active

**Date:** 2026-10-09
**Role:** PLANNING (Gate 2)
**Status:** GATE_2_IMPACT_ANALYSIS
**Sprint:** oct_bug_batch

---

## Code Reality: NONE

```bash
grep -rn "BUG-526" /app/frontend/src/  # 0 results
```
No fix exists yet. Proceeding with full plan.

---

## Conflict Pre-check

| File | Last modified by | Date | Conflict? |
|---|---|---|---|
| `FolioCheckoutPanel.jsx` | BUG-525-FIX + BUG-519-FIX | 2026-10-09 | NO — target L413 is unchanged by those fixes |
| `FolioCheckoutPanel.jsx` | BUG-524 (L54, L77) | 2026-10-09 | NO — different line |
| `FolioCheckoutPanel.jsx` | BUG-522 (roomApplyTo removal, handlePaid) | 2026-10-09 | NO — parallel-safe |

**No conflicts.** All recent changes to FolioCheckoutPanel targeted different lines.

---

## Risk Classification

**Risk: HIGH**
- Touches checkout payment props passed to CollectPaymentPanel
- Affects `balance_due` → `roomBalance` → `effectiveTotal` in CPP
- Boundary: financial/checkout payload (R6)
- NOT planning-skip eligible

---

## Data Flow Trace

### Full chain when `balance_due` is zeroed

```
CONDITION: roomSplitEnabled=true AND roomSplitTotal(500) === effectiveRoomBalance(500)

FolioCheckoutPanel.jsx:413 (TARGET)
  balance_due = 0   (was 500)
      ↓
frontDeskService.roomInfoFromCharge (L174):
  roomPaymentSummary.remainingRoomBalance = charge.balance_due = 0
      ↓
CollectPaymentPanel.jsx:200:
  roomBalance = roomInfo.roomPaymentSummary?.remainingRoomBalance = 0  (was 500)
      ↓
CPP:731-734:
  effectiveTotal = finalTotal(191) + roomBalance(0) = 191  (was 691)
      ↓
CPP:3311 (split disabled check):
  splitTotal(191) < effectiveTotal(191) → FALSE → button ENABLED ✓  (was 191<691=TRUE → DISABLED ✗)
CPP:3308 (cash disabled check):
  amountReceived < effectiveTotal(191) → when cashier enters 191, FALSE → enabled ✓
CPP:3308 (card check):
  no change (card check is only txn ID length) ✓
      ↓
CPP handlePayment:
  paymentData.finalTotal = effectiveTotal = 191
  paymentData.roomBalance = roomBalance = 0
      ↓
orderTransform.collectBillExisting:
  fbOnlyTotal = Math.max(0, finalTotal(191) - roomBalance(0)) = 191  ← SAME as before (was 691-500=191) ✓
  payment_amount = fbOnlyTotal = 191  ← UNCHANGED ✓
  grant_amount = fbOnlyTotal = 191    ← UNCHANGED ✓
  paid_room = 'yes' (table.isRoom=true, unaffected by roomBalance)  ← UNCHANGED ✓
  order_amount: NOT emitted (roomBalance=0, conditional L1658)  ← was 191; now omitted
      ↓
FolioCheckoutPanel handlePaid (post-CPP):
  payload.partial_payments_room = [{cash:400},{upi:100}]  ← UNCHANGED ✓
  payload.room_discount = 100 (if roomDiscount>0)         ← UNCHANGED ✓
  payload.room_gst_tax = displaySgst+displayCgst          ← UNCHANGED ✓
```

---

## Backend Payload Impact

| Field | Current (roomBalance=500) | After fix (roomBalance=0) | Status |
|---|---|---|---|
| `payment_amount` | `691 - 500 = 191` | `191 - 0 = 191` | **SAME** ✓ |
| `grant_amount` | `191` | `191` | **SAME** ✓ |
| `paid_room` | `'yes'` | `'yes'` | **SAME** ✓ |
| `partial_payments_room` | `[{cash:400},{upi:100}]` | `[{cash:400},{upi:100}]` | **SAME** ✓ |
| `room_discount*` fields | unchanged | unchanged | **SAME** ✓ |
| `order_amount` | `191` (emitted) | **NOT emitted** | **DIFFERENT** |

**`order_amount` omission is safe** per OD-BUG526-01: "backend is driven only by `paid_room=yes` + `partial_payments_room[]`; safe to send 0 or omit the key."

`payment_amount` and `grant_amount` are F&B-only in both cases (BUG-484 formula: `fbOnlyTotal = finalTotal - roomBalance` → same 191 regardless). **No curl probe needed.**

---

## Display Impact (CPP UI)

When `roomBalance = 0` (fix active):

| CPP element | Current | After fix | Acceptable? |
|---|---|---|---|
| Sticky header "BILL SUMMARY" | ₹691 | ₹191 | **YES** — CPP collects food-only per OD-INV2-01 |
| Grand Total Stack "Food Total" | ₹191 | ₹191 | Same ✓ |
| Grand Total Stack "Room Balance" row | ₹500 | **HIDDEN** (roomBalance=0 guard at L2660) | **YES** — room IS hidden since it's handled by room split legs above CPP |
| Grand Total Stack "Grand Total" | ₹691 | ₹191 | **YES** — CPP's grand total = food-only ✓ |
| Checkout button label | "Checkout ₹691" | "Checkout ₹191" | **YES** — CPP collects food portion only |
| Cash received prefill | ₹691 | ₹191 | **YES** — auto-fills with food amount ✓ |
| Split "Remaining" display | ₹0.00 (food-only) | ₹0.00 (food-only) | Same ✓ |

**Design alignment:** OD-INV2-01 states "CPP = food only; room rent via Split room payment legs." Showing CPP Grand Total = ₹191 (food only) is the CORRECT behavior per this decision. The cashier sees:
- Room split legs (above CPP): Cash=400 + UPI=100 = ₹500 (room) ✓
- CPP (below): Grand Total = ₹191, "Checkout ₹191" ← food only ✓
- Total to guest = ₹500 + ₹191 = ₹691 ✓

---

## Affected File — Single Target

`src/components/pms/frontdesk/FolioCheckoutPanel.jsx:413`

**Current:**
```js
balance_due: Math.max(0, (baseBalance ?? Number(row.charge?.balance_due || 0)) - roomDiscountInfoRs) // BUG-498
```

**Target:**
```js
balance_due: (roomSplitEnabled && roomSplitTotal === effectiveRoomBalance)
  ? 0  // BUG-526: room fully covered by split legs → CPP handles food only
  : Math.max(0, (baseBalance ?? Number(row.charge?.balance_due || 0)) - roomDiscountInfoRs) // BUG-498
```

**Variables already in scope at L413:**
- `roomSplitEnabled` — state variable (L219)
- `roomSplitTotal` — useMemo (L281-283)
- `effectiveRoomBalance` — useMemo (L289-292)

No new state or imports needed. ~4 lines changed.

---

## Downstream Consumers of `balance_due` within the Override

The `balance_due` override at L413 flows **only** to `roomInfoFromCharge → roomPaymentSummary.remainingRoomBalance → CPP roomBalance`. No other component reads this prop directly.

The Statement component (left panel) does NOT use CPP's `roomBalance` — it uses `baseBalance ?? c.balance_due` from `row.charge` directly. Statement display is UNAFFECTED. ✓

---

## Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Floating-point mismatch: `roomSplitTotal === effectiveRoomBalance` (e.g., 300.1+200.0 vs 500.1) | LOW | HIGH — condition never fires, bug persists | Use `Math.abs(roomSplitTotal - effectiveRoomBalance) < 0.01` in condition |
| R2 | Cashier confusion: CPP shows ₹191 but full bill is ₹691 | LOW | LOW — room split UI above CPP makes room payment visible | Acceptable per OD-INV2-01; no mitigation needed |
| R3 | CPP Bill Summary shows ₹191 in non-split scenarios (condition guard fails) | VERY LOW | HIGH | Condition gated on `roomSplitEnabled && exact match` — harmless when false |
| R4 | `order_amount` not sent — backend regression for some flow | LOW | MEDIUM | OD-BUG526-01 confirmed safe; fbOnlyTotal formula unchanged |

---

## Execution Sequence

Single edit in `FolioCheckoutPanel.jsx` at L413. All required variables (`roomSplitEnabled`, `roomSplitTotal`, `effectiveRoomBalance`) are already in scope.

---

## Scope Lock

**Files WILL change:**
- `src/components/pms/frontdesk/FolioCheckoutPanel.jsx` — 1 edit, ~4 lines

**Files WILL NOT touch:**
- `CollectPaymentPanel.jsx` (R5) ← NOT needed ✓
- `orderTransform.js` (R5) ← NOT needed ✓
- `frontDeskService.js` ← NOT needed ✓
- `frontdesk.css` ← NOT needed ✓
- Any test files

---

## Gate 2 Owner Decisions

**None required** — all decisions already locked:
- OD-BUG526-01: backend safe with `room_balance=0` ✓
- OD-BUG526-02: Remaining stays food-only ✓
- OD-INV2-01: CPP = food only ✓

---

## Summary

```
Code Reality: NONE
Conflict: NONE
Risk: HIGH (financial, R6) — planning skip NOT eligible
Files WILL change: FolioCheckoutPanel.jsx (1 file, ~4 lines)
Files WILL NOT touch: CollectPaymentPanel.jsx (R5), orderTransform.js (R5)
Backend payload: payment_amount UNCHANGED (191); order_amount omitted (safe per OD-BUG526-01)
Display: CPP shows food-only total when room split active (per OD-INV2-01)
Owner decisions: NONE (all locked)
Ready for Gate 3 GO → Implementation Plan
```
