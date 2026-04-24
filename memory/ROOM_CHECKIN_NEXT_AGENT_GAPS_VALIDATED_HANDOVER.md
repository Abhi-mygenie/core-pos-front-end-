# ROOM CHECK-IN — VALIDATED HANDOVER FOR IMPLEMENTATION AGENT

**Validator:** Senior QA + Technical Validation Agent
**Input reviewed:** `/app/memory/ROOM_CHECKIN_NEXT_AGENT_GAPS.md`
**Architecture guardrail:** `/app/v3/ARCHITECTURE_DECISIONS_FINAL.md` (the referenced path `/app/memory/v3/…` does not exist — see §5.1)
**Scope:** Validation only. No code was changed.

---

## 1. Short Summary

Two follow-up gaps after the completed "Check-In → Update-Order routing" fix:

- **Gap 1 (HIGH):** Guest name/phone captured at check-in are not auto-populated in the OrderEntry cart when the room is re-opened.
- **Gap 2 (CRITICAL / blocking):** A room that is checked in but has no food orders cannot be checked out — "Collect Bill / Checkout" button is disabled, stranding the room in "occupied" state.

---

## 2. Validation Status

| Gap | Status |
|---|---|
| Gap 1 — customer autopopulate | **Approved with Changes** (backend-dependent; frontend-fallback path contains an unverified assumption) |
| Gap 2 — ₹0 checkout for marker-only room | **Approved with Changes** (one edge case missing; backend pre-flight is mandatory, not optional) |

Overall document is **technically sound, code-verified, and safe to implement** with the clarifications in §5.

---

## 3. What Is Confirmed From Code

All line references in the input document were checked against the working tree.

### Gap 1 plumbing — all CONFIRMED
| Claim | File:Line | Verified |
|---|---|---|
| Check-In submit sends `{name, phone, email, …}` | `RoomCheckInModal.jsx:504-506` | ✅ |
| Transform maps `api.user_name` → `customer`/`customerName` | `orderTransform.js:138-144` (doc said 137-141) | ✅ |
| Transform exposes `customerName` + `phone` on order | `orderTransform.js:177-179` (doc said 176-179) | ✅ |
| OrderEntry seeds `customer` from `orderData.customerName` | `OrderEntry.jsx:245-288` | ✅ |
| CartPanel inputs initialise from `customer?.name/phone` | `CartPanel.jsx:288-289` | ✅ |
| Guard at `OrderEntry.jsx:281` uses `orderData.customer` (synthetic label), not `customerName` | `OrderEntry.jsx:281` | ✅ |

### Gap 2 blocking gates — all CONFIRMED
| Claim | File:Line | Verified |
|---|---|---|
| CartPanel Collect-Bill disable gate | `CartPanel.jsx:790-795` | ✅ (exact code match) |
| CollectPaymentPanel Pay button disable gate | `CollectPaymentPanel.jsx:1755` | ✅ (exact code match) |
| `isRoom` plumbed to CartPanel | `CartPanel.jsx:258` | ✅ |
| Checkout label for rooms | `CartPanel.jsx:799`, `CollectPaymentPanel.jsx:420` | ✅ (doc cited L417 for the panel — that is the ChevronLeft icon; actual label is L420. Minor imprecision, not a blocker.) |
| `collectBillExisting.food_detail` filter excludes marker | `orderTransform.js:809` | ✅ |
| SC flag accommodates rooms | `OrderEntry.jsx:617` | ✅ |
| `hasPlacedItems = cartItems.some(i => i.placed)` evaluates `true` on marker-only rooms | `OrderEntry.jsx:536` | ✅ (marker carries `placed:true`) |
| `isServed = orderStatus === 'served'` | `OrderEntry.jsx:544` | ✅ |

### Marker contract — CONFIRMED
- Marker is injected at `orderTransform.js:223-234` with `isCheckInMarker:true, price:0, unitPrice:0, tax.percentage:0`.
- 17 consumer filters exist (`grep isCheckInMarker` → 19 hits across 6 files). Marker is already invisible in UI, billing, and print. This is consistent with the four architectural rules about the check-in item.

---

## 4. What Is Confirmed From Architecture Docs (`/app/v3/ARCHITECTURE_DECISIONS_FINAL.md`)

| AD | Relevance to proposed fix | Conclusion |
|---|---|---|
| AD-001 / AD-001A | Rounding & discount precision | ₹0 path is inert; no drift. ✅ |
| AD-002 | Socket event remove/update semantics | Not touched. ✅ |
| AD-013A | SC order-type gating | Proposed fix does not change SC gating for rooms. ✅ |
| AD-021 | Runtime complimentary print override | Not touched. ✅ |
| AD-101 | SC on post-discount subtotal | Zero-cart subtotal → SC=0 → no math impact. ✅ |
| AD-105 | Tax UI ↔ print consistency | Print receipt for ₹0 room not in scope of this fix (already handled by existing `billFoodList` filter). ✅ |
| AD-202 | Response-shape handling | Not touched. ✅ |
| AD-302 | Print-consistency | Not touched. ✅ |
| AD-401 / AD-402 | Frontend payload ownership | Proposed fix is a **disable-gate override only**; does not alter payload shape. ✅ |
| AD-502 | SC default ON | Not touched. ✅ |

**No V3 decision is violated by the proposed fixes.**

Architecture guardrails on the check-in item (must not show in UI, must not enter billing, must not enter print, must not be treated like a normal order item) are **preserved** — the fix only relaxes button-disable logic, not marker visibility or arithmetic.

---

## 5. Gaps / Risks Found in the Current Document

### 5.1 Reference-path typo
The input doc references `/app/memory/v3/ARCHITECTURE_DECISIONS_FINAL.md`. The actual path is `/app/v3/ARCHITECTURE_DECISIONS_FINAL.md`. Mentioned for next-agent clarity; not a blocker.

### 5.2 Line-number imprecision (minor)
- Gap 1 cites `orderTransform.js:137-141`; exact mapping is at `:138-144`.
- Gap 2 cites `CollectPaymentPanel.jsx:417` for the "Checkout" label; the label is at `:420` (L417 is the ChevronLeft icon).

### 5.3 Gap 1 — backend dependency not de-risked
The document correctly identifies backend as root cause but proposes a frontend fallback that assumes an endpoint `roomService.getCheckInDetails(roomId)` exists. **This endpoint was not found in the codebase** (`grep -rn "getCheckInDetails" /app/frontend/src` returns 0 hits — needs confirmation). Treat the frontend fallback as **Needs Confirmation**, not ready-to-ship.

### 5.4 Gap 2 — missing edge case (BLOCKING for implementation quality)
The proposed `isZeroCheckoutRoom = isRoom && hasCheckInMarker && visibleCartItems.length === 0` override **does not account for associated table orders transferred to the room** (`associatedOrders[]`). A checked-in room with zero food items but with transferred table orders has `associatedTotal > 0` and is **not** a zero-checkout case.

Current code at `CollectPaymentPanel.jsx:1773` computes `finalTotal + associatedTotal` for the button amount. The implementation must ensure:
- The "₹0 skip payment-method selector / auto-Cash" branch fires **only** when `visibleCartItems.length === 0 AND associatedOrders.length === 0`.
- When associated orders exist, the standard (non-zero) payment flow must still execute.

### 5.5 Gap 2 — backend pre-flight is mandatory, not optional
The doc labels the backend check as "Step D". For a zero-payment call with `food_detail: []` the backend contract is the single biggest unknown. The implementation agent **must** run the curl / dev-team confirmation **before** writing the UX polish; otherwise the fix ships a button that fails on POST.

### 5.6 Gap 2 — confirmation-modal UX decision
Product has not confirmed whether the zero-checkout flow should show a confirmation modal. Flag as **Needs Confirmation with product owner** before coding the modal path.

### 5.7 Marker status assumption (clarification)
The doc states "marker status = 'preparing'". Actually the marker inherits `status = mapOrderStatus(detail.food_status)` from whatever the backend stores for the check-in row. The `(hasPlacedItems && !isServed)` gate still triggers on marker-only rooms regardless of the exact status value, so the logic still holds, but the statement is a simplification.

---

## 6. Final Implementation Scope

### 6.1 Gap 2 (do FIRST — CRITICAL)

**Scope:** 2 disable-gate overrides + conditional UX branch + backend contract confirmation.

Step A — Backend pre-flight (BEFORE any code):
- Run a live POST against `/api/v2/vendoremployee/order/order-bill-payment` with `food_detail:[]`, `payment_amount:0`, `grand_amount:0`, `payment_mode:'cash'`, `payment_status:'paid'` on a test checked-in room in tenant 478.
- If backend rejects → STOP. Open a ticket with backend team for tolerance fix or dedicated `/room-checkout-zero` endpoint. Do not proceed with frontend disable-gate changes until this is resolved.
- If backend accepts → proceed.

Step B — CartPanel disable-gate override (`CartPanel.jsx:790-795`):
```js
const hasCheckInMarker = cartItems.some(i => i.isCheckInMarker);
const isZeroCheckoutRoom =
  isRoom &&
  hasCheckInMarker &&
  visibleCartItems.length === 0 &&
  (associatedOrders?.length || 0) === 0;   // ← §5.4 edge-case guard

disabled={
  (!isZeroCheckoutRoom && visibleCartItems.length === 0) ||
  (!hasPlacedItems && hasValidationErrors) ||
  (hasPlacedItems && hasUnplacedItems) ||
  (hasPlacedItems && !isServed && !isZeroCheckoutRoom)
}
```

Step C — CollectPaymentPanel Pay-button override (`CollectPaymentPanel.jsx:1755`):
Mirror the same `isZeroCheckoutRoom` computation and allow through the `length === 0` gate. Keep all other gates (tab-name, card-txn, processing flag) intact.

Step D — UX polish (only after Step A confirms backend):
- Confirmation modal: *"Check out room with no outstanding bill? (₹0)"* → Yes/No.
- When `isZeroCheckoutRoom && (associatedOrders?.length || 0) === 0`, default `paymentMethod = 'cash'` and skip the method selector.
- Standard success flow (room → Available).

### 6.2 Gap 1 (do SECOND — HIGH, non-blocking)

**Scope:** Decision-gated.

Step A — Verification (must run first):
- Login to preview URL with creds in `test_credentials.md`.
- DevTools → Network → inspect room's order GET / running-orders socket frame for `user_name` + `user.phone`.

Step B — If backend returns the data → **Frontend one-line fix:**
- Widen guard at `OrderEntry.jsx:281` to also include `orderData.customerName`:
  ```js
  if (orderData.customer || orderData.phone || orderData.customerName) { … }
  ```

Step C — If backend does NOT return the data → **Escalate to backend team** (preferred per architecture: backend is source of truth for guest→order linkage). Do **not** implement the frontend fallback unless product explicitly accepts it AND `roomService.getCheckInDetails()` is confirmed to exist (see §5.3).

---

## 7. Files / Components / Functions Likely To Be Changed

| File | Function / Area | Expected Edits |
|---|---|---|
| `frontend/src/components/order-entry/CartPanel.jsx` | Collect-Bill disabled expression | 1 block edit at L790-795 |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | Pay-button disabled expression | 1 block edit at L1755 |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | Payment-method selector, confirmation modal | ≤2 additive blocks (Step D) |
| `frontend/src/components/order-entry/OrderEntry.jsx` | Guard at L281 | 1-line widen (only if Gap 1 frontend path is chosen) |
| Backend (separate repo) | `/order-bill-payment` tolerance for empty `food_detail` + ₹0 | 1 validator tweak OR new `/room-checkout-zero` endpoint |

No changes to: `orderTransform.js`, socket handlers, print payload builders, RoomCheckInModal, RePrintButton, or any billing math.

---

## 8. Exact Implementation Instructions for the Implementation Agent

1. **Read** `/app/memory/ROOM_CHECKIN_UPDATE_ORDER_IMPLEMENTATION_NOTE.md` and `/app/v3/ARCHITECTURE_DECISIONS_FINAL.md`. Understand the marker contract (price 0, tax 0, `isCheckInMarker:true`, `placed:true`).
2. **Gap 2 Step A first.** Run the backend curl against tenant 478. If it rejects, stop and raise backend ticket.
3. **Gap 2 Step B & C second.** Apply the two `disabled={…}` override blocks using `search_replace` with surrounding context. Include the `(associatedOrders?.length || 0) === 0` clause.
4. **Gate via testing agent** after Step B+C: verify (a) marker-only room with zero associated orders → Checkout button enabled at ₹0; (b) marker-only room with ≥1 associated order → Checkout button shows `finalTotal + associatedTotal` and routes through the normal flow; (c) non-room orders with empty cart still DISABLED (regression).
5. **Gap 2 Step D** after testing agent passes B+C. Implement modal + auto-Cash + skip-selector. Re-run testing agent.
6. **Gap 1** only after Gap 2 is shipped. Follow §6.2.
7. Do NOT touch `orderTransform.js`, `RePrintButton.jsx`, or any print payload path.
8. Do NOT remove, rename, or modify the `isCheckInMarker` field or any existing filter based on it.
9. Do NOT add a second path that includes the marker in billing/print/UI under any condition.
10. Do NOT introduce a `/room-checkout-zero` client helper unless backend has confirmed it exists and is production-ready.

---

## 9. Safeguards for Implementation Agent

1. **Marker invariants (non-negotiable):** marker must remain hidden in UI, absent from billing math, absent from print payload, absent from `food_detail[]`. Re-grep `isCheckInMarker` after your edits — the hit-count in consumer filters must not decrease.
2. **Gate-widening must be narrow:** the override must require `isRoom && hasCheckInMarker && visibleCartItems.length === 0 && associatedOrders.length === 0`. Any broader condition risks enabling Collect Bill on genuinely empty non-room carts.
3. **Do not alter existing non-room disable behavior.** Run the testing agent with a dine-in empty cart to confirm button stays DISABLED.
4. **No payload shape changes** (AD-401/402). `food_detail:[]` is already produced cleanly by `orderTransform.js:808-810`; rely on it. Do not build a new payload.
5. **Default payment method to `'cash'` only inside the ₹0 branch.** Do not mutate the global default.
6. **Use `search_replace`, not file rewrites.** Preserve surrounding comments referencing `ROOM_CHECKIN_FIX_V2`.
7. **Observe V3 AD-001 rounding:** ₹0.00 grand total must emit as integer 0, not 0.0, per AD-001.

---

## 10. Edge Cases To Verify After Implementation

| # | Scenario | Expected |
|---|---|---|
| E1 | Marker-only room, no associated orders → tap Checkout | Modal (if Step D) → Cash → ₹0 bill-payment POST → room flips to Available |
| E2 | Marker-only room, 1+ associated orders | Button shows `₹associatedTotal`, standard payment flow, no zero-branch |
| E3 | Room with marker + 1 unplaced food item | Button DISABLED due to `hasPlacedItems && hasUnplacedItems` (existing rule) — must still trigger |
| E4 | Room with marker + placed food, not served | Existing gate `hasPlacedItems && !isServed` must still disable — the `isZeroCheckoutRoom` override must not apply because `visibleCartItems.length > 0` |
| E5 | Dine-in / walk-in / takeaway / delivery with empty cart | Button DISABLED (no regression) |
| E6 | Re-open a ₹0-checked-out room next day | Room shows Available, no stale marker, no stuck state |
| E7 | Backend rejects ₹0 POST (if Step A was skipped) | Frontend shows payment error toast — must not leave room in partial state |
| E8 | Socket emits `update-order-paid` after ₹0 checkout | Room removed from occupied list, standard path |
| E9 | Gap 1 — guest info present on GET | Cart fields pre-populate; field remains editable |
| E10 | Gap 1 — guest info absent on GET | Cart fields empty; no crash, no stale "Walk-In" leakage |

---

## 11. Things NOT To Change

- `orderTransform.js` marker injection (L223-234) and all consumer filters (`isCheckInMarker`).
- `orderTransform.js:808-810` `food_detail` filter.
- `billFoodList` / print-payload filters.
- Any socket handler.
- Any AD-101 / AD-001 / AD-001A / AD-021 billing math.
- `SC` default, round-off logic, GST-on-SC logic.
- RePrintButton / RoomCheckInModal / RoomCheckInService.
- `hasPlacedItems` semantics (still `cartItems.some(i => i.placed)`; marker remains `placed:true`).
- Package.json / supervisor / .env.

---

## 12. Final Handover Note

The input document is **technically correct and safe to implement** with two qualifications:

1. Gap 2 implementation MUST include the `associatedOrders.length === 0` guard in the `isZeroCheckoutRoom` predicate (see §5.4). This is the only substantive gap in the input document.
2. Backend pre-flight (§6.1 Step A) MUST run before any UX polish code is written.

Both fixes are small, surgical, and V3-AD-compliant. No architecture deviation. Check-in item invariants are preserved end-to-end (no UI leak, no billing leak, no print leak). Recommended order of work: **Gap 2 → Gap 1.** Use the same testing-agent-gated, step-by-step pattern proven in `ROOM_CHECKIN_UPDATE_ORDER_IMPLEMENTATION_NOTE.md`.

**Open items requiring confirmation before coding:**
- Does backend tolerate `food_detail:[]` + ₹0 payment on `/order-bill-payment`? (§5.5 — MUST)
- Does product want a confirmation modal for ₹0 checkout? (§5.6 — SHOULD)
- Does `roomService.getCheckInDetails(roomId)` exist? (§5.3 — only if Gap 1 frontend fallback is pursued)

**End of validated handover.**
