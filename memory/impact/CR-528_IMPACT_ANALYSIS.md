# CR-528 — Report: Order Edit and Cancel Operations After Bill Print — Impact Analysis (Gate 2) — 2026-11-15

**Role:** PLANNING (Gate 2 only)
**Code Reality:** NONE — no post-bill-print edit/cancel section exists in any report page
**Conflict Pre-Check:** AllOrdersReportPage.jsx (open: BUG-671, CR-526, CR-542 Batch B still pending Gate 3). Execution: CR-528 section must not conflict with Batch B Audit tab changes. Coordinate line anchors at Gate 3.
**Risk:** HIGH (audit/compliance report; operations log; indirect financial data)
**Backend-blocked:** **PARTIALLY UNBLOCKED (2026-11-16)** — Backend delivered v1 foundation on `order-logs-report` (bill_printed_at, bill_print_count, operations[] all working). **Audit page still blocked** — it uses `insights-dashboard`, not `order-logs-report`. v2 contract (`BATCH-C_CR-528_API_CONTRACT_2026_11_16_v2.md`) targets the correct endpoint but is NOT SENT yet.

> **REVISED 2026-11-16 (backend reply validation):** v1 contract (order-logs-report) FULLY DELIVERED by backend — 6/6 items PASS. See `backend_replies/CR-528_BACKEND_REPLY_VALIDATION_2026_11_16.md`. However, the Audit page (`AuditLogMockup.jsx`) uses `insights-dashboard`, not `order-logs-report`. v2 contract corrects the endpoint. Remaining backend work: emit computed audit events (`item_cancel_after_print`, `order_cancel_after_print`, `order_edit_after_print`) on `insights-dashboard` → `audits`.

> **REVISED 2026-11-15 (write probe + owner round 2) — see bottom section. It overrides the 'PARTIAL', `print_bill_status='Yes'` filter and `collect_bill` proxy above.**

---

## Owner Decision (locked)

CR-528 goes **inside the Audit report** (AllOrdersReportPage, existing `/reports/audit` page). Full design and column spec deferred to Gate 3 — owner: "rest at impact."

---

## Probe Results — `POST /api/v2/vendoremployee/report/order-logs-report`

Probed 2026-11-15 on RID 644 (CAFE 103), 2026-11-01 (63 orders returned).

### Key fields in `orders_table` (order-level):

```
print_bill_status: 'No'          ← bill print tracking field EXISTS
print_kot: 'Yes'                 ← KOT print tracking
created_at: '2026-11-01 21:01:23'  ← order punch time
collect_bill: '2026-11-01 21:39:31' ← payment collection time
cancel_at: None                  ← order-level cancellation
cancel_state: None
f_order_status, payment_status, payment_method, order_amount, etc.
```

**`print_bill_status` values observed:** `'No'` for all cafe103 orders (restaurant uses POS without bill-print tracking on this account). Expected values based on field name: `'Yes'` / `'No'` (or possibly `'printed'` / `'not_printed'` — needs live printer restaurant to confirm).

### Key fields in `order_details_table` (item-level):

```
cancel_at: timestamp or null     ← item-level cancellation time
cancel_by_name: staff name
cancel_type: Pre-Serve / Post-Serve
cancel_reason_text: reason
created_at: '2026-11-01T15:31:23.000000Z'  ← item PUNCH TIME (full ISO)
food_status, variation, add_ons, ready_at, serve_at
```

### `operations` activity log array (per order):

**Operation types observed:**
```
order_edit, order_status_update, item_ready, order_bill_payment,
transfer_food_item_in, table_room_switch, make_unpaid, transfer_food_item_out
```

Each operation entry:
```json
{
  "operation": "order_edit",
  "created_at": "2026-11-01 21:30:00",
  "previous_order_amount": "500.00",
  "current_order_amount": 550,
  "previous_payment_method": "pending",
  "current_payment_method": "pending",
  "vendor_employee_name": "Counter",
  "food_id": 116608,
  "restaurant_order_id": "021018"
}
```

Evidence: `/app/memory/evidence/BATCH-C-IA/probes_2026_11_15/02f_cr528_ops_detail.txt` · `02g_cr528_orders_table_full.txt`

---

## Data Flow Analysis

```
CR-528 requirement: "orders where items were added/removed AFTER bill was printed"

AVAILABLE DATA:
  orders_table.print_bill_status  → whether bill was printed ('Yes'/'No')
  orders_table.created_at         → order punch time
  orders_table.collect_bill       → payment collection time (NOT print time)
  operations[*].operation         → 'order_edit' captures item additions/removals
  operations[*].created_at        → timestamp of each operation
  order_details_table[*].cancel_at → item-level cancellation timestamp

FILTER LOGIC (FE-computable once data is mapped):
  1. Filter: orders_table.print_bill_status === 'Yes' (or non-'No' value)
  2. For each such order:
     a. EDITS after print:  operations WHERE operation === 'order_edit'
                             AND created_at > <bill_print_time>
     b. ITEM CANCELS after print: order_details_table WHERE cancel_at > <bill_print_time>

MISSING DATA:
  → bill_print_time (the actual time the bill was printed):
    - 'print_bill_status' = Yes/No but NO timestamp of when the print happened
    - 'collect_bill' is payment collection time, not print time
    → Backend ask: add 'bill_printed_at' timestamp to orders_table
    → Workaround: use 'collect_bill' as proxy if bill is typically printed at collection
      (acceptable for cafe103; may differ in other flows)
```

---

## Proposed FE Implementation (high-level, Gate 3 to firm up)

Owner decision: "Goes inside the Audit report." Two options:

**Option A — Sub-section within existing Audit tab (AllOrdersReportPage)**
- Add a new collapsible section below the existing Audit orders table
- Labelled "Post-Bill-Print Changes"
- Shows orders where `print_bill_status = 'Yes'` AND `operations` has `order_edit` or `order_details_table` has `cancel_at` > bill time
- Columns: Order #, Table/Type, Original Amount, Modified Amount, Editor Name, Edit Time, Print Time (if available), Change Type

**Option B — New report page** (not preferred per owner "inside the Audit report")

**Gate 3 open question for owner:** Which columns are required? (Owner decision OD-528-A — to ask in next round)

---

## Affected Code (once Gate 3 confirmed)

| File | Change |
|------|--------|
| `src/pages/AllOrdersReportPage.jsx` | Add "Post-Bill-Print Changes" section; new local state for section data; FE filter logic using `operations` + `order_details_table` from already-fetched data |
| `src/api/transforms/reportTransform.js` | Extend `orderLogsReport` transform to map `print_bill_status`, `operations[]`, `order_details_table[*].cancel_at` → new fields on each order object |

## Files WILL NOT touch (anticipated)

| File | Reason |
|------|--------|
| `src/components/reports/OrderTable.jsx` | Audit section uses its own table; existing OrderTable not modified |
| `reportService.js` | No new API call; same `getOrderLogsReport` |
| `src/pages/reports-module/OrderReportBetaPage.jsx` | Zero overlap |

---

## Backend Ask (PARTIAL)

| Ask | Endpoint | Why |
|-----|----------|-----|
| Add `bill_printed_at` timestamp to `orders_table` | `order-logs-report` | Currently no print timestamp; only `print_bill_status` Yes/No |
| Confirm `print_bill_status` values for printing restaurants | `order-logs-report` | Only `'No'` seen on cafe103 (non-print restaurant) |

**Workaround if `bill_printed_at` unavailable:** Use `collect_bill` as a proxy for "bill print time" (conservative — only catches edits between print and collection, not after collection).

---

## Open Owner Decisions

| OD | Question | Status |
|----|----------|--------|
| OD-528-A | Required columns in the post-print changes section? (Order ID, Table, Original amount, Modified amount, Editor, Edit time, Print time) | OPEN → ask in Gate 3 round |
| OD-528-B | Should "post-print cancels" include both order-level AND item-level cancels? | OPEN |
| OD-528-C | Date range filter and export (PDF/Excel) needed for this section? | OPEN |
| OD-528-D | `bill_printed_at` timestamp — confirm backend can add it, or accept `collect_bill` as proxy | OPEN → backend brief |

---

## Risk Register

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| R-1 | AllOrdersReportPage already has open Batch B items (BUG-671, CR-526, CR-542) touching same file | HIGH | Gate 3 must re-verify line anchors at HEAD; coordinate with Batch B Gate 3 |
| R-2 | `print_bill_status = 'No'` for cafe103 — no live data to test with this restaurant | MEDIUM | Test on a restaurant that uses print agent; ask owner which restaurant to verify |
| R-3 | `operations` data not yet mapped in `reportTransform.js` | LOW | Add mapping in transform; FE-only change |
| R-4 | Missing `bill_printed_at` timestamp — proxy (`collect_bill`) may not be accurate | MEDIUM | Note in release as "proxy timestamp" until backend adds field |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-528 → status: GATE_5A_IMPLEMENTED once Gate 3 + 4 done
- [ ] CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: AllOrdersReportPage.jsx + reportTransform.js + CR-528 + date
- [ ] Code marker: // CR-528 on new transform fields and new section
- [ ] Compile: webpack 0 new warnings
```

---

## Scope Lock

**Files WILL change:** `src/pages/AllOrdersReportPage.jsx` · `src/api/transforms/reportTransform.js`
**Files WILL NOT touch:** OrderTable.jsx · OrderReportBetaPage · reportService.js (anticipated)
**BLOCKERS:** OD-528-A/B/C (columns, cancel scope, export) must be answered before Gate 3. Backend ask for `bill_printed_at`.

```
Planning complete: CR-528
Stage: Impact Analysis (Gate 2)
Code reality: NONE
Risk: HIGH (audit/compliance section, hotspot file AllOrdersReportPage.jsx)
Files WILL change: AllOrdersReportPage.jsx, reportTransform.js
Files WILL NOT touch: OrderTable.jsx, OrderReportBetaPage.jsx, reportService.js
Owner decisions: PARTIAL — OD-528-A/B/C open (column spec, cancel scope, export)
Backend-blocked: PARTIAL — data exists; bill_printed_at timestamp missing
Docs: memory/impact/CR-528_IMPACT_ANALYSIS.md
Next: Ask OD-528-A/B/C (max 3 questions, next round) → Gate 3
```

---

## REVISION 2026-11-15 — Write probe + Owner Round 2

Evidence: `WRITE_PROBE_FINDINGS_2026_11_15.md` (W-1..W-4), order 1578757.

**Probe facts**
- Bill print (`order-temp-store` + `update-print-status` bill_print=Yes) → response `bill_print_count: 1`, but `print_bill_status` stays 'No' in get-single-order-new and order-logs-report; no print entry in `operations[]`.
- `operations[]` has `item_cancel` (time, employee, prev/current amount, food_id) and `order_edit`.
- `order_edit` amounts unreliable (logged 420 → 420 while order went 420 → 630).
- `collect_bill` is null for unpaid orders → proxy rejected.

**Owner decisions (round 2, locked)**
| OD | Decision |
|---|---|
| OD-528-D | **Wait for backend** to record print time; no proxy |
| OD-528-A | Show: items added after print, items cancelled after print, whole order cancelled after print, who / time / amount before-after |
| OD-528-B | Both item-level and order-level cancels |
| OD-528-C | Date filter + Excel/PDF export required |

**Backend asks (updated in brief):** `bill_printed_at` (first print) + print count or print events in `operations[]`; `print_bill_status` actually updated; correct `previous/current_order_amount` on `order_edit`; order-level cancel as an operation or `cancel_at` on orders_table.

**Status:** BACKEND-BLOCKED. Gate 3 can draft layout/columns/export; implementation waits for backend.
