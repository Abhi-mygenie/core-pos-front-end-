# CR-124 — Impact Analysis (Gate 2)

**ID:** CR-124
**Date:** 2026-07-31
**Written by:** PLANNING AGENT
**Status:** GATE 2 COMPLETE — Gate 3 ready (Q-124-1 endpoint path + Q-124-4 sequencing needed)
**Risk:** MEDIUM-HIGH
**Intake doc:** `/app/memory/change_requests/CR-124_LOGOUT_API_CALL_INTAKE.md`

---

## Owner Focus (verbatim)
> "When we are making an API call for logout, is there any impact? Because locally we might be storing some data, so are we clearing/clearing any local storage also? So is there any impact, especially there that has to be analyzed very deeply?"

**Answer: YES — significant impact on local state. Full deep audit below.**

---

## 1. Conflict Pre-Check

| Check | Finding |
|---|---|
| `authService.js` — open CR touching this file | None |
| `AuthContext.jsx` — open CR touching this file | None |
| `constants.js` — open CR touching API_ENDPOINTS | None |
| `axios.js` — open CR touching this file | None |
| FILE_OWNERSHIP — hotspot? | NO — standard service files |

**Conflict check: CLEAR**

---

## 2. Logout Call Graph — All Paths (COMPLETE)

There are **3 distinct logout paths** in the codebase. The API call must be wired through all or documented as intentional omission.

### Path 1 — User-Initiated (Sidebar button) ← PRIMARY PATH
```
Sidebar.jsx:400  handleLogout()
  │
  ├── clearInsightsCache()          ← CR-044 R-8: report cache cleared ✅
  ├── authLogout()                  ← calls AuthContext.logout() ↓
  │     └── AuthContext.jsx:34
  │           ├── authService.logout()  ← CURRENTLY LOCAL-ONLY (CR-124 target)
  │           ├── sessionStorage.clear()
  │           ├── setToken(null)
  │           ├── setUser(null)
  │           └── setPermissions([])
  ├── clearRestaurant()             ← clears restaurant context
  ├── clearMenu()                   ← clears menu context
  ├── clearTables()                 ← clears tables context
  ├── clearSettings()               ← clears settings context
  ├── clearOrders()                 ← clears orders context
  ├── sessionStorage.clear()        ← ⚠ DUPLICATE of AuthContext line above
  ├── localStorage.removeItem('auth_token')   ← ⚠ DUPLICATE of authService.logout()
  ├── localStorage.removeItem('remember_me')  ← ⚠ DUPLICATE (partially — authService removes only if !rememberMe)
  └── navigate("/")
```
**After CR-124:** `authService.logout()` becomes `async`. `AuthContext.logout()` must `await` it. `Sidebar.jsx` calls `authLogout()` (AuthContext) — unchanged. The API call is automatically triggered via this path.

### Path 2 — Token Expiry / 401 Auto-Logout (axios interceptor) ← SECONDARY PATH
```
axios.js:42  error.response?.status === 401
  │
  ├── localStorage.removeItem('auth_token')
  ├── localStorage.removeItem('remember_me')
  └── window.location.href = '/'
```
**After CR-124:** This path does NOT call `authService.logout()` and will NOT trigger the backend API call.
**This is ACCEPTABLE** — the 401 means the token is already invalid server-side. No need to call backend again.
**BUT: minor gap** — `crm_token` and `mygenie_channel_visibility` are NOT cleared on 401 auto-logout. This is pre-existing and out of CR-124 scope. Filed as IMP-124-GAP-1 below.

### Path 3 — (No other logout path found)
Verified: no other component/page directly calls `authService.logout()` or clears `auth_token` outside of the above two paths.

---

## 3. Full localStorage Audit — Complete Key Inventory

**Total unique localStorage keys in codebase: 29**

### Category A — Authentication Keys (cleared in authService.logout())

| Key | Set at | Cleared in authService.logout()? | Correct? |
|---|---|---|---|
| `auth_token` | Login (`authService.js:21`) | ✅ Yes (L50) | ✅ |
| `crm_token` | CRM login (`crmService.js`) | ✅ Yes (via `clearCrmToken()`, L51) | ✅ |
| `mygenie_channel_visibility` | StatusConfigPage save | ✅ Yes (L56) — BUG-130 | ✅ |
| `user_email` | Login (L37) | ✅ Yes — conditionally (L58-59, only if !rememberMe) | ✅ |
| `remember_me` | Login (L36) | ❌ NOT cleared in authService.logout() — only in Sidebar.jsx:411 (duplicate path) | ⚠ GAP |

**`remember_me` is cleared only in Sidebar's duplicate path (L411), NOT in `authService.logout()`.** If logout() is called from any context other than Sidebar (e.g., future programmatic logout), `remember_me` will persist.

### Category B — POS/Restaurant Settings Keys (NOT cleared on logout — intentional?)

These are stored by `StatusConfigPage.jsx` on save. They represent **device-level POS configuration**, not user-specific data. On shared POS hardware, the next employee logging in picks up the same restaurant settings — which is intentional.

| Key | What it stores | Should it be cleared on logout? |
|---|---|---|
| `mygenie_enabled_statuses` | Dashboard column status config | ❌ No — restaurant-level, shared intentionally |
| `station_view_config` | Station panel view config | ❌ No — restaurant-level |
| `mygenie_view_mode_table_order` | View mode preference | ❌ No — restaurant-level |
| `mygenie_view_mode_channel_status` | View mode preference | ❌ No — restaurant-level |
| `mygenie_default_pos_view` | Default view | ❌ No — restaurant-level |
| `mygenie_default_dashboard_view` | Default view | ❌ No — restaurant-level |
| `mygenie_order_taking_enabled` | Order taking toggle | ❌ No — restaurant-level |
| `mygenie_auto_settle_enabled` | Auto settle | ❌ No — restaurant-level |
| `mygenie_qsr_mode` | QSR mode | ❌ No — restaurant-level |
| `mygenie_qsr_discount` | QSR discount | ❌ No — restaurant-level |
| `mygenie_weight_prompt_enabled` | Weight prompt | ❌ No — restaurant-level |
| `mygenie_walkin_name_required` | Order entry pref | ❌ No — restaurant-level |
| `mygenie_walkin_phone_required` | Order entry pref | ❌ No — restaurant-level |
| `mygenie_dinein_name_required` | Order entry pref | ❌ No — restaurant-level |
| `mygenie_dinein_phone_required` | Order entry pref | ❌ No — restaurant-level |
| `mygenie_takeaway_name_required` | Order entry pref | ❌ No — restaurant-level |
| `mygenie_takeaway_phone_required` | Order entry pref | ❌ No — restaurant-level |
| `mygenie_stay_on_order_after_bill` | Order entry pref | ❌ No — restaurant-level |
| `mygenie_channel_max_columns` | Channel column count | ❌ No — restaurant-level |

**Verdict: Category B keys are correctly NOT cleared on logout.** They are device/restaurant-level preferences that should survive employee switches. No change needed.

### Category C — UI Preference Keys (NOT cleared — harmless)

| Key | What it stores | Should it be cleared? |
|---|---|---|
| `recipe_bulk_cols` | Inventory recipe bulk editor columns | ❌ No — UI pref, harmless |
| `credit_covered_expand` | Credit panel expand state | ❌ No — UI pref, harmless |
| `col_storage_key` (OrderLedger) | Report column visibility | ❌ No — UI pref, harmless |
| `SOCKET_DEBUG` | Socket debug flag (dev only) | ❌ No — dev tool, harmless |
| `STATION_DEBUG` | Station debug flag (dev only) | ❌ No — dev tool, harmless |
| `STATION_VIEW_STORAGE_KEY` (stationService) | Station view | ❌ No — UI pref |

### Category D — Session/Runtime Keys (cleared by sessionStorage.clear())

| Key | Where | Cleared? |
|---|---|---|
| `auth_redirect` | `axios.js:50` — signals intentional 401 redirect | ✅ Yes — `sessionStorage.clear()` in AuthContext + Sidebar |

---

## 4. Sequencing Analysis — CRITICAL (Owner's Core Question)

When `authService.logout()` makes the API call, the ORDER of operations matters deeply.

### Current sequence (synchronous):
```
1. localStorage.removeItem('auth_token')
2. clearCrmToken()
3. localStorage.removeItem('mygenie_channel_visibility')
4. conditionally removeItem('user_email')
→ AuthContext: sessionStorage.clear(), setToken/User/Permissions(null)
→ Sidebar: clearContexts(), navigate('/')
```

### Proposed sequences (after API call added):

**Option A — API call FIRST, then clear local ← OWNER APPROVED (Q-124-4 LOCKED)**
```
1. await api.post(LOGOUT)   ← if FAILS → show error toast, stay logged in (nothing cleared)
2. If SUCCEEDS → clear localStorage + sessionStorage
3. Clear React state (setToken/User/Permissions null)
4. navigate('/')
```
**This is the locked approach.** If the API fails, the user sees an error and remains logged in — both server-side token and local storage are preserved. They can try again.

~~Option B — Clear local FIRST, then API call~~ *(rejected)*

~~Option C — try/finally (always clear local)~~ *(rejected — owner chose Option A)*

---

## 5. Impact on `authService.logout()` Signature

The function is currently **synchronous**: `export const logout = () => { ... }`

Making it `async` (to await the API call) is a breaking change for callers.

**Callers of `authService.logout()` (direct):**
| Caller | Line | Current call style | Impact of async |
|---|---|---|---|
| `AuthContext.jsx:35` | `authService.logout()` | synchronous, no await | Must become `await authService.logout()` |

**Callers of `AuthContext.logout()` (indirect):**
| Caller | Line | Impact |
|---|---|---|
| `Sidebar.jsx:403` | `authLogout()` | AuthContext.logout must become async; Sidebar can fire-and-forget OR await. Recommend await + disable logout button during call. |

---

## 6. New Gaps Discovered (This Analysis)

### IMP-124-GAP-1 — `remember_me` Not Cleared in `authService.logout()`
`STORAGE_KEYS.REMEMBER_ME` (`remember_me`) is removed in `Sidebar.jsx:411` directly, but NOT in `authService.logout()`. If logout is ever called programmatically (not from Sidebar), `remember_me` persists.

**Recommendation:** Move `localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME)` into `authService.logout()` and remove the duplicate from `Sidebar.jsx:411`. Include in CR-124 scope.

### IMP-124-GAP-2 — `axios.js` 401 auto-logout misses `crm_token` and `channel_visibility`
`axios.js:44-45` removes only `auth_token` and `remember_me` on 401. Does NOT clear `crm_token` or `mygenie_channel_visibility`.

**Decision (owner locked 2026-07-31): IN SCOPE — fix as part of CR-124 extension.**

### IMP-124-GAP-3 — `Sidebar.jsx` has duplicate localStorage removes
`Sidebar.jsx:410-411` directly removes `auth_token` and `remember_me` AFTER calling `authLogout()` (which already removes them). This is dead code / defensive duplication.

**Decision: IN SCOPE — remove lines 410-411 from `Sidebar.jsx` as CR-124 cleanup.**

---

## 7. Revised Blast Radius (FINAL — all decisions locked 2026-07-31)

| File | Change | Reason | Scope |
|---|---|---|---|
| `src/api/constants.js` | Add `LOGOUT:` to `API_ENDPOINTS` | New endpoint constant | 1 line |
| `src/api/services/authService.js` | Make `logout()` async; `await api.post(LOGOUT)`; clear local only on success; add `removeItem(REMEMBER_ME)` | GAP-C1 + IMP-124-GAP-1 + Q-124-4 | ~8 lines |
| `src/contexts/AuthContext.jsx` | Make `logout` callback async; `await authService.logout()`; catch + show error toast; disable button during call | Q-124-3 + async chain | ~6 lines |
| `src/components/layout/Sidebar.jsx` | Remove duplicate `localStorage.removeItem` L410-411 | IMP-124-GAP-3 cleanup | −2 lines |
| `src/api/axios.js` | Add `clearCrmToken()` + `removeItem(CHANNEL_VISIBILITY)` to 401 auto-logout block | GAP-2 — IN SCOPE (owner locked) | ~2 lines |

**Files NOT touched:** `firebase.js`, `LoginPage.jsx`
**Estimated scope:** SMALL (~15 lines net across 5 files)
**Hotspot files:** NONE

---

## 8. Pending Questions Before Gate 3

| Q# | Question | Status |
|---|---|---|
| **Q-124-1** | Backend logout endpoint path | ✅ **LOCKED** — `POST /api/v2/vendoremployee/employee-logout`. Tested with fresh token, HTTP 200 `{"message":"success"}` confirmed on preprod 2026-07-31. |
| **Q-124-4** | Sequencing | ✅ **LOCKED** — API call first; local storage cleared only on success |
| **GAP-2** | Fix axios.js 401 cleanup in CR-124 or separate? | ✅ **LOCKED** — IN SCOPE as CR-124 extension |

---

## 9. Completeness Checklist

- [x] Art 1 — Intake
- [x] Art 2 — Impact Analysis (this doc)
- [ ] Art 3 — Implementation Plan (Gate 3) — blocked on Q-124-1 + Q-124-4
- [ ] Art 4 — Gate 4 GO
- [ ] Art 5 — Implementation + Self-Test
- [ ] Art 6 — QA Report
- [ ] Art 7 — Owner Smoke
