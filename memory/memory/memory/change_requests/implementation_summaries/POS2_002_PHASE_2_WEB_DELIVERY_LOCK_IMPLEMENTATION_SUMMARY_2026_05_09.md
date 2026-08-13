# POS2-002 Phase 2 — Web Delivery Charge Lock (frozen-snapshot)

> **Sprint:** pos2.0
> **CR ID:** POS2-002 (Phase 2 of 4)
> **Date:** 2026-05-09
> **Predecessors:**
> - `change_requests/impact_analysis/POS2_002_ORDER_FROM_WEB_PIPELINE_CR_IMPACT_ANALYSIS_2026_05_07.md` Phase 2 §5
> - `change_requests/impact_analysis/DELIVERY_CHARGE_EDITABILITY_BUSINESS_RULE_INVESTIGATION_2026_05_07.md` (canonical-axis gap recommendation)
> - `change_requests/implementation_summaries/POS2_002_PHASE_1_ORDER_FROM_MAPPING_IMPLEMENTATION_SUMMARY_2026_05_09.md` (Phase 1 — `isWebOrder` field source)
> - `change_requests/sprint_consolidation/POS2_0_OWNER_DECISIONS_AMENDMENT_2026_05_09.md` Decision 4 (BE field echo confirmed)
> - User locked-spec message 2026-05-09 (3 owner rules, verbatim)

---

## 1. Owner-locked rules (verbatim 2026-05-09)

| # | Rule | Implementation |
|---|---|---|
| 1 | Use **frozen `initialDeliveryCharge`** from the incoming/persisted order at panel open | Predicate reads the **prop** (set once at mount), never the live `deliveryChargeInput` state |
| 2 | **Do not dynamically re-lock** while cashier is typing | Automatic — predicate bound to frozen prop, not live state |
| 3 | Cashier can input delivery charge **only if frozen value is zero** | `isWebOrder && initialDeliveryCharge > 0` → locked; `isWebOrder && initialDeliveryCharge === 0` → editable |

The new web-layer is **layered on top** of the existing CR-008 D1-Gate `isPrepaid` lock (additive, not replacement) — owner-confirmed in chat.

---

## 2. Final predicate

```js
readOnly = isPrepaid || (isWebOrder && initialDeliveryCharge > 0)
```

| Source | Layer | Protects against |
|---|---|---|
| CR-008 D1-Gate (existing, untouched) | `isPrepaid` | Cashier overwriting components when money is already in the bank (any channel) |
| **POS2-002 Phase 2 (new)** | `isWebOrder && initialDeliveryCharge > 0` | Cashier overwriting customer's web-entered delivery value |

Layers OR-combined — either condition locks the field. Behaviour matrix:

| Scenario | `isPrepaid` | `isWebOrder` | DC at panel open | Lock? |
|---|---|---|---|---|
| In-store POS, postpaid | NO | NO | any | editable |
| In-store POS, prepaid | YES | NO | any | locked (existing) |
| Web order, paid online | YES | YES | any | locked (both layers) |
| **Web order, pay-at-counter, DC>0** | NO | YES | 80 | **locked (new — Phase 2 fix)** |
| Web order, pay-at-counter, DC=0 | NO | YES | 0 | editable (owner rule 3) |

---

## 3. Files changed

| # | File | Change | LOC |
|---|---|---|---:|
| 1 | `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | (a) Added `isWebOrder = false` prop with comment block (~13 LOC). (b) Updated `readOnly` predicate at L917 to OR-combine the new layer. (c) Extended tooltip at L918-924 with the web-lock branch. (d) Extended className at L925 to mirror the new branch. (e) Added a Phase-2 comment block above the input. | +28 / -7 |
| 2 | `frontend/src/components/order-entry/OrderEntry.jsx` | Added `isWebOrder={orderData?.isWebOrder \|\| effectiveTable?.isWebOrder \|\| false}` prop on the `<CollectPaymentPanel>` call site at L1190+ with comment block. | +10 / -0 |
| 3 | `frontend/src/__tests__/components/order-entry/CollectPaymentPanel.deliveryLock.test.jsx` (NEW) | 28 cases across 5 describe blocks | +213 |

**Files NOT touched:**
- `orderTransform.js` (Phase 1 already shipped the `isWebOrder` field — Phase 2 just consumes it)
- `socketHandlers.js`, `RestaurantContext.jsx`, `profileTransform.js`
- `OrderCard.jsx`, `TableCard.jsx`, `Header.jsx`, `DashboardPage.jsx` (Phase 3 surfaces)
- Any other report / dashboard / cart / KOT / print component
- `/app/memory/final/*`

---

## 4. Exact diffs (essence)

### 4.1 `CollectPaymentPanel.jsx` — prop addition (after `isPrepaid`)

```diff
   isPrepaid = false,
+  // POS2-002 Phase 2 (May-2026): web-channel axis for the delivery-charge
+  // lock. Layered ON TOP OF `isPrepaid` (additive, not replacement). [...]
+  isWebOrder = false,
```

### 4.2 `CollectPaymentPanel.jsx` — predicate update at L917+

```diff
- readOnly={isPrepaid}
+ readOnly={isPrepaid || (isWebOrder && initialDeliveryCharge > 0)}

  title={
    isPrepaid
      ? (initialDeliveryCharge > 0
          ? 'Delivery charge already collected from customer — not editable'
          : 'Order is prepaid — delivery charge cannot be modified')
-     : 'Enter or edit delivery charge'
+     : (isWebOrder && initialDeliveryCharge > 0
+         ? 'Delivery charge captured from web order — not editable'
+         : 'Enter or edit delivery charge')
  }
- className={`... ${isPrepaid ? 'bg-gray-100 cursor-not-allowed' : ''}`}
+ className={`... ${(isPrepaid || (isWebOrder && initialDeliveryCharge > 0)) ? 'bg-gray-100 cursor-not-allowed' : ''}`}
```

### 4.3 `OrderEntry.jsx` — call-site prop

```diff
   isPrepaid={isPrepaid}
+  isWebOrder={orderData?.isWebOrder || effectiveTable?.isWebOrder || false}
```

`isWebOrder` is sourced from Phase 1's transform output. Both `orderData` (active placed order) and `effectiveTable` (re-engaged order) flow through `orderTransform.fromAPI.order`, so both expose the new field. Fallback to `false` keeps fresh dineIn / takeaway / non-web orders editable.

---

## 5. Test plan & results

### 5.1 New test file — `CollectPaymentPanel.deliveryLock.test.jsx`

28 cases across 5 describe blocks:

| Block | Cases | Coverage |
|---|---:|---|
| §1 Predicate quadrants (pure-function) | 9 | All 8 isPrepaid×isWebOrder×DC combinations + defaults |
| §2 Frozen-snapshot — typing does not re-lock (RTL render) | 4 | Locked stays locked through typing; editable stays editable through typing; non-web baseline; prepaid tooltip |
| §3 Tooltip differentiation by lock branch | 6 | isPrepaid wins over web layer; web-only tooltip differs from prepaid tooltip; editable variants |
| §4 Locked-state CSS class | 6 (`test.each`) | `bg-gray-100` + `cursor-not-allowed` toggle correctly across the 6 representative input combinations |
| §5 Default-prop safety | 3 | undefined `isWebOrder` defaults to false; undefined `initialDeliveryCharge` defaults to 0; all-undefined → editable |
| **Total** | **28** | |

### 5.2 Validation

| Gate | Command | Result |
|---|---|---|
| Phase 2 targeted suite | `yarn test --testPathPattern='CollectPaymentPanel.deliveryLock'` | **28/28 pass** ✅ |
| Full unit suite | `yarn test --watchAll=false` | **26/26 suites · 353/353 tests pass** ✅ |
| Production build | `yarn build` | `Compiled successfully` in 25.46s ✅ |
| Bundle size | (vs pre-Phase-2 ≈ 434 kB) | ~434 kB (no measurable delta) ✅ |
| Lint | (auto with build) | no warnings ✅ |
| `/app/memory/final/*` integrity | `git status app/memory/final/` (no edits) | untouched ✅ |

### 5.3 Coverage matrix vs locked spec

| Locked rule | Test covering | Pass |
|---|---|---|
| Rule 1 — frozen `initialDeliveryCharge` | §2 case 2 (typing freely; lock state never flips when DC=0) + §1 (predicate is bound to `initialDeliveryCharge` prop, not live state) | ✅ |
| Rule 2 — no dynamic re-lock while typing | §2 cases 1 + 2 (typing across multiple values; readOnly attribute never flips either direction) | ✅ |
| Rule 3 — input only when frozen DC=0 | §1 Q5 vs Q6 (web + non-prepaid: DC=0 editable, DC>0 locked) | ✅ |
| Layered on top of isPrepaid | §1 Q3, Q4, Q7, Q8 (isPrepaid lock preserved; both layers fire when both true) | ✅ |
| Non-web orders untouched | §1 Q1, Q2, Q3, Q4 + §2 case 3 + §3 case 5 | ✅ |
| Tooltip differentiated | §3 (6 cases for 3 distinct messages) | ✅ |
| CSS class consistency | §4 (6 parametric cases) | ✅ |
| Default-prop safety | §5 (3 cases — backwards-compatible with any caller that doesn't pass `isWebOrder`) | ✅ |

---

## 6. What Phase 2 does NOT change

- **In-store POS, postpaid, DC>0** — editable (CR-008 D1-Cap behaviour preserved). Cashiers can still correct typos / waive / add forgotten amounts on POS-punched delivery orders.
- **In-store POS, prepaid (Razorpay-at-counter)** — locked (CR-008 D1-Gate behaviour preserved). Money already collected; field stays locked.
- **Phase 1 transform** — no changes to `orderTransform.js`. Phase 2 is a pure consumer of the `isWebOrder` field Phase 1 added.
- **Reports / dashboard / KOT / print** — untouched. Phase 2 is leaf scope (no downstream phases gated on it).

---

## 7. What Phase 2 changes

The single behaviour change for end users:

> **Web order, postpaid (pay-at-counter), with customer-entered delivery charge at the panel open.**
> Today: editable (cashier can overwrite the customer's web-entered DC).
> After Phase 2: **locked** (customer's value protected; tooltip "Delivery charge captured from web order — not editable").

The web-prepaid case was already locked via the `isPrepaid` proxy and remains locked (now via two redundant layers). The web-postpaid case is the actual fix.

---

## 8. Live preprod sanity (optional, non-blocking)

When QA or owner runs the running app:

1. Place a Scan & Order test order from a tenant URL with **postpaid** (pay-at-counter) flow + a non-zero customer-entered delivery charge.
2. From POS, re-engage the order → click Collect Bill.
3. Observe the Delivery Charge field:
   - **Read-only** (gray background + not-allowed cursor)
   - **Tooltip**: "Delivery charge captured from web order — not editable"
4. Repeat with DC=0 on the customer-entered side → field should be **editable** with placeholder "0" and tooltip "Enter or edit delivery charge".
5. Repeat with an in-store POS-punched delivery order (any DC) → field stays editable per CR-008 D1-Cap.
6. Repeat with an in-store prepaid order → field stays locked per CR-008 D1-Gate (existing rule, not Phase 2).

---

## 9. Risk register

| ID | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | Cashier needs to override a web-locked DC due to genuine error (e.g. customer entered wrong amount) | By design | Owner-locked. No override planned. Future micro-CR (~10 LOC + permission gate) can add admin override if owner asks. |
| R2 | `isWebOrder` not threaded through every panel mount path | Mitigated | Default `false` keeps existing behaviour for any caller that doesn't pass the prop. `OrderEntry.jsx` is the only mount path; verified. |
| R3 | Live-state vs frozen-prop confusion in future refactors | Low | Comment block at L917+ explicitly documents the frozen-snapshot requirement. §2 tests freeze the contract. |
| R4 | `orderData?.isWebOrder` falsy when payload arrives async (race) | Low | Default `false` falls back gracefully; predicate becomes editable. When the async payload lands, React re-renders with `true` and predicate re-evaluates correctly. No mid-edit flip because `initialDeliveryCharge` doesn't change in that race. |
| R5 | Web order with DC>0 but cashier needs to refund part of it | None for this scope | Refund flow is a different surface (refund / cancellation panel), not the delivery-charge input on the bill panel. |

---

## 10. Final verdict

> ## `implementation_complete_ready_for_QA`

- 2 source files + 1 new test file. ~+251 / -7 LOC.
- 28 new Phase-2 tests + 26/26 suites · 353/353 total tests pass.
- Production build clean; no bundle-size regression.
- All 3 owner-locked rules verified at unit-test level.
- Existing CR-008 D1-Gate (`isPrepaid`) and CR-008 D1-Cap (POS-postpaid editability) behaviour preserved.
- Phase 1 transform (`orderTransform.js`) untouched.
- `/app/memory/final/*` untouched.

### Next action items

- **Owner / QA — live preprod sanity:** §8 checklist when convenient. Non-blocking.
- **Phase 3** ready for UX session (OQ-3 — pill / toggle / both for the dashboard Source filter).
- **Phase 4** ready when OQ-5 (audio), OQ-12 (small viewport), and BE-Q-NEW-1 / BE-Q-NEW-2 close.

---

— End of POS2-002 Phase 2 Implementation Summary 2026-05-09 —
