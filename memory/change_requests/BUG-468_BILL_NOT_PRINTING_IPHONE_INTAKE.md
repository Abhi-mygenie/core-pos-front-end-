# BUG-468 — Bill Not Printing from iPhone — INTAKE 2026-09-27

**Source:** OWNER-REPORTED 2026-09-27 (batch intake)
**Sprint:** `oct_bug_batch` · **Gate:** 1 (INTAKE)

---

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Priority | **P1 — HIGH** — billing blocked on iPhone |
| Risk | MEDIUM — print flow; no financial logic change |
| Area | Print / Printer Agent / iOS / Safari |
| Duplicate check | DISTINCT |
| Code reality | PARTIAL — print trigger is in FE but iOS-specific behaviour is Printer Agent/network |
| Fast Lane | NO |

---

## Description

Bill printing does not work when triggered from an **iPhone** (Safari/iOS). The same print action works correctly from other devices.

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

- FE: LOW — print is triggered via WebSocket/HTTP to Printer Agent
- iOS/Safari: MEDIUM — iOS WebSocket behaviour or network restriction may block PA connection
- Scope: SMALL (1 device type)

---

## Open Questions — OWNER WILL ANSWER LATER

- OD-468-01: Does KOT also fail, or only Bill?
- OD-468-02: Is the iPhone on the same network as the Printer Agent?
- OD-468-03: What iOS version? Does it fail silently or show an error?
- OD-468-04: Was it ever working on iPhone, or has it always failed?

---

## Next Step

Printer Agent team: verify iOS Safari WebSocket compatibility with PA. Check if PA accepts connections from mobile devices on the same LAN.
