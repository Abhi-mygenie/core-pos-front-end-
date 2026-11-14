# BUG-666 — Intake Document

**ID:** BUG-666
**Type:** BUG
**Date:** 2026-11-10
**Reported by:** Owner (Ruby ZAP, RID 672) — split order still failing after BUG-665 fix
**Area:** Payments / Coupons / Credit
**Severity:** P0 — CRITICAL (payment fails, order cannot be placed)
**Risk:** CRITICAL (financial, 2 × R5 hotspot)
**Fast Lane:** NOT eligible (R5 × 2, financial)
**Builds on:** BUG-665 (partial fix for same symptom)

---

## 1. What the owner reported

Split payment still failing after BUG-665 fix. New payload (restaurant RID 672, Ruby ZAP):
- `order_amount: 132` (food ₹114.29 × 5% GST + SC 10% + SC GST 5%)
- `partial_payments`: cash=100 + upi=32.02 + card=0 = **132.02**
- Backend error: `"Frontend calculation error: partial_payment_total: Partial payments must equal the order amount."`

---

## 2. Duplicate Check

**Result: DISTINCT**

| Related item | Why DISTINCT |
|---|---|
| BUG-665 | Addressed sgst+cgst half-rounding OF totalGst. BUG-666 is about ITEM-LEVEL GST source difference — a separate rounding layer upstream. |
| BUG-304 | taxTotals discountRatio mismatch — different root cause, different fix. |
| BUG-336/338 | taxTotals gstStatus/roomGst guards — different root cause. |

---

## 3. Root Cause (confirmed in investigation, HIGH confidence)

There are **two independent rounding layers** between CPP and orderTransform. BUG-665 fixed Layer 2 only. BUG-666 is Layer 1.

### Layer 1 — ITEM-LEVEL GST source (this bug — BUG-666)

| | CPP `taxTotals` useMemo (L279-339) | orderTransform `calcOrderTotals` (L846) |
|---|---|---|
| **Source** | `linePrice * (tax.percentage / 100)` — computed live from price | `parseFloat(item.gst_amount)` — reads pre-rounded string from cart |
| **Item 114.29 × 5%** | `5.7145000000000004` (JS float) | `5.71` (from string "5.71") |
| **Split per SGST/CGST** | `2.857250... → 2.86` each | not split at item level |
| **Result** | `taxTotals.sgst + cgst = 5.72` | `itemGst = 5.71` |
| **Gap** | **+0.01 per affected item** | baseline |

### Layer 2 — TOTAL GST half-rounding (fixed by BUG-665)

| | CPP (pre-BUG-665) | CPP (post-BUG-665) | orderTransform |
|---|---|---|---|
| **Formula** | `sgst=Math.round(totalGst/2*100)/100` × 2 | `Math.round(totalGst*100)/100` | `Math.round(gstTax*100)/100` |
| **Result for 6.2915** | `3.15 + 3.15 = 6.30` | `6.29` | `6.28` |

### Combined effect for this order

| State | CPP total | order_amount | Gap | Error? |
|---|---|---|---|---|
| Pre-BUG-665 | 132.02 | 132 | **0.02** | ✗ if totalRound=false |
| Post-BUG-665 | 132.01 | 132 | **0.01** | ✗ if totalRound=false |
| Post-BUG-666 | 132.00 | 132 | **0.00** | ✓ |

---

## 4. Trigger conditions

An order fails on split when **ALL** are true:
1. Service Charge is ON (adds SC GST component — another source of messy intermediates)
2. Item price × GST rate produces a **half-paisa intermediate** when split into SGST/CGST (e.g. `114.29 × 5% / 2 = 2.857250...`)
3. Restaurant has **`totalRound = false`** (round-off disabled — gap not absorbed)

**Will NOT fail when any of these is false:**
- SC off: fewer intermediates — but item-level gap can still exist for some prices
- Round item prices (₹149, ₹420, ₹2790): GST is clean, no half-paisa → no gap
- `totalRound = true`: CR-170 floors the 0.01-0.02 paise away → no error

**Ruby ZAP (`totalRound = false`) is fully exposed.**

---

## 5. Classification

| Field | Value |
|---|---|
| Classification | FE_BUG — CPP uses `price × rate` per item while orderTransform uses pre-rounded `gst_amount` string |
| Severity | P0 — payment completely fails |
| Risk | CRITICAL — financial path, R5 hotspot × 2 |
| Duplicate check | DISTINCT |
| Code reality | PARTIAL — bug present, BUG-665 reduces but doesn't eliminate |
| Fast Lane | NOT eligible |

---

## 6. Evidence

| Evidence | Source |
|---|---|
| Owner payload (order_amount=132, partial_sum=132.02) | Chat 2026-11-10 |
| Mathematical proof | Investigation session (python3 output) — both paths confirmed |
| Code trace | CPP L296 (`taxAmt = linePrice * (tax.percentage / 100)`), L300 (`sgst += taxAmt/2`), L332 (`Math.round(sgst*100)/100`); orderTransform L846 (`parseFloat(item.gst_amount)`) |
| BUG-665 investigation addendum | confirms gap persists after BUG-665 for non-round prices |
| Source | OWNER-REPORTED (Ruby ZAP RID 672, 2026-11-10) |
| Confidence | HIGH |

---

## 7. Blast Radius

| File | Role | Hotspot? |
|---|---|---|
| `src/components/order-entry/CollectPaymentPanel.jsx` | taxTotals useMemo L279-339 (item GST source) + splitCap (L3044) | **YES (R5)** |
| `src/api/transforms/orderTransform.js` | `calcOrderTotals` L846 (parseFloat gst_amount) | **YES (R5)** — may need alignment |

**Scope:** SMALL-MEDIUM (1-2 files, targeted changes)
**Hotspot files:** YES — both R5

---

## 8. Owner Decisions Needed

| OD | Question | Recommended |
|---|---|---|
| OD-666-01 | Which path to align? **(a)** Make CPP read `gst_amount` from cart items like orderTransform — single source of truth, CPP always matches payload. **(b)** Make orderTransform recompute from `price × rate` like CPP — changes `order_amount` computation (riskier). | **(a) recommended** — orderTransform is proven correct (backend accepts its order_amount); CPP should match it |
| OD-666-02 | Scope: same as BUG-665 (all payment types — prepaid, postpaid, QSR)? | YES — same `taxTotals` useMemo feeds all paths |

---

## 9. Relationship to BUG-665

BUG-665 and BUG-666 are complementary fixes for the same symptom (split cap ≠ order_amount) but different root causes:

| | BUG-665 (done) | BUG-666 (this bug) |
|---|---|---|
| Layer | Layer 2 — total GST half-rounding | Layer 1 — item-level GST source |
| Fix site | CPP `splitCap` / `finalSplitBase` | CPP `taxTotals` useMemo |
| Covers | Orders where food GST is clean but SC GST is messy | Orders where item price × rate is itself messy |
| Alone sufficient? | No (this order still fails) | Should eliminate remaining gap |

---

## 10. Post-registration checklist
- [ ] Gate 2: Impact Analysis
- [ ] Gate 3: Implementation Plan
- [ ] Gate 4 GO from owner
- [ ] Implementation (R5 × 2 — cannot Fast Lane)
