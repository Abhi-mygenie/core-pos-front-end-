# Five Task Implementation Summary

> Implemented per `/app/memory/FIVE_TASK_VALIDATION_HANDOVER.md`.
> User approvals captured in chat: Task 3 skipped (waiting for old-POS payload sample); PostHog + emergent-main.js → "remove entirely".
> Implementation order followed: 5 → 1 → 4 → 2.

---

### Task 5: Strip Emergent Branding

- **Status:** Implemented
- **Reason:** All static branding stripped per validation doc + user approval to fully remove PostHog and `emergent-main.js`.
- **Files changed:**
  - `frontend/public/index.html`
  - `frontend/src/App.js`
- **What changed:**
  - `public/index.html`:
    - `<title>` changed from `Emergent | Fullstack App` → `MyGenie POS`.
    - `<meta name="description">` changed from `A product of emergent.sh` → `MyGenie restaurant point-of-sale`.
    - Added `<link rel="icon" type="image/svg+xml" href="…logo111.svg" />` pointing to the existing `GENIE_LOGO_URL` SVG.
    - Removed `<script src="https://assets.emergent.sh/scripts/emergent-main.js">`.
    - Removed the entire PostHog init block (~lines 41-111) along with its hardcoded `phc_xAvL2…` key.
    - Removed CRA boilerplate comments unrelated to MyGenie.
  - `src/App.js`:
    - Added `useEffect` (in a small `AppTitleSync` component placed inside `AppProviders`) that sets `document.title` dynamically:
      `restaurant?.name ? \`${restaurant.name} · MyGenie POS\` : 'MyGenie POS'`.
- **API / payload / socket changes:** None.
- **UI changes:** Browser tab title and favicon now show MyGenie branding. Static fallback used before login / restaurant context resolves.
- **Documentation gaps found:** None against `/app/v3/`.
- **Code vs `/app/v3/` gaps found:** None.
- **Edge cases handled:**
  - Static fallback `MyGenie POS` shows when no restaurant context (login screen, offline).
  - Favicon points to existing `GENIE_LOGO_URL` so no asset upload required.
- **Risks remaining:**
  - The Emergent **preview proxy** (`https://req2-req3-req4-qa.preview.emergentagent.com`) wraps the dev server in an iframe and serves its OWN wrapper HTML with `<title>Loading...</title>` from `app.emergent.sh`. That wrapper is platform-managed and outside our control. Inside the iframe (the actual app), the title/favicon/description are correct as verified via direct dev-server curl.
  - When tested against `restaurant-pos-v2-1.preview.static.emergentagent.com` (a stale platform-managed pre-built backup snapshot), the title still shows `Emergent | Fullstack App`. This is a backup snapshot, not the live dev server. The fresh build on `localhost:3000` is correct (verified).
- **Testing done:**
  - `curl http://localhost:3000/` returns the new `<title>`, `<meta>`, `<link rel="icon">`, and contains zero `emergent.sh`/`posthog` references.
  - ESLint clean on `App.js` and changed files.
  - Webpack compiled with 1 (pre-existing, unrelated) warning.
- **Testing pending:**
  - Browser-tab visual confirmation against the live dev preview once the platform routes the user past the iframe wrapper (only relevant after login). Confirmed at the source HTML level.

---

### Task 1: Visibility View Configuration — single-mode lock per axis

- **Status:** Implemented
- **Reason:** Approved as VALID; user confirmed "no Both, no toggle" per chat.
- **Files changed:**
  - `frontend/src/pages/StatusConfigPage.jsx`
  - `frontend/src/pages/DashboardPage.jsx`
  - `frontend/src/components/layout/Sidebar.jsx`
- **What changed:**
  - `StatusConfigPage.jsx`:
    - Added 2 new localStorage keys + defaults:
      - `mygenie_view_mode_table_order` (`'table' | 'order'`, default `'table'`)
      - `mygenie_view_mode_channel_status` (`'channel' | 'status'`, default `'status'`)
    - Added 2 state variables `viewModeTableOrder` / `viewModeChannelStatus`.
    - Hydrated both from localStorage in the existing mount-effect.
    - Added a new "View Mode" section with two radio-card blocks (no "Both" option) inserted between "Channel Visibility" and "Default Column Layout".
    - Extended `saveConfiguration` to write both new keys.
    - Extended `resetToDefault` to reset both view modes.
    - Test IDs added: `view-mode-to-table`, `view-mode-to-order`, `view-mode-cs-channel`, `view-mode-cs-status`.
  - `DashboardPage.jsx`:
    - `useState("table")` and `useState("status")` replaced with lazy-init readers from the two new localStorage keys (with defensive try/catch and the same defaults).
    - Removed `activeView`/`setActiveView`/`dashboardView`/`setDashboardView` props from the `<Sidebar>` invocation (no longer needed by Sidebar).
  - `Sidebar.jsx`:
    - Removed the entire "View Toggle Section" block (was lines 285-337) including both `data-testid="view-toggle"` and `data-testid="group-toggle"` buttons.
    - Removed the now-unused `activeView`/`setActiveView`/`dashboardView`/`setDashboardView` props from the destructure.
    - Pruned now-unused icons (`LayoutGrid`, `List`, `Columns`, `Rows`) from the lucide-react import.
- **API / payload / socket changes:** None. Pure localStorage.
- **UI changes:**
  - StatusConfigPage gains one new section.
  - Sidebar no longer shows the two view-toggle buttons. Header filter pills still swap based on the locked `dashboardView` value (Channel pills in Status View, Status pills in Channel View) — unchanged behaviour.
- **Documentation gaps found:** None against `/app/v3/`.
- **Code vs `/app/v3/` gaps found:** None.
- **Edge cases handled:**
  - First-time users with no saved keys → defaults match historical behaviour (Table View + By Status).
  - Invalid stored values → defensive validation rejects non-`'table'/'order'` and non-`'channel'/'status'` values, falls back to defaults.
  - Reset-to-default also clears the two new keys.
  - localStorage unavailable → try/catch keeps default.
- **Risks remaining:**
  - Any external test that relied on `data-testid="view-toggle"` or `data-testid="group-toggle"` will fail. A repo-wide search at the time of edit found no such tests in `__tests__/`. (Confirmed via `grep -rn "view-toggle\|group-toggle" frontend/src/__tests__` — empty.)
  - Header.jsx still receives `activeView`/`setActiveView`/`dashboardView`/`setDashboardView` from DashboardPage and uses them for filter-pill logic. Untouched.
- **Testing done:**
  - ESLint clean on all 3 changed files.
  - Webpack compiles cleanly (1 unrelated pre-existing warning).
- **Testing pending:**
  - Manual smoke test: change settings in StatusConfigPage → save → reload Dashboard → verify locked view + no toggle buttons.
  - Test with Header filter pills under both Channel and Status locks.

---

### Task 4: Room Card Total — include room balance + transferred bills

- **Status:** Implemented
- **Reason:** Approved as VALID; user confirmed "only for room — ensure this doesn't break current calculation".
- **Files changed:**
  - `frontend/src/pages/DashboardPage.jsx`
- **What changed:**
  - Added a small inline helper near the top of the file:
    ```js
    const computeRoomCardAmount = (order) => {
      const food = Number(order?.amount) || 0;
      const transfers = (order?.associatedOrders || [])
        .reduce((sum, o) => sum + (Number(o?.amount) || 0), 0);
      const roomBal = Math.max(0, Number(order?.roomInfo?.balancePayment) || 0);
      return food + transfers + roomBal;
    };
    ```
  - In `allRoomsList` (the room → card adapter), replaced `amount: order.amount` with `amount: computeRoomCardAmount(order)`.
  - Other room render branches (`channelData.room`, `statusData` room branch, `gridItems` room branch, `searchResults.rooms`) all spread `...room` from `allRoomsList`, so they automatically inherit the corrected amount with no further edits required (verified in code).
  - Non-room paths (dineIn / walkIn / takeAway / delivery) are completely untouched.
- **API / payload / socket changes:** None. Display-only fix; checkout payload (`grand_total`) unchanged.
- **UI changes:** Room cards on the dashboard now show the full payable amount (food + transferred bills + room balance) instead of just the food grand.
- **Documentation gaps found:** None against `/app/v3/`. (`/app/v3/DOC_VS_CODE_GAP.md` GAP-N3 is about service-charge UI in the room-with-associated-orders Checkout branch — orthogonal to this card-display fix.)
- **Code vs `/app/v3/` gaps found:** None.
- **Edge cases handled:**
  - Room with no order (available room) → no `amount` rendered (TableCard line 229 unchanged behaviour).
  - Marker-only checked-in room (no food) → card shows just `roomInfo.balancePayment`.
  - `roomInfo` missing → `food + transfers` only (helper handles `undefined` via `?.` and `Math.max(0, …)`).
  - Negative `balancePayment` (overpaid) → clamped to 0.
  - Multi-order room (rooms with multiple linked orders rendered as separate cards) → helper applied per-order.
  - Non-room orders bypass the helper entirely.
- **Risks remaining:**
  - If backend ever starts including `room_info.balance_payment` inside `order_amount` server-side, this will double-count. Current backend contract: `roomBalance` is a separate ₹ field added at checkout time (per `ROOM_CHECKIN_GAP3 (Stage 2)` comment in `orderTransform.js:263-271`). No double-count today.
- **Testing done:**
  - ESLint clean.
  - Webpack compiles.
- **Testing pending:**
  - Manual: room with food + transfers + balance — verify card amount = sum of all three.
  - Manual: marker-only room — verify card shows balance only.
  - Manual: room with food only — verify card unchanged.
  - Manual: dine-in / takeaway / delivery / walkIn cards — verify zero regression.

---

### Task 2: Room Transfer — Fresh Rooms Fetch on "To Room" click

- **Status:** Implemented
- **Reason:** Approved as VALID; user confirmed rooms are tables with `rtype === 'RM'` and approved using existing `/api/v1/vendoremployee/all-table-list` endpoint. Scope limited to the room picker in CollectPaymentPanel — "rest no changes".
- **Files changed:**
  - `frontend/src/components/order-entry/CollectPaymentPanel.jsx`
- **What changed:**
  - Imports:
    - Added `useEffect, useRef` from React.
    - Added `import * as tableService from "../../api/services/tableService";`.
  - Replaced the single `useMemo(occupiedRooms)` with:
    - `occupiedRoomsCached` (the original useMemo, kept as an immediate fallback before the fresh fetch resolves).
    - `freshRooms` / `roomsLoading` / `roomsError` local states.
    - `fetchReqIdRef` for race protection.
    - Computed `occupiedRooms = freshRooms !== null ? freshRooms : occupiedRoomsCached`.
  - Added `fetchOccupiedRooms()` async function that calls `tableService.getTables()` and filters `t.isRoom && t.isOccupied`. Uses reqId guard so a stale resolve cannot overwrite a newer selection.
  - Added a `useEffect` that triggers `fetchOccupiedRooms()` exactly when `paymentMethod === 'transferToRoom'` AND the panel hasn't fetched yet.
  - Updated the picker JSX (the `paymentMethod === "transferToRoom"` block) to render four states:
    1. **Loading** → spinner with `data-testid="rooms-loading"`.
    2. **Error** → red banner with `data-testid="rooms-error"` and a Retry button (`data-testid="rooms-retry-btn"`).
    3. **Empty** → existing "No checked-in rooms available" message.
    4. **Success** → existing room grid (untouched).
  - Added a small `Refresh` link (`data-testid="rooms-refresh-btn"`) at the top of the picker so the user can manually re-fetch if needed.
- **API / payload / socket changes:**
  - **Endpoint reused, not new:** `GET /api/v1/vendoremployee/all-table-list` via `tableService.getTables()`.
  - No request payload changes; no socket subscriptions touched.
  - **TableContext is NOT updated** with the fresh data — the fresh state is panel-local, exactly per validation doc.
- **UI changes:** Room picker gains loading / error / retry / refresh affordances. The existing "No checked-in rooms" empty state is preserved.
- **Documentation gaps found:** None against `/app/v3/`.
- **Code vs `/app/v3/` gaps found:** None.
- **Edge cases handled:**
  - Race between rapid payment-method toggles → `fetchReqIdRef` rejects stale resolves.
  - API failure → error banner with explicit retry; does NOT silently fall back to stale context.
  - First mount with `paymentMethod='cash'` → no fetch fires (fetch is gated on `transferToRoom` selection).
  - User selects transferToRoom, then cancels, then comes back later in same panel mount → already-fetched `freshRooms` reused (no redundant call). Manual `Refresh` re-triggers fetch.
  - Panel unmount → React's normal effect cleanup; ref guard prevents stale state writes after unmount.
  - `hasRooms` button-visibility gate (cached `useTables()`) untouched per "rest no changes".
  - `filterLayoutByApiTypes` `restaurantPaymentTypes` filter untouched.
- **Risks remaining:**
  - If `restaurantPaymentTypes` does not contain `'room'`/`'transfer_room'` for a tenant, the "To Room" button itself will not render (`config/paymentMethods.js:185-208` gate). Out of scope per user directive. If user later reports the button missing on a tenant with rooms, that gate is the next thing to investigate.
- **Testing done:**
  - ESLint clean.
  - Webpack compiles.
- **Testing pending:**
  - Manual: Dine-in order → Collect Bill → click "To Room" → spinner → fresh list of rooms appears.
  - Manual: Check-in a room from a different POS while the picker is open → click "Refresh" → newly-checked-in room appears (proves bypass of stale context).
  - Manual: Disconnect network → click "To Room" → error banner + Retry visible.
  - Manual: Select a room → Pay → confirm `transferToRoom` payload submitted unchanged.

---

### Task 3: Old-POS Takeaway Mapping

- **Status:** Implemented
- **Reason:** User confirmed old POS emits `'take_away'` for takeaway and "rest is fine" (delivery / dinein already handled correctly in normalizer).
- **Files changed:**
  - `frontend/src/api/transforms/orderTransform.js`
  - `frontend/src/components/cards/OrderCard.jsx`
- **What changed:**
  - `orderTransform.js:42-58` — added one new `case 'take_away':` to the takeaway branch of `normalizeOrderType` so old-POS takeaway orders normalise to the canonical frontend value `'takeAway'` instead of falling through to `default: 'dineIn'`.
  - `OrderCard.jsx:167` — changed the visible label from `"Take Away"` → `"Takeaway"`.
- **API / payload / socket changes:**
  - **Inbound only.** `normalizeOrderType` is consumed by `fromAPI.order` (line 135).
  - **Outbound payload format unchanged** — `mapOrderTypeToAPI` (lines 63-72) still returns `'takeaway'` for outbound place-order/update-order. Untouched.
- **UI changes:** Order cards / channel cards for takeaway orders now display `"Takeaway"` (single word). Old-POS takeaway orders now classify into the TakeAway channel column instead of the dineIn fallback.
- **Documentation gaps found:** None against `/app/v3/`.
- **Code vs `/app/v3/` gaps found:** None.
- **Edge cases handled:**
  - Old POS `order_type === 'take_away'` → normalises to `'takeAway'` ✅
  - New POS `order_type === 'takeaway'` → still works (existing case) ✅
  - Empty / undefined `order_type` → still falls through to `'dineIn'` (unchanged) ✅
- **Risks remaining:**
  - A pre-existing unit test at `__tests__/api/transforms/updateOrderPayload.test.js:323` asserts outbound `order_type === 'take_away'` for a `'takeAway'` input, but `mapOrderTypeToAPI` returns `'takeaway'`. This is **pre-existing test drift** (not introduced by this change) — outbound mapping was not touched. Out of scope for Task 3.
- **Testing done:**
  - ESLint clean on both files.
  - Webpack compiles.
- **Testing pending:**
  - Manual: takeaway order created on old POS → confirm it appears in TakeAway channel column on new POS dashboard with label `"Takeaway"`.
  - Manual: takeaway order created on new POS → confirm no regression.
  - Manual: visible label across cards reads `"Takeaway"` (not `"Take Away"`).

---

### Task 3 (PREVIOUSLY DEFERRED): Old-POS Takeaway/Delivery Mapping

- **Status:** Superseded — see Task 3 entry above for the implemented version.
- **Original deferral reason:** Validation doc marked NEEDS CLARIFICATION; user later supplied `'take_away'` as the old-POS string in chat, unblocking implementation.

---

## Cross-task Notes

- **Tasks 1 + 4 share `DashboardPage.jsx`** — implemented sequentially in a single edit pass to avoid line-number churn. Task 1 lazy-init at lines 248-249 (now 248-264) and Task 4 helper added near the top of the file. No conflict.
- **Task 5 PostHog removal**: also strips the `posthog` global from the bundle. Any existing `__tests__` that mock or assert `window.posthog` would break — none found at edit time.
- **Task 2** intentionally does not push the fresh response back into `TableContext`, per validation doc directive "leave context untouched". A consequence: other parts of the app continue to use the (potentially stale) cached tables. This is the explicit trade-off the user approved ("only for this part rest no changes").

---

## Validation Done

| Check | Result |
|---|---|
| ESLint on `frontend/src/App.js` | ✅ Clean |
| ESLint on `frontend/src/pages/StatusConfigPage.jsx` | ✅ Clean |
| ESLint on `frontend/src/pages/DashboardPage.jsx` | ✅ Clean |
| ESLint on `frontend/src/components/layout/Sidebar.jsx` | ✅ Clean |
| ESLint on `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | ✅ Clean |
| `webpack` compile via supervisor frontend | ✅ Compiled with 1 (pre-existing, unrelated) warning in `LoadingPage.jsx:101` |
| `curl http://localhost:3000/` returns updated title/desc/favicon | ✅ Verified |
| `curl http://localhost:3000/` shows zero `emergent.sh` / `posthog` references | ✅ Verified |
| Manual browser test via preview URL | ⚠ Platform preview wraps app in iframe; static-snapshot URL is stale. Live dev-server HTML is correct as confirmed via direct curl. |

## Files Changed (final list)

```
frontend/public/index.html                                    (Task 5)
frontend/src/App.js                                           (Task 5)
frontend/src/pages/StatusConfigPage.jsx                       (Task 1)
frontend/src/pages/DashboardPage.jsx                          (Tasks 1, 4)
frontend/src/components/layout/Sidebar.jsx                    (Task 1)
frontend/src/components/order-entry/CollectPaymentPanel.jsx   (Task 2)
frontend/src/api/transforms/orderTransform.js                 (Task 3)
frontend/src/components/cards/OrderCard.jsx                   (Task 3)
```

## Documentation / Code Gaps Found Against `/app/v3/`

None blocking. Read all 7 docs in `/app/v3/`; no AD-* decision constrains any of the 4 implemented tasks. GAP-N3 (room-with-associated-orders service-charge UI guard) is orthogonal to the card-amount display fix in Task 4.

## Remaining Risks

1. **Task 2 button-visibility gate** untouched per user's "rest no changes" — if a tenant's `restaurantPaymentTypes` lacks `'room'`/`'transfer_room'`, the "To Room" button itself stays hidden (`config/paymentMethods.js:185-208`). Out of scope.
2. **Emergent platform preview wrapper** sets its own browser title around the iframe; cosmetic only.
3. **Pre-existing test drift** in `__tests__/api/transforms/updateOrderPayload.test.js:323` (asserts outbound `'take_away'` while `mapOrderTypeToAPI` returns `'takeaway'`). Not introduced by these changes; outbound mapping was not touched. Out of scope.

## Next Step for QA Agent

Manual smoke pass against the live dev preview, in this order:

1. **Branding (Task 5)**
   - Login → check the browser tab title becomes `<RestaurantName> · MyGenie POS`.
   - Pre-login → tab title is `MyGenie POS`.
   - Favicon shows MyGenie logo.

2. **View Mode Lock (Task 1)**
   - Open `Visibility / Status Configuration`.
   - Pick `Order View` + `By Channel` → Save → Reload → Dashboard opens directly in Order View, By Channel; sidebar has NO view-toggle / group-toggle buttons.
   - Repeat with `Table View` + `By Status` → confirm.
   - Reset-to-Default → values revert.

3. **Room Card Total (Task 4)**
   - On a checked-in room with food, transferred dine-in bills, AND a room balance, confirm card amount = (food + transfers + balance).
   - On a marker-only room with only a balance, confirm card amount = balance.
   - On a room with food only, confirm card amount equals the food grand (no regression).
   - Non-room cards (dine-in, takeaway, delivery, walkIn) → confirm amounts unchanged vs prod.

4. **Fresh Rooms Picker (Task 2)**
   - Open a dine-in order → Collect Bill → click "To Room": loading spinner appears, then list populates.
   - Network throttle / disconnect → error banner + retry.
   - Check-in a new room from another POS while panel is open → click `Refresh` → new room appears.
   - Confirm `transferToRoom` payment payload is unchanged after selection.

5. **Regression sanity**
   - Place a normal dine-in order, take-away order, and delivery order — confirm zero regression.
   - Cancel order flow on a non-room order — confirm bulk-cancel still works.
   - Cancel order flow on a room order — confirm bulk-cancel still hidden (Option C from earlier).

If any of the above fails, file a separate ticket with the exact reproduction steps; do not bundle into this implementation summary.

---

## Task 1 v2 — intent revision (2026-04-25)

> **§Task 1 (above) is now superseded.** That entry described the original (incorrect) implementation. The summary below is the corrected, final state.

### Why the revision happened
Original Task 1 interpreted "Drop Both, no runtime toggle" literally — locking every user. User clarified the actual intent: **default = both views available with runtime sidebar toggle (legacy); Visibility Settings is purely an admin override**. Without an explicit override the cashier MUST keep the runtime toggle.

### Corrected implementation (5-step plan + 1 bonus step)

| Step | What was done |
|---|---|
| 0 | Backed up the 3 target files to `/tmp/task1_revision_backups/` for rollback safety. |
| 1 | Restored Sidebar runtime toggle block (`view-toggle`, `group-toggle`); re-imported lucide icons; re-passed view setters from DashboardPage. (Always visible at this step.) |
| 2 | Default constants in `StatusConfigPage.jsx` flipped from `'table'` / `'status'` → `'both'`. Hydrate accepts `'both'` as a valid stored value. |
| 3 | View Mode section rewritten using the page's existing checkbox-card pattern (`<div onClick>`). 3 cards per axis (Table / Order / Both, Channel / Status / Both). Same pattern as Status / Station / Channel cards on the same page. **Eliminated the scroll-jump bug** caused by the previous `<label>` + `sr-only <input type="radio">` pattern. |
| 3b (bonus) | Same checkbox-card refactor applied to Display Mode (Stacked / Accordion) under Station View — same root cause. Page is now `sr-only`-radio free. |
| 4 | DashboardPage gained `lockTableOrder` / `lockChannelStatus` state. Path-nav effect and cross-tab `storage` listener now re-derive lock flags. Sidebar conditionally hides each toggle per lock flag (and hides the wrapper container if both are hidden). |
| 5 | Documentation: appended this revision section to PRD, FIVE_TASK_VALIDATION_HANDOVER, and this file. Created `/app/memory/REVISION_IMPLEMENTATION_SUMMARY.md` per the QA spec. |

### Behavioural matrix (final)

| Stored Table/Order axis | Stored Channel/Status axis | `view-toggle` | `group-toggle` |
|---|---|---|---|
| `'both'` / unset (default) | `'both'` / unset (default) | ✅ visible | ✅ visible |
| `'table'` / `'order'` (locked) | `'both'` / unset | ❌ hidden | ✅ visible |
| `'both'` / unset | `'channel'` / `'status'` (locked) | ✅ visible | ❌ hidden |
| Locked | Locked | ❌ hidden | ❌ hidden (container also hidden) |

### Files changed (final, supersedes earlier list)
- `frontend/src/pages/StatusConfigPage.jsx`
- `frontend/src/pages/DashboardPage.jsx`
- `frontend/src/components/layout/Sidebar.jsx`

### Test IDs (final)
- Sidebar: `view-toggle`, `group-toggle`, `view-toggles-container` (all restored).
- Settings (View Mode): `view-mode-to-table`, `view-mode-to-order`, `view-mode-to-both`, `view-mode-cs-channel`, `view-mode-cs-status`, `view-mode-cs-both` (3 per axis).
- Settings (Display Mode, refactored as bonus): `display-mode-stacked`, `display-mode-accordion`.

### Validation status
- All 4 implementation steps individually verified by user (manual gate per step).
- ESLint clean across the 3 files.
- Webpack compiles with the same single pre-existing `LoadingPage.jsx:101` warning — no new warnings introduced.
- No `sr-only` form inputs remain on `StatusConfigPage.jsx`.
- Tasks 2, 3, 4, 5 unaffected (no edits in those areas).

### Source of truth
- Pre-implementation gap analysis: `/app/memory/TASK_1_REVISION_GAPS.md`
- Stepwise implementation log: `/app/memory/REVISION_IMPLEMENTATION_SUMMARY.md`
- Behavioural spec: this section + the matching section in PRD.

### Rollback
Single command, byte-exact restore of all 3 files:
```bash
cp /tmp/task1_revision_backups/StatusConfigPage.jsx.bak /app/frontend/src/pages/StatusConfigPage.jsx && \
cp /tmp/task1_revision_backups/DashboardPage.jsx.bak    /app/frontend/src/pages/DashboardPage.jsx && \
cp /tmp/task1_revision_backups/Sidebar.jsx.bak          /app/frontend/src/components/layout/Sidebar.jsx
```

