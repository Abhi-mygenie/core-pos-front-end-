# CR-559 R2 — Implementation Plan (payload parity + dual-toggle gate)

**Date:** 2026-11-20 · **Supersedes:** shipped CR-559 (OD-FINAL v3, order-temp-store reuse)
**Decision source:** `control/OWNER_DECISIONS_2026_11_20.md` → "CR-559 — R2 REVERSAL"
**Gate:** owner skipped formal gate. No code until GO.

## Net change
On the web/scan **Accept** branch, stop calling `order-temp-store`; instead send `printer_agent`
on the confirm PUT and then call `update-print-status`. Gate on web + both toggles (AND).

## Edits (3 files + tests)

### E1 — `frontend/src/pages/DashboardPage.jsx` · `handleConfirmOrder` (~1364-1392)
- Change gate to AND: `if (order.isWebOrder && settings?.autoKot && settings?.scanOrderAutoPrint) { … }`.
- Inside gate (keep existing confirmItems logic L1380-1382 — new=all / web-edit=`isNotConfirmed`):
  - Build stations of confirmItems, then
    `agents = [...selectAgentsForKot(printerAgents, <stationSet>), ...selectAgentsForBill(printerAgents)]`.
    (Selector + station helper imported from `../api/transforms/printerAgentSelector` / `orderTransform`;
    use the item `.station`-based set — `cartStationsToSet` — for parity with Place Order, per Impact Analysis §4.)
  - Pass `agents` into `confirmOrder(order.orderId, role, defaultOrderStatus, agents)`.
  - **Remove** the `printOrder(... , printerAgents)` call (L1386) and the `getStationsFromOrderItems` use if now unused.
  - After confirm resolves, if `agents.length > 0`: `await updatePrintStatus(order.orderId, { kot_print:'Yes', bill_print:'No' })`.
- Non-gate path unchanged: `await confirmOrder(order.orderId, role, defaultOrderStatus)` (no 4th arg → no printer_agent).
- Deps: keep `settings, printerAgents`; drop `getProductById` only if its sole use was the removed branch (verify).

### E2 — `frontend/src/api/services/orderService.js`
- `confirmOrder(orderId, roleName, orderStatus='paid', printerAgent=null)`:
  `const payload = { ...toAPI.updateOrderStatus(orderId, roleName, orderStatus),
   ...(Array.isArray(printerAgent) && printerAgent.length ? { printer_agent: printerAgent } : {}) };`
  (shared `toAPI.updateOrderStatus` stays 3-arg → ready/serve untouched; printer_agent added only when non-empty.)
- Add `export const updatePrintStatus = async (orderId, { kot_print='No', bill_print='No' }) => {
   const r = await api.post(API_ENDPOINTS.CONFIRM_PRINT_STATUS, { order_id: Number(orderId), bill_print, kot_print });
   return r.data; };` (non-blocking try/catch at call site; reuses CR-512 endpoint constant).

### E3 — `frontend/src/contexts/OrderContext.jsx`
- No change — `orderItemsByTableId` already carries `isWebOrder` (CR-559 E5, L348). Confirm only.

### Tests
- Update/extend the CR-559 unit test: gate AND (web + autoKot + scanOrderAutoPrint), confirm payload carries
  `[KOT,BILL]`, `update-print-status` called with `kot_print:'Yes'` only, and **no** `order-temp-store` call.

## Verification matrix (QA, post-build)
1. Web + autoKot ON + scanOrderAutoPrint ON → confirm PUT has `printer_agent:[KDS,BILL]`, no `print_kot`;
   then `update-print-status {kot_print:'Yes',bill_print:'No'}`; **no** `order-temp-store`.
2. Web, one toggle OFF → plain confirm body; no printer_agent; no update-print-status; no print.
3. Non-web status-7 confirm → plain body (unchanged).
4. ready/serve/cancel → unchanged (shared builder untouched).
5. Web edit → stations derived from `food_status===7` items only; new web order → all items.

## Scope lock (DO NOT touch)
Shared `toAPI.updateOrderStatus`, `updateOrderStatus` service (ready/serve), cancel paths, aggregator accept,
Place/Update builders, manual KOT button (CR-545/547).
