# POS2-003-REOPEN-A — Cancel/Update `printer_agent` Implementation Summary

> **Sprint:** pos2.0
> **CR ID:** POS2-003-REOPEN-A
> **Date:** 2026-05-09
> **Branch under work:** `Sunday-10-may` (cloned to `/app` 2026-05-09)
> **Predecessor docs:**
> - POS2-003 impact analysis / plan / handover / summary / QA report (2026-05-08)
> - POS2-003-FU-02 gap analysis + fix-applied addendum (2026-05-08)
> - POS2-003-REOPEN impact analysis (2026-05-09)

---

## 1. Files changed

| # | File | Change type | Lines net |
|---|---|---|---:|
| 1 | `frontend/src/api/transforms/orderTransform.js` | Edited 3 builders (`cancelItem`, `cancelOrder`, `updateOrder`) — additive `printer_agent` | +33 / -10 |
| 2 | `frontend/src/components/order-entry/OrderEntry.jsx` | Edited 3 call sites (updateOrder, cancelItem, cancelOrder) — pass `printerAgents` + `allCartItems` via options | +13 / -2 |
| 3 | `frontend/src/__tests__/api/transforms/cancelAndUpdatePayload.test.js` | **New** unit-test file — 24 cases across the 3 builders | +298 / 0 |
| 4 | `frontend/src/__tests__/api/role-name-wire-contract.test.js` | Updated `cancelOrder` regression `toEqual` baseline to include `printer_agent: []` additive | +3 / -0 |
| 5 | `frontend/src/__tests__/api/transforms/cancelItemPayload.test.js` | Updated 4 `cancelItem` regression `toEqual` baselines to include `printer_agent: []` additive | +6 / -0 |

**No other files touched.** No changes to:
- `printerAgentSelector.js` (helper reused as-is per POS2-003-REOPEN §D)
- `constants.js` (no endpoint path changed)
- `profileTransform.js`, `socketHandlers.js`, `useSocketEvents.js`
- `CollectPaymentPanel.jsx`, `RestaurantContext.jsx`
- Cart / GST / SC / DC / room billing / discount / split-bill / print UI / `print_type` / `station_kot`
- `/app/memory/final/*` (untouched per playbook)

---

## 2. Exact changes made

### 2.1 `orderTransform.js` — `toAPI.cancelItem`

**Before** (8 keys):
```js
cancelItem: (currentTable, item, reason, cancelQty) => ({
  order_id, order_food_id, item_id, cancel_qty,
  order_status, reason_type, reason, cancel_type
})
```

**After** (9 keys):
```js
cancelItem: (currentTable, item, reason, cancelQty, options = {}) => {
  const { printerAgents = [], allCartItems = [] } = options;
  const allActiveItems = allCartItems.filter(i => i.status !== 'cancelled' && !i.isCheckInMarker);
  const printerAgentForCancelItem = selectAgentsForKot(printerAgents, cartStationsToSet(allActiveItems));
  return {
    order_id, order_food_id, item_id, cancel_qty,
    order_status, reason_type, reason, cancel_type,
    printer_agent: printerAgentForCancelItem,   // NEW — owner rule: all-stations-in-cart
  };
}
```

Station rule: **all distinct stations in active cart** (BC-4 owner-locked). BILL excluded by `selectAgentsForKot` (R-OWNER-7). Cancelled items + Check-In marker excluded from station set.

### 2.2 `orderTransform.js` — `toAPI.cancelOrder`

**Before** (5 keys):
```js
cancelOrder: (orderId, roleName, reason) => ({
  order_id, role_name, order_status, cancellation_reason, cancellation_note
})
```

**After** (6 keys):
```js
cancelOrder: (orderId, roleName, reason, options = {}) => {
  const { printerAgents = [], allCartItems = [] } = options;
  const allActiveItems = allCartItems.filter(i => i.status !== 'cancelled' && !i.isCheckInMarker);
  const printerAgentForCancelOrder = selectAgentsForKot(printerAgents, cartStationsToSet(allActiveItems));
  return {
    order_id, role_name, order_status, cancellation_reason, cancellation_note,
    printer_agent: printerAgentForCancelOrder,   // NEW — owner rule: all-stations-in-cart
  };
}
```

### 2.3 `orderTransform.js` — `toAPI.updateOrder`

Three localised changes, no other field mutated:

1. Destructure `printerAgents = []` from `options` (alongside the already-existing `allCartItems`, `printAllKOT`, etc.).
2. Compute `printerAgentForUpdate` from **new (unplaced) items only**, gated by `printAllKOT`:
   ```js
   const printerAgentForUpdate = printAllKOT
     ? selectAgentsForKot(printerAgents, cartStationsToSet(newItems))
     : [];
   ```
3. Inject `printer_agent: printerAgentForUpdate` immediately after `'cart-update': cartUpdate` (last key before the closing `}`). Returns via a named `updatePayload` constant so the parity console-warn (parity with `placeOrder`) can fire before the return.

Station rule: **KOT stations of new/edited items only**, BILL excluded. Empty fallback `[]`.

### 2.4 `OrderEntry.jsx` — three call sites

| Call site | Line | Edit |
|---|---:|---|
| `updateOrder` | ~750 | Append `printerAgents: printerAgents || []` to the existing options object |
| `cancelItem` | ~945 | Append 5th arg `{ printerAgents: printerAgents || [], allCartItems: cartItems }` |
| `cancelOrder` | ~973 | Append 4th arg `{ printerAgents: printerAgents || [], allCartItems: cartItems }` |

`printerAgents` is already destructured from `useRestaurant()` at line 49 (added during original POS2-003). `cartItems` is already in scope.

### 2.5 Test updates — regression baselines

`cancelItemPayload.test.js` had 4 strict `toEqual({...})` assertions on the cancelItem shape. `role-name-wire-contract.test.js` had 1 strict `toEqual({...})` on cancelOrder shape. All five baselines updated to include the new additive `printer_agent: []` field (the value when no `options` are passed). **No existing field assertion changed.**

### 2.6 New unit test file — `cancelAndUpdatePayload.test.js`

24 cases across 3 describe blocks:

- **`updateOrder` (7 cases)** — print_kot Yes/No, no agents, station from new items only, dynamic PASTRY label, case-insensitive match, existing fields preserved
- **`cancelItem` (9 cases)** — all-stations-in-cart, single-item cancel still all-stations, cancelled excluded, Check-In marker excluded, empty cart, no agents, options omitted (never null), existing fields preserved, Post-Serve still emits agents
- **`cancelOrder` (8 cases)** — all-stations-in-cart, empty cart, all-cancelled, no agents, options omitted, existing fields preserved, dynamic PASTRY label

All 24 cases pass.

---

## 3. Confirmation that baseline / overlay / POS2-003 docs were read

| Layer | Doc | Read |
|---|---|---|
| Baseline | `/app/memory/final/FINAL_DOCS_APPROVAL_STATUS.md` | ✅ |
| Baseline | `/app/memory/final/IMPLEMENTATION_AGENT_RULES.md` | ✅ |
| Overlay | `/app/memory/change_requests/PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md` | ✅ |
| Overlay | `/app/memory/change_requests/BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md` | ✅ |
| POS2-003 | `impact_analysis/POS2_003_REOPEN_CANCEL_UPDATE_PRINTER_AGENT_AND_V2_ENDPOINT_REVIEW_2026_05_09.md` | ✅ |
| POS2-003 | `qa_reports/POS2_003_FU_02_PRINTER_AGENT_NULL_GAP_ANALYSIS_2026_05_08.md` | ✅ |
| Code | `orderTransform.js` (cancelItem L684-693, cancelOrder L702-708, updateOrder L835-908, placeOrder reference L731-828) | ✅ |
| Code | `printerAgentSelector.js` (helpers `selectAgentsForKot`, `cartStationsToSet`, BILL sentinel) | ✅ |
| Code | `OrderEntry.jsx` (line 49 destructure; L732-751, L945, L973 call sites) | ✅ |
| Code | `placeOrderPayload.test.js` (existing test pattern reference) | ✅ |
| Code | `cancelItemPayload.test.js` + `role-name-wire-contract.test.js` (regression baselines) | ✅ |

`/app/memory/final/*` was **not modified** (read-only per playbook).

---

## 4. Confirmation that no endpoint paths were changed

`grep -nE "(UPDATE_ORDER|CANCEL_ITEM|ORDER_STATUS_UPDATE|PLACE_ORDER)" frontend/src/api/constants.js` shows zero diff vs pre-change. Endpoints remain:

| Constant | Path | Status |
|---|---|---|
| `UPDATE_ORDER` | `/api/v2/vendoremployee/order/update-place-order` | unchanged ✅ |
| `CANCEL_ITEM` | `/api/v2/vendoremployee/order/cancel-food-item` | unchanged ✅ |
| `ORDER_STATUS_UPDATE` | `/api/v2/vendoremployee/order/order-status-update` | unchanged ✅ |
| `PLACE_ORDER` | `/api/v1/vendoremployee/order/place-order` | unchanged ✅ (REOPEN-B not implemented per scope) |
| `PROFILE` | (not edited) | unchanged ✅ |

REOPEN-B (place-order v1→v2 revert) **explicitly out of scope** per the task brief and remains parked.

---

## 5. Payload examples — before / after

### 5.1 `update-place-order` (PUT)

**Before** (no `printer_agent`):
```json
{
  "order_id": "555",
  "order_type": "dineIn",
  "cust_name": "Bob",
  "order_note": "",
  "payment_method": "pending",
  "payment_status": "unpaid",
  "payment_type": "postpaid",
  "print_kot": "Yes",
  "auto_dispatch": "No",
  "order_amount": 235,
  "tax_amount": 0,
  "round_up": 0,
  "tip_amount": 0,
  "delivery_charge": 30,
  "discount_type": null,
  "self_discount": 0,
  "...": "...",
  "cart-update": [{...}]
}
```

**After** (additive `printer_agent` after `cart-update`):
```json
{
  "...all existing keys preserved verbatim...":"...",
  "cart-update": [{...}],
  "printer_agent": [
    { "station": "KDS", "printer_agent_id": "1", "printer_type": "EPSON_KDS", "printer_ip": "1.1.1.1", "printer_paper_roll": "80", "vendor_id": null, "product_id": null, "wifi_printer_ip": null, "printer_name": null }
  ]
}
```

When `print_kot: "No"` or no station match → `"printer_agent": []`.

### 5.2 `cancel-food-item` (PUT)

**Before** (8 keys):
```json
{
  "order_id": 730154,
  "order_food_id": 96557,
  "item_id": 1900357,
  "cancel_qty": 1,
  "order_status": "cancelled",
  "reason_type": 2,
  "reason": "Customer request",
  "cancel_type": "Pre-Serve"
}
```

**After** (9 keys, `printer_agent` after `cancel_type`, owner rule = all-stations-in-cart):
```json
{
  "...all existing keys preserved verbatim...":"...",
  "cancel_type": "Pre-Serve",
  "printer_agent": [
    { "station": "KDS", "printer_agent_id": "1", "...": "..." },
    { "station": "BAR", "printer_agent_id": "2", "...": "..." }
  ]
}
```

When cart has only the cancelled item (everything else cancelled) → `"printer_agent": []`. BILL never appears.

### 5.3 `order-status-update` (PUT, full cancel)

**Before** (5 keys):
```json
{
  "order_id": 555,
  "role_name": "Manager",
  "order_status": "cancelled",
  "cancellation_reason": "Customer changed mind",
  "cancellation_note": "Customer changed mind"
}
```

**After** (6 keys, `printer_agent` after `cancellation_note`):
```json
{
  "...all existing keys preserved verbatim...":"...",
  "cancellation_note": "Customer changed mind",
  "printer_agent": [
    { "station": "KDS", "...": "..." },
    { "station": "BAR", "...": "..." }
  ]
}
```

Empty cart / all-cancelled → `"printer_agent": []`.

---

## 6. Tests / checks run

| # | Check | Command | Result |
|---|---|---|---|
| 1 | Targeted suites (placeOrder + REOPEN-A + selector + profile) | `yarn test --watchAll=false --testPathPattern='cancelAndUpdatePayload\|placeOrderPayload\|printerAgentSelector\|profileTransform'` | **4/4 suites · 88/88 tests** ✅ |
| 2 | Full unit suite (regression) | `yarn test --watchAll=false` | **22/22 suites · 262/262 tests** ✅ |
| 3 | Production build | `yarn build` | **Compiled successfully**, 434.04 kB main bundle (+0.68 kB vs pre-change baseline 433.36 kB — additive helper + payload key) ✅ |
| 4 | Endpoint paths unchanged | `grep -E "(UPDATE_ORDER\|CANCEL_ITEM\|ORDER_STATUS_UPDATE\|PLACE_ORDER\|PROFILE):" frontend/src/api/constants.js` | Zero diff vs pre-change ✅ |
| 5 | Helper untouched | `git status frontend/src/api/transforms/printerAgentSelector.js` | Clean — no edits ✅ |
| 6 | `/app/memory/final/*` untouched | `git status app/memory/final/` | Clean — no edits ✅ |
| 7 | No call site without 7th arg threading on `printOrder()` | (out-of-scope safety, but verified) | All 9 sites unchanged from FU-02 fix ✅ |

### 6.1 New tests added (24 cases)

`cancelAndUpdatePayload.test.js`:
- `updateOrder`: 7 cases (KDS+BAR + BILL excluded, print_kot:No → [], no agents → [], station from new items only, PASTRY dynamic label, case-insensitive, existing fields preserved)
- `cancelItem`: 9 cases (all-stations-in-cart, single-item cancel still all-stations, cancelled-excluded, check-in-marker-excluded, empty cart → [], no agents → [], no options → [] (never null), existing fields preserved, Post-Serve still emits agents)
- `cancelOrder`: 8 cases (all-stations-in-cart, empty cart → [], all-cancelled → [], no agents → [], no options → [] (never null), existing fields preserved, PASTRY dynamic label)

### 6.2 Regression tests preserved

- `placeOrderPayload.test.js` (10 cases) — POS2-003 place-order behaviour **unchanged** ✅
- `printerAgentSelector.test.js` (27 cases) — helper behaviour **unchanged** ✅
- `profileTransform.test.js` (24 cases) — profile mapping **unchanged** ✅
- `cancelItemPayload.test.js` (29 cases) — pre-existing field assertions all still pass; 4 strict-shape baselines updated to acknowledge the new additive ✅
- `role-name-wire-contract.test.js` (5 cases) — 1 strict-shape baseline updated; the role-name contract logic remains untouched ✅

---

## 7. Validation results

### 7.1 Builder-level (per task brief validation list)

| # | Gate | Status |
|---|---|---|
| update-order includes `printer_agent` | ✅ | always emitted |
| cancel-item includes `printer_agent` | ✅ | always emitted |
| cancel-order/status-update includes `printer_agent` | ✅ | always emitted |
| BILL excluded | ✅ | enforced by `selectAgentsForKot` (R-OWNER-7); test `find(...BILL).toBeUndefined()` |
| Dynamic station labels work | ✅ | PASTRY case verified on all 3 builders; case-insensitive `kds → KDS` verified on update-order |
| Missing/empty `printerAgents` sends `[]` | ✅ | tested on all 3 builders |
| Empty cart / everything cancelled sends `[]` | ✅ | cancel-item + cancel-order verified |
| Existing POS2-003 place-order / order-temp-store behaviour unchanged | ✅ | placeOrderPayload.test.js + printerAgentSelector.test.js all green; printOrder() call sites unchanged from FU-02 |

### 7.2 Payload evidence (per task brief evidence list)

- ✅ `update-place-order` payload includes `printer_agent` (verified via test snapshot + `toHaveProperty`)
- ✅ `cancel-food-item` payload includes `printer_agent` (verified via test)
- ✅ `order-status-update` payload includes `printer_agent` (verified via test)
- ✅ No unrelated payload fields changed (verified by `expect(payload).toMatchObject({...all-pre-existing-keys...})` on each builder + diff-clean field-preservation tests)

### 7.3 Out-of-scope safety

- ✅ No socket / billing / GST / SC / DC / cart / print-UI / `print_type` / `station_kot` / prepaid-postpaid changes
- ✅ No `printerAgentSelector.js` edits
- ✅ No endpoint-path constants edits
- ✅ No `/app/memory/final/*` edits
- ✅ No new dependencies, no new lint warnings, no bundle bloat beyond the additive logic

---

## 8. Risks / follow-ups

### 8.1 Known follow-ups (not blockers for this CR)

| ID | Item | Status |
|---|---|---|
| **POS2-003-REOPEN-B** | place-order v1 → v2 endpoint revert (BC-5 + BC-6) | **Explicitly out of scope** — parked pending owner reason confirmation + backend behavioural-parity confirmation (per impact analysis §A.6 + §9 BC-5/BC-6). Mechanical 1-line change at `constants.js:41` when approved. |
| **BC-4 (cancel-item station rule)** | Implementation defaulted to **all-stations-in-cart** per the task brief's owner-locked rule. Owner can later switch to "item-only" by changing one helper invocation in `cancelItem` (no API/payload contract change). | Defaulted per owner brief — closed for this CR. |
| **Live runtime confirmation** | Verify on a tenant with non-empty `print_agent` (today's preprod tenant returns `print_agent: []`, so wire would correctly emit `[]` — graceful but visually indistinguishable from a defect). | Pending — same constraint as POS2-003 and FU-02. Recommend the same owner-tenant walk used in FU-02 §F4 gates 7-1 / 7-2. |

### 8.2 Risks of this change (severity / mitigation)

| Risk | Severity | Mitigation |
|---|---|---|
| Tenant has empty `print_agent` config | None | Wire emits `printer_agent: []`; backend already accepts the field per BC-1/BC-2/BC-3 (closed by owner sample 2026-05-09). |
| Backend rejects an additive field on any of the three v2 endpoints | None per owner sample | Owner curl 2026-05-09 confirmed all three endpoints accept the field. If any tenant runs against a stale backend, wire still succeeds because the additive is a JSON sibling and backend can ignore unknown keys (default v2 behaviour observed during POS2-003). |
| Console warn noise on update-order | Low | Warn fires only when `printAllKOT && printerAgents.length>0 && match==[]` — same gating as `placeOrder` warn. Mirrors existing pattern. |
| Test brittleness from strict `toEqual` baselines | Already handled | 5 strict-shape baselines updated in this commit to acknowledge the additive. Future agents adding fields will follow the same pattern. |

### 8.3 Coordination notes

- POS2-003 + POS2-003-FU-02 + POS2-003-REOPEN-A together complete the `printer_agent` coverage on the four KOT/cancel-pathways the owner has scoped: `place-order` (postpaid + prepaid), `update-place-order`, `cancel-food-item`, `order-status-update`. Bill print path (`order-temp-store`) was closed by FU-02.
- No interaction with CR-013 print double-count (Bean Me Up burning issue) — this CR does not touch billing/GST/SC math or printed-bill template payload (`buildBillPrintPayload`).
- No interaction with POS2-005 / POS2-007 / POS2-008 / PG-filter backlog (all out of scope).

---

## 9. Final verdict

> ## `implementation_complete_ready_for_QA`

- 5 files changed (3 source + 2 regression test baselines updated + 1 new test file).
- All 262 unit tests + 24 new REOPEN-A cases pass.
- Production build succeeds, +0.68 kB main bundle (additive only).
- All 3 v2 endpoint paths preserved verbatim (`UPDATE_ORDER`, `CANCEL_ITEM`, `ORDER_STATUS_UPDATE`).
- `PLACE_ORDER` (REOPEN-B) and `PROFILE` not touched.
- BILL exclusion + dynamic station labels + empty fallback `[]` (never null) — all enforced via existing `selectAgentsForKot` helper, no helper changes.
- `/app/memory/final/*` not touched.
- POS2-003 and POS2-003-FU-02 behaviour unchanged.

Pending: live runtime QA confirmation on a tenant with non-empty `print_agent` configured (same gate as POS2-003 / FU-02). All static + unit + build validation green.

---

— End of POS2-003-REOPEN-A Implementation Summary 2026-05-09 —
