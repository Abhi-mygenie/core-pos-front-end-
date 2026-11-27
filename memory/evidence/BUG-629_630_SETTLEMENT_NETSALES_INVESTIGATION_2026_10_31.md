# Investigation Report — Settlement + Net Sales (4 Issues)

**Date:** 2026-10-31
**Steps used:** 8/10
**Confidence:** HIGH

---

## Issue 1 — Customer name CRM sync on order placement
**CLOSED — NO ISSUE.** Owner confirmed FE flow is correct. FE sends customer data from local state to main backend at order time. CRM is called separately for customer CRUD. No bidirectional sync gap.

## Issue 2 — When is updateCustomer called?
**CLOSED — NO ISSUE.** Owner confirmed. `updateCustomer` is called from CustomerModal (2 paths), RoomCheckInModal, and CheckInPage — all explicit user-initiated edit flows via CRM PUT API.

## Issue 3 — BUG-629: Settlement "Total sale" subtitle (FE gap)
**REGISTERED.** `SettlementPage.jsx:224` — "Cash Collected" KPI card subtitle shows `"Total sale: ₹0 · definition pending ⓘ"`. This is a CR-033 development artifact. Data IS available (`totals.totalSale` from backend). Subtitle should show cash-relevant context, not "Total sale" with a pending note.

## Issue 4 — BUG-630: Net Sales definition wrong (BACKEND)
**REGISTERED — BACKEND_BLOCKED.** Backend `total_sales` field includes GST+VAT+service charge, making "Net Sales" larger than "Gross Revenue" (₹13,61,162 > ₹13,33,222). Standard Net Sales = Gross − Discount = ₹12,96,586 (excludes tax). Backend must send the correct net figure.
