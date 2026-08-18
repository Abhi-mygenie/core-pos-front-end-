# CR-166 — Customer Service / Franchise Multi-Restaurant Login (Common Login + Restaurant Picker)

**Type:** Change Request (New Feature — Auth Flow)
**ID:** CR-166
**Date:** 2026-08-17
**Status:** INTAKE COMPLETE — awaiting Gate 2 (Planning)

---

## Description

Customer service agents and franchise operators need a **single login** that can access multiple assigned restaurants, then switch into any one of them. Currently the POS only supports single-restaurant login (`/api/v1/auth/vendoremployee/login`).

The new flow:
1. **Common Login** — user logs in with their CS/franchise credentials → gets a common token
2. **Restaurant List** — fetch list of restaurants assigned to this account → show a **Restaurant Picker** screen
3. **Login As Restaurant** — user clicks a restaurant → get a restaurant-specific token → proceed into that restaurant's POS (LoadingPage → Dashboard)

This is a completely new authentication flow requiring new pages, new service functions, new API constants, and modifications to the existing login routing.

## API Contract (Owner-Provided — 3 Endpoints)

### Step 1 — Common Login
```
POST https://preprod.mygenie.online/api/v1/auth/vendoremployee/common-login
Content-Type: application/json

Body: { "email": "...", "password": "..." }
Response: { token: "..." }   ← common token (not restaurant-specific)
```

### Step 2 — Get Assigned Restaurants
```
GET https://preprod.mygenie.online/api/v1/auth/adminemployee/assigned-restaurants
Authorization: Bearer <common-token>

Response: [ { restaurant_id, name, ... }, ... ]   ← list of accessible restaurants
```

### Step 3 — Login As Restaurant
```
POST https://preprod.mygenie.online/api/v1/auth/adminemployee/login-as-restaurant
Authorization: Bearer <common-token>
Content-Type: application/json

Body: { "restaurant_id": 69 }
Response: { token: "..." }   ← restaurant-specific token (used for all subsequent API calls)
```

## Classification

| Field | Value |
|---|---|
| Type | CR |
| Area | Auth → Login → New: Common Login + Restaurant Picker |
| Priority | P1 |
| Severity | HIGH — customer service and franchise operators cannot access multiple restaurants from one login |
| Risk | **CRITICAL** (auth flow — token management, session handling, permission model for multi-restaurant context) |
| Fast Lane | NO — new auth flow; full gate process + integration_playbook_expert_v2 MANDATORY before Gate 4 |

## Evidence

- Source: OWNER-REPORTED
- API contract: 3 endpoints provided (see above)
- Current state: only single-restaurant login exists at `LoginPage.jsx` → `authService.login()`
- Confidence: CONFIRMED (endpoints provided)

## Code Reality

```bash
# Existing single-restaurant login:
  api/constants.js line 8: LOGIN: '/api/v1/auth/vendoremployee/login'  ← exists
  api/services/authService.js: login() function → stores token, CRM token, permissions
  pages/LoginPage.jsx: single login form → navigates to /loading

# New endpoints — ABSENT:
  COMMON_LOGIN:            MISSING ❌
  ASSIGNED_RESTAURANTS:    MISSING ❌
  LOGIN_AS_RESTAURANT:     MISSING ❌

# Restaurant Picker screen: NONE ❌
# Routing for multi-restaurant flow: NONE ❌
# Token management for common vs restaurant-specific: NONE ❌
```

- **Code reality: NONE** — entirely new auth flow, no partial implementation

## Blast Radius

**New files:**
- `pages/RestaurantPickerPage.jsx` — list of assigned restaurants (picker screen)
- `api/services/commonAuthService.js` — commonLogin(), getAssignedRestaurants(), loginAsRestaurant()

**Modified files:**
- `api/constants.js` — add 3 new auth endpoints
- `pages/LoginPage.jsx` — detect common-login response and branch to Restaurant Picker instead of `/loading`
- `App.js` — add `/restaurant-picker` route
- `contexts/AuthContext.jsx` — handle 2-token lifecycle (common token + restaurant token)

- Estimated scope: LARGE (5-6 files, ~150-200 lines new code)

## Expected Behavior

1. User enters email + password on `LoginPage.jsx`
2. If response is a "common token" (multi-restaurant user) → navigate to `/restaurant-picker`
3. `RestaurantPickerPage` shows a list of assigned restaurants (name, logo, last accessed?)
4. User clicks a restaurant → `loginAsRestaurant(restaurantId)` → restaurant-specific token
5. Store restaurant-specific token (same `STORAGE_KEYS.AUTH_TOKEN` used everywhere)
6. Navigate to `/loading` (existing LoadingPage) → normal app boot

**Key constraint:** After `loginAsRestaurant`, all subsequent API calls must use the restaurant-specific token, not the common token.

## Owner Decisions — DEFERRED TO GATE 2

| # | Question | Deferred To |
|---|----------|-------------|
| OQ-1 | How does the frontend know the login response is "common" vs "single-restaurant"? (Does `common-login` return a different response shape, or a flag like `is_multi_restaurant: true`?) | Gate 2 |
| OQ-2 | Should the common token be stored separately (e.g. `common_auth_token`) from the restaurant token (`auth_token`)? | Gate 2 |
| OQ-3 | After logging into a restaurant, can the user switch back to the restaurant picker without re-entering credentials? (Session persistence for common token) | Gate 2 |
| OQ-4 | What is the response shape of `GET /assigned-restaurants`? (Fields per restaurant: id, name, logo, address?) | Gate 2 |
| OQ-5 | What does `POST /login-as-restaurant` return beyond a token? (Full auth response like regular login, or token only?) | Gate 2 |

**Intake Status: COMPLETE — all decisions deferred to Gate 2**

## Important Implementation Note

⚠️ **Auth Rule — MANDATORY:** This CR touches login and token management.
`integration_playbook_expert_v2` **MUST** be called before Gate 4 (Implementation).
This is non-negotiable per system rules for any auth-related change.

## Duplicate Check

DISTINCT — no prior CR for common login or restaurant picker flow.
RELATED to `restaurant_type_flag` (franchise/master) — different feature; that gates UI elements, this gates login itself.

---

**Backend:** All 3 endpoints confirmed and ready
**Frontend:** Code reality NONE — complete new flow
**Next:** Planning Gate 2 (after owner answers OQ-1 through OQ-5)
