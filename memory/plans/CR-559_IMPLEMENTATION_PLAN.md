# IMPLEMENTATION PLAN (Gate 3, FINAL v3 — GATE-3 GO) — CR-559

**Date:** 2026-11-20 · **Role:** PLANNING (Gate 3 — plan only, NO code) · **Risk:** CRITICAL (printing / order flow) · **Priority:** P1
**Item:** CR-559 — Web/Scan **Accept** auto-prints the **KOT** by reusing the manual-KOT process, gated by the Scan-Order Auto-print setting.
**Branch verified:** `67b3e41` (re-pull 2026-11-20). **Supersedes** plan v1/v2.
**Status:** GATE-3 GO (owner, 2026-11-20). **Implementation deferred** until PRE-IMPL VALIDATION passes (backend must surface the flag in the profile payload).

---

## Locked owner decisions
- **OD-1 — SUPERSEDED.** Accept does NOT add `printer_agent` to the confirm payload. The confirm endpoint stays byte-identical.
- **OD-2 — KEPT.** KOT station set: new web order = ALL items; web edit = ONLY food_status-7 (`isNotConfirmed`) items.
- **OD-3 — SUPERSEDED.** **KOT only** on Accept. **No BILL** is auto-printed on Accept.
- **OD-4 — KEPT.** Auto-print on Accept is gated by the restaurant's **Scan-Order Auto-print** toggle (`scanOrderAutoPrint`).
- **OD-5 — Option A (backend).** Backend adds `scan_order_auto_print` to the **profile** payload at `restaurants[0]` root (parity with `print_kot` / `billing_auto_bill_print`). FE maps it one line.
- **Accept mechanism:** reuse the proven manual-KOT process — `printOrder(orderId, 'kot', stationKot, order, 0, {}, printerAgents)` → `POST /order-temp-store` (builds `printer_agent` internally) then `POST /update-print-status { kot_print: 'Yes' }`. The prior "do NOT call printOrder after accept" rule is intentionally reversed (safe: backend auto-print suppressed + web-only + toggle-gated → no double print).

---

## Step 0 — Code Reality (branch 67b3e41, 2026-11-20) — NONE implemented
- `pages/DashboardPage.jsx:1364-1377` `handleConfirmOrder` → `confirmOrder(order.orderId, permissions?.[0]||'Manager', defaultOrderStatus)`; deps `[getOrderDataForEntry, permissions, defaultOrderStatus]`. No print, no gate.
- `pages/DashboardPage.jsx:1748-1768` `handleScanPrintKOT` already does `getStationsFromOrderItems(items, getProductById)` → `printOrder(id,'kot',stationKot, order,0,{}, printerAgents)`. **`printOrder`, `getStationsFromOrderItems`, `getProductById` are already imported/in-scope** → E4 reuses them inline (no new imports).
- `api/transforms/profileTransform.js:345-442` settings block exposes `autoKot`(=`print_kot`), `autoBill`, etc. — **no `scanOrderAutoPrint`**.
- `contexts/OrderContext.jsx:327-360` `orderItemsByTableId` whitelist carries `fOrderStatus` (L347) but **NOT `isWebOrder`** (RC-2). Table/room path of `getOrderDataForEntry` (DashboardPage:1342) drops the flag; takeaway/delivery/walk-in (1329-1331) + BUG-082 fallback (1356) keep it.
- `printOrder` (`orderService.js:134-200`) internally builds `printer_agent` via `selectAgentsForKot`; confirm print via CONFIRM_PRINT_STATUS `kot_print:'Yes'`. UNTOUCHED by this CR.

## Step 1 — Conflict Pre-Check — CLEAN
3 target files, additive. Open **BUG-721** edits DashboardPage but a different area (TableCard permission gating), not `handleConfirmOrder` — no line overlap; second lander rebases. `orderService.js` / `profileTransform.js` / `OrderContext.jsx` — no non-CLOSED item owns an overlapping change.

## Probe evidence (PROBE-1 / PROBE-2)
`memory/evidence/CR-559/` — profile payload lacks the flag today; `printer-agent-config` has `settings_config.auto_printing.scan_order_auto_print = "Yes"`. Backend (OD-5-A) will add the same value at profile root.

---

## Edits (exact)

**E1 — `api/transforms/profileTransform.js` (~L377, settings block)** — map the backend-added flag (OD-5 Option A, root path parity with `print_kot`):
```js
// CR-559 (OD-4): Scan-Order Auto-print gate for web/scan Accept KOT printing.
scanOrderAutoPrint: toBoolean(apiSettings.scan_order_auto_print),
```

**E4 — `pages/DashboardPage.jsx:1364-1377` `handleConfirmOrder`** — after confirm, web-only + gate-on → run the KOT process (inline mirror of handleScanPrintKOT; `settings` + `printerAgents` already come from `useRestaurant()`):
```js
const handleConfirmOrder = useCallback(async (tableEntry) => {
  const order = getOrderDataForEntry(tableEntry);
  if (!order?.orderId) return;
  try {
    await confirmOrder(order.orderId, permissions?.[0] || 'Manager', defaultOrderStatus);

    // CR-559 (OD-2/OD-4): web/scan orders only, and only when Scan-Order Auto-print is ON.
    // KOT only (OD-3 superseded). Reuses the manual-KOT process via printOrder.
    if (order.isWebOrder && settings?.scanOrderAutoPrint) {
      const items = Array.isArray(order.items) ? order.items : [];
      const isWebEdit = items.some(it => it.isNotConfirmed);               // Mode B = web edit
      const confirmItems = isWebEdit ? items.filter(it => it.isNotConfirmed) : items; // OD-2
      const stations = getStationsFromOrderItems(confirmItems, getProductById);
      if (stations.length > 0) {
        const stationKot = stations.map(s => s.station).join(',');
        await printOrder(order.orderId, 'kot', stationKot, order, 0, {}, printerAgents || []);
      }
    }
  } catch (err) {
    console.error('[DashboardPage] Failed to confirm order:', err);
  }
}, [getOrderDataForEntry, permissions, defaultOrderStatus, settings, printerAgents, getProductById]);
```
Do NOT print BILL. Do NOT send `printer_agent` on the confirm call. Printing is non-blocking relative to the confirm (confirm already succeeded).

**E5 — `contexts/OrderContext.jsx:347` (orderItemsByTableId whitelist)** — carry the web flag so the gate works on table/room web orders (RC-2 fix):
```js
isWebOrder: order.isWebOrder || false, // CR-559: handleConfirmOrder web gate (table/room path)
```

**Dropped from earlier plans:** E2 (`orderService.confirmOrder` 4th param) and E3 (printerAgentSelector imports in DashboardPage) — NOT needed; `printOrder` already encapsulates agent selection.

## Tests (add)
- extend `api/transforms/__tests__/profileTransform.test.js`: `scanOrderAutoPrint` true when `scan_order_auto_print:'Yes'` at root; false when absent.
- NEW `pages/__tests__/DashboardPage.confirmPrint.cr559.test.js` (or service-level): on web order + gate ON, Accept triggers one KOT `printOrder` with the correct `station_kot`; gate OFF or non-web → no `printOrder` call; `confirmOrder` payload unchanged.

## Verification Matrix (seeds QA — browser net-intercept, no real prints)
| # | Scenario | Expected |
|---|----------|----------|
| 1 | Web NEW order, Auto-print ON, Accept | 1× confirm (unchanged payload) → 1× `order-temp-store` KOT (all items' stations) → `update-print-status kot_print:'Yes'`. No BILL. |
| 2 | Web EDIT order, Auto-print ON, Accept | KOT `station_kot` from food_status-7 (`isNotConfirmed`) items only. No BILL. |
| 3 | Web order, Auto-print **OFF**, Accept | confirm only; **no** `order-temp-store`, nothing prints. |
| 4 | **Non-web** confirm | confirm only; no print path entered. |
| 5 | Web order on physical table/room (E5 path), ON | gate passes (isWebOrder survived whitelist); KOT fires. |
| 6 | Gate ON but stations empty | confirm succeeds; no KOT call (guarded by `stations.length`). |
| 7 | profileTransform unit | `scanOrderAutoPrint` maps root flag; false when missing. |

## Risk Register
| Risk | Likelihood | Mitigation |
|---|---|---|
| KOT fires on non-web confirm | Low | `order.isWebOrder` gate |
| Fires when owner wanted OFF | Low | `settings.scanOrderAutoPrint` gate (OD-4) + backend flag (OD-5-A) |
| Double KOT (manual button + accept) | Low | distinct user actions; backend auto-print suppressed; accept gated |
| Gate never true (flag missing from profile) | **Med** | **PRE-IMPL VALIDATION** blocks build until profile carries `scan_order_auto_print` |
| isWebOrder leak breaks table consumers | Low | additive, default false |
| Print error rolls back confirm | None | print is after confirm; wrapped; confirm already persisted |

## Scope lock
WILL change: `profileTransform.js`, `DashboardPage.jsx`, `OrderContext.jsx` (+2 tests).
WILL NOT touch: `orderService.js` / `confirmOrder` / `toAPI.updateOrderStatus`, `printOrder`, `handleScanPrintKOT`, aggregator accept path, Place/Update builders, `ScanOrderPopOut.jsx`, `printerAgentConfigTransform.js`.

## PRE-IMPLEMENTATION VALIDATION (owner-gated — blocks Gate-4 build)
Before coding, re-run and confirm the profile now carries the flag:
```
cd /app && python3 memory/evidence/CR-559/CR-559_probe.py
# PASS = restaurants[0].scan_order_auto_print present (expect "Yes" for Goan Kitchen)
```
Only on PASS → IMPLEMENTATION (E1, E4, E5 + 2 tests) → QA via matrix.

## Post-Code Registry Checklist (for IMPLEMENTATION agent)
- [ ] registry.json: CR-559 → IMPLEMENTED
- [ ] CR_REGISTRY.md row updated
- [ ] FILE_OWNERSHIP.md: profileTransform.js, DashboardPage.jsx, OrderContext.jsx
- [ ] Code markers: `// CR-559` in each modified file
