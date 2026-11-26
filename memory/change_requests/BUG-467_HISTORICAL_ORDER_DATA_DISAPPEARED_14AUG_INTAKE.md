# BUG-467 — Historical Order Data Disappeared on 14 Aug — INTAKE 2026-09-27

**Source:** OWNER-REPORTED 2026-09-27 (batch intake)
**Sprint:** `oct_bug_batch` · **Gate:** 1 (INTAKE)
**Related investigation:** `investigations/BATCH_INVESTIGATION_32_ITEMS_2026_09_27.md`

---

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Priority | **P0 — CRITICAL** — financial/order data loss |
| Risk | CRITICAL — potential data loss or reporting gap |
| Area | Reports / Backend / Data / Order History |
| Duplicate check | DISTINCT |
| Code reality | NOT IN FE — FE displays what API returns |
| Fast Lane | NO |

---

## Description

On **14 August**, all historical order data disappeared from the system. Only approximately **10 orders** were visible, and all were showing as **unpaid**. Prior order history was not accessible.

This is a **critical data integrity issue** that may affect financial reports, settlement reconciliation, and audit history.

---

## Evidence

| Item | Detail |
|---|---|
| Source | OWNER-REPORTED |
| Date of occurrence | 14 August 2026 |
| Screenshot | Not provided |
| Steps to reproduce | OWNER WILL PROVIDE LATER |
| Confidence | REPORTED |

---

## Blast Radius

- FE: LOW — possible stale date filter in localStorage/InsightsCacheContext
- Backend: HIGH — `order-logs-report` API may have had a query regression or DB issue
- Scope: LARGE — affects all historical reporting

---

## Hypotheses (from investigation)

1. **H1:** FE date filter cached as "14 Aug only" in InsightsCacheContext → showing only that day's orders
2. **H2:** Backend DB query regression — data not returned for dates before cutoff
3. **H3:** API pagination cap returned only last N orders

---

## Open Questions — OWNER WILL ANSWER LATER

- OD-467-01: Was the data missing in ALL reports or only specific report pages?
- OD-467-02: Was this a one-time occurrence or does it happen repeatedly?
- OD-467-03: Which restaurant/outlet experienced this?
- OD-467-04: Was data visible again after a refresh or re-login?
- OD-467-05: What was the date range selected in the report filter when this happened?

---

## Next Step

Backend probe (CRITICAL): `GET /api/v2/vendoremployee/order-logs-report?start_date=2026-08-01&end_date=2026-08-31` — verify data exists in backend. If data is present → FE date filter issue. If absent → backend/DBA team investigation required.
