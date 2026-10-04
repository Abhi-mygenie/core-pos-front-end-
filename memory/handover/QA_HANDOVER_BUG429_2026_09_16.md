# QA Handover — BUG-429 (Combined with BUG-426 + BUG-427)
**Date:** 2026-09-16
**Risk:** CRITICAL — room orders GST under-counted by ~₹18 in folio and in-house

---

## 1. Verification Matrix Results

| Edit | File | Verification | Self-Test |
|------|------|-------------|-----------|
| `gstPct` kept as `const`, `gstAmt` now `let` | `folioTransform.js` L116-118 | Present | ✅ PASS |
| `gst_tax_amount \|\| tax_amount` read first | `folioTransform.js` L118 | `parseFloat(d.gst_tax_amount \|\| d.tax_amount \|\| 0)` | ✅ PASS |
| Inclusive branch | `folioTransform.js` L120-123 | `(fd.tax_calc \|\| '').toLowerCase() === 'inclusive'` | ✅ PASS |
| `totalAmount`/`sgst`/`cgst` cascade from corrected `gstAmt` | L132-134 | Unchanged, reference `gstAmt` | ✅ PASS |
| `roomGstApplicable` guard intact | `pmsService.js` L126 | First line of reduce | ✅ PASS |
| `gst_tax_amount \|\| tax_amount` read first | `pmsService.js` L129 | Same pattern | ✅ PASS |
| Inclusive branch | `pmsService.js` L133-136 | Same pattern | ✅ PASS |
| Compile | — | 0 new warnings | ✅ PASS |

---

## 2. Test Cases (Combined QA for BUG-426 + BUG-427 + BUG-429)

### TC-01 — Folio Room Orders tile shows ₹256 (CRITICAL)
**Guest:** "test gst" (order #000069, r1)
**Steps:** PMS → Folio for test gst
**Expected:** Room Orders tile = **₹256** (was ₹238 before BUG-429)
**Was:** ₹238 (GST under-counted)

### TC-02 — Folio Total Balance Due = ₹1,947
**Steps:** Same folio, Balance Breakdown section
**Expected:** Total Balance Due = **₹1,947** = ₹950 + ₹741 + ₹256
**Was:** ~₹1,929

### TC-03 — In-House balance = ₹1,947
**Steps:** PMS → In-House Guests page
**Expected:** Balance for test gst = **₹1,947** (was ₹1,930.4)
**Cross-check:** Matches Checkout Grand Total exactly

### TC-04 — Folio and In-House match Checkout Grand Total exactly
**Steps:** Open folio → Check Out → read GRAND TOTAL
**Expected:** GRAND TOTAL = **₹1,947**. Both Folio Total Balance Due and In-House balance must equal this.

### TC-05 — roomGstApplicable=false: no GST added (guard intact)
**Steps:** Restaurant with `roomGstApplicable = false` → check In-House balance
**Expected:** Room orders use pre-tax amount only (early return fires, BUG-429 GST block skipped)

### TC-06 — gst_tax_amount absent: fallback to food_details.tax % (no regression)
**Steps:** Any guest whose room order items have `gst_tax_amount = null/0`
**Expected:** Falls back correctly to `food_details.tax` % with inclusive/exclusive branch

---

## 3. Regression Tests

| # | What to verify | Why |
|---|---------------|-----|
| R1 | BUG-427 Room Orders section (per-row display pre-tax + expand) | folioTransform modified — per-row `amount` field unchanged, only `gstAmount`/`totalAmount` corrected |
| R2 | BUG-426 transferredFnb and roomBalance still correct | pmsService modified — only GST block inside roomOrdersTotal changed |
| R3 | `gstPercent` display field still shows correct % | `gstPct = parseFloat(fd.tax)` unchanged at L116 |
| R4 | sgst/cgst fields correct (half of gstAmt each) | L133-134 unchanged, reference corrected gstAmt |

---

## 4. Registry Sync Confirmation

- Registry synced: **YES**
- BUG-429 status: `GATE_5A_IMPLEMENTED`
- Sprint: `pos_pms_1`
- EXIT GATE: **5/5 PASS**
  - ☑ 1. registry.json synced
  - ☑ 2. BUG_TRACKER.md updated
  - ☑ 3. FILE_OWNERSHIP.md updated
  - ☑ 4. Code markers: `// BUG-429` in all modified sections
  - ☑ 5. Compile: 0 new warnings

---

## 5. Credentials + Environment

- **Test guest:** "test gst" — room ₹1,000, GST ₹50, advance ₹100, order #000069, r1
- **Expected:** Room Orders ₹256, Total Balance Due ₹1,947, In-House balance ₹1,947
- **Test credentials:** `/app/memory/test_credentials.md`
- **URL:** preprod.mygenie.online → PMS → In-House (balance) + Folio (tiles + total)
