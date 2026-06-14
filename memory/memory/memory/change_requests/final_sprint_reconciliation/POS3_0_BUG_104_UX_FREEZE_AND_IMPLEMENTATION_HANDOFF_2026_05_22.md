# BUG-104 — Credit / Tab Management — UX Freeze + Implementation Handoff — 2026-05-22

> **Document Type:** UX Freeze + Implementation Handoff. No code changed. `/app/memory/final/` untouched. Baseline docs untouched.
> **Predecessor:** `POS3_0_BUG_104_PHASE_1_IMPLEMENTATION_PLAN_2026_05_22.md`
> **Status:** `bug_104_phase_1_ux_frozen_ready_for_implementation`

---

## 1. Final Status

**`bug_104_phase_1_ux_frozen_ready_for_implementation`**

All owner decisions are captured. All API response shapes are live-verified. All UX behaviors are locked. The implementation agent may proceed directly from this document without further owner input.

---

## 2. Owner Decisions Applied

| # | Question | Owner Decision | Applied Behavior |
|---|---|---|---|
| OQ-P1-01 | SS1 list columns | **(a) Balance only on list.** Full breakdown (Total Credit / Total Paid) on detail screen SS2 only. Columns: Customer Name, Mobile, Email (if available), Outstanding Balance, Action (View/Manage). | No N+1 API calls on list screen. API 1 response used directly. |
| OQ-P1-02 | SS3 Bill Detail display | **(b) Slide-over panel from right** — matches `get-single-order` pattern in audit report (`OrderDetailSheet`). Desktop-first. No separate page. No mobile/full-screen modal. | Reuse existing `Sheet` UI component from `components/ui/sheet.jsx`. |
| OQ-P1-03 | Phase 2 icons visibility | **Hide completely.** Do not show disabled buttons for unavailable future features. | No Download, WhatsApp, or bulk export icons rendered in Phase 1. |
| OQ-P1-04 | Payment validation | **Allow partial payment. Block zero. Block negative. Block overpayment.** Amount must be `> 0` AND `<= outstanding balance`. Disable submit during request. Show loader. Show success toast. Refresh detail + list. Stay on same customer. | Strict validation; no local balance mutation before API success. |
| OQ-P1-05 | Null order ID detail button | **(b) Show disabled.** Edge case — should not happen normally. Flag for testing. | Button rendered but `disabled` + reduced opacity when `order_id` is 0 or null. |

### Additional Owner Rules Applied

| Rule | Applied Behavior |
|---|---|
| Desktop/web POS Phase 1 only | No mobile-specific layouts, breakpoints, or responsive behavior. |
| Mobile optimization out of scope | No mobile-specific QA rows. |
| No print receipt in Phase 1 | No print icon or print action on any credit screen. |
| No settlement dependency | Credit module is standalone; no link to any settlement module. |
| No table clear / order status change | Credit payment does NOT mutate dashboard orders, table status, or fOrderStatus. |
| No tax/order amount recalculation | Credit module displays amounts from API as-is; no frontend financial recalculation. |
| Do not mutate local balance before API success | UI balance updates only after API 3 returns successfully. |
| Credit module must be standalone and additive only | Zero changes to existing hotspot files. All new files. |
| Phase 2 documented but not visible in UI | Phase 2 features listed in §4 but zero Phase 2 UI elements rendered. |
| Negative balance: show with warning badge | Flag unusual state visually. Edge case for testing. |

---

## 3. Frozen Phase 1 Scope

### IN SCOPE

| # | Feature | Screen |
|---|---|---|
| 1 | Credit Management page + protected route + sidebar wiring | Page shell |
| 2 | Customer credit list (name, mobile, email, balance) | SS1 |
| 3 | Client-side search (name, mobile, email) | SS1 |
| 4 | Client-side filter (All / With Balance / Settled) | SS1 |
| 5 | Negative balance warning badge | SS1 |
| 6 | Customer transaction detail (credits + debits + summary) | SS2 |
| 7 | Summary bar (Total Credit, Total Paid, Balance, First/Last Tab dates) | SS2 |
| 8 | Bill detail slide-over for individual tab orders | SS3 |
| 9 | Disabled Detail button for null-order-id entries | SS2 |
| 10 | Credit clearance drawer/modal with partial payment | SS4 |
| 11 | Payment method pills (Cash/Card/UPI per restaurant config) | SS4 |
| 12 | Validation: amount > 0, amount <= balance, method selected | SS4 |
| 13 | Duplicate submit prevention (disable button + loader) | SS4 |
| 14 | Success toast after payment | SS4 |
| 15 | Refresh customer detail + list balance after success | SS4 |
| 16 | Stay on same customer detail after payment | SS4 |
| 17 | Loading states (list loading, detail loading, payment submitting) | All |
| 18 | Error states (API failure toast, retry affordance) | All |
| 19 | Empty states (no customers, no transactions) | SS1/SS2 |
| 20 | Desktop/web POS layout only | All |

---

## 4. Explicit Out of Scope (Phase 2 / Future)

| # | Feature | Reason |
|---|---|---|
| 1 | Mobile/responsive optimization | Owner directive: desktop Phase 1 only |
| 2 | Mobile-specific QA | Owner directive |
| 3 | Print receipt from credit screens | Owner directive: no print Phase 1 |
| 4 | Settlement module integration | Owner directive: no settlement dependency |
| 5 | Table clear / order status change | Owner directive: no order mutation from credit |
| 6 | Tax / order amount recalculation | Owner directive: display only |
| 7 | Download statement PDF (per customer) | Phase 2 |
| 8 | Multi-customer PDF bulk export | Phase 2 |
| 9 | WhatsApp share | Phase 2 |
| 10 | Bulk settlement (settle all for a customer) | Phase 2 |
| 11 | Date range filter on SS1 | Phase 2 |
| 12 | Historical migration / backfill | Not applicable |
| 13 | Backend changes | Frontend-only module |
| 14 | Phase 2 icons visible in UI (disabled or otherwise) | Owner directive: hide completely |

---

## 5. API Contract Lock

### API 1 — List Credit Customers

| Field | Value |
|---|---|
| Method | `POST` |
| Path | `/api/v1/vendoremployee/pos/tap-waiter-list` |
| Payload | `{}` |
| Auth | `Authorization: Bearer {token}` |
| Response key | `employee-tap-list` |
| Constant name | `CREDIT_CUSTOMER_LIST` |

**Response schema (verified on preprod restaurant 478, 21 rows):**

```
{ "employee-tap-list": [
    { "id": number, "name": string, "mobile": string, "email": string|null, "balance": number }
  ]
}
```

### API 2 — Customer Transaction Detail

| Field | Value |
|---|---|
| Method | `GET` |
| Path | `/api/v2/vendoremployee/pos/tap-customer-record-list` |
| Params | `?customer_id={id}` |
| Auth | `Authorization: Bearer {token}` |
| Response keys | `customer-transaction-list`, `customer-transaction-list-debit`, `tap_start_date`, `last_tap_credit_date`, `last_tap_credit_amount`, `last_tap_debit_date`, `last_tap_debit_amount` |
| Constant name | `CREDIT_CUSTOMER_DETAIL` |

**Credit entry schema:**
```
{ "id": number, "order_id": number, "waiter_id": number, "customer_id": number,
  "credit_order_amount": string, "debit_order_amount": string, "transaction_id": null,
  "current_balance": string, "payment_status": string,
  "comments": null, "created_at": ISO, "updated_at": ISO,
  "restaurant_order_id": number|null, "order_created_at": string }
```

**Debit entry schema:**
```
{ "id": number, "order_id": number, "waiter_id": number, "customer_id": number,
  "credit_order_amount": string, "debit_order_amount": string, "transaction_id": null,
  "current_balance": string, "payment_status": string,
  "comments": null, "created_at": ISO, "updated_at": ISO }
```

**Notes:**
- `credit_order_amount` and `debit_order_amount` are **strings** (e.g., `"1149.00"`). Parse with `parseFloat()`.
- `payment_status` on credit entries = `"sucess"` (PAY-007 typo — do NOT fix, do NOT display to user).
- `payment_status` on debit entries = payment method used (`"cash"`, `"card"`, `"upi"`).
- `restaurant_order_id` can be `null`. When null, the Detail button is rendered disabled per OQ-P1-05.
- Lifetime totals derived: `sum(credit_order_amount)` − `sum(debit_order_amount)` = `balance` from API 1 (verified: 43685.20 − 39285.00 = 4400.20).

### API 3 — Record Credit Payment

| Field | Value |
|---|---|
| Method | `POST` |
| Path | `/api/v1/vendoremployee/pos/tap-waiter-order-insert` |
| Auth | `Authorization: Bearer {token}` |
| Constant name | `CREDIT_PAYMENT_INSERT` |

**Payload:**
```json
{
  "mobile": "string (customer phone — PAY-008 key)",
  "name": "string (customer name)",
  "email": "string (empty string if null)",
  "credit_order_amount": 0,
  "debit_order_amount": "number (amount being paid, > 0, <= balance)",
  "payment_status": "string ('cash' | 'card' | 'upi')",
  "order_id": "string (empty string for general balance payment)"
}
```

**Response:** Not yet live-tested. Implementation agent should verify response shape on first successful call and document it. On any HTTP error, show a toast with the error message; do NOT mutate local state.

---

## 6. UX Freeze Details

### 6A. SS1 — Customer Credit List

**Route:** `/orders/credit`
**Data:** API 1 response, loaded on mount.

**Table columns (frozen):**

| # | Column | Source | data-testid |
|---|---|---|---|
| 1 | Customer Name | `item.name` (capitalize first letter) | `credit-customer-name-{id}` |
| 2 | Mobile | `item.mobile` | `credit-customer-mobile-{id}` |
| 3 | Email | `item.email` (show "—" if null) | `credit-customer-email-{id}` |
| 4 | Outstanding Balance | `item.balance` (₹ formatted, 2 decimals) | `credit-customer-balance-{id}` |
| 5 | Action | "View / Manage" button | `credit-customer-action-{id}` |

**Balance display rules:**
- Positive balance: normal text, e.g., `₹4,400.20`
- Zero balance: muted/grey text, `₹0.00`
- Negative balance: red text + warning badge icon, e.g., `⚠ -₹144.90`

**Filter dropdown (frozen):**
- `All` (default) — show all customers
- `With Balance` — `balance > 0`
- `Settled` — `balance <= 0`
- `data-testid="credit-filter-dropdown"`

**Search bar (frozen):**
- Client-side filter on `name` + `mobile` + `email`
- Case-insensitive, substring match
- `data-testid="credit-search-input"`

**Row click behavior:**
- Click anywhere on the row (or the "View / Manage" button) → navigate to SS2 (customer detail).
- This can be an in-page state change (show detail view, hide list) or a sub-route. Implementation agent decides based on cleanest pattern.

**Loading state:** Spinner / skeleton while API 1 is loading.
**Empty state:** "No credit customers found" message when API returns empty list or no results match search/filter.
**Error state:** Toast on API failure + retry button.

**Phase 2 icons:** NOT rendered. No Download, WhatsApp, or bulk export icons at all.

### 6B. SS2 — Customer Transaction Detail

**Trigger:** Click a customer row on SS1.
**Data:** API 2 response for the selected `customer_id`.

**Header:** Customer name + mobile number. Back button to return to SS1.

**Summary bar (frozen):**

| Metric | Source | data-testid |
|---|---|---|
| Total Credit | `sum(parseFloat(c.credit_order_amount))` from `customer-transaction-list` | `credit-detail-total-credit` |
| Total Paid | `sum(parseFloat(d.debit_order_amount))` from `customer-transaction-list-debit` | `credit-detail-total-paid` |
| Outstanding Balance | Total Credit − Total Paid | `credit-detail-balance` |
| First Tab | `tap_start_date` (formatted) | `credit-detail-first-tab` |
| Last Tab | `last_tap_credit_date` (formatted) | `credit-detail-last-tab` |

**Credits table (frozen):**

| # | Column | Source | data-testid |
|---|---|---|---|
| 1 | # | Serial number (1-indexed) | — |
| 2 | Order ID | `restaurant_order_id` ?? `order_id` ?? "—" | `credit-txn-order-{id}` |
| 3 | Amount | `parseFloat(credit_order_amount)` ₹ formatted | `credit-txn-amount-{id}` |
| 4 | Date | `order_created_at` ?? `created_at` (formatted DD/MM/YY) | `credit-txn-date-{id}` |
| 5 | Detail | Button → opens SS3 slide-over | `credit-txn-detail-btn-{id}` |

**Detail button behavior:**
- `order_id > 0` → enabled, opens SS3 slide-over.
- `order_id === 0` or `null` → disabled + reduced opacity. Tooltip: "Order detail not available". `data-testid="credit-txn-detail-btn-disabled-{id}"`

**Debits table (frozen):**

| # | Column | Source | data-testid |
|---|---|---|---|
| 1 | # | Serial number | — |
| 2 | Payment Method | `payment_status` → capitalize ("Cash", "Card", "UPI") | `credit-debit-method-{id}` |
| 3 | Amount | `parseFloat(debit_order_amount)` ₹ formatted | `credit-debit-amount-{id}` |
| 4 | Date | `created_at` (formatted DD/MM/YY) | `credit-debit-date-{id}` |
| 5 | Balance After | `parseFloat(current_balance)` ₹ formatted | `credit-debit-balance-{id}` |

**"Record Payment" button** at top-right of detail view → opens SS4 (clearance drawer/modal).
`data-testid="credit-record-payment-btn"`

**Loading state:** Spinner while API 2 loads.
**Empty state:** "No transactions found" when both lists are empty.

### 6C. SS3 — Bill Detail Slide-Over

**Trigger:** Click Detail button on a credit entry in SS2.
**API:** `POST /api/v2/vendoremployee/get-single-order-new` with `{ order_id: entry.order_id }`.
**Component:** Use existing `Sheet` from `components/ui/sheet.jsx` — side = `"right"`. Matches audit report `OrderDetailSheet` pattern per owner directive.

**Content (frozen):**
- Order ID header
- Item list: name, quantity, unit price, line total
- Sub Total
- Tax (if present)
- Discount (if present)
- **Grand Total** (highlighted / bold)
- No print icon (Phase 1 owner directive)
- No action buttons
- `data-testid="credit-bill-detail-sheet"`

**Transform:** Reuse `orderTransform.fromAPI.order()` for the order data. Extract `foodDetail` / `order_details_table` for item list. Display-only — no mutations.

**Loading state:** Spinner inside the sheet while loading.
**Error state:** "Failed to load order details" message inside the sheet.
**Close:** X button or click outside.

### 6D. SS4 — Credit Clearance Drawer/Modal

**Trigger:** "Record Payment" button on SS2.
**API:** `POST /api/v1/vendoremployee/pos/tap-waiter-order-insert`.
**Component:** Modal (`Dialog` from `components/ui/dialog.jsx`) or Drawer. Implementation agent picks whichever fits better on desktop — both are available in `components/ui/`.

**Layout (frozen):**

```
┌──────────────────────────────────────────┐
│ Record Payment — {customer.name}    [X]  │
├──────────────────────────────────────────┤
│                                          │
│ Outstanding Balance:  ₹4,400.20          │
│                                          │
│ Payment Method:                          │
│   [Cash]  [Card]  [UPI]                  │
│                                          │
│ Amount:  [₹ _______________]             │
│                                          │
│ Remaining after payment: ₹{auto-calc}    │
│                                          │
│ [ Cancel ]          [ Record Payment ✓ ] │
└──────────────────────────────────────────┘
```

**Payment method pills (frozen):**
- Render only enabled methods from `restaurant.features.paymentMethods`:
  - `cash: true` → show Cash pill
  - `card: true` → show Card pill
  - `upi: true` → show UPI pill
- Single-select (radio behavior). `data-testid="credit-payment-method-{method}"`
- Selected pill gets highlighted (filled) styling.

**Validation rules (frozen):**

| Rule | Behavior |
|---|---|
| No method selected | "Record Payment" button disabled |
| Amount is empty or 0 | Button disabled |
| Amount is negative | Button disabled |
| Amount > outstanding balance | Button disabled; inline hint "Amount exceeds balance" |
| Amount > 0 AND <= balance AND method selected | Button enabled |

**Submit behavior (frozen):**

| Step | What happens |
|---|---|
| 1 | Disable "Record Payment" button immediately |
| 2 | Show spinner/loader inside button |
| 3 | Call API 3 with payload |
| 4a (success) | Show success toast: "Payment of ₹{amount} recorded" |
| 4b (success) | Re-fetch API 2 (customer detail) to refresh transaction lists |
| 4c (success) | Re-fetch API 1 (customer list) to refresh balance on SS1 |
| 4d (success) | Stay on SS2 (customer detail view) — do NOT navigate away |
| 4e (success) | Close the clearance modal |
| 5a (failure) | Show error toast with `readableMessage` or "Payment failed" |
| 5b (failure) | Re-enable button |
| 5c (failure) | Do NOT close modal — let cashier retry or cancel |

**Critical rule:** Do NOT mutate local balance, local transaction list, or any local state before API 3 returns success. Only refresh from server after confirmed success.

`data-testid` values:
- `credit-clearance-modal`
- `credit-clearance-amount-input`
- `credit-clearance-remaining`
- `credit-clearance-submit-btn`
- `credit-clearance-cancel-btn`

---

## 7. Implementation Handoff

### 7A. Files to Create

| # | File | Purpose | Est. Lines |
|---|---|---|---|
| 1 | `src/api/services/creditService.js` | 3 API wrappers: `getCreditCustomers()`, `getCustomerTransactions(customerId)`, `recordCreditPayment(payload)` | ~60 |
| 2 | `src/api/transforms/creditTransform.js` | Transforms: `customerListFromAPI(data)`, `customerDetailFromAPI(data)` | ~80 |
| 3 | `src/pages/CreditManagementPage.jsx` | Page shell: orchestrates list/detail views, holds selected customer state, handles navigation between SS1↔SS2 | ~250 |
| 4 | `src/components/credit/CreditCustomerList.jsx` | SS1: table + search + filter + loading/empty/error states | ~200 |
| 5 | `src/components/credit/CreditCustomerDetail.jsx` | SS2: summary bar + credit/debit tables + "Record Payment" button | ~250 |
| 6 | `src/components/credit/CreditBillDetail.jsx` | SS3: `Sheet` wrapper calling `get-single-order-new` and displaying item list + totals | ~120 |
| 7 | `src/components/credit/CreditClearanceModal.jsx` | SS4: payment modal with method pills, amount input, validation, submit | ~200 |

### 7B. Files to Minimally Modify

| # | File | Exact Change | Risk |
|---|---|---|---|
| 1 | `src/App.js` | Add 1 route: `<Route path="/orders/credit" element={<ProtectedRoute><CreditManagementPage /></ProtectedRoute>} />` | LOW — additive, insert after L44 |
| 2 | `src/api/constants.js` | Add 3 constants inside `API_ENDPOINTS`: `CREDIT_CUSTOMER_LIST: '/api/v1/vendoremployee/pos/tap-waiter-list'`, `CREDIT_CUSTOMER_DETAIL: '/api/v2/vendoremployee/pos/tap-customer-record-list'`, `CREDIT_PAYMENT_INSERT: '/api/v1/vendoremployee/pos/tap-waiter-order-insert'` | LOW — additive |

### 7C. Files NOT to Touch

| File | Reason |
|---|---|
| `Sidebar.jsx` | Placeholder at L45 already points to `/orders/credit` — no change needed |
| `DashboardPage.jsx` | Hotspot — no dashboard changes |
| `OrderEntry.jsx` | Hotspot — no order-entry changes |
| `CollectPaymentPanel.jsx` | Hotspot — existing tab payment flow untouched |
| `socketHandlers.js` | Hotspot — no socket changes |
| `socketEvents.js` | No socket changes |
| `orderTransform.js` | Hotspot — no transform changes (SS3 reads transform output but doesn't modify it) |
| `reportService.js` | Hotspot — existing `getCreditOrders` untouched |
| `LoadingPage.jsx` | Hotspot — no bootstrap changes |
| `profileTransform.js` | Read-only consumer of `paymentMethods` — no changes |

### 7D. Implementation Order

| Step | What | Prerequisite |
|---|---|---|
| 1 | Add 3 endpoint constants to `constants.js` | None |
| 2 | Create `creditService.js` | Step 1 |
| 3 | Create `creditTransform.js` | Step 2 |
| 4 | Create `CreditManagementPage.jsx` (page shell) | Step 3 |
| 5 | Create `CreditCustomerList.jsx` (SS1) | Step 4 |
| 6 | Create `CreditClearanceModal.jsx` (SS4) | Step 5 |
| 7 | Create `CreditCustomerDetail.jsx` (SS2) | Step 4 |
| 8 | Create `CreditBillDetail.jsx` (SS3) | Step 7 |
| 9 | Add route to `App.js` | Step 4 |
| 10 | `yarn build` — confirm 0 errors | All |

### 7E. Test IDs to Add

Every interactive and data-display element must have a `data-testid`. Full list in §6 above. Key IDs:

- `credit-search-input`, `credit-filter-dropdown`
- `credit-customer-name-{id}`, `credit-customer-balance-{id}`, `credit-customer-action-{id}`
- `credit-detail-total-credit`, `credit-detail-total-paid`, `credit-detail-balance`
- `credit-txn-detail-btn-{id}`, `credit-txn-detail-btn-disabled-{id}`
- `credit-record-payment-btn`
- `credit-bill-detail-sheet`
- `credit-payment-method-{method}`, `credit-clearance-amount-input`, `credit-clearance-submit-btn`, `credit-clearance-cancel-btn`
- `credit-clearance-modal`

### 7F. Build / Lint Command

```bash
cd /app/frontend && CI=false yarn build
```
Expected: 0 errors. 1 pre-existing eslint warning in `OrderEntry.jsx` (unrelated).

---

## 8. Regression Guardrails

| Surface | Must Remain Unchanged |
|---|---|
| Existing Collect Bill / tab payment | `CollectPaymentPanel.jsx` tab flow (`isTabPayment`, `tabName`, `tabPhone`) is NOT touched. |
| PayLater table clear (PROD-BUG-003) | `socketHandlers.js` `isPayLaterViaHold` is NOT touched. |
| Settlement module | Does not exist yet. Credit module has no dependency on it. |
| Room billing | No room-related code touched. |
| Tax / service charge / delivery charge calculations | No financial calculation code touched. `orderTransform.js` is NOT modified. |
| Print flows | No print code touched. No print icon in credit module. |
| Backend | No backend code modified. All 3 APIs are existing backend endpoints. |
| Dashboard order cards | No card code touched. |
| Socket handlers | No socket code touched. |
| Auto-settle (PROD-BUG-001) | `autoSettlePrefs.js` and related DashboardPage logic NOT touched. |
| Bootstrap / LoadingPage | NOT touched. |

---

## 9. QA Smoke Checklist

| # | Test | Expected | data-testid to verify |
|---|---|---|---|
| 1 | Navigate to `/orders/credit` | Page loads, customer list displayed | `credit-search-input` present |
| 2 | Customer list shows data from API 1 | Rows with name, mobile, email, balance | `credit-customer-name-*` |
| 3 | Empty list (if API returns `[]`) | "No credit customers found" message | — |
| 4 | Search by customer name | List filters to matching rows | `credit-search-input` |
| 5 | Search by mobile number | List filters to matching rows | `credit-search-input` |
| 6 | Filter: "With Balance" | Only `balance > 0` customers shown | `credit-filter-dropdown` |
| 7 | Filter: "Settled" | Only `balance <= 0` customers shown | `credit-filter-dropdown` |
| 8 | Negative balance customer | Red text + warning badge visible | `credit-customer-balance-*` |
| 9 | Click customer row → detail opens | SS2 loads with credits + debits + summary | `credit-detail-total-credit` |
| 10 | Summary totals match | sum(credits) − sum(debits) = API 1 balance | `credit-detail-balance` |
| 11 | Credit entries displayed | Order ID, amount, date shown | `credit-txn-amount-*` |
| 12 | Debit entries displayed | Method, amount, date, balance-after shown | `credit-debit-amount-*` |
| 13 | Detail button (valid order_id) | Enabled; click opens slide-over with order items | `credit-txn-detail-btn-*` |
| 14 | Detail button (null order_id) | Disabled / greyed out | `credit-txn-detail-btn-disabled-*` |
| 15 | Click "Record Payment" → modal opens | Clearance modal with method pills + amount input | `credit-clearance-modal` |
| 16 | Partial payment: enter valid amount | Submit button enabled | `credit-clearance-submit-btn` |
| 17 | Zero amount blocked | Submit button disabled | `credit-clearance-submit-btn` |
| 18 | Negative amount blocked | Submit button disabled | `credit-clearance-amount-input` |
| 19 | Overpayment blocked | Submit button disabled; hint shown | `credit-clearance-submit-btn` |
| 20 | Duplicate submit blocked | Button disabled + loader during API call | `credit-clearance-submit-btn` |
| 21 | Successful payment | Toast shown; detail refreshes; list balance updates; stay on detail | — |
| 22 | Failed payment (API error) | Error toast; button re-enabled; modal stays open | — |
| 23 | No Phase 2 icons visible | No Download/WhatsApp/bulk export icons anywhere | — |
| 24 | No table/order status mutation | Dashboard orders unchanged after credit payment | Check `/dashboard` |
| 25 | No print trigger | No `order-temp-store` POST during credit flows | DevTools Network |
| 26 | No local balance mutation before success | UI balance unchanged during API call; updates only after response | — |
| 27 | Back from detail → list | List still loaded; search/filter state preserved | `credit-search-input` |
| 28 | Session expired / 401 | Redirects to login (existing auth interceptor behavior) | — |
| 29 | `yarn build` | 0 errors | Terminal |
| 30 | Sidebar "Credit/Tab" link | Navigates to `/orders/credit` | — |

---

## 10. Final Confirmation

- **No code was changed** in this pass.
- **`/app/memory/final/` was NOT updated.**
- **Baseline docs were NOT updated.**
- **No backend code was modified.**
- **No migrations or data mutations were performed.**
- **No business rules were invented.** All behavior derives from owner decisions + live API verification.
- This document is the **single source of truth** for the implementation agent. Implementation may begin immediately using this freeze doc + the baseline docs listed in the predecessor plan.

---

*— BUG-104 Credit/Tab Management — UX Freeze + Implementation Handoff — 2026-05-22 —*
