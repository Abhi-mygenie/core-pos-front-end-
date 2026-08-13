# CR-124 — Gate 3 Implementation Plan

**ID:** CR-124
**Title:** Call PaaS Logout API on User Logout
**Date:** 2026-07-31
**Written by:** PLANNING AGENT
**Risk:** MEDIUM-HIGH
**Gate:** 3 — Implementation Plan (awaiting Gate 4 GO)

**Source docs:**
- Intake: `/app/memory/change_requests/CR-124_LOGOUT_API_CALL_INTAKE.md`
- Impact Analysis: `/app/memory/impact/CR-124_IMPACT_ANALYSIS.md`

---

## 0. Starting State Verification (Code Reality)

Each edit below was verified against the live file on 2026-07-31.
All line references are current and accurate as of this writing.

| File | Verified at line(s) | Reality |
|---|---|---|
| `constants.js` | L8 — `LOGIN:` present; no `LOGOUT:` key | ✅ MATCHES |
| `authService.js` | L49-61 — `logout` is synchronous, no API call | ✅ MATCHES |
| `AuthContext.jsx` | L34-40 — `logout` callback is synchronous | ✅ MATCHES |
| `Sidebar.jsx` | L400-413 — `handleLogout` is synchronous; L410-411 duplicate removes present | ✅ MATCHES |
| `axios.js` | L42-52 — 401 handler clears only `auth_token` + `remember_me` | ✅ MATCHES |

---

## 1. Scope Lock

**Files WILL change:**
1. `src/api/constants.js`
2. `src/api/services/authService.js`
3. `src/contexts/AuthContext.jsx`
4. `src/components/layout/Sidebar.jsx`
5. `src/api/axios.js`

**Files will NOT touch:**
- `src/firebase.js`
- `src/pages/LoginPage.jsx`
- `src/api/crmAxios.js`
- Any test files
- Any other file not listed above

---

## 2. Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| API call fails on every logout attempt (network down, backend error) | LOW | Graceful error toast; user stays logged in and can retry |
| async logout creates double-logout (race condition) | LOW | `isLoggingOut` state disables button during call |
| `sessionStorage.clear()` in AuthContext runs before auth_token is cleared from localStorage | NONE | auth_token cleared in `authService.logout()` (inside the `await`), before `sessionStorage.clear()` runs |
| `remember_me` is now cleared in authService instead of Sidebar — behavior change | INTENTIONAL | Same net effect on primary path. Sidebar duplicate removed. Programmatic logout now also clears it. |
| `axios.js` 401 handler doesn't call `clearCrmToken()` (in-memory reset) | NONE | Full page reload follows `window.location.href = '/'`, which re-initialises all modules from cleared sessionStorage |

---

## 3. Execution Sequence

Apply edits in this order to avoid breaking the call chain mid-session:

```
Edit 1 → constants.js     (add LOGOUT endpoint — no runtime effect until Edit 2 runs)
Edit 2 → authService.js   (make logout async, add API call)
Edit 3 → AuthContext.jsx  (make logout callback async, await authService.logout)
Edit 4 → Sidebar.jsx      (make handleLogout async, add try/catch + toast, remove dead code)
Edit 5 → axios.js         (add crm_token + channel_visibility to 401 cleanup)
```

Hot-reload handles each edit. No supervisor restart needed. Single webpack compilation check after all 5 edits.

---

## 4. Edit-by-Edit Detail

---

### Edit 1 — `src/api/constants.js`
**Change:** Add `LOGOUT` to `API_ENDPOINTS`. 1 new line.

**Current (line 8):**
```js
  LOGIN: '/api/v1/auth/vendoremployee/login',
```

**Proposed (lines 8-9):**
```js
  LOGIN: '/api/v1/auth/vendoremployee/login',
  LOGOUT: '/api/v2/vendoremployee/employee-logout',     // CR-124: server-side token invalidation + FCM deregister
```

**Location:** `API_ENDPOINTS` object, `// Auth` section, after `LOGIN:`.

---

### Edit 2 — `src/api/services/authService.js`
**Change:** Make `logout()` async; add `await api.post(LOGOUT)` as first operation; move all localStorage clears to AFTER the await (cleared only on success); add `REMEMBER_ME` removal (IMP-124-GAP-1).

**Current (lines 46-61):**
```js
/**
 * Logout user - Clear stored data
 */
export const logout = () => {
  localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  // BUG-098: Clear CRM token on logout
  clearCrmToken();
  // BUG-130: Always clear channel-visibility override on logout so a freshly
  // enabled channel (via Restaurant Settings) is not suppressed by a stale
  // per-user override on next login. Independent of remember-me.
  localStorage.removeItem(STORAGE_KEYS.CHANNEL_VISIBILITY);
  // Keep remember me email if set
  if (!localStorage.getItem(STORAGE_KEYS.REMEMBER_ME)) {
    localStorage.removeItem(STORAGE_KEYS.USER_EMAIL);
  }
};
```

**Proposed (lines 46-66, +5 net lines):**
```js
/**
 * Logout user - Call PaaS logout API first, then clear local state on success.
 * CR-124: API call FIRST; localStorage cleared only on success (Q-124-4 locked).
 * On API failure, throws — caller handles toast and user stays logged in.
 */
export const logout = async () => {
  // CR-124: Invalidate server-side token + deregister FCM device token
  await api.post(API_ENDPOINTS.LOGOUT);
  // API succeeded — clear local state
  localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  // BUG-098: Clear CRM token on logout
  clearCrmToken();
  // BUG-130: Always clear channel-visibility override on logout so a freshly
  // enabled channel (via Restaurant Settings) is not suppressed by a stale
  // per-user override on next login. Independent of remember-me.
  localStorage.removeItem(STORAGE_KEYS.CHANNEL_VISIBILITY);
  // Keep remember me email if set (preserved for login pre-fill)
  if (!localStorage.getItem(STORAGE_KEYS.REMEMBER_ME)) {
    localStorage.removeItem(STORAGE_KEYS.USER_EMAIL);
  }
  // IMP-124-GAP-1: clear remember_me here (was only in Sidebar.jsx:411 as dead code)
  localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
};
```

**No new imports needed** — `api` and `API_ENDPOINTS` already imported at lines 3-4.

---

### Edit 3 — `src/contexts/AuthContext.jsx`
**Change:** Make `logout` callback `async`; add `await authService.logout()`. On API failure, error propagates to caller (Sidebar) which handles the toast. State is cleared only after await succeeds.

**Current (lines 33-40):**
```js
  // Logout function
  const logout = useCallback(() => {
    authService.logout();
    sessionStorage.clear();
    setToken(null);
    setUser(null);
    setPermissions([]);
  }, []);
```

**Proposed (lines 33-41, +1 net line):**
```js
  // Logout function — CR-124: async; awaits API call; throws on failure (caller handles toast)
  const logout = useCallback(async () => {
    await authService.logout(); // CR-124: awaits API + local storage clear
    sessionStorage.clear();
    setToken(null);
    setUser(null);
    setPermissions([]);
  }, []);
```

---

### Edit 4 — `src/components/layout/Sidebar.jsx`
**Change A:** Add `isLoggingOut` state (1 line, alongside existing state at line 232).
**Change B:** Make `handleLogout` async; wrap in try/catch; await `authLogout()`; show destructive toast on error; remove 2 duplicate localStorage.removeItem lines (IMP-124-GAP-3).
**Change C:** Add `disabled={isLoggingOut}` to Logout button; update label text for in-progress state.

---

**Change A — Add state (near existing `useState` declarations, line 232 area):**

Current (lines 232-233):
```js
  const [expandedSections, setExpandedSections] = useState({});
  const [activeItem, setActiveItem] = useState("dashboard");
```

Proposed (lines 232-234):
```js
  const [expandedSections, setExpandedSections] = useState({});
  const [activeItem, setActiveItem] = useState("dashboard");
  const [isLoggingOut, setIsLoggingOut] = useState(false); // CR-124: disable button during API call
```

---

**Change B — Replace `handleLogout` function (lines 400-413):**

Current:
```js
  const handleLogout = () => {
    // Clear ALL contexts — prevents mixed session state between account switches
    clearInsightsCache();     // CR-044 R-8: clear report cache on logout
    authLogout();
    clearRestaurant();
    clearMenu();
    clearTables();
    clearSettings();
    clearOrders();
    sessionStorage.clear();
    localStorage.removeItem('auth_token');
    localStorage.removeItem('remember_me');
    navigate("/");
  };
```

Proposed:
```js
  const handleLogout = async () => {
    // CR-124: await API call; show toast and stay logged in on failure
    setIsLoggingOut(true);
    try {
      clearInsightsCache();     // CR-044 R-8: clear report cache on logout
      await authLogout();       // CR-124: async — awaits PaaS logout API + local clear
      clearRestaurant();
      clearMenu();
      clearTables();
      clearSettings();
      clearOrders();
      sessionStorage.clear();
      // IMP-124-GAP-3: removed duplicate localStorage.removeItem calls (handled in authService.logout)
      navigate("/");
    } catch (err) {
      // CR-124: API failure — surface error; user stays logged in, can retry
      toast({
        title: "Logout Failed",
        description: err.readableMessage || "Could not reach the server. Please try again.",
        variant: "destructive",
      });
      setIsLoggingOut(false);
    }
  };
```

---

**Change C — Update Logout button (lines 752-764):**

Current:
```jsx
        <button
          data-testid="sidebar-logout"
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-2 py-2.5 mt-2 hover:bg-red-50 rounded-lg transition-colors ${
            isExpanded ? "justify-start" : "justify-center"
          }`}
          style={{ color: "#EF4444" }}
          title={!isExpanded ? "Logout" : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {isExpanded && <span className="text-sm font-medium">Logout</span>}
        </button>
```

Proposed:
```jsx
        <button
          data-testid="sidebar-logout"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className={`w-full flex items-center gap-3 px-2 py-2.5 mt-2 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-60 ${
            isExpanded ? "justify-start" : "justify-center"
          }`}
          style={{ color: "#EF4444" }}
          title={!isExpanded ? (isLoggingOut ? "Logging out..." : "Logout") : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {isExpanded && <span className="text-sm font-medium">{isLoggingOut ? "Logging out..." : "Logout"}</span>}
        </button>
```

---

### Edit 5 — `src/api/axios.js`
**Change:** In the 401 auto-logout block (lines 42-52), add 2 lines to clear `crm_token` (sessionStorage) and `mygenie_channel_visibility` (localStorage) — IMP-124-GAP-2.

**No new imports needed.** Direct key access chosen over importing `clearCrmToken` to avoid any future circular-import risk. Full page reload that follows (`window.location.href = '/'`) re-initialises all in-memory module state from the now-cleared sessionStorage.

**Current (lines 42-53):**
```js
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('auth_token');
      localStorage.removeItem('remember_me');
      
      // Only redirect if not already on login page
      if (window.location.pathname !== '/') {
        // Signal intentional navigation so beforeunload doesn't show dialog
        sessionStorage.setItem('auth_redirect', '1');
        window.location.href = '/';
      }
    }
```

**Proposed (lines 42-56, +2 net lines):**
```js
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('auth_token');
      localStorage.removeItem('remember_me');
      // IMP-124-GAP-2 (CR-124): also clear CRM token + channel-visibility on 401 auto-logout
      sessionStorage.removeItem('crm_token');
      localStorage.removeItem('mygenie_channel_visibility');
      
      // Only redirect if not already on login page
      if (window.location.pathname !== '/') {
        // Signal intentional navigation so beforeunload doesn't show dialog
        sessionStorage.setItem('auth_redirect', '1');
        window.location.href = '/';
      }
    }
```

---

## 5. Verification Matrix

| Edit # | File | Change Description | How to Verify | Automated? |
|--------|------|--------------------|---------------|:---:|
| 1 | `constants.js:9` | `LOGOUT` key added to `API_ENDPOINTS` | `grep -n "LOGOUT" src/api/constants.js` → shows line with `/api/v2/vendoremployee/employee-logout` | YES (grep) |
| 2 | `authService.js:51` | `logout` is `async`; `await api.post(LOGOUT)` is first line | `grep -n "async\|await api.post" src/api/services/authService.js` | YES (grep) |
| 2 | `authService.js` | localStorage cleared AFTER await (not before) | Read function — `localStorage.removeItem(AUTH_TOKEN)` appears after `await api.post(...)` | YES (code read) |
| 2 | `authService.js` | `REMEMBER_ME` now removed inside `authService.logout()` | `grep -n "REMEMBER_ME" src/api/services/authService.js` → shows removeItem call | YES (grep) |
| 3 | `AuthContext.jsx:34` | `logout` callback is `async` | `grep -n "async\|await authService" src/contexts/AuthContext.jsx` | YES (grep) |
| 4 | `Sidebar.jsx` | `isLoggingOut` state declared | `grep -n "isLoggingOut" src/components/layout/Sidebar.jsx` | YES (grep) |
| 4 | `Sidebar.jsx` | `handleLogout` is `async`, has `try/catch`, calls `await authLogout()` | Code read — `async`, `try {`, `catch (err)`, `await authLogout()` all present | YES (code read) |
| 4 | `Sidebar.jsx` | Duplicate removes L410-411 are gone | `grep -n "removeItem.*auth_token\|removeItem.*remember_me" src/components/layout/Sidebar.jsx` → 0 results | YES (grep) |
| 4 | `Sidebar.jsx` | Logout button has `disabled={isLoggingOut}` | `grep -n "disabled" src/components/layout/Sidebar.jsx` → shows `disabled={isLoggingOut}` | YES (grep) |
| 5 | `axios.js` | `crm_token` + `channel_visibility` cleared in 401 block | `grep -n "crm_token\|channel_visibility" src/api/axios.js` → shows 2 removeItem lines | YES (grep) |
| ALL | webpack | No new compile errors or warnings | `tail -5 /var/log/supervisor/frontend.out.log` shows "Compiled" | YES |
| ALL | Browser (manual) | Click Logout → network tab shows POST to `/api/v2/vendoremployee/employee-logout` → 200 → redirect to `/` | Browser DevTools → Network | NO (manual) |
| ALL | Browser (manual) | After logout, `localStorage.getItem('auth_token')` === `null` | Browser console | NO (manual) |
| ALL | Browser (manual) | After logout, `localStorage.getItem('mygenie_channel_visibility')` === `null` | Browser console | NO (manual) |
| ALL | Browser (manual) | Simulate API failure (throttle network) → click Logout → toast appears → user stays on dashboard | Browser DevTools → Network → Offline | NO (manual) |

---

## 6. Post-Code Registry Checklist

The Implementation agent MUST execute ALL 5 checkboxes before writing QA handover:

```
□ 1. registry.json:
     CR-124 → status: "GATE 5a — IMPLEMENTED"
     sprint_key: "pos_6_0"
     gate: "5a complete"
     completeness: "5/7"

□ 2. BUG_TRACKER.md:
     CR-124 row updated with "IMPLEMENTED" status
     Gate 5a section appended with self-test results and EXIT GATE 5/5 PASS

□ 3. FILE_OWNERSHIP.md:
     Add these 5 files with CR-124 + implementation date:
     - src/api/constants.js         (CR-124, 2026-07-31)
     - src/api/services/authService.js  (CR-124, 2026-07-31)
     - src/contexts/AuthContext.jsx     (CR-124, 2026-07-31)
     - src/components/layout/Sidebar.jsx  (CR-124, 2026-07-31)
     - src/api/axios.js                 (CR-124, 2026-07-31)

□ 4. Code markers:
     Every modified file must have at least one // CR-124 comment.
     Plan includes explicit // CR-124 comments in each edit above.

□ 5. Compile check:
     tail -5 /var/log/supervisor/frontend.out.log → "Compiled successfully"
     0 new warnings from webpack.
```

---

## 7. Net Change Summary

| File | Lines Added | Lines Removed | Net |
|---|---|---|---|
| `constants.js` | +1 | 0 | +1 |
| `authService.js` | +7 | −2 | +5 |
| `AuthContext.jsx` | +2 | −1 | +1 |
| `Sidebar.jsx` | +12 | −6 | +6 |
| `axios.js` | +2 | 0 | +2 |
| **TOTAL** | **+24** | **−9** | **+15** |

---

## 8. Completeness Checklist

- [x] Art 1 — Intake (`change_requests/CR-124_LOGOUT_API_CALL_INTAKE.md`)
- [x] Art 2 — Impact Analysis (`impact/CR-124_IMPACT_ANALYSIS.md`)
- [x] Art 3 — Implementation Plan (this doc)
- [ ] Art 4 — Gate 4 GO (owner approval)
- [ ] Art 5a — Implementation + Self-Test
- [ ] Art 5b — QA Report
- [ ] Art 7 — Owner Smoke

---

## 9. Gate 4 GO Block

```
OWNER APPROVAL REQUIRED
Reason: Implementation plan complete — Gate 4 GO required before coding begins (R4)
Risk: MEDIUM-HIGH
Proposed next step: Owner reviews this plan and issues "Gate 4 GO" to authorise
                    the Implementation agent to apply the 5 edits above.
I will not proceed until owner approves.
```
