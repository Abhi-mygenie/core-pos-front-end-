# CR-548: Store All Bill Print Timestamps for Audit Trail

**Type:** CR (Change Request)
**Priority:** P1
**Risk:** MEDIUM
**Client:** ALL
**Assignee:** Gyan (backend — data layer change)
**Routing reason:** Backend-only scope — no frontend file changes
**Release target:** 2026-11-20
**Date:** 2026-11-17
**Source:** Owner directive during Batch C CR-546 review

---

## Context

CR-546 (Discount After Bill Print) records `bill_printed_at` on audit events. The backend currently stores only the **first** bill print timestamp and does not update it on reprints. This is correct for CR-546 audit integrity — but no reprint history is retained anywhere.

If a bill is printed 3 times, only the first timestamp survives. The 2nd and 3rd print events are lost. Future frontend features (reprint count badge, print timeline, reprint audit trail) will need this data.

---

## Requirement

Backend should **log every bill print event** (original + every reprint) with its timestamp, so the full print history is available for current and future audit features.

### What to store (per print event):

| Field | Type | Description |
|-------|------|-------------|
| `order_id` | integer | The order |
| `printed_at` | datetime | When this specific print happened |
| `print_type` | string | `"original"` or `"reprint"` |
| `by` | string | Employee who triggered the print |
| `source` | string | Where print was triggered: `"dashboard"`, `"order_report"`, `"order_beta"`, `"qsr"`, `"collect_payment"` |

### Rules:

1. **Every** call to `update-print-status` or any print trigger should append a row — never overwrite.
2. Existing `bill_printed_at` on the order record stays as-is (first print, used by CR-546 audit). This is a **separate log table**, not a replacement.
3. The print log should be queryable per order (for future order-detail panel) and in aggregate (for future "reprint frequency" reports).
4. No frontend changes needed now — this is data-layer only.

---

## Evidence

- **Source:** Owner directive during Batch C review (2026-11-17)
- **Steps to reproduce:** N/A — this is a data gap, not a bug
- **Confidence:** CONFIRMED (owner-directed)

---

## Duplicate Check

- **DISTINCT** — no existing CR/BUG covers reprint timestamp history
- **RELATED:** CR-546 (uses `bill_printed_at` for discount audit), BUG-659 (reprint content), CR-515 (reprint rights), CR-349 (reprint actions)
- None of the related items store print event history

---

## Blast Radius

- **Backend:** 1 new table/collection + append logic on print endpoints
- **Frontend:** 0 files changed now. Future consumers: AuditLogMockup.jsx, order detail panels
- **Scope:** SMALL (backend data layer only)

---

## Owner Decisions

| # | Question | Status |
|---|----------|--------|
| OD-548-01 | Should reprint log include the print content hash (to detect if bill content changed between prints)? | OPEN |
| OD-548-02 | Should this log be exposed via the existing insights-dashboard endpoint or a new per-order endpoint? | OPEN |

---

## Suggested Backend Approach

```sql
CREATE TABLE order_print_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    restaurant_id INT NOT NULL,
    printed_at DATETIME NOT NULL,
    print_type ENUM('original', 'reprint') NOT NULL,
    printed_by VARCHAR(255),
    source VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_order (order_id),
    INDEX idx_restaurant_date (restaurant_id, printed_at)
);
```

Append a row on every `update-print-status` call and any other print trigger path.

---

```
Intake complete: CR-548
Classification: CR, Severity: P1, Risk: MEDIUM
Duplicate check: DISTINCT (related: CR-546, BUG-659, CR-515, CR-349)
Evidence: Owner-directed during Batch C review
Blast radius: SMALL (backend data layer only, 0 FE files)
Client: ALL
Assignee: Gyan (backend-only)
Release target: 2026-11-20
Docs updated: change_requests/35_CR-548_STORE_ALL_BILL_PRINT_TIMESTAMPS_INTAKE.md, registry.json
Next: Gyan implements backend table + append logic
```
