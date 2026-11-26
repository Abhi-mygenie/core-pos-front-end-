# CR-546 — Discount After Bill Print: Audit Event (Apply & Remove)

**ID:** CR-546
**Type:** CR (Feature Request)
**Date:** 2026-11-17
**Reported by:** Owner (Abhishek)
**Priority:** P0 — Must have this sprint
**Risk:** HIGH (audit/compliance, fraud detection)
**Client:** ALL (platform-wide)
**Assignee:** Gyan (backend) → Abhishek (frontend, once unblocked)
**Routing reason:** Backend-blocked — needs backend to detect and emit events
**Sprint:** nov_cr_batch

---

## 1. Description

Track when staff applies or removes a discount on an order **after the bill has already been printed**. This is a fraud/compliance audit event — discounting after print can indicate post-settlement manipulation.

Two distinct actions to track:
1. **Discount applied** after bill was printed
2. **Discount removed** after bill was printed

Both should appear in the Order Edit Audit page (`AuditLogMockup.jsx`) alongside the existing 5 event types (make_unpaid, payment_method_change, item_cancel_after_print, order_cancel_after_print, order_edit_after_print).

---

## 2. Classification

- **Type:** CR (new audit event type)
- **Severity:** P0 — CRITICAL fraud detection capability
- **Risk:** HIGH (audit/compliance report, financial visibility)
- **Fast Lane eligible:** NO (backend dependency, 2+ event types, touches audit data)

---

## 3. Owner Decisions (LOCKED)

| # | Decision | Owner Answer | Date |
|---|----------|-------------|------|
| OD-546-01 | What to track? | Both discount apply AND discount remove after bill print | 2026-11-17 |
| OD-546-02 | Which clients? | ALL restaurants (platform-wide) | 2026-11-17 |
| OD-546-03 | Priority? | P0 — must have this sprint | 2026-11-17 |

---

## 4. Duplicate Check

**Result: DISTINCT**

| Checked Against | Result |
|----------------|--------|
| CR-528 (post-print audit events) | RELATED but CR-528 covers cancel/edit, NOT discount. CR-546 adds discount events to same page. |
| CR-513 (discount_percentage in bill print payload) | DISTINCT — CR-513 is about print payload, not audit. |
| CR-529 (OTP guard for cancel/discount/comp) | DISTINCT — CR-529 is about access control, not audit logging. |
| CR-444 (revenue report with discounts) | DISTINCT — CR-444 is about revenue reporting, not audit. |
| CR-543 (late cancellation threshold) | DISTINCT — CR-543 is about cancel time threshold, not discount. |
| CR-544 (cancel after unpaid) | DISTINCT — CR-544 is about cancel-after-unpaid chain, not discount. |
| BUG-614 (preset discount apply bug) | DISTINCT — BUG-614 was a code bug, not audit. |

---

## 5. Evidence

- **Screenshot:** Not applicable (event type doesn't exist yet)
- **Steps to reproduce:** N/A — new feature
- **Source:** OWNER-REPORTED (identified during CR-528 review)
- **Confidence:** CONFIRMED (owner explicitly requested)

---

## 6. Blast Radius

```
Frontend (once backend delivers):
  AuditLogMockup.jsx — 1 file, ~20 lines
    - 2 new type entries in AUDIT_TYPE_MAP
    - 2 new KPI cards
    - Type-specific column rendering (discount_amount, discount_type)
    - 2 new KPIs in export
    - Updated subtitle

Backend (Gyan):
  insights-dashboard → audits — detection logic + 2 new event types + 2 KPI counts
```

- **Blast radius:** SMALL (1 FE file, ~20 lines once backend delivers)
- **Hotspot files touched:** NO (AuditLogMockup.jsx is NOT an R5 hotspot)
- **Estimated scope:** SMALL (1 file)

---

## 7. Proposed Backend Contract

### New event types in `insights-dashboard` → `audits.orders[]`:

#### a) `discount_apply_after_print`
```json
{
  "type": "discount_apply_after_print",
  "order_id": "021544",
  "amount": 350.00,
  "discount_amount": 50.00,
  "discount_type": "percent",
  "discount_value": 10,
  "by": "Manager",
  "bill_printed_at": "2026-11-17T14:10:00",
  "discount_time": "2026-11-17T14:15:00"
}
```

#### b) `discount_remove_after_print`
```json
{
  "type": "discount_remove_after_print",
  "order_id": "021544",
  "amount": 350.00,
  "discount_amount": 50.00,
  "discount_type": "percent",
  "discount_value": 10,
  "by": "Manager",
  "bill_printed_at": "2026-11-17T14:10:00",
  "discount_time": "2026-11-17T14:20:00"
}
```

### New KPI counts:

| Field | Type |
|-------|------|
| `discount_apply_after_print_count` | integer |
| `discount_remove_after_print_count` | integer |

### Detection logic:
For each order where `bill_printed_at IS NOT NULL`:
- If a discount was applied WHERE `discount_applied_at > bill_printed_at` → emit `discount_apply_after_print`
- If a discount was removed WHERE `discount_removed_at > bill_printed_at` → emit `discount_remove_after_print`

### `total` update:
`total` should now sum all 7 counts (was 5 after CR-528): make_unpaid + payment_method_change + item_cancel + order_cancel + order_edit + discount_apply + discount_remove.

---

## 8. FE Implementation Preview (once backend delivers)

| Edit | File | Change | Lines |
|------|------|--------|-------|
| E1 | AuditLogMockup.jsx | Add 2 entries to `AUDIT_TYPE_MAP` | +2 |
| E2 | AuditLogMockup.jsx | Add 2 filter + count lines to analytics memo | +6 |
| E3 | AuditLogMockup.jsx | Add 2 KPI cards (grid stays `lg:grid-cols-6` → may need `grid-cols-4 lg:grid-cols-8`) | +6 |
| E4 | AuditLogMockup.jsx | Add `discount_amount`, `discount_type` columns to table | +4 |
| E5 | AuditLogMockup.jsx | Add 2 KPIs + 2 columns to export payload | +4 |
| **Total** | **1 file** | | **~22 lines** |

---

## 9. Dependencies

| # | Dependency | Type | Status |
|---|-----------|------|--------|
| D1 | Backend: `discount_apply_after_print` + `discount_remove_after_print` events | BLOCKING | NOT STARTED — backend brief to be filed |
| D2 | CR-528 implemented (page exists with 5 types) | SATISFIED | ✅ GATE_5A_IMPLEMENTED |

---

## 10. Related Items

| ID | Relationship |
|----|-------------|
| CR-528 | PARENT — same page, same endpoint, additive event types |
| CR-543 | SIBLING — late cancellation audit (also backend-blocked) |
| CR-544 | SIBLING — cancel-after-unpaid audit (also backend-blocked) |
| CR-529 | ADJACENT — OTP guard for discount actions (access control, not audit) |

---

```
Intake complete: CR-546
Classification: CR, Severity: P0, Risk: HIGH
Duplicate check: DISTINCT (related to CR-528)
Evidence: owner-reported (feature request)
Blast radius: SMALL (1 FE file, ~22 lines once backend delivers)
Client: ALL
Assignee: Gyan (backend) → Abhishek (frontend)
Docs updated: change_requests/37_CR-546_DISCOUNT_AFTER_BILL_PRINT_AUDIT_INTAKE.md
Next: Backend brief → Planning Gate 2 (once backend delivers)
```
