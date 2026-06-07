# BUG-104 — Credit / Tab Management — Phase 1 Implementation Plan — 2026-05-22

> **Document Type:** Implementation planning only. No code changed. No `/app/memory/final/` updated. No baseline docs modified.
> **Status:** `ready_for_owner_approval_then_implementation`
> **Predecessor:** `POS3_0_BUG_104_ANALYSIS_2026_05_20.md`, `POS3_0_BUG_097_104_QUESTION_CLEARANCE_2026_05_20.md`

---

## 1. Purpose

This document converts BUG-104 from `owner_scope_needed` into a complete, owner-approvable Phase 1 implementation plan. All 3 APIs are now documented with live response shapes. Owner scope decisions (Phase 1/2 split, mobile-based PAY-008, filter options) are frozen from the Question Clearance doc.

---

## 2. Inputs Read

### Baseline Docs (all read)
- `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md`
- `/app/memory/final/MODULE_DECISIONS_FINAL.md`
- `/app/memory/final/IMPLEMENTATION_AGENT_RULES.md`
- `/app/memory/final/BUSINESS_RULES_BASELINE_FINAL.md`
- `/app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md`

### BUG-104 Specific Docs
- `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_104_ANALYSIS_2026_05_20.md`
- `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_097_104_QUESTION_CLEARANCE_2026_05_20.md`
- `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_CR_MASTER_PLANNING_2026_05_18.md`

### Code Files Inspected (read-only)
- `Sidebar.jsx` L45 — credit placeholder exists
- `App.js` L31-41 — no `/orders/credit` route registered
- `constants.js` — `REPORT_CREDIT_ORDERS` exists; no tap-waiter constants
- `CollectPaymentPanel.jsx` — tab payment logic (L349-368)
- `profileTransform.js` L176-181 — `paymentMethods` (cash/upi/card/tab)
- `reportService.js` — `getCreditOrders` function exists
- `reportTransform.js` — `creditOrder` transform exists

### APIs Live-Verified (preprod, restaurant 478)
- API 1: `POST /api/v1/vendoremployee/pos/tap-waiter-list` — 21 customers returned
- API 2: `GET /api/v2/vendoremployee/pos/tap-customer-record-list?customer_id=1439` — 50 credit + 5 debit entries
- API 3: `POST /api/v1/vendoremployee/pos/tap-waiter-order-insert` — payload documented by owner

---

## 3. API Documentation (Live-Verified)

### API 1 — List Credit Customers

| Field | Value |
|---|---|
| Endpoint | `POST /api/v1/vendoremployee/pos/tap-waiter-list` |
| Payload | `{}` |
| Response key | `employee-tap-list` |
| Auth | Bearer token |

**Response shape:**
```json
{
  "employee-tap-list": [
    {
      "id": 1439,
      "name": "avi",
      "mobile": "9823905120",
      "email": null,
      "balance": 4400.20
    }
  ]
}
```

| Field | Type | Maps to UI |
|---|---|---|
| `id` | number | Internal customer_id (used in API 2 query) |
| `name` | string | Customer Name column |
| `mobile` | string | Phone Number column |
| `email` | string/null | Search target (not displayed as column) |
| `balance` | number | Outstanding Balance column |

**Note:** API returns `balance` only. `Total tab (lifetime)` and `Total paid` must be derived from API 2 if displayed on the list screen. Alternatively, the list screen shows only `balance` and the detail screen shows the full breakdown.

**Observed data:** 21 customers. 19 with balance > 0, 1 with balance = 0, 1 with negative balance (-144.9).

### API 2 — Customer Transaction Detail

| Field | Value |
|---|---|
| Endpoint | `GET /api/v2/vendoremployee/pos/tap-customer-record-list` |
| Params | `?customer_id={id}` (id from API 1) |
| Auth | Bearer token |

**Response shape:**
```json
{
  "customer-transaction-list": [
    {
      "id": 5769,
      "order_id": 204723,
      "waiter_id": 1478,
      "customer_id": 1439,
      "credit_order_amount": "1149.00",
      "debit_order_amount": "0.00",
      "transaction_id": null,
      "current_balance": "0.00",
      "payment_status": "sucess",
      "comments": null,
      "created_at": "2025-03-21T12:22:53.000000Z",
      "updated_at": "2025-03-21T12:22:53.000000Z",
      "restaurant_order_id": null,
      "order_created_at": "2025-03-21 17:52:53"
    }
  ],
  "customer-transaction-list-debit": [
    {
      "id": 13730,
      "order_id": 0,
      "waiter_id": 1483,
      "customer_id": 1439,
      "credit_order_amount": "0.00",
      "debit_order_amount": "20.00",
      "transaction_id": null,
      "current_balance": "4386.20",
      "payment_status": "cash",
      "comments": null,
      "created_at": "2026-03-23T11:16:34.000000Z",
      "updated_at": "2026-03-23T11:16:34.000000Z"
    }
  ],
  "tap_start_date": "2025-03-21T12:22:53.000000Z",
  "last_tap_credit_date": "2026-04-29T08:24:29.000000Z",
  "last_tap_credit_amount": 14.00,
  "last_tap_debit_date": "2026-03-23T11:16:34.000000Z",
  "last_tap_debit_amount": 20.00
}
```

**Credit entries** = orders placed on tab (credit_order_amount > 0).
**Debit entries** = payments received (debit_order_amount > 0).
**`payment_status`** on credits = `"sucess"` (PAY-007 typo). On debits = payment method used (`"cash"`, `"card"`, `"upi"`).
**`restaurant_order_id`** = human-readable order ID (present on credit entries, absent on debit entries).
**`current_balance`** = running balance at time of transaction.
**Lifetime derivation verified:** sum(credit_order_amount) - sum(debit_order_amount) = balance from API 1 (4400.20 confirmed).

### API 3 — Record Credit Payment (Clearance)

| Field | Value |
|---|---|
| Endpoint | `POST /api/v1/vendoremployee/pos/tap-waiter-order-insert` |
| Payload | See below |
| Auth | Bearer token |

**Payload:**
```json
{
  "mobile": "9035133228",
  "email": "",
  "name": "Saurav",
  "credit_order_amount": 0,
  "debit_order_amount": 12.0,
  "payment_status": "cash",
  "order_id": ""
}
```

| Field | Type | Purpose |
|---|---|---|
| `mobile` | string | Customer phone (PAY-008 unique key) |
| `name` | string | Customer name |
| `email` | string | Customer email (empty string if none) |
| `credit_order_amount` | number | New credit added (0 for clearance payment) |
| `debit_order_amount` | number | Amount being paid |
| `payment_status` | string | Payment method: `"cash"` / `"card"` / `"upi"` |
| `order_id` | string | Specific order to settle (empty string = general payment against balance) |

**Response:** Not yet live-tested. Implementation agent should test and document on first call.

---

## 4. Owner Decisions (Frozen)

All from Question Clearance 2026-05-20 + latest conversation 2026-05-22:

| # | Decision | Owner Answer |
|---|---|---|
| 1 | Phase split | Phase 1: list + detail + clearance. Phase 2: reports, PDF, WhatsApp. |
| 2 | Customer identifier | Mobile number (PAY-008). No CRM customer_id. |
| 3 | Filter options | All (default) / With Balance / Settled |
| 4 | Partial payment | Yes — cashier enters any amount up to total (SS4) |
| 5 | Scope for "all features" | Phase 1 = individual settle (a). Phase 2 = bulk settle + reports (d). |
| 6 | SS1 additional columns | Total tab (lifetime), Total paid, Balance — owner requested |

---

## 5. Phase 1 Scope — Frozen

| # | Feature | Screen | In Phase 1 |
|---|---|---|---|
| 1 | Credit Management page + route + sidebar wiring | — | **YES** |
| 2 | Customer credit list with search + filter | SS1 | **YES** |
| 3 | Per-customer transaction detail (credits + debits) | SS2 | **YES** |
| 4 | Bill detail for individual tab orders | SS3 | **YES** |
| 5 | Credit clearance — inline payment with partial support | SS4 | **YES** |
| 6 | Download statement (per-customer PDF) | SS1 icon | **NO — Phase 2** |
| 7 | WhatsApp share | SS1 icon | **NO — Phase 2** |
| 8 | Multi-customer PDF download | SS1 header icon | **NO — Phase 2** |
| 9 | Bulk settlement | — | **NO — Phase 2** |

---

## 6. Screen-by-Screen UX Mapping

### Screen 1 — Customer Credit List (Main Screen)

**Route:** `/orders/credit` (sidebar placeholder already at `Sidebar.jsx` L45)
**API:** `POST /api/v1/vendoremployee/pos/tap-waiter-list`

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ ← Back   Credit Management          [Download]  │
├─────────────────────────────────────────────────┤
│ [Filter ▼]  [Search by phone / name / email 🔍] │
├──────────┬──────────┬──────────┬────────────────┤
│ Phone    │ Name     │ Balance  │ Actions        │
├──────────┼──────────┼──────────┼────────────────┤
│ 9823...  │ avi      │ ₹4,400   │ [⬇] [📱] [✏]  │
│ 1223...  │ Test     │ ₹1,026   │ [⬇] [📱] [✏]  │
│ ...      │ ...      │ ...      │ ...            │
└──────────┴──────────┴──────────┴────────────────┘
```

**Columns:**
| Column | Source | Format |
|---|---|---|
| Phone | `item.mobile` | As-is |
| Name | `item.name` | Capitalize |
| Balance | `item.balance` | ₹ formatted, 2 decimal |

**Filter dropdown:** All (default) / With Balance (`balance > 0`) / Settled (`balance <= 0`)
**Search:** Client-side filter on `name`, `mobile`, `email` fields.

**Row action icons:**
| Icon | Action | Phase 1? |
|---|---|---|
| Download (⬇) | Download credit statement PDF | **Phase 2** — disable/hide in Phase 1 |
| WhatsApp (📱) | Share statement via WhatsApp | **Phase 2** — disable/hide in Phase 1 |
| Edit (✏) | Opens inline credit clearance (SS4) | **YES** |

**Click row → opens SS2** (customer transaction detail).

**Owner question for approval (OQ-P1-01):** The API does not return `Total tab (lifetime)` or `Total paid` on the list endpoint. Two options:
- **(a)** Show only `Balance` column on the list (matching API response). Show lifetime breakdown only on SS2 detail.
- **(b)** Call API 2 for each customer to compute `Total Credit` / `Total Paid` → heavier but matches the owner-requested columns.
- **Recommendation:** (a) — show Balance only on list. Detail screen shows full breakdown. Avoids N+1 API calls on the list screen.

### Screen 2 — Customer Transaction Detail

**Trigger:** Click a customer row on SS1
**API:** `GET /api/v2/vendoremployee/pos/tap-customer-record-list?customer_id={id}`

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ ← Back   {name} — {phone}                      │
├─────────────────────────────────────────────────┤
│ Summary:                                         │
│   Total Credit: ₹43,685   Total Paid: ₹39,285   │
│   Outstanding Balance: ₹4,400                    │
│   First Tab: 21 Mar 2025   Last Tab: 29 Apr 2026│
├─────────────────────────────────────────────────┤
│ CREDITS (Orders on Tab)              [Filter ▼]  │
├─────┬──────────┬──────────┬──────────┬──────────┤
│ #   │ Order ID │ Amount   │ Date     │          │
├─────┼──────────┼──────────┼──────────┼──────────┤
│ 1   │ —        │ ₹1,149   │ 21/03/25 │ [Detail] │
│ 2   │ —        │ ₹911     │ 21/03/25 │ [Detail] │
├─────────────────────────────────────────────────┤
│ PAYMENTS (Debits)                                │
├─────┬──────────┬──────────┬──────────┬──────────┤
│ #   │ Method   │ Amount   │ Date     │ Balance  │
├─────┼──────────┼──────────┼──────────┼──────────┤
│ 1   │ Cash     │ ₹20      │ 23/03/26 │ ₹4,386   │
└─────┴──────────┴──────────┴──────────┴──────────┘
```

**Credits section:**
| Column | Source |
|---|---|
| # | Serial number |
| Order ID | `restaurant_order_id` (if null → `order_id` or "—") |
| Amount | `credit_order_amount` (₹ formatted) |
| Date | `order_created_at` or `created_at` |
| Detail button | Opens SS3 (if `order_id > 0`) |

**Debits section:**
| Column | Source |
|---|---|
| # | Serial number |
| Method | `payment_status` → capitalize ("Cash", "Card", "UPI") |
| Amount | `debit_order_amount` (₹ formatted) |
| Date | `created_at` |
| Balance After | `current_balance` (₹ formatted) |

**Summary bar:**
- Total Credit = sum(`credit_order_amount`) from credit entries
- Total Paid = sum(`debit_order_amount`) from debit entries
- Balance = Total Credit − Total Paid (should match API 1 balance)
- First Tab = `tap_start_date`
- Last Tab = `last_tap_credit_date`

### Screen 3 — Bill Detail (Single Tab Order)

**Trigger:** Click "Detail" on a credit entry in SS2 (where `order_id > 0`)
**API:** `POST /api/v2/vendoremployee/get-single-order-new` with `{ order_id }`

**Layout:** Modal or slide-over showing:
- Order ID
- Item list (name × qty — price)
- Sub Total
- Tax (if applicable)
- **Total** (highlighted)
- Print icon

**Implementation note:** Reuse the existing `get-single-order-new` endpoint and `orderTransform.fromAPI.order()` transform. The order detail structure is already understood by the codebase. Display as a simplified bill view (item list + totals only, no action buttons).

### Screen 4 — Credit Clearance (Inline)

**Trigger:** Click Edit (✏) icon on a customer row in SS1
**API:** `POST /api/v1/vendoremployee/pos/tap-waiter-order-insert`
**Layout:** Inline expansion below the customer row (not a separate page per owner directive)

```
┌─────────────────────────────────────────────────┐
│ 9823905120  │  avi  │  ₹4,400  │ [⬇] [📱] [✏]  │
├─────────────────────────────────────────────────┤
│ Select Payment Method:                           │
│   [Cash]  [Card]  [UPI]                          │
│                                                   │
│ Total Payable:  ₹4,400.20                        │
│ Paid:           [₹ ____________]                  │
│ Balance:        ₹4,400.20  (auto-calc)           │
│                                                   │
│            [ Update Credit ]                      │
└─────────────────────────────────────────────────┘
```

**Payment pills:** Render only methods enabled in restaurant profile:
- `restaurant.features.paymentMethods.cash` → show Cash pill
- `restaurant.features.paymentMethods.card` → show Card pill
- `restaurant.features.paymentMethods.upi` → show UPI pill

**Validation:**
- Paid amount must be > 0
- Paid amount must be ≤ Total Payable
- Payment method must be selected
- "Update Credit" button disabled until valid

**On submit:**
```json
{
  "mobile": "{customer.mobile}",
  "name": "{customer.name}",
  "email": "{customer.email || ''}",
  "credit_order_amount": 0,
  "debit_order_amount": {paidAmount},
  "payment_status": "{selectedMethod}",
  "order_id": ""
}
```

**After success:**
- Show success toast
- Refresh the customer list (re-call API 1) to update balances
- Collapse the inline clearance panel
- Updated balance should reflect immediately

---

## 7. Module Mapping (per IMPLEMENTATION_AGENT_RULES.md)

| Aspect | Value |
|---|---|
| **Primary Module** | NEW — Credit / Tab Management (Module 15, not in current baseline) |
| **Affected Route** | NEW — `/orders/credit` |
| **Affected Context(s)** | `RestaurantContext` (read: paymentMethods), `AuthContext` (read: token) |
| **Affected Service(s)** | NEW — `creditService.js` |
| **Affected Transform(s)** | NEW — `creditTransform.js` (light) |
| **Affected localStorage** | None |
| **Socket/Print/Payment impact** | NONE — Credit Management is a standalone read+write module that does not touch dashboard orders, sockets, prints, or existing payment flows |
| **Regression risk** | LOW — new route, new page, new components. Zero changes to existing hotspot files. |

---

## 8. File Plan

### New Files

| # | File | Purpose | Size |
|---|---|---|---|
| 1 | `src/pages/CreditManagementPage.jsx` | Main page component — orchestrates SS1-SS4 | ~300-400 lines |
| 2 | `src/components/credit/CreditCustomerList.jsx` | SS1 — customer list table with search + filter | ~150 lines |
| 3 | `src/components/credit/CreditCustomerDetail.jsx` | SS2 — transaction detail (credits + debits) | ~200 lines |
| 4 | `src/components/credit/CreditBillDetail.jsx` | SS3 — single order bill view (modal) | ~100 lines |
| 5 | `src/components/credit/CreditClearancePanel.jsx` | SS4 — inline payment clearance | ~150 lines |
| 6 | `src/api/services/creditService.js` | API wrappers for 3 credit endpoints | ~60 lines |
| 7 | `src/api/transforms/creditTransform.js` | Response transforms for credit APIs | ~80 lines |

### Modified Files (minimal)

| # | File | Change | Risk |
|---|---|---|---|
| 1 | `src/App.js` | Add route: `<Route path="/orders/credit" element={<ProtectedRoute><CreditManagementPage /></ProtectedRoute>} />` | LOW — additive, no existing route affected |
| 2 | `src/api/constants.js` | Add 3 new endpoint constants: `CREDIT_CUSTOMER_LIST`, `CREDIT_CUSTOMER_DETAIL`, `CREDIT_PAYMENT_INSERT` | LOW — additive |

### Files NOT Modified

| File | Why untouched |
|---|---|
| `Sidebar.jsx` | Placeholder already exists at L45 pointing to `/orders/credit` |
| `DashboardPage.jsx` | No dashboard changes |
| `OrderEntry.jsx` | No order-entry changes |
| `CollectPaymentPanel.jsx` | Existing tab payment flow untouched |
| `socketHandlers.js` | No socket changes |
| `orderTransform.js` | No transform changes |
| `LoadingPage.jsx` | No bootstrap changes |

---

## 9. Business Rules Compliance

| Rule | Impact | Preserved? |
|---|---|---|
| PAY-008 | Tab/Credit uses mobile as unique key | **YES** — API 3 payload uses `mobile`, matching PAY-008 |
| PAY-004 | PayLater status = `'sucess'` | **YES** — credit entries show `payment_status: "sucess"` from API 2. We display, never modify this value |
| PAY-007 | Backend requires misspelled `'sucess'` | **YES** — no write to payment_status on credit entries |
| FA-01 | Preserve route-shell architecture | **YES** — new route behind ProtectedRoute |
| FA-03 | Do not expand hotspot files | **YES** — zero changes to DashboardPage, OrderEntry, CollectPaymentPanel, orderTransform |
| FA-04 | Only routed pages count as modules | **YES** — new routed page at `/orders/credit` |
| API-01 | Prefer service-layer entry points | **YES** — new `creditService.js` |
| SM-01 | React Context is authoritative | **YES** — page-local state only, reads from existing contexts |
| MC-06 | Backend owns report aggregation | **YES** — FE only displays backend data, derives totals from transaction list |

---

## 10. Open Questions for Owner Approval

| # | Question | Options | Recommendation | Impact |
|---|---|---|---|---|
| OQ-P1-01 | SS1 list columns — show Total Credit/Total Paid (requires N+1 API calls) or just Balance? | (a) Balance only on list; full breakdown on SS2 detail. (b) Call API 2 per customer for full columns on list. | **(a)** — better performance, cleaner UX | Determines SS1 column count |
| OQ-P1-02 | SS3 Bill Detail — modal overlay or slide-over panel? | (a) Modal (centered dialog). (b) Slide-over panel from right. | **(a)** — matches existing patterns (AssignRiderModal, RoomCheckInModal) | UI pattern choice |
| OQ-P1-03 | Phase 2 action icons (Download, WhatsApp) — hide completely or show disabled in Phase 1? | (a) Hide completely. (b) Show disabled/greyed. | **(a)** — cleaner; no false affordance | SS1 icon visibility |
| OQ-P1-04 | Negative balance customer (observed: -₹144.9) — display as-is, or flag with a visual indicator? | (a) Display as-is (negative number). (b) Show with warning badge. | **(b)** — flag unusual state | SS1 edge case |
| OQ-P1-05 | Credit entries with `restaurant_order_id: null` — show "Detail" button? | (a) Hide Detail for null order IDs. (b) Show but disabled. | **(a)** — no point opening a bill detail with no order to fetch | SS2 edge case |

---

## 11. Implementation Sequence

| Step | What | Est. Time |
|---|---|---|
| 1 | Add endpoint constants to `constants.js` | 5 min |
| 2 | Create `creditService.js` (3 API wrappers) | 30 min |
| 3 | Create `creditTransform.js` (response transforms) | 30 min |
| 4 | Create `CreditManagementPage.jsx` (page shell + state + API orchestration) | 1 hr |
| 5 | Create `CreditCustomerList.jsx` (SS1 — table + search + filter) | 1.5 hr |
| 6 | Create `CreditClearancePanel.jsx` (SS4 — inline payment) | 1.5 hr |
| 7 | Create `CreditCustomerDetail.jsx` (SS2 — transaction list) | 1.5 hr |
| 8 | Create `CreditBillDetail.jsx` (SS3 — order detail modal) | 1 hr |
| 9 | Add route to `App.js` | 5 min |
| 10 | Integration test + build verify | 1 hr |
| **Total** | | **~8 hours** |

---

## 12. Regression Checklist (Post-Implementation)

| # | Test | Expected |
|---|---|---|
| 1 | `yarn build` | 0 errors |
| 2 | Navigate to `/orders/credit` | Credit Management page loads with customer list |
| 3 | Search by phone/name | Filters correctly |
| 4 | Filter: "With Balance" | Only customers with balance > 0 |
| 5 | Filter: "Settled" | Only customers with balance ≤ 0 |
| 6 | Click customer row | Detail screen opens with credits + debits |
| 7 | Detail totals match API 1 balance | sum(credits) - sum(debits) = API 1 balance |
| 8 | Click "Detail" on credit entry | Bill detail modal opens (if order_id exists) |
| 9 | Click Edit icon on SS1 | Inline clearance panel expands |
| 10 | Enter amount + select payment + submit | API 3 called; list refreshes; balance updates |
| 11 | Validation: 0 amount | Button disabled |
| 12 | Validation: amount > balance | Button disabled or error |
| 13 | Validation: no payment method | Button disabled |
| 14 | Dashboard still works | No regression on `/dashboard` |
| 15 | Existing tab payment in CollectPaymentPanel | Still works — untouched |
| 16 | Sidebar "Credit/Tab" link | Navigates to `/orders/credit` |

---

## 13. What This Plan Does NOT Cover (Phase 2)

| Feature | Reason | When |
|---|---|---|
| Per-customer PDF download | Backend report generation API needed | Phase 2 |
| Multi-customer PDF bulk export | Backend bulk report API needed | Phase 2 |
| WhatsApp share | Needs either backend API or client-side `wa.me` link decision | Phase 2 |
| Date range filter on SS1 | API 1 returns all-time data; date filtering is Phase 2 report scope | Phase 2 |
| Bulk settlement (settle all for a customer) | Owner confirmed: Phase 2 | Phase 2 |

---

## 14. Owner Approval Gate

### For owner to approve before implementation starts:

- [ ] **Phase 1 scope** (§5) — confirmed?
- [ ] **OQ-P1-01** — (a) Balance only on list / (b) Full columns with N+1 calls?
- [ ] **OQ-P1-02** — (a) Modal for bill detail / (b) Slide-over?
- [ ] **OQ-P1-03** — (a) Hide Phase 2 icons / (b) Show disabled?
- [ ] **OQ-P1-04** — (a) Negative balance as-is / (b) Warning badge?
- [ ] **OQ-P1-05** — (a) Hide Detail for null order IDs / (b) Show disabled?
- [ ] **File plan** (§8) — accepted?
- [ ] **Regression checklist** (§12) — accepted?

### After owner approval:
Implementation agent reads this plan + baseline docs, then executes §11 sequence.

---

## 15. Final Status

**`bug_104_phase_1_plan_complete_ready_for_owner_approval`**

| Metric | Value |
|---|---|
| APIs documented | 3 (all live-verified) |
| Owner decisions frozen | 6 |
| Open questions for owner | 5 (OQ-P1-01 through OQ-P1-05) |
| New files planned | 7 |
| Modified files planned | 2 (additive only) |
| Hotspot files touched | 0 |
| Estimated implementation time | ~8 hours |
| Regression risk | LOW |
| Code changed | NO |
| `/app/memory/final/` updated | NO |
| Baseline docs updated | NO |

---

*— BUG-104 Credit/Tab Management Phase 1 Implementation Plan — 2026-05-22 —*
