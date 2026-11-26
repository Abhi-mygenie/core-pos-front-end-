# BUG-354 — OrderReportBetaPage: Status Column Missing / Null for Some Order Types

**Date:** 2026-08-26
**Registered by:** INTAKE agent
**Source:** AGENT-DISCOVERED (INVESTIGATION_REPORT_BATCH_2026_08_26.md, Issue 4b)
**Sprint:** POS 5.1 backlog

---

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Severity | P2 |
| Risk | MEDIUM |
| Side | Frontend |
| Root cause | DATA_EDGE |
| Duplicate check | DISTINCT |
| Code reality | NONE (status column exists in code; bug is in deriveStatus logic) |
| Blast radius | SMALL (1 file, deriveStatus function) |
| Fast Lane eligible | NO (needs live test to confirm exact failure rows) |

## Description

The Status column in Beta Order Report (`OrderReportBetaPage.jsx`) is implemented (lines 467/487), but returns `null` for certain order types. Investigation confirmed `deriveStatus()` exists but has edge cases where it falls through without returning a value.

## Root Cause Hypothesis

`deriveStatus()` in `OrderReportBetaPage.jsx` does not handle all `fOrderStatus` / `paymentMethod` combinations → returns null → status cell renders blank.

## Investigation Required (Gate 2)

Trace `deriveStatus()` against live order data:
1. Which `fOrderStatus` values produce null from `deriveStatus()`?
2. Are these edge cases specific to TAB, Hold, Aggregator or other order types?

## Evidence

- File: `src/pages/reports-module/OrderReportBetaPage.jsx` lines 467, 487
- Steps: Open Beta Report → find rows where Status column is blank
- Confidence: MEDIUM (needs live test)

## Owner Decisions Needed

None yet — needs investigation before planning.
