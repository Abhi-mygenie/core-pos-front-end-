# Session Handoff Brief — 2026-11-06
## Order Beta Report Enhancements — For Next INTAKE Agent

### Context
Owner provided an Excel file (`source/Order_Beta_Report_Enhancement_Requirements.xlsx`) with 10 enhancement requirements for the Order Beta Report page. These were analyzed, code-traced, and drafted as intake docs in this session.

### What the next INTAKE agent MUST do

**Step 1 — Load the LATEST registry**
```
READ /app/memory/control/registry.json
```
Do NOT trust the CR numbers (CR-503..511) in these intake docs blindly. The registry may have changed since this session. Check the current `max(CR-ID)` and assign fresh sequential IDs.

**Step 2 — Re-register each item using the INTAKE role from `AGENT_PROMPT_ALPHA.md`**
For each of the 9 items below, follow the full INTAKE workflow:
1. Code Reality Check (grep codebase — traces already done in drafts, re-verify)
2. Duplicate Detection (search registry — one duplicate already identified: Excel Item #3 = BUG-605)
3. Classify + Severity (use severities below as owner-confirmed starting points)
4. Evidence Capture
5. Blast Radius
6. Register with CORRECT next-available ID from live registry

**Step 3 — Use these intake docs as INPUT, not final artifacts**
The drafts have code traces, duplicate checks, blast radius, and ODs already done. Re-verify against current codebase and produce fresh artifacts with correct IDs.

---

### The 10 Excel Items (9 to register + 1 duplicate)

| Excel# | Title | Type | Sev | Risk | Duplicate? |
|---|---|---|---|---|---|
| 1 | Pay Later — Print Bill and Collect Payment | CR | P1 | HIGH | DISTINCT |
| 2 | Table Section-wise Filter | CR | P2 | MEDIUM | DISTINCT |
| 3 | Unpaid Button Not Working | BUG | P1 | — | **DUPLICATE of BUG-605** — SKIP |
| 4 | Partial Payment Split + Payment-wise Totals | CR | P1 | CRITICAL | RELATED BUG-272 |
| 5 | Room Number Filter | CR | P2 | MEDIUM | DISTINCT |
| 6 | Separate Table # and Room # Columns | CR | P2 | LOW | DISTINCT |
| 7 | Total Cancelled Revenue Metric | CR | P1 | MEDIUM | DISTINCT |
| 8 | Order Details + Order Activity Logs | CR | P1 | HIGH | DISTINCT (largest item) |
| 9 | Aggregator Item Details (Variations/Add-ons) | CR | P1 | MEDIUM | RELATED BUG-601 |
| 10 | Aggregator Complete Amount Breakdown | CR | P1 | MEDIUM | DISTINCT |

### Item #3 is a DUPLICATE
Excel Item #3 (Unpaid Button Not Working) = **BUG-605** (Order Report Beta: Unpaid/Change Payment Method Buttons Not Working). Already registered at GATE_1_INTAKE. Do NOT register again — just update BUG-605 to note the Excel reference.

### Dependency chain
```
CR-509 (Order Details + Logs)
  ├── CR-510 (Aggregator Item Details) — DEPENDS ON CR-509
  └── CR-511 (Aggregator Amount Breakdown) — DEPENDS ON CR-509

CR-510 also RELATED to BUG-601 (Aggregator Variations/Addons Silently Dropped)
CR-505 RELATED to BUG-272 (Partial Payment Breakdown)
```

### All 9 CRs share these hotspot files
- `OrderReportBetaPage.jsx` (815 lines) — main report page
- `OrderTable.jsx` (947 lines, **R5**) — table + actions
- `FilterBar.jsx` (403 lines) — filter dropdowns
- `OrderDetailSheet.jsx` (965 lines) — order drill-down
- `reportService.js` (890 lines) — data transforms + API

### Implementation notes from Excel (important for planning)
1. Payment-mode totals: reflect actual amounts per mode, including partials. No double-counting.
2. Order status ≠ payment status: keep them separate (e.g., active order + partially paid).
3. Date range: cancelled revenue and payment totals respect the selected date range.
4. Activity logs: append-only, never overwrite. Employee + timestamp per event.
5. Aggregator financials: customer-facing amounts vs platform commissions kept separate.
6. **Open items needing Product confirmation:** date basis for calculations, Unpaid eligibility rules, refund/chargeback treatment.

### Suggested planning order
1. CR-507 (Table/Room columns) + CR-508 (Cancelled Revenue) — smallest, independent
2. CR-504 (Section filter) + CR-506 (Room filter) — new filters, parallel
3. CR-503 (Pay Later actions) — extends existing Actions pattern from CR-003
4. CR-505 (Partial payment totals) — financial, needs care
5. CR-509 (Order Details + Logs) — largest, unblocks 510+511
6. CR-510 + CR-511 — after CR-509

### Files in this ZIP
```
HANDOFF_BRIEF.md          ← Start here
source/                   ← Original Excel file
intake_docs/              ← 9 draft intake documents
control/registry.json     ← Registry snapshot (1042 items)
control/CR_REGISTRY.md    ← CR registry with batch table
related/                  ← Related existing bug intake docs (BUG-601, BUG-605)
```
