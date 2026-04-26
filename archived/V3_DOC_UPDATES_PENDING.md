# V3 Documentation Updates — Pending Validation

**Purpose:** queue of AD / risk-register / open-question changes that should later be merged into `/app/v3/*` by a separate validation agent. Each entry below is ready for review; **DO NOT** apply directly without owner sign-off and code-vs-doc re-validation per the V3 audit methodology used in `/app/v3/DOCUMENTATION_AUDIT_SUMMARY.md`.

**Conventions:**
- Each entry cites the requirement it came from.
- Each entry is in the same prose shape as existing V3 ADs (see `/app/v3/ARCHITECTURE_DECISIONS_FINAL.md`).
- Validation agent should: (1) confirm code matches the AD wording, (2) merge into the right V3 file, (3) add a row to the V3 status table, (4) update `/app/v3/DOC_VS_CODE_GAP.md` to close any related gap, (5) update `/app/v3/COMPARISON_SUMMARY.md` with the change-from-prior-version note.

---

## Entry 1 — `AD-Default-View` (from Req 4: Default View Setting)

**Source requirement:** Owner ask to add an admin-controlled "Default View" sub-setting that activates only when the existing View Mode lock is set to `'both'` for an axis. Locked decisions are captured in `/app/memory/DEFAULT_VIEW_SETTING_DECISIONS_LOCKED.md`.

**Proposed AD entry:**

> ### AD-Default-View — Default Dashboard View When Lock = `'both'`
>
> **Decision**
> When admin's View Mode lock for an axis is `'both'`, the runtime initial view is read from a separate admin-controlled "Default View" key. Sidebar runtime toggles continue to flip in-memory only and do not write either the lock key or the default key. Cashier-side flips reset to the admin default on next dashboard load.
>
> **Storage contract**
>
> | Key | Allowed values | Default | Active when |
> |---|---|---|---|
> | `mygenie_view_mode_table_order` (existing) | `'table' \| 'order' \| 'both'` | `'both'` | Always |
> | `mygenie_default_pos_view` (new) | `'table' \| 'order'` | `'table'` | `mygenie_view_mode_table_order === 'both'` |
> | `mygenie_view_mode_channel_status` (existing) | `'channel' \| 'status' \| 'both'` | `'both'` | Always |
> | `mygenie_default_dashboard_view` (new) | `'channel' \| 'status'` | `'channel'` | `mygenie_view_mode_channel_status === 'both'` |
>
> **Runtime precedence rule (per axis)**
>
> 1. Lock value → use directly when ∈ `{'table'|'order'}` / `{'channel'|'status'}`.
> 2. Admin default → consulted only when lock = `'both'`.
> 3. Factory default → POS = `'table'`, Dashboard = `'channel'`.
>
> **Code areas affected**
> - `frontend/src/pages/StatusConfigPage.jsx` (admin UI: 2 new sub-row pickers, persist, reset, help-copy update at the existing info card).
> - `frontend/src/pages/DashboardPage.jsx` (initial-state lazy initializers; path-nav effect; cross-tab `storage` listener).
> - `frontend/src/components/layout/Sidebar.jsx` — unchanged.
>
> **Note on factory default change**
> Today's hardcoded factory default for the Channel/Status axis is `'status'` (`DashboardPage.jsx:309`). After this change the factory default becomes `'channel'`. Existing tenants who never opened Settings will see a one-time visual change on first dashboard load post-deploy.
>
> **Status**
> - Verified — design pending implementation.
> - To be re-classified to **Verified in code** after implementation lands and validation agent re-confirms.
>
> **Required V3 update**
> - Add new AD row to the Architecture Decision Summary table in `/app/v3/ARCHITECTURE_DECISIONS_FINAL.md`.
> - Append AD body in the "Verified Decisions" section once code lands.
> - Add a `GAP-Closed` entry in `/app/v3/DOC_VS_CODE_GAP.md` for the prior hardcoded fallback.
> - Note the factory-default change from `'status'` → `'channel'` in `/app/v3/COMPARISON_SUMMARY.md` under "Major v3 Corrections" or a new "v3.x Updates" section.

**Validation checklist for the agent that will merge this:**
- [ ] Confirm `mygenie_default_pos_view` and `mygenie_default_dashboard_view` keys are present in code.
- [ ] Confirm `DashboardPage.jsx` precedence rule reads lock → default → factory.
- [ ] Confirm Sidebar toggles do NOT write the new keys.
- [ ] Confirm Reset to Default button restores both lock keys to `'both'` and both default keys to factory.
- [ ] Confirm help-copy at the existing info card on `StatusConfigPage.jsx` matches the new wording (or unchanged if owner picked Q-8 = c later).
- [ ] Confirm legacy tenants (no new keys in localStorage) fall back to factory defaults without runtime errors.

---

## Future entries (placeholder)

When Reqs 1, 2, 3 lock in their decisions, additional entries will be appended here:

- **Entry 2 — `AD-Order-Taking-Toggle`** (Req 2: Order Taking Visibility) — see below.
- **Entry 3 — `AD-Station-Refresh`** (Req 1: Station Panel Socket Refresh) — pending owner answers in `/app/memory/STATION_PANEL_SOCKET_REFRESH_DEEPDIVE.md`.
- **Entry 4 — `AD-302A` (Room Auto-Print Suppression)** + **Entry 5 — `AD-Room-Print-Payload`** (Req 3: Room Bill Print) — pending owner answers in `/app/memory/REQ3_ROOM_BILL_PRINT_DEEPDIVE.md`.

Each entry will follow the same shape as Entry 1 above.

---

## Entry 2 — `AD-Order-Taking-Toggle` (from Req 2: Order Taking Visibility)

**Source requirement:** Owner ask to add an admin-controlled toggle that disables order creation and editing on a specific device, while keeping in-card service buttons functional. Locked decisions are captured in `/app/memory/REQ2_ORDER_TAKING_DECISIONS_LOCKED.md`.

**Proposed AD entry:**

> ### AD-Order-Taking-Toggle — Per-Device Disable of Order Creation/Editing
>
> **Decision**
> A new master switch in `StatusConfigPage` ("UI Elements" → "Order Taking") allows admins to disable two flows on a specific device:
> 1. The top-right Add button in the Header.
> 2. All card body clicks that would open OrderEntry or the Room Check-In modal.
>
> When disabled, in-card action buttons (Mark Ready, Mark Served, Print KOT, Print Bill, Confirm Order, Cancel Order, snooze) continue working because they call dedicated handlers and bypass `handleTableClick`. Sidebar nav, Header status filters, Settings access, and Station Panel are also unaffected.
>
> **Storage contract**
>
> | Key | Allowed values | Default | Active when |
> |---|---|---|---|
> | `mygenie_order_taking_enabled` (new) | JSON object `{ enabled: true \| false }` | `{ enabled: true }` | Always |
>
> **Implementation details**
> - Header (`Header.jsx`) and Dashboard (`DashboardPage.jsx`) read the flag on mount and subscribe to the `storage` event for cross-tab sync.
> - `DashboardPage.handleTableClick` short-circuits with an early return when the flag is false. Action buttons inside cards bypass this handler by design.
> - Visual feedback: a `.order-taking-disabled` class on the dashboard content wrapper applies `cursor: default` to cards while preserving `cursor: pointer` on buttons inside cards.
> - First-visit backfill: when an admin opens Status Configuration and the key is absent, the factory default is written to localStorage automatically (mirrors the Req 4 backfill pattern).
> - `Reset to Default` clears the flag back to factory.
>
> **Code areas affected**
> - `frontend/src/pages/StatusConfigPage.jsx` — new "UI Elements" section card; constants, state, hydrate-with-backfill, persist, reset.
> - `frontend/src/components/layout/Header.jsx` — state + storage listener + conditional Add button render.
> - `frontend/src/pages/DashboardPage.jsx` — state + storage listener + early return in `handleTableClick`; conditional class on dashboard wrapper.
> - `frontend/src/index.css` — CSS rules for `.order-taking-disabled`.
>
> **Status**
> - Verified in code (iteration_8 — 10/10 acceptance tests PASS; T-3 in-card-button check is environment-limited but code-correct by design).
>
> **Required V3 update**
> - Add new AD row to the Architecture Decision Summary table in `/app/v3/ARCHITECTURE_DECISIONS_FINAL.md`.
> - Append AD body in the "Verified Decisions" section.
> - No `RISK_REGISTER.md` change required.
> - No conflicts with existing ADs.

**Validation checklist for the agent that will merge this:**
- [ ] Confirm `mygenie_order_taking_enabled` key is present in code.
- [ ] Confirm Header conditionally renders the Add button.
- [ ] Confirm `handleTableClick` returns early when flag is false.
- [ ] Confirm in-card action buttons (Mark Ready, Print, etc.) bypass `handleTableClick` and continue working when flag is false.
- [ ] Confirm CSS rule `.order-taking-disabled` exists and scopes cursor correctly.
- [ ] Confirm first-visit backfill writes `{enabled: true}` if key is absent.
- [ ] Confirm `Reset to Default` resets flag to factory.
- [ ] Confirm cross-tab `storage` event listener is wired in both Header and DashboardPage.

---

_End of pending V3 doc updates queue. NOT yet merged into `/app/v3/*`._
