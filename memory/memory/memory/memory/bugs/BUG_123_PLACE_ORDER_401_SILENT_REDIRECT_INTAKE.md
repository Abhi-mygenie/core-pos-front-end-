# BUG-123 — Place Order on 401 (auth expired) silently redirects; cashier mistakes failure for success

> **RENUMBERED 2026-06-11:** formerly BUG-120 — ID collision with closed "CR-014 Menu Mgmt Post-Delivery" BUG-120. Owner-approved renumber (baseline consolidation R3).

**Status:** INTAKE
**Priority:** P1 (financial / operational integrity — cashier may believe an unplaced order was placed)
**Sprint:** POS 4.0
**Opened:** 2026-06-08
**Reporter:** Owner
**Component:** `OrderEntry.jsx` (place-order path) + `axios.js` (401 interceptor)

---

## 1. Problem Statement (Owner Verbatim)

> When we place order and suppose user is not logged in, order still redirects sending message 401, but cashier might miss and think order got placed. Open another bug for this.

---

## 2. Symptom

When a cashier hits **Place Order** while their auth token is **invalid/expired**:
1. FE fires the order POST in **fire-and-forget** mode (no await on the HTTP response)
2. FE proceeds to wait for a socket `update-table engage` event (up to 10 s) OR a fixed 0.5 s delay for non-table orders
3. The 401 response eventually arrives → axios interceptor clears auth + redirects to `/` (login page)
4. **Race condition:** depending on timing, the cashier may briefly see the dashboard "success" path, or see a faint toast "Order Failed", before being bounced to login
5. Critically: **no order was actually created on the backend**, but the cashier's mental model is "order placed" because the UI redirected to the dashboard

This causes:
- Missed customer orders (cashier moves on, food never reaches kitchen)
- Lost revenue (item served verbally without record)
- Confusion at settlement time

---

## 3. Reproduction Steps

1. Login to POS, navigate to Order Entry, add items to cart
2. In another tab / via DevTools, invalidate the auth token (e.g., `localStorage.removeItem('auth_token')` OR force a 401 from backend by editing token)
3. Click **Place Order**
4. Observe:
   - Brief navigation to dashboard (or socket-wait timeout path)
   - Bounce to login screen
   - No order in Order Ledger / Audit Report
5. Ask cashier to recall what they saw → likely "order was placed, then it logged me out"

---

## 4. Current Code Path

### `src/components/order-entry/OrderEntry.jsx` L940-969 (Place Order — New Order branch)
```js
// Fire HTTP request (don't await response) - sockets handle state
api.post(API_ENDPOINTS.PLACE_ORDER, formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
})
  .then(res => console.log('[PlaceOrder] HTTP response:', res.data))
  .catch(err => {
    console.log('[PlaceOrder] ERROR status:', err?.response?.status);
    const apiMsg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Failed';
    toast({ title: "Order Failed", description: apiMsg });
  });

// Wait for socket update-table engage before redirect
const tableId = Number(table?.tableId);
if (tableId) {
  await waitForTableEngaged(tableId, 10000);   // ← will TIME OUT silently on 401 (no socket event)
} else {
  await new Promise(resolve => setTimeout(resolve, 500));   // ← walk-in / takeaway / delivery
}

setIsPlacingOrder(false);
navigateAfterOrderAction();   // ← UNCONDITIONALLY navigates to dashboard
return;
```

### `src/api/axios.js` L40-52 (401 interceptor)
```js
if (error.response?.status === 401) {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('remember_me');
  if (window.location.pathname !== '/') {
    sessionStorage.setItem('auth_redirect', '1');
    window.location.href = '/';
  }
}
```

### Why the cashier is misled
- **Place Order is fire-and-forget** — the function does NOT await the HTTP promise; it proceeds in parallel
- **Socket-wait path** (`waitForTableEngaged(tableId, 10000)`) resolves on timeout, doesn't throw → navigates regardless
- **Walk-in / Takeaway / Delivery path** uses a fixed 500 ms delay then navigates → navigation may complete BEFORE the 401 reaches the interceptor
- **Toast collides with navigation** — `toast()` is fired from the `.catch()` but the route changes immediately
- **Interceptor's redirect to `/`** uses `window.location.href` (full page reload) → kills the toast, kills the dashboard render, but cashier already saw the "successful" UI flash

---

## 5. Affected Flows

| Flow | Wait mechanism | Worst-case cashier impression on 401 |
|---|---|---|
| Dine-In (table) | `waitForTableEngaged(10000)` | After 10 s timeout, navigates to dashboard → bounce to login. Cashier likely sees "order placed, then I got logged out for inactivity" |
| Walk-In / Take-Away / Delivery | 500 ms fixed delay | Navigates to dashboard within ~0.5 s → very high chance cashier perceives success before bounce |
| Update Order (existing) | Different branch (`Scenario 1`) | Needs separate audit |
| Collect Bill (`placeOrderWithPayment`) | Needs separate audit | Higher stakes — payment may have been initiated externally |
| Transfer Food | Same fire-and-forget + socket-wait pattern | Same risk class |

---

## 6. Expected Behaviour

When the order POST fails with **any** non-2xx (especially 401), the UI MUST:
1. **Block the redirect** — keep the cashier on the Order Entry screen
2. **Show a blocking modal** (not a toast — toasts are missable) saying "Order NOT placed — please log in again" / "Order failed — try again"
3. **Preserve the cart state** (cart items, customer info, modifiers) so cashier can retry after re-login without re-entering
4. **For 401 specifically:** keep the cart in `sessionStorage` or app state so post-login the cashier returns to the same cart

---

## 7. Likely Fix Sketches (NOT implemented — discovery only)

### Option A — Await HTTP, dual-track redirect
```js
const httpPromise = api.post(...);   // start
const socketPromise = waitForTableEngaged(tableId, 10000);   // start in parallel

try {
  const [httpRes] = await Promise.all([httpPromise, socketPromise]);
  // Both succeeded — safe to redirect
  navigateAfterOrderAction();
} catch (err) {
  // HTTP failed — block redirect, show modal, preserve cart
  setOrderFailedModal({ status: err?.response?.status, message: err.readableMessage });
  // 401 interceptor will still bounce to login, but at least cashier sees the modal first
}
```

### Option B — Race with HTTP error-first
```js
const result = await Promise.race([
  httpPromise.then(r => ({ ok: true, r })).catch(e => ({ ok: false, e })),
  socketPromise.then(() => ({ ok: 'socket' }))
]);
if (result.ok === false) {
  // Show blocking failure modal, preserve cart, do NOT redirect
  return;
}
// proceed to redirect
```

### Option C — Pre-flight auth check
Before firing the order POST, ping a lightweight endpoint (e.g., `/profile`) and abort placement if 401. Slower but eliminates the race.

### Option D — Tighten 401 interceptor
Set a global "auth invalidated" flag immediately on 401; the place-order resolver checks this flag before navigating.

---

## 8. Decision Points for Owner

1. **Block-on-failure modal vs toast?** Modal recommended (force-acknowledge).
2. **Cart preservation post-401?** Recommended (save to sessionStorage; restore on re-login).
3. **Cover all order endpoints or just Place Order?** Recommended: extend to Collect Bill, Transfer, Cancel, Update Order — same fire-and-forget pattern exists elsewhere.
4. **Tolerate the timeout path (Option A) vs eliminate the race (Option C)?** A is more responsive; C is more robust.

---

## 9. Likely Affected Files

| File | Role |
|---|---|
| `src/components/order-entry/OrderEntry.jsx` L940-981 | Main place-order handler (New Order) |
| `src/components/order-entry/OrderEntry.jsx` (Update Order branch) | Existing order edit path — same fire-and-forget pattern |
| `src/components/order-entry/CollectPaymentPanel.jsx` (or equivalent) | Collect Bill `placeOrderWithPayment` path |
| `src/components/order-entry/OrderEntry.jsx` L993-1009 | Transfer Food — same fire-and-forget pattern |
| `src/api/axios.js` L40-52 | 401 interceptor — may need to expose the auth-invalidated state |
| `src/contexts/AuthContext.jsx` (if exists) | Auth state propagation |
| Cart state persistence layer | New: `sessionStorage` save/restore on auth bounce |

---

## 10. Related Items

- **BUG-112** — Auto-print (order-temp-store) blocked by Place Order API response (Phase 1 implemented) — related fire-and-forget design choice; this bug is the **safety cost** of that choice
- **BUG-117** (just closed) — surfaced while owner was reviewing reports; reporter raised this concern in the same session

---

## 11. Next Steps (deferred)

1. Owner triage: choose decision points from §8
2. FE: discovery on Collect Bill / Transfer / Update Order branches (verify same fire-and-forget pattern)
3. FE: design auth-aware navigation guard + cart-preservation strategy
4. QA: design test scenarios — invalid token, expired token, network failure, mixed (token valid but server 500)

**No code changes yet.** Intake captured for prioritisation.
