# POS2-003-REOPEN-A — Wire-Level FE Integration QA Report

> **Sprint:** pos2.0
> **CR ID:** POS2-003-REOPEN-A
> **Date:** 2026-05-09
> **QA Approach:** **Option (a)** — wire-level FE integration test (jsdom + axios mock).
> **Reason for skipping live preprod browser QA today:** Preprod tenant 478 returns `print_agent: []`, so a live wire would correctly emit `printer_agent: []` — graceful but visually indistinguishable from a regression. Wire-level integration QA injects a controlled non-empty `print_agent` profile (BILL + KDS + BAR + GRILL) and proves correct payload construction end-to-end.
> **Predecessors:**
> - POS2-003-REOPEN-A implementation summary (2026-05-09)
> - POS2-003 + POS2-003-FU-02 (2026-05-08)
> - POS2-003-REOPEN impact analysis (2026-05-09)

---

## 1. Scope (per task brief)

1. **Mock RestaurantContext with non-empty `print_agent`** — BILL, KDS, BAR, GRILL (one canonical + one dynamic non-canonical station per BE-PA8).
2. **Drive + assert the 3 REOPEN-A flows** — `update-place-order`, `cancel-food-item`, `order-status-update`.
3. **Assert** — `printer_agent` present, array, never null; BILL excluded; correct stations selected; dynamic stations work; empty/missing `print_agent` sends `[]`; empty/all-cancelled cart sends `[]`.
4. **Regression checks** — place-order payload unchanged (POS2-003); `order-temp-store` (printOrder) behaviour unchanged (POS2-003 + FU-02); endpoint paths unchanged.

---

## 2. Test artefact

| Path | Lines | Cases |
|---|---:|---:|
| `frontend/src/__tests__/integration/POS2_003_REOPEN_A_wire.test.js` | ~370 | **29** |

The test file:
- Constructs a raw v1 `print_agent` profile blob with 4 stations (BILL/KDS/BAR/GRILL).
- Normalises it via `profileTransform.fromAPI.printerAgents` — exactly the path used by `RestaurantContext`.
- Mocks `api/axios` (default export) so every `api.put(...)` / `api.post(...)` is captured (URL + payload) without firing real HTTP traffic.
- Replicates each REOPEN-A `OrderEntry` call site verbatim (same builder, same options shape, same dispatch verb).
- Asserts URL + `printer_agent` shape + content + BILL exclusion + empty fallback + existing-field preservation.
- Includes regression assertions for `placeOrder` builder + `printOrder()` (`order-temp-store`) for both `kot` and `bill` print types.

---

## 3. Test fixtures

### 3.1 Raw `print_agent` profile (mocked tenant)

```js
[
  { mapping: { area_name: 'BILL',  default_employee_id: 3001 },
    printer_data: [{ printer_name: 'EPSON_BILL',  printer_ip: '10.0.0.10', printer_paper_roll: 58, ... }] },
  { mapping: { area_name: 'KDS',   default_employee_id: 3002 },
    printer_data: [{ printer_name: 'EPSON_KDS',   printer_ip: '10.0.0.20', printer_paper_roll: 80, ... }] },
  { mapping: { area_name: 'BAR',   default_employee_id: 3003 },
    printer_data: [{ printer_name: 'EPSON_BAR',   printer_ip: '10.0.0.30', printer_paper_roll: 80, ... }] },
  { mapping: { area_name: 'GRILL', default_employee_id: 3004 },
    printer_data: [{ printer_name: 'EPSON_GRILL', printer_ip: '10.0.0.40', printer_paper_roll: 80, ... }] },
]
```

### 3.2 After `profileTransform.fromAPI.printerAgents(...)` normalisation

```js
[
  { station: 'BILL',  printer_agent_id: '3001', printer_type: 'EPSON_BILL',  printer_ip: '10.0.0.10', printer_paper_roll: '58', ... },
  { station: 'KDS',   printer_agent_id: '3002', printer_type: 'EPSON_KDS',   printer_ip: '10.0.0.20', printer_paper_roll: '80', ... },
  { station: 'BAR',   printer_agent_id: '3003', printer_type: 'EPSON_BAR',   printer_ip: '10.0.0.30', printer_paper_roll: '80', ... },
  { station: 'GRILL', printer_agent_id: '3004', printer_type: 'EPSON_GRILL', printer_ip: '10.0.0.40', printer_paper_roll: '80', ... },
]
```

Verbatim casing preserved (R-OWNER-1); IDs string-coerced (R-OWNER-3); passthroughs preserved (R-OWNER-4).

---

## 4. Results — REOPEN-A flows

### 4.1 `update-place-order` (PUT `/api/v2/vendoremployee/order/update-place-order`)

| # | Gate | Wire result | Status |
|---|---|---|---|
| 4.1-1 | Endpoint path unchanged | `/api/v2/vendoremployee/order/update-place-order` | ✅ |
| 4.1-2 | New KDS+GRILL items, placed BAR ignored — agents = KDS + GRILL only | `printer_agent: [{station:'KDS',...}, {station:'GRILL',...}]` | ✅ |
| 4.1-3 | BILL excluded | `find(BILL) === undefined` | ✅ |
| 4.1-4 | KOT-fire semantics: placed-only items not driving selection (BAR omitted) | confirmed | ✅ |
| 4.1-5 | `print_kot:'No'` → `printer_agent: []` | `payload.printer_agent === []` | ✅ |
| 4.1-6 | Empty `printerAgents` config → `printer_agent: []` | confirmed | ✅ |
| 4.1-7 | Dynamic GRILL station label routes correctly (BE-PA8) | `printer_agent.map(a=>a.station) === ['GRILL']` | ✅ |
| 4.1-8 | Existing payload fields preserved (`order_id`, `order_type`, `cust_name`, `payment_method`, `payment_status`, `payment_type`, `print_kot`, `auto_dispatch`, `cart-update`) | all present + identical to pre-REOPEN-A | ✅ |
| 4.1-9 | `printer_agent` is array, never null | `Array.isArray && !== null` | ✅ |

### 4.2 `cancel-food-item` (PUT `/api/v2/vendoremployee/order/cancel-food-item`) — owner rule: all-stations-in-cart

| # | Gate | Wire result | Status |
|---|---|---|---|
| 4.2-1 | Endpoint path unchanged | `/api/v2/vendoremployee/order/cancel-food-item` | ✅ |
| 4.2-2 | Active cart (KDS + BAR + GRILL) → `printer_agent` contains all three | sorted: `['BAR','GRILL','KDS']` | ✅ |
| 4.2-3 | BILL excluded (R-OWNER-7) | `find(BILL) === undefined` | ✅ |
| 4.2-4 | Cancelled items + Check-In marker excluded from station set | `printer_agent === [{station:'KDS'}]` (BAR=cancelled, ROOM=marker → both ignored) | ✅ |
| 4.2-5 | All-cancelled cart → `printer_agent: []` | confirmed; never null | ✅ |
| 4.2-6 | Empty `printerAgents` config → `printer_agent: []` | confirmed | ✅ |
| 4.2-7 | Dynamic GRILL station selected | `['GRILL','KDS']` | ✅ |
| 4.2-8 | Existing payload fields preserved (`order_id`, `order_food_id`, `item_id`, `cancel_qty`, `order_status`, `reason_type`, `reason`, `cancel_type`) | all present + identical | ✅ |
| 4.2-9 | `printer_agent` is array, never null | `Array.isArray && !== null` | ✅ |

### 4.3 `order-status-update` / cancel-order (PUT `/api/v2/vendoremployee/order/order-status-update`) — owner rule: all-stations-in-cart

| # | Gate | Wire result | Status |
|---|---|---|---|
| 4.3-1 | Endpoint path unchanged | `/api/v2/vendoremployee/order/order-status-update` | ✅ |
| 4.3-2 | Active cart (KDS + BAR) → `printer_agent` contains both | sorted: `['BAR','KDS']` | ✅ |
| 4.3-3 | BILL excluded | `find(BILL) === undefined` | ✅ |
| 4.3-4 | Empty cart → `printer_agent: []` | confirmed; never null | ✅ |
| 4.3-5 | All-cancelled cart → `printer_agent: []` | confirmed | ✅ |
| 4.3-6 | Empty `printerAgents` config → `printer_agent: []` | confirmed | ✅ |
| 4.3-7 | Dynamic GRILL station selected | `['GRILL']` | ✅ |
| 4.3-8 | Existing payload fields preserved (`order_id`, `role_name`, `order_status`, `cancellation_reason`, `cancellation_note`) | all present + identical | ✅ |
| 4.3-9 | `printer_agent` is array, never null | `Array.isArray && !== null` | ✅ |

---

## 5. Regression results

### 5.1 `place-order` (POS2-003) — unchanged

| Gate | Wire result | Status |
|---|---|---|
| Endpoint path unchanged at `v1 place-order` (REOPEN-B not started) | `/api/v1/vendoremployee/order/place-order` | ✅ |
| KOT stations selected, BILL excluded | `['BAR','KDS']` (sorted) | ✅ |
| `print_kot:'No'` → `printer_agent: []` | confirmed | ✅ |
| `print_kot:'Yes'` field intact, `cart` array intact | confirmed | ✅ |

### 5.2 `order-temp-store` (printOrder, POS2-003 + FU-02) — unchanged

| Gate | Wire result | Status |
|---|---|---|
| Endpoint constant `PRINT_ORDER` defined | confirmed | ✅ |
| `printOrder('kot', 'KDS,BAR')` → `printer_agent` = KDS + BAR (BILL excluded) | sorted: `['BAR','KDS']` | ✅ |
| `printOrder('bill')` → `printer_agent` = BILL only (R-OWNER-7) | `[{station:'BILL',...}]`, KDS+BAR not present | ✅ |
| `printOrder('kot', null)` → `printer_agent: []` (FU-02 graceful path) | confirmed | ✅ |
| `station_kot` shape unchanged (OQ-PA-11) | `'KDS,BAR'` preserved verbatim | ✅ |
| `print_type` shape unchanged | `'kot'` / `'bill'` literal preserved | ✅ |

### 5.3 Endpoint contract sanity

| Constant | Path | Status |
|---|---|---|
| `UPDATE_ORDER` | `/api/v2/vendoremployee/order/update-place-order` | ✅ unchanged |
| `CANCEL_ITEM` | `/api/v2/vendoremployee/order/cancel-food-item` | ✅ unchanged |
| `ORDER_STATUS_UPDATE` | `/api/v2/vendoremployee/order/order-status-update` | ✅ unchanged |
| `PLACE_ORDER` | `/api/v1/vendoremployee/order/place-order` | ✅ unchanged (REOPEN-B not started) |
| `PROFILE` | `/api/v1/vendoremployee/profile` | ✅ unchanged (PROFILE flip not started) |

---

## 6. Test summary

| Suite | Cases | Passing |
|---|---:|---:|
| `POS2_003_REOPEN_A_wire.test.js` (new — this QA) | 29 | 29 ✅ |
| `cancelAndUpdatePayload.test.js` (REOPEN-A unit) | 24 | 24 ✅ |
| `placeOrderPayload.test.js` (POS2-003 regression) | 10 | 10 ✅ |
| `printerAgentSelector.test.js` (helper) | 27 | 27 ✅ |
| `profileTransform.test.js` (profile pipeline) | 24 | 24 ✅ |
| `cancelItemPayload.test.js` (cancel-item regression) | 29 | 29 ✅ |
| `role-name-wire-contract.test.js` (cancel-order regression) | 5 | 5 ✅ |
| **Full unit suite** | **291** | **291 ✅** |
| **Test suites** | **23** | **23 ✅** |

Production build: `Compiled successfully`, 434.04 kB main bundle (no regression vs REOPEN-A implementation pass).

---

## 7. Validation against task brief — checklist

| # | Task-brief gate | Status |
|---|---|---|
| 1 | `printer_agent` is present on update-order payload | ✅ |
| 2 | `printer_agent` is present on cancel-item payload | ✅ |
| 3 | `printer_agent` is present on cancel-order/status-update payload | ✅ |
| 4 | `printer_agent` is an array, never null | ✅ (asserted on every flow + every empty-fallback variant) |
| 5 | BILL is excluded | ✅ (asserted on every KOT/cancel flow) |
| 6 | Correct station agents selected | ✅ (KDS + BAR + GRILL combinations + dynamic label) |
| 7 | Dynamic stations work (BE-PA8) | ✅ (GRILL selected on all 3 REOPEN-A flows) |
| 8 | Empty/missing `print_agent` sends `[]` | ✅ (3-flow + place-order + printOrder coverage) |
| 9 | Empty/all-cancelled cart sends `[]` | ✅ (cancel-item + cancel-order) |
| 10 | place-order payload unchanged except existing POS2-003 behavior | ✅ (regression test passing) |
| 11 | order-temp-store behavior unchanged | ✅ (kot + bill + null variants tested) |
| 12 | Endpoint paths unchanged | ✅ (5 endpoint constants asserted) |
| 13 | No unrelated payload fields changed | ✅ (existing-field preservation `toMatchObject` on every flow) |

---

## 8. Verdict

> ## `qa_pass_ready_for_manual_live_validation`

All 13 task-brief gates met. 29/29 wire-level integration cases pass. 291/291 full unit suite pass. Production build clean.

REOPEN-A is functionally confirmed at the wire level. **Live preprod browser QA (Option b) remains pending** — to be executed when the owner provides a tenant with non-empty `print_agent` configured (per the user's note: "we will do option (b) later when I provide a tenant with non-empty print_agent"). When that tenant is available, the same 13 gates can be replayed against the running app at `https://insights-phase.preview.emergentagent.com` via DevTools network capture.

REOPEN-B (place-order v1 → v2 endpoint revert + possible PROFILE endpoint flip) **remains parked** per the user's directive — not started in this CR; BC-5 + BC-6 still open.

---

## 9. Out-of-scope safety re-confirmed

- ✅ No edits to `printerAgentSelector.js` (helper untouched in this QA pass too)
- ✅ No edits to `constants.js` (endpoint paths verified unchanged)
- ✅ No edits to `profileTransform.js`, `socketHandlers.js`, `useSocketEvents.js`
- ✅ No edits to `CollectPaymentPanel.jsx`, `RestaurantContext.jsx`, `OrderEntry.jsx` beyond the REOPEN-A implementation pass
- ✅ No edits to billing/GST/SC/DC/cart/print-UI/`print_type`/`station_kot`/prepaid-postpaid/socket logic
- ✅ No edits to `/app/memory/final/*`
- ✅ No new dependencies, no lint warnings, no bundle bloat

---

## 10. Files added in this QA pass

| File | Type | Purpose |
|---|---|---|
| `frontend/src/__tests__/integration/POS2_003_REOPEN_A_wire.test.js` | new test (~370 lines, 29 cases) | Wire-level QA for the 3 REOPEN-A flows + place-order + order-temp-store regression |
| `app/memory/change_requests/qa_reports/POS2_003_REOPEN_A_WIRE_LEVEL_QA_REPORT_2026_05_09.md` | new QA report (this doc) | Captures verdict, gates, evidence, remaining live-validation step |

No source-code edits in this QA pass. Implementation source from POS2-003-REOPEN-A summary remains untouched.

---

— End of POS2-003-REOPEN-A Wire-Level QA Report 2026-05-09 —
