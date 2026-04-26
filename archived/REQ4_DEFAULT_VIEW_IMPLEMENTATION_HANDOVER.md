# Req 4 — Default View Setting — Implementation Handover

**For:** Implementation agent (next session). This is a self-contained spec. Do not re-ask the owner.
**Source of decisions:** `/app/memory/DEFAULT_VIEW_SETTING_DECISIONS_LOCKED.md` (final), `/app/memory/DEFAULT_VIEW_SETTING_DEEPDIVE.md` (background).
**Branch:** `roomv2`. Hot reload is on; do not restart supervisor unless `.env` changes.

---

## 0. What you are building (1 paragraph)

Today, when admin sets a View Mode axis to `'both'`, the runtime initial view is hardcoded in `DashboardPage.jsx` (POS axis → `'table'`, Dashboard axis → `'status'`). You are replacing those hardcoded fallbacks with two new admin-controlled localStorage keys that surface as inline sub-row pickers in `StatusConfigPage.jsx` (visible only when the parent axis is `'both'`). Sidebar runtime toggles are unchanged. Factory defaults change to **Table + Channel**.

---

## 1. Final storage contract

| Key | Allowed values | Factory default | Active when |
|---|---|---|---|
| `mygenie_view_mode_table_order` (existing) | `'table' \| 'order' \| 'both'` | `'both'` | Always |
| `mygenie_default_pos_view` (NEW) | `'table' \| 'order'` | `'table'` | Above key = `'both'` |
| `mygenie_view_mode_channel_status` (existing) | `'channel' \| 'status' \| 'both'` | `'both'` | Always |
| `mygenie_default_dashboard_view` (NEW) | `'channel' \| 'status'` | `'channel'` | Above key = `'both'` |

**Runtime precedence per axis (used everywhere `activeView` / `dashboardView` are computed):**
1. Lock value when ∈ `{'table'|'order'}` / `{'channel'|'status'}` → use directly.
2. Else if lock = `'both'` → read `mygenie_default_*_view`; if valid, use it.
3. Else → factory default (`'table'` for POS, `'channel'` for Dashboard).

---

## 2. Files to touch (exact list)

| # | File | Change type |
|---|---|---|
| 1 | `frontend/src/pages/StatusConfigPage.jsx` | Add 2 constants + 2 state vars + hydrate + persist + extend `resetToDefault` + render 2 sub-row pickers + update help-copy |
| 2 | `frontend/src/pages/DashboardPage.jsx` | Replace 2 hardcoded fallbacks (initial-state initializers); update path-nav effect; update cross-tab `storage` listener |
| 3 | `/app/memory/V3_DOC_UPDATES_PENDING.md` | (Already done) — leave entry as-is; mark "Verified in code" later if validation passes |

No other files. No backend changes. No new dependencies.

---

## 3. StatusConfigPage.jsx — Step-by-step edits

### 3.1 Add constants (after line 34)

After the existing block:
```js
const VIEW_MODE_TABLE_ORDER_KEY = 'mygenie_view_mode_table_order';     // 'table' | 'order' | 'both'
const VIEW_MODE_CHANNEL_STATUS_KEY = 'mygenie_view_mode_channel_status'; // 'channel' | 'status' | 'both'
const DEFAULT_VIEW_MODE_TO = 'both';
const DEFAULT_VIEW_MODE_CS = 'both';
```

Add:
```js
// DEFAULT_VIEW (Req 4): admin-controlled default view that activates only
// when the corresponding axis lock above is 'both'. Allowed values:
//   'table'   | 'order'    for the POS axis
//   'channel' | 'status'   for the Dashboard axis
// When the parent axis is locked ('table'/'order' or 'channel'/'status'),
// these keys are PRESERVED in localStorage but ignored at runtime.
const DEFAULT_POS_VIEW_KEY = 'mygenie_default_pos_view';                // 'table' | 'order'
const DEFAULT_DASHBOARD_VIEW_KEY = 'mygenie_default_dashboard_view';    // 'channel' | 'status'
const DEFAULT_POS_VIEW_FACTORY = 'table';
const DEFAULT_DASHBOARD_VIEW_FACTORY = 'channel';
```

### 3.2 Add state vars (immediately after line 122, the existing `viewModeChannelStatus` state)

```js
// DEFAULT_VIEW (Req 4): defaults active only when parent axis = 'both'
const [defaultPosView, setDefaultPosView] = useState(DEFAULT_POS_VIEW_FACTORY);
const [defaultDashboardView, setDefaultDashboardView] = useState(DEFAULT_DASHBOARD_VIEW_FACTORY);
```

### 3.3 Extend the mount-time hydration block (inside the `useEffect` ending at line 192)

After the existing `try { ... }` block at lines 184-191, add a new `try` block:

```js
// DEFAULT_VIEW (Req 4): hydrate per-axis default-view values
try {
  const storedDefPos = localStorage.getItem(DEFAULT_POS_VIEW_KEY);
  if (storedDefPos === 'table' || storedDefPos === 'order') {
    setDefaultPosView(storedDefPos);
  }
  const storedDefDash = localStorage.getItem(DEFAULT_DASHBOARD_VIEW_KEY);
  if (storedDefDash === 'channel' || storedDefDash === 'status') {
    setDefaultDashboardView(storedDefDash);
  }
} catch (e) {
  console.error('Failed to parse stored default views:', e);
}
```

### 3.4 Extend `resetToDefault` (lines 228-237)

Add two lines inside the function, before `setHasChanges(true);`:
```js
setDefaultPosView(DEFAULT_POS_VIEW_FACTORY);
setDefaultDashboardView(DEFAULT_DASHBOARD_VIEW_FACTORY);
```

### 3.5 Extend `saveConfiguration` (lines 331-345)

After the existing `localStorage.setItem(VIEW_MODE_CHANNEL_STATUS_KEY, viewModeChannelStatus);` at line 339, add:
```js
// DEFAULT_VIEW (Req 4): persist per-axis default-view selections
localStorage.setItem(DEFAULT_POS_VIEW_KEY, defaultPosView);
localStorage.setItem(DEFAULT_DASHBOARD_VIEW_KEY, defaultDashboardView);
```

### 3.6 Update help-copy at line 763

Replace this exact text:
```
By default, cashiers see both view toggles in the sidebar and can switch on the fly. Pick a specific view here only if you want to lock the dashboard to that view for this device. Choose <strong>Both</strong> to keep the default.
```

With:
```
By default, cashiers see both view toggles in the sidebar and can switch on the fly. Pick a specific view to lock the dashboard. Choose <strong>Both</strong> to let cashiers switch freely — you can also set which view opens first when both are enabled.
```

(The `<strong>Both</strong>` JSX wrapping is preserved.)

### 3.7 Render the 2 new sub-row pickers

#### POS sub-picker — append immediately AFTER the closing `</div>` of the "Axis A — Table or Order View" block

Locate the closing `</div>` at line 813 (right after the `.map(...)` call ends at line 811). Insert the following block AFTER that `</div>` but BEFORE the next sibling `{/* Axis B — Channel or Status View */}` comment (around line 815):

```jsx
{/* DEFAULT_POS_VIEW (Req 4): sub-row picker visible only when parent axis = 'both' */}
{viewModeTableOrder === 'both' && (
  <div className="mt-4 ml-2 pl-4" style={{ borderLeft: `2px solid ${COLORS.borderGray}` }}>
    <label className="text-sm font-medium mb-3 block" style={{ color: COLORS.darkText }}>
      Default POS View
      <span className="text-xs ml-2" style={{ color: COLORS.grayText }}>
        Which view opens first when cashier loads the dashboard
      </span>
    </label>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {[
        { id: 'table', label: 'Table View', description: 'Open Table View first on load' },
        { id: 'order', label: 'Order View', description: 'Open Order View first on load' },
      ].map((opt) => {
        const isSelected = defaultPosView === opt.id;
        return (
          <div
            key={opt.id}
            data-testid={`default-pos-view-${opt.id}`}
            onClick={() => { setDefaultPosView(opt.id); setHasChanges(true); }}
            className="p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-sm"
            style={{
              backgroundColor: isSelected ? `${COLORS.primaryOrange}05` : COLORS.lightBg,
              borderColor: isSelected ? COLORS.primaryOrange : COLORS.borderGray,
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <span
                  className="font-medium text-sm"
                  style={{ color: isSelected ? COLORS.primaryOrange : COLORS.darkText }}
                >
                  {opt.label}
                </span>
                <p className="text-xs mt-1" style={{ color: COLORS.grayText }}>
                  {opt.description}
                </p>
              </div>
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: isSelected ? COLORS.primaryOrange : COLORS.borderGray }}
              >
                {isSelected && <Check className="w-3 h-3 text-white" />}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
)}
```

#### Dashboard sub-picker — append immediately AFTER the closing `</div>` of the "Axis B — Channel or Status View" block

Locate the closing `</div>` at line 861 (right after the second `.map(...)` call ends at line 859). Insert the following block AFTER that `</div>` but BEFORE the closing `</div>` of the "View Mode" card (around line 862):

```jsx
{/* DEFAULT_DASHBOARD_VIEW (Req 4): sub-row picker visible only when parent axis = 'both' */}
{viewModeChannelStatus === 'both' && (
  <div className="mt-4 ml-2 pl-4" style={{ borderLeft: `2px solid ${COLORS.borderGray}` }}>
    <label className="text-sm font-medium mb-3 block" style={{ color: COLORS.darkText }}>
      Default Dashboard View
      <span className="text-xs ml-2" style={{ color: COLORS.grayText }}>
        Which grouping opens first when cashier loads the dashboard
      </span>
    </label>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {[
        { id: 'channel', label: 'By Channel', description: 'Open Channel grouping first' },
        { id: 'status', label: 'By Status', description: 'Open Status grouping first' },
      ].map((opt) => {
        const isSelected = defaultDashboardView === opt.id;
        return (
          <div
            key={opt.id}
            data-testid={`default-dashboard-view-${opt.id}`}
            onClick={() => { setDefaultDashboardView(opt.id); setHasChanges(true); }}
            className="p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-sm"
            style={{
              backgroundColor: isSelected ? `${COLORS.primaryGreen}05` : COLORS.lightBg,
              borderColor: isSelected ? COLORS.primaryGreen : COLORS.borderGray,
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <span
                  className="font-medium text-sm"
                  style={{ color: isSelected ? COLORS.primaryGreen : COLORS.darkText }}
                >
                  {opt.label}
                </span>
                <p className="text-xs mt-1" style={{ color: COLORS.grayText }}>
                  {opt.description}
                </p>
              </div>
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: isSelected ? COLORS.primaryGreen : COLORS.borderGray }}
              >
                {isSelected && <Check className="w-3 h-3 text-white" />}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
)}
```

---

## 4. DashboardPage.jsx — Step-by-step edits

### 4.1 Add a small resolver helper (top of file, near other constants)

Add this helper after the existing imports / constants (around line 30, after the localStorage key constants if any; otherwise just add it inline as a `const` before the component definition):

```js
// DEFAULT_VIEW (Req 4): resolve initial view per axis with precedence
//   1) lock value (table|order or channel|status)
//   2) admin default (when lock = 'both')
//   3) factory default
const resolveInitialView = (lockKey, defaultKey, lockValues, defaultValues, factory) => {
  try {
    const lock = localStorage.getItem(lockKey);
    if (lockValues.includes(lock)) return lock;
    if (lock === 'both') {
      const def = localStorage.getItem(defaultKey);
      if (defaultValues.includes(def)) return def;
    }
  } catch (e) { /* localStorage unavailable */ }
  return factory;
};
```

### 4.2 Replace `activeView` initial state (lines 293-303)

Replace the entire block:
```js
const [activeView, setActiveView] = useState(() => {
  // VIEW_MODE_LOCK v2 (Task 1 revision, Step 4): if storage holds an
  // explicit lock ('table' or 'order') use it; otherwise (storage holds
  // 'both' or is absent) start at the legacy default 'table' so the
  // sidebar runtime toggle starts there.
  try {
    const stored = localStorage.getItem('mygenie_view_mode_table_order');
    if (stored === 'table' || stored === 'order') return stored;
  } catch (e) { /* localStorage unavailable */ }
  return 'table';
});
```

With:
```js
const [activeView, setActiveView] = useState(() =>
  resolveInitialView(
    'mygenie_view_mode_table_order',
    'mygenie_default_pos_view',
    ['table', 'order'],
    ['table', 'order'],
    'table'
  )
);
```

### 4.3 Replace `dashboardView` initial state (lines 304-310)

Replace:
```js
const [dashboardView, setDashboardView] = useState(() => {
  try {
    const stored = localStorage.getItem('mygenie_view_mode_channel_status');
    if (stored === 'channel' || stored === 'status') return stored;
  } catch (e) { /* localStorage unavailable */ }
  return 'status';
});
```

With:
```js
const [dashboardView, setDashboardView] = useState(() =>
  resolveInitialView(
    'mygenie_view_mode_channel_status',
    'mygenie_default_dashboard_view',
    ['channel', 'status'],
    ['channel', 'status'],
    'channel'  // Req 4: factory default changed from 'status' to 'channel'
  )
);
```

### 4.4 Update path-nav effect (lines 240-250)

Replace:
```js
try {
  const storedTO = localStorage.getItem('mygenie_view_mode_table_order');
  const isLockedTO = storedTO === 'table' || storedTO === 'order';
  setLockTableOrder(isLockedTO);
  if (isLockedTO) setActiveView(storedTO);

  const storedCS = localStorage.getItem('mygenie_view_mode_channel_status');
  const isLockedCS = storedCS === 'channel' || storedCS === 'status';
  setLockChannelStatus(isLockedCS);
  if (isLockedCS) setDashboardView(storedCS);
} catch (e) { /* localStorage unavailable */ }
```

With:
```js
try {
  const storedTO = localStorage.getItem('mygenie_view_mode_table_order');
  const isLockedTO = storedTO === 'table' || storedTO === 'order';
  setLockTableOrder(isLockedTO);
  if (isLockedTO) {
    setActiveView(storedTO);
  } else if (storedTO === 'both') {
    // Req 4: when lock = 'both', re-resolve from admin default on nav-back
    const defPos = localStorage.getItem('mygenie_default_pos_view');
    if (defPos === 'table' || defPos === 'order') setActiveView(defPos);
  }

  const storedCS = localStorage.getItem('mygenie_view_mode_channel_status');
  const isLockedCS = storedCS === 'channel' || storedCS === 'status';
  setLockChannelStatus(isLockedCS);
  if (isLockedCS) {
    setDashboardView(storedCS);
  } else if (storedCS === 'both') {
    // Req 4: when lock = 'both', re-resolve from admin default on nav-back
    const defDash = localStorage.getItem('mygenie_default_dashboard_view');
    if (defDash === 'channel' || defDash === 'status') setDashboardView(defDash);
  }
} catch (e) { /* localStorage unavailable */ }
```

**Note on cashier-flip preservation (Q-6 dropped):** the path-nav effect intentionally re-applies the admin default whenever cashier returns from another route. This matches the existing behavior for hard locks and is the simplest model.

### 4.5 Update cross-tab `storage` listener (lines 253-288)

After the existing two `if (e.key === 'mygenie_view_mode_*') { ... }` blocks (ending at line 284), add two more blocks BEFORE the closing `};` of `handleStorageChange`:

```js
// Req 4: cross-tab sync for default-view keys (only effective when
// parent axis is 'both' — admin saving a new default in another tab
// updates the dashboard view immediately if not currently locked)
if (e.key === 'mygenie_default_pos_view') {
  try {
    const lock = localStorage.getItem('mygenie_view_mode_table_order');
    if (lock === 'both' && (e.newValue === 'table' || e.newValue === 'order')) {
      setActiveView(e.newValue);
    }
  } catch (err) { /* ignore */ }
}
if (e.key === 'mygenie_default_dashboard_view') {
  try {
    const lock = localStorage.getItem('mygenie_view_mode_channel_status');
    if (lock === 'both' && (e.newValue === 'channel' || e.newValue === 'status')) {
      setDashboardView(e.newValue);
    }
  } catch (err) { /* ignore */ }
}
```

---

## 5. Acceptance test cases

Use the manual ↻ button + DevTools `localStorage` panel for verification.

| # | Setup (localStorage) | Reload dashboard → expected | Pass? |
|---|---|---|---|
| T-1 | `view_mode_table_order='both'`, `default_pos_view='order'` | `activeView === 'order'`. Sidebar shows Table↔Order toggle. | |
| T-2 | `view_mode_channel_status='both'`, `default_dashboard_view='channel'` | `dashboardView === 'channel'`. Sidebar shows Channel↔Status toggle. | |
| T-3 | `view_mode_table_order='order'` (locked), `default_pos_view='table'` | `activeView === 'order'` (lock wins). Default key preserved. Sidebar hides Table↔Order toggle. | |
| T-4 | Switch from T-3 → set lock back to `'both'` (default still `'table'`) | `activeView === 'table'` (default reactivates). | |
| T-5 | All localStorage cleared (first-time tenant) | `activeView === 'table'`, `dashboardView === 'channel'` (factory). No console errors. | |
| T-6 | Cashier flips Sidebar Table↔Order toggle to Order while admin default = `'table'` | Tab shows Order for the session; navigate away to Settings then back → `activeView === 'table'` (admin default re-applied per §4.4). | |
| T-7 | StatusConfigPage → set axis A = `'both'` → sub-picker visible. Set axis A = `'table'` → sub-picker hidden. Set back to `'both'` → sub-picker visible WITH the previously-saved default still selected. | Picker visibility toggles correctly; selection preserved. | |
| T-8 | StatusConfigPage → click "Reset to Default" | All four keys reset: lock keys = `'both'`, default keys = factory. UI reflects. | |
| T-9 | Two browser tabs open. Tab A: dashboard at default = `'order'`. Tab B: change `default_pos_view` to `'table'` and Save. | Tab A's `activeView` flips to `'table'` immediately (via storage event listener). | |
| T-10 | StatusConfigPage with axis A = `'both'` and `defaultPosView` never explicitly set → click Save without touching the picker. | localStorage `mygenie_default_pos_view = 'table'` (factory default written). | |
| T-11 | Help-copy text at the View Mode info card matches the new wording in §3.6. | Visual match. | |
| T-12 | Click Sidebar Table↔Order toggle when axis A = `'both'`. | In-memory flip only. localStorage `mygenie_default_pos_view` unchanged. | |
| T-13 | Existing tenants migrating: tenant has `view_mode_table_order='both'` (set in Task 1 v2 era) but NO `default_pos_view` key. | `activeView === 'table'` (factory). No console errors. | |

**All 13 must pass before declaring this task complete.**

---

## 6. Test-IDs (for any future automated test runs)

| Element | Test-ID |
|---|---|
| POS default = Table | `default-pos-view-table` |
| POS default = Order | `default-pos-view-order` |
| Dashboard default = Channel | `default-dashboard-view-channel` |
| Dashboard default = Status | `default-dashboard-view-status` |

---

## 7. Out of scope (do NOT do)

- Do NOT add a permission gate (Q-13 = a).
- Do NOT migrate legacy storage (Q-9 = a).
- Do NOT update any V3 doc inline (Q-12 = separate doc; entry already queued in `/app/memory/V3_DOC_UPDATES_PENDING.md`).
- Do NOT change Sidebar runtime toggles (Q-11 = a, in-memory only).
- Do NOT add a permission key, role-check, or backend persistence.

---

## 8. Definition of done

- [ ] All 13 test cases pass manually.
- [ ] `mcp_lint_javascript` clean for both edited files.
- [ ] Frontend boots; dashboard renders without console errors on a fresh tenant (cleared localStorage).
- [ ] Settings page renders without errors when toggling each axis between `'table'/'order'/'both'` and `'channel'/'status'/'both'`.
- [ ] Existing Task 1 v2 lock behavior is preserved (sidebar toggle hides on lock, shows on `'both'`).
- [ ] No supervisor restart needed (hot reload only).
- [ ] One smoke-test screenshot of dashboard + Settings page captured.
- [ ] Optionally: testing_agent_v3_fork called with frontend-only scope and these 13 test cases as the test list.
- [ ] Update `/app/memory/PRD.md` Visibility Settings section with one line: *"Default View Setting (Req 4) — admin can set default-when-Both for both axes; factory defaults Table + Channel."*
- [ ] Append session entry to `/app/memory/CHANGELOG.md` (create if missing) with date + summary.

---

## 9. Estimated effort

- Code edits: 30-45 min.
- Manual QA per §5: 15 min.
- Total: under 1 hour.

---

## 10. Quick verify before finish

```bash
# 1) confirm new keys are wired
grep -n "mygenie_default_pos_view\|mygenie_default_dashboard_view" /app/frontend/src/pages/StatusConfigPage.jsx /app/frontend/src/pages/DashboardPage.jsx

# 2) confirm factory default for dashboard axis changed from 'status' to 'channel'
grep -n "'channel'\s*//\s*Req 4" /app/frontend/src/pages/DashboardPage.jsx

# 3) confirm test-ids
grep -rn "default-pos-view-\|default-dashboard-view-" /app/frontend/src

# 4) lint
mcp_lint_javascript --path_pattern "/app/frontend/src/pages/StatusConfigPage.jsx /app/frontend/src/pages/DashboardPage.jsx"
```

All four should produce non-empty / clean output before finishing.

---

_End of implementation handover. Implementation agent: ship it._
