# Registry → Google Sheet contract (shared, all projects)
Version 1.4 · 2026-10-07 · Owner: Abhishek Jain
Applies to: POS, CRM, Scan & Order, Central Inventory, Infra. Every project sheet must match this exactly so the Tech Dashboard can read all five the same way.
**v1.4 changes (cumulative):** Two-way accepts Status + Registered + Closed only. Last updated = agent-computed-only. Assignee excluded from diff. Dashboard may write Priority and SMOKE→CLOSED. §9: sheet columns not in §3 are silently ignored.
🔒 FROZEN — v1.4 (2026-10-07). No changes without an explicit owner decision and a new version number.
## 1. Purpose
Each project keeps its own machine registry (POS: registry.json). The Google Sheet is a human-facing mirror and the source the Tech Dashboard reads. Two-way for Status, Registered, and Closed only; sheet → registry never without owner approval (§5).
## 2. Workbook layout (tabs in this order)
All Items · Intake · Planning · Implemented · QA · Smoke · Closed · Blockers · Change Log · Summary
- Header is row 1 on every tab. No banner above it.
- No "Open Only" tab.
- Empty stage tabs are valid.
## 3. Columns (All Items and stage tabs), in order
1  Project          agent            POS / CRM / SO / INV / INFRA
2  ID               agent            unique within project
3  Type             agent            BUG / CR / INV / INCIDENT / GAP
4  Title            agent            one line
5  Status           agent + humans   INTAKE / PLANNING / IMPLEMENTED / QA / SMOKE / CLOSED / PARKED / DUPLICATE
6  Status note      agent            prose: gate detail, dates, verdicts
7  Priority         agent + dashboard P0 / P1 / P2 / P3
8  Risk             agent            LOW / MEDIUM / HIGH / CRITICAL
9  Area             agent (POS only) POS area list; blank for other projects
10 Sprint           agent            sprint/wave key
11 Blocked on       agent            blank / BACKEND / POS / CRM / SO / INV / INFRA / OWNER / OPS / INTERNAL
12 Owner action     agent            what owner must do next
13 Assignee         owner/dashboard ONLY. Agent never writes or clears this column.
14 Registered       agent; owner may fill if missing
15 Last updated     agent-computed ONLY. Never accepted from the sheet.
16 Closed           agent; owner may fill if missing (required when Status = CLOSED/PARKED/DUPLICATE)
17 Related          agent            comma-separated IDs
18 Artefacts        agent            INTAKE, IMPACT_ANALYSIS, IMPLEMENTATION_PLAN, QA_HANDOVER, QA_REPORT
19 Code markers     agent            YES / no
20 Files            agent            files touched
21 Notes            agent            anything else
22 Money path       agent            YES / no
Column count is fixed at 22. Any new column is owner-initiated and must be added to this contract before any agent reads/writes it.
## 4. Key mapping rules
- BLOCKED is not a Status. Blocked items keep their real stage + Blocked on set.
- PARKED = deliberate owner decision to stop with a re-open condition. A blocked item is never PARKED.
- Type from the item, not the ID prefix.
- Registered = date item entered registry; Last updated = date of last registry change; Closed = date Status became CLOSED/PARKED/DUPLICATE.
## 5. Two-way rule and Change Log
- Registry → sheet: agent rewrites All Items + stage tabs from registry on every registry mutation.
- Sheet → registry: NEVER directly. Agent diffs sheet vs registry, appends one row per human edit to Change Log, presents to owner.
- Only the owner approves a Change Log entry. On approval the agent applies it to the registry (APPLIED). Rejected → REJECTED and cell reverted on next push.
- Phase 1 accepted set: Status, Registered, Closed (three columns). All other column edits → REJECTED with reason "column not editable in Phase 1".
- Assignee excluded from the diff entirely. Dashboard-written Priority and Status edits are included in diff, tagged SOURCE=DASHBOARD, applied without owner approval.
Change Log columns: Logged at · ID · Column · Old value (registry) · New value (sheet) · Decision (PENDING/APPROVED/APPLIED/REJECTED) · Decided at · Note
## 6. Summary tab
Block 1: Status × count (all 8 values; Unrouted if any)
Block 2: Priority × count for open items
Block 3: Blocked on × count
Then (two separate lines):
Generated: <ISO timestamp>
Pending change-log rows: N
## 7. IDs
Current scheme preserved per project. From next release: TYPE-YYYY-MM-DD-NNN (e.g. CR-2026-10-09-001).
## 8. Dashboard contract
Dashboard reads All Items only. It may write: Assignee, Priority (owner override). It may initiate SMOKE → CLOSED transition only. It never writes any other column, tab, Change Log, or Summary.
Dashboard writes are batched and pushed in one step; they bypass the Change Log on push but appear tagged SOURCE=DASHBOARD on the next REGISTRAR diff.
## 9. UI-only fields policy
Fields used purely for dashboard UX never appear in the sheet. Any sheet column not in §3 is ignored silently by the agent — never read, written, or logged as a diff.
