# TASK_P0_3_SOCKET_DEDUP.md
## Implementation Task: Per-OrderId Dedup for Socket Handlers

> Priority: P0 | Type: Refactor Now | Blocks: Nothing | Blocked by: Nothing
> Duration: ~45 minutes | Two-file change (primary + secondary) + verification

---

## Objective

Add a per-orderId deduplication mechanism to `socketHandlers.js` so that when multiple socket events fire for the same order in rapid succession, only the LATEST enrichment (GET API call) completes and writes to context. Earlier in-flight requests for the same orderId are cancelled.

---

## Why This Task Is Needed Now

This is the highest value-for-effort item in the entire backlog:
- **No blockers** — no validation or backend confirmation required
- **Single file** — all changes in `socketHandlers.js`
- **Clear problem** — RISK-003 documents the exact race condition
- **Proven pattern** — AbortController-based cancellation is a standard web API

**Current behavior** (from VALIDATED_ARCHITECTURE.md Section 1.2):
```
Socket: update-order (orderId=123)     → GET /single-order (orderId=123) → updateOrder(response_A)
Socket: update-food-status (orderId=123) → GET /single-order (orderId=123) → updateOrder(response_B)
```
If response_A arrives AFTER response_B (slower network), context holds stale `response_A`.

**Target behavior**:
```
Socket: update-order (orderId=123)     → GET /single-order (orderId=123) → CANCELLED
Socket: update-food-status (orderId=123) → GET /single-order (orderId=123) → updateOrder(response_B)
```
Only the latest request survives.

---

## Affected Modules/Files

**Primary file**:
- `api/socket/socketHandlers.js` — 455 LOC

**Secondary file**:
- `api/services/orderService.js` — 52 LOC (1-line signature change + 1-line Axios config change to pass `signal`)

**No other files are modified.**

**Functions to modify in socketHandlers.js**:
| Function | Line | Change |
|----------|------|--------|
| `fetchOrderWithRetry` | 85-109 | Accept optional `AbortSignal` parameter |
| `handleNewOrder` | 145-196 | Route enrichment through dedup layer |
| `handleUpdateOrder` | 203-237 | Route enrichment through dedup layer |
| `handleUpdateFoodStatus` | 244-269 | Route enrichment through dedup layer |
| `handleUpdateOrderStatus` | 281-322 | Route enrichment through dedup layer |
| `handleScanNewOrder` | 329-348 | Route enrichment through dedup layer |
| `handleDeliveryAssignOrder` | 355-374 | Route enrichment through dedup layer |

**Function to modify in orderService.js**:
| Function | Line | Change |
|----------|------|--------|
| `fetchSingleOrderForSocket` | 38-51 | Accept optional `signal` param, pass to Axios config |

**Files NOT modified**:
- `socketService.js` — no changes (connection layer)
- `useSocketEvents.js` — no changes (event routing layer)
- `socketEvents.js` — no changes (constants)
- ALL context files — no changes
- ALL component files — no changes

---

## Exact Scope

**IN SCOPE:**
1. Add module-level `inflightOrders` Map to `socketHandlers.js`
2. Create `dedupedFetch(orderId)` wrapper around `fetchOrderWithRetry`
3. In `dedupedFetch`: cancel any in-flight request for same orderId before starting new one
4. Route all 6 async handlers through `dedupedFetch` instead of calling `fetchOrderWithRetry` directly
5. Pass `AbortSignal` through `fetchOrderWithRetry` → `fetchSingleOrderForSocket` → Axios
6. Handle `AbortError`/`CanceledError` gracefully (log, don't treat as failure)
7. Clean up `inflightOrders` entry on completion (success, error, or abort)

**EXCLUDED SCOPE:**
- No changes to `handleUpdateTable` (it's synchronous, no API call)
- No changes to any context or component file
- No changes to the socket connection, event routing, or channel subscription logic
- No debounce/throttle by time — only cancel-previous-on-new-arrival
- No changes to the engaged lock mechanism — locks/unlocks remain in handlers as-is

**IMPLEMENTATION RULE — Engaged Lock Behavior**:

> **Do not change engaged lock behavior in this task.**
> This task is ONLY for deduplicating per-order GET enrichment and preventing stale context writes.
> Existing lock/unlock semantics must remain UNCHANGED.

Concretely, this means:
- Every `setTableEngaged(tableId, true)` call stays exactly where it is
- Every `setTableEngaged(tableId, false)` call (inside double-rAF) stays exactly where it is
- If a `dedupedFetch` call is aborted and the handler exits early, the lock remains held. This is correct — the NEWER request that superseded this one will complete and release the lock via the existing double-rAF pattern.
- Do NOT add, remove, or move any `setTableEngaged` call as part of this task

---

## Implementation Steps

### Step 1: Add the inflight map and dedup wrapper (top of file, after imports)

Add after the `log` helper (after line 30):

```js
// =============================================================================
// DEDUP: Cancel-previous-on-new for per-orderId enrichment
// Ensures only the LATEST socket event's GET call completes
// =============================================================================
const inflightOrders = new Map(); // orderId → AbortController

/**
 * Fetch order with dedup — cancels any in-flight request for the same orderId
 * @param {number} orderId
 * @returns {Object|null} Transformed order or null (also null if aborted)
 */
const dedupedFetch = async (orderId) => {
  // Cancel any existing in-flight request for this orderId
  const existing = inflightOrders.get(orderId);
  if (existing) {
    log('INFO', `dedupedFetch: Cancelling in-flight request for order ${orderId}`);
    existing.abort();
  }
  
  // Create new AbortController for this request
  const controller = new AbortController();
  inflightOrders.set(orderId, controller);
  
  try {
    const order = await fetchOrderWithRetry(orderId, 1, controller.signal);
    return order;
  } catch (error) {
    if (error.name === 'AbortError' || error.name === 'CanceledError') {
      log('INFO', `dedupedFetch: Request for order ${orderId} was superseded`);
      return null; // Aborted — a newer request is handling this orderId
    }
    throw error; // Re-throw non-abort errors
  } finally {
    // Only clean up if THIS controller is still the current one
    // (prevents a new request's controller from being removed by an old one's finally)
    if (inflightOrders.get(orderId) === controller) {
      inflightOrders.delete(orderId);
    }
  }
};
```

### Step 2: Modify `fetchOrderWithRetry` to accept AbortSignal

Current signature: `const fetchOrderWithRetry = async (orderId, retries = 1)`

New signature: `const fetchOrderWithRetry = async (orderId, retries = 1, signal = null)`

Changes within the function:
- Pass `signal` to `fetchSingleOrderForSocket`:
  ```js
  const order = await fetchSingleOrderForSocket(orderId, signal);
  ```
- Before each retry, check if aborted:
  ```js
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  ```

### Step 3: Modify `fetchSingleOrderForSocket` in orderService.js (secondary file)

This is the secondary file change — a 1-line parameter addition and 1-line Axios config change:

Current: `export const fetchSingleOrderForSocket = async (orderId) =>`
New: `export const fetchSingleOrderForSocket = async (orderId, signal = null) =>`

Pass to Axios:
```js
const response = await api.post(API_ENDPOINTS.SINGLE_ORDER_NEW, {
  order_id: orderId,
}, signal ? { signal } : undefined);  // ← pass signal to Axios config when present
```

### Step 4: Route handlers through `dedupedFetch`

In each async handler, replace:
```js
const order = await fetchOrderWithRetry(orderId);
```
with:
```js
const order = await dedupedFetch(orderId);
if (!order) return; // Aborted (superseded by newer event) — exit cleanly
```

**Apply to these handlers** (6 total):
1. `handleNewOrder` — line 177: the ASYNC enrichment part (after initial `addOrder` from socket payload)
2. `handleUpdateOrder` — line 220
3. `handleUpdateFoodStatus` — line 261
4. `handleUpdateOrderStatus` — line 293
5. `handleScanNewOrder` — line 340
6. `handleDeliveryAssignOrder` — line 366

**IMPORTANT for `handleNewOrder`**: The initial `addOrder()` from socket payload (synchronous part, lines 153-172) must NOT be guarded by dedup. Only the ASYNC enrichment (lines 173-195) goes through `dedupedFetch`. The initial add-from-socket gives us something to display immediately; the dedup ensures the GET enrichment doesn't stale-overwrite.

**IMPORTANT for `handleUpdateOrderStatus`**: After `dedupedFetch` returns null (aborted), the handler must NOT call `removeOrder`. Only call `removeOrder` when the fetch returns an actual order with status `cancelled`/`paid`, or when fetch returns null from the API (not from abort). Distinguish:
```js
const order = await dedupedFetch(orderId);
if (order === null) {
  // Could be: (a) API returned no order, or (b) request was aborted
  // Check if it was aborted by checking if our controller was replaced
  if (!inflightOrders.has(orderId)) {
    // Controller was cleaned up = fetch completed normally but returned null = order not in API
    // → safe to remove
    removeOrder(orderId);
  }
  // else: aborted by newer request → don't touch anything, newer request will handle it
  return;
}
```

Actually, simpler approach — `dedupedFetch` already handles this distinction. When aborted, it returns `null` and the caller exits. When API returns no order, `fetchOrderWithRetry` returns `null` normally, `dedupedFetch` returns `null` normally, and the `finally` block cleans up the map entry. So the handler CAN distinguish by checking `inflightOrders.has(orderId)` after getting `null`.

But the cleanest solution: make `dedupedFetch` return a sentinel for abort:
```js
const ABORTED = Symbol('ABORTED');

const dedupedFetch = async (orderId) => {
  // ... same as above but in catch:
  catch (error) {
    if (error.name === 'AbortError' || error.name === 'CanceledError') {
      return ABORTED;
    }
    throw error;
  }
};
```

Then in handlers:
```js
const order = await dedupedFetch(orderId);
if (order === ABORTED) return; // Superseded — exit silently
if (order === null) {
  // Genuinely not found in API
  removeOrder(orderId);  // (only in handleUpdateOrderStatus)
  return;
}
// Normal: use order
```

### Step 5: Verify no handler calls `fetchOrderWithRetry` directly anymore

After changes, `fetchOrderWithRetry` should only be called by `dedupedFetch`. All handlers call `dedupedFetch`.

---

## Risks

| Risk | Mitigation |
|------|-----------|
| Aborting a request that was the only enrichment path for a new order | `handleNewOrder` still does initial `addOrder()` from socket payload synchronously. The abort only cancels the enrichment GET. The order is visible (with partial data) until the next event triggers another enrichment. |
| `AbortError` not caught properly in Axios | Axios throws `CanceledError` (not `AbortError`) when request is cancelled via signal. The catch block handles both names. Verify with Axios 1.8.4 docs. |
| `inflightOrders` map memory leak | `finally` block always cleans up if this controller is still current. Aborted controllers are cleaned up by the new request that replaced them. |
| Engaged lock held longer on abort | If an early handler is aborted, its lock-release (double-rAF after updateOrder) never fires. This is correct — the NEWER request that superseded it will complete and release the lock. Net effect: lock held slightly longer, which is the safe direction. **No lock code is changed in this task.** |

---

## Acceptance Criteria

- [ ] **AC-1**: `inflightOrders` Map exists at module scope in `socketHandlers.js`
- [ ] **AC-2**: `dedupedFetch` function exists and is used by all 6 async handlers
- [ ] **AC-3**: `fetchOrderWithRetry` accepts `signal` parameter and passes to `fetchSingleOrderForSocket`
- [ ] **AC-4**: `fetchSingleOrderForSocket` passes `signal` to Axios
- [ ] **AC-5**: `handleNewOrder`'s synchronous part (initial addOrder from socket) is NOT affected by dedup
- [ ] **AC-6**: `handleUpdateOrderStatus` correctly distinguishes "API returned null" from "request aborted" for the `removeOrder` decision
- [ ] **AC-7**: Console logs show `dedupedFetch: Cancelling in-flight request for order X` when rapid events fire
- [ ] **AC-8**: No handler directly calls `fetchOrderWithRetry` — all go through `dedupedFetch`
- [ ] **AC-9**: Frontend compiles without errors
- [ ] **AC-10**: Existing socket flow still works (place order → socket event → order appears on dashboard with full data)

---

## Evidence to Capture

1. **Before/After** console log comparison:
   - Before: multiple `Fetching order 123` logs from rapid events
   - After: `Cancelling in-flight request for order 123` + single `Fetched order 123 successfully`
2. **Screenshot** of Network tab showing cancelled XHR requests (red entries) for the deduplicated calls
3. Save evidence in `/app/memory/v2/evidence/P0_3_socket_dedup_result.md`

---

## Rollback Notes

If something breaks after this change:
1. In `socketHandlers.js`: Remove the `inflightOrders` Map, `ABORTED` symbol, and `dedupedFetch` function
2. In each handler, revert `dedupedFetch(orderId)` back to `fetchOrderWithRetry(orderId)`
3. In `socketHandlers.js`: In `fetchOrderWithRetry`, remove the `signal` parameter
4. In `orderService.js`: In `fetchSingleOrderForSocket`, remove the `signal` parameter and `{ signal }` from Axios config

This is a clean revert — only two files were changed, no state shapes modified, no lock behavior touched.

---

## Exact Next Prompt After Completion

```
P0-3 completed: Socket dedup implemented in socketHandlers.js.
All 6 async handlers now route through dedupedFetch().
AbortController cancels previous in-flight request when new event arrives for same orderId.

Next task: Execute P1-1 (lift socket subscriptions) from REFACTOR_BACKLOG.md.
Create a SocketEventManager component in contexts/ that calls useSocketEvents().
Place it inside AppProviders.jsx after OrderProvider.
Remove the useSocketEvents() call from DashboardPage.jsx.
Gate with isAuthenticated && restaurant?.id.
Refer to VALIDATED_ARCHITECTURE.md Section 1.2 for the event map and INV-4b for context boundaries.
```
