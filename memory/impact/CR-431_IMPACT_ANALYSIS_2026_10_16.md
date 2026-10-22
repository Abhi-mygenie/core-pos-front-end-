# Impact Analysis — CR-431
## e-Invoice download link in Orders (Beta) report — gated by restaurant e_invoice setting

**Role:** PLANNING (Gate 2) · **Date:** 2026-10-16 · **Code Reality:** PARTIAL
**Conflict:** BUG-572 (profileTransform) — SHARED FILE — plan together, execute in same edit
**Files:** `profileTransform.js` (not R5) + `OrderReportBetaPage.jsx` (not R5)

---

## OD-cr431 — LOCKED
- `restaurants[0].basic.e_invoice = "Yes"/"No"` → map as `eInvoice: bool`
- Backend confirmed: `invoice_details: { invoice_number, html_url, pdf_url }` per order row
- Probe evidence: order 1233273 → `pdf_url = https://crm.mygenie.online/api/invoices/.../pdf`

## Fix (2 files, ~5 lines)

**E-1 — `profileTransform.js`:** Add to `settings()` (after `whatsappMessage` from BUG-572, or alongside it):
```js
eInvoice: apiSettings.basic?.e_invoice === 'Yes', // CR-431
```

**E-2 — `OrderReportBetaPage.jsx`:** Import `useRestaurant` (or access settings via context), then add a download icon cell per order row:
```jsx
{/* CR-431: e-invoice download link */}
{restaurant?.settings?.eInvoice && row.invoice_details?.pdf_url && (
  <a
    href={row.invoice_details.pdf_url}
    target="_blank"
    rel="noopener noreferrer"
    onClick={(e) => e.stopPropagation()}
    title={`Download Invoice ${row.invoice_details.invoice_number || ''}`}
    className="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-gray-100"
  >
    <Download className="w-3.5 h-3.5" style={{ color: COLORS.primaryOrange }} />
  </a>
)}
```

**Note:** Need to confirm `Download` icon is imported in OrderReportBetaPage (ArrowLeft, ChevronDown, Loader2 etc. already imported — check for Download).

## Conflict with BUG-572
Both BUG-572 and CR-431 add fields to `profileTransform.js settings()`. Must be applied in same edit or sequentially to avoid conflicts.

## Risk: LOW · 2 files · not R5 · ~5 lines
## Verification
- V1: Restaurant with `e_invoice: "Yes"` + order with `invoice_details.pdf_url` → download icon visible
- V2: Restaurant with `e_invoice: "No"` → no download icon
- V3: Order without `invoice_details` → no icon (null check)
- V4: Clicking download opens PDF in new tab ✅
