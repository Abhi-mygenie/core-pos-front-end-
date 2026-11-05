# CR-431 — Intake (Gate 1)
## e-Invoice download link in Orders (Beta) report — gated by restaurant e_invoice setting

**ID:** CR-431 · **Type:** CR · **Date:** 2026-10-16
**Severity:** P0 · **Risk:** LOW · **Sprint:** nov_cr_batch
**Area:** Reports / Analytics
**Duplicate check:** DISTINCT
**Source:** OWNER-DIRECTED (2026-10-16)

## Description
When a restaurant has `e_invoice: "Yes"` in their profile settings, each order row in the **Orders (Beta)** report (`/order-report-beta`) should show a clickable download link for the e-invoice PDF/HTML. The backend already returns `invoice_details: { invoice_number, html_url, pdf_url }` per order row in `ORDER_REPORT_BETA_COMBINED` API.

## API Evidence
```json
// restaurants[0].basic.e_invoice = "Yes"/"No" — gates the feature
// Order row in daily-order-report-details-combined response:
{
  "source": "orders",
  "order_id": 1233273,
  "invoice_details": {
    "invoice_number": "18/002601",
    "html_url": "https://crm.mygenie.online/api/invoices/1ded5e32b1e14e6ca15bc78815edc1d0",
    "pdf_url": "https://crm.mygenie.online/api/invoices/1ded5e32b1e14e6ca15bc78815edc1d0/pdf"
  }
}
```

## Code Reality: NONE (not yet implemented)
- `profileTransform.js:settings` — `e_invoice` NOT mapped from `apiSettings.basic?.e_invoice`
- `OrderReportBetaPage.jsx` — NO `invoice_details` rendering exists (703 lines, confirmed by grep)

## Blast Radius: SMALL
1. `profileTransform.js` — add `eInvoice: toBoolean(apiSettings.basic?.e_invoice)` to settings
2. `OrderReportBetaPage.jsx` — conditionally render download icon/link on order rows when `restaurant.settings.eInvoice && row.invoice_details?.pdf_url`

## Open Decisions: NONE
Requirements clear — PDF preferred link (`pdf_url`), HTML as fallback. Show as download icon on order row.
