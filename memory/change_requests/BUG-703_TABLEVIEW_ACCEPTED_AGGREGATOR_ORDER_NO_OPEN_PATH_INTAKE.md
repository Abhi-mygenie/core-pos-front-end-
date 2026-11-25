# BUG-703 — Table View: accepted aggregator order cannot be opened / expanded

**Type:** BUG · **Priority:** P0 · **Risk:** MEDIUM
**Status:** GATE_1_INTAKE_COMPLETE
**Registered:** 2026-11-18 · **Target release:** 2026-11-17 (owner-specified)
**Sprint:** nov_cr_batch · **Area:** Dashboard / Aggregator
**Client:** ALL (discovered on `macha`, restaurant_id 69) · **Assignee:** Abhishek
**Source:** INVESTIGATION (INV-POS-3BUGS, 2026-11-18) · **Confidence:** CONFIRMED (code-traced)

---

## Summary
In **Table View**, an **accepted** aggregator order has no way to be opened or expanded to view its details. Tapping the aggregator tile does nothing, and the only aggregator detail popup auto-shows for *new* orders only.

## Root cause (HIGH confidence)
- `src/components/cards/TableCard.jsx` L312: `onClick={isEngaged || isAggregator ? undefined : handleCardClick}` (`// CR-106: no-op for aggregator`). The aggregator tile body `onClick` is `undefined` → tapping does nothing. Only inline action buttons (KOT/Ready/Bill, L486-539) exist — no "view order" action.
- `src/components/dashboard/AggregatorOrderPopOut.jsx` L15-18, L44-53: popup queue is `isAggregator === true && (fOrderStatus === 0 || fOrderStatus === 7)` — **only new/unconfirmed** orders. Once accepted (status 1/2/5) it never re-shows.
- Net: no route reopens an accepted aggregator order in Table View (`handleTableClick` in `DashboardPage.jsx` L1490 is never reached for aggregator tiles due to L312).

## Evidence
- `src/components/cards/TableCard.jsx` L65 (`isAggregator`), L312, L486-539.
- `src/components/dashboard/AggregatorOrderPopOut.jsx` L15-18, L44-53.
- `src/components/dashboard/DashboardPage.jsx` L1490.
- Evidence dir: `/app/memory/evidence/INV-POS-3BUGS/` (06_dashboard_tableview.jpeg). Source report: `memory/investigations/INV-POS-3BUGS_INVESTIGATION_REPORT.md` (Issue 1).

## Steps to reproduce
1. In Table View, accept an aggregator (Swiggy/Zomato) order (status → 1/2/5).
2. Tap the aggregator tile to view the order details.
3. Observe nothing happens — there is no open/expand path.

## Blast radius
- Files: `src/components/cards/TableCard.jsx`, `src/components/dashboard/AggregatorOrderPopOut.jsx`, `src/components/dashboard/DashboardPage.jsx`.
- Scope: **SMALL-MEDIUM** (2-3 files). Hotspot: dashboard card + aggregator popup gating.

## Risk & process
- **Risk: MEDIUM** (touches dashboard card click gating + aggregator popup queue).
- Planning-skip: **NOT eligible** (gating logic + >1 file). Standard Gate 2-3.

## Classification / routing
- Duplicate check: **DISTINCT**. Related: CR-106 (aggregator module — the `// CR-106` no-op is the trigger).
- Assignee routing: frontend work → **Abhishek**.

## Open questions
- OD-703-01: Preferred open path — allow `handleCardClick` to open a **read-only** `AggregatorOrderPopOut` (add a "view" mode not gated on status 0/7), OR add an explicit expand affordance on the aggregator `TableCard`?
