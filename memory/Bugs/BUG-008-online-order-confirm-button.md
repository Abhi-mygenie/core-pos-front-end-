## BUG-008 — Online Order Confirm Button Not Working

**Module:** Dashboard / Online Order Acceptance / YetToConfirm Flow
**Status:** Closed — already working on current code path
**Severity:** Medium (closed)
**Priority:** n/a

### Expected Behavior (as originally reported)
On online orders (Swiggy / Zomato / own delivery / takeaway), the Confirm button should transition the order from `yetToConfirm` to a confirmed/accepted state so staff can accept incoming online orders.

### Actual Behavior Investigation (QA pass on 2026-04-20)

Two distinct code paths exist:

**Path A — `DeliveryCard.jsx` (DEAD CODE)**
- File contains a literal green "Confirm" button for `yetToConfirm` orders at lines 162–185 with `onClick={() => console.log(...)}` — bare console.log, no real handler, no API call.
- Component IS exported and imported into `DashboardPage.jsx`, but repo-wide grep for `<DeliveryCard` returns zero matches — **component is never mounted**.
- If rendered anywhere (hidden flag / future route), the button would be non-functional.

**Path B — `OrderCard.jsx` "Accept" button (ACTIVE PATH)**
- Lines 580–599 render "Accept" (not "Confirm") for `yetToConfirm` orders.
- `onClick` → `onAccept?.(order)` → `ChannelColumn.onAccept` → `DashboardPage.handleConfirmOrder` → `confirmOrder(orderId, roleName, defaultOrderStatus)`.
- Endpoint: `/api/v2/vendoremployee/order/waiter-dinein-order-status-update` (name suggests dine-in but used for all sources with no branching).

### Resolution
**Closed on 2026-04-20 per user validation**: "Already working."

- No code change.
- The active online-order confirm flow (OrderCard → `onAccept` → `confirmOrder` endpoint) is functional.
- `DeliveryCard.jsx` remains in the codebase as dead code. Flagged as an **AD-204 cleanup candidate** for a future dedicated pass (not in this scope).

### Recommendation for future dead-code cleanup pass
- Either wire up `DeliveryCard.jsx` properly (add `onConfirmOrder` prop, replace `console.log` with handler invocation, mount it where online orders render) OR
- Delete `DeliveryCard.jsx` + remove its import from `DashboardPage.jsx` + remove its export from `components/cards/index.js`.

### Files Reviewed (during QA pass)
- `frontend/src/components/cards/DeliveryCard.jsx` (entire file)
- `frontend/src/components/cards/OrderCard.jsx` (lines 580–620)
- `frontend/src/components/cards/TableCard.jsx` (lines 295–316)
- `frontend/src/components/dashboard/ChannelColumn.jsx` (entire file)
- `frontend/src/pages/DashboardPage.jsx` (lines 880–910, 1100–1260)
- `frontend/src/api/services/orderService.js` (lines 60–78)
- `frontend/src/api/transforms/orderTransform.js` (lines 854–858)
- `frontend/src/api/constants.js` (lines 26–27)
- `frontend/src/components/cards/index.js`

### Reference Docs
- `app/memory/ARCHITECTURE_DECISIONS_FINAL.md` (AD-204 — dead-code cleanup; AD-006 — defaultOrderStatus)
- `app/memory/BUG_TEMPLATE.md` (BUG-008 entry)

### Owner Agent
E1 Senior QA Documentation Agent (QA evidence) / E1 Implementation Agent (closure)

### Last Updated
2026-04-20 — E1 Implementation Agent
