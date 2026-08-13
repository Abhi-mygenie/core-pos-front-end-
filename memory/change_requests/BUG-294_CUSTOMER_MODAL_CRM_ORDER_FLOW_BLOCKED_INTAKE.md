# BUG-294 Intake — CustomerModal CRM Calls Block Order Flow on 401

**ID:** BUG-294
**Date:** 2026-08-05
**Source:** AGENT-DISCOVERED — INV-001 investigation report (`/app/memory/evidence/INV-001-002_INVESTIGATION_REPORT.md`)
**Confidence:** CONFIRMED — HIGH (root cause traced to exact lines, matching pattern exists in codebase)

---

## 1. Summary

When CRM returns a 401 (or any error), `CustomerModal.jsx` blocks the cashier with "Failed to save customer" and prevents order placement. The fix pattern already exists in `RoomCheckInModal.jsx` (BUG-092, lines 598–613) — CRM errors are caught in a non-blocking `try/catch` and the flow proceeds without a `customer_id`. `CustomerModal` never adopted this pattern.

---

## 2. Classification

| Field | Value |
|---|---|
| Type | BUG |
| Severity | **P1 — HIGH** |
| Risk | **HIGH** |
| Risk reason | Touches order flow — CustomerModal is on the critical path for customer-linked orders (dine-in name, delivery, room transfer). CRM 401 → cashier cannot save customer → order blocked. |
| Fast Lane eligible | NO — touches order flow hotspot path |
| Classification | CODE_ERROR — CustomerModal doesn't follow BUG-092 non-blocking CRM pattern |
| Sprint | pos_5_1 |

**Severity rationale:** P1 — feature broken (order flow blocked), but workaround exists (skip customer entry entirely or rely on CRM being up). Not P0 because cash orders without customer still work.

---

## 3. Root Cause

Three unprotected CRM calls in `CustomerModal.jsx` throw to outer catch on any CRM error:

| Line | Call | Protection | 401 Behaviour |
|---|---|---|---|
| L285 | `await updateCustomer(...)` | NONE | Throws → outer catch L379 → `setError('Failed to save customer')` |
| L307 | `await lookupCustomer(...)` | Partial (CRM_TIMEOUT only) | 401 re-thrown at L319 → outer catch L379 → `setError('Failed to save customer')` |
| L352 | `await createCustomer(...)` | NONE | Throws → outer catch L379 → `setError('Failed to save customer')` |

**Correct pattern (BUG-092, `RoomCheckInModal.jsx:598–613`):**
```js
try {
  const existing = await lookupCustomer(phone10);
  // ...create or reuse
} catch (crmErr) {
  console.warn('[RoomCheckIn] BUG-092: CRM lookup/create failed, proceeding without customer_id:', crmErr);
  // check-in proceeds with customerId = null
}
```

**Proposed fix:** Wrap all 3 CRM calls in `CustomerModal.jsx` in a non-blocking `try/catch` matching BUG-092. On CRM failure, generate a local fallback `CUST-{timestamp}` ID and proceed. Customer data still reaches the POS backend (order payload), CRM sync degrades gracefully.

---

## 4. Evidence

| Field | Value |
|---|---|
| Screenshot | Not provided (AGENT-DISCOVERED) |
| Steps to reproduce | 1. Ensure CRM token is invalid/expired or CRM is returning 401. 2. Open any order → click "Add Customer" → enter phone. 3. Observe: modal shows "Failed to save customer", cannot proceed. |
| Curl output | Not applicable (FE-only fix) |
| Source | AGENT-DISCOVERED via INV-001 investigation |
| Confidence | CONFIRMED (code traced to exact lines) |
| Evidence artifact | `/app/memory/evidence/INV-001-002_INVESTIGATION_REPORT.md` §INV-001 |

---

## 5. Duplicate Check

| Check | Result |
|---|---|
| ID search (registry + trackers) | No exact match |
| BUG-090 | RELATED — CRM customer_id not stored on room orders (different file: RoomCheckInModal, different symptom: missing customer_id vs blocking error). DISTINCT scope. |
| BUG-078 | RELATED — visible error on CRM timeout (CLOSED). That fix covered timeout only; L307 `lookupCustomer` has partial CRM_TIMEOUT guard but 401 is re-thrown. DISTINCT. |
| CR-128 | RELATED — B2B customer CRM wiring (IMPLEMENTED). Different file (customerTransform + RoomCheckInModal). DISTINCT. |
| **Verdict** | **DISTINCT** |

---

## 6. Blast Radius

```bash
grep -rn "CustomerModal" /app/frontend/src/ → 16 references
```

| Metric | Value |
|---|---|
| Files that WILL change | 1 (`components/order-entry/CustomerModal.jsx`) |
| Lines changed (estimate) | ~15 lines (3 try/catch wraps matching BUG-092 pattern) |
| Hotspot files touched | YES — CustomerModal is on order entry path |
| Estimated scope | **SMALL** (1 file, <20 lines) |

---

## 7. Code Reality

| Check | Result |
|---|---|
| `CustomerModal.jsx` exists | YES — `/app/frontend/src/components/order-entry/CustomerModal.jsx` |
| BUG-092 non-blocking pattern exists | YES — `RoomCheckInModal.jsx:598–613` (exact template to copy) |
| Fix already applied to CustomerModal | NO — grep confirmed no non-blocking CRM catch in CustomerModal |
| **Code Reality** | **PARTIAL** (file exists, bug present, fix not applied) |

---

## 8. Open Questions

None. Root cause confirmed, fix pattern exists. No owner decisions required — BUG-092 precedent is the authoritative pattern.

---

## 9. Owner Decisions Needed

None. Applying BUG-092 non-blocking pattern to CustomerModal is a direct code fix with no business rule ambiguity.

---

## Intake Summary

```
Intake complete: BUG-294
Classification: BUG, Severity: P1, Risk: HIGH
Duplicate check: DISTINCT (BUG-090 RELATED — different file/symptom)
Evidence: CONFIRMED via INV-001 (code trace, exact lines identified)
Blast radius: SMALL (~1 file, ~15 lines, hotspot-adjacent: YES)
Code reality: PARTIAL (file exists, fix not applied)
Docs updated: change_requests/BUG-294_CUSTOMER_MODAL_CRM_ORDER_FLOW_BLOCKED_INTAKE.md
Next: Planning Gate 2
```
