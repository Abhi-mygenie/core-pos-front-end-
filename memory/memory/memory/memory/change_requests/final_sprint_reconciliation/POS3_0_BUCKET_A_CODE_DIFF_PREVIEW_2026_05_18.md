# POS3.0 Bucket A — Code Diff Preview — 2026-05-18

## 1. Purpose

This is the **exact code-change preview** before source files are modified. Only owner-approved items are included.

---

## 2. Approved Items For Diff Preview

| Item | Approved By | Notes |
|---|---|---|
| BUG-102 | Owner (Gate 7) | Replace 8s timeout with immediate reset + 2s fallback |
| BUG-089 | Owner (Gate 7) | Add dedup guard to skip redundant API call |
| BUG-103 | Owner (Gate 7) | Global CSS rule to hide number spinners |
| ~~BUG-100~~ | Deferred | Owner deferred for further discussion (toast unification) |

---

## 3. Per-Item Diff Preview

---

### BUG-102 — Mark Ready/Served 8s Timeout Fix

#### File
`/app/frontend/src/components/cards/OrderCard.jsx`

#### Component / Function
`handleMarkReadyClick` (L90-99), `handleMarkServedClick` (L102-111), `handleAcceptClick` (L114-123)

#### Current Code Snippet (L89-124)

```javascript
  // Wrapped handlers for Ready/Serve/Accept/Reject with loading guard
  const handleMarkReadyClick = async () => {
    if (isActionInProgress) return;
    setIsMarkingReady(true);
    try {
      await onMarkReady?.(order);
    } catch (err) {
      console.error('[OrderCard] Ready failed:', err?.message);
    } finally {
      setTimeout(() => setIsMarkingReady(false), 8000);
    }
  };

  const handleMarkServedClick = async () => {
    if (isActionInProgress) return;
    setIsMarkingServed(true);
    try {
      await onMarkServed?.(order);
    } catch (err) {
      console.error('[OrderCard] Serve failed:', err?.message);
    } finally {
      setTimeout(() => setIsMarkingServed(false), 8000);
    }
  };

  const handleAcceptClick = async () => {
    if (isActionInProgress) return;
    setIsAcceptingOrder(true);
    try {
      await onAccept?.(order);
    } catch (err) {
      console.error('[OrderCard] Accept failed:', err?.message);
    } finally {
      setTimeout(() => setIsAcceptingOrder(false), 8000);
    }
  };
```

#### Proposed Code (replaces L89-124)

```javascript
  // BUG-102 (POS3.0): Replaced hardcoded 8s setTimeout with immediate reset
  // after await + 2s safety-net fallback. The await already waits for the API
  // response (~100-500ms), so the finally block resets immediately. The 2s
  // fallback timer (started at click time) catches edge cases where the await
  // hangs. Owner directive: "~2s max fallback, socket-response pattern."
  const handleMarkReadyClick = async () => {
    if (isActionInProgress) return;
    setIsMarkingReady(true);
    const fallback = setTimeout(() => setIsMarkingReady(false), 2000);
    try {
      await onMarkReady?.(order);
    } catch (err) {
      console.error('[OrderCard] Ready failed:', err?.message);
    } finally {
      clearTimeout(fallback);
      setIsMarkingReady(false);
    }
  };

  const handleMarkServedClick = async () => {
    if (isActionInProgress) return;
    setIsMarkingServed(true);
    const fallback = setTimeout(() => setIsMarkingServed(false), 2000);
    try {
      await onMarkServed?.(order);
    } catch (err) {
      console.error('[OrderCard] Serve failed:', err?.message);
    } finally {
      clearTimeout(fallback);
      setIsMarkingServed(false);
    }
  };

  const handleAcceptClick = async () => {
    if (isActionInProgress) return;
    setIsAcceptingOrder(true);
    const fallback = setTimeout(() => setIsAcceptingOrder(false), 2000);
    try {
      await onAccept?.(order);
    } catch (err) {
      console.error('[OrderCard] Accept failed:', err?.message);
    } finally {
      clearTimeout(fallback);
      setIsAcceptingOrder(false);
    }
  };
```

#### What changed
1. **Removed** `setTimeout(() => set...(false), 8000)` from all 3 `finally` blocks.
2. **Added** `const fallback = setTimeout(() => set...(false), 2000)` before the `try` — starts a 2s safety-net timer at click time.
3. **Added** `clearTimeout(fallback)` + direct `set...(false)` in `finally` — when the `await` resolves (success or error), cancel the fallback and reset immediately.
4. **Net effect:** Button disabled for API response time (~100-500ms). If `await` hangs, button re-enables at 2s. Never 8s.
5. **Preserved:** `isActionInProgress` double-click guard still prevents duplicate API calls during the short disabled window.

#### Lines unchanged
- L86-87: `isActionInProgress` definition — untouched
- L126-132: `handleRejectClick` — untouched (already uses 1s timeout for modal scenario)
- L134+: All other handlers (KOT, Bill, Settle) — untouched

---

### BUG-089 — Eliminate Redundant API Call on update-food-status

#### File
`/app/frontend/src/api/socket/socketHandlers.js`

#### Component / Function
Module-level dedup map (new), `handleOrderDataEvent` (L229), `handleUpdateFoodStatus` (L344)

#### Current Code Snippet — handleOrderDataEvent opening (L229-254)

```javascript
export const handleOrderDataEvent = async (message, context, eventName) => {
  const { updateOrder, removeOrder, updateTableStatus, getOrderById, setOrderEngaged, setTableEngaged } = context;
  
  const parsed = parseMessage(message);
  if (!parsed) {
    log('ERROR', `Invalid ${eventName} message format`, message);
    return;
  }
  
  const { orderId, payload } = parsed;
  log('INFO', `${eventName} received: ${orderId}`);
  
  // Transform payload — v2 only, no GET fallback
  if (!payload || !payload.orders || !Array.isArray(payload.orders) || payload.orders.length === 0) {
    log('ERROR', `${eventName}: No payload in v2 event — backend issue. orderId=${orderId}`);
    return;
  }
  
  let order;
  try {
    order = orderFromAPI.order(payload.orders[0]);
    log('INFO', `${eventName}: Transformed order ${orderId}`);
  } catch (error) {
    log('ERROR', `${eventName}: Transform failed`, error.message);
    return;
  }
```

#### Current Code Snippet — handleUpdateFoodStatus opening (L344-371)

```javascript
export const handleUpdateFoodStatus = async (message, { updateOrder, removeOrder, updateTableStatus, getOrderById, setTableEngaged }) => {
  const parsed = parseMessage(message);
  
  if (!parsed) {
    log('ERROR', 'Invalid update-food-status message format', message);
    return;
  }
  
  const { orderId } = parsed;
  log('INFO', `update-food-status received: ${orderId}`);
  
  // Guard: skip if order was already removed (cancelled/paid)
  if (getOrderById && !getOrderById(orderId)) {
    log('INFO', `update-food-status: Order ${orderId} already removed, skipping`);
    return;
  }
  
  // WORKAROUND: Get tableId from existing order to engage table immediately
  const existingOrder = getOrderById ? getOrderById(orderId) : null;
  const tableId = existingOrder?.tableId;
  
  // WORKAROUND: Engage table before fetch (lock UI)
  if (setTableEngaged && tableId && tableId !== 0) {
    setTableEngaged(tableId, true);
    log('INFO', `update-food-status: Table ${tableId} ENGAGED (workaround - no table socket)`);
  }
  
  const order = await fetchOrderWithRetry(orderId);
```

#### Proposed Code — New module-level dedup map (insert after L15, before L16)

```javascript
// BUG-089 (POS3.0): Dedup map — tracks orderIds recently processed by
// handleOrderDataEvent (v2 payload events). When handleUpdateFoodStatus
// fires for the same orderId within the window, skip the redundant API call.
// Room-transfer events (where update-food-status fires without a v2
// counterpart) pass through because no v2 event recorded the orderId.
const _recentV2Updates = new Map();
const V2_DEDUP_WINDOW_MS = 5000;
```

#### Proposed Code — Record in handleOrderDataEvent (insert after L239 `log('INFO', ...)`)

```javascript
  // BUG-089: Record this orderId so the legacy update-food-status handler
  // can skip its redundant API call if it fires within the dedup window.
  _recentV2Updates.set(orderId, Date.now());
  // Housekeep: prune entries older than the window to prevent unbounded growth
  if (_recentV2Updates.size > 200) {
    const cutoff = Date.now() - V2_DEDUP_WINDOW_MS;
    for (const [k, t] of _recentV2Updates) {
      if (t < cutoff) _recentV2Updates.delete(k);
    }
  }
```

#### Proposed Code — Guard in handleUpdateFoodStatus (insert after L353 `log('INFO', ...)`)

```javascript
  // BUG-089: If this orderId was recently processed by a v2 payload event
  // (update-item-status, update-order, etc.), the data is already in context.
  // Skip the redundant get-single-order-new API call.
  const lastV2 = _recentV2Updates.get(orderId);
  if (lastV2 && (Date.now() - lastV2) < V2_DEDUP_WINDOW_MS) {
    log('INFO', `update-food-status: Order ${orderId} recently updated via v2 payload (${Date.now() - lastV2}ms ago), skipping redundant API call`);
    return;
  }
```

#### What changed
1. **New module-level** `_recentV2Updates` Map + `V2_DEDUP_WINDOW_MS = 5000` constant.
2. **handleOrderDataEvent** records `orderId → timestamp` after successful parse (1 insert + housekeep block).
3. **handleUpdateFoodStatus** checks the map before the API call — if the orderId was processed via v2 within 5s, returns early.
4. **Room-transfer preserved:** Room transfer fires `update-food-status` WITHOUT a v2 counterpart, so the orderId won't be in the map — the full handler runs.

#### Lines unchanged
- All of `handleOrderDataEvent` logic after the recording (transform, table detect, remove/update, engage release) — untouched.
- All of `handleUpdateFoodStatus` after the guard (API call, terminal check, table engage) — untouched for non-deduped events.
- `socketEvents.js` — untouched (`UPDATE_FOOD_STATUS` stays in `EVENTS_REQUIRING_ORDER_API`).
- `useSocketEvents.js` — untouched (still routes to `handleUpdateFoodStatus`).
- `orderService.js` `fetchSingleOrderForSocket` — untouched (deletion is BUG-095).

---

### BUG-103 — Hide Native Number-Input Spinner Arrows

#### File
`/app/frontend/src/index.css`

#### Component / Function
Global stylesheet — new rule block at end of file.

#### Current Code Snippet (end of file, L116-132)

```css
/* Req 2: Order Taking disabled — cursor feedback for non-clickable cards.
   Keeps in-card action buttons (Mark Ready, Mark Served, Print, Confirm,
   Cancel) interactive (they have explicit cursor styling and pointer-events). */
.order-taking-disabled [data-testid^="table-card-"],
.order-taking-disabled [data-testid^="dinein-card-"],
.order-taking-disabled [data-testid^="delivery-card-"],
.order-taking-disabled [data-testid^="order-card-"] {
  cursor: default !important;
}
.order-taking-disabled [data-testid^="table-card-"] button,
.order-taking-disabled [data-testid^="dinein-card-"] button,
.order-taking-disabled [data-testid^="delivery-card-"] button,
.order-taking-disabled [data-testid^="order-card-"] button {
  cursor: pointer !important;
}
```

#### Proposed Code (append after L132)

```css

/* BUG-103 (POS3.0): Hide native browser spinner arrows on all number inputs.
   Covers Chrome/Edge/Safari (webkit) and Firefox (moz). Replaces inconsistent
   per-input Tailwind classes — 2 inputs already had the fix, 6 did not. */
input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type=number] {
  -moz-appearance: textfield;
}
```

#### What changed
1. **Appended** 9-line CSS block at end of `index.css`.
2. **Effect:** All `input[type=number]` elements across the entire app have native spinners hidden.
3. **Backwards compatible:** The 2 inputs that already had Tailwind spinner-hiding classes (Tip L1107, Delivery L1168 in `CollectPaymentPanel.jsx`) are unaffected — the global rule and Tailwind classes produce the same result.

#### Lines unchanged
- All existing CSS in `index.css` — untouched.
- `CollectPaymentPanel.jsx` — untouched (no need to modify individual inputs).
- All other stylesheets — untouched.

---

## 4. Summary of All Changes

| File | Bug | Type of Change | Lines Added | Lines Removed | Lines Modified |
|---|---|---|---|---|---|
| `components/cards/OrderCard.jsx` | BUG-102 | Modify 3 handler functions | ~9 (fallback + clearTimeout + comment) | ~3 (old setTimeout lines) | 3 functions |
| `api/socket/socketHandlers.js` | BUG-089 | Insert dedup map + recording + guard | ~20 | 0 | 0 (insertions only) |
| `src/index.css` | BUG-103 | Append CSS block | 9 | 0 | 0 (append only) |

**Total: 3 files, ~38 lines added, ~3 lines removed, 3 functions modified.**

---

## 5. Files NOT Modified

| File | Why not |
|---|---|
| `DashboardPage.jsx` | Handlers return correctly; no change needed |
| `socketEvents.js` | Event definitions stay; deletion is BUG-095 |
| `useSocketEvents.js` | Routing stays; deletion is BUG-095 |
| `orderService.js` | `fetchSingleOrderForSocket` stays; deletion is BUG-095 |
| `CollectPaymentPanel.jsx` | Global CSS rule handles spinner; no per-input change |
| `NotificationContext.jsx` | BUG-100 deferred |
| All files under `/app/memory/final/` | Frozen baseline; untouched |

---

*— End of POS3.0 Bucket A Code Diff Preview — 2026-05-18 —*
