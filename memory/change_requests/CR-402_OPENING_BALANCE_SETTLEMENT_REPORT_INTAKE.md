# CR-402 — Opening Balance Details in Settlement Report — INTAKE 2026-09-27

**Source:** OWNER-REPORTED 2026-09-27 (batch intake)
**Sprint:** `oct_cr_batch` · **Gate:** 1 (INTAKE)

---

## Classification

| Field | Value |
|---|---|
| Type | CR |
| Priority | **P2 — MEDIUM** |
| Risk | HIGH — financial reporting; Settlement Report is financial |
| Area | Reports / Settlement / Day Closure |
| Duplicate check | DISTINCT |
| Code reality | NONE — opening balance not in current SettlementReportMockup |
| Fast Lane | NO |

---

## Requirement

The **Settlement Report** should display the **opening cash balance** at the start of each shift, allowing staff and managers to reconcile end-of-shift cash against opening + collections.

---

## Open Questions — OWNER WILL ANSWER LATER

- OD-402-01: Does the backend track opening balance per shift/session? Which API field?
- OD-402-02: Is opening balance entered manually by staff or derived from previous day’s closing?
- OD-402-03: Which report screen — `/reports-module/settlement` or `/day-closure`?
- OD-402-04: Should it appear in the Day Closure screen as well?

---

## Next Step
Gate 2 GO after owner answers. HIGH risk — financial report.
