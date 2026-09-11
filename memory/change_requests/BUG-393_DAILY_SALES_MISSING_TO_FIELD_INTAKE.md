# BUG-393 — Daily Sales Report: Missing `to` Field in API Payload

**ID:** BUG-393
**Type:** Bug
**Date registered:** 2026-09-10
**Status:** ~~INTAKE~~ → **SUBSUMED by CR-377 (2026-09-10)**
**Source:** Investigation INV-SALES-REPORT-REINVESTIGATION_2026_09_10.md
**Sprint (suggested):** pos_7_0

---

## Classification

| Field | Value |
|---|---|
| **Priority** | P2 (downgraded from initial P1 assessment) |
| **Risk** | LOW |
| **Fast Lane eligible** | NO — 2 call sites found (INTAKE update 2026-09-10) |
| **Gate** | 1 — INTAKE |
| **Status** | INTAKE — awaiting Fast Lane approval (OD-BUG393-01) |

---

## Description

`getDailySalesReport` in `reportService.js` sends an incomplete API payload — the `to` field is missing.

**Correct payload (per owner curl):**
```json
{ "from": "2026-09-10", "to": "2026-09-10" }
```

**Current code (`reportService.js:398–400`):**
```js
const response = await api.post(API_ENDPOINTS.DAILY_SALES_REPORT, {
  from: dateStr,   // ← only 'from' sent
  // 'to' is missing
});
```

---

## Impact Assessment (Post Live-Probe)

**Backend behaviour confirmed by 3 probes:**
- Without `to`: backend auto-defaults `to` = end-of-business-day for `from` date
- With `to` same as `from`: identical response
- Result: **No wrong data is returned today** — backend handles the gap gracefully

**Why still fix:**
- API contract compliance (`to` is a documented required field per owner curl)
- Defensive: if backend removes the default, all past-date reports silently return wrong data
- Completes CR-377 alignment (consistent payload before redesign)

---

## Fix

**File:** `src/api/services/reportService.js`
**Line:** 399
**Change:**
```js
// Before:
  from: dateStr,

// After:
  from: dateStr,
  to: dateStr,
```

**File 1:** `src/api/services/reportService.js:399` → add `to: dateStr`
**File 2:** `src/api/services/orderLedgerService.js:257` → add `to: d` (loop in `getTabSettlementsForRange`)
**Lines changed:** 2 total (1 per file)
**Files changed:** 2

> **INTAKE UPDATE (2026-09-10):** Second call site discovered during official INTAKE code scan. `orderLedgerService.js:257` calls the same `DAILY_SALES_REPORT` endpoint in a date-range loop with `{ from: d }` only — also missing `to`.

---

## Evidence

- Probe results: `/app/memory/investigations/INV-SALES-REPORT-REINVESTIGATION_2026_09_10.md` § Probes P1–P3
- Live response: `/app/memory/evidence/INV-SALES-REPORT-REINV-001/live_response_2026_09_10.json`
- Source: AGENT-DISCOVERED via code trace + live API probe
- Confidence: CONFIRMED

---

## Duplicate Check

DISTINCT — no existing BUG covers this payload field.

---

## Blast Radius

- Files: 1 (`reportService.js`)
- Lines: 1
- Consumers: `OrderSummaryPage.jsx` only
- Hotspot: NO
- Scope: SMALL

---

## Subsumption Decision

**Owner decision (2026-09-10):** BUG-393 absorbed into CR-377.

The `to: dateStr` fix will be applied as part of the CR-377 `reportService.js` transform rewrite.
No separate implementation, gate flow, or QA needed for BUG-393.

**Implementing agent note:** When writing the new `getDailySalesReport` transform for CR-377,
ensure the POST payload includes `{ from: dateStr, to: dateStr }`.

---

*CLOSED — SUBSUMED by CR-377.*
