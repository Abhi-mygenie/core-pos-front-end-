# BUG-478 — Printer Agent Token Expired Twice Unexpectedly — INTAKE 2026-09-27

**Source:** OWNER-REPORTED 2026-09-27 (batch intake)
**Sprint:** `oct_bug_batch` · **Gate:** 1 (INTAKE)

---

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Priority | **P2 — MEDIUM** |
| Risk | MEDIUM — requires manual re-auth; disruptive |
| Area | Printer Agent / Authentication / Token |
| Duplicate check | DISTINCT |
| Code reality | NONE in FE |
| Fast Lane | NO |

---

## Description

The **Printer Agent authentication token expired twice unexpectedly**, requiring manual re-authentication. The token should either have a longer TTL or auto-refresh.

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

- OD-478-01: How long did the token last before expiry (hours/days)?
- OD-478-02: Was the PA running continuously or restarted between expirations?
- OD-478-03: Does re-login from the PA restore functionality immediately?

---

## Next Step

Escalate to **Backend + Printer Agent team**: check token TTL config, implement refresh token / keep-alive for PA auth.
