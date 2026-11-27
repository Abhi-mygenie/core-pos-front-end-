# BUG-480 — Cancel After Serve Option Not Enabled / Available — INTAKE 2026-09-27

**Source:** OWNER-REPORTED 2026-09-27 (batch intake)
**Sprint:** `oct_bug_batch` · **Gate:** 1 (INTAKE)

---

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Priority | **P1 — HIGH** — cancellation flow blocked after serving |
| Risk | MEDIUM |
| Area | Order Entry / Permissions / Config / Cancel Flow |
| Duplicate check | DISTINCT |
| Code reality | POSSIBLE FE — `canCancelOrder = hasPermission('order_cancel')` exists |
| Fast Lane | NO |

---

## Description

The **Cancel After Serve** option is not enabled or not visible. After an item is served (KOT printed/served status), the cancel option should still be available under certain configurations, but it is absent.

---

## Evidence

| Item | Detail |
|---|---|
| Source | OWNER-REPORTED |
| Screenshot | Not provided |
| Steps to reproduce | OWNER WILL PROVIDE LATER |
| Confidence | REPORTED |

---

## Open Questions — OWNER WILL ANSWER LATER

- OD-480-01: Is `order_cancel` permission assigned to the affected user role?
- OD-480-02: Is there a separate `cancel_after_serve` setting in Restaurant Settings?
- OD-480-03: What order state does this occur at — served items only, or all items after KOT?
- OD-480-04: Was Cancel After Serve previously available and then stopped, or never available?

---

## Next Step

Check `canCancelOrder` gate in `OrderEntry.jsx` and `Restaurant Settings` for a `cancel_after_serve` toggle. If the permission exists but the UI gate is overly restrictive — FE fix. If it’s a missing config toggle — CR.
