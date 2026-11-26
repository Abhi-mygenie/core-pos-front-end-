# BUG-640 — fmtISO Timezone Bug — Date Presets Off By 1 Day in IST

**ID:** BUG-640  **Type:** BUG  **Registered:** 2026-11-02  **Sprint:** nov_cr_batch
**Severity:** P1  **Risk:** HIGH  **Status:** GATE_1_INTAKE_COMPLETE
**Source:** OWNER-REPORTED (screenshot: LM shows 30/09→30/10 instead of 01/10→31/10, 2026-11-02)
**Related:** CR-422 (LM preset implementation)

## Description
`fmtISO()` at CancellationsMockup L52 (and used across 36 report pages) converts dates using `d.toISOString().slice(0, 10)`. `toISOString()` converts to UTC. In IST (UTC+5:30) browsers, midnight local time = 18:30 previous day UTC, causing all preset dates to shift back by 1 day.

**Example (Nov 2, IST browser):**
- LM should set: Oct 1 → Oct 31
- `new Date(2026, 9, 1)` = Oct 1 00:00 IST = Sep 30 18:30 UTC
- `toISOString().slice(0,10)` = `"2026-09-30"` ← OFF BY 1
- Result: FROM 30/09 TO 30/10 (owner screenshot confirms this exact bug)

**Affects:** ALL date presets (Today, 7D, LM, MTD, FY) on ALL 36 report pages that use this pattern.

## Evidence
- Owner screenshot: Cancellations page LM showing FROM 30/09/2026 TO 30/10/2026
- Node.js proof: `new Date(Date.UTC(2026, 9, 1) - 5.5*3600000).toISOString().slice(0,10)` → `"2026-09-30"`
- 36 files use `toISOString().slice(0, 10)` pattern
- Confidence: CONFIRMED

## Duplicate Check
**DISTINCT.** No existing bug covers this timezone issue.

## Code Reality
**NONE** — no fix exists. All 36 pages have the same vulnerable `fmtISO` pattern.

## Affected Files
36 report pages in `/app/frontend/src/pages/reports-module/*.jsx` — each has its own inline `fmtISO` or uses `toISOString().slice(0, 10)` directly.

## Blast Radius
**LARGE** — 36 files. But fix is mechanical: same 1-line change in each file.

## Fix Scope
Replace `toISOString()` with local date formatting:
```js
const fmtISO = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
```
Or extract to a shared utility and import everywhere.

## Risk Classification
- **Risk:** HIGH — affects date ranges on ALL Insights reports for IST users (primary userbase)
- **Fast Lane eligible:** NO (36 files, HIGH risk)
