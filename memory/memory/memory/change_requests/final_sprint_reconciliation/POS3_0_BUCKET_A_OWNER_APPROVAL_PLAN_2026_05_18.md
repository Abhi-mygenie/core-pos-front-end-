# POS3.0 Bug Fix Bucket A — FE Quick Wins — Owner Approval Plan — 2026-05-18

## 1. Purpose

This document is created **before implementation** and requires **owner approval** before any code changes are made. It covers 4 bugs: BUG-102, BUG-089, BUG-103, BUG-100.

---

## 2. Repo / Commit

| Field | Value |
|---|---|
| Repo URL | `https://github.com/Abhi-mygenie/core-pos-front-end-.git` |
| Branch | `18-may-pos3.0` |
| Commit hash | `63a129e` |
| Working tree status | Clean |

---

## 3. Inputs Read

| Category | Files |
|---|---|
| **Final baseline docs (7)** | `FINAL_DOCS_APPROVAL_STATUS.md`, `ARCHITECTURE_DECISIONS_FINAL.md`, `MODULE_DECISIONS_FINAL.md`, `CHANGE_REQUEST_PLAYBOOK.md`, `IMPLEMENTATION_AGENT_RULES.md`, `OPEN_QUESTIONS_FINAL_RESOLUTION.md`, `BUSINESS_RULES_BASELINE_FINAL.md` |
| **Accepted overlay docs (6)** | `BASELINE_RECONCILIATION_REPORT_2026_05_04.md`, `FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md`, `PENDING_TASK_REGISTER_2026_05_04.md`, `PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md`, `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md`, `LAST_SPRINT_CODE_FIX_VALIDATION_2026_05_06.md` |
| **Primary planning doc** | `POS3_0_BUG_FIX_MASTER_IMPLEMENTATION_PLAN_2026_05_18.md` |
| **Planning addendum docs (2)** | `POS3_0_BUG_FIX_PLANNING_CLOSURE_ADDENDUM_2026_05_18.md`, `POS3_0_BUG_FIX_PLANNING_OWNER_BACKEND_QUESTION_CAPTURE_2026_05_18.md` |
| **Reference docs (6)** | `POS3_0_REQUIREMENT_SOURCE_FOR_INTAKE_2026_05_18.md`, `POS3_0_BUG_IMPACT_ANALYSIS.md`, `POS3_0_BUG_IMPACT_ANALYSIS_ADDENDUM.md`, `POS2_0_FINAL_IMPLEMENTATION_SUMMARY_2026_05_18.md`, `POS2_0_FINAL_QA_REGRESSION_REPORT_2026_05_18.md`, `POS2_0_QA_BUG_STATUS_MATRIX_2026_05_18.md` |
| **Code files inspected** | `OrderCard.jsx`, `DashboardPage.jsx`, `socketHandlers.js`, `socketEvents.js`, `useSocketEvents.js`, `orderService.js`, `index.css`, `CollectPaymentPanel.jsx`, `NotificationContext.jsx` |

---

## 4. Selected Scope Verification

| Item | Latest Planning Status | Allowed To Implement? | Notes |
|---|---|---|---|
| BUG-102 | `ready_for_implementation_planning` (P0) | Yes | No backend dep; owner-clarified: socket-response-driven + 2s fallback |
| BUG-089 | `ready_for_implementation_planning` (P1) | Yes | No backend dep; keep room-transfer path until BUG-088 |
| BUG-103 | `ready_for_implementation_planning` (P2) | Yes | CSS-only; no dependencies |
| BUG-100 | `ready_for_implementation_planning` (P1) | Yes | Audit + cleanup; no dependencies |

---

## 5. Bugs Proposed For Implementation

| Item | Plain English Issue | Proposed Fix | Files To Modify | Risk | Approval Status |
|---|---|---|---|---|---|
| BUG-102 | Mark Ready/Served button stays disabled for 8 seconds due to hardcoded `setTimeout`, locking entire card during peak hours | Replace 8s timeout with immediate reset after `await` completes + 2s fallback safety net | `OrderCard.jsx` | MEDIUM | `pending_owner_approval` |
| BUG-089 | Every item status change triggers a redundant `get-single-order-new` API call via legacy `update-food-status` handler, adding 200-500ms latency + double-render | Add dedup guard in `handleUpdateFoodStatus` to skip API call when order was recently processed by v2 `handleOrderDataEvent`; keep room-transfer path active | `socketHandlers.js` | LOW | `pending_owner_approval` |
| BUG-103 | Native browser ▲▼ spinners visible on 6 of 8 `type="number"` inputs in Collect Payment panel (inconsistent CSS) | Add one global CSS rule in `index.css` targeting all `input[type=number]` elements | `index.css` | LOW | `pending_owner_approval` |
| BUG-100 | Some actions generate duplicate notifications — local FE toast AND socket/FCM notification for the same event | Audit all toast sources, identify overlaps with FCM/socket coverage, remove duplicates, document gaps | Multiple (cross-cutting) | LOW | `pending_owner_approval` |

---

## 6. Per-Item Approval Details

---

### BUG-102 — Mark Ready/Served 8s Hardcoded Timeout

#### What is wrong in plain English
When a staff member clicks "Mark Ready" or "Mark Served" on a dashboard order card, the button becomes disabled for a fixed 8 seconds regardless of how fast the API responds (typically <1 second). The `isActionInProgress` flag cross-disables ALL action buttons on that card (Print KOT, Print Bill, Settle, Ready, Serve, Accept, Reject), freezing the entire card for 8 seconds during peak service.

#### What I will change
1. Replace the `setTimeout(() => set...(false), 8000)` in the `finally` block with immediate reset after the `await` completes. Since `await onMarkReady?.(order)` already waits for the API response, the `finally` block runs as soon as the API call resolves or rejects — making the button re-enable in ~100-500ms.
2. Add a 2-second safety-net timer started at click time: if the `await` hangs (network issue, unhandled promise), the timer forces a reset after 2s.
3. The same change applies to `handleMarkServedClick` and `handleAcceptClick` (all 3 handlers share the same pattern).
4. Preserve the `isActionInProgress` double-click guard — it still prevents rapid duplicate API calls during the short disabled window.

#### Files I expect to modify

| File | What will change | Why this file |
|---|---|---|
| `components/cards/OrderCard.jsx` L90-99, L102-111, L114-123 | Replace `setTimeout(..., 8000)` with direct reset + 2s fallback timer | These 3 handler functions contain the hardcoded 8s timeout |

#### Code area / function / component
- `handleMarkReadyClick` (L90-99)
- `handleMarkServedClick` (L102-111)
- `handleAcceptClick` (L114-123)

#### What I will NOT touch
- `DashboardPage.jsx` handler callbacks (`handleMarkReady`, `handleMarkServed`) — these are fine as-is; they call the API and return
- The `isActionInProgress` cross-disable logic (L87) — this remains for double-click protection
- Socket handler code (`socketHandlers.js`) — no changes needed
- The order-engage socket mechanism — independent and unaffected
- Print KOT, Print Bill, Settle button handlers — these use their own loading states

#### Business rule / owner decision protected
- DASH-001/002/003 — Hold orders on Hold tab only; status consistency preserved
- MC-02 — Realtime flows sync through socket (existing socket mechanism untouched)
- Owner directive: "~2s max fallback" honored

#### Risk
**MEDIUM** — OrderCard is a hot component, but the change is isolated to 3 `finally` blocks. The `isActionInProgress` guard still prevents double-clicks. The 2s fallback ensures recovery from edge cases.

#### QA check after implementation
1. Click "Mark Ready" → button re-enables within ~1s (API response time); verify no 8s delay
2. Click "Mark Served" → same fast re-enable
3. Click "Accept" (on scan/aggregator order) → same fast re-enable
4. Double-click prevention: rapid clicks do NOT fire duplicate API calls
5. Network delay simulation: if API takes >2s, button still re-enables at 2s fallback
6. Other buttons on same card (Print KOT, Settle) re-enable at the same time
7. Multiple cards: clicking Ready on Card A doesn't affect Card B

#### Approval needed

Owner approval required before implementation.

Options:
A. Approve this item for code-diff preview
B. Do not implement this item
C. Modify the approach
D. Need clarification first

---

### BUG-089 — Redundant API Call on `update-food-status`

#### What is wrong in plain English
Every item status change (ready, served, cancelled) fires two socket events: `update-item-status` (v2, carries full payload — no API call needed) and `update-food-status` (legacy, no payload — triggers a redundant `get-single-order-new` API call). The v2 event already updates the order in context. The legacy handler then fetches the same data again, adding 200-500ms latency and causing a double-render.

#### What I will change
Add a **dedup guard** inside `handleUpdateFoodStatus` that tracks which orderIds were recently processed by `handleOrderDataEvent` (the v2 handler). If the legacy handler fires for an orderId that was just updated via v2 within the last 5 seconds, skip the API call and return early. This preserves the room-transfer path (where `update-food-status` fires alone without a v2 counterpart) until BUG-088 lands.

Implementation: add a module-level `Map` (orderId → timestamp) in `socketHandlers.js`. `handleOrderDataEvent` writes to it; `handleUpdateFoodStatus` reads from it.

#### Files I expect to modify

| File | What will change | Why this file |
|---|---|---|
| `api/socket/socketHandlers.js` L229-325 (handleOrderDataEvent) | Add a line recording the orderId + timestamp in the dedup map | This is the v2 handler that processes payload events |
| `api/socket/socketHandlers.js` L344-401 (handleUpdateFoodStatus) | Add early-return guard checking the dedup map before calling `fetchOrderWithRetry` | This is the legacy handler with the redundant API call |

#### Code area / function / component
- `handleOrderDataEvent` (L229-325) — add 1 line to record orderId in dedup map
- `handleUpdateFoodStatus` (L344-401) — add early-return guard (~5 lines)
- New module-level `const recentPayloadUpdates = new Map()` at top of file

#### What I will NOT touch
- `socketEvents.js` — event definitions stay (UPDATE_FOOD_STATUS still wired)
- `useSocketEvents.js` — routing stays (still dispatches to handleUpdateFoodStatus)
- `orderService.js` — `fetchSingleOrderForSocket` stays (used by other handlers; deletion is BUG-095)
- `handleUpdateFoodStatus` room-transfer path — preserved (exits only for recently-v2-updated orders)
- Any handler deletion — that's BUG-095 (Bucket D), not this bug

#### Business rule / owner decision protected
- MC-02 (Architecture): Realtime flows sync through socket — preserved; we're optimizing, not removing
- Room transfer still works via the legacy handler (until BUG-088 ships)

#### Risk
**LOW** — The dedup guard is additive (early return). Worst case: if the guard fires incorrectly for a room transfer, the user sees a 5-second stale state before the next poll refresh. Mitigated by tight dedup window (5s) and room-transfer's separate event timing.

#### QA check after implementation
1. Kitchen marks item ready → order updates on dashboard within ~100ms (v2 only); NO `get-single-order-new` API call in Network tab
2. Kitchen marks item served → same; no redundant API call
3. Kitchen cancels item → same
4. Room transfer (if testable on current backend) → legacy handler STILL fires API call (not deduped, because no v2 event)
5. Rapid item status changes → no double-render

#### Approval needed

Owner approval required before implementation.

Options:
A. Approve this item for code-diff preview
B. Do not implement this item
C. Modify the approach
D. Need clarification first

---

### BUG-103 — Hide Native Number-Input Spinner Arrows

#### What is wrong in plain English
The "Cash Received" and 5 other `type="number"` inputs in the Collect Payment screen show native browser ▲▼ spinner buttons. Two inputs (Tip, Delivery charge) already have the CSS fix; 6 don't. This is an inconsistent styling issue.

#### What I will change
Add one global CSS rule in `index.css` that hides the native spinner on ALL `input[type=number]` elements application-wide. This is cleaner than adding per-input Tailwind classes to each of the 6 unfixed inputs.

```css
/* BUG-103: Hide native spinner arrows on all number inputs */
input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type=number] {
  -moz-appearance: textfield;
}
```

#### Files I expect to modify

| File | What will change | Why this file |
|---|---|---|
| `src/index.css` | Add 8-line global CSS rule at end of file | Global stylesheet; one rule covers all number inputs |

#### Code area / function / component
- End of `index.css` — new CSS block

#### What I will NOT touch
- `CollectPaymentPanel.jsx` — no code changes; the global CSS rule handles it
- Individual Tailwind classes on Tip/Delivery inputs — they become redundant but harmless

#### Business rule / owner decision protected
- None impacted — pure CSS presentation change

#### Risk
**LOW** — CSS-only; no behavioral impact. Number inputs still accept numeric keyboard input.

#### QA check after implementation
1. Collect Payment → Cash Received input → no ▲▼ spinner visible
2. Discount, Wallet, Compact discount, Compact wallet, Split payment inputs → no spinner
3. Tip, Delivery charge inputs → still no spinner (already fixed; global rule doesn't conflict)
4. Number inputs still accept typed numbers correctly
5. Chrome + Firefox + Safari verified

#### Approval needed

Owner approval required before implementation.

Options:
A. Approve this item for code-diff preview
B. Do not implement this item
C. Modify the approach
D. Need clarification first

---

### BUG-100 — Remove Duplicate Local Toast Notifications

#### What is wrong in plain English
Some user actions produce two visible notifications: a local FE toast (shown immediately after API call) AND a Firebase Cloud Messaging (FCM) push notification (arriving via the notification system) for the same event. The user sees the same "Order placed" or "Order transferred" message twice.

#### What I will change
1. **Audit phase:** Map every `toast()` call in the codebase against FCM/socket coverage. Produce a notification source map artifact (required by master plan).
2. **Removal phase:** For each toast that is confirmed to have socket/FCM coverage for the same event, remove or suppress the local toast.
3. **Document phase:** For actions where the local toast has NO socket/FCM coverage (i.e., the toast is the ONLY user feedback), keep the toast and document the gap for backend follow-up.

The audit will cover: `OrderCard.jsx` (KOT/Bill/Settle toasts), `TableCard.jsx` (KOT/Bill/Settle toasts), `OrderEntry.jsx` (action toasts), `DashboardPage.jsx` (action toasts), `CollectPaymentPanel.jsx` (payment toasts), `Sidebar.jsx` (refresh toast), and other files.

#### Files I expect to modify

| File | What will change | Why this file |
|---|---|---|
| Multiple component files | Remove/suppress specific `toast()` calls that duplicate FCM/socket events | Various components with action toasts |
| New artifact: notification source map | Document which events have toast + FCM/socket coverage | Master plan requirement §11 |

#### Code area / function / component
- Toast calls in action handlers across `OrderCard.jsx`, `TableCard.jsx`, `OrderEntry.jsx`, `DashboardPage.jsx`, `CollectPaymentPanel.jsx`, etc.
- `NotificationContext.jsx` — no structural change; BUG-034 dedup stays

#### What I will NOT touch
- `NotificationContext.jsx` core processing — BUG-034 dedup remains
- FCM/Firebase configuration — untouched
- Socket handler code — untouched
- Toast infrastructure (`use-toast.js`, Toaster component) — untouched
- Error toasts (e.g., "Failed to send KOT request") — these NEVER have FCM equivalents and must stay

#### Business rule / owner decision protected
- EP-03 (Architecture): Firebase is the canonical notification platform — preserved and reinforced
- Module 8: Notifications & Firebase — respected

#### Risk
**LOW** — Each toast removal is individually verifiable. Error toasts kept. Regression risk: if FCM is delayed, user may not get feedback for 1-2s. Mitigated by keeping toasts for actions without FCM coverage.

#### QA check after implementation
1. Per removed toast: perform the action, verify exactly ONE notification appears (FCM or socket banner, not both)
2. Per kept toast: verify the toast is the only feedback mechanism for that action
3. Error scenarios: verify error toasts ("Failed to...") still appear
4. FCM disabled scenario: verify critical action feedback still works (via socket)
5. Notification source map artifact produced

#### Approval needed

Owner approval required before implementation.

Options:
A. Approve this item for code-diff preview
B. Do not implement this item
C. Modify the approach
D. Need clarification first

---

## 7. Recommended Implementation Order

1. **BUG-102** (P0) — highest user impact; smallest change surface
2. **BUG-089** (P1) — pure socket optimization; decoupled from others
3. **BUG-103** (P2) — CSS-only, 1-minute fix
4. **BUG-100** (P1) — audit-heavy; produces an artifact alongside the implementation

---

## 8. Approval Summary

| Item | Approval Needed | Owner Decision |
|---|---|---|
| BUG-102 | Yes — approach for timeout replacement | `pending_owner_approval` |
| BUG-089 | Yes — dedup guard approach | `pending_owner_approval` |
| BUG-103 | Yes — global CSS rule approach | `pending_owner_approval` |
| BUG-100 | Yes — audit + selective removal approach | `pending_owner_approval` |

---

## 9. Final Status

`owner_approval_plan_created_pending_approval`

---

*— End of POS3.0 Bucket A Owner Approval Plan — 2026-05-18 —*
