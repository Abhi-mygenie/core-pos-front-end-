# BUG-291 Intake — Aggregator Rider Details Not Displayed on Order Cards

**ID:** BUG-291
**Date:** 2026-07-31
**Registered by:** INTAKE Agent (re-registered; prior draft used BUG-250 which is TAKEN)
**Prior draft path:** `/app/memory/bugs/intake/BUG_250_INTAKE_2026_07_31.md` (superseded by this doc)
**Status:** OWNER DECISIONS LOCKED — Gate 3 (Implementation Plan) ready
**Sprint:** pos_6_0
**Severity:** P1 — HIGH
**Risk:** HIGH
**Source:** AGENT-DISCOVERED (root-caused via Investigation role 2026-07-31)
**Confidence:** CONFIRMED (traced in code; API sample provided by owner)

---

## Owner Decisions (Locked 2026-07-31)

| Q# | Question | Owner Answer | Locked |
|---|---|---|---|
| Q-291-1 | How should `riderStatus` be derived? | **a) Approved:** `rider_info.id` + `fOrderStatus < 5` → `'riderAssigned'`; `rider_info.id` + `fOrderStatus === 5` → `'dispatched'`; no `rider_info.id` → `null` | ✅ 2026-07-31 |
| Q-291-2 | Should `deliveryManId` be mapped for aggregator? | **Dropped — irrelevant.** All footer buttons that use `deliveryManId` / `hasRiderAssigned` are behind `!isAggregator` guard (OrderCard:1111). "Change" link uses `isOwn` guard (OrderCard:945). Neither is reachable for aggregator orders. | ✅ 2026-07-31 |
| Q-291-3 | Does `delivery-assign-order` socket fire for aggregator? | **No.** Aggregator has its own dedicated channel (`aggregator_order_${rid}`) with `handleAggregatorOrderUpdate` which already uses `aggregatorTransform`. POS `delivery-assign-order` does not fire for Swiggy/Zomato orders. | ✅ 2026-07-31 |
| Q-291-4 | Keep or drop nested `riderInfo` block? | **b) Drop it** — remove the `riderInfo` block entirely. | ✅ 2026-07-31 |
| Q-291-5 | AggregatorDispatchModal scope? | **Out of scope.** Modal uses local `riderName` useState — not from order model. Leave untouched. | ✅ 2026-07-31 |

---

## Socket Flow (Confirmed 2026-07-31)

```
UrbanPiper assigns rider
        ↓
Backend fires: aggrigator-order-update  (channel: aggregator_order_${rid})
        ↓
handleAggregatorOrderUpdate() receives socket message
        ↓
PRIMARY: payload.order_details_order present
    → aggregatorTransform.fromAPI.aggregatorOrder(payload)  ← OUR FIX IS HERE
    → actions.updateOrder()
        ↓
FALLBACK (payload missing, defensive):
    → getAggregatorOrderList() API call
    → aggregatorTransform.fromAPI.aggregatorOrderList(data)  ← OUR FIX IS ALSO HERE
    → actions.updateOrder()
```

**All paths — initial load, socket update, API fallback, polling — go through `aggregatorTransform`.**
Fixing `aggregatorTransform.js` once covers all update paths.

---

## GAP-R5 Correction (2026-07-31)

GAP-R5 as originally written was a **false alarm**. It stated `delivery-assign-order` socket bypasses `aggregatorTransform` for aggregator orders. This is incorrect:
- `delivery-assign-order` fires only for POS own-delivery orders (not aggregator). Owner confirmed Q-291-3.
- Aggregator socket path (`handleAggregatorOrderUpdate`) **already** uses `aggregatorTransform` correctly.
- **GAP-R5 is NOT a bug.** Revised status: CLOSED — NOT A BUG.

---

## 0. Code Reality Check

```bash
grep -n "riderStatus\|deliveryManId\|\"rider\":\|rider :" /app/frontend/src/api/transforms/aggregatorTransform.js
# Result: 0 hits — none of the three fields exist in aggregatorTransform.js
```

**Code Reality: NONE** — No fix has been applied. The bug is fully present in the codebase.

---

## 0b. Duplicate Detection

| Check | Finding |
|---|---|
| ID search (BUG-291 in registry) | NOT FOUND — ID is free |
| BUG-250 | TAKEN — "Polling Reconciliation Removes Aggregator Orders" (CLOSED, pos_5_0). Different bug entirely. |
| Symptom match — "rider" + "aggregator" in recent handovers | No match found. BUG-097 covers POS-own-delivery rider; does NOT cover aggregator rider path. |
| File search — `aggregatorTransform.js` recent changes | Last touched by CR-118 (2026-07-31) — that CR adds `aggrId` display field only. No rider field changes. |

**Duplicate check: DISTINCT**
**Related: BUG-097** (delivery dispatch for POS-own-delivery — different code path), **CR-106** (aggregator module parent CR)

---

## 1. One-Line Summary

Rider name and status badges are never displayed on aggregator order cards (Swiggy / Zomato) even when a rider is actively assigned — the card always shows "Awaiting Runner".

---

## 2. Observed Behaviour

On the Dashboard, aggregator delivery orders (Swiggy / Zomato) that have an active rider assigned via UrbanPiper show:

- Rider section renders with **"Awaiting Runner"** text
- No rider name displayed
- No rider phone displayed
- No status badge ("Assigned" / "Order Accepted") displayed
- Footer action buttons do not reflect rider state (shows wrong button variant)

Affected surfaces: `OrderCard.jsx` (dashboard column view) and `DeliveryCard.jsx`.

---

## 3. Expected Behaviour

When `rider_info` is present in the API response (UrbanPiper aggregator endpoint), the order card should display:

- Rider name (e.g. "VEERJINDER SINGH")
- Rider phone (e.g. "9988190570")
- Appropriate status badge ("Assigned" or "Order Accepted") based on `f_order_status`
- Footer: correct "Waiting for Rider" vs "Reassign" button state

---

## 4. Evidence

| Field | Value |
|---|---|
| Screenshot | not provided |
| Steps to reproduce | Open dashboard → aggregator delivery order with active rider → observe rider section |
| Curl output | See `/app/memory/evidence/BUG-291/api_sample.json` (owner-provided sample below) |
| Source | AGENT-DISCOVERED (root-caused via investigation role; owner confirmed symptom) |
| Confidence | CONFIRMED — code traced, API sample verified |

### API Response Sample (owner-provided, restaurant 749, order id 45334)

```json
{
  "rider_info": {
    "id": 186197119,
    "name": "VEERJINDER SINGH",
    "Phone": "9988190570",
    "Cahnel": "swiggy",
    "order_return_otp": null,
    "bag_return_otp": null
  },
  "order_details_order": {
    "rider_name": null,
    "rider_phone_number": null,
    "delivery_man_id": null
  }
}
```

**Key observation:** `order_details_order.rider_name` and `rider_phone_number` are `null` — rider data lives exclusively in the top-level `rider_info` object with non-standard casing (`Phone`, `Cahnel`).

---

## 5. Root Cause — 5 Gaps

### GAP-R1 — Critical: Field Name Mismatch `riderName` vs `rider`

| Location | Code |
|---|---|
| `aggregatorTransform.js:85` | emits `riderName: od.rider_name \|\| rider.name \|\| null` |
| `OrderCard.jsx:912` | reads `order.rider` (not `order.riderName`) |
| `DeliveryCard.jsx:112` | reads `order.rider` (not `order.riderName`) |

`order.rider` is `undefined` for all aggregator orders → falls through to "Awaiting Runner".

`orderTransform.js:315` (POS path) correctly emits `rider:` from the `delivery_man` object. Aggregator transform uses `riderName` instead — never read by any UI component.

### GAP-R2 — High: `riderStatus` Not Computed in `aggregatorTransform`

`OrderCard.jsx:922–939` and `TableCard.jsx:585,651` render status badges:
```js
{order.riderStatus === 'riderAssigned' && <span>Assigned</span>}
{order.riderStatus === 'dispatched'    && <span>Order Accepted</span>}
```

`aggregatorTransform.js` never emits `riderStatus`. Both badges are permanently invisible for aggregator orders.

POS equivalent at `orderTransform.js:328–333`:
```js
riderStatus: (() => {
  if (api.delivery_man_id && api.delivery_man_status === 'Yes') return 'dispatched';
  if (api.delivery_man_id && api.delivery_man_status === 'No') return 'riderAssigned';
  if (!api.delivery_man_id && api.order_dispatch_status === 'Yes') return 'dispatched';
  return null;
})(),
```

Aggregator has no `delivery_man` object — must be derived from `rider_info.id` + `f_order_status`.

### GAP-R3 — High: `deliveryManId` Not Mapped

`OrderCard.jsx:111`:
```js
const hasRiderAssigned = !!order.deliveryManId;
```

`aggregatorTransform.js` does not map any field → `deliveryManId`. `hasRiderAssigned` is always `false` for aggregator orders. This breaks the "Change Rider / Waiting for Rider / Reassign" button logic at `OrderCard.jsx:1139–1162`.

**Note:** `OrderCard.jsx:899` has `{isDelivery && (hasRiderAssigned || !isOwn) && ...}` — rider section DOES render for aggregator (`!isOwn` is true), which is why "Awaiting Runner" shows. The `hasRiderAssigned` gate only affects the internal buttons at line 1139.

### GAP-R4 — Low: `riderInfo` Nested Object Is Dead Data

`aggregatorTransform.js:87–94` emits a `riderInfo` nested object with fields `id`, `name`, `phone`, `channel`, `returnOtp`, `bagReturnOtp`. No UI component reads `order.riderInfo` anywhere in the codebase. These fields are orphaned.

### GAP-R5 — **FALSE ALARM (NOT A BUG): Socket Rider-Assign — Aggregator Already Uses Correct Transform**

**Original finding (2026-07-31):** `socketHandlers.js:623` routes `delivery-assign-order` through POS `orderTransform`, bypassing `aggregatorTransform`.

**Correction (2026-07-31 — owner Q-291-3 + code confirmed):**
- `delivery-assign-order` fires **only** for POS own-delivery orders — it does NOT fire for aggregator (Swiggy/Zomato) orders.
- Aggregator orders have their own dedicated socket channel: `aggregator_order_${restaurantId}`
- Handler: `handleAggregatorOrderUpdate()` at `socketHandlers.js:945` → explicitly calls `aggregatorTransform.fromAPI.aggregatorOrder(payload)` on every event.
- **Conclusion: GAP-R5 does not exist. No socket fix needed.**

---

## 6. Files to Change (Blast Radius — LOCKED 2026-07-31)

| File | Hotspot? | Change Needed | Scope |
|---|---|---|---|
| `src/api/transforms/aggregatorTransform.js` | NO | 1) Add `rider:` key; 2) Add `riderStatus` derivation; 3) Remove `riderInfo` block | ~5 lines net change |

**Files NOT touched:**
- `src/api/socket/socketHandlers.js` — GAP-R5 was a false alarm; aggregator socket already uses correct transform
- `OrderCard.jsx` — already reads `order.rider` and `order.riderStatus` correctly; all footer action buttons guarded by `!isAggregator`
- `DeliveryCard.jsx` — frozen per FILE_OWNERSHIP owner directive
- `TableCard.jsx` — already reads `table.order.riderStatus` correctly
- `AggregatorDispatchModal.jsx` — uses local `riderName` useState, not order model

**Estimated scope:** VERY SMALL (~5 lines net in 1 file)
**Hotspot files touched:** NONE

---

## 7. Risk Classification (REVISED 2026-07-31)

| Field | Value |
|---|---|
| **Risk** | **LOW** (revised from HIGH) |
| Reason revised | `socketHandlers.js` is NOT touched (GAP-R5 was false alarm). Only `aggregatorTransform.js` changes — a non-hotspot file. No socket handler, no order lifecycle, no billing path. |
| Financial/billing change? | NO |
| Fast Lane eligible? | **YES** — 1 non-hotspot file, no destructive risk, fix is additive (new fields + 1 field removal) |
| Process | Owner can GO at any time — no separate Gate 4 approval required if Fast Lane approved |

---

## 8. Severity Classification

| Rule | Verdict |
|---|---|
| P0 — Money loss, order loss, data corruption | NO — rider info is display-only |
| P1 — Feature broken, no workaround, realtime failures | **YES** — rider details never show for aggregator; socket regression included |
| P2 — Minor display, works but awkward | NO — completely broken, not partially |

**Severity: P1** (agent-classified; owner confirmation: symptom reported directly)

---

## 9. Owner Decisions Needed (Pre-Gate 3)

**All decisions locked. No open questions.**

| Q# | Status |
|---|---|
| Q-291-1 | ✅ LOCKED — riderStatus derivation approved |
| Q-291-2 | ✅ LOCKED — deliveryManId mapping dropped (irrelevant, guarded in UI) |
| Q-291-3 | ✅ LOCKED — no socket fix needed; aggregator already uses correct transform |
| Q-291-4 | ✅ LOCKED — drop riderInfo block entirely |
| Q-291-5 | ✅ LOCKED — AggregatorDispatchModal out of scope |

See "Owner Decisions" section at the top of this document for full details.

---

## 10. Completeness Checklist

- [x] Art 1 — Intake (this doc)
- [ ] Art 2 — Impact Analysis (Gate 2)
- [ ] Art 3 — Implementation Plan (Gate 3)
- [ ] Art 4 — Gate 4 GO (owner approval)
- [ ] Art 5 — Implementation + Self-Test
- [ ] Art 6 — QA Report
- [ ] Art 7 — Owner Smoke Sign-off

---

## 11. References

- Prior draft intake (BUG-250 — superseded): `/app/memory/bugs/intake/BUG_250_INTAKE_2026_07_31.md`
- API evidence: owner-provided sample (restaurant 749, order id 45334, Swiggy)
- `aggregatorTransform.js`: `src/api/transforms/aggregatorTransform.js:85–94`
- `OrderCard.jsx` rider section: `src/components/cards/OrderCard.jsx:899–956`
- `OrderCard.jsx` rider button gate: `src/components/cards/OrderCard.jsx:111`, `1139–1162`
- `socketHandlers.js` GAP-R5: `src/api/socket/socketHandlers.js:608–653`
- POS `riderStatus` reference: `src/api/transforms/orderTransform.js:328–333`
