# POS2-003 — Implementation Agent Handover
## Print Agent Mapping + Place-Order v1 Endpoint — Atomic Single PR

> **Sprint:** pos2.0
> **CR ID:** POS2-003
> **Type:** Implementation Handover
> **Date:** 2026-05-08
> **Approval:** Owner has approved the implementation plan and authorised a **single atomic PR** covering Phases A → B → C → D.
> **Source of truth (READ FIRST):**
> 1. `/app/memory/change_requests/impact_analysis/POS2_003_PRINT_AGENT_MAPPING_CR_IMPACT_ANALYSIS_2026_05_08.md` — through §16.6 (verdict `ready_for_requirement_freeze`)
> 2. `/app/memory/change_requests/implementation_plans/POS2_003_PRINT_AGENT_MAPPING_IMPLEMENTATION_PLAN_2026_05_08.md` — verdict `ready_for_implementation`

---

## 0. Pre-Flight Mandatory Checklist

Before writing the FIRST line of code, complete every item below. If any item fails, STOP and raise an addendum request — do not proceed with implementation.

- [ ] Re-read `/app/memory/final/*` from disk (7 files)
- [ ] Re-read CR doc through §16.6 verbatim (verdict line)
- [ ] Re-read implementation plan §1 G-1..G-7 (verify gate is still PASS)
- [ ] Re-grep code for `print_agent`, `printer_agent`, `restaurant_printer_new`, `PRINT_ORDER`, `PLACE_ORDER`, `audiofile`, `station_kot`, `print_kot` to confirm zero code drift since 2026-05-08
- [ ] Confirm `frontend/src/api/constants.js:41` still reads `'/api/v2/vendoremployee/order/place-order'`
- [ ] Confirm `frontend/src/api/constants.js:60` still reads `'/api/v1/vendoremployee/order-temp-store'`
- [ ] Confirm `frontend/src/api/transforms/profileTransform.js:171` still reads `printers: fromAPI.printers(api.restaurant_printer_new),`
- [ ] Confirm zero `audiofile` matches in `frontend/src/`
- [ ] Confirm a working `yarn` toolchain (`yarn` not `npm`)

If any step yields a delta, STOP. Add a v2 addendum to the implementation plan and re-request approval.

---

## 1. Approval Record

| Item | Decision | Source |
|---|---|---|
| **Implementation plan** | Approved | Owner 2026-05-08 |
| **Phase ordering** | Atomic single PR (A → B → C → D in one PR) | Owner 2026-05-08 |
| **Feature flag** | NOT used | R-OWNER acceptance + plan §9.4 |
| **Backend pre-deploy** | Required (BE-PA1..9 confirmed; FE merges only after backend confirms v1 endpoint deployed and `printer_agent` accepted on both endpoints) | Plan §6 Phase C |
| **Rollback path** | Atomic-PR revert; emergency hotfix = 1-line `constants.js:41` flip back to v2 (v2 still accepts `printer_agent` harmlessly per BE-PA3) | Plan §9.3 |

---

## 2. Strict No-Go List

The implementation agent MUST NOT touch any of the following. Code review will reject any PR that violates these:

| # | Forbidden change | Reason |
|---|---|---|
| 1 | `/app/memory/final/*` | R-OWNER-15 / strict CR rule |
| 2 | Any endpoint constant in `constants.js` other than `PLACE_ORDER` (line 41) | R-OWNER-14 |
| 3 | `UPDATE_ORDER`, `PREPAID_ORDER`, `BILL_PAYMENT`, `SPLIT_ORDER`, `PRINT_ORDER`, `PROFILE`, `RUNNING_ORDERS`, `SINGLE_ORDER_NEW`, `CONFIRM_ORDER` (any other endpoint) | R-OWNER-14 / OQ-PA-16 |
| 4 | `toAPI.updateOrder` builder in `orderTransform.js` | OQ-PA-16 — out of scope |
| 5 | Billing / GST / SC / DC computation logic anywhere | R-OWNER-11 |
| 6 | Cart item structure (`buildCartItem`, `cart[].station` emission) | R-OWNER-11 |
| 7 | Any UI / button / icon / route / component file other than `OrderEntry.jsx` (and only the 2 specific lines in OrderEntry) | R-OWNER-13 |
| 8 | Print UI components — `RePrintButton.jsx`, `OrderCard.jsx`, `TableCard.jsx` (their UI/JSX). Their `printOrder()` calls — and only those calls — get one extra `printerAgents` argument | R-OWNER-13 (UI shape unchanged) |
| 9 | `print_type` enum values ('bill' / 'kot') | R-OWNER-11 |
| 10 | `station_kot` field shape on `order-temp-store` | OQ-PA-11 |
| 11 | Prepaid / postpaid behaviour switching | R-OWNER-12 |
| 12 | Socket handlers (`socketHandlers.js`) | Out of scope (POS2-002 territory) |
| 13 | `CR-008` D1-Gate `isPrepaid` predicate at `CollectPaymentPanel.jsx:917` | Cross-CR preservation |
| 14 | `CR-013` bill print payload anatomy in `buildBillPrintPayload` (existing keys) | `printer_agent` is appended at top level only |
| 15 | Any new endpoint constant, new env var, or new feature flag | Plan §9.4 (no flag) |
| 16 | `npm` install (use `yarn` only) | Repo policy |

---

## 3. File-by-File Action List (Atomic PR)

> All changes land in one PR. File order below is the recommended order to write/review the diffs in.

### Step 1 — `/app/frontend/src/api/transforms/printerAgentSelector.js` (NEW)

Create this file. Pure functions only. No React, no axios, no JSX, no side effects.

**Public exports required:**
- `BILL_STATION_LABEL` — string constant `'BILL'`
- `normalizePrinterAgent(raw)` — single-row normaliser; returns null on unusable input
- `selectAgentsForBill(printerAgents)` — BILL filter (case-insensitive match)
- `selectAgentsForKot(printerAgents, stationSet)` — KOT filter; excludes BILL
- `cartStationsToSet(unplacedItems)` — distinct trimmed `station` values from unplaced cart items

**Behaviour gates:** R-OWNER-1 (preserve casing in output), R-OWNER-2 (case-insensitive match), R-OWNER-3 (string for `printer_agent_id` + `printer_paper_roll`; null/undefined → `''`), R-OWNER-4 (preserve `null` for all other fields), R-OWNER-5 (`printer_data[0]` only), OQ-PA-5 (skip if `printer_data: []`), OQ-PA-6 (skip if `area_name` blank), OQ-PA-12 (preserve API order; no sort).

**Pseudocode reference:** Implementation plan §5.1–§5.6.

**Header comment:** include CR ID, R-OWNER bullet list, and BE-PA8 dynamic-label note. No emojis.

---

### Step 2 — `/app/frontend/src/api/transforms/profileTransform.js` (EDIT)

**Edit 1.** Add import after the existing relative imports at the top:
```js
import { normalizePrinterAgent } from './printerAgentSelector';
```

**Edit 2.** In the `restaurant` builder, after the existing `printers:` line at L171, add:
```js
// CR-POS2-003: dynamic per-station printer agents (additive; missing = []).
printerAgents: fromAPI.printerAgents(api.print_agent),
```

**Edit 3.** Add a new helper inside the `fromAPI` object, sibling to `printers` (around L233-243):
```js
printerAgents: (apiArray) => {
  if (!Array.isArray(apiArray)) return [];
  return apiArray.map(normalizePrinterAgent).filter(Boolean);
},
```

**Tests touched:** extend `__tests__/api/transforms/profileTransform.test.js` per §7.1 of the plan.

---

### Step 3 — `/app/frontend/src/contexts/RestaurantContext.jsx` (EDIT)

**Edit 1.** After the `printers` memo at L72-74, add:
```js
const printerAgents = useMemo(() => {
  return restaurant?.printerAgents || [];
}, [restaurant]);
```

**Edit 2.** Add `printerAgents` to the value object (between `printers` and `setRestaurant`).

**Edit 3.** Add `printerAgents` to the deps array of the `useMemo` wrapping `value`.

**No test required** for the context provider itself; consumer tests cover it indirectly.

---

### Step 4 — `/app/frontend/src/api/services/orderService.js` (EDIT)

**Edit 1.** Add import after the existing imports at the top:
```js
import { selectAgentsForBill, selectAgentsForKot } from '../transforms/printerAgentSelector';
```

**Edit 2.** Extend `printOrder` signature at L120 to accept `printerAgents = []` as the final optional parameter. JSDoc must document it.

**Edit 3.** Inside `printOrder`, after the existing `payload` is built (BILL branch at L125 / KOT branch at L132), compute `agents`:
```js
let agents = [];
if (printType === 'bill') {
  agents = selectAgentsForBill(printerAgents);
} else if (printType === 'kot' && stationKot) {
  const stationSet = String(stationKot).split(',').map(s => s.trim()).filter(Boolean);
  agents = selectAgentsForKot(printerAgents, stationSet);
}
payload.printer_agent = agents;

// R-OWNER-6 / R-LOG-1: warn ONLY when agents were configured but none matched.
if (printerAgents.length > 0 && agents.length === 0) {
  // eslint-disable-next-line no-console
  console.warn('[printer_agent] empty agent set on order-temp-store', { printType, stationKot });
}
```

**Edit 4.** Update the existing `console.log('[PrintOrder] payload:', payload)` to also log `printer_agent.length` for observability.

---

### Step 5 — Update the 9 `printOrder()` call sites (EDIT)

Each call site adds `printerAgents` from `useRestaurant()` as the final argument. UI / JSX MUST NOT change.

| # | File | Line | Action |
|---|---|---|---|
| 1 | `frontend/src/components/cards/OrderCard.jsx` | 109 | Append `printerAgents` arg |
| 2 | `frontend/src/components/cards/OrderCard.jsx` | 134 | Append `printerAgents` arg |
| 3 | `frontend/src/components/cards/TableCard.jsx` | 129 | Append `printerAgents` arg |
| 4 | `frontend/src/components/cards/TableCard.jsx` | 158 | Append `printerAgents` arg |
| 5 | `frontend/src/components/order-entry/RePrintButton.jsx` | 50 | Append `printerAgents` arg |
| 6 | `frontend/src/components/order-entry/RePrintButton.jsx` | 110 | Append `printerAgents` arg |
| 7 | `frontend/src/components/order-entry/OrderEntry.jsx` | 1233 | Append `printerAgents` arg |
| 8 | `frontend/src/components/order-entry/OrderEntry.jsx` | 1335 | Append `printerAgents` arg |
| 9 | `frontend/src/components/order-entry/OrderEntry.jsx` | 1550 | Append `printerAgents` arg |

For each card / button / page, `printerAgents` comes from `useRestaurant()` — destructure it in the same line as `printers` is destructured (or add it).

---

### Step 6 — `/app/frontend/src/api/transforms/orderTransform.js` (EDIT)

**Edit 1.** Add import at the top:
```js
import { selectAgentsForKot, cartStationsToSet } from './printerAgentSelector';
```

**Edit 2.** In `toAPI.placeOrder` at L730-731, extend the `options` destructuring to include `printerAgents = []`.

**Edit 3.** After `cart` is computed at L734 and before the `payload` object construction at L748, add:
```js
// CR-POS2-003: KOT-station printer agents only when print_kot === 'Yes'.
// R-OWNER-9 / R-OWNER-10. BILL excluded by selectAgentsForKot.
const printerAgentForPlace = printAllKOT
  ? selectAgentsForKot(printerAgents, cartStationsToSet(unplacedItems))
  : [];
```

**Edit 4.** Inside the `payload = { ... }` object, after the `cart` field, add:
```js
printer_agent: printerAgentForPlace,
```

**Edit 5.** In `toAPI.placeOrderWithPayment` at L895, mirror Edits 2-4.

**Edit 6.** Inside both builders, add the same warn (R-OWNER-6) right after the payload is finalised:
```js
if (printerAgents.length > 0 && printerAgentForPlace.length === 0 && printAllKOT) {
  // eslint-disable-next-line no-console
  console.warn('[printer_agent] empty agent set on place-order', { printKot: printAllKOT, cartStationCount: cartStationsToSet(unplacedItems).length });
}
```

**Tests touched:** extend / create payload tests per §7.1 of the plan. Use at least one non-canonical station label fixture (e.g., `"PASTRY"`) per §7.3.

---

### Step 7 — `/app/frontend/src/api/constants.js` (EDIT)

**Edit 1.** Single line change at L41:
```js
PLACE_ORDER:       '/api/v1/vendoremployee/order/place-order',          // CR-POS2-003 (May-2026): switched v2 → v1; multipart shape unchanged. New order (unpaid + prepaid via payment_status=paid)
```

**No other line in this file changes.** No comment block above is added, removed, or moved.

---

### Step 8 — `/app/frontend/src/components/order-entry/OrderEntry.jsx` (EDIT — place-order options threading)

**Edit 1.** Locate the `useRestaurant()` destructure near the top of the component. If `printerAgents` is not already extracted, add it.

**Edit 2.** At L796-808 (postpaid `placeOrder` call), extend the `options` object to include:
```js
printerAgents: printerAgents || [],
```

**Edit 3.** At L1394-1402 (prepaid `placeOrderWithPayment` call), extend the `options` object identically.

**No other change in OrderEntry.jsx.** The 3 `printOrder()` calls (L1233/1335/1550) are handled in Step 5.

---

## 4. Tests Required Before PR

| Test file | Action | Plan ref |
|---|---|---|
| `frontend/src/__tests__/api/transforms/printerAgentSelector.test.js` | NEW — covers `normalizePrinterAgent`, `selectAgentsForBill`, `selectAgentsForKot`, `cartStationsToSet` (≥10 cases incl. dynamic-label fixture per §7.3) | §7.1 |
| `frontend/src/__tests__/api/transforms/profileTransform.test.js` | EXTEND — `restaurant.printerAgents` populated when `print_agent` present; `[]` when missing/empty/non-array | §7.1 |
| `frontend/src/__tests__/api/transforms/placeOrderPayload.test.js` (new) OR extension of `updateOrderPayload.test.js` | NEW or EXTEND — `printer_agent: []` when `print_kot:'No'`; matching agents when `print_kot:'Yes'`; BILL excluded; unmatched cart stations silently ignored; non-canonical label fixture | §7.1 |

**Lint requirement:** run `yarn lint` (or the repo's `yarn` lint script) on all modified files. PR cannot land with new lint errors.

**Build requirement:** run `yarn build` locally — must pass without warnings new to this PR.

**No other test files touched.** Do not modify or delete any pre-existing test.

---

## 5. PR Description Template

Copy this verbatim into the PR description, fill the `[ ]` checkboxes, and attach the validation diff at the end.

```markdown
## POS2-003 — Print Agent Mapping + Place-Order v1 Endpoint

**CR doc:** /app/memory/change_requests/impact_analysis/POS2_003_PRINT_AGENT_MAPPING_CR_IMPACT_ANALYSIS_2026_05_08.md
**Plan doc:** /app/memory/change_requests/implementation_plans/POS2_003_PRINT_AGENT_MAPPING_IMPLEMENTATION_PLAN_2026_05_08.md
**Handover:** /app/memory/change_requests/implementation_handover/POS2_003_IMPLEMENTATION_AGENT_HANDOVER_2026_05_08.md

### Scope (atomic PR — Phases A+B+C+D)
- [ ] Phase A — Profile mapping
- [ ] Phase B — order-temp-store injection
- [ ] Phase C — place-order injection + endpoint v2 → v1
- [ ] Phase D — Validation (after backend deploy)

### Files changed
- [ ] frontend/src/api/transforms/printerAgentSelector.js (NEW)
- [ ] frontend/src/api/transforms/profileTransform.js
- [ ] frontend/src/contexts/RestaurantContext.jsx
- [ ] frontend/src/api/services/orderService.js
- [ ] frontend/src/api/transforms/orderTransform.js
- [ ] frontend/src/api/constants.js (one-line endpoint swap)
- [ ] frontend/src/components/order-entry/OrderEntry.jsx
- [ ] frontend/src/components/cards/OrderCard.jsx (printerAgents arg only)
- [ ] frontend/src/components/cards/TableCard.jsx (printerAgents arg only)
- [ ] frontend/src/components/order-entry/RePrintButton.jsx (printerAgents arg only)

### Tests
- [ ] printerAgentSelector.test.js (new) — green
- [ ] profileTransform.test.js — green
- [ ] place-order payload test — green
- [ ] yarn lint — clean
- [ ] yarn build — clean

### Strict no-go compliance
- [ ] /app/memory/final/* untouched
- [ ] No endpoint constant changed besides PLACE_ORDER
- [ ] No UI / JSX changed; only printerAgents argument threading
- [ ] Billing/GST/SC/DC code paths untouched
- [ ] Prepaid/postpaid behaviour unchanged
- [ ] CR-008 D1-Gate isPrepaid preserved
- [ ] CR-013 bill print payload keys preserved (printer_agent appended only)
- [ ] update-place-order untouched
- [ ] No npm; yarn only
- [ ] No new env var, no feature flag

### Backend dependency
- [ ] Backend has deployed v1 /api/v1/vendoremployee/order/place-order
- [ ] Backend accepts additive printer_agent on order-temp-store
- [ ] Backend accepts additive printer_agent on place-order
- [ ] Backend response shape on v1 place-order returns order_id (one of: res.data.order_id / res.data.data.order_id / res.data.new_order_ids[0])

### Validation diff (paste before merge)
- v2 vs v1 place-order body diff: <one additive key `printer_agent` only, per V-13>
- pre-CR vs post-CR order-temp-store BILL body diff: <one additive key `printer_agent` only, per V-14>

### Validation V-1..V-20
Run on preprod after backend confirms deploy. See plan §7.2.
```

---

## 6. Validation Acceptance Criteria

The PR may merge ONLY when:

1. All boxes in §5 PR template are ticked.
2. Backend confirms in writing that v1 `place-order` is deployed and accepts the new payload (BE-PA1..7 already received; this is just deploy confirmation).
3. All tests pass on CI.
4. `yarn lint` and `yarn build` are clean.
5. Code review approves.

After merge:
6. Run V-1..V-20 (plan §7.2) on preprod.
7. Capture the validation diff (V-13/V-14) and append to the PR thread.
8. If any V-* fails → trigger §7 hotfix.

---

## 7. Hotfix Path (Post-Merge)

| Failure mode | Action | Time-to-fix |
|---|---|---|
| v1 `place-order` returns 4xx/5xx | Single-line revert at `constants.js:41` (v1 → v2). v2 still accepts `printer_agent` harmlessly per BE-PA3. | ≤ 5 min |
| Backend throws on `printer_agent` field | Atomic-PR revert (full revert of this PR). | ≤ 15 min |
| Empty agents flooding console.warn | Ship a follow-up PR raising the warn threshold to once-per-session. | Same day |
| Tenant uses non-`BILL` label for bill station | Emergency: change `BILL_STATION_LABEL` constant in `printerAgentSelector.js` and re-deploy. Long-term: future CR for tenant-config override. | Same day |

---

## 8. Out-of-Scope Follow-Ups (Document Only — Do NOT Implement)

These are explicitly NOT part of this PR. Note them in the PR description as future work:

1. **`update-place-order`** receiving `printer_agent` (R-OWNER-14 / OQ-PA-16 — separate CR)
2. **Tenant-configurable bill-station label** (currently hard-coded `'BILL'`; future CR)
3. **Configurable empty-agent log threshold** (current default = once per call; nice-to-have)
4. **Aggregator/Swiggy/Zomato printer-agent routing** (out of scope; aggregator flow is webhook-driven per profile note at `profileTransform.js:269-272`)

---

## 9. Communication Plan

| Trigger | Action | Recipient |
|---|---|---|
| PR opened | Post link in #pos2-engineering with PR template summary | Team |
| PR merged | Post merge confirmation + backend-deploy ETA | Team + backend lead |
| V-1..V-20 complete | Post validation diff + V-* checklist | Owner + QA + backend lead |
| Hotfix triggered | Post incident summary in #pos2-incidents | Team + Owner |

---

## 10. Strict-Rules Compliance Certification

| Rule | Status |
|---|---|
| `/app/memory/final/*` untouched | ✅ |
| No source code edited in this handover authoring | ✅ |
| No implementation in this handover authoring | ✅ |
| Atomic PR scope respects R-OWNER-1..15 + BE-PA1..9 + OQ-PA-1..17 | ✅ |
| Phase ordering matches plan §6 | ✅ |
| Rollback/hotfix path documented | ✅ §7 |
| No new endpoint constant or feature flag | ✅ §2 row 15 |
| Out-of-scope items isolated and documented | ✅ §8 |
| Stop after creating handover | ✅ |

---

— End of POS2-003 Implementation Agent Handover 2026-05-08 —
