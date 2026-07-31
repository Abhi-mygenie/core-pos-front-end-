# POS3.0 BUG-099 QSR Quick Billing — Implementation Report — 2026-05-19

## 1. Summary

| Field | Value |
|---|---|
| Sprint | POS3.0 |
| Bug | BUG-099 — QSR / Cafe Quick Billing |
| Branch | `18-may-pos3.0` |
| Build result | **PASS** (`yarn build` — zero errors, 1 pre-existing warning) |
| Implementation date | 2026-05-19 |
| Commit allowed | No |

---

## 2. Files Changed

| # | File | Change | Lines |
|---|---|---|---|
| 1 | **NEW** `src/utils/qsrModePrefs.js` | localStorage read/write for QSR toggles | 45 lines |
| 2 | `src/pages/StatusConfigPage.jsx` | 2 new toggles (QSR Quick Billing + QSR Discount) in UI Elements | 7 insertion points |
| 3 | `src/components/order-entry/CartPanel.jsx` | QsrBillingSection component + conditional rendering | ~250 lines new component + bottom section refactor |
| 4 | `src/components/order-entry/OrderEntry.jsx` | QSR import, state, handleQsrCollectBill handler, CartPanel props | ~90 lines |

## 3. What Was Implemented

### StatusConfigPage — Visibility Settings
- "QSR Quick Billing" toggle: localStorage `mygenie_qsr_mode_enabled`, default OFF
- "QSR Discount" toggle: localStorage `mygenie_qsr_discount_enabled`, default OFF (only visible when QSR ON)
- Hydration, reset, save — all follow existing toggle pattern

### CartPanel — QSR Billing Section
- QsrBillingSection component renders when `qsrMode && hasPlacedItems`
- Bill calculation: itemTotal, discount, SC (auto profile), tip (profile-gated), delivery charge, tax (SGST/CGST/VAT), round-off, grand total
- Discount: editable dropdown + input when QSR Discount toggle ON
- Delivery charge: editable for delivery orders
- Tip: optional field when profile `features.tip` enabled
- Service Charge: auto-applied from profile (read-only display)
- Payment pills: Cash/Card/UPI respecting restaurant payment config
- Cash: auto-filled grand total, editable, change display
- Card: optional TXN ID
- Collect Bill CTA button
- "Full Billing →" fallback link to CollectPaymentPanel
- KOT/Bill checkboxes hidden in QSR mode
- Place Order button full-width in QSR mode (Collect Bill hidden for fresh orders)

### OrderEntry — QSR Collect Bill Handler
- `handleQsrCollectBill`: receives paymentData from CartPanel → calls `collectBillExisting` → `api.post(BILL_PAYMENT)` → auto-print → navigate
- Reuses existing Scenario 1 code pattern (L1612-1718)
- Respects "Stay on Order Entry" toggle
- Auto-print respects `autoBill` from profile

## 4. What Was NOT Changed

| File | Status |
|---|---|
| `CollectPaymentPanel.jsx` | UNTOUCHED |
| `orderTransform.js` | UNTOUCHED |
| `api/constants.js` | UNTOUCHED |
| `profileTransform.js` | UNTOUCHED |
| Non-QSR flow | UNTOUCHED — zero regression |
| `/app/memory/final/` | NOT UPDATED |

## 5. Business Rules Protection

| Rule | Preserved? |
|---|---|
| PAY-004 (prepaid payload) | YES — same `collectBillExisting` |
| TAX-001..008 | YES — same tax formulas |
| SC-001..006 | YES — auto from profile |
| TIP-001/002 | YES — profile-gated |
| ROUND-001/002 | YES — same round-off |
| TOTALS-001/002 | YES — same totals |
| DEL-004/005 | YES — delivery charge editable |

## 6. Gate Compliance

| Gate | Status |
|---|---|
| UX Decision Plan | PASS — owner approved |
| Owner Approval Plan | PASS — owner approved A |
| Code Diff Preview | PASS — owner approved A |
| Implementation | PASS — code matches diff preview |
| Build Validation | PASS — `yarn build` zero errors |

---

*— End of BUG-099 Implementation Report — 2026-05-19 —*
