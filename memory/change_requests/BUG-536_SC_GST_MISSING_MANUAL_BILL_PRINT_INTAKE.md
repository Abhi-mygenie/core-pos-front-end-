# BUG-536 — SC GST MISSING FROM MANUAL BILL PRINT (DASHBOARD + ORDER TAKING PAGE)
**Registered:** 2026-10-12
**Type:** BUG
**Severity:** P1 — HIGH
**Risk:** CRITICAL
**Sprint:** oct_cr_batch
**Status:** GATE_1_INTAKE

---

## Description

When a cashier manually prints a bill from the **Dashboard** (OrderCard print button) or the **Order Taking page** (PrintBillButton in OrderEntry header), the printed bill's `gst_tax` field does **not include GST on the service charge**. The same bill printed from the **Collect Bill page** (CollectPaymentPanel) shows the correct GST including SC GST.

**API affected:** `POST /api/v1/vendoremployee/order-temp-store`

---

## Root Cause

`buildBillPrintPayload` in `orderTransform.js` has two internal paths gated by `hasFinancialOverrides = overrides.orderItemTotal !== undefined`:

**Collect Bill path (L1886–1962) — CORRECT:**
```javascript
gst_tax += serviceChargeAmount * scTaxRate;  // L1954 — SC GST added ✓
```

**Manual Print path (L1964–2011) — BROKEN:**
```javascript
// serviceChargeAmount = order.serviceTax   ← SC amount read ✓
// gst_tax from items only                  ← SC GST NEVER added ✗
gst_tax = Math.round(gst_tax * 100) / 100;  // L2010 — SC GST absent
```

`overrides.serviceChargeTaxPct` is already passed by both `OrderCard` and `PrintBillButton` but is completely unused in the manual path.

---

## Duplicate Check

**DISTINCT** — no prior CR/BUG for this gap.

---

## Evidence

- **Source:** OWNER-REPORTED (2026-10-12)
- **Confidence:** CONFIRMED — code trace of `buildBillPrintPayload` + full caller audit
- **Investigation report:** `INV-SC-GST-PRINT_INVESTIGATION_REPORT.md`

**Full caller audit:**

| Caller | SC GST correct? |
|---|---|
| `CollectPaymentPanel.handlePrintBill` | ✓ (passes `gstTax` override with SC GST included) |
| `CartPanel.handleCollectBill` (QSR) | ✓ (passes `gstTax = printGstTax` with SC GST) |
| `OrderCard.jsx` (Dashboard) | ✗ (`serviceChargeTaxPct` passed but unused) |
| `PrintBillButton` `RePrintButton.jsx` (Order Taking) | ✗ (same gap) |
| `FolioCheckoutPanel.printBill` | ✗ (passes `{}`) |
| Report page reprints | ✗ (pass `{}`) |

---

## Severity Rubric

**P1 — HIGH:** Every manual reprint from Dashboard or Order Taking page shows wrong GST when SC is configured. Financial impact — printed bill understates tax. Every restaurant with service charge affected.

---

## Risk Classification

**CRITICAL** — `orderTransform.js` is R5 hotspot + financial/tax calculation. Fast Lane eligible: **NO**.

---

## Blast Radius

- **Scope:** SMALL — 1 file (`orderTransform.js`), 2 lines added in manual print path (~L2010)
- **Hotspot:** YES (`orderTransform.js`)

---

## Code Reality

**FULL** — the gap exists at HEAD. `gst_tax = Math.round(gst_tax * 100) / 100` at L2010 with no SC GST line before it.

---

## Fix

```javascript
// After L2010: gst_tax = Math.round(gst_tax * 100) / 100;
const scTaxRateManual = (overrides.serviceChargeTaxPct || 0) / 100;
gst_tax = Math.round((gst_tax + serviceChargeAmount * scTaxRateManual) * 100) / 100;
```

**Why safe for all callers:** `OrderCard` and `PrintBillButton` already pass `serviceChargeTaxPct`. `FolioCheckoutPanel` and report pages pass `{}` → `scTaxRateManual = 0` → `+0`, no regression.

---

## Next

→ Gate 2 GO → Impact Analysis → Gate 3 → Gate 4 GO → Implementation
