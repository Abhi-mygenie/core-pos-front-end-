# BUG-469 — Dual Printer Agent: Employee ID Resets After Refresh — INTAKE 2026-09-27

**Source:** OWNER-REPORTED 2026-09-27 (batch intake)
**Sprint:** `oct_bug_batch` · **Gate:** 1 (INTAKE)

---

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Priority | **P2 — MEDIUM** — manual workaround exists (re-enter after each refresh) |
| Risk | MEDIUM — printer config; no financial impact |
| Area | Printer Agent / Bill Content / Settings / localStorage |
| Duplicate check | DISTINCT |
| Code reality | PARTIAL — Bill Content employee config is in FE settings UI |
| Fast Lane | NO |

---

## Description

When **two Printer Agents** are installed, the **Bill Content** employee configuration only properly supports one employee ID. The second Printer Agent requires manual employee ID changes after each page refresh — the value does not persist.

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

- FE: MEDIUM — printer config storage (likely keyed by agent index, not agent ID)
- Scope: SMALL (dual-PA setup only)

---

## Open Questions — OWNER WILL ANSWER LATER

- OD-469-01: Is the employee ID stored per-agent or globally?
- OD-469-02: Does the first agent's employee ID also reset, or only the second?
- OD-469-03: Which localStorage key is being reset?

---

## Next Step

FE investigation: check how `printerAgentConfig` stores employee IDs for multiple agents. Likely needs agent-ID-keyed localStorage instead of index-keyed.
