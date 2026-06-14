# CR-010 — Roles & Permissions Consolidation

**Status:** Drafted (planning only — NOT scheduled in current sprint)
**Author:** Implementation Agent
**Date:** 2026-05-02
**Sprint:** To be picked up after current sprint (CR-005..CR-009 + A0a / A0b standalone tickets) lands.
**Scope flag:** Roles & permissions discussion — UI + wire layer + transforms. **`stationService.js` is explicitly NOT in scope.**

---

## 0. Why this CR exists

The CR-005..CR-009 sprint surfaced a recurring confusion across the codebase: the term "role" carries at least three different meanings, and the frontend mixes them up.

This CR is a **discussion / inventory / decisions CR** — not an implementation CR. The goal is to land a frozen contract that every future code path can rely on, eliminating ad-hoc heuristics like the one removed by **A0b — ROLE-NAME-WIRE-FIX (May-2026)**.

Once decisions in §4 are made, a follow-up implementation CR (CR-011) can apply the agreed changes.

---

## 1. Background — three meanings of "role" in this codebase today

| Term | Source | Meaning | Example values |
|---|---|---|---|
| `user.roleName` (raw) | profile API top-level | The user's identity / display label | `"Owner"`, `"m"`, `"Captain"`, `"Saurav"` |
| `permissions[]` | profile API `role[]` field, exposed via `useAuth().permissions` | The user's access tier + feature flags | `["Manager", "food", "pos", "bill", ...]` |
| `permissions[0]` | first element of the above | The canonical role tier the backend gates on | `"Manager"` or `"Waiter"` |

A0b locked the wire contract that **every endpoint requiring `role_name` receives `permissions?.[0] || 'Manager'`**. Display surfaces (Sidebar, diagnostic logs) continue to render the raw `user.roleName`.

---

## 2. Inventory — every place "role" lives in the frontend (post-A0b)

### 2.1 Wire payloads (already canonical via A0b)

| File:Line | Endpoint | Wire field | Source |
|---|---|---|---|
| `pages/LoadingPage.jsx:316` | `GET /running-orders` | `role_name` (query) | `data.profile?.permissions?.[0] \|\| 'Manager'` |
| `hooks/useRefreshAllData.js:42` | `GET /running-orders` | `role_name` (query) | `permissions?.[0] \|\| 'Manager'` |
| `pages/DashboardPage.jsx:1109` | `PUT /order-confirm` | `role_name` (body) | `permissions?.[0] \|\| 'Manager'` |
| `pages/DashboardPage.jsx:1130` | `PUT /order-status-update` (cancel) | `role_name` (body, via `orderToAPI.cancelOrder`) | `permissions?.[0] \|\| 'Manager'` |
| `pages/DashboardPage.jsx:1243` | `PUT /order-status-update` (ready) | `role_name` (body) | `permissions?.[0] \|\| 'Manager'` |
| `pages/DashboardPage.jsx:1265` | `PUT /order-status-update` (serve) | `role_name` (body) | `permissions?.[0] \|\| 'Manager'` |
| `components/order-entry/OrderEntry.jsx:923` | `PUT /order-status-update` (cancel) | `role_name` (body, via `orderToAPI.cancelOrder`) | `permissions?.[0] \|\| 'Manager'` |

### 2.2 Display reads of raw `roleName` (intentionally unchanged by A0b)

| File:Line | Surface | Purpose |
|---|---|---|
| `Sidebar.jsx` (TBD line) | Sidebar user block | Display label `"Owner (Owner)"` |
| `pages/LoadingPage.jsx` (diagnostic logs) | Browser console | Debugging only |
| `pages/DashboardPage.jsx` (diagnostic logs) | Browser console | Debugging only |
| `pages/AllOrdersReportPage.jsx` (diagnostic logs) | Browser console | Debugging only |

### 2.3 Other "role"-shaped surfaces flagged for review

| File:Line | Note |
|---|---|
| `contexts/OrderContext.jsx:36` | `refreshOrders(roleName = 'Manager')` — hardcoded default. Only one caller (`OrderEntry.jsx:1950` invokes without args). Not on the wire today; stays consistent because the default already matches A0b's canonical value. **Decision: leave or align?** |
| `transforms/profileTransform.js` | The transform that converts profile API → frontend objects. Where the raw `role[]` array becomes `permissions[]`. **Verify this is the only normalisation point.** |

---

## 3. Permissions array semantics

The `permissions[]` array (sourced from raw API `role[]`) is currently used in two distinct ways:

1. **`permissions[0]` → canonical role tier on the wire** (Manager / Waiter / etc.). A0b locked this.
2. **`permissions.includes('food')`, `permissions.includes('pos')`, etc. → feature-flag gates** via the `useAuth().hasPermission(flag)` helper.

**Implicit assumption:** the backend always puts the role tier as the FIRST element and the feature flags as the rest. This is undocumented. If the backend ever returns the array unsorted or with the role tier in a different position, the wire value flips silently.

**Decision needed:** ratify this contract with backend or introduce an explicit `roleTier` field.

---

## 4. Open questions / decisions register

| ID | Question | Owner | Default proposal |
|---|---|---|---|
| Q-RP-01 | Is `permissions[0]` guaranteed to be the role tier across all restaurants and all user types (Owner / Manager / Waiter / Captain / Cashier / etc.)? | Backend / API | **Verify** by sampling profile responses for ≥5 distinct user types. If position is not guaranteed, add a dedicated `roleTier` field on the API. |
| Q-RP-02 | Is the wire value `'Manager'` an acceptable canonical role for ALL non-Waiter logins on the 4 mutation endpoints? Specifically — are there backend-side rules that gate behaviour by tier (e.g. some action only allowed for `'Manager'`+ but not `'Captain'`)? | Backend | Treat `'Manager'` as the canonical "manager-or-above" tier. Document what the backend actually enforces. |
| Q-RP-03 | Should `OrderContext.refreshOrders(roleName = 'Manager')` default be replaced with `permissions?.[0] || 'Manager'` from `useAuth()`? | Tech | **Yes, align.** Removes another hardcoded constant. Minor risk because only one caller invokes without args. |
| Q-RP-04 | Should the user-display field on the frontend be renamed `displayRole` (or similar) to make the role-vs-display split explicit? | Tech / UX | Keep `roleName` for display (no breaking change), but document the convention: `roleName` = display label, `permissions[0]` = role tier. |
| Q-RP-05 | Are there preprod test accounts for ALL user types (especially `Waiter` and `Captain`) so we can verify the wire contract on each tier without simulating? | QA | **Provision** at minimum one test account per user type in preprod. Document credentials in `/app/memory/test_credentials.md`. |
| Q-RP-06 | Should `hasPermission(flag)` be replaced with named helpers (`canCancelOrder()`, `canMarkServed()`, etc.) that codify the actual permission strings centrally? | Tech | Optional; defer unless the existing flag strings get duplicated across more files. |
| Q-RP-07 | If the backend ever ships per-restaurant role overrides (e.g. one restaurant's "Manager" is another's "Cashier"), how does the frontend pick up that nuance? | Product / Backend | Out-of-scope today; flag for future. |
| Q-RP-08 | Diagnostic logs currently print raw `roleName` — is that PII-safe (some restaurants put real first-names there: `'Saurav'`)? | Security / Compliance | **Yes, audit.** If real names are routinely landing in console logs, gate behind a debug flag in production builds. |
| Q-RP-09 | The frontend never calls `/auth/refresh` — how are stale `permissions` updated mid-session if a manager promotes a waiter? | Backend / Tech | Today: requires re-login. Document this; consider a `permissions-changed` socket event. |

---

## 5. Implementation buckets (for CR-011, the follow-up)

These are tentative — none are scoped today, all depend on §4 decisions.

| ID | Title | Risk |
|---|---|---|
| RP-A | Confirm `permissions[0]` contract with backend; add a smoke check in `useAuth()` that warns if the array is empty post-login. | Low |
| RP-B | Align `OrderContext.refreshOrders` default per Q-RP-03. | Low |
| RP-C | Provision Waiter / Captain / Cashier test accounts in preprod and add to `test_credentials.md`. | None (ops) |
| RP-D | Add a `console.warn` once-per-session if `permissions` is empty for a logged-in user (early signal of broken login). | Low |
| RP-E | Audit raw-`roleName` console logs per Q-RP-08; gate behind debug flag if real names are surfacing. | Low |
| RP-F | Future: introduce explicit `roleTier` field on profile API per Q-RP-01 (if needed). | High (backend contract change) |

---

## 6. Cross-references

- **A0b — ROLE-NAME-WIRE-FIX (May-2026)** (already shipped) — `/app/memory/ROLE_NAME_WIRE_FIX_HANDOVER.md` and `/app/memory/change_requests/implementation_handover/CR_BUCKET_A0b_ROLE_NAME_WIRE_FIX_HANDOVER.md`. A0b's verification plan is the smallest QA proof that the wire contract is now uniform across the 4 mutation endpoints.
- **CR-005 §10 user-attribution** — also touches role-shaped fields (`waiter_name`, POS confirmer name) but at the **report-display** layer, not the wire layer. Separate concern; do not conflate.
- **`OPEN_QUESTIONS_FINAL_RESOLUTION.md`** baseline — this CR adds new decisions; on land it must update the baseline doc.

---

## 7. Out of scope (frozen by this CR's scope flag)

- Anything inside `frontend/src/api/services/stationService.js` — explicitly excluded by owner instruction (May-2026).
- Backend-side role-tier rules — backend agent's responsibility.
- Auth flow / login UX / session refresh — separate ticket.
- The 14 edits A0b already shipped — those are the implementation, not the discussion.

---

## 8. Sign-off

This CR is **discussion-only** until §4 decisions are made. Implementation agents must NOT start coding any RP-A..RP-F bucket from §5 until the decisions are ratified.

*End of CR-010 draft.*
