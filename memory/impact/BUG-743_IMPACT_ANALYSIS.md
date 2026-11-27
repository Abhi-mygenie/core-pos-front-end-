# BUG-743 — Impact Analysis (Gate 2)

**Item:** BUG-743 — Cancellation reports (Item Cancellation Detail + Cancellations): cancellation note (`cancel_item_note`) not shown/exported
**Date:** 2026-11-21 · **Role:** PLANNING · **Risk:** LOW · **Priority:** P1
**Intake:** `change_requests/BUG-743_CANCEL_DETAIL_NOTE_COLUMN_INTAKE.md`
**Code Reality:** PARTIAL — note data arrives on every row; FE never surfaces it on these two screens.

## Data flow trace
`insights-cancellations.items[]` → `fetchInsightsCancellations` → screen transform → table/export.
Backend (verified live 2026-11-21, macha 69): every row carries `stage`, `reason`, `notes` (kitchen — empty ~100%), and **`cancel_item_note`** (the real staff note), for BOTH `scope=item` and `scope=order`. No `cancellation_note` key.

**Break points:**
- **CancellationsMockup.jsx** — transform `L282 notes: i.notes || ''` is a subset map that never carries `cancel_item_note`; render `L997` shows `r.notes` (empty) in the existing "Reason / Notes" column; export has no note column. → note invisible except when `notes` happens to be set.
- **CancelDetailMockup.jsx** — row spreads `...i` (`L80`) so `cancel_item_note` is present, but the table (`L152–169`) and `buildExportPayload` (`L103–109`) render **no note column** at all.

## Affected files / lines
| File | Where | Issue |
|---|---|---|
| `pages/reports-module/CancellationsMockup.jsx` | transform L282; render L996–1002; export cols L409–422 | maps/renders `notes` only; export lacks note |
| `pages/reports-module/CancelDetailMockup.jsx` | table header L152–159; cells L163–169; export L104–108; empty-row L173; tfoot L176–180 | no note column anywhere |

## Scope lock
- **WILL change:** the three cancellation report files (note mapping + render + export only) — `CancellationsMockup.jsx`, `CancelDetailMockup.jsx`, `OrderNotesMockup.jsx` (added 2026-11-21, owner widened scope).
- **WILL NOT touch:** any API/service/transform contract, money/stage/reason/filter logic, backend.

## Conflict pre-check
~20 items touch these files but are all GATE_5A/5B (awaiting QA), code already in-tree: BUG-708/713/714/715/716/717/718/723/729, CR-524/554/555/556, BUG-674, BUG-707. BUG-743 edits sit in **disjoint regions** (note mapping/render/export) → **parallel-safe**, no execution-order dependency.

## Downstream consumers
Export rows reuse the transformed/`...i` row objects, so adding the note key flows to Excel/PDF automatically once the column is declared. No chart/KPI depends on the note.

## Related gap
Resolves **OG-INV5-002** (OPEN): "Cancellation report Notes always '—' — `cancelNote` never mapped; `notes` field unconfirmed." Root cause now confirmed: read `cancel_item_note`. Close OG-INV5-002 on implementation.

## Owner decisions
1. Scope — RESOLVED: two cancellation pages only; Order Note Audit excluded.
2. Column label — "Note", reads `cancel_item_note` (fallback `notes`), "—" when empty. Backend caveat (non-blocking): `cancel_item_note` doubles as the order-level note.

## Risk register
- LOW: additive display/export of a field already in the payload; no contract/formula change. Only shared-file risk is `tfoot`/empty-row `colSpan` on CancelDetail (new column → must bump colSpan) — covered in plan.
