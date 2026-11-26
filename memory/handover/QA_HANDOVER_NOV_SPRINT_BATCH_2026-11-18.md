# QA Handover — Nov Sprint batch (Gate 4 implementation)

**Date:** 2026-11-18 · **Build:** main @ (post-c30f4c05) · **Role:** IMPLEMENTATION → QA
**Plan:** `memory/plans/NOV_SPRINT_BATCH_GATE3_IMPLEMENTATION_PLAN_2026-11-18.md`
**Implemented (code):** BUG-685, 686, 688, 690, 691, 695, 697, 698, 700
**Verify-only (no code):** BUG-693
**Held (owner):** BUG-689 (needs real-domain source). **Deferred:** 687 (close WAD), 694 (investigation), 696 (backend), 699 (pairs w/696).
**Compile:** webpack compiled successfully. **Self-test:** code-path verified + app loads; browser E2E needs a preprod login (external backend).

## Credentials / environment
- Preview: REACT_APP_BACKEND_URL (frontend/.env). App served OK (login page renders, logo visible).
- Data backend is external preprod (`preprod.mygenie.online`) — QA needs a valid POS login to exercise order/report flows.

## 1. Verification Matrix (inherited from plan)
| # | Bug | File:where | Verify | Self-test |
|---|-----|-----------|--------|:--:|
| 1 | 685 | CartPanel.jsx L812 (`onEdit` prop) | add customizable item → no `onEdit` ReferenceError crash; pencil shows; edit-in-place saves | code ✅ / browser-pending |
| 2 | 686 | useOrderPollingReconciliation.js L280-287 | throttle/offline POS fetch → local orders RETAINED (no wipe); success still reconciles; aggregator add intact | code ✅ / browser-pending |
| 3 | 691 | AuditLogMockup.jsx L24 `fmtTime` | TIME shows HH:MM or `—`, never `"2026-"` (space/ISO/date-only inputs) | code ✅ |
| 4 | 697 | AuditLogMockup.jsx L34 `matchPreset`, L199 init | first-load preset chip matches applied range (not hard-coded 7D) | code ✅ |
| 5 | 698 | AuditLogMockup.jsx L220 FY branch | FY preset now sets shared range (other Insights pages inherit); FY window still previous-completed FY | code ✅ |
| 6 | 695 | AuditLogMockup.jsx L376/L394 | Card 1 header is `div role=button`; NO `<button> in <button>` console error; link + toggle both work (keyboard too) | code ✅ |
| 7 | 700 | AuditLogMockup.jsx L121 (RiskBar empty), L151 (DrillDownTable empty) | empty states expose `audit-card1-risk-bar` + table testid at 0 events (cafe103) | code ✅ |
| 8 | 688 | socketService.js `_emitJoinWithAck` + disconnect resets | exactly ONE `join_restaurant` per (re)connection; ACK-miss re-emit + force-reconnect intact | code ✅ / socket-log pending |
| 9 | 690 | AddonManagementPanel.jsx handleAdd (`await onRefresh()`) | create add-on → appears immediately, no manual refresh; ₹0 allowed/empty blocked intact | code ✅ (refresh was already wired; awaited) |
| 10 | 693 | public/mygenie-logo.svg | `/mygenie-logo.svg` → HTTP 200 image/svg+xml (verified); logo renders on login | VERIFIED ✅ no code |
| 11 | all | dev server | webpack 0 new errors | ✅ |

## 2. Regression tests (QA to run on preprod)
- Place a full order end-to-end (covers 685 CartPanel hotspot).
- ~10 logins in a row → running-order count stable, no POS-0 flash (686).
- Audit Report: load Card 1 (no console error 695), toggle presets incl FY (697/698), 0-event restaurant for empty-state testids (700), check drill-down TIME (691).
- Socket offline→online cycle → one join per reconnect (688).
- Add an add-on in Menu → Manage Add-ons → appears instantly (690).

## 3. Registry Sync Confirmation
- registry.json: BUG-685/686/688/690/691/695/697/698/700 → GATE_5A_IMPLEMENTED; BUG-693 → CLOSED — VERIFIED NO CODE. sprint_key nov_cr_batch.
- FILE_OWNERSHIP.md updated; code markers `// BUG-XXX` in every modified file.

## 4. Notes for QA
- 685/686 are HIGH (order flow) — prioritise their browser verification.
- 688/690 self-tests are code-level; need live socket/menu verification.
- 693 requires no code; confirm logo in the target (prod) environment too.
