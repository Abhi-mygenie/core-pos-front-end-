# BUG-388 Intake — PMS Check-In: Advance Payment Excluded from GST Base

**ID:** BUG-388
**Date:** 2026-09-09
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
| **Source** | OWNER-REPORTED + AGENT-INVESTIGATED |
| **Confidence** | CONFIRMED (owner reproduced on preprod, agent traced code) |
| **Duplicate check** | **DISTINCT** — BUG-386 fixed hardcoded '0.00' gst_tax; this is a separate gap where advance is excluded from GST base |
| **Related** | BUG-386 (same feature, same files, upstream fix) |
| **Code reality** | **PARTIAL** — bug is IN the existing BUG-386 code; `computeRoomGst` call exists but passes wrong `totalAmount` |
| **Fast Lane** | NO — CRITICAL risk, financial, 2 files |

---

## Severity Rationale

> **P0:** GST amount is wrong on every check-in where advance > 0. `balance_payment` sent to API is understated by `advance` amount. Guest is charged incorrectly. Financial data is wrong at API level.

---

## Description

`CheckInPage.jsx` calls `computeRoomGst` with `form.orderAmount` only. `form.advancePayment` is an additional charge (owner-confirmed: OD-GST-02, 2026-09-09) and must be included in the GST base.

**Symptom:** Room ₹7,500 + Advance ₹100 = total ₹7,600. GST shown at 5% (₹375) instead of 18% (₹1,368). Balance payment ₹7,775 instead of ₹8,868.

---

## Evidence

- **Screenshots:** Provided by owner (2026-09-09 session) — ₹7,500 room + ₹100 advance → 5% slab shown
- **Code trace:** `CheckInPage.jsx:169-174` — `computeRoomGst(..., Number(form.orderAmount), ...)` — advance excluded
- **pmsService.js:159** — `balance_payment = orderAmount + gstTax - advance` (wrong formula)
- **Owner decision OD-GST-02:** "If additional charge → fix: pass orderAmount + advancePayment as GST base. balance_payment formula also needs revisiting." (2026-09-09)
- **Investigation report:** `/app/memory/evidence/BUG-GST-7500/INVESTIGATION_REPORT_BUG_GST_7500_2026_09_09.md`

---

## Numeric Impact (verified)

| | Current (wrong) | Fixed (correct) |
|---|---|---|
| Room amount | ₹7,500 | ₹7,500 |
| Advance | ₹100 | ₹100 |
| GST base | ₹7,500 | **₹7,600** |
| Slab | 5% | **18%** |
| GST tax | ₹375 | **₹1,368** |
| balance_payment sent to API | ₹7,775 | **₹8,868** |
| Total invoice | ₹7,875 | **₹8,968** |

---

## Blast Radius

```bash
# Files touched by this bug
grep -rn "computeRoomGst\|balance_payment.*advance" /app/frontend/src/ --include="*.jsx" --include="*.js"
```

| File | Location | Change |
|---|---|---|
| `src/pages/pms/CheckInPage.jsx` | L169-174 (handleConfirm) | Pass `orderAmount + advance` as GST base |
| `src/pages/pms/CheckInPage.jsx` | L385-389 (GST strip display) | Pass `orderAmount + advance` as GST base; update "Total incl. GST" label |
| `src/api/services/pmsService.js` | L159 | `balance_payment: to2dp(orderAmount + gstTax)` (advance cancels out) |

- **Blast radius:** SMALL (2 files, 3 targeted edits)
- **Hotspot files (R5):** pmsService.js is financial-critical — requires full gate cycle
- **Estimated scope:** SMALL

---

## Exact Edits (for Planning agent)

### E1 — `CheckInPage.jsx` GST strip display (~L385–389)
```js
// BEFORE
const amt = Number(form.orderAmount) || 0;
const { gstTotal, cgst, sgst } = computeRoomGst(roomGstApplicable, roomGstSlabs, amt, nights, 1);
const rate = roomGstSlabs?.slabs?.find(s => (amt / nights) >= (s.min ?? 0) && ...) ...

// AFTER
const amt    = Number(form.orderAmount) || 0;
const advAmt = Number(form.advancePayment) || 0;
const gstBase = amt + advAmt;
const { gstTotal, cgst, sgst } = computeRoomGst(roomGstApplicable, roomGstSlabs, gstBase, nights, 1);
const rate = roomGstSlabs?.slabs?.find(s => (gstBase / nights) >= (s.min ?? 0) && ...) ...
// "Total incl. GST" → show gstBase + gstTotal (not amt + gstTotal)
```

### E2 — `CheckInPage.jsx` handleConfirm (~L169–175)
```js
// BEFORE
computeRoomGst(roomGstApplicable, roomGstSlabs, Number(form.orderAmount), formNights ?? 1, 1)

// AFTER
const gstBase = Number(form.orderAmount) + Number(form.advancePayment || 0);
computeRoomGst(roomGstApplicable, roomGstSlabs, gstBase, formNights ?? 1, 1)
```

### E3 — `pmsService.js` balance_payment (~L159)
```js
// BEFORE
balance_payment: to2dp(orderAmount + (p.gstTax ?? 0) - advance),

// AFTER
balance_payment: to2dp(orderAmount + (p.gstTax ?? 0)),
// Rationale: GST base = orderAmount + advance; total invoice = (orderAmount + advance) + gstTax
// balance = total_invoice - advance = orderAmount + gstTax (advance cancels out)
```

---

## Owner Decisions Needed

None — OD-GST-02 already confirmed by owner: advance is an additional charge.

---

## Process Required

Full gate cycle: Planning (Gate 2 IA + Gate 3 Plan) → **Gate 4 GO (owner approval mandatory — R6 financial)** → Implementation → QA → Owner Smoke

---

*Intake complete: BUG-388 | P0 CRITICAL | DISTINCT | SMALL blast radius | Next: Planning Gate 2*
