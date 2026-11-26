# IA Index — POS Investigations Batch (BUG-701, BUG-702, BUG-703, CR-547)

**Gate:** 2 — Impact Analysis (+ 2.5 design for UI items) · **Role:** PLANNING
**Date:** 2026-11-18 · **Sprint:** nov_cr_batch
**Owner directives:** all P0, assignee Abhishek, release 2026-11-17
**Source bundle:** `investigations/INV-ROOM-CANCEL-POPUP_INVESTIGATION_REPORT_2026-11-18.md` (+ API brief), `investigations/INV-POS-3BUGS_INVESTIGATION_REPORT.md`
**Design:** `design/POS_INVEST_GATE2_5_MOCKUPS_2026_11_18.html`

| ID | Title | Risk | Status | IA doc | Decision |
|---|---|---|---|---|---|
| BUG-701 | Room edit-confirm popup disappears on item-cancel | HIGH | GATE_2_IA_COMPLETE | `impact/BUG-701_IMPACT_ANALYSIS.md` | FE guard centralised in `OrderContext.updateOrder` + backend brief |
| BUG-702 | ScanOrderPopOut partial variation | LOW | GATE_2_5_DESIGN_APPROVED | `impact/BUG-702_IMPACT_ANALYSIS.md` | Option A — option name(s) + each price |
| BUG-703 | Table View accepted aggregator no open path | MEDIUM | GATE_2_5_DESIGN_APPROVED | `impact/BUG-703_IMPACT_ANALYSIS.md` | Option A — tap tile → read-only popup |
| CR-547 | Selective KOT in confirmation popup | HIGH | GATE_2_5_DESIGN_APPROVED | `impact/CR-547_IMPACT_ANALYSIS.md` | Checkboxes → one KOT, only selected items' stations |

## Cross-cutting notes
- **Same-file batching (R5):** BUG-702 + CR-547 both edit `ScanOrderPopOut.jsx`; CR-547 + BUG-703 also touch `DashboardPage.jsx`. **CR-552 (GATE_5A_IMPLEMENTED 2026-11-18)** already modified `ScanOrderPopOut.jsx`, `orderTransform.js`, `DashboardPage.jsx` — sequence these Gate-3 edits **after** CR-552 settles; combine the ScanOrderPopOut edits into one branch.
- **BUG-701** edits `OrderContext.jsx` only — isolated from the ScanOrderPopOut batch; safe to implement in parallel.
- **Backend brief:** `backend_briefs/BUG-701_ORDER_FROM_ROOM_WEB_BACKEND_BRIEF.md`.
- **CR-547 blocker:** verify the KOT print payload is item-driven before Gate 3 sign-off (see its IA).
- Secondary empty-poll eviction finding → tracked under existing **BUG-686** (no new item).

## Suggested implementation order (Gate 3)
1. **BUG-702** (LOW, isolated render) — quickest win.
2. **BUG-701** (HIGH, OrderContext only) — highest impact, isolated.
3. **BUG-703** (MEDIUM, aggregator view-only).
4. **CR-547** (HIGH, print-path) — last, after payload verification.
