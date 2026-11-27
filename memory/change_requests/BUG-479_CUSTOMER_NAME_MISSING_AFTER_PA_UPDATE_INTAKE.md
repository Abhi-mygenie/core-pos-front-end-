# BUG-479 — Customer Name Missing After Printer Agent Update — INTAKE 2026-09-27

**Source:** OWNER-REPORTED 2026-09-27 (batch intake)
**Sprint:** `oct_bug_batch` · **Gate:** 1 (INTAKE)

---

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Priority | **P2 — MEDIUM** |
| Risk | MEDIUM — CRM lookup broken in PA |
| Area | CRM / Printer Agent / Customer Lookup |
| Duplicate check | DISTINCT |
| Code reality | PARTIAL — CRM phone lookup exists in FE (works); PA has its own lookup |
| Fast Lane | NO |

---

## Description

After a **Printer Agent update**, entering a customer phone number in the PA does **not retrieve the customer name**. The same phone number entered in the app (browser POS) correctly retrieves the customer. The PA's CRM lookup appears to have broken post-update.

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

- OD-479-01: Which PA version was this introduced in?
- OD-479-02: Does the PA show an error or just return empty?
- OD-479-03: Is the PA using a different API base URL for CRM after the update?

---

## Next Step

PA team: check CRM lookup endpoint called by PA post-update. May be a stale API base URL or auth token not forwarded to CRM call.
