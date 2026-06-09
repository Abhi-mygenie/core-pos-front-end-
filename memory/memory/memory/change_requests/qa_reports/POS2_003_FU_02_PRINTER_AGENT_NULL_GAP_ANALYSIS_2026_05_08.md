# POS2-003 — FU-02 Gap Analysis: `printer_agent` Empty on Specific Print Paths

> **Sprint:** pos2.0
> **CR ID:** POS2-003
> **Bug ID:** POS2-003-FU-02
> **Date:** 2026-05-08
> **Reporter:** Owner
> **Verdict (preview):** `ready_for_fix` — exact 2-line fix identified; pending owner approval to apply.

---

## 0. Symptom (verified against screenshot)

Owner reports `printer_agent` is **going null** in two flows:
1. Manual **Print Bill** button on the OrderEntry header (Collect Bill screen UI region).
2. **Postpaid auto-print** bill that fires after `order-bill-payment` (collect-bill) succeeds.

Other print paths (KOT print on OrderCard / TableCard / RePrintButton, Bill print from OrderCard / TableCard, prepaid place+pay auto-print) are confirmed working.

**Wire-level reality:** the screenshot shows `"printer_agent":[]` (empty array), **not literally `null`**. The colloquial "null" is loose terminology; `printOrder()`'s default param ensures the value is always `[]` and never `null`. Functionally identical to the user-reported bug — agent rows are absent from the wire.

---

## 1. Docs read (mandatory order)

| Layer | Doc | Status |
|---|---|---|
| Baseline | `/app/memory/final/FINAL_DOCS_APPROVAL_STATUS.md` | ✅ Already read in this session |
| Baseline | `/app/memory/final/IMPLEMENTATION_AGENT_RULES.md` | ✅ Already read |
| Baseline | `/app/memory/final/CHANGE_REQUEST_PLAYBOOK.md` | ✅ Already read |
| Baseline | `/app/memory/final/MODULE_DECISIONS_FINAL.md` | ✅ Already read |
| Baseline | `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md` | ✅ Already read |
| Overlay | `BASELINE_RECONCILIATION_REPORT_2026_05_04.md` | ✅ Already read |
| Overlay | `FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md` | ✅ Already read |
| CR | `POS2_003_PRINT_AGENT_MAPPING_CR_IMPACT_ANALYSIS_2026_05_08.md` | ✅ Already read (incl. §16) |
| CR | `POS2_003_PRINT_AGENT_MAPPING_IMPLEMENTATION_PLAN_2026_05_08.md` | ✅ Already read |
| CR | `POS2_003_IMPLEMENTATION_AGENT_HANDOVER_2026_05_08.md` | ✅ Already read (all 396 lines) |
| Implementation | `POS2_003_PRINT_AGENT_MAPPING_IMPLEMENTATION_SUMMARY_2026_05_08.md` | ✅ Already read |
| QA | `POS2_003_PRINT_AGENT_MAPPING_QA_REPORT_2026_05_08.md` (incl. addenda 1+2) | ✅ Already read |

---

## 2. Root cause

**Two `printOrder()` call sites omit the 7th argument (`printerAgents`).**

The call sites destructure `printerAgents` from `useRestaurant()` correctly, but fail to thread it as the 7th positional argument of `printOrder()`. Because `printOrder` declares `printerAgents = []` as a default parameter (`orderService.js:126`), the omission silently coerces to an empty array — `selectAgentsForBill([]) → []` → wire shows `"printer_agent":[]`.

### 2.1 Function signature (canonical)

```js
// /app/frontend/src/api/services/orderService.js:126
export const printOrder = async (
  orderId,
  printType,
  stationKot = null,
  orderData = null,
  serviceChargePercentage = 0,
  overrides = {},
  printerAgents = []   // ← 7th positional arg
) => { ... }
```

### 2.2 Bad call site #1 — `PrintBillButton.handlePrintBill`

**File:** `/app/frontend/src/components/order-entry/RePrintButton.jsx`
**Lines 99-115:**

```jsx
export const PrintBillButton = ({ orderId }) => {
  // ...
  const { restaurant, printerAgents } = useRestaurant();   // ← destructured ✅
  // ...
  await printOrder(orderId, 'bill', null, order, scPctForPrint, {
    serviceChargeTaxPct:  restaurant?.serviceChargeTaxPct  || 0,
    deliveryChargeGstPct: restaurant?.deliveryChargeGstPct || 0,
  });   // ← 6 args, NO 7th arg ❌
```

Six arguments passed; `printerAgents` parameter falls back to default `[]`.

### 2.3 Bad call site #2 — Postpaid auto-print bill (post-collect-bill)

**File:** `/app/frontend/src/components/order-entry/OrderEntry.jsx`
**Lines 1555-1562:**

```jsx
await printOrder(
  Number(collectOrderId),
  'bill',
  null,
  orderForPrint,
  restaurant?.serviceChargePercentage || 0,
  collectBillOverrides,
);   // ← 6 args, NO 7th arg ❌
```

Same defect.

---

## 3. Missed call paths

### 3.1 Full inventory of `printOrder()` callers (9 total)

| # | File | Line | Phase | Variant | 7th arg present? | Status |
|---|---|---:|---|---|---|---|
| 1 | `RePrintButton.jsx` | 52 | RePrintOnlyButton (placed-items KOT) | KOT | `printerAgents \|\| []` | ✅ OK |
| 2 | `RePrintButton.jsx` | 112 | **PrintBillButton (OrderEntry header)** | BILL | **(omitted)** | ❌ **BUG** |
| 3 | `OrderCard.jsx` | 109 | OrderCard KOT | KOT | `printerAgents \|\| []` | ✅ OK |
| 4 | `OrderCard.jsx` | 134 | OrderCard Bill | BILL | `printerAgents \|\| []` | ✅ OK |
| 5 | `TableCard.jsx` | 129 | TableCard KOT | KOT | `printerAgents \|\| []` | ✅ OK |
| 6 | `TableCard.jsx` | 158 | TableCard Bill | BILL | `printerAgents \|\| []` | ✅ OK |
| 7 | `OrderEntry.jsx` | 1235 | Manual Print Bill (CollectPaymentPanel `onPrintBill` callback) | BILL | `printerAgents \|\| []` | ✅ OK |
| 8 | `OrderEntry.jsx` | 1337 | **Prepaid place+pay** auto-print bill | BILL | `printerAgents \|\| []` | ✅ OK |
| 9 | `OrderEntry.jsx` | 1555 | **Postpaid collect-bill** auto-print bill | BILL | **(omitted)** | ❌ **BUG** |

**2 / 9 call sites are missing the 7th arg.** Both are BILL-print paths.

### 3.2 Mapping to owner-reported flows

| Owner-reported flow | Call site | Bug? |
|---|---|---|
| 1. Manual printing from Collect Bill screen | #2 (`PrintBillButton.handlePrintBill`) — the button visible in the screenshot's `OrderEntry` header next to `Cancel` | ❌ Missing 7th arg |
| 2. Auto-print in postpaid flow | #9 (`OrderEntry.jsx:1555` post-`BILL_PAYMENT` auto-print) | ❌ Missing 7th arg |

Owner's report is **fully explained** by these two omissions.

### 3.3 Disambiguation — TWO "Print Bill" buttons

The user's complaint conflates two visually-similar buttons:

| Button | Component | Where rendered | Status |
|---|---|---|---|
| **OrderEntry header** "Print Bill" (next to `Cancel`) — **what the screenshot shows** | `PrintBillButton` (RePrintButton.jsx:96) | Top-right of OrderEntry, visible on every order screen | ❌ **BUG** |
| CollectPaymentPanel BILL SUMMARY "Print Bill" | `handlePrintBill` (CollectPaymentPanel.jsx:574) → `onPrintBill` prop → OrderEntry.jsx:1217-1242 → call #7 | Inside Collect Payment dialog, next to BILL SUMMARY | ✅ OK (already passes 7th arg at L1235) |

The screenshot button is the OrderEntry-header one; CollectPayment panel's button works. The owner's wording "manual printing from Collect Bill screen" refers to the header button (because it sits on the same screen where the user is collecting the bill).

---

## 4. Why QA missed it

### 4.1 Test coverage gap — no call-site integration test

| Test layer | What it verified | What it didn't verify |
|---|---|---|
| `printerAgentSelector.test.js` (27 cases) | Pure function correctness of `selectAgentsForBill`, `selectAgentsForKot`, `cartStationsToSet`, `normalizePrinterAgent` | Whether call sites pass the agent array in the first place |
| `placeOrderPayload.test.js` (10 cases) | `placeOrder` + `placeOrderWithPayment` builders correctly inject `printer_agent` | Doesn't exercise `printOrder()` call sites at all (place-order, not order-temp-store) |
| `profileTransform.test.js` (+7 cases) | Profile mapping `print_agent` → `restaurant.printerAgents` | Doesn't exercise UI components |

**No test renders `<PrintBillButton>` or `<OrderEntry>` with a populated `printerAgents` context and clicks the button to assert the wire payload.** A simple call-site smoke test (mock `api.post`, render, click, inspect last call) would have caught both bugs immediately.

### 4.2 Live wire diff was hand-crafted, not button-driven

Addendum 1's V-13/V-14 used `curl` with hand-built JSON / multipart bodies — they tested whether the *backend* accepts `printer_agent`, but not whether the *FE* sends it via the actual button click. A real browser interaction (Playwright or manual click + DevTools network inspection) would have shown `[]` immediately on the Print Bill button.

### 4.3 Tenant-config blind spot

Tenant 478 (the only preprod tenant tested) has `print_agent: []` at the v1 profile top-level today. So even if QA had clicked the Print Bill button, the wire would still have shown `printer_agent: []` — indistinguishable from the "missing 7th arg" defect. **The bug is only visually distinguishable on tenants that have configured `print_agent` rows**. The owner's screenshot probably comes from a tenant with configured agents, where:
- Working paths (e.g. KOT print) show populated `printer_agent[]`
- Broken paths (#2, #9) show empty `printer_agent[]`

This contrast is what tipped the owner off, but QA had no such contrast tenant.

### 4.4 Static count vs static disambiguation

The implementation summary claimed "all 9 sites threaded with `printerAgents`". This was based on counting `printerAgents` mentions in `git diff`. But two sites already had `printerAgents` in the destructure (added by the earlier edit) yet were never updated at the call site itself. Counting mentions ≠ verifying argument-arity at every call. **The cleaner signal would have been**: `grep -c "printOrder(" callsites && grep -c "printerAgents \|\| \[\])" callsites` — equality would have proven all sites pass the arg. The mismatch (9 vs 7) would have surfaced immediately.

---

## 5. Exact files / functions involved

| File | Function | Action |
|---|---|---|
| `/app/frontend/src/components/order-entry/RePrintButton.jsx` | `PrintBillButton.handlePrintBill` (line 102-123) | Add `printerAgents \|\| []` as the 7th arg of the `printOrder` call at line 112-115 |
| `/app/frontend/src/components/order-entry/OrderEntry.jsx` | Postpaid auto-print branch (line 1516-1562, inside the post-`BILL_PAYMENT` `if` block) | Add `printerAgents \|\| []` as the 7th arg of the `printOrder` call at line 1555-1562 |

No other file changes required.

---

## 6. Minimal fix plan (NOT applied — pending approval)

### 6.1 Fix #1 — `RePrintButton.jsx` PrintBillButton

**Diff (proposed):**

```diff
       await printOrder(orderId, 'bill', null, order, scPctForPrint, {
         serviceChargeTaxPct:  restaurant?.serviceChargeTaxPct  || 0,
         deliveryChargeGstPct: restaurant?.deliveryChargeGstPct || 0,
-      });
+      }, printerAgents || []);
       toast({ title: "Bill request sent", description: `Order #${orderId}` });
```

- 1 line changed.
- `printerAgents` is already destructured at line 99 from `useRestaurant()` — no other change needed.

### 6.2 Fix #2 — `OrderEntry.jsx` Postpaid auto-print bill

**Diff (proposed):**

```diff
                           await printOrder(
                             Number(collectOrderId),
                             'bill',
                             null,
                             orderForPrint,
                             restaurant?.serviceChargePercentage || 0,
                             collectBillOverrides,
+                            printerAgents || [],
                           );
```

- 1 line added.
- `printerAgents` is already destructured at line 49 from `useRestaurant()` (added during the original CR) — no other change needed.

### 6.3 Test additions (recommended)

Add a regression test file `__tests__/api/services/printOrder.callsites.test.js` (~30 lines) that:

- Mocks `api.post`
- Renders `<PrintBillButton orderId={1} />` inside a `RestaurantContext` provider seeded with `{ printerAgents: [{station:'BILL',...}] }`
- Renders the OrderEntry postpaid auto-print branch (or directly invokes the relevant handler)
- Clicks Print Bill / triggers auto-print
- Asserts `api.post` was called with `printer_agent: [{station:'BILL',...}]`, not `[]`

This is the structural test that should have existed during the original CR. Optional in the scope of this fix; mandatory if FU-02 is to be retro-validated end-to-end.

### 6.4 Estimated effort

| Step | Effort |
|---|---|
| Two 1-line edits | <5 min |
| `yarn test --watchAll=false` (existing 239 tests) | ~5 sec |
| `yarn build` | ~17 sec |
| Optional new regression test | +20 min |
| Live re-verify on tenant-with-configured-agents | depends on tenant readiness |

---

## 7. Validation checklist for affected flows (post-fix)

After applying the fix and against a tenant with `print_agent` configured (or via a test fixture provider with mocked `printerAgents`):

| # | Scenario | Expected result | How to verify |
|---|---|---|---|
| 7-1 | OrderEntry header → click "Print Bill" | Wire `printer_agent` contains the BILL agent (or `[]` if BILL not configured) | DevTools network on `order-temp-store` |
| 7-2 | Postpaid order: Collect Bill → submit payment with `Auto Bill Print` ON | After the `order-bill-payment` 200, the subsequent `order-temp-store` BILL call carries the BILL agent | DevTools network — observe both calls in sequence |
| 7-3 | Postpaid order: same flow with `Auto Bill Print` OFF | No `order-temp-store` call fires (auto-print suppressed). Manual button still threads BILL agent. | DevTools network |
| 7-4 | Prepaid order: place+pay with `Auto Bill Print` ON (regression) | Wire `printer_agent` still contains BILL agent (was already working) | DevTools network |
| 7-5 | OrderCard / TableCard "Print Bill" (regression) | Still works (was already passing 7th arg) | DevTools network |
| 7-6 | RePrintOnlyButton KOT print (regression) | Still works | DevTools network |
| 7-7 | Tenant with empty `print_agent` (graceful) | All paths send `printer_agent: []`. No console errors. | DevTools network + console |
| 7-8 | Unit suite | `yarn test --watchAll=false` → 21/21 suites, 239/239 tests | CI |
| 7-9 | Build | `yarn build` → "Compiled successfully" / 0 new warnings | CI |

---

## 8. Analysis Q&A (per task)

| # | Question | Answer |
|---|---|---|
| 1 | Which exact component/function handles "Collect Bill manual print"? | `PrintBillButton.handlePrintBill` in `RePrintButton.jsx:102-123` (the OrderEntry header button shown in the screenshot). NOT the CollectPaymentPanel one — that one is fine. |
| 2 | Which exact component/function handles "postpaid auto print"? | The post-`BILL_PAYMENT` auto-print branch in `OrderEntry.jsx:1516-1567` — call to `printOrder` at line 1555-1562. |
| 3 | Are they part of the 9 call sites that were updated? | Yes — both are among the original 9. They had `printerAgents` destructured at the component scope, but the call site itself was never threaded with the 7th arg. |
| 4 | If yes, why is `printerAgents` still null? | Functionally not null — it's `[]`. The 7th arg is **omitted** at the call site, so `printOrder`'s default `printerAgents = []` parameter takes effect. `selectAgentsForBill([]) → []` → wire shows `printer_agent: []`. |
| 5 | If no, which call sites were missed? | n/a — all 9 sites are accounted for; 2 missed the 7th arg. See §3.1. |
| 6 | Does `printOrder()` default `printerAgents` to [] or null? | `[]` (line 126 default param). The wire **never** shows `null`. |
| 7 | Does `selectAgentsForBill()` handle null/undefined safely? | Yes — `if (!Array.isArray(printerAgents)) return [];` (printerAgentSelector.js:75). Even on `null` / `undefined`, the function returns `[]`, never throws. |
| 8 | Does final payload always include array? | Yes — `payload.printer_agent = agents;` (orderService.js:153) always assigns an array. Never `null`, never undefined. **OQ-PA-9 honoured.** |
| 9 | Is `RestaurantContext` available in the affected component tree? | Yes — `PrintBillButton` is rendered inside `OrderEntry`, which is below `<RestaurantProvider>`. `useRestaurant()` returns `{ printerAgents }` correctly. The bug is purely a missing call-site argument. |
| 10 | Are these flows using stale props/context before profile is loaded? | No — the profile is hydrated on app boot, before any "Print Bill" button is reachable. `printerAgents` is fully ready. |

---

## 9. Risks of the proposed fix

| Risk | Severity | Mitigation |
|---|---|---|
| Tenant has `printerAgents = []` (graceful path) | None | Wire continues to send `[]`; identical to today's broken behaviour. |
| BILL agent is misconfigured on backend (wrong station label) | Low | `selectAgentsForBill` is case-insensitive (R-OWNER-2). Backend label "BILL" matches tenant data. |
| Argument arity refactored later | Low | All other 7 sites already pass the 7th arg; consistency only improves. |
| QA regression on the fix | None | The 2 changes are mechanical and additive; existing tests cover `printOrder` correctness; the missing piece is just call-site arg threading. |

---

## 10. Final verdict

> ## **`ready_for_fix`**

- Root cause is unambiguous: two `printOrder()` call sites omit the 7th argument.
- Fix is mechanical, 2 lines total (1 edit + 1 added line), no logic change.
- No backend change required.
- No risk to billing / GST / SC / DC / cart / station_kot / print_type / prepaid-postpaid behaviour.
- No `/app/memory/final/*` change.
- Regression coverage exists for `printOrder` correctness; fix only restores call-site argument threading.

**Pending owner approval to apply the 2-line fix and re-run the validation checklist (§7).**

If approved, ETA to applied + tested + committed: ≤ 10 minutes.

---

— End of POS2-003-FU-02 Gap Analysis 2026-05-08 —

---

# Addendum — Fix Applied 2026-05-08

> **Trigger:** Owner approved with `ready_for_fix`.
> **Scope:** 2-line surgical fix; no logic change.
> **Outcome:** Applied, tested, built. Awaiting live runtime confirmation on a tenant with `print_agent` configured.

## F1. Edits applied

### F1.1 `frontend/src/components/order-entry/RePrintButton.jsx`

```diff
       await printOrder(orderId, 'bill', null, order, scPctForPrint, {
         serviceChargeTaxPct:  restaurant?.serviceChargeTaxPct  || 0,
         deliveryChargeGstPct: restaurant?.deliveryChargeGstPct || 0,
-      });
+      }, printerAgents || []);
```

`PrintBillButton.handlePrintBill` — the OrderEntry header "Print Bill" button — now threads the 7th arg.

### F1.2 `frontend/src/components/order-entry/OrderEntry.jsx`

```diff
                           await printOrder(
                             Number(collectOrderId),
                             'bill',
                             null,
                             orderForPrint,
                             restaurant?.serviceChargePercentage || 0,
                             collectBillOverrides,
+                            printerAgents || [],
                           );
```

Postpaid auto-print branch (post-`BILL_PAYMENT` success) — now threads the 7th arg.

## F2. Static audit — every `printOrder(` call site now threads `printerAgents`

| # | File | Line | Variant | 7th arg |
|---|---|---:|---|---|
| 1 | `RePrintButton.jsx` | 52 | RePrintOnlyButton (KOT) | ✅ |
| 2 | `RePrintButton.jsx` | 112 | **PrintBillButton (BILL)** | ✅ **(fixed)** |
| 3 | `OrderCard.jsx` | 109 | KOT | ✅ |
| 4 | `OrderCard.jsx` | 134 | BILL | ✅ |
| 5 | `TableCard.jsx` | 129 | KOT | ✅ |
| 6 | `TableCard.jsx` | 158 | BILL | ✅ |
| 7 | `OrderEntry.jsx` | 1235 | Manual Print Bill (CollectPaymentPanel callback) | ✅ |
| 8 | `OrderEntry.jsx` | 1337-1344 | Prepaid place+pay auto-print | ✅ |
| 9 | `OrderEntry.jsx` | 1555-1562 | **Postpaid collect-bill auto-print** | ✅ **(fixed)** |

**9/9 call sites now correctly thread the agent array.** `git grep` shows zero remaining `printOrder(` invocations without the 7th arg.

## F3. Build / test results (post-fix)

| Check | Result |
|---|---|
| `yarn test --watchAll=false` | **21/21 suites · 239/239 tests** pass — zero regressions |
| `yarn build` (production) | **Compiled successfully**, 433.36 kB (vs 433.36 kB pre-fix — identical, as expected for 2-line non-logic edit) |
| New warnings | 0 |
| Lint surface | unchanged |

## F4. Validation checklist (§7 of gap analysis) — what still needs runtime confirmation

| # | Gate | How verified now | Owner runtime needed? |
|---|---|---|---|
| 7-1 | OrderEntry header → click "Print Bill" → wire carries BILL agent | Static (7th arg threaded; selectAgentsForBill will route it) | ✅ Yes — on tenant with `print_agent` configured |
| 7-2 | Postpaid: Collect Bill payment → auto-print bill carries BILL agent | Static (7th arg threaded) | ✅ Yes — same tenant |
| 7-3 | Postpaid + auto-print OFF → no order-temp-store fires | Logic unchanged; only conditional fix | ❌ No — covered by pre-existing logic |
| 7-4 | Prepaid place+pay auto-print (regression) | Already passing 7th arg pre-fix | ❌ No — confirmed in Addendum 1 |
| 7-5 | OrderCard / TableCard "Print Bill" (regression) | Already passing 7th arg pre-fix | ❌ No — confirmed in Addendum 1 |
| 7-6 | RePrintOnlyButton KOT (regression) | Already passing 7th arg pre-fix | ❌ No |
| 7-7 | Tenant with empty `print_agent` (graceful) | Function default + `selectAgentsForBill([]) → []` | ✅ Already true on tenant 478 (today's preprod) |
| 7-8 | Unit suite | 239/239 ✅ | Done |
| 7-9 | Build clean | ✅ | Done |

**Gates 7-1 and 7-2 are the only remaining live-runtime confirmations** and they require a tenant where `print_agent` is non-empty. Today's preprod tenant 478 returns `print_agent: []`, so even on this tenant the wire correctly shows `printer_agent: []` post-fix (graceful path) — but that does not visually distinguish the fix from the original bug. Owner has a tenant-with-agents environment from which the bug screenshot was captured; clicking the same buttons there post-fix should now show the BILL agent in the wire.

## F5. Side effects

- 0 new orders created.
- 0 new test/preprod calls.
- 0 backend changes.
- 0 changes to `/app/memory/final/*`.
- 0 changes to billing/GST/SC/DC/cart/print_type/station_kot/prepaid-postpaid/socket logic.
- 2 lines of code edited; 1 new line added.

## F6. Final verdict (post-fix)

> ## **`fix_applied_static_validation_pass — runtime_confirmation_pending_on_tenant_with_configured_agents`**

The two missing 7th-arg call sites identified in the gap analysis are now fixed. All 9 `printOrder()` call sites in the codebase thread `printerAgents || []`. Static + unit + build validation all green. Owner verification on a tenant with a configured `BILL` agent will close FU-02.

If owner confirms wire shows BILL agent on both flows post-fix, this addendum can be promoted to `fu_02_resolved` in the QA report. If wire still shows `[]`, the residual likely lies in tenant-side `print_agent` configuration (not FE), and we'll need backend lead to confirm `restaurants[?].print_agent` is populated for the failing tenant.

---

— End of POS2-003-FU-02 Fix-Applied Addendum 2026-05-08 —
