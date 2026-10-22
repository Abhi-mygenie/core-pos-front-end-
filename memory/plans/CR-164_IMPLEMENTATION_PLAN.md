# CR-164 — Implementation Plan (Gate 3)
## Add Send Payment Link Button to Order Beta Report (Hold Orders)

**Date:** 2026-10-18 | Stage: Gate 3 | Based on: CR-164 Impact Analysis

---

## Owner Decisions Locked

| OD | Decision |
|---|---|
| OD-164-01 | Target page: `OrderReportBetaPage` (Orders Beta) ✅ |
| OD-164-02 | Show button for: `f_order_status === 9` (Hold/Paylater orders only) ✅ |

---

## Scope Lock

**File WILL change:** `src/pages/reports-module/OrderReportBetaPage.jsx` (1 file)
**Files WILL NOT touch:** `WhatsAppPaymentModal.jsx` · `paymentLinkService.js` · any other file

---

## Entry Verification

| # | Line | Must read |
|---|---|---|
| V-A | L6 | `import { cancelAndRefund } from '../../api/services/razorpayRefundService'; // CR-165` — last import before blank line |
| V-B | L222 | `const { currencySymbol, printerAgents, paymentTypes: restaurantPaymentTypes, restaurant } = useRestaurant();` — `restaurant` already destructured ✅ |
| V-C | L231 | `const [printingIds, setPrintingIds] = useState(() => new Set());` — last useState before sidebarExpanded |
| V-D | L629 | `{/* Refund — CR-165 unchanged: Razorpay PG non-cancelled only */}` — anchor for button insertion |
| V-E | L640 | `</div>` — closing div of flex actions container |
| V-F | L641 | `</td>` — closing td of actions column |

---

## Edit 1 — E-1: Add WhatsAppPaymentModal import (after L20)

**INSERT after:** `import api from '../../api/axios'; // CR-349`

```js
import WhatsAppPaymentModal from '../../components/cards/WhatsAppPaymentModal'; // CR-164
```

**Delta:** +1 line

---

## Edit 2 — E-2: Add modal state (after L231)

**INSERT after:** `const [printingIds, setPrintingIds] = useState(() => new Set());`

```js
const [paymentLinkTarget, setPaymentLinkTarget] = useState(null); // CR-164
```

**Delta:** +1 line

---

## Edit 3 — E-3: Add Pay Link button in row actions (before closing `</div>` at L640)

**INSERT before:** `</div>` (closing the flex actions container, after the Refund button block L629-639)

```js
                                  {/* CR-164: Send Payment Link — Hold/Paylater orders, Razorpay-enabled restaurants */}
                                  {row.f_order_status === 9 && restaurant?.settings?.razorpayEnabled && (
                                    <button
                                      onClick={() => setPaymentLinkTarget(row)}
                                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-sm border transition-colors border-green-300 text-green-700 hover:bg-green-50 cursor-pointer"
                                      data-testid={`pay-link-btn-${row.order_id}`}
                                    >
                                      Pay Link
                                    </button>
                                  )}
```

**Delta:** +10 lines

---

## Edit 4 — E-4: Render WhatsAppPaymentModal (before closing tag of component, after L641)

**INSERT after:** `</td>` (closing tag of actions column)

The modal needs to be rendered outside the table row. Find the nearest appropriate location — after the row mapping `</tr>` and before `</tbody>`, or better: at the end of the component return, before the final `</div>`.

Find this comment near the end of the file:
```js
{/* Grand Total Footer */}
```

**INSERT before** the Grand Total section:
```js
        {/* CR-164: WhatsApp Payment Link Modal */}
        {paymentLinkTarget && (
          <WhatsAppPaymentModal
            isOpen={!!paymentLinkTarget}
            onClose={() => setPaymentLinkTarget(null)}
            order={{
              orderId: paymentLinkTarget.order_id,
              id: paymentLinkTarget.order_id,
              amount: paymentLinkTarget.order_amount_raw || 0,
              customerName: paymentLinkTarget.customer_name || '',
              phone: paymentLinkTarget.customer_phone || '',
            }}
            restaurantName={restaurant?.name || ''}
          />
        )}
```

**Delta:** +14 lines

---

## Total Delta

```
E-1: +1 line  (import)
E-2: +1 line  (state)
E-3: +10 lines (button)
E-4: +14 lines (modal render)
Total: +26 lines, 1 file
```

---

## Verification Matrix

| # | Verify | Method |
|---|---|---|
| V-1 | "Pay Link" button visible on Hold orders — Razorpay restaurant | Browser: `owner@jeshnest.com` → Orders Beta → Hold tab |
| V-2 | Button NOT visible for non-Razorpay restaurants | Browser: `owner@cafe103.com` → Hold tab → no Pay Link button |
| V-3 | Button NOT visible for Settled/Cancelled/Running orders | Browser: switch tabs — button only on Hold rows |
| V-4 | Clicking Pay Link opens WhatsApp modal | Browser: click button → modal appears with order # |
| V-5 | Modal closes on ✕ or after sending | Browser: close/send → modal disappears, row unchanged |
| REG-1 | Existing actions (Change/Unpaid/Reprint/Refund) unaffected | Browser: verify on Settled rows |
| REG-2 | Compile: 0 new warnings | webpack |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-164 → GATE_5A_IMPLEMENTED
- [ ] CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: CR-164 entry for OrderReportBetaPage.jsx
- [ ] Code marker: // CR-164 on all added lines
- [ ] Compile: 0 new warnings
```

Planning complete: CR-164 | Gate 3 | Risk: LOW-MEDIUM | File: OrderReportBetaPage.jsx
Awaiting Gate 4 GO
