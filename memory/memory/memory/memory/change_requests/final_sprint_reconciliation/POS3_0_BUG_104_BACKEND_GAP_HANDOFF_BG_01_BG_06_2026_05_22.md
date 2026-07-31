# POS 3.0 BUG-104 — Backend Gap Handoff: BG-01 + BG-06

**Date:** 2026-05-22
**Prepared by:** Senior POS3.0 BUG-104 Backend Gap Handoff Agent

---

## 1. Status

```
bug_104_backend_gap_handoff_bg_01_bg_06_ready_for_backend_review
```

---

## 2. Source Docs Read

| # | Document | Status |
|---|----------|--------|
| 1 | `POS3_0_BUG_104_PHASE_2_SCOPE_API_MAPPING_PLAN_2026_05_22.md` | **Not found** — lost in prior agent session |
| 2 | `POS3_0_BUG_104_PHASE_2A_UX_FREEZE_AND_API_MAPPING_2026_05_22.md` | **Not found** — lost in prior agent session |
| 3 | `POS3_0_BUG_104_PHASE_2A_PDF_FIFO_COVERAGE_ADDENDUM_2026_05_22.md` | **Read** — contains BG-06 spec in Section 8.2, Portfolio Summary behavior, known limitations |
| 4 | `POS3_0_BUG_104_PHASE_2A_PDF_FIFO_COVERAGE_QA_HANDOFF_2026_05_22.md` | **Read** — contains 40-row QA checklist, scope boundaries |
| 5 | `POS3_0_BUG_104_PHASE_2A_PDF_FIFO_OWNER_QA_REPORT_2026_05_22.md` | **Read** — QA passed with known limitations |
| 6 | `POS3_0_BUG_104_PHASE_2A_STATUS_UPDATE_2026_05_22.md` | **Read** — confirms BG-01/BG-06 pending |

Additionally inspected:
- `src/api/services/creditService.js` — API call implementations
- `src/api/transforms/creditTransform.js` — field mapping / normalization
- `src/api/constants.js` — endpoint URLs
- `src/components/panels/CreditManagementPanel.jsx` — consumer of API data
- `src/components/credit/CreditCustomerList.jsx` — SS1 KPI strip and Portfolio Summary button

---

## 3. Frontend Current State

Phase 2A is **fully implemented and QA-passed**. The frontend works today using existing backend APIs:

| Feature | Status | API Used |
|---------|--------|----------|
| SS1 customer list | Working | `POST /api/v1/vendoremployee/pos/tap-waiter-list` |
| SS1 KPI — Outstanding | Working | Client-side sum of `balance` from list |
| SS1 KPI — Total Credit | **Shows "—"** | Not available from list API (needs BG-01) |
| SS1 KPI — Total Paid | **Shows "—"** | Not available from list API (needs BG-01) |
| SS2 customer detail drawer | Working | `GET /api/v2/vendoremployee/pos/tap-customer-record-list?customer_id={id}` |
| SS2 FIFO buckets | Working | Client-side computation from credits + debits |
| Quick Statement PDF | Working | Uses SS2 data |
| Detailed Statement PDF | Working | Uses SS2 data + `getSingleOrderNew` for item details |
| Portfolio Summary PDF | Working but slow (~15-20s) | Calls `tap-customer-record-list` for **each** of 40 customers individually (needs BG-06) |

**Key limitations awaiting backend:**
1. **BG-01:** SS1 KPI cards for Total Credit and Total Paid show "—" because `tap-waiter-list` doesn't include aggregates.
2. **BG-06:** Portfolio Summary PDF takes ~15-20s because it makes N individual API calls (one per customer) to compute per-customer totals.

---

## 4. BG-01 Requirement — Global Aggregate Totals for SS1 KPI Cards

### Current Limitation

The existing `POST /api/v1/vendoremployee/pos/tap-waiter-list` returns:

```json
{
  "employee-tap-list": [
    { "id": 1439, "name": "avi", "mobile": "9823905120", "email": null, "balance": 4400.20 },
    ...
  ]
}
```

The frontend can compute `outstanding` by summing `balance` across all customers. But it **cannot** compute `total_credit` or `total_paid` without fetching every customer's individual transaction history — which is prohibitively expensive on page load.

The SS1 KPI strip currently shows:
- Total Credit: **—** (unavailable)
- Total Paid: **—** (unavailable)
- Outstanding: **₹6,05,748.00** (computed client-side)

### Required Fields

Add a `summary` object at the top level of the response:

| Field | Type | Description |
|-------|------|-------------|
| `total_credit` | `number` (decimal) | Sum of all `credit_order_amount` across all customers |
| `total_paid` | `number` (decimal) | Sum of all `debit_order_amount` across all customers |
| `outstanding` | `number` (decimal) | `total_credit - total_paid` (server-computed for accuracy) |

### Proposed Response Shape

```json
{
  "summary": {
    "total_credit": 1234567.89,
    "total_paid": 628819.89,
    "outstanding": 605748.00
  },
  "employee-tap-list": [
    { "id": 1439, "name": "avi", "mobile": "9823905120", "email": null, "balance": 4400.20 },
    ...
  ]
}
```

### Frontend Usage

In `src/api/services/creditService.js`, `getTabCustomerList()` currently does:

```javascript
const res = await api.post(API_ENDPOINTS.CREDIT_CUSTOMER_LIST, {});
return res.data?.['employee-tap-list'] || [];
```

With BG-01, the frontend will additionally read:

```javascript
const summary = res.data?.summary || null;
// summary.total_credit → SS1 KPI "Total Credit" card
// summary.total_paid   → SS1 KPI "Total Paid" card
// summary.outstanding  → SS1 KPI "Outstanding" card (replaces client-side sum)
```

The consuming component (`CreditManagementPanel.jsx`, lines 67-68) already has placeholders:

```javascript
setTotalCredit(list._totalCredit ?? null);  // will change to summary.total_credit
setTotalPaid(list._totalPaid ?? null);      // will change to summary.total_paid
```

### Backward Compatibility

- **Existing `employee-tap-list` array MUST remain unchanged.** Same shape, same fields, same ordering.
- `summary` is a new additive key. If absent, frontend gracefully falls back to "—" (already handles null).
- No frontend breakage if backend ships this incrementally.

---

## 5. BG-06 Requirement — Per-Customer Totals for Portfolio Summary PDF

### Current Limitation

The Portfolio Summary PDF needs **per-customer** `total_credit` and `total_paid` to render the table:

| # | Customer | Mobile | Total Credit | Total Paid | Outstanding | Status |
|---|----------|--------|-------------|-----------|-------------|--------|

Currently, the frontend must call `GET /api/v2/vendoremployee/pos/tap-customer-record-list?customer_id={id}` for **every** customer individually, sum up credits and debits client-side, then generate the PDF.

For a restaurant with 40 credit customers:
- **40 individual API calls** (batched 5 at a time)
- **~15-20 seconds** total generation time
- Progress bar shown to user during wait

### Proposed Endpoint

```
GET /api/v1/vendoremployee/pos/tap-waiter-list-with-totals
```

Or alternatively, extend the existing `POST /api/v1/vendoremployee/pos/tap-waiter-list` with an optional query/body parameter:

```
POST /api/v1/vendoremployee/pos/tap-waiter-list
Body: { "include_totals": true }
```

Either approach is acceptable. The key requirement is: **one API call returns per-customer totals.**

### Request Params

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| (none currently) | — | — | No filters needed for MVP. Future: date range, status filter. |

### Response Shape

```json
{
  "customers": [
    {
      "id": 1439,
      "name": "avi",
      "mobile": "9823905120",
      "email": null,
      "balance": 4400.20,
      "total_credit": 7000.00,
      "total_paid": 2599.80,
      "tap_start_date": "2025-08-10",
      "last_tap_credit_date": "2026-05-04",
      "last_tap_credit_amount": 1208.00,
      "last_tap_debit_date": "2026-05-08",
      "last_tap_debit_amount": 500.00
    },
    {
      "id": 2001,
      "name": "LOUISE MADAM",
      "mobile": "8956566082",
      "email": null,
      "balance": 189019.00,
      "total_credit": 189019.00,
      "total_paid": 0.00,
      "tap_start_date": "2025-08-20",
      "last_tap_credit_date": "2026-05-12",
      "last_tap_credit_amount": 336.00,
      "last_tap_debit_date": null,
      "last_tap_debit_amount": null
    }
  ],
  "summary": {
    "customer_count": 40,
    "total_credit": 1234567.00,
    "total_paid": 628819.00,
    "outstanding": 605748.00
  }
}
```

### Frontend Usage

In `CreditManagementPanel.jsx`, `handlePortfolioExport()` currently:

```javascript
// CURRENT (slow): fetch each customer individually
for (let i = 0; i < filteredCustomers.length; i += BATCH) {
  const batch = filteredCustomers.slice(i, i + BATCH);
  await Promise.allSettled(
    batch.map(async (c) => {
      const raw = await getTabCustomerRecords(c.id);  // 1 API call per customer
      // ... compute totalCredit, totalPaid
    })
  );
}
```

With BG-06, it becomes:

```javascript
// PROPOSED (fast): single API call
const data = await getTabCustomerListWithTotals();
// data.customers already has total_credit, total_paid per customer
// Generate PDF directly — no per-customer fetching needed
```

### Performance Impact

| Metric | Before BG-06 | After BG-06 |
|--------|-------------|-------------|
| API calls | N (1 per customer, e.g. 40) | 1 |
| Network round trips | ~8 batches × ~2s each | 1 × ~1s |
| Total generation time | ~15-20s | <1s |
| User experience | Progress bar, long wait | Near-instant |

### Backward Compatibility

- This is a **new** endpoint (or new mode on existing endpoint). No existing API contract changes.
- The existing `tap-waiter-list` and `tap-customer-record-list` endpoints remain untouched.
- Frontend will use BG-06 endpoint **only** for Portfolio Summary export. All other flows continue using existing endpoints.

---

## 6. Field Mapping

### BG-01 Fields (on `summary` object in `tap-waiter-list` response)

| Field | Type | Nullable? | Example | Source Meaning | Frontend Display |
|-------|------|-----------|---------|----------------|-----------------|
| `total_credit` | `number` (decimal, 2dp) | No (default 0.00) | `1234567.89` | Sum of all `credit_order_amount` across all credit customers for this restaurant | SS1 KPI card: "Total Credit" → formatted as `₹12,34,567.89` |
| `total_paid` | `number` (decimal, 2dp) | No (default 0.00) | `628819.89` | Sum of all `debit_order_amount` (payments received) across all credit customers | SS1 KPI card: "Total Paid" → formatted as `₹6,28,819.89` |
| `outstanding` | `number` (decimal, 2dp) | No (default 0.00) | `605748.00` | `total_credit - total_paid` | SS1 KPI card: "Outstanding" → formatted as `₹6,05,748.00` |

### BG-06 Fields (per-customer in `customers` array)

| Field | Type | Nullable? | Example | Source Meaning | Frontend Display |
|-------|------|-----------|---------|----------------|-----------------|
| `id` | `integer` | No | `1439` | Customer ID from tap-waiter system | Internal key — not displayed |
| `name` | `string` | Yes (can be `""` or `null`) | `"avi"` | Customer name | Portfolio PDF: "Customer" column. Capitalized by frontend. |
| `mobile` | `string` | Yes (can be `""` or `null`) | `"9823905120"` | Customer mobile number | Portfolio PDF: "Mobile" column |
| `email` | `string` | Yes (often `null`) | `null` | Customer email | Not shown in Portfolio PDF. Used in individual statements. |
| `balance` | `number` (decimal) | No (default 0.00) | `4400.20` | Current outstanding balance for this customer | Portfolio PDF: "Outstanding" column. Also used for SS1 list. |
| `total_credit` | `number` (decimal) | No (default 0.00) | `7000.00` | Sum of all `credit_order_amount` for this customer | Portfolio PDF: "Total Credit" column |
| `total_paid` | `number` (decimal) | No (default 0.00) | `2599.80` | Sum of all `debit_order_amount` for this customer | Portfolio PDF: "Total Paid" column |
| `tap_start_date` | `string` (ISO date) | Yes | `"2025-08-10"` | Date of first credit transaction | Portfolio PDF: optional. Used in individual customer statements. |
| `last_tap_credit_date` | `string` (ISO datetime) | Yes | `"2026-05-04"` | Date of most recent credit transaction | Not in Portfolio PDF. Useful for future sort/filter. |
| `last_tap_credit_amount` | `number` (decimal) | Yes | `1208.00` | Amount of most recent credit transaction | Not in Portfolio PDF. Useful for future display. |
| `last_tap_debit_date` | `string` (ISO datetime) | Yes | `"2026-05-08"` | Date of most recent payment | Not in Portfolio PDF. Useful for future sort/filter. |
| `last_tap_debit_amount` | `number` (decimal) | Yes | `500.00` | Amount of most recent payment | Not in Portfolio PDF. Useful for future display. |

### BG-06 Fields (`summary` object — global aggregates)

| Field | Type | Nullable? | Example | Source Meaning | Frontend Display |
|-------|------|-----------|---------|----------------|-----------------|
| `customer_count` | `integer` | No | `40` | Total number of credit customers | Portfolio PDF: summary card "Customers" |
| `total_credit` | `number` (decimal) | No (default 0.00) | `1234567.00` | Sum of `total_credit` across all customers | Portfolio PDF: summary card "Total Credit" + totals footer row |
| `total_paid` | `number` (decimal) | No (default 0.00) | `628819.00` | Sum of `total_paid` across all customers | Portfolio PDF: summary card "Total Paid" + totals footer row |
| `outstanding` | `number` (decimal) | No (default 0.00) | `605748.00` | `total_credit - total_paid` | Portfolio PDF: summary card "Outstanding" + totals footer row |

---

## 7. Acceptance Criteria

### BG-01

| # | Criterion | Verifiable By |
|---|-----------|---------------|
| AC-01 | `POST /api/v1/vendoremployee/pos/tap-waiter-list` response includes a `summary` object | API response inspection |
| AC-02 | `summary.total_credit` equals the sum of all `credit_order_amount` across all customers | Cross-check with individual customer records |
| AC-03 | `summary.total_paid` equals the sum of all `debit_order_amount` across all customers | Cross-check with individual customer records |
| AC-04 | `summary.outstanding` equals `total_credit - total_paid` | Arithmetic check |
| AC-05 | Existing `employee-tap-list` array is unchanged in shape, content, and ordering | Regression comparison |
| AC-06 | Frontend SS1 KPI cards display Total Credit, Total Paid, Outstanding (no more "—") | Visual check |
| AC-07 | Response time does not degrade significantly (< 500ms additional) | Timing comparison |

### BG-06

| # | Criterion | Verifiable By |
|---|-----------|---------------|
| AC-08 | New endpoint returns all customers with `total_credit` and `total_paid` per customer | API response inspection |
| AC-09 | Per-customer `total_credit` matches sum of `credit_order_amount` from `tap-customer-record-list` for that customer | Cross-check per customer |
| AC-10 | Per-customer `total_paid` matches sum of `debit_order_amount` from `tap-customer-record-list` for that customer | Cross-check per customer |
| AC-11 | Per-customer `balance` matches `total_credit - total_paid` | Arithmetic check |
| AC-12 | Response `summary.customer_count` matches array length | Count check |
| AC-13 | Response `summary.total_credit` / `total_paid` / `outstanding` match sums of per-customer values | Sum check |
| AC-14 | Portfolio Summary PDF generates in <2s using the new endpoint | Timing check |
| AC-15 | Null `email`, null `last_tap_debit_date` / `last_tap_debit_amount` handled correctly | Null edge case |
| AC-16 | Customers with zero balance still appear in the list | Edge case check |

---

## 8. Non-Scope

The following are explicitly **out of scope** for BG-01 and BG-06:

- No payment API changes
- No settlement API changes
- No receipt generation changes
- No historical data backfill or migration
- No data mutation triggered from frontend
- No WhatsApp integration
- No bulk settle functionality
- No backend date-range filtering (that's BG-02, separate gap)
- No FIFO logic on backend (FIFO is advisory, computed client-side)
- No changes to `tap-waiter-order-insert` (payment recording)
- No changes to `tap-customer-record-list` (individual customer detail)

---

## 9. Suggested Backend Test Cases

### BG-01 Test Cases

| # | Scenario | Expected `summary` |
|---|----------|--------------------|
| T-01 | Restaurant with zero credit customers | `{ total_credit: 0, total_paid: 0, outstanding: 0 }` |
| T-02 | All customers have credit but no payments | `total_paid: 0`, `outstanding == total_credit` |
| T-03 | Some customers fully paid, some with balance | `outstanding` = sum of unpaid balances |
| T-04 | Customer with decimal amounts (e.g., ₹286.50) | Decimal precision preserved (2dp) |
| T-05 | 40+ customer restaurant | Response time under 1s for list + summary |
| T-06 | Customer with null email | `employee-tap-list` entry has `email: null`; no error |
| T-07 | Large total amounts (₹6,05,748.00+) | No integer overflow, correct formatting |

### BG-06 Test Cases

| # | Scenario | Expected Per-Customer |
|---|----------|----------------------|
| T-08 | Customer with only credits, no debits | `total_paid: 0`, `balance == total_credit` |
| T-09 | Customer fully paid (balance = 0) | `total_credit == total_paid`, `balance: 0` |
| T-10 | Customer with partial payment | `total_paid < total_credit`, `balance > 0` |
| T-11 | Customer with multiple debits | `total_paid` = sum of all debit amounts |
| T-12 | Customer with null email | `email: null` in response |
| T-13 | Customer with no debit history | `last_tap_debit_date: null`, `last_tap_debit_amount: null` |
| T-14 | Customer with decimal credit amounts (₹286.50) | Decimal precision preserved |
| T-15 | `summary.outstanding` matches sum of per-customer `balance` | Arithmetic consistency |
| T-16 | `summary.customer_count` matches array length | Count consistency |
| T-17 | Mixed restaurant: 40 customers, some settled, some open | All customers in response regardless of balance |
| T-18 | Customer added after last payment (newest credit is open) | `balance > 0`, `total_credit > total_paid` |
| T-19 | Response time for 40 customers | < 500ms |
| T-20 | Response time for 100+ customers | < 1s |

---

## 10. Final Recommendation

### Priority Guidance

| If primary goal is... | Prioritize | Reason |
|----------------------|-----------|--------|
| SS1 KPI card activation | **BG-01 first** | Quick win — adds 3 fields to existing endpoint response. Frontend already has placeholders. Minimal backend effort. |
| Portfolio PDF performance | **BG-06 first** | Bigger impact — eliminates 40 API calls, reduces generation from ~20s to <1s. More backend work (SQL aggregation query). |
| Both simultaneously | **BG-06 (which subsumes BG-01)** | BG-06's `summary` object in the response already provides the global aggregates that BG-01 needs. If BG-06 is built first, BG-01 becomes trivial — just copy the `summary` object to the `tap-waiter-list` response. |

### Recommended Approach

**Ship BG-06 first.** The response already includes a `summary` object with `total_credit`, `total_paid`, `outstanding`. Once BG-06 exists:
- Portfolio Summary PDF becomes instant (<1s)
- BG-01 becomes a trivial copy: add the same `summary` to `tap-waiter-list` response
- Both SS1 KPI cards and Portfolio PDF are unblocked in one backend sprint

### Alternative (minimum viable)

If backend bandwidth is limited, ship **BG-01 only** first:
- Effort: Add 1 SQL aggregate query to existing `tap-waiter-list` handler
- Impact: SS1 KPI cards work immediately
- Portfolio PDF remains slow (acceptable workaround exists with progress bar)

---

## 11. Confirmations

- [x] No code changed
- [x] No backend changed
- [x] No data mutated
- [x] No payment API invoked
- [x] No settlement API invoked
- [x] `/app/memory/final/` untouched
- [x] Baseline docs untouched
- [x] This is documentation only — no implementation
