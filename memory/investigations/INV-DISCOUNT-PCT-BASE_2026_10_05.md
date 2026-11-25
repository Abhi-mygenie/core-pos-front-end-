# INVESTIGATION — Room Discount % Base Confusion + Cross-Component Inconsistency
**Date:** 2026-10-05
**Triggered by:** Owner screenshot + question: "100% discount = -₹1,075 but room is ₹1,500 — confusing? Should % be limited when advance is paid?"
**Screenshot:** FolioCheckoutPanel (FD v2 checkout), Percent 100%, advance ₹500, room ₹1,500

---

## 1. Summary

**Root cause:** Two separate findings.

**Finding 1 (the screenshot question — CORRECT BEHAVIOR, no bug):** 100% Percent discount at checkout correctly shows -₹1,075 because the percentage base in FolioCheckoutPanel is `balance_due` (what the guest still owes = ₹1,575 − ₹500 = ₹1,075). The ₹500 advance was already collected and cannot be reversed by a checkout discount. 100% of the remaining balance = full waiver = ₹0 due. This is semantically correct.

**Finding 2 (PLAN_GAP — inconsistency introduced by BUG-490/491):** The percentage base is NOT consistent across the three discount entry points:

| Component | % Base | 50% on this booking → ₹ |
|-----------|--------|--------------------------|
| `CheckInForm.jsx` | `c.booking_charge` = ₹1,500 | ₹750 (capped at ₹1,075 → ₹750) |
| `CheckInPage.jsx` | `form.orderAmount` = ₹1,500 | ₹750 (capped at ₹1,075 → ₹750) |
| `FolioCheckoutPanel.jsx` | `c.balance_due` = ₹1,075 | ₹537 |

For percentages < ~71.67% (= balance_due / booking_charge), CheckInPage/Form produce a HIGHER ₹ discount than FolioCheckoutPanel for the same % input. The same "50%" on the same booking means ₹750 at check-in but ₹537 at checkout. This is confusing for staff and inconsistent with the server's intent.

**Classification:** Finding 1 = CORRECT_BEHAVIOR (no fix needed). Finding 2 = PLAN_GAP / FE_BUG (inconsistency introduced by BUG-490 + BUG-491 using different bases).
**Confidence:** HIGH (full code trace, no ambiguity)
**Steps used:** 4/10

---

## 2. Hypotheses Tested

| # | Hypothesis | Test | Result | Evidence |
|---|-----------|------|--------|---------|
| H1 | Screenshot is WRONG — 100% should show -₹1,500 | Code trace: FolioCheckoutPanel `roomDiscountRs` useMemo base | **ELIMINATED** — base is `c.balance_due`, 100% × ₹1,075 = ₹1,075 = correct |
| H2 | Screenshot is CORRECT — base = balance_due; 100% of remaining balance = ₹1,075 | Code trace: `handlePaid` L237 base + display useMemo L43-50 | **CONFIRMED** — both use `balance_due`; payload ₹1,075 = display ₹1,075 |
| H3 | There is a cross-component inconsistency in % base | Code traces: CheckInPage L267 vs FolioCheckoutPanel L47 | **CONFIRMED** — CheckInPage uses `form.orderAmount` (booking_charge), FolioCheckoutPanel uses `c.balance_due` |

---

## 3. Data Flow Trace

### FolioCheckoutPanel — Percent 100%, advance ₹500, room ₹1,500 (the screenshot)

```
API get-folio → order.roomInfo.balancePayment = ₹1,075  (= Total incl. GST − advance)
              → row.charge.balance_due         = ₹1,075

Display badge (RoomSection useMemo, L43-50):
  balanceDue = Number(c.balance_due || 0)     = 1075
  roomDiscountRs = Math.min(
    Math.floor(1075 * 100 / 100),             = 1075
    1075                                       cap
  )                                           = 1075  → badge shows -₹1,075 ✅

Balance line (L148):
  Math.max(0, 1075 - 1075)                   = ₹0   → "Room balance ₹0" ✅

handlePaid payload (L237-241):
  balanceDue = order.roomInfo?.balancePayment  = 1075
  roomDiscountRs = Math.floor(1075 * 100/100) = 1075
  payload.room_discount = 1075               ✅ — badge matches payload

BREAK POINT: NONE — display and payload are consistent for FolioCheckoutPanel
```

### Cross-Component at 50% input (INCONSISTENCY)

```
FolioCheckoutPanel:
  base = c.balance_due = 1075
  50% → Math.floor(1075 * 50/100) = 537
  badge = -₹537 | payload = ₹537

CheckInPage (L267):
  base = form?.orderAmount = 1500 (booking_charge, NOT balance_due)
  50% → Math.min(Math.floor(1500 * 50/100), effectiveBalanceDue)
       = Math.min(750, 1075) = 750
  badge = -₹750 | payload = ₹750

CheckInForm (L64):
  base = c.booking_charge = 1500 (same issue)
  50% → Math.min(Math.floor(1500 * 50/100), c.balance_due)
       = Math.min(750, 1075) = 750
  badge = -₹750 | payload = ₹750

BREAK POINT: CheckInPage L267 + CheckInForm L64 use booking_charge as base.
             FolioCheckoutPanel L47 + handlePaid L237 use balance_due as base.
             Same "50%" → ₹750 at check-in, ₹537 at checkout — INCONSISTENT.
```

**Crossover point:** base inconsistency only manifests when `%` < `balance_due / booking_charge × 100`.
- This booking: 1075 / 1500 × 100 = **71.67%**
- Below 71.67%: CheckInPage shows MORE discount ₹ than FolioCheckoutPanel for same %
- At or above 71.67%: both cap at balance_due → same result (including 100% case in screenshot)

---

## 4. Evidence Artifacts

**Saved to:** `/app/memory/evidence/INV-DISCOUNT-PCT-BASE/`

**Code evidence (in-file, no curl needed — purely a computation logic question):**

```
FolioCheckoutPanel.jsx L43-50 (RoomSection useMemo — base = balance_due):
  const balanceDue = Number(c.balance_due || 0);
  return Math.min(Math.floor(balanceDue * roomDiscount / 100), balanceDue);

FolioCheckoutPanel.jsx L237-241 (handlePaid — base = balance_due):
  const balanceDue = order.roomInfo?.balancePayment ?? 0;
  const roomDiscountRs = Math.floor(balanceDue * roomDiscount / 100);

CheckInPage.jsx L267 (roomDiscountRs useMemo — base = booking_charge):
  return Math.min(Math.floor(Number(form?.orderAmount || 0) * raw / 100), effectiveBalanceDue);

CheckInForm.jsx L64 (roomDiscountRs useMemo — base = booking_charge):
  return Math.min(Math.floor(Number(c.booking_charge || 0) * raw / 100), cap);
```

---

## 5. Answering the Owner's Questions Directly

**Q1: "100% discount = -₹1,075 — how? Room is ₹1,500."**

Correct behavior. Explanation:
- Guest paid ₹500 advance at booking. That ₹500 is already collected — it's not part of the outstanding bill.
- At checkout, the "balance due" is ₹1,575 (room+GST) − ₹500 (advance) = ₹1,075.
- "100% discount" means "100% of what the guest still owes" = ₹1,075.
- The ₹500 advance is a SEPARATE transaction. A checkout discount cannot reverse it.
- Result: guest pays ₹0 at checkout. The ₹500 advance covers part of the bill, discount covers the rest. Hotel received ₹500 total for a ₹1,575 stay.

**Q2: "If 500 is paid, can't the discount % get into that zone?"**

No — correctly handled. The cap at `balance_due` (₹1,075) ensures the discount can never exceed what's owed. The ₹500 advance is protected — it can't be "over-discounted". Max discount = ₹1,075 regardless of % entered.

**Q3: "Should we limit the discount %?"**

Not needed. Current approach (cap the ₹ result, allow 0-100% input) is correct. The alternative — capping the % input at 71.67% — would confuse staff with a non-round number. Better to keep max=100% and let the cap handle it.

**Q4 (implied): "Should we show a label clarifying the % base?"**

YES — this is the real UX gap. "100%" looks like "100% of the room rate (₹1,500)", but it actually means "100% of the remaining balance (₹1,075)". A sub-label like "% of balance due" would remove the confusion. **→ Owner decision needed (OD-INV-PCT-01).**

---

## 6. The Real Bug Found: Cross-Component Base Inconsistency

**This is a PLAN_GAP introduced in BUG-490 + BUG-491.**

BUG-490 used `booking_charge` as the % base for CheckInPage/Form (with a balance_due cap).
BUG-491 Sub-C used `balance_due` as the % base for FolioCheckoutPanel (matching `handlePaid`).

**Impact:** For any % input < 71.67%, the cashier sees and sends DIFFERENT ₹ amounts depending on which screen they use.

| Scenario | 50% discount, advance ₹500, room ₹1,500 |
|----------|----------------------------------------|
| At check-in (CheckInPage) | staff sees -₹750, server receives room_discount=750 |
| At checkout (FolioCheckoutPanel) | staff sees -₹537, server receives room_discount=537 |

This is a financial inconsistency. "50% discount" should mean the same amount regardless of which screen the cashier uses.

**Which base is correct?**

`handlePaid` (server-side logic, already deployed and tested) uses `balance_due` as the base. This is the authoritative intent per OD-407-01 comment in the code. The FolioCheckoutPanel display aligns with this.

**Fix (Planning skip eligible — OWNER must approve):**

Fix CheckInPage L267 and CheckInForm L64 to use balance_due (not booking_charge) as the % base:

CheckInPage.jsx L267 (1-line change):
```javascript
// Current (booking_charge base):
return Math.min(Math.floor(Number(form?.orderAmount || 0) * raw / 100), effectiveBalanceDue);

// Correct (balance_due base, consistent with FolioCheckoutPanel):
return Math.min(Math.floor(effectiveBalanceDue * raw / 100), effectiveBalanceDue);
```

CheckInForm.jsx L64 (1-line change):
```javascript
// Current (booking_charge base):
return Math.min(Math.floor(Number(c.booking_charge || 0) * raw / 100), cap);

// Correct (balance_due base):
return Math.min(Math.floor(cap * raw / 100), cap);
// (cap = c.balance_due from L62)
```

**Planning skip eligible?**
- ≤ 10 lines: YES (2 lines total)
- Files: 2 files
- Fast Lane eligible: NO (3-file rule requires ≥ 3 files to be ineligible, but these 2 files are fine — however this is financial/discount logic so Fast Lane rule R22 requires owner approval regardless)
- Recommendation: **DIRECT_BUG_FIX** with owner approval on the scope

---

## 7. Owner Decision Required

**OD-INV-PCT-01: What is the percentage base for room discount?**

| Option | Base | "50% discount" means | Staff interpretation |
|--------|------|---------------------|---------------------|
| **A (current FolioCheckoutPanel)** | `balance_due` (remaining after advance) | ₹537 (50% of ₹1,075) | "50% off what I still owe" |
| **B (current CheckInPage/Form)** | `booking_charge` (room rate, pre-advance) | ₹750 (50% of ₹1,500, capped) | "50% off the room rate" |

**Agent recommendation: Option A** (balance_due base everywhere) because:
1. `handlePaid` (the server payload) already uses balance_due base — Option A aligns display with payload
2. Option B would require also fixing `handlePaid` to use booking_charge base (touching a deployed financial function — higher risk)
3. The advance is a DEPOSIT against the bill — the meaningful "room charge" from the cashier's perspective at checkout is what's still owed

**UX recommendation (regardless of OD):** Add a sub-label under the % input: "of balance due (₹1,075)" so staff see the base explicitly.

---

## 8. Recommendations

| # | Action | Owner approve? | Scope |
|---|--------|---------------|-------|
| 1 | **OD-INV-PCT-01: decide % base (A or B)** | YES | Business decision |
| 2 | **Fix CheckInPage L267 + CheckInForm L64** to use balance_due as base (if Option A approved) | YES (financial change) | 2 lines, 2 files, DIRECT_BUG_FIX |
| 3 | **UX label**: add "of balance due (₹X)" beneath % input in all 3 components | Optional | Low-risk, 3 files |

No code written — recommendations only. Owner approves before implementation.

---

## 9. Retroactive Candidates

NONE — all referenced code is registered.

---

## 10. Summary for Handover

```
Root cause: TWO findings.
  (1) Screenshot (100% = -₹1,075): CORRECT — base = balance_due, advance is separate.
      No code bug. Semantic gap in UX only.
  (2) Cross-component PLAN_GAP: CheckInPage/Form use booking_charge base,
      FolioCheckoutPanel uses balance_due base → same % → different ₹ on different screens.

Classification: CORRECT_BEHAVIOR (F1) + PLAN_GAP/FE_BUG (F2)
Confidence: HIGH
Steps used: 4/10

FE fix (F2): YES — 2 lines, 2 files (CheckInPage L267 + CheckInForm L64)
Planning skip eligible: YES with owner approve
Owner decision needed: OD-INV-PCT-01 (which base — recommend Option A: balance_due)

Evidence: /app/memory/evidence/INV-DISCOUNT-PCT-BASE/ (code traces)
Report: investigations/INV-DISCOUNT-PCT-BASE_2026_10_05.md
```


---
## ADDENDUM — 2026-10-05 — OD-INV-PCT-01 LOCKED = Option B

**Owner decision:** Option B — percentage base = booking_charge (room rate).
Rationale: "The discount is on the room rent. 66.67% on a ₹1,500 room = ₹1,000. With balance_due base he would only get ₹716 — wrong."

**Fix applied (DIRECT_BUG_FIX — 1 file, owner approval = this session):**
File: `FolioCheckoutPanel.jsx` — 3 edit sites:
1. RoomSection roomDiscountRs useMemo L47: base ← bookingCharge (c.booking_charge)
2. roomDiscountInfoRs useMemo L205: base ← bc (row.charge?.booking_charge)
3. handlePaid L242-244: base ← bookingCharge (order.roomInfo?.roomPrice)

All capped at balance_due (cannot exceed what guest still owes).
Compile: PASS. CheckInPage + CheckInForm unchanged (already used booking_charge — correct).

Behavior after fix (₹1,500 room, ₹500 advance, balance_due ₹1,075):
  50%    → Math.min(Math.floor(1500×50/100),  1075) = Math.min(750,  1075) = ₹750  ✅
  66.67% → Math.min(Math.floor(1500×66.67/100),1075)= Math.min(1000, 1075) = ₹1,000 ✅
  100%   → Math.min(1500, 1075) = ₹1,075 (cap: can't exceed balance_due)      ✅

