# CR-004 Phase 2 — Room Orders Report: "Remove from Room" + "Paid" Column

**Ticket type:** Frontend implementation, **mostly self-contained** (one upstream investigation listed in §0)
**Owner CR:** CR-004 (Room Orders Report)
**Drafted:** 2026-04-29
**Status:** `ready_to_implement` (PR-1) / `ready_to_implement_after_§0` (PR-2)
**Estimated effort:** ~½ day total (PR-1 ~2h, PR-2 ~½ day, §0 investigation ~1–2h)

---

## 0. Pre-requisite — Audit-Report side-panel stale-Paid bug

**Must complete BEFORE PR-2 ships** (per user instruction).

### Symptom
On `/reports/all-orders` Paid tab:
1. User clicks amber **Unpaid** pill → `MarkUnpaidConfirmDialog` → confirm → `POST /make-order-unpaid` succeeds → row disappears from Paid tab and reappears on Unpaid tab. ✅
2. User then clicks that same order's row to open the **side panel** (`OrderDetailSheet`). Side panel still labels the order **Paid**. ❌

User asserted *"its from front end"*.

### Investigation done — full code-path trace

The data path from list-click → side panel render is short and contains **no caches and no stale-state re-use** on the frontend. Tracing it:

| Step | File:Line | What happens |
|---|---|---|
| 1 | `pages/AllOrdersReportPage.jsx:499-502` | `handleRowClick(order)` → `setSelectedOrder(order)` + `setIsSheetOpen(true)`. The `order` passed is the **freshly-fetched list row** (post-`fetchOrders()`-after-Mark-Unpaid). |
| 2 | `components/reports/OrderDetailSheet.jsx:467` | Sheet receives `order` prop. State `details` initialised to `null`. |
| 3 | `OrderDetailSheet.jsx:476-510` | `useEffect` deps = `[order]` → on every new `order` reference, calls `getSingleOrderNew(order.id)`. **No conditional skip, no cache.** |
| 4 | `api/services/reportService.js:254-259` | `getSingleOrderNew` does a plain `POST /api/v2/vendoremployee/get-single-order-new` with `{order_id}` and returns `reportFromAPI.singleOrderNew(response.data)`. **No axios cache layer.** |
| 5 | `api/transforms/reportTransform.js:436-552` | Transform reads `order.payment_status` directly (line 529: `paymentStatus: order.payment_status || '—'`). Falls back to `'—'` (NOT `'paid'`) on missing field. |
| 6 | `OrderDetailSheet.jsx:556-562` | `<StatusBadge paymentStatus={displayData.paymentStatus} ... />` reads from the freshly-set `details`, NOT from the inbound `order` prop. |

**Conclusion:** The frontend is doing the correct thing. It always:
- Refetches `/get-single-order-new` on every sheet open.
- Renders the badge from the **fetched** payload, not from the stale list row.
- Has no local cache that could carry pre-Mark-Unpaid state into the sheet.

### Therefore the actual root cause is on the backend

`POST /get-single-order-new` is returning **`payment_status: "paid"`** for an order whose authoritative state is now `unpaid` (post-`/make-order-unpaid`). Two plausible backend explanations:

1. **Replication / read-replica lag** — `/make-order-unpaid` writes to primary; `/get-single-order-new` reads from a replica that hasn't caught up.
2. **`/get-single-order-new` reads from a different table/view** than `/order-logs-report` reads. The list endpoint sees the new `payment_status` because it reads from a query that joins the freshly-mutated row; the single-order endpoint reads from a cached/denormalised view that is updated on a different cycle.

(The user's "it's from frontend" reading is understandable — the data DID come back from the same browser session — but the actual `Network` tab on the bug repro will show `/get-single-order-new` returning `"payment_status": "paid"` despite the immediately preceding `/make-order-unpaid` having returned 200. That's a backend consistency gap.)

### What the implementation agent should do for §0

#### Step 1 — Confirm with a 30-second curl probe on staging

```bash
# After the user reproduces the bug, run from a terminal:
TOKEN=<copy from devtools>
ORDER_ID=<the affected order id>

# 1. Check the single-order endpoint's view
curl -s -X POST "https://preprod.mygenie.online/api/v2/vendoremployee/get-single-order-new" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"order_id\": $ORDER_ID}" | python3 -c "import sys,json; o=json.load(sys.stdin)['orders'][0]; print('payment_status:', o.get('payment_status'))"

# 2. Check the list endpoint's view of the same order on the same date
curl -s -X POST "https://preprod.mygenie.online/api/v2/vendoremployee/report/order-logs-report" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"start_date\": \"$DATE\", \"end_date\": \"$DATE\"}" | python3 -c "import sys,json; orders=[o for o in json.load(sys.stdin)['orders'] if o['id']==$ORDER_ID]; print('list payment_status:', orders[0].get('payment_status') if orders else 'not in list')"
```

If `payment_status` from (1) is `paid` while (2) says `unpaid` (or the order is in the unpaid bucket of the list) → backend inconsistency confirmed → file a backend ticket, do not patch frontend.

If both endpoints agree on `paid` → the Mark-Unpaid mutation didn't actually persist → file a different backend ticket on `/make-order-unpaid`.

If both endpoints say `unpaid` but the sheet still shows Paid → there IS a frontend bug we missed; come back to this trace and re-investigate.

#### Step 2 — Frontend defensive refresh (only if backend fix is delayed)

If the backend ticket can't ship in the same window as PR-2, add this small defensive measure to keep operators from seeing stale data:

```js
// pages/AllOrdersReportPage.jsx — handleMarkUnpaidConfirm success branch (~line 627)
// AFTER: setMarkUnpaidTarget(null);
// ADD:    setSelectedOrder(null);   // closes any open sheet so it must re-mount on next click
//         setIsSheetOpen(false);
```

This forces the sheet to fully unmount + re-fetch on the next row click, eliminating any chance that the sheet retained `details` state from before the mutation. (Note: this is just paranoia — the current code's `useEffect` with `[order]` dep already handles this — but if backend is returning consistent data 1-2 seconds later, the small re-mount delay can mask the lag.)

A longer-term frontend defence: have the sheet expose a manual "Refresh" affordance and/or auto-refetch on focus.

### Code pointers
- `components/reports/OrderDetailSheet.jsx` — sheet component (467, 476-510, 556-562)
- `pages/AllOrdersReportPage.jsx:499-507` — open/close handlers; 608-648 — Mark-Unpaid mutation
- `api/services/reportService.js:254-259` — `getSingleOrderNew`
- `api/transforms/reportTransform.js:436-552` — `singleOrderNew` transform (line 529 = paymentStatus read)
- `api/services/paymentMutationService.js:101` — `makeOrderUnpaid`

### Definition of Done — §0
- [ ] Curl probe (Step 1) executed on staging with a real reproducible order id; result documented in this ticket as a one-line addendum.
- [ ] If backend inconsistency confirmed → backend ticket filed with the curl evidence; **§0 is then "blocked on backend" and the frontend has no fix to ship**. PR-2 can still proceed (the same bug will manifest on the new flow but is acknowledged as a pre-existing backend issue, not a regression).
- [ ] If a frontend bug IS found contrary to this trace → fix it in `OrderDetailSheet.jsx` and add a manual smoke test.
- [ ] Step 2 defensive close-sheet patch optional; apply only if backend fix is delayed AND the issue is operator-visible during pilot.
- [ ] Existing CR-003 manual flows on `/reports/all-orders` still pass (regression).

---

## 1. Problem Statement

The Room Orders Report (`/reports/rooms`) has two refinements requested by ops:

1. **Issue #2 — Add a `Paid` column** in the row strip between Total and Outstanding, plus a matching `Paid` stat in the top-right SummaryBar. Operators want to see at a glance how much has been collected per room (and across visible rooms).

2. **Issue #1 — Add a per-row "Remove from Room" action** on each entry of the expanded **Associated Orders** table. Today, once an SRM is transferred to a room, there is no UI affordance to undo that transfer from inside the Room Orders Report. Operators want to be able to detach an associated order from the room — using the same backend endpoint as CR-003's Mark-as-Unpaid (which, on an SRM `transferToRoom` row, has the side-effect of stripping the room association — confirmed during planning, closes parent sub-CR's Q-1c).

Issue #3 (Rent → Total rename in the side panel) is **deferred** at user's request.

---

## 2. Scope

| Issue | Status | Ships in |
|---|---|---|
| #2 — Paid column + SummaryBar Paid stat | locked | PR-1 |
| #1 — Remove from Room button on Associated Orders | locked, blocked on §0 | PR-2 |
| #3 — Rent → Total relabel in ROOM BILLING side panel | **deferred** | — |
| Cross-day in-house view (separate ticket) | tracked in `CR_004_PHASE2_CROSS_DAY_INHOUSE_VIEW.md` | — |

---

## 3. Locked Decisions

| Decision | Value | Source |
|---|---|---|
| Button label | **Remove from Room** | user 2026-04-29 |
| Endpoint | `POST /api/v2/vendoremployee/make-order-unpaid` (constant `MAKE_ORDER_UNPAID`) | user 2026-04-29 — same as CR-003 |
| Service function | Reuse `makeOrderUnpaid(orderId)` from `paymentMutationService.js:101` | existing |
| Permission key | `order_unpaid` (reuse — same as CR-003 Mark-Unpaid) | user 2026-04-29 |
| 2-day window guardrail | **Yes — applied** (current + previous business day, same as CR-003 CS-A9) | user 2026-04-29 |
| Button visibility (when permission/window pass) | **Always visible on every Associated Orders row** — no `payment_status` gating, because all SRM `transferToRoom` rows are stamped `payment_status: "paid"` at transfer-time anyway | per parent sub-CR §B G1 |
| SummaryBar Paid stat | **Add it** between Food and Outstanding (Option X) | user 2026-04-29 |
| Confirmation dialog | Reuse `MarkUnpaidConfirmDialog.jsx` shell, clone with new title/body copy → new file `RemoveFromRoomConfirmDialog.jsx` | per planning |
| Implementation order | §0 (audit bug) → PR-1 (Issue #2) → PR-2 (Issue #1) | user 2026-04-29 |
| Out of scope: SRM end-state (paid? cancelled? back to original table?) | **Not specified — relies on backend's existing `make-order-unpaid` semantics for `transferToRoom` rows.** Whatever happens today on `/reports/all-orders` Paid tab when an SRM is unpaid is exactly what will happen here. No new backend behaviour is being asked for. | per planning |

---

## 4. PR-1 — Issue #2: Paid column + SummaryBar Paid stat

### 4.1 Formula (locked)
```
paid = max(0, total − outstanding)
```
- `total` and `outstanding` already exist in the per-row `numbers` memo (`RoomRowCard.jsx:266-308`).
- Clamped at 0 so over-collection / negative-balance edge cases never render a negative number.
- Naturally rolls in advance + any settled portions without depending on `payment_status` of associated orders.

### 4.2 Files to modify

| # | File | Change |
|---|---|---|
| 4.2.1 | `frontend/src/pages/RoomOrdersReportPage.jsx` | **Lines 270-281** (`RoomRowsHeader`) — insert `<div className="w-20 text-right">Paid</div>` between Total and Outstanding. Verify total row width still fits at 1280px / 1440px / 1920px (the strip already overflows comfortably; widening by w-20 should be fine). |
| 4.2.2 | `frontend/src/components/reports/RoomRowCard.jsx` | **Lines 266-308** (`numbers` memo) — add `paid: Math.max(0, total - outstanding)` to the returned object (and to the empty-state branch above it: `paid: null`). |
| 4.2.3 | `frontend/src/components/reports/RoomRowCard.jsx` | **Lines 394-403** (after the Total cell) — insert a Paid cell with the **same loading skeleton, error placeholder, and currency formatter** as Total. Use neutral `text-zinc-900` (Paid is informational, not red/green). |
| 4.2.4 | `frontend/src/pages/RoomOrdersReportPage.jsx` | **Lines 170-215** (`SummaryBar`) — insert a new `<SummaryStat label="Paid" .../>` between Food and Outstanding, with its own divider. Aggregate value = `Σ row.paid` across visible rooms (compute alongside the existing total/food/outstanding sums in whatever parent memo currently feeds the SummaryBar). |

### 4.3 Acceptance Criteria — PR-1
- AC-2.1: Header strip reads `Room | Guest | Check-in | Transferred | Food | Total | Paid | Outstanding`.
- AC-2.2: For a row with `Total = ₹23,296` and `Outstanding = ₹22,519`, the Paid cell shows `₹777`. For a fully-settled room, Paid = Total and Outstanding = ₹0.
- AC-2.3: Negative-balance edge case (`Total < Outstanding`) renders Paid as `₹0`, not negative.
- AC-2.4: SummaryBar reads `Rooms N · Total ₹… · Food ₹… · Paid ₹… · Outstanding ₹…` and Paid equals `Σ row.paid` across the visible (post-filter) rows.
- AC-2.5: Loading skeleton + error retry behaviour on the Paid cell matches Total / Outstanding.
- AC-2.6: Layout unbroken at 1280 / 1440 / 1920 widths.
- AC-2.7: No regression to existing Total / Food / Outstanding values or to the filter pills.

### 4.4 Risk — PR-1
**Low.** Pure derived value. No API touch. No new permission. Single rename. ~2 hours including manual smoke.

---

## 5. PR-2 — Issue #1: Remove from Room button

### 5.1 What the user does
1. Operator expands a room in the Room Orders Report.
2. Each row in the **Associated Orders** table now has a **Remove from Room** action (right-aligned, after the Amount cell).
3. Click → `RemoveFromRoomConfirmDialog` opens.
4. Confirm → row vanishes optimistically → toast → ~1s later the room's Food/Total/Paid/Outstanding refresh to authoritative numbers (the Σ over `associated_order_list[]` re-fetched from `/get-single-order-new`).
5. On error → row reappears, dialog stays open, destructive toast.

### 5.2 What the user does NOT need to know
The single endpoint `POST /make-order-unpaid` does double duty: it flips `payment_status` to unpaid AND strips the room association as a side-effect on `transferToRoom` rows. From the operator's perspective the behaviour is "this order leaves the room"; from the API's perspective it's the same call we already use on `/reports/all-orders` Paid tab.

### 5.3 Reused assets (verified in code)

| Asset | Path | Reuse |
|---|---|---|
| `MarkUnpaidConfirmDialog` AlertDialog shell | `frontend/src/components/reports/MarkUnpaidConfirmDialog.jsx` | Clone → new file `RemoveFromRoomConfirmDialog.jsx` (different title/body, same controlled props). Don't `import` and re-skin in place — keep them separate so each dialog's copy can evolve independently. |
| `makeOrderUnpaid(orderId)` service | `frontend/src/api/services/paymentMutationService.js:101` | **Reuse as-is** — no new service needed. |
| Page-level state machine | `frontend/src/pages/AllOrdersReportPage.jsx:196-197, 599-648, 915-920` | Copy ~70 lines into `RoomOrdersReportPage.jsx`. ONE deviation in the success branch (see §5.5). |
| Permission via `useAuth().hasPermission('order_unpaid')` | `frontend/src/pages/AllOrdersReportPage.jsx:118, 524` | Reuse the same call. |
| 2-day window predicate | `frontend/src/utils/businessDay.js` (used in `OrderTable.jsx`) | Reuse the same predicate to disable rows older than current+previous business day. |
| Toast hook | existing `use-toast.js` | Reuse. |

### 5.4 New code

| # | File | Change |
|---|---|---|
| 5.4.1 | `frontend/src/components/reports/RemoveFromRoomConfirmDialog.jsx` (NEW) | Clone of `MarkUnpaidConfirmDialog.jsx` with: <br>• Title: `Remove order #XXXXX from this room?` <br>• Body: `This order will be detached from the room and will reappear as an unpaid order. This action will be reflected on other terminals.` <br>• Action label: `Remove from Room` (idle) / `Removing…` (pending) <br>• `data-testid="remove-from-room-confirm-dialog"` <br>Same controlled props (`open / order / isPending / onCancel / onConfirm`). Same a11y. |
| 5.4.2 | `frontend/src/pages/RoomOrdersReportPage.jsx` | New page-level state: `removeFromRoomTarget`, `removeFromRoomPending`, `optimisticRemovedIds` (Set). Mirror `AllOrdersReportPage.jsx:196-197`. |
| 5.4.3 | `frontend/src/pages/RoomOrdersReportPage.jsx` | New handlers: `openRemoveFromRoomDialog`, `closeRemoveFromRoomDialog`, `handleRemoveFromRoomConfirm`. Mirror `AllOrdersReportPage.jsx:599-648` (see §5.5 for the deviation). |
| 5.4.4 | `frontend/src/pages/RoomOrdersReportPage.jsx` | Compute `canRemoveFromRoom = hasPermission?.('order_unpaid') ?? false` near top of component (mirror line 524 of `AllOrdersReportPage.jsx`). Pass `canRemoveFromRoom`, `onRemoveFromRoom`, `optimisticRemovedIds` down to `RoomRowCard`. |
| 5.4.5 | `frontend/src/pages/RoomOrdersReportPage.jsx` | Mount `<RemoveFromRoomConfirmDialog ... />` near bottom of the JSX tree (mirror `AllOrdersReportPage.jsx:915-920`). |
| 5.4.6 | `frontend/src/components/reports/RoomRowCard.jsx` | New props: `canRemoveFromRoom: boolean`, `onRemoveFromRoom: (associatedOrder, parentOrderId) => void`, `optimisticRemovedIds: Set<number>`. Forward into `TransferredOrdersTable`. |
| 5.4.7 | `frontend/src/components/reports/RoomRowCard.jsx` | **Lines 117-194** (`TransferredOrdersTable`) — restructure the row grid from `grid-cols-12` to accommodate a new right-aligned **Action** column. Two clean choices: (a) `grid-cols-14` with `col-span-2` for the action, or (b) flex layout. Filter `associatedOrders` to drop ids in `optimisticRemovedIds` before rendering. Render the **Remove from Room** pill on each row only when ALL of: <br>• `canRemoveFromRoom === true` <br>• Order's `created_at` is within the 2-day window (use `businessDay.js` predicate) <br>Otherwise render no pill (do NOT show disabled state). |
| 5.4.8 | `frontend/src/components/reports/RoomRowCard.jsx` | Pill `onClick` handler must `e.stopPropagation()` (the surrounding row already has its own click affordance — though Associated Orders rows are not actually clickable today, defensive stop is cheap and matches CR-003 pattern). |

### 5.5 The one deviation from CR-003 (success-branch refetch strategy)

`AllOrdersReportPage.jsx:630` does a full `fetchOrders()` after Mark-Unpaid. **Don't do that here** — it would re-fetch every visible room's `/order-logs-report`. Instead, do a **surgical per-row invalidation**:

```js
// inside handleRemoveFromRoomConfirm — success branch (replaces line 630 equivalent)
detailCacheRef.current.delete(parentOrderId);
setResolvedTick((t) => t + 1);
// `RoomRowCard` watches detailCache identity + parentOrderId, will refetch
// itself for that one row, and the numbers memo recomputes Food/Total/Paid/
// Outstanding from the new `associated_order_list[]`.
```

`detailCacheRef` lives in `RoomOrdersReportPage.jsx:349`. The `setResolvedTick` mechanism already exists at line 350.

**Why surgical**: a busy operator screen may have 30+ rooms expanded. A full refetch would double network traffic + re-trigger every row's loading skeleton, which is visually disruptive.

### 5.6 Optimistic flow (step-by-step)

1. User clicks pill on row `ao` inside parent `parentOrderId`.
2. `RoomRowCard` calls `onRemoveFromRoom(ao, parentOrderId)`.
3. Page sets `removeFromRoomTarget = { ao, parentOrderId }` → dialog opens.
4. User confirms → `setRemoveFromRoomPending(true)` → `optimisticRemovedIds.add(ao.orderId)`.
5. `RoomRowCard` re-renders, `TransferredOrdersTable` filters out `ao.orderId` → row visually disappears.
6. `await makeOrderUnpaid(ao.orderId)`.
7. **On success** → `toast({ title: 'Order removed from room' })` → `setRemoveFromRoomTarget(null)` → `detailCacheRef.current.delete(parentOrderId)` → `setResolvedTick(t=>t+1)` → row refetches → numbers update.
8. **On error** → `optimisticRemovedIds.delete(ao.orderId)` → row reappears → destructive toast → dialog stays open so operator can retry without re-clicking.

### 5.7 2-day window guardrail

Reuse the same predicate CR-003 uses on `OrderTable.jsx`. Approximate signature:
```js
import { isWithinTwoBusinessDays } from '../../utils/businessDay';

const showPill =
  canRemoveFromRoom &&
  isWithinTwoBusinessDays(ao._raw?.created_at, schedules /* if needed */);
```
Confirm exact import path and predicate name during implementation by inspecting `OrderTable.jsx`. The `schedules` array is already available in `RoomOrdersReportPage.jsx:290-293` and can be prop-drilled if the predicate needs it.

### 5.8 Acceptance Criteria — PR-2

- AC-1.1 (visibility — permission): An operator with `order_unpaid` permission sees the **Remove from Room** pill on every Associated Orders row that is within the 2-day window. An operator without it sees no pill anywhere.
- AC-1.2 (visibility — window): A row created 3+ business days ago shows no pill, regardless of permission.
- AC-1.3 (visibility — always-shown when eligible): The pill appears on EVERY in-window row regardless of `payment_status` (no payment-status gating, per locked decision).
- AC-1.4 (confirm dialog): Clicking the pill opens `RemoveFromRoomConfirmDialog` with title `Remove order #<restaurantOrderId> from this room?` and the body copy from §5.4.1.
- AC-1.5 (success path): Confirm → row vanishes from Associated Orders → success toast → within ~2s the room's `Outstanding`, `Paid`, `Food`, `Transferred count` cells refresh to new authoritative values reflecting the removed order.
- AC-1.6 (failure path): API error → row reappears → dialog stays open → destructive toast surfaces error message.
- AC-1.7 (no row collapse): Pill click does NOT collapse the surrounding expanded room row.
- AC-1.8 (cross-page consistency): The same SRM, when viewed under `/reports/all-orders` Paid tab, also disappears (single source of truth — backend mutation on `make-order-unpaid`).
- AC-1.9 (network): Exactly one POST `/make-order-unpaid` per click; one follow-up `/get-single-order-new(parentOrderId)` for the surgical refetch. No full-page `/order-logs-report` refetch.
- AC-1.10 (audit-side-panel bug fixed §0): Once §0 lands, opening the side panel for a removed order on `/reports/all-orders` shows status `Unpaid` (not stale `Paid`).

---

## 5A. PR-3 — Issue #3: Rent → Total relabel in ROOM BILLING side panel

### What changes
In each room's expanded **ROOM BILLING** side card (left of the Associated Orders table), rename the first label from **Rent** to **Total**. Numeric value, ordering, and styling unchanged.

### Files to modify

| # | File | Edit |
|---|---|---|
| 5A.1 | `frontend/src/components/reports/RoomRowCard.jsx` | **Line 89** — `<span className="text-zinc-600">Rent</span>` → `<span className="text-zinc-600">Total</span>`. Single string change. |

### Terminology check (one-line callout for review)
The renamed **Total** in the side panel means **room price only** (`roomInfo.roomPrice`), but **Total** in the row strip column means **room price + food**. Two definitions of the same word on the same screen. The user asked for the literal rename — keep it as-is unless ops feedback after rollout asks for disambiguation (in which case a follow-up could change side-panel label to "Room total" or "Room charge").

### Acceptance
- AC-3A.1: Expanded panel shows `Total / Advance / Balance / Food` (in that order). Numeric values unchanged from today's `Rent / Advance / Balance / Food`.
- AC-3A.2: No screenshot test breakage beyond the label string update.

### Risk
**Trivial.** One string change. Ships in PR-1 alongside Issue #2 (no need for a separate PR).

### PR sequencing — updated

| PR | Contents |
|---|---|
| **PR-1** | Issue #2 (Paid column + SummaryBar Paid stat) + Issue #3 (Rent → Total relabel). Two independent changes, both pure-frontend, both low-risk, both edit `RoomRowCard.jsx`. |
| **PR-2** | Issue #1 (Remove from Room button). Ships after §0 probe. |

### 5.9 Risks — PR-2

| Risk | Level | Mitigation |
|---|---|---|
| Stale `payment_status` on `associated_order_list[]` (parent sub-CR G3 unresolved) means after-success refetch may briefly show the row still attached. | Medium | The optimistic Set masks it locally. If `associated_order_list[]` still contains the id post-refetch, the existing optimistic filter keeps masking until the next mount. Document as known minor inconsistency until G3 lands. |
| Permission key `order_unpaid` not seeded on Owner role on a fresh tenant. | Low | Verified on preprod 2026-04-28 per CR-003 notes; if missing, operator simply doesn't see pill (graceful, no error). |
| 12-col Associated Orders grid breaks on narrow viewports. | Low | Test at 1280 / 1440 / 1920. Switch to flex if grid becomes cramped. |
| Audit-side-panel bug masks a deeper data-model issue that recurs here. | Medium | §0 must complete first. If §0 reveals a structural fix, apply it once and PR-2 inherits the fix automatically. |

---

## 6. Test Plan (manual, both PRs)

### 6.1 PR-1 smoke
- [ ] Header reads `Room | Guest | Check-in | Transferred | Food | Total | Paid | Outstanding`.
- [ ] Pick a known-good room: `Total = ₹23,296`, `Outstanding = ₹22,519` → Paid cell shows `₹777`.
- [ ] Pick a fully-settled room → Paid = Total, Outstanding = ₹0.
- [ ] SummaryBar reads `Rooms N · Total · Food · Paid · Outstanding` and `Paid` equals manual sum across visible rows.
- [ ] Apply each filter pill (`All` / `Paid` / `Unpaid`) → SummaryBar `Paid` stat recomputes correctly.
- [ ] Layout unbroken at 1280 / 1440 / 1920.

### 6.2 PR-2 smoke
- [ ] Login as Owner → expand a room with at least one in-window SRM → **Remove from Room** pill visible on every row.
- [ ] Login as Cashier without `order_unpaid` → no pill anywhere.
- [ ] Pill on a row created 3+ business days ago → not rendered.
- [ ] Click pill → confirm dialog opens with the correct order #.
- [ ] Confirm → toast → SRM row removed → Outstanding/Paid/Food refresh within 2s.
- [ ] Same SRM is also gone from `/reports/all-orders` Paid tab on refresh.
- [ ] Pill click on the SRM row does NOT collapse the room.
- [ ] Force network 5xx on `/make-order-unpaid` → row reappears, dialog stays open, destructive toast.

### 6.3 §0 smoke (audit-side-panel bug)
- [ ] On `/reports/all-orders` Paid tab, mark a paid order unpaid via the pill → confirm → list updates.
- [ ] Open the side panel for that same order → side panel reads `Unpaid` (NOT stale `Paid`).
- [ ] Repeat for at least one paid SRM `transferToRoom` row to cover both order types.

### 6.4 Regression
- [ ] CR-003 Paid-tab Mark-Unpaid still works on `/reports/all-orders`.
- [ ] CR-004 Phase 1 outstanding/total/food formulas unchanged when no Remove-from-Room action is taken.
- [ ] Network panel: `/order-logs-report` is NOT called as a side-effect of Remove-from-Room (only `/make-order-unpaid` + per-row `/get-single-order-new`).

---

## 7. Out of Scope

- The cross-day in-house room view (separate ticket: `CR_004_PHASE2_CROSS_DAY_INHOUSE_VIEW.md`).
- Issue #3 (Rent → Total relabel in ROOM BILLING side panel) — deferred at user request.
- Any change to `/get-single-order-new` response shape.
- Any new backend endpoint (we reuse `/make-order-unpaid`).
- Permission seeding (presumed already present on Owner / Admin / Cashier from CR-003).
- Hotel-stay-based business-day boundary (still deferred per OQ-R2 in `CR_004_room_orders_pms_view.md:175`).
- Cancelling / refunding a removed order — that's a separate flow.
- The "Room service items" line at the top of `TransferredOrdersTable` (the RM-parent's own `order_amount` aggregate) — does NOT get a Remove-from-Room action. Removing the master room order is structurally different (it would unwind the entire stay) and is explicitly out of scope.

---

## 8. Definition of Done

- [ ] §0 audit-side-panel bug investigated, root-caused, and fixed (or filed as a backend ticket if hypothesis 3 is confirmed).
- [ ] PR-1 (Issue #2) merged. AC-2.1 through AC-2.7 pass on staging.
- [ ] PR-2 (Issue #1) merged. AC-1.1 through AC-1.10 pass on staging.
- [ ] Manual smoke (§6) passes for both PRs and §0 fix.
- [ ] No regression on `/reports/all-orders` Paid/Unpaid tabs.
- [ ] `memory/change_requests/implementation_summaries/CR_004_IMPLEMENTATION_SUMMARY.md` appended with a Phase-2 UI Refinements section listing both PRs.
- [ ] `memory/change_requests/qa_handover/CR_004_QA_HANDOVER.md` appended with the Phase-2 test scenarios from §6.
- [ ] Parent sub-CR (`CR_004_BACKEND_EXT_sub_cr.md`) updated: Q-1c marked **answered** ("calling `/make-order-unpaid` on an SRM `transferToRoom` row strips the room association — same endpoint, same flow as CR-003, with side-effect of de-association").

---

## 9. Quick TL;DR (for the implementation agent)

> Three pieces of work, in this order:
>
> **(1) Investigate** the Audit-Report side-panel stale-Paid bug — start at `OrderDetailSheet.jsx`, look for stale data sources / cached `/get-single-order-new` responses. Hypotheses ranked in §0. Fix root cause, don't band-aid.
>
> **(2) PR-1** — add a `Paid` column to the Room Orders Report row strip and a matching `Paid` stat to the SummaryBar. Formula `paid = max(0, total - outstanding)`. Three files, ~30 lines total. Spec in §4.
>
> **(3) PR-2** — add a **Remove from Room** action to each row in the expanded Associated Orders table. Reuse the CR-003 Mark-Unpaid pattern wholesale (same endpoint, same service, same permission, same 2-day window, cloned dialog with new copy). One deviation from CR-003: surgical per-row refetch via `detailCacheRef.current.delete(parentOrderId) + setResolvedTick(t+1)` instead of full-page `fetchOrders()`. Spec in §5.
>
> Do NOT touch the side-panel "Rent" label (Issue #3 deferred). Do NOT touch the cross-day data source (separate ticket). Do NOT add new permissions. Do NOT add new endpoints.
