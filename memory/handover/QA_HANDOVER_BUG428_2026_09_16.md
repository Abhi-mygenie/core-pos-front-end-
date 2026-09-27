# QA Handover — BUG-428
**Date:** 2026-09-16
**Implemented by:** IMPLEMENTATION agent
**Risk:** MEDIUM (R5 hotspot — display only, no formula change)

---

## 1. Inherited from Plan — Verification Matrix Results

| Edit | File | Verification | Self-Test |
|------|------|-------------|-----------|
| Lodging GST block before Advance Paid | `CollectPaymentPanel.jsx` L1836-1842 | Present between Room Charge and Advance Paid | ✅ PASS |
| Guard `roomInfo.gstTax > 0` | L1837 | Present | ✅ PASS |
| Guard `restaurant?.settings?.roomGstApplicable !== false` | L1837 | Present, consistent with BUG-338 at L276 | ✅ PASS |
| `data-testid="checkout-room-gst"` | L1838 | Present | ✅ PASS |
| `// BUG-428` code marker | L1836 | Present | ✅ PASS |
| Compile | — | webpack 1 pre-existing warning, 0 new | ✅ PASS |

Self-test: **5/5 code checks + compile verified**

---

## 2. Test Cases for QA

### TC-01 — Folio checkout ROOM breakdown shows Lodging GST line (PRIMARY)
**Steps:** Login → PMS → In-House Guests → "test gst" → View Folio → Check Out
**Expected ROOM breakdown:**
```
Room Charge    ₹1,000
Lodging GST    +₹50       ← NEW LINE
Advance Paid   −₹100
Balance        ₹950       ← math now adds up: 1000 + 50 − 100 = 950 ✓
```
**Was:** Room Charge ₹1,000 → Advance Paid −₹100 → Balance ₹950 (GST hidden, math appeared wrong)

### TC-02 — Dashboard checkout ROOM breakdown shows Lodging GST line
**Steps:** Dashboard → open a room order with GST → Collect Payment / Checkout
**Expected:** Same ROOM breakdown with Lodging GST line visible

### TC-03 — Balance amount unchanged (no formula regression)
**Steps:** TC-01 or TC-02
**Expected:** Balance = **₹950** (unchanged from BUG-425 fix). Only display line added.

### TC-04 — roomGstApplicable=false: Lodging GST line hidden
**Steps:** Restaurant with `roomGstApplicable = false` → room checkout
**Expected:** Lodging GST line does NOT appear. Breakdown shows Room Charge → Advance Paid → Balance only.

### TC-05 — gstTax = 0: Lodging GST line hidden
**Steps:** Room with no GST (gstTax = 0) → checkout
**Expected:** Lodging GST line does NOT appear (guard `roomInfo.gstTax > 0` prevents it)

### TC-06 (R5 Regression) — Dine-in checkout unaffected
**Steps:** Non-room dine-in order → Collect Payment
**Expected:** No Lodging GST line. No change to dine-in checkout flow.

### TC-07 (R5 Regression) — Delivery checkout unaffected
**Steps:** Delivery order → Collect Payment
**Expected:** No Lodging GST line. No change to delivery checkout flow.

### TC-08 (R5 Regression) — Walk-in (non-room) checkout unaffected
**Steps:** Walk-in order → Collect Payment
**Expected:** No Lodging GST line. No change to walk-in checkout flow.

---

## 3. Regression Tests

| # | What to verify | Why |
|---|---------------|-----|
| R1 | `showRoomBooking` gate — Lodging GST only in room breakdown | New block is nested inside `{showRoomBooking && ...}` |
| R2 | BUG-425 roomBalance value unchanged | Balance display still reads `roomBalance` (₹950) — formula untouched |
| R3 | BUG-338 roomGstApplicable guard at L276 unaffected | Only added new display block; existing guard line intact |
| R4 | Split bill / partial payment flows | CollectPaymentPanel is shared — verify split bill UI not affected |

---

## 4. Registry Sync Confirmation

- Registry synced: **YES**
- BUG-428 status: `GATE_5A_IMPLEMENTED`
- Sprint: `pos_pms_1`
- EXIT GATE: **5/5 PASS**
  - ☑ 1. registry.json synced
  - ☑ 2. BUG_TRACKER.md updated
  - ☑ 3. FILE_OWNERSHIP.md updated (CollectPaymentPanel.jsx)
  - ☑ 4. Code markers: `// BUG-428` in modified section
  - ☑ 5. Compile: webpack 0 new warnings

---

## 5. Credentials + Environment

- **Test guest:** "test gst" — room ₹1,000, GST ₹50, advance ₹100
- **Expected ROOM breakdown:** Room Charge ₹1,000 → Lodging GST +₹50 → Advance Paid −₹100 → Balance ₹950
- **Test credentials:** `/app/memory/test_credentials.md`
- **URL:** preprod.mygenie.online → PMS → folio → Check Out → ROOM section
