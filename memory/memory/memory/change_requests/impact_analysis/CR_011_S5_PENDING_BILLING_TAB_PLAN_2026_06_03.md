# CR-011 S5 — Pending Billing Tab: End-to-End Implementation Plan

**Date:** 2026-06-03
**Owner directive:** Separate sold items (billed, `f_order_status=6`) from pending-billing items (unbilled, `f_order_status≠6`) into mutually exclusive tabs. Same audit rules apply.
**Scope:** S5 Item Sales Hybrid — service layer + UI component
**Status:** PLANNING — no code changes yet
**Prerequisite:** Owner approval of this plan

---

## 1. BUSINESS RULE SUMMARY

### 1.1 Current State (before this change)

Every non-cancelled, non-comp line is classified as **SOLD** regardless of order payment status. This means unpaid/pending orders (room orders not billed, cash_on_delivery not collected) are mixed into the "All Items" tab, causing false tax drift because backend hasn't computed GST on unbilled orders.

### 1.2 Target State (after this change)

4 mutually exclusive buckets, determined per line:

| Bucket | Gate (evaluated in this order) |
|--------|------|
| **CANCELLED** | `food_status === '3'` (line-level). No other gate. |
| **COMPLIMENTARY** | `complementary === 1` (line-level). No other gate. |
| **SOLD** | `food_status ≠ 3` AND `complementary ≠ 1` AND **`f_order_status === 6`** (order-level) |
| **PENDING BILLING** | `food_status ≠ 3` AND `complementary ≠ 1` AND **`f_order_status ≠ 6`** (order-level) |

**Mutual exclusivity proof:** Every line hits exactly one bucket because the gates are evaluated top-to-bottom and are exhaustive:
1. If cancelled → CANCELLED (regardless of order status)
2. Else if comp → COMPLIMENTARY (regardless of order status)
3. Else if order is paid (f_order_status=6) → SOLD
4. Else → PENDING BILLING

### 1.3 Tab Structure (7 tabs)

| # | Tab | Content | Relationship |
|---|-----|---------|-------------|
| 1 | **Sold Items** (renamed from "All Items") | Items with at least 1 line in SOLD bucket | Parent |
| 2 | **Top Sellers** | Top 20 of Sold Items by revenue | Strict subset of tab 1 |
| 3 | **Slow Movers** | Low-qty items from Sold Items | Strict subset of tab 1 |
| 4 | **Cancelled Lines** | Items with at least 1 line in CANCELLED bucket | Independent, mutually exclusive with 1/5/6 |
| 5 | **Complimentary** | Items with at least 1 line in COMPLIMENTARY bucket | Independent, mutually exclusive with 1/4/6 |
| 6 | **Pending Billing** (NEW) | Items with at least 1 line in PENDING BILLING bucket | Independent, mutually exclusive with 1/4/5 |
| 7 | **Audit** | Applies to ALL tabs including Pending Billing | Cross-cutting |

**Note on mutual exclusivity at TAB level:** A single food_id CAN appear on multiple tabs if it has lines in different buckets (e.g., Cappuccino has 318 sold lines + 3 cancelled lines + 4 pending lines → appears on tabs 1, 4, and 6 with different numbers). The mutual exclusivity is at the LINE level, not the ITEM level. Each tab shows only the aggregate for that item's lines in that bucket.

---

## 2. INVESTIGATION CORRECTIONS (from 2026-06-03 session)

### 2.1 May 9 "Incident" — DOWNGRADED from P0 to NON-ISSUE

Previous investigation (`CR_011_S5_AUDIT_TAX_DRIFT_INVESTIGATION_2026_06_02.md` §4.2) claimed:
> "70 out of 149 orders on May 9 (47%) had zero GST — P0 system-wide failure, ~₹2,500 missing"

**Corrected finding (2026-06-03):**
- 162 total orders on May 9
- 84 (52%) have normal GST
- 71 (44%) are alcohol/beer orders with `tax_rate=0%` in product config — correctly ₹0 GST
- 3 (2%) are 100% discount orders — correctly ₹0 GST
- 3 (2%) are empty orders
- **1 (0.6%) is a real bug** (order #014509, Kombucha, ₹6.50 missing)

**Root cause of misclassification:** Previous analysis checked only `total_gst_tax_amount=0` at order level without verifying that items were configured as tax-exempt (alcohol: Corona, Budweiser, Kingfisher, Mojito, etc. all have `tax: 0` in product API).

**Action:** ESC-1 (OWNER_DECISION_QUEUE Category D row #14) should be DOWNGRADED from P0 CRITICAL to CLOSED — NOT A BUG.

### 2.2 Actual Drift Orders (full Apr 3 – Jun 3 analysis)

**12 total orders** with real tax drift, **₹623.50 total missing GST.**

After Pending Billing tab split:

| Category | Orders | Missing GST | Destination |
|----------|--------|-------------|-------------|
| **Pending Billing** (f_order_status=2 or 5) | 8 | ₹486.00 | Pending Billing tab — drift expected, GST not yet billed |
| **Real Backend Bugs** (f_order_status=6, paid) | 4 | ₹137.50 | Sold Items tab — genuine zero-GST on paid orders |

**The 4 real backend bugs (stay on Sold Items tab):**

| Order | Date | Issue | Missing |
|-------|------|-------|---------|
| #013489 | Apr 20 | Room order (Table 101), 14 items, order-level GST ₹108 but ₹0 per line | ₹108.00 |
| #013594 | Apr 23 | Room order (Table C-04), Superfood Salad, same distribution bug | ₹15.00 |
| #014509 | May 9 | Kombucha, UPI payment, standalone anomaly | ₹6.50 |
| #014606 | May 11 | Cappuccino, TAB payment, standalone anomaly | ₹8.00 |

**Pattern:** 2 are Room GST distribution bugs (ESC-2 in OWNER_DECISION_QUEUE, stays P1). 2 are isolated anomalies (P3).

### 2.3 Backend Escalation Status Update

| ESC | Old Priority | New Priority | Reason |
|-----|-------------|-------------|--------|
| ESC-1 (May 9 incident) | P0 CRITICAL | **CLOSED — NOT A BUG** | Alcohol orders with tax_rate=0%. Only 1 real anomaly (₹6.50). |
| ESC-2 (Room GST distribution) | P1 | P1 (unchanged) | 2 confirmed orders, ₹123 missing. Real backend bug. |
| ESC-3 (Cancelled financials) | P0 CRITICAL | P0 CRITICAL (unchanged) | Still valid — but this moves to Cancelled tab, not Sold. |
| ESC-4 (price field inconsistency) | P2 | P2 (unchanged) | FE workaround in place. |

---

## 3. NEW FE BUSINESS RULES TO REGISTER

Per Protocol §8 (Frontend Business Logic Disclosure), these new rules must be registered in `auditManifest.js` with `approved=false` and triaged by owner:

| Rule ID | Name | Explains |
|---------|------|----------|
| **FE-56** | Sold Items gate: f_order_status === 6 | A line counts as "sold" only if the parent order has f_order_status=6 (delivered/paid). Orders with status 2 (not served) or 5 (served not paid) are excluded from the Sold bucket. |
| **FE-57** | Pending Billing bucket: f_order_status ≠ 6 | Non-cancelled, non-comp lines from orders with f_order_status ≠ 6 go to "Pending Billing" bucket. These are orders where payment hasn't been collected and GST hasn't been billed by backend. |

**Owner pre-approval status:** Owner directed this change in chat (2026-06-03). Verbatim: *"f_order_status should be 6" ... "1 4 5 6 should not have any item in common these are mutually exclusive / 2 and 3 are subset of 1"*. Rules should be registered as `approved=true` with this source.

---

## 4. FILES TO CHANGE (scope lock)

### 4.1 Service Layer

| File | Change |
|------|--------|
| `insightsService.js` (`getItemSalesAggregated`) | (a) Read `f_order_status` from `wrapper.orders_table.f_order_status` for each order. (b) Add 4th bucket classification: if not cancelled and not comp, check `f_order_status === 6` → Sold, else → Pending. (c) Add per-bucket accumulators: `qtyPending`, `itemTotalPending`, `discountPending`, `subtotalPending`, `taxPending`, `totalRevenuePending`, `serviceChargePending`, `avgPricePending`. (d) Add `hasTaxField_pending` and `bothTaxesBooked_pending` flags. (e) Add `avgPricePending` computation in the final map. (f) Add meta: `totalItemsPending`, `totalRevenuePending`. |

### 4.2 UI Component

| File | Change |
|------|--------|
| `ItemSalesHybridMockup.jsx` | (a) Add `TABS` entry: `{ id: 'pending', label: 'Pending Billing' }` after `comp`. (b) Rename `all` tab label from `'All Items'` to `'Sold Items'`. (c) Add `apiRows` mapping for pending bucket fields (`qtyPending`, etc.). (d) Add `pending` filter: `data.filter(d => d.qtyPending > 0)`. (e) Add `lensFilteredData` lens for `pending` tab (swap to pending-bucket columns). (f) Add `tabCounts.pending`. (g) Audit engine: include pending bucket in audit flags (same rules as sold). (h) Export: add "Pending Billing" sheet to `buildExportPayload`. (i) Column headers for Pending tab: "Pending Qty", "Pending Revenue" (or keep standard — owner to decide). |

### 4.3 Audit Engine

| File | Change |
|------|--------|
| `auditEngine.js` | Add pending bucket handling in `auditRows()`: same tax-rate comparison as sold bucket (expected = subtotal × rate, actual vs expected, AMBER if drift > tolerance). Use `hasTaxField_pending` and `bothTaxesBooked_pending`. |

### 4.4 Audit Manifest

| File | Change |
|------|--------|
| `auditManifest.js` | Register FE-56 and FE-57 with `approved=true`, `approvedDate='2026-06-03'`, `approvedSource='Owner chat directive 2026-06-03 — f_order_status=6 gate for sold; pending billing tab for rest'`. |

### 4.5 Governance Docs (this plan + control layer updates)

Already done as part of this planning document.

---

## 5. VERIFICATION MATRIX

After implementation, verify these conditions:

| # | Check | How to verify |
|---|-------|--------------|
| V1 | Sold Items tab shows ONLY f_order_status=6 lines | Filter by a known pending order (e.g. #013844) — should NOT appear on Sold Items |
| V2 | Pending Billing tab shows ONLY f_order_status≠6 lines | Same order #013844 SHOULD appear on Pending Billing |
| V3 | Top Sellers is strict subset of Sold Items | Every item on Top Sellers also appears on Sold Items with same qty/revenue |
| V4 | Slow Movers is strict subset of Sold Items | Same check |
| V5 | Cancelled tab unchanged | food_status=3 lines appear regardless of f_order_status |
| V6 | Complimentary tab unchanged | complementary=1 lines appear regardless of f_order_status |
| V7 | No line appears in 2+ buckets | Sum of qtySold + qtyCancelled + qtyComplementary + qtyPending = total lines |
| V8 | Sold Items drift drops to ~₹137.50 | Only 4 real backend bugs remain |
| V9 | Pending Billing drift = ~₹486.00 | 8 pending orders with expected drift |
| V10 | Audit flags on Pending Billing tab work | AMBER/RED/EXEMPT classification identical to Sold |
| V11 | Export includes Pending Billing sheet | 7 sheets total in Excel |
| V12 | Tab counts add up | soldItems + cancelled + comp + pending ≈ total (food_id may appear on multiple tabs) |

---

## 6. ROLLOUT SEQUENCE (atomic)

1. Update `auditManifest.js` — register FE-56 + FE-57
2. Update `insightsService.js` — add f_order_status read + 4th bucket
3. Update `auditEngine.js` — add pending bucket audit
4. Update `ItemSalesHybridMockup.jsx` — tab rename + new tab + lens + filters + export
5. Lint check
6. Verify on Palm House Apr–Jun date range
7. Owner validates

---

## 7. RISK REGISTER

| # | Risk | Mitigation |
|---|------|-----------|
| R1 | f_order_status values change across restaurants | Only observed values: 2, 3, 5, 6 in Palm House. Gate is `=== 6` vs `!== 6`, so any new status auto-goes to Pending. Safe. |
| R2 | Some f_order_status=6 orders have pending payment_method | 2 such orders found (#014509 upi, #014606 TAB) — these are real bugs, correctly stay in Sold. |
| R3 | Performance impact of reading f_order_status per line | Already reading `wrapper.orders_table` for order_id. f_order_status is on same object. Zero additional API calls. |
| R4 | Cancelled lines on pending orders | Cancelled is checked first (line-level food_status=3). Goes to Cancelled bucket regardless of f_order_status. Correct per owner directive. |
| R5 | Comp lines on pending orders | Same — complementary checked second. Goes to Comp bucket regardless. |

---

## 8. OPEN QUESTIONS FOR OWNER

| # | Question | Default if no answer |
|---|----------|---------------------|
| Q1 | Column headers for Pending Billing tab: "Pending Qty" + "Pending Revenue" or keep standard "Qty Sold" + "Total Revenue"? | Use "Pending Qty" + "Unbilled Revenue" |
| Q2 | Should Pending Billing tab have its own attribution toggle (By Paid Date / By Punched Date) or always show by punched date? | Always punched date (since no paid date exists) |

---

*End of plan. Awaiting owner GO to proceed with implementation.*
