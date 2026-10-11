# INVESTIGATION REPORT — Checkout Button Gray (BUG-526 Trigger Scenario)
## Role 6 — INVESTIGATION (ALPHA v0.7)

```
Date:            2026-10-09
Trigger:         Owner scenario: 23% food-discount (category) + ₹100 flat room-discount + room
                 split legs (cash=400, upi=100) + CPP split (Cash=100, UPI=91) → Checkout
                 button stays GRAY despite CPP "Remaining: ₹0.00"
Steps used:      4 / 10
Code changed:    NONE
Related:         BUG-526 (unregistered), OD-INV2-01
```

---

## 1. Summary

| Field | Value |
|---|---|
| Root cause | **BUG-526** — `FolioCheckoutPanel.jsx:413` always passes `balance_due = ₹500` to CPP regardless of room-split status. CPP's `roomBalance = 500`, so `effectiveTotal = food(191) + room(500) = 691`. The disabled check (`splitTotal < effectiveTotal`) compares split total ₹191 against ₹691, not ₹191 → button stays gray. |
| Classification | INTERACTION_BUG (room split legs vs CPP split disabled logic) |
| Confidence | HIGH — both the break line and the mathematical values confirmed in code |

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Steps | Result | Evidence |
|---|---|---|---|---|---|
| H1 | Checkout gray because CPP split total < effectiveTotal (disabled condition) | Code trace: CPP L3311 disabled condition + L731-734 effectiveTotal | 1 | **CONFIRMED** | CPP L3311: `splitTotal(191) < effectiveTotal(691)` → true → disabled |
| H2 | "Remaining: ₹0.00" uses finalTotal (food-only) rather than effectiveTotal → user sees false "all done" signal | Code trace: CPP L2937 Remaining display | 2 | **CONFIRMED** | CPP L2937: `finalTotal(191) - splitTotal(191) = 0` → shows ₹0.00 |
| H3 | balance_due never set to 0 when room split covers room fully → roomBalance always ≠ 0 in CPP | Code trace: FolioCheckoutPanel.jsx L413 | 3 | **CONFIRMED** | L413: `balance_due = Math.max(0, baseBalance - roomDiscountInfoRs)` — no room-split guard |
| H4 | BUG-525-FIX (roomSplitOverBalance check) caused a regression here | Code trace: roomSplitOverBalance useMemo | 4 | **ELIMINATED** — roomSplitTotal(500) === effectiveRoomBalance(500) → roomSplitOverBalance = false; no impact | FolioCheckoutPanel.jsx L293-298 |

---

## 3. Data Flow Trace — Full Break Point

```
SCENARIO INPUTS:
  baseBalance         = 600 (folio room balance)
  roomDiscountInfoRs  = 100 (₹100 flat room discount entered)
  roomSplitEnabled    = true
  roomSplitLegs       = [cash=400, upi=100] → roomSplitTotal = 500

  order.amount (food) = 248 (folio; includes SC)
  CPP food discount   = 23% → finalTotal ≈ 191
  associatedOrders    = [] (no dine-in transfers)

─── FolioCheckoutPanel → CPP props ──────────────────────────────────────────
  L413: balance_due = Math.max(0, 600 - 100) = 500      ← NEVER zeroed for room split

─── Inside CPP ──────────────────────────────────────────────────────────────
  L200: roomBalance = roomInfo.roomPaymentSummary.remainingRoomBalance
                    = charge.balance_due = 500

  L731-734: effectiveTotal = finalTotal(191) + 0(no assocOrders) + roomBalance(500) = 691

─── CPP split (user: Cash=100, UPI=91, Card=0) ──────────────────────────────
  splitTotal = 100 + 91 + 0 = 191

─── "Remaining" display ─────────────────────────────────────────────────────
  L2937: Remaining = finalTotal(191) - splitTotal(191) = 0  → "Remaining: ₹0.00"
         ↑ uses finalTotal (FOOD-ONLY) — correct for food coverage, misleading overall

─── Disabled check ──────────────────────────────────────────────────────────
  L3311: (showSplit && splitType='payment' && splitTotal(191) < effectiveTotal(691))
         = true  → button DISABLED (gray)  ← BREAK POINT

─── User sees ───────────────────────────────────────────────────────────────
  "Remaining: ₹0.00" (food covered)  +  Checkout button GRAY (room not covered in CPP)
  ← CONTRADICTION
```

---

## 4. Why It's BUG-526

From the previous session handover (§4 — Open Items):

> **BUG-526 (unregistered):** FolioCheckoutPanel passes non-zero `balance_due` to CPP → grand total = food + room.
> Fix: pass `balance_due: 0` in roomInfo override.
> OD-INV2-01 resolved: CPP = food only; room rent via Split room payment legs.

The scenario here is exactly BUG-526 manifesting through the CPP split-payment disabled path:
- Single-payment CPP: user enters cash/card/UPI = ₹691 → effectiveTotal check passes → fine
- CPP split payment: user distributes ₹191 (food) across Cash+UPI → split total ₹191 < effectiveTotal ₹691 → button gray even though food is fully covered and room is covered by room legs

---

## 5. Additional Observation — "Remaining" Misleads

CPP's "Remaining" display (L2937) uses `finalTotal` (food-only ₹191) not `effectiveTotal` (food+room ₹691). This is intentional for the food-only context (room is already shown in Bill Summary). However, when CPP split is used alongside room split legs, the user reasonably interprets "Remaining: ₹0.00" as "all done" when in fact CPP's disabled check needs ₹500 more. This UX conflict should be noted in the BUG-526 plan.

---

## 6. Recommendations

### Fix Path (BUG-526)
**File:** `FolioCheckoutPanel.jsx` — L413 inside `roomInfo` override
**Change:** When `roomSplitEnabled` is true AND `roomSplitTotal === effectiveRoomBalance` (room fully covered by legs), pass `balance_due: 0` so CPP's `roomBalance = 0` and `effectiveTotal = finalTotal (food only)`.

```
Current L413:
  balance_due: Math.max(0, (baseBalance ?? ...) - roomDiscountInfoRs)

Proposed:
  balance_due: (roomSplitEnabled && roomSplitTotal === effectiveRoomBalance)
    ? 0   // room fully covered by split legs → CPP handles food only
    : Math.max(0, (baseBalance ?? ...) - roomDiscountInfoRs)
```

**Planning skip eligible:** NO
- Touches payment amount passed to CPP (financial logic, R6)
- `balance_due: 0` changes the room balance CPP sees → changes `effectiveTotal` used in `collectBillExisting` → impacts backend payment payload
- Must go through full Gate 2-3 impact analysis (especially: what does backend do with `room_balance = 0` in payload when room split legs are present?)
- Backend API contract must be verified before implementing

**Risk:** HIGH — room billing, backend API contract

**Owner decisions needed:**
- OD-BUG526-01 (already from handover, pending): Confirm the backend payment API accepts `room_balance = 0` in checkout payload when `partial_payments_room` is non-empty
- OD-BUG526-02: Should "Remaining: ₹0.00" in CPP split show food-only (current) or food+room (effectiveTotal)? Cashier guidance implication.

---

## 7. Retroactive Candidates

BUG-526 is documented in the session handover as unregistered. This scenario provides additional concrete evidence:
- **BUG-526** → recommend INTAKE registration (not just a handover note). Severity: **P1** (checkout unusable when both room split + CPP split active). Risk: HIGH.

---

## Investigation Handover

```
Root cause: INTERACTION_BUG — FolioCheckoutPanel.jsx:413 passes balance_due=500 to CPP
  regardless of room-split status; CPP effectiveTotal includes roomBalance(500) in split
  disabled check; CPP split total(191=food) < effectiveTotal(691=food+room) → gray.
  "Remaining: ₹0.00" is correct for food coverage but does not reflect effectiveTotal.

Confidence: HIGH (break line confirmed, values mathematically verified in code).
Steps: 4/10.

FE fix: YES — FolioCheckoutPanel.jsx:413 (1 file, ~3 lines, financial → full gate cycle).
Backend ask: YES — confirm API accepts room_balance=0 when partial_payments_room present.
Planning skip: NOT eligible (financial, checkout payload, R6).
Owner decisions: OD-BUG526-01 (API contract) + OD-BUG526-02 (Remaining UX).

Next: Register BUG-526 via INTAKE → PLANNING (Gate 2-3) → owner Gate 4 GO → IMPLEMENTATION.
Report at: /app/memory/BUG-526_INVESTIGATION_REPORT_2026-10-09.md
```
