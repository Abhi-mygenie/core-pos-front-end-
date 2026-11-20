# CR-559 R2 — Implementation Plan (Gate 3)

**Date:** 2026-11-20 · **Agent:** E1 (PLANNING) · **Priority:** P1 · **Risk:** CRITICAL (printing/order flow)
**Code Reality:** FULL (reverses shipped CR-559 OD-FINAL v3). **Conflict:** parallel-safe (confined to
`handleConfirmOrder`/`confirmOrder`). **Decision source:** `control/OWNER_DECISIONS_2026_11_20.md` → "CR-559 R2 REVERSAL".
**Impact:** `change_requests/CR-559_R2_ACCEPT_PRINTER_CONFIRM_PARITY_IMPACT.md`. **Probe:** `evidence/CR-559/r2_profile_probe_2026-11-20.md`.

## Net behaviour
Web/scan **Accept** only, gated by `isWebOrder && settings.autoKot && settings.scanOrderAutoPrint`:
send `printer_agent:[KOT…,BILL]` ON the confirm PUT (no `print_kot` field), then `update-print-status
{kot_print:'Yes',bill_print:'No'}`. **Remove** the `printOrder → /order-temp-store` call. Everything else unchanged.

Station source: `cartStationsToSet(confirmItems)` (order items carry `.station`, orderTransform.js:134) — true
Place-Order parity (orderTransform.js:1099-1102). Drops the `getStationsFromOrderItems`/`getProductById` use in this branch.

---

## Edits (exact, current → new)

### E1 — `frontend/src/pages/DashboardPage.jsx` · imports
- **L26 current:** `import { updateOrderStatus, confirmOrder, completePrepaidOrder } from "../api/services/orderService";`
  **→ new:** `...{ updateOrderStatus, confirmOrder, completePrepaidOrder, updatePrintStatus } ...`
- **After L39, add:** `import { selectAgentsForKot, selectAgentsForBill, cartStationsToSet } from "../api/transforms/printerAgentSelector"; // CR-559 R2`
- Keep `printOrder` (L38) + `getStationsFromOrderItems` (L39) — still used by manual-KOT path (L1766/L1779).

### E2 — `frontend/src/pages/DashboardPage.jsx` · `handleConfirmOrder` (L1364-1392) — replace body
```js
const handleConfirmOrder = useCallback(async (tableEntry) => {
  const order = getOrderDataForEntry(tableEntry);
  if (!order?.orderId) return;
  try {
    // CR-559 R2: web/scan Accept — printer_agent on the confirm payload (payload parity),
    // gated by BOTH auto-print toggles; then mark KOT printed. No order-temp-store call.
    let printerAgent = [];
    if (order.isWebOrder && settings?.autoKot && settings?.scanOrderAutoPrint) {
      const items = Array.isArray(order.items) ? order.items : [];
      const isWebEdit = items.some(it => it.isNotConfirmed);                         // Mode B = web edit
      const confirmItems = isWebEdit ? items.filter(it => it.isNotConfirmed) : items; // OD-2
      const kotAgents = selectAgentsForKot(printerAgents || [], cartStationsToSet(confirmItems));
      printerAgent = [...kotAgents, ...selectAgentsForBill(printerAgents || [])];     // OD-R2-2 [KOT,BILL]
    }
    await confirmOrder(order.orderId, permissions?.[0] || 'Manager', defaultOrderStatus, printerAgent);
    if (printerAgent.length > 0) {
      await updatePrintStatus(order.orderId, { kot_print: 'Yes', bill_print: 'No' }); // OD-R2-3
    }
  } catch (err) {
    console.error('[DashboardPage] Failed to confirm order:', err);
  }
}, [getOrderDataForEntry, permissions, defaultOrderStatus, settings, printerAgents]); // CR-559 R2: -getProductById
```
Notes: gate now **AND** of `autoKot`+`scanOrderAutoPrint`. `printOrder`/`getStationsFromOrderItems` call removed
from this fn. `getProductById` dropped from deps (unused here; still used at L1766, untouched).

### E3 — `frontend/src/api/services/orderService.js` · `confirmOrder` (L70-74) — replace
```js
export const confirmOrder = async (orderId, roleName, orderStatus = 'paid', printerAgent = null) => {
  const payload = {
    ...toAPI.updateOrderStatus(orderId, roleName, orderStatus),
    ...(Array.isArray(printerAgent) && printerAgent.length ? { printer_agent: printerAgent } : {}), // CR-559 R2
  };
  const response = await api.put(API_ENDPOINTS.CONFIRM_ORDER, payload);
  return response.data;
};
```
Shared `toAPI.updateOrderStatus` stays 3-arg (ready/serve/cancel untouched); `printer_agent` only when non-empty.

### E4 — `frontend/src/api/services/orderService.js` · new export (after `confirmOrder`)
```js
// CR-559 R2: mark print status after a web/scan Accept that sent printer_agent (reuses CR-512 endpoint).
export const updatePrintStatus = async (orderId, { kot_print = 'No', bill_print = 'No' } = {}) => {
  const response = await api.post(API_ENDPOINTS.CONFIRM_PRINT_STATUS, {
    order_id: Number(orderId),
    bill_print,
    kot_print,
  });
  return response.data;
};
```
`CONFIRM_PRINT_STATUS` already in `API_ENDPOINTS` (constants.js:110) + imported (orderService L4). No new import.

### E5 — `frontend/src/contexts/OrderContext.jsx` · **VERIFY ONLY**
`orderItemsByTableId` already carries `isWebOrder` (L348, CR-559 E5). No change.

### E6 — Tests
- New `src/__tests__/api/services/orderService.cr559r2.test.js`:
  - `confirmOrder` with non-empty `printerAgent` → payload has `printer_agent`; with `[]`/null → no `printer_agent`; never a `print_kot` key.
  - `updatePrintStatus(id,{kot_print:'Yes',bill_print:'No'})` → POST `CONFIRM_PRINT_STATUS` with `{order_id:Number,bill_print:'No',kot_print:'Yes'}`.
- Existing `profileTransform.cr559` (scanOrderAutoPrint) stays valid.

---

## Verification Matrix (seeds QA)
| # | File | Change | How to verify | Automated |
|---|---|---|---|:---:|
| 1 | orderService.confirmOrder | printer_agent only when non-empty; no print_kot | unit cr559r2 | YES |
| 2 | orderService.updatePrintStatus | posts `{order_id,kot_print,bill_print}` | unit cr559r2 | YES |
| 3 | DashboardPage.handleConfirmOrder | gate AND; `[KOT,BILL]` on confirm PUT; **no** order-temp-store; then update-print-status | Browser Network: Accept web order, both toggles ON | NO (live) |
| 4 | gate OFF (one toggle off) / non-web | plain `{order_id,role_name,order_status}`; no printer_agent; no update-print-status | Browser Network | NO (live) |
| 5 | ready/serve/cancel | payloads unchanged | unit + Network | PARTIAL |

## Risk Register
| Risk | Likelihood | Mitigation |
|---|---|---|
| Backend doesn't act on printer_agent / update-print-status doesn't fire KOT | Med | **Gate-4 live Accept probe** (owner-run or authorized) before closing |
| Routing fires on non-web / ready-serve | Low | isWebOrder gate + printer_agent only in confirmOrder + non-empty guard |
| Double print | Low | order-temp-store call removed; manual KOT unchanged |
| update-print-status failure | Low | inside handleConfirmOrder try/catch → logged, non-fatal; no auto-retry (CR-512) |
| Station miss (item absent from menu) | Low | `cartStationsToSet` reads item `.station` directly (no menu dependency) |

## Execution Sequence
E3 → E4 (service) → E1 → E2 (page) → E6 (tests) → `yarn build` + jest → self-test.

## Scope Lock
WILL change: `pages/DashboardPage.jsx`, `api/services/orderService.js`, +new test.
VERIFY only: `contexts/OrderContext.jsx`.
WILL NOT touch: `toAPI.updateOrderStatus` (shared), `updateOrderStatus` service (ready/serve), cancel paths,
`orderTransform.js` Place/Update builders, aggregator accept, manual KOT (CR-545/547), `ScanOrderPopOut.jsx`,
`profileTransform.js`, `printerAgentSelector.js`.

## Post-Code Registry Checklist (Implementation agent executes)
- [ ] `registry.json`: CR-559 → note R2 (status IMPLEMENTED, sprint nov_cr_batch)
- [ ] `CR_REGISTRY.md`: R2 row → GATE_5A_IMPLEMENTED
- [ ] `FILE_OWNERSHIP.md`: CR-559 R2 — update entries (now DOES touch `orderService.js`/`confirmOrder` + new `updatePrintStatus`; `DashboardPage.handleConfirmOrder` reworked; order-temp-store removed). Supersede the "NOT touched: orderService.js/confirmOrder" note from the original CR-559 block.
- [ ] Markers `// CR-559 R2` in `DashboardPage.jsx` + `orderService.js`
- [ ] `yarn build` exit 0; jest cr559r2 green

## Handover → Owner (Gate 4)
Plan ready. 4 code edits across 2 files (+1 test); OrderContext verify-only. Code reality FULL (reversal).
Verification matrix: 5 (2 automated, 3 live). Owner decisions: locked. **Awaiting Gate-4 GO + live Accept probe
(or authorization to run it with preprod creds pms@macha.com).**
