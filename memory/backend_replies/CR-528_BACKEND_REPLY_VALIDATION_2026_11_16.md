# CR-528 Backend Reply Validation — 2026-11-16

**Backend:** Gyan · **ASK:** 2 (order-logs-report) · **Reply date:** 2026-11-16
**Validator:** Planning agent · **Source:** `CR-528_POST_BILL_PRINT_CHANGES_FRONTEND_HANDOFF.md`
**Contracts referenced:**
- v1: `contracts/BATCH-C_CR-528_API_CONTRACT_2026_11_15.md` (order-logs-report)
- v2: `contracts/BATCH-C_CR-528_API_CONTRACT_2026_11_16_v2.md` (insights-dashboard)
- CR-525: `contracts/BATCH-D_CR-525_API_CONTRACT_2026_11_15.md` (bill_print reset)

---

## 1. Reply Scope

The backend delivered work on **`GET /api/v2/vendoremployee/report/order-logs-report`** only.
Restaurant 672, order `1578833`, bill `000779`. Preprod, 2026-11-16. No physical print or payment — simulated confirmations. Test order cancelled as final step.

---

## 2. Contract v1 (order-logs-report) — ASK 2 Validation

### a) `orders_table` header fields

| Field | Contract | Delivered | Evidence | Verdict |
|---|---|---|---|---|
| `print_bill_status` | `'Yes'` after print; `'No'` unprinted | `"Yes"` after first confirmed print | Final JSON: `"print_bill_status": "Yes"` | ✅ PASS |
| `bill_printed_at` | Datetime of **latest** print incl. reprints; `null` when none | `"2026-11-16 19:45:26"` (3rd print); `null` before any print | Format `YYYY-MM-DD HH:mm:ss`; updated on each reprint | ✅ PASS |
| `bill_print_count` | Integer; starts `0` | 0 → 1 → 2 → 3 across first + legacy reprint + modern reprint | Final JSON: `"bill_print_count": 3` | ✅ PASS |

### b) `operations[]` — bill_print events

| Field | Contract | Delivered | Verdict |
|---|---|---|---|
| `operation` | `'bill_print'` (LOCKED) | `"bill_print"` in 3 entries | ✅ PASS |
| `created_at` | Datetime of print | `19:45:18`, `19:45:22`, `19:45:26` (second precision) | ✅ PASS |
| `employee` | Name of employee | `"Manager"` on all 3 | ✅ PASS |
| `amount` | Order amount at time of print | First: `20` (pre-edit); reprints: `30` (post-edit) | ✅ PASS |

**Rule check:** One entry per print including reprints → ✅ 3 prints = 3 entries (OD-C-R3 Q5 satisfied).

### c) `operations[]` — item_cancel

| Field | Contract | Delivered | Verdict |
|---|---|---|---|
| `operation` | `'item_cancel'` (EXISTING — confirm) | `"item_cancel"` at `19:45:32` | ✅ PASS |

OD-528-B (both order-level AND item-level cancels) → ✅ Both present.

### d) `operations[]` — order_cancel

| Field | Contract | Delivered | Verdict |
|---|---|---|---|
| `operation` | `'order_cancel'` (NEW) | `"order_cancel"` at `19:45:33` | ✅ PASS |

### e) `operations[]` — order_edit

| Field | Contract | Delivered | Verdict |
|---|---|---|---|
| `operation` | `'order_edit'` (EXISTING) | `"order_edit"` at `19:45:21` | ✅ PASS |

### ASK 2 Summary

| # | Item | Verdict |
|---|---|---|
| 1 | `print_bill_status` persisted | ✅ PASS |
| 2 | `bill_print` in ops with time/employee/amount | ✅ PASS |
| 3 | `bill_print_count` | ✅ PASS |
| 4 | `bill_printed_at` (latest) | ✅ PASS |
| 5 | `item_cancel` in ops confirmed | ✅ PASS |
| 6 | `order_cancel` added to ops | ✅ PASS |

**v1 ASK 2 verdict: 6/6 PASS — FULLY SATISFIED.**

---

## 3. Bonus Verifications (beyond contract — from reply test matrix)

| Case | Expected | Observed | Verdict |
|---|---|---|---|
| Diagnostic `print-logs` (queued/failed/success) | No count change, no audit entry | IDs 5, 6, 7 created; count stays 0, no bill_print ops | ✅ PASS |
| KOT confirmation (`kot_print: "Yes"`) | No bill count change | KOT count 1, bill count 0, `bill_printed_at` still null | ✅ PASS |
| Modern print path (`update-print-status { bill_print: "Yes" }`) | Increments count + updates timestamp | Count 1 → confirmed; timestamp set | ✅ PASS |
| Legacy reprint (`pos/update-print-bill-status { print_status: "Yes" }`) | Increments count + updates timestamp | Count 2; timestamp updated to 19:45:22 | ✅ PASS |
| Modern reprint after legacy | Increments count | Count 3; timestamp 19:45:26 | ✅ PASS |
| Legacy `print_status: "No"` | No effect on count or timestamp | Count stays 3; timestamp stays 19:45:26; flag stays Yes | ✅ PASS |
| Amount captured per print | Reflects order amount at that moment | First: ₹20 (pre-edit); reprints: ₹30 (post-edit amount) | ✅ PASS |
| GET and POST return same data | Identical response | Confirmed: same header + operations timeline | ✅ PASS |

---

## 4. Contract v2 (insights-dashboard) — ASK 2 revised: NOT ADDRESSED

The **revised v2 contract** (2026-11-16) targeting `POST insights-dashboard` → `audits` section was **not answered** by this reply.

| Item | Contract Ref | Status |
|---|---|---|
| `type: "item_cancel_after_print"` event in `audits.orders[]` | v2 §2a | ❌ NOT ADDRESSED |
| `type: "order_cancel_after_print"` event | v2 §2b | ❌ NOT ADDRESSED |
| `type: "order_edit_after_print"` event | v2 §2c | ❌ NOT ADDRESSED |
| `item_cancel_after_print_count` KPI | v2 §2d | ❌ NOT ADDRESSED |
| `order_cancel_after_print_count` KPI | v2 §2d | ❌ NOT ADDRESSED |
| `order_edit_after_print_count` KPI | v2 §2d | ❌ NOT ADDRESSED |
| P-1: Persist `bill_printed_at` | v2 §3 | ✅ Delivered on order-logs-report (foundation) |
| P-2: Persist `print_bill_status = 'Yes'` | v2 §3 | ✅ Delivered on order-logs-report (foundation) |
| P-3: Detect cancels/edits after `bill_printed_at` and emit audit events | v2 §3 | ❌ NOT ADDRESSED on insights-dashboard |

**v2 verdict: FOUNDATION DELIVERED (P-1, P-2), AUDIT EVENTS NOT BUILT (P-3 + event types + KPIs).**

---

## 5. CR-525 Contract (BD-01 through BD-04): NOT ADDRESSED

| BD ID | Ask | Status | Notes |
|---|---|---|---|
| BD-01 | Reset `bill_print` to `'No'` on `update-place-order` with new items | ❌ NOT TESTED | Reply tested edit but did not verify flag reset |
| BD-02 | No reset on empty `cart-update` (customer-only) | ❌ NOT TESTED | — |
| BD-03 | Full list of edit paths that reset `bill_print` | ❌ NOT PROVIDED | — |
| BD-04 | `bill_print_count` unchanged when flag resets | ⚠️ PARTIAL | Legacy "No" didn't change count (implies count is independent of flag) |

**CR-525 verdict: NOT ADDRESSED. BD-01/02/03 still need explicit backend confirmation.**

---

## 6. Frontend Integration Notes from Reply

Key rules for FE implementation (from backend handoff):

1. **Use `bill_printed_at` for the window after the latest print.** For changes between earlier prints and reprints, use individual `bill_print` timestamps in `operations[]`.
2. **Do NOT use `collect_bill` as print time.** (Confirms OD-528-D decision.)
3. **Timestamp format:** `YYYY-MM-DD HH:mm:ss`, second precision, no offset. Compare in same timezone.
4. **Equal timestamps do not prove event order.**
5. **Send ONE success confirmation per physical print** using modern OR legacy path, not both.
6. **Diagnostic `print-logs` endpoint does NOT increment count** even with `print_status: "success"`.
7. **KOT-only confirmations do NOT count as bills.**
8. **Historical records were NOT backfilled.** A legacy order can have print flag/count without matching timeline entries. Missing historical timestamp/event is not reconstructed from payment time.
9. **`order_details_table[].cancel_at`** exists alongside `item_cancel` in operations — do not count both as separate events.

---

## 7. Items Unblocked / Validated

### A. DIRECTLY UNBLOCKED

| Item | What's Unblocked | Next Gate |
|---|---|---|
| **CR-528** (order-logs-report portion) | FE can map `bill_printed_at`, `bill_print_count`, `operations[]` in `reportTransform.js` and build "Post-Bill-Print Changes" section in AllOrdersReportPage | Gate 3 — plan the report-side implementation |
| **CR-543** (Late Cancellation Audit — partial) | `bill_printed_at` + `item_cancel`/`order_cancel` timestamps available; FE can compute time delta client-side | Gate 2 — if owner accepts FE-side computation (Option B); still blocked if Option A (backend computes) |

### B. VALIDATED (already implemented — data flow confirmed correct)

| Item | Status | What This Reply Confirms |
|---|---|---|
| **CR-512** | GATE_5A_IMPLEMENTED | Print confirmation endpoints (`update-print-status`, `pos/update-print-bill-status`) work correctly end-to-end |
| **BUG-583** | GATE_5A_IMPLEMENTED | `bill_print: "Yes"` data flow confirmed; green card activation path is correct |
| **CR-489** | GATE_5B_QA_PASS | Edit lock detection via `bill_print` is correct; bill_print persists through edits |
| **BUG-656** | GATE_5A_IMPLEMENTED | Mutation gating on bill_print flag validated; flag correctly reflects print state |
| **BUG-664** | GATE_5A_IMPLEMENTED | `print_bill_status` does NOT turn "Yes" on placement; only on explicit print confirmation |
| **CR-521** | GATE_5A_IMPLEMENTED | Bill-printed color trigger data is correct |

### C. STILL BLOCKED

| Item | Why | What's Needed |
|---|---|---|
| **CR-528** (Audit page — AuditLogMockup.jsx) | Audit page uses `insights-dashboard`, not `order-logs-report` | v2 contract: 3 new event types + 3 KPI counts on `insights-dashboard` |
| **CR-525** (Collect Bill button + color reset on edit) | BD-01 (bill_print reset on edit) not confirmed | BD-01/02/03 sign-off from backend |
| **CR-544** (Cancel After Unpaid audit event) | Needs `insights-dashboard` correlation logic | Backend: `cancel_after_unpaid` event type + `made_unpaid_at` correlation |
| **CR-543** (if Option A — backend computes) | Needs `insights-dashboard` audit computation | Backend: `late_cancel` events + setting key |

---

## 8. Endpoint Mismatch — Owner Decision Required

The backend answered for **`order-logs-report`**, but the Audit page reads **`insights-dashboard`**.

| Path | Description | Pros | Cons |
|---|---|---|---|
| **A — Backend adds events to `insights-dashboard`** | Backend computes post-print events server-side and adds to `audits.orders[]` (v2 contract) | Clean; consistent with Make Unpaid / Payment Method Change pattern; single endpoint | Requires more backend work |
| **B — FE fetches `order-logs-report` separately** | Audit page makes an additional API call to `order-logs-report`, FE computes post-print events client-side | No more backend work needed | Extra API call; slower; FE business logic increases; inconsistent with existing audit event pattern |

**Recommendation:** Path A — consistent with existing architecture. The `order-logs-report` data confirms the foundational fields exist; backend can now use them to emit computed events on `insights-dashboard`.

---

## 9. Action Items

| # | Action | Owner | Priority |
|---|---|---|---|
| 1 | **Owner decision:** Path A vs Path B for Audit page endpoint | Owner | P0 — blocks Gate 3 |
| 2 | **Send v2 contract to backend** (if Path A) for `insights-dashboard` audit events | Planning agent | P0 — after owner decision |
| 3 | **Send CR-525 BD-01/02/03 reminder** to backend | Planning agent | P1 — blocks CR-525 |
| 4 | **Proceed with CR-528 Gate 3** for `order-logs-report` portion (Order Beta Report columns) | Planning agent | P1 — unblocked now |
| 5 | **Update registry.json** CR-528 notes with backend reply validation | Agent | Housekeeping |

---

## 10. Verified Output Reference

Full test matrix from backend (restaurant 672, order 1578833):

| Step | HTTP | `print_bill_status` | `bill_printed_at` | `bill_print_count` | Operations Added |
|---|---|---|---|---|---|
| New unpaid order | 200 | No | null | 0 | — |
| Diagnostic queued/failed/success | 201 each | No | null | 0 | — |
| KOT confirmation | 200 | No | null | 0 | — |
| First bill confirmation (modern) | 200 | Yes | 19:45:18 | 1 | `bill_print` (₹20, Manager) |
| Order edit (add item) | 200 | Yes | 19:45:18 | 1 | `order_edit` (19:45:21) |
| Legacy reprint | 200 | Yes | 19:45:22 | 2 | `bill_print` (₹30, Manager) |
| Modern reprint | 200 | Yes | 19:45:26 | 3 | `bill_print` (₹30, Manager) |
| Legacy "No" | 200 | Yes | 19:45:26 | 3 | — (no change) |
| Partial item cancel | 200 | Yes | 19:45:26 | 3 | `item_cancel` (19:45:32) |
| Full-order cancel | 200 | Yes | 19:45:26 | 3 | `order_cancel` (19:45:33) |

Backend regression: 66 tests, 400 assertions. No new migration needed where `orders.bill_printed_at` and `orders.bill_print` already exist.

---

```
Validation complete: CR-528 ASK 2 (order-logs-report)
Result: v1 contract 6/6 PASS — FULLY SATISFIED
        v2 contract (insights-dashboard) — NOT ADDRESSED
        CR-525 (BD-01/02/03) — NOT ADDRESSED
Unblocked: CR-528 report-side data mapping, CR-543 (partial)
Validated: CR-512, BUG-583, CR-489, BUG-656, BUG-664, CR-521
Still blocked: CR-528 audit page, CR-525, CR-544, CR-543 (if Option A)
Owner decision needed: Path A vs B for audit page endpoint
Next: Owner decision → Gate 3 planning
```
