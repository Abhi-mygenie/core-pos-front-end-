# NEXT AGENT — Complete Handover for CR-011 S5 (2026-06-03 Session)

**Created:** 2026-06-03 (end of session)
**Branch:** `3-june`
**Preview URL:** https://insights-phase.preview.emergentagent.com
**Backend:** https://preprod.mygenie.online/ (external, do NOT change)
**Active CR:** CR-011 — Complete Reports Module (POS 4.0)
**S5 Status:** 🟠 Re-validation pending

---

## 0. MANDATORY FIRST READ

1. `/app/memory/control/CR_011_SCREEN_FREEZE_PROTOCOL.md` — binding gate rules
2. `/app/memory/control/CR_011_SCREEN_FREEZE_LOG.md` — current state of all 41 screens
3. `/app/memory/control/CONTROL_DASHBOARD.md` — project state
4. `/app/memory/control/OWNER_DECISION_QUEUE.md` — Category G for FE rules
5. This file — session handover

---

## 1. WHAT WAS DONE THIS SESSION (2026-06-03)

### 1.1 Investigations (no code)

| Investigation | Finding |
|---|---|
| **May 9 "incident" re-analysis** | CORRECTED — previous agent claimed 70 orders / ₹2,500 P0. Reality: 71 were alcohol orders (tax_rate=0%, correctly ₹0 GST). Only 1 real bug (#014509, ₹6.50). **ESC-1 CLOSED — NOT A BUG.** |
| **Full Palm House drift trace** | 12 orders / ₹623.50 total. 8 are f_order_status≠6 (pending billing, ₹486). 4 are f_order_status=6 (real bugs, ₹137.50). |
| **Palm House collect_bill drift** | 5 orders cause all 10 AMBER items on S5: #013489 (Room 101, ₹108), #013594 (Room C-04, ₹15), #012318 (Room 109, ₹11), #014606 (TAB, ₹8), #014509 (UPI, ₹6.50). |
| **Lafetta cross-restaurant** | owner@lafetta.com (rid=78): 33 AMBER items, 12 orders, ₹792.90 drift. All from Apr 17-19 by employee Umesh/Mandeep. System-level backend zero-GST incident. |
| **Pending Billing API gap** | `sort_by=collect_bill` returns only f_order_status=6 orders (2,034). Pending orders (f=2/5, 27 total) excluded — no collect_bill timestamp. `sort_by=created_at` returns all 2,174. |

### 1.2 Code Shipped

| Feature | Files Changed | FE Rules |
|---|---|---|
| **Pending Billing tab** (4-bucket model) | `insightsService.js`, `auditEngine.js`, `ItemSalesHybridMockup.jsx`, `auditManifest.js` | FE-56 ✅, FE-57 ✅ |
| **Audit Investigate button** | `insightsService.js`, `ItemSalesHybridMockup.jsx`, `auditManifest.js` | FE-58 ✅, FE-59 ✅ |
| **Last Seen Ambiguity** (order-level + Items Ordered) | `ItemSalesHybridMockup.jsx`, `auditManifest.js` | FE-60 ✅ |

### 1.3 Owner Decision: S5 PARKED → S6 NEXT

Owner verbatim: *"I will like to keep this here it self till backend doesnt correct ambiguity, and move to next screen set for orders"* → confirmed *"yes"* to park S5, start S6.

**S5 will be revisited for Gate ⑤ after backend fixes land.** S6 Order Ledger Hybrid is NEXT per owner directive.

---

## 2. WHAT EXISTS ON S5 TODAY

### 2.1 Tabs (7 total)

| # | Tab | Filter | Data Source |
|---|-----|--------|-------------|
| 1 | **Sold Items** (renamed from All Items) | `qty > 0` (qtySold from f_order_status=6 orders) | collect_bill fetch |
| 2 | **Top Sellers** | Top 20 of Sold Items by revenue | subset of tab 1 |
| 3 | **Slow Movers** | `qty > 0 && qty <= 1` | subset of tab 1 |
| 4 | **Cancelled Lines** | `qtyCancelled > 0` | collect_bill fetch (or created_at when cancel toggle) |
| 5 | **Complimentary** | `qtyComplementary > 0` | collect_bill fetch |
| 6 | **Pending Billing** | `qtyPending > 0` | **SHOWS 0 — needs dual-fetch fix** |
| 7 | **Audit** | All audit flags + REVIEW items | computed from all data |

### 2.2 Audit Tab Sections (top to bottom)

1. **KPI strip:** Active Flags / RED / AMBER / REVIEW / EXEMPT
2. **RED · Business-rule violations** — both-taxes-on-line detector
3. **LAST SEEN AMBIGUITY · Orders with GST drift** — order-level table (Order, Date, Employee, Payment, Table, Items, Items Ordered, Item Total, Discount, Subtotal, GST Expected, GST Actual, GST Drift) + TOTAL footer. Sorted latest first.
4. **AMBER · Tax calculation mismatches** — item-level table with **Investigate** button per row. Click → expands inline sub-table showing per-order drift lines.
5. **EXEMPT · Audit-passed by policy** — comp lines (FE-15) + cancelled-no-tax lines (FE-17)
6. **REVIEW · Frontend business rules** — pending owner approve/reject

### 2.3 4-Bucket Model (insightsService.js)

```
For each order line:
  1. CANCELLED  → food_status === '3'           (line-level, no other gate)
  2. COMP       → complementary === 1            (line-level, no other gate)  
  3. SOLD       → not 1/2 AND f_order_status=6   (order-level gate)
  4. PENDING    → not 1/2 AND f_order_status≠6   (everything else)
```

### 2.4 driftLines Collection (insightsService.js)

During aggregation, when `|actual_tax - expected_tax| > 0.02` for any line, saves:
`{ orderId, date, employee, payment, table, bucket, qty, unitPrice, subtotal, expectedTax, actualTax, drift, taxRate }`
into `drill.driftLines[]` on that food_id. Passed through to UI via `apiRows[].drill.driftLines`.

---

## 3. THE ONE REMAINING CODE TASK

### Task 1: Dual-fetch for Pending Billing tab

**Problem:** `sort_by=collect_bill` only returns paid orders (f_order_status=6). Pending orders (f=2/5) are excluded by backend because they have no collect_bill timestamp. The Pending Billing tab shows 0 items.

**Fix:** Make a second API call with `sort_by=created_at` inside `getItemSalesAggregated`. Merge the two responses — use collect_bill data for Sold/Cancelled/Comp buckets, use created_at data to find additional orders with f_order_status≠6 for the Pending bucket.

**Pattern already exists:** Dashboard S0 (`getDashboardAggregated`) already makes 2 parallel fetches (collect_bill + created_at) for cancellation attribution. Same pattern.

**Implementation approach:**
```js
const [ordersResp, createdAtResp, ...] = await Promise.all([
  api.post(ORDER_LOGS_REPORT, { sort_by: serverSortBy, from_date, to_date }),
  api.post(ORDER_LOGS_REPORT, { sort_by: 'created_at', from_date, to_date }),
  ...
]);
const paidOrders = ordersResp.data?.order || [];
const allOrders = createdAtResp.data?.order || [];
// Build a Set of order IDs from paidOrders
// Loop through allOrders — for orders NOT in the paid set, classify lines as PENDING
```

**Planning doc:** `CR_011_S5_PENDING_BILLING_TAB_PLAN_2026_06_03.md` §4.1

**Estimated impact:** +1 API call on page load. Response ~2MB (same endpoint, different sort). Processing adds ~27 orders to the existing 2,034.

---

## 4. FE RULES STATE

| Metric | Count |
|---|---|
| Total rules in manifest | 60 |
| Approved (✅) | 13 (FE-14/15/16/17/48/49/50/51/52/56/57/58/59/60) |
| Rejected (❌) | 4 (FE-02/13/27/43) |
| REVIEW pending (🔵) | 42 |
| Decided total | 18 |

**42 REVIEW items** must be triaged by owner (approve/reject) to drive REVIEW count to zero. This is a gate condition for S5 FROZEN.

---

## 5. BACKEND ESCALATIONS

| ESC | Priority | Status |
|---|---|---|
| ESC-1 (May 9 incident) | ~~P0~~ | **CLOSED — NOT A BUG** (alcohol items, tax_rate=0%) |
| ESC-2 (Room GST distribution) | P1 | OPEN — 3 orders (#013489, #013594, #012318), ₹134 missing. Backend writes order-level GST but ₹0 per line. |
| ESC-3 (Cancelled financials) | P0 | OPEN — tax/discount/SC not reverted on cancellation. Doc: `CR_011_BACKEND_ESCALATION_CANCELLED_FINANCIALS_2026_06_02.md` |
| ESC-4 (price field inconsistency) | P2 | OPEN — FE workaround in place |

---

## 6. TEST CREDENTIALS

| Restaurant | Email | Password | RID | Notes |
|---|---|---|---|---|
| Palm House | owner@palmhouse.com | Qplazm@10 | 541 | Primary test. 10 AMBER items, 5 drift orders. |
| Lafetta | owner@lafetta.com | Qplazm@10 | 78 | 33 AMBER items, 12 drift orders (Apr 17-19). |
| Pav & Pages | vishal@pav.com | Qplazm@10 | 383 | Used for S2 validation. |
| Kunafa Mahal | owner@kunafamahal.com | Qplazm@10 | 689 | Has loyalty data. |

---

## 7. FILES OF REFERENCE

### Source Code (read these first)

| File | Purpose |
|---|---|
| `/app/frontend/src/api/services/insightsService.js` | Service layer — 4-bucket classification, driftLines collection, per-bucket accumulators |
| `/app/frontend/src/pages/reports-module/ItemSalesHybridMockup.jsx` | S5 main component — 7 tabs, audit tab with Investigate + Last Seen Ambiguity + AMBER/RED/EXEMPT/REVIEW sections |
| `/app/frontend/src/utils/auditEngine.js` | Audit engine — RED/AMBER/EXEMPT flag computation across 4 buckets |
| `/app/frontend/src/utils/auditManifest.js` | 60 FE business rules — approved/rejected/pending |
| `/app/frontend/src/utils/reportExporter.js` | Excel/PDF export (gated by audit) |

### Planning Docs

| File | Purpose |
|---|---|
| `CR_011_S5_PENDING_BILLING_TAB_PLAN_2026_06_03.md` | Dual-fetch fix plan + 4-bucket model + verification matrix |
| `CR_011_S5_AUDIT_DRIFT_INVESTIGATION_PLAN_2026_06_03.md` | Investigate button + driftLines architecture |
| `CR_011_S5_AUDIT_TAX_DRIFT_INVESTIGATION_2026_06_02.md` | Tax drift investigation report (CORRECTED 2026-06-03) |
| `CR_011_BACKEND_ESCALATION_CANCELLED_FINANCIALS_2026_06_02.md` | P0 backend escalation for cancelled financials |

### Control Layer

| File | Purpose |
|---|---|
| `CR_011_SCREEN_FREEZE_PROTOCOL.md` | Binding rules including §8 (FE business logic disclosure) |
| `CR_011_SCREEN_FREEZE_LOG.md` | Per-screen gate state — S5 is 🟠 |
| `OWNER_DECISION_QUEUE.md` | Category G has all 60 FE rules |
| `SPRINT_STATUS.md` | Owner Decision Log (append-only) |

---

## 8. WHEN OWNER RETURNS — RECOMMENDED ACTIONS

1. **Implement Task 1** (dual-fetch for Pending Billing) — only remaining code task
2. **Owner triages 42 REVIEW items** — batch approve/reject via chat
3. **Owner decides Sold-bucket AMBER** — 5 orders are real backend bugs; owner chooses: escalate / widen tolerance / downgrade severity
4. **When RED + AMBER + REVIEW = 0 → S5 FROZEN → start S6 Order Ledger Hybrid**

---

## 9. DO-NOT-TOUCH LIST

- `/app/memory/final/*` — frozen baseline
- `/app/frontend/public/__dev/*` — Dev Dashboard
- Any FROZEN screen in `CR_011_SCREEN_FREEZE_LOG.md` — re-open requires owner verbatim
- `auditManifest.js` — adding entries requires §8 protocol (annotation + decision queue + sprint status)
- No FE compensating logic for backend escalations — owner explicit: don't mask bugs

---

## 10. S5 GATE CONDITION (for FROZEN)

**Every row on S5 must be GREEN:**
- RED = 0 (currently 0 ✅)
- AMBER = 0 (currently 10 — 5 orders with real backend zero-GST)
- REVIEW = 0 (currently 42 — pending owner triage)

When all three hit zero → export gate auto-unblocks → owner says "freeze it" → S5 ✅ FROZEN → S6 begins.

---

*End of handover. Next agent picks up from Task 1 (dual-fetch) or owner triage.*
