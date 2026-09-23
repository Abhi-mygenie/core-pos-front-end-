# BUG-401 INTAKE — PMS Checkout Omits Room GST; Guest Folio Balance Understates by GST

**ID:** BUG-401
**Date:** 2026-09-15
**Registered by:** Intake agent (ALPHA v0.7)
**Source:** QA-FOUND — BATCH-10 Full Regression (2026-09-15), finding F-02
**Related:** BUG-386 (same room GST feature area), CR-364 (GuestFolioPage), PmsCheckoutDrawer.jsx, orderTransform.js
**Type:** BUG (API contract + FE data path)
**Confidence:** CONFIRMED — Playwright captured checkout POST payload; curl probed both endpoints

---

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Severity | **P0 — BLOCKER** |
| Risk | **CRITICAL** — R6 (money, GST, room billing, settlement). Room checkout silently omits GST from payment record. Financial compliance issue. |
| Area | PMS → PmsCheckoutDrawer + orderTransform + GuestFolioPage |
| Duplicate check | **RELATED** to BUG-386 (same area — BUG-386 fixed GST at check-in; this is a different gap at checkout). **DISTINCT** — different endpoint, different code path. |
| Code reality | **CONFIRMED** — `PmsCheckoutDrawer.jsx:L157` reads `roomPaymentSummary.gstTax` which maps from `room_info.room_payment_summary.gst_tax` (orderTransform L432). But `get-single-order-new` does NOT return `gst_tax` in `room_payment_summary` — field absent. Result: `roomGstTax = 0` → `if (roomGstTax > 0)` skips payload field → `room_gst_tax` never sent. |
| Blast radius | **SMALL** — 2 files (`PmsCheckoutDrawer.jsx`, `orderTransform.js` R5 hotspot) |
| Fast Lane eligible | **NO** — R5 hotspot + CRITICAL R6 financial logic |

---

## Description

When staff check out a hotel guest via `PmsCheckoutDrawer`, the checkout payment POST (`/order/order-bill-payment`) is sent **without `room_gst_tax`** in the payload. This means:

1. **GST is never recorded against the room payment** — backend stores `room_gst_collected: 0`
2. **Night Audit §B shows `room_gst_collected: 0`** for every room checkout
3. **Guest Folio shows balance excluding GST** (₹1,000 instead of ₹1,050)
4. **BUG-386's OD-386-02 Option A fix is silently ineffective** (deferred TC-386-04 from the BUG-386 QA report)

---

## Root Cause (DATA FLOW TRACE)

```
PmsCheckoutDrawer.jsx:L157
  const roomGstTax = detail.roomInfo?.roomPaymentSummary?.gstTax ?? 0;
  if (roomGstTax > 0) payload.room_gst_tax = roomGstTax;
        ↑
        Reads from roomPaymentSummary.gstTax
        ↓
orderTransform.js:L432
  gstTax: parseFloat(api.room_info.room_payment_summary.gst_tax) || 0
                                   ↑
                     get-single-order-new does NOT return gst_tax here
                     → always 0 → condition skips payload field
```

**What the endpoint actually returns:**
```
get-single-order-new  →  room_info.room_payment_summary  →  NO gst_tax field
get-single-order-new  →  room_info.gst_tax               →  50  ← THIS exists
employee-orders-list  →  room_info.gst_tax               →  50  ← also exists
```

The GST value IS available at `room_info.gst_tax` (top-level of `room_info`, not inside `room_payment_summary`). This is already the rule established for CR-364 (Q-364P-05: "use `room_info.gst_tax`").

---

## Evidence

- QA report: `test_reports/QA_REPORT_BATCH10_2026_09_15.md` §S3-06, S3-08, finding F-02
- Payload captured: `POST /order/order-bill-payment → { payment_amount:1000, gst_tax:0, grant_amount:1000, room_gst_tax: ABSENT }`
- Curl probe `get-single-order-new` order 1232382: `room_payment_summary` = no `gst_tax`, `room_info.gst_tax = 50`
- Curl probe `employee-orders-list` same order: `remaining_room_balance = 1050, gst_tax = 50`
- Night Audit probe: `room_gst_collected: 0` (consequence)

Evidence saved in QA report. Curl probe evidence at `test_reports/QA_REPORT_BATCH10_2026_09_15.md` §S3.

---

## Fix Path

**Two-part FE fix:**

**Part A — `orderTransform.js` (+1 line in `roomInfo` mapping):**
```js
roomInfo: api.room_info ? {
  roomPrice:      parseFloat(api.room_info.room_price)      || 0,
  // ... existing fields ...
  gstTax:         parseFloat(api.room_info.gst_tax)         || 0,  // BUG-401: direct room_info.gst_tax (Q-364P-05 rule)
  roomPaymentSummary: ...
```

**Part B — `PmsCheckoutDrawer.jsx:L157` (1 line change):**
```js
// BEFORE — reads from roomPaymentSummary which gets 0 from get-single-order-new
const roomGstTax = detail.roomInfo?.roomPaymentSummary?.gstTax ?? 0;

// AFTER — reads direct from roomInfo.gstTax (Q-364P-05: use room_info.gst_tax)
const roomGstTax = detail.roomInfo?.gstTax ?? 0;
```

**Also affects GuestFolioPage.jsx** — the folio balance display reads `folio.gstTax` which comes from `folioTransform.fromAPI` which already reads `room_info.gst_tax` correctly (Q-364P-05 applied at CR-364). So the folio DISPLAY is already correct. The issue is only in the checkout PAYLOAD. The folio shows ₹1,000 because `remaining_room_balance` from `get-single-order-new` = 1000 (excludes GST). This is a backend inconsistency — the balance should be 1050. Backend brief needed.

**Backend brief needed:**
- `get-single-order-new → room_info.room_payment_summary.remaining_room_balance` should include GST (currently 1000, should be 1050)
- Or: FE adds `gstTax` to the balance display (R6 violation — owner decision needed)

---

## Owner Decisions Needed

| OD | Question |
|---|---|
| OD-401-01 | **Gate 3 GO** — fix is clear (2-line FE change). Approve IMPLEMENTATION? |
| OD-401-02 | **Folio balance display**: Should "Total Balance Due" on GuestFolioPage show ₹1,000 (backend `remaining_room_balance`) or ₹1,050 (room price + GST)? R6 owner approval required if FE computes the sum. |
| OD-401-03 | **F-04 (from regression):** Night Audit and Revenue Dashboard pages have no Sidebar and no Back button. All other PMS pages include the Sidebar. Add Sidebar + Back button to both pages, or keep shell-less? |
| OD-401-04 | **F-06 (from regression):** Revenue Dashboard fires 2 identical API requests on first open (double-fetch on mount). Fix the double-fetch, or ship as-is (no visible impact to user)? |

---

## Related Backend Note (F-03 from regression)

`room_info.balance_payment` backend double-counts (`balance_payment = FE-sent value + gst_tax`). No current UI impact since FE switched to `remaining_room_balance`. Backend brief filed in QA report F-03.

---

*Intake: 2026-09-15 · QA-FOUND · Confidence: CONFIRMED · Blast: SMALL · Risk: CRITICAL (R6) · Fast Lane: NO · Next: Gate 2 Impact Analysis after OD-401-01 + OD-401-02 answered*
