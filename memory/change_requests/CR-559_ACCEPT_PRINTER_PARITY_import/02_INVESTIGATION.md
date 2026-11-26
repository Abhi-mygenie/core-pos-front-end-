# INV-ACCEPT-PRINTER — Web/Scan "Accept" omits printer details
**Role:** INVESTIGATION (Alpha v0.7, Role 6) · **Date:** 2026-11-19
**Reporter:** Owner · **Credentials used (alias):** poki@macha.com / *** (masked)
**Live probe:** Authorized by owner (table order) but **not run** — code trace is conclusive and placing a real order on preprod is destructive (business-safety rule). No orders created. No room pop-up touched. **No code edited.**

## 1. Summary
- **Root cause:** The web/scan **Accept** action commits through the status-only endpoint `CONFIRM_ORDER` (`/api/v2/vendoremployee/order/waiter-dinein-order-status-update`) using `toAPI.updateOrderStatus`, whose payload is only `{ order_id, role_name, order_status }`. It never runs the printer-agent selector gating and never receives `printerAgents`, so **`printer_agent` (and `print_kot`) are absent on Accept** — unlike Place Order and Update Order, which emit them.
- **Classification:** FE_BUG (missing wiring) **+ CONTRACT dependency** (confirm endpoint may not read `printer_agent`).
- **Confidence:** HIGH that the FE accept payload omits printer details; MEDIUM that adding the field alone will make the backend print (needs confirm-endpoint contract probe).
- **Steps used:** 8/10.

## 2. Hypotheses Tested
| # | Hypothesis | Method | Result | Evidence |
|---|---|---|---|---|
| H1 | Accept uses a different (status-only) commit than place/update | code trace | **CONFIRMED** | ScanOrderPopOut→handleConfirmOrder→confirmOrder→updateOrderStatus |
| H2 | place/update share one printer gating that Accept skips | code trace | **CONFIRMED** | orderTransform.js place 1099-1102/1165, update 1238-1240/1296 |
| H3 | printerAgents simply isn't passed into the confirm path | code trace | **CONFIRMED** | handleConfirmOrder deps = [getOrderDataForEntry, permissions, defaultOrderStatus] |
| H4 | Aggregator accept already solves this (pattern to mirror) | code trace | **CONFIRMED** | AggregatorOrderPopOut fires manuallyPrintAggregator after accept (CR-118) |

## 3. Data Flow Trace
**ACCEPT (web/scan) — BREAK POINT:**
`ScanOrderPopOut.jsx:277 handleAcceptClick` → `onAccept` (`DashboardPage.jsx:1926`) → `handleConfirmOrder` (`DashboardPage.jsx:1364-1377`) → `orderService.confirmOrder` (`:70-74`) → `toAPI.updateOrderStatus` (`orderTransform.js:1842-1846` → `{order_id, role_name, order_status}`) → PUT `CONFIRM_ORDER` (`constants.js:43`).
➡ **No `printer_agent`, no `print_kot`, no cart. `printerAgents` from `useRestaurant()` never reaches this path.**

**PLACE ORDER (reference) — printer details present:**
`orderTransform.js:1099-1102` `printerAgentForKot = printAllKOT ? selectAgentsForKot(printerAgents, cartStationsToSet(unplacedItems)) : []`; `:1102` append `selectAgentsForBill(printerAgents)`; `:1122` `print_kot`; `:1165` `printer_agent`.

**UPDATE ORDER (reference) — same gating:**
`orderTransform.js:1238-1240` KOT agents from `cartStationsToSet(newItems)`; `:1253` `print_kot`; `:1296` `printer_agent`.

**Gating (identical, place & update):** `printAllKOT` → `selectAgentsForKot(printerAgents, cartStationsToSet(items))`, plus `selectAgentsForBill(printerAgents)` appended unconditionally (CR-130 / OD-3). `printerAgents` = `useRestaurant().printerAgents` (profileTransform) — already in DashboardPage, used at :1714/:1733/:1764 for cancel & manual KOT, but **not** on Accept.

## 4. Evidence Artifacts
`/app/memory/evidence/INV-ACCEPT-PRINTER-2026_11_19/code_trace.md`

## 5. Recommendations
**Classification: FE_FIX + BACKEND_ASK.** Risk **CRITICAL** (print payload / order flow) → **NOT planning-skip eligible** (≥3 files, hotspots). Full Planning gate (Gate 2-3) + owner approval + backend brief.

Two viable designs (owner must choose — they are different contracts):
- **Option A — payload parity:** extend the Accept commit to emit `printer_agent` + `print_kot` using the *same* selectors (`selectAgentsForKot` + `selectAgentsForBill`), passing `printerAgents` through `handleConfirmOrder → confirmOrder`. **Requires** `waiter-dinein-order-status-update` to accept/honor `printer_agent` (unverified — see Backend Brief).
- **Option B — mirror aggregator (CR-118/CR-108):** after a successful `confirmOrder`, fire a KOT/BILL print call (as `AggregatorOrderPopOut` does via `manuallyPrintAggregator`, and as the existing manual KOT button does via `printOrder(..., printerAgents)`), gated by a setting/flag.

Files Option A would touch (for planning, not changed here): `pages/DashboardPage.jsx` (handler + deps), `api/services/orderService.js` (`confirmOrder` signature), `api/transforms/orderTransform.js` (confirm payload builder).

**Owner decisions needed:**
- OD-1: Option A (payload parity) or Option B (fire print after accept)?
- OD-2: KOT station set on accept = all order items, or only newly-confirmed (web-edit) items?
- OD-3: Append BILL agent unconditionally on accept (CR-130/OD-3 parity)?

## 6. Retroactive Candidates
- **RELATED:** CR-108 (Auto-KOT on *aggregator* accept, CLOSED under CR-135) and CR-118 (aggregator KOT/Bill checkboxes on accept) — the existing pattern for aggregator. CR-545/CR-547 added a *manual* KOT button to the web/scan pop-up but did **not** add printer details to the Accept commit. This item is the web/scan equivalent of CR-108 and should be registered as **DISTINCT, RELATED to CR-108 / CR-118 / CR-545 / CR-547**.
