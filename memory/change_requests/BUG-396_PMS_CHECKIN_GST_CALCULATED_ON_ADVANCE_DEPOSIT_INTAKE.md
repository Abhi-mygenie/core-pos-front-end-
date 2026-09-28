# BUG-396 Intake — PMS Check-In: GST incorrectly calculated on advance (advance is deposit, not additional charge)

**ID:** BUG-396
**Date:** 2026-09-13
**Sprint:** pos_pms_1
**Registered by:** INTAKE agent (ALPHA v0.7)

---

## Classification

| Field | Value |
|---|---|
| **Type** | BUG |
| **Severity** | **P0 — CRITICAL** |
| **Risk** | **CRITICAL** (R6 — GST tax computation, room billing, balance_payment) |
| **Area** | PMS / Room Check-In |
| **Source** | OWNER-REPORTED (screenshot provided 2026-09-13) |
| **Confidence** | CONFIRMED (owner screenshot + code trace) |
| **Duplicate check** | **DISTINCT** — RELATED to BUG-388. BUG-388 introduced this by treating advance as "additional charge" per OD-GST-02. OD-GST-02 is now established as incorrect. |
| **Fast Lane** | NO — CRITICAL risk, financial, 2 files |

---

## Severity Rationale

> **P0:** GST is computed on `orderAmount + advancePayment` (treating advance as extra charge on top of room). Advance is a prepayment/deposit against the room amount — not an additional charge. Every check-in with advance > 0 sends wrong GST amount, wrong slab, and wrong balance_payment to the API. Financial data is incorrect.

---

## Description

`CheckInPage.jsx` (via BUG-388 implementation) computes `gstBase = orderAmount + advancePayment`.

Owner-confirmed (2026-09-13): **Advance is a deposit/prepayment toward the room amount, not a charge on top of it.** Room amount already represents the full accommodation charge. GST must be computed on room amount only.

**Owner screenshot evidence:**
- Room Amount: ₹100
- Advance Payment: ₹100
- Actual (wrong): gstBase = ₹200 → 5% slab → GST ₹10 → Total ₹210
- Expected (correct): gstBase = ₹100 → 5% slab → GST ₹5 → Total ₹105

---

## Evidence

- **Screenshot:** Provided by owner (2026-09-13 chat). Room ₹100 + Advance ₹100 → GST ₹10 showing (should be ₹5).
- **Code trace:**
  - `CheckInPage.jsx:256`: `const gstBase = Number(form.orderAmount) + Number(form.advancePayment || 0); // BUG-388`
  - `CheckInPage.jsx:767`: `const gstBase = amt + advAmt; // BUG-388: advance is additional charge — include in GST base`
  - `pmsService.js:193`: `fd.append('balance_payment', String(to2dp(orderAmount + (p.gstTax ?? 0)))); // BUG-388 preserved`
- **Source:** OWNER-REPORTED
- **Confidence:** CONFIRMED

---

## Root Cause

BUG-388 was implemented based on owner decision **OD-GST-02** (2026-09-09): *"advance is additional charge → include in GST base."* This decision is now established as incorrect. Advance is a deposit against the room price, not an extra charge.

**Classification:** `PLAN_GAP` — implementation was correct relative to OD-GST-02, but OD-GST-02 was the wrong business rule.

---

## Numeric Impact (verified)

| Scenario | Wrong (current) | Correct |
|---|---|---|
| Room ₹100, Advance ₹100 | gstBase=₹200, GST ₹10, Total ₹210, balance ₹110 | gstBase=₹100, GST ₹5, Total ₹105, balance ₹5 |
| Room ₹7,500, Advance ₹100 | gstBase=₹7,600 → **18%**, GST ₹1,368 | gstBase=₹7,500 → **5%**, GST ₹375, balance ₹7,875 |
| Room ₹7,500, Advance ₹0 | gstBase=₹7,500 → 5%, GST ₹375 ✅ | gstBase=₹7,500 → 5%, GST ₹375 ✅ (unchanged) |

> **Note:** BUG-388's QA case TC-388-01 (Room ₹7,500 + Advance ₹100 → 18% slab, ₹1,368 GST) was marked PASS — but that result is now WRONG per the corrected business rule. Correct result: 5% slab, ₹375 GST.

---

## Blast Radius

| File | Location | Change needed |
|---|---|---|
| `src/pages/pms/CheckInPage.jsx` | L256 (handleConfirm) | `gstBase = Number(form.orderAmount)` only — remove advance |
| `src/pages/pms/CheckInPage.jsx` | L767 (GST display strip) | `gstBase = amt` only — remove advAmt |
| `src/api/services/pmsService.js` | L193 | `balance_payment = to2dp(orderAmount + gstTax - advance)` — restore advance subtraction |

- **Blast radius:** SMALL (2 files, 3 targeted edits)
- **Hotspot files (R5):** `pmsService.js` is financial-critical
- **Conflict:** `CheckInPage.jsx` recently touched by CR-380 (GuestDocsSection, different sections — parallel-safe after verification)

---

## Owner Decisions Needed

| OD | Question | Default assumption |
|---|---|---|
| **OD-396-01** | Confirm: advance is always a deposit toward room amount (never an additional charge)? | Owner screenshot + 2026-09-13 statement confirms YES |
| **OD-396-02** | `balance_payment` formula: should it be `orderAmount + gstTax - advance`? (guest owes total minus what they already paid) | YES — standard hotel practice |

Both ODs can be locked from owner's 2026-09-13 statement: *"room rent covers entire amount already."*

---

## Do-Not-Retry Note (carry forward)

> **BUG-388 QA result for TC-388-01 is now SUPERSEDED.** Under the corrected business rule, Room ₹7,500 + Advance ₹100 should give 5% slab (gstBase=₹7,500), NOT 18%. The BUG-388 QA PASS was based on the wrong OD-GST-02.

---

## Next

Gate 2 — Impact Analysis + Implementation Plan when owner gives Gate 2 GO.
