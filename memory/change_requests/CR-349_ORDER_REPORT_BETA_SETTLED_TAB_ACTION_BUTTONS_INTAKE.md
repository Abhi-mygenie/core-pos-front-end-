# CR-349 — OrderReportBetaPage: Wire Action Buttons on Settled Tab

**Date:** 2026-08-26
**Registered by:** INTAKE agent
**Source:** AGENT-DISCOVERED (INVESTIGATION_REPORT_BATCH_2026_08_26.md, Issue 4c)
**Sprint:** POS 5.1 backlog

---

## Classification

| Field | Value |
|---|---|
| Type | CR (MISSING_FEATURE) |
| Severity | P2 |
| Risk | MEDIUM |
| Side | Frontend |
| Duplicate check | DISTINCT |
| Code reality | NONE (settled tab exists; action buttons absent) |
| Blast radius | SMALL (1 file: OrderReportBetaPage.jsx) |
| Fast Lane eligible | NO (MEDIUM risk, multiple new wiring points) |

## Description

`OrderReportBetaPage` has a custom-built table — unlike `AllOrdersReportPage` which uses the shared `OrderTable` component with full `actionsConfig` wiring (Change / Unpaid / Reprint). The Beta page's Settled tab has **zero action buttons**: only a Refund action exists (added via CR-165). Front-desk staff cannot perform Change, mark Unpaid, or Reprint directly from the Beta Report's Settled tab.

## Scope

Wire the following actions on the Settled tab rows in `OrderReportBetaPage`:
1. **Change** — reopen an already-settled order for modification
2. **Unpaid** — mark a settled order as unpaid
3. **Reprint** — reprint bill/KOT for a settled order

These actions already exist on `AllOrdersReportPage` via `OrderTable`'s `actionsConfig`. The pattern must be replicated in `OrderReportBetaPage`.

## Owner Decision — LOCKED 2026-08-26

**OD-1: Option B — Wire action buttons directly into `OrderReportBetaPage`'s own custom table. Do NOT adopt `OrderTable` component.**
Keep the Beta page layout exactly as-is. Add Change / Unpaid / Reprint inline in the settled tab rows.

**OD-2: All three actions applicable** — Change, Unpaid, Reprint on settled tab rows (mirrors AllOrdersReportPage behaviour).

## Evidence

- File: `src/pages/reports-module/OrderReportBetaPage.jsx` (settled tab, lines ~71-84)
- Reference pattern: `AllOrdersReportPage.jsx` + `OrderTable.jsx` actionsConfig
- Confidence: HIGH (code-confirmed: no action buttons in settled tab)

## Next Gate

Gate 2 (Impact Analysis) — confirm action API contracts + `OrderTable` reuse feasibility.
