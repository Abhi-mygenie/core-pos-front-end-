# BUG-476 — Printer Agent Direct Print Mode — Bill and KOT Both Stopped — INTAKE 2026-09-27

**Source:** OWNER-REPORTED 2026-09-27 (batch intake)
**Sprint:** `oct_bug_batch` · **Gate:** 1 (INTAKE)

---

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Priority | **P1 — HIGH** — all printing broken after config change |
| Risk | HIGH — operations blocked |
| Area | Printer Agent / Direct Print / Config |
| Duplicate check | DISTINCT |
| Code reality | NONE in FE — Printer Agent internal config |
| Fast Lane | NO |

---

## Description

After changing **Printer Agent setting to Direct Print mode**, both **Bill printing and KOT printing stopped working entirely**. Reverting the config or re-configuring has not been described yet.

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

- FE: NONE
- Printer Agent: HIGH — Direct Print mode regression
- Scope: SMALL (one config change broke all printing)

---

## Open Questions — OWNER WILL ANSWER LATER

- OD-476-01: What PA version was this on? Was Direct Print ever working before?
- OD-476-02: Does the PA show any error in its logs?
- OD-476-03: What printer model/protocol — USB, network, or Bluetooth?
- OD-476-04: Was this on the same machine or a new setup?

---

## Next Step

Escalate to **Printer Agent team**. Direct Print mode regression — requires PA log inspection and config validation.
