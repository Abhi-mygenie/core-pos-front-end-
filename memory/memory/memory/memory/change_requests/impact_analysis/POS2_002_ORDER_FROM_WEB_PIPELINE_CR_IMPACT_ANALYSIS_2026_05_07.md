# POS2-002 — CR Impact Analysis: Order Origin (`order_from`) + Scan & Order Web Pipeline

**Sprint:** `pos2.0`
**CR ID:** `POS2-002`
**Type:** Read-only CR analysis. NO implementation, NO source edits, NO QA, NO tracker updates, NO `/app/memory/final/` access, NO patches, NO refactor.
**Agent:** CR Analysis Only Agent
**Date:** 2026-05-07
**Branch:** `6-may`
**Predecessors:**
- `impact_analysis/DELIVERY_CHARGE_EDITABILITY_BUSINESS_RULE_INVESTIGATION_2026_05_07.md` (clarified scope: prepaid/postpaid axis is wrong; correct axis is `order_from === 'web'`)
- `LAST_SPRINT_CODE_FIX_VALIDATION_2026_05_06.md` (CR-008 D1-Gate confirmed present)
- `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md` (`order_from` schema status)
- `impact_analysis/F_ORDER_STATUS_8_DASHBOARD_REGRESSION_CHECK.md` (closed_backend_side per owner 2026-05-07)

**Revision history:**
- **2026-05-07 v1** — Initial analysis (pop-out and dashboard-filter framed as proposals).
- **2026-05-07 v2 (this revision)** — Owner-locked two explicit requirements: (R-POPOUT) Web YTC Pop-out is a hard requirement; (R-FILTER) Dashboard `order_from` filter / toggle is a hard requirement. Sections 0, 8, 9, 12, 13, 14 updated. Phases 3 & 4 reclassified from "proposed" to "locked-scope, blocked on backend".

---

## 1. Executive summary

> **Final verdict: `needs_backend_payload_confirmation` + `needs_business_confirmation`.** Implementation is NOT safe yet but is a small, well-scoped 4-phase CR once two answers land.

Three independent business asks are bundled in this CR:

- **A. Delivery charge lock for `order_from === 'web'` + `delivery_charge > 0`** — rebuilds the existing CR-008 D1-Gate logic on a **new, orthogonal axis** (origin, not payment-stage). Touches one predicate at `CollectPaymentPanel.jsx:917`. Existing CR-008 D1-Gate `isPrepaid` rule MUST stay untouched (different concern: "money already collected via cash up-front").
- **B. Dashboard filter for web orders** — minor UI surface; recommended as a Channel-View "Source" pill (Web / POS) rather than a brand-new Channel.
- **C. Scan & Order pop-out for unconfirmed web orders** — the largest piece. Requires a YTC-overlay component (`f_order_status === 7` + `order_from === 'web'` predicate), audible alert, multi-stack queue handling, accept/reject wiring to existing `confirmOrder` endpoint at `orderService.js:62`.

The single load-bearing prerequisite for all three: **`order_from` must be present on the FE live-order model** (today it is captured ONLY on the Audit-Report transform). The fix is exactly **one line** at `orderTransform.js:191` (Phase 1 below) — but conditional on backend confirming `order_from` ships on every wire surface that feeds `fromAPI.order`.

### 1.1 At-a-glance verdict map

| Phase | Scope | Status (v2) | Blocking dependency | Owner decision needed | Code surface | Effort |
|---|---|---|---|---|---|---|
| **Phase 1** | Map `order_from` into live order model | foundational — ungates the rest | Backend confirms key shipping on `single-order-new`, `running orders`, sockets (BE-OF1/2/3) | None | `orderTransform.js:191` (1-line add) | ≈30 min |
| **Phase 2** | Delivery-charge lock for web + `dc>0` | locked rule (POS2-001 / §0 §7) | Phase 1 done | OQ-2 (value-axis frozen vs live) | `CollectPaymentPanel.jsx:917` (3-line predicate) + `OrderEntry.jsx:1175` comment update | ≈1 hr |
| **Phase 3** | Dashboard web-order filter + per-card badge | **LOCKED scope (R-FILTER-1..10)** | Phase 1 done; BE-OF1/2 | OQ-3 (UI shape only — pill set vs single toggle) | `DashboardPage.jsx`, `Header.jsx`, `OrderCard.jsx`, `TableCard.jsx` | ≈3-4 hr |
| **Phase 4** | Unconfirmed Scan & Order pop-out overlay | **LOCKED scope (R-POPOUT-1..10)** | Phase 1 done; BE-OF4 (status-key co-arrival on wire) | OQ-1 (delivery-only vs all web), OQ-5 (audio), OQ-12 (small viewport) | New `<ScanOrderPopOut />`; mounted in `DashboardPage.jsx`; reuses `confirmOrder` endpoint | ≈1.5-2 days |

### 1.2 Implementation NOT safe yet

Three concrete blockers:
1. **Backend payload confirmation:** `order_from` is captured on the Audit-Report transform (`reportService.js:746-755`) but **NOT on `orderTransform.fromAPI.order`** (the dashboard / OrderEntry / sockets pipeline). Owner needs to confirm with backend that the field ships on:
   - `POST /api/v2/vendoremployee/order/single-order-new` (used by `fetchSingleOrderForSocket` — feeds ALL socket-driven order refreshes)
   - `GET /api/v1/vendoremployee/pos/employee-orders-list` (used by `getRunningOrders` — feeds dashboard initial load)
   - The four socket events that pass through `fetchSingleOrderForSocket`: `scan-new-order`, `update-order`, `update-order-paid`, `delivery-assign-order`, `update-food-status`, `update-order-status`
2. **Business scope confirmation:** OQ-1 (pop-out for delivery web orders only, or all web orders incl. takeaway / dine-in QR menus?), OQ-3 (filter shape), OQ-4 (dismiss / re-pop behaviour).
3. **Sample-payload confirmation:** Owner offered to share a redacted Scan & Order delivery payload + screenshot — required to lock the exact key/value shape (`'web'` vs `'WEB'` vs other) before Phase 2 predicate ships.

---

## 2. CR-008 D1-Gate `isPrepaid` — explained

### 2.1 What is the `isPrepaid` gate?

A single boolean predicate at `OrderEntry.jsx:653-654`:

```js
const orderPaymentType = liveOrder?.paymentType || orderData?.paymentType || '';
const isPrepaid = orderPaymentType === 'prepaid';
```

Drives **read-only / write-locked behaviour on multiple UI surfaces**:

| File:line | Behaviour |
|---|---|
| `CollectPaymentPanel.jsx:917` | Delivery-charge field `readOnly={isPrepaid}` |
| `OrderEntry.jsx:1067, 1079` | Hide Merge / Shift buttons (`!isPrepaid`) |
| `OrderEntry.jsx:1208` | Hide Split Bill (`!isPrepaid`) |
| `OrderEntry.jsx:550` | Skip mid-flow re-render when `isPrepaid && placedOrderId` |
| `OrderCard.jsx:329, 353, 370, 754` | `PAID` badge; hide Merge/Shift on dashboard cards |
| `TableCard.jsx:244, 401` | Same prepaid-card visual treatment |

### 2.2 Why CR-008 added the D1-Gate

**File:** `components/order-entry/CollectPaymentPanel.jsx:910-916` (comment, May-2026)

> *"readOnly rule swapped from BUG-019's `initialDeliveryCharge > 0` (which over-locked POS-punched in-house delivery orders after CR-008 D1-Cap began persisting their charges). The new rule ties the lock to the actual concern — money already collected. Prepaid (scan / customer-app paid) → locked. Non-prepaid → editable for cashier corrections / waivers / forgotten-amount entry."*

**Business behaviour protected:**
- Prepaid order = customer already paid the bill (incl. delivery charge if present). **Cashier MUST NOT silently lower the bill** by editing the delivery field after the fact (audit / Razorpay-reconciliation risk). The lock is a hard-stop integrity guard.
- Non-prepaid order = bill not yet collected. Cashier can correct typos / waive / add forgotten amounts up until the moment of payment. Lock would block legitimate corrections.

### 2.3 Why `isPrepaid` is the WRONG axis for the new POS2-001 rule

| # | Reason |
|---|---|
| 1 | **Different domains.** `isPrepaid` is a **payment-stage** predicate (money already in?). `order_from === 'web'` is an **origin** predicate (who placed the order — customer or cashier?). They overlap but aren't isomorphic. |
| 2 | **POS-prepaid orders exist.** A POS cashier who collects cash up-front via `placeOrderWithPayment` (`orderTransform.js:952`) creates a `payment_type === 'prepaid'` order that did NOT come from a customer-side scan. Today they're locked under D1-Gate (correct per D1-Gate's spirit). Under the new rule, they should be **editable** (POS / manual → "existing behaviour unchanged"). Reusing `isPrepaid` would over-lock them inappropriately under the new rule's framing. |
| 3 | **Web-postpaid orders may exist.** Some tenants use Scan & Order in "QR-menu only, pay-at-counter" mode → `order_from === 'web'`, `payment_type === 'postpaid'`, `delivery_charge` already entered by the customer's order-flow → field SHOULD lock per new rule, but `isPrepaid === false` would NOT lock it. |
| 4 | **Aggregator orders ambiguity.** Swiggy / Zomato orders are `payment_type === 'prepaid'` and `order_in === 'swiggy'` (channel-tagged) but NOT scan-origin. Conflating them with web-customer orders breaks the user-intent boundary. |
| 5 | **Audit trail clarity.** Reusing `isPrepaid` for two unrelated business rules makes future debugging brittle — a code reader cannot tell which intent a particular `isPrepaid` check is enforcing. |

→ **Mandate: a NEW predicate (`isWebOrigin` or similar) must be added. Existing `isPrepaid` gate stays untouched. The two predicates can BOTH be true on a given order; they enforce two different business invariants.**

---

## 3. Current channel gate map

> Reading from `api/transforms/orderTransform.js:131-220` (the live-order transform that feeds dashboard / OrderEntry / sockets).

| Channel | Detection key | Mapped FE field | File:line | Current behaviour |
|---|---|---|---|---|
| **dineIn** | `api.order_type === 'dinein' \| 'pos' \| 'walk_in'` | `orderType: 'dineIn'` | `orderTransform.js:40-58, 136` (`normalizeOrderType`) | Renders in DineIn channel column; table-bound; supports Merge/Shift; cart on table |
| **takeAway** | `api.order_type === 'takeaway' \| 'take_away'` | `orderType: 'takeAway'` | Same | Counter cart; no table; Merge/Shift hidden |
| **delivery** | `api.order_type === 'delivery'` | `orderType: 'delivery'` | Same | Walk-in style; no table; delivery-address fields; `delivery_charge` capture (CR-008 D1-Cap) |
| **room** | `table.rtype === 'RM' \|\| api.order_in === 'RM'` | `isRoom: true` | `orderTransform.js:134` | Routed to Room channel; folio-based settlement; `roomInfo` payload; CR-004 lifecycle |
| **walkIn** | `!api.table_id \|\| api.table_id === 0` | `isWalkIn: true` | `orderTransform.js:135` | Counter; no table-card link |
| **room-shifted (SRM)** | `api.order_in === 'SRM'` | Audit-side only | `reportTransform.js:124, 117-132` | Rendered as "Shifted to Room" in Audit Report |
| **aggregator** (Swiggy/Zomato) | `api.order_in ∈ {'swiggy', 'zomato', ...}` | `source: api.order_in.toLowerCase()` | `orderTransform.js:218` | Surfaces in "Source" column of Audit Report; aggregator badge `OrderTable.jsx:47` |
| **scan / web** | **NOT detected on live-order pipeline.** Captured as `platform === 'web'` only on Audit-Report transform from `api.order_from`. | none today | `reportService.js:746-755` (Audit only) | **No FE gate exists today** for web vs POS-origin on dashboard / OrderEntry / sockets |

### 3.1 Channel keys summary (which key drives which decision today)

| Backend key | FE field | Used for |
|---|---|---|
| `api.order_type` | `orderType` | dineIn / takeAway / delivery routing (live + audit) |
| `api.order_in` | `orderIn` / `source` | RM / SRM detection; aggregator name (live + audit) |
| `api.payment_type` | `paymentType` | prepaid / postpaid (CR-008 D1-Gate, prepaid badge) |
| `api.payment_method` | `paymentMethod` | cash / card / upi / paylater (Hold rule, COD mask) |
| `api.table_id` | `tableId` | walkIn detection; table-card link |
| `api.f_order_status` | `fOrderStatus` | All status-based gates (running / YTC / paid / hold / cancelled) |
| `api.order_from` | **NOT MAPPED** (audit-only) | nothing on live pipeline today |
| `api.razorpay_order_id` | (audit-only) | gateway / non-gateway filter on Audit Report |
| `room_id` / `air_bnb_id` | not surfaced in `orderTransform.js` | n/a — room linkage via `parent_order_id` (Audit) and `table.rtype` |

---

## 4. `order_from` availability map

> Critical for Phase 1 implementation gating.

### 4.1 Surfaces FE consumes for live order data

| API / socket surface | FE consumer | Feeds which transform? | `order_from` confirmed shipping? | Evidence |
|---|---|---|---|---|
| `GET /api/v1/vendoremployee/pos/employee-orders-list` | `getRunningOrders` (`orderService.js:12`) | `fromAPI.orderList → fromAPI.order` | **Unknown — need owner / backend confirmation** | Not visible in 2026-05-06 cohort sample (Bean Me Up); Bean Me Up may not have web orders. Owner offered to share payload. |
| `POST /api/v2/vendoremployee/order/single-order-new` | `fetchSingleOrderForSocket` (`orderService.js:26`) | `fromAPI.order` | **Unknown — need owner confirmation** | Same as above; this endpoint feeds ALL socket refreshes. |
| `socket: scan-new-order` (event triggers fetch) | `handleScanNewOrder` (`socketHandlers.js:428`) | Calls `fetchSingleOrderForSocket` then `addOrder` | Inherits from `single-order-new` answer | Socket event itself only carries `order_id` — full data comes from the API fetch. |
| `socket: update-order` | `handleUpdateOrder` (`socketHandlers.js:222`) | Same | Inherits | — |
| `socket: update-order-paid` | `handleUpdateOrderStatus`-family | Same | Inherits | — |
| `socket: delivery-assign-order` | `handleDeliveryAssignOrder` (`socketHandlers.js:454`) | Same | Inherits | — |
| `socket: update-food-status` | `handleUpdateFoodStatus` (`socketHandlers.js:317`) | Same | Inherits | — |
| `GET /api/v1/.../order-logs-report` | `getOrderLogsReport` (`reportService.js`) | `fromAPI.report` (Audit-side) | **YES** — already mapped at `reportService.js:746-755` | Direct evidence: `const orderFromRaw = (api.order_from \|\| '').toString().toLowerCase();` then mapped to `platform: 'pos' \| 'web' \| null` |

### 4.2 Net availability conclusion

| Question | Answer |
|---|---|
| Does backend response contain `order_from`? | **Confirmed YES on `order-logs-report` (Audit endpoint).** Owner-confirmable on `single-order-new` + `employee-orders-list` + sockets. |
| Does FE map it on the live pipeline today? | **NO.** Zero hits for `order_from` in `orderTransform.fromAPI.order`. |
| Is the field-echo ask trivial if missing on a surface? | **Yes** — backend already has the column (per Audit endpoint). Echoing on the dashboard endpoint is a 1-line server change. |

### 4.3 Backend field-echo ask (if confirmed missing on any live surface)

> Single ask, multiple surfaces:
> *"Please echo `order_from` (string: `'pos' | 'web' | null`) on the response payload of `single-order-new` and `employee-orders-list`. The field already ships on `order-logs-report`. No new column needed; just expose the existing column on the live endpoints. ETA?"*

If backend says it already ships — Phase 1 collapses to a 1-line FE map; no backend work.

---

## 5. FE model mapping gap

### 5.1 What's missing

`api/transforms/orderTransform.js` lines `131-220` (`fromAPI.order`) contains zero references to `order_from`. The returned order object has these origin/channel-related keys today:

```js
{
  orderId, orderNumber, orderType, rawOrderType, orderIn,
  status, fOrderStatus, tableStatus, lifecycle,
  tableId, tableNumber, tableSectionName, isWalkIn, isRoom,
  customer, customerName, phone,
  /* ... financials ... */
  paymentStatus, paymentType, paymentMethod,
  /* ... timing, staff ... */
  source: (api.order_in || 'own').toLowerCase(),  // ← channel, NOT origin
  /* ... items, etc. */
}
```

→ **No `orderFrom`. No `origin`. No `isWebOrder`.**

### 5.2 Minimal mapping change required (sketch only — not for implementation now)

**File:** `api/transforms/orderTransform.js:191` (alongside `paymentType`)

```js
// SKETCH (DO NOT IMPLEMENT IN THIS THREAD):
paymentType: api.payment_type || '',
orderFrom: typeof api.order_from === 'string'
  ? api.order_from.toLowerCase().trim() || null
  : null,   // 'pos' | 'web' | <unknown> | null
```

- Lower-cased + trimmed at the boundary → all consumers can compare against `'web'` without re-normalising.
- `null` for missing / non-string / empty → safe default; no downstream code that adds origin gating today, so `null` is non-breaking.
- Single-source-of-truth for origin on the FE live model. Audit-side `platform` (`reportService.js:746`) stays as-is; eventual harmonisation is out of scope for this CR.

---

## 6. Proposed normalised order origin model

### 6.1 Canonical FE values

| Backend `order_from` raw | Normalised FE `orderFrom` | Meaning |
|---|---|---|
| `'pos'` / `'POS'` | `'pos'` | Cashier-originated — manual punch via POS app |
| `'web'` / `'WEB'` | `'web'` | Customer-originated — Scan & Order / web URL / customer app |
| `''` / `null` / `undefined` / missing | `null` | Unknown — pre-feature orders or surfaces that don't echo the field. **Treat as `'pos'`-equivalent for any gating** (fail-safe to existing behaviour). |
| any other string (e.g., `'aggregator'`, `'phone'`, `'whatsapp'`) | the raw lowercased string | Reserved for future. Treat as non-`'web'` for POS2-001 / POS2-002 rules unless backend explicitly extends scope. |

### 6.2 Helper predicate (FE consumer side)

```js
// SKETCH (DO NOT IMPLEMENT):
const isWebOrigin = (order) => order?.orderFrom === 'web';
```

→ Single helper; reused by Phase 2 lock predicate, Phase 3 filter, Phase 4 pop-out detector.

---

## 7. Delivery charge lock predicate (Phase 2)

### 7.1 The new predicate (sketch only)

**File:** `components/order-entry/CollectPaymentPanel.jsx:917`

```js
// SKETCH (DO NOT IMPLEMENT IN THIS THREAD):

// Below the existing `isPrepaid` derivation in OrderEntry.jsx:
const isWebOrigin = (liveOrder?.orderFrom || orderData?.orderFrom) === 'web';
const isWebOrderWithCharge = isWebOrigin && Number(initialDeliveryCharge) > 0;

// Pass to <CollectPaymentPanel ... isWebOrderWithCharge={isWebOrderWithCharge} />
// Inside CollectPaymentPanel, the input becomes:
readOnly={isPrepaid || isWebOrderWithCharge}
//        ^^^^^^^^^^   ^^^^^^^^^^^^^^^^^^^^^
//        EXISTING     NEW (additive — both predicates protect different invariants)
title={
  isWebOrderWithCharge
    ? 'Delivery charge already received with the web order — not editable here'
  : isPrepaid
    ? (initialDeliveryCharge > 0
        ? 'Delivery charge already collected from customer — not editable'
        : 'Order is prepaid — delivery charge cannot be modified')
  : 'Enter or edit delivery charge'
}
```

### 7.2 Why additive (`||`) and not replace

- Existing CR-008 D1-Gate is correct for prepaid orders that arrived through POS (cashier collected cash up-front — `placeOrderWithPayment`). Removing the prepaid axis would re-introduce the audit-integrity risk D1-Gate was added to fix.
- The two predicates protect different invariants — both should hold:
  - `isPrepaid` → "money already collected, lock to prevent silent bill reduction"
  - `isWebOrderWithCharge` → "customer-side data, cashier shouldn't override what customer-side already entered"
- Both being true on the same order (web + prepaid) → still locked. Both being false → editable. **Truth-table clean.**

### 7.3 Truth table

| `orderFrom` | `delivery_charge` | `paymentType` | Lock? | Why |
|---|---|---|---|---|
| `'web'` | `> 0` | `prepaid` | **Locked** | Both predicates trigger |
| `'web'` | `> 0` | `postpaid` | **Locked** | `isWebOrderWithCharge` triggers |
| `'web'` | `0 / null / blank / missing` | `prepaid` | **Locked** | `isPrepaid` still triggers (existing D1-Gate) |
| `'web'` | `0 / null / blank / missing` | `postpaid` | **Editable** | Neither triggers — cashier may add charge |
| `'pos'` / `null` | `> 0` | `prepaid` | **Locked** | `isPrepaid` triggers (existing D1-Gate) |
| `'pos'` / `null` | `> 0` | `postpaid` | **Editable** | Neither triggers (existing CR-008 behaviour) |
| `'pos'` / `null` | `0` | any | **Editable** if postpaid; **Locked** if prepaid (existing) | No POS2-002 contribution |

→ Existing CR-008 behaviour preserved on every POS row. Only web rows get new behaviour.

### 7.4 Value-axis read source — open question (OQ-2)

- **Option a (frozen):** `Number(initialDeliveryCharge) > 0` — frozen at mount; doesn't toggle as cashier types. **Recommended** — predictable UX, matches D1-Gate semantics.
- **Option b (live):** `Number(deliveryChargeInput) > 0` — toggles as cashier types. Edge case "cashier types ₹50 → field locks mid-typing → can't reset to 0" is confusing.

---

## 0. LOCKED REQUIREMENTS (owner-confirmed 2026-05-07 v2)

> Two requirements are now hard-locked. Phases 3 + 4 are no longer "proposals" — they ship as part of POS2-002 once Phase 1 backend payload + the listed open questions resolve. Sections 8 (filter) and 9 (pop-out) below are the implementation references; the locked acceptance criteria live here.

### R-POPOUT — Web Yet-to-Confirm Pop-out (hard requirement)

| # | Acceptance criterion | Status |
|---|---|---|
| R-POPOUT-1 | Predicate is `orderFrom === 'web' AND status === 'yetToConfirm'` (i.e., `fOrderStatus === 7`). No other axes enter the predicate. | **Locked** |
| R-POPOUT-2 | YTC status key is **verified**: `f_order_status === 7` ⇔ `lifecycle === 'pending'` ⇔ `status === 'yetToConfirm'`. Triple-source evidence at `api/constants.js:140, 153, 162, 175`, `Header.jsx:20`, `OrderCard.jsx:176`, `TableCard.jsx:59, 484`, `StatusConfigPage.jsx:98, 109`. **Backend confirmation still required (BE-OF4) that `order_from === 'web'` ships alongside `f_order_status === 7` on the `single-order-new` and `scan-new-order` flows.** | **Locked + needs BE confirm** |
| R-POPOUT-3 | Pop-out appears **automatically** when (a) a matching order arrives via `scan-new-order` socket, OR (b) a matching order is already present at dashboard initial load (`getRunningOrders`). No manual trigger. | **Locked** |
| R-POPOUT-4 | Pop-out covers a meaningful portion of the dashboard such that the operator cannot miss it. Spec: minimum ≥ 50% of available dashboard area on desktop (≥ 1024 px wide), full-screen on tablet (< 1024 px). Above all panels (z-index above sidebar / status pills / settings drawer). | **Locked** |
| R-POPOUT-5 | Operator can **Accept / Confirm** directly from the pop-out. Reuses the existing `confirmOrder(orderId, roleName, orderStatus)` endpoint at `api/services/orderService.js:62-66` (same wire used by today's YTC accept on dineIn — no new endpoint). | **Locked** |
| R-POPOUT-6 | Operator can also **Reject** from the pop-out (parity with existing YTC card flow `OrderCard.jsx:680-687`). Reject path: same as today's `onReject` on YTC dineIn cards. | **Locked** |
| R-POPOUT-7 | Once accepted/confirmed, the order leaves the pop-out (predicate flips to `false` because `fOrderStatus` flips 7 → 1) and rejoins normal dashboard flow. Pop-out auto-dismisses when queue empty. | **Locked** |
| R-POPOUT-8 | If multiple matching orders exist concurrently, they form a **single managed queue / list** (NOT separate uncontrolled pop-ups). Operator triages sequentially or via list view. The exact UI shape (sequential one-at-a-time vs expandable list) is locked to **sequential one-at-a-time with "Order N of M" indicator + Next/Previous arrows** unless owner overrides via OQ-4. | **Locked (default sequential; owner may override via OQ-4)** |
| R-POPOUT-9 | Non-web orders MUST NOT trigger this pop-out. POS-origin YTC dineIn / takeAway / delivery orders continue to use the existing per-card YTC accept flow (no behaviour change). | **Locked** |
| R-POPOUT-10 | This feature is **blocked** until backend confirms BE-OF1, BE-OF2, BE-OF3, BE-OF4 (see §10.1) AND `order_from === 'web'` is reliably populated on the same payload that carries `f_order_status === 7` for scan-originated YTC orders. | **Locked** |

**Scope question OQ-1 status:** Owner clarification still pending — does R-POPOUT cover (a) web delivery YTC only, (b) all web YTC (incl. takeaway / dineIn QR-menu), or (c) only delivery web orders for v1 with takeaway/dineIn deferred? Default reading of the owner statement *"any Scan & Order / web order that is not confirmed should automatically pop out"* = **(b) all web YTC orders** but explicit confirmation requested.

### R-FILTER — Dashboard `order_from` filter / toggle (hard requirement)

| # | Acceptance criterion | Status |
|---|---|---|
| R-FILTER-1 | Dashboard default view is **All Orders** (no implicit origin filter). Existing default behaviour preserved. | **Locked** |
| R-FILTER-2 | A dedicated, clearly-labelled filter / toggle for **Web / Scan & Order** is added. Visibility: Header (recommended) per §8.1 option A. UI shape may be a pill set (`[All] [POS] [Web]`), a single toggle (`Web only`), or both — locked at minimum to a binary toggle that displays only `orderFrom === 'web'` rows when active. | **Locked** |
| R-FILTER-3 | Filter condition reads from the **normalised** `orderFrom` field (lowercased + trimmed at transform boundary per §6.1) sourced from backend `order_from`. | **Locked** |
| R-FILTER-4 | `order_from === 'web'` displays as **"Web / Scan & Order"** in label text. Internal value remains `'web'`. | **Locked** |
| R-FILTER-5 | Missing / null `order_from` MUST NOT be treated as web. Such rows are excluded from the Web filter view (and included only when filter is "All" or "POS" if backend later confirms null = pos-equivalent). Fail-safe to current behaviour. | **Locked** |
| R-FILTER-6 | The Web filter MUST NOT replace existing channel filters (Dine-In / Take-Away / Delivery / Room) or the existing status filters. They remain independently functional. | **Locked** |
| R-FILTER-7 | The Web filter MUST work alongside existing channel + status filters whenever technically feasible. AND-composition of predicates (Web AND Dine-In AND Running). Implementation site: `pages/DashboardPage.jsx:713-770` (channel-view `statusMatchesFilter`-equivalent extension) + `pages/DashboardPage.jsx:861-880` (status-view `enabledStatuses` extension). | **Locked** |
| R-FILTER-8 | Web-origin orders MUST display a **per-card / per-row badge** (e.g., `📱 SCAN` or `WEB` chip) on `OrderCard.jsx` and `TableCard.jsx` next to the order ID. Badge is independent of the filter state — always visible when `orderFrom === 'web'`. | **Locked** |
| R-FILTER-9 | Aggregator orders (Swiggy / Zomato — `order_in === 'swiggy' \| 'zomato' \| ...`) MUST NOT be included by the Web filter unless backend explicitly confirms aggregator orders carry `order_from === 'web'`. Default: Web filter is strict `=== 'web'`. | **Locked** |
| R-FILTER-10 | This filter is **blocked** until backend confirms `order_from` ships on (a) `GET /api/v1/vendoremployee/pos/employee-orders-list` (dashboard list) — BE-OF2, (b) `POST /api/v2/vendoremployee/order/single-order-new` (single-order fetch after socket) — BE-OF1, and (c) inferred to ship via the same `single-order-new` fetch on socket events (`scan-new-order`, `update-order`, `update-order-paid`, `delivery-assign-order`, `update-food-status`, `update-order-status`) — BE-OF4. | **Locked** |

### R-COMMON — Shared backend confirmation gate

Both R-POPOUT and R-FILTER share the same Phase 1 prerequisite: **`order_from` must be on the live-order-pipeline wire**. Once backend confirms (single email reply addressing BE-OF1 + BE-OF2 + BE-OF3 + BE-OF4), both requirements unblock simultaneously.

---

## 8. Dashboard web-order filter — implementation reference (Phase 3, locked R-FILTER)

> Acceptance criteria are locked at §0 R-FILTER-1..10. This section documents the recommended UI shape and integration points only.

### 8.1 Three options for owner choice (OQ-3 — UI shape only; presence of the filter itself is locked)

| Option | Surface | Pros | Cons |
|---|---|---|---|
| **8.1.1 Source-pill in Header** (A) | New pill set `[All]/[POS]/[Web]` adjacent to existing Status pills | Discoverable; matches Header pill pattern; no schema change | Adds another row to header; duplicates info if Channel pills also visible |
| **8.1.2 Origin badge on existing cards** (B) | Small `📱 SCAN` or `WEB` chip on `OrderCard.jsx` / `TableCard.jsx` next to order ID | Minimal UI footprint; instantly visible per-card | Doesn't filter — only labels |
| **8.1.3 New Channel column in Status-View layout** (C) | "Web Orders" column alongside Dine-In / TakeAway / Delivery / Room | Strong segregation; complements pop-out (Phase 4) | Big surface change; status-view default already excludes some columns; might confuse operators |

**Recommendation: A + B combined (default for v1 unless owner OQ-3 overrides).** Pill for filtering ("show me only web orders") + badge for at-a-glance card identification. Both are independently locked: pill via R-FILTER-2; badge via R-FILTER-8. Channel-View vs Status-View choice would touch `DashboardPage.jsx:713-770` (channel `statusMatchesFilter`) and `DashboardPage.jsx:861-880` (status-view `enabledStatuses`) — both well-isolated insertion points.

### 8.2 Filter scope (OQ-3 sub-question — locked default)

Strict **`=== 'web'`** — only customer-originated web orders. Per R-FILTER-9, aggregator orders are NOT included unless backend extends `order_from` enum. Per R-FILTER-5, missing/null `order_from` is NOT included.

---

## 9. Scan & Order unconfirmed pop-out — implementation reference (Phase 4, locked R-POPOUT)

> Acceptance criteria are locked at §0 R-POPOUT-1..10. This section documents the architecture and integration points only.

### 9.1 Detection predicate (locked per R-POPOUT-1 + R-POPOUT-2)

```js
// SKETCH (DO NOT IMPLEMENT):
const isUnconfirmedScanOrder = (order) =>
  order?.orderFrom === 'web' &&
  order?.fOrderStatus === 7 &&  // YTC ('Yet to Confirm')
  order?.status === 'yetToConfirm';
```

- `fOrderStatus === 7` = YTC per `api/constants.js:140` and `:162` (`Yet to Confirm`); same status that drives `OrderCard.jsx:176` `isYetToConfirm`.
- Already integrated on `OrderCard.jsx:675-695` with `Reject` / `Accept` buttons.
- Existing accept handler: `DashboardPage.jsx:1109` → `confirmOrder(order.orderId, permissions?.[0] || 'Manager', defaultOrderStatus)`.
- Existing reject handler: `onReject` callback (need to verify destination). Likely calls `cancelOrder` or `updateOrderStatus(orderId, 'cancelled')`.

→ **No new endpoint required.** Reuse existing accept / reject pipes.

### 9.2 YTC status-key triple-source verification (R-POPOUT-2)

| Source | Evidence | Confirms |
|---|---|---|
| `api/constants.js:140` | `7: 'pending'` (lifecycle map) | `f_order_status === 7` ↔ lifecycle `'pending'` |
| `api/constants.js:153` | `7: 'pending'` (API map) | Same key on both sides |
| `api/constants.js:162` | `{ id: 7, fOrderStatus: 7, name: 'Yet to Confirm', key: 'pending' }` | Canonical YTC label = "Yet to Confirm" |
| `api/constants.js:175` | `pending: 'yetToConfirm'` (status-name map) | `lifecycle === 'pending'` ↔ `status === 'yetToConfirm'` |
| `components/layout/Header.jsx:20` | `{ id: "pending", fOrderStatus: 7, label: "YTC" }` | Header pill uses `fOrderStatus: 7` for YTC |
| `components/cards/OrderCard.jsx:176` | `const isYetToConfirm = order.status === "yetToConfirm" \|\| order.status === "pending";` | Card-level YTC check |
| `components/cards/TableCard.jsx:59, 484` | `const isYetToConfirm = table.status === "yetToConfirm";` + included in `allowedStatuses` set | Table-card YTC check |
| `pages/StatusConfigPage.jsx:98, 109` | `{ id: "pending", fOrderStatus: 7, label: "YTC", description: "Yet to Confirm orders" }` + default-enabled set | Status-config UI |

**FE-side YTC key is canonical and verified.** Backend confirmation (BE-OF4) still required to verify that scan-originated YTC orders ALWAYS arrive with both `f_order_status === 7` AND `order_from === 'web'` on the same payload — i.e., that no backend-side mapping silently substitutes a different status enum for web YTC orders.

### 9.3 Component sketch (architecture only — no code yet)

```
┌──────────────────────────────────────────────┐
│  <ScanOrderPopOut />                         │
│  ────────────────────────────────────────    │
│  Renders at root of <DashboardPage />,       │
│  z-index above all panels.                   │
│  ────────────────────────────────────────    │
│                                              │
│  Subscribes via useOrders():                 │
│    queue = orders.filter(isUnconfirmedScanOrder)│
│            .sort(by createdAt asc)           │
│                                              │
│  When queue.length > 0:                      │
│    - Render full-width sticky banner OR      │
│      modal-style overlay (~60% screen)       │
│    - Show order #N of M (multi-stack)        │
│    - Display order summary (table/items/total)│
│    - Buttons:                                │
│      [Reject]   [Accept] (calls existing     │
│                          confirmOrder ⇒      │
│                          fOrderStatus 7→1)   │
│    - Audible alert (loop until first action  │
│      OR snooze-explicit)                     │
│                                              │
│  Once accepted/confirmed:                    │
│    - Backend emits update-order socket       │
│    - fOrderStatus flips 7 → 1                │
│    - Order falls out of queue                │
│    - Pop-out auto-dismisses if queue empty   │
│      OR shifts to next unconfirmed           │
└──────────────────────────────────────────────┘
```

### 9.4 Multi-stack queue handling (OQ-4 — locked default = sequential per R-POPOUT-8)

If 3 unconfirmed web orders arrive simultaneously:
- **Locked default (Option a):** Show ONE pop-out at a time with "Order N of M" indicator + Next/Previous arrows. Sequential triage. **Per R-POPOUT-8.**
- **Owner override option b:** Stacked cards (Slack-style notification stack). Cluttered if 5+.
- **Owner override option c:** "3 Pending Web Orders" badge with click-to-expand list. Less interruptive but easier to ignore — partial conflict with R-POPOUT-4 ("hard to miss"). Owner must explicitly accept reduced visibility if c is chosen.

### 9.5 Dismiss behaviour (OQ-4 — locked default = no dismiss per R-POPOUT-4)

- **No close button** — owner clarification needed: should the pop-out be dismissible at all? If yes:
  - Dismissed orders stay in queue but pop-out doesn't auto-show until next new arrival
  - OR dismissed orders re-pop-out every X minutes until accepted/rejected
  - OR dismiss just collapses to a corner badge that re-expands on click
- **Recommended:** No dismiss; force triage. Aligns with the user's verbatim *"the user does not miss the order"* requirement.
- **Re-pop-out** policy: snooze for X seconds then re-show, vs persistent until acted on.

### 9.6 Post-confirm behaviour (locked per R-POPOUT-7)

- After Accept: `confirmOrder(orderId, roleName, defaultOrderStatus)` at `orderService.js:62-66` → backend flips `fOrderStatus` 7 → 1 (preparing) → emits `update-order` socket → FE refreshes via `fetchSingleOrderForSocket` → predicate fails → order falls out of pop-out queue.
- After Reject: existing `onReject` handler path → `fOrderStatus` 7 → 3 (cancelled) → predicate fails → falls out of dashboard.
- Either way, pop-out auto-dismisses if queue is empty; otherwise advances to next unconfirmed order (R-POPOUT-7 + R-POPOUT-8).

### 9.7 Scope question (OQ-1 — still open)

Apply pop-out to:
- (a) **Web delivery orders only** — `orderFrom === 'web' && orderType === 'delivery' && fOrderStatus === 7`
- (b) **All web orders** — `orderFrom === 'web' && fOrderStatus === 7` (incl. takeaway, dine-in via QR menu)
- (c) **All YTC orders** (no origin filter) — would over-trigger on POS YTC dineIn orders (incorrect; already a non-emergency flow)

→ User's verbatim says *"any Scan & Order / web order that is not confirmed should automatically pop out"*. Strict reading: **(b) all web orders**. Owner to confirm.

---

## 10. Backend field-echo requirements

### 10.1 Required answers (single ask, multiple sub-questions)

| Q | Question to backend | Why |
|---|---|---|
| **BE-OF1** | Confirm `order_from` is currently echoed on the response of `POST /api/v2/vendoremployee/order/single-order-new`. If not, please add. | This endpoint feeds every socket-driven order refresh. Without it, the live order model never sees the field even after Phase 1 FE map. |
| **BE-OF2** | Confirm `order_from` is currently echoed on `GET /api/v1/vendoremployee/pos/employee-orders-list`. If not, please add. | This is the dashboard's initial-load endpoint. |
| **BE-OF3** | What is the canonical value set? `'pos' \| 'web' \| null`? Any other values (e.g., `'aggregator'`)? Casing — always lowercase, or sometimes `'POS'` / `'WEB'`? | Drives FE normalisation in `orderTransform.js:191` and the `isWebOrigin` predicate. |
| **BE-OF4** | For `scan-new-order` socket events, will `order_from === 'web'` always be set in the resulting `single-order-new` fetch? | Sanity check — if scan-originated orders sometimes return `order_from === null`, the pop-out detector would miss them. |
| **BE-OF5** | Does the backend distinguish "scan/QR-menu only" from "scan + customer-app pay" via a different field, or are both `order_from === 'web'`? | Affects scope of pop-out and lock — if both share `'web'`, distinction would need a different signal. |
| **BE-OF6** | (Cosmetic) Will the same `order_from` value be available on aggregator orders (Swiggy/Zomato) — likely `'aggregator'` or null? | Future-proofs the multi-value filter. |

### 10.2 Backend ask priority

- **P0** — BE-OF1, BE-OF2, BE-OF3 (block Phase 1)
- **P1** — BE-OF4 (block Phase 4 reliability)
- **P2** — BE-OF5, BE-OF6 (refine scope; not blocking v1)

---

## 11. Risks

| # | Risk | Likelihood | Mitigation |
|---|---|---|---|
| **R1** | Backend `order_from` not on `single-order-new` → after socket refresh, `orderFrom` becomes `null` mid-session even if it was set on initial load | Medium | Phase 1 gated on BE-OF1 confirmation. If backend can't add quickly, FE can fall back to merging `orderFrom` from prior in-memory order on socket refresh (light shim, not hard) |
| **R2** | Backend `order_from` casing/values inconsistent across surfaces (e.g., `'POS'` on one, `'pos'` on another) | Low | Normalise at the boundary (lowercased + trimmed) per §6.1 |
| **R3** | Aggregator orders accidentally caught by `=== 'web'` filter | Low | Strict `=== 'web'` predicate; aggregator orders have `order_in === 'swiggy'/'zomato'` separation |
| **R4** | Pop-out causes UX disruption for tenants without Scan & Order enabled | Low | Pop-out detector returns empty queue when no `order_from === 'web'` order arrives — zero side-effect for non-scan tenants |
| **R5** | Phase 2 lock interacts with existing CR-008 D1-Gate (double-gate) | Low | Truth-table verified §7.3; both predicates additive (`||`) |
| **R6** | Phase 3 filter conflicts with existing `enabledStatuses` / `activeStatuses` defaults | Low | New filter is orthogonal to status filter; both can be active independently |
| **R7** | Phase 4 pop-out breaks if multiple operators on same tenant — both see the pop-out, both accept simultaneously | Medium | Backend `confirmOrder` is idempotent (per existing dineIn YTC accept flow) — first-write-wins; second op sees the order already confirmed |
| **R8** | Sound alert / continuous notification is annoying / disabled | Medium | Owner provides sound asset + volume control; default off until first interaction (browser audio gating) |
| **R9** | CR-008 D1-Gate behaviour silently changes if predicate refactored | Low | Phase 2 sketch §7.1 explicitly preserves `isPrepaid` axis; reviewer must verify existing tests still pass |
| **R10** | `order_from` field arrives on backend but FE doesn't deploy Phase 1 — silent no-op | Low | Coordinate Phase 1 FE deploy after backend confirms wire shape |

---

## 12. Open questions (must be answered before requirement freeze)

> Status reflects v2 lock — questions whose answers are now locked are marked `LOCKED`. Remaining open items are reduced.

| OQ | Question | Status | Audience |
|---|---|---|---|
| **OQ-1** | Pop-out scope: web delivery orders only, or all web orders (incl. takeaway / dineIn QR-menu)? | **STILL OPEN** — owner default reading (per R-POPOUT-1) is "all web YTC orders". Owner to confirm or scope to delivery-only for v1. | Owner |
| **OQ-2** | Phase 2 value-axis: read from `initialDeliveryCharge` (frozen at mount, recommended) or live `deliveryChargeInput`? | **STILL OPEN** | Owner |
| **OQ-3** | Phase 3 filter shape: Header pill / per-card badge / new Channel column / multiple? Strict `=== 'web'` or broader `!== 'pos'`? | **PARTIALLY LOCKED** — filter PRESENCE locked (R-FILTER-2), badge PRESENCE locked (R-FILTER-8), strictness locked to `=== 'web'` (R-FILTER-9). Only the precise UI shape (pill set vs single toggle) remains owner-pickable. | Owner |
| **OQ-4** | Pop-out multi-stack handling: sequential one-at-a-time, stacked cards, or expandable list? Dismissible at all? Re-pop policy? | **PARTIALLY LOCKED** — sequential one-at-a-time is locked default (R-POPOUT-8). No-dismiss is locked default (R-POPOUT-4). Owner may explicitly override. | Owner |
| **OQ-5** | Audible alert: required? Sound asset? Volume control? Auto-disable after first action? | **STILL OPEN** — R-POPOUT-3 only locks the visual auto-appear, not audio. | Owner |
| **OQ-6** | Should `confirmOrder`'s existing payload (`order_status: 'paid'` per `confirmOrder(...)` default) work for web orders, or does backend need a different status for web-acceptance? | **STILL OPEN** — affects R-POPOUT-5 wire-shape | Backend |
| **OQ-7** | Does `order_from` ship on `single-order-new` and `employee-orders-list` endpoints today? If not, ETA for echo? | **STILL OPEN — load-bearing** (BE-OF1 / BE-OF2) | Backend |
| **OQ-8** | Exact value-set + casing for `order_from`. | **STILL OPEN — load-bearing** (BE-OF3) | Backend |
| **OQ-9** | Aggregator origin tag (Swiggy/Zomato) — does it use `order_from` or solely `order_in`? | **STILL OPEN** — affects R-FILTER-9 behaviour over time | Backend |
| **OQ-10** | If multi-operator tenant, does `confirmOrder` race-protect (idempotent first-wins)? | **STILL OPEN** — affects R-POPOUT-5/7 reliability | Backend |
| **OQ-11** | (NEW v2) Does `order_from === 'web'` ALWAYS arrive in tandem with `f_order_status === 7` for scan-originated YTC orders, OR can a scan order momentarily ship with a different status enum on the first wire frame and only become YTC after a follow-up socket? | **STILL OPEN — load-bearing for R-POPOUT** (BE-OF4) | Backend |
| **OQ-12** | (NEW v2) Pop-out hint visibility on small viewports — confirm tablet (< 1024 px) → full-screen overlay (per R-POPOUT-4) is acceptable, OR should it become a sticky banner on small screens to preserve background visibility? | **STILL OPEN** | Owner |

---

## 13. Recommended implementation sequence

> Strict: each phase ships independently. No phase depends on a later phase.

### Phase 1 — Map `order_from` safely (minimal, foundational)
- **Files touched:** `api/transforms/orderTransform.js` (1-line addition at L191; sketch §5.2)
- **Behaviour change:** None observable — just exposes the field on the live order model.
- **Approval gate:** Backend confirmation (BE-OF1, BE-OF2, BE-OF3).
- **Effort:** ~30 min FE + lint.
- **Test surface:** None (pure additive transform).
- **Rollback:** 1-line removal.

### Phase 2 — Delivery-charge lock for `order_from === 'web' + dc > 0`
- **Files touched:** `components/order-entry/CollectPaymentPanel.jsx` (predicate at L917; title text), `components/order-entry/OrderEntry.jsx` (new derivation alongside `isPrepaid` at L653-654; pass new prop at L1178). Plus 1 comment update.
- **Behaviour change:** New lock fires on web orders with persisted `dc>0`. CR-008 D1-Gate `isPrepaid` lock untouched. Truth-table §7.3.
- **Approval gates:** Phase 1 done. Owner answers OQ-2.
- **Effort:** ~1 hr FE + manual smoke test + 1 unit test (new predicate).
- **Test surface:** Existing CR-008 tests must still pass; new test for the 4 truth-table quadrants.
- **Rollback:** Revert ~3 lines.

### Phase 3 — Dashboard web-order filter + per-card badge **(LOCKED scope per R-FILTER-1..10)**
- **Files touched:** `components/layout/Header.jsx` (new pill set or toggle per OQ-3), `pages/DashboardPage.jsx` (filter integration at L713-770 channel-view + L861-880 status-view, AND-composed with existing channel/status filters per R-FILTER-7), `components/cards/OrderCard.jsx` + `components/cards/TableCard.jsx` (origin badge per R-FILTER-8 — always visible when `orderFrom === 'web'`, independent of filter state).
- **Behaviour change:** New "Web / Scan & Order" filter (defaulting OFF — All Orders is default per R-FILTER-1). Per-card badge always-on for web rows. Strict `=== 'web'`; missing/null excluded (R-FILTER-5); aggregator excluded by default (R-FILTER-9). Composes alongside Dine-In/Take-Away/Delivery/Room channel filters (R-FILTER-6, R-FILTER-7).
- **Approval gates:** Phase 1 done. Owner answers OQ-3 (UI shape only — pill set vs single toggle). Backend confirms BE-OF1, BE-OF2 (R-FILTER-10).
- **Effort:** ~3-4 hr FE + smoke test. No backend dependency beyond Phase 1.
- **Test surface:** Filter affects only display; underlying data unchanged. Verify badge persistence across filter states. Verify AND-composition with channel + status filters.
- **Rollback:** Revert pill + badge components.

### Phase 4 — Unconfirmed Scan & Order pop-out **(LOCKED scope per R-POPOUT-1..10)**
- **Files touched:** New `components/dashboard/ScanOrderPopOut.jsx` (≥ 50% desktop / full-screen tablet overlay with high z-index per R-POPOUT-4); `pages/DashboardPage.jsx` to mount it; possibly `contexts/OrderContext.jsx` if a derived `unconfirmedWebOrders` selector helps. Reuses existing `confirmOrder` endpoint at `orderService.js:62-66` (R-POPOUT-5) and existing reject path (R-POPOUT-6).
- **Behaviour change:** Pop-out overlay with predicate `orderFrom === 'web' && fOrderStatus === 7` (R-POPOUT-1). Auto-appears on initial load + on socket arrival (R-POPOUT-3). Sequential one-at-a-time queue with "Order N of M" indicator (R-POPOUT-8). No dismiss button (R-POPOUT-4). Auto-dismisses post-confirm (R-POPOUT-7). No effect on POS YTC orders (R-POPOUT-9).
- **Approval gates:** Phase 1 done. Owner answers OQ-1 (delivery-only vs all web), OQ-4 (sequential vs other — locked default but overridable), OQ-5 (audible alert), OQ-12 (small-viewport behaviour). Backend answers BE-OF4 (web orders reliably tagged on socket refresh — R-POPOUT-10), OQ-6 (confirm payload), OQ-10 (multi-operator race).
- **Effort:** ~1.5-2 days FE + heavier QA (multi-stack, race conditions, audio gating if R-POPOUT audio added per OQ-5).
- **Test surface:** Multi-operator race; queue ordering; accept/reject round-trip via socket; audio play/auto-disable; tablet vs desktop overlay sizing; no spurious pop-out for POS YTC.
- **Rollback:** Unmount the component; no backend change required.

### Phase ordering rationale (unchanged from v1)

1. Phase 1 unblocks Phases 2-4 with one tiny FE change. Ship first.
2. Phase 2 is the most narrowly-scoped business change — fastest user-visible win.
3. Phase 3 is medium; **locked-scope** but not urgent vs Phase 4.
4. Phase 4 is largest and most QA-heavy; **locked-scope**; ship last so earlier phases stabilise first.

---

## 14. Final recommendation

```yaml
verdict: needs_backend_payload_confirmation + needs_business_confirmation
revision: v2 (2026-05-07)

scope_locked:
  - R-POPOUT-1..10 (Web Yet-to-Confirm Pop-out is now a hard requirement)
  - R-FILTER-1..10 (Dashboard order_from filter / toggle is now a hard requirement)
  - Both share the same Phase 1 backend prerequisite

rationale:
  - Implementation_blocked_until:
      - BE-OF1 (order_from on single-order-new)
      - BE-OF2 (order_from on employee-orders-list)
      - BE-OF3 (canonical values + casing)
      - BE-OF4 (order_from = 'web' arrives on the same payload as f_order_status = 7
                for scan YTC orders) — load-bearing for R-POPOUT
  - Business_decisions_blocked_until:
      - OQ-1 (pop-out scope: delivery-only or all web YTC?) — owner reading is "all web"
      - OQ-2 (Phase 2 value-axis read source)
      - OQ-3 (filter UI shape only — presence is locked)
      - OQ-5 (audible alert presence + sound asset)
      - OQ-12 (small-viewport pop-out behaviour)

phase_status_v2:
  Phase_1_FE_change: 1 line at orderTransform.js:191 — ready the moment backend
                     confirms wire shape (BE-OF1..BE-OF3).
  Phase_2_FE_change: ~3 lines (additive predicate + readOnly union + title)
                     once OQ-2 answered. CR-008 D1-Gate untouched.
  Phase_3: LOCKED-SCOPE — filter pill/toggle + per-card badge per R-FILTER-1..10.
           UI shape (pill set vs single toggle) is the only owner pickable.
           Estimated 3-4 hr FE.
  Phase_4: LOCKED-SCOPE — pop-out overlay per R-POPOUT-1..10. Sequential queue
           default, no dismiss, ≥50% desktop / full-screen tablet, reuses
           confirmOrder endpoint. Estimated 1.5-2 days FE.

ytc_status_key_verified: yes (triple-source FE evidence at api/constants.js:140,
                              153, 162, 175 + Header.jsx:20 + OrderCard.jsx:176
                              + TableCard.jsx:59, 484 + StatusConfigPage.jsx:98).
                              Backend BE-OF4 still required for the cross-check
                              that web YTC orders carry both keys on the same
                              wire frame.

gating_artifacts_required:
  - One redacted backend payload of a Scan & Order delivery order in YTC state
    (owner offered)
  - One screenshot of the affected Collect Bill screen on a Scan & Order
  - Backend reply on BE-OF1 + BE-OF2 + BE-OF3 + BE-OF4
  - Owner reply on OQ-1, OQ-2, OQ-3 (UI shape), OQ-5, OQ-12

next_agent_invocation:
  - Backend Contract Agent — to raise BE-OF1..BE-OF6 with backend lead
  - Owner Decision Sheet — to capture OQ-1, OQ-2, OQ-3, OQ-5, OQ-12
  - After both: this CR moves to ready_for_requirement_freeze and a
    new CR Planning Agent can author the implementation plan
    (impact_analysis is already documented here).

what_NOT_to_change:
  - CR-008 D1-Gate isPrepaid behaviour stays identical (see §2.3, §7.2)
  - Existing payment / settlement / channel-routing / socket-handling
    untouched until phase-specific code edit
  - No /app/memory/final/ edit
  - No tracker rewrite
  - Per-card YTC accept flow on POS-origin dineIn / takeAway / delivery
    orders unchanged (R-POPOUT-9)
```

---

## 15. Strict-rules compliance certification

| Rule | Status |
|---|---|
| No implementation | ✅ |
| No source edits | ✅ |
| No QA / tests run | ✅ |
| No tracker rewrite | ✅ — only this analysis doc created |
| No `/app/memory/final/*` touched | ✅ |
| No code pulled / branch switched | ✅ |
| CR-008 D1-Gate behaviour preserved by design | ✅ — sketch additive (`||`), not replacement |
| `isPrepaid` not reused for origin logic | ✅ — new predicate `isWebOrigin` proposed |
| Stop after creating analysis | ✅ |

---

— End of POS2-002 CR Impact Analysis 2026-05-07 —

---

## 16. Baseline Reconciliation Addendum (2026-05-07 v3)

> **Type:** Read-only reconciliation pass. NO `/app/memory/final/` edits, NO code edits, NO implementation, NO QA. Appends to the v2 analysis above.
> **Agent:** Baseline Reconciliation Agent (POS2-002 addendum)
> **Date:** 2026-05-07
> **Predecessor:** v2 verdict above (`needs_backend_payload_confirmation + needs_business_confirmation`).
> **Goal:** Identify which of the v2 open questions are already answered by `/app/memory/final/` baseline or by the accepted overlay docs, so the requirement-freeze decision is anchored on baseline truth, not invented policy.

### 16.1 Mandatory reading order followed

1. `/app/memory/final/` (baseline)
2. Current overlay docs (accepted)
3. CR-specific docs
4. Code

### 16.2 Baseline files read

| # | File | Why read |
|---|---|---|
| B-1 | `/app/memory/final/FINAL_DOCS_APPROVAL_STATUS.md` | Mandatory reading-order entry point + open-decision register |
| B-2 | `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md` | Confirm rules FA-01..05, API-01..07, SM-01..07, EH-01..05, EP-01..05 — search for `order_from`, `web`, `scan`, `YTC`, `f_order_status`, `delivery_charge`, `D1-Gate`, channel gate, dashboard filter |
| B-3 | `/app/memory/final/MODULE_DECISIONS_FINAL.md` | Confirm Module 3 (Dashboard), Module 4 (OrderEntry / Cart / Payment), Module 7 (Realtime Socket), Module 13 (Tables & Orders Runtime) responsibilities |
| B-4 | `/app/memory/final/CHANGE_REQUEST_PLAYBOOK.md` | Mandatory pre-coding workflow |
| B-5 | `/app/memory/final/IMPLEMENTATION_AGENT_RULES.md` | Pre-coding rules + approval gate format |
| B-6 | `/app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md` | Confirm OQ-01..OQ-12 — none of OQ-01..OQ-12 cover `order_from`, web/scan order origin, YTC pop-out, dashboard origin filter, or delivery-charge editability axis |
| B-7 | `/app/memory/final/FINAL_DOCS_SUMMARY.md` | Cross-check confirmed architecture/module decisions |

**Search result on baseline (`/app/memory/final/*`):** zero matches for `order_from`, `orderFrom`, `web order`, `scan order`, `Yet to Confirm`, `YTC`, `D1-Gate`, `isPrepaid`, `pop-out`, `dashboard origin filter`. Baseline is intentionally rule-level only (architecture/module/playbook abstraction) and does not catalogue feature-level keys. This is consistent with `BASELINE_RECONCILIATION_REPORT_2026_05_04 §2.1` ("Full-tree grep for sprint-specific keywords … returns zero feature-level matches. The baseline operates purely at the rule/module abstraction.").

### 16.3 Overlay files read

| # | File | Why read |
|---|---|---|
| O-1 | `/app/memory/change_requests/BASELINE_RECONCILIATION_REPORT_2026_05_04.md` | Confirm baseline behaviour for sprint-shipped CR-008 D1-Cap + D1-Gate; confirm SM-03 localStorage scope; confirm FA-03 hotspot list governs DashboardPage / OrderEntry / CollectPaymentPanel |
| O-2 | `/app/memory/change_requests/FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md` | Confirm acceptance status of CR-008 D1-Cap/D1-Gate and current parked items (BE-U / CR-005 Phase A web-order attribution) |
| O-3 | `/app/memory/change_requests/PENDING_TASK_REGISTER_2026_05_04.md` | Confirm BE-U status as `parked_backend_dependency` (CR-005 Phase A web-order attribution) |
| O-4 | `/app/memory/change_requests/PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md` | Confirm `BE-U` is `keep_parked_backend_confirmation_needed` — *"Out of order-logs-report scope; separate endpoint check needed"* (L97, L322) |
| O-5 | `/app/memory/change_requests/BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md` | Backend curl evidence shows `order_from` not observable from `order-logs-report` cohort (L155, L227) — separate endpoint check still required |
| O-6 | `/app/memory/change_requests/CR_008_DELIVERY_AUDIT_DISPATCH_AND_NAVIGATION.md` | Source CR for D1-Cap (Sub-CR #1) + D1 (Sub-CR #4) — establishes that `isPrepaid` is the payment-stage axis, not origin axis |
| O-7 | `/app/memory/change_requests/CR_008_D1_DEFAULT_LANDING_SCREEN_IMPLEMENTATION_SUMMARY.md` | Confirms CR-008 #4 / D1 final scope is post-Collect-Bill stay-on-order toggle only — does NOT touch `order_from` / web origin / YTC pop-out / dashboard origin filter |
| O-8 | `/app/memory/change_requests/LAST_SPRINT_CODE_FIX_VALIDATION_2026_05_06.md` | C30/C31 confirm `readOnly={isPrepaid}` is the `present_in_code` rule on `CollectPaymentPanel.jsx:910-917` |
| O-9 | `/app/memory/change_requests/impact_analysis/F_ORDER_STATUS_8_DASHBOARD_REGRESSION_CHECK.md` | Confirms baseline `f_order_status` numeric mapping at `api/constants.js` lines 133-145, 165, 174-186 — pure numeric; no payment/Razorpay branch |
| O-10 | `/app/memory/change_requests/impact_analysis/DELIVERY_CHARGE_EDITABILITY_BUSINESS_RULE_INVESTIGATION_2026_05_07.md` | Predecessor — establishes that `paymentType === 'prepaid'` is the current FE proxy for "scan/customer-app paid"; canonical detection requires `order_from` exposure |

### 16.4 CR-specific files read

| # | File | Status |
|---|---|---|
| C-1 | `/app/memory/change_requests/impact_analysis/POS2_002_ORDER_FROM_WEB_PIPELINE_CR_IMPACT_ANALYSIS_2026_05_07.md` (this file) | v1 + v2 above — being reconciled |

### 16.5 Code areas inspected (post-doc, per playbook step 4)

| # | Path:line | Purpose | What was confirmed |
|---|---|---|---|
| K-1 | `frontend/src/api/transforms/orderTransform.js:185-220` (fromAPI.order) | Live-order transform | **Zero references to `order_from` / `orderFrom`.** Confirms §5.1 of CR analysis: live-order pipeline does NOT carry origin. `paymentType: api.payment_type \|\| ''` present at L191 (CR analysis cited line) |
| K-2 | `frontend/src/api/services/reportService.js:727-755, 921` | Audit-Report transform | `order_from` IS captured here (`platform: 'pos' \| 'web' \| null`). Audit-only. CR-001 CS-15 explicitly preserves `null` for missing `order_from` for filter use |
| K-3 | `frontend/src/components/order-entry/CollectPaymentPanel.jsx:905-925` | D1-Gate read site | `readOnly={isPrepaid}` confirmed; full comment block confirming "money already collected" intent + value-axis swap from BUG-019 |
| K-4 | `frontend/src/components/order-entry/OrderEntry.jsx:650-660` | `isPrepaid` derivation | `const isPrepaid = orderPaymentType === 'prepaid'` confirmed at L654 (CR analysis cites L653-654; offset by 1 due to comment lines but matches semantics) |
| K-5 | `frontend/src/api/constants.js:135-180` | YTC status key triple-source | `7: 'pending'` in both `F_ORDER_STATUS` (L140) and `F_ORDER_STATUS_API` (L153 in current file = L153 cited); STATUS_COLUMNS[0] = `{ id: 7, fOrderStatus: 7, name: 'Yet to Confirm', key: 'pending' }` (L162-163); `ORDER_TO_TABLE_STATUS.pending = 'yetToConfirm'` (L175) |
| K-6 | `frontend/src/components/layout/Header.jsx:15-35` | Existing channel-view status pills | `allStatusFilters` array uses `{ id: "pending", fOrderStatus: 7, label: "YTC" }` at L20. Pattern matches the `[All]/[POS]/[Web]` pill set proposed in §8.1 option A |
| K-7 | `frontend/src/components/cards/OrderCard.jsx:170-180` | Card-level YTC check | `const isYetToConfirm = order.status === "yetToConfirm" \|\| order.status === "pending"` at L176 — confirms CR analysis §9.2 |

**Net code-vs-doc result:** All seven anchor sites confirm CR analysis claims verbatim. No drift detected.

### 16.6 Question-by-question reconciliation table

Legend:
- `answered_by_baseline` = `/app/memory/final/*` covers it directly
- `answered_by_overlay` = accepted overlay doc covers it
- `code_gap_found` = code differs from doc claim
- `backend_confirmation_needed` = backend payload not yet evidenced
- `still_open_owner` = neither baseline nor overlay decides; owner must
- `still_open_backend` = neither baseline nor overlay decides; backend must
- `owner_override_needed` = baseline/overlay says X; CR proposes ≠X; owner must reconcile

#### A. CR-008 D1-Gate

| # | Question / item | Baseline / overlay answer | Evidence (path + line/section) | Current code behaviour | Status |
|---|---|---|---|---|---|
| A-1 | What is CR-008 D1-Gate? | The lock at `CollectPaymentPanel.jsx:917` whose `readOnly` rule was swapped from BUG-019's `initialDeliveryCharge > 0` to `readOnly={isPrepaid}` (`paymentType === 'prepaid'`) — i.e., a payment-stage gate, not an origin gate. | Overlay: `BASELINE_RECONCILIATION_REPORT_2026_05_04.md §6 row 13` ("Collect Bill override gate / prepaid lock — readOnly prepaid; postpaid editable"); `LAST_SPRINT_CODE_FIX_VALIDATION_2026_05_06.md §C30/C31`; `DELIVERY_CHARGE_EDITABILITY_BUSINESS_RULE_INVESTIGATION_2026_05_07.md §2.1`. Code: `CollectPaymentPanel.jsx:910-917` (comment block + `readOnly={isPrepaid}`). | Matches. Confirmed live at K-3. | **answered_by_overlay** |
| A-2 | Why does `isPrepaid` exist? | Protects against silent bill reduction after money already collected. Replaced BUG-019's value-axis (`initialDeliveryCharge > 0`) because that over-locked POS-punched in-house delivery orders after CR-008 D1-Cap began persisting their charges. New rule ties lock to the actual concern. | Overlay: same files as A-1. Code: `CollectPaymentPanel.jsx:910-916` (comment block verbatim). `OrderEntry.jsx:1175-1177` (sibling comment "scan / customer-app paid"). | Matches. | **answered_by_overlay** |
| A-3 | Does baseline confirm `isPrepaid` is payment-stage logic only? | Baseline `/app/memory/final/*` does **not** name `isPrepaid` (rule-level only). Overlay confirms it explicitly. CR-008 source CR confirms two distinct axes — `isPrepaid` is the payment-stage axis (Sub-CR #1 / D1-Gate); origin axis (`order_from`) was never part of CR-008. | Overlay: `CR_008_DELIVERY_AUDIT_DISPATCH_AND_NAVIGATION.md §4` (Sub-CR #4 stayed scoped to navigation only); `CR_008_D1_DEFAULT_LANDING_SCREEN_IMPLEMENTATION_SUMMARY.md §1` (origin axis NEVER touched). `DELIVERY_CHARGE_EDITABILITY_BUSINESS_RULE_INVESTIGATION_2026_05_07.md §2.2` and §3.1 (caveat: `isPrepaid` is a *proxy* — not isomorphic to origin). | Matches. | **answered_by_overlay** |
| A-4 | Does POS2-002 preserve `isPrepaid` correctly with additive `\|\|`? | CR §7.2 + §7.3 truth-table preserve `isPrepaid` axis as additive (`\|\|`); both axes can co-fire on the same order. Overlay does not contradict. | CR §7.2 ("Existing CR-008 D1-Gate is correct for prepaid orders that arrived through POS … both predicates protect different invariants"); §7.3 truth-table. Sketch never replaces `isPrepaid`. | N/A (proposal only — no code change yet). | **answered_by_overlay** (additive composition is consistent with FA-03 hotspot guardrails — surgical insertion within existing predicate; no rule rewrite) |

#### B. Channel gates

| # | Question / item | Baseline / overlay answer | Evidence (path + line/section) | Current code behaviour | Status |
|---|---|---|---|---|---|
| B-1 | Which keys define dineIn / delivery / takeaway / room / web/scan? | Baseline: Module 3 (Dashboard) + Module 13 (Tables & Orders Runtime) define the dashboard channel rendering surface but do NOT name backend keys. Overlay + CR analysis §3 + code: `order_type` → dineIn / takeaway / delivery; `order_in` (RM/SRM/swiggy/zomato); `table_id` → walkIn detection; `payment_type` → prepaid/postpaid. **No live-pipeline key for web/scan today.** | Baseline: `MODULE_DECISIONS_FINAL.md §3` Module 3 + §13 Module 13. CR §3, §3.1 + code at `orderTransform.js:131-220`. `reportService.js:727-755` for Audit-only `order_from`. | Matches. | **answered_by_overlay + code** (channel keys for non-web flows). For **web/scan** specifically: not on live pipeline → see F-1..F-6 |
| B-2 | Is `order_type` the approved channel gate? | Code is the implementation truth (per FA-05). Baseline does not name `order_type` directly but Module 3 and Module 13 both rely on the existing channel routing. No baseline rule prohibits it; no rule promotes it either. | `MODULE_DECISIONS_FINAL.md §3` (Dashboard renders cards/sections/columns by current channel logic). CR §3 row 1-3. Code at `orderTransform.js:40-58, 136`. | Matches. | **answered_by_overlay + code** |
| B-3 | Is `order_from` already defined anywhere in baseline or overlay? | **Baseline:** No. **Overlay:** Yes — only on the Audit-Report transform (`reportService.js:746-755`, CR-001 CS-15). Treated by overlay as a `parked_backend_dependency` for live-pipeline use (BE-U / CR-005 Phase A web-order attribution). | Overlay: `PENDING_TASK_REGISTER_2026_05_04.md §97, §176, §308` (BE-U status `parked_backend_dependency`); `PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md §97, §322` (`keep_parked_backend_confirmation_needed`); `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md §155, §227` (out of `order-logs-report` scope; separate endpoint check needed); `FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md §128, §203`. CR §4.1 and code at `reportService.js:746-755`. | Audit-only. Live-pipeline absent. | **answered_by_overlay** (defined for Audit) **+ backend_confirmation_needed** (live-pipeline status: parked → unblock requires BE confirmation per BE-OF1/2/3) |
| B-4 | Are there existing rules for aggregator, RM/SRM, or `order_in`? | YES. `order_in` carries channel — `'RM' / 'SRM'` for room/shifted-room; aggregator name (`'swiggy' / 'zomato' / ...`). Module 5 (Rooms) governs RM/SRM lifecycle. Aggregator orders surface via Audit-Report `source` + `aggregator badge`. | Baseline: `MODULE_DECISIONS_FINAL.md §5` (Rooms/cross-cutting). Overlay: CR §3 row 5-7. Code at `orderTransform.js:134, 218`; `reportTransform.js:124, 117-132`. | Matches. | **answered_by_overlay + code** |

#### C. Delivery charge lock rule

| # | Question / item | Baseline / overlay answer | Evidence | Current code behaviour | Status |
|---|---|---|---|---|---|
| C-1 | Does baseline/overlay define when delivery charge can be edited? | YES at the predicate level. Current rule = `readOnly={isPrepaid}`. Editable when `paymentType !== 'prepaid'`; locked when `paymentType === 'prepaid'`. No origin axis exists in current rule. | Overlay: `BASELINE_RECONCILIATION_REPORT_2026_05_04.md §6 row 13`; `LAST_SPRINT_CODE_FIX_VALIDATION_2026_05_06.md C30/C31`; `DELIVERY_CHARGE_EDITABILITY_BUSINESS_RULE_INVESTIGATION_2026_05_07.md §1, §2.1, §3.5` (truth-table comparison). Code at K-3. | Matches. | **answered_by_overlay** |
| C-2 | Does baseline/overlay define web/scan order delivery charge behavior specifically? | NO. Today's rule is origin-agnostic (uses `paymentType` proxy only). DELIVERY_CHARGE_EDITABILITY §1 + §3.5 explicitly tag this as a **gap** vs the user's new business rule. | `DELIVERY_CHARGE_EDITABILITY_BUSINESS_RULE_INVESTIGATION_2026_05_07.md §1.2` ("user's rule scoped to Scan & Order — needs origin axis"). | N/A (gap exists today). | **still_open_owner** (POS2-002 §0 R-COMMON proposes to introduce `order_from === 'web' && delivery_charge > 0 → non-editable`; baseline silent → keep CR rule as proposed) |
| C-3 | If baseline silent, keep POS2-002 rule as proposed (web + dc>0 → non-editable, web + dc=0/null → editable, non-web → unchanged)? | Baseline silent. Overlay (DELIVERY_CHARGE_EDITABILITY §1.2 + §6.1 + §6.3) explicitly recommends additive value-axis on top of existing `isPrepaid`. POS2-002 §7 follows that recommendation precisely. | DELIVERY_CHARGE_EDITABILITY §6.3 ("Combined: §6.1 value axis + §6.2 canonical detection — preserves existing POS-prepaid → locked"). POS2-002 §7.3 truth-table is the same. | N/A. | **answered_by_overlay** (CR rule is consistent with overlay's recommended additive composition) **+ still_open_owner** (OQ-2: value-axis read source — frozen vs live — is a fresh decision not addressed by overlay) |

#### D. Dashboard Web / Scan & Order filter

| # | Question / item | Baseline / overlay answer | Evidence | Current code behaviour | Status |
|---|---|---|---|---|---|
| D-1 | Does baseline/overlay already define dashboard filter patterns? | YES at the pattern level. Header pill set is the established pattern for status filters; channel filters (Dine-In / Take-Away / Delivery / Room) compose AND-wise with status filters. Module 3 governs Dashboard. | Baseline: `MODULE_DECISIONS_FINAL.md §3` ("UI responsibility: sidebar/header, cards/sections/columns, search/filter/view mode"). Code at `Header.jsx:18-28` (`allStatusFilters` pill set); `DashboardPage.jsx:713-770` (channel-view) + `:861-880` (status-view). CR §8.1. | Matches. | **answered_by_overlay + code** (filter mechanics established) |
| D-2 | Does it define whether order-origin filter should be pill, toggle, tab, or badge? | NO. No baseline or overlay doc specifies a UI shape for an `order_from`-driven filter. The Header pill pattern is a precedent, not a mandate. Per-card badges exist for prepaid (`OrderCard.jsx:329`, `TableCard.jsx:244`) — also a precedent, not a mandate. | Searched all overlay docs; no `order_from` filter UI specification found. CR-005 Phase A web-order attribution (BE-U) is parked at the field level only — no FE UI design exists. | N/A. | **still_open_owner** (POS2-002 OQ-3 is the natural place; CR locks PRESENCE per R-FILTER-2/8 but UI shape is owner-pickable) |
| D-3 | Does it define filter composition with channel/status filters? | YES at the pattern level. Existing channel + status filters are AND-composed. POS2-002 R-FILTER-7 follows the same pattern. | Code at `DashboardPage.jsx:713-770` (`statusMatchesFilter`-equivalent + channel-view filter functions). CR §8 + §13 Phase 3 acceptance. | Matches. | **answered_by_overlay + code** (composition pattern is established; CR follows it) |
| D-4 | If baseline silent, keep POS2-002 locked requirement (dedicated Web filter + always-on badge)? | Baseline silent on this exact filter. Per FA-04 (route map / panel rules) + Module 3 ("filter/view mode" UI responsibility), introducing a new filter does not violate any baseline rule provided the filter is implemented inside Module 3 boundaries (Dashboard) and does not bleed into Module 4 (OrderEntry) or beyond. | `ARCHITECTURE_DECISIONS_FINAL.md FA-04`; `MODULE_DECISIONS_FINAL.md §3 Dashboard module change rules`. | N/A. | **answered_by_baseline** (no rule conflict — keep CR R-FILTER-1..10 as locked-scope) **+ still_open_owner** (OQ-3 UI shape — pill set vs single toggle — owner pickable) |

#### E. Web Yet-to-Confirm pop-out

| # | Question / item | Baseline / overlay answer | Evidence | Current code behaviour | Status |
|---|---|---|---|---|---|
| E-1 | Does baseline/overlay define Yet-to-Confirm status? | YES — code is the canonical source. FE constants pin `'pending'` (lifecycle key) ↔ `'yetToConfirm'` (status name). Triple-source verified (constants + Header + OrderCard + TableCard + StatusConfigPage). Baseline `/app/memory/final/*` does not name YTC explicitly (rule-level only) but SM-07 declares `f_order_status` is the source-of-truth for table status. | Baseline: `ARCHITECTURE_DECISIONS_FINAL.md SM-07` ("Table status is derived from order-socket `f_order_status`"). Code: K-5, K-6, K-7. CR §9.2 triple-source table. | Matches. | **answered_by_baseline (SM-07 anchor) + answered_by_code (numeric mapping)** |
| E-2 | Confirm whether `f_order_status === 7` is baseline-backed, code-backed, or still unverified | **Code-backed at canonical-mapping level** (`api/constants.js:140, 153, 162, 175`); **overlay-confirmed** (multi-CR docs cite `f_order_status === 7` as YTC); **baseline** does not pin status #7 specifically — it pins the *source* (`f_order_status`) only via SM-07. | Code at K-5; CR §9.2; overlay: `F_ORDER_STATUS_8_DASHBOARD_REGRESSION_CHECK.md §44` confirms numeric mapping is baseline ("Pure numeric mapping — no payment/Razorpay branch"). | Matches. | **answered_by_overlay + answered_by_code**. **Backend cross-check** (BE-OF4) is still required to confirm that scan-originated YTC orders ALWAYS arrive on the wire with `f_order_status === 7` AND `order_from === 'web'` on the same payload — that part is **backend_confirmation_needed** |
| E-3 | Does baseline/overlay define whether web YTC pop-out applies to all web YTC orders or only delivery YTC orders? | **NO.** No baseline or overlay doc defines a web YTC pop-out feature at all. CR §9.7 OQ-1 captures this as still-owner. | Searched overlay; no pop-out scope decision exists. | N/A (feature does not exist today). | **still_open_owner** (OQ-1) |
| E-4 | Does baseline/overlay define dashboard pop-out / attention behavior? | **NO.** No baseline/overlay doc defines pop-out / overlay / banner-style attention surfaces. Module 3 governs dashboard UI but does not enumerate pop-out behaviour. | Searched all overlay docs and `/app/memory/final/*`; zero matches for `pop-out`, `popup overlay`, `attention banner`. | N/A. | **still_open_owner** (R-POPOUT-3, R-POPOUT-4, R-POPOUT-7, R-POPOUT-8 all locked-default in CR but owner-overridable; no baseline/overlay precedent to inherit) |
| E-5 | Does baseline/overlay define sound / buzzer behavior for scan/web orders? | **NO.** Module 8 (Notifications & Firebase) covers banner/ringer behaviour for push notifications, but no baseline/overlay rule binds an audio cue to the dashboard UI for unconfirmed web orders. | Baseline: `MODULE_DECISIONS_FINAL.md §8` (Notifications module — banner/ringer behaviour, sound-enabled flag). No mention of pop-out audio. CR §9.5 + OQ-5. | N/A. | **still_open_owner** (OQ-5) |
| E-6 | Does baseline/overlay define small viewport behavior? | **NO.** No baseline/overlay rule for tablet vs desktop pop-out behaviour. | Searched all docs. | N/A. | **still_open_owner** (OQ-12) |
| E-7 | If baseline silent, keep these as `still_open_owner`? | Yes per the rule. | — | — | **Confirmed**: E-3, E-4, E-5, E-6 all `still_open_owner`. POS2-002 v2 already correctly classifies them. |

#### F. Backend payload dependency

| # | Question / item | Baseline / overlay answer | Evidence | Current state | Status |
|---|---|---|---|---|---|
| F-1 | Does `order_from` exist on `employee-orders-list` (BE-OF2)? | **Unknown.** Overlay confirms BE-U / CR-005 Phase A web-order attribution is parked; the `order-logs-report` curl cohort (Bean Me Up tenant 742, 13 rows) was used for the May-2026 unpark attempt and did NOT cover this endpoint — out of scope per `BACKEND_FIELD_UNPARK_DECISION §155, §227`. | Overlay: `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md §155, §227`; `PENDING_WORK_BUCKETING §97, §322`; `PENDING_TASK_REGISTER §97, §176, §308`. CR §4.1 + §10.1 BE-OF2. | Not observed. | **backend_confirmation_needed** |
| F-2 | Does `order_from` exist on `single-order-new` (BE-OF1)? | **Unknown.** Same parked-status reasoning as F-1. Owner offered to share a redacted Scan & Order delivery payload to lock this. | Same overlay refs. CR §4.1 + §10.1 BE-OF1. | Not observed. | **backend_confirmation_needed** |
| F-3 | Does `order_from` exist on `scan-new-order` socket payload? | **Unknown — inherited.** Socket event itself only carries `order_id`; full data comes from `single-order-new` API fetch (`socketHandlers.js:428-447` `handleScanNewOrder` → `fetchSingleOrderForSocket`). So this is gated by F-2 (BE-OF1). | Code: `socketHandlers.js:428-447`. CR §4.1 row 3. | Not observed independently. | **backend_confirmation_needed** (gated by F-2) |
| F-4 | Does `order_from` exist on `update-order` socket payload? | **Unknown — inherited.** Same fetch path through `single-order-new`. | Code: `socketHandlers.js:222`. CR §4.1 row 4. | Not observed. | **backend_confirmation_needed** (gated by F-2) |
| F-5 | Does `order_from` exist on `update-order-paid` socket payload? | **Unknown — inherited.** Same fetch path. | Code: `socketHandlers.js` (handleUpdateOrderStatus-family). CR §4.1 row 5. | Not observed. | **backend_confirmation_needed** (gated by F-2) |
| F-6 | Does `order_from` exist on `delivery-assign-order` socket payload? | **Unknown — inherited.** Same fetch path (`socketHandlers.js:454`). | Code: `socketHandlers.js:451-463`. CR §4.1 row 6. | Not observed. | **backend_confirmation_needed** (gated by F-2) |
| F-7 | Should the CR assume backend sends `order_from`? | **NO** per the rule. POS2-002 v2 does not assume — Phase 1 is explicitly gated on BE-OF1/2/3 (and BE-OF4 for the wire co-arrival check). | CR §1.2 ("Implementation NOT safe yet"); §10.1 BE-OF1..6. | — | **Confirmed**: rule respected by CR; status remains `backend_confirmation_needed` until backend reply lands |

### 16.7 Revised open questions list (post-reconciliation)

Questions whose answers are now anchored by baseline/overlay are downgraded; those that remain genuinely open are kept.

| OQ | Original question | Pre-reconciliation status (v2) | Post-reconciliation status (v3) | Reason for change |
|---|---|---|---|---|
| OQ-1 | Pop-out scope: web delivery only or all web YTC? | STILL OPEN (Owner) | **still_open_owner** | No baseline/overlay precedent; owner default reading is "all web" but explicit confirmation needed |
| OQ-2 | Phase 2 value-axis: frozen `initialDeliveryCharge` or live `deliveryChargeInput`? | STILL OPEN (Owner) | **still_open_owner** | DELIVERY_CHARGE_EDITABILITY §6.1 recommends frozen but owner pick required |
| OQ-3 | Phase 3 filter shape (pill vs toggle vs badge vs new column) | PARTIALLY LOCKED | **answered_by_overlay (presence + composition pattern locked) + still_open_owner (UI shape)** | Header pill pattern + AND-composition with channel/status filters are pre-existing precedents. Only the binary "pill set vs single toggle" choice remains owner-pickable per CR §0 R-FILTER-2 |
| OQ-4 | Pop-out multi-stack handling (sequential / stacked / list / dismiss / re-pop) | PARTIALLY LOCKED | **still_open_owner** | Locked-default sequential + no-dismiss in CR §0 R-POPOUT-4/8 stand; owner may override. No baseline/overlay precedent to inherit — keep as still_open_owner with locked defaults |
| OQ-5 | Audible alert: required? Sound asset? Volume? | STILL OPEN (Owner) | **still_open_owner** | Module 8 covers Firebase notifications but does not bind audio to dashboard pop-out |
| OQ-6 | `confirmOrder` payload — does the existing `order_status: 'paid'` default work for web orders? | STILL OPEN (Backend) | **still_open_backend** | No overlay evidence on this specific behaviour. R-POPOUT-5 reuse of existing endpoint stands |
| OQ-7 | Does `order_from` ship on `single-order-new` + `employee-orders-list`? | STILL OPEN (Backend) — load-bearing | **backend_confirmation_needed (load-bearing)** | Overlay confirms BE-U / CR-005 Phase A is parked; BE-OF1/2 still require backend reply |
| OQ-8 | Exact value-set + casing for `order_from` | STILL OPEN (Backend) — load-bearing | **backend_confirmation_needed (load-bearing)** | Overlay confirms Audit-side values `'pos' / 'web' / null` (lowercased) but does not pin live-pipeline values; BE-OF3 required |
| OQ-9 | Aggregator origin tag (Swiggy/Zomato): does it use `order_from` or solely `order_in`? | STILL OPEN | **still_open_backend** | No overlay evidence; affects R-FILTER-9 default (strict `=== 'web'`) |
| OQ-10 | Multi-operator `confirmOrder` race-protection (idempotent first-wins) | STILL OPEN (Backend) | **still_open_backend** | No overlay evidence; affects R-POPOUT-7 reliability |
| OQ-11 | Does `order_from === 'web'` ALWAYS arrive in tandem with `f_order_status === 7` for scan YTC? | STILL OPEN (Backend) — load-bearing | **backend_confirmation_needed (load-bearing)** | BE-OF4 — no overlay evidence; load-bearing for R-POPOUT |
| OQ-12 | Pop-out small-viewport behaviour (full-screen tablet vs sticky banner) | STILL OPEN (Owner) | **still_open_owner** | No baseline/overlay rule for viewport behaviour |

#### Questions that were already closed by baseline/overlay (no need to ask owner)

The following items in the original POS2-002 v2 doc framing implicitly relied on owner clarification but are in fact **already settled**. They do **not** need an owner reply.

| Item | Baseline/overlay answer | Evidence |
|---|---|---|
| Whether to keep CR-008 D1-Gate `isPrepaid` untouched | **Yes — keep untouched.** Overlay protects this rule. POS2-002 §7.2 already preserves it. | A-3, A-4 above |
| Whether the new lock should be additive (`\|\|`) or replace `isPrepaid` | **Additive.** DELIVERY_CHARGE_EDITABILITY §6.3 explicitly recommends additive composition. POS2-002 §7.2 follows. | A-4 above; DELIVERY_CHARGE_EDITABILITY §6.3 |
| Whether channel-view filter / status-view filter mechanics need a new pattern | **No.** Existing AND-composition pattern at `DashboardPage.jsx:713-770` + `:861-880` is the established pattern. POS2-002 R-FILTER-7 follows. | D-3 above |
| Whether YTC = `f_order_status === 7` is verified | **Verified by code triple-source + overlay**. Backend cross-check (BE-OF4) still required for the *co-arrival* of `order_from === 'web'` + `f_order_status === 7` on the same wire frame. | E-1, E-2 above |

### 16.8 Revised final verdict (post-reconciliation)

```yaml
verdict: needs_backend_payload_confirmation + needs_business_confirmation
revision: v3 (2026-05-07 — post-baseline-reconciliation)
unchanged_from_v2: yes — reconciliation did NOT change the verdict; it
                   only narrowed the open-question set and anchored the
                   remaining questions to baseline/overlay where possible

genuinely_open_for_owner:
  - OQ-1  (pop-out scope: delivery-only or all web YTC)
  - OQ-2  (Phase 2 value-axis read source — frozen vs live)
  - OQ-3  (Phase 3 filter UI shape only — pill set vs single toggle)
  - OQ-4  (Pop-out multi-stack handling — overrides locked defaults if any)
  - OQ-5  (Audible alert presence + sound asset + volume)
  - OQ-12 (Pop-out small-viewport behaviour)

genuinely_open_for_backend:
  - BE-OF1 (order_from on single-order-new) — load-bearing
  - BE-OF2 (order_from on employee-orders-list) — load-bearing
  - BE-OF3 (canonical values + casing) — load-bearing
  - BE-OF4 (order_from='web' co-arrives with f_order_status=7
            on scan YTC payloads) — load-bearing for R-POPOUT
  - OQ-6   (confirmOrder payload for web orders)
  - OQ-9   (aggregator origin tag)
  - OQ-10  (confirmOrder multi-operator race protection)

answered_by_baseline_or_overlay:
  - CR-008 D1-Gate semantics (preserve `isPrepaid` axis untouched, additive composition)
  - Channel-gate keys for non-web flows (order_type, order_in, table_id)
  - Existing dashboard filter mechanics + AND-composition pattern
  - YTC numeric mapping (f_order_status === 7 ↔ 'pending' ↔ 'yetToConfirm') —
    code-backed + overlay-confirmed; baseline anchors the SOURCE
    (f_order_status via SM-07) only
  - Audit-side `order_from` capture (reportService.js:746-755)
  - BE-U / CR-005 Phase A parked status — confirms live-pipeline
    `order_from` is awaiting backend echo

freeze_eligibility:
  current: NO — verdict still needs_backend_payload_confirmation
              + needs_business_confirmation
  reason:  4 backend confirmations + 6 owner clarifications still required
  unblock: single backend reply addressing BE-OF1..BE-OF4 + OQ-6/9/10 +
           single owner sheet on OQ-1/2/3/4/5/12

what_NOT_to_change_post_reconciliation:
  - /app/memory/final/* (untouched per strict rules)
  - any source code (untouched)
  - CR-008 D1-Gate isPrepaid behaviour (preserved)
  - existing dashboard channel/status filters (preserved)
  - existing per-card YTC accept flow on POS-origin orders (preserved per
    POS2-002 R-POPOUT-9)

next_agent_invocation:
  1. Backend Contract Agent — single email to backend lead covering
     BE-OF1, BE-OF2, BE-OF3, BE-OF4, OQ-6, OQ-9, OQ-10
  2. Owner Decision Sheet — single set of questions covering
     OQ-1, OQ-2, OQ-3, OQ-4, OQ-5, OQ-12
  3. After both replies land → POS2-002 moves to ready_for_requirement_freeze
     and the CR Planning Agent can author the implementation plan
```

### 16.9 Reconciliation deltas vs v2

| # | v2 framing | v3 framing | Why |
|---|---|---|---|
| Δ-1 | "needs_business_confirmation" treated 12 questions equally | Reduced to 6 owner questions; 6 dropped or anchored to baseline/overlay | OQ-3 partially locked by Header pill precedent; OQ-4 partially locked by R-POPOUT-4/8 defaults; A-1..A-4 (D1-Gate semantics) all answered by overlay; D-1 / D-3 (filter mechanics + composition) answered by overlay |
| Δ-2 | Phase 2 lock predicate sketched as new from scratch | Confirmed as additive composition — overlay (DELIVERY_CHARGE_EDITABILITY §6.3) explicitly recommends this exact shape | Reduces requirement-freeze risk: the additive-`\|\|` is not a fresh design call but a precedented pattern |
| Δ-3 | YTC status #7 phrased as "still unverified" | Phrased as "verified by code triple-source + overlay; backend cross-check (BE-OF4) only required for *co-arrival* on the same wire frame" | Narrows the backend ask: BE-OF4 is the only load-bearing gap; the FE-side mapping is fully canonical |
| Δ-4 | Backend BE-OF1/2/3/4 framed as 4 separate asks | Confirmed as a single email anchored on the existing BE-U / CR-005 Phase A parked context | Saves a backend round-trip; aligns with overlay's "single ask, multiple surfaces" pattern |

### 16.10 Strict-rules compliance certification (this addendum)

| Rule | Status |
|---|---|
| `/app/memory/final/*` not edited | ✅ |
| No source code edited | ✅ |
| No implementation | ✅ |
| No QA / tests run | ✅ |
| No tracker rewrite (only this addendum appended) | ✅ |
| No baseline silently overridden | ✅ — every CR claim is anchored to baseline/overlay/code with file:line evidence |
| No invented behaviour where baseline silent | ✅ — silent areas explicitly tagged `still_open_owner` / `still_open_backend` / `backend_confirmation_needed` |
| No question already answered by baseline/overlay re-asked of owner | ✅ — Δ-1 above narrows the owner-question set accordingly |
| CR-008 D1-Gate behaviour preserved | ✅ — A-1..A-4 confirm |
| Stop after creating reconciliation addendum | ✅ |

---

— End of Baseline Reconciliation Addendum (POS2-002 v3 · 2026-05-07) —

---

## 17. Socket-First Clarification + Owner Decisions Addendum (2026-05-07 v4)

> **Type:** Read-only architecture re-anchoring + owner-decision capture. NO `/app/memory/final/` edits, NO code edits, NO implementation, NO QA. Appends to v3 above.
> **Agent:** CR Analysis Only Agent (POS2-002 v4 addendum)
> **Date:** 2026-05-07
> **Trigger:** Owner-supplied live socket evidence + clarified architecture rule that the dashboard/order live pipeline is **socket-first**, not API-first. Owner also locked OQ-1, OQ-2, OQ-3, OQ-4, OQ-5, OQ-12.

### 17.1 Architecture re-anchoring — socket-first

**Owner-stated rule:** Live incoming orders are not primarily driven by API. API checks are secondary/fallback/reload/re-engage only when code proves they are used for those cases.

**Code-verified picture (post-recheck on `socketHandlers.js`):**

| Socket event | Handler | Wire shape | Data source | Primary or fallback? |
|---|---|---|---|---|
| `new-order` | `handleNewOrder` (L146-198) | `[event, order_id, restaurant_id, f_order_status, { orders: [...] }, { table_info: {...} }]` | **Complete 51-key socket payload** transformed in-handler at L180 (`orderFromAPI.order(apiOrder)`). Comment at L142: *"NEW (April 2026): Socket now includes complete order data (51 keys) and table_info — No GET API call needed for enrichment"*. | **Socket-first primary** |
| `update-order` | `handleOrderDataEvent` (L221-298) via `handleUpdateOrder` (L204-207) | `[event, order_id, restaurant_id, f_order_status, { orders: [...] }]` | Complete socket payload at L241 (`orderFromAPI.order(payload.orders[0])`). Comment at L233: *"v2 only, no GET fallback"*. If payload missing → ERROR + return (no API fallback). | **Socket-first primary, no API fallback** |
| `update-order-target` | `handleOrderDataEvent` | Same | Same | **Socket-first primary** |
| `update-order-source` | `handleOrderDataEvent` | Same | Same | **Socket-first primary** |
| `update-order-paid` | `handleOrderDataEvent` | Same | Same | **Socket-first primary** |
| `update-order-status` | `handleUpdateOrderStatus` (L375-420) | `[event, order_id, restaurant_id, f_order_status, { orders: [...] }]` | Complete socket payload at L394 (`orderFromAPI.order(payload.orders[0])`). Comment at L386: *"Use socket payload directly (v2 pattern — no GET API call)"*. | **Socket-first primary, no API fallback** |
| `scan-new-order` | `handleScanNewOrder` (L428-447) | `[event, order_id, restaurant_id, f_order_status]` (4-element) | **Today: socket-trigger + API enrichment** — calls `fetchOrderWithRetry(orderId)` → `fetchSingleOrderForSocket` (POST `single-order-new`). Comment at L424: *"QR code order — Fetch order from API, ADD to OrderContext"*. | **Socket-trigger; today API enriches because socket lacks payload. CR proposal is to add payload to socket so this becomes socket-first too.** |
| `delivery-assign-order` | `handleDeliveryAssignOrder` (L454-473) | `[event, order_id, restaurant_id, rider_id]` | Same fetch helper | **Socket-trigger + API enrichment (today)** |
| `update-food-status` | `handleUpdateFoodStatus` (L317-363) | `[event, order_id, restaurant_id, f_order_status]` | Same fetch helper. Comment at L306-315 calls this a workaround for missing table-socket. | **Socket-trigger + API enrichment (today, workaround)** |

**API surfaces — actual usage in code:**

| API | Callers | Verdict |
|---|---|---|
| `GET /api/v1/vendoremployee/pos/employee-orders-list` (`getRunningOrders`) | `pages/LoadingPage.jsx:322` (bootstrap), `contexts/OrderContext.jsx:37` (`refreshOrders`), `hooks/useRefreshAllData.js:45` (manual refresh), `pages/AllOrdersReportPage.jsx:221` (report), `api/services/reportService.js:1081` (running-order reconciliation in report) | **Bootstrap + reload/refresh + report only.** **NEVER on live socket-driven pipeline.** |
| `POST /api/v2/vendoremployee/order/single-order-new` (`fetchSingleOrderForSocket`) | `socketHandlers.js:89` (used only inside `fetchOrderWithRetry`, called by `handleScanNewOrder`, `handleDeliveryAssignOrder`, `handleUpdateFoodStatus`); `OrderEntry.jsx:2042` (engage on Place+Pay re-fetch) | **Socket-enrichment fallback for the 3 events whose socket payload is still 4-element today; plus one OrderEntry re-engage path.** **Not used as a primary live source for `new-order` / `update-order*` / `update-order-status`.** |

**Net architectural verdict:**
- For `new-order` and the four `update-order*` events: **wire payload IS the source of truth.** No API is called or needed. Field availability for filter / pop-out / lock predicates depends entirely on what the socket payload carries.
- For `scan-new-order`: the 4-element socket frame today is a **trigger only**; field-level state for filter / pop-out / lock comes via `single-order-new` API enrichment. If backend extends the socket frame to include `{ order_from: 'web', ... }` (or the full order), API enrichment becomes redundant for this event too.
- For `employee-orders-list`: a **bootstrap/reload** dependency, not a live-pipeline dependency. It is only relevant when the dashboard is reloaded or refreshed, or when reports run.

### 17.2 v3 backend asks — re-classified socket-first

| Old ID | Old framing (API-first) | New framing (socket-first) | Effect on requirement freeze |
|---|---|---|---|
| **BE-OF1** | `order_from` on `single-order-new` (load-bearing) | **Demoted.** Only relevant for: (i) scan-new-order enrichment until backend ships payload on the socket frame; (ii) the OrderEntry re-engage path on Place+Pay. **Not load-bearing for the live trigger.** | No longer blocks Phase 1 / Phase 4 trigger detection if BE-OF7/8 (below) land. |
| **BE-OF2** | `order_from` on `employee-orders-list` (load-bearing) | **Demoted to bootstrap-only.** Required so that on dashboard reload / refresh, web-origin orders carry `order_from` and the filter + badge + pop-out detector still function on already-running web orders. **Not load-bearing for live new-arrival flow.** | No longer blocks the live pipeline. Still load-bearing for the *post-reload* behaviour (R-FILTER-3..5, R-POPOUT applied to in-progress YTC web orders that were already on the dashboard before refresh). |
| **BE-OF3** | Canonical values + casing for `order_from` | **Unchanged — still load-bearing.** Applies to socket payloads (new-order, update-order*, update-order-status) AND the bootstrap/enrichment APIs. | Still load-bearing. |
| **BE-OF4** | `order_from === 'web'` co-arrives with `f_order_status === 7` for scan YTC | **Restated as socket co-arrival.** Confirm whether the `update-order-status` socket payload (and any `new-order` / `update-order*` payload) carries both keys on the same wire frame, AND whether `scan-new-order` itself can carry `order_from === 'web'` (see BE-OF7). | Still load-bearing for R-POPOUT — but now anchored to socket payloads, not APIs. |
| **(NEW) BE-OF7** | — | **`scan-new-order` socket frame extension.** Confirm whether the current 4-element frame `['scan-new-order', order_id, restaurant_id, f_order_status]` can be extended to include either `{ order_from: 'web' }` as a 5th element, or the full order payload (matching `new-order`'s `{ orders: [...] }` shape). Owner-recommended: the 5th-element flag form, OR full payload if feasible. | **NEW load-bearing.** If granted, scan-new-order becomes socket-first too and BE-OF1 is no longer needed for the trigger path. If declined, FE keeps the existing API-enrichment fallback in `handleScanNewOrder` and BE-OF1 remains needed there. |
| **(NEW) BE-OF8** | — | **Socket payload field guarantees.** For the `update-order-status`, `update-order`, `update-order-target`, `update-order-source`, `update-order-paid`, and `new-order` events, confirm that the `payload.orders[0]` object always carries: `order_from`, `delivery_charge`, `delivery_charge_gst`, `f_order_status`, `order_type`, `payment_type`, `payment_method`, `payment_status`, `delivery_address`. Owner-supplied evidence already shows these fields present on at least one observed socket payload. | **NEW load-bearing.** Replaces the per-API field-echo asks. Once confirmed, the FE transform at `orderTransform.js:191` only needs to map `order_from` once and every socket-driven update will inherit it. |

### 17.3 v3 owner questions — locked

| OQ | v3 status | v4 owner decision | Locked rule |
|---|---|---|---|
| **OQ-1** Pop-out scope | still_open_owner | **All Web / Scan & Order Yet-to-Confirm orders, not only delivery.** | R-POPOUT-1 detection predicate locks to `orderFrom === 'web' && fOrderStatus === 7` (no `orderType` axis). Pop-out fires for web YTC dineIn (QR-menu), takeaway, and delivery alike. POS-origin YTC orders continue to use the existing per-card YTC accept flow (R-POPOUT-9 unchanged). |
| **OQ-2** DC lock value-axis | still_open_owner | **Frozen `initialDeliveryCharge` from the incoming/persisted full order payload when Collect Payment opens.** Do NOT use live `deliveryChargeInput` to dynamically re-lock while cashier is typing. | Phase 2 predicate locks to: `isWebOrderWithCharge = isWebOrigin && Number(initialDeliveryCharge) > 0`. `initialDeliveryCharge` is read at panel-open time (BUG-019 lazy-init lineage) from `orderFinancials.deliveryCharge` first, falling back to local `deliveryCharge` state. No re-evaluation while typing. CR §7 already expressed this as recommended option (a) — now locked. |
| **OQ-3** Filter UI shape | still_open_owner (UI shape only) | **Dashboard header filter / toggle / pill for Web / Scan & Order; default = All Orders; always-on badge on web-origin order cards.** | R-FILTER-1 (default All Orders) preserved. R-FILTER-2 collapses owner's choice to **header pill / toggle** placement (matches CR §8.1 option A). R-FILTER-8 (always-on per-card badge) preserved (matches CR §8.1 option B). No "new Channel column" — option C dropped per owner choice. |
| **OQ-4** Multi-stack handling | partially_locked (sequential default) | **Sequential queue/list. One pop-out at a time with "Order N of M" navigation.** | R-POPOUT-8 sequential one-at-a-time + Next/Previous + "Order N of M" indicator is now hard-locked, not "default-overridable". Stacked-cards and expandable-list options dropped. |
| **OQ-5** Audible alert | still_open_owner | **Reuse existing scan/order buzzer ONLY if it already exists and is safely available. Do NOT add a new sound asset in this CR.** | Phase 4 audio scope is **conditional reuse**: FE inspects whether an existing buzzer asset/util is wired (e.g., via Notifications module / Module 8 banner-ringer behaviour or `NotificationProvider`). If yes → reuse it for the pop-out. If not → no audio in this CR. **Adding a new sound asset is explicitly out of scope.** OQ-5 is downgraded from open to *conditional-on-code-discovery* — see §17.5 for the discovery surface. |
| **OQ-12** Small-viewport behaviour | still_open_owner | **Tablet / small screens (< 1024 px): full-screen modal-style pop-out. Desktop: cover enough dashboard area that the user cannot miss the order (≥ 50% per R-POPOUT-4).** | R-POPOUT-4 reaffirmed. Small-viewport behaviour locked to full-screen modal. No sticky-banner option. |

### 17.4 Phase-by-phase impact of socket-first re-anchoring

| Phase | v3 framing | v4 framing |
|---|---|---|
| **Phase 1** Map `order_from` into live order model | 1-line at `orderTransform.js:191`, gated on BE-OF1 / BE-OF2 / BE-OF3 | **1-line at `orderTransform.js:191` is unchanged.** New gate is BE-OF8 (socket payloads carry the field) + BE-OF3 (canonical values). BE-OF1 / BE-OF2 are no longer load-bearing for the live trigger; BE-OF2 is only required so that the field survives a dashboard reload. |
| **Phase 2** DC lock for web + dc>0 | predicate at `CollectPaymentPanel.jsx:917`, OQ-2 open | **Predicate unchanged. OQ-2 locked: frozen `initialDeliveryCharge`.** Predicate reads from the order object delivered by the socket payload (or from in-memory `OrderContext` orders that arrived via socket). No additional API dependency. |
| **Phase 3** Dashboard filter + per-card badge | header pill OR per-card badge OR new Channel column, OQ-3 partially open | **Header pill/toggle + always-on per-card badge — both locked (OQ-3 closed).** No new Channel column. Strict `=== 'web'` predicate unchanged (R-FILTER-9). |
| **Phase 4** Web YTC pop-out | locked-scope, gated on BE-OF1/2/3/4 + OQ-1/4/5/12 | **Locked-scope unchanged.** Gating reframed: BE-OF3 + BE-OF4 + BE-OF7 + BE-OF8 (all socket-anchored). Owner gates closed: OQ-1 (all web YTC), OQ-4 (sequential), OQ-12 (full-screen on small viewport). OQ-5 downgraded to conditional-on-code-discovery. |

### 17.5 Code-discovery surface for OQ-5 audio reuse

> Per owner decision *"reuse existing scan/order buzzer ONLY if it already exists and is safely available"*, Phase 4 implementation must include a brief code-inspection step (NO change in this CR) to identify whether an existing buzzer/audio surface is reusable.

Candidate inspection sites (NOT inspected exhaustively here — listed for the next agent):
- `/app/frontend/src/contexts/NotificationContext.jsx` — sound-enabled flag per Module 8.
- `/app/frontend/src/components/layout/Header.jsx` — banner/ringer simulation surface per Module 8.
- `/app/frontend/src/utils/` — any audio helpers (`playSound`, `audioCue`, `buzzer`, etc.).
- `/app/frontend/public/` — any `.mp3` / `.wav` / `.ogg` asset already shipped.

**Decision rule for the next planning agent:**
- If a reusable, mounted-and-tested audio surface exists → wire it into Phase 4 with the existing volume/mute controls.
- If only an asset exists but no mounted utility → defer audio to a follow-up CR; ship Phase 4 visual-only.
- If neither exists → defer audio entirely; ship Phase 4 visual-only.

In all three branches, **no new asset is added in this CR** (owner-locked).

### 17.6 Updated open-questions / blocker register

| Item | Audience | Status (v4) | Type |
|---|---|---|---|
| **BE-OF3** Canonical values + casing for `order_from` | Backend | OPEN — load-bearing for all phases | Backend |
| **BE-OF4** Co-arrival of `order_from === 'web'` + `f_order_status === 7` on socket payloads (esp. `update-order-status` for scan YTC) | Backend | OPEN — load-bearing for R-POPOUT | Backend |
| **BE-OF7** (NEW) Extend `scan-new-order` socket frame with `{ order_from: 'web' }` (or full order payload) | Backend | OPEN — load-bearing for R-POPOUT trigger when scan order arrives. Workaround exists: API enrichment via `fetchSingleOrderForSocket` (today's behaviour). | Backend |
| **BE-OF8** (NEW) Confirm `payload.orders[0]` on every order-data socket event always includes `order_from`, `delivery_charge`, `delivery_charge_gst`, `f_order_status`, `order_type`, `payment_type`, `payment_method`, `payment_status`, `delivery_address` | Backend | OPEN — load-bearing for socket-first Phase 1/2/3/4 | Backend |
| **OQ-6** `confirmOrder` payload acceptance for web orders | Backend | OPEN | Backend |
| **OQ-9** Aggregator origin tag (`order_from` vs solely `order_in`) | Backend | OPEN | Backend |
| **OQ-10** `confirmOrder` multi-operator race-protection | Backend | OPEN | Backend |
| **OQ-1** Pop-out scope | Owner | **CLOSED** — all web YTC | — |
| **OQ-2** DC lock value-axis | Owner | **CLOSED** — frozen `initialDeliveryCharge` | — |
| **OQ-3** Filter UI shape | Owner | **CLOSED** — header pill/toggle + per-card badge | — |
| **OQ-4** Multi-stack | Owner | **CLOSED** — sequential, "Order N of M" | — |
| **OQ-5** Audible alert | Owner | **CONDITIONAL** — reuse-only; no new asset | Code-discovery, then drop or wire |
| **OQ-12** Small-viewport | Owner | **CLOSED** — full-screen on tablet | — |
| **BE-OF1** `order_from` on `single-order-new` | Backend | DEMOTED — only relevant for scan-new-order enrichment fallback (today's path) and for OrderEntry re-engage. No longer load-bearing for the live trigger if BE-OF7 lands. | Backend |
| **BE-OF2** `order_from` on `employee-orders-list` | Backend | DEMOTED to bootstrap/reload-only. Required so that filter/badge/pop-out survive a refresh. Not load-bearing for live new-arrival flow. | Backend |

### 17.7 Revised final verdict (v4)

```yaml
verdict: needs_socket_payload_confirmation_only
revision: v4 (2026-05-07 — socket-first re-anchored + owner decisions captured)
delta_vs_v3:
  - Architecture: re-anchored to socket-first per code evidence
    (handleNewOrder / handleOrderDataEvent / handleUpdateOrderStatus all
    use complete socket payload; only handleScanNewOrder /
    handleDeliveryAssignOrder / handleUpdateFoodStatus still call API).
  - Backend asks: BE-OF1 / BE-OF2 demoted from load-bearing; BE-OF7 (scan
    socket payload extension) and BE-OF8 (socket-payload field guarantee)
    added as new load-bearing items.
  - Owner: OQ-1 / OQ-2 / OQ-3 / OQ-4 / OQ-12 LOCKED. OQ-5 downgraded to
    conditional-on-code-discovery.

business_confirmation_status: mostly_resolved
  resolved:
    - OQ-1 (pop-out scope = all web YTC)
    - OQ-2 (DC lock value-axis = frozen initialDeliveryCharge)
    - OQ-3 (filter UI shape = header pill/toggle + per-card badge)
    - OQ-4 (multi-stack = sequential one-at-a-time + Order N of M)
    - OQ-12 (small-viewport = full-screen modal)
  remaining_owner_input:
    - OQ-5 audio = conditional on Phase 4 implementation finding a
      reusable existing buzzer surface; if not found, audio drops from
      this CR (no new asset). Owner already approved this conditional
      rule — no additional input needed unless Phase 4 finds a reusable
      surface and wants to override volume/loop semantics.

backend_confirmation_status: narrowed_to_socket_first
  load_bearing:
    - BE-OF3 (canonical values + casing)
    - BE-OF4 (order_from='web' + f_order_status=7 co-arrival on socket payloads)
    - BE-OF7 (scan-new-order frame extension)
    - BE-OF8 (socket-payload field guarantee for new-order /
              update-order* / update-order-status)
    - OQ-6  (confirmOrder payload for web orders)
    - OQ-9  (aggregator origin tag)
    - OQ-10 (confirmOrder multi-operator race-protection)
  demoted_to_secondary:
    - BE-OF1 (single-order-new) — relevant only for scan-new-order
              enrichment fallback (today's path) and OrderEntry re-engage
    - BE-OF2 (employee-orders-list) — relevant only for bootstrap /
              reload survival of filter/badge/pop-out

freeze_eligibility:
  current: NO — single backend reply still needed on BE-OF3/4/7/8 + OQ-6/9/10
  reason:  business side mostly resolved; backend confirmation
           narrowed to socket-first wire shape
  unblock: ONE backend reply addressing the 7 socket-first asks above.
           Owner side already settled.

ship_path_after_unblock:
  Phase_1: 1-line at orderTransform.js:191 (additive map)
           — ungated by socket-first if BE-OF8 confirms
  Phase_2: ~3-line predicate at CollectPaymentPanel.jsx:917 + OrderEntry.jsx:653
           — ungated once Phase 1 lands
  Phase_3: header pill/toggle + per-card badge
           — ungated once Phase 1 lands
  Phase_4: ScanOrderPopOut + sequential queue + reused-only audio
           — ungated once BE-OF4 + BE-OF7 land

what_NOT_to_change_post_v4:
  - /app/memory/final/* (untouched)
  - any source code (untouched)
  - CR-008 D1-Gate isPrepaid behaviour
  - existing socket-first handlers for new-order / update-order* /
    update-order-status (already socket-first; CR does not weaken them)
  - existing API-enrichment for scan-new-order / delivery-assign-order /
    update-food-status (CR does not delete or replace them; BE-OF7 only
    proposes an additive frame extension)
  - per-card YTC accept flow on POS-origin orders (R-POPOUT-9)
  - existing dashboard channel/status filters
  - existing buzzer/notification audio surfaces (OQ-5 reuse-only)

next_agent_invocation:
  1. Backend Contract Agent — single email covering BE-OF3, BE-OF4,
     BE-OF7, BE-OF8, OQ-6, OQ-9, OQ-10. Highlight that BE-OF1 / BE-OF2
     are demoted (still nice-to-have for reload symmetry but not
     blocking).
  2. CR Planning Agent — once backend reply lands, author the
     implementation plan for Phases 1–4 using the socket-first contract
     locked in §17.1–§17.4. Include the OQ-5 code-discovery step at
     §17.5 inside Phase 4 plan.
  3. No further owner input required unless OQ-5 code-discovery yields
     a reusable buzzer surface and Phase 4 wants to expose volume/mute
     controls.
```

### 17.8 Strict-rules compliance certification (v4 addendum)

| Rule | Status |
|---|---|
| `/app/memory/final/*` untouched | ✅ |
| No source code edited | ✅ |
| No implementation | ✅ |
| No QA / tests run | ✅ |
| No tracker rewrite (only this addendum appended to the CR analysis file) | ✅ |
| No baseline silently overridden | ✅ — every claim anchored to baseline / overlay / code with file:line evidence |
| No invention where docs silent | ✅ — silent areas tagged conditional / open / demoted explicitly |
| CR-008 D1-Gate behaviour preserved | ✅ |
| Socket-first re-anchoring is code-evidenced, not asserted | ✅ — see §17.1 table; sources: socketHandlers.js L142/180/204-298/375-420 (socket-first) vs L428-447/454-473/317-363 (API-enrichment) |
| Demotion of BE-OF1 / BE-OF2 is justified by code-actual-usage scan | ✅ — see §17.1 second table: getRunningOrders only used in LoadingPage / refresh / reports; fetchSingleOrderForSocket only used in 3 socket handlers + OrderEntry re-engage |
| Owner decisions captured verbatim | ✅ — §17.3 |
| Stop after creating addendum | ✅ |

---

— End of Socket-First Clarification + Owner Decisions Addendum (POS2-002 v4 · 2026-05-07) —

---

## 18. Web YTC Pop-out Snooze Requirement Addendum (2026-05-07 v5)

> **Type:** Read-only snooze behaviour analysis + new owner decision capture (OQ-13). NO `/app/memory/final/` edits, NO code edits, NO implementation, NO QA. Appends to v4 above.
> **Agent:** CR Analysis Only Agent (POS2-002 v5 addendum)
> **Date:** 2026-05-07
> **Trigger:** Owner-supplied requirement that the Web / Scan & Order YTC pop-out (R-POPOUT-1..10 + v4 OQ-1/4) needs a snooze policy. Owner clarified that the pop-out should become the primary attention surface for web YTC, and that the existing card-level snooze button may need to be hidden / deprioritised for web YTC orders specifically.

### 18.1 Existing snooze state — code-anchored audit

#### 18.1.1 State ownership

| Concern | Site | Evidence |
|---|---|---|
| **Where is snooze state held?** | `pages/DashboardPage.jsx:414` — `const [snoozedOrders, setSnoozedOrders] = useState(new Set());` | In-memory React state, owned by DashboardPage; a `Set` of stringified order IDs (and table IDs in some flows). |
| **Where is the toggle handler?** | `pages/DashboardPage.jsx:1057-1067` — `toggleSnooze(orderId)` | Pure add/remove from the Set. NO API call, NO socket emit, NO persistence write. |
| **Is it persisted?** | **No.** Zero `snooze*` references in `localStorage` writes / reads, in `contexts/`, in `api/`, or in any service file. | Search across `frontend/src/` confirmed: snooze hits exist ONLY in `pages/DashboardPage.jsx`, `components/cards/*.jsx`, `components/sections/TableSection.jsx`, `components/dashboard/Channel*.jsx`. **NONE in contexts/services/api/utils.** |
| **Does it call backend?** | **No.** No fetch / axios / socket emit anywhere in the snooze code path. | Code-evidenced. |
| **Does it survive reload?** | **No.** State resets to empty `Set` on every dashboard mount. | Pure `useState` initial value `new Set()`. |
| **Does it survive socket update?** | **Yes (cosmetically).** Snoozed-set keys are not invalidated by socket-driven order updates because the dashboard only stores the ID in the Set, while `OrderContext.orders` is mutated independently by socket handlers. So a snoozed order whose status flips 7→1 via `update-order-status` would still be `isSnoozed === true` until manually unsnoozed (or until the DashboardPage unmounts). | Anchored at `socketHandlers.js:375-420` (no snooze-related side-effect) + `DashboardPage.jsx:414, 1057-1067` (no socket-listener for snooze invalidation). |

#### 18.1.2 Card-level button presence

| Card | File:line | Gating | Behaviour |
|---|---|---|---|
| **OrderCard** | `components/cards/OrderCard.jsx:335-348` | **`isYetToConfirm && onToggleSnooze`** — button only renders for YTC orders | Snooze button visible ONLY on YTC orders. Comment at L335: *"Snooze Button - Only for Yet to Confirm orders"*. |
| **TableCard** | `components/cards/TableCard.jsx:250-261` | **`isYetToConfirm && onToggleSnooze`** — same YTC gate | Same. Comment at L250: *"Snooze Button - Only for yetToConfirm orders"*. |
| **DineInCard** | `components/cards/DineInCard.jsx:80-93` | `onToggleSnooze` only (no YTC gate at the card level) | Snooze always available on this card variant. |
| **DeliveryCard** | `components/cards/DeliveryCard.jsx:61-73` | `onToggleSnooze` only (no YTC gate at the card level) | Snooze always available on this card variant. |
| **TakeAwayCard / RoomCard** | (no `Snooze` / `isSnoozed` references found) | n/a | No snooze button. |

#### 18.1.3 Visual semantics

| Visual | Where | Effect |
|---|---|---|
| `opacity-60` on snoozed card root | `OrderCard.jsx:275`, `TableCard.jsx:219`, `DineInCard.jsx:47`, `DeliveryCard.jsx:28` | Card stays visible on the dashboard but is dimmed. Card is NOT removed, NOT moved to a different column, NOT collapsed. |
| `bg-orange-100` on the snooze button when active | All 4 cards above | Visual toggle state. |
| Title text `"Snooze" / "Unsnooze"` | All 4 cards | Tooltip toggle. |

**Anti-checks (what snooze does NOT do today):**
- Does NOT remove the order from the dashboard.
- Does NOT change `order.status` / `order.fOrderStatus`.
- Does NOT call backend.
- Does NOT prevent a future socket update from arriving (`update-order-status`, `update-order*`, `new-order`, `scan-new-order` all continue to mutate `OrderContext.orders` regardless of snoozed-set membership).
- Does NOT survive a page reload (in-memory `Set` resets).
- Does NOT survive a switch of operator/device (no persistence).
- Does NOT invalidate the snoozed flag when status flips (e.g., YTC → preparing) — the entry stays in the Set until manually toggled or DashboardPage unmounts.

#### 18.1.4 Verdict on existing snooze

**Status:** *partially_implemented_dim_only_local_ui.*

- Implemented as a frontend-only, in-memory dim-card UX.
- No persistence layer (no localStorage, no backend, no per-user/per-device).
- Reliability concern: stale-flag risk after status flip (a snoozed YTC order that gets confirmed via socket continues to be "snoozed" until manually toggled — non-blocking but cosmetically odd).
- Scope: card visibility only; does not interact with any business logic, payment flow, or socket pipeline.

**Baseline / overlay coverage:** zero hits in `/app/memory/final/*` for `snooz*`. Overlay docs mentioning snooze: none verified during this addendum (search confined to the snooze keyword scan above; no canonical overlay rule for snooze behaviour exists).

→ Snooze is an undocumented, partially-implemented UX behaviour. It is NOT covered by baseline rules; baseline is silent. POS2-002 must establish its own rule for the web YTC pop-out, anchored to existing code where safe and otherwise treated as `still_open_owner` per CR-008-style strict rules.

### 18.2 Snooze policy for the Web / Scan & Order YTC pop-out

#### 18.2.1 Locked rules (per owner clarification)

| # | Rule | Status |
|---|---|---|
| **R-SNOOZE-1** | The Web / Scan & Order YTC pop-out is the **primary attention and action surface** for web YTC orders. | **Locked** |
| **R-SNOOZE-2** | The pop-out MUST NOT permanently suppress an order. Any snooze action is temporary. | **Locked** |
| **R-SNOOZE-3** | A Snooze action, if shipped in Phase 4, MUST: (a) temporarily hide the pop-out for the snoozed order; (b) NOT confirm or reject the order; (c) leave the order on the dashboard (not remove from the underlying order list); (d) NOT change `order.status` / `order.fOrderStatus`; (e) NOT block future socket updates for that order. | **Locked** |
| **R-SNOOZE-4** | A snoozed web YTC order MUST reappear in the pop-out either (a) after a defined interval, OR (b) when the operator opens the Web / Scan & Order filter (R-FILTER-2). The exact trigger choice is **still open** — see OQ-13.a. | **Locked rule + still_open_owner sub-decision** |
| **R-SNOOZE-5** | Existing POS-origin YTC card snooze behaviour MUST NOT be changed unless implementation strictly requires it. The current card-level snooze button on `OrderCard.jsx:335-348` and `TableCard.jsx:250-261` (YTC-gated) stays as today for POS YTC orders. | **Locked** |
| **R-SNOOZE-6** | When the pop-out is active for a web YTC order, the card-level snooze button on the SAME web YTC order should be **hidden or deprioritised** to avoid duplicate-action confusion. Implementation may use either: (a) hide the card button outright when `orderFrom === 'web' && fOrderStatus === 7`; or (b) keep the card button but make it a no-op echoing the pop-out's snooze state. **Default = (a) hide.** | **Locked default; (b) is the override option** |
| **R-SNOOZE-7** | If snooze is not safely implementable in Phase 4 (per OQ-13 below), Phase 4 ships visual + Accept + View only — NO snooze button in the pop-out, NO change to existing card snooze. | **Locked default — fail-safe behaviour** |
| **R-SNOOZE-8** | Snooze MUST remain frontend-only / device-local unless an owner-approved product requirement explicitly demands cross-device persistence. **Default = frontend-only / device-local; matches existing implementation.** | **Locked** |

#### 18.2.2 Pop-out action surface — locked

Per owner clarification, Phase 4 pop-out actions are:

| Action | Status | Wire / behaviour |
|---|---|---|
| **Accept / Confirm** | **Locked (R-POPOUT-5 from v2)** | `confirmOrder(orderId, roleName, defaultOrderStatus)` at `orderService.js:62-66`. |
| **Reject** | **Locked (R-POPOUT-6 from v2)** | Existing reject path on YTC cards (`OrderCard.jsx:680-687` reference). |
| **View Order** | **Locked (NEW in v5 — promoted from "implicit drill-down")** | Opens the existing OrderEntry surface for the order in read-only or normal mode (depending on Phase 4's UX choice). No new endpoint. |
| **Snooze** | **Conditional (OQ-13)** | Only included if existing snooze logic is safe to reuse in the pop-out context. See §18.2.3. |

#### 18.2.3 OQ-13 (NEW) — snooze decision sheet

| OQ | Question | Owner default | Status |
|---|---|---|---|
| **OQ-13.a** | Should the Web / Scan & Order YTC pop-out include a Snooze action? | **Yes IF existing snooze logic is safe to reuse.** **Defer** if existing snooze is incomplete or risky — Phase 4 ships Accept + View only. | **owner_default_locked + still_open_implementation** (decision rule below) |
| **OQ-13.b** | Snooze re-pop trigger: time-interval, filter-open, or both? | Not yet decided. Recommended candidates: (i) time-interval (e.g., 30 / 60 / 120 seconds — owner-pickable); (ii) filter-open trigger (when operator selects the Web / Scan & Order filter, all snoozed web YTC orders re-pop sequentially); (iii) both (whichever fires first). | **still_open_owner** |
| **OQ-13.c** | Card-level snooze button visibility for a web YTC order WHILE the pop-out is active for that same order: hide outright (R-SNOOZE-6 default-a) vs no-op echo (default-b)? | **Default: hide (default-a).** | **Locked default; owner may override** |
| **OQ-13.d** | Persistence scope of the pop-out's snooze: device-local in-memory (matches today) vs survive-reload via localStorage vs cross-device via backend? | **Device-local in-memory** (matches existing snooze; no new persistence). | **Locked default — backend dependency NOT created** |
| **OQ-13.e** | Should snooze be available only for web YTC pop-outs, or also for non-pop-out card paths if the user sees the card without the pop-out (e.g., after dismissing the pop-out)? | Not decided. Recommended: snooze available wherever the pop-out is the current visible surface for that order; otherwise the card-level button stays as today (POS YTC only — R-SNOOZE-5). | **still_open_owner** |

#### 18.2.4 Decision rule for OQ-13.a — "safe to reuse"

The Phase 4 implementation agent must inspect the following before wiring snooze into the pop-out:

| Check | Pass criterion | Fail action |
|---|---|---|
| **Snooze state is per-order ID, additive only, with no side-effect on order business state** | Confirmed at code: `DashboardPage.jsx:1057-1067` adds/removes from a `Set` of order IDs only. PASS. | n/a |
| **Snooze does not block future socket updates** | Confirmed at code: handler chain `socketHandlers.js:146-198 / 221-298 / 375-420` mutates `OrderContext.orders` regardless of snoozed-set membership. PASS. | n/a |
| **Snooze does not change order.status / fOrderStatus** | Confirmed: no status mutation in `toggleSnooze`. PASS. | n/a |
| **Stale-flag risk (snoozed-set entries surviving status flips) is acceptable for v1** | If owner accepts the cosmetic stale-flag (snoozed entry persists after YTC→preparing flip until manual toggle), PASS. Otherwise the Phase 4 agent must add a small invalidator: when `OrderContext` removes/replaces an order, drop its ID from the snoozed Set. | If FAIL → defer snooze in pop-out per R-SNOOZE-7; ship Accept + View only. |
| **Re-pop trigger is implementable without new backend** | Time-interval requires only `setTimeout`; filter-open trigger requires only a React effect on `activeFilters`. Both are trivially frontend-only. PASS. | n/a |
| **Card-level button hide for web YTC during pop-out is implementable** | The existing `OrderCard.jsx:336` predicate `isYetToConfirm && onToggleSnooze` can be tightened to `isYetToConfirm && onToggleSnooze && !(isWebOrigin && popOutActiveFor(orderId))`. Trivially additive. PASS. | n/a |

→ **Decision rule:** All six checks above currently PASS based on code inspection. Provided the Phase 4 implementation agent verifies the "stale-flag" check is owner-accepted (or adds the small invalidator effect), **snooze CAN be safely reused in the Web YTC pop-out**. If owner explicitly rejects the stale-flag risk AND the invalidator is non-trivial, defer snooze per R-SNOOZE-7.

#### 18.2.5 What this addendum explicitly does NOT propose

| Item | Why not |
|---|---|
| Removing the card-level snooze button globally | R-SNOOZE-5 — only the web YTC card button is hidden during the pop-out; POS YTC card snooze stays as-is. |
| Persisting snooze to backend | R-SNOOZE-8 + OQ-13.d default — no product requirement for cross-device; matches existing scope. |
| Persisting snooze to localStorage | OQ-13.d default — keep device-local in-memory as today. localStorage migration is a separate decision and would invoke SM-04 (Phase 1 device-local) governance from baseline. |
| Implementing snooze in this CR | Strict rules — no implementation. CR analysis only. |
| Changing existing dim-card UX (`opacity-60`) | No owner request to change visual; existing UX is the precedent for the pop-out's dim-when-snoozed treatment. |
| Auto-snoozing or rate-limiting the pop-out | Not requested. R-POPOUT-4 ("hard to miss") + R-POPOUT-8 ("sequential one-at-a-time") already cover attention behaviour. |
| Suppressing the pop-out permanently for any reason | R-SNOOZE-2 hard-locked. |
| Letting snooze block socket updates | R-SNOOZE-3(e) hard-locked. |

### 18.3 Backend dependency assessment

| Path | Backend dependency? | Reason |
|---|---|---|
| Pop-out snooze stays device-local in-memory (default per OQ-13.d) | **NONE** | Matches existing `DashboardPage.jsx:414, 1057-1067` scope. Frontend-only. |
| Pop-out snooze migrates to localStorage | **NONE** at backend; FE-only. SM-04 from baseline governs the persistence-scope migration. | localStorage is Phase 1 device-local per SM-03/SM-04. Adding a `mygenie_snoozed_web_ytc_orders` key would follow the precedent of `mygenie_stay_on_order_after_bill` (CR-008 #4 Phase A). NOT proposed in this CR. |
| Pop-out snooze migrates to cross-device backend persistence | **YES — new backend ask required (BE-OF9)** | Would need: `POST /api/v.../snooze-order` (toggle), payload `{ order_id, snoozed: bool }`; socket echo so other operators see the snooze; expiry semantics. **NOT proposed in this CR per OQ-13.d default.** |

→ **Net: no new backend dependency is created by POS2-002 v5.** The only backend asks remain BE-OF3 / BE-OF4 / BE-OF7 / BE-OF8 (socket-first) + OQ-6 / OQ-9 / OQ-10 from v4. Snooze is FE-only.

### 18.4 Updated open-questions / blocker register (v5)

| Item | Audience | Status |
|---|---|---|
| **OQ-13.a** Pop-out includes Snooze? | Owner / implementation | **owner_default_locked: yes IF safe to reuse**. §18.2.4 checklist currently passes 6/6; the only owner-pending sub-question is acceptance of the cosmetic stale-flag risk |
| **OQ-13.b** Re-pop trigger (time-interval / filter-open / both) | Owner | **still_open_owner** |
| **OQ-13.c** Card-level web YTC snooze button while pop-out active | Owner | **locked default = hide; owner may override** |
| **OQ-13.d** Persistence scope for pop-out snooze | Owner | **locked default = device-local in-memory** |
| **OQ-13.e** Snooze availability outside the active pop-out | Owner | **still_open_owner** |
| OQ-1, OQ-2, OQ-3, OQ-4, OQ-12 | Owner | **CLOSED** (per v4) |
| OQ-5 | Owner | **CONDITIONAL** (per v4) |
| BE-OF3, BE-OF4, BE-OF7, BE-OF8, OQ-6, OQ-9, OQ-10 | Backend | **OPEN — load-bearing** (per v4) |
| BE-OF1, BE-OF2 | Backend | **DEMOTED** (per v4) |
| BE-OF9 (cross-device snooze persistence) | Backend | **NOT raised** (per OQ-13.d default; if owner overrides OQ-13.d to cross-device, this becomes a new backend ask) |

### 18.5 Revised final verdict (v5)

```yaml
verdict: needs_socket_payload_confirmation_only + snooze_behavior_confirmation
revision: v5 (2026-05-07 — pop-out snooze policy added)

what_v5_adds_vs_v4:
  - R-SNOOZE-1..8 locked rules for the Web / Scan & Order YTC pop-out
  - OQ-13.a..e decision sheet (a/c/d locked-default; b/e still_open_owner)
  - Section 18 audit of existing snooze code anchored to file:line
  - Confirmation that snooze is FE-only; NO backend dependency added
  - Pop-out actions surface = Accept / Reject / View / (Snooze conditional)

what_v5_does_NOT_change_vs_v4:
  - Backend ask register: still BE-OF3 / BE-OF4 / BE-OF7 / BE-OF8 / OQ-6 /
    OQ-9 / OQ-10. BE-OF1 / BE-OF2 still demoted. NO BE-OF9.
  - Owner business decisions: OQ-1 / OQ-2 / OQ-3 / OQ-4 / OQ-12 stay closed;
    OQ-5 stays conditional
  - Phase ordering: Phase 1 → 2 → 3 → 4 unchanged
  - CR-008 D1-Gate isPrepaid behaviour: untouched
  - Existing POS-origin YTC card snooze button: untouched (R-SNOOZE-5)
  - Existing dim-card UX: untouched
  - Existing socket-first handlers: untouched
  - Existing API-enrichment fallback for scan-new-order /
    delivery-assign-order / update-food-status: untouched

freeze_eligibility:
  current: NO — same as v4. Single backend reply still needed on
           BE-OF3/4/7/8 + OQ-6/9/10. Plus owner sub-decision on
           OQ-13.b (re-pop trigger) and OQ-13.e (snooze outside pop-out).
  reason:  business side mostly resolved; backend confirmation
           narrowed to socket-first; snooze policy added but with
           owner-default fail-safe (R-SNOOZE-7 — defer snooze if not
           safe to reuse).
  unblock: ONE backend reply addressing the 7 socket-first asks +
           short owner sheet on OQ-13.b and OQ-13.e
           (OQ-13.a / c / d already have safe defaults).

ship_path_after_unblock:
  Phase_4: ScanOrderPopOut + sequential queue + reused-only audio +
           snooze conditional on §18.2.4 checklist (6/6 currently PASS).
           If owner rejects the stale-flag risk AND the invalidator is
           non-trivial → defer snooze per R-SNOOZE-7; pop-out ships with
           Accept + View only.

what_NOT_to_change_post_v5:
  - /app/memory/final/* (untouched)
  - any source code (untouched)
  - existing card-level snooze button on OrderCard.jsx:335-348 and
    TableCard.jsx:250-261 (kept for POS YTC orders per R-SNOOZE-5)
  - existing in-memory snooze Set on DashboardPage.jsx:414 (no migration
    to localStorage / backend in this CR)
  - existing dim-card opacity-60 visual treatment
  - CR-008 D1-Gate behaviour
  - existing socket-first handlers + API-enrichment fallback paths
  - per-card YTC accept flow on POS-origin orders (R-POPOUT-9)

next_agent_invocation:
  1. Backend Contract Agent — single email covering BE-OF3, BE-OF4,
     BE-OF7, BE-OF8, OQ-6, OQ-9, OQ-10 (unchanged from v4). NO snooze
     ask added for backend.
  2. Owner Decision Sheet — short follow-up:
       * OQ-13.b — re-pop trigger (time-interval / filter-open / both)
       * OQ-13.e — snooze availability outside the active pop-out
       (OQ-13.a/c/d already have safe defaults; owner explicit override
        only if defaults are not acceptable)
  3. CR Planning Agent — once backend reply lands, author the
     implementation plan for Phases 1–4 using v4 + v5 locked scope.
     Phase 4 plan must include the §18.2.4 "safe to reuse" checklist as
     a pre-implementation gate.
```

### 18.6 Strict-rules compliance certification (v5 addendum)

| Rule | Status |
|---|---|
| `/app/memory/final/*` untouched | ✅ |
| No source code edited | ✅ |
| No implementation | ✅ |
| No QA / tests run | ✅ |
| No tracker rewrite (only this addendum appended) | ✅ |
| Existing snooze behaviour preserved (R-SNOOZE-5 / R-SNOOZE-8) | ✅ — POS YTC card snooze untouched; FE-only / device-local in-memory scope retained |
| Snooze does not gain backend dependency in this CR | ✅ — OQ-13.d default = device-local in-memory; BE-OF9 explicitly NOT raised |
| Snooze cannot suppress an order permanently | ✅ — R-SNOOZE-2 hard-locked + R-SNOOZE-4 re-pop required |
| Snooze cannot block socket updates | ✅ — R-SNOOZE-3(e) hard-locked + code-anchored at §18.1.1 |
| Snooze cannot change order status | ✅ — R-SNOOZE-3(d) hard-locked |
| CR-008 D1-Gate behaviour preserved | ✅ |
| All claims about existing snooze behaviour are anchored to file:line | ✅ — §18.1.1 / §18.1.2 / §18.1.3 |
| Stop after creating addendum | ✅ |

---

— End of Web YTC Pop-out Snooze Requirement Addendum (POS2-002 v5 · 2026-05-07) —

---

## 19. OQ-13 Snooze Owner Clarification + Existing Ringer/Trigger Documentation Gate (2026-05-07 v6)

> **Type:** Read-only owner-decision capture + planning-agent gate documentation. NO `/app/memory/final/` edits, NO code edits, NO implementation, NO QA. Appends to v5 above.
> **Agent:** CR Analysis Only Agent (POS2-002 v6 addendum)
> **Date:** 2026-05-07
> **Trigger:** Owner snooze clarifications + explicit ask to document existing ringer/buzzer/trigger surface for the Phase-4 planning agent so the pop-out does not collide with already-implemented FCM/socket audio behaviour.

### 19.1 Owner-locked snooze decisions (supersedes v5 OQ-13 defaults where overridden)

| # | Owner decision | Effect on v5 OQ-13 |
|---|---|---|
| **R-SNOOZE-9** Fixed 5-minute snooze duration | Snooze hides the Web / Scan & Order YTC pop-out for **exactly 5 minutes** after the snooze action fires. Not configurable in this CR. Future sprint may make it configurable. | **Closes OQ-13.b** (re-pop trigger) — the *time-interval* leg is locked at 5 minutes. The *filter-open* leg is not auto-promoted; OQ-13.b filter-open trigger remains a pure owner option (default = NOT applied). The locked rule is: re-pop after 5 min OR earlier if the order falls out of YTC via socket (R-SNOOZE-12 below). |
| **R-SNOOZE-10** Verify-before-assume backend/local | Phase-4 planning MUST NOT assume snooze is local-only. Existing snooze code path must be re-verified before implementation: (i) is it local-only? (ii) does it call backend? (iii) does it affect socket / order state? (iv) is it safe to reuse for the Web YTC pop-out? **Verification result drives implementation:** if local-only confirmed → keep Web YTC snooze local/in-memory; if backend or hidden side-effects discovered → flag before implementation. | **Replaces v5 OQ-13.a "safe to reuse" §18.2.4 checklist with a strict pre-implementation re-verification gate** (see §19.2). |
| **R-SNOOZE-11** Minimum required snooze behaviour | Snooze MUST: (a) hide the Web / Scan & Order YTC pop-out for 5 minutes; (b) NOT confirm or reject the order; (c) NOT remove the order from the dashboard; (d) NOT change `order.status` / `order.fOrderStatus`. | Reaffirms v5 R-SNOOZE-3 with the 5-minute timer made explicit. |
| **R-SNOOZE-12** Single status-flip rule (deduplicated) | If a socket update changes the order's status away from YTC (`fOrderStatus !== 7`, by any means — confirm/accept/reject/cancel/internal flip), the order is removed from the snooze queue and the pop-out queue. | Replaces all variants of "if confirmed before timeout" / "if rejected before timeout" / "if status changes" with a **single rule** anchored on socket-driven status change. This is the only de-snooze trigger besides the 5-minute timer. |
| **R-SNOOZE-13** Existing ringer/buzzer behaviour out of scope | The existing Scan & Order / YTC socket trigger and the existing FCM/notification ringer/buzzer ARE NOT new CR scope. POS2-002 MUST NOT change ringer behaviour and MUST NOT add a new sound asset. The pop-out's audio behaviour, if any, is constrained to **conditional reuse** of an already-mounted ringer surface (per v4 OQ-5). | Reaffirms v4 OQ-5; cross-references the documentation gate at §19.4. |
| **R-SNOOZE-14** Documentation gate before implementation | The Phase-4 planning agent MUST inspect and document the existing trigger/ringer surface BEFORE writing implementation code. Specifically: which socket/event triggers Web YTC; which ringer fires; when it fires (event-driven vs FCM-driven); whether it fires for `scan-new-order`, `update-order-status`, FCM, or another path; whether the pop-out should reuse the ringer or remain visual-only. | Ensures the pop-out does not double-fire audio or replace an existing audio surface. See §19.4 code anchors. |

### 19.2 Pre-implementation snooze verification gate (replaces v5 §18.2.4)

> Owner has explicitly asked the planning agent NOT to assume snooze is local-only. The §18.1.1 / §18.1.2 / §18.1.3 audit in v5 was a snapshot from this analysis pass; it must be **re-verified at implementation time** before the Web YTC pop-out reuses any part of the existing snooze code path.

| Verification check | Method | Pass criterion | Fail action |
|---|---|---|---|
| **V-1** Snooze state location | grep `snooze` across `frontend/src/` for any new touch points since v5; inspect actual call sites in `pages/DashboardPage.jsx`, `components/cards/*.jsx`, `components/dashboard/*.jsx`, `components/sections/TableSection.jsx` | All snooze state still owned at `DashboardPage.jsx:414` `useState(new Set())`; no new owner emerged | If a new owner exists (e.g., a context, service, hook), planning agent must STOP and re-evaluate scope |
| **V-2** Backend calls in snooze path | grep `snooze` for `axios`, `fetch`, `socket.emit`, service-layer references; inspect `toggleSnooze` body (`DashboardPage.jsx:1057-1067` baseline) | No fetch / axios / emit / service call inside the snooze toggle path | If any backend call exists, FLAG before implementation; do not silently reuse |
| **V-3** Side-effect on order state | inspect that `toggleSnooze` only mutates the local `Set` — does not touch `OrderContext` / `TableContext` / status-derivation helpers / socket subscriptions | Only `setSnoozedOrders(prev => ...)` mutation, no other side effects | If side-effects exist, FLAG before implementation |
| **V-4** Persistence | grep `snoozedOrders` for `localStorage`, `sessionStorage`, IndexedDB, server-sync | Zero persistence references | If persistence exists, FLAG — and decide whether to reuse or isolate the Web YTC snooze in a new key |
| **V-5** Socket update interplay | trace whether socket handlers (`socketHandlers.js:146 / 221 / 375 / 428 / 454 / 317`) consult or mutate `snoozedOrders` | No interplay; socket handlers are oblivious to snooze state | If interplay discovered, FLAG — the §19.1 R-SNOOZE-12 rule may need re-design |
| **V-6** YTC card snooze button behaviour for web orders | inspect `OrderCard.jsx:335-348` and `TableCard.jsx:250-261` to confirm the existing `isYetToConfirm && onToggleSnooze` predicate is unchanged | Predicate unchanged | If predicate has changed, planning agent must reconcile R-SNOOZE-5 / R-SNOOZE-6 (v5) before implementation |

**Decision rule (v6):** All 6 checks must PASS. If any FAIL → planning agent stops, escalates to owner, and Phase-4 ships visual + Accept + View only per R-SNOOZE-7 (v5 fail-safe, still in force).

**Snapshot from this analysis pass (informational; must be re-verified at implementation time):** All 6 checks PASS as of 2026-05-07 baseline. Anchors: §18.1 (v5).

### 19.3 Snooze interaction matrix (locked, deduplicated)

| Event | Snoozed web YTC order's behaviour |
|---|---|
| 5-minute timer expires | Order re-enters the pop-out queue; pop-out displays it according to R-POPOUT-8 sequential ordering |
| Socket update changes status away from YTC (`fOrderStatus !== 7`) — covers confirm / accept / reject / cancel / any internal flip | Order is removed from snooze queue AND from pop-out queue. **Single rule per R-SNOOZE-12; no separate clauses.** |
| Operator opens the Web / Scan & Order filter (R-FILTER-2) while a web YTC order is snoozed | Default = order remains snoozed (not auto-re-popped). Owner OQ-13.b option to also-trigger-on-filter-open is OFF by default in v6. |
| Operator unsnoozes via UI (if exposed) | Order re-enters the pop-out queue immediately |
| Page reload | Snooze state is cleared (matches existing in-memory behaviour at `DashboardPage.jsx:414`). Order will re-enter the pop-out queue if still YTC after the next live socket frame OR after the next bootstrap of `getRunningOrders` (whichever fires first). This is acceptable because R-SNOOZE-8 (v5) keeps persistence device-local in-memory only. |
| New socket frame for the same order while snoozed (e.g., `update-order` keeping YTC status) | Order data is updated in `OrderContext` per existing socket-first flow; snooze flag persists; pop-out remains hidden until the 5-minute timer expires OR R-SNOOZE-12 fires |

### 19.4 Existing ringer / buzzer / trigger surface — code anchors (documentation for Phase-4 planning agent)

> R-SNOOZE-14 mandates that Phase-4 planning agent inspects and documents this surface before implementation. The anchors below are an analysis-pass snapshot to guide that inspection — they are not implementation guidance.

#### 19.4.1 Sound infrastructure (already in code)

| Concern | File:line | What it does |
|---|---|---|
| **Sound asset registry** | `utils/soundManager.js:5-20` | 14 keyed assets: `new_order`, `confirm_order`, `order_accepted`, `order_confirmed`, `order_ready`, `order_rejected`, `attend_table`, `settle_bill`, `item_added`, `swiggy_new_order`, `five_sec_buzzer`, `ten_sec_buzzer`, `forty_five_sec_buzzer`, `silent` |
| **Asset files** | `/app/frontend/public/sounds/*.wav` | All 14 keys back to physical `.wav` files. **No new asset is needed for the Web YTC pop-out** if any existing key is reused (R-SNOOZE-13). |
| **Singleton class** | `utils/soundManager.js:22-120` | `play(soundKey)`, `stop()`, `setEnabled(bool)`, `preload()`. Global `isEnabled` honoured before every `play`. Single playing audio at a time (current is stopped before new one starts). |
| **Notification orchestrator** | `contexts/NotificationContext.jsx:41-89` | Inbound notifications drive `soundManager.play(resolvedSound)`. Sound key resolved from `data.sound \|\| data.notification_sound` first, then content-inferred via `inferSoundFromContent(title, body)` (`NotificationContext.jsx:9-`). `silent` key stops any current sound. |
| **Per-session enable flag** | `contexts/NotificationContext.jsx:27, 145-148, 175-176, 184-185` | `soundEnabled` state with `setSoundEnabled` exposed via context. Synced into `soundManager.setEnabled` in a `useEffect`. |
| **Operator mute UI** | `components/layout/Sidebar.jsx:143, 432-457` | Sidebar bottom section "Ringer On / Silent Mode" toggle bound to `setSoundEnabled`. Title text confirms "Ringer On" / "Silent Mode". |
| **Preload site** | `contexts/NotificationContext.jsx:104-110+` (post-auth init) | Sounds preloaded on auth-init. |

#### 19.4.2 Web YTC trigger surface — anchors

| Question | Code anchor (analysis-pass snapshot) | Status for Phase-4 planning |
|---|---|---|
| **Which socket/event triggers Web YTC?** | `api/socket/socketHandlers.js:428-447` `handleScanNewOrder` (4-element frame). For order-data updates that flip status to/from 7, the unified handler at `:221-298` (`handleOrderDataEvent`) and `:375-420` (`handleUpdateOrderStatus`) carry the complete socket payload. | **Confirmed entry points.** Phase-4 planning must verify that the YTC-arrival path the pop-out subscribes to is consistent with these existing handlers — i.e., subscribe to `OrderContext.orders` updates, not raw socket events, so existing handler logic is reused. |
| **Which ringer/buzzer currently fires for Web YTC arrival?** | The scan-new-order socket handler at `:428-447` does NOT directly call `soundManager`. Audio for scan/new orders is currently driven by **FCM / notification payloads** routed through `NotificationContext.jsx:41-89`. `inferSoundFromContent` may resolve to keys like `new_order` or `swiggy_new_order` based on title/body. | **Audio path = FCM-driven, not socket-driven, today.** Phase-4 planning must check if a `scan-new-order` FCM notification is also pushed by backend at the same moment as the socket frame. If yes, ringer is already firing through NotificationContext; pop-out should NOT fire it again. |
| **When does it fire?** | Only when the FCM/notification payload arrives at the browser (foreground or via service worker → foreground rebroadcast). Socket-frame arrival alone does not fire audio in current code. | **Owner must confirm:** is the existing audio cue acceptable for the new pop-out, or should the pop-out add its own visual-only attention? Defaults from v4/v5: visual-only by default; reuse existing ringer ONLY if it is already firing for the same trigger. |
| **Does it fire specifically for `scan-new-order` / YTC / another event?** | NotificationContext is event-agnostic. Sound resolution is keyed to the FCM payload's `sound` / `notification_sound` field OR inferred from title/body. The `swiggy_new_order` and `new_order` keys exist as assets but are wired only via NotificationContext payloads. | **Phase-4 planning must trace** an end-to-end scan order via DevTools to confirm which sound key (if any) fires today. If no FCM is delivered for scan orders, the ringer does not fire and the pop-out is the only attention surface. |
| **Should the pop-out reuse the existing ringer?** | Per v4 OQ-5 + v6 R-SNOOZE-13: **conditional reuse only**. No new asset; no behavioural change to the ringer. | **Locked.** If FCM-driven `swiggy_new_order` / `new_order` is already firing on web YTC arrival, the pop-out is visual-only and does not fire any new sound. If no audio fires today AND owner approves reuse of an existing key (e.g., `confirm_order` or `attend_table`), the planning agent may wire a single existing key — gated on owner override. Default = visual-only. |

#### 19.4.3 Constraints reaffirmed

| Constraint | Source |
|---|---|
| Do NOT change existing ringer / buzzer behaviour | R-SNOOZE-13 (v6) + v4 OQ-5 |
| Do NOT add a new sound asset in this CR | R-SNOOZE-13 (v6) + v4 OQ-5 |
| Do NOT bypass `soundManager.isEnabled` (operator mute) | Implicit from `Sidebar.jsx:432-457` ringer toggle being the canonical user surface |
| Do NOT play audio independently of NotificationContext | Avoids double-fire if both NotificationContext and the pop-out attempt to play on the same trigger |
| Phase-4 documentation MUST capture observed audio behaviour during DevTools verification | R-SNOOZE-14 |

### 19.5 Updated open-questions / blocker register (v6)

| Item | Audience | Status (v6) | Notes |
|---|---|---|---|
| **OQ-13.a** Pop-out includes Snooze? | Owner / implementation | **owner_default_locked = yes IF V-1..V-6 verification PASS** | §19.2 verification gate replaces v5 §18.2.4 checklist |
| **OQ-13.b** Re-pop trigger | Owner | **CLOSED — fixed 5-minute timer (R-SNOOZE-9) + R-SNOOZE-12 status-flip auto-remove. Filter-open trigger NOT applied by default.** | Configurable duration deferred to future sprint |
| **OQ-13.c** Card-level web YTC snooze button while pop-out active | Owner | **CLOSED (v5 default = hide; v6 reaffirms)** | — |
| **OQ-13.d** Persistence scope | Owner | **CLOSED — device-local in-memory** | Page-reload clears snooze (acceptable per R-SNOOZE-8) |
| **OQ-13.e** Snooze availability outside the active pop-out | Owner | **still_open_owner** | Recommended: only via the pop-out; card-level snooze for web YTC stays hidden per R-SNOOZE-6 |
| OQ-1, OQ-2, OQ-3, OQ-4, OQ-12 | Owner | **CLOSED** (per v4) | — |
| OQ-5 | Owner | **CLOSED at v6 by reaffirmation** — pop-out audio is reuse-only (no new asset). §19.4 documentation gate replaces it. | — |
| BE-OF3, BE-OF4, BE-OF7, BE-OF8, OQ-6, OQ-9, OQ-10 | Backend | **OPEN — load-bearing** (per v4) | — |
| BE-OF1, BE-OF2 | Backend | **DEMOTED** (per v4) | — |
| BE-OF9 (cross-device snooze persistence) | Backend | **NOT raised** | OQ-13.d locks device-local |

### 19.6 Revised final verdict (v6)

```yaml
verdict: needs_socket_payload_confirmation_only + snooze_behavior_confirmation
revision: v6 (2026-05-07 — OQ-13 owner clarification + ringer/trigger documentation gate)

what_v6_adds_vs_v5:
  - R-SNOOZE-9..14 locked rules
  - 5-minute fixed snooze duration (configurable deferred to future sprint)
  - Pre-implementation verification gate V-1..V-6 (replaces v5 §18.2.4)
  - Single deduplicated status-flip rule (R-SNOOZE-12) replaces all
    variants of "if confirmed/accepted/rejected before timeout"
  - Existing ringer/buzzer/trigger code-anchored documentation (§19.4)
  - OQ-13.b CLOSED (5-minute fixed)
  - OQ-13.d reaffirmed CLOSED (device-local in-memory)
  - OQ-5 CLOSED by reaffirmation (reuse-only / no new asset)

what_v6_does_NOT_change_vs_v5:
  - Backend ask register: still BE-OF3 / BE-OF4 / BE-OF7 / BE-OF8 /
    OQ-6 / OQ-9 / OQ-10. BE-OF1 / BE-OF2 still demoted. NO BE-OF9.
  - Phase ordering: Phase 1 → 2 → 3 → 4 unchanged
  - CR-008 D1-Gate isPrepaid behaviour: untouched
  - Existing POS-origin YTC card snooze button: untouched (R-SNOOZE-5)
  - Existing dim-card UX: untouched
  - Existing socket-first handlers: untouched
  - Existing FCM-driven audio path through NotificationContext: untouched
  - Existing soundManager / sound asset registry: untouched
  - Existing operator ringer toggle in Sidebar: untouched

freeze_eligibility:
  current: NO — same as v5. Single backend reply still needed on
           BE-OF3/4/7/8 + OQ-6/9/10. Plus owner sub-decision on OQ-13.e
           (snooze outside the active pop-out; recommended default = no).
  reason:  business side now further resolved by v6; backend
           confirmation narrowed to socket-first; snooze policy
           hardened with 5-minute timer + verification gate +
           ringer/trigger documentation gate.
  unblock: ONE backend reply addressing the 7 socket-first asks +
           SHORT owner sheet on OQ-13.e only
           (OQ-13.a / b / c / d already locked, OQ-5 closed).

ship_path_after_unblock:
  Phase_4: ScanOrderPopOut + sequential queue + visual-only by default
           (audio reuse is conditional on §19.4 documentation gate
           outcome). Snooze: 5-minute fixed; verification gate V-1..V-6
           must pass before implementation. R-SNOOZE-12 status-flip
           auto-remove is the single de-snooze rule besides the timer.

what_NOT_to_change_post_v6:
  - /app/memory/final/* (untouched)
  - any source code (untouched)
  - existing card-level POS YTC snooze button (R-SNOOZE-5)
  - existing FCM/NotificationContext audio path
  - existing soundManager + 14 wav assets
  - existing Sidebar ringer toggle (Silent Mode / Ringer On)
  - CR-008 D1-Gate behaviour
  - existing socket-first handlers + API-enrichment fallback paths
  - per-card YTC accept flow on POS-origin orders (R-POPOUT-9)

next_agent_invocation:
  1. Backend Contract Agent — single email covering BE-OF3, BE-OF4,
     BE-OF7, BE-OF8, OQ-6, OQ-9, OQ-10 (unchanged from v4). NO snooze
     ask. NO ringer ask.
  2. Owner Decision Sheet — minimal:
       * OQ-13.e — snooze availability outside the active pop-out
         (default = no, only via the pop-out)
  3. CR Planning Agent — once backend reply lands, author the
     implementation plan. Phase-4 plan MUST include:
       * §19.2 verification gate (V-1..V-6) BEFORE coding
       * §19.4 ringer/trigger documentation gate BEFORE coding
       * R-SNOOZE-9 (5-minute fixed)
       * R-SNOOZE-11 minimum behaviour
       * R-SNOOZE-12 single status-flip rule
       * R-SNOOZE-13 / R-SNOOZE-14 ringer-out-of-scope constraints
```

### 19.7 Strict-rules compliance certification (v6 addendum)

| Rule | Status |
|---|---|
| `/app/memory/final/*` untouched | ✅ |
| No source code edited | ✅ |
| No implementation | ✅ |
| No QA / tests run | ✅ |
| No tracker rewrite (only this addendum appended) | ✅ |
| Existing snooze behaviour preserved (R-SNOOZE-5 / R-SNOOZE-8 from v5; reaffirmed v6) | ✅ |
| Snooze does not gain backend dependency in this CR | ✅ — OQ-13.d reaffirmed device-local |
| Snooze cannot suppress an order permanently (R-SNOOZE-2) | ✅ |
| Snooze cannot block socket updates (R-SNOOZE-3(e) + R-SNOOZE-12) | ✅ |
| Snooze cannot change order status (R-SNOOZE-3(d)) | ✅ |
| Existing ringer/buzzer behaviour out of scope (R-SNOOZE-13) | ✅ |
| No new sound asset added (R-SNOOZE-13 + v4 OQ-5) | ✅ |
| Ringer/trigger surface anchored to file:line for Phase-4 planning agent | ✅ — §19.4 |
| Single deduplicated status-flip rule (no duplicate confirm/accept/reject clauses) | ✅ — R-SNOOZE-12 |
| 5-minute fixed snooze duration owner-locked | ✅ — R-SNOOZE-9 |
| Pre-implementation verification gate replaces blind reuse assumption | ✅ — §19.2 V-1..V-6 |
| Stop after creating addendum | ✅ |

---

— End of OQ-13 Snooze Owner Clarification + Existing Ringer/Trigger Documentation Gate (POS2-002 v6 · 2026-05-07) —
