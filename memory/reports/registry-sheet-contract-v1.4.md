# Registry → Google Sheet contract (shared, all projects)

Version 1.4 · 2026-10-07 · Owner: Abhishek Jain
Applies to: POS, CRM, Scan & Order, Central Inventory, Infra.

🔒 **FROZEN — v1.4 (2026-10-07).** No changes without an explicit owner decision and a new version number.

---

## 1. Purpose

Each project keeps its own machine registry. The Google Sheet is a human-facing mirror and the source the Tech Dashboard reads. The sheet is **two-way for Status and the two date columns `Registered` and `Closed`**, and sheet → registry never happens without owner approval (§5).

## 2. Workbook layout (tabs in this exact order)

| Tab | Content |
|---|---|
| All Items | every item, one row each |
| Intake | Status = INTAKE |
| Planning | Status = PLANNING |
| Implemented | Status = IMPLEMENTED |
| QA | Status = QA |
| Smoke | Status = SMOKE |
| Closed | Status = CLOSED, PARKED, DUPLICATE |
| Blockers | items with a non-blank `Blocked on`, regardless of Status |
| Change Log | append-only, see §5 |
| Summary | counts, see §6 |

Rules: Header row 1 on every tab. No banner line. Empty stage tabs are valid. No "Open Only" tab.

## 3. Columns (22, fixed, in this exact order)

| # | Column | Required | Values | Who writes |
|---|---|---|---|---|
| 1 | Project | yes | POS / CRM / SO / INV / INFRA | agent |
| 2 | ID | yes | unique within project | agent |
| 3 | Type | yes | BUG / CR / INV / INCIDENT / GAP | agent |
| 4 | Title | yes | one line | agent |
| 5 | Status | yes | INTAKE / PLANNING / IMPLEMENTED / QA / SMOKE / CLOSED / PARKED / DUPLICATE | agent; humans may edit (§5); dashboard SMOKE→CLOSED only (§8) |
| 6 | Status note | no | free text: gate detail, dates, verdicts | agent |
| 7 | Priority | yes | P0 / P1 / P2 / P3 | agent; dashboard may overwrite (§8) |
| 8 | Risk | no | LOW / MEDIUM / HIGH / CRITICAL | agent |
| 9 | Area | no (POS only) | POS area list | agent |
| 10 | Sprint | no | sprint / wave key | agent |
| 11 | Blocked on | no | blank / BACKEND / POS / CRM / SO / INV / INFRA / OWNER / OPS / INTERNAL | agent |
| 12 | Owner action | no | what owner must do next, one line | agent |
| 13 | Assignee | no | person | owner/dashboard only. Agent NEVER writes or clears on All Items. Always blank on stage tabs. |
| 14 | Registered | yes | YYYY-MM-DD | agent; owner fills if missing (§5) |
| 15 | Last updated | yes | YYYY-MM-DD | agent-computed-only; never accepted from sheet |
| 16 | Closed | yes when CLOSED/PARKED/DUPLICATE | YYYY-MM-DD | agent; owner fills if missing (§5) |
| 17 | Related | no | comma-separated IDs | agent |
| 18 | Artefacts | no | INTAKE, IMPACT_ANALYSIS, IMPLEMENTATION_PLAN, QA_HANDOVER, QA_REPORT | agent |
| 19 | Code markers | no | YES / no | agent |
| 20 | Files | no | files touched | agent |
| 21 | Notes | no | anything else | agent |
| 22 | Money path | no | YES / no | agent |

Column count fixed at 22. New columns require contract amendment first.

## 4. Mapping rules

- **Status 8 enum values:** INTAKE / PLANNING / IMPLEMENTED / QA / SMOKE / CLOSED / PARKED / DUPLICATE
- Gate labels: Gate 1 → INTAKE, Gate 3 → PLANNING, Gate 5a → IMPLEMENTED, Gate 5b → QA, Gate 6 / "awaiting owner smoke" → SMOKE, owner verified/subsumed/resolved → CLOSED
- **BLOCKED is NOT a Status.** Blocked item keeps real stage + sets `Blocked on` party.
- **PARKED** = deliberate owner decision to stop work with re-open condition. Blocked ≠ PARKED.
- **Blocked on party enum:** blank / BACKEND / POS / CRM / SO / INV / INFRA / OWNER / OPS / INTERNAL
- Priority: P0/P1/P2/P3 only. `severity` maps to Priority. If both differ, higher urgency wins.
- Type: BUG/CR/INV/INCIDENT/GAP. CR whose title starts "BUG" → Type = BUG.
- Back-catalogue interim: unclassified status → blank Status cell, counted as "Unrouted" in Summary.

## 5. Two-way rule and Change Log

1. Registry → sheet: rewrite All Items + stage tabs from registry on every registry change (REGISTRAR role).
2. Sheet → registry: NEVER directly. Diff on each REGISTRAR run → append to Change Log → owner approval.
3. Owner approves → agent applies + marks APPLIED. Rejected → marked REJECTED + sheet cell reverted.
4. Registry wins on conflict unless owner explicitly overrides.
5. Phase 1 accepted columns from sheet: **Status, Registered, Closed** only. Last updated = agent-computed, never accepted. All other column edits → logged REJECTED.
6. Assignee excluded from diff entirely. Dashboard-written Priority and Status edits included, tagged `SOURCE=DASHBOARD`.

**Change Log columns:** `Logged at · ID · Column · Old value (registry) · New value (sheet) · Decision (PENDING/APPROVED/APPLIED/REJECTED) · Decided at · Note`

## 6. Summary tab

Header row 1. Three blocks, one blank row between:
- Status × count (all 8 values, zero included; blank/unrouted = `Unrouted`)
- Priority × count for open items (not CLOSED/PARKED/DUPLICATE)
- Blocked on × count

Then two separate lines:
```
Generated: <ISO timestamp>
Pending change-log rows: N
```

## 7. IDs

POS keeps current scheme until next release. Future: `TYPE-YYYY-MM-DD-NNN`.

## 8. Dashboard contract

Dashboard reads All Items from all 5 sheets. May write: Assignee, Priority. Status transition: SMOKE→CLOSED only.

### 8.1 Dashboard write path
Dashboard edits batched → pushed to sheet on "Push to Sheet" click (bypasses Change Log). Agent tags `SOURCE=DASHBOARD` in Change Log on next REGISTRAR run; applies to registry without owner approval.

## 9. UI-only fields policy

Fields for dashboard UX only never appear in the sheet. Agent uses only §3 columns. Unknown columns ignored silently.
