# BUG-123 — Impact Analysis (Gate 2)

**ID:** BUG-123
**Title:** Place Order on 401 (auth expired) silently redirects — cashier mistakes failure for success
**Priority:** P1 (financial / operational integrity)
**Sprint:** POS 5.0
**Date:** 2026-06-15
**Code Reality:** NONE — no 401-aware guard exists on place-order path
**Conflict Pre-Check:** CLEAR — no other open item touches OrderEntry.jsx place-order path or axios.js interceptor

---

## 1. Summary

When a cashier hits Place Order with an expired/invalid auth token, the API returns 401 but the FE fires the request in **fire-and-forget** mode (no await). The UI unconditionally navigates to the dashboard after a socket timeout or 500ms delay. The 401 interceptor then bounces to login. Cashier perceives "order placed, then I got logged out" — but **no order was created**.

This causes: missed orders, lost revenue, settlement confusion.

## 2. Data Flow Trace

```
Cashier clicks Place Order
  → OrderEntry.jsx:1018: api.post(PLACE_ORDER, formData) — fire-and-forget (.then/.catch)
  → OrderEntry.jsx:1031: if (tableId) await waitForTableEngaged(10000) else await 500ms delay
  → OrderEntry.jsx:1043-1044: setIsPlacingOrder(false) + navigateAfterOrderAction() — UNCONDITIONAL
  → Meanwhile: 401 response arrives → axios.js:41 interceptor fires
    → Clears auth_token + remember_me from localStorage
    → window.location.href = '/' (full page reload)
  → Race result: cashier briefly sees dashboard, then bounces to login
  → Order was NEVER created on backend
```

**Same pattern exists in Update Order path** (OrderEntry.jsx:948-962) — but there it's partially guarded: `if (apiFailed) return;` after engage wait. However the `apiFailed` flag races with the socket wait.

## 3. Affected Files

| # | File | Lines | Current Behavior | Issue |
|---|------|-------|------------------|-------|
| 1 | `OrderEntry.jsx` | 1016-1045 | New Order: fire-and-forget POST + unconditional navigate | **PRIMARY** — navigate happens regardless of HTTP result |
| 2 | `OrderEntry.jsx` | 948-962 | Update Order: fire-and-forget PUT + `apiFailed` flag | **PARTIAL** — `apiFailed` races with socket wait |
| 3 | `api/axios.js` | 41-51 | 401 interceptor: clear token + `window.location.href = '/'` | Interceptor kills page state — no chance to show failure modal |
| 4 | `OrderEntry.jsx` | (Transfer Food) | Same fire-and-forget pattern | Secondary — same class of bug |

## 4. Downstream Consumers

- **DashboardPage.jsx** — receives navigation after place-order. Renders normally then gets killed by 401 redirect.
- **AuthContext / Login page** — receives the bounced user with no context about what happened.
- **Cart state** — lost on `window.location.href = '/'` (full reload). No sessionStorage preservation.
- **Kitchen / KOT** — never receives the order (backend rejected it).

## 5. Fix Options (from intake §7 — needs owner decision)

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| **A** | Await HTTP, dual-track with socket | Catches 401 before navigate | Adds latency if HTTP slow |
| **B** | Race HTTP-error-first with socket | Responsive, catches early failures | Complex race logic |
| **C** | Pre-flight auth check before POST | Eliminates race entirely | Extra API call, slower |
| **D** | Global auth-invalidated flag | Interceptor sets flag, navigate checks it | Requires flag propagation |

## 6. Risks

| Risk | Level | Mitigation |
|------|-------|------------|
| Touching OrderEntry.jsx (hotspot R5) | HIGH | CSS-only/guard-only changes; no financial logic change |
| Breaking existing fire-and-forget pattern | MEDIUM | Update Order already has `apiFailed` pattern — extend to New Order |
| Cart loss on 401 redirect | MEDIUM | Add sessionStorage cart preservation |
| Interceptor `window.location.href` kills React state | HIGH | Consider replacing with React-aware navigation or add delay |

## 7. Owner Decisions Needed

| # | Question | Options |
|---|----------|---------|
| Q-123-1 | **Failure UX:** Blocking modal vs destructive toast? | Modal recommended (force-acknowledge) |
| Q-123-2 | **Cart preservation:** Save to sessionStorage on 401? | Recommended — restore after re-login |
| Q-123-3 | **Scope:** Just Place Order, or also Update/Transfer/CollectBill? | Recommended: all fire-and-forget paths |
| Q-123-4 | **Fix approach:** Option A (await HTTP) vs Option D (global flag)? | A is simplest; D is most thorough |

## 8. Scope

- **Estimated:** 40-80 lines depending on option chosen
- **Hotspot files:** YES — `OrderEntry.jsx` (R5)
- **Financial logic:** INDIRECT — no calculation change, but operational integrity (missed orders = lost revenue)
- **Planning skip eligible:** NO — hotspot file + >20 lines + multiple decision points
- **Requires:** Full Planning gate cycle (Gate 3 Implementation Plan) after owner decisions
