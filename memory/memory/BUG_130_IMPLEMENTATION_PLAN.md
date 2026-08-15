# BUG-130 — Implementation Plan (Gate 3)

**ID:** BUG-130
**Title:** Channel Visibility — Restaurant Settings Channels Not Reflected in POS Dashboard
**Priority:** P1
**Risk:** **LOW**
**Sprint:** POS 5.0
**Date:** 2026-06-17
**Scope chosen:** Option A — clear `mygenie_channel_visibility` on logout (RC-1 only)
**Impact Analysis:** `/app/memory/BUG_130_IMPACT_ANALYSIS.md` (v2)
**Code Reality:** PARTIAL — CR-024 override exists, lifecycle gap on logout only

---

## 1. Goal

After a user logs out, `localStorage.mygenie_channel_visibility` must be cleared so the next session (same user OR different user) reads the freshly-fetched `RestaurantContext.features` without a stale per-user override blocking newly-enabled channels.

---

## 2. Scope Lock

- **Files WILL change (2):**
  1. `/app/frontend/src/api/constants.js` — add new key alias to `STORAGE_KEYS`
  2. `/app/frontend/src/api/services/authService.js` — clear the key inside `logout()`
- **Files WILL NOT touch:**
  - `DashboardPage.jsx` (R5 hotspot — no reconciliation logic added)
  - `StatusConfigPage.jsx`
  - `RestaurantSettingsPage.jsx`
  - `RestaurantContext.jsx`
  - `profileTransform.js`
  - Any of the other 16 `mygenie_*` localStorage keys
- **If scope expands** during implementation → STOP, request owner approval per R14.

---

## 3. Conflict Pre-Check

- `authService.js` last touched by BUG-098 (CRM token clear on logout) — no conflict with this change. Co-located change in same function is safe.
- `constants.js` `STORAGE_KEYS` block last touched at lines 314-318 — no other open item modifying it (verified against registry).
- No other open CR/BUG touches channel visibility this sprint.

---

## 4. Detailed Edits

### Edit 1: `frontend/src/api/constants.js`

**Current (lines 314-318):**
```js
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REMEMBER_ME: 'remember_me',
  USER_EMAIL: 'user_email',
};
```

**Change to:**
```js
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REMEMBER_ME: 'remember_me',
  USER_EMAIL: 'user_email',
  // BUG-130: Cleared on logout so a newly-enabled channel (via Restaurant
  // Settings) becomes visible on next login. See authService.logout().
  CHANNEL_VISIBILITY: 'mygenie_channel_visibility',
};
```

**Rationale:** Centralise the key string. The existing copy at `StatusConfigPage.jsx:25` (`CHANNEL_VISIBILITY_STORAGE_KEY`) and `DashboardPage.jsx:248,270,332` continue to use the literal `'mygenie_channel_visibility'` — out of scope to migrate them in this fix (would expand scope unnecessarily). The string value is identical, so both references read/write the same key.

---

### Edit 2: `frontend/src/api/services/authService.js`

**Current (lines 49-57):**
```js
export const logout = () => {
  localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  // BUG-098: Clear CRM token on logout
  clearCrmToken();
  // Keep remember me email if set
  if (!localStorage.getItem(STORAGE_KEYS.REMEMBER_ME)) {
    localStorage.removeItem(STORAGE_KEYS.USER_EMAIL);
  }
};
```

**Change to:**
```js
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

**Rationale:**
- One new line: `localStorage.removeItem(STORAGE_KEYS.CHANNEL_VISIBILITY);`
- Placed **before** the remember-me block to make it visually clear that channel visibility clearing is unconditional (per owner decision: always clear regardless of remember-me).
- Uses the `STORAGE_KEYS` constant from Edit 1 — keeps the literal string in one place.

**Total functional change:** 1 line added + 1 comment line. (Edit 1 adds 2 lines.) Grand total ≤ 5 changed lines across 2 files.

---

## 5. Verification Matrix (seed for Implementation agent self-test + QA)

| # | File | Edit | How to verify | Automated? |
|---|------|------|---------------|:---:|
| 1 | `constants.js` | New `CHANNEL_VISIBILITY` key in `STORAGE_KEYS` | Import `STORAGE_KEYS` in node REPL or unit test → `expect(STORAGE_KEYS.CHANNEL_VISIBILITY).toBe('mygenie_channel_visibility')` | **YES** (unit) |
| 2 | `authService.js` | `logout()` removes the key | Unit test: `localStorage.setItem('mygenie_channel_visibility', '{"a":1}')` → `logout()` → `expect(localStorage.getItem('mygenie_channel_visibility')).toBeNull()` | **YES** (unit) |
| 3 | `authService.js` | Clear runs regardless of remember-me | Unit test 2x: with `REMEMBER_ME=true` and without — both leave `CHANNEL_VISIBILITY` removed | **YES** (unit) |
| 4 | E2E | Symptom reproduced + fixed | (a) Login palmhouse, dineIn+room visible; (b) StatusConfigPage → enable override, hide `dineIn`, save; (c) verify dineIn hidden on Dashboard; (d) logout; (e) login again; (f) **expected:** dineIn visible again | **NO** (manual / screenshot) |
| 5 | E2E (forward-direction symptom) | Newly-enabled channel appears after relogin | (a) Backend admin: set `take_away=true`; (b) login on POS; (c) hide `takeAway` via StatusConfigPage override; (d) logout; (e) login again; (f) **expected:** `takeAway` visible (override is gone) | **NO** (manual) |
| 6 | Regression | Other localStorage keys untouched | Pre-logout snapshot the 17 other `mygenie_*` keys; logout; post-logout snapshot; **expected:** identical | **YES** (curl-style unit via jsdom) |
| 7 | Regression | `AUTH_TOKEN`, CRM token, `USER_EMAIL` (when no remember-me) still cleared | Existing BUG-098 unit test still passes | **YES** (existing) |
| 8 | Compile | webpack 0 new warnings | `tail -20 /var/log/supervisor/frontend.out.log` after edit | **YES** |

---

## 6. Execution Sequence

1. Edit 1 → save → wait for hot-reload compile → check log.
2. Edit 2 → save → wait for hot-reload compile → check log.
3. Run unit tests #1-3, #6, #7.
4. Open preview URL → execute manual test #4 then #5.
5. Take 2 screenshots for evidence: (a) post-step (c) showing channel hidden, (b) post-step (f) showing channel restored after relogin.
6. EXIT GATE checklist (Section 7).
7. Write QA handover.

---

## 7. Post-Code Registry Checklist (Implementation EXIT GATE — 5/5)

The Implementation agent MUST execute and tick all 5 before writing the QA handover:

- [ ] **REGISTRY SYNC:** `registry.json` — BUG-130 → status: `IMPLEMENTED — Option A (Clear channel visibility on logout)`, sprint_key: `pos_5_0`
- [ ] **BUG_TRACKER.md:** Row updated with IMPLEMENTED status + date + commit-style summary line
- [ ] **FILE_OWNERSHIP.md:** Add `frontend/src/api/services/authService.js` and `frontend/src/api/constants.js` under BUG-130 with date 2026-06-17
- [ ] **CODE MARKERS:** `// BUG-130:` comment present in both edited files (Edits 1 & 2 include them)
- [ ] **COMPILE CHECK:** webpack compiles, zero new warnings in `/var/log/supervisor/frontend.out.log` after edits

---

## 8. Risk Register

| Risk | Level | Mitigation |
|------|-------|------------|
| User loses a custom channel-hide preference on every logout | LOW (by design) | This is the intended outcome per owner decision Q-130-2. Document in release notes: "Channel visibility overrides reset on logout." |
| Hardcoded `'mygenie_channel_visibility'` literal in 4 other places drifts from the constant | LOW | Out of scope to migrate now. Both forms point to the same string. Add a follow-up CR (P3 hygiene) if desired. |
| Logout from a stuck/error state where `authService.logout()` is bypassed | LOW | Login flow does not re-set CHANNEL_VISIBILITY, so even if not cleared previously the next login does no harm beyond pre-fix behavior — and the next clean logout will fix it. |
| Cross-tab inconsistency mid-session | NONE | The existing `storage` event listener at `DashboardPage.jsx:332` already responds to cross-tab changes of this key. Removing the key triggers `e.newValue === null` → safe (parse falls back). |

---

## 9. Regression Test Plan (handed to QA)

**Scope:** This change touches `authService.logout()` — affects every logout path in the app. QA must cover:

1. **Primary fix (Tests #4-5 from Verification Matrix)** — both directions (newly hidden + newly enabled channel).
2. **Auth regression:**
   - Standard logout via Sidebar → re-login → user lands on dashboard normally.
   - Logout with remember-me ON → email pre-filled on login page (unchanged behavior).
   - Logout with remember-me OFF → email field empty (unchanged behavior).
   - 401 auto-logout flow (if applicable) — same behavior, just an extra key cleared.
3. **No collateral damage:**
   - All 17 other `mygenie_*` keys preserved after logout.
   - Sidebar pinning, enabled-statuses, view-mode locks survive logout (per design).
4. **Dashboard render:**
   - After fix, on fresh login with no prior override, channels match `features` (`dineIn` + `room` visible for palmhouse; `takeAway` + `delivery` hidden).
5. **StatusConfigPage flow:**
   - Visit StatusConfigPage post-login → `Override OFF` is the default (override toggle reads `enabled:false`) → channel list shows all API-enabled channels checked by default.

**Critical-path regression (not specific to this bug but mandated by touching authService):** login → place order → settle → reports → logout → login → dashboard.

---

## 10. Planning Skip / Fast Lane Eligibility

Per AGENT_PROMPT_ALPHA v0.7 Fast Lane criteria:

| Criterion | Status |
|---|---|
| Owner approval | **PENDING** — implicit in Option A choice but not explicit "FAST LANE APPROVED" |
| Single file ≤ 10 lines | **NO** — 2 files (constants.js + authService.js), but only ~5 lines total |
| No API/state/storage-schema/socket/registry change | **PARTIAL** — touches localStorage cleanup, not schema; touches no API or socket |
| Not a hotspot file (R5) | **PASS** |
| Not financial/order/report/auth-bypass | **PASS** (auth cleanup, not auth bypass) |
| No FILE_OWNERSHIP conflict | **PASS** |

**Recommendation:** Eligible for **Direct Bug Fix path** with owner approval (skip full Gate 4 dashboard ceremony). If owner says "Fast Lane approved" or "go ahead," the Implementation agent can execute Edits 1+2 → run tests → write QA handover in one session.

---

## 11. Final Response (Planning agent, per v0.7 format)

```
Planning complete: BUG-130
Stage: Implementation Plan (Gate 3)
Code reality: PARTIAL — CR-024 override exists; logout-lifecycle gap
Risk: LOW
Files WILL change: api/constants.js, api/services/authService.js
Files WILL NOT touch: DashboardPage.jsx (R5), StatusConfigPage.jsx, RestaurantSettingsPage.jsx, RestaurantContext.jsx, profileTransform.js
Owner decisions: ALL LOCKED (Q-130-1=A, Q-130-2=N/A, Q-130-3=NO, Q-130-4=NO, remember-me=always clear)
Docs: /app/memory/BUG_130_IMPACT_ANALYSIS.md (v2) + /app/memory/BUG_130_IMPLEMENTATION_PLAN.md
Next: Gate 4 GO from owner → Implementation (or Fast Lane / Direct Bug Fix on owner approval)
```
