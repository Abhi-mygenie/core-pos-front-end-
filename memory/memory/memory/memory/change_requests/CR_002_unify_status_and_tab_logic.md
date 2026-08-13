# CR-002: Unify Status Derivation and Tab Filter Logic in All Orders Report (Single Source of Truth)

## Status
- cr_draft

## Raw User Request
- While clarifying CR-001, it was noted that the All Orders report currently has two parallel logics:
  1. Status badge derivation in `frontend/src/api/services/reportService.js → getOrderLogsReport()` (priority rules).
  2. Tab routing in `frontend/src/pages/AllOrdersReportPage.jsx → TAB_FILTERS`.
- These can silently drift apart (exactly how paylater-in-unpaid, addressed in CR-001, was introduced). User asked this be tracked as a separate CR and kept brief.

## Request Type
- refactor / structural behavior change (no new user-visible feature)

## Business Context
- Prevent future classification bugs in the Audit Report.
- Make every new tab/status additive without needing edits in two places.

## Confirmed Scope (brief)
- Introduce a single classification function (e.g., `classifyOrder(order)`) that returns one canonical tab/status key for any order.
- Both the STATUS column badge AND the tab filter (`TAB_FILTERS`) must consume this single function.
- Replace the existing two parallel logics.

## Out of Scope
- Any new tab, new status value, or new business rule (CR-002 only centralizes the existing rules after CR-001 is merged).
- Backend API, socket, print, KOT, or payment logic.

## Affected Modules / Screens
- Reports / Audit / Summary Module.
- Files likely touched: `reportService.js`, `AllOrdersReportPage.jsx`, possibly a new helper in `frontend/src/api/transforms/reportTransform.js` or `frontend/src/utils/`.

## Dependencies
- **Must be implemented after CR-001 is merged.** Otherwise this CR would re-touch the same code and invalidate CR-001's test baseline.

## Risks
- `reportService.js` is a high-regression-risk hotspot per `CHANGE_REQUEST_PLAYBOOK.md`.
- All tabs (Paid / Cancelled / Credit / Hold / Merged / Unpaid / Transferred / Aggregator / Audit) must be retested after refactor.

## Open Questions
| Question | Why It Matters | Status |
| --- | --- | --- |
| OQ-1: Should the unified function live in `reportService.js`, in a new `utils/orderClassifier.js`, or inside `reportTransform.js`? | Architectural placement affects testability and reuse. | Open |
| OQ-2: Should the classifier return both `status` (badge) and `tab` (routing), or just one key that both consume? | Determines API shape of the classifier. | Open |

## Acceptance Criteria
| # | Acceptance Criteria |
| --- | --- |
| 1 | A single classification function exists and is the only place that encodes the priority rules. |
| 2 | `STATUS` column badge and `TAB_FILTERS` both call this single function. |
| 3 | All behavior from CR-001 is preserved (paylater → Hold, Unpaid excludes paylater, Audit is catch-all for unmatched orders, `hold` in `statusBreakdown`). |
| 4 | Tab counts reconcile to total orders. |
| 5 | No regression on Paid / Cancelled / Credit / Hold / Merged / Unpaid / Transferred / Aggregator / Audit tabs, PDF/CSV exports, or side-sheet. |
| 6 | No API/socket/payload change. |

## References Read (same as CR-001)
- /app/memory/final/CHANGE_REQUEST_PLAYBOOK.md
- /app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md
- /app/memory/final/MODULE_DECISIONS_FINAL.md
- /app/frontend/src/api/services/reportService.js
- /app/frontend/src/pages/AllOrdersReportPage.jsx

## Ready for Next Agent?
- No — this is a brief placeholder CR, to be expanded and approved after CR-001 is implemented.

## Next Agent
- Change Request Impact Analysis Agent (only after CR-001 is merged)
