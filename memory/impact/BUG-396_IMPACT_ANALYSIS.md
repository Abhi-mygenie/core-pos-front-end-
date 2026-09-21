# BUG-396 Impact Analysis — Gate 2
## PMS Check-In: GST calculated on advance (advance is deposit, not additional charge)

**ID:** BUG-396
**Date:** 2026-09-13
**Role:** PLANNING agent (ALPHA v0.7)
**Gate:** 2 — Impact Analysis
**Risk:** CRITICAL (R6 — GST tax, room billing, balance_payment)
**Code Reality:** FULL — wrong formula live at 3 sites across 2 files
**Conflict Pre-Check:** CLEAR — see §3

---

## §1 Owner Decisions

| OD | Decision | Source |
|---|---|---|
| **OD-396-01** | Advance is always a deposit toward room amount — NEVER an additional charge | LOCKED — owner statement 2026-09-13: *"room rent covers entire amount already"* |
| **OD-396-02** | `balance_payment = orderAmount + gstTax − advance` (guest owes total minus what they already paid) | LOCKED — standard hotel practice, confirmed by owner screenshot math |

Both ODs **LOCKED**. Zero open questions. Proceed to Gate 3.

---

## §2 Data Flow Trace

```
CURRENT (wrong — BUG-388 formula):

  User enters: orderAmount=₹100, advancePayment=₹100

  CheckInPage.jsx:256 (handleConfirm)
    gstBase = orderAmount + advance = ₹200      ← WRONG
    computeRoomGst(…, gstBase=200, …)
    → 5% slab → gstTax = ₹10

  CheckInPage.jsx:767 (display strip)
    gstBase = amt + advAmt = ₹200              ← WRONG (same error)
    Displays: Total incl. GST = ₹210

  pmsService.js:193 (API payload)
    balance_payment = orderAmount + gstTax
                    = 100 + 10 = ₹110          ← WRONG (advance not subtracted)

CORRECT (BUG-396 fix):

  User enters: orderAmount=₹100, advancePayment=₹100

  CheckInPage.jsx:256 (handleConfirm)
    gstBase = orderAmount = ₹100               ← CORRECT
    computeRoomGst(…, gstBase=100, …)
    → 5% slab → gstTax = ₹5

  CheckInPage.jsx:767 (display strip)
    gstBase = amt = ₹100                       ← CORRECT
    Displays: Total incl. GST = ₹105

  pmsService.js:193 (API payload)
    balance_payment = orderAmount + gstTax − advance
                    = 100 + 5 − 100 = ₹5      ← CORRECT (guest owes balance)
```

---

## §3 Conflict Pre-Check

| File | Last Modified By | Sections Changed | Conflict? |
|---|---|---|---|
| `CheckInPage.jsx` | CR-380 (2026-09-14) | E-C1..E-C9: doc upload, id_type, extra adults, formValid gate | **NONE** — BUG-396 touches lines 255-260 (handleConfirm GST block) + line 766-767 (display IIFE). CR-380 touches adult counters, doc state, formValid. Different sections. Parallel-safe. |
| `pmsService.js` | CR-380 (2026-09-14) | JSON→FormData conversion, per-adult ID slots | **NONE** — BUG-396 touches L193 (balance_payment). CR-380 touched L149-196 identity/room/doc sections. Money block (L190-196) was preserved by CR-380 with "BUG-888/886 formulas preserved" comment. Safe. |

**Conflict result: CLEAR — proceed.**

---

## §4 Affected Files

| File | Edit Count | Risk | Sections |
|---|---|---|---|
| `src/pages/pms/CheckInPage.jsx` | 2 edit sites | CRITICAL (R6 display + submit) | L255-260 (handleConfirm), L766-767 (display IIFE) |
| `src/api/services/pmsService.js` | 1 edit site | CRITICAL (R6 financial payload) | L193 (balance_payment) |

**Files NOT touched:** `roomGstCalculator.js`, `profileTransform.js`, `PmsCheckoutDrawer.jsx`, `OrderEntry.jsx`, `CollectPaymentPanel.jsx`, `orderTransform.js`, `App.js`, `AppProviders.jsx`

---

## §5 Downstream Impact

| Area | Impact | Assessment |
|---|---|---|
| GST slab selection | Correct slab will now be used (room amount only, not room+advance) | ✅ Corrects wrong 18%→5% overcalculation when advance pushes base over 7500 |
| `gst_tax` sent to API | Derived from corrected `gstTax` — no change to the field itself | ✅ Unchanged mechanism |
| `balance_payment` API field | Restores subtraction of advance — guest owes total minus what they paid | ✅ Correct financial semantics |
| `advance_payment` API field | Unchanged — still sent as `advance` | ✅ No change |
| `order_amount` API field | Unchanged | ✅ No change |
| Zero-advance case (advance=0) | `gstBase = amt + 0 = amt` before vs `gstBase = amt` after — mathematically identical | ✅ No regression |
| PmsCheckoutDrawer (checkout billing) | Reads `room_gst_tax` from `roomPaymentSummary.gstTax` — populated at check-in. Fix improves checkout accuracy | ✅ Downstream benefit |
| BUG-388 QA TC-388-01 | Was PASS (Room ₹7,500 + Adv ₹100 → 18%). Now SUPERSEDED — correct answer is 5% slab | ⚠️ TC-388-01 result was based on wrong business rule |

---

## §6 Numeric Verification Table

| Scenario | Before Fix (wrong) | After Fix (correct) |
|---|---|---|
| Room ₹100, Adv ₹100 | gstBase=₹200, GST=₹10, Total=₹210, balance=₹110 | gstBase=₹100, GST=₹5, Total=₹105, **balance=₹5** |
| Room ₹7,500, Adv ₹100 | gstBase=₹7,600→18%, GST=₹1,368, balance=₹7,868 | gstBase=₹7,500→**5%**, GST=₹375, **balance=₹7,775** |
| Room ₹7,500, Adv ₹0 | gstBase=₹7,500→5%, GST=₹375, balance=₹7,875 | gstBase=₹7,500→5%, GST=₹375, balance=₹7,875 (**unchanged**) |
| Room ₹8,000, Adv ₹0 | gstBase=₹8,000→18%, GST=₹1,440, balance=₹9,440 | gstBase=₹8,000→18%, GST=₹1,440, balance=₹9,440 (**unchanged**) |
| Room ₹5,000, Adv ₹200 | gstBase=₹5,200→5%, GST=₹260, balance=₹5,260 | gstBase=₹5,000→5%, GST=₹250, **balance=₹5,050** |

---

*Impact Analysis complete: BUG-396. Gate 2 DONE. Proceeding to Gate 3.*
