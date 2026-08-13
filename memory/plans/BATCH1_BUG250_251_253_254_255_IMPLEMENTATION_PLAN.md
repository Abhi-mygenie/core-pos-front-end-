# Batch 1 — Implementation Plan (Gate 3)

**Document:** `plans/BATCH1_BUG250_251_253_254_255_IMPLEMENTATION_PLAN.md`
**Created:** 2026-07-26
**Role:** PLANNING (Gate 3)
**Impact Analysis ref:** `impact/CR106_WAVE2_CONSOLIDATED_IMPACT_ANALYSIS.md`
**Status:** AWAITING GATE 4 GO

---

## Header Block

| Field | Value |
|---|---|
| **Code Reality** | NONE — all 5 bugs have zero existing fix code |
| **Entry Verification** | All target file lines verified 2026-07-26 — MATCH |
| **Risk** | BUG-250: HIGH (order lifecycle). BUG-251/253/254/255: LOW |
| **Scope Lock** | 7 files modified. 0 new files. |

---

## Execution Sequence

All 5 bugs are parallel-safe (different files or non-overlapping lines). Implementation agent MAY code all edits in parallel.

---

### BUG-250: Polling Removes Aggregator Orders (P0 CRITICAL)

#### Edit 250-1 — `hooks/useOrderPollingReconciliation.js` — Skip aggregator in removal

**Current (L201, after the PayLater settled check):**
```js
        if (!isSettledPayLater) continue;
      }

      const prevMisses = missCountRef.current.get(orderId) || 0;
```

**New (insert after L202, before `const prevMisses`):**
```js
        if (!isSettledPayLater) continue;
      }

      // BUG-250: Aggregator orders come from UrbanPiper API (not getRunningOrders).
      // Do not treat as orphan — status updates arrive via aggregator socket channel.
      if (l.isAggregator === true) {
        continue;
      }

      const prevMisses = missCountRef.current.get(orderId) || 0;
```

---

#### Edit 250-2 — `api/socket/useSocketEvents.js` — Preserve aggregator orders during reconnect merge

**Current (L97-101):**
```js
        getRunningOrders()
          .then((freshOrders) => {
            if (freshOrders && Array.isArray(freshOrders)) {
              actionsRef.current.mergeRunningOrders(freshOrders);
              console.log(`[useSocketEvents] Rehydration complete: ${freshOrders.length} orders merged`);
```

**New:**
```js
        getRunningOrders()
          .then((freshOrders) => {
            if (freshOrders && Array.isArray(freshOrders)) {
              // BUG-250: Preserve aggregator orders during reconnect rehydration.
              // getRunningOrders() returns only POS/Web orders — aggregator orders
              // come from UrbanPiper API and must not be wiped by merge.
              const currentOrders = actionsRef.current.getOrdersSnapshot?.() || [];
              const aggregatorOrders = currentOrders.filter(o => o.isAggregator === true);
              const merged = [...freshOrders, ...aggregatorOrders];
              actionsRef.current.mergeRunningOrders(merged);
              console.log(`[useSocketEvents] Rehydration complete: ${freshOrders.length} regular + ${aggregatorOrders.length} aggregator orders merged`);
```

**Dependency:** Needs `getOrdersSnapshot` exposed from OrderContext (or use `ordersRef`). Check if `actionsRef` already has access to the orders list.

**Alternative (simpler — no new method):** Modify `mergeRunningOrders` in OrderContext to preserve aggregator orders internally:

**Edit 250-2b — `contexts/OrderContext.jsx` L48-54 — Preserve aggregator in merge:**

**Current:**
```js
  const mergeRunningOrders = useCallback((freshOrders) => {
    if (!Array.isArray(freshOrders)) return;
    setOrdersState((prev) => {
      console.log(`[OrderContext] mergeRunningOrders: ${prev.length} existing → ${freshOrders.length} fresh`);
      ordersRef.current = freshOrders;
      return freshOrders;
    });
  }, []);
```

**New:**
```js
  const mergeRunningOrders = useCallback((freshOrders) => {
    if (!Array.isArray(freshOrders)) return;
    setOrdersState((prev) => {
      // BUG-250: Preserve aggregator orders during merge. getRunningOrders()
      // only returns POS/Web orders — aggregator orders from UrbanPiper must survive.
      const aggregatorOrders = prev.filter(o => o.isAggregator === true);
      const merged = [...freshOrders, ...aggregatorOrders];
      console.log(`[OrderContext] mergeRunningOrders: ${prev.length} existing → ${freshOrders.length} fresh + ${aggregatorOrders.length} aggregator preserved`);
      ordersRef.current = merged;
      return merged;
    });
  }, []);
```

**This is the PREFERRED approach** — simpler, no new method needed, and the useSocketEvents.js reconnect code stays unchanged.

---

#### Edit 250-3 — `api/socket/socketHandlers.js` L945-965 — Terminal status removal

**Current:**
```js
export const handleAggregatorOrderUpdate = (message, actions, aggregatorTransform) => {
  log('INFO', 'Aggregator order update event', message);
  const orderId = Number(message[1]);
  const payload = message[4] || message[3];

  if (payload && typeof payload === 'object' && payload.order_details_order) {
    const order = aggregatorTransform.fromAPI.aggregatorOrder(payload);
    actions.updateOrder(order.orderId, order);
    log('INFO', `Aggregator order updated from socket: ${order.orderId}, status=${order.fOrderStatus}`);
  } else {
```

**New:**
```js
export const handleAggregatorOrderUpdate = (message, actions, aggregatorTransform) => {
  log('INFO', 'Aggregator order update event', message);
  const orderId = Number(message[1]);
  const payload = message[4] || message[3];

  if (payload && typeof payload === 'object' && payload.order_details_order) {
    const order = aggregatorTransform.fromAPI.aggregatorOrder(payload);
    // BUG-250: Remove on terminal statuses (OD-W2-7: completed=6, OD-W2-8: cancelled=3)
    const isTerminal = order.fOrderStatus === 6 || order.fOrderStatus === 3;
    if (isTerminal) {
      actions.removeOrder(order.orderId);
      log('INFO', `Aggregator order removed (terminal): ${order.orderId}, status=${order.fOrderStatus}`);
    } else {
      actions.updateOrder(order.orderId, order);
      log('INFO', `Aggregator order updated from socket: ${order.orderId}, status=${order.fOrderStatus}`);
    }
  } else {
```

---

#### Edit 250-4 — `components/cards/TableCard.jsx` L391 — "Dispatched" label for aggregator status 5

**Current (L391):**
```js
                    {table.fOrderStatus === 5 && <span style={{ color: COLORS.primaryGreen }}> • Served</span>}
```

**New:**
```js
                    {table.fOrderStatus === 5 && <span style={{ color: COLORS.primaryGreen }}> • {isAggregator ? 'Dispatched' : 'Served'}</span>}
```

#### Edit 250-4b — `components/cards/OrderCard.jsx` — "Dispatched" label for aggregator status 5

**Find the status pill rendering for fOrderStatus===5 in OrderCard header area.**

Search for the "Served" status display:
```bash
grep -n "Served\|fOrderStatus.*5.*status" OrderCard.jsx
```

Add `isAggregator ? 'Dispatched' : 'Served'` in the status label rendering.

---

### BUG-251: OrderCard Cancel + WhatsApp Hidden for Aggregator (P1)

#### Edit 251-1 — `components/cards/OrderCard.jsx` L966 — Cancel guard

**Current:**
```js
              {/* Cancel Order Button - permission gated (order_cancel) */}
              {isOrderCancelAllowed && (
```

**New:**
```js
              {/* Cancel Order Button - permission gated (order_cancel) — BUG-251: hidden for aggregator */}
              {!isAggregator && isOrderCancelAllowed && (
```

#### Edit 251-2 — `components/cards/OrderCard.jsx` L979 — WhatsApp guard

**Current:**
```js
              {/* CR-017: WhatsApp Payment Link button */}
              {showWhatsAppPayment && (
```

**New:**
```js
              {/* CR-017: WhatsApp Payment Link button — BUG-251: hidden for aggregator */}
              {!isAggregator && showWhatsAppPayment && (
```

---

### BUG-253: Platform Dropdown Aggregator Filter (P1)

#### Edit 253-1 — `components/layout/PlatformDropdown.jsx` L27-31 — Add option

**Current:**
```js
export const PLATFORM_OPTIONS = [
  { value: null,  label: 'Platform: All' },
  { value: 'pos', label: 'POS' },
  { value: 'web', label: 'Web / Scan' },
];
```

**New:**
```js
export const PLATFORM_OPTIONS = [
  { value: null,         label: 'Platform: All' },
  { value: 'pos',        label: 'POS' },
  { value: 'web',        label: 'Web / Scan' },
  { value: 'aggregator', label: 'Aggregator' },  // BUG-253: Swiggy / Zomato filter
];
```

#### Edit 253-2 — `pages/DashboardPage.jsx` L854-859 — Add aggregator predicate

**Current:**
```js
    const platformMatches = (item) => {
      if (platform === null) return true;
      const hasOrder = !!(item?.orderId || item?.order?.orderId);
      if (!hasOrder) return false;
      return platform === 'web' ? isWebOrigin(item) : !isWebOrigin(item);
    };
```

**New:**
```js
    const platformMatches = (item) => {
      if (platform === null) return true;
      const hasOrder = !!(item?.orderId || item?.order?.orderId);
      if (!hasOrder) return false;
      // BUG-253: Aggregator filter (Swiggy/Zomato via UrbanPiper)
      const itemIsAggregator = item.isAggregator === true || item.order?.isAggregator === true;
      if (platform === 'aggregator') return itemIsAggregator;
      // POS = non-web AND non-aggregator
      if (platform === 'pos') return !isWebOrigin(item) && !itemIsAggregator;
      return platform === 'web' ? isWebOrigin(item) : true;
    };
```

---

### BUG-254: Aggregator Handlers Error Toast (P1)

#### Edit 254-0 — `pages/DashboardPage.jsx` — Add toast import

**Add at top of file (after existing imports, ~L35):**
```js
import { toast } from 'sonner'; // BUG-254: error toast for aggregator actions
```

#### Edit 254-1 — `handleAggregatorAccept` catch block

**Current:**
```js
    } catch (err) {
      console.error('[Dashboard] Aggregator accept failed:', err);
    }
```

**New:**
```js
    } catch (err) {
      console.error('[Dashboard] Aggregator accept failed:', err);
      toast.error('Failed to accept order — please retry'); // BUG-254
    }
```

#### Edit 254-2 — `handleAggregatorReject` catch block

**Current:**
```js
    } catch (err) {
      console.error('[Dashboard] Aggregator reject failed:', err);
    } finally {
```

**New:**
```js
    } catch (err) {
      console.error('[Dashboard] Aggregator reject failed:', err);
      toast.error('Failed to reject order — please retry'); // BUG-254
    } finally {
```

#### Edit 254-3 — `handleAggregatorReady` catch block

**Current:**
```js
    } catch (err) {
      console.error('[Dashboard] Aggregator ready failed:', err);
    }
```

**New:**
```js
    } catch (err) {
      console.error('[Dashboard] Aggregator ready failed:', err);
      toast.error('Failed to mark ready — please retry'); // BUG-254
    }
```

#### Edit 254-4 — `handleAggregatorDispatch` catch block

**Current:**
```js
    } catch (err) {
      console.error('[Dashboard] Aggregator dispatch failed:', err);
    } finally {
```

**New:**
```js
    } catch (err) {
      console.error('[Dashboard] Aggregator dispatch failed:', err);
      toast.error('Failed to dispatch order — please retry'); // BUG-254
    } finally {
```

---

### BUG-255: Item-Level Status Hidden for Aggregator (P1)

#### Edit 255-1 — `components/cards/OrderCard.jsx` L401 — Block handler

**Current:**
```js
  const handleItemAction = (item, action) => {
    console.log(`[OrderCard] ${action} item ${item.id} on order ${orderId}`);
    if (onItemStatusChange) {
      onItemStatusChange(order, item, action.toLowerCase());
    }
  };
```

**New:**
```js
  const handleItemAction = (item, action) => {
    // BUG-255: No item-level status changes for aggregator orders
    if (isAggregator) return;
    console.log(`[OrderCard] ${action} item ${item.id} on order ${orderId}`);
    if (onItemStatusChange) {
      onItemStatusChange(order, item, action.toLowerCase());
    }
  };
```

#### Edit 255-2 — `components/cards/OrderCard.jsx` ~L623 — Hide action dot visually

**Current (L623):**
```js
            const actionConfig = getItemActionConfig(item);
```

**New:**
```js
            const actionConfig = isAggregator ? null : getItemActionConfig(item); // BUG-255
```

Then wherever `actionConfig` is used for the dot rendering, the `null` will prevent the dot from showing (existing code already guards with `actionConfig &&`).

---

## Files WILL Change

| # | File | Bug(s) | Lines Changed | Risk |
|---|------|--------|---------------|------|
| 1 | `hooks/useOrderPollingReconciliation.js` | BUG-250 | +4 (insert after L202) | HIGH |
| 2 | `contexts/OrderContext.jsx` | BUG-250 | ~6 (replace L48-54) | HIGH |
| 3 | `api/socket/socketHandlers.js` | BUG-250 | ~8 (modify L950-953) | MEDIUM |
| 4 | `components/cards/TableCard.jsx` | BUG-250 | ~1 (L391) | LOW |
| 5 | `components/cards/OrderCard.jsx` | BUG-250, 251, 255 | ~8 (L391 status, L966, L979, L401, L623) | LOW |
| 6 | `components/layout/PlatformDropdown.jsx` | BUG-253 | +1 (L31) | LOW |
| 7 | `pages/DashboardPage.jsx` | BUG-253, 254 | ~15 (L854-859, toast import, 4 catch blocks) | LOW |

**Total: ~43 lines across 7 files.**

## Files WILL NOT Touch

- `AggregatorOrderPopOut.jsx`, `AggregatorRejectModal.jsx`, `AggregatorDispatchModal.jsx` — no changes
- `aggregatorTransform.js`, `aggregatorService.js` — no changes
- `useSocketEvents.js` — no changes (merge preservation moved to OrderContext)
- All report modules, settlement, auth, permissions

---

## Verification Matrix

| # | Bug | Verification | How | Automated? |
|---|-----|-------------|-----|:---:|
| V1 | BUG-250 | Aggregator orders survive 90s (2 poll cycles) | Login → wait 90s → Delivery still shows aggregator cards | NO |
| V2 | BUG-250 | Reconnect preserves aggregator orders | Disconnect socket → reconnect → aggregator cards still present | NO |
| V3 | BUG-250 | Terminal status removal (completed=6) | Simulate socket with fOrderStatus=6 → card removed | NO |
| V4 | BUG-250 | Terminal status removal (cancelled=3) | Simulate socket with fOrderStatus=3 → card removed | NO |
| V5 | BUG-250 | "Dispatched" label for aggregator status 5 | Aggregator card at status 5 → shows "Dispatched" not "Served" | NO |
| V6 | BUG-251 | No Cancel(X) button on aggregator OrderCard | Login → list view → aggregator order → no X button | NO |
| V7 | BUG-251 | No WhatsApp button on aggregator OrderCard | Same view → no green WhatsApp icon | NO |
| V8 | BUG-253 | "Aggregator" option in Platform dropdown | Click dropdown → 4 options visible (All, POS, Web/Scan, Aggregator) | NO |
| V9 | BUG-253 | Filter works: only aggregator cards shown | Select Aggregator → only S/Z badge cards visible in Delivery | NO |
| V10 | BUG-253 | POS filter excludes aggregator | Select POS → aggregator cards hidden | NO |
| V11 | BUG-254 | Error toast on failed Ready | Click Ready on stale order → red error toast appears | NO |
| V12 | BUG-255 | No item-level dots on aggregator OrderCard | List view → aggregator order → no colored status dots on items | NO |
| V13 | ALL | Webpack compiles with 0 new warnings | `tail /var/log/supervisor/frontend.out.log` | YES |
| V14 | ALL | Regular orders unaffected | POS delivery orders still have Cancel, WhatsApp, item dots | NO |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-250/251/253/254/255 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] BUG_TRACKER.md: rows updated to IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: all 7 modified files listed with BUG IDs + date
- [ ] Code markers: // BUG-250, // BUG-251, etc. in every modified file
- [ ] Compile check: webpack 0 new warnings
```

---

## Handover

```
Plan ready at plans/BATCH1_BUG250_251_253_254_255_IMPLEMENTATION_PLAN.md.
15 edits across 7 files (~43 lines). All parallel-safe.
Code reality: NONE (all verified).
Scope: 7 files WILL change / AggregatorOrderPopOut, modals, transforms, services WILL NOT touch.
Verification matrix: 14 checks (1 automated, 13 manual/browser).
Owner decisions: ALL locked (OD-W2-1 through OD-W2-8).
Awaiting Gate 4 GO.
```
