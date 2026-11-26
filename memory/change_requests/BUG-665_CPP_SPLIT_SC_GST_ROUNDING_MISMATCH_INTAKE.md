# BUG-665 — Intake Document

**ID:** BUG-665
**Type:** BUG
**Date:** 2026-11-10
**Reported by:** Owner (Ruby ZAP, RID 672)
**Area:** Payments / Coupons / Credit
**Severity:** P0 — CRITICAL (payment fails, order cannot be placed)
**Risk:** CRITICAL (financial, 2 × R5 hotspot files)
**Fast Lane:** NOT eligible (2 R5 files, financial logic)

---

## 1. What the owner reported

> "I am getting error when putting service charge in prepaid and splitting bill with cash and card"

Payload supplied: `restaurant_id: 672`, `payment_method: partial`, `payment_type: prepaid`, `service_tax: 350.9`, `service_gst_tax_amount: 17.54`, `order_amount: 4052.89`, `partial_payments: [{cash:3000},{upi:1052.9},{card:0}]`.

---

## 2. Duplicate Check

**Result: DISTINCT**

| Related item | Why DISTINCT |
|---|---|
| BUG-530 | Split autofill overfills on **room** orders (roomBalance cap). Different root cause — no SC GST rounding involved. |
| CR-021 | Split/partial payment feature CR — not a rounding bug. |
| BUG-645 | Split payment in reports — display only, not payment amount calculation. |

No existing registered item covers 1-paisa SC GST half-rounding mismatch in prepaid split.

---

## 3. Root Cause (from INV-TILE-GREEN investigation session, confirmed)

Two independent code paths compute the total differently when **Service Charge GST produces a 0.5 paisa intermediate** (e.g. SC = ₹350.9 × 5% = ₹17.5449...):

| Path | File | How GST is rounded | Total |
|---|---|---|---|
| **A — payload** | `orderTransform.js` L29 | `Math.round(totalGst × 100) / 100` — rounds the **whole** GST at once | 192.99 → order_amount **4052.89** |
| **B — split cap** | `CollectPaymentPanel.jsx` L789-790 | `Math.round(totalGst/2 × 100) / 100` × 2 — rounds **each SGST/CGST half** separately | 96.50 + 96.50 = 193.00 → effectiveTotal **4052.90** |

The cashier types ₹3000 cash → split cap (Path B) fills remaining = **4052.90 − 3000 = 1052.90**.
Backend validates: `3000 + 1052.90 = 4052.90 ≠ order_amount 4052.89` → **ERROR**.

**Break point:** `CollectPaymentPanel.jsx` L3034 — `splitCap = effectiveTotal` uses Path B's total instead of Path A's `order_amount`.

---

## 4. Classification

| Field | Value |
|---|---|
| Classification | FE_BUG — wrong rounding source for split cap |
| Trigger condition | ALL THREE must be true: (1) SC enabled, (2) SC × SC-GST-rate produces a 0.5-paisa intermediate, (3) cashier uses split payment |
| Affected payment types | Prepaid split (confirmed). Postpaid split (likely — same CPP splitCap). |
| Severity agent | P0 — payment completely fails, no workaround except turning SC off or not splitting |
| Severity owner | P0 (confirmed from payload + report) |
| Risk | CRITICAL — financial path, R5 hotspot × 2 |

---

## 5. Evidence

| Evidence | Location |
|---|---|
| Owner payload | Provided in chat 2026-11-10 |
| Mathematical proof | Investigation session (python3 output) — both paths confirmed numerically |
| Code trace | CPP L784-790 (`scGst`, `sgst`, `cgst`), L836 (`rawFinalTotal`), L3034 (`splitCap`); orderTransform.js L14-39 (`scGstAmt`, `gstTax`, `totalTax`, `rawTotal`, `orderAmount`) |
| Steps to reproduce | (1) Restaurant with SC %, (2) prepaid dinein order, (3) open Collect Bill, (4) enable SC manually or via autoSC, (5) choose split payment (cash + UPI/card), (6) type first amount → "remaining" fills in → submit → backend error |
| Source | OWNER-REPORTED |
| Confidence | CONFIRMED (mathematical + code trace) |

---

## 6. Blast Radius

| File | Role | Hotspot? | Risk |
|---|---|---|---|
| `src/components/order-entry/CollectPaymentPanel.jsx` | splitCap on L3034 | **YES (R5)** | HIGH |
| `src/api/transforms/orderTransform.js` | totalTax rounding on L29 | **YES (R5)** | HIGH |

**Scope:** SMALL (1-2 lines per file, isolated to split payment cap logic)
**Hotspot files:** YES — both R5

---

## 7. Owner Decisions Needed

| OD | Decision | Status |
|---|---|---|
| OD-665-01 | Fix in CPP — make `splitCap` use whole-GST rounding to match `orderTransform`. `orderTransform` untouched. | **LOCKED — Option A** |
| OD-665-02 | ALL payment types: prepaid, postpaid (collect-bill), QSR. One fix covers all — single `splitCap` on L3034 is shared by every split payment path in CPP. | **LOCKED — ALL** |

**Scope recheck after OD lock:**
- Fix point: **1 line** (`CollectPaymentPanel.jsx` L3034 `splitCap`)  
- Covers: prepaid split, postpaid split, QSR split — all in one place  
- `orderTransform.js` **not touched** (Option A)  
- Blast radius confirmed **SMALL** even with ALL types in scope

---

## 8. Post-registration checklist
- [ ] Gate 2: Impact Analysis
- [ ] Gate 3: Implementation Plan
- [ ] Gate 4 GO from owner
- [ ] Implementation (R5 × 2 — cannot Fast Lane)
