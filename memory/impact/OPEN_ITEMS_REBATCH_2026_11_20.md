# OPEN ITEMS — Deep-Dive Re-Verification & Re-Batch — 2026-11-20

**Role:** PLANNING · **Rule:** code is source of truth (every item re-verified against source, not registry).
**Scope:** all currently-open items re-checked against code and grouped into implementable batches.
**Registry:** each item below tagged with a `rebatch` field · dashboard/tracker updated.

## 14 open items → 6 implementable batches
Each batch = one shared-file session / one PR.

| Batch | Items | Files | State |
|---|---|---|---|
| **B4 · Presets** | BUG-723 | SalesMockup, DashboardMockup, CancellationsMockup | ready — no blocker, conflict cleared |
| **B2 · Audit-UI** | BUG-730, 739, 722 (FE) | AuditLogMockup.jsx (+riskTier util) | needs OD-739 / OD-730 |
| **B5 · Scan-popout** | CR-558, BUG-679, 702, 738 | ScanOrderPopOut, PopoutItemRow, orderTransform | IA mostly done; 679/702 likely already fixed by CR-557 (verify); 738 needs OD |
| **B6 · Cart/Credit** | BUG-732, 734 | CartPanel.jsx, CreditCustomerDetailSheet.jsx | needs quick IA |
| **B1 · Permissions** | BUG-720, 721, **+736** | App.js, PermissionRoute, ChannelColumn, TableCard | CRITICAL; needs OD-720 + backend-authorization skill |
| **B3 · Audit-backend** | BUG-696, 719, 722 (BE) | backend insights-dashboard | backend track, blocked |

## Code-truth corrections found
- **BUG-721** — parent (`ChannelColumn.jsx`) passes `canCancelOrder`/`canPrintBill`, but `TableCard.jsx` does not destructure/use them → buttons render unconditionally. Still OPEN.
- **BUG-679 / 702** — `CR-557`'s shared `PopoutItemRow` + `v.values` parsing are now in place, so these may already be resolved → **verify-and-close** in B5 rather than rebuild.
- **Conflict resolved** — `App.js` is touched by BUG-720 **and** BUG-736, so 736 was pulled into **B1** (single App.js owner / PR). `CancellationsMockup` is now free (Cluster B shipped), unblocking **B4**.

## Code-truth verification (2026-11-20, this session, on current `main`)
- BUG-721: `ChannelColumn.jsx` L355/361/387/393 pass `hasPermission?.('order_cancel')` / `('print_icon')`; `grep` in `TableCard.jsx` for those props returns **nothing** → confirmed OPEN.
- BUG-679/702: `components/dashboard/PopoutItemRow.jsx` exists; `ScanOrderPopOut.jsx` imports it (L49, "CR-557") and parses `v.values` (L75-81); CR-557 comment states the shared row "gains APS/BUG-679/BUG-702" → confirmed verify-and-close candidate.
- BUG-736: the "New version available / Update now" banner is rendered in `App.js` (L133-143) → confirmed shares `App.js` with BUG-720 routes.

## Recommended order
**B4 → B2 → B5 → B6 → B1 → B3**
(owner may override — e.g. prioritise B1 Permissions for the security/PII risk.)

## Owner decisions blocking Gate-4
- **OD-720** — permission key map per route (`/settings`, `/menu`, `/employees`, `/inventory-*`, `/pms/*`).
- **OD-739** — "Total Events" relabel vs true event count.
- **OD-730** — audit drill-down columns.
- **OD-738** — authoritative channel + amount.
- **Backend approach** — 722 / 719 / 696 (insights-dashboard latency).
- **CR-558** — already decided = Option B.

## rebatch tags written to registry.json
| Item | rebatch |
|---|---|
| BUG-723 | B4-PRESETS |
| BUG-730, BUG-739 | B2-AUDIT-UI |
| BUG-722 | B2-AUDIT-UI (FE) / B3-AUDIT-BACKEND (BE) |
| CR-558, BUG-679, BUG-702, BUG-738 | B5-SCAN-POPOUT |
| BUG-732, BUG-734 | B6-CART-CREDIT |
| BUG-720, BUG-721, BUG-736 | B1-PERMISSIONS |
| BUG-696, BUG-719 | B3-AUDIT-BACKEND |
