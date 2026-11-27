# QA HANDOVER — CR-559 (2026-11-20)

**Item:** CR-559 — Web/Scan **Accept** auto-prints the **KOT** (reuses the manual-KOT process), gated by the Scan-Order Auto-print toggle.
**Risk:** CRITICAL (printing/order flow). **Status:** IMPLEMENTED (Gate-4). **Branch:** 67b3e41.
**Plan:** `plans/CR-559_IMPLEMENTATION_PLAN.md` (FINAL v3).

## 1. What changed (3 files, additive)
- `api/transforms/profileTransform.js` — `settings.scanOrderAutoPrint` from `settings.scan_order_auto_print` (nested; root fallback). Backend now returns it under `restaurants[0].settings` (="Yes" for Goan Kitchen, validated live).
- `pages/DashboardPage.jsx` `handleConfirmOrder` — after `confirmOrder` succeeds, if `order.isWebOrder && settings?.scanOrderAutoPrint` → `getStationsFromOrderItems(confirmItems, getProductById)` then `printOrder(orderId,'kot',stationKot,order,0,{},printerAgents)`. KOT only. OD-2 item selection: new web order = all items; web edit (`isNotConfirmed`) = those items only.
- `contexts/OrderContext.jsx` — `orderItemsByTableId` whitelist now carries `isWebOrder` (RC-2) so the gate works on table/room web orders.
- NOT changed: `orderService.confirmOrder` (still 3-arg; confirm payload byte-identical), `printOrder`, `handleScanPrintKOT`.

## 2. Self-test (done)
- Unit: `api/transforms/__tests__/profileTransform.cr559.test.js` — 4/4 PASS.
- Compile: webpack compiled successfully, 0 new warnings.

## 3. QA test cases (browser net-intercept; NO real prints — intercept POST /order-temp-store & /update-print-status)
Account: owner@thegoankitchen.com / Qplazm@10 (The Goan Kitchen — web/scan tenant). Toggle at Settings → Printer Config → Auto-print → "Scan Order Auto-print" (testId `scan-order-auto-print-toggle`).

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 1 | Web NEW order, toggle ON, Accept | Accept the Awaiting-Confirmation web order | 1× PUT confirm (payload `{order_id,role_name,order_status}` only — NO printer_agent) → 1× POST `/order-temp-store` `print_type:kot`, `station_kot` = all items' stations, `printer_agent` populated → 1× POST `/update-print-status` `kot_print:'Yes'`. No BILL calls. |
| 2 | Web EDIT order, toggle ON, Accept | Accept an order with newly-added (`isNotConfirmed`) items | `station_kot` built from the food_status-7 items only. No BILL. |
| 3 | Web order, toggle OFF, Accept | Turn toggle OFF, Accept | confirm PUT only; NO `/order-temp-store`; nothing prints. |
| 4 | Non-web confirm | confirm a non-web (POS) status-7 order | confirm PUT only; print branch not entered. |
| 5 | Web order on physical table / room, toggle ON | Accept a table/room web order (E5 path) | gate passes (isWebOrder survived whitelist); KOT fires as #1. |
| 6 | Toggle ON but no stations | Accept web order whose items resolve to 0 stations | confirm succeeds; no `/order-temp-store` call (guarded by stations.length). |

## 4. Regression
- Non-web Accept (dine-in/takeaway/delivery) path unchanged — confirm payload identical. Verify a normal dine-in confirm still works.
- Manual KOT button (CR-545/547) unchanged — still prints on explicit click.

## 5. Registry Sync
Registry synced: YES · CR-559 → IMPLEMENTED (gate GATE_4) · markers `// CR-559` in all 3 files · CR_REGISTRY.md + FILE_OWNERSHIP.md updated.
