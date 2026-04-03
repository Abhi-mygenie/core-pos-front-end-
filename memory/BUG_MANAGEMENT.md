# MyGenie POS - Bug Management Document

**Project:** MyGenie Restaurant POS Frontend  
**Repository:** https://github.com/Abhi-mygenie/core-pos-front-end-.git  
**Branch:** April-  
**Document Version:** 1.0  
**Last Updated:** 2026-04-03  

---

## Bug Log Format

| Field | Description |
|-------|-------------|
| **Bug ID** | Unique identifier (BUG-XXX) |
| **Date Reported** | Date bug was identified |
| **Date Fixed** | Date bug was resolved |
| **Reported By** | Who reported the bug |
| **Fixed By** | Who fixed the bug |
| **Severity** | Critical / High / Medium / Low |
| **Status** | Open / In Progress / Fixed / Verified / Closed |
| **Related Task** | Reference to task ID (T-XX) if applicable |
| **Files Changed** | List of modified files |
| **Bug Description** | What was the issue |
| **Steps to Reproduce** | How to reproduce the bug |
| **Root Cause** | Why the bug occurred |
| **Fix Applied** | What was changed to fix it |
| **Code Changes** | Specific code modifications |
| **Testing** | How the fix was validated |
| **Rollback Plan** | How to revert if needed |

---

## Bug History

---

### BUG-101: Infinite Navigation Loop on Login

| Field | Details |
|-------|---------|
| **Bug ID** | BUG-101 |
| **Date Reported** | 2026-04-03 |
| **Date Fixed** | 2026-04-03 |
| **Reported By** | User |
| **Fixed By** | E1 Agent |
| **Severity** | Critical |
| **Status** | ✅ Fixed |
| **Related Task** | N/A (Pre-existing bug) |

#### Files Changed
- `/app/frontend/src/pages/LoginPage.jsx`
- `/app/frontend/src/pages/DashboardPage.jsx`

#### Bug Description
Application crashed with "Maximum update depth exceeded" error after login. Users could not access the dashboard. The browser console showed repeated navigation attempts causing React to crash.

#### Steps to Reproduce
1. Open the application
2. Enter valid credentials (owner@18march.com / Qplazm@10)
3. Click "LOG IN"
4. Observe browser freezing and console errors

#### Root Cause
Three interconnected issues caused an infinite navigation loop:

1. **LoginPage used wrong login method:**
   - Called `authService.login()` directly instead of `useAuth().login()`
   - Token was saved to localStorage but AuthContext state was NOT updated
   - `ProtectedRoute` checked context state (always `false`) → redirected to login

2. **LoginPage useEffect triggered double navigation:**
   - After login, `isAuthenticated` changed to `true`
   - useEffect ran and called `navigate("/loading")`
   - When `isLoading` became `false`, useEffect ran AGAIN
   - Double navigation caused React state update loop

3. **DashboardPage redirect without path check:**
   - When `restaurantLoaded` was `false`, it navigated to `/loading`
   - No check if already on `/loading` path
   - Created navigation ping-pong between pages

#### Fix Applied
Fix all three issues to break the infinite loop:

1. Use AuthContext's `login()` function to update both localStorage AND state
2. Add `useRef` flag to prevent double navigation
3. Add path check before redirecting from Dashboard

#### Code Changes

**File: `/app/frontend/src/pages/LoginPage.jsx`**

```diff
- import { useState, useEffect } from "react";
+ import { useState, useEffect, useRef } from "react";
  import { useNavigate } from "react-router-dom";
  import { User, Lock, Eye, EyeOff } from "lucide-react";
  import { COLORS, GENIE_LOGO_URL } from "../constants";
  import { useToast } from "../hooks/use-toast";
+ import { useAuth } from "../contexts/AuthContext";
  import * as authService from "../api/services/authService";

  const LoginPage = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
+   const { login, isAuthenticated } = useAuth();
+   const hasNavigatedRef = useRef(false);
    
    const [email, setEmail] = useState("");
    // ... other state

    useEffect(() => {
      const rememberedEmail = authService.getRememberedEmail();
      if (rememberedEmail) {
        setEmail(rememberedEmail);
        setRememberMe(true);
      }
      
-     if (authService.isAuthenticated()) {
-       navigate("/loading", { replace: true });
+     if (isAuthenticated && !hasNavigatedRef.current) {
+       hasNavigatedRef.current = true;
+       navigate("/loading", { replace: true });
      }
-   }, [navigate]);
+   }, [navigate, isAuthenticated]);

    const handleLogin = async (e) => {
      // ...
      try {
-       await authService.login({ email, password }, rememberMe);
+       await login({ email, password }, rememberMe);
        navigate("/loading", { replace: true });
      } catch (error) {
        // ...
      }
    };
```

**File: `/app/frontend/src/pages/DashboardPage.jsx`**

```diff
    useEffect(() => {
-     if (!restaurantLoaded) {
-       navigate("/loading");
+     if (!restaurantLoaded && window.location.pathname !== '/loading') {
+       navigate("/loading", { replace: true });
      }
    }, [navigate, restaurantLoaded]);
```

#### Testing
| Test Case | Expected | Result |
|-----------|----------|--------|
| Fresh login with valid credentials | Navigate to /loading → /dashboard | ✅ Pass |
| Page refresh when authenticated | Stay on current page | ✅ Pass |
| Direct access to /dashboard without data | Redirect to /loading once | ✅ Pass |
| Console errors | No "Maximum update depth" errors | ✅ Pass |
| Socket connection | Connect after authentication | ✅ Pass |

#### Rollback Plan
```bash
git revert <commit-hash>
# Or manually restore original code from backup
```

---

### BUG-102: [TEMPLATE - Copy for new bugs]

| Field | Details |
|-------|---------|
| **Bug ID** | BUG-102 |
| **Date Reported** | YYYY-MM-DD |
| **Date Fixed** | YYYY-MM-DD |
| **Reported By** | Name |
| **Fixed By** | Name |
| **Severity** | Critical / High / Medium / Low |
| **Status** | 🔴 Open / 🟡 In Progress / ✅ Fixed / ✔️ Verified / 🟢 Closed |
| **Related Task** | T-XX |

#### Files Changed
- `/path/to/file1.jsx`
- `/path/to/file2.js`

#### Bug Description
[Describe what was broken]

#### Steps to Reproduce
1. Step 1
2. Step 2
3. Step 3

#### Root Cause
[Explain why the bug occurred]

#### Fix Applied
[Describe the fix]

#### Code Changes
```diff
- old code
+ new code
```

#### Testing
| Test Case | Expected | Result |
|-----------|----------|--------|
| Test 1 | Expected result | ✅ Pass / ❌ Fail |

#### Rollback Plan
[Steps to revert if needed]

---

## Previously Fixed Bugs (T-05 to T-11)

These bugs were fixed in a previous session and are already in the April- branch:

| Bug ID | Task | Description | Severity | Status |
|--------|------|-------------|----------|--------|
| BUG-001 | T-05 | Hardcoded preprod URL fallback in axios.js | Critical | ✅ Fixed |
| BUG-002 | T-05 | Hardcoded presocket URL fallback | Critical | ✅ Fixed |
| BUG-003 | T-05 | Hardcoded preprod storage URL in transforms | Critical | ✅ Fixed |
| BUG-004 | T-06 | Socket connects before authentication | Critical | ✅ Fixed |
| BUG-005 | T-07 | No route protection for authenticated pages | Critical | ✅ Fixed |
| BUG-006 | T-07 | No error boundary for crash recovery | High | ✅ Fixed |
| BUG-007 | T-08 | Duplicate EDIT_ORDER_ITEM key in constants | High | ✅ Fixed |
| BUG-008 | T-09 | TBD endpoint in paymentService | High | ✅ Fixed |
| BUG-009 | T-11 | _raw field exposed in production | Medium | ✅ Fixed |

---

## Open Bugs

| Bug ID | Task | Description | Severity | Status |
|--------|------|-------------|----------|--------|
| - | - | No open bugs | - | - |

---

### BUG-103: Socket Service Exposed Globally in Production

| Field | Details |
|-------|---------|
| **Bug ID** | BUG-103 |
| **Date Reported** | 2026-04-03 |
| **Date Fixed** | 2026-04-03 |
| **Reported By** | Code Audit |
| **Fixed By** | E1 Agent |
| **Severity** | Medium |
| **Status** | ✅ Fixed |
| **Related Task** | T-10 |

#### Files Changed
- `/app/frontend/src/api/socket/socketService.js`

#### Bug Description
The socket service singleton was exposed on `window.__SOCKET_SERVICE__` in ALL environments including production. This is a security risk as malicious scripts could manipulate the socket connection.

#### Steps to Reproduce
1. Open browser console in production
2. Type `window.__SOCKET_SERVICE__`
3. Observe the socket service object is accessible
4. Attacker could call `emit()`, `disconnect()`, or `getDebugInfo()`

#### Root Cause
The code exposed the socket service globally without checking the environment:
```javascript
if (typeof window !== 'undefined') {
  window.__SOCKET_SERVICE__ = socketService;  // Always exposed!
}
```

#### Fix Applied
Added `NODE_ENV` check to only expose in development:
```javascript
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.__SOCKET_SERVICE__ = socketService;
}
```

#### Code Changes

**File: `/app/frontend/src/api/socket/socketService.js`**

```diff
- // Expose to window for debugging
- if (typeof window !== 'undefined') {
-   window.__SOCKET_SERVICE__ = socketService;
- }

+ // Expose to window for debugging (development only — T-10)
+ if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
+   window.__SOCKET_SERVICE__ = socketService;
+ }
```

#### Testing

**Unit Tests (socketServiceGlobal.test.js):**
| Test | Description | Result |
|------|-------------|--------|
| T1 | NODE_ENV guard exists in source | ✅ Pass |
| T2 | Guard wraps __SOCKET_SERVICE__ assignment | ✅ Pass |

**Runtime Tests:**
| Test | Environment | Expected | Result |
|------|-------------|----------|--------|
| `typeof window.__SOCKET_SERVICE__` | Development | `"object"` | ✅ Pass |
| `grep __SOCKET_SERVICE__ build/static/js/*.js` | Production Build | 0 matches | ✅ Pass |

**Manual Verification:**
```bash
# 1. Run unit tests
cd /app/frontend && yarn test --testPathPattern="socketServiceGlobal" --watchAll=false
# Result: 2 passed

# 2. Build production
yarn build

# 3. Verify removal in production bundle
grep -o "__SOCKET_SERVICE__" build/static/js/main.*.js | wc -l
# Result: 0 (completely removed by dead code elimination)
```

#### Rollback Plan
```bash
git revert <commit-hash>
```

---

### BUG-104: Missing Barrel Exports in Component Folders

| Field | Details |
|-------|---------|
| **Bug ID** | BUG-104 |
| **Date Reported** | 2026-04-03 |
| **Date Fixed** | 2026-04-03 |
| **Reported By** | Code Audit |
| **Fixed By** | E1 Agent |
| **Severity** | Low |
| **Status** | ✅ Fixed |
| **Related Task** | T-12, T-14 |

#### Files Changed
- `/app/frontend/src/components/modals/index.js` (NEW)
- `/app/frontend/src/components/panels/index.js` (NEW)
- `/app/frontend/src/components/reports/index.js` (NEW)
- `/app/frontend/src/pages/index.js` (UPDATED)

#### Bug Description
Component folders `modals/`, `panels/`, and `reports/` were missing barrel exports (`index.js`), forcing verbose imports. Also `pages/index.js` was missing `AllOrdersReportPage`.

#### Steps to Reproduce
1. Try `import { FilterBar } from '@/components/reports'`
2. Build fails - no index.js to resolve

#### Root Cause
Barrel export files were never created for these folders.

#### Fix Applied
Created `index.js` barrel exports for:
- `modals/` - exports RoomCheckInModal
- `panels/` - exports MenuManagementPanel, SettingsPanel, and sub-components
- `reports/` - exports all 8 report components
- `pages/` - added missing AllOrdersReportPage export

#### Testing
| Test | Description | Result |
|------|-------------|--------|
| modals/index.js exists | File exists check | ✅ Pass |
| exports RoomCheckInModal | Export check | ✅ Pass |
| can import from barrel | Runtime import | ✅ Pass |
| panels/index.js exists | File exists check | ✅ Pass |
| exports MenuManagementPanel | Export check | ✅ Pass |
| exports SettingsPanel | Export check | ✅ Pass |
| exports menu sub-components | CategoryList, ProductCard, etc. | ✅ Pass |
| exports settings sub-components | TableManagementView | ✅ Pass |
| reports/index.js exists | File exists check | ✅ Pass |
| exports DatePicker | Export check | ✅ Pass |
| exports ExportButtons | Export check | ✅ Pass |
| exports FilterBar | Export check | ✅ Pass |
| exports FilterTags | Export check | ✅ Pass |
| exports OrderDetailSheet | Export check | ✅ Pass |
| exports OrderTable | Export check | ✅ Pass |
| exports ReportTabs | Export check | ✅ Pass |
| exports SummaryBar | Export check | ✅ Pass |
| all report components match files | Directory scan | ✅ Pass |
| pages/index.js exists | File exists check | ✅ Pass |
| exports LoginPage | Export check | ✅ Pass |
| exports LoadingPage | Export check | ✅ Pass |
| exports DashboardPage | Export check | ✅ Pass |
| exports OrderSummaryPage | Export check | ✅ Pass |
| exports AllOrdersReportPage | Export check | ✅ Pass |
| all page files exported | Directory scan | ✅ Pass |
| no duplicate exports | Uniqueness check | ✅ Pass |

**Total: 26 tests passed**

#### Rollback Plan
```bash
rm /app/frontend/src/components/modals/index.js
rm /app/frontend/src/components/panels/index.js
rm /app/frontend/src/components/reports/index.js
git checkout -- /app/frontend/src/pages/index.js
```

---

### BUG-105: Missing Financial Fields in Order Transform

| Field | Details |
|-------|---------|
| **Bug ID** | BUG-105 |
| **Date Reported** | 2026-04-03 |
| **Date Fixed** | 2026-04-03 |
| **Reported By** | User |
| **Fixed By** | E1 Agent |
| **Severity** | Medium |
| **Status** | ✅ Fixed |
| **Related Task** | Phase 1 - Financial Fields |

#### Files Changed
- `/app/frontend/src/api/transforms/orderTransform.js`

#### Bug Description
New API fields for financial data (`order_sub_total_without_tax`, `total_service_tax_amount`, `tip_amount`, etc.) were not being mapped in the order transform, making them unavailable to UI components.

#### Root Cause
The `fromAPI.order()` function only mapped `order_amount` to `amount`. New API fields for subtotal, tax, and tip were not included.

#### Fix Applied
Added 6 new field mappings to `orderTransform.js`:

```javascript
// fromAPI.order()
subtotalBeforeTax: parseFloat(api.order_sub_total_without_tax) || parseFloat(api.order_amount) || 0,
subtotalAmount: parseFloat(api.order_sub_total_amount) || parseFloat(api.order_amount) || 0,
serviceTax: parseFloat(api.total_service_tax_amount) || 0,
tipAmount: parseFloat(api.tip_amount) || 0,
tipTaxAmount: parseFloat(api.tip_tax_amount) || 0,

// fromAPI.orderItem()
itemType: detail.item_type || null,
```

#### Testing
**18 test cases added** - `/app/frontend/src/__tests__/api/transforms/orderTransformFinancials.test.js`

| Test | Result |
|------|--------|
| Map subtotalBeforeTax | ✅ Pass |
| Map subtotalAmount | ✅ Pass |
| Map serviceTax | ✅ Pass |
| Map tipAmount | ✅ Pass |
| Map tipTaxAmount | ✅ Pass |
| Fallback subtotalBeforeTax | ✅ Pass |
| Fallback subtotalAmount | ✅ Pass |
| Handle zero serviceTax | ✅ Pass |
| Default tipAmount | ✅ Pass |
| Default tipTaxAmount | ✅ Pass |
| Backward compatibility | ✅ Pass |
| Handle null values | ✅ Pass |
| Handle numeric values | ✅ Pass |
| Map itemType | ✅ Pass |
| Default itemType | ✅ Pass |
| KDS itemType | ✅ Pass |
| Station compatibility | ✅ Pass |
| Full integration | ✅ Pass |

**Total project tests: 102 passing**

#### Rollback Plan
```bash
git revert <commit-hash>
```

---

## Bug Statistics

| Metric | Count |
|--------|-------|
| Total Bugs Logged | 16 |
| Critical | 5 |
| High | 4 |
| Medium | 5 |
| Low | 1 |
| Fixed | 16 |
| Open | 0 |

---

### BUG-107: Single Item Cancel Removes Entire Order

| Field | Details |
|-------|---------|
| **Bug ID** | BUG-107 |
| **Date Reported** | 2026-04-03 |
| **Date Fixed** | 2026-04-03 |
| **Reported By** | User |
| **Fixed By** | E1 Agent |
| **Severity** | High |
| **Status** | ✅ Fixed |
| **Related Task** | Socket Handler |

#### Files Changed
- `/app/frontend/src/api/socket/socketHandlers.js`

#### Bug Description
When cancelling a single item from an order, the socket handler received `update-order-status` with `status=3` (cancelled) and immediately removed the entire order from the dashboard. The order should only be removed if ALL items are cancelled.

#### Steps to Reproduce
1. Create an order with multiple items
2. Cancel one item
3. Observe: Entire order disappears from dashboard
4. Expected: Order remains with remaining items

#### Root Cause
The `handleUpdateOrderStatus` handler had logic that immediately removed orders when `status === 3`:

```javascript
if (fOrderStatus === 6 || fOrderStatus === 3) {
  removeOrder(orderId);  // ❌ Removed entire order!
  return;
}
```

This didn't account for single item cancellation where the order still has active items.

#### Fix Applied
Changed to fetch order data first when status is 3, then check if ALL items are cancelled:

```javascript
// For cancelled status (3), fetch order first
const order = await fetchOrderWithRetry(orderId);

if (order) {
  // Check if ALL items are cancelled
  const allItemsCancelled = !order.items?.length || 
    order.items.every(item => item.status === 'cancelled');
  
  if (allItemsCancelled) {
    removeOrder(orderId);  // ✅ Only remove if truly cancelled
  } else {
    updateOrder(order.orderId, order);  // ✅ Update with remaining items
  }
}
```

#### Testing

**Test file:** `/app/frontend/src/__tests__/api/socket/updateOrderStatus.test.js`

| Category | Tests | Status |
|----------|-------|--------|
| Paid orders (status 6) - remove immediately | 1 | ✅ Pass |
| Single item cancel - should UPDATE | 3 | ✅ Pass |
| All items cancelled - should REMOVE | 2 | ✅ Pass |
| Order not found - should REMOVE | 1 | ✅ Pass |
| Other statuses - fetch and update | 5 | ✅ Pass |
| Edge cases | 2 | ✅ Pass |
| **Total** | **14** | ✅ **All Pass** |

**Before fix:** 11 passed, 3 failed
**After fix:** 14 passed, 0 failed

**Total project tests:** 147 passing

#### Rollback Plan
```bash
git revert <commit-hash>
```

---

### BUG-106: Cancel Item Payload Issues

| Field | Details |
|-------|---------|
| **Bug ID** | BUG-106 |
| **Date Reported** | 2026-04-03 |
| **Date Fixed** | 2026-04-03 |
| **Reported By** | User |
| **Fixed By** | E1 Agent |
| **Severity** | Medium |
| **Status** | ✅ Fixed |
| **Related Task** | Cancel Item API |

#### Files Changed
- `/app/frontend/src/api/transforms/orderTransform.js`

#### Bug Description
Cancel item payloads (`cancelItemFull` and `cancelItemPartial`) were sending incorrect values:
1. `cancel_type` was `'full'` or `'partial'` instead of `'Pre-Serve'`/`'Post-Serve'`
2. `cancelItemPartial` sent wrong `order_food_id` (item.id instead of item.foodId)
3. `cancelItemPartial` was missing `item_id` field entirely

#### Expected Payload
```json
{
  "order_id": 730154,
  "item_id": 1900357,
  "order_food_id": 96557,
  "order_status": "cancelled",
  "reason_type": 2,
  "reason": "",
  "cancel_type": "Post-Serve"
}
```

#### Root Cause
- `cancelItemFull`: Hardcoded `cancel_type: 'full'` instead of status-based value
- `cancelItemPartial`: Wrong mapping (`order_food_id: item.id`) and missing `item_id`

#### Fix Applied

**cancelItemFull:**
```diff
- cancel_type: 'full',
+ cancel_type: item.status === 'preparing' ? 'Pre-Serve' : 'Post-Serve',
```

**cancelItemPartial:**
```diff
- order_food_id: item.id,
+ order_food_id: item.foodId,
+ item_id: item.id,
- cancel_type: 'partial',
+ cancel_type: item.status === 'preparing' ? 'Pre-Serve' : 'Post-Serve',
```

#### Testing

**Test file:** `/app/frontend/src/__tests__/api/transforms/cancelItemPayload.test.js`

| Category | Tests | Status |
|----------|-------|--------|
| cancelItemFull - cancel_type | 5 | ✅ Pass |
| cancelItemFull - other fields | 6 | ✅ Pass |
| cancelItemFull - complete payload | 2 | ✅ Pass |
| cancelItemPartial - cancel_type | 4 | ✅ Pass |
| cancelItemPartial - order_food_id/item_id | 2 | ✅ Pass |
| cancelItemPartial - cancel_qty | 2 | ✅ Pass |
| cancelItemPartial - other fields | 4 | ✅ Pass |
| cancelItemPartial - complete payload | 2 | ✅ Pass |
| Consistency tests | 4 | ✅ Pass |
| **Total** | **31** | ✅ **All Pass** |

**Before fix:** 18 failed, 13 passed
**After fix:** 31 passed, 0 failed

**Total project tests:** 133 passing

#### Rollback Plan
```bash
git revert <commit-hash>
```
| Low | 1 |
| Fixed | 13 |
| Open | 0 |

---

## Severity Definitions

| Severity | Definition | Response Time |
|----------|------------|---------------|
| **Critical** | App crash, data loss, security breach, complete feature failure | Immediate |
| **High** | Major feature broken, significant user impact, workaround exists | < 24 hours |
| **Medium** | Minor feature issue, cosmetic bugs, edge cases | < 1 week |
| **Low** | Nice-to-have fixes, minor UI issues | Next sprint |

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| QA | | | |
| Product Owner | | | |

---

*Document maintained by the development team. All bugs must be logged and tracked here.*
