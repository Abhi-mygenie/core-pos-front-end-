# Implementation Plan — CR-431
## e-Invoice download link in Orders (Beta) report

**Role:** PLANNING (Gate 3) · **Date:** 2026-10-16
**Based on:** `impact/CR-431_IMPACT_ANALYSIS_2026_10_16.md` (GATE_2_CLOSED)
**Code Reality:** PARTIAL · Risk: LOW · 2 files (not R5)

---

## Scope Lock
**WILL change:** `profileTransform.js` (shared with BUG-572) · `OrderReportBetaPage.jsx`
**WILL NOT touch:** OrderCard.jsx, DashboardPage.jsx, any other file

---

## Step 0 — Entry Verification
```bash
# profileTransform insertion point
grep -c "eInvoice\|e_invoice" src/api/transforms/profileTransform.js
# Expected: 0

# Download icon available
grep "Download" src/pages/reports-module/OrderReportBetaPage.jsx
# Expected: import line with Download from lucide-react ✅

# Row structure
sed -n '559,567p' src/pages/reports-module/OrderReportBetaPage.jsx
# Expected: <tr key=..> <td>#{row.restaurant_order_id}</td>...

grep -c "CR-431" src/pages/reports-module/OrderReportBetaPage.jsx
# Expected: 0
```

---

## Edit E-1 — `profileTransform.js`: add `eInvoice` + `whatsappMessage` (SHARED WITH BUG-572)

Both BUG-572 and CR-431 add to the same `settings()` function. Apply in one combined edit:

```js
// BEFORE:
      printBillCustomerCopy: apiSettings.settings?.print_bill_customer_copy === 'Yes' || apiSettings.print_bill_customer_copy === 'Yes' || false,
    };
  },

// AFTER:
      printBillCustomerCopy: apiSettings.settings?.print_bill_customer_copy === 'Yes' || apiSettings.print_bill_customer_copy === 'Yes' || false,
      whatsappMessage: apiSettings.basic?.whatsapp_message === 'Yes', // BUG-572
      eInvoice: apiSettings.basic?.e_invoice === 'Yes', // CR-431
    };
  },
```

---

## Edit E-2 — `OrderReportBetaPage.jsx:L559-560`: add invoice download icon in order row

```jsx
// BEFORE:
                            <tr key={`${row.order_id}-${idx}`} className="border-t border-zinc-100 hover:bg-zinc-50/50" data-testid={`order-row-${row.order_id}`}>
                              <td className="px-3 py-2 font-mono font-medium text-zinc-800">#{row.restaurant_order_id}</td>

// AFTER:
                            <tr key={`${row.order_id}-${idx}`} className="border-t border-zinc-100 hover:bg-zinc-50/50" data-testid={`order-row-${row.order_id}`}>
                              <td className="px-3 py-2 font-mono font-medium text-zinc-800">
                                #{row.restaurant_order_id}
                                {/* CR-431: e-invoice download link */}
                                {restaurant?.settings?.eInvoice && row.invoice_details?.pdf_url && (
                                  <a
                                    href={row.invoice_details.pdf_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    title={`Download Invoice ${row.invoice_details.invoice_number || ''}`}
                                    className="ml-2 inline-flex items-center opacity-70 hover:opacity-100"
                                  >
                                    <Download className="w-3 h-3" style={{ color: '#F26B33' }} />
                                  </a>
                                )}
                              </td>
```

**`restaurant` is already in scope** — `OrderReportBetaPage.jsx` uses `useRestaurant()` (confirmed in imports).

---

## Execution
**Session 1** — execute first (not R5, lowest risk):
1. E-1: profileTransform.js combined edit (eInvoice + whatsappMessage)
2. E-2: OrderReportBetaPage.jsx download link

---

## Verification Matrix
| # | Check | Expected |
|---|---|---|
| V1 | `eInvoice: true` restaurant + order with invoice → Download icon shows | Orange download icon next to order number |
| V2 | `eInvoice: false` restaurant → no icon | Clean row, no download |
| V3 | Order without `invoice_details` → no icon | Null check works |
| V4 | Click icon → PDF opens in new tab | `target="_blank"` works |
| V5 | Clicking icon does NOT expand order row | `e.stopPropagation()` works |
| V6 | Compile clean | 0 new warnings |

## Post-Code Checklist
```
- [ ] registry.json: CR-431 → GATE_5A_IMPLEMENTED
- [ ] BUG_TRACKER.md updated
- [ ] FILE_OWNERSHIP.md: profileTransform.js + OrderReportBetaPage.jsx
- [ ] Code markers: CR-431 in both files
- [ ] Compile: clean
```
