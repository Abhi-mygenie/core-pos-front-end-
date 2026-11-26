# BUG-612 — Intake (Gate 1)
## Reports slow for long date ranges (year+)

**ID:** BUG-612
**Type:** BUG
**Date:** 2026-10-22
**Sprint:** backlog
**Area:** Reports / Analytics
**Priority:** P2
**Risk:** LOW
**Source:** OWNER-REPORTED + INVESTIGATION
**Duplicate check:** DISTINCT (related BUG-353 which added FE chunking)
**Status:** GATE_1_INTAKE_BACKEND_BLOCKED

---

## Description
Multiple report pages become very slow when selecting date ranges of a year or more. The FE already implements chunking for Order Report Beta (BUG-353: `_splitBetaDateRange`), but the underlying backend queries are the bottleneck.

## Evidence
- Owner reports: "lot of reports specially if we select for year or more"
- API probe: Order logs endpoint returned 403 (couldn't measure), Cancellations 365-day returned 0.6s (acceptable for Goan Kitchen but may be worse on high-volume restaurants)
- FE chunking already exists for Order Report Beta

## Root Cause
**Backend:** Report query performance degrades with large date ranges — no query-level pagination or pre-aggregation for historical data.
**FE:** Already mitigated with BUG-353 chunking on Order Report Beta. Other report pages may need similar chunking if not already implemented.

## Fix Needed
**Backend (primary):** Query optimization — indexing, pre-aggregation, or server-side pagination for date-range queries.
**FE (secondary):** Audit remaining report pages for chunking — some may still send single large-range requests.

## Blast Radius
Backend query layer. FE impact minimal.
