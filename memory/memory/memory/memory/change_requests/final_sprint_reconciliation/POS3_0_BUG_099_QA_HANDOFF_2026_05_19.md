# POS3.0 BUG-099 QSR Quick Billing — QA Handoff — 2026-05-19

## 1. Summary

| Field | Value |
|---|---|
| Sprint | POS3.0 |
| Bug | BUG-099 — QSR / Cafe Quick Billing |
| Branch | `19-may` (code from `18-may-pos3.0` baseline, committed to `19-may`) |
| Build result | **PASS** (`yarn build` — zero errors, 1 pre-existing warning unrelated to BUG-099) |
| Implementation status | **COMPLETE** — all approved code applied |

---

## 2. Files Changed

| # | File | Type | Change |
|---|---|---|---|
| 1 | `src/utils/qsrModePrefs.js` | NEW | localStorage utility for QSR toggles |
| 2 | `src/pages/StatusConfigPage.jsx` | MODIFIED | 2 new toggles (QSR Quick Billing + QSR Discount) in UI Elements |
| 3 | `src/components/order-entry/CartPanel.jsx` | MODIFIED | QsrBillingSection component + conditional bottom rendering |
| 4 | `src/components/order-entry/OrderEntry.jsx` | MODIFIED | QSR state, handleQsrCollectBill handler, CartPanel props |

---

## 3. Scope Confirmation

| Constraint | Status |
|---|---|
| `CollectPaymentPanel.jsx` untouched | **CONFIRMED** — zero BUG-099/QSR modifications |
| Non-QSR flow unchanged | **CONFIRMED** — QSR section renders only when `qsrMode && hasPlacedItems` |
| Full Billing fallback remains | **CONFIRMED** — "Full Billing →" link opens CollectPaymentPanel |
| localStorage Phase 1 | **CONFIRMED** — `mygenie_qsr_mode_enabled`, `mygenie_qsr_discount_enabled` |
| `/app/memory/final/` not updated | **CONFIRMED** |

---

## 4. QA Test Matrix

### 4.1 Settings / Toggles

| # | Test | Expected | Priority |
|---|---|---|---|
| T-01 | Navigate to Visibility Settings → UI Elements section | QSR Quick Billing toggle visible (default OFF) | P0 |
| T-02 | Toggle QSR Quick Billing ON | Toggle turns green; QSR Discount toggle appears below | P0 |
| T-03 | Toggle QSR Quick Billing OFF | QSR Discount toggle disappears | P1 |
| T-04 | Toggle QSR Discount ON (while QSR ON) | Toggle turns green | P1 |
| T-05 | Hit Save, reload page | Both toggles retain saved values | P0 |
| T-06 | Hit Reset to Default | Both toggles return to OFF | P1 |

### 4.2 QSR Mode OFF — Zero Regression

| # | Test | Expected | Priority |
|---|---|---|---|
| T-10 | QSR OFF: Open order screen, add items | CartPanel renders exactly as before (KOT/Bill checkboxes, Place Order + Collect Bill buttons) | P0 |
| T-11 | QSR OFF: Place Order | Normal flow — no QSR section appears | P0 |
| T-12 | QSR OFF: Collect Bill | Opens CollectPaymentPanel normally | P0 |

### 4.3 QSR Mode ON — Fresh Order

| # | Test | Expected | Priority |
|---|---|---|---|
| T-20 | QSR ON: Open order screen, add items | KOT/Bill checkboxes hidden; Place Order button full-width; Collect Bill button hidden | P0 |
| T-21 | QSR ON: Click Place Order | Order placed normally; QSR billing section appears below cart items | P0 |

### 4.4 QSR Mode ON — QSR Billing Section

| # | Test | Expected | Priority |
|---|---|---|---|
| T-30 | QSR billing section visible | Green "QSR Billing" header; bill summary rows; payment pills; Collect Bill button; Full Billing link | P0 |
| T-31 | Payment pills: Cash / Card / UPI | Only methods enabled in restaurant config appear | P0 |
| T-32 | Select Cash → grand total auto-filled | Cash input shows grand total; change display shows ₹0.00 | P0 |
| T-33 | Select Card → optional TXN ID input | TXN ID field appears; can be left empty | P1 |
| T-34 | Select UPI | No additional input needed | P1 |
| T-35 | Click Collect Bill (Cash) | API call to BILL_PAYMENT; auto-print fires (if autoBill); navigates away | P0 |
| T-36 | Click Collect Bill (Card) | API call to BILL_PAYMENT; navigates away | P0 |
| T-37 | Click Collect Bill (UPI) | API call to BILL_PAYMENT; navigates away | P0 |
| T-38 | Click "Full Billing →" link | Opens CollectPaymentPanel normally | P1 |

### 4.5 QSR Discount

| # | Test | Expected | Priority |
|---|---|---|---|
| T-40 | QSR Discount OFF | No discount section in QSR billing | P1 |
| T-41 | QSR Discount ON | Discount dropdown (percentage/flat) + input appears | P1 |
| T-42 | Enter percentage discount (e.g., 10%) | Grand total recalculates: itemTotal × 0.9 + tax + SC + tip + delivery | P0 |
| T-43 | Enter flat discount (e.g., ₹50) | Grand total recalculates: (itemTotal - 50) + tax + SC + tip + delivery | P0 |

### 4.6 Delivery / SC / Tip

| # | Test | Expected | Priority |
|---|---|---|---|
| T-50 | Delivery order: delivery charge input visible | Editable, included in grand total | P1 |
| T-51 | Non-delivery order: no delivery charge | Delivery row hidden | P1 |
| T-52 | Profile SC ON + applicable type | SC row visible (auto-calculated, read-only), included in grand total | P1 |
| T-53 | Profile Tip ON + applicable type | Tip input visible (optional), included in grand total if entered | P2 |

### 4.7 Financial Parity

| # | Test | Expected | Priority |
|---|---|---|---|
| T-60 | Same order: compare QSR billing grand total vs CollectPaymentPanel | Grand totals must match exactly (same tax, SC, tip, round-off formulas) | P0 |
| T-61 | Same order: compare QSR collect bill API payload vs CollectPaymentPanel | Payload shape must match (same `collectBillExisting` transformer) | P0 |

### 4.8 Stay on Order Entry Integration

| # | Test | Expected | Priority |
|---|---|---|---|
| T-70 | "Stay on Order Entry" ON: QSR Collect Bill | Stays on order screen after billing (not navigate to dashboard) | P1 |
| T-71 | "Stay on Order Entry" OFF: QSR Collect Bill | Navigates to dashboard | P1 |

---

## 5. Data-TestId Coverage

| Element | data-testid |
|---|---|
| QSR mode toggle (Settings) | `qsr-mode-toggle` |
| QSR discount toggle (Settings) | `qsr-discount-toggle` |
| QSR billing section container | `qsr-billing-section` |
| Discount type select | `qsr-discount-type-select` |
| Discount value input | `qsr-discount-value-input` |
| Delivery charge input | `qsr-delivery-charge-input` |
| Tip input | `qsr-tip-input` |
| Payment pill (Cash/Card/UPI) | `qsr-payment-{id}-btn` |
| Cash received input | `qsr-cash-received-input` |
| Card TXN ID input | `qsr-card-txn-input` |
| Collect Bill button | `qsr-collect-bill-btn` |

---

## 6. Business Rules to Verify

| Rule | Check |
|---|---|
| PAY-004 (prepaid payload) | QSR uses `collectBillExisting` — same payload shape |
| TAX-001..008 | Same tax calculation as CollectPaymentPanel |
| SC-001..006 | SC auto-applied from profile when applicable |
| TIP-001/002 | Tip optional, profile-gated |
| ROUND-001/002 | Same round-off logic |
| TOTALS-001/002 | Same totals calculation |
| DEL-004/005 | Delivery charge editable in QSR |

---

## 7. Next Step

**Smoke QA** — start with T-01, T-10, T-20, T-21, T-30, T-35, T-60 (P0 tests) then proceed to P1/P2.

---

*— End of BUG-099 QA Handoff — 2026-05-19 —*
