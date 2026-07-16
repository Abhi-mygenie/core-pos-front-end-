# POS2.0 Wave 6 — Implementation Report — 2026-05-17

## 1. Status
**COMPLETE** — Both BUG-082 and BUG-068 applied and validated.

---

## 2. Wave 6 work items

| # | Item | Files Touched | Status |
|---|---|---|---|
| 1 | **BUG-082** — scan-new-order index 4 = primitive `'web'` | `socketHandlers.js`, `socketEvents.js`, `handleScanNewOrder.enrichment.test.js` | APPLIED |
| 2 | **BUG-068** — Socket reconnect rehydration | `socketService.js`, `useSocketEvents.js`, `OrderContext.jsx` | APPLIED |

---

## 3. Changes applied

### BUG-082 — scan-new-order primitive index 4

#### `frontend/src/api/socket/socketHandlers.js`
- `handleScanNewOrder` rewritten: removed async, removed API call (`fetchOrderWithRetry`), reads index 4 as primitive string with `typeof` guard
- Creates minimal order entry: `{ orderId, fOrderStatus, orderFrom, isWebOrder, status: 'pending', items: [], amount: 0, tableId: 0 }`
- **Retired** POS2-002-P4-FU-01 channel-based fallback (former L508-511) per owner directive Q-082-4
- Removed `syncTableStatus` (no table data in minimal order)
- `isAsyncHandler`: removed `SCAN_NEW_ORDER` from async list

#### `frontend/src/api/socket/socketEvents.js`
- `MSG_INDEX.PAYLOAD` comment: documented scan-new-order exception (primitive string, not payload)

#### `frontend/src/__tests__/api/socket/handleScanNewOrder.enrichment.test.js`
- Rewritten: 8 tests covering primitive read, no API call, forward-compat, missing index 4, status-8/9 skip, invalid messages

### BUG-068 — Socket reconnect rehydration

#### `frontend/src/api/socket/socketService.js`
- `_setStatus`: passes `oldStatus` as 3rd argument to all status listeners
- `onStatusChange`: updated JSDoc, immediate call passes `this.status` as both new and old (no false transition)

#### `frontend/src/api/socket/useSocketEvents.js`
- Added imports: `CONNECTION_STATUS` from socketService, `getRunningOrders` from orderService
- Added `mergeRunningOrders` to useOrders destructure + actionsRef
- New `disconnectedAtRef` for debounce tracking
- New `useEffect` with `socketService.onStatusChange` listener:
  - Tracks disconnect start time on RECONNECTING/DISCONNECTED
  - On RECONNECTING → CONNECTED: checks duration, skips if < 1500ms (micro-blip)
  - Otherwise calls `getRunningOrders()` → `mergeRunningOrders()` for rehydration

#### `frontend/src/contexts/OrderContext.jsx`
- New `mergeRunningOrders(freshOrders)` callback: replaces orders list with fresh API snapshot
- Engage locks (separate state) untouched
- Added to context value + useMemo dependency array

---

## 4. Test suite

| Metric | Value |
|---|---|
| Test suites | **34 passed / 34 total** |
| Tests | **501 passed / 501 total** |
| Net new tests (BUG-082) | +3 (8 total replacing 5 old) |
| ESLint | Compilation clean (webpack) |
| Webpack | Hot-reload green |

---

## 5. Business rules enforced

### BUG-082
| Rule | Status |
|---|---|
| SCAN-003 (pending freeze) | Aligned: index 4 = primitive `'web'` for scan-new-order |
| POS2-005 / BUG-042-C | Preserved: status-8/9 guard unchanged |
| Q-082-4 (fallback retirement) | Applied: channel-based fallback removed |

### BUG-068
| Rule | Status |
|---|---|
| POLL-001 (60s silent poll) | Unchanged — polling code not touched |
| POLL-004 (open-order skip) | Unchanged — polling code not touched |
| BOOT-001 (profile loads first) | Unchanged — `getRunningOrders` is additive; boot sequence untouched |
| DASH-001 (Hold on Hold tab) | Status-8/9 filtering handled at display level (same as boot) |

---

## 6. Combined owner QA checklist

### BUG-082 (7 items)
| # | Check | Expected |
|---|---|---|
| 1 | Web order via Scan & Order | Popup appears with order # |
| 2 | Popup shows for web YTC orders | `orderFrom === 'web' && fOrderStatus === 7` |
| 3 | POS orders via new-order | No popup regression (full payload at index 4 unchanged) |
| 4 | Order confirm/edit | Full data replaces minimal entry via update-order-status |
| 5 | No dead fallback code | L508-511 removed |
| 6 | Runtime revalidation | DevTools: scan-new-order index 4 = `'web'` |
| 7 | Status-8/9 skip | Hold orders not on running dashboard |

### BUG-068 (7 items)
| # | Check | Expected |
|---|---|---|
| 1 | Disconnect → miss scan-new-order → reconnect | Popup appears without page refresh |
| 2 | No duplicate orders after reconnect | Orders merged cleanly |
| 3 | Engage locks preserved | Lock state unchanged after rehydration |
| 4 | Hold orders not surfaced | Status-8/9 orders stay on Hold tab |
| 5 | Micro-blip (< 1.5s) | No refetch, no disruption |
| 6 | POLL-001 still runs | 60s poll continues after reconnect |
| 7 | Boot sequence unchanged | First login works normally |

---

## 7. Documents produced

| Document | Path |
|---|---|
| Owner Approval Plan | `POS2_0_WAVE_6_OWNER_APPROVAL_PLAN_2026_05_17.md` |
| Code Diff Preview | `POS2_0_WAVE_6_CODE_DIFF_PREVIEW_2026_05_17.md` |
| BUG-082 Implementation Report | `POS2_0_WAVE_6_BUG_082_IMPLEMENTATION_REPORT_2026_05_17.md` |
| **Wave 6 Implementation Report (this doc)** | `POS2_0_WAVE_6_IMPLEMENTATION_REPORT_2026_05_17.md` |

---

## 8. Deferred / out-of-scope

| Item | Reason |
|---|---|
| `EVENTS_REQUIRING_ORDER_API` list cleanup | Informational only, not runtime — cosmetic |
| Tab visibility rehydration | Not in scope — could be a future enhancement |

---

*— End of Wave 6 Implementation Report — 2026-05-17 —*
