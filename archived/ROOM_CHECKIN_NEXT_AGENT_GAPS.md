# ROOM CHECK-IN — NEXT-AGENT HANDOVER

**Context:** The primary "Check-In → Update-Order routing" fix is COMPLETE (see `ROOM_CHECKIN_UPDATE_ORDER_IMPLEMENTATION_NOTE.md`). Two follow-up gaps were observed during manual validation. Both are **out of scope** for the completed 3-step fix. This doc scopes them for the next implementation session.

**Status:** Analysis only. No code changes made. Code-verified line references throughout.

---

## GAP 1 — Customer name & phone not auto-populated from check-in

### Priority
**HIGH** (friction, not blocking). Operator must retype the guest's name/phone when adding room-service orders, even though the data was already captured at check-in.

### Expected behavior
When a checked-in room is opened in the POS, the Customer Name and Customer Phone fields in the cart should be pre-filled with the guest's check-in details.

### Code-verified frontend plumbing (already in place)

| Layer | File & line | What it does |
|---|---|---|
| Check-In submit | `frontend/src/components/modals/RoomCheckInModal.jsx:504-506` | Sends `{ name, phone, email, … }` to `roomService.checkIn()`. |
| Order transform | `frontend/src/api/transforms/orderTransform.js:137-141, 176-179` | Maps `api.user_name` → `customerName`; `api.user.phone` → `phone`. |
| OrderEntry hydrate | `frontend/src/components/order-entry/OrderEntry.jsx:245-288` | Seeds `customer` state: `{ name: orderData.customerName, phone: orderData.phone }`. |
| CartPanel inputs | `frontend/src/components/order-entry/CartPanel.jsx:288-289` | `useState(customer?.name || "")`, `useState(customer?.phone || "")`. |

**Contract:** if the backend sends `api.user_name` + `api.user.phone` on the room's order, the cart inputs WILL auto-populate. No frontend refactor needed.

### Likely root cause — backend
One of:
- **A (most likely)**: the auto-generated "Check-In" order doesn't link the guest user, so subsequent order GETs / socket frames return empty `user_name` + `user.phone`.
- **B**: `user_name` populates but `user.phone` does not (partial linkage).

### Verification protocol (before coding)
1. Log in at the preview URL with the test creds (see `test_credentials.md`).
2. Open any checked-in room.
3. DevTools → Network → locate the room's order GET (`getOrderByTableId` or running-orders socket frame).
4. Inspect response body for:
   - `user_name`
   - `user` object (`f_name`, `l_name`, `phone`)
5. **If both populated** → frontend bug; see below.
6. **If empty** → backend gap; see below.

### Fix direction

**If backend returns the data (unexpected):**
- Inspect `OrderEntry.jsx:281` — the guard `if (orderData.customer || orderData.phone)` checks `orderData.customer` (the synthetic display label like "Walk-In"/"TA"/"Del"), not `orderData.customerName`. Widen to also check `orderData.customerName`. Single-line edit.

**If backend doesn't return the data (expected case):**
- **Backend work** (preferred): on the check-in flow, ensure the synthetic Check-In order's `user_id` points to the guest's user record. Existing transform + UI will then work with no frontend change.
- **Frontend fallback** (only if backend change is slow): in `OrderEntry.jsx` hydration, if `orderData.customerName` is empty AND `isRoom && cartItems.some(i => i.isCheckInMarker)`, call a lookup (e.g., `roomService.getCheckInDetails(roomId)` — verify such endpoint exists; otherwise add) to fetch `{ guestName, guestPhone }` and seed `customer` state. Additive + low-risk.

### Estimated effort
- Backend fix: ~1-2 hours
- Frontend fallback: ~30 minutes
- QA: 1 test case (open checked-in room → verify inputs are pre-filled)

### V3 compliance
- No AD impact. Display-layer enhancement only.

---

## GAP 2 — ₹0 Checkout for marker-only rooms — CRITICAL

### Priority
**CRITICAL** (blocking). When a room is checked in but no food/service has been ordered, the Collect Bill / Checkout button is DISABLED. The room cannot be settled via the POS — it gets stranded in "occupied" state.

### Expected behavior
A checked-in room must always be checkoutable, even with zero orders. The ₹0 flow should:
1. Enable the Checkout button on the marker-only room.
2. On click, skip payment-method selector (or default to Cash).
3. Fire `POST /order-bill-payment` with `food_detail: []`, `payment_amount: 0`, `payment_mode: 'cash'`, `payment_status: 'paid'`.
4. Room card flips to "Available".

### Code-verified blocking gates

**Gate A — `frontend/src/components/order-entry/CartPanel.jsx:790-795`:**
```js
disabled={
  visibleCartItems.length === 0 ||           // marker filtered out → 0 → DISABLED
  (!hasPlacedItems && hasValidationErrors) ||
  (hasPlacedItems && hasUnplacedItems) ||
  (hasPlacedItems && !isServed)              // marker status = 'preparing' → DISABLED
}
```

**Gate B — `frontend/src/components/order-entry/CollectPaymentPanel.jsx:1755`:**
```js
disabled={
  (cartItems || []).filter(i => !i.isCheckInMarker).length === 0 ||   // same issue
  ...
}
```

Both gates were added during Step 2 of the earlier fix to preserve pre-fix behavior. **Correct default for non-room orders; wrong for rooms** — rooms must always be checkoutable.

### Supporting facts already in code
- `isRoom` prop is already plumbed into both components (`CartPanel.jsx:258`, `CollectPaymentPanel.jsx` used at `:417`).
- Button label already switches to "Checkout" for rooms (`CartPanel.jsx:799`, `CollectPaymentPanel.jsx:417`).
- `collectBillExisting.food_detail` filter (Step 3, `orderTransform.js:809`) already handles empty-food case correctly → sends `food_detail: []`.
- Service-charge flag already accommodates rooms (`OrderEntry.jsx:617`).

### Fix direction (conceptual — not yet implemented)

**Step A — CartPanel disable gate (`CartPanel.jsx:790-795`):**
```js
const hasCheckInMarker = cartItems.some(i => i.isCheckInMarker);
const isZeroCheckoutRoom = isRoom && hasCheckInMarker && visibleCartItems.length === 0;

disabled={
  (!isZeroCheckoutRoom && visibleCartItems.length === 0) ||
  (!hasPlacedItems && hasValidationErrors) ||
  (hasPlacedItems && hasUnplacedItems) ||
  (hasPlacedItems && !isServed && !isZeroCheckoutRoom)
}
```

**Step B — CollectPaymentPanel Pay button gate (`CollectPaymentPanel.jsx:1755`):**
Mirror the override — when `isRoom && hasCheckInMarker && visibleCartItems.length === 0`, skip the length==0 disable.

**Step C — UX polish (strongly recommended):**
- Confirmation modal on first tap: *"Check out room with no outstanding bill? (₹0)"* → Yes.
- Skip payment-method selector for ₹0 case; default to Cash.
- On success: standard room-to-Available flow.

**Step D — Backend pre-flight verification:**
Before shipping, confirm `POST /api/v2/vendoremployee/order/order-bill-payment` accepts:
- `food_detail: []`
- `payment_amount: 0`
- `grand_amount: 0`
- `payment_mode: 'cash'`
- `payment_status: 'paid'`

If the backend rejects an empty `food_detail` or zero payment, either:
- Backend tolerance fix (preferred — 1-line validator update), OR
- New dedicated `/room-checkout-zero` endpoint.

### Testing approach (next agent should gate each step via testing agent)
Recommend the same 3-step testing-agent-gated pattern used in the previous fix:
- **Step 1**: Apply Gate A + B overrides. Testing agent opens a marker-only room, verifies Checkout button is enabled with "₹0" label. No regression on non-room disable behavior.
- **Step 2**: Implement UX polish (confirmation modal / auto-Cash). Testing agent verifies modal + ₹0 Cash flow end-to-end.
- **Step 3**: Capture live `POST /order-bill-payment` payload; verify backend acceptance; verify room flips to Available.

### Files in scope (anticipated)
| File | Expected edits |
|---|---|
| `frontend/src/components/order-entry/CartPanel.jsx` | 1 edit at L790-795 |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | 1 edit at L1755; possibly 1 edit to auto-set Cash on zero-total; possibly new confirmation modal |
| Backend (unknown repo) | Verify tolerance for empty `food_detail` + ₹0 payment |

### V3 compliance
- AD-001 (rounding): ₹0 rounds to ₹0 — no edge case.
- AD-401 / AD-402 (frontend-owned payment payload): ✅ no shape change; only gate change.
- No AD conflicts.

### Estimated effort
- Frontend: 2-4 hours including UX polish.
- Backend (if needed): 1-2 hours for endpoint tolerance.
- QA: 1 new E2E case (marker-only room checkout) + regression.

---

## Cross-gap notes

### What the next agent should read first
1. `/app/memory/ROOM_CHECKIN_UPDATE_ORDER_FIX_V2.md` — plan for the completed primary fix.
2. `/app/memory/ROOM_CHECKIN_UPDATE_ORDER_IMPLEMENTATION_NOTE.md` — what's already shipped (17 edits, 5 files).
3. `/app/v3/ARCHITECTURE_DECISIONS_FINAL.md` — V3 ADs (do not deviate).
4. `/app/memory/test_credentials.md` — login creds + tenant 478 details.
5. Test reports `/app/test_reports/iteration_{1,2,3,4}.json` — known test-run quirks (splash hydration takes 30-90s; `collect-bill-btn` pre-existing gate issue).

### Test-agent known quirks (saves time)
- Splash hydration: use `page.set_default_timeout(120000)` and wait for `document.querySelectorAll('[data-testid^="loading-item-"]').length === 0`.
- Tenant 478 is the primary QA tenant. Rooms `r1 (table-card-3245)`, `r2 (table-card-3244)`, `e3 (table-card-6182)` have been used previously; state may have drifted — re-verify before reusing.
- The dashboard `Bill` button routes to `/order-temp-store` (print-preview), NOT to the payment panel. To reach CollectPaymentPanel programmatically: tap the room card body → OrderEntry → Collect Bill. This will be easier to reach once Gap 2 Step A is implemented.

### Known non-blockers flagged (do not re-investigate unless product priorities change)
- `LoadingPage.jsx:101` — stale `react-hooks/exhaustive-deps` ESLint warning (pre-existing).
- Dashboard `Bill` button wiring review (mentioned in iteration 4 action items) — optional.

---

## Recommended order of work
1. **Gap 2 first** (CRITICAL — unblocks stranded rooms).
2. **Gap 1 second** (HIGH — friction reduction).

Each gap should use the testing-agent-gated stepped pattern proven in the previous fix.

---

## Contact points / ambiguities to resolve with product
- Gap 1: is there an existing endpoint `roomService.getCheckInDetails(roomId)` for the frontend fallback? If not, product should decide: backend-first fix or add the endpoint.
- Gap 2: does product want a confirmation modal before ₹0 checkout, or silent one-tap? (Recommend confirmation for audit trail.)
- Gap 2: does the backend currently accept empty `food_detail` + ₹0 payment? Needs a one-off curl or dev-team confirmation.

---

**End of handover.**
