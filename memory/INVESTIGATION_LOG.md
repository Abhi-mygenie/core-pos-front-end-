# Investigation Log — MyGenie Core POS

---

## Session: 2026-07-31
**Credentials used:** owner@18march.com / Qplazm@10
**Mode:** Read-only investigation — NO code edits
**Instruction file:** `/app/memory/control/AGENT_PROMPT_ALPHA.md` — not present at time of investigation

---

## Issue 1 — Aggregator Order: When does it move to "Served" on dashboard?

### Ruling out (user-corrected assumption)
> **User clarification:** Once an order is Dispatched from the POS, it is removed from the dashboard immediately and appears only in the Reports section with its final status. It does NOT remain on the dashboard at fOS=5 after dispatch.

### Confirmed lifecycle

| Step | Trigger | API payload | Resulting fOrderStatus | Dashboard |
|------|---------|------------|----------------------|-----------|
| 1 | Incoming order (socket) | — | fOS=0 or fOS=7 | AggregatorOrderPopOut blocks screen |
| 2 | Staff accepts (popup) | `new_status: 'Acknowledged'`, `prep_time_mins` | fOS=1 (preparing) | Card in Preparing column |
| 3 | Staff presses "Mark Ready" | `new_status: 'Food Ready'` | fOS=2 (ready) | Card in Ready column, shows "Ready to Dispatch" label |
| 4 | Staff dispatches (AggregatorDispatchModal) | `new_status: 'Dispatched'` | — | **Order removed from dashboard → Report only** |
| 5 | UrbanPiper socket pushes passive update | `aggrigator-order-update` socket | fOS=5 | Card appears / stays in **Served column** (passive) |

### Root cause of fOS=5 appearing on dashboard

`fOS=5` (Served) on the live dashboard is driven **exclusively** by a passive socket push from UrbanPiper/backend — **not by any staff action**.

**When exactly does the backend push fOS=5?**
This comes from the aggregator platform side (Swiggy/Zomato via UrbanPiper) independently of what the POS does. Possible triggers (backend-side, not POS-initiated):
- Swiggy/Zomato marks the order as "served" or "at customer" based on rider GPS
- UrbanPiper relays a delivery confirmation event
- Some orders may receive fOS=5 before the POS has even triggered dispatch

**Why fOS=5 stays on the dashboard:**
`socketHandlers.js:953` — `handleAggregatorOrderUpdate` terminal check:
```js
const isTerminal = order.fOrderStatus === 6 || order.fOrderStatus === 3;
```
Only `fOS=6` (paid) and `fOS=3` (cancelled) trigger `removeOrder()`. `fOS=5` calls `updateOrder()` instead — so the order stays on the board in the Served column with **no action buttons** (OrderCard renders nothing at fOS=5 for aggregators).

**Key code files:**
- `src/api/socket/socketHandlers.js:945` — `handleAggregatorOrderUpdate`
- `src/pages/DashboardPage.jsx:1384` — `handleAggregatorReady` (→ `Food Ready`)
- `src/pages/DashboardPage.jsx:1398` — `handleAggregatorDispatch` (→ `Dispatched`, order leaves dashboard)
- `src/components/cards/OrderCard.jsx:1062–1094` — aggregator footer buttons (none at fOS=5)

### Open question (for backend team)
At what exact UrbanPiper event/webhook does the backend set `f_order_status=5`? Is it:
- (a) Backend sets it immediately when POS sends `Dispatched`?
- (b) Aggregator platform (Swiggy/Zomato) pushes it asynchronously?

If (a): The socket event triggered by `Dispatched` should push fOS=6 (removal) not fOS=5 (stay). Otherwise orders briefly flash in Served before leaving — which may be confusing UX. Consider making fOS=5 terminal for aggregators in `handleAggregatorOrderUpdate`.

---

## Issue 2 — Order ID displayed twice on aggregator order card

**Screenshot evidence:** `Z 🚴 #LSEJ8FQP #LSEJ8FQP ₹126`
Two identical `#LSEJ8FQP` tokens in the header of a Zomato delivery card.

### Root cause

Introduced in **CR-118** as an intentional decision to show the aggregator ID on `TableCard`.

**Chain:**

**1. `aggregatorTransform.js:75`** — `customer` field set to aggregator ID string:
```js
customer: od.aggrigator_id ? `#${od.aggrigator_id}` : (cust.name || od.user_name || 'DEL'),
// CR-118 intent: display actual aggregator ID on TableCard
// Side effect: order.customer = "#LSEJ8FQP"
```

**2. `OrderCard.jsx` — `getDisplayName()` (lines 363–371)** — returns customer value without filtering aggregator IDs:
```jsx
if (order.customer && order.customer.trim() &&
    order.customer !== 'Walk-In' &&
    order.customer !== 'Del' &&
    order.customer !== 'TA') {
  return order.customer; // Returns "#LSEJ8FQP" — no aggregator gate
}
```
→ Header renders: `<span>#LSEJ8FQP</span>` (customer/name slot)

**3. `OrderCard.jsx:482–489`** — dedicated order ID chip also renders `#aggrId`:
```jsx
{(isAggregator ? order.aggrId : orderNumber) && !isRoom && !isDineIn && (
  <span>#{isAggregator ? order.aggrId : orderNumber}</span>
  // order.aggrId = "LSEJ8FQP" → "#LSEJ8FQP"
)}
```

**Result:** Both slots independently render `#LSEJ8FQP` → duplicate in header row.

---

## Fix Decision — Issue 2

**Chosen option: Option A** (confirmed by owner)

**File:** `src/components/cards/OrderCard.jsx`
**Function:** `getDisplayName()` (~line 347)

**Change:**
Add an aggregator guard at the top of `getDisplayName()` so that aggregator cards never use the `customer` field as a display name — the dedicated `aggrId` chip (lines 482–489) already handles the ID display for aggregators.

```jsx
// BEFORE
const getDisplayName = () => {
  if (isRoom) { ... }
  if (isDineIn) { ... }
  if (order.customer && order.customer.trim() && ...) {
    return order.customer;
  }
  return '';
};

// AFTER — add at top of function, before isRoom check
const getDisplayName = () => {
  if (isAggregator) return ''; // aggrId chip handles display; avoid duplicate
  if (isRoom) { ... }
  ...
};
```

**Why Option A and not Option B (transform change):**
- `customer` field is read by `TableCard` for display in the dine-in table grid (CR-118 original intent). Changing the transform would require auditing `TableCard` and any other consumer of `order.customer`.
- Option A is a single-line, zero-risk change scoped entirely to `OrderCard`, with no transform or data-layer impact.
- `customerName` field (`aggregatorTransform.js:74`) is already available and correct for when real customer name display is needed on the card (e.g., the customer section at lines 877–892 already uses `order.customerName`).

**Impact of fix:**
- Header row becomes: `Z 🚴 #LSEJ8FQP ₹126` (single ID, via chip)
- Customer name (real name) is shown in the dedicated customer row (lines 877–892), unchanged
- `TableCard` unaffected — it reads `order.customer` directly, not via `getDisplayName()`

---

## Status

| Issue | Status | Action |
|-------|--------|--------|
| Issue 1 — Aggregator served status | Investigated — ON HOLD | Documented — **do not fix until backend confirms fOS=5 trigger timing** |
| Issue 2 — Duplicate order ID | **FIXED & VERIFIED (2026-07-31)** | Option A applied — `if (isAggregator) return '';` added to `getDisplayName()` in `OrderCard.jsx:351`. Tested on 8 live aggregator cards (5 Zomato, 3 Swiggy). Frontend 100% pass. |
| Issue — Cancelled aggregator not removed (Fix A) | **FIXED & VERIFIED (2026-07-31)** | `aggregatorTransform.js:40` — `fOrderStatus: Number(od.f_order_status)`. Ensures strict `=== 3` check works when API sends string `"3"`. |
| Issue — Cancelled aggregator not removed (Fix B) | **FIXED & VERIFIED (2026-07-31)** | `socketHandlers.js:968–982` — Fallback path now checks `isTerminal` (fOS===3 or fOS===6) and calls `removeOrder`. Also calls `removeOrder(orderId)` when order is absent from active list. `/app/test_reports/iteration_2.json` — 100% pass. |
| Issue — Smart Purchase duplicate rows + purchase list doubles | Investigated (2026-07-31) — PENDING FIX | Root cause: `purchasePlanner.js:computePlan` — `inStockRows` built without excluding items already in `alertRows`. Items with gap=0 AND a stock alert appear in both lists simultaneously. Same `ingredient_id` appears twice → both rows show in purchase list. Fix: build `alreadyCovered` set from both `velocityRows` + `alertRows` before filtering `inStockRows`. One file, one set change — fixes both the main list duplicate AND the purchase list double entry. |
| Issue 1 — Aggregator multi-order: second order disappeared | RE-INVESTIGATED (2026-07-31) | See full detail below. Previous auto-accept theory incorrect. Root cause confirmed via live API: BU085Q89 has fos=3 ("Order rejected" / "CONNECTIVITY_ISSUE") — auto-rejected by UrbanPiper because `get-order-list` never includes fos=0 orders, so a missed socket event = order permanently invisible. Backend fix required. |
| Employee dropdown — default roles missing | Investigated — PENDING FIX | Root cause: `roleOptions = roles.filter(r => r.isEditable && r.active)` excludes system roles (isEditable=false). Fix: remove `r.isEditable &&`. Awaiting approval. |
| Logout — no POS API call | **REGISTERED as CR-124 (2026-07-31)** | No `LOGOUT` endpoint exists. Token not invalidated server-side. FCM not deregistered. INTAKE — BACKEND-BLOCKED. Backend team to confirm logout endpoint path (Q-124-1) before Gate 3. Intake: `change_requests/CR-124_LOGOUT_API_CALL_INTAKE.md`. |

---

## Fix Commit Detail — Issue 2

**File:** `src/components/cards/OrderCard.jsx`
**Function:** `getDisplayName()` (line 347)
**Change:** Added guard `if (isAggregator) return '';` as first statement (line 351)
**Test result:** `/app/test_reports/iteration_1.json` — `success_rate.frontend: 100%`, `retest_needed: false`
**Side effects confirmed nil:** Non-aggregator cards (dine-in, takeaway, delivery) unaffected. `TableCard` unaffected (reads `order.customer` directly, not via `getDisplayName()`). Customer name still appears in the dedicated customer row (card body) for aggregator orders.
