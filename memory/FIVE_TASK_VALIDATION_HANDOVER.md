# Five Task Validation & Implementation Handover

> Source: validation pass on `roomv2` branch (commit `10ed08e`) of `core-pos-front-end-`. Read-only. No code changes by this agent.
> Audience: next Implementation Agent.

---

## 1. Executive Summary

| Metric | Value |
|---|---|
| Total tasks reviewed | 5 |
| Valid tasks | 4 (Tasks 1, 2, 4, 5) |
| Partially valid tasks | 0 |
| Tasks needing clarification | 1 (Task 3 — waiting for old-POS payload sample from user) |
| Tasks already working / not valid | 0 |
| Overall implementation risk | **Low–Medium**. All five tasks are scoped to the frontend; no backend changes required. Task 2 has a runtime dependency on the existing `/all-table-list` endpoint behaving the same way under the proxy. Task 3 is blocked on a payload sample. |
| Recommended implementation order | **5 → 1 → 4 → 2 → 3** (rationale in §4) |

User-confirmed scope (paraphrased from chat clarifications):
- **Task 1**: drop the "Both" option; user picks exactly one mode per axis; remove the runtime sidebar toggle entirely.
- **Task 2**: read fresh rooms from API on demand (rooms = tables with `rtype === 'RM'`). Use existing `/api/v1/vendoremployee/all-table-list` (re-confirmed: rooms live in the same list as tables).
- **Task 3**: hold for sample payload from user.
- **Task 4**: room-only fix; do not break non-room calculation.
- **Task 5**: full Emergent-branding strip; PostHog block — pending user confirmation in chat (recommend remove). Favicon = MyGenie logo via `GENIE_LOGO_URL`.

---

## 2. Task-wise Validation

### Task 1: Visibility View Configuration — single-mode lock per axis

#### User Requirement
In Visibility Settings → Status Configuration, allow the user to pre-select **exactly one** view per axis (no "Both", no runtime toggle):
- Axis A — Table View **or** Order View
- Axis B — Channel View **or** Status View

The dashboard then renders only the chosen view; the existing dual sidebar toggles disappear.

#### Current Code Behaviour
- `pages/StatusConfigPage.jsx` is the Visibility/Status Configuration screen. It already manages 5 localStorage configs (statuses, station view, channel visibility, table layout, order layout). No "view-mode" config exists today.
- `pages/DashboardPage.jsx:248-249` holds runtime view state:
  ```js
  const [activeView, setActiveView] = useState("table");        // table | order
  const [dashboardView, setDashboardView] = useState("status"); // channel | status
  ```
- `components/layout/Sidebar.jsx:285-337` unconditionally renders both view-toggle buttons (`view-toggle`, `group-toggle`) when the parent passes `activeView` and `dashboardView`.
- `components/layout/Header.jsx:212-260` swaps filter pills (Channel pills vs Status pills) based on `dashboardView`.

#### Expected Behaviour
- Two new radio-card blocks in StatusConfigPage save the user's single-pick choice to localStorage.
- DashboardPage reads those keys at first render and **locks** `activeView`/`dashboardView` to the saved value.
- Sidebar's two toggle buttons are removed (or hidden) — no runtime switch.
- Header filter pills continue to swap based on `dashboardView`'s locked value (no logic change).

#### Validation Status
**VALID**.

#### Files / Modules Involved
| File | Lines (current) | Role |
|---|---|---|
| `pages/StatusConfigPage.jsx` | 1-891 (esp. 9-21, 22-24, 92-105, 107-163, 200-205, 299-311, 519-581, 636-722) | Add 2 storage keys, defaults, load/save, reset, and 2 radio-card sections |
| `pages/DashboardPage.jsx` | 248-249, 679-680, 1092-1093, 1129-1132 | Read both keys on mount, set initial state from them |
| `components/layout/Sidebar.jsx` | 123-124 (props), 285-337 (render block) | Remove the View Toggle Section block |
| `components/layout/Header.jsx` | 40-43 (props), 209-261 (filter swap logic) | No code change; pills still drive off `dashboardView` value |

#### API / Payload / Socket Impact
None. Pure frontend localStorage.

#### UI Impact
- New section in StatusConfigPage between "Channel Visibility" (lines 636-722) and "Default Column Layout" (lines 724-865), reusing the existing radio-card pattern at lines 519-581.
- Sidebar loses two buttons (`data-testid="view-toggle"`, `data-testid="group-toggle"`).

#### Implementation Guidance
1. Add localStorage keys (recommend prefix matches existing convention):
   ```js
   const VIEW_MODE_TABLE_ORDER_KEY    = 'mygenie_view_mode_table_order';     // 'table' | 'order'
   const VIEW_MODE_CHANNEL_STATUS_KEY = 'mygenie_view_mode_channel_status';  // 'channel' | 'status'
   const DEFAULT_VIEW_MODE_TO         = 'table';
   const DEFAULT_VIEW_MODE_CS         = 'status';
   ```
   Defaults match today's `useState` defaults to preserve behaviour for users with no saved value.
2. In StatusConfigPage:
   - Add two radio-card blocks (2 cards each, NO "Both"). Reuse the existing `displayMode` radio-card markup (lines 519-581) — keep visual consistency.
   - Wire into existing `saveConfiguration` (line 300) and `resetToDefault` (line 199).
3. In DashboardPage:
   - Replace `useState("table")` / `useState("status")` with a single lazy-init reading from localStorage with the defaults above. Wrap in `try/catch` per the precedent at lines 107-162.
   - Keep `setActiveView`/`setDashboardView` exported props for now (Header still receives them) but they become effectively unused at runtime.
4. In Sidebar:
   - **Remove** the entire "View Toggle Section" block (lines 285-337). Do NOT keep dead JSX hidden by CSS — clean removal.
   - Remove the `dashboardView`/`setDashboardView`/`activeView`/`setActiveView` props if no other Sidebar logic consumes them (verify with grep before pruning prop list — currently used only inside the removed block).
5. Search and remove any test files referencing `data-testid="view-toggle"` or `data-testid="group-toggle"` (search `__tests__`).

#### Edge Cases
- Existing users with no saved keys → defaults kick in → behaviour identical to today.
- localStorage corruption → `try/catch` keeps fall-back to default (mirror lines 107-162 pattern).
- Restaurant features hide a channel (e.g., no rooms) → no impact; channel-pill filter at Header.jsx:66 already filters by `featureChannelMap`.
- Status filter pills enabled-list interaction (StatusConfigPage's existing `enabledStatuses`) is orthogonal — Test both views with a partial enabled-list to confirm.

#### Risk Level
**Low**. Localised to StatusConfigPage + Sidebar + initial state in DashboardPage. No data-flow touched.

---

### Task 2: Room Transfer from Collect Bill — fetch fresh rooms via API

#### User Requirement
When the user clicks "To Room" in the Collect Bill / Collect Payment panel, the room picker must show **freshly fetched** checked-in rooms — not the cached value from `useTables()` context — because socket updates from external POS clients (old POS, other devices) do not always reach this client, leaving the cached list stale.

User clarification (verbatim): *"room is just table — table rtype RM"* and *"only for this part rest no changes"*.

#### Current Code Behaviour
- `components/order-entry/CollectPaymentPanel.jsx:115-119`:
  ```js
  const occupiedRooms = useMemo(() =>
    (tables || []).filter(t => t.isRoom && t.isOccupied),
    [tables]
  );
  ```
  `tables` comes from `useTables()` (`contexts/TableContext.jsx:262-268`).
- `TableContext` is hydrated **once** at LoadingPage from `tableService.getTables()` (`api/services/tableService.js:11`), which calls `/api/v1/vendoremployee/all-table-list` (`api/constants.js:19`). After that it only mutates via socket events (`updateTableStatus` at `TableContext.jsx:94-136`).
- The room picker JSX at `CollectPaymentPanel.jsx:1857-1887` reads `occupiedRooms` and falls back to **"No checked-in rooms available"** (line 1862) when the array is empty.
- Button visibility gate (independent): `filterLayoutByApiTypes` in `config/paymentMethods.js:185-208` gates `transferToRoom` button on `hasRooms && (apiPaymentTypes contains 'room' OR fallback)`. `hasRooms` is also computed off the cached `tables` (CollectPaymentPanel.jsx:35-38).

#### Expected Behaviour
- The moment the user selects `paymentMethod === 'transferToRoom'`, fire a fresh GET `/api/v1/vendoremployee/all-table-list` and use the response (filtered to `rtype === 'RM' && engage === 'Yes'`, i.e., `isRoom && isOccupied` after `tableTransform`) as the source of truth for the picker.
- Loading spinner inside the picker while the call is in flight.
- Clear error + retry button on failure.
- Do **not** mutate `TableContext`; result is panel-local state.
- Everything else (button gate, payload, selection flow) stays untouched.

#### Validation Status
**VALID**. User confirmed the source: rooms ARE tables with `rtype === 'RM'`, so the existing `/all-table-list` endpoint is the right call. No new endpoint needed.

#### Files / Modules Involved
| File | Lines (current) | Role |
|---|---|---|
| `components/order-entry/CollectPaymentPanel.jsx` | 28 (`useTables`), 35-38 (`hasRooms`), 115-119 (`occupiedRooms`), 120 (`selectedRoom`), 1857-1887 (picker JSX) | Replace `useMemo(occupiedRooms)` with on-demand fetch + local state |
| `api/services/tableService.js` | 11-30 (`getTables`) | Reuse as-is — already calls `/all-table-list` and runs `tableTransform.fromAPI.tableList` |
| `api/transforms/tableTransform.js` | 17-76 (`fromAPI.table`) | No change. `isRoom = api.rtype === 'RM'` (line 58), `isOccupied = toBoolean(api.engage)` (line 50) — already correct. |
| `api/constants.js` | 19 (`TABLES: '/api/v1/vendoremployee/all-table-list'`) | No change |
| `contexts/TableContext.jsx` | (entire file) | **Do not modify**. Stays as-is. |

#### API / Payload / Socket Impact
- **Endpoint**: `GET /api/v1/vendoremployee/all-table-list` (existing).
- **Headers**: `Authorization: Bearer <vendoremployee_token>` (already wired by axios interceptor in `api/client.js`).
- **Response shape**: array of objects with at least `id`, `table_no`, `rtype`, `engage` (`'Yes'`/`'No'`), `title`, `status`. Already transformed by `tableTransform.fromAPI.tableList`.
- **Filter to apply on response**:
  ```js
  freshOccupiedRooms = response.filter(t => t.isRoom && t.isOccupied);
  ```
- **Socket**: do NOT subscribe to anything new. The whole point of this fix is to bypass stale socket-driven context state.

#### UI Impact
- Picker section at `CollectPaymentPanel.jsx:1857-1887` gains 3 visual states:
  1. **Loading**: spinner + "Loading rooms…" text.
  2. **Error**: red banner "Couldn't load rooms — Retry" with a retry button.
  3. **Success / empty**: existing grid of room cards or the existing "No checked-in rooms available" message.

#### Implementation Guidance
1. In `CollectPaymentPanel.jsx`, add three local states near line 120:
   ```js
   const [freshRooms, setFreshRooms] = useState(null); // null = not loaded
   const [roomsLoading, setRoomsLoading] = useState(false);
   const [roomsError, setRoomsError] = useState(null);
   ```
2. Replace the `useMemo(occupiedRooms)` (lines 115-119) with a `useEffect` that fires when:
   - `paymentMethod === 'transferToRoom'` AND
   - `freshRooms === null` AND
   - `!roomsLoading`.
3. Inside, call `tableService.getTables()`, filter `isRoom && isOccupied`, store in `freshRooms`. On error, set `roomsError`.
4. The picker JSX (line 1861) reads from `freshRooms ?? []` instead of `occupiedRooms`. Render loading/error/empty/success branches.
5. Add a "Retry" handler that resets `freshRooms` to `null` and re-triggers the effect.
6. **Leave** the button-visibility gate (`hasRooms` from cached context, `filterLayoutByApiTypes`). Per user: "only for this part, rest no changes".
7. **Leave** `TableContext` untouched. The fresh fetch is panel-local; do not wire it back into context.
8. **Cache lifetime**: hold `freshRooms` for the lifetime of this `CollectPaymentPanel` mount. If user backs out and re-enters, refetch — that's correct behaviour because the user explicitly re-engaged.

#### Edge Cases
- API returns 401/403 (token expired) → show "Session expired — please re-login" via existing toast pattern; do not silently fall back to context.
- API returns empty array → show existing "No checked-in rooms available" message (current behaviour).
- API returns rooms but `engage` field is non-standard (e.g., `1`/`0`) → already handled by `toBoolean` (`tableTransform.js:8-12` + `YES_NO_MAP` in `api/constants.js:203-210`).
- User toggles between payment methods rapidly → in-flight request should be cancellable (use an `aborted` ref or AbortController). Otherwise allow stale resolves to no-op via the ref.
- Self-transfer protection — if the source order itself is a room (rare for "transfer to room" flow), exclude `currentTable.tableId` from the picker. Already absent today; leave that gap unless user reports.

#### Risk Level
**Low–Medium**. The endpoint is already in production. The only architectural deviation is bypassing context, which the user explicitly requested.

---

### Task 3: Old-POS Takeaway Order Mapping — normalize incoming `order_type`

#### User Requirement
Orders created on the **old POS** show up on the new POS with an unexpected/wrong order-type label (user described it as `"take away"`). Normalize the incoming value so the new POS classifies and displays them correctly.

User said they will share the exact `order_type` strings old POS emits for **takeaway** and **delivery**.

#### Current Code Behaviour
- `api/transforms/orderTransform.js:42-58` (`normalizeOrderType`):
  ```js
  switch (orderType) {
    case ORDER_TYPES.POS:
    case ORDER_TYPES.DINE_IN:
    case ORDER_TYPES.WALK_IN:
    case 'dinein':                    return 'dineIn';
    case ORDER_TYPES.TAKE_AWAY:       // 'takeaway'
    case 'takeaway':                  return 'takeAway';
    case ORDER_TYPES.DELIVERY:        // 'delivery'
    case 'delivery':                  return 'delivery';
    default:                          return 'dineIn';
  }
  ```
  → Strict, case-sensitive matching. Any of `'take away'`, `'take_away'`, `'TakeAway'`, `'Take Away'` falls through to `default` → mis-classified as `dineIn`.
- `api/transforms/reportTransform.js:209-211` already deals with a `'take_away'` variant for the reports endpoint:
  ```js
  api.order_type === 'take_away' ? 'takeaway' : null
  ```
- User-facing label is hard-coded in `components/cards/OrderCard.jsx:167`:
  ```js
  if (isTakeAway) return "Take Away";
  ```
  User wants this displayed as `"Takeaway"`.

#### Expected Behaviour
- Inbound `order_type` from any POS (old or new) is canonicalised to one of the four frontend values: `'dineIn' | 'takeAway' | 'delivery' | 'room'`.
- The visible label across the app reads `Takeaway` (single word).

#### Validation Status
**NEEDS CLARIFICATION**. User must share the actual `order_type` value old POS sends for **takeaway** and **delivery** before the parser can be authoritatively extended. Without this, any guess (e.g., `'take_away'`, `'take away'`) is speculation.

#### Files / Modules Involved
| File | Lines | Role |
|---|---|---|
| `api/transforms/orderTransform.js` | 42-58 (`normalizeOrderType`) | Extend switch / replace with normalised lookup |
| `api/constants.js` | 179-185 (`ORDER_TYPES`) | (Optional) add `OLD_POS_TAKE_AWAY` constant for documentation. Recommend NOT touching unless old POS uses a stable string. |
| `components/cards/OrderCard.jsx` | 167 | `"Take Away"` → `"Takeaway"` |
| (Optional) `pages/StatusConfigPage.jsx` | 44 | Cosmetic: `"TakeAway"` label → `"Takeaway"`. Channel id `'takeAway'` MUST stay. |
| (Optional) `components/layout/Header.jsx` | 12 | Same cosmetic alignment. |
| `__tests__/api/transforms/updateOrderPayload.test.js` | 323 | Verify outbound assertion (`order_type === 'take_away'`) is unaffected. Outbound `mapOrderTypeToAPI` (`orderTransform.js:63-72`) is **not** to be touched. |

#### API / Payload / Socket Impact
- **Inbound only** — `order_type` field on the running-orders endpoint and socket frames.
- **Outbound payload format must NOT change** — `mapOrderTypeToAPI` (line 63-72) returns `'takeaway'` for placeOrder/updateOrder. Backend contract unchanged.

#### UI Impact
- Order cards / table cards / channel labels for takeaway orders now consistently say `"Takeaway"`.
- Old-POS takeaway orders no longer fall through to dine-in classification → they show in the correct channel column on dashboard, with the takeaway icon (`ShoppingBag`) instead of dine-in icon.

#### Implementation Guidance
**Wait for user-supplied sample** before coding. Once received:
1. Convert `normalizeOrderType` to a normalised-key lookup so casing / spacing / underscores don't matter:
   ```js
   const normalizeOrderType = (orderType) => {
     const key = String(orderType || '').toLowerCase().replace(/[^a-z]/g, '');
     // matches 'takeaway', 'TakeAway', 'take away', 'take_away', 'TAKE-AWAY' all → 'takeaway'
     switch (key) {
       case 'takeaway':                                 return 'takeAway';
       case 'delivery':                                 return 'delivery';
       case 'room':                                     return 'dineIn'; // rooms use isRoom flag, not orderType
       case 'dinein':
       case 'walkin':
       case 'pos':
       default:                                         return 'dineIn';
     }
   };
   ```
2. Confirm against user-supplied old-POS sample — if they emit something exotic like `"TAKEOUT"` or a numeric code, add an explicit case.
3. Change `OrderCard.jsx:167` from `"Take Away"` → `"Takeaway"`.
4. Run all `__tests__/api/transforms/*.test.js` — outbound mapping must remain green.

#### Edge Cases
- Old POS sends a `channel` or `order_for` field instead of/alongside `order_type` — verify against sample. If so, `fromAPI.order` (around `orderTransform.js:135`) must consult both.
- Numeric / enum values (e.g., `2` for takeaway) — current parser doesn't handle. Confirm with sample.
- Reports view (`reportTransform.js:209-211, 399`) parses takeaway separately — check whether it should also be unified via the same helper.
- Existing tests: `__tests__/api/transforms/orderTransformFinancials.test.js` and the `updateOrderPayload.test.js:323` assertion on outbound `'take_away'` — outbound is **not** in scope; do not touch.

#### Risk Level
**Low** (change is a tightening of one switch + one label). Becomes Medium if old POS uses a non-string value (numeric enum) — a separate code path.

---

### Task 4: Table/Order Card Total for Room Orders — include room price + transferred food

#### User Requirement
The price shown on the dashboard card for a **room** order must include:
- the room booking outstanding balance (room price minus advance),
- transferred dine-in/walk-in bills attached to the room,
- the room-service food on the room order itself.

User clarification (verbatim): *"only for room — ensure this doesn't break current calculation."*

#### Current Code Behaviour
- `components/cards/TableCard.jsx:229-230` renders the raw `table.amount`:
  ```jsx
  ) : table.amount ? (
    <span className="text-xs font-semibold flex-shrink-0">{currencySymbol}{table.amount.toLocaleString()}</span>
  ```
- For room orders, `table.amount` comes from `pages/DashboardPage.jsx:431`:
  ```js
  amount: order.amount,
  ```
  …which traces to `order.amount = parseFloat(api.order_amount) || 0` in `api/transforms/orderTransform.js:183`. This is the **food/room-service grand only** — it does NOT include `roomInfo.balancePayment` nor the sum of `associatedOrders[*].amount`.
- Both missing components are already hydrated on the order object:
  - `associatedOrders` at `orderTransform.js:248-261` (each entry has `.amount`).
  - `roomInfo` at `orderTransform.js:272-276` (with `balancePayment`).
- The Checkout panel already does the correct math at `CollectPaymentPanel.jsx:355`:
  ```js
  effectiveTotal =
      (associatedOrders.length > 0 ? finalTotal + associatedTotal : finalTotal)
    + roomBalance;
  ```

#### Expected Behaviour
For room orders **only**, the card amount equals:
```
cardAmount = (order.amount || 0)
           + Σ associatedOrders[].amount
           + max(0, roomInfo.balancePayment || 0)
```
For non-room orders → unchanged (`order.amount`).

#### Validation Status
**VALID**. Both missing components are already on the order object — no backend dependency.

#### Files / Modules Involved
| File | Lines | Role |
|---|---|---|
| `pages/DashboardPage.jsx` | 404-441 (`allRoomsList`), and the room branch around 540-580 (`channelData` adapter) | Replace `amount: order.amount` with computed `cardAmount` for room orders only |
| `api/transforms/orderTransform.js` | 248-261, 272-276, 183 | No change. Already hydrates the needed fields. |
| `components/cards/TableCard.jsx` | 229-230 | No change. Keeps reading `table.amount`. |
| `components/order-entry/CollectPaymentPanel.jsx` | 355 (`effectiveTotal`) | No change. Keep checkout math intact. |

#### API / Payload / Socket Impact
None. All required fields already in the existing order payload (`api.room_info`, `api.associated_order_list`).

#### UI Impact
- Card numeric amount for **rooms only** changes — increases by the missing components when present.
- Empty rooms (no order yet) → still no amount rendered (lines 414-422 unchanged).
- Non-room cards → identical to today.

#### Implementation Guidance
1. Inline a small helper at the top of `DashboardPage.jsx` (or near the room mapping block):
   ```js
   const computeRoomCardAmount = (order) => {
     const food = Number(order?.amount) || 0;
     const transfers = (order?.associatedOrders || [])
       .reduce((s, o) => s + (Number(o?.amount) || 0), 0);
     const roomBal = Math.max(0, Number(order?.roomInfo?.balancePayment) || 0);
     return food + transfers + roomBal;
   };
   ```
2. At line 431 (`allRoomsList` mapping), replace:
   ```js
   amount: order.amount,
   ```
   with:
   ```js
   amount: computeRoomCardAmount(order),
   ```
3. Repeat at the equivalent line in the `channelData` room adapter (search for the second occurrence within the room branch around lines 540-580 — there are several `amount: order.amount` lines for non-room types; only update the **room** one).
4. **Do not** modify `CollectPaymentPanel.effectiveTotal` (line 355) — it already produces the correct grand total at checkout.
5. **Do not** modify backend payload assembly (`order_amount`, `grand_total`) — out of scope.
6. **Do not** touch non-room mappings — wrap the helper invocation behind `isRoom`.

#### Edge Cases
| Scenario | Expected card amount |
|---|---|
| Available room (no order) | nothing rendered (TableCard.jsx:225 fallback unchanged) |
| Checked-in room, marker only (no food) | `roomInfo.balancePayment` |
| Room with food only | `order.amount` (= today, no regression) |
| Room with transfers only + balance | `Σ transfers + balance` |
| Room with food + transfers + balance | `food + Σ transfers + balance` |
| Non-room order | `order.amount` (unchanged) |
| `roomInfo.balancePayment` is negative (overpaid) | clamped to 0 by `Math.max(0, …)` |
| Room with multiple linked orders rendered as separate cards (lines 424-441 multi-order case) | Each card shows its own order's contribution; ensure helper applied per `order`, not aggregated. |

#### Risk Level
**Low**. Confined to two `amount:` assignments in one file; helper is pure; non-room paths bypass entirely.

---

### Task 5: Remove Emergent Branding

#### User Requirement
Strip Emergent default branding from:
- Browser title
- Favicon
- Manifest
- index.html meta tags
- Default app name
- Any visible frontend place where Emergent is shown

Replace with **MyGenie branding** (favicon = MyGenie logo from `GENIE_LOGO_URL`).

#### Current Code Behaviour
| File | Line | Content |
|---|---|---|
| `public/index.html` | 7 | `<meta name="description" content="A product of emergent.sh" />` |
| `public/index.html` | 24 | `<title>Emergent \| Fullstack App</title>` |
| `public/index.html` | 26 | `<script src="https://assets.emergent.sh/scripts/emergent-main.js"></script>` |
| `public/index.html` | 41-111 | PostHog init block with hardcoded key `phc_xAvL2Iq4tFmANRE7kzbKwaSqp1HJjN7x48s3vr0CMjs` (sends to Emergent's PostHog instance, not the customer's) |
| `public/` (folder) | — | **No `favicon.ico`** present; **no `manifest.json`** present |
| `src/constants/colors.js` | 21-22 | `LOGO_URL` and `GENIE_LOGO_URL` hosted on `customer-assets.emergentagent.com` (CDN — assets are MyGenie's, only the CDN domain says emergent). Considered safe to leave. |

`document.title` is never set programmatically anywhere in the app today (grep confirmed).

#### Expected Behaviour
- Browser tab title: `MyGenie POS` (static fallback). Optionally dynamic: `{restaurant.name} · MyGenie POS` once `RestaurantContext` resolves.
- Meta description: a MyGenie-appropriate one-liner.
- Favicon: MyGenie logo SVG via `<link rel="icon">`.
- No reference to `emergent.sh` / `assets.emergent.sh` anywhere in the rendered HTML head.
- (Pending user confirmation in chat) Remove PostHog init block + `emergent-main.js` script tag.

#### Validation Status
**VALID** (with one minor pending confirmation already requested in chat: PostHog removal). Even without that confirmation, the title/description/favicon work is unblocked.

#### Files / Modules Involved
| File | Lines | Role |
|---|---|---|
| `public/index.html` | 5-26 (head), 41-111 (PostHog) | Title, description, favicon link, script removals |
| `src/App.js` | (need to view) | Add `useEffect` for dynamic `document.title` once restaurant resolves |
| `src/contexts/RestaurantContext.jsx` | exposes `restaurant` (with `.name`) | Read-only — no change |
| `src/constants/colors.js` | 21-22 (`GENIE_LOGO_URL`) | Reference URL for `<link rel="icon">` — no change to constant |

#### API / Payload / Socket Impact
None.

#### UI Impact
- Browser tab shows `MyGenie POS` (or restaurant-specific name).
- Browser tab favicon shows MyGenie logo instead of default Chrome globe.
- HTML `<head>` no longer references `emergent.sh`.

#### Implementation Guidance
1. **`public/index.html`**:
   - Line 7: replace description with
     `<meta name="description" content="MyGenie restaurant point-of-sale" />`
   - Line 24: replace title with `<title>MyGenie POS</title>`
   - Add right after the title (or in `<head>`):
     ```html
     <link rel="icon" type="image/svg+xml" href="https://customer-assets.emergentagent.com/job_react-pos-phase1/artifacts/dwikbb41_logo111.svg" />
     ```
     (Same URL as `GENIE_LOGO_URL` constant — keeps single source of truth.)
   - Line 26 (`<script src="https://assets.emergent.sh/scripts/emergent-main.js">`): **remove** (pending user confirm — recommend remove).
   - Lines 41-111 (PostHog block): **remove** (pending user confirm — recommend remove; key belongs to Emergent).
2. **`src/App.js`**: add a `useEffect` that depends on `restaurant?.name` and sets `document.title`:
   ```js
   useEffect(() => {
     document.title = restaurant?.name ? `${restaurant.name} · MyGenie POS` : 'MyGenie POS';
   }, [restaurant?.name]);
   ```
   (View the file before editing to find the right place — `useRestaurant()` may need to be added if not already imported.)
3. **Do NOT** touch `src/constants/colors.js` (LOGO_URL / GENIE_LOGO_URL are hosted on Emergent's CDN domain but the *content* is MyGenie's; renaming or moving is out of scope).
4. **Do NOT** add a new `manifest.json` unless user requests PWA support — CRA build doesn't require it.

#### Edge Cases
- Restaurant context never resolves (offline / login screen) → static fallback `MyGenie POS` applies (the `?? 'MyGenie POS'` branch).
- SVG favicon not supported by very old browsers (IE11) → not in supported matrix per `package.json` browserslist; ignore.
- PostHog removal causes any analytics dashboard the customer was watching to go quiet → confirm with user before removing (pending).

#### Risk Level
**Low**. Cosmetic + meta. No app-logic touch points.

---

## 3. Cross-task Dependencies

| Pair | Dependency | Note |
|---|---|---|
| Task 1 ↔ Task 2 | None | Independent files (`StatusConfigPage`/`Sidebar` vs `CollectPaymentPanel`). |
| Task 1 ↔ Task 4 | Indirect: both touch `DashboardPage.jsx` | Same file, different lines (state init lines 248-249 vs room mapping lines 404-441). Sequential merges fine. |
| Task 2 ↔ Task 4 | Indirect: both deal with room data, but in different components | Task 4 keeps using cached context (`order.amount`, `order.roomInfo`); Task 2 bypasses context only for the picker. No conflict. |
| Task 3 ↔ Task 4 | None | Order-type normalisation is independent of price math. |
| Task 3 ↔ Task 1 | Indirect cosmetic: both reference `'TakeAway'` label | If Task 3 includes the optional cosmetic alignment (`StatusConfigPage:44`, `Header:12`), Task 1 should be merged first to avoid line-number churn in StatusConfigPage. |
| Task 5 ↔ all | None | Pure HTML/meta scope. |

---

## 4. Recommended Implementation Order

| # | Task | Why this position |
|---|---|---|
| 1 | **Task 5** (branding) | Smallest blast radius; HTML/meta only; gives an immediate visible deliverable. |
| 2 | **Task 1** (view-mode lock) | Localised; touches StatusConfigPage + Sidebar + DashboardPage state init. Clears the way before Task 4 changes the same DashboardPage file. |
| 3 | **Task 4** (room card total) | Same file as Task 1 (`DashboardPage.jsx`), different region. Sequential merge avoids conflict. |
| 4 | **Task 2** (fresh rooms fetch) | Self-contained inside `CollectPaymentPanel.jsx`. No dependency on the others; can be done any time. Placed after the dashboard work to keep the implementation agent in one component family at a time. |
| 5 | **Task 3** (old-POS normalisation) | **Blocked** until user shares the actual `order_type` strings old POS emits. Deliver as a fast-follow once payload arrives. |

---

## 5. Files Most Likely to Change

| File | Touched by Task | Notes |
|---|---|---|
| `pages/StatusConfigPage.jsx` | 1 (and optional 3) | Add 2 storage keys + 2 radio-card sections; wire save/reset |
| `pages/DashboardPage.jsx` | 1, 4 | State init at 248-249; room mapping at 431 + channelData room adapter |
| `components/layout/Sidebar.jsx` | 1 | Remove "View Toggle Section" lines 285-337 |
| `components/layout/Header.jsx` | 1 (props prune), 3 (optional cosmetic) | Drop unused props if Sidebar no longer needs them |
| `components/order-entry/CollectPaymentPanel.jsx` | 2 | Replace `useMemo(occupiedRooms)` with on-demand fetch + 3 local states; render loading/error/empty/success |
| `api/services/tableService.js` | 2 (read-only reuse) | No code change |
| `api/transforms/orderTransform.js` | 3 | Extend `normalizeOrderType` once user shares payload |
| `components/cards/OrderCard.jsx` | 3 | Line 167 label change `"Take Away"` → `"Takeaway"` |
| `public/index.html` | 5 | Title, description, favicon link, optional removal of emergent-main.js + PostHog |
| `src/App.js` | 5 | `useEffect` for dynamic `document.title` |
| `__tests__/contexts/SocketContext.test.jsx`, any tests with `view-toggle`/`group-toggle` data-testids | 1 | Update or remove obsolete assertions |
| `__tests__/api/transforms/updateOrderPayload.test.js` | 3 (verify only) | Confirm outbound stays green; do not modify |

Files **never to touch** during this batch:
- `contexts/TableContext.jsx`
- `api/transforms/tableTransform.js`
- `api/transforms/reportTransform.js`
- `api/transforms/orderTransform.js` outbound section (lines 60-72, 567+)
- `config/paymentMethods.js`
- `src/constants/colors.js`
- Backend (`/app/backend/server.py`)
- `/etc/supervisor/conf.d/supervisord.conf` (read-only)

---

## 6. Test Scenarios for QA

### Task 1 — View-mode lock
1. Open StatusConfigPage → both new radio blocks render with current saved value selected; save changes the localStorage keys.
2. Pick `Order View` + `By Channel` → save → reload → DashboardPage opens directly in Order View / By Channel; sidebar shows NO view-toggle buttons.
3. Pick `Table View` + `By Status` → save → DashboardPage in Table View / By Status. Header filter pills swap correctly.
4. Clear localStorage → reload → defaults `Table View` + `By Status` apply (matches today's behaviour).
5. Switch user/role → settings stay in same browser (localStorage scope).
6. Confirm `data-testid="view-toggle"` and `data-testid="group-toggle"` are no longer in the DOM.
7. Status filter pills still respect `enabledStatuses` from existing config (orthogonal; should stay unchanged).

### Task 2 — Fresh rooms fetch
1. Dine-in order → click Collect Bill → click "To Room": picker shows spinner briefly, then shows fresh occupied rooms.
2. Check-in a room from old POS while CollectPaymentPanel is open → close & re-click "To Room" → newly checked-in room appears (proves bypass of stale context).
3. Network throttle → spinner visible; no UI freeze.
4. API 5xx → error banner + Retry button; click Retry refetches.
5. API returns empty array → "No checked-in rooms available" message renders.
6. Toggle between cash → To Room → cash → To Room rapidly → no duplicate calls; no race rendering an old response on top of a new selection.
7. `hasRooms === false` (restaurant has zero rooms) → "To Room" button still hidden (cached `hasRooms` gate untouched). Verify business rule preserved.
8. Selecting a room and pressing "Transfer ₹X to RoomY" → existing transferToRoom payload submitted unchanged; backend receives same `roomId`/`isTransferToRoom` payload.

### Task 3 — Old-POS normalisation (deferred until payload sample)
*(Run when implemented — placeholder cases)*
1. Old POS `order_type = "<actual value>"` → frontend classifies as `takeAway`, displays in TakeAway channel column.
2. Old POS `order_type = "<delivery actual value>"` → classifies as `delivery`.
3. New-POS-created takeaway order still classifies correctly (regression).
4. Outbound place-order / update-order payload emits the unchanged backend value (`order_type === 'takeaway'` / `'take_away'` per existing tests).
5. Order card label reads `"Takeaway"` (not `"Take Away"`).
6. Reports view (`reportTransform.js:209-211`) still maps takeaway correctly.

### Task 4 — Room card total
1. Available room → no amount on card (unchanged).
2. Checked-in room with marker only, room balance ₹2000 → card shows ₹2000.
3. Room with food ₹500, no transfers, no balance → card shows ₹500 (no regression).
4. Room with food ₹500 + transfers ₹1500 + balance ₹2000 → card shows ₹4000.
5. Non-room order (dine-in/takeaway/delivery/walk-in) → amount unchanged.
6. Multiple orders on one room (`DashboardPage.jsx:424-441` multi-card branch) → each card uses its own order's components.
7. Click into card → CollectPaymentPanel opens → `effectiveTotal` matches the card's number (within rounding).

### Task 5 — Branding
1. Browser tab opens with title `MyGenie POS` immediately (before login).
2. After login + restaurant resolves, tab title becomes `<RestaurantName> · MyGenie POS`.
3. Browser tab favicon shows MyGenie logo (not default globe).
4. View page source: no `emergent.sh` / `assets.emergent.sh` references in `<head>` (assuming PostHog/script removal confirmed).
5. Network tab: no requests to `emergent.sh` or PostHog (assuming removal).
6. Yarn build (`yarn build`) succeeds.

---

## 7. Final Recommendation for Implementation Agent

### What to implement
1. Tasks **5 → 1 → 4 → 2** in that order, in separate commits/PRs for clean review.
2. Task **3** only after the user supplies the old-POS `order_type` sample.

### What NOT to touch
- `contexts/TableContext.jsx` — Task 2 explicitly bypasses context, do not push fresh data back into it.
- Outbound payloads (`mapOrderTypeToAPI`, `placeOrder`, `updateOrder`, `cancelOrder`, `cancelItem`) — none of the five tasks change outbound contracts.
- Backend (`/app/backend/server.py`) and supervisor configs — frontend-only batch.
- `src/constants/colors.js` — branding URLs already point to MyGenie assets.
- `config/paymentMethods.js` — `transferToRoom` button gate stays as-is per user instruction "rest no changes".
- Existing localStorage keys (`mygenie_enabled_statuses`, `mygenie_station_view_config`, `mygenie_channel_visibility`, `mygenie_layout_table_view`, `mygenie_layout_order_view`) — only ADD new keys, never rename.

### What needs extra care
- **Task 1 / 4 same file (`DashboardPage.jsx`)** — merge sequentially to avoid line-number churn. Re-verify line numbers cited in §2 against your branch tip before editing.
- **Task 2 abort/race control** — use AbortController or a `mounted` ref so a slow response doesn't overwrite a newer selection.
- **Task 4 helper scoping** — apply `computeRoomCardAmount` only inside the `isRoom === true` branch of the room mapping. Do not let it leak into walk-in / takeaway / delivery adapters.
- **Task 5 PostHog removal** — get explicit user confirmation in chat before deleting the analytics block. Title/description/favicon are unblocked regardless.

### What needs backend / API confirmation
- **Task 2**: confirm `/api/v1/vendoremployee/all-table-list` is available under both the customer's preprod (`https://preprod.mygenie.online`) and the live token authority used by the running cashier. The endpoint is already in production — no new contract.
- **Task 3**: blocking dependency on user-supplied `order_type` sample from old POS for both takeaway and delivery.

### What is NOT a backend dependency
- Task 1, 4, 5 — pure frontend.
- Task 2 reuses an existing endpoint; no backend change.

### Quick-start sequence for the next agent
```
0. git pull && cd /app/frontend && yarn install
1. Implement Task 5 → manual verify in browser → commit
2. Implement Task 1 → manual verify (radio cards persist, sidebar buttons gone) → commit
3. Implement Task 4 → manual verify with a checked-in room having transfers + balance → commit
4. Implement Task 2 → manual verify by checking-in a room from another POS while panel open → commit
5. Wait for Task 3 payload from user → implement → commit
6. Yarn build to confirm production bundle still compiles
7. Run the existing __tests__ suite — fix only the test file references to removed data-testids; do NOT add new tests in this batch.
```
