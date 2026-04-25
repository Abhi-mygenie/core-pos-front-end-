# Core POS Frontend — Session PRD & Handover

> **Purpose**: implementation-ready handover for the next agent. Captures everything done across deployment, validation, and implementation in this session.
> **Codebase**: `/app` (cloned from `https://github.com/Abhi-mygenie/core-pos-front-end-.git`, branch **`roomv2`**).
> **Last session date**: 2026-04-25.
> **Last commit at session end**: `10ed08e Auto-generated changes` (branch `roomv2` HEAD at clone time; on-disk has uncommitted edits per §6).

---

## 1. Project Snapshot

| Attribute | Value |
|---|---|
| Project | MyGenie Core POS — React frontend |
| Repo | https://github.com/Abhi-mygenie/core-pos-front-end-.git |
| Active branch deployed | `roomv2` |
| Public preview URL | https://sidebar-config-test.preview.emergentagent.com |
| Real backend (out of scope here) | https://preprod.mygenie.online (CRM/POS) + https://presocket.mygenie.online (sockets) |
| Auth-provider | Customer's own (vendoremployee Bearer token) |
| Tech stack | React 19.0.0 · CRACO 7.1.0 · Yarn 1.22.22 · Node 20.20.2 · react-scripts 5.0.1 |
| Package manager rule | **YARN ONLY** (npm corrupts the lockfile) |
| Deployment model | CRACO dev server on `0.0.0.0:3000` via supervisor (`yarn start`) |
| Backend (in this repo) | Placeholder `/app/backend/server.py` — unused, do not touch |

---

## 2. User Personas

1. **Cashier / waitstaff** — primary daily user; uses the dashboard to take orders, print KOTs/bills, collect payment.
2. **Floor manager** — uses dashboard + reports + audit; performs cancellations and bill collection across tables.
3. **Restaurant owner / admin** — configures Visibility Settings, channels, and reviews reports.
4. **Hotel guest with room booking** — indirect; check-in handled by hotel front-desk system, food orders attach to room folio via "Transfer to Room".

---

## 3. Core Static Requirements (steady-state product)

- Dashboard with multi-channel order visibility (DineIn / TakeAway / Delivery / Room).
- Two view-mode axes: **Table View** ↔ **Order View**, and **By Channel** ↔ **By Status**.
- Per-table / per-order card with KOT print, bill print, status update, cancel.
- "Collect Payment" panel with cash/card/UPI/split/credit/transfer-to-room methods, discount, SC, tax, tip, delivery charge.
- Room module: check-in marker, room booking (price/advance/balance), room-service food, transferred dine-in bills (associated orders).
- Old-POS interoperability — orders created on legacy POS must surface correctly here.
- Visibility Settings: enable/disable order statuses, station view, channel visibility, default column layouts.
- Reports: paid, pending, cancelled, audit, summary.
- Firebase push notifications via service worker.

---

## 4. Session Timeline — what happened, in order

### Phase A — Deployment (start of session)

1. Wiped `/app` contents (preserved `.emergent/`).
2. Cloned `core-pos-front-end-` branch **`roomv2`** directly into `/app` (commit `10ed08e`).
3. Wrote `/app/frontend/.env` with all 17 variables supplied by user (FCM VAPID key cleaned of stray `2` + tab).
4. `yarn install` (~73s) — completed cleanly with expected peer-dep warnings.
5. Stopped/started frontend via supervisor; verified `webpack compiled with 1 warning` (pre-existing exhaustive-deps in `LoadingPage.jsx:101`).
6. Verified preview URL returns HTTP 200 and renders the Mygenie login page.
7. Wrote handover at `/app/memory/DEPLOYMENT_HANDOVER.md`.

### Phase B — Cancel-Gap validation (Option C verification)

User had a previous agent implement **Option C** for the bulk-Cancel button (hide bulk-cancel for rooms with placed items; force operators to use per-item X). Validated read-only:

- Implementation lives at `OrderEntry.jsx:1499-1537` with the guard `if (!hasUnplaced && hasPlaced && table?.isRoom) return null;` at line 1517.
- The `handleCancelOrder` (line 824) function is left intact for non-room flows.
- Verdict: **correctly implemented per Option C**, no further action.
- A forward-pointing comment references `ROOM_CHECKIN_NEXT_AGENT_GAPS_VALIDATED_HANDOVER.md` but that file does not yet contain a Gap-4 entry — minor doc drift, optional clean-up for later.

### Phase C — Five-task analysis (read-only validation)

Author: validation agent (this session).

1. **Visibility View Configuration** — make view-mode (Table/Order, Channel/Status) admin-configurable instead of always-on toggle.
2. **Room Transfer from Collect Bill** — picker shows "No checked-in rooms available" because `useTables()` context goes stale across socket events from other POS clients.
3. **Old-POS Takeaway Mapping** — old POS sends `'take_away'` but new POS classifier doesn't recognise it.
4. **Table Order Card Price for Rooms** — card amount excludes room balance + transferred bills.
5. **Strip Emergent Branding** — title, description, favicon, PostHog, `emergent-main.js`.

User clarifications captured in chat:
- Task 1 ⇒ pick exactly **one** mode per axis; **no "Both"**, **no runtime toggle**.
- Task 2 ⇒ rooms = tables with `rtype === 'RM'`; reuse existing `/api/v1/vendoremployee/all-table-list`; "rest no changes".
- Task 3 ⇒ deferred for payload sample (later confirmed: old POS emits `'take_away'`).
- Task 4 ⇒ room-only fix; do not break current calculation.
- Task 5 ⇒ favicon = MyGenie logo; PostHog + `emergent-main.js` → **remove entirely**.

Validation report saved at `/app/memory/FIVE_TASK_VALIDATION_HANDOVER.md`. Validation against `/app/v3/` decisions confirmed no AD-* conflict for any of the five tasks.

### Phase D — Five-task implementation

All 5 tasks implemented per validation doc, in the order **5 → 1 → 4 → 2 → 3**.

Implementation summary saved at `/app/memory/FIVE_TASK_IMPLEMENTATION_SUMMARY.md`.

---

## 5. What's Been Implemented in this Session (canonical list)

### 5.1 Task 5 — Strip Emergent branding

| File | Change |
|---|---|
| `frontend/public/index.html` | Title `Emergent | Fullstack App` → `MyGenie POS`; meta description → "MyGenie restaurant point-of-sale"; added `<link rel="icon" type="image/svg+xml" href="https://customer-assets.emergentagent.com/job_react-pos-phase1/artifacts/dwikbb41_logo111.svg" />`; **removed** `<script src="https://assets.emergent.sh/scripts/emergent-main.js">` and the entire PostHog init block (key `phc_xAvL2Iq4tFmANRE7kzbKwaSqp1HJjN7x48s3vr0CMjs`). |
| `frontend/src/App.js` | Added `AppTitleSync` component inside `AppProviders` that does `document.title = restaurant?.name ? \`${restaurant.name} · MyGenie POS\` : 'MyGenie POS'` via `useEffect` on `restaurant?.name`. |

### 5.2 Task 1 — Visibility view-mode lock

| File | Change |
|---|---|
| `frontend/src/pages/StatusConfigPage.jsx` | Added 2 localStorage keys (`mygenie_view_mode_table_order`, `mygenie_view_mode_channel_status`) with defaults `'table'` and `'status'`. Added 2 state vars + load/save/reset wiring. Added a new "View Mode" UI section with two radio-card blocks (no "Both" option) between "Channel Visibility" and "Default Column Layout". Test IDs: `view-mode-to-table`, `view-mode-to-order`, `view-mode-cs-channel`, `view-mode-cs-status`. |
| `frontend/src/pages/DashboardPage.jsx` | `useState("table")` / `useState("status")` replaced with lazy-init readers from the two new localStorage keys (with `try/catch` and same defaults). Removed the four view-toggle props (`activeView`, `setActiveView`, `dashboardView`, `setDashboardView`) from the `<Sidebar>` invocation. |
| `frontend/src/components/layout/Sidebar.jsx` | Removed the entire "View Toggle Section" block (was lines 285-337) including `data-testid="view-toggle"` and `data-testid="group-toggle"` buttons. Removed unused props from destructure. Pruned now-unused icons (`LayoutGrid`, `List`, `Columns`, `Rows`) from lucide-react import. |

### 5.3 Task 4 — Room card total

| File | Change |
|---|---|
| `frontend/src/pages/DashboardPage.jsx` | Added inline helper `computeRoomCardAmount(order)` near top of file. It returns `food + Σ(associatedOrders.amount) + max(0, roomInfo.balancePayment)`. Replaced `amount: order.amount` with `amount: computeRoomCardAmount(order)` inside `allRoomsList` (line 462). All other room-render branches spread `...room` from `allRoomsList`, so they inherit the fixed amount with no further edits. Non-room paths untouched. |

### 5.4 Task 2 — Fresh rooms fetch on "To Room" click

| File | Change |
|---|---|
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | Imports: added `useEffect`, `useRef`, and `tableService`. Added local state `freshRooms` / `roomsLoading` / `roomsError` and a `fetchReqIdRef` for race protection. Replaced the `useMemo(occupiedRooms)` with a hybrid: cached-context value as immediate fallback, fresh fetch state as authoritative once resolved. `fetchOccupiedRooms()` calls `tableService.getTables()` (the existing `/api/v1/vendoremployee/all-table-list` endpoint) and filters `t.isRoom && t.isOccupied`. `useEffect` triggers it when `paymentMethod === 'transferToRoom'` and `freshRooms === null`. Picker JSX gains four states: loading (spinner), error (red banner with Retry), empty ("No checked-in rooms available"), success (existing grid). Added a Refresh affordance. **Context is NOT updated**; fresh state is panel-local per user directive. |

### 5.5 Task 3 — Old-POS `take_away` normalisation

| File | Change |
|---|---|
| `frontend/src/api/transforms/orderTransform.js:42-58` | Added one new `case 'take_away':` to the takeaway branch of `normalizeOrderType` so old-POS takeaway orders normalise to `'takeAway'` instead of falling through to `'dineIn'`. **Inbound only.** Outbound `mapOrderTypeToAPI` (lines 63-72) untouched — backend contract preserved. |
| `frontend/src/components/cards/OrderCard.jsx:167` | Visible label `"Take Away"` → `"Takeaway"`. |

### 5.6 Validation only (no code change)

| Subject | Result |
|---|---|
| Cancel-gap Option C in `OrderEntry.jsx:1517` | Verified correctly implemented |

---

## 6. Files Changed in this Session (final list)

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

These are uncommitted on-disk edits at session end. The branch tip in git remains `10ed08e` (the auto-commit at clone time).

Memory artefacts written:
```
/app/memory/DEPLOYMENT_HANDOVER.md                  (deployment recipe + gotchas)
/app/memory/FIVE_TASK_VALIDATION_HANDOVER.md        (read-only validation pass)
/app/memory/FIVE_TASK_IMPLEMENTATION_SUMMARY.md     (per-task implementation log)
/app/memory/PRD.md                                  (this document)
```

---

## 7. Validation Performed in this Session

| Check | Result |
|---|---|
| ESLint clean on all 8 changed files | ✅ |
| Webpack compile via supervisor | ✅ `webpack compiled with 1 warning` (pre-existing `LoadingPage.jsx:101` exhaustive-deps; unrelated) |
| `curl http://localhost:3000/` shows new `<title>`, meta description, favicon link | ✅ |
| `curl http://localhost:3000/` contains zero `emergent.sh` / `posthog` references | ✅ |
| Preview URL returns HTTP 200 | ✅ |
| Manual full-app smoke walkthrough | ❌ deferred to QA agent — see §10 |
| Automated test agent invocation | ❌ explicitly skipped per user instruction |

---

## 8. Known Gaps, Risks, and Pre-existing Issues (DO NOT silently fix)

1. **`__tests__/api/transforms/updateOrderPayload.test.js:323`** asserts outbound `order_type === 'take_away'` for `'takeAway'` input, but `mapOrderTypeToAPI` returns `'takeaway'`. **Pre-existing test drift** — not introduced by Task 3 (which only touched the inbound parser). Outbound mapping stays intact. Out of scope.
2. **`/app/v3/DOC_VS_CODE_GAP.md` GAP-N3** — service-charge UI guard differs between default and room-with-associated-orders branches in CollectPaymentPanel. Orthogonal to Task 4 (which is display-only, no SC math). Documented, not addressed.
3. **`LoadingPage.jsx:101`** missing `loadStationData` dep in useEffect. Cosmetic ESLint warning; left untouched per "no unrelated cleanup" rule.
4. **Emergent platform preview wrapper** (`https://sidebar-config-test.preview.emergentagent.com`) hosts the app inside an iframe and serves its own `<title>Loading...</title>`. Cosmetic only; the inner-iframe app shows MyGenie branding correctly. Cannot be changed from this codebase.
5. **`https://restaurant-pos-v2-1.preview.static.emergentagent.com`** serves a stale pre-built backup snapshot — title/branding there will continue to look "Emergent". This is platform-managed infrastructure, not the live dev server. Live `localhost:3000` and the iframe at the dev-preview URL are correct.
6. **Task 2 button-visibility gate** (`config/paymentMethods.js:185-208`) still gates "To Room" behind `restaurantPaymentTypes` containing `'room'`/`'transfer_room'`. If a tenant doesn't include this in their API config, the button itself stays hidden. **Out of scope per user directive "rest no changes"**; revisit only if reported.
7. **Backend supervisor program** is configured to autostart but `/app/backend/server.py` is a placeholder. State is BACKEND running with placeholder responses — frontend ignores it (real backend lives at `preprod.mygenie.online`). Untouched.

---

## 9. Open / Backlog Items for Next Agent

### P0 — None

### P1 — Manual QA pass (next agent's first task; see §10)

### P2 — Backlog
1. **Task 2 button-gate review** — if QA reports "To Room" button missing on a tenant that has rooms, look at `filterLayoutByApiTypes` and `restaurantPaymentTypes` for that tenant.
2. **Cancel-gap doc back-fill** — append a Gap-4 entry to `ROOM_CHECKIN_NEXT_AGENT_GAPS_VALIDATED_HANDOVER.md` to match the inline comment in `OrderEntry.jsx:1505-1516`.
3. **Pre-existing test drift** in `updateOrderPayload.test.js:323` — coordinate with backend team whether outbound should send `'takeaway'` (current code) or `'take_away'` (legacy test expectation).
4. **GAP-N3** (room-with-associated-orders SC guard) — separate ticket per `/app/v3/DOC_VS_CODE_GAP.md`.
5. **Old POS old-format check for additional `order_type` values** — currently only `'take_away'` is added. If `'walk_in'`, `'dine_in'`, `'home_delivery'` etc. are emitted by old POS, extend `normalizeOrderType` similarly. User confirmed only takeaway needed in this session.
6. **Favicon hosting** — currently the favicon link points to the existing CDN-hosted `GENIE_LOGO_URL` SVG on `customer-assets.emergentagent.com`. If that asset is moved or the customer wants to self-host, swap the URL.

### P3 — Future
- Migrate the localStorage-based visibility settings to user-role permissions (already noted in `StatusConfigPage.jsx:389`).
- Add a `manifest.json` for PWA support.

---

## 10. QA Test Plan (handover to QA agent)

Run a manual smoke pass against the live dev preview, in this order:

### Branding (Task 5)
- [ ] Pre-login: browser tab title shows `MyGenie POS`.
- [ ] Post-login (with restaurant context loaded): tab title shows `<RestaurantName> · MyGenie POS`.
- [ ] Browser tab favicon shows MyGenie logo (orange/green acorn-bell), not Chrome default.
- [ ] DevTools Network tab: zero requests to `emergent.sh` or PostHog.
- [ ] DevTools Console: `window.posthog` is `undefined`.

### View Mode Lock (Task 1)
- [ ] Open `Visibility / Status Configuration` (sidebar → Settings → Visibility, or direct route `/visibility/status-config`).
- [ ] Confirm new "View Mode" section visible with two pairs of radio cards (no "Both" option).
- [ ] Pick `Order View` + `By Channel` → Save → reload Dashboard → opens directly in Order View / By Channel; sidebar has NO view-toggle / group-toggle buttons.
- [ ] Pick `Table View` + `By Status` → Save → reload → confirm.
- [ ] Header filter pills swap correctly (Channel pills under By Status, Status pills under By Channel).
- [ ] Reset-to-Default → values revert.
- [ ] Clear localStorage entirely → reload → defaults apply (Table View / By Status).

### Room Card Total (Task 4)
- [ ] Available room (no order) → no amount on card.
- [ ] Marker-only checked-in room (no food, only room booking outstanding) → card shows `roomInfo.balancePayment`.
- [ ] Room with food only, no transfers, no balance → card unchanged vs prod.
- [ ] Room with food + transferred dine-in bill + room balance → card shows sum of all three.
- [ ] Click into the room card → CollectPaymentPanel opens → "Pay" button total matches the card number (within rounding).
- [ ] Non-room cards (dine-in, takeaway, delivery, walkIn) → no regression.

### Fresh Rooms Picker (Task 2)
- [ ] Dine-in order → Collect Bill → click "To Room": loading spinner appears, then list populates with checked-in rooms.
- [ ] Stress test: check-in a new room from a different POS while panel is open → click "Refresh" → newly-checked-in room appears.
- [ ] Network throttle / disconnect → red error banner + Retry button visible.
- [ ] Click Retry → refetches; on success, list populates.
- [ ] Toggle rapidly between cash → To Room → cash → To Room: no duplicate calls, no race rendering an old response on top of new selection.
- [ ] Select a room → click "Transfer" → existing transferToRoom payload submitted unchanged; backend receives `roomId`/`isTransferToRoom` correctly.
- [ ] Tenant without rooms → "To Room" button hidden (existing gate preserved).

### Old-POS Takeaway (Task 3)
- [ ] Create a takeaway order on the old POS → confirm it appears in the TakeAway channel column on new POS dashboard (not the dineIn column).
- [ ] All takeaway cards across the app read **"Takeaway"** (single word).
- [ ] Takeaway orders created on the new POS still classify correctly (regression).

### Regression Sanity (broad)
- [ ] Place a normal dine-in order, take-away order, and delivery order — confirm no regression.
- [ ] Cancel order flow on a non-room order — bulk-cancel still works.
- [ ] Cancel order flow on a room order — bulk-cancel still hidden, per-item X works (Option C from earlier).

File any failures as separate tickets with exact reproduction steps. Do **not** bundle them into the existing summary docs.

---

## 11. Quick redeploy recipe (for future deployment agents)

```bash
# 1. Stop services and preserve .emergent
sudo supervisorctl stop frontend backend
mv /app/.emergent /tmp/.emergent_backup
rm -rf /app/* /app/.git /app/.gitignore

# 2. Clone target branch directly into /app
cd /app
git clone --branch roomv2 --single-branch \
  https://github.com/Abhi-mygenie/core-pos-front-end-.git .
mv /tmp/.emergent_backup /app/.emergent

# 3. Write /app/frontend/.env (values per /app/memory/DEPLOYMENT_HANDOVER.md §3.4)

# 4. Install + start
cd /app/frontend && yarn install
sudo supervisorctl start frontend
sleep 25
sudo supervisorctl status frontend
tail -n 30 /var/log/supervisor/frontend.out.log   # expect "webpack compiled with 1 warning"
curl -sI https://sidebar-config-test.preview.emergentagent.com | head -5  # expect HTTP/2 200
```

Full handover with gotchas and 8-point health checklist: `/app/memory/DEPLOYMENT_HANDOVER.md`.

---

## 12. Cross-references

| Topic | Document |
|---|---|
| Deployment recipe + gotchas | `/app/memory/DEPLOYMENT_HANDOVER.md` |
| Five-task validation (read-only analysis) | `/app/memory/FIVE_TASK_VALIDATION_HANDOVER.md` |
| Five-task implementation log | `/app/memory/FIVE_TASK_IMPLEMENTATION_SUMMARY.md` |
| Architecture decisions catalog (AD-001…AD-901) | `/app/v3/ARCHITECTURE_DECISIONS_FINAL.md` |
| Doc vs code gaps | `/app/v3/DOC_VS_CODE_GAP.md` |
| Risks | `/app/v3/RISK_REGISTER.md` |
| Cancel-gap Option C inline comment | `frontend/src/components/order-entry/OrderEntry.jsx:1505-1517` |
| Room-checkin reference | `/app/memory/ROOM_CHECKIN_NEXT_AGENT_GAPS_VALIDATED_HANDOVER.md` |

---

## 13. Status at session end

- ✅ Frontend deployed and running (`webpack compiled with 1 warning`).
- ✅ All 5 tasks implemented, lint-clean.
- ✅ Cancel-gap Option C verified.
- ✅ Documentation: validation, implementation summary, deployment handover, and this PRD all written.
- ⚠ Manual QA pass deferred to next QA agent — full plan in §10.
- ⚠ On-disk edits **not committed**. If next agent wants a snapshot in git, run a Save-to-GitHub before continuing or ask the user to do so.
- ⚠ Old-POS `'take_away'` is the only legacy `order_type` variant handled; user confirmed delivery / dinein from old POS already work.

---

## Task 1 v2 — View Mode Lock revision (2026-04-25)

> Pointer: full spec in `/app/memory/TASK_1_REVISION_GAPS.md`.
> Pointer: stepwise implementation log in `/app/memory/REVISION_IMPLEMENTATION_SUMMARY.md`.

### Why
The original Task 1 implementation removed the legacy "both views with runtime sidebar toggle" default. User clarified the intent: **default = Both views visible (legacy); Visibility Settings is an admin OVERRIDE only**. Without the override, cashiers must keep their runtime toggle. The original code did the opposite — it forced a single-pick lock on every user (including users who never opened Settings) and deleted the sidebar toggle entirely.

### What changed (5-step plan, all completed)

| Step | File(s) | Change |
|---|---|---|
| 0 | — | Backed up the 3 target files to `/tmp/task1_revision_backups/` for byte-exact rollback. |
| 1 | `Sidebar.jsx`, `DashboardPage.jsx` | Restored the runtime toggle block in Sidebar (`view-toggle`, `group-toggle`); re-imported lucide icons; re-passed view setters from DashboardPage. Toggles always visible at this step. |
| 2 | `StatusConfigPage.jsx` | Default constants flipped from `'table'` / `'status'` → `'both'`. Hydrate effect accepts `'both'` as a valid stored value. |
| 3 | `StatusConfigPage.jsx` | Replaced View Mode `<label>` + `sr-only <input type="radio">` pattern with the page's existing checkbox-card pattern (`<div onClick>`). 3 cards per axis: Table / Order / Both, Channel / Status / Both. **Bug fix:** the old radio pattern caused a `position: fixed` toast to remain visible while the rest of the page scrolled to (0,0) on click — root cause was the browser focusing the hidden `sr-only` input and running `scrollIntoView`. Pattern A has no hidden input → no scroll jump. |
| 3b (bonus) | `StatusConfigPage.jsx` | Same fix applied to the latently-buggy **Display Mode** (Stacked / Accordion) radios under Station View. Page is now `sr-only`-radio free. |
| 4 | `DashboardPage.jsx`, `Sidebar.jsx` | Added `lockTableOrder` / `lockChannelStatus` state derived from localStorage. Path-nav effect + cross-tab `storage` listener re-derive on demand. Sidebar conditionally hides each toggle (and the wrapper container if both would be hidden). |
| 5 | docs | Appended this revision section to PRD + FIVE_TASK_VALIDATION_HANDOVER + FIVE_TASK_IMPLEMENTATION_SUMMARY. Created `/app/memory/REVISION_IMPLEMENTATION_SUMMARY.md` per QA spec. |

### Behavioural matrix (target state)

| localStorage `mygenie_view_mode_table_order` | localStorage `mygenie_view_mode_channel_status` | Sidebar `view-toggle` | Sidebar `group-toggle` |
|---|---|---|---|
| `'both'` / unset (default) | `'both'` / unset (default) | ✅ visible | ✅ visible |
| `'table'` or `'order'` (locked) | `'both'` / unset | ❌ hidden | ✅ visible |
| `'both'` / unset | `'channel'` or `'status'` (locked) | ✅ visible | ❌ hidden |
| `'table'` or `'order'` (locked) | `'channel'` or `'status'` (locked) | ❌ hidden | ❌ hidden (container also hidden) |

Cross-tab `storage` events trigger live re-render. Path-nav (returning from Settings to Dashboard) also re-derives the lock flags.

### Migration strategy
**No version key bump.** Existing users with a saved lock keep that lock (treated as deliberate). The "Both" radio + Reset-to-Default give an explicit revert path. If field reports show confusion, fall back to a one-time soft migration (detect saved lock → write `'both'` → log info). Hold off until needed.

### Test coverage (all passed by manual gate per step)
- Step 1: Sidebar toggles flip dashboard view at runtime (passed).
- Step 2: Settings page renders without crashing; existing saved values still display (intermediate state, passed).
- Step 3: Pattern A cards click without blank-page bug; all 6 cards render (3 per axis); selection persists (passed).
- Step 3b: Display Mode (Stacked/Accordion) clicks without blank-page bug (passed).
- Step 4: Lock flags hide the corresponding axis only; both-locked = both hidden + container hidden; path-nav and cross-tab sync work (passed by user via gate).

### Files touched (final summary)
| File | Change scope |
|---|---|
| `frontend/src/pages/StatusConfigPage.jsx` | 4 sections rewritten (defaults, hydrate, View Mode, Display Mode). Net +30 lines. |
| `frontend/src/pages/DashboardPage.jsx` | Lazy init clarified, 2 lock states added, path-nav and storage effects extended, Sidebar invocation grew by 2 props. Net +35 lines. |
| `frontend/src/components/layout/Sidebar.jsx` | 4 lucide icons re-imported, 6 props in destructure, conditional toggle block restored. Net +60 lines vs the (broken) "deleted" baseline. |

### Out of scope (left as P3 backlog per original PRD)
- Per-role override (manager sees toggle, cashier locked).
- Split-screen / dual-pane (literal "both at the same time").
- Soft localStorage migration (only if field issues surface).

### Rollback (still safe — does not touch other tasks)
```bash
cp /tmp/task1_revision_backups/StatusConfigPage.jsx.bak /app/frontend/src/pages/StatusConfigPage.jsx && \
cp /tmp/task1_revision_backups/DashboardPage.jsx.bak    /app/frontend/src/pages/DashboardPage.jsx && \
cp /tmp/task1_revision_backups/Sidebar.jsx.bak          /app/frontend/src/components/layout/Sidebar.jsx
```

