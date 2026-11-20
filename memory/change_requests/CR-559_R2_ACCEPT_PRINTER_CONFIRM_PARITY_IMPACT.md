# CR-559 R2 — Impact Analysis (Gate 2)

**Date:** 2026-11-20 · **Agent:** E1 (PLANNING) · **Priority:** P1 · **Risk:** CRITICAL (printing / order flow)
**Code Reality:** FULL — re-scope of shipped CR-559 (OD-FINAL v3 mechanism live; R2 reverses it).
**Conflict Pre-Check:** 3 target files are hotspots but R2 is confined to `handleConfirmOrder` / `confirmOrder`
/ (verify-only `OrderContext`). No open (non-CLOSED) item owns those exact functions:
- `DashboardPage.jsx`: CR-547/CR-545 touch different handlers (`handleScanPrintKOT`, cancel); CR-516/518/533 are
  Gate-1 intakes on R5 tabs/routing — none touch `handleConfirmOrder`. → parallel-safe.
- `orderService.js`: POS2-003-REOPEN-A / BUG-088 / BUG-144 all CLOSED/shipped, none on `confirmOrder`. → clean.
- `OrderContext.jsx`: `isWebOrder` already added by CR-559 E5 — R2 only verifies. → clean.

## 0. Pre-impl probe (read-only) — GATE SOURCE VALIDATED
Preprod `GET /profile` (pms@macha.com), evidence `evidence/CR-559/r2_profile_probe_2026-11-20.md`:
- `restaurants[0].print_kot="Yes"` → `settings.autoKot=true` ✅
- `restaurants[0].settings.scan_order_auto_print="Yes"` → `settings.scanOrderAutoPrint=true` ✅
- `def_ord_status=1` → `order_status:"cooking"` (matches owner sample) ✅
- top-level `print_agent` = 2 agents → `printerAgents` populated ✅
→ Dual-toggle gate reads real present fields; **old OD-5 backend blocker RESOLVED**.

## 1. Data Flow (traced)
Accept (web/scan YTC): `ScanOrderPopOut.handleAcceptClick` / TableCard `onConfirmOrder`
→ `DashboardPage.handleConfirmOrder` (L1364) → `getOrderDataForEntry` (resolves from
`OrderContext.orderItemsByTableId`, carries `isWebOrder`) →
**[gate: `isWebOrder && settings.autoKot && settings.scanOrderAutoPrint`]** →
`confirmOrder(orderId, role, defaultOrderStatus, printerAgent)` →
`toAPI.updateOrderStatus(...)` + `printer_agent` → `PUT CONFIRM_ORDER`
(`/api/v2/vendoremployee/order/waiter-dinein-order-status-update`) → then
`updatePrintStatus(orderId,{kot_print:'Yes',bill_print:'No'})` → `POST CONFIRM_PRINT_STATUS`
(`/api/v2/vendoremployee/print/update-print-status`).
Reference (Place Order) `orderTransform.js:1099-1102,1165` — same `selectAgentsForKot + selectAgentsForBill` shape.

## 2. Root Causes / Change Drivers
- **RC-1 (shipped behaviour to reverse):** current Accept uses `printOrder → /order-temp-store` (DashboardPage:1386).
  R2 removes it and moves printer routing onto the confirm payload (payload parity) + `update-print-status`.
- **RC-2 (gate parity):** add `settings.autoKot` (backend `print_kot`) as a second AND-condition alongside
  `scanOrderAutoPrint`, mirroring Place/Update gating on `printAllKOT`.
- **RC-3 (projection):** `OrderContext.orderItemsByTableId` already carries `isWebOrder` (CR-559 E5) — no change.

## 3. Affected Files / Lines
| File | Location | Change |
|---|---|---|
| `pages/DashboardPage.jsx` | `handleConfirmOrder` ~1364-1392; imports ~40 | Gate→AND(`autoKot`+`scanOrderAutoPrint`); build `[KOT,BILL]` block via `selectAgentsForKot(cartStationsToSet(confirmItems))`+`selectAgentsForBill`; pass to `confirmOrder`; **remove** `printOrder/order-temp-store` call; after confirm call `updatePrintStatus` when block non-empty; drop now-unused imports (`printOrder`/`getStationsFromOrderItems`) if unreferenced |
| `api/services/orderService.js` | `confirmOrder` ~70-74; new `updatePrintStatus` | `confirmOrder(id,role,status,printerAgent=null)` adds `printer_agent` only when non-empty (shared `toAPI.updateOrderStatus` left 3-arg); add `updatePrintStatus(id,{kot_print,bill_print})` reusing CR-512 endpoint |
| `contexts/OrderContext.jsx` | `orderItemsByTableId` L348 | **Verify only** — `isWebOrder` already present |

## 4. Downstream Consumers / Regression Surface
- `handleConfirmOrder` also serves **non-web POS status-7 confirms** → `isWebOrder` gate keeps them on plain body. ✅
- Shared `toAPI.updateOrderStatus` used by **ready/serve** (DashboardPage:1646/1671) + **cancel** → untouched
  (printer_agent added in `confirmOrder` service only, when non-empty). ✅
- `printOrder` still used by manual KOT (CR-545/547, DashboardPage:1779) → keep import if still referenced. ✅
- `CONFIRM_PRINT_STATUS` already used inside `printOrder` (CR-512) → `updatePrintStatus` reuses same endpoint. ✅
- `orderItemsByTableId` consumers (OrderEntry/CartPanel) → no change. ✅

## 5. Risk Register
| Risk | Likelihood | Mitigation |
|---|---|---|
| Backend ignores `printer_agent` on confirm or `update-print-status` doesn't fire KOT | **Med** | **Live Accept probe (Gate-4 precondition)** — not proven by read-only probe |
| Printer routing fires on non-web / ready-serve | Low | `isWebOrder` gate + printer_agent only in `confirmOrder` + non-empty guard |
| Double print (confirm + order-temp-store) | Low | order-temp-store call REMOVED; manual KOT stays manual |
| Gate silently OFF (flags missing) | Low | Probe confirmed both flags present; nested-path read matches |
| Wrong station on web edit | Med | web edit → `food_status===7`/`isNotConfirmed` items only (OD-2) |
| Lost reprint path | Low | manual KOT button (CR-545/547) unchanged |

## 6. Owner Decisions
All LOCKED (OD-R2-1..4; see `control/OWNER_DECISIONS_2026_11_20.md`). No open business-rule questions.
**One remaining Gate-4 precondition:** live Accept probe to confirm backend prints from the confirm block +
`update-print-status` (needs a real web order with both toggles ON — owner-run or authorized).

## 7. Verification Matrix (seeds QA)
| # | File | Change | How to verify | Automated |
|---|---|---|---|:---:|
| 1 | orderService.confirmOrder | printer_agent added only when non-empty | unit test cr559_r2 | YES |
| 2 | orderService.updatePrintStatus | posts `{order_id,kot_print,bill_print}` | unit test cr559_r2 | YES |
| 3 | DashboardPage.handleConfirmOrder | gate AND; [KOT,BILL]; no order-temp-store; then update-print-status | Browser Network: Accept web order both toggles ON | NO (live) |
| 4 | gate OFF / non-web | plain confirm body, no printer_agent, no update-print-status | Browser Network | NO (live) |
| 5 | ready/serve/cancel | unchanged payloads | unit + Network | PARTIAL |

## 8. Scope Lock
WILL change: `DashboardPage.jsx`, `orderService.js`. VERIFY only: `OrderContext.jsx`.
WILL NOT touch: `toAPI.updateOrderStatus` (shared), `updateOrderStatus` service (ready/serve), cancel paths,
aggregator accept, Place/Update builders, manual KOT (CR-545/547), `ScanOrderPopOut.jsx`.

## Handover → Gate 3 / Gate 4
Impact Analysis complete. Plan already drafted: `plans/CR-559_R2_IMPLEMENTATION_PLAN.md` (2 files + tests).
Code reality FULL (reversal). Conflict: parallel-safe. Owner decisions: locked. Verification matrix: 5 (2 auto, 3 live).
**Awaiting owner Gate-4 GO + live Accept probe (or authorization to run it with the provided preprod creds).**
