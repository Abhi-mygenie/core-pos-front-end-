# CR-544 — Cancel After Making Unpaid: Audit Event

**Registered:** 2026-11-16
**Type:** CR
**Sprint:** nov_cr_batch
**Status:** GATE_1_INTAKE_COMPLETE

---

## 1. Description

Track a **two-step fraud chain**: a cashier marks an order as "unpaid" (step 1, already tracked today), then cancels items or the entire order (step 2) — reducing the recorded bill while having already collected cash from the customer.

**Current behaviour:** The Order Edit Audit page tracks Make Unpaid events, but does NOT flag cancellations that happen after an order was made unpaid. The two events are treated independently — no correlation.

**Expected behaviour:**
- Any item or order cancellation that occurs on an order **after** that order was marked unpaid is flagged as a `cancel_after_unpaid` audit event
- Shows on Order Edit Audit page (`AuditLogMockup.jsx`) as:
  - New KPI card: "Cancel After Unpaid" (count)
  - Audit Trail rows showing: Order ID, what was cancelled (item name or "Full Order"), amount, who cancelled, when the order was made unpaid, when the cancel happened, time gap between the two actions

**Fraud pattern:**
1. Customer pays ₹500 cash
2. Cashier marks order as "unpaid" → system thinks ₹500 not collected
3. Cashier cancels ₹200 of items → system now shows ₹300 order
4. Cashier pockets ₹500 (customer paid) − ₹300 (system recorded) = ₹200 stolen
5. OR: cashier later "collects" the ₹300 as a recovery, keeping ₹200

---

## 2. Classification

- **Type:** CR
- **Severity:** P0 — Critical (direct cash theft pattern)
- **Risk:** MEDIUM — touches insights-dashboard audit response + AuditLogMockup.jsx
- **Area:** Reports / Audit / Fraud Detection
- **Fast Lane:** NOT eligible (new audit event type + backend dependency)

---

## 3. Duplicate Check

- Make Unpaid (existing audit event): tracks ONLY the unpaid action itself, not subsequent cancels
- CR-528 (post-bill-print cancel): DISTINCT — different trigger (bill print vs unpaid)
- CR-543 (late cancellation threshold): DISTINCT — different trigger (time vs unpaid sequence)
- CR-542 (unpaid reason mandatory): RELATED but different scope (reason text vs audit flagging)
- **Result: DISTINCT** — no cancel-after-unpaid correlation exists in any registered item

---

## 4. Evidence

- **Source:** OWNER-DIRECTED (2026-11-16 session)
- **Confidence:** CONFIRMED
- **Rationale:** Make Unpaid is already the #1 audit flag. Adding cancel-after-unpaid catches the second step of the fraud chain that currently goes undetected.

---

## 5. Data Flow

### What backend needs to track
- `made_unpaid_at`: timestamp of when an order was marked unpaid (may already exist in operations log as `make_unpaid` event)
- For each cancellation (item or order) on that order AFTER `made_unpaid_at` → emit a `cancel_after_unpaid` audit event

### Audit event shape
```json
{
  "order_id": "021544",
  "type": "cancel_after_unpaid",
  "food_name": "Paneer Tikka",
  "amount": 200.00,
  "by": "Counter",
  "made_unpaid_at": "2026-11-16T14:30:00",
  "cancel_time": "2026-11-16T14:35:00",
  "scope": "item",
  "gap_minutes": 5
}
```

### Endpoint
`POST /api/v2/vendoremployee/report/insights-dashboard` → `audits.orders[]`

New fields in `audits`:
- `cancel_after_unpaid_count`: integer
- Events with `type: "cancel_after_unpaid"` in `orders[]`

### FE changes
| File | Change |
|---|---|
| `AuditLogMockup.jsx` | Add "Cancel After Unpaid" KPI card + render `cancel_after_unpaid` rows in Audit Trail |
| `insightsService.js` | Map `cancel_after_unpaid_count` from `audits` response |
| `DashboardMockup.jsx` | Optionally show in dashboard audit tile (minor) |

---

## 6. Blast Radius

- `AuditLogMockup.jsx` — add KPI card + table row type (SMALL, additive)
- `insightsService.js` → `transformDashboardResponse` — map new count (SMALL)
- Backend: correlate `make_unpaid` timestamp with subsequent cancels in `insights-dashboard`
- **Estimated scope:** SMALL-MEDIUM (2 FE files + backend correlation logic)

---

## 7. Open Questions

- OD-544-01: Should the flag trigger regardless of how much time passes between unpaid and cancel, or only within a time window (e.g. same day / same session)?
  - **Recommended:** No time limit — any cancel after unpaid on the same order, regardless of when
- OD-544-02: Should this include orders that were made unpaid AND THEN re-paid AND THEN cancelled? (Edge case: unpaid → repaid → cancel)
  - **Recommended:** Only flag if order is STILL unpaid at time of cancel (simplest, catches the real fraud)

---

## 8. Dependencies

- **Backend (Gyan):** `made_unpaid_at` timestamp per order + correlation logic in `insights-dashboard` audits
- **Existing data:** `operations[].operation = 'make_unpaid'` with `created_at` already exists in `order-logs-report` — backend can derive `made_unpaid_at` from this

---

## 9. Related

- Make Unpaid (existing audit event — step 1 of the chain)
- CR-528 (post-bill-print audit — different trigger, same audit page)
- CR-543 (late cancellation threshold — different trigger, same audit page)
- CR-542 (unpaid reason mandatory — complementary, not overlapping)
