# BUG-526 — INTAKE
## Folio Checkout Button Gray When Room Split + CPP Split Both Active

**ID:** BUG-526
**Date:** 2026-10-09
**Registered by:** Agent (Role 1 — INTAKE)
**Sprint:** oct_bug_batch
**Gate:** GATE_1_INTAKE

---

## Evidence

- **Screenshots:** 4 owner screenshots (session 2026-10-09) — see §3 below
- **Steps to reproduce:** Provided by owner (§4)
- **Curl output:** N/A (frontend-only logic)
- **Source:** OWNER-REPORTED
- **Confidence:** CONFIRMED (owner reproduced; root cause confirmed by code trace in investigation `BUG-526_INVESTIGATION_REPORT_2026-10-09.md`)

---

## 1. Classification

| Field | Value |
|---|---|
| **Type** | BUG |
| **Severity** | **P1 — HIGH** |
| **Risk** | HIGH |
| **Area** | PMS → Room Checkout → FolioCheckoutPanel.jsx |
| **Duplicate check** | **DISTINCT** — BUG-525 is about split-legs cap (over/under balance); BUG-526 is about CPP `effectiveTotal` always including `roomBalance` regardless of room-split status |
| **Related items** | RELATED: BUG-525 (same component), OD-INV2-01 (CPP = food only, room via split legs) |
| **Blast radius** | SMALL — 1 file (`FolioCheckoutPanel.jsx`), ~3 lines |
| **Hotspot files** | NO — FolioCheckoutPanel.jsx is NOT in R5 hotspot list |
| **Fast Lane eligible** | NO — financial logic (checkout amount), R6 |

**Severity rationale:** P1 — checkout is completely unusable when the cashier combines CPP split payment + room split legs. No workaround (switching to a single CPP payment avoids the CPP-split path but doesn't achieve split-by-mode for food).

---

## 2. Symptom

When a cashier uses **both** room split legs (to split room rent by mode) **and** CPP split payment (to split food by mode), the Checkout button stays **gray and disabled** even after:
- CPP split "Remaining: ₹0.00" (food fully covered)
- Room split legs sum = room balance exactly (room fully covered)

The button label still shows the correct grand total ("Checkout ₹691") but is non-interactive.

---

## 3. Screenshots (Owner-Provided)

| # | Description |
|---|---|
| SS-1 | Bill Summary panel: Food Total ₹191, Room Balance ₹500, Grand Total ₹691. Checkout ₹691 button GRAY. |
| SS-2 | CPP payment split panel: Cash=100, UPI=91, Card=(empty). Checkout ₹691 button GRAY. |
| SS-3 | CPP card entry in split: Card selected, Txn ID=8888, Remaining ₹0.00. Checkout ₹691 button GRAY. |
| SS-4 | Full folio: bonk/r4, room discount ₹100 applied (balance=₹500), room split ON (cash=400, upi=100), room discount applied: -₹100. Bill Summary ₹691. |

---

## 4. Steps to Reproduce

1. Login → PMS → Front Desk → In-House tab → Click **Bill** on bonk guest (room r4)
2. Apply **23% food discount** via CPP discount category
3. Apply **₹100 flat room discount** in Room Discount section → Room balance = ₹500
4. Enable **Split room payment** → enter cash=400, upi=100 (sum=500 = room balance ✓)
5. In CPP payment section → click **Split** → Cash=100, UPI=91 (sum=191 = food total ✓)
6. Observe: "Remaining: ₹0.00" shown ✓ but **Checkout button gray** ✗

---

## 5. Root Cause (from investigation)

**Break point: `FolioCheckoutPanel.jsx:413`**

```
balance_due = Math.max(0, baseBalance - roomDiscountInfoRs)
           = 600 - 100 = 500  ← always 500, never zeroed when room split is active
```

This is passed to CPP as `roomInfo.roomPaymentSummary.remainingRoomBalance = 500`.

Inside CPP:
```
roomBalance = 500
effectiveTotal = finalTotal(191) + roomBalance(500) = 691

CPP split disabled check (L3311):
  splitTotal(191) < effectiveTotal(691)  →  TRUE  →  button DISABLED
```

"Remaining: ₹0.00" display (L2937) uses `finalTotal` (food-only, ₹191) — correct display but creates apparent contradiction with the disabled state.

**Root cause:** `balance_due` is never set to 0 when room split legs fully cover the room balance. CPP's `effectiveTotal` includes `roomBalance` (₹500) even though it has already been accounted for in `partial_payments_room`. CPP split is then required to cover ₹691 (food+room) instead of ₹191 (food only).

---

## 6. Owner Decisions — LOCKED

| OD | Decision | Value |
|---|---|---|
| OD-BUG526-01 | Backend `room_balance` requirement when `partial_payments_room` present | **Backend safe — `room_balance=0` or omitted; backend driven by `paid_room=yes` + `partial_payments_room[]`** |
| OD-BUG526-02 | "Remaining" display in CPP split when room split active | **Keep food-only (current behavior correct). No change needed.** |

---

## 7. Proposed Fix (for Gate 2-3 Planning)

**File:** `FolioCheckoutPanel.jsx:413`

When `roomSplitEnabled` is true AND `roomSplitTotal === effectiveRoomBalance` (room fully covered by legs), pass `balance_due: 0` so CPP sees `roomBalance = 0` and `effectiveTotal = finalTotal (food only)`.

```js
// Current:
balance_due: Math.max(0, (baseBalance ?? ...) - roomDiscountInfoRs)

// Proposed:
balance_due: (roomSplitEnabled && roomSplitTotal === effectiveRoomBalance)
  ? 0
  : Math.max(0, (baseBalance ?? ...) - roomDiscountInfoRs)
```

- Scope: 1 file, ~3 lines
- Risk: HIGH (checkout amount prop change, R6)
- NOT planning-skip eligible (financial, checkout payload)
- Execution order: can be parallel-safe with other FolioCheckoutPanel edits

---

## 8. Open Questions for Planning

- Q1: Should `balance_due: 0` also apply when `roomSplitTotal < effectiveRoomBalance` (partial room split)? Or only when legs exactly match?
  - Recommended: Only when `roomSplitTotal === effectiveRoomBalance` (fully covered), else partial split is ambiguous
- Q2: Does the backend payment payload `payment_amount` (from CPP `collectBillExisting`) need to remain as grand total (food+room) or should it be food-only when room split is active?
  - Needs curl probe in Gate 2 to verify backend API contract

---

## 9. Blast Radius

```
grep -rn "balance_due" /app/frontend/src/components/pms/frontdesk/FolioCheckoutPanel.jsx → 3 lines
```

- **Files:** 1 (`FolioCheckoutPanel.jsx`)
- **Lines:** ~3
- **Hotspot files:** NO
- **Scope:** SMALL

---

## 10. Intake Summary

```
BUG-526: Folio Checkout button gray when room split + CPP split both active
Type: Bug | Priority: P1 | Risk: HIGH
Area: PMS → FolioCheckoutPanel.jsx
Root cause: balance_due never 0 when room split covers room fully → CPP effectiveTotal = food+room → split disabled
Fix path: set balance_due:0 when roomSplitEnabled && roomSplitTotal === effectiveRoomBalance
OD-BUG526-01 LOCKED (backend safe with 0)
OD-BUG526-02 LOCKED (Remaining stays food-only)
Evidence: 4 owner screenshots + investigation report BUG-526_INVESTIGATION_REPORT_2026-10-09.md
Duplicate: DISTINCT (BUG-525 = leg cap; BUG-526 = CPP effectiveTotal)
Blast: SMALL (1 file ~3 lines)
Next: Gate 2 Impact Analysis (includes curl probe Q2 API contract)
```
