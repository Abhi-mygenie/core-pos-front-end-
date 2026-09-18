# BUG-388 Impact Analysis — Gate 2

**ID:** BUG-388
**Date:** 2026-09-09
**Role:** PLANNING agent (ALPHA v0.7)
**Stage:** Gate 2 — Impact Analysis
**Code Reality:** PARTIAL — bug is in BUG-386 implementation code; all 3 target lines confirmed live

---

## Header

| Field | Value |
|---|---|
| **Code Reality** | PARTIAL — code exists (BUG-386 introduced the GST computation), bug is inside it |
| **Conflict Pre-Check** | `CheckInPage.jsx` + `pmsService.js` last modified by BUG-386 IMPL 2026-09-09. BUG-386 is at Gate 5b (QA PASS, awaiting owner smoke). BUG-388 builds ON TOP of BUG-386 code. **Execution order: BUG-388 AFTER BUG-386. Parallel-safe — BUG-386 is done.** |
| **Risk** | **CRITICAL** (R6 — GST tax, room billing, balance_payment) |

---

## 1. Data Flow Trace (current — broken)

```
FORM INPUT
  form.orderAmount   = 7500   (Room Amount field, user-entered)
  form.advancePayment = 100   (Advance Payment field, user-entered)

BREAK POINT 1 — CheckInPage.jsx:385
  amt = Number(form.orderAmount) = 7500
  ← advancePayment NEVER READ for GST base

  → computeRoomGst(applicable, slabs, amt=7500, nights=1, rooms=1)
      nightlyUnit = 7500 / 1 / 1 = 7500
      slab match: 7500 <= slab1.max(7500) → 5%
      gstTotal = 7500 × 0.05 = 375
  → GST strip shows: 5% Slab, ₹375, Total incl. GST ₹7,875   ← WRONG

BREAK POINT 2 — CheckInPage.jsx:169-174
  computeRoomGst(..., Number(form.orderAmount)=7500, ...)
  → gstTax = 375   ← WRONG

  pmsCheckIn called with:
    orderAmount:  7500
    advancePayment: 100
    gstTax: 375

BREAK POINT 3 — pmsService.js:159
  orderAmount = to2dp(7500) = 7500
  advance     = to2dp(100)  = 100
  balance_payment = to2dp(7500 + 375 - 100) = 7775   ← WRONG

API PAYLOAD SENT:
  order_amount:    7500
  advance_payment: 100
  balance_payment: 7775   ← WRONG (should be 8868)
  gst_tax:         375    ← WRONG (should be 1368)
```

---

## 2. Data Flow Trace (after fix)

```
FORM INPUT (same)
  form.orderAmount    = 7500
  form.advancePayment = 100

CheckInPage.jsx (strip, ~L385):
  amt     = 7500
  advAmt  = 100
  gstBase = 7500 + 100 = 7600

  → computeRoomGst(applicable, slabs, gstBase=7600, nights=1, rooms=1)
      nightlyUnit = 7600 / 1 / 1 = 7600
      slab match: 7600 >= slab2.min(7500.01) → 18%
      gstTotal = 7600 × 0.18 = 1368
  → GST strip shows: 18% Slab, ₹1,368, Total incl. GST ₹8,968   ✅

CheckInPage.jsx (handleConfirm, ~L168):
  gstBase = 7500 + 100 = 7600
  → computeRoomGst(..., gstBase=7600, ...)
  → gstTax = 1368   ✅

  pmsCheckIn called with:
    orderAmount:   7500
    advancePayment: 100
    gstTax: 1368

pmsService.js:159 (after fix):
  balance_payment = to2dp(orderAmount + gstTax)
                  = to2dp(7500 + 1368) = 8868   ✅
  Derivation: total_invoice = (7500+100) + 1368 = 8968
              balance = total_invoice − advance = 8968 − 100 = 8868 ✅

API PAYLOAD (correct):
  order_amount:    7500
  advance_payment: 100
  balance_payment: 8868   ✅
  gst_tax:         1368   ✅
```

---

## 3. Risk Classification

| Criterion | Assessment |
|---|---|
| **Risk level** | CRITICAL |
| **R6 trigger** | YES — GST tax amount, room billing, `balance_payment` are financial fields |
| **R5 hotspot** | YES — `pmsService.js` is financial-critical |
| **Fast Lane eligible** | NO — R6 + 2 files |
| **Process required** | Full gate cycle + owner Gate 4 GO |

---

## 4. Affected Files

### Files WILL Change
| File | Lines | Nature |
|---|---|---|
| `src/pages/pms/CheckInPage.jsx` | L385–392 (GST strip), L419 (Total display), L168–175 (handleConfirm) | Bug fix — include advance in GST base (2 locations) |
| `src/api/services/pmsService.js` | L159 | Bug fix — balance_payment formula (remove `- advance`) |

### Files Will NOT Touch
| File | Reason |
|---|---|
| `src/utils/roomGstCalculator.js` | Logic correct — only input changes |
| `src/api/transforms/profileTransform.js` | No change — slab config parsing unaffected |
| `src/api/transforms/orderTransform.js` | `roomPaymentSummary.gstTax` populated from checkout, not check-in |
| `src/components/pms/PmsCheckoutDrawer.jsx` | Reads from existing roomPaymentSummary at checkout time |
| `src/api/services/aiosellService.js` | Not involved |

---

## 5. Downstream Consumer Analysis

| Consumer | Impact | Safe? |
|---|---|---|
| `pmsCheckIn` API (backend) | Receives correct `gst_tax` + `balance_payment` — backend stores these | YES — field names unchanged, values corrected |
| GST strip UI | Shows correct 18% slab + ₹1,368 + Total ₹8,968 | YES — only value changes, not structure |
| `navigate('/pms/in-house')` after check-in | Unaffected | YES |
| `PmsCheckoutDrawer.jsx` (checkout) | Reads `roomPaymentSummary.gstTax` from order data — populated at checkout from stored order. The stored `gst_tax` at check-in time becomes the source. | YES — downstream reads what backend stored |
| `orderTransform.js` `roomPaymentSummary` | Not populated at check-in; populated from order API at checkout | UNAFFECTED |

---

## 6. Open Owner Decisions

**None.** OD-GST-02 confirmed 2026-09-09: "advance is an additional charge → GST base = orderAmount + advancePayment."

---

## 7. Verification Matrix (seeds QA handover)

| Edit | File | Change Description | How to Verify | Automated? |
|---|---|---|---|---|
| E1a | `CheckInPage.jsx:385–392` | `gstBase = amt + advAmt`; pass `gstBase` to `computeRoomGst` and slab lookup | Browser: Enter room ₹7,500 + advance ₹100 → strip shows 18% slab, ₹1,368 GST | NO (UI) |
| E1b | `CheckInPage.jsx:419` | `amt + gstTotal` → `gstBase + gstTotal` in Total incl. GST | Browser: Total incl. GST shows ₹8,968 | NO (UI) |
| E2 | `CheckInPage.jsx:168–175` | `gstBase = orderAmount + advance` passed to `computeRoomGst` | Network tab: `gst_tax: 1368` in LOCAL_CHECKIN payload | NO (Network) |
| E3 | `pmsService.js:159` | `balance_payment = orderAmount + gstTax` | Network tab: `balance_payment: 8868` in LOCAL_CHECKIN payload | NO (Network) |
| R1 | `CheckInPage.jsx` | Advance = 0: GST base = orderAmount only (no regression) | Enter room ₹8,000, advance ₹0 → 18% slab, GST ₹1,440, balance ₹9,440 | NO (UI) |
| R2 | `pmsService.js` | Booking type: Direct/Online (non-WalkIn) — same fix applies | Enter via arrival booking row with advance | NO (UI) |

---

## 8. Post-Code Registry Checklist (for Implementation agent)

```
□ registry.json: BUG-388 → status: IMPLEMENTED, sprint_key: pos_pms_1
□ BUG_TRACKER.md: row updated with IMPLEMENTED status
□ FILE_OWNERSHIP.md: CheckInPage.jsx + pmsService.js → add BUG-388 row
□ Code markers: // BUG-388 comment in every modified file
```

---

*Gate 2 complete: BUG-388 | Code reality: PARTIAL | Conflict: NONE (BUG-386 done) | Risk: CRITICAL | Files: 2 | Owner decisions: NONE | Next: Gate 3 Implementation Plan*
