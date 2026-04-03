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

## Bug Statistics

| Metric | Count |
|--------|-------|
| Total Bugs Logged | 12 |
| Critical | 5 |
| High | 3 |
| Medium | 3 |
| Low | 0 |
| Fixed | 12 |
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
