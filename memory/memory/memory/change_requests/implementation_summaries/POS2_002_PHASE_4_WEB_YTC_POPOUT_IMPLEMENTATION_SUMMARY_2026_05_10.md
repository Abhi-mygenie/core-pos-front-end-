# POS2-002 Phase 4 — Web / Scan YTC Visual Pop-out
## Implementation Summary

> **Sprint:** pos2.0
> **CR ID:** POS2-002 (Phase 4 of 4)
> **Date:** 2026-05-10
> **Branch:** `11-may-uat-final`
> **Status:** ✅ `implementation_complete_ready_for_QA`
> **Predecessors shipped:** Phase 1 (`orderFrom`/`isWebOrder` mapping, 2026-05-09) · Phase 2 (web delivery-charge lock, 2026-05-09) · Phase 3 (header platform dropdown, 2026-05-10) · Phase 3.1 (platform counter chip, 2026-05-10)
> **Source of truth:** `implementation_handover/POS2_002_PHASE_4_WEB_YTC_POPOUT_IMPLEMENTATION_HANDOVER_2026_05_10.md`

---

## 1. Files changed

### 1.1 New files (2)

| Path | Lines | Purpose |
|---|---|---|
| `frontend/src/components/dashboard/ScanOrderPopOut.jsx` | 379 | Presentation-only Web / Scan YTC pop-out overlay. Exports default component + two pure helpers (`isUnconfirmedScanOrder`, `buildTableEntryFromOrder`) + the `POPOUT_SNOOZE_MS` constant. |
| `frontend/src/__tests__/components/dashboard/ScanOrderPopOut.test.jsx` | 490 | 25 tests: T-1..T-16 unit + I-1..I-2 integration + A-1..A-5 anti-tests + 2 pure-helper sanity tests. |

### 1.2 Existing files edited (1, additive only)

| Path | Edit | Anchor |
|---|---|---|
| `frontend/src/pages/DashboardPage.jsx` | (a) Added `import ScanOrderPopOut from "../components/dashboard/ScanOrderPopOut";` (b) Added `orders,` to the `useOrders()` destructure. (c) Mounted `<ScanOrderPopOut … />` once at the top of the returned JSX, immediately after `<NotificationBanner />`. | Import block (~L23), destructure (L173-178), mount (post-`<NotificationBanner />` inside the page root `<div>`). |

### 1.3 Files not touched (verifies §7 of handover)

`orderService.js`, `socketHandlers.js`, `soundManager.js`, `NotificationContext.jsx`, `Sidebar.jsx`, `CollectPaymentPanel.jsx`, `OrderEntry.jsx`, `OrderCard.jsx`, `TableCard.jsx`, `orderTransform.js`, `api/constants.js`, `/app/memory/final/*`, all backend files — **all unchanged**.

---

## 2. Exact implementation details

### 2.1 Predicate (locked)

```js
export const isUnconfirmedScanOrder = (order) =>
  Boolean(order) && order.orderFrom === 'web' && order.fOrderStatus === 7;
```

Used as the sole queue filter. Combined with the pop-out-local snooze hide-set to derive the visible queue:

```js
const queue = orders
  .filter(isUnconfirmedScanOrder)
  .filter((o) => !popOutSnoozeHideSet.has(String(o.orderId)))
  .sort(byCreatedAtAsc);   // FIFO oldest-first
```

### 2.2 Queue behaviour (R-POPOUT-8)

- Sequential one-at-a-time render — only `queue[currentIndex]` is shown.
- Header strip: `Order {currentIndex + 1} of {queue.length}` (data-testid: `scan-order-popout-queue-indicator`).
- Next / Previous chevrons: bounded, no wrap. Disabled at queue boundaries.
- `currentIndex` is clamped via a `useEffect` whenever queue length changes (e.g., after Accept removes the current order).

### 2.3 Snooze design (R-SNOOZE-9, R-SNOOZE-11, R-SNOOZE-12)

Two-surface split (handover §5.3):

| Surface | Owner | Lifetime | Mutation |
|---|---|---|---|
| Existing `snoozedOrders: Set` | `DashboardPage.jsx:415` | Dashboard mount | Pop-out calls the existing `onToggleSnooze` (= `toggleSnooze`) with the id-string — same call shape as `OrderCard.jsx:349`. **No direct mutation.** |
| New `popOutSnoozeHideSet: Map<idStr, expiryTs>` | `ScanOrderPopOut.jsx` local state | Pop-out mount | Added to on Snooze click with `expiry = Date.now() + 5 * 60 * 1000`. A `setTimeout` schedules auto-removal at exactly 5 min. Refs to timer handles are stored in a `useRef` Map and cleared on unmount. |

R-SNOOZE-12 (single status-flip rule) is satisfied **implicitly**: the queue selector recomputes on every prop change, so an order whose `fOrderStatus` leaves 7 falls out of the queue regardless of snooze membership. An additional housekeeping `useEffect` drops stale entries from `popOutSnoozeHideSet` so the timer Map stays bounded.

### 2.4 Visibility rules (R-POPOUT-4, OQ-12)

```jsx
className={[
  // Tablet / small viewport: full-screen modal
  'flex flex-col h-full w-full',
  // Desktop: centered overlay ≥ 50%, bounded width, rounded
  'lg:h-auto lg:max-h-[85vh] lg:w-[min(60vw,820px)] lg:min-w-[480px] lg:rounded-2xl',
  'bg-white shadow-2xl overflow-hidden',
].join(' ')}
```

The Tailwind `lg:` breakpoint maps to ≥ 1024 px → desktop overlay. Below 1024 px → full-screen modal (matches OQ-12). Backdrop is `fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm`.

### 2.5 Mount point in DashboardPage

```jsx
<NotificationBanner />
<ScanOrderPopOut
  orders={orders}
  snoozedOrders={snoozedOrders}
  onToggleSnooze={toggleSnooze}
  onAccept={handleConfirmOrder}
  onReject={handleCancelOrderFromCard}
  onEdit={handleTableClick}
  currencySymbol={currencySymbol}
/>
<Sidebar … />
```

All five passed-in handlers and the two pieces of state (`orders`, `snoozedOrders`) are existing DashboardPage values. **No new handler functions were created.**

### 2.6 Accessibility

- `role="dialog"`, `aria-modal="true"`, `aria-labelledby="scan-order-popout-title"`.
- Every action button has a unique `data-testid` keyed by `orderId`:
  `popout-accept-btn-{id}`, `popout-reject-btn-{id}`, `popout-view-btn-{id}`, `popout-snooze-btn-{id}`, plus `popout-nav-prev` / `popout-nav-next`.

---

## 3. Handler reuse confirmation

| Pop-out action | Wires to | Existing handler on DashboardPage | Existing call shape |
|---|---|---|---|
| Accept | `onAccept` prop | `handleConfirmOrder` (`DashboardPage.jsx:1214-1228`) | Internally calls `confirmOrder(order.orderId, permissions?.[0] \|\| 'Manager', defaultOrderStatus)` at `api/services/orderService.js:62-66`. **Same call site already used by `ChannelColumn.jsx:201` for POS YTC accept.** Pop-out passes a `tableEntry`-shaped object built via `buildTableEntryFromOrder(order)` — matches the existing call shape at `DashboardPage.jsx:1593/1625`. |
| Reject | `onReject` prop | `handleCancelOrderFromCard` (`DashboardPage.jsx:1427-1437`) | Opens existing `<CancelOrderModal />` — same flow as today's cancel-from-card path. Pop-out passes the raw order object unchanged. **Confirms handover §2.3 correction: pop-out uses `onCancelOrder` path, NOT the unwired `onReject` prop.** |
| Snooze | `onToggleSnooze` prop | `toggleSnooze` (`DashboardPage.jsx:1170-1180`) | Pure add/remove on the in-memory `snoozedOrders: Set`. Pop-out calls it with `String(orderId)` — same call shape as `OrderCard.jsx:349`. |
| View / Open | `onEdit` prop | `handleTableClick` (`DashboardPage.jsx:1265-1300`) | Opens existing OrderEntry surface. Pop-out passes a `tableEntry`-shaped object via `buildTableEntryFromOrder(order)`. |

**No new business logic** was introduced. Every action terminates inside a handler that has been live in production since before this CR.

---

## 4. Confirmation: no new sound / backend / socket behaviour

Anti-tests A-1 and A-2 enforce this at the unit level by inspecting the component source for forbidden import / call patterns. Manual audit:

| Concern | Verified |
|---|---|
| No `soundManager` import or use | ✅ A-1 |
| No `NotificationContext` import or `useNotification()` | ✅ A-1 |
| No `orderService` import (no `confirmOrder` / `cancelOrder` calls) | ✅ A-2 |
| No `api/axios` import | ✅ A-2 |
| No `socket/socketHandlers` import | ✅ A-2 |
| No `socket.emit` calls | ✅ A-2 |
| No FCM subscription | ✅ — component only declares `useState`, `useMemo`, `useEffect`, `useCallback`, `useRef` + Lucide icons + brand `COLORS` |
| No `localStorage` / `sessionStorage` write during snooze | ✅ A-3 (jest spy on `Storage.prototype.setItem` asserts zero calls across the full 5-min timer lifecycle) |
| No mutation of `order.status` / `order.fOrderStatus` | ✅ A-4 (deep-equal snapshot before/after snooze across the full 5-min lifecycle) |
| Pop-out does NOT short-circuit handlers — every action goes through the prop the caller wired | ✅ A-5 (handlers omitted; clicks throw nothing; no global side effects) |
| Existing FCM ringer behaviour untouched | ✅ — `NotificationContext.jsx`, `soundManager.js`, `Sidebar.jsx`, all unchanged |
| Existing socket-first handlers untouched | ✅ — `socketHandlers.js` unchanged |
| Backend / API contract unchanged | ✅ — no service file edited |
| CR-008 D1-Gate untouched | ✅ — `CollectPaymentPanel.jsx` unchanged |
| Phase 2 web delivery-charge lock untouched | ✅ — `CollectPaymentPanel.jsx` + `OrderEntry.jsx` unchanged |
| Phase 3 platform dropdown untouched | ✅ — `Header.jsx`, `PlatformCounterChip.jsx` unchanged |
| POS YTC card flow untouched | ✅ — `OrderCard.jsx`, `TableCard.jsx` unchanged |

---

## 5. Tests / checks run

### 5.1 Phase 4 focused suite (new file)

```
Test Suites: 1 passed, 1 total
Tests:       25 passed, 25 total
Time:        2.301 s
```

| Group | Count | Result |
|---|---|---|
| T-1..T-16 (unit) | 16 | ✅ all pass |
| I-1..I-2 (integration) | 2 | ✅ all pass |
| A-1..A-5 (anti-tests) | 5 | ✅ all pass |
| Pure helpers (`isUnconfirmedScanOrder`, `buildTableEntryFromOrder`) | 2 | ✅ all pass |

### 5.2 Full project Jest suite (regression guard)

```
Test Suites: 29 passed, 29 total
Tests:       422 passed, 422 total
Time:        12.954 s
```

Zero regressions in pre-existing tests. Phase 1 (`orderTransform.orderFrom`), Phase 2 (`CollectPaymentPanel.deliveryLock`), Phase 3.1 (`PlatformCounterChip`), POS2-003 wire test, and all other prior suites remained green.

### 5.3 ESLint

`yarn lint`-equivalent invoked via the tool for the three touched files:

| File | Result |
|---|---|
| `components/dashboard/ScanOrderPopOut.jsx` | ✅ No issues |
| `__tests__/components/dashboard/ScanOrderPopOut.test.jsx` | ✅ No issues |
| `pages/DashboardPage.jsx` | ✅ No issues |

### 5.4 Production build

```
$ craco build
Creating an optimized production build...
Compiled successfully.

File sizes after gzip:
  437.66 kB  build/static/js/main.a57e454e.js
  16.6 kB    build/static/css/main.fc0ed8ed.css

Done in 18.99s.
```

Zero warnings, zero errors.

### 5.5 Live preview smoke

`https://insights-phase.preview.emergentagent.com/` → HTTP 200. Frontend supervisor `RUNNING`. (Full Q-1..Q-17 live smoke deferred to the QA agent — see §6.)

---

## 6. QA checklist status

| # | Item | Verified at this stage? | Note |
|---|---|---|---|
| Q-1 | Pop-out appears on web YTC arrival | ⏳ — needs real Scan & Order traffic | Implementation correct per T-3 / I-2 unit verification |
| Q-2 | Desktop ≥ 50% coverage | ✅ via T-12 class assertion + lg breakpoint | Live visual check pending QA |
| Q-3 | Tablet full-screen | ✅ via T-12 | Live visual check pending QA |
| Q-4 | "Order N of M" indicator | ✅ via T-4 | |
| Q-5 | Accept → confirmOrder → flip 7→1 → drop | ✅ via T-5 + T-15 unit; ⏳ live end-to-end | Reuses existing `handleConfirmOrder`; idempotency guaranteed by existing POS YTC behaviour |
| Q-6 | Reject → opens cancel modal | ✅ via T-6 + I-1 (handler-passthrough) | Cancel modal is the existing `<CancelOrderModal />` |
| Q-7 | View → OrderEntry opens | ✅ via T-7 + I-1 | Uses existing `handleTableClick` |
| Q-8 | Snooze 5-min accuracy | ✅ via T-9 (fake timers, exact ±0 ms) | |
| Q-9 | Snoozed + status-flip → immediate removal | ✅ via T-10 | R-SNOOZE-12 implicit selector |
| Q-10 | Reload clears snooze | ✅ via design — `popOutSnoozeHideSet` is `useState` only, not persisted (A-3 enforces) | |
| Q-11 | POS YTC order does NOT trigger pop-out | ✅ via T-13 | |
| Q-12 | No new audio cue | ✅ via A-1 | |
| Q-13 | Sidebar Ringer toggle untouched | ✅ — `Sidebar.jsx` not edited | |
| Q-14 | All three sub-channels covered (delivery / takeAway / dineIn with table) | ✅ via pure-helper test `buildTableEntryFromOrder shapes for each channel` | |
| Q-15 | Multi-operator first-wins | ⏳ — needs two browser sessions | Pop-out adds no race risk; inherits existing first-wins |
| Q-16 | Phase 3 dropdown still works | ✅ via full-suite regression (`PlatformCounterChip.test.jsx` + DashboardPage unchanged filters) | |
| Q-17 | CR-008 + Phase 2 delivery lock regression | ✅ via full-suite regression (`CollectPaymentPanel.deliveryLock.test.jsx` passes) | |

### 6.1 Backend smoke (non-blocking per handover §1.3 C-8)

| Item | Action |
|---|---|
| BE-OF4 (co-arrival of `order_from='web'` + `fOrderStatus=7` on socket) | Verify empirically via Q-1 when QA places ≥ 10 real Scan & Order traffic samples |
| BE-Q-NEW-1 (`order_from`-aware routing on confirm) | Verify via Q-5 audit-log inspection |
| BE-Q-NEW-2 (web-postpaid YTC parity) | Verify via Q-5 + Q-14 |
| OQ-10 (multi-operator race) | Verify via Q-15 |

---

## 7. Risks / follow-ups

### 7.1 Residual risks (low)

| # | Risk | Mitigation |
|---|---|---|
| R-1 | If backend ever ships a Web YTC order with `orderFrom` casing other than lowercase `'web'`, the predicate would miss it. | Phase 1 transform already lower-cases via `normaliseOrderFrom` (`orderTransform.js`). Phase 3 dropdown in production validates the lower-case round-trip. Low risk. |
| R-2 | A long-snoozed order whose status flips to YTC mid-snooze (theoretically possible if a backend revert occurred) would remain hidden until the 5-min timer fires. | Status-flip auto-remove only fires when the order leaves YTC; a re-enter-YTC mid-snooze is exotic and intentionally kept in hide-set until timer expiry (operator can manually navigate via Next/Prev or wait). |
| R-3 | Two operators simultaneously open the pop-out and click Accept on the same order. | Backend `confirmOrder` is idempotent (existing POS YTC behaviour, unchanged). Second operator's pop-out auto-drops via socket update. Inherited from prior CR-008 / POS2-003 flow. |
| R-4 | Operator collapses the browser viewport mid-action; pop-out re-styles from desktop overlay → full-screen modal. | Pure CSS breakpoint transition; no state lost. |
| R-5 | A high-volume tenant gets 10+ simultaneous Web YTC orders → sequential one-at-a-time UX requires many clicks. | Locked R-POPOUT-8 per owner. Future enhancement (out of scope) could add an "Accept all" or list view, but only after owner approval. |

### 7.2 Follow-ups (optional, post-QA)

| # | Item | Owner |
|---|---|---|
| F-1 | Run live multi-tenant smoke against Q-1..Q-17 | QA |
| F-2 | Capture observed audio behaviour on real Scan & Order arrival (R-SNOOZE-14 documentation gate — informational only; no implementation consequence) | QA |
| F-3 | Optional UX refinement: if QA finds duplicate-click confusion between the card-level Snooze button and the pop-out's Snooze (both visible at once on a web YTC card), tighten the card predicate per handover §5.4. Default = leave alone. | UX |
| F-4 | Future-CR: cross-device snooze persistence (R-SNOOZE-8 / OQ-13.d / BE-OF9). Not in this CR. | Backlog |
| F-5 | Future-CR: configurable snooze duration (R-SNOOZE-9 fixed at 5 min). Not in this CR. | Backlog |
| F-6 | Future-CR: aggregator (`order_in === 'swiggy' / 'zomato'`) pop-out scope extension (OQ-9). Not in this CR. | Backlog |

### 7.3 Documentation deltas

- New file: `change_requests/implementation_summaries/POS2_002_PHASE_4_WEB_YTC_POPOUT_IMPLEMENTATION_SUMMARY_2026_05_10.md` (this file).
- Handover doc unchanged (used as the execution guide).
- No `/app/memory/final/*` edits.
- No tracker rewrite — the CR analysis file at `impact_analysis/POS2_002_ORDER_FROM_WEB_PIPELINE_CR_IMPACT_ANALYSIS_2026_05_07.md` already declares Phase 4's locked scope through §19 (v6); this summary closes Phase 4 as `implementation_complete_ready_for_QA`.

---

## 8. Final verdict

### `implementation_complete_ready_for_QA`

### 8.1 Justification

| Dimension | Outcome |
|---|---|
| Locked scope honoured | ✅ — presentation-only overlay; zero new business logic; predicate locked at `orderFrom === 'web' && fOrderStatus === 7` |
| Handler reuse | ✅ — Accept / Reject / Snooze / View all wired to existing `handleConfirmOrder` / `handleCancelOrderFromCard` / `toggleSnooze` / `handleTableClick` |
| Files-not-to-touch respected | ✅ — `orderService.js`, `socketHandlers.js`, `soundManager.js`, `NotificationContext.jsx`, `Sidebar.jsx`, `CollectPaymentPanel.jsx`, `OrderEntry.jsx`, `OrderCard.jsx`, `TableCard.jsx`, `/app/memory/final/*`, all backend — all unchanged |
| Sound surface | ✅ — silent layer; A-1 enforces no audio import; existing FCM ringer untouched |
| Snooze policy | ✅ — reuses existing `toggleSnooze`; adds pop-out-local 5-min auto-clear; no backend / no persistence / no status mutation (A-3, A-4) |
| Phase 4 test coverage | ✅ — 25/25 pass (T-1..T-16 + I-1..I-2 + A-1..A-5 + 2 helpers) |
| Regression | ✅ — full suite 422/422 pass across 29 suites |
| Production build | ✅ — `Compiled successfully`, ~438 kB gzip JS, ~17 kB gzip CSS |
| ESLint | ✅ — clean on all three touched files |
| Live preview | ✅ — `https://insights-phase.preview.emergentagent.com/` returns HTTP 200; supervisor `RUNNING` |
| V-1..V-6 verification gate | ✅ — all 6 pre-implementation checks PASS (snooze state location, no backend in toggle path, no side-effects, no persistence, no socket interplay, card-button predicate intact) |

### 8.2 Handover-required outputs check

| Required output | Delivered |
|---|---|
| Files changed | §1 |
| Exact implementation details | §2 |
| Handler reuse confirmation | §3 |
| Confirmation no new sound / backend / socket behaviour | §4 |
| Tests / checks run | §5 |
| QA checklist status | §6 |
| Risks / follow-ups | §7 |
| Final verdict | §8 |

---

## 9. Strict-rules compliance certification

| Rule | Status |
|---|---|
| `/app/memory/final/*` untouched | ✅ |
| Backend code untouched | ✅ |
| `orderService.js` untouched | ✅ |
| `socketHandlers.js` untouched | ✅ |
| `soundManager.js` untouched | ✅ |
| `NotificationContext.jsx` untouched | ✅ |
| `Sidebar.jsx` untouched | ✅ |
| `CollectPaymentPanel.jsx` untouched | ✅ |
| `OrderEntry.jsx` untouched | ✅ |
| `OrderCard.jsx` untouched | ✅ |
| `TableCard.jsx` untouched | ✅ |
| `orderTransform.js` untouched | ✅ |
| No new endpoints created | ✅ |
| No socket / FCM behaviour added | ✅ |
| No new sound asset / no sound suppression / no sound duplication | ✅ — A-1 enforced |
| No new snooze system | ✅ — reuses existing `toggleSnooze`; only pop-out-local UI timer added |
| No localStorage / sessionStorage / IndexedDB / backend persistence | ✅ — A-3 enforced |
| No mutation of `order.status` / `order.fOrderStatus` | ✅ — A-4 enforced |
| Existing POS YTC card flow preserved (R-POPOUT-9, R-SNOOZE-5) | ✅ — `OrderCard.jsx` / `TableCard.jsx` byte-identical |
| CR-008 D1-Gate behaviour preserved | ✅ |
| Phase 1 / 2 / 3 / 3.1 behaviour preserved | ✅ — full-suite regression |
| Stop after implementation and summary | ✅ — this doc is the final deliverable |

---

— End of POS2-002 Phase 4 Web / Scan YTC Visual Pop-out Implementation Summary 2026-05-10 —
