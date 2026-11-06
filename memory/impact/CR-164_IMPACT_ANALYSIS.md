# CR-164 — Impact Analysis (Gate 2)
## Add Send Payment Link Button to Order Report (Beta) Rows

**Date:** 2026-10-18
**Stage:** Gate 2 — Impact Analysis
**Code Reality:** NONE — WhatsAppPaymentModal not wired in OrderReportBetaPage at all
**Conflict Pre-Check:** `OrderReportBetaPage.jsx` last touched BUG-546 (L40, L52 — getPaymentBadge) and BUG-547 (L88 — DashboardMockup, separate file). Our additions are in the imports + state + row actions area. BUG-546's L40/L52 are in the badge map — no overlap.

## OD-164-01 LOCKED — Correct page confirmed
Owner confirmed 2026-10-18: CR-164 is about **OrderReportBetaPage** (Order Beta report). ✅

---

### What exists and works (on live dashboard):
- `src/components/cards/WhatsAppPaymentModal.jsx` ✅ — sends Razorpay payment links via WhatsApp
- `src/api/services/paymentLinkService.js` ✅ — `sendPaymentLink()` function
- Feature is gated by `restaurant.settings.razorpayEnabled`
- Works in `OrderCard.jsx` on the live dashboard

### What's missing in OrderReportBetaPage:
- No import of `WhatsAppPaymentModal`
- No state for the modal (`paymentTarget` / `setPaymentTarget`)
- No button in the row actions area (L586-648)
- No `useRestaurant` to read `razorpayEnabled`

---

## Data Flow Trace
```
OrderReportBetaPage row → row.order_id + row.restaurant_order_id
→ "Send Payment Link" button (gated: restaurant.razorpayEnabled && row.f_order_status = Unpaid/Running)
→ setPaymentTarget(row)
→ WhatsAppPaymentModal opens with order data
→ sendPaymentLink(orderId, phone, amount) → WhatsApp message with Razorpay link
```

---

## Exact Changes Needed

### `OrderReportBetaPage.jsx` — 4 additions:

**E-1: Add import** (top of file)
```js
import WhatsAppPaymentModal from '../../components/cards/WhatsAppPaymentModal'; // CR-164
```

**E-2: Add `useRestaurant` to existing destructure** (~L222)
```js
const { currencySymbol, printerAgents, paymentTypes: restaurantPaymentTypes, restaurant } = useRestaurant();
// already has `restaurant` — confirm it's already destructured
```
*(If `restaurant` is already destructured from `useRestaurant`, no change needed here)*

**E-3: Add modal state** (in useState block ~L228)
```js
const [paymentLinkTarget, setPaymentLinkTarget] = useState(null); // CR-164
```

**E-4: Add button in row actions** (L586-648, inside the actions `<td>`)
```js
{/* CR-164: Send Payment Link — gated by Razorpay */}
{restaurant?.settings?.razorpayEnabled && row.f_order_status !== 3 && row.f_order_status !== 6 && (
  <button
    data-testid={`send-payment-link-${row.order_id}`}
    onClick={() => setPaymentLinkTarget(row)}
    className="px-2 py-1 text-xs font-medium rounded border"
    style={{ color: COLORS.primaryGreen, borderColor: COLORS.primaryGreen }}
  >
    Pay Link
  </button>
)}
```

**E-5: Render modal** (end of JSX, before closing div)
```js
{paymentLinkTarget && (
  <WhatsAppPaymentModal
    order={paymentLinkTarget}
    onClose={() => setPaymentLinkTarget(null)}
  />
)}
```

**Files: 1 — `OrderReportBetaPage.jsx`**
**No new service or component needed — reuses existing working code.**

---

## Risk Classification

| Criterion | Assessment |
|---|---|
| Financial logic? | NO — triggers existing payment link flow |
| R5 hotspot? | NO |
| Lines changed | ~15 added |
| Files touched | 1 |
| Risk | LOW-MEDIUM — wires existing tested modal |

**Risk: LOW-MEDIUM** — no new logic, purely wiring an existing component.

---

## Owner Decision

**Gate condition for "Pay Link" button:** Which order statuses should show the button?
- Unpaid orders only (`f_order_status = 9` paylater / running)?
- Or any unsettled order?

**Test account:** `owner@jeshnest.com` (has Razorpay integration — button will be visible there)

---

## Verification
| # | Verify | Method |
|---|---|---|
| V-1 | "Pay Link" button visible for Razorpay-enabled restaurants | Browser: jeshnest account, Order Report |
| V-2 | Button NOT visible for non-Razorpay restaurants | Browser: cafe103 account |
| V-3 | Modal opens on click | Browser: click Pay Link → WhatsApp modal appears |
| REG | Existing row actions (Change/Unpaid/Reprint) unaffected | Browser: verify existing buttons still work |

---

Planning complete: CR-164 | Gate 2 | Risk: LOW-MEDIUM | 1 file
Owner decision: which order statuses show the Pay Link button?
Own session (independent of other items)
