# QA Handover — CR-166: Franchise / CS Multi-Restaurant Login

**Date:** 2026-08-21
**Implementation agent:** IMPLEMENTATION role
**QA agent:** QA role (next session)
**Risk:** CRITICAL

---

## 1. Inherited from Plan — Verification Matrix

| Edit # | File | Change | Self-Test Result |
|--------|------|--------|:---:|
| E1a | `constants.js` | +4 CR-166 auth endpoints | ✅ grep COMMON_LOGIN → found at L157 |
| E1b | `constants.js` | +COMMON_TOKEN in STORAGE_KEYS | ✅ grep COMMON_TOKEN → found at L456 |
| E2a | `authTransform.js` | +loginType field in loginResponse | ✅ present at L22 |
| E2b | `authTransform.js` | +loginAsRestaurantResponse transform | ✅ present, maps api.restaurant_token → token |
| E3a | `authService.js` | login() branches on loginType | ✅ if/else block at L20-30 |
| E3b | `authService.js` | logout() clears COMMON_TOKEN + calls COMMON_LOGOUT | ✅ block added after api.post(LOGOUT) |
| E3c | `authService.js` | +getCommonToken / clearCommonToken helpers | ✅ exported at L126-130 |
| E4 | `commonAuthService.js` NEW | getAssignedRestaurants / loginAsRestaurant / commonLogout | ✅ file created, 3 functions exported |
| E5 | `LoginPage.jsx` | navigate branches on loginType | ✅ const authData = await login(...); navigate branch at L85-89 |
| E6 | `RestaurantPickerPage.jsx` NEW | Card grid, COMMON_TOKEN guard, search | ✅ file created, ~155 lines |
| E7a | `App.js` | +import RestaurantPickerPage | ✅ L92 |
| E7b | `App.js` | +/restaurant-picker route | ✅ L116, no ProtectedRoute |
| E8 | `AuthContext.jsx` | +clearCommonToken() in logout | ✅ L36 |
| E9a | `Sidebar.jsx` | +ArrowLeftRight import | ✅ L7 |
| E9b | `Sidebar.jsx` | +getCommonToken import | ✅ L15 |
| E9c | `Sidebar.jsx` | +Switch Restaurant button | ✅ L778, gated on getCommonToken() |

**Self-test: 16/16 edits verified. Compile: PASS (1 pre-existing warning, not CR-166).**

---

## 2. Test Cases

### TC-1 — CS admin login → picker redirect
**Account:** `saurav.menon@mygenie.online` / `Qplazm@10`
1. Go to `/` (login page)
2. Enter CS admin credentials → click LOG IN
3. **Expected:** Page navigates to `/restaurant-picker` (NOT `/loading`)
4. **Expected:** `localStorage.getItem('common_auth_token')` is set; `localStorage.getItem('auth_token')` is null

### TC-2 — Restaurant list renders (active only)
**Precondition:** TC-1 passed — on `/restaurant-picker`
1. Page loads
2. **Expected:** Restaurant cards visible (grid layout)
3. **Expected:** `data-testid="restaurant-picker-page"` present
4. **Expected:** No inactive restaurants visible (restaurant_status=0 filtered out)
5. **Expected:** Search bar visible (`data-testid="restaurant-picker-search"`)

### TC-3 — Search filters restaurants
1. On `/restaurant-picker`, type "Goa" in search bar
2. **Expected:** Only restaurants with "Goa" in name or address shown
3. Clear search
4. **Expected:** All restaurants shown again

### TC-4 — Select restaurant → POS boot
1. Click any restaurant card (`data-testid="restaurant-card-{id}"`)
2. **Expected:** Card shows loading spinner while selecting
3. **Expected:** Other cards become disabled
4. **Expected:** After selection: `localStorage.getItem('auth_token')` is set (restaurant_token)
5. **Expected:** Navigates to `/loading` → boots into `/dashboard`

### TC-5 — Token isolation after login-as
After TC-4 (now on dashboard):
1. Open browser DevTools → Application → localStorage
2. **Expected:** `auth_token` = restaurant-specific token
3. **Expected:** `common_auth_token` = still present (not cleared)
4. **Expected:** `crm_token` = set (from login-as response)

### TC-6 — Switch Restaurant button visible (admin session)
After TC-4 (on dashboard, admin session):
1. Look at sidebar bottom section
2. **Expected:** "Switch Restaurant" button visible (`data-testid="sidebar-switch-restaurant"`)
3. **Expected:** Blue color (`#3B82F6`)
4. **Expected:** `ArrowLeftRight` icon

### TC-7 — Switch Restaurant flow (no re-login)
1. Click "Switch Restaurant" in sidebar
2. **Expected:** Navigates to `/restaurant-picker`
3. **Expected:** Restaurant list loads immediately (COMMON_TOKEN still valid)
4. **Expected:** No login prompt

### TC-8 — Logout clears both tokens
On dashboard (admin session):
1. Click Logout in sidebar
2. **Expected:** Both `auth_token` AND `common_auth_token` removed from localStorage
3. **Expected:** `crm_token` removed
4. **Expected:** Redirected to `/`

### TC-9 — Normal employee login unaffected
**Account:** `owner@18march.com` / `Qplazm@10`
1. Login with regular owner credentials
2. **Expected:** Redirected to `/loading` (NOT `/restaurant-picker`)
3. **Expected:** `auth_token` set directly (no COMMON_TOKEN)
4. **Expected:** "Switch Restaurant" button absent from sidebar

### TC-10 — Guard: direct URL without COMMON_TOKEN
1. Clear all localStorage (`localStorage.clear()` in console)
2. Navigate directly to `/restaurant-picker`
3. **Expected:** Immediately redirected to `/` (login page)

---

## 3. Regression Tests

| # | Test | Why |
|---|---|---|
| R1 | Normal login → dashboard → place order → settle | E3a change to login() must not break employee token storage path |
| R2 | Normal employee logout → all tokens cleared | E3b logout() change must clear everything correctly |
| R3 | Sidebar layout — Profile + Logout still visible | E9c addition must not shift or hide Profile/Logout buttons |
| R4 | LoadingPage boot after login-as | AUTH_TOKEN set by loginAsRestaurant() must be read correctly by axios interceptor |
| R5 | ProtectedRoute on /dashboard | isAuthenticated must remain true after login-as flow |

---

## 4. Registry Sync Confirmation

```
Registry synced: YES
Item: CR-166
Status: IMPLEMENTED
Sprint: pos_5_0
EXIT GATE: 5/5 PASSED
  ✅ 1. Registry sync: CR-166 → IMPLEMENTED, pos_5_0
  ✅ 2. CR_REGISTRY.md: row added (IMPLEMENTED 2026-08-21)
  ✅ 3. FILE_OWNERSHIP.md: 9 file entries added (CR-166 2026-08-21)
  ✅ 4. Code markers: // CR-166 in all 9 modified/created files (verified via grep)
  ✅ 5. Compile: webpack compiled with 1 warning (pre-existing SettlementReportMockup — not CR-166)
```

---

## 5. Open Item (carry to QA)

| # | Item | Impact on QA |
|---|---|---|
| D3 | Logo CDN base URL | Cards show initials fallback — expected behaviour for now. Do NOT fail TC-2 on missing logos. |

---

## 6. Credentials + Environment

| Field | Value |
|---|---|
| CS admin | `saurav.menon@mygenie.online` / `Qplazm@10` |
| Regular owner | `owner@18march.com` / `Qplazm@10` (rid=478) |
| Preprod API | `https://preprod.mygenie.online` |
| Preview URL | Current pod preview URL (check `/app/frontend/.env`) |
| Frontend | webpack compiled, RUNNING |
