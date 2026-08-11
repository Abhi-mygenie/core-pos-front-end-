# CR-008 #4 Phase A / Bucket D1 — "Stay on Order Entry After Collect Bill" — Implementation Summary

**Status:** SHIPPED 2026-05-03. Owner-approved end-to-end on preprod.
**Author:** Implementation Agent · session 2026-05-03.
**Source planning handover:** `/app/memory/change_requests/implementation_handover/CR_005_to_009_IMPLEMENTATION_HANDOVER.md` §10.D1.
**Parent CR:** `/app/memory/change_requests/CR_008_DELIVERY_AUDIT_DISPATCH_AND_NAVIGATION.md` §4.

---

## 1. Scope deviation from original CR-008 #4

### What original CR-008 #4 asked for
> A configurable **default landing screen** controlled in admin: "if dashboard is default screen or order page, that will be screen which will show on load and on action in place order / collect bill screen"
> — covering both **post-login routing** AND **post-action redirects** for Place / Update / Cancel / Merge / Transfer / Collect-Bill.

### What was actually implemented (Phase A scope as approved)
After multiple Owner clarifications during this session, the scope was deliberately **narrowed** to:
- ✅ A single admin toggle controlling **only the post-Collect-Bill / post-Place+Pay navigation behavior**.
- ✅ Default OFF → today's redirect-to-dashboard preserved verbatim.
- ✅ ON → cashier stays on OrderEntry in walk-in mode (fresh cart, ready for next order).
- ❌ **DROPPED:** Post-login default landing screen feature.
- ❌ **DROPPED:** Post-action redirect for any action other than Collect Bill / Place+Pay.
- ❌ **DROPPED:** Reports / Tables / Order Entry as separate landing options.

This deviation was explicitly documented at every gate and re-confirmed by Owner at "Approve D1-A" and "Apply D1-B + D1-C" gates.

---

## 2. Owner approvals received in this session

| Gate | Approved by | When |
|---|---|---|
| Discovery (Step 1) — read-only | Owner ("1 A, 2 a, 3 b, 4 a, 5 b") | 2026-05-03 |
| D1-A storage contract | Owner ("Approve D1-A") | 2026-05-03 |
| D1-B + D1-C bundled approval | Owner ("Apply D1-B + D1-C") | 2026-05-03 |
| Move toggle from Settings panel to Status Config UI Elements | Owner ("1 a, 2 a") | 2026-05-03 |
| Two-fix follow-up (Place+Pay branch + remount nonce) | Owner ("Approve") | 2026-05-03 |
| Final acceptance | Owner ("pass all") | 2026-05-03 |

---

## 3. Files changed (final)

| File | Change | LOC | Risk |
|---|---|---|---|
| **NEW** `frontend/src/utils/orderEntryPrefs.js` | Read/write helpers for `mygenie_stay_on_order_after_bill` | ~25 | 🟢 LOW |
| `frontend/src/pages/StatusConfigPage.jsx` | Import + state + hydration + reset + save + UI card in **UI Elements** section (next to Order Taking) | ~70 | 🟢 LOW |
| `frontend/src/components/order-entry/OrderEntry.jsx` | Optional `onCollectBillStayOnOrder` prop + branch at L1390 (Place+Pay) and L1509 (Collect-Bill on existing order) | ~12 | 🟡 MEDIUM (hotspot, but TWO surgical callsite branches; engage timing preserved verbatim) |
| `frontend/src/pages/DashboardPage.jsx` | `handleCollectBillStayOnOrder` callback + `orderEntryResetNonce` state + `key` prop on `<OrderEntry/>` for clean remount | ~12 | 🟢 LOW |

**Files NOT touched** (kept hotspot discipline):
- `LoginPage.jsx` · `LoadingPage.jsx` · `App.js` (no routing changes)
- `ProtectedRoute.jsx` (auth gates untouched)
- `CollectPaymentPanel.jsx` (the redirect lives in OrderEntry's `onPaymentComplete`, not in this component)
- 7 other `onClose()` callsites in `OrderEntry.jsx` (Place / Update / Cancel / Transfer / Merge / Shift)
- Settings panel (`ViewEditViews.jsx` was edited then fully reverted when toggle was relocated to Status Config)

---

## 4. Storage contract

| Property | Value |
|---|---|
| **Key** | `mygenie_stay_on_order_after_bill` |
| **Type** | `localStorage` string (`'true'` or `'false'`) |
| **Default** | `'false'` (preserves today's redirect-to-dashboard behavior) |
| **Fallback** | Strict comparison: `raw === 'true'`. Anything else (missing / `null` / typo / private-browsing exception) → `false`. |
| **Scope** | Browser-global. Not per-user, not per-restaurant. Matches `mygenie_default_pos_view` / `mygenie_view_mode_*` convention. |
| **Read site** | `frontend/src/components/order-entry/OrderEntry.jsx` — both Place+Pay (~L1395) and Collect-Bill (~L1505) success branches |
| **Write site** | `frontend/src/pages/StatusConfigPage.jsx` — page-level "Save Configuration" button (line ~424) |
| **Cross-tab sync** | Free — value is read fresh from localStorage on every Pay action; no listeners required. |

---

## 5. Route mapping (current behavior)

This bucket does NOT introduce any URL routing changes. There is no "landing screen route map" because the post-login routing scheme was dropped from scope.

For reference — current login & post-bootstrap routing (UNCHANGED):
| Trigger | Route |
|---|---|
| Login success | `/loading` (then → `/dashboard` via `LoadingPage.jsx:103`) |
| Hard-refresh of deep link | `/loading` with `state.returnTo`, then back to original URL |

---

## 6. Behavior matrix (final shipped)

| Setting | Action | Result |
|---|---|---|
| `'false'` (default) | Place+Pay (Scenario 2) succeeds | OrderEntry closes via `onClose()` → user lands on Dashboard. **Identical to today.** |
| `'false'` (default) | Collect Bill on existing order (Scenario 1) succeeds | OrderEntry closes via `onClose()` → Dashboard. **Identical to today.** |
| `'true'` | Place+Pay succeeds | OrderEntry **stays open**, **remounts** clean: cart empty, walk-in mode, no table selected, CollectPaymentPanel closed. |
| `'true'` | Collect Bill on existing order succeeds | OrderEntry **stays open**, **remounts** clean: cart empty, walk-in mode, no table selected, CollectPaymentPanel closed. |
| any | Place Order (without Pay) | Redirect to Dashboard (UNCHANGED — out of scope) |
| any | Cancel / Transfer / Merge / Shift / Update | Redirect to Dashboard (UNCHANGED — out of scope) |
| any | Bill payment fails | Toast + stays on payment panel as today (failure short-circuits before our branch at L1427). |
| any | Auto-print bill (settings.autoBill = ON) | Auto-print fires before our branch — identical timing to today. |

### Engage / socket / printing preserved verbatim
- `await engagePromise` at L1495 runs BEFORE the branch.
- Auto-print block at L1434-1488 runs BEFORE the branch.
- `if (billPaymentFailed) return;` at L1427 short-circuits BEFORE the branch.
- `placePromise` HTTP wait at L1383 (Place+Pay) runs BEFORE the branch.

---

## 7. Why the remount-via-`key` approach was needed

### Problem discovered during Owner verification
After the initial implementation, the Collect Bill case showed CollectPaymentPanel still visible after toggle-ON path executed. Root cause:

`OrderEntry.jsx` holds substantial **internal `useState`** that's NOT derived from props — including `showPaymentPanel`, `showSplitBillModal`, `customer`, `addresses`, `notes`, `tip`, and others. Setting `orderEntryTable=null` and `orderEntryType='walkIn'` from the parent caused a **re-render** but NOT a remount, so internal state persisted.

### Fix
Added `orderEntryResetNonce` integer state in DashboardPage and passed it as `key` prop on `<OrderEntry/>`. Bumping the nonce when `handleCollectBillStayOnOrder` fires forces React to **unmount + remount** OrderEntry, naturally resetting ALL internal state to constructor defaults — without touching any internal state setter inside OrderEntry. Smallest possible diff with maximum reset coverage.

This pattern is well-known in React (force-reset via `key`) and zero-risk semantically.

---

## 8. Manual validation checklist (all passed by Owner 2026-05-03)

### Persistence
- [x] Toggle visible at `/visibility/status-config` → UI Elements section, below Order Taking.
- [x] Click toggle → click "Save Configuration" → reload → toggle still ON.
- [x] DevTools → localStorage → `mygenie_stay_on_order_after_bill = 'true'`.
- [x] Toggle OFF → Save → reload → key reads `'false'`.
- [x] Manually delete key → reload → toggle reads OFF (silent fallback).

### Behavior — Toggle ON
- [x] **Place + Pay** in one step → OrderEntry stays open, walk-in mode, fresh cart, no table.
- [x] **Place Order separately, then Collect Bill on existing order** → OrderEntry stays open, walk-in mode, fresh cart, CollectPaymentPanel closed.
- [x] CollectPaymentPanel does NOT remain visible (remount fix verified).

### Behavior — Toggle OFF (regression)
- [x] Place + Pay → redirects to Dashboard (today's behavior).
- [x] Collect Bill on existing order → redirects to Dashboard (today's behavior).

### Out-of-scope actions
- [x] Cancel / Transfer / Merge / Shift / Place-without-Pay → redirect to Dashboard regardless of toggle (unchanged).

### Edge cases
- [x] Bill payment failure path: toast shows, stays on payment panel (no early redirect change).
- [x] Auto-print bill (when configured) fires before stay/redirect branch.
- [x] Multiple POS tabs: toggle change in tab #2 takes effect on tab #1's NEXT bill collection.

---

## 9. Risks / warnings

| Risk | Severity | Mitigation in place |
|---|---|---|
| `OrderEntry.jsx` is a hotspot. Wrong reset can leave stale state. | 🟡 MEDIUM | Reset done by **remount via `key`** — NOT by mutating internal state. Single integer nonce in parent. Backward-compatible: existing `onClose()` paths untouched. |
| `await engagePromise` timing critical for socket lock release. | 🟡 MEDIUM | Branch is AFTER the await on both code paths (L1395 and L1505). Timing preserved verbatim. |
| Auto-print bill must complete before navigation. | 🟢 LOW | Auto-print block runs ABOVE the branch on both paths. Unchanged. |
| Multiple tabs / browsers / devices. | 🟢 LOW | localStorage scoped to browser. Each device stores its own preference. Cross-tab sync is implicit (read fresh per Pay). |
| Toggle ON but `onCollectBillStayOnOrder` prop missing from parent. | 🟢 LOW | Optional chaining (`typeof === 'function'` check) — falls back to `onClose()` defensively. Parent always wires this from DashboardPage. |
| Future devs adding new internal state to OrderEntry forget to reset it on bill collection. | 🟢 LOW (covered) | The `key`-driven remount automatically resets ALL future internal state. No maintenance burden. |

---

## 10. What is NOT implemented (parked / out of scope)

| Item | Status | Reason |
|---|---|---|
| Post-login default-landing-screen feature (full CR-008 #4 scope) | 🅿️ PARKED | Scope dropped per Owner narrowing during planning. May be picked up as a separate CR if requested. |
| Backend persistence of the toggle (BE-F) | 🅿️ Phase B | Phase A is intentionally browser-local stub. |
| Post-action redirect for Place / Update / Cancel / Merge / Transfer / Shift | 🅿️ DROPPED | Scope explicitly narrowed by Owner to "only Collect Bill" path. |
| Per-user / per-role / per-restaurant preference scoping | 🅿️ DROPPED | Browser-global per Owner direction (matches every other `mygenie_*` key). |
| Toggle visibility role gate (admin-only) | 🅿️ DROPPED | Owner Q5=b — no role gate; matches existing settings pattern. |

---

## 11. Linked observations (logged during D1 verification, NOT caused by D1)

These were spotted by Owner during D1 verification but are **pre-existing behaviour confirmed across multiple builds (`1-may` and `18march`)**, unrelated to this CR. Logging here for traceability — not blocking D1.

| Observation | Description | Owner |
|---|---|---|
| **PAID tables linger on Table View** | When a prepaid order is placed, the dine-in table card stays in PAID state on Table View with no clear timer / auto-clear mechanism. Same on `18march` build. | Backend table-state lifecycle team |
| **PAID tables absent from Status View** | The Status View dashboard does not show PAID tiles by default. The "Paid" tile in `/visibility/status-config` is OFF by factory default. May or may not be intentional UX. | Product / Restaurant Ops |

Both are good candidates for future CRs but should be evaluated independently of this bucket.

---

## 12. CR-006 Phase B (B1) closure note (cross-reference)

This session also shipped **Bucket B1 (multi-select variations)** which closed CR-006. See `/app/memory/change_requests/implementation_handover/CR_BUCKET_B1_MULTISELECT_VARIATIONS_HANDOVER.md`. CR-008 #4 (this bucket) and CR-006 are independent.

---

## 13. Sign-off

- **Lint:** All edited files clean.
- **Compile:** Webpack compiled successfully on every iteration.
- **Owner sign-off:** "pass all" — 2026-05-03.
- **Closes:** CR-008 #4 Phase A (narrowed scope: Collect Bill / Place+Pay only).
- **Status:** **DONE.** Bucket parked from D1 to D2 (next sub-CR of CR-008).
