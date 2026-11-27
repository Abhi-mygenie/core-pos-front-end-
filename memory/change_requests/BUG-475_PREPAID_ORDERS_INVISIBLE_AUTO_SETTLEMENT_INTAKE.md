# BUG-475 — Prepaid Orders Not Visible — Auto Settlement Settles Automatically — INTAKE 2026-09-27

**Source:** OWNER-REPORTED 2026-09-27 (batch intake)
**Sprint:** `oct_bug_batch` · **Gate:** 1 (INTAKE)
**Related:** BUG-481 (Prepaid→Unpaid→COD, different angle)

---

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Priority | **P1 — HIGH** — orders disappear from dashboard before staff can see them |
| Risk | HIGH — order management flow |
| Area | Order Flow / Settlement / Auto-Settle / Config / Backend |
| Duplicate check | DISTINCT |
| Code reality | LOW — auto-settle is likely a backend config or socket-triggered action |
| Fast Lane | NO |

---

## Description

**Prepaid orders** (e.g. online payments, Swiggy prepaid) are being **automatically settled** by the system before staff can see or interact with them on the dashboard. The orders are invisible on the running orders screen.

---

## Evidence

| Item | Detail |
|---|---|
| Source | OWNER-REPORTED |
| Screenshot | Not provided |
| Steps to reproduce | OWNER WILL PROVIDE LATER |
| Confidence | REPORTED |

---

## Blast Radius

- Backend: HIGH — auto-settle config or backend hook
- FE: LOW — FE displays what backend provides; if order is already settled, it won’t show on running orders
- Scope: MEDIUM (all prepaid orders)

---

## Open Questions — OWNER WILL ANSWER LATER

- OD-475-01: Is this a restaurant-level setting (auto_settle_prepaid)? Was it recently changed?
- OD-475-02: Which type of prepaid orders — aggregator (Swiggy/Zomato) or QR/online payment?
- OD-475-03: Are the orders visible in the Audit/All Orders report after they disappear from dashboard?
- OD-475-04: Is this a new behaviour or has it always happened?

---

## Next Step

Check `restaurant_profile.settings.auto_settle_prepaid` (or equivalent) via backend probe. If enabled accidentally — backend config fix. If not enabled but orders are still auto-settling — backend bug in prepaid order flow.
