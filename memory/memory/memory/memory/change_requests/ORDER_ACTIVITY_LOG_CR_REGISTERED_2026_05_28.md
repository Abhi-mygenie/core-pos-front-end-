# CR: Order Activity Log — Lifecycle Audit Feed

**CR ID:** `ORDER_ACTIVITY_LOG_CR_2026_05_28`
**Date:** 2026-05-28
**Status:** `REGISTERED — NOT_STARTED`
**Priority:** P2 (backlog — after Audit Report Optimise CR completes)
**Dependency:** `AUDIT_REPORT_OPTIMISE_CR_2026_05_28` (must ship first — it wires `operations[]` into the row data)
**Data Source:** `operations[]` array from `/order-logs-report` (already in API response, already contracted)

---

## 1. One-Line Scope

> Chronological activity feed per order showing every state transition — who did what, when — for restaurant manager accountability.

---

## 2. User Need

Restaurant managers want to know:
- **Who** confirmed the order
- **Who** marked items as ready
- **Who** served
- **Who** collected payment (and by what method)
- **Who** cancelled (and why)
- **Who** merged orders
- **Who** changed payment method after settlement
- **Who** marked an order unpaid and who re-collected
- **When** each action happened
- **How long** between each step

---

## 3. Data Already Available (from `operations[]`)

Each entry provides:

| Field | What it answers |
|---|---|
| `operation` | What action (bill_payment, status_update, shifted_room, etc.) |
| `vendor_employee_name` | WHO |
| `created_at` | WHEN |
| `previous_f_order_status` → `current_f_order_status` | Status transition |
| `previous_payment_method` → `current_payment_method` | Payment change |
| `previous_payment_status` → `current_payment_status` | Paid/unpaid transition |
| `previous_order_amount` → `current_order_amount` | Amount change |

Supplemented by item-level timestamps:

| Field | What it answers |
|---|---|
| `item.ready_at` + `item.ready_by` | Per-item ready (when/who) |
| `item.serve_at` + `item.serve_by` | Per-item serve (when/who) |
| `item.cancel_at` + `item.cancel_by_name` + `item.cancel_type` + `item.cancel_reason_text` | Per-item cancel (when/who/why/pre-or-post-serve) |

---

## 4. Where It Would Live

**Option A:** New tab/section inside `OrderDetailSheet` modal (alongside existing Items / Bill Summary)
**Option B:** Expandable row on the Audit Report table itself
**Option C:** Dedicated "Activity" icon per row that opens a mini-timeline

**Decision:** Deferred to discovery — owner to choose.

---

## 5. Parking Notes

- No design, no implementation plan, no diffs
- Registered for backlog prioritization
- Depends on `operations[]` being reliably populated (GAP 1-3 backend fixes)
- Depends on Audit Report Optimise CR shipping (wires `operations[]` to frontend row data)

---

## 6. Cross-References

| Document | Relevance |
|---|---|
| `AUDIT_REPORT_CONTRACT_FREEZE_2026_05_28.md` | Data contract for `operations[]` |
| `AUDIT_REPORT_BACKEND_GAPS_2026_05_28.md` | GAP 1-3 must be fixed for full coverage |
| `AUDIT_REPORT_OPTIMISE_CR_PLAN_2026_05_28.md` | Parent CR that wires `operations[]` into row data |
| `AUDIT_REPORT_API_INVESTIGATION_2026_05_27.md` | Full investigation of `operations[]` structure and coverage |

---

*End of CR Registration.*
