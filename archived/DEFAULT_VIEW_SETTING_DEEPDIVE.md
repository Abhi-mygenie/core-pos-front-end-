# Default View Setting (Req 4) — Deep-Dive Analysis

- **Type:** Read-only deep-dive + plan + gap analysis. NO code changes.
- **Scope:** Trace the existing View Mode lock implementation (Task 1 revision), determine exactly what changes are needed to add an admin-controlled "Default View" sub-setting that activates only when an axis = `'both'`.
- **Source of truth:** `/app/frontend/src` on `roomv2`. Cross-references: `/app/memory/REVISION_IMPLEMENTATION_SUMMARY.md`, `/app/memory/TASK_1_REVISION_GAPS.md`, `/app/v3/*`.
- **Status:** STOP — owner approval needed on Section §10 questions before drafting the implementation handover.
- **Relation to Reqs 1–3:** Independent surface area (no overlap with station refresh, Add-button visibility, or room print). Can be implemented and shipped in parallel.

---

## 0. Executive Summary

| Item | Today | After this requirement |
|---|---|---|
| Admin choice for Table↔Order axis | `table` / `order` / `both` (Task 1 v2) | Same 3 values + new sub-setting `defaultPosView ∈ { table, order }` that's meaningful only when axis = `both` |
| Admin choice for Channel↔Status axis | `channel` / `status` / `both` (Task 1 v2) | Same 3 values + new sub-setting `defaultDashboardView ∈ { channel, status }` that's meaningful only when axis = `both` |
| Runtime default when axis = `both` | **HARDCODED** in `DashboardPage.jsx` — `activeView='table'` (line 302), `dashboardView='status'` (line 309) | Read from new admin-controlled defaults |
| LocalStorage keys involved today | `mygenie_view_mode_table_order`, `mygenie_view_mode_channel_status` (existing; values `'table'|'order'|'both'`, `'channel'|'status'|'both'`) | + 2 new keys (or 1 combined key) for the new defaults |
| Runtime impact | Cashier always lands on Table/Status when admin picks Both | Cashier lands on the admin-configured default; can still toggle via Sidebar runtime toggles (those are unchanged) |
| Risk | LOW (additive; existing lock behavior unchanged) | LOW |

**Net effect:** This is a tiny, surgical change layered on top of the existing Task 1 lock pipeline. Cleanest approach: add 2 new localStorage keys, surface 2 new card pickers in `StatusConfigPage`, change exactly 4 lines in `DashboardPage.jsx` initial-state computation.

---

## 1. Where The Current "View Mode" Lives (Task 1 v2 Recap)

### 1.1 Admin UI
- **File:** `frontend/src/pages/StatusConfigPage.jsx`
- **Section:** "View Mode" card at lines 746–862.
- **Two axes**, each rendered as 3 click-cards:

  | Axis | Card test-IDs | Storage key |
  |---|---|---|
  | Table or Order View | `view-mode-to-table`, `view-mode-to-order`, `view-mode-to-both` | `mygenie_view_mode_table_order` |
  | Channel or Status View | `view-mode-cs-channel`, `view-mode-cs-status`, `view-mode-cs-both` | `mygenie_view_mode_channel_status` |

- **State variables** (`StatusConfigPage.jsx:121-122`):
  ```js
  const [viewModeTableOrder, setViewModeTableOrder] = useState(DEFAULT_VIEW_MODE_TO);     // 'both'
  const [viewModeChannelStatus, setViewModeChannelStatus] = useState(DEFAULT_VIEW_MODE_CS); // 'both'
  ```
- **Hydration on mount** (lines 184-191) reads localStorage and accepts `'table'|'order'|'both'` / `'channel'|'status'|'both'`.
- **Save** (`saveConfiguration`, lines 338-339) writes both keys.

### 1.2 Runtime consumption
- **File:** `frontend/src/pages/DashboardPage.jsx`
- **Initial state for runtime view toggles** (lines 293-310):
  ```js
  const [activeView, setActiveView] = useState(() => {
    try {
      const stored = localStorage.getItem('mygenie_view_mode_table_order');
      if (stored === 'table' || stored === 'order') return stored;
    } catch (e) {}
    return 'table';   // <-- HARDCODED FALLBACK when 'both' or absent
  });
  const [dashboardView, setDashboardView] = useState(() => {
    try {
      const stored = localStorage.getItem('mygenie_view_mode_channel_status');
      if (stored === 'channel' || stored === 'status') return stored;
    } catch (e) {}
    return 'status';  // <-- HARDCODED FALLBACK when 'both' or absent
  });
  ```
- **Lock flags** (lines 316-327): `lockTableOrder = stored ∈ {'table','order'}`, `lockChannelStatus = stored ∈ {'channel','status'}`.
- **Path-nav resync** (lines 240-250): on returning to dashboard, lock flags are recomputed and active values are aligned **only when locked**.
- **Cross-tab sync** (lines 253-288): listens to `storage` events for both keys.

### 1.3 Sidebar runtime toggles
- **File:** `frontend/src/components/layout/Sidebar.jsx`
- **Toggles** (lines 295-352):
  - `view-toggle` (Table ↔ Order) — visible only when `!lockTableOrder`.
  - `group-toggle` (Channel ↔ Status) — visible only when `!lockChannelStatus`.
- These toggles call `setActiveView` / `setDashboardView` directly. They are unaffected by this requirement.

---

## 2. Exactly Which Lines Drive the "Both" Default Today

The two hardcoded fallbacks are the only places the system decides the default-when-Both:

| File | Line | Hardcoded value | What it means |
|---|---|---|---|
| `DashboardPage.jsx` | 302 | `return 'table';` | When `mygenie_view_mode_table_order` ∈ `{'both', null}`, cashier opens on Table View. |
| `DashboardPage.jsx` | 309 | `return 'status';` | When `mygenie_view_mode_channel_status` ∈ `{'both', null}`, cashier opens on Status View. |

These two return statements are the entire current "Both default" mechanism. No other file consults a default in a way that overrides these.

---

## 3. Proposed Data Model

### 3.1 Option A — Two new dedicated keys (recommended)

| LocalStorage key | Type | Allowed values | Default | Meaningful when |
|---|---|---|---|---|
| `mygenie_view_mode_table_order` (existing) | string | `'table' \| 'order' \| 'both'` | `'both'` | always |
| `mygenie_default_pos_view` (NEW) | string | `'table' \| 'order'` | `'table'` (preserves current behavior) | when `mygenie_view_mode_table_order === 'both'` |
| `mygenie_view_mode_channel_status` (existing) | string | `'channel' \| 'status' \| 'both'` | `'both'` | always |
| `mygenie_default_dashboard_view` (NEW) | string | `'channel' \| 'status'` | `'status'` (preserves current behavior) | when `mygenie_view_mode_channel_status === 'both'` |

Pros: minimal churn; existing lock logic untouched; defaults remain valid even when admin re-enters Lock mode and back to Both.
Cons: 2 extra keys.

### 3.2 Option B — Combined object key (alternative)

A single new key `mygenie_view_defaults`:
```json
{ "pos": "table", "dashboard": "status" }
```
Pros: fewer keys.
Cons: existing pattern uses one key per axis; mixing styles will be inconsistent.

### 3.3 Option C — Inline encoding into existing keys (rejected)

E.g., when admin picks Both with table-as-default, store `'both:table'`. Avoids new keys but pollutes the lock semantics in `DashboardPage.jsx` lines 242, 247, 276, 281, 300 — every consumer would need to parse two values. **Not recommended.**

**Recommended:** Option A.

---

## 4. End-To-End Behavior With Option A

### 4.1 Admin saves the following in StatusConfigPage:
- Table or Order View = **Both**, Default POS View = **Order**.
- Channel or Status View = **Both**, Default Dashboard View = **Channel**.

### 4.2 LocalStorage after Save:
```
mygenie_view_mode_table_order      = 'both'
mygenie_default_pos_view           = 'order'
mygenie_view_mode_channel_status   = 'both'
mygenie_default_dashboard_view     = 'channel'
```

### 4.3 Cashier loads dashboard:
- `activeView` initial = `'order'` (from `mygenie_default_pos_view` because lock = `'both'`).
- `dashboardView` initial = `'channel'` (from `mygenie_default_dashboard_view`).
- Sidebar shows BOTH runtime toggles (unchanged from Task 1).
- Cashier can flip live; their flip is in-memory only (unchanged from Task 1) and resets to admin default on next reload.

### 4.4 If admin later flips the lock to `'table'` (hard lock):
- `mygenie_view_mode_table_order = 'table'`.
- `activeView` initial = `'table'` (lock wins).
- `mygenie_default_pos_view` is preserved but unused while locked.
- Sidebar hides the Table↔Order toggle (lock flag true).
- If admin returns to `'both'` later, `mygenie_default_pos_view` reactivates without needing re-save.

This preservation behavior is one of the reasons Option A beats Option C.

---

## 5. Files & Functions To Touch

| File | Change | Estimated lines |
|---|---|---|
| `frontend/src/pages/StatusConfigPage.jsx` | Add 2 new state vars (`defaultPosView`, `defaultDashboardView`) + hydrate on mount + persist on Save + render 2 new option-card pickers shown only when axis = `'both'`. | +60-80 |
| `frontend/src/pages/DashboardPage.jsx` | Replace hardcoded `'table'` / `'status'` fallbacks at lines 302 and 309 with reads from the new keys. Add the same fallback to the path-nav effect (lines 240-250) and cross-tab `storage` listener (lines 253-288) so they react when admin updates only the default (no axis change). | +20 |
| `frontend/src/contexts/*` | None required. | 0 |
| `frontend/src/components/layout/Sidebar.jsx` | None required (toggles independent of defaults). | 0 |
| `frontend/src/api/*` | None required. | 0 |
| `/app/v3/ARCHITECTURE_DECISIONS_FINAL.md` | (Optional, per Q-12 below) Add `AD-Default-View` clause. | +20 |
| `/app/memory/PRD.md` | Append entry under Visibility Settings. | +5 |
| `/app/memory/REVISION_IMPLEMENTATION_SUMMARY.md` | (Optional) Append "Default-when-Both" follow-up note. | +5 |

---

## 6. Detailed UI Plan (StatusConfigPage)

The existing card grid for "Table or Order View" (lines 772-812) has 3 cards. After this change, when `viewModeTableOrder === 'both'`, render a sub-row underneath:

```
┌─────────────────────── Table or Order View ───────────────────────┐
│  ○ Table View    ○ Order View    ● Both (default)                 │
└────────────────────────────────────────────────────────────────────┘

   ↳ Default POS View   (visible only when 'Both' is selected)
   ┌────────────────┬────────────────┐
   │ ● Table View   │ ○ Order View   │   <-- single-pick
   │ Open Table View│ Open Order     │
   │ first on load  │ View first     │
   └────────────────┴────────────────┘
```

Same pattern for the Channel/Status axis underneath the existing 3-card row.

Visual rules:
- The new "Default …" sub-block only appears when its parent axis = `'both'`.
- When the user clicks Both for the first time and the new key is absent, default the picker to the historical hardcoded value (Table for axis A, Status for axis B) — this preserves backward compat.
- If the user picks a hard lock (e.g., switches axis to `'order'`), the sub-block disappears but the stored default is preserved (not reset).

Test-ID naming aligned with existing conventions:
- `default-pos-view-table`, `default-pos-view-order`
- `default-dashboard-view-channel`, `default-dashboard-view-status`

---

## 7. Initial-State Replacement (DashboardPage)

Pseudocode for the only logic changes (illustrative — not for implementation yet):

```js
// activeView initial state
const [activeView, setActiveView] = useState(() => {
  try {
    const lock = localStorage.getItem('mygenie_view_mode_table_order');
    if (lock === 'table' || lock === 'order') return lock;            // hard lock
    const def = localStorage.getItem('mygenie_default_pos_view');
    if (def === 'table' || def === 'order') return def;               // both + admin default
  } catch (e) {}
  return 'table';                                                      // factory default
});

// Same shape for dashboardView using:
//   lockKey  = 'mygenie_view_mode_channel_status'
//   defKey   = 'mygenie_default_dashboard_view'
//   factory  = 'status'
```

Path-nav effect (lines 240-250) and `storage` event listener (lines 253-288) need the same logic so live changes by the admin propagate without a reload.

---

## 8. Cross-Tab & Multi-Device Behavior

- `storage` events already fire for any localStorage key change — adding 2 listeners costs ~10 lines. Recommended: when only the default key changes (axis still `'both'`), update `activeView` / `dashboardView` to the new default ONLY if cashier hasn't manually toggled mid-session. Implementation choice covered in Q-6 below.
- Multi-device: each device reads its own localStorage; admin in office, cashier on terminal — terminal needs to refresh to pick up an admin change unless the new value reaches the device through some other channel (out of scope; existing Task 1 behavior).

---

## 9. Gaps Found

### GAP-D1 — Conflict between admin default and mid-session cashier toggle
- Cashier opens dashboard at admin-default Order View. Cashier flips to Table View via Sidebar. Admin (in another tab) changes the default to Order View again. Should the cashier's tab snap back to Order View, or respect the cashier's manual flip?
- Today, cross-tab `storage` listener forces `setActiveView(e.newValue)` only when locked (lines 277-278). For the new "default" key we need an explicit decision.

### GAP-D2 — First-time tenant after deployment
- Tenant has never opened StatusConfigPage. localStorage has neither lock nor default key. Code falls back to factory hardcode (`'table'` / `'status'`). Confirm this is the intended factory default, OR define a different factory default in this requirement.

### GAP-D3 — Reset to Default button
- `StatusConfigPage.resetToDefault` (lines 228-237) currently resets the lock keys to `'both'`. Should it also reset the new default keys?
- Recommended: yes, reset both new keys to the factory default (`'table'` and `'status'`), so a user can recover from any state.

### GAP-D4 — Backward compat for tenants with the old (Task 1 v1) lock value
- Task 1 v1 stored `'channel'` / `'status'` only (no `'both'`). Task 1 v2 added `'both'`. Today's hydration accepts both. With this requirement, if a tenant is on v1 storage (legacy), the new default keys are missing → factory hardcode is used. Acceptable, but worth confirming.

### GAP-D5 — Existing screenshot text says "Choose Both to keep the default."
- The info card at `StatusConfigPage.jsx:763` advertises Both as "the default." Adding a new sub-setting under Both refines that wording. Copy update needed (one line).

### GAP-D6 — Default keys when axis is in lock mode
- If admin first sets axis = `'order'` (locked), then switches to `'both'`, the new default key may have never been set. Behavior must fall back to factory (Q-2 below). Confirm.

### GAP-D7 — Settings save → live update for the new keys
- The same latent issue as GAP-B in the Station Panel deep-dive: `StatusConfigPage.saveConfiguration` writes localStorage; if cashier is on the dashboard in the same tab (no `storage` event in same tab), the change requires either (a) a programmatic re-hydration trigger, or (b) navigation to dashboard. Same Task-1 path-nav effect at line 240-250 will handle (b) automatically. Confirm acceptable.

### GAP-D8 — Sidebar runtime toggles unchanged
- Sidebar `view-toggle` and `group-toggle` flip live state only. They neither read nor write the new default keys. Confirm acceptable (this matches Task 1 semantics).

---

## 10. Questions That Need Owner Approval (Answer Each)

### Q-1 — Storage shape
- (a) **Option A — two new keys** (`mygenie_default_pos_view`, `mygenie_default_dashboard_view`). RECOMMENDED.
- (b) Option B — single combined key `mygenie_view_defaults` with object value.

> **Your answer:** _______________________________________

### Q-2 — Factory defaults (when keys absent / first-time tenant) — GAP-D2, GAP-D6
- POS axis when `'both'` & no default saved:
  - (a) `'table'` (preserves current code behavior). RECOMMENDED.
  - (b) `'order'`.
- Dashboard axis when `'both'` & no default saved:
  - (a) `'status'` (preserves current code behavior). RECOMMENDED.
  - (b) `'channel'`.

> **Your answer:** _______________________________________

### Q-3 — Default value when admin first picks Both
- (a) Pre-select the historical default in the picker (`'table'` for POS, `'status'` for Dashboard). RECOMMENDED — zero surprise.
- (b) Force admin to pick (no default — picker starts blank, Save disabled until chosen).
- (c) Pre-select the most recently locked value if axis was previously locked.

> **Your answer:** _______________________________________

### Q-4 — UI placement
- (a) Inline sub-row under each existing 3-card axis row, only visible when axis = `'both'`. RECOMMENDED.
- (b) New separate "Default View" card section below "View Mode" with both axes inside, always visible (greyed out when axis ≠ `'both'`).
- (c) Modal / drawer on Save when axis = `'both'`.

> **Your answer:** _______________________________________

### Q-5 — Reset to Default button (GAP-D3)
- (a) Reset both new keys to the factory defaults (`'table'`, `'status'`). RECOMMENDED.
- (b) Leave new keys untouched.

> **Your answer:** _______________________________________

### Q-6 — Cross-tab live update conflict (GAP-D1)
- Cashier in tab A flipped from default-Order to Table via Sidebar. Admin in tab B saves a new default (`'order'` again). Should tab A:
  - (a) **Respect cashier's session flip** — do NOT snap back. Apply the new default only on next reload. RECOMMENDED.
  - (b) Snap back to admin default immediately.
  - (c) Ask the cashier ("Admin updated default. Switch?").

> **Your answer:** _______________________________________

### Q-7 — Visibility of the picker
- (a) Hide entirely when axis ≠ `'both'` (cleaner UI). RECOMMENDED.
- (b) Show greyed/disabled when axis ≠ `'both'` (admin can pre-set even while locked).

> **Your answer:** _______________________________________

### Q-8 — Help copy update (GAP-D5)
- Existing copy at `StatusConfigPage.jsx:763` says: "Choose **Both** to keep the default."
- Replacement (suggested): "Choose **Both** to let cashiers switch from the sidebar; you can also set which view opens first when both are enabled."
- (a) Use the suggested copy.
- (b) Custom copy — please paste:

> **Your answer:** _______________________________________

### Q-9 — Backward-compat for legacy (Task 1 v1) storage (GAP-D4)
- Tenants that never re-saved Settings since Task 1 v1 will have only the old lock keys (no `'both'`, no defaults). Behavior:
  - (a) Treat as factory defaults; no migration needed. RECOMMENDED.
  - (b) Run a one-shot migration on `StatusConfigPage` mount: if old format detected, convert and save.

> **Your answer:** _______________________________________

### Q-10 — Test-ID naming
- (a) `default-pos-view-table`, `default-pos-view-order`, `default-dashboard-view-channel`, `default-dashboard-view-status`. RECOMMENDED — matches existing `view-mode-to-*` / `view-mode-cs-*` convention.
- (b) Custom — please specify.

> **Your answer:** _______________________________________

### Q-11 — Sidebar runtime toggles (GAP-D8)
- Confirm: Sidebar `view-toggle` / `group-toggle` continue to flip in-memory only and do NOT write to the new default keys.
- (a) Confirm. RECOMMENDED.
- (b) Cashier flip should also persist as the new default (functionally equivalent to admin save).

> **Your answer:** _______________________________________

### Q-12 — V3 doc update
- (a) **YES** — add `AD-Default-View` to `/app/v3/ARCHITECTURE_DECISIONS_FINAL.md` capturing the storage contract and runtime precedence rule (lock > default > factory). RECOMMENDED.
- (b) NO — implementation only.

> **Your answer:** _______________________________________

### Q-13 — Permission gating
- The existing View Mode lock has no permission gate (any logged-in user with access to Settings can change it). Should the new Default View pickers be permission-gated, or follow the same pattern?
- (a) Same as existing — no extra gate. RECOMMENDED.
- (b) Gate on a permission key (specify).

> **Your answer:** _______________________________________

---

## 11. Risk / Impact

- **LOW** overall. Pure additive UI + a 4-line replacement of two hardcoded fallbacks.
- **NIL** for billing / socket / print / payment paths.
- One pitfall: forgetting to update the path-nav effect (`DashboardPage.jsx:240-250`) means returning to dashboard from Settings won't pick up the new default until reload. Implementation must touch both the initial-state lazy initializer AND the path-nav effect.

---

## 12. Test Plan (draft — final list goes into the implementation handover)

| # | Test case | Expected |
|---|---|---|
| T-1 | Both = Table/Order, Default = Order. Reload dashboard. | Lands on Order View. Sidebar shows both toggles. |
| T-2 | Both = Both, Default = Status. Reload dashboard. | Lands on Status View. |
| T-3 | Lock = `'order'`, Default = `'table'`. Reload. | Lands on Order View (lock wins). Default key preserved. |
| T-4 | Switch lock from `'order'` back to `'both'` (Default still `'table'`). Reload. | Lands on Table View. |
| T-5 | Cashier flips Sidebar toggle to Table while default = Order. | Tab shows Table for the session; reload returns to Order (admin default). |
| T-6 | Admin saves new default in another tab while cashier is on dashboard. | Per Q-6 answer (default = no snap-back). |
| T-7 | First-time tenant, no localStorage, axis defaults to `'both'`. | Lands on factory defaults (Table, Status). |
| T-8 | Reset to Default button. | Both new keys reset; UI sub-pickers reflect factory values. |
| T-9 | Settings page nav → Dashboard. | Path-nav effect picks up the new default without browser reload. |
| T-10 | Hide picker when axis ≠ `'both'` (Q-7=a). | Sub-picker not visible during lock; preserved internally. |
| T-11 | Save with default keys absent (admin clicks Save without ever opening the new picker). | Default key is written with factory value (Q-3=a behavior). |
| T-12 | Sidebar Sidebar `view-toggle` / `group-toggle` click. | In-memory flip only; new default keys unchanged in localStorage. |

---

## 13. What Happens Next

When you answer the 13 questions above, I will:
1. Pause the Station Panel deep-dive (Req 1) intake (you said "we will come back" — I'll await your nod).
2. Roll Reqs 1–4 into a single **`/app/memory/FOUR_REQUIREMENTS_IMPLEMENTATION_HANDOVER.md`** for the implementation agent (replacing the previously-mentioned `THREE_REQUIREMENTS_IMPLEMENTATION_HANDOVER.md`). Each requirement gets:
   - exact file ranges to edit,
   - decision table tied to your answers,
   - per-requirement test cases,
   - V3 doc patch (if requested),
   - rollback steps,
   - acceptance checklist.

---

## 14. Quick-answer cheat sheet (paste this back if all defaults are fine)

```
Q-1: a (two keys)
Q-2: a / a (table for POS, status for Dashboard)
Q-3: a (pre-select historical default)
Q-4: a (inline sub-row when 'both')
Q-5: a (Reset clears defaults too)
Q-6: a (no snap-back; cashier's session wins)
Q-7: a (hide picker when axis ≠ both)
Q-8: a (use suggested copy)
Q-9: a (no migration; treat as factory)
Q-10: a (default-{pos,dashboard}-view-{table,order,channel,status})
Q-11: a (sidebar toggles stay in-memory)
Q-12: a (add AD-Default-View)
Q-13: a (no permission gate)
```

---

_End of Req 4 deep-dive. No code or production docs modified._
