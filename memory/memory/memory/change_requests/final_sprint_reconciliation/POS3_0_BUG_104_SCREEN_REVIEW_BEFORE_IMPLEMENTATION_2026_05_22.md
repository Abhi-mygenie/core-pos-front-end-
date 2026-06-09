# BUG-104 — Credit / Tab Management — Screen Review Before Implementation — 2026-05-22

> **Document Type:** Visual screen review / wireframe walkthrough. No code changed. `/app/memory/final/` untouched. Baseline docs untouched. Frozen business rules untouched.
> **Predecessors:**
> - `POS3_0_BUG_104_PHASE_1_IMPLEMENTATION_PLAN_2026_05_22.md`
> - `POS3_0_BUG_104_UX_FREEZE_AND_IMPLEMENTATION_HANDOFF_2026_05_22.md`

---

## 1. Status

**`bug_104_screen_review_waiting_owner_visual_approval`**

Implementation will NOT proceed until the owner answers VQ-01 through VQ-05 in §9.

---

## 2. Source Docs Read

| # | Doc | Used For |
|---|---|---|
| 1 | `POS3_0_BUG_104_PHASE_1_IMPLEMENTATION_PLAN_2026_05_22.md` | API shapes, file layout, owner scope decisions, validated response payloads |
| 2 | `POS3_0_BUG_104_UX_FREEZE_AND_IMPLEMENTATION_HANDOFF_2026_05_22.md` | Frozen owner UX decisions (OQ-P1-01..05), screen contracts, `data-testid` list, regression guardrails |

No code was read for this pass. No business rules were re-opened.

---

## 3. Screen SS1 — Credit Customer List

**Route:** `/orders/credit`
**Surface:** Full-page (desktop POS web). No drawer. No modal.
**Data:** API 1 — `POST /api/v1/vendoremployee/pos/tap-waiter-list`

### 3A. Desktop Wireframe

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  [≡ Sidebar]   Credit / Tab Management                                  Owner ▾  Logout  │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  Credit / Tab Management                                                                 │
│  Track customer tabs and record payments                                                 │
│                                                                                          │
│  ┌─────────────────────────────────────────────┐    ┌──────────────────────────────┐    │
│  │ 🔍  Search by name, mobile or email…        │    │ Filter: [ All ▾ ]            │    │
│  └─────────────────────────────────────────────┘    └──────────────────────────────┘    │
│                                                                                          │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐   │
│  │  Customer Name      │  Mobile         │  Email              │  Balance    │ Act. │   │
│  ├──────────────────────────────────────────────────────────────────────────────────┤   │
│  │  Avi                │  9823905120     │  —                  │  ₹4,400.20  │[View]│   │
│  │  Rohit Singh        │  9876543210     │  rohit@example.com  │  ₹1,250.00  │[View]│   │
│  │  Meera              │  9090909090     │  —                  │  ₹0.00      │[View]│   │
│  │  Karan ⚠            │  9000011122     │  —                  │ -₹144.90    │[View]│   │
│  │  …                  │  …              │  …                  │  …          │[View]│   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                          │
│  Showing 21 customers                                                                    │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3B. Layout Spec

| Region | Behavior |
|---|---|
| Page title | "Credit / Tab Management" + subtitle |
| Search box | Top-left, full-width on its row. Client-side filter on `name`, `mobile`, `email`. Case-insensitive substring match. |
| Filter dropdown | Right of search box. Options: `All` (default) / `With Balance` (balance > 0) / `Settled` (balance ≤ 0). |
| Table | Sticky header. Vertical scroll on overflow. Rows clickable. |
| Action column | "View / Manage" button (right-aligned). Whole row also clickable. |
| Footer | "Showing N customers" counter. |

### 3C. Column Spec (Frozen)

| # | Column | Source | Format |
|---|---|---|---|
| 1 | Customer Name | `item.name` | Capitalize first letter |
| 2 | Mobile | `item.mobile` | Raw string |
| 3 | Email | `item.email` | If `null` → "—" (em dash, muted) |
| 4 | Outstanding Balance | `item.balance` | `₹{n.toFixed(2)}`, INR thousands separator |
| 5 | Action | — | "View / Manage" outline button |

### 3D. Balance Cell Styling (Frozen)

| Balance value | Visual |
|---|---|
| `> 0` (positive) | Normal text, slight emphasis weight |
| `=== 0` (settled) | Muted/grey text |
| `< 0` (negative — edge case) | Red text + `⚠` warning badge prefix |

### 3E. State Variants

| State | Visual |
|---|---|
| Loading | Skeleton rows (5 placeholder rows) + spinner near the title |
| Empty (API returned `[]`) | Centered card: "No credit customers yet" + subtitle "Customers with open tabs will appear here." |
| Empty (filter/search returns 0) | Centered row: "No customers match your search." |
| Error | Banner toast "Failed to load credit customers." + inline "Retry" button at top-right |

### 3F. Phase 2 Icons — NOT RENDERED

No Download, no WhatsApp share, no bulk export, no PDF icon, no print icon anywhere on this screen.

---

## 4. Screen SS2 — Customer Transaction Detail

**Trigger:** Click any row (or "View / Manage" button) on SS1.
**Surface:** In-page state change — list collapses, detail view expands. (Drawer vs. inline-replace is the focus of **VQ-02**.)
**Data:** API 2 — `GET /api/v2/vendoremployee/pos/tap-customer-record-list?customer_id={id}`

### 4A. Desktop Wireframe (Drawer Variant — Default Proposed)

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│  [← Back to list]                                                          [×]     │
│                                                                                    │
│  Avi                                                                               │
│  📞 9823905120                                                                     │
│                                                                                    │
│  ┌──────────────────────────────────────────────────────────────────────────────┐ │
│  │  Outstanding Balance                                              ₹4,400.20  │ │
│  └──────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                    │
│  ┌──────────────┬─────────────┬───────────────┬───────────────┬─────────────────┐ │
│  │ First Tab    │ Last Credit │ Last Credit ₹ │ Last Payment  │ Last Payment ₹  │ │
│  │ 12/03/26     │ 19/05/26    │ ₹1,149.00     │ 17/05/26      │ ₹500.00         │ │
│  └──────────────┴─────────────┴───────────────┴───────────────┴─────────────────┘ │
│                                                                                    │
│                                          [  ＋ Record Payment  ]                   │
│                                                                                    │
│  ┌──────────────────────────────────────────────────────────────────────────────┐ │
│  │  Credits (Tabs opened)                                                       │ │
│  ├──────────────────────────────────────────────────────────────────────────────┤ │
│  │  #  │ Date     │ Order ID │ Credit ₹    │ Current Balance │ Status │ Detail │ │
│  │  1  │ 19/05/26 │ #4521    │ ₹1,149.00   │ ₹4,400.20       │ ✓      │ [View] │ │
│  │  2  │ 17/05/26 │ #4502    │ ₹  640.00   │ ₹3,251.20       │ ✓      │ [View] │ │
│  │  3  │ 15/05/26 │ —        │ ₹  300.00   │ ₹2,611.20       │ ✓      │ [—  ]  │ │
│  │ …   │ …        │ …        │ …           │ …               │ …      │ …      │ │
│  └──────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                    │
│  ┌──────────────────────────────────────────────────────────────────────────────┐ │
│  │  Payments (Debits)                                                           │ │
│  ├──────────────────────────────────────────────────────────────────────────────┤ │
│  │  #  │ Date     │ Method │ Debit ₹     │ Balance After  │ Order ID            │ │
│  │  1  │ 17/05/26 │ Cash   │ ₹500.00     │ ₹3,151.20      │ —                   │ │
│  │  2  │ 10/05/26 │ UPI    │ ₹1,000.00   │ ₹1,611.20      │ —                   │ │
│  │ …   │ …        │ …      │ …           │ …              │ …                   │ │
│  └──────────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────┘
```

### 4B. Header Spec

| Element | Source |
|---|---|
| Back button | Returns to SS1 with prior search/filter state preserved |
| Customer name | `selected.name` (capitalized) |
| Mobile | `selected.mobile` with phone icon |
| Close (×) | Same behavior as Back (only one is rendered — Back is preferred) |

### 4C. Summary Bar (Frozen)

| Tile | Source | Format |
|---|---|---|
| Outstanding Balance (hero) | `selected.balance` | `₹{n.toFixed(2)}` — large, bold |
| First Tab | `tap_start_date` | DD/MM/YY |
| Last Credit | `last_tap_credit_date` | DD/MM/YY |
| Last Credit ₹ | `last_tap_credit_amount` | `₹{n}` |
| Last Payment | `last_tap_debit_date` | DD/MM/YY |
| Last Payment ₹ | `last_tap_debit_amount` | `₹{n}` |

> *Note:* "Total Credit" and "Total Paid" totals (per UX freeze §6B) are computed from list sums and shown as supplementary text under the hero balance. They remain part of the spec; the wireframe shows the date-centric tiles to address the owner's emphasis on date fields.

### 4D. Credits Table — Column Spec

| # | Column | Source |
|---|---|---|
| 1 | # | Serial number (1-indexed) |
| 2 | Date | `order_created_at` ?? `created_at` → DD/MM/YY |
| 3 | Order ID | `restaurant_order_id` ?? `order_id` ?? "—" |
| 4 | Credit ₹ | `parseFloat(credit_order_amount)` |
| 5 | Current Balance | `parseFloat(current_balance)` |
| 6 | Status | `payment_status` raw value mapped to icon — NEVER show the literal "sucess" typo. ✓ for `"sucess"`. |
| 7 | Detail | "View" button → opens SS3. Disabled when `order_id` is `0`/`null`. |

### 4E. Payments (Debits) Table — Column Spec

| # | Column | Source |
|---|---|---|
| 1 | # | Serial number |
| 2 | Date | `created_at` → DD/MM/YY |
| 3 | Method | `payment_status` capitalized (`Cash` / `Card` / `UPI`) |
| 4 | Debit ₹ | `parseFloat(debit_order_amount)` |
| 5 | Balance After | `parseFloat(current_balance)` |
| 6 | Order ID | `order_id` if present, else "—" |

### 4F. "Record Payment" Button

- Positioned top-right of detail surface, above the credits table.
- Primary/filled style.
- `data-testid="credit-record-payment-btn"`
- Click → opens SS4 (Payment Clearance).

---

## 5. Screen SS3 — Bill Detail Slide-Over (and General States)

This section serves two purposes: (1) confirm the SS3 slide-over layout, and (2) collect all common UI states for SS1/SS2/SS3/SS4 in one place.

### 5A. SS3 — Bill Detail Slide-Over Wireframe

**Trigger:** Click "View" on a credit row in SS2.
**Surface:** Right-side `Sheet` (matches existing audit-report `OrderDetailSheet`).
**API:** `POST /api/v2/vendoremployee/get-single-order-new` with `{ order_id }`.

```
                                              ┌──────────────────────────────┐
                                              │ Bill — Order #4521      [×]  │
                                              ├──────────────────────────────┤
                                              │ Table: T-04                  │
                                              │ Date:  19/05/26   8:34 PM    │
                                              │                              │
                                              │ Items                        │
                                              │ ─────────────────────────── │
                                              │ Veg Biryani         x2  640  │
                                              │ Paneer Tikka        x1  280  │
                                              │ Soft Drink          x2  120  │
                                              │ ─────────────────────────── │
                                              │ Sub Total              1,040 │
                                              │ Tax (5%)                  52 │
                                              │ Discount                  57 │
                                              │ ─────────────────────────── │
                                              │ Grand Total          ₹1,149  │
                                              │ ─────────────────────────── │
                                              │                              │
                                              │       (no action buttons)    │
                                              └──────────────────────────────┘
```

| Region | Spec |
|---|---|
| Header | "Bill — Order #{order_id}" + close × |
| Meta | Table number + datetime |
| Items | Name × qty + line total |
| Totals | Sub Total / Tax / Discount / **Grand Total** (bold) |
| Actions | NONE (no print, no edit, no reprint per owner directive) |
| `data-testid` | `credit-bill-detail-sheet` |

### 5B. State Variants — Master List

| Screen | State | Visual |
|---|---|---|
| SS1 | Loading | Skeleton rows + top spinner |
| SS1 | Empty (no customers) | Centered illustration card: "No credit customers yet" |
| SS1 | Empty (no search match) | Inline row: "No customers match your search." |
| SS1 | API error | Toast: "Failed to load credit customers." + Retry pill |
| SS2 | Loading | Skeleton summary tiles + 5 skeleton table rows |
| SS2 | Empty (no transactions) | Centered card: "No transactions yet for this customer." |
| SS2 | API error | Toast + Retry inside detail surface |
| SS3 | Loading | Spinner centered inside Sheet body |
| SS3 | API error | Inline message: "Failed to load order details." + Retry |
| SS3 | Order not found / null id | Sheet does not open (button is disabled upstream) |
| SS4 | Idle | Submit disabled until valid amount + method |
| SS4 | Submitting | Submit shows spinner + disabled; Cancel still active |
| SS4 | Validation: amount missing | Helper text under input: "Enter an amount." Submit disabled. |
| SS4 | Validation: amount = 0 / negative | Helper text under input: "Amount must be greater than 0." Submit disabled. |
| SS4 | Validation: amount > balance | Helper text under input: "Amount cannot exceed outstanding balance." Submit disabled. |
| SS4 | API success | Toast: "Payment of ₹{amount} recorded." Modal closes. SS2 + SS1 re-fetch. |
| SS4 | API error | Toast: "{readableMessage} or 'Payment failed. Please retry.'" Submit re-enabled. Modal stays open. |

---

## 6. (covered above in §5)

*Intentionally merged into §5 to keep all state visuals adjacent to SS3 — see §5B for the full state matrix.*

---

## 7. Screen SS4 — Payment Clearance

**Trigger:** "Record Payment" button on SS2.
**Surface:** Centered modal (`Dialog`). (Drawer alternative is collected via **VQ-04**.)
**API:** `POST /api/v1/vendoremployee/pos/tap-waiter-order-insert`.

### 7A. Desktop Wireframe

```
                ┌──────────────────────────────────────────────────────┐
                │  Record Payment — Avi                          [×]   │
                ├──────────────────────────────────────────────────────┤
                │                                                      │
                │  Customer:   Avi                                     │
                │  Mobile:     9823905120                              │
                │                                                      │
                │  Outstanding Balance                  ₹4,400.20      │
                │                                                      │
                │  ───────────────────────────────────────────────────│
                │                                                      │
                │  Payment Method *                                    │
                │   ( ●  Cash )   ( ○  Card )   ( ○  UPI )            │
                │                                                      │
                │  Amount *                                            │
                │  ┌────────────────────────────────────────────────┐  │
                │  │ ₹  1000.00                                     │  │
                │  └────────────────────────────────────────────────┘  │
                │  Amount must be greater than 0.                      │
                │                                                      │
                │  Remaining after payment:             ₹3,400.20      │
                │                                                      │
                │  ───────────────────────────────────────────────────│
                │                                                      │
                │             [ Cancel ]      [  Record Payment ✓ ]    │
                │                                                      │
                └──────────────────────────────────────────────────────┘
```

### 7B. Layout Spec

| Region | Spec |
|---|---|
| Header | "Record Payment — {customer.name}" + close × |
| Customer summary | Name + mobile (read-only) |
| Outstanding balance | Hero row, right-aligned amount |
| Payment Method | Pills row, single-select. Renders only methods enabled in `restaurant.features.paymentMethods` (`cash` / `card` / `upi`). |
| Amount input | Numeric, prefix `₹`. Auto-focus on open. |
| Helper text | Below input. Switches between empty / "Enter an amount." / "Amount must be greater than 0." / "Amount cannot exceed outstanding balance." |
| Remaining after payment | Live calc: `balance - parseFloat(amount)`. Hidden until amount is a valid number. |
| Cancel button | Secondary. Closes modal. No API call. |
| Record Payment | Primary. Disabled until valid amount + method. Shows spinner during submit. |

### 7C. Validation State Table

| Condition | Submit button | Helper text |
|---|---|---|
| Amount empty | Disabled | (none / placeholder) |
| Amount = 0 | Disabled | "Amount must be greater than 0." |
| Amount < 0 | Disabled | "Amount must be greater than 0." |
| Amount > balance | Disabled | "Amount cannot exceed outstanding balance." |
| Method not selected | Disabled | "Select a payment method." (rendered near pills) |
| Valid amount + method | Enabled | (helper hidden) |
| Submitting | Disabled + spinner | (helper hidden) |

### 7D. Critical Rules (Frozen — Not Up For Review)

- Local balance is NOT mutated before API success.
- On success → close modal, refresh SS2 + SS1, stay on the same customer.
- On failure → keep modal open, re-enable submit, surface error toast.
- No table/order status mutation. No print. No settlement linkage.

---

## 8. Hidden Phase 2 Actions

The following are intentionally **not rendered anywhere** in Phase 1 (per OQ-P1-03):

| Phase 2 Action | Visible in Phase 1? |
|---|---|
| Download statement PDF (per customer) | NO |
| Bulk PDF export | NO |
| WhatsApp share | NO |
| Bulk settle (settle all for a customer) | NO |
| Date range filter on SS1 | NO |
| Print receipt from credit screens | NO |
| Disabled-but-visible Phase 2 icons | NO |

Result: zero Phase 2 affordances anywhere in the credit module UI.

---

## 9. Out of Scope Confirmation

The following are confirmed **NOT** present in the Phase 1 screens:

| Item | Confirmed Absent |
|---|---|
| Print receipt | ✓ |
| Settlement module integration | ✓ |
| Table clear / order status update | ✓ |
| Tax / order amount recalculation in UI | ✓ |
| Mobile-specific or responsive layouts | ✓ |
| Phase 2 icons / actions | ✓ |
| Sidebar edits / dashboard edits | ✓ |
| Backend changes | ✓ |

---

## 10. Owner Visual Approval Questions

> **Layout/visual only.** No business-logic questions. All business rules remain frozen per the UX freeze doc.

### VQ-01 — Customer list layout approval (SS1)
- **A.** Approved as shown (search top-left, filter top-right, columns: Name → Mobile → Email → Balance → Action)
- **B.** Move search/filter placement (specify)
- **C.** Change column order (specify)
- **D.** Other (specify)

### VQ-02 — Customer detail surface approval (SS2)
- **A.** Approved as shown (in-page drawer-style detail with Back-to-list)
- **B.** Use a centered modal instead of a drawer
- **C.** Use a right-side drawer (Sheet) instead of in-page replace
- **D.** Other (specify)

### VQ-03 — Credit/debit transaction display (SS2)
- **A.** Approved as separate sections (Credits table + Payments table — current proposal)
- **B.** Show all transactions in one combined timeline (sorted by date desc)
- **C.** Show tabs: Credit / Payment
- **D.** Other (specify)

### VQ-04 — Payment clearance UI surface (SS4)
- **A.** Approved as shown (centered modal opened from SS2)
- **B.** Put payment form **inside** the detail drawer (no separate modal)
- **C.** Use a separate right-side drawer instead of a modal
- **D.** Other (specify)

### VQ-05 — Amount validation message placement (SS4)
- **A.** Below input (current proposal)
- **B.** Top of modal as a banner
- **C.** Toast only
- **D.** Both — below input AND toast on submit attempt

---

## 11. Implementation Gate

**`WAITING_OWNER_VISUAL_APPROVAL_BEFORE_IMPLEMENTATION`**

Implementation will not be marked ready until VQ-01 through VQ-05 are answered. Once answered, the UX freeze doc will be amended with the visual decisions and implementation can begin.

---

## 12. Final Confirmations

- **No code was changed** in this pass.
- **`/app/memory/final/` was NOT updated.**
- **Baseline docs were NOT updated.**
- **Frozen business rules from the UX freeze doc were NOT re-opened.**
- **No backend code was modified.**
- **No new APIs were proposed.**
- This document is a **visual review only**. It supplements — and does not replace — the UX freeze doc.

---

*— BUG-104 Credit/Tab Management — Screen Review Before Implementation — 2026-05-22 —*
