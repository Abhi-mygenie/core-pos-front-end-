# CR-018 — Impact Analysis (Gate 2)

**Status:** COMPLETE
**Date:** 2026-06-09
**CR:** CR-018 — Schedule Order (Place orders for future date/time)
**Priority:** P1
**Sprint:** POS 4.0
**Depends on:** Gate 1 Intake (COMPLETE)

---

## 1. Executive Summary

CR-018 adds "Schedule Order" capability — cashier places an order for a future date/time. The **payload change is trivial** (4 hardcoded lines → 4 option-driven lines in `orderTransform.js`). The **UI change is moderate** (checkbox + date/time picker in CartPanel). The **dashboard display is high-impact** — it requires a new field in the canonical `fromAPI.order` transform, new badge rendering in OrderCard, a filter guard in ScanOrderPopOut, and potentially a new Status View column. **One P0 blocker** exists: the backend running-orders API does not return scheduled orders.

**Risk Rating: MEDIUM-HIGH** (due to backend blocker + multi-file dashboard change)

---

## 2. Blast Radius — File-by-File Analysis

### 2.1 `orderTransform.js` (1930 lines) — PAYLOAD LAYER

**Current state:**
- Line 901: `scheduled: 0,` (Flow 1: `placeOrder`)
- Line 902: `schedule_at: null,` (Flow 1: `placeOrder`)
- Line 1158: `scheduled: 0,` (Flow 3: `placeOrderWithPayment`)
- Line 1159: `schedule_at: null,` (Flow 3: `placeOrderWithPayment`)

**Change:** Replace hardcoded values with `options.scheduled ? 1 : 0` and `options.scheduleAt || null`.

**Flows affected:**
| Flow | Function | Lines | Impact |
|---|---|---|---|
| Flow 1 | `placeOrder` (L858) | 901-902 | ✅ Must change — unpaid scheduled order |
| Flow 2 | `updateOrder` (L969) | N/A | ⚠️ Does NOT have `scheduled`/`schedule_at` fields. Decision #6 says "cannot edit scheduled time" — so no change needed. But **RISK**: if someone updates a scheduled order (adds items), the `updateOrder` payload does NOT echo the `scheduled` flag. Backend may or may not require it on update. |
| Flow 3 | `placeOrderWithPayment` (L1086) | 1158-1159 | ✅ Must change — prepaid scheduled order |
| Flow 4 | `collectBillExisting` (L1242) | N/A | No `scheduled`/`schedule_at` fields. This is collect-bill on an already-placed order — scheduling happens at place time. No change needed. |

**`fromAPI.order` transform (L163-380):**
- **CRITICAL GAP:** Does NOT parse `scheduled` or `schedule_at` from backend response.
- The canonical order object returned by `fromAPI.order()` has ~50 fields but no scheduling fields.
- Every consumer (DashboardPage, OrderCard, TableCard, socket handlers, reports) reads from this transform.
- **Must add:**
  ```js
  scheduled: api.scheduled === 1 || api.scheduled === '1',
  scheduleAt: api.schedule_at || null,
  ```
- **Risk:** If backend running-orders API starts returning these fields, they will be silently dropped until this change lands. If it doesn't return them, the fields default to `false`/`null` — no regression.

**Options destructuring (L859, L1087):**
- Flow 1 `placeOrder` options: `{ restaurantId, orderNotes, printAllKOT, userId, addressId, deliveryAddress, serviceChargePercentage, deliveryCharge, serviceChargeTaxPct, deliveryChargeGstPct, printerAgents, roundOffEnabled }`
- Flow 3 `placeOrderWithPayment` options: `{ restaurantId, orderNotes, printAllKOT, userId, addressId, deliveryAddress, serviceChargePercentage, autoBill, serviceChargeTaxPct, deliveryChargeGstPct, printerAgents, roundOffEnabled }`
- **Must add `scheduled` and `scheduleAt` to both destructuring patterns.**

**Confidence: HIGH** — additive change, zero regression risk on existing flows.

---

### 2.2 `OrderEntry.jsx` (2602 lines) — STATE & FLOW ORCHESTRATION

**Current state:** No scheduling state or logic.

**Changes needed:**
1. **New state:** `const [isScheduled, setIsScheduled] = useState(false);` and `const [scheduleAt, setScheduleAt] = useState(null);`
2. **Thread to CartPanel props** (at L2252-2320): add `isScheduled`, `setIsScheduled`, `scheduleAt`, `setScheduleAt`
3. **Thread to placeOrder options** — 3 call sites:
   - **Scenario 2 unpaid** (L968-984): add `scheduled: isScheduled, scheduleAt` to options object
   - **Scenario 2 prepaid** (L1850-1862): add `scheduled: isScheduled, scheduleAt` to options object
   - **QSR Place+Pay** (L1204-1218): add `scheduled: isScheduled, scheduleAt` to options object
4. **Order type gating:** Per Decision #2, scheduling only for Dine-In + TakeAway + Walk-In. Must reset `isScheduled`/`scheduleAt` when `orderType` changes to `delivery`.
5. **Re-engage / edit path:** When opening an existing order (`orderData` prop), if it was scheduled, should the schedule state be pre-populated? Decision #6 says "cannot edit scheduled time" — so the UI should show the schedule as **read-only** on re-engage but not allow changing it.

**Risks:**
- **R1 (MEDIUM):** 3 separate placeOrder call sites must all get the schedule options. Missing one = silent 0/null (no crash, but schedule lost on that flow).
- **R2 (LOW):** Re-engage path — if an existing scheduled order is opened for item edit (update-order), the scheduling state must display but not be editable. Requires reading `orderData.scheduled` / `orderData.scheduleAt` — which in turn requires the `fromAPI.order` change in §2.1.
- **R3 (LOW):** Walk-In table name + schedule interaction. Walk-In uses `walkInTableName` state. Scheduling a Walk-In is allowed. No conflict, but test coverage needed.

**Confidence: HIGH** — pattern matches existing prop-threading (deliveryCharge, printAllKOT, printerAgents all followed same path).

---

### 2.3 `CartPanel.jsx` (1396 lines) — UI LAYER

**Current state:** KOT/Bill checkboxes at L1182-1193 (inside `KotBillCheckboxes` component from `RePrintButton.jsx`). Bottom action buttons at L1320-1389 (Place Order + Collect Bill).

**Changes needed:**
1. **New props:** `isScheduled`, `setIsScheduled`, `scheduleAt`, `setScheduleAt`, `orderType` (already passed)
2. **Schedule checkbox row:** Insert after KOT/Bill checkboxes (L1193) or alongside them. Per Decision #10: "Checkbox next to KOT/Bill + expandable date/time row below (Option A)".
3. **Date/time picker:** Expandable row below the checkbox. 15-min interval dropdown. Min: 15 min from now. Max: 1 month.
4. **Order type gating:** Checkbox only visible for `dineIn`, `takeAway`, `walkIn`. Hidden for `delivery` and room orders.
5. **QSR mode:** Per Out of Scope, QSR scheduling deferred. If `qsrMode=true`, hide schedule checkbox.

**Insertion point:** L1182-1193 is the KOT/Bill checkbox block:
```jsx
{!qsrMode && cartItems.some(i => !i.placed) && (
  <div className="px-4 py-3" style={{ borderTop: ... }}>
    <KotBillCheckboxes ... />
  </div>
)}
```
Schedule checkbox goes inside the same `<div>` or as a sibling below it.

**Risks:**
- **R4 (MEDIUM):** CartPanel is 1396 lines with complex conditional rendering. Adding a new section between KOT/Bill and the action buttons requires careful placement to avoid disrupting the existing layout.
- **R5 (LOW):** The date/time picker needs a dependency. Options: native `<input type="datetime-local">` (simplest), or use existing `react-day-picker` (already in package.json for `Calendar` component) + custom time select. Using native HTML avoids new dependencies.
- **R6 (LOW):** 15-minute interval enforcement — must round/snap time to nearest 15-min slot. Need utility function.

**Confidence: MEDIUM** — UI work is always more risk than pure data plumbing. Needs careful testing across all order types.

---

### 2.4 `OrderCard.jsx` (1070 lines) — BADGE DISPLAY

**Current state:** Badges at L439-450:
- PAID badge (L441): `order.paymentType === 'prepaid'`
- HOLD badge (L449): `order.fOrderStatus === 8`
- No scheduled badge.

**Changes needed:**
1. **Scheduled badge:** Display when `order.scheduled === true` (from `fromAPI.order`).
2. **Badge content:** Show "Scheduled" + date/time (e.g., "Scheduled · Jun 10, 4:00 PM").
3. **Badge styling:** Distinct color — blue or purple (not green/orange/red, all taken).
4. **Placement:** Same badge row as PAID/HOLD (L439-450 area).

**Dependencies:** Requires `fromAPI.order` to parse `scheduled`/`scheduleAt` (§2.1).

**Risks:**
- **R7 (LOW):** Badge spacing — adding a third possible badge alongside PAID/HOLD may overflow on narrow cards. Need `flex-wrap` or truncation strategy.
- **R8 (LOW):** `fOrderStatus` is 7 for scheduled orders (same as YTC). The badge is the ONLY visual differentiator. If the `scheduled` field is missing from API response, there's no fallback.

**Confidence: HIGH**

---

### 2.5 `ScanOrderPopOut.jsx` (649 lines) — EXCLUSION GUARD

**Current state:** Predicate at L56-57:
```js
export const isUnconfirmedScanOrder = (order) =>
  Boolean(order) && order.fOrderStatus === 7;
```
This catches ALL `fOrderStatus === 7` orders. Scheduled orders also have `fOrderStatus === 7`.

**CRITICAL RISK (R9 — HIGH):**
Per Decision #7: scheduled orders must NOT appear in ScanOrderPopOut. But scheduled orders have `fOrderStatus === 7` (same as web YTC orders). Without a guard, **scheduled POS orders would appear in the web-order pop-out**.

**Fix:** Amend predicate:
```js
export const isUnconfirmedScanOrder = (order) =>
  Boolean(order) && order.fOrderStatus === 7 && !order.scheduled;
```

**Dependencies:** Requires `fromAPI.order` to parse `scheduled` (§2.1). Without it, `order.scheduled` is undefined → `!undefined === true` → no regression (filter still works for non-scheduled orders). But scheduled orders would slip through until the field is parsed.

**Confidence: HIGH** — one-line change, well-isolated predicate.

---

### 2.6 `constants.js` — STATUS_COLUMNS (L198-210)

**Current state:** STATUS_COLUMNS defines the Status View columns:
```js
export const STATUS_COLUMNS = [
  { id: 7, fOrderStatus: 7, name: 'Yet to Confirm', key: 'pending' },
  { id: 1, fOrderStatus: 1, name: 'Preparing', key: 'preparing' },
  { id: 2, fOrderStatus: 2, name: 'Ready', key: 'ready' },
  { id: 5, fOrderStatus: 5, name: 'Served', key: 'served' },
  { id: 9, fOrderStatus: 9, name: 'Pending Payment', key: 'pendingPayment' },
  { id: 6, fOrderStatus: 6, name: 'Paid', key: 'paid' },
  { id: 3, fOrderStatus: 3, name: 'Cancelled', key: 'cancelled' },
  { id: 10, fOrderStatus: 10, name: 'Reserved', key: 'reserved' },
];
```

**Problem:** Scheduled orders have `fOrderStatus === 7` (same as YTC). They would land in "Yet to Confirm" column. Per Decision #7: "Own column in Status View for Scheduled + Reserved."

**Options:**
- **Option A:** Add a virtual column `{ id: 'scheduled', name: 'Scheduled', key: 'scheduled' }` that filters by `order.scheduled === true` instead of by `fOrderStatus`. Requires changing `DashboardPage.jsx` L982-999 which currently groups by `fOrderStatus` only.
- **Option B:** Keep scheduled orders in the existing `fOrderStatus: 7` column but visually differentiate with the badge. Simpler. Contradicts Decision #7.
- **Option C:** Add `fOrderStatus: 10` (Reserved) to include scheduled dine-in orders (Decision #13 says "scheduled dine-in = table reservation"). But non-dine-in scheduled orders don't map to 10.

**RISK (R10 — HIGH):** The Status View grouping at DashboardPage L982-999 uses `fOrderStatus` as the sole discriminator. A "Scheduled" column requires a secondary filter (`order.scheduled`), which is a pattern change. The existing code:
```js
items: allOrders.filter(o => o.fOrderStatus === col.fOrderStatus && o.fOrderStatus !== 8)
```
...has no concept of a non-fOrderStatus-based column.

**Recommendation:** Defer the dedicated "Scheduled" column to a follow-up. For Phase 1, keep scheduled orders in their natural fOrderStatus column (7 for YTC) with the "Scheduled" badge as the visual differentiator. This avoids a risky architecture change in the dashboard grouping logic. The existing `tableFilter === 'schedule'` code at DashboardPage L1109 already has a hook for this — it filters by `item.status === 'scheduled'`, which can be activated once `fromAPI.order` provides the field.

**Confidence: MEDIUM** — the dedicated column is architecturally complex; the badge-only approach is safe.

---

### 2.7 `DashboardPage.jsx` (1985 lines) — TABLE FILTER

**Current state:** L381: `const [tableFilter, setTableFilter] = useState(null);`
L1109: `if (tableFilter === 'schedule') return gridItems.filter(item => item.status === 'scheduled');`

**Finding:** The schedule filter ALREADY EXISTS in code but is dormant because:
1. No order ever has `status === 'scheduled'` (the field doesn't exist in `fromAPI.order`)
2. The filter button trigger is passed to Header but Header.jsx doesn't render a "Schedule" tab (grep returned no results for "schedule" in Header.jsx)

**Changes needed:**
1. In the filter at L1109, change `item.status === 'scheduled'` to `item.scheduled === true` (after `fromAPI.order` is updated).
2. Activate the schedule tab button in Header.jsx (or wherever the filter tabs are rendered).

**Risks:**
- **R11 (MEDIUM):** The existing filter code checks `item.status === 'scheduled'` but `status` is derived from `fOrderStatus` via `mapOrderStatus()`. There is no `fOrderStatus` that maps to `'scheduled'`. This is a naming mismatch — needs to use the `scheduled` boolean instead.

**Confidence: HIGH** — the infrastructure is already partially built.

---

### 2.8 `Header.jsx` (680 lines) — FILTER TAB UI

**Current state:** Receives `tableFilter` and `setTableFilter` props (L42-43). No schedule tab rendered (no "schedule" or "Schedule" string found).

**Changes needed:** Add a "Scheduled" filter tab/chip next to the existing confirm filter. Only visible when there are scheduled orders (count > 0).

**Risk: LOW** — additive UI change.

---

### 2.9 Socket Handlers (`socketHandlers.js`) — ORDER INGESTION

**Current state:** All socket events (`new-order`, `scan-new-order`, `update-order`, etc.) run through `orderFromAPI.order()` to transform incoming orders.

**Impact:** Once `fromAPI.order` is updated (§2.1), socket-delivered orders will automatically carry `scheduled`/`scheduleAt`. No socket handler changes needed.

**Risk: LOW** — transparent propagation through existing transform.

---

### 2.10 `RePrintButton.jsx` — KotBillCheckboxes Component

**Current state:** Exports `KotBillCheckboxes` (L145) with `printAllKOT`/`printAllBill` props.

**Changes needed:** None directly. The schedule checkbox is a new component placed alongside `KotBillCheckboxes`, not inside it. Unless the design calls for integrating it into the same component.

**Risk: LOW**

---

## 3. Cross-File Dependency Chain

```
OrderEntry.jsx (state owner)
    ├─→ CartPanel.jsx (UI: checkbox + picker)
    │       └─→ [new] ScheduleCheckbox + DateTimePicker
    ├─→ orderTransform.js (payload: placeOrder + placeOrderWithPayment)
    └─→ [reads] fromAPI.order (re-engage path: orderData.scheduled)

fromAPI.order (orderTransform.js L163)
    ├─→ socketHandlers.js (new-order, scan-new-order, update-order)
    ├─→ DashboardPage.jsx (column grouping, table filter)
    ├─→ OrderCard.jsx (scheduled badge)
    ├─→ ScanOrderPopOut.jsx (exclusion guard)
    └─→ TableCard.jsx (table status — potential "scheduled" display)
```

---

## 4. Risk Register

| ID | Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|---|
| **R0** | **BACKEND BLOCKER: Running orders API does not return scheduled orders.** Dashboard will never show them. | **P0 BLOCKER** | **CERTAIN** | Backend escalation filed. FE work can proceed (payload + UI) but dashboard display is blocked. |
| **R1** | 3 separate placeOrder call sites in OrderEntry must all get schedule options | MEDIUM | LOW | Grep-verify all `placeOrder`/`placeOrderWithPayment` calls. |
| **R2** | Re-engage existing scheduled order — read-only schedule display | LOW | MEDIUM | Requires `fromAPI.order` change first. |
| **R3** | Walk-In + schedule interaction | LOW | LOW | Functional — no conflict. Just needs test. |
| **R4** | CartPanel layout disruption from new section | MEDIUM | LOW | Insert carefully in KOT/Bill block. Visual test. |
| **R5** | Date/time picker dependency choice | LOW | LOW | Use native `<input type="datetime-local">` + time-slot snapping. |
| **R6** | 15-minute interval enforcement | LOW | LOW | Utility function to round to nearest 15 min. |
| **R7** | Badge overflow on narrow OrderCard | LOW | LOW | Use `flex-wrap` or limit to 2 badges visible. |
| **R8** | No fallback if `scheduled` field missing from API | LOW | MEDIUM | Badge simply won't render — graceful degradation. |
| **R9** | **Scheduled POS orders appearing in ScanOrderPopOut** (fOrderStatus 7 collision) | **HIGH** | **HIGH** | One-line fix: add `&& !order.scheduled` to predicate. Must ship with CR. |
| **R10** | Status View "Scheduled" column requires architecture change in dashboard grouping | HIGH | HIGH | **Defer dedicated column. Use badge-only for Phase 1.** |
| **R11** | Existing filter code uses `item.status === 'scheduled'` but status derives from fOrderStatus (no 'scheduled' mapping) | MEDIUM | CERTAIN | Change to `item.scheduled === true`. |
| **R12** | `updateOrder` (Flow 2) does not carry `scheduled`/`schedule_at` — backend may reject or clear the flag on item-add | MEDIUM | UNKNOWN | Test: place scheduled order → add item → verify `scheduled` flag survives. If backend clears it, need to add to updateOrder payload too. |
| **R13** | QSR mode + scheduling interaction | LOW | LOW | QSR scheduling out of scope per intake. Hide checkbox in QSR mode. |

---

## 5. Blockers Summary

| # | Blocker | Type | Owner | Status |
|---|---|---|---|---|
| **B1** | Running orders API does not return scheduled orders | **P0 BACKEND** | Backend team | ❌ Escalation filed, no response |
| **B2** | `scheduled` field presence on running orders response unknown | **P1 BACKEND** | Backend team | ❓ Depends on B1 fix |
| **B3** | `updateOrder` backend behavior when adding items to a scheduled order — does it preserve `scheduled` flag? | **P2 BACKEND** | Backend team | ❓ Untested |

---

## 6. What Can Ship Without Backend Fix

Even with B1 unresolved, the following can be built and tested:

| Component | Shippable? | Notes |
|---|---|---|
| Schedule checkbox + date/time picker in CartPanel | ✅ YES | UI-only, no backend dependency |
| Payload passthrough in orderTransform.js (Flows 1+3) | ✅ YES | Tested already (order 939593 saved correctly) |
| Options threading in OrderEntry.jsx | ✅ YES | Internal state plumbing |
| `fromAPI.order` scheduled/scheduleAt parsing | ✅ YES | Additive, no regression |
| ScanOrderPopOut exclusion guard | ✅ YES | Defense-in-depth (guards against future) |
| OrderCard scheduled badge | ⚠️ PARTIAL | Will render if order has `scheduled=1` in response, but running orders API doesn't return it yet |
| DashboardPage schedule filter | ⚠️ PARTIAL | Filter infrastructure works but no orders to filter |
| Status View "Scheduled" column | ❌ NO | Blocked on B1 + architecture concern (R10) |

**Recommendation:** Ship everything except the Status View column. When B1 is resolved, the badge + filter will activate automatically.

---

## 7. Files Changed Summary

| File | Change Type | Lines Changed (est.) | Risk |
|---|---|---|---|
| `orderTransform.js` | Modify — `fromAPI.order` + Flow 1 + Flow 3 | ~10 | LOW |
| `OrderEntry.jsx` | Modify — state + 3 call sites + CartPanel props | ~20 | MEDIUM |
| `CartPanel.jsx` | Modify — new props + schedule UI section | ~60 | MEDIUM |
| `OrderCard.jsx` | Modify — scheduled badge | ~10 | LOW |
| `ScanOrderPopOut.jsx` | Modify — predicate guard | ~1 | LOW |
| `DashboardPage.jsx` | Modify — filter predicate fix | ~1 | LOW |
| `constants.js` | Possibly — no change for Phase 1 | 0 | — |
| `Header.jsx` | Modify — schedule tab (optional Phase 1) | ~10 | LOW |

**Total estimated lines changed: ~112**

---

## 8. Testing Strategy

| Test | Method | Priority |
|---|---|---|
| Place scheduled takeaway order → verify payload has `scheduled=1` + `schedule_at` | Manual + curl | P0 |
| Place scheduled dineIn order → verify payload | Manual | P0 |
| Place scheduled walkIn order → verify payload | Manual | P0 |
| Delivery order → schedule checkbox hidden | Visual | P0 |
| Room order → schedule checkbox hidden | Visual | P0 |
| QSR mode → schedule checkbox hidden | Visual | P1 |
| Date/time picker: min 15 min from now enforced | Manual | P1 |
| Date/time picker: max 1 month enforced | Manual | P1 |
| Date/time picker: 15-min intervals only | Manual | P1 |
| Prepaid + scheduled (placeOrderWithPayment) | Manual + curl | P0 |
| ScanOrderPopOut: scheduled order NOT shown | Manual (requires B1 fix) | P0 |
| OrderCard: scheduled badge visible | Manual (requires B1 fix) | P0 |
| Re-engage scheduled order: schedule shown read-only | Manual (requires B1 fix) | P1 |
| Update scheduled order (add items): scheduled flag preserved | Manual (requires B1+B3) | P1 |

---

## 9. Recommendation

1. **Proceed to Gate 3 (Implementation Plan)** — enough clarity to plan.
2. **Phase 1 scope:** Payload + UI + badge + ScanOrderPopOut guard + filter fix. No Status View column.
3. **Ship payload + UI immediately** — can be tested with curl even without B1.
4. **Badge + filter activate automatically** when B1 is resolved.
5. **Escalate B1 + B3** to backend team with specific test cases.

---

*CR-018 Impact Analysis — 2026-06-09. Gate 2 COMPLETE. 13 risks identified (1 P0 blocker, 2 HIGH, 4 MEDIUM, 6 LOW). Recommended: proceed to Gate 3.*
