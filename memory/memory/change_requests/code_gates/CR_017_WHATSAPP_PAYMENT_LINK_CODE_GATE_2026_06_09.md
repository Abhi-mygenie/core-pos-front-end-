# CR-017 — Code Gate / Scope Lock (Gate 4)

**Date:** 2026-06-09
**Sprint:** POS 4.0
**Status:** LOCKED
**Prerequisites:** Gate 2 (Impact Analysis) ✅, Gate 3 (Implementation Plan) ✅

---

## 1. Scope Lock — What Is IN

### New Files (2)
| File | Purpose |
|---|---|
| `src/api/services/paymentLinkService.js` | API wrapper: `sendPaymentLink()` → `POST /api/v1/razor-pay/payment-link` |
| `src/components/cards/WhatsAppPaymentModal.jsx` | Popup: name + phone + amount → send → toast |

### Modified Files (2)
| File | Change |
|---|---|
| `src/api/constants.js` | +1 line: `PAYMENT_LINK: '/api/v1/razor-pay/payment-link'` |
| `src/components/cards/OrderCard.jsx` | +import, +state (`showWhatsAppModal`), +visibility flag (`![3,6,10].includes(fOrderStatus)`), +WhatsApp icon button in footer, +modal render |

---

## 2. Scope Lock — What Is OUT

| Item | Reason |
|---|---|
| `CollectPaymentPanel.jsx` | Q-017-1: OrderCard only |
| `TableCard.jsx` | Not applicable |
| `DashboardPage.jsx` | No prop changes needed |
| Feature flag / permission gating | Q-017-4/5: show for everybody |
| Amount editing | Q-017-6: order actual values only |
| Post-send button state change | Q-017-9: same icon persists |
| Razorpay / WhatsApp logic | Backend responsibility |
| Payment callback / webhook | Backend responsibility |

---

## 3. Baseline Rules

**No baseline rules affected.** This is a new capability (WhatsApp send), not a modification of billing/tax/totals/payment flow. The `order.amount` is read-only — no financial computation added.

---

## 4. Dependencies

| Dependency | Status | Blocker? |
|---|---|---|
| Backend API `POST /api/v1/razor-pay/payment-link` | ✅ Live on preprod | No |
| Razorpay integration (backend) | ✅ Configured | No |
| WhatsApp template (backend) | ✅ Active | No |
| `order.phone` availability | ⚠️ Not always present | No — popup handles missing phone |

---

## 5. Risk Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| OrderCard footer overflow with new icon | LOW | Same 44×44px pattern as KOT/Cancel — verified in mockup |
| Missing customer phone | LOW | Popup provides phone input field |
| API failure | LOW | Error toast + modal stays open for retry |
| Icon renders on paid orders | LOW | Gated by `![3,6,10].includes(fOrderStatus)` |

---

## 6. Execution Sequence

| Step | File | Action |
|---|---|---|
| 1 | `api/constants.js` | Add `PAYMENT_LINK` constant |
| 2 | `api/services/paymentLinkService.js` | Create service file |
| 3 | `components/cards/WhatsAppPaymentModal.jsx` | Create modal component |
| 4 | `components/cards/OrderCard.jsx` | Wire icon + modal |

Steps 1-2 are independent. Step 3 is independent. Step 4 depends on 1-3.

---

## 7. GO / NO-GO Checklist

| # | Item | Status |
|---|---|---|
| 1 | Impact Analysis complete | ✅ |
| 2 | Implementation Plan complete | ✅ |
| 3 | Scope locked (IN/OUT defined) | ✅ |
| 4 | No baseline amendments needed | ✅ |
| 5 | Backend API verified live | ✅ |
| 6 | UI mockup owner-approved | ✅ |
| 7 | All 9 owner Qs answered | ✅ |
| 8 | **Owner GO** | ✅ |

---

*Generated: 2026-06-09 — CR-017 Code Gate*
