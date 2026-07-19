# POS2-005-FU — Investigation: Status 8/9 Collect-Bill Logic + PG Filter Behavior

> **Sprint:** pos2.0
> **Item ID:** POS2-005-FU (follow-up to POS2-005)
> **Type:** Investigation only (no code change, no `/app/memory/final/*` edit)
> **Date:** 2026-05-09
> **Branch:** `9-may`
> **Final verdict:** **`POS2-005_plan_update_required`** (for §A — small predicate addition; §B — `behavior_as_expected` BUT cross-tab applicability needs owner confirmation, can be a tiny separate CR if owner wants Paid-tab-only)

---

## 1. Docs read

### 1.1 `/app/memory/final/`
- `FINAL_DOCS_APPROVAL_STATUS.md`, `MODULE_DECISIONS_FINAL.md`, `CHANGE_REQUEST_PLAYBOOK.md`, `IMPLEMENTATION_AGENT_RULES.md`

### 1.2 Overlay
- `BASELINE_RECONCILIATION_REPORT_2026_05_04.md`, `FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md`, `PENDING_TASK_REGISTER_2026_05_04.md`

### 1.3 CR chain
- `change_requests/impact_analysis/POS2_004_F_STATUS_8_HOLD_PAID_DASHBOARD_INVESTIGATION_2026_05_08.md` (incl. §16 source-correction addendum)
- `change_requests/impact_analysis/POS2_005_F_STATUS_8_HOLD_REROUTE_CR_IMPACT_ANALYSIS_2026_05_08.md` (incl. §18 OQ closures)
- `change_requests/implementation_handover/POS2_005_F_STATUS_8_HOLD_REROUTE_IMPLEMENTATION_HANDOVER_2026_05_08.md`
- `change_requests/implementation_summaries/POS2_005_F_STATUS_8_HOLD_REROUTE_IMPLEMENTATION_SUMMARY.md` (today)
- `change_requests/qa_reports/POS2_005_F_STATUS_8_HOLD_REROUTE_QA_REPORT.md` (today)
- `change_requests/CR_001_all_orders_status_derivation.md` (CS-23..CS-28 PG filter contract)
- `change_requests/CR_003_paid_hold_order_actions.md` (Collect Bill from Hold contract — CS-A1)
- `change_requests/CR_005_*` (B2-split — PG columns auto-reveal)

### 1.4 Code (read-only, post-POS2-005-edit baseline)
- `pages/AllOrdersReportPage.jsx` (filter pipeline lines 416-468; tab change reset lines 479-491)
- `components/reports/FilterBar.jsx` (PAYMENT_GATEWAY_OPTIONS lines 131-148; PG checkbox toggle lines 242-303)
- `components/reports/FilterTags.jsx` (PG chip rendering lines 33-40)
- `components/reports/OrderTable.jsx` (PG conditional columns lines 102-119; `isOrderEligibleForRowActions` lines 243-254; Hold-tab Collect button lines 280-303; existing amber "On Hold" badge `getStatusBadgeStyle` lines 60-95, 403-413)
- `api/services/reportService.js` (post-POS2-005 priority chain lines 660-727)
- `api/transforms/reportTransform.js` / `api/transforms/orderTransform.js` (`isPaymentGateway` derivation)

---

## §A. Collect Bill button + HOLD label logic

## 2. Current Collect Bill button logic (post-POS2-005 implementation)

The Hold-tab "Collect Bill" button is rendered by `components/reports/OrderTable.jsx` via two checkpoints:

### 2.1 Eligibility check — `isOrderEligibleForRowActions(order, tabId)` (`OrderTable.jsx:243-254`)

```js
const isOrderEligibleForRowActions = (order, tabId) => {
  if (!order || order._isMissing) return false;
  const orderIn = (order.orderIn || '').toUpperCase();
  if (orderIn === 'RM' || orderIn === 'SRM') return false;
  if ((order.paymentMethod || '').toUpperCase() === 'ROOM') return false;
  if (['zomato', 'swiggy'].includes((order.orderIn || '').toLowerCase())) return false;
  if (tabId === 'paid') {
    const pm = (order.paymentMethod || '').toLowerCase();
    if (!PAID_ACTIONS_ALLOWED_METHODS.includes(pm)) return false;
  }
  return true;
};
```

**Predicates the eligibility check uses:**
- `order._isMissing` (gap-detection placeholder rows)
- `order.orderIn` (RM / SRM / zomato / swiggy)
- `order.paymentMethod` (`'ROOM'`, and on Paid tab, must be cash/card/upi)

**Predicates the eligibility check does NOT use:**
- ❌ `order.fOrderStatus` (no check on 8 vs 9)
- ❌ `order.paymentType` (prepaid vs postpaid not checked)
- ❌ `order.paymentStatus`
- ❌ `order.isPaymentGateway` / razorpay_order_id

### 2.2 Render — Hold-tab branch (`OrderTable.jsx:280-303`)

```js
if (tabId === 'hold') {
  return (
    <button ...
      data-testid={`row-action-collect-bill-${order.id}`}
      title={isWithinMutationWindow ? 'Collect bill' : 'Only available for today and yesterday'}
    >
      <Receipt className="w-3.5 h-3.5" />
      <span>Collect</span>
    </button>
  );
}
```

The button renders unconditionally for any Hold-tab row that passes eligibility. The only run-time gate is the 2-day mutation window (`isWithinMutationWindow` — disables the button outside window, doesn't hide it).

---

## 3. Current behavior — `f_order_status = 8`

Post-POS2-005 implementation, a status-8 row in `getOrderLogsReport` payload now lands on `status = 'hold'` (per priority-chain widening at `reportService.js:683-693`). It surfaces in:

| Surface | Behavior | Source-of-truth |
|---|---|---|
| Audit Report → All Orders tab → Status column | Renders amber "On Hold" badge | `OrderTable.jsx:65 + 86 + 407-411` (`getStatusBadgeStyle('hold')`, `getStatusLabel('hold') = 'On Hold'`) |
| Audit Report → Hold tab membership | ✅ Included | `AllOrdersReportPage.jsx:84-88` (`TAB_FILTERS.hold` widened) |
| Audit Report → Hold tab → Collect Bill button | ✅ **Currently renders** (NOT what owner wants) | `OrderTable.jsx:243-254 + 280-303` — eligibility doesn't check fOrderStatus |
| Audit Report → Running tab | ❌ Excluded (correct per POS2-005 R2) | `AllOrdersReportPage.jsx:104` |
| Live Dashboard | ❌ Hidden (correct per POS2-005 R2) | Phase A socket guards + Phase B filters |
| Dashboard card HOLD pill | ✅ Renders if leaked | OrderCard.jsx:336, TableCard.jsx:244 |

**Mismatch with owner expectation:**
> Owner: "If `f_order_status = 8`: Collect Bill button should NOT come. HOLD label should show."
> Current: Collect Bill button DOES come (because eligibility doesn't gate on status-8). HOLD label shows ✅.

---

## 4. Current behavior — `f_order_status = 9`

| Surface | Behavior |
|---|---|
| Audit Report → All Orders tab → Status column | ✅ Amber "On Hold" badge (status === 'hold') |
| Audit Report → Hold tab membership | ✅ Included (`TAB_FILTERS.hold` rule was `fOrderStatus === 9 OR paylater` even before POS2-005) |
| Audit Report → Hold tab → Collect Bill button | ✅ **Currently renders** (matches owner intent) |
| Live Dashboard | ❌ Hidden (CR-001 has always classified status-9 as Hold) |

**Match with owner expectation:**
> Owner: "If `f_order_status = 9`: Collect Bill button SHOULD come. HOLD label should show."
> Current: Both ✅. No change needed.

---

## 5. HOLD label behavior for status 8 vs 9

Both surface the existing amber **"On Hold"** badge in the Status column of the Audit Report. The badge is keyed on the row's derived `status === 'hold'`, which after POS2-005 includes `{fStatus===9, fStatus===8, paylater}` symmetrically.

| Row | Audit "On Hold" badge | Dashboard HOLD pill |
|---|---|---|
| `fStatus === 8` | ✅ Renders | ✅ Renders defensively if card leaks (status-8 cards normally hidden) |
| `fStatus === 9` | ✅ Renders | ⚪ Not rendered (status-9 never reaches dashboard via standard flows) |
| `paymentMethod === 'paylater'` | ✅ Renders | ⚪ Not rendered |

**Net:** HOLD label is **consistent** across status-8 and status-9 in the Audit Report — both show the amber "On Hold" badge. Owner expectation matched.

The asymmetry the owner is concerned about is solely the **Collect Bill action button**, not the label.

---

## 6. Whether POS2-005 plan needs adjustment

> **YES — small adjustment required.** A 4-line predicate addition in `OrderTable.jsx` `isOrderEligibleForRowActions` to gate Collect Bill on `fOrderStatus !== 8` for the Hold tab.

### 6.1 Proposed change (NOT implemented in this investigation)

`components/reports/OrderTable.jsx:243-254`:
```js
const isOrderEligibleForRowActions = (order, tabId) => {
  if (!order || order._isMissing) return false;
  const orderIn = (order.orderIn || '').toUpperCase();
  if (orderIn === 'RM' || orderIn === 'SRM') return false;
  if ((order.paymentMethod || '').toUpperCase() === 'ROOM') return false;
  if (['zomato', 'swiggy'].includes((order.orderIn || '').toLowerCase())) return false;
  if (tabId === 'paid') {
    const pm = (order.paymentMethod || '').toLowerCase();
    if (!PAID_ACTIONS_ALLOWED_METHODS.includes(pm)) return false;
  }
  // POS2-005-FU: status-8 (Active/Unpaid Running, typically guest-prepaid via
  // PG/Razorpay) is Hold-classified for visibility but is NOT manually
  // collectable from the Hold tab. Money is in flight via the upstream payment
  // gateway; cashier intervention is via Audit / cancel / payment recovery
  // flow, not Collect Bill. status-9 (paylater) remains collectable.
  if (tabId === 'hold' && order.fOrderStatus === 8) return false;
  return true;
};
```

### 6.2 Net effect on POS2-005

| Surface | Before adjustment | After adjustment |
|---|---|---|
| `fStatus === 8` row in Hold tab → row visible | ✅ | ✅ (unchanged) |
| `fStatus === 8` row → "On Hold" badge | ✅ | ✅ (unchanged) |
| `fStatus === 8` row → Collect Bill button | ✅ rendered (wrong) | ❌ hidden (correct) |
| `fStatus === 9` row → Collect Bill button | ✅ rendered (correct) | ✅ rendered (unchanged) |
| `paylater` row → Collect Bill button | ✅ rendered (correct) | ✅ rendered (unchanged) |

### 6.3 Cross-impact recheck

| CR | Impact |
|---|---|
| **CR-001** (Hold tab membership) | None — `TAB_FILTERS.hold` predicate unchanged. |
| **CR-003** (Collect Bill from Hold — CS-A1) | Tightened — status-8 rows now excluded from the Collect Bill action surface. Status-9 / paylater unaffected. CR-003 OQ-A1/A2/A3 reaffirmed for status-9 / paylater only. |
| **CR-005** (PG columns auto-reveal — B2-split) | None — PG columns are independent of action eligibility. |
| **CR-007** (prepaid action gating) | Aligned — CR-007's defence-in-depth on prepaid orders complements POS2-005-FU's status-8 gate. The two gates are on different surfaces (CR-007 on dashboard / OrderEntry; POS2-005-FU on Audit Report Hold tab). |
| **POS2-005 main CR** | Plan §6 Phase D.4 is amended: in addition to "no edit needed" path, a **single-line addition to `isOrderEligibleForRowActions`** is now required. Updated test V11 to assert no Collect Bill button on status-8 Hold rows. |

### 6.4 Recommendation

**Bundle this 5-line addition into POS2-005 implementation BEFORE final acceptance.** Reasons:
1. It's the same scope (`f_order_status = 8` Hold/Audit reroute).
2. It's a single predicate addition in the same file family as Phase D.
3. It closes a known mismatch with owner intent before the CR is signed off.
4. Avoids opening a separate CR for a 5-line change.

Updated POS2-005 Phase D scope:
- D.1, D.2, D.3 (already done) — unchanged.
- **D.4 (revised)** — add `if (tabId === 'hold' && order.fOrderStatus === 8) return false;` to `OrderTable.jsx:isOrderEligibleForRowActions`.
- New test in V11 / V12 family: assert `data-testid="row-action-collect-bill-${id}"` does NOT render for status-8 rows in Hold tab.

---

## §B. PG (Payment Gateway) filter behavior

## 7. Current PG filter logic

The "PAYMENT GATEWAY · ☑ All · ☐ PG" toggle visible in the screenshot is a **2-checkbox tri-state** filter introduced under CR-001 CS-23..CS-28 + Phase 2 (Q-B = a). Located in `components/reports/FilterBar.jsx:242-303`.

### 7.1 Internal state machine (`FilterBar.jsx:131-148`)

```js
export const PAYMENT_GATEWAY_OPTIONS = [
  { value: null, label: 'All' },
  { value: 'gateway', label: 'PG' },
];
```

| Filter state | Meaning |
|---|---|
| `filters.paymentGateway === null` | "All" — no narrowing applied |
| `filters.paymentGateway === 'gateway'` | "PG" — only orders with `isPaymentGateway === true` (i.e., `razorpay_order_id` present) |

A retired third state `'nonGateway'` was removed in Phase 2 (per `FilterBar.jsx:131-141` comments).

### 7.2 Filter application (`AllOrdersReportPage.jsx:429-436`)

```js
// CR-001 CS-23..CS-28 + Phase 2 (Q-B = a): Payment Gateway filter is
// now a 2-checkbox toggle (☐ All  ☐ PG). Internal state values:
//   - null      → no narrowing (All mode)
//   - 'gateway' → narrow to orders carrying a `razorpay_order_id`
if (filters.paymentGateway === 'gateway') {
  result = result.filter(o => o.isPaymentGateway === true);
}
```

The PG filter is applied to the **`result` array BEFORE tab-specific filtering** (lines 350-415 build base `result`; line 434 narrows by PG; line 438 sets state; tab filter is applied later when the table renders by tab).

### 7.3 Side-effect — auto-revealing PG columns (`OrderTable.jsx:102-119`)

When `filters.paymentGateway === 'gateway'` is active:
- Adds `PG Order Id` and `PG Amount` columns to ALL tabs that render `OrderTable`.
- Adds `PG Status` column ONLY when at least one row in the result has `pgStatus != null` (per CR-005 #1 / B2-split — backend-shipping-conditional auto-reveal).

### 7.4 Tab-change reset (`AllOrdersReportPage.jsx:479-491`)

```js
const handleTabChange = (tabId) => {
  setActiveTab(tabId);
  // Reset filters when tab changes
  setFilters({
    status: null,
    paymentMethod: null,
    paymentType: null,
    channel: null,
    platform: null,
    paymentGateway: null,
  });
};
```

→ The PG filter resets to `null` (All) on every tab switch.

---

## 8. Whether PG filter works only on the Paid tab

> **NO.** The PG filter applies to **ALL tabs** of the Audit Report, not just Paid.

### 8.1 Code-walk evidence

`AllOrdersReportPage.jsx:434-436`:
```js
if (filters.paymentGateway === 'gateway') {
  result = result.filter(o => o.isPaymentGateway === true);
}
```

This filter runs on `result` BEFORE `TAB_FILTERS[activeTab]` is applied to the rendered rows. Therefore:

| Tab | PG-filter applies? | Effect when `paymentGateway === 'gateway'` |
|---|---|---|
| All Orders | ✅ Yes | Shows only PG-paid rows across all categories |
| Paid | ✅ Yes | Shows only PG-paid rows that landed on `status === 'paid'` |
| Cancelled | ✅ Yes | Shows only PG-paid rows that were later cancelled |
| Added to Credit (TAB) | ✅ Yes | Shows only PG-paid TAB rows (likely empty in practice — TAB and PG are usually mutually exclusive) |
| **On Hold** | ✅ Yes | Shows only PG-paid Hold rows. **POS2-005-relevant:** a status-8 prepaid order has `isPaymentGateway === true` (Razorpay scan flow) so it WILL appear when PG is checked, AND will be filtered OUT when "All" is checked **only because no other narrowing applies** — wait, "All" means no narrowing, so it shows anyway. Re-read: when "All" is selected (`paymentGateway === null`), the filter is a no-op → all rows shown including PG. When "PG" is selected, only PG rows shown. |
| Merged | ✅ Yes | Shows only PG-paid merged rows |
| Running | ✅ Yes | Shows only PG-paid running rows (rare) |
| Aggregator | ✅ Yes | Shows only PG-paid zomato/swiggy rows |
| Audit | ✅ Yes | Shows only PG-paid anomalous rows |

### 8.2 Is this intentional?

**YES — intentional per CR-001 CS-23..CS-28 + Phase 2 Q-B = a.** The PG filter is a **page-level cross-cut** that surfaces gateway-paid orders across all categorizations. The PG columns auto-reveal in any tab (CR-005 B2-split) so the operator can audit gateway flows regardless of where the order ended up (paid normally, cancelled, on hold, etc.).

### 8.3 What "All" means

When the user clicks **"All"** (the default state, screenshot), `filters.paymentGateway === null` → **no PG narrowing applied** → all rows shown regardless of PG status. This is the documented default per `AllOrdersReportPage.jsx:175 + 489 + 508` (initial state, tab-change reset, clear-filters reset).

### 8.4 What "PG" means

When the user clicks **"PG"**, `filters.paymentGateway === 'gateway'` → narrow to rows where `isPaymentGateway === true` → in the Audit Report, this surfaces ONLY orders that flowed through Razorpay (or any PG that populates `razorpay_order_id`).

Combined with POS2-005, this is operationally relevant: a status-8 prepaid order created via QR scan SHOULD have `isPaymentGateway === true`. So in the Hold tab, clicking "PG" would narrow to status-8 + `paylater + isPG (rare)` rows — useful for owner to audit guest-prepaid flow specifically.

---

## 9. Whether PG filter issue is related to POS2-005 or separate

> **Separate concern, but currently `behavior_as_expected` per CR-001 + CR-005.**

| Question | Answer |
|---|---|
| Is the PG filter currently broken? | **No** — works as documented in CR-001 CS-23..CS-28 + Phase 2 Q-B + CR-005 #1 B2-split. Cross-tab applicability is by design. |
| Is the PG filter **only** on the Paid tab? | **No** — applies to all 9 tabs. |
| Does this conflict with POS2-005? | **No** — POS2-005's Hold/Audit reroute is independent of the PG filter. The two compose cleanly: PG filter narrows by `isPaymentGateway`, tab filter narrows by status classification, then `OrderTable` renders. |
| Is there a current bug? | **None observed in code-walk.** The default state is "All" (checked) on every tab switch, and clicking "PG" narrows the visible set. The toggle is a Phase-2 simplification of an earlier tri-state pill that owner UAT confirmed. |
| Is owner expecting different behavior? | **Owner has not described a defect** — only asked to investigate scope. If owner expects PG to be Paid-tab-only (i.e., hide the toggle on Hold/Running/Audit tabs), that's a **new design decision** not a regression. Could be a tiny separate CR to scope the toggle to Paid tab only. |

### 9.1 If owner wants PG filter Paid-tab-only (hypothetical)

This would be a small follow-up CR (NOT POS2-005-FU scope). Implementation would be:

`components/reports/FilterBar.jsx`:
```js
{activeTab === 'paid' && hasPaymentGatewayData && (
  <div data-testid="filter-payment-gateway" ...>
    {/* PG checkbox toggle */}
  </div>
)}
```

Plus reset logic on tab change to clear `filters.paymentGateway` whenever leaving the Paid tab. **Out of scope for this investigation; flagged for owner decision only.**

---

## 10. Recommendation

| Concern | Recommendation | Action owner |
|---|---|---|
| **§A** — Collect Bill button on status-8 Hold row | **POS2-005 plan update required.** Add 1-line predicate (`if (tabId === 'hold' && order.fOrderStatus === 8) return false;`) to `OrderTable.jsx:isOrderEligibleForRowActions`. Bundle into POS2-005 before final acceptance. Add new validation V21 to QA report. | Implementation Agent (next pass) |
| **§A** — HOLD label for status 8 vs 9 | **Behavior as expected** — both show amber "On Hold" badge consistently after POS2-005 priority-chain widening. No change required. | None |
| **§B** — PG filter cross-tab applicability | **Behavior as expected** per CR-001 + CR-005. Not a regression. Document in this investigation. **If owner wants PG toggle scoped to Paid tab only, open a separate small CR (POS2-006-PG-PAID-ONLY).** Not bundled into POS2-005. | Owner decision |

---

## 11. Final verdict

> ## **`POS2-005_plan_update_required`**

- **§A (Collect Bill on status-8):** POS2-005 implementation needs a single-line predicate addition before sign-off. 5-minute fix; no architecture impact; no cross-CR risk.
- **§B (PG filter):** **`behavior_as_expected`** per CR-001 + CR-005. Cross-tab applicability is by design. No POS2-005 entanglement. If owner wants Paid-tab-only scope, open a separate small CR.

**Recommended next step:** Apply the 1-line `OrderTable.jsx` change as part of POS2-005 final pass (Phase D.4 amendment), update QA report with V21, retest. Then sign off POS2-005.

— End of POS2-005-FU Investigation 2026-05-09 —
