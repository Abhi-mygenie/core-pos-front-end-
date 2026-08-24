# BUG-130 — Impact Analysis (Gate 2) — **REVISION v2**

**ID:** BUG-130
**Title:** Channel Visibility — Restaurant Settings Channels Not Reflected in POS Dashboard
**Priority:** P1
**Risk:** **MEDIUM** (touches DashboardPage R5 hotspot, no financial logic, no socket/permission/auth-bypass)
**Sprint:** POS 5.0
**Date:** 2026-06-15 (v1) — **REVISED 2026-06-17 (v2)**
**Code Reality:** PARTIAL — CR-024 implemented the localStorage override, the gap is in the lifecycle of that override
**Conflict Pre-Check:** CLEAR — no other open item touches `authService.logout()`, `StatusConfigPage`, or `DashboardPage` channel logic this sprint

---

## 0. Revision Notice

> **v1 (2026-06-15)** assumed the root cause was **in-session staleness** of `RestaurantContext.features`, with the implicit assumption that *logout/login would refresh and fix it*.
>
> **v2 (2026-06-17)** — Owner reported that **logout + login does NOT fix the symptom**. v2 re-investigates with this new evidence + live preprod data probe (palmhouse account). v1's "Gap 2" is downgraded from root cause to secondary issue. A new primary root cause is identified.

---

## 1. Summary

Two layers of channel visibility exist:

1. **Restaurant-level (API)** — `dine_in`, `take_away`, `delivery`, `room` from `settings-list` / Profile. Determines whether the channel CAN appear.
2. **Local visibility (localStorage `mygenie_channel_visibility`)** — per-user override saved by StatusConfigPage. Determines whether the user has chosen to SEE that channel.

**Observed symptom (v2 corrected):** When the restaurant admin enables a previously-disabled channel via Restaurant Settings, the dashboard does NOT show the channel **even after logout and re-login**. The original IA's "Gap 1/Gap 2 (RestaurantContext stale until relogin)" cannot explain this — relogin re-fetches the Profile API, so `features` are fresh. A second mechanism must be preventing the channel from appearing.

---

## 2. Live API Evidence (palmhouse — owner@palmhouse.com)

Probed 2026-06-17, evidence at `/app/memory/evidence/BUG-130/`.

| Channel | Profile `restaurants[0]` | Settings-list `data.advanced` | Match |
|---|---|---|---|
| `dine_in` | `'Yes'` | `'Yes'` | ✅ |
| `take_away` | `false` | `false` | ✅ |
| `delivery` | `false` | `false` | ✅ |
| `room` | `'Yes'` | `'Yes'` | ✅ |

**Conclusion:** Backend is consistent between the two APIs. The issue is **not** a backend contract mismatch. The bug is fully on the frontend.

(v1's "Profile API stale" hypothesis is therefore eliminated — Profile and Settings-list agree.)

---

## 3. Data Flow Trace (verified against 16-june branch)

```
POST update-settings (RestaurantSettingsPage)
   ↓ (no client-side refresh of RestaurantContext.features)
   ↓ (relogin → fresh Profile fetch)
GET profile  →  restaurants[0].take_away: true   (was false)
   ↓
profileTransform.js:119-123  →  features.takeaway = true
   ↓
RestaurantContext.features  →  consumed by Dashboard + StatusConfigPage
   ↓
DashboardPage.jsx:725  channelData[…].enabled  = features.takeaway !== false   →  TRUE  ✅
DashboardPage.jsx:247  channelVisibility       = localStorage.getItem(...)    →  STALE
                       { enabled:true, channels:['dineIn','room'] }            (does NOT contain 'takeAway')
   ↓
DashboardPage.jsx:1652-1659
   if (!c.enabled) return false;                           // FALSE   (feature is on)
   if (hiddenChannels.includes(c.id)) return false;        // FALSE
   if (channelVisibility.enabled
       && !channelVisibility.channels.includes(c.id))      // TRUE    ← CHANNEL HIDDEN HERE
      return false;
   ↓
takeAway column NOT rendered.   Even after relogin.
```

### Why relogin doesn't help

`authService.logout()` (`/app/frontend/src/api/services/authService.js:49-57`) only clears:

- `STORAGE_KEYS.AUTH_TOKEN`
- CRM token (via `clearCrmToken()`)
- Optionally `USER_EMAIL` (kept if remember-me is on)

It does **NOT** clear `mygenie_channel_visibility`. The stale localStorage from a previous session persists across re-login and continues to filter the channel out.

---

## 4. Root Cause (REVISED)

### Primary (NEW — explains "relogin doesn't fix")
**RC-1 — Local channel-visibility override is not invalidated when API features change.**

`mygenie_channel_visibility` is a per-user override that was saved when a different set of channels was active. When the restaurant admin later toggles a channel in Restaurant Settings, the override is NOT reconciled. The override:

- ✗ is not cleared on logout
- ✗ is not cleared on a feature-flag change
- ✗ is not re-derived on app boot against the freshly-fetched `features`
- ✓ is only cleaned when the user *manually* re-visits StatusConfigPage **and** clicks Save (StatusConfigPage.jsx:497-501)

### Secondary (was v1's "Gap 2" — still real, but a different symptom)
**RC-2 — No in-session refresh of `RestaurantContext.features`.**

`RestaurantSettingsPage` saves new settings via `POST update-settings` but does not refresh `RestaurantContext.features`. The dashboard shows stale features **until** the user logs out and back in. This is the *in-session* freshness gap. After re-login it self-corrects — so RC-2 alone cannot reproduce the symptom the owner reported.

### Eliminated hypotheses
- ✗ Profile/Settings API mismatch (verified — they agree for palmhouse).
- ✗ Casing bug `takeAway` vs `takeaway` between StatusConfigPage and features. Confirmed both StatusConfigPage:151 and DashboardPage:860 read `features.takeaway` (lowercase). No casing mismatch.
- ✗ DashboardPage `enabled` flag stale (v1 Gap 3). With fresh `features` post-relogin, `enabled` is correct. Only the localStorage gate is wrong.

---

## 5. Affected Files

| # | File | Role | Issue | Touch needed? |
|---|------|------|-------|---|
| 1 | `api/services/authService.js:49-57` | Logout cleanup | Does NOT clear `mygenie_channel_visibility` | **YES — RC-1 fix** |
| 2 | `pages/DashboardPage.jsx:247-256` | Reads channelVisibility from localStorage on mount | No reconciliation against `features` | Maybe (depends on chosen fix strategy) |
| 3 | `pages/StatusConfigPage.jsx:230-239` | Reads channelVisibility on mount | No reconciliation against `features` on boot | Maybe |
| 4 | `pages/StatusConfigPage.jsx:496-502` | Cleans stale channel IDs **on save only** | Cleanup is reactive, not proactive | Possibly extend |
| 5 | `pages/RestaurantSettingsPage.jsx` | Saves settings | Does NOT refresh RestaurantContext.features (RC-2) | Only if owner wants in-session live update |
| 6 | `contexts/RestaurantContext.jsx` | Stores features | No public refresh action exposed (RC-2) | Only if RC-2 is in scope |

**R5 hotspot warning:** DashboardPage.jsx is an R5 file. Any touch must include regression coverage of `place order → settle → dashboard view` for each channel.

---

## 6. Fix Strategy Options (for Gate 3)

### Option A — Minimal (RC-1 only) ⭐ RECOMMENDED for risk

Clear `mygenie_channel_visibility` inside `authService.logout()`.

- **Pros:** 1-line change, fixes the relogin-doesn't-work symptom, no R5 touch, no architecture impact.
- **Cons:** Doesn't solve the in-session staleness (RC-2). Admin who changes settings then refreshes the page still sees stale channels until they explicitly logout+login.
- **Scope:** ~3 lines in 1 file.
- **Risk:** LOW.

### Option B — Reconcile on every boot

On DashboardPage mount, intersect `channelVisibility.channels` with `Object.keys(features).filter(enabled)`. Re-save the reconciled list.

- **Pros:** Self-heals every boot. Doesn't depend on logout discipline.
- **Cons:** Adds reconciliation logic in DashboardPage (R5). Subtle semantic decision: when the API enables a new channel that the user previously hid, should it appear by default? See **Decision Q-130-3**.
- **Scope:** ~15 lines, 1-2 files.
- **Risk:** MEDIUM (R5 file touched).

### Option C — Full fix (RC-1 + RC-2)

A + B + refresh `RestaurantContext.features` after `POST update-settings` succeeds.

- **Pros:** Live update without relogin. Complete fix.
- **Cons:** Largest scope. Touches context architecture. RC-2 was already deferred in v1 — picking it up now expands scope.
- **Scope:** ~30-50 lines across authService, DashboardPage, RestaurantContext, RestaurantSettingsPage.
- **Risk:** MEDIUM-HIGH.

---

## 7. Owner Decisions Needed (REVISED)

| # | Question | Options / Notes |
|---|----------|---|
| **Q-130-1** *(revised)* | Which fix scope: **A**, **B**, or **C**? | A fixes the reported symptom with minimum risk. C is the complete cure. |
| **Q-130-2** *(revised)* | After channel reconciliation (Option B/C), if the API newly enables a channel that the user had previously hidden via StatusConfigPage, should the dashboard **show it** (default visible) or **keep it hidden** (respect last user choice)? | Recommend "show it" — admin intent at restaurant level outranks per-user UI preference. |
| **Q-130-3** *(NEW)* | Should we also clear other related localStorage keys on logout (e.g., `mygenie_enabled_statuses`, `mygenie_view_mode_*`, hidden columns)? Currently only AUTH_TOKEN + CRM token are cleared. | Out-of-scope hardening — could be a separate CR. |
| **Q-130-4** *(NEW)* | Risk acceptance — Option B and C touch DashboardPage (R5). OK to proceed, or prefer Option A only? | A is safe-by-default. |

v1's Q-130-1 (re-fetch vs update-directly) and Q-130-2 (full reload vs React-level refresh) are **deprecated** — they only apply if Option C is chosen.

---

## 8. Scope & Verification Matrix (seed for Gate 3)

| # | File | Change | How to verify | Automated? |
|---|------|--------|---------------|:---:|
| 1 | `authService.js:49` | Add `localStorage.removeItem('mygenie_channel_visibility')` | Login → save channel hide for `takeAway` → logout → check localStorage → key gone | YES (unit) |
| 2 *(B/C only)* | `DashboardPage.jsx:~270` | Reconcile channels against fresh `features` on mount | Browser: API toggle take_away from preprod admin → relogin → take_away appears | NO (manual) |
| 3 *(C only)* | `RestaurantSettingsPage.jsx` | After save → refresh RestaurantContext | Browser: toggle take_away in settings → no refresh → channel appears within ~1s | NO (manual) |

---

## 9. Risks

| Risk | Level | Mitigation |
|------|-------|------------|
| Clearing localStorage on logout could surprise users who liked their hidden-channel preference | LOW | Per Q-130-2, admin intent outranks. Doc in release notes. |
| Touching DashboardPage (R5) (Option B/C) | MEDIUM | Full critical-path regression: place order → settle → report cycle |
| Refresh-after-save infinite loop if context refresh re-triggers settings page (Option C) | LOW | Use one-shot refresh, not subscribe |
| Race condition: localStorage cleared mid-session in another tab | LOW | Existing storage-event listener at DashboardPage:332 already handles cross-tab sync |

---

## 10. Planning Skip Eligibility

- Option A: **POSSIBLY** — 1 file, ~3 lines, NOT a hotspot, NOT financial. With owner approval, could go straight to Bug Fix.
- Option B/C: **NO** — R5 hotspot + multiple files → full Gate 3 plan required.

---

## 11. Owner Decisions — LOCKED (2026-06-17)

| # | Question | Owner Answer |
|---|----------|---|
| Q-130-1 | Scope | **Option A** — clear `mygenie_channel_visibility` on logout. RC-2 deferred. |
| Q-130-2 | Admin vs user pref when channel newly enabled | N/A for Option A (no boot reconciliation) — deferred with RC-2. |
| Q-130-3 | Clear other 17 `mygenie_*` keys on logout | **NO** — out of scope. Only `mygenie_channel_visibility` is reconciliation-broken; the rest are intentional per-device preferences. |
| Q-130-4 | Touch DashboardPage (R5) | **NO** — Option A does not touch R5 hotspots. |
| (extra) | Respect remember-me when clearing | **NO** — always clear `mygenie_channel_visibility` on logout regardless of remember-me. remember-me only governs email/credential prefill, not stale UI state. |

## 12. Final Scope Lock (Option A)

- **Files WILL change:** `frontend/src/api/constants.js`, `frontend/src/api/services/authService.js`
- **Files WILL NOT touch:** `DashboardPage.jsx`, `StatusConfigPage.jsx`, `RestaurantSettingsPage.jsx`, `RestaurantContext.jsx`, `profileTransform.js`
- **Risk:** LOW
- **Planning skip:** Eligible. Owner has the option to approve Fast Lane / Direct Bug Fix after reviewing the Implementation Plan.

## 13. Next Step

Implementation Plan written at `/app/memory/BUG_130_IMPLEMENTATION_PLAN.md`. Awaiting Gate 4 GO from owner.
