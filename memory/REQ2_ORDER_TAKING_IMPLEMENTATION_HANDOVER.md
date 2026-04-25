# Req 2 — Order Taking Visibility — Implementation Handover

**For:** Implementation agent (next session). Self-contained spec. Do not re-ask the owner.
**Source of decisions:** `/app/memory/REQ2_ORDER_TAKING_DECISIONS_LOCKED.md` (final).
**Background analysis:** `/app/memory/REQ2_ADD_BUTTON_VISIBILITY_DEEPDIVE.md`.
**Branch:** `roomv2`. Hot reload is on; do not restart supervisor unless `.env` changes.

---

## 0. What you are building (1 paragraph)

A new admin-controlled "Order Taking" toggle in `StatusConfigPage` that, when disabled, hides the top-right `Add` button and converts all card body clicks (which today open OrderEntry) into silent no-ops. In-card action buttons (Mark Ready, Mark Served, Print KOT, Print Bill, Confirm, Cancel) continue working — so kitchen-floor staff can still service existing orders without being able to take or edit them. Sidebar nav, Header status filters, Settings access, and Station Panel are unaffected.

---

## 1. Final storage contract

| Key | Allowed values | Factory default | Active when |
|---|---|---|---|
| `mygenie_order_taking_enabled` (NEW) | JSON object `{ enabled: true \| false }` | `{ enabled: true }` | Always |

**Resolver helper (used in Header + DashboardPage):**

```js
const isOrderTakingEnabled = () => {
  try {
    const stored = localStorage.getItem('mygenie_order_taking_enabled');
    if (stored === null) return true;            // factory default
    const parsed = JSON.parse(stored);
    return parsed?.enabled !== false;            // anything other than explicit false → enabled
  } catch (e) {
    return true;                                  // corrupt JSON → safe default
  }
};
```

---

## 2. Files to touch (exact list)

| # | File | Change type |
|---|---|---|
| 1 | `frontend/src/pages/StatusConfigPage.jsx` | + 2 const + 1 state + hydrate (with backfill, Req-4 pattern) + persist + extend `resetToDefault` + render new "UI Elements" section card |
| 2 | `frontend/src/components/layout/Header.jsx` | + state for the flag + storage event subscription + conditional render of Add button |
| 3 | `frontend/src/pages/DashboardPage.jsx` | + state for the flag + storage event subscription + early return at top of `handleTableClick` (line 1069) when flag = false |

No other files. No backend changes. No new dependencies.

---

## 3. StatusConfigPage.jsx — Step-by-step edits

### 3.1 Add constants (near other localStorage-key constants, after the `DEFAULT_VIEW_*` block ~line 50)

```js
// Req 2: Order Taking master switch — when disabled, all paths to
// OrderEntry / Room Check-In modal are silently no-op'd.
const ORDER_TAKING_KEY = 'mygenie_order_taking_enabled';
const ORDER_TAKING_FACTORY = true;
```

### 3.2 Add state var (near other settings state, around line 124)

```js
// Req 2: Order Taking master switch (default enabled — preserves legacy behavior)
const [orderTakingEnabled, setOrderTakingEnabled] = useState(ORDER_TAKING_FACTORY);
```

### 3.3 Extend mount-time hydration (inside the existing `useEffect` after the `DEFAULT_VIEW` hydrate block from Req 4)

```js
// Req 2: hydrate Order Taking flag with first-visit backfill
try {
  const stored = localStorage.getItem(ORDER_TAKING_KEY);
  if (stored === null) {
    // Backfill factory default so storage shape stays consistent
    localStorage.setItem(ORDER_TAKING_KEY, JSON.stringify({ enabled: ORDER_TAKING_FACTORY }));
  } else {
    const parsed = JSON.parse(stored);
    setOrderTakingEnabled(parsed?.enabled !== false);
  }
} catch (e) {
  console.error('Failed to parse Order Taking flag:', e);
}
```

### 3.4 Extend `resetToDefault` (after the existing Req 4 reset lines, ~line 263)

```js
// Req 2: also reset Order Taking to factory
setOrderTakingEnabled(ORDER_TAKING_FACTORY);
```

### 3.5 Extend `saveConfiguration` (after the existing Req 4 persist lines, ~line 374)

```js
// Req 2: persist Order Taking flag
localStorage.setItem(ORDER_TAKING_KEY, JSON.stringify({ enabled: orderTakingEnabled }));
```

### 3.6 Render the "UI Elements" section card

Place this **after** the "Visibility Settings" status-filter card and **before** the "Station View" card (search for the closing `</div>` of the status-filter section, then insert the block immediately after).

```jsx
{/* ============== UI ELEMENTS (Req 2: Order Taking) ============== */}
<div
  className="rounded-xl p-5 border-2 shadow-sm"
  style={{ backgroundColor: COLORS.white, borderColor: COLORS.borderGray }}
>
  <div className="flex items-center justify-between mb-3">
    <div>
      <h3 className="text-lg font-semibold mb-1" style={{ color: COLORS.darkText }}>
        UI Elements
      </h3>
      <p className="text-sm" style={{ color: COLORS.grayText }}>
        Control which dashboard actions are available on this device.
      </p>
    </div>
  </div>

  <div
    className="rounded-lg p-4 border flex items-start justify-between gap-4"
    style={{
      backgroundColor: orderTakingEnabled ? `${COLORS.primaryGreen}05` : COLORS.lightBg,
      borderColor: orderTakingEnabled ? COLORS.primaryGreen : COLORS.borderGray,
    }}
  >
    <div className="flex-1">
      <div className="flex items-center gap-2 mb-1">
        <span className="font-medium" style={{ color: COLORS.darkText }}>
          Order Taking
        </span>
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: orderTakingEnabled ? COLORS.primaryGreen : COLORS.grayText,
            color: COLORS.white,
          }}
        >
          {orderTakingEnabled ? 'ON' : 'OFF'}
        </span>
      </div>
      <p className="text-xs leading-relaxed" style={{ color: COLORS.grayText }}>
        When OFF, this device cannot create new orders or open existing orders for editing.
        Staff can still mark items ready/served and print bills/KOTs. Useful for kitchen-floor
        staff or service-only terminals.
      </p>
    </div>
    <button
      data-testid="order-taking-toggle"
      onClick={() => { setOrderTakingEnabled(v => !v); setHasChanges(true); }}
      className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors focus:outline-none"
      style={{ backgroundColor: orderTakingEnabled ? COLORS.primaryGreen : COLORS.borderGray }}
      role="switch"
      aria-checked={orderTakingEnabled}
    >
      <span
        className="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform"
        style={{ transform: orderTakingEnabled ? 'translateX(22px)' : 'translateX(2px)', marginTop: '2px' }}
      />
    </button>
  </div>
</div>
```

---

## 4. Header.jsx — Step-by-step edits

### 4.1 Add state + listener (inside the component, after existing `useState` declarations)

```jsx
// Req 2: Order Taking flag — when false, hide the Add button
const [orderTakingEnabled, setOrderTakingEnabled] = useState(() => {
  try {
    const stored = localStorage.getItem('mygenie_order_taking_enabled');
    if (stored === null) return true;
    const parsed = JSON.parse(stored);
    return parsed?.enabled !== false;
  } catch (e) {
    return true;
  }
});

useEffect(() => {
  const handler = (e) => {
    if (e.key === 'mygenie_order_taking_enabled') {
      try {
        const parsed = e.newValue ? JSON.parse(e.newValue) : null;
        setOrderTakingEnabled(parsed?.enabled !== false);
      } catch (err) {
        setOrderTakingEnabled(true);
      }
    }
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}, []);
```

### 4.2 Conditionally render the Add button (lines 591-600)

Replace:

```jsx
{/* Add Order Button */}
<button
  data-testid="add-table-btn"
  className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg transition-colors hover:opacity-80"
  style={{ backgroundColor: COLORS.primaryOrange, color: "white" }}
  onClick={onAddOrder}
>
  <PlusSquare className="w-4 h-4" />
  <span className="text-sm font-medium">Add</span>
</button>
```

With:

```jsx
{/* Add Order Button — Req 2: hidden when Order Taking is OFF */}
{orderTakingEnabled && (
  <button
    data-testid="add-table-btn"
    className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg transition-colors hover:opacity-80"
    style={{ backgroundColor: COLORS.primaryOrange, color: "white" }}
    onClick={onAddOrder}
  >
    <PlusSquare className="w-4 h-4" />
    <span className="text-sm font-medium">Add</span>
  </button>
)}
```

---

## 5. DashboardPage.jsx — Step-by-step edits

### 5.1 Add state + listener (after existing `useState` declarations near line 380)

```jsx
// Req 2: Order Taking flag — when false, all card body clicks no-op
const [orderTakingEnabled, setOrderTakingEnabled] = useState(() => {
  try {
    const stored = localStorage.getItem('mygenie_order_taking_enabled');
    if (stored === null) return true;
    const parsed = JSON.parse(stored);
    return parsed?.enabled !== false;
  } catch (e) {
    return true;
  }
});

useEffect(() => {
  const handler = (e) => {
    if (e.key === 'mygenie_order_taking_enabled') {
      try {
        const parsed = e.newValue ? JSON.parse(e.newValue) : null;
        setOrderTakingEnabled(parsed?.enabled !== false);
      } catch (err) {
        setOrderTakingEnabled(true);
      }
    }
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}, []);
```

### 5.2 Gate `handleTableClick` (line 1069)

Replace the function start:

```js
const handleTableClick = (tableEntry) => {
  // Allow null to clear table selection (used after prepaid payment)
  if (!tableEntry) {
    setOrderEntryTable(null);
    return;
  }
  // Block clicks on engaged tables/orders (update in progress)
  if (isTableEngaged(tableEntry.id) || isOrderEngaged(tableEntry.orderId)) {
```

With:

```js
const handleTableClick = (tableEntry) => {
  // Allow null to clear table selection (used after prepaid payment)
  if (!tableEntry) {
    setOrderEntryTable(null);
    return;
  }
  // Req 2: Order Taking disabled — silent no-op on all card body clicks.
  // Action buttons within cards (Mark Ready/Served, Print, Confirm, Cancel)
  // bypass this handler and continue working.
  if (!orderTakingEnabled) {
    return;
  }
  // Block clicks on engaged tables/orders (update in progress)
  if (isTableEngaged(tableEntry.id) || isOrderEngaged(tableEntry.orderId)) {
```

### 5.3 (Optional polish — defer if time-boxed) Cursor feedback on cards

The owner picked silent no-op. The minimum-viable approach above leaves card cursors as `pointer` (the existing CSS) even when click is dead. To add cursor feedback:

- Wrap the dashboard root `<div>` (around the card grids) with a conditional class:
  ```jsx
  <div className={`flex-1 overflow-auto ${!orderTakingEnabled ? 'order-taking-disabled' : ''}`}>
  ```
- Add to `frontend/src/index.css` (or any global stylesheet):
  ```css
  .order-taking-disabled [data-testid="table-card"],
  .order-taking-disabled [data-testid="dine-in-card"],
  .order-taking-disabled [data-testid="delivery-card"],
  .order-taking-disabled [data-testid="order-card"] {
    cursor: default !important;
  }
  ```
- Note: in-card action buttons must KEEP their `cursor: pointer` because they have explicit button styling. Verify by opening DevTools and hovering buttons in disabled mode — they should still show pointer.

If implementation time is tight, ship without cursor feedback (silent no-op covers the functional requirement). Cursor feedback is purely visual polish.

---

## 6. Acceptance test cases

| # | Setup | Expected | Pass? |
|---|---|---|---|
| T-1 | Default install (no localStorage key) | Order Taking is ON. Add button visible. Card clicks open OrderEntry. | |
| T-2 | localStorage `mygenie_order_taking_enabled = {"enabled":false}` → reload | Add button NOT in DOM. Card body clicks do nothing (no OrderEntry opens). Empty table clicks → no-op. Available room click → no-op (Check-In modal does NOT open). | |
| T-3 | T-2 setup + click "Mark Ready" / "Mark Served" / "Print KOT" / "Print Bill" buttons inside any card | Those actions complete normally (action buttons are NOT gated). | |
| T-4 | Open `/visibility/status-config` → toggle Order Taking OFF → Save → navigate to `/dashboard` | Add button hidden; card clicks no-op. | |
| T-5 | T-4 setup + open Settings in another browser tab → toggle ON → Save → check first tab | First tab's Add button reappears (cross-tab `storage` event). Card clicks resume normally. | |
| T-6 | First-time tenant (clear all localStorage) → open `/visibility/status-config` | localStorage `mygenie_order_taking_enabled` backfilled with `{"enabled":true}`. Toggle UI shows ON. | |
| T-7 | Click "Reset to Default" on Status Config page | Order Taking flag resets to ON. localStorage reflects. | |
| T-8 | Order Taking OFF → header status filters / sidebar nav / Settings link / Station Panel | All continue working — only OrderEntry-opening paths are blocked. | |
| T-9 | Order Taking OFF → click Header search results | Search behavior unchanged (search opens result detail; does not start a new order). |  |
| T-10 | data-testid `order-taking-toggle` is present on Status Config page | Visible and clickable in the new "UI Elements" section card. | |

---

## 7. Out of scope (do NOT do)

- Backend changes / new API endpoints / DB.
- New permission keys.
- Migrating to a permission-based system (P3 backlog).
- Hiding empty cards or status filters or sidebar items.
- Toast notifications on blocked clicks (owner picked silent no-op).
- V3 doc inline updates — append `AD-Order-Taking-Toggle` entry to `/app/memory/V3_DOC_UPDATES_PENDING.md` only.

---

## 8. Definition of done

- [ ] All 10 test cases pass manually OR via `testing_agent_v3_fork`.
- [ ] `mcp_lint_javascript` clean for all 3 edited files.
- [ ] Frontend boots; dashboard renders without console errors when flag = true AND when flag = false.
- [ ] Existing Req 4 (Default View) behavior is preserved (regression spot-check on `view-mode-to-*` cards).
- [ ] No supervisor restart needed (hot reload only).
- [ ] One smoke screenshot of dashboard with flag OFF (Add button absent).
- [ ] Update `/app/memory/PRD.md` Visibility Settings section with one line: *"Order Taking (Req 2) — admin can disable order creation/editing on a device; in-card service buttons (Mark Ready/Served, Print) continue working."*
- [ ] Append session entry to `/app/memory/CHANGELOG.md`.
- [ ] Append `AD-Order-Taking-Toggle` entry to `/app/memory/V3_DOC_UPDATES_PENDING.md` for the V3 validation agent.

---

## 9. Estimated effort

- Code edits: 30-40 min.
- Manual QA per §6: 15 min.
- Total: under 1 hour.

---

## 10. Quick verify before finish

```bash
# 1) confirm new keys are wired
grep -n "mygenie_order_taking_enabled\|orderTakingEnabled\|ORDER_TAKING_KEY" \
  /app/frontend/src/pages/StatusConfigPage.jsx \
  /app/frontend/src/components/layout/Header.jsx \
  /app/frontend/src/pages/DashboardPage.jsx

# 2) confirm test-id
grep -n 'data-testid="order-taking-toggle"' /app/frontend/src/pages/StatusConfigPage.jsx

# 3) confirm Add button is conditionally rendered in Header
grep -n "orderTakingEnabled && " /app/frontend/src/components/layout/Header.jsx

# 4) lint
mcp_lint_javascript --path_pattern "/app/frontend/src/pages/StatusConfigPage.jsx /app/frontend/src/components/layout/Header.jsx /app/frontend/src/pages/DashboardPage.jsx"
```

All four should produce non-empty / clean output before finishing.

---

_End of implementation handover. Implementation agent: ship it._
