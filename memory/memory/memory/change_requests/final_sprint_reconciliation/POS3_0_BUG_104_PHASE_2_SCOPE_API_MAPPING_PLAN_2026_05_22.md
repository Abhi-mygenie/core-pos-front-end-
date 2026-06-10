# BUG-104 — Credit / Tab Management — Phase 2 Scope, API Mapping & Report Capability Plan — 2026-05-22

> **Document Type:** Planning only. No code changed. No backend changed. No data mutated. No payment API invoked. `/app/memory/final/` untouched. Baseline docs untouched.
> **Status:** `bug_104_phase_2_scope_api_mapping_complete_owner_decisions_locked`

---

## 1. Status

**`bug_104_phase_2_scope_api_mapping_complete_owner_decisions_locked`**

Phase 2A is conditionally implementation-ready. Owner decisions Q1–Q8 locked on 2026-05-22. See §11 for remaining blockers.

---

## 2. Source Docs Read

| # | Doc | Key Takeaway for Phase 2 |
|---|---|---|
| 1 | `POS3_0_BUG_104_ANALYSIS_2026_05_20.md` | Original owner screenshots: per-customer PDF download, multi-customer PDF, WhatsApp share, date-range filter, "Opening credit / Closing credit" report concept. |
| 2 | `POS3_0_BUG_104_PHASE_1_IMPLEMENTATION_PLAN_2026_05_22.md` | 3 APIs documented with live response shapes. Phase 2 scope explicitly deferred: PDF, WhatsApp, bulk settle, date-range filter. |
| 3 | `POS3_0_BUG_104_UX_FREEZE_AND_IMPLEMENTATION_HANDOFF_2026_05_22.md` | Frozen rules. Phase 2 actions hidden completely (OQ-P1-03 = A). No print, no settlement integration in Phase 1. |
| 4 | `POS3_0_BUG_104_SCREEN_REVIEW_BEFORE_IMPLEMENTATION_2026_05_22.md` | Visual wireframes for all 4 screens. Phase 2 icons confirmed NOT rendered. |
| 5 | `POS3_0_BUG_104_VISUAL_APPROVAL_ADDENDUM_2026_05_22.md` | VQ-01..05 locks. |
| 6 | `POS3_0_BUG_104_OWNER_UAT_FEEDBACK_CAPTURE_2026_05_22.md` | F-001..F-010 feedback. F-005: KPI strip — Outstanding only in Phase 1; Total Credit/Paid needs backend `total_credit`/`total_paid`. |
| 7 | `POS3_0_BUG_104_OWNER_UAT_FIX_IMPLEMENTATION_REPORT_2026_05_22.md` | Final implementation state. Backend ask for `total_credit`/`total_paid` in flight. FIFO coverage marker advisory. Sidebar orphan at line 45. |
| 8 | `POS3_0_BUG_104_OWNER_UAT_FIX_QA_RETEST_2026_05_22.md` | 42-row retest checklist. Real payment test still pending owner choice. |
| 9 | `POS3_0_BUG_104_OWNER_UAT_FIX_VERIFICATION_2026_05_22.md` | Closure matrix. Backend ask confirmed in-flight. |

---

## 3. Code/API Areas Inspected

| Path | Purpose | Key Finding for Phase 2 |
|---|---|---|
| `src/components/panels/CreditManagementPanel.jsx` (162 lines) | Panel shell. Hosts SS1 + SS2. | Phase 2 features (PDF/WhatsApp/date-filter buttons) will be added here or in SS1/SS2. |
| `src/components/credit/CreditCustomerList.jsx` (216 lines) | SS1 list. KPI strip (Outstanding only). | KPI strip has a placeholder comment for `total_credit`/`total_paid`. No download/share icons rendered. |
| `src/components/credit/CreditCustomerDetailSheet.jsx` (593 lines) | SS2 detail drawer. FIFO buckets. | Uses `getTabCustomerRecords` which returns ALL transactions (no date-range params). "Record Payment" button present. No print/download/share icons. |
| `src/components/credit/CreditClearanceModal.jsx` (215 lines) | SS4 payment modal. | Functional. No changes needed for Phase 2 reporting features. |
| `src/api/services/creditService.js` (61 lines) | 3 API wrappers. | `getTabCustomerRecords` does NOT accept date params. `getTabCustomerList` returns raw `balance` only. |
| `src/api/transforms/creditTransform.js` (166 lines) | Transforms + formatters. | `formatINR`, `formatDateShort`, `formatTimeShort`, `formatPaymentMethod` available. No PDF/statement formatters. |
| `src/api/constants.js` (290 lines) | Endpoint constants. | 3 CREDIT_* constants defined. No statement/report/PDF endpoint. |
| `src/components/reports/ExportButtons.jsx` (329 lines) | **Existing PDF/CSV export pattern.** | PDF = `window.open` + inline HTML + `window.print()`. CSV = Blob download. No jsPDF/html2canvas library. Reusable pattern for credit statement. |
| `src/components/reports/OrderDetailSheet.jsx` (802 lines) | Shared audit bill detail. | Already reused by SS3 (F-009). Contains item-level detail with timeline, financials, status badges. |
| `src/api/services/reportService.js` | Report service. | `getSingleOrderNew(orderId)` is used by SS3. `getCreditOrders(date)` uses `REPORT_CREDIT_ORDERS` endpoint — different from the credit module APIs. |
| `src/components/layout/Sidebar.jsx` (547 lines) | Sidebar. | Line 43-47: orphan `Orders → Credit/Tab` child still present (hidden at runtime since `orders` is not in `VISIBLE_SECTIONS`). P3 cleanup target. |

**No existing WhatsApp integration** found anywhere in the codebase (`wa.me`, WhatsApp, WhatsApp API — zero matches in source files).

**No PDF generation library** installed (`jsPDF`, `html2canvas`, `html2pdf`, `@react-pdf/renderer` — zero matches in `package.json`).

**Existing PDF pattern**: The `ExportButtons.jsx` in the Audit Report generates a print-friendly HTML document in a new window and calls `window.print()`, letting the browser's native "Save as PDF" handle the output. This is the established pattern.

---

## 4. Phase 1 Parked Items

| # | Item | Status |
|---|---|---|
| 1 | Owner final re-smoke | `WAITING_OWNER_RESMOKE_APPROVAL` — 42-row checklist in QA Retest doc |
| 2 | One-row real payment API test | Pending owner explicit choice of test customer + small amount |
| 3 | P3 Sidebar orphan cleanup | `Sidebar.jsx` line 43-47: hidden `Orders → Credit/Tab` child. No runtime impact. |

---

## 5. Phase 2 Candidate Feature Matrix

| ID | Feature | Owner's Original Ask | Phase 1 State | Risk | Recommendation |
|---|---|---|---|---|---|
| A | Per-customer credit statement preview | SS2 screenshots — "Opening credit / Closing credit" | SS2 shows full transaction list + summary tiles. No formatted statement view. | Low | **Phase 2A** |
| B | Per-customer PDF download | SS1 Download icon per row | Hidden in Phase 1 | Low–Medium | **Phase 2A** (frontend-generated if data sufficient) |
| C | Bulk PDF export for all/filtered customers | SS1 header Download icon | Hidden in Phase 1 | Medium–High | **Phase 2B** (needs iteration on per-customer first) |
| D | Date-range filter for credit/debit history | Owner described: Day/Week/Month/Custom | Not implemented | Medium | **Phase 2A** if frontend-filterable; **Phase 2B** if backend params needed |
| E | WhatsApp share of statement/payment reminder | SS1 WhatsApp icon per row | Hidden in Phase 1 | Medium | **Phase 2B** (needs template + API/`wa.me` decision) |
| F | Total Credit / Total Paid / Outstanding KPI strip | F-005: Outstanding only in Phase 1 | Outstanding tile only. Backend ask in-flight for `total_credit`/`total_paid`. | Low | **Phase 2A** (~10-line additive change once backend ships) |
| G | Sidebar outstanding count/badge | Previously suggested, not approved | Not implemented. Owner did not approve during UAT. | Low | **Owner decision needed** |
| H | Print credit statement | Owner SS2/SS3 screenshots had print icons | Not implemented (owner directive: no print Phase 1) | Low | **Phase 2A** (browser print, same pattern as ExportButtons) |
| I | Print payment receipt | Logical extension of SS4 | Not implemented | Medium | **Phase 2C** (receipt format needs definition) |
| J | Bulk settle / bulk payment | Owner confirmed Phase 2 | Not implemented | High–Critical | **Phase 2C** (needs backend batch endpoint + reconciliation rules) |
| K | Settlement module integration | Owner confirmed: no settlement dependency | Not implemented. Credit module is standalone. | High | **Phase 2C** (backend-blocked; settlement module doesn't exist yet) |
| L | P3 Sidebar orphan cleanup | `Sidebar.jsx` line 43-47 | Dead code — invisible at runtime | Negligible | **Phase 2A** (trivial, safe) |

---

## 6. Mandatory API Capability Mapping

### Feature A — Per-customer credit statement preview

| Field | Value |
|---|---|
| Feature ID | A |
| Feature name | Per-customer credit statement preview |
| Required data | Customer info (name, mobile), all credit entries, all debit entries, summary totals, date range, restaurant name |
| Existing API support | **Partial** |
| Existing endpoint(s) | `GET /api/v2/vendoremployee/pos/tap-customer-record-list?customer_id={id}` (API 2) |
| Existing fields available | `customer-transaction-list` (credits), `customer-transaction-list-debit` (debits), `tap_start_date`, `last_tap_credit_date/amount`, `last_tap_debit_date/amount` |
| Missing fields | Restaurant name/address/GST (not in API 2 response), date-range filter params, opening balance at date X |
| Frontend derivable? | Restaurant name available from `RestaurantContext`. Totals derivable from transaction sums. Opening balance NOT derivable for arbitrary date ranges (only lifetime). |
| Backend change required? | **No** for lifetime statement (all data available). **Yes** for date-range-filtered statement with opening balance. |
| Risk level | Low (lifetime) / Medium (date-range) |
| Recommendation | **Phase 2A** for lifetime statement. Date-range requires backend or approximation. |

### Feature B — Per-customer PDF download

| Field | Value |
|---|---|
| Feature ID | B |
| Feature name | Per-customer PDF download |
| Required data | Same as Feature A + formatted HTML for print |
| Existing API support | **Partial** (same as A) |
| Existing endpoint(s) | API 2 |
| Existing fields available | Same as A |
| Missing fields | Same as A |
| Frontend derivable? | Yes — use `window.open` + `window.print()` pattern from `ExportButtons.jsx`. Browser "Save as PDF" produces the file. |
| Backend change required? | **No** for frontend-generated PDF. **Yes** if backend-generated PDF desired. |
| Risk level | Low |
| Recommendation | **Phase 2A** — frontend-generated PDF using established ExportButtons pattern. |

### Feature C — Bulk PDF export for all/filtered customers

| Field | Value |
|---|---|
| Feature ID | C |
| Feature name | Bulk PDF export (multi-customer) |
| Required data | For each selected customer: full transaction detail (API 2). Potentially hundreds of API 2 calls. |
| Existing API support | **None** for bulk |
| Existing endpoint(s) | API 2 (one call per customer) |
| Existing fields available | Per-customer detail available, but N API calls needed |
| Missing fields | Bulk statement endpoint. No pagination on API 2. |
| Frontend derivable? | Technically possible (loop API 2 for each customer, concat HTML, print). Performance risk for 40+ customers. |
| Backend change required? | **Recommended** — a bulk statement endpoint would avoid N+1 calls and provide a single PDF. |
| Risk level | Medium–High |
| Recommendation | **Phase 2B** — depends on API gap proposal BG-04. |

### Feature D — Date-range filter for credit/debit history

| Field | Value |
|---|---|
| Feature ID | D |
| Feature name | Date-range filter |
| Required data | `start_date`, `end_date` params on API 2 |
| Existing API support | **None** — API 2 returns ALL transactions, no date params |
| Existing endpoint(s) | `GET /api/v2/vendoremployee/pos/tap-customer-record-list?customer_id={id}` |
| Existing fields available | Each entry has `created_at`. Frontend CAN filter client-side. |
| Missing fields | `start_date`, `end_date` request params. `opening_balance` at `start_date`. |
| Frontend derivable? | **Partial** — client-side date filter works on the fetched list. But "opening balance as of start_date" is NOT safely derivable without knowing the full ledger sort order and no entry is missing. |
| Backend change required? | **Yes** for proper date-range with opening balance. **No** for approximate client-side filter. |
| Risk level | Medium |
| Recommendation | **Phase 2A** for client-side date filter (temporary). **Phase 2B** for backend date params + opening balance. |

### Feature E — WhatsApp share of statement/payment reminder

| Field | Value |
|---|---|
| Feature ID | E |
| Feature name | WhatsApp share |
| Required data | Customer mobile, formatted message text or PDF URL |
| Existing API support | **None** |
| Existing endpoint(s) | None. No WhatsApp integration in codebase. |
| Existing fields available | Customer mobile from API 1. |
| Missing fields | WhatsApp template, message text, PDF attachment URL (if sharing PDF). |
| Frontend derivable? | **Partial** — `wa.me/{mobile}?text=...` link can be opened in a new tab for text-only share. PDF attachment requires a hosted URL. |
| Backend change required? | **No** for basic `wa.me` text link. **Yes** for WhatsApp Business API (template messages, PDF attachment, delivery tracking). |
| Risk level | Medium |
| Recommendation | **Phase 2B** — needs owner decision on approach (wa.me link vs. WhatsApp API). |

### Feature F — Total Credit / Total Paid / Outstanding KPI strip

| Field | Value |
|---|---|
| Feature ID | F |
| Feature name | Full KPI strip (3 tiles) |
| Required data | `total_credit`, `total_paid`, `outstanding` at restaurant level |
| Existing API support | **Partial** — `outstanding` derivable from `sum(balance)`. `total_credit`/`total_paid` NOT on API 1. |
| Existing endpoint(s) | `POST /api/v1/vendoremployee/pos/tap-waiter-list` (API 1) |
| Existing fields available | Per-customer `balance`. No `total_credit`/`total_paid` at top level. |
| Missing fields | `total_credit`, `total_paid` (restaurant-wide) on API 1 response. |
| Frontend derivable? | **No** safely — would require calling API 2 for EVERY customer (N+1 problem on 40+ customers). |
| Backend change required? | **Yes** — add `total_credit`, `total_paid`, `outstanding` to `tap-waiter-list` response. |
| Risk level | Low (change is additive) |
| Recommendation | **Phase 2A** — ~10-line frontend change once backend ships the fields. Backend ask already in-flight. |

### Feature G — Sidebar outstanding count/badge

| Field | Value |
|---|---|
| Feature ID | G |
| Feature name | Sidebar outstanding badge |
| Required data | Total outstanding count or amount |
| Existing API support | **Partial** — derivable from API 1 on panel open |
| Existing endpoint(s) | API 1 |
| Existing fields available | `balance` per customer |
| Missing fields | None (derivable). But badge would need periodic refresh or socket event. |
| Frontend derivable? | Yes — `customers.filter(c => c.balance > 0).length`. But only accurate when panel has been opened. |
| Backend change required? | **No** for basic (show after first open). **Yes** for real-time (needs socket event or periodic poll). |
| Risk level | Low |
| Recommendation | **Owner decision needed** — not approved during Phase 1 UAT. |

### Feature H — Print credit statement

| Field | Value |
|---|---|
| Feature ID | H |
| Feature name | Print credit statement |
| Required data | Same as Feature A/B |
| Existing API support | **Partial** (same as A) |
| Existing endpoint(s) | API 2 |
| Existing fields available | Same as A |
| Missing fields | Same as A |
| Frontend derivable? | Yes — same `window.open` + `window.print()` pattern. Print and PDF are essentially the same flow. |
| Backend change required? | No |
| Risk level | Low |
| Recommendation | **Phase 2A** — combined with Feature B (same HTML template, user chooses Print or Save as PDF). |

### Feature I — Print payment receipt

| Field | Value |
|---|---|
| Feature ID | I |
| Feature name | Print payment receipt |
| Required data | Payment details (amount, method, date, received by, customer info, balance after payment) |
| Existing API support | **None** — API 3 response shape not documented. No receipt reference ID. |
| Existing endpoint(s) | `POST /api/v1/vendoremployee/pos/tap-waiter-order-insert` (API 3) — response not verified. |
| Existing fields available | Request payload has amount, method, customer info. Response unknown. |
| Missing fields | Receipt/reference ID, `received_by` (cashier name), `balance_after_payment`, timestamp from server. |
| Frontend derivable? | **Partial** — amount/method/customer known from request. Receipt ID and server timestamp need API 3 response. Cashier name from AuthContext. Balance derivable if re-fetch. |
| Backend change required? | **Yes** — API 3 response needs `receipt_id`, `balance_after`, `timestamp`. |
| Risk level | Medium |
| Recommendation | **Phase 2C** — receipt format needs definition; API 3 response needs documentation. |

### Feature J — Bulk settle / bulk payment

| Field | Value |
|---|---|
| Feature ID | J |
| Feature name | Bulk settle |
| Required data | Batch payment endpoint accepting multiple customer settlements |
| Existing API support | **None** |
| Existing endpoint(s) | API 3 (single customer only) |
| Existing fields available | API 3 payload per customer |
| Missing fields | Batch endpoint, transaction rollback on partial failure, reconciliation report |
| Frontend derivable? | **No** — sequential API 3 calls risk partial failure states |
| Backend change required? | **Yes** — new batch settlement endpoint required |
| Risk level | **Critical** |
| Recommendation | **Phase 2C** — backend-blocked. Needs batch API + rollback strategy. |

### Feature K — Settlement module integration

| Field | Value |
|---|---|
| Feature ID | K |
| Feature name | Settlement module integration |
| Required data | Settlement module API + reconciliation logic |
| Existing API support | **None** — settlement module does not exist |
| Existing endpoint(s) | None |
| Existing fields available | None |
| Missing fields | Entire settlement module |
| Frontend derivable? | No |
| Backend change required? | **Yes** — settlement module needs to be built first |
| Risk level | **Critical** |
| Recommendation | **Phase 2C** — backend-blocked. Depends on settlement module roadmap. |

### Feature L — P3 Sidebar orphan cleanup

| Field | Value |
|---|---|
| Feature ID | L |
| Feature name | Sidebar orphan cleanup |
| Required data | None |
| Existing API support | N/A |
| Existing endpoint(s) | N/A |
| Existing fields available | N/A |
| Missing fields | N/A |
| Frontend derivable? | N/A |
| Backend change required? | No |
| Risk level | **Negligible** |
| Recommendation | **Phase 2A** — 4-line deletion in `Sidebar.jsx` lines 43-47. |

---

## 7. Credit Statement / Report Field Mapping

### 7.1 Restaurant Header

| Field | Source | Status |
|---|---|---|
| Restaurant name | `RestaurantContext → restaurant.name` | **Available now** |
| Branch/outlet name | `RestaurantContext → restaurant.name` (single name, no separate branch field observed) | **Available now** (single field) |
| GST/tax number | Not observed in `RestaurantContext` or profile API response in current codebase | **Needs additional key** — check if `profileTransform` exposes it |
| Address/contact | Not observed in current frontend state. Profile API may contain it. | **Needs investigation** — may need additional key in profile response |
| Logo URL | `GENIE_LOGO_URL` constant available in `constants/index.js` | **Available now** |

### 7.2 Customer Header

| Field | Source | Status |
|---|---|---|
| Customer name | API 1: `item.name` / API 2 response context → `customer.name` from SS1 selection | **Available now** |
| Mobile | API 1: `item.mobile` | **Available now** |
| Email | API 1: `item.email` (can be null) | **Available now** |
| Customer ID | API 1: `item.id` (internal, not customer-facing) | **Available now** (internal use only) |
| Opening balance | NOT available. Would require: `balance_at_date(start_date)` | **Needs new API** for date-range statements. For lifetime: 0 (first credit = start). |
| Current balance | API 1: `item.balance` | **Available now** |

### 7.3 Date/Filter Header

| Field | Source | Status |
|---|---|---|
| Statement start date | User-selected date range (frontend state) or `tap_start_date` for lifetime | **Derivable safely** |
| Statement end date | User-selected or `new Date()` for "as of today" | **Derivable safely** |
| Generated at | `new Date().toLocaleString()` | **Derivable safely** |
| Generated by / cashier | `AuthContext → user.name` or `user.email` | **Available now** (from auth context) |

### 7.4 Summary Section

| Field | Source | Status |
|---|---|---|
| Total credit | `sum(credits.credit_order_amount)` from API 2 | **Derivable safely** (from detail API) |
| Total debit/paid | `sum(debits.debit_order_amount)` from API 2 | **Derivable safely** (from detail API) |
| Outstanding balance | `total_credit - total_paid` or API 1 `balance` | **Derivable safely** |
| First credit date | API 2: `tap_start_date` | **Available now** |
| Last credit date/amount | API 2: `last_tap_credit_date`, `last_tap_credit_amount` | **Available now** |
| Last payment date/amount | API 2: `last_tap_debit_date`, `last_tap_debit_amount` | **Available now** |

### 7.5 Transaction Table

| Field | Source | Status |
|---|---|---|
| Transaction ID | API 2 credit/debit: `id` | **Available now** |
| Order ID | API 2 credit: `order_id` | **Available now** |
| Restaurant order ID | API 2 credit: `restaurant_order_id` (can be null) | **Available now** |
| Transaction date/time | API 2: `created_at` / `order_created_at` | **Available now** |
| Credit amount | API 2 credit: `credit_order_amount` | **Available now** |
| Debit/payment amount | API 2 debit: `debit_order_amount` | **Available now** |
| Payment mode/status | API 2 debit: `payment_status` → Cash/Card/UPI. Credit: `"sucess"` (do not display). | **Available now** |
| Running/current balance | API 2: `current_balance` per entry | **Available now** (but unreliable — API returns `"0.00"` for many credit entries; only debits have accurate running balance) |

### 7.6 Bill Detail / Order Line Items

| Field | Source | Status |
|---|---|---|
| Item name | `getSingleOrderNew(order_id)` → items array → `name` | **Available now** (via existing OrderDetailSheet/reportService) |
| Quantity | Same → `quantity` | **Available now** |
| Rate / unit price | Same → `unitPrice` | **Available now** |
| Discount | Same → from order financials | **Available now** |
| Tax | Same → `amount - subtotal - deliveryCharge` | **Available now** |
| Item total | Same → `price` (qty × unitPrice) | **Available now** |
| Grand total | Same → `amount` | **Available now** |
| Can `getSingleOrderNew` provide it? | **YES** — already used by SS3 (OrderDetailSheet via reportService). | **Available now** |

### 7.7 Payment Receipt Section

| Field | Source | Status |
|---|---|---|
| Paid amount | API 3 request payload: `debit_order_amount` | **Derivable safely** (from request) |
| Payment mode | API 3 request payload: `payment_status` | **Derivable safely** (from request) |
| Payment date/time | `new Date()` at time of submission OR API 3 response timestamp | **Derivable safely** (client timestamp). Server timestamp **needs API 3 response documentation**. |
| Received by | `AuthContext → user.name` (current logged-in cashier) | **Available now** |
| Balance after payment | Re-fetch API 2 after success → new `balance` OR derive from pre-payment balance − paid amount | **Derivable safely** |
| Receipt/reference ID | **NOT available**. API 3 response not documented. | **Needs additional key in API 3 response** |

### 7.8 Footer

| Field | Source | Status |
|---|---|---|
| Terms/note | Static text (e.g., "This is a computer-generated statement.") | **Not needed for Phase 2A** (static, configurable later) |
| Powered by MyGenie | Static text + `GENIE_LOGO_URL` | **Available now** |
| Source/config requirement | None — hardcoded in template | **Not needed for Phase 2A** |

---

## 8. API Gaps and Backend Requirements

### BG-01 — Add `total_credit` / `total_paid` to `tap-waiter-list`

| Field | Value |
|---|---|
| Requirement ID | BG-01 |
| Existing API to extend | `POST /api/v1/vendoremployee/pos/tap-waiter-list` (API 1) |
| Proposed change | Add 3 top-level keys to response: `total_credit`, `total_paid`, `outstanding` |
| Required request params | None (existing `{}` payload) |
| Required response keys | `total_credit: number`, `total_paid: number`, `outstanding: number` |
| Why FE cannot derive safely | Would require calling API 2 for every customer (N+1 problem — 40+ calls for Palm House). Unacceptable latency. |
| Depends on feature | F (KPI strip — 3 tiles) |
| Priority | **P0 — required for Phase 2A** |
| Backward compatibility | Additive — existing `employee-tap-list` array unchanged. New keys are top-level siblings. Old clients ignore them. |
| Status | **Backend ask already in-flight** (per UAT Fix Verification doc §Backend Ask Still In Flight). |

### BG-02 — Add date-range params to `tap-customer-record-list`

| Field | Value |
|---|---|
| Requirement ID | BG-02 |
| Existing API to extend | `GET /api/v2/vendoremployee/pos/tap-customer-record-list` (API 2) |
| Proposed change | Accept optional `start_date` and `end_date` query params. Return only transactions within range. Add `opening_balance` key (balance at start of range). |
| Required request params | `?customer_id={id}&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD` (both optional — omit for lifetime) |
| Required response keys | Existing keys unchanged. Add: `opening_balance: number` (balance at `start_date`) |
| Why FE cannot derive safely | (1) FE has no guarantee all transactions are returned (pagination/truncation risk). (2) `current_balance` on credit entries is often `"0.00"` — unreliable for computing running balance at arbitrary dates. (3) Opening balance requires knowledge of all transactions before `start_date`. |
| Depends on feature | D (date-range filter — proper backend implementation) |
| Priority | **P1 — required for Phase 2B** (Phase 2A uses client-side filter as temporary workaround) |
| Backward compatibility | Additive — existing behavior unchanged when params omitted. |

### BG-03 — Document API 3 response shape + add receipt fields

| Field | Value |
|---|---|
| Requirement ID | BG-03 |
| Existing API to extend | `POST /api/v1/vendoremployee/pos/tap-waiter-order-insert` (API 3) |
| Proposed change | Document actual response shape. Ideally add: `receipt_id`, `balance_after`, `server_timestamp`, `received_by_name`. |
| Required request params | Existing payload unchanged |
| Required response keys | `receipt_id: string`, `balance_after: number`, `created_at: ISO`, `received_by: string` |
| Why FE cannot derive safely | Receipt ID must be server-generated for uniqueness. Server timestamp is authoritative. Balance-after computed by backend is single-source-of-truth. |
| Depends on feature | I (print payment receipt) |
| Priority | **P1 — required for Phase 2C** |
| Backward compatibility | Additive — existing callers already ignore the response body. |

### BG-04 — Bulk statement / multi-customer PDF endpoint (Optional)

| Field | Value |
|---|---|
| Requirement ID | BG-04 |
| New API needed | Yes |
| Proposed endpoint | `POST /api/v2/vendoremployee/pos/tap-customer-bulk-statement` |
| Required request params | `{ customer_ids: [1439, 1440, ...], start_date?: "YYYY-MM-DD", end_date?: "YYYY-MM-DD" }` |
| Required response keys | Array of per-customer statement objects (same shape as API 2 per customer) OR a server-generated PDF URL |
| Why FE cannot derive safely | Calling API 2 serially for 40+ customers causes unacceptable latency and risk of partial failure. Backend can batch-query and return a single payload or pre-rendered PDF. |
| Depends on feature | C (bulk PDF export) |
| Priority | **P2 — nice-to-have for Phase 2B** (FE can loop API 2 as fallback for small selections) |
| Backward compatibility | New endpoint — no existing behavior affected. |

### BG-05 — Batch settlement endpoint (if bulk settle approved)

| Field | Value |
|---|---|
| Requirement ID | BG-05 |
| New API needed | Yes |
| Proposed endpoint | `POST /api/v1/vendoremployee/pos/tap-waiter-bulk-settle` |
| Required request params | `{ settlements: [{ mobile, name, email, debit_order_amount, payment_status }, ...] }` |
| Required response keys | `{ results: [{ mobile, status: "success"|"failed", receipt_id, balance_after }], summary: { total_settled, total_failed } }` |
| Why FE cannot derive safely | Sequential API 3 calls risk partial failure with no rollback. Batch endpoint enables atomic-or-nothing semantics. |
| Depends on feature | J (bulk settle) |
| Priority | **P2 — required for Phase 2C only if bulk settle approved** |
| Backward compatibility | New endpoint — no existing behavior affected. |

### BG-06 — Restaurant metadata for statement header

| Field | Value |
|---|---|
| Requirement ID | BG-06 |
| Existing API to extend | Profile API (`/api/v1/vendoremployee/profile`) |
| Proposed change | Verify and document availability of: `restaurant_address`, `gst_number`, `contact_phone` in profile response |
| Required request params | None (existing profile call) |
| Required response keys | `address`, `gst_number`, `phone` |
| Why FE cannot derive safely | Restaurant legal/tax details are backend-sourced. |
| Depends on feature | A, B (statement header) |
| Priority | **P1 — investigate existing profile response before requesting new keys** |
| Backward compatibility | Additive or already present but not consumed by FE. |

---

## 9. Recommended Phase Split — LOCKED (Owner Decisions Applied)

### Phase 2A — Read-only / Reporting / Safe Scope (APPROVED)

| # | Feature | API Dependency | Implementation Effort | Owner Decision |
|---|---|---|---|---|
| F | KPI strip (3 tiles: Total Credit / Total Paid / Outstanding) | BG-01 (backend in-flight) | ~10 lines additive | Q8=C |
| A | Per-customer statement preview | None (API 2 data sufficient for lifetime) | ~200 lines (new StatementPreview component) | Q1=C |
| B+H | Per-customer PDF download + print statement | None (frontend-generated interim per Q2=D) | ~250 lines (HTML template + print, includes item details per Q3=C) | Q2=D, Q3=C |
| D-temp | Client-side date filter (temporary) | None | ~80 lines (date picker + filter logic in SS2) | Q4=C |
| L | Sidebar orphan cleanup | None | ~4 lines deletion | — |

**Excluded from 2A:** WhatsApp (Q5=C → 2B), bulk PDF (C), payment receipt (Q6=D → 2C), bulk settle (Q7=B → 2C), settlement integration (K), sidebar badge (G — unapproved).

**API dependencies:** BG-01 must land before Feature F is complete. All others are frontend-only.

**Key implementation note (Q3=C):** Full statement PDF with line-item details requires calling `getSingleOrderNew` for every credit entry. Must implement with progress indicator and handle potential latency for large accounts.

**Risk level:** **Low–Medium** (Medium due to Q3=C item-detail serial API calls)

### Phase 2B — Communication / Share / Date-Range Proper

| # | Feature | API Dependency | Implementation Effort | Owner Decision |
|---|---|---|---|---|
| E | WhatsApp share (customer-facing, separate scope) | Owner to define approach | TBD | Q5=C |
| C | Bulk PDF export (multi-customer) | BG-04 recommended | ~300 lines | — |
| D-proper | Backend date-range filter with opening balance | BG-02 | ~50 lines FE change | Q4=C |
| BG-06 | Restaurant metadata in statement (address, GST) | Profile API investigation | ~20 lines | — |

**Risk level:** **Medium**

### Phase 2C — Payment / Settlement / Sensitive

| # | Feature | API Dependency | Implementation Effort | Owner Decision |
|---|---|---|---|---|
| I | Print payment receipt | BG-03 | ~150 lines | Q6=D |
| J | Bulk settle | BG-05 | ~400 lines | Q7=B |
| K | Settlement module integration | Settlement module must exist | TBD | — |

**Risk level:** **High–Critical**

---

## 10. Owner Questions — ANSWERED (2026-05-22)

### Q1. Phase 2A first scope:
- ~~A. Statement preview + PDF only~~
- ~~B. Statement preview + PDF + client-side date filter~~
- **✅ C. Statement preview + PDF + client-side date filter + KPI improvement (once backend ships BG-01)**
- ~~D. Include WhatsApp also~~

> **Owner note:** "WhatsApp will be there for customer — will take it separately." WhatsApp confirmed OUT of Phase 2A; handled as separate scope.

### Q2. PDF generation approach:
- ~~A. Frontend-generated PDF (browser print → Save as PDF)~~
- ~~B. Backend-generated PDF API~~
- ~~C. Both: frontend for preview, backend for final PDF~~
- **✅ D. Decide after API gap analysis with backend team**

> **Implication:** Phase 2A implements frontend-generated PDF as interim approach (zero backend dependency). Final approach locked after backend team confirms capabilities. Frontend PDF can serve as fallback regardless.

### Q3. Statement should include bill item details?
- ~~A. No, transaction-level only~~
- ~~B. Yes, on-demand drill-down only~~
- **✅ C. Yes, full statement PDF should include line-item details for every order**
- ~~D. Phase 2A transaction-level, later item details~~

> **Implication:** PDF generation must call `getSingleOrderNew` for every credit entry with a valid `order_id` to fetch item-level data. For customers with many orders (e.g., 50+ credit entries), this means 50+ serial API calls during PDF generation. Loading indicator and progressive rendering required. Phase 2A can start with transaction-level and add item details as an enhancement within the same phase.

### Q4. Date range filter:
- ~~A. Frontend filter only~~
- ~~B. Backend API params required~~
- **✅ C. Both: frontend client-side temporary in Phase 2A, backend proper in Phase 2B**
- ~~D. Not needed~~

> **Implication:** Phase 2A ships a client-side date picker that filters the already-fetched API 2 transaction list. No opening-balance computation in Phase 2A (show "N/A" or omit). Phase 2B replaces with BG-02 backend params + proper opening balance.

### Q5. WhatsApp share:
- ~~A. Out of Phase 2A~~
- ~~B. Include in Phase 2A (wa.me link)~~
- **✅ C. Separate Phase 2B only (with proper template)**
- ~~D. Not needed~~

> **Owner confirmed:** WhatsApp is customer-facing, separate scope. Not Phase 2A.

### Q6. Payment receipt print:
- ~~A. Out of Phase 2A and 2B~~
- ~~B. Include simple browser print in Phase 2A~~
- ~~C. Include POS printer integration~~
- **✅ D. Separate Phase 2C only (after API 3 response documented — BG-03)**

> **Implication:** No receipt printing in Phase 2A or 2B. Phase 2C requires BG-03 (API 3 response shape + receipt fields).

### Q7. Bulk settle:
- ~~A. Not needed~~
- **✅ B. Phase 2C only after backend ships batch API (BG-05)**
- ~~C. Needs backend API first~~
- ~~D. One-by-one payment only~~

> **Implication:** BG-05 (batch settlement endpoint) is a Phase 2C backend prerequisite. Current SS4 one-by-one flow remains the only payment path until then.

### Q8. KPI values:
- ~~A. Show only Outstanding until backend ships~~
- ~~B. Derive from detail API only when customer opened~~
- **✅ C. Ask backend to add `total_credit`/`total_paid` to list API (already in-flight — BG-01)**
- ~~D. Hide KPIs except Outstanding~~

> **Implication:** BG-01 is confirmed P0 and already in-flight. ~10-line additive FE change once backend ships. Phase 2A includes this as a gated deliverable (ships as soon as backend confirms).

---

## 11. Implementation Readiness Verdict

**Phase 2A is CONDITIONALLY implementation-ready.**

Owner decisions Q1–Q8 are now locked. Remaining blockers:

1. **BG-01** (backend `total_credit`/`total_paid`) — in-flight, not confirmed shipped. Phase 2A KPI feature gated on this.
2. **Q2 final decision** — PDF approach deferred to after backend team API gap analysis. Phase 2A proceeds with frontend-generated PDF as interim.
3. **Q3 item-detail PDF** — requires serial `getSingleOrderNew` calls per credit entry. Feasibility depends on customer order volume. Needs performance testing.
4. **Phase 1 parked items** (owner re-smoke, real payment test) should ideally complete first, but do NOT block Phase 2A planning or statement/PDF work.

**Phase 2A can begin implementation once:**
- Owner re-smoke is complete (or explicitly waived), AND
- Implementation agent confirms serial `getSingleOrderNew` latency is acceptable for item-detail PDF (Q3=C).

**Phase 2B and 2C remain blocked** on BG-02, BG-03, BG-04, BG-05 backend confirmation.

---

## 12. Confirmations

- **No code changed** — all findings are from read-only inspection.
- **No backend changed.**
- **No data mutated.**
- **No payment API invoked.**
- **`/app/memory/final/` untouched.**
- **Baseline docs untouched.**
- This document is a planning artifact only. Implementation requires owner decisions and API gap resolution.

---

*— BUG-104 Credit/Tab Management — Phase 2 Scope, API Mapping & Report Capability Plan — 2026-05-22 —*
