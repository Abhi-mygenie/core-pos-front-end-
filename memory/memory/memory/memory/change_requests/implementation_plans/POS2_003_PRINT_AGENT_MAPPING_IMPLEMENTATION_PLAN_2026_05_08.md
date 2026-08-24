# POS2-003 — Print Agent Mapping + Place-Order v1 Endpoint
## Implementation Plan — 2026-05-08 (v1)

> **Sprint:** pos2.0
> **CR ID:** POS2-003
> **Type:** Implementation Planning Only — NO code, NO `/app/memory/final/` edits, NO implementation, NO QA.
> **CR source of truth:** `/app/memory/change_requests/impact_analysis/POS2_003_PRINT_AGENT_MAPPING_CR_IMPACT_ANALYSIS_2026_05_08.md` (through Section 16.6, verdict `ready_for_requirement_freeze`).
> **Predecessor verdict:** v2 — backend confirmed BE-PA1..9; owner locked R-OWNER-1..15; station labels confirmed dynamic by both backend and owner.

---

## 1. Fresh Reading Checklist Results (Mandatory Gate G-1..G-7)

| Step | Action | Result |
|---|---|---|
| **G-1** | Re-read `/app/memory/final/*` from disk (7 files: FINAL_DOCS_APPROVAL_STATUS, ARCHITECTURE_DECISIONS_FINAL, MODULE_DECISIONS_FINAL, CHANGE_REQUEST_PLAYBOOK, IMPLEMENTATION_AGENT_RULES, OPEN_QUESTIONS_FINAL_RESOLUTION, FINAL_DOCS_SUMMARY) | ✅ Done. Module 14 (Printing/Bill/KOT) governs `POST /api/v1/vendoremployee/order-temp-store` (L592). Module 4 (OrderEntry) governs place-order flow (L152). Baseline silent on `print_agent` / `printer_agent`. Module 14 future-change rule (L613) mandates joint review of "manual print, auto-print, room print, and fallback payload behavior" — covered by §7 V-1..V-20. |
| **G-2** | Re-read overlay docs (BASELINE_RECONCILIATION_REPORT_2026_05_04, FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04, PENDING_TASK_REGISTER_2026_05_04, PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06, BACKEND_FIELD_UNPARK_DECISION_2026_05_06) | ✅ Done. No overlay row mentions `print_agent`/`printer_agent`. CR-013 print docs (`phase_3/CR_013_PRINT_PAYLOAD_TRUTH.md`, `implementation_plans/CR_013_PRINT_PAYLOAD_RUNTIME_HANDOVER.md`, `phase_3/CR_013_P3_PRINT_TEMPLATE_PER_COMPONENT_TAX.md`) cover bill payload anatomy — no key collision with the additive `printer_agent` field. |
| **G-3** | Re-read CR-specific docs (POS2_003 CR doc through §16.6) | ✅ Done. Verdict `ready_for_requirement_freeze`. All 17 OQ-PA closed; all 9 BE-PA confirmed. Station labels are tenant-dynamic per BE-PA8 + owner reply 2026-05-08. |
| **G-4** | Re-grep live code for `print_agent`, `printer_agent`, `restaurant_printer_new`, `order-temp-store`, `place-order`, `PRINT_ORDER`, `PLACE_ORDER`, `audiofile`, `station_kot`, `print_kot` | ✅ Done. **Zero drift** vs the v1 CR-doc snapshot. `print_agent` / `printer_agent`: 0 code hits. `restaurant_printer_new`: only at `profileTransform.js:171`. `PRINT_ORDER` already at v1. `PLACE_ORDER` still at v2 (target of swap). `audiofile`: 0 matches (multipart shape claim still holds). |
| **G-5** | Verify §16.1 backend reply still current | ✅ No backend follow-up memo overriding BE-PA1..9. |
| **G-6** | Verify §16.2 owner reply still current | ✅ No owner override; owner additionally confirmed dynamic-label rule on 2026-05-08. |
| **G-7** | If any delta surfaces → STOP | ✅ No delta. Plan authoring proceeds. |

**Gate result: PASS — proceed to plan.**

---

## 2. Baseline / Overlay Conflict Check

| Source | Relevant rule | Plan compliance |
|---|---|---|
| `MODULE_DECISIONS_FINAL.md §4` | Module 4 (Order Entry) owns place-order builder + endpoint switch | ✅ Plan modifies `orderTransform.js` (Module 4 transform) and `OrderEntry.jsx` (Module 4 UI) only |
| `MODULE_DECISIONS_FINAL.md §14` | Module 14 (Print/KOT/Bill) owns `POST /api/v1/vendoremployee/order-temp-store` | ✅ Endpoint stays at v1; no endpoint change. Only payload is augmented through the existing chokepoint `orderService.js:120 printOrder()` |
| `MODULE_DECISIONS_FINAL.md §14 — future change rules` | "Print changes require review of manual print, auto-print, room print, and fallback payload behavior together." | ✅ §7 V-1..V-20 cover all four (V-1/V-2 manual bill, V-3/V-4 manual KOT, V-15 auto bill, V-12 room order, V-2/V-17/V-18 fallback/empty) |
| `ARCHITECTURE_DECISIONS_FINAL.md FA-05` | Endpoint constants centralised; code is implementation truth | ✅ Endpoint swap = single edit at `constants.js:41` |
| `ARCHITECTURE_DECISIONS_FINAL.md EH-04` | Request-shape gates honoured | ✅ Both request-shape gates validated by V-13/V-14 (no key delta beyond additive `printer_agent`) |
| `IMPLEMENTATION_AGENT_RULES.md` | No silent override; baseline reconciliation required for any baseline delta | ✅ This plan is purely additive within Module 4 + Module 14; no baseline rule changed |
| `CHANGE_REQUEST_PLAYBOOK.md` | CR doc is binding; planning agent must respect frozen owner/backend gates | ✅ All 17 OQ-PA + 9 BE-PA frozen; this plan does not relitigate any gate |
| Overlay `phase_3/CR_013_PRINT_PAYLOAD_TRUTH.md` | Bill print payload anatomy (cgst/sgst added) | ✅ `buildBillPrintPayload` keys preserved; `printer_agent` is appended at the top level outside the existing keys |
| Overlay `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md` | Documents parked backend fields (BE-U / web-order attribution) | ✅ Unrelated to POS2-003; no interaction |

**Conflict result: NONE.**

---

## 3. Current Code Flow Map (verified 2026-05-08)

### 3.1 Profile fetch / storage (Module 4 / 14 dependency)

```
LoadingPage.jsx:189   profileService.getProfile()
                      │
                      ▼
profileService.js:11  GET /api/v2/vendoremployee/vendor-profile/profile
                      │
                      ▼
profileTransform.js:70 fromAPI.profileResponse(api)
                      │     ├─ user
                      │     ├─ restaurant ◄─── api.restaurants[0]
                      │     │     └─ printers ◄─── fromAPI.printers(api.restaurant_printer_new)  // L171
                      │     │     [print_agent currently DROPPED]
                      │     └─ permissions
                      ▼
LoadingPage.jsx:201   setRestaurant(profile.restaurant)
                      │
                      ▼
RestaurantContext.jsx:8  state: restaurant; useRestaurant() exposes it
```

### 3.2 Print flow (`order-temp-store`) — single chokepoint

```
[9 trigger sites]
  OrderCard.jsx:109/134  TableCard.jsx:129/158  RePrintButton.jsx:50/110
  OrderEntry.jsx:1233/1335/1550
        │
        └────────────► orderService.js:120  printOrder(orderId, printType, stationKot, orderData, scPct, overrides)
                          │
                          ├─ if printType === 'bill' && orderData
                          │    payload = toAPI.buildBillPrintPayload(...)   // orderTransform.js:1226-1554
                          │
                          └─ else
                                payload = { order_id, print_type, station_kot }
                          
                       api.post(API_ENDPOINTS.PRINT_ORDER, payload)
                                                ▲
                                                └─ constants.js:60 = '/api/v1/vendoremployee/order-temp-store'  ◄── already v1 (untouched)
```

### 3.3 Place-order flow — two call sites, two builders, one endpoint constant

```
[2 trigger sites]
  OrderEntry.jsx:796-828   placeOrder              (postpaid; fire-and-forget HTTP)
  OrderEntry.jsx:1394-1414 placeOrderWithPayment   (prepaid; awaited HTTP)
        │
        ├──► orderTransform.js:730  toAPI.placeOrder(table, cartItems, customer, orderType, options)
        │       └─ payload object; print_kot = options.printAllKOT ? 'Yes' : 'No'  (L764)
        │
        └──► orderTransform.js:895  toAPI.placeOrderWithPayment(... paymentData ...)
                └─ same shape + payment fields
                          │
                          ▼
        const formData = new FormData();
        formData.append('data', JSON.stringify(payload));      // single 'data' part; no 'audiofile'
        api.post(API_ENDPOINTS.PLACE_ORDER, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
                                ▲
                                └─ constants.js:41 = '/api/v2/vendoremployee/order/place-order'   ◄── TARGET (v2 → v1)
```

### 3.4 Station-set sources

| Path | Source | Notes |
|---|---|---|
| BILL print | implicit `'BILL'` (single sentinel) | Owner-locked R-OWNER-7 |
| KOT print on `order-temp-store` | `stationKot` arg → `.split(',').map(s => s.trim())` | Already comma-joined upstream at `OrderCard.jsx:108`, `TableCard.jsx:128`, `RePrintButton.jsx:49` |
| KOT in `place-order` | `cart[i].station` distinct values among unplaced items | `unplacedItems = cartItems.filter(i => !i.placed && i.status !== 'cancelled')` per `orderTransform.js:733` |

---

## 4. File-by-File Implementation Plan

> Five files touched. All changes additive within Module 4 and Module 14. No file rename, no new directory, no new endpoint constant beyond the v2→v1 string swap.

### 4.1 `frontend/src/api/transforms/printerAgentSelector.js` (NEW — small helper file)

**Purpose:** Pure functions for normalising and selecting `print_agent` entries. No React, no axios, no side-effects. Easily unit-testable.

**Location:** `/app/frontend/src/api/transforms/printerAgentSelector.js` — sibling of existing `orderTransform.js` and `profileTransform.js`. Not imported into UI; consumed only by `profileTransform.js`, `orderService.js`, and `orderTransform.js`.

**Why a new file:** keeps the helper logic out of `profileTransform.js` (which is already 304 lines) and `orderService.js` (which currently has zero transform logic and should stay thin). Single responsibility per file.

**Public surface (exported names):**
- `BILL_STATION_LABEL` — sentinel constant
- `normalizePrinterAgent(rawEntry)` — single-row normaliser; returns null if entry is unusable per OQ-PA-5/OQ-PA-6
- `selectAgentsForBill(printerAgents)` — returns BILL-only entries (case-insensitive match against the sentinel)
- `selectAgentsForKot(printerAgents, stationSet)` — returns entries whose `station` matches any value in the stationSet (case-insensitive); excludes BILL
- `cartStationsToSet(cartItems)` — convenience helper that returns the distinct, trimmed-non-empty `station` values from unplaced cart items

See §5 for full pseudocode.

### 4.2 `frontend/src/api/transforms/profileTransform.js` (EDIT — additive)

**Touch:** add 1 helper function + 1 line in `restaurant` builder.

**Diff intent (NOT actual code — implementation is the next agent's task):**

| Site | Change |
|---|---|
| Top of file (after `parseTaxPct` helper at L48-51) | Import: `import { normalizePrinterAgent } from './printerAgentSelector';` |
| `fromAPI` block, after `printers:` line at L171 | Add: `printerAgents: fromAPI.printerAgents(api.print_agent),` |
| `fromAPI` definition, after `printers:` helper at L233-243 | Add new helper `printerAgents(apiArray) { ... }` that returns `[]` if input is not an array, else `apiArray.map(normalizePrinterAgent).filter(Boolean)` |

**Backwards compatibility:** if `api.print_agent` is missing or not an array, `restaurant.printerAgents = []`. No regression for tenants on the old profile schema.

**Owner gates honoured:** R-OWNER-1 (preserve casing), R-OWNER-3 (string ID + paper roll), R-OWNER-4 (preserve null except R-OWNER-3 fields), R-OWNER-5 (`printer_data[0]` only).

### 4.3 `frontend/src/contexts/RestaurantContext.jsx` (EDIT — additive)

**Touch:** expose `printerAgents` selector.

**Diff intent:**

| Site | Change |
|---|---|
| After `printers` selector at L72-74 | Add a new memoised selector `printerAgents = useMemo(() => restaurant?.printerAgents || [], [restaurant])` |
| Inside the value object L77-94 | Include `printerAgents` |
| Inside the deps array L96-108 | Include `printerAgents` |

**Backwards compatibility:** consumers that already destructure `useRestaurant()` are unaffected.

### 4.4 `frontend/src/api/services/orderService.js` (EDIT — Module 14 chokepoint)

**Touch:** extend `printOrder` to accept and inject `printerAgents`.

**Diff intent:**

| Site | Change |
|---|---|
| Top of file, after axios import | Import: `import { selectAgentsForBill, selectAgentsForKot } from '../transforms/printerAgentSelector';` |
| `printOrder` signature L120 | Append `printerAgents = []` as a final optional parameter (default `[]` so all 9 existing call sites continue to compile and run with empty agents until each one is updated) |
| Inside `printOrder` after the `payload` is built (L125 for bill / L132 for KOT) | Compute `agents`: <br>• if `printType === 'bill'` → `agents = selectAgentsForBill(printerAgents)` <br>• else if `printType === 'kot'` and `stationKot` → `agents = selectAgentsForKot(printerAgents, stationKot.split(',').map(s => s.trim()))` <br>• else → `agents = []` |
| Same block | Append `payload.printer_agent = agents;` |
| Empty-state observability (R-OWNER-6) | If `printerAgents.length > 0 && agents.length === 0` → `console.warn('[printer_agent] empty agent set on order-temp-store', { printType, stationKot })` once per call |

**Why default `[]` on signature:** lets the 9 existing trigger sites be migrated incrementally. The CR is FE-additive and will land in a single PR, so all 9 sites should be updated in the same PR — but the default protects against partial-rollout regressions during code review.

### 4.5 `frontend/src/api/transforms/orderTransform.js` (EDIT — Module 4 builders)

**Touch:** thread `printerAgents` into `placeOrder` and `placeOrderWithPayment` payloads.

**Diff intent:**

| Site | Change |
|---|---|
| Top of file imports | Import: `import { selectAgentsForKot, cartStationsToSet } from './printerAgentSelector';` |
| `toAPI.placeOrder` signature L730-731 | Extend `options` destructuring to include `printerAgents = []` |
| `toAPI.placeOrder` payload object (after L796 `cart`) | Compute KOT agents only when `print_kot === 'Yes'`: <br> `const printerAgentValue = (printAllKOT ? selectAgentsForKot(printerAgents, cartStationsToSet(unplacedItems)) : []);` <br> Append: `payload.printer_agent = printerAgentValue;` |
| `toAPI.placeOrderWithPayment` signature L895 | Same `printerAgents = []` extraction |
| `toAPI.placeOrderWithPayment` payload | Same gate (`print_kot === 'Yes'`) and same append (R-OWNER-9 + R-OWNER-10 + R-OWNER-17) |
| Empty-state observability | Mirror the warn from §4.4 if applicable |

**Note on `unplacedItems` reuse:** at L733 `unplacedItems` is already computed; the helper `cartStationsToSet(unplacedItems)` should be called against that variable, not the raw `cartItems`, to honour the existing "unplaced + non-cancelled" filter.

### 4.6 `frontend/src/api/constants.js` (EDIT — endpoint swap)

**Touch:** one line.

**Diff intent:**

| Site | Old | New |
|---|---|---|
| L41 | `PLACE_ORDER: '/api/v2/vendoremployee/order/place-order',` | `PLACE_ORDER: '/api/v1/vendoremployee/order/place-order',` |
| Same line, inline comment | Update to note `// CR-POS2-003 (May-2026): switched v2 → v1; multipart shape unchanged.` (additive comment only; existing `// New order (unpaid + prepaid via payment_status=paid)` text preserved) |

**Backwards compatibility:** zero. Both call sites read the constant; no string is hardcoded anywhere.

### 4.7 `frontend/src/components/order-entry/OrderEntry.jsx` (EDIT — option threading)

**Touch:** add `printerAgents` to the `options` object at the two place-order call sites.

**Diff intent:**

| Site | Change |
|---|---|
| L796-808 (`placeOrder` builder call inside the postpaid path) | Extend `options` object to include `printerAgents: restaurant?.printerAgents || []` |
| L1394-1402 (`placeOrderWithPayment` builder call inside the prepaid path) | Same — `printerAgents: restaurant?.printerAgents || []` |
| `useRestaurant()` destructure (already in component) | Confirm `printerAgents` is destructured. If the component currently destructures only some fields, add `printerAgents` to the destructure. |

**For the 9 print-trigger sites in step 4.4:** each call to `printOrder(...)` adds one final argument `printerAgents`. Sites are: `OrderCard.jsx:109/134`, `TableCard.jsx:129/158`, `RePrintButton.jsx:50/110`, `OrderEntry.jsx:1233/1335/1550`. All read `useRestaurant().printerAgents`.

### 4.8 Files NOT touched (sanity list)

- `frontend/src/api/axios.js` — no axios change required
- Any UI / button / icon / route file — R-OWNER-13
- `OrderEntry` cart logic, GST/SC/DC code paths — R-OWNER-11
- Any other endpoint constant in `constants.js` — R-OWNER-14
- `api/transforms/orderTransform.js` for any non-place-order builder (`updateOrder`, `buildBillPrintPayload`, etc. — all preserved)
- `api/services/profileService.js` — single-line GET; no change
- `pages/LoadingPage.jsx` — already passes the full restaurant object; new `printerAgents` rides for free
- All test files outside `__tests__/api/transforms/` — no impact

---

## 5. Helper Signatures / Pseudocode

> Pseudocode for the next agent. Final code may differ in structure as long as all gates from §6 of the CR (and R-OWNER-1..15) are honoured.

### 5.1 `BILL_STATION_LABEL`

```js
// printerAgentSelector.js
// Single sentinel — the ONLY hard-coded literal label in the entire flow.
// If a tenant ever uses a non-'BILL' label for the bill station,
// this becomes a profile-config override (future CR; not in scope).
export const BILL_STATION_LABEL = 'BILL';
```

### 5.2 `normalizePrinterAgent(rawEntry)`

```js
// printerAgentSelector.js
// Honours OQ-PA-5/6/8 + R-OWNER-1/3/4/5.
// Returns null if entry is unusable so the caller can .filter(Boolean).
export function normalizePrinterAgent(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const mapping = raw.mapping || {};
  const printerData = Array.isArray(raw.printer_data) ? raw.printer_data : [];
  if (printerData.length === 0) return null;        // OQ-PA-5: skip if printer_data empty
  
  const station = mapping.area_name;
  if (!station || (typeof station === 'string' && station.trim() === '')) {
    return null;                                    // OQ-PA-6: skip if area_name blank
  }

  const p = printerData[0];                          // R-OWNER-5: index [0] only

  // R-OWNER-3: string coercion for ID + paper roll. null/undefined → ''.
  const toStrFlexible = (v) => v == null ? '' : String(v);
  // R-OWNER-4: preserve null otherwise.
  const passthroughOrNull = (v) => v === undefined ? null : v;

  return {
    station,                                         // R-OWNER-1: verbatim casing
    printer_agent_id:    toStrFlexible(mapping.default_employee_id),
    printer_type:        passthroughOrNull(p.printer_name),
    printer_ip:          passthroughOrNull(p.printer_ip),
    printer_paper_roll:  toStrFlexible(p.printer_paper_roll),
    vendor_id:           passthroughOrNull(p.vendor_id),
    product_id:          passthroughOrNull(p.product_id),
    wifi_printer_ip:     passthroughOrNull(p.wifi_printer_ip),
    printer_name:        passthroughOrNull(p.wifi_printer_name),
  };
}
```

### 5.3 Match predicate

```js
// printerAgentSelector.js
// R-OWNER-2: case-insensitive match; trim both sides.
function matchStation(a, b) {
  if (a == null || b == null) return false;
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}
```

### 5.4 `selectAgentsForBill`

```js
// printerAgentSelector.js
// R-OWNER-7: BILL agent only. Output preserves backend casing per R-OWNER-1.
export function selectAgentsForBill(printerAgents) {
  if (!Array.isArray(printerAgents)) return [];
  return printerAgents.filter(a => matchStation(a.station, BILL_STATION_LABEL));
  // OQ-PA-12: preserve API order (no sort).
}
```

### 5.5 `selectAgentsForKot`

```js
// printerAgentSelector.js
// R-OWNER-8: match KOT station set; exclude BILL.
// R-OWNER-9: same selector reused for place-order with print_kot:'Yes'.
export function selectAgentsForKot(printerAgents, stationSet) {
  if (!Array.isArray(printerAgents)) return [];
  if (!Array.isArray(stationSet) || stationSet.length === 0) return [];
  // Pre-normalise the requested set once (perf + correctness).
  const wantedNorm = stationSet
    .filter(s => s != null && String(s).trim() !== '')
    .map(s => String(s).trim().toLowerCase());
  return printerAgents.filter(a => {
    if (matchStation(a.station, BILL_STATION_LABEL)) return false;     // exclude BILL
    if (a.station == null) return false;
    const stnNorm = String(a.station).trim().toLowerCase();
    return wantedNorm.includes(stnNorm);
  });
  // OQ-PA-12 / OQ-PA-14 honoured: preserve API order; silently ignore
  // unmatched cart stations.
}
```

### 5.6 `cartStationsToSet`

```js
// printerAgentSelector.js
// Source for KOT-on-place-order. Operates on the already-filtered
// unplaced items array (orderTransform.js:733) — caller passes that, not raw cartItems.
export function cartStationsToSet(unplacedItems) {
  if (!Array.isArray(unplacedItems)) return [];
  const set = new Set();
  for (const item of unplacedItems) {
    const s = item?.station;
    if (s != null && String(s).trim() !== '') {
      set.add(String(s).trim());                // preserve casing per R-OWNER-1
    }
  }
  return Array.from(set);
}
```

### 5.7 Empty-state log helper (optional centralisation)

```js
// orderService.js or printerAgentSelector.js
function warnIfEmptyAgents(endpoint, printType, agents, source) {
  if (Array.isArray(source) && source.length > 0 && agents.length === 0) {
    // R-OWNER-6: warn (not error) so Sentry/CRM noise stays low.
    // eslint-disable-next-line no-console
    console.warn(`[printer_agent] empty agent set on ${endpoint}`, { printType });
  }
}
```

---

## 6. Phase Sequencing

Each phase is independently shippable but recommended to land in a single PR for atomic deployment with backend.

### Phase A — Profile mapping (no payload change)
1. Add `printerAgentSelector.js` with `normalizePrinterAgent` and `BILL_STATION_LABEL` only.
2. Edit `profileTransform.js` to surface `restaurant.printerAgents`.
3. Edit `RestaurantContext.jsx` to expose `printerAgents` selector.
4. Add unit test `__tests__/api/transforms/profileTransform.test.js` block: empty input → `[]`; representative input → expected normalised entry; missing `printer_data` → entry skipped; blank `area_name` → entry skipped.

**Risk:** zero. No payload affected. Console-observable via DevTools that `restaurant.printerAgents` is now populated.

### Phase B — `order-temp-store` injection
5. Add `selectAgentsForBill` / `selectAgentsForKot` / `matchStation` to `printerAgentSelector.js`.
6. Edit `orderService.js:120 printOrder()` to accept `printerAgents` and inject `payload.printer_agent`.
7. Update all 9 print-trigger sites (`OrderCard.jsx:109/134`, `TableCard.jsx:129/158`, `RePrintButton.jsx:50/110`, `OrderEntry.jsx:1233/1335/1550`) to pass `printerAgents` from `useRestaurant()`.
8. Add unit tests for `selectAgentsForBill` / `selectAgentsForKot` covering V-1..V-4 + V-17..V-18 fixtures, including at least one non-canonical label fixture (e.g., `"PASTRY"`) per §16.3 dynamic-label test rule.

**Risk:** LOW. Existing payload fields untouched; new `printer_agent` is additive (BE-PA4 confirmed).

### Phase C — `place-order` injection + endpoint swap
9. Add `cartStationsToSet` to `printerAgentSelector.js`.
10. Edit `orderTransform.js`:
    - `placeOrder` accepts `printerAgents`; injects `printer_agent` gated on `print_kot === 'Yes'`.
    - `placeOrderWithPayment` mirrors the change.
11. Edit `OrderEntry.jsx` 2 call sites (L796-808, L1394-1402) to pass `printerAgents`.
12. Edit `constants.js:41` — swap v2 → v1.
13. Add unit tests for `placeOrder` / `placeOrderWithPayment` payload covering V-5..V-12.

**Risk:** MEDIUM. Endpoint swap is the only end-to-end-verifiable item — pair with backend deployment confirmation per BE-PA1/2/3.

### Phase D — Validation
14. Run §7 V-1..V-20 end-to-end on preprod after backend deployment.
15. Smoke-test the 4 print scenarios from Module 14 future-change rule (manual print, auto-print, room print, fallback) per `MODULE_DECISIONS_FINAL.md §14 L613`.
16. Diff-check: confirm `place-order` body and `order-temp-store` body show ONLY the additive `printer_agent` key (V-13/V-14).

**Risk:** zero (validation only).

### Out-of-PR follow-ups (NOT in this CR)
- Configurable `BILL_STATION_LABEL` per tenant (deferred — current CR uses literal `'BILL'`)
- `update-place-order` (`UPDATE_ORDER` constant) — out of scope per R-OWNER-14 / OQ-PA-16

---

## 7. Validation Checklist

> Mirrors §13 of the CR doc (V-1..V-20). The next QA agent runs this on preprod.

### 7.1 Pre-merge unit tests (Jest / RTL)

| Test | Target | Owner |
|---|---|---|
| `printerAgentSelector.test.js` — `normalizePrinterAgent`: empty input / non-array / null entry / `printer_data: []` / blank `area_name` / valid entry | New file under `__tests__/api/transforms/` | New |
| `printerAgentSelector.test.js` — `selectAgentsForBill`: BILL match (verbatim, lowercased, mixed-case) / non-canonical label e.g. `"PASTRY"` (must NOT match BILL filter) | Same | New |
| `printerAgentSelector.test.js` — `selectAgentsForKot`: stationSet match / case-insensitive match / BILL exclusion / unmatched stations silently ignored / non-canonical label e.g. `"GRILL"` (matches when in stationSet) | Same | New |
| `printerAgentSelector.test.js` — `cartStationsToSet`: deduplication / empty input / null station entries skipped | Same | New |
| `profileTransform.test.js` — `restaurant.printerAgents` populated when `print_agent` present; `[]` when missing/empty/non-array | Existing file extended | Update |
| `placeOrderPayload.test.js` (or extend `updateOrderPayload.test.js`) — `printer_agent: []` when `print_kot:'No'`; matching agents when `print_kot:'Yes'`; BILL excluded; unmatched cart stations silently ignored | Existing or new file | Update / New |

### 7.2 Preprod e2e validation

| # | Scenario | Expected |
|---|---|---|
| **V-1** | Manual BILL print, BILL agent available | `printer_agent: [bill_entry]` on `order-temp-store` |
| **V-2** | Manual BILL print, BILL agent missing | `printer_agent: []` + `console.warn` |
| **V-3** | Manual KOT print with `station_kot = "KDS,BAR"`, both agents available | `printer_agent: [KDS, BAR]`, BILL excluded |
| **V-4** | Manual KOT print with `station_kot = "KDS,BAR"`, only KDS available | `printer_agent: [KDS]` |
| **V-5** | Postpaid place-order, cart KDS+BAR, `print_kot:'Yes'` | `printer_agent: [KDS, BAR]` on `place-order` v1; BILL excluded |
| **V-6** | Postpaid place-order, `print_kot:'No'` | `printer_agent: []` |
| **V-7** | Prepaid place-order (`placeOrderWithPayment`) `print_kot:'Yes'` | Same as V-5 |
| **V-8** | Postpaid place-order `print_kot:'Yes'` | Same as V-5 |
| **V-9** | Dine-in place-order | Same rule |
| **V-10** | Take-away place-order | Same rule |
| **V-11** | Delivery place-order with `delivery_charge` | Same rule; `delivery_charge` field unchanged per CR-008 D1-Cap |
| **V-12** | Room place-order | Same rule |
| **V-13** | Existing place-order body parity | Diff against v2 baseline shows ONLY additive `printer_agent` + endpoint URL |
| **V-14** | Existing `order-temp-store` BILL body parity | Diff shows ONLY additive `printer_agent` |
| **V-15** | Auto-bill print after prepaid place-order one-shot | `printer_agent: [BILL]` on the auto-bill `order-temp-store` call |
| **V-16** | Re-print KOT from RePrintButton | Same as V-3/V-4 |
| **V-17** | Profile API returns no `print_agent` field | All payloads ship `printer_agent: []`; no crash, no UI regression |
| **V-18** | Profile API returns `print_agent` with malformed entry (missing `printer_data`) | Entry skipped per OQ-PA-5; remaining entries unaffected |
| **V-19** | `place-order` v1 endpoint: HTTP 200 with `order_id` | Auto-bill capture at `OrderEntry.jsx:1420-1424` succeeds |
| **V-20** | `update-place-order` payload | Unchanged; no `printer_agent` field |

### 7.3 Dynamic-label test fixture (per §16.3)

At least one unit-test fixture must use a non-canonical label set (e.g., `["RECEIPT", "PASTRY", "GRILL"]`) to prove that the implementation is label-agnostic. The BILL exclusion uses the constant `BILL_STATION_LABEL`, so that one fixture should also include an entry with `area_name: 'Bill'` (mixed case) to verify case-insensitive match against the sentinel.

---

## 8. Risks and Mitigations

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| **R-IMPL-1** | v1 `place-order` endpoint rejects multipart body that v2 accepts | LOW (BE-PA1 confirmed yes) | Phase D V-13 catches it pre-prod; rollback per §9 |
| **R-IMPL-2** | v1 response shape differs from v2 (missing `order_id`) breaking auto-bill | LOW (BE-PA2 confirmed yes) | V-19 catches it; existing 3-shape capture at `OrderEntry.jsx:1420-1424` is resilient |
| **R-IMPL-3** | Backend silently rejects additive `printer_agent` on `order-temp-store` or `place-order` (e.g., 422) | LOW (BE-PA3 + BE-PA4 confirmed yes) | V-2/V-13/V-14 catch it; rollback per §9 |
| **R-IMPL-4** | Multiple `print_agent` rows with same `area_name` produce duplicate-station agents | LOW | OQ-PA-7 default = keep all (backend dedups). Test fixture covers this. |
| **R-IMPL-5** | A tenant uses a non-`BILL` label for the bill station (e.g., `"Receipt"`) | LOW | BILL_STATION_LABEL is a single constant; future tenant-config override is a 1-line change. CR brief frozen on `'BILL'` for now. |
| **R-IMPL-6** | `cart[].station` value in test/sandbox tenant is empty string or whitespace, no agents matched | LOW | `cartStationsToSet` skips blanks per R-OWNER-9; `selectAgentsForKot` returns `[]`; backend handles per BE-PA7 |
| **R-IMPL-7** | Console warning floods on tenants without `print_agent` configured | LOW | Warn only fires when `printerAgents.length > 0 && agents.length === 0` (i.e., agents configured but none match the print). Tenants with empty `print_agent` array → no warn. |
| **R-IMPL-8** | New `printerAgents` consumers in OrderEntry / cards forget to pass the prop | LOW | `printerAgents` defaults to `[]` in `printOrder` signature and `options` destructure → backwards-compatible if a call site is missed; log warn helps detection |
| **R-IMPL-9** | Hot-reload during partial dev landing leaves `restaurant.printerAgents` undefined and a payload sends `printer_agent: undefined` instead of `[]` | LOW | All injection sites coalesce to `[]` (`useRestaurant()?.printerAgents \|\| []`) |
| **R-IMPL-10** | Test suite drift — fixtures become stale | LOW | Phase A test additions are localised; no rename of existing fixtures |
| **R-IMPL-11** | CR-013 print-template parsing on backend collides with new top-level `printer_agent` key (key-name reservation) | LOW (no overlap evidence in `phase_3/CR_013_PRINT_PAYLOAD_TRUTH.md`) | V-14 confirms parity diff |
| **R-IMPL-12** | Module 14 future-change rule trigger missed (manual / auto / room / fallback joint review) | LOW | V-1/V-2/V-12/V-15 cover all four paths |
| **R-IMPL-13** | `update-place-order` accidentally receives `printer_agent` because `toAPI.updateOrder` lives in the same file as `toAPI.placeOrder` | LOW | Plan touches only `placeOrder` and `placeOrderWithPayment`; `updateOrder` is not in scope (R-OWNER-14 / OQ-PA-16). Code review must verify no leakage. |

---

## 9. Rollback Strategy

Designed so any phase can be reverted independently with a single-commit revert.

### 9.1 Atomic-PR rollback (recommended)

Single PR landing all 5 file edits + 1 new file. Rollback = revert that PR. Effects:
- `place-order` reverts to v2.
- `printer_agent` field disappears from both payloads (backend tolerates absence per BE-PA7).
- Profile no longer surfaces `printerAgents` (consumers default to `[]`).
- No data migration required (state is in-memory only).

### 9.2 Phase-by-phase rollback (fallback)

| Phase | Rollback action | Effect |
|---|---|---|
| **A** revert | `profileTransform.js` line removed; `RestaurantContext.jsx` selector removed; `printerAgentSelector.js` deleted | `restaurant.printerAgents` unavailable; downstream consumers fall back to `[]` |
| **B** revert | `orderService.js:120` signature shrinks; `printer_agent` no longer appended on `order-temp-store` | Bill/KOT print payloads return to v1 baseline shape |
| **C** revert (endpoint only) | `constants.js:41` flips back v1→v2 | Place-order returns to v2; FE remains compatible because v2 is what FE shipped before this CR |
| **C** revert (`printer_agent` only, keep v1) | `orderTransform.js` and `OrderEntry.jsx` revert; `constants.js:41` stays at v1 | Place-order body returns to v2 shape; endpoint stays v1 (only valid if backend confirms v1 accepts the v2 body without `printer_agent`) |

### 9.3 Emergency hotfix path

If v1 `place-order` ships broken on backend post-deploy:
1. Single-line revert at `constants.js:41` (v1 → v2). FE is back online in < 5 minutes.
2. `printer_agent` field is harmlessly accepted by v2 too (BE-PA3 confirmed). No FE change needed.
3. Backend re-deploys v1 fix; FE re-flips constant.

### 9.4 Feature-flag option (NOT recommended; documented for completeness)

If a feature flag is desired, add a single boolean to `constants.js`:
```js
const PRINTER_AGENT_ENABLED = process.env.REACT_APP_PRINTER_AGENT_ENABLED !== 'false';
```
Wrap each `payload.printer_agent = ...` assignment with `if (PRINTER_AGENT_ENABLED)`. This adds 4 lines and one env var; not strictly required because R-OWNER-6 + BE-PA7 already make the empty case safe.

**Owner default per R-OWNER acceptance: NO feature flag — keep the additive code unconditional.** Documented here as an emergency-only option.

---

## 10. Final Verdict

```yaml
verdict: ready_for_implementation
revision: v1 (2026-05-08 implementation plan)

gate_status:
  G-1_baseline_fresh_read:        PASS
  G-2_overlay_fresh_read:         PASS
  G-3_CR_doc_through_section_16:  PASS
  G-4_code_re_grep:               PASS (zero drift vs v1 snapshot)
  G-5_backend_confirmation:       PASS (BE-PA1..9 all yes / yes / yes / yes / yes / yes / yes / dynamic / yes)
  G-6_owner_confirmation:         PASS (R-OWNER-1..15 locked + dynamic-label confirmation)
  G-7_no_delta:                   PASS — proceed

scope:
  files_new:    1  (api/transforms/printerAgentSelector.js)
  files_edit:   6  (profileTransform.js, RestaurantContext.jsx,
                    orderService.js, orderTransform.js, constants.js,
                    OrderEntry.jsx)
  call_sites_touched: 11 (9 printOrder callers + 2 place-order callers)
  endpoint_swap:    constants.js:41 v2 → v1

risks:
  highest_severity: LOW (R-IMPL-1..13)
  load_bearing_backend_confirmations: BE-PA1..7 already received

phase_order:
  A → B → C → D
  recommended: atomic single PR for atomic backend pairing

owner_review_required:
  - Approval to land Phase A+B+C+D in one PR (default per CR)
  - Approval to skip the optional feature flag (default per CR)

backend_review_required: NONE (BE-PA1..9 already confirmed)

what_NOT_to_change_post_v1_plan:
  - /app/memory/final/* (untouched)
  - any file outside the 6 listed above
  - billing / GST / SC / DC logic (R-OWNER-11)
  - prepaid / postpaid behaviour (R-OWNER-12)
  - print UI (R-OWNER-13)
  - any endpoint other than place-order v2→v1 (R-OWNER-14)
  - cart item structure
  - KOT station derivation (filter is additive)
  - print_type values, station_kot format
  - existing socket-first / API-enrichment paths from POS2-002
  - CR-008 D1-Gate isPrepaid behaviour
  - CR-013 bill print payload anatomy

next_agent_invocation:
  Implementation Agent — invoked AFTER owner sign-off on this plan.
  Required inputs: this plan + CR doc through Section 16 + owner sign-off
  on Phase A/B/C/D ordering.
  Phases:
    1. Open Phase A diff (3 files + 1 new file)
    2. Open Phase B diff (orderService.js + 4 cards/components)
    3. Open Phase C diff (orderTransform.js + OrderEntry.jsx + constants.js)
    4. Run unit tests (§7.1)
    5. Run lint
    6. Submit PR with §7.2 checklist appended to PR description
    7. After backend deploy confirmation, run §7.2 V-1..V-20 on preprod
```

---

## 11. Strict-Rules Compliance Certification

| Rule | Status |
|---|---|
| `/app/memory/final/*` untouched | ✅ |
| No source code edited | ✅ |
| No implementation | ✅ |
| No QA / tests run | ✅ |
| Mandatory G-1..G-7 fresh re-read performed | ✅ |
| Plan respects every R-OWNER-1..15 | ✅ |
| Plan respects every BE-PA1..9 confirmation | ✅ |
| Plan respects every closed OQ-PA-1..17 | ✅ |
| Plan does not relitigate any frozen gate | ✅ |
| Module 14 future-change rule (joint review of manual/auto/room/fallback) honoured by §7 V-1/V-2/V-12/V-15 | ✅ |
| FA-05 endpoint centralisation honoured (1-line constant edit) | ✅ |
| EH-04 request-shape gate honoured (V-13 / V-14 parity diff) | ✅ |
| No FE-side hard-coded canonical station list (only BILL_STATION_LABEL sentinel) | ✅ §5.1 |
| Dynamic-label test fixture mandated | ✅ §7.3 |
| Rollback strategy documented (atomic PR + phase-by-phase + emergency path) | ✅ §9 |
| Stop after creating implementation plan | ✅ |

---

— End of POS2-003 Implementation Plan 2026-05-08 (v1) —
