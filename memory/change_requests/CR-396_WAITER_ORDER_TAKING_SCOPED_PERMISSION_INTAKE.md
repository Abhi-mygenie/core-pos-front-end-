# CR-396 — Waiter: Order Taking Access with Serve-Only Permission Scope — INTAKE 2026-09-27

**Source:** OWNER-REPORTED 2026-09-27 (batch intake)
**Sprint:** `oct_cr_batch` · **Gate:** 1 (INTAKE)
**Related:** BUG-470 (edit permission missing — different issue; that’s a bug fix, this is a new scoped feature)

---

## Classification

| Field | Value |
|---|---|
| Type | CR |
| Priority | **P2 — MEDIUM** |
| Risk | HIGH — permissions change affects access control |
| Area | Permissions / Order Entry / Waiter Role |
| Duplicate check | DISTINCT from BUG-470 |
| Code reality | NONE |
| Fast Lane | NO |

---

## Requirement

A waiter should be able to:
1. **Take orders** (place new orders)
2. BUT only **serve orders assigned to their tables/sections** according to configured permissions

This is a **new permission scope feature** — not just a missing guard (BUG-470), but a new concept of table/section-scoped order access.

---

## Open Questions — OWNER WILL ANSWER LATER

- OD-396-01: Is “assigned tables/sections” configured per employee or per role?
- OD-396-02: Should the waiter see ALL orders but only be able to act on assigned ones, or only see their assigned orders?
- OD-396-03: Does the backend already have a concept of table assignment per waiter?
- OD-396-04: Is this related to the existing `waiterId` field in order payload?

---

## Next Step
Gate 2 GO after owner answers. High-risk — permission architecture change.
