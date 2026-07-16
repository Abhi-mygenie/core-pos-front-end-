# Handover — `role_name` Wire Value Fix

**Prepared:** 2026-05-01
**Scope:** Frontend-only. No backend changes.
**Branch context:** `1-may` (Emergent deployment)
**Ticket tag:** ROLE-NAME-WIRE-FIX (May-2026)
**Risk:** Low. See §8.

---

## 1. Problem Statement

Four API endpoints consume a `role_name` field (either query param or JSON body). The correct value for this field is the **first element of the `role` array** returned by the backend profile endpoint (cooked alias: `permissions[0]`). The frontend today sends:

- **Fetch path** (running-orders): a heuristic result (`"Waiter"` if raw roleName case-insensitively equals `"waiter"`, else `"Manager"`).
- **Mutation paths** (confirm / update-status / cancel): the **raw** `user.roleName` value (e.g., `"Owner"`, `"m"`, `"Captain"`).

Both are wrong contracts. The backend-authoritative source is `role[0]`.

### Live API evidence (confirmed 2026-05-01, preprod, `owner@18march.com`)

```
user.role_name (top-level)           = "Owner"        ← NOT what the wire needs
user.role[0]   (first permission)    = "Manager"      ← what the wire needs
```

For a different login (`saurav@mantri.com`) `role_name` = `"m"`; `role[0]` is also `"Manager"`. The raw `role_name` is the user's identity label; `role[0]` is the access-tier / role classification the backend gates on.

---

## 2. Endpoints in Scope

| # | Endpoint | Method | `role_name` carried as |
|---|---|---|---|
| 1 | `/api/v2/.../orders/running-orders` | GET | query param `?role_name=...` |
| 2 | `/api/v2/.../order-status-update` (ready/served) | PUT | body field `role_name` |
| 3 | `/api/v2/.../order-confirm` (Yet-to-Confirm) | PUT | body field `role_name` |
| 4 | `/api/v2/.../order-status-update` (cancel) | PUT | body field `role_name` |

### Explicitly OUT OF SCOPE
- `api/services/stationService.js:185` — sends a station name on a `role_name` form-data field; different semantic. **Do not touch.** Product owner will give separate direction.
- `contexts/OrderContext.jsx:36` — `refreshOrders(roleName = 'Manager')` default. **Do not touch** in this change.
- Every display-only read of `user.roleName` (Sidebar, diagnostic logs).

---

## 3. Target Contract

All 4 in-scope endpoints must send:

```js
permissions?.[0] || 'Manager'
```

Where `permissions` comes from `useAuth()` (i.e., the cooked array sourced from the raw `role[]` field in the profile API response). `'Manager'` is the safety fallback for the pre-`setUserData` race.

---

## 4. Exact Edits (14 total across 5 files)

### File A — `/app/frontend/src/pages/DashboardPage.jsx`

> `permissions` is already destructured from `useAuth()` at line 159. No import / destructure change needed here.

**A.1** Line 483 — drop the arg in `refreshAllData` call
```js
// OLD
await refreshAllData(user?.roleName || 'Owner');
// NEW
await refreshAllData();
```

**A.2** Line 1109 — confirm order
```js
// OLD
await confirmOrder(order.orderId, user?.roleName || 'Manager', defaultOrderStatus);
// NEW
await confirmOrder(order.orderId, permissions?.[0] || 'Manager', defaultOrderStatus);
```

**A.3** Line 1114 — useCallback dep of the confirm handler
```js
// OLD
}, [getOrderDataForEntry, user?.roleName, defaultOrderStatus]);
// NEW
}, [getOrderDataForEntry, permissions, defaultOrderStatus]);
```

**A.4** Line 1130 — cancel order
```js
// OLD
const payload = orderToAPI.cancelOrder(order.orderId, user?.roleName || 'Manager', reason);
// NEW
const payload = orderToAPI.cancelOrder(order.orderId, permissions?.[0] || 'Manager', reason);
```

**A.5** Line 1243 — mark ready
```js
// OLD
await updateOrderStatus(tableEntry.orderId, user?.roleName || 'Manager', 'ready');
// NEW
await updateOrderStatus(tableEntry.orderId, permissions?.[0] || 'Manager', 'ready');
```

**A.6** Line 1248 — useCallback dep
```js
// OLD
}, [user?.roleName]);
// NEW
}, [permissions]);
```

**A.7** Line 1265 — mark served
```js
// OLD
await updateOrderStatus(tableEntry.orderId, user?.roleName || 'Manager', 'serve');
// NEW
await updateOrderStatus(tableEntry.orderId, permissions?.[0] || 'Manager', 'serve');
```

**A.8** Line 1271 — useCallback dep
```js
// OLD
}, [user?.roleName, getOrderById, handlePrepaidSettleSuccess]);
// NEW
}, [permissions, getOrderById, handlePrepaidSettleSuccess]);
```

---

### File B — `/app/frontend/src/components/order-entry/OrderEntry.jsx`

**B.1** Line 44 — add `permissions` to the destructure
```js
// OLD
const { user, hasPermission } = useAuth();
// NEW
const { user, hasPermission, permissions } = useAuth();
```

**B.2** Line 920 — cancel order
```js
// OLD
const payload = orderToAPI.cancelOrder(orderId, user?.roleName || 'Manager', reason);
// NEW
const payload = orderToAPI.cancelOrder(orderId, permissions?.[0] || 'Manager', reason);
```

---

### File C — `/app/frontend/src/pages/LoadingPage.jsx`

**C.1** Lines 316‑318 — initial running-orders fetch
```js
// OLD
const userRole = data.profile?.user?.roleName || 'Owner';
const roleParam = orderService.getOrderRoleParam(userRole);
data.runningOrders = await orderService.getRunningOrders(roleParam);

// NEW
// Backend-authoritative role tier for running-orders fetch is the first
// element of the permissions array (raw `role[0]` on the API).
// Fallback 'Manager' covers the pre-setUserData race where permissions
// may be empty.
const roleParam = data.profile?.permissions?.[0] || 'Manager';
data.runningOrders = await orderService.getRunningOrders(roleParam);
```

---

### File D — `/app/frontend/src/hooks/useRefreshAllData.js`

**D.1** Lines 5‑12 — add `useAuth` import
```js
// OLD (imports block)
import { useCallback } from 'react';
import { useMenu } from '../contexts/MenuContext';
import { useTables } from '../contexts/TableContext';
import { useOrders } from '../contexts/OrderContext';
import * as categoryService from '../api/services/categoryService';
...

// NEW (imports block) — add one import
import { useCallback } from 'react';
import { useMenu } from '../contexts/MenuContext';
import { useTables } from '../contexts/TableContext';
import { useOrders } from '../contexts/OrderContext';
import { useAuth } from '../contexts/AuthContext';
import * as categoryService from '../api/services/categoryService';
...
```

**D.2** Lines 14‑44 — hook body: pull `permissions` from auth, drop heuristic call, drop `userRole` arg
```js
// OLD (full hook)
export const useRefreshAllData = () => {
  const { setCategories, setProducts, setPopularFood } = useMenu();
  const { setTables } = useTables();
  const { setOrders } = useOrders();

  return useCallback(async (userRole = 'Owner') => {
    // Step A: Tables
    const freshTables = await tableService.getTables(true);
    setTables(freshTables);
    // Step B: Categories + Products + Popular
    const [catResult, prodResult, popResult] = await Promise.all([
      categoryService.getCategories(),
      productService.getProducts({ limit: 500, offset: 1, type: 'all' }),
      productService.getPopularFood({ limit: 50, offset: 1, type: 'all' }),
    ]);
    const enrichedCategories = categoryService.calculateItemCounts(catResult, prodResult.products);
    setCategories(enrichedCategories);
    setProducts(prodResult.products);
    setPopularFood(popResult.products);
    // Step C: Orders
    const roleParam = orderService.getOrderRoleParam(userRole);
    const freshOrders = await orderService.getRunningOrders(roleParam);
    setOrders(freshOrders);
  }, [setCategories, setProducts, setPopularFood, setTables, setOrders]);
};

// NEW (full hook)
export const useRefreshAllData = () => {
  const { setCategories, setProducts, setPopularFood } = useMenu();
  const { setTables } = useTables();
  const { setOrders } = useOrders();
  const { permissions } = useAuth();

  return useCallback(async () => {
    // Step A: Tables
    const freshTables = await tableService.getTables(true);
    setTables(freshTables);
    // Step B: Categories + Products + Popular
    const [catResult, prodResult, popResult] = await Promise.all([
      categoryService.getCategories(),
      productService.getProducts({ limit: 500, offset: 1, type: 'all' }),
      productService.getPopularFood({ limit: 50, offset: 1, type: 'all' }),
    ]);
    const enrichedCategories = categoryService.calculateItemCounts(catResult, prodResult.products);
    setCategories(enrichedCategories);
    setProducts(prodResult.products);
    setPopularFood(popResult.products);
    // Step C: Orders — backend-authoritative role tier is permissions[0]
    // (raw `role[0]`). Fallback 'Manager' for safety.
    const roleParam = permissions?.[0] || 'Manager';
    const freshOrders = await orderService.getRunningOrders(roleParam);
    setOrders(freshOrders);
  }, [setCategories, setProducts, setPopularFood, setTables, setOrders, permissions]);
};
```

---

### File E — `/app/frontend/src/api/services/orderService.js`

**E.1** Lines 19‑29 — delete the obsolete `getOrderRoleParam` helper
```js
// OLD (delete this block entirely)
/**
 * Determine the correct role_name param based on user's role
 * @param {string} userRole - The logged-in user's roleName
 * @returns {string} - 'Waiter' for waiters, 'Manager' for everyone else
 */
export const getOrderRoleParam = (userRole) => {
  if (userRole && userRole.toLowerCase() === 'waiter') {
    return 'Waiter';
  }
  return 'Manager';
};

// NEW
// (removed — consumers now read permissions[0] from AuthContext)
```

> Before deleting, verify there are **no other importers** of `getOrderRoleParam` besides `LoadingPage.jsx` and `useRefreshAllData.js` — both are being updated in this change. Run:
> ```
> grep -rn "getOrderRoleParam" /app/frontend/src
> ```
> Expected result after edits C.1 and D.2: only the definition line remains (the one being deleted).

---

## 5. Dependencies / Ordering

Order the edits as follows to avoid broken intermediate states during hot-reload:

1. First: **A**, **B**, **C** (all consumers switched to `permissions[0]`).
2. Then: **D** (hook drops the helper call).
3. Last: **E** (delete the now-orphaned helper).

If any step breaks hot-reload, stop and investigate before proceeding.

---

## 6. Tests (new + updated)

No existing test specifically covers the role-name wire value. Recommend adding a small unit test to lock this behaviour. Suggested location:

**New file**: `/app/frontend/src/__tests__/api/role-name-wire-contract.test.js`

Coverage sketch (write these with Jest):

| Case | Input (permissions) | Expected wire value |
|---|---|---|
| Owner login | `["Manager", "food", "pos", ...]` | `"Manager"` |
| Waiter login (hypothetical) | `["Waiter", "food", ...]` | `"Waiter"` |
| Empty permissions | `[]` | `"Manager"` (fallback) |
| Undefined permissions | `undefined` | `"Manager"` (fallback) |

The test can either call `orderToAPI.updateOrderStatus(42, permissions?.[0] || 'Manager', 'ready')` and assert the returned payload's `role_name` field, or assert the value in isolation. Keep it simple.

---

## 7. Verification Plan

### A. Automated
1. `cd /app/frontend && CI=true yarn test --watchAll=false` — full suite must remain green.
2. `cd /app/frontend && yarn lint` (if configured) — no new errors on the 5 touched files.
3. Dev server auto-reload — check supervisor log:
   ```
   tail -f /var/log/supervisor/frontend.out.log
   ```
   Expect `webpack compiled successfully` (ignore the pre-existing `LoadingPage.jsx` `react-hooks/exhaustive-deps` warning, unchanged).

### B. Manual (live preprod via the deployed preview URL)

Login: `owner@18march.com` / `Qplazm@10`.
Open DevTools → Network tab, filter for `role_name`.

1. **Running-orders fetch** (happens automatically on LoadingPage):
   - Request URL must contain `?role_name=Manager` (was already `Manager`; must not regress).
2. **Confirm order** (open a Yet-to-Confirm order, click Confirm):
   - Request body must contain `"role_name": "Manager"`.
3. **Mark Ready / Served** (dine-in flow on a placed order):
   - Request body must contain `"role_name": "Manager"`.
4. **Cancel order** (from Dashboard or from OrderEntry):
   - Request body must contain `"role_name": "Manager"`.

Optional if a Waiter-role test account is available: repeat steps 1‑4 and assert `"Waiter"` on the wire. Not blocking.

### C. Regression sanity
- Sidebar still displays the raw `roleName` (e.g., `"Owner (Owner)"`) — this is display only and unchanged.
- All diagnostic `console.log` statements (`LoadingPage`, `DashboardPage`, `AllOrdersReportPage`) still log `user.roleName` correctly for debugging.

---

## 8. Risk Assessment

**Low** — for the current login (`owner@18march.com`), the wire value was already `"Manager"` via the heuristic on the fetch path, and `"Owner"` via raw passthrough on the mutation paths. Post-change, all 4 paths send `"Manager"` (= `permissions[0]`).

The only behaviour delta is:
- Users whose raw `role_name` was a non-canonical string (`"m"`, `"Captain"`, etc.) and who triggered a mutation endpoint will now send `permissions[0]` (canonical) instead of the non-canonical raw string. This is the intended fix.

No backend changes. No API contract renames. All changes are strictly additive in terms of correctness.

---

## 9. Rollback Plan

If the backend rejects `"Manager"` on any of the 4 endpoints for any user segment (unlikely — it already receives `"Manager"` from the fetch path and from most mutation paths), revert the 14 edits. No database / state migration needed. Git revert on the single commit is sufficient.

---

## 10. Open Questions (for product, non-blocking)

1. **Station Data Fetch** (`stationService.js:185`) — product owner to confirm whether it should continue sending a station name on the `role_name` field or be normalised similarly.
2. **`OrderContext.refreshOrders` default** (`contexts/OrderContext.jsx:36`) — currently hardcoded `'Manager'`. Only one caller (`OrderEntry.jsx:1950`) invokes without args. Leave as-is unless product wants role-tier fidelity on socket-driven refresh.
3. **Deletion of `getOrderRoleParam`** — safe per grep, but a full-repo search confirmation before merge is wise (could be referenced from tests, storybook, etc. — this repo currently has no such reference, but it's the kind of thing that breaks CI elsewhere).

---

## 11. Touched Files Summary

| File | Edits | LOC delta |
|---|---|---|
| `pages/DashboardPage.jsx` | 8 | ±0 (in-place replacements) |
| `components/order-entry/OrderEntry.jsx` | 2 | ±0 |
| `pages/LoadingPage.jsx` | 1 | −1 (2 lines → 1 line + comment) |
| `hooks/useRefreshAllData.js` | 2 | +1 (import) / −1 (arg) |
| `api/services/orderService.js` | 1 | −11 (helper deletion) |

**Total LOC touched: ~30. Total edits: 14.**

---

## 12. Contacts / References

- Original investigation trail: prior conversation with the analysis agent (2026-05-01 session on Emergent preview `restaurant-pos-v2-1.preview.emergentagent.com`).
- Live API probe command used to confirm payload shape:
  ```bash
  TOKEN=$(curl -s -X POST "https://preprod.mygenie.online/api/v1/auth/vendoremployee/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"owner@18march.com","password":"Qplazm@10"}' \
    | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
  curl -s -X GET "https://preprod.mygenie.online/api/v2/vendoremployee/vendor-profile/profile" \
    -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | grep -E '"role_name"|"role":'
  ```
- Related concurrent work (merged on same branch in same session): `BUG-AUTOKOT/AUTOBILL` fix — `profileTransform.js` `autoKot` / `autoBill` now read from `print_kot` / `billing_auto_bill_print`. Not related to this change, mentioned only so the implementing agent does not get confused if they grep the file.

---

*End of handover.*
