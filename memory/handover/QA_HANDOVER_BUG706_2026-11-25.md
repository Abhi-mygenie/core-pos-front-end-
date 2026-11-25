# QA Handover — BUG-706 (Order Report Beta — VAT amount mislabelled 'GST')

**Date:** 2026-11-25 · **Risk:** LOW · **Sprint:** nov_cr_batch
**File:** `src/pages/reports-module/OrderReportBetaPage.jsx`

---

## 1. Verification Matrix

| Edit | File | Change | Self-Test |
|---|---|---|---|
| E1 | OrderReportBetaPage.jsx:273 | `taxLabel = restaurant?.tax?.gstStatus ? 'GST' : (restaurant?.tax?.vatStatus ? 'VAT' : 'GST')` — BUG-706 | ✅ confirmed L273 |
| E2 | OrderReportBetaPage.jsx:511 | Column definition `label: taxLabel` — BUG-706 | ✅ confirmed L511 |
| E3 | OrderReportBetaPage.jsx:709 | Table header `<th>{taxLabel}</th>` — BUG-706 | ✅ confirmed L709 |
| E4 | OrderReportBetaPage.jsx:893 | Grand Total row `<span>{taxLabel}</span>` — BUG-706 | ✅ confirmed L893 |

Compile: webpack clean.

---

## 2. Browser Test Cases

| # | Test | Steps | Expected |
|---|---|---|---|
| T1 | VAT restaurant: column label = VAT | Login as owner@beanmeup.com → Orders (Beta) → check table header | Tax column header shows **"VAT"** (not "GST") |
| T2 | VAT restaurant: Grand Total label = VAT | Same → scroll to Grand Total section | "VAT" label in totals row |
| T3 | GST restaurant: column label = GST | Login as owner@palmhouse.com → Orders (Beta) | Tax column header shows **"GST"** (baseline — should not change) |
| T4 | GST restaurant: Grand Total label = GST | Same → scroll to Grand Total | "GST" in totals row (unchanged) |
| T5 | Tax amounts correct | VAT restaurant → verify ₹ values in tax column | Same numeric values as before — only label changed, not amounts |

---

## 3. Regression Tests

| # | What | Why |
|---|---|---|
| R1 | GST restaurants unaffected | taxLabel defaults to 'GST' when vatStatus is falsy |
| R2 | Excel export: tax column header matches | Excel export uses same column definition |

---

## 4. Registry Sync Confirmation

Registry: BUG-706 → GATE_5A_IMPLEMENTED · Sprint: nov_cr_batch ✅

---

## 5. Credentials + Environment

| Account | Password | Restaurant | Use |
|---|---|---|---|
| owner@beanmeup.com | Qplazm@10 | Bean Me Up | VAT restaurant — primary test |
| owner@palmhouse.com | Qplazm@10 | The Palm House | GST restaurant — regression baseline |

**Note:** Bean Me Up uses VAT (not GST). The backend sends VAT amounts in the `gst_amount` field — this is correct backend behaviour. Only the label changes in the FE.
