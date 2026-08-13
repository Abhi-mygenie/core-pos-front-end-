# POS3.0 BUG-099 — QA Handoff (Final) — 2026-05-19

## 1. Change Summary

QSR billing: single-step flow. Add items → billing visible immediately → "Place & Pay" or "Place & Hold". No separate Place Order step. No tip. Payment pills: Cash / Card / UPI / Hold. Empty cart = clean state (no buttons).

---

## 2. P0 Smoke Tests — Non-QSR Regression

| # | Test | Expected |
|---|---|---|
| T-01 | QSR OFF: Add items → bottom buttons | Place Order + Collect Bill visible (unchanged) |
| T-02 | QSR OFF: Place Order | Works exactly as before |
| T-03 | QSR OFF: Collect Bill | Opens CollectPaymentPanel (unchanged) |
| T-04 | QSR OFF: Full payment flow (Cash/Card/UPI/Split/Credit/PayLater) | All methods work in CollectPaymentPanel (unchanged) |

---

## 3. P0 Smoke Tests — QSR Mode

### Empty Cart
| # | Test | Expected |
|---|---|---|
| T-10 | QSR ON: Open order screen, no items | No Place Order button, no Collect Bill button, no QSR billing — clean empty state |

### QSR Billing Section
| # | Test | Expected |
|---|---|---|
| T-20 | QSR ON: Add items to cart | QSR billing section appears immediately — bill summary, payment pills, CTA |
| T-21 | Verify no Tip input | Tip field absent. No tip row in bill summary |
| T-22 | Verify payment pills | Cash / Card / UPI / Hold — single row, 4 pills |
| T-23 | Verify bill calculation | Item Total, SC (if profile), Tax (GST/VAT), Round-off, Grand Total — matches CollectPaymentPanel for same inputs |

### Cash Flow
| # | Test | Expected |
|---|---|---|
| T-30 | Select Cash | Cash Received input appears, auto-filled with grand total |
| T-31 | Edit cash amount < total | CTA disabled (insufficient cash) |
| T-32 | Edit cash amount > total | Change amount displayed |
| T-33 | Click "Place & Pay" | Order placed + paid via `PLACE_ORDER` API. Auto-print fires (if autoBill). Navigates away. |

### Card Flow
| # | Test | Expected |
|---|---|---|
| T-40 | Select Card | TXN ID input appears (optional) |
| T-41 | Click "Place & Pay" without TXN ID | Works — TXN ID is optional |
| T-42 | Click "Place & Pay" with TXN ID | Order placed + paid. TXN ID in payload. |

### UPI Flow
| # | Test | Expected |
|---|---|---|
| T-50 | Select UPI | No additional input |
| T-51 | Click "Place & Pay" | Order placed + paid. |

### Hold Flow
| # | Test | Expected |
|---|---|---|
| T-60 | Select Hold | No cash/card input appears |
| T-61 | CTA text | "Place & Hold ₹X" (not "Place & Pay") |
| T-62 | Click "Place & Hold" | Order placed via `placeOrderWithPayment` with `method: 'paylater'`. Backend creates order with `f_order_status: 9` (pendingPayment). Navigates away. |
| T-63 | Dashboard: Hold tab | Order appears on Hold/pendingPayment tab |

### Full Billing Fallback
| # | Test | Expected |
|---|---|---|
| T-70 | Click "Full Billing →" link | Opens CollectPaymentPanel normally with all methods (unchanged) |

---

## 4. P1 Tests — Edge Cases

| # | Test | Expected |
|---|---|---|
| T-80 | QSR ON + Discount toggle ON | Discount dropdown + input appears in QSR billing, grand total recalculates |
| T-81 | QSR ON + Delivery order | Delivery charge input visible and editable |
| T-82 | QSR ON + Profile SC enabled (dine-in/walk-in) | SC row visible in bill summary, included in grand total |
| T-83 | QSR ON + Stay on Order Entry toggle | After Place & Pay / Place & Hold, stays on order screen |
| T-84 | QSR ON + already-placed order opened (edge case) | CTA says "Pay ₹X" / "Hold ₹X". Uses `collectBillExisting` → `BILL_PAYMENT` fallback |
| T-85 | QSR ON + remove all items from cart | Billing section disappears, clean empty state |

---

## 5. data-testid Coverage

| Element | data-testid |
|---|---|
| QSR billing section | `qsr-billing-section` |
| Payment pill (Cash) | `qsr-payment-cash-btn` |
| Payment pill (Card) | `qsr-payment-card-btn` |
| Payment pill (UPI) | `qsr-payment-upi-btn` |
| Payment pill (Hold) | `qsr-payment-paylater-btn` |
| Cash received input | `qsr-cash-received-input` |
| Card TXN ID input | `qsr-card-txn-input` |
| CTA button | `qsr-collect-bill-btn` |
| Full billing link | `qsr-full-billing-link` |
| Discount type select | `qsr-discount-type-select` |
| Discount value input | `qsr-discount-value-input` |
| Delivery charge input | `qsr-delivery-charge-input` |

---

## 6. Confirmation Checklist

- [ ] `CollectPaymentPanel.jsx` untouched
- [ ] `OrderEntry.jsx` untouched (in Revision 3)
- [ ] `orderTransform.js` untouched
- [ ] Non-QSR Place Order works
- [ ] Non-QSR Collect Bill works
- [ ] `/app/memory/final/` not updated

---

*— End of BUG-099 QA Handoff (Final) — 2026-05-19 —*
