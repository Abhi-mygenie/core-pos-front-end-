# CR-430 — Impact Analysis (Gate 2 — Missing Toggle UI)
## Add "Auto-expand Served Items" toggle to StatusConfigPage

**ID:** CR-430 (Gap — toggle UI missing from original implementation)
**Stage:** Gate 2 | **Date:** 2026-10-17
**Risk:** LOW | **Priority:** P1

---

## Code Reality: PARTIAL

The localStorage **read** side is already implemented:
```javascript
// OrderCard.jsx L87 — already done ✅
const autoExpand = localStorage.getItem('mygenie_served_auto_expand') !== 'false';
if (_allServed && autoExpand) setShowServed(true);
```

The localStorage **write** side (the settings toggle UI) was **never built**. Currently no UI exists to set `mygenie_served_auto_expand`. Staff have no way to configure this preference from the app.

---

## Conflict Pre-Check

| Open item | File | Lines | Conflict? |
|---|---|---|---|
| No open items | touch StatusConfigPage.jsx | — | NO CONFLICT |

StatusConfigPage.jsx has not been touched by any open item in the sprint.

---

## Where the toggle goes — Decision

**StatusConfigPage** is the correct home. Rationale:
- It is the dedicated **per-device settings hub** — every device-level localStorage preference lives here
- It already has an identical toggle pattern for: `Order Taking`, `Stay on Order After Collect Bill`, `QSR Mode`, `Weight Entry Prompt`
- The "Served Items" behaviour is a **display preference** (not an API setting), exactly matching the character of existing toggles on this page
- The toggle section (Req 2 — Order Taking area, lines ~776-1000) is the correct section — labelled "Order View" or inline with other order-card display toggles

**Exact placement:**
After the `Weight Entry Prompt` toggle (around line ~1005), before the `Customer Fields` section (~line 1050). This groups it with other display-behaviour toggles.

---

## Data Flow

```
Staff opens Status Config page (/status-config or via dashboard gear icon)
  → reads localStorage.getItem('mygenie_served_auto_expand')
  → state: servedAutoExpand = (stored !== 'false') → true by default

Staff toggles the switch → ON / OFF
  → setServedAutoExpand(!servedAutoExpand)
  → setHasChanges(true)

Staff clicks "Save Configuration"
  → localStorage.setItem('mygenie_served_auto_expand', String(servedAutoExpand))

OrderCard.jsx L87 (already reads):
  → localStorage.getItem('mygenie_served_auto_expand') !== 'false'
  → if true + _allServed → setShowServed(true) (auto-expand ON)
  → if false → stays collapsed even when all items served
```

---

## Exact Edits Required

### E-1 — Add localStorage constant (StatusConfigPage.jsx, near line ~68)
```javascript
// Near other const KEY definitions (around L65-72)
const SERVED_AUTO_EXPAND_KEY = 'mygenie_served_auto_expand'; // CR-430
const SERVED_AUTO_EXPAND_FACTORY = true; // default: auto-expand ON
```

### E-2 — Add state (StatusConfigPage.jsx, near line ~193 with other state declarations)
```javascript
const [servedAutoExpand, setServedAutoExpand] = useState(SERVED_AUTO_EXPAND_FACTORY); // CR-430
```

### E-3 — Hydrate from localStorage on mount (StatusConfigPage.jsx, inside the mount useEffect ~line 221)
```javascript
// CR-430: hydrate served auto-expand preference
const storedServed = localStorage.getItem(SERVED_AUTO_EXPAND_KEY);
if (storedServed !== null) {
  setServedAutoExpand(storedServed !== 'false');
}
```

### E-4 — Persist on Save (StatusConfigPage.jsx, inside handleSave ~line 548)
```javascript
localStorage.setItem(SERVED_AUTO_EXPAND_KEY, String(servedAutoExpand)); // CR-430
```

### E-5 — Reset on factory reset (StatusConfigPage.jsx, inside handleReset)
```javascript
setServedAutoExpand(SERVED_AUTO_EXPAND_FACTORY); // CR-430
localStorage.removeItem(SERVED_AUTO_EXPAND_KEY);
```

### E-6 — Toggle UI JSX (StatusConfigPage.jsx, after Weight Entry Prompt toggle ~L1005)
New bordered card matching the existing `Order Taking` / `QSR Mode` pattern:
```jsx
{/* CR-430: Served Items Auto-expand toggle */}
<div
  className="rounded-lg p-4 border-2 flex items-start justify-between gap-4 mt-3"
  style={{
    backgroundColor: servedAutoExpand ? `${COLORS.primaryGreen}05` : COLORS.lightBg,
    borderColor: servedAutoExpand ? COLORS.primaryGreen : COLORS.borderGray,
  }}
>
  <div className="flex-1">
    <div className="flex items-center gap-2 mb-1">
      <span className="font-medium" style={{ color: COLORS.darkText }}>
        Auto-expand Served Items
      </span>
      <span
        className="text-xs px-2 py-0.5 rounded-full"
        style={{ backgroundColor: servedAutoExpand ? COLORS.primaryGreen : COLORS.grayText, color: '#fff' }}
      >
        {servedAutoExpand ? 'ON' : 'OFF'}
      </span>
    </div>
    <p className="text-xs leading-relaxed" style={{ color: COLORS.grayText }}>
      When ON, served items automatically expand on an order card once all items are served.
      Turn OFF to keep served items collapsed by default — staff tap ▼ to view them.
      Per-device setting.
    </p>
  </div>
  <button
    data-testid="served-auto-expand-toggle"
    onClick={() => { setServedAutoExpand(v => !v); setHasChanges(true); }}
    className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors focus:outline-none"
    style={{ backgroundColor: servedAutoExpand ? COLORS.primaryGreen : COLORS.borderGray }}
    role="switch"
    aria-checked={servedAutoExpand}
  >
    <span
      className="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform"
      style={{ transform: servedAutoExpand ? 'translateX(22px)' : 'translateX(2px)', marginTop: '2px' }}
    />
  </button>
</div>
```

---

## Scope Lock

**WILL change:** `src/pages/StatusConfigPage.jsx` only
- ~L68: add 2 constants
- ~L193: add 1 state declaration
- inside mount useEffect: 3 lines (hydrate)
- inside handleSave: 1 line (persist)
- inside handleReset: 2 lines (reset)
- JSX section: ~20 lines (new toggle card)

**WILL NOT touch:** `OrderCard.jsx` (read side already correct) · `SettingsPanel.jsx` · `DashboardPage.jsx` · any other file

---

## Verification Matrix

| # | Test | Expected |
|---|---|---|
| V1 | Open Status Config page — toggle visible | "Auto-expand Served Items" toggle present after Weight Entry Prompt |
| V2 | Toggle is ON by default (first visit) | Green border, "ON" pill |
| V3 | Toggle OFF → save → reload page | Toggle shows OFF, stays OFF after reload |
| V4 | Toggle OFF → open order card with all items served | Served section stays collapsed (▼ Served N visible, collapsed) |
| V5 | Toggle ON → open order card with all items served | Served section auto-expands as before |
| V6 | Factory reset → toggle returns to ON | Correct |

---

## Post-Code Registry Checklist
```
- [ ] registry.json: CR-430 → IMPLEMENTED (gap closed)
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: StatusConfigPage.jsx + CR-430 + date
- [ ] Code marker: // CR-430 on every new line
- [ ] Compile: 0 new warnings
```

*Gate 2 complete — 2026-10-17. Ready Gate 3 (Implementation Plan) on owner GO.*

---

## Addendum — Probe Transform Check (2026-10-17)

**Status:** DONE — run after Gate 3 plan was written, triggered by owner query.

### Transform chain verified end-to-end

| Step | Source | Verified |
|---|---|---|
| API field | `api.orderDetails[].food_status` (integer) | ✅ |
| Mapping | `F_ORDER_STATUS[5]` → `'served'` | ✅ |
| Consumed at | `orderTransform.js:283` — `(api.orderDetails \|\| []).map(fromAPI.orderItem)` | ✅ |
| Item field | `item.status` === `'served'` | ✅ |
| Condition | `_allServed` in `OrderCard.jsx:70-71` | ✅ |

### Live probe results — palmhouse (RID 541)

Probed 10 live running orders. `food_status` values present: 1 (preparing), 2 (ready), 5 (served).

| Order | f_order_status | Item statuses | _allServed |
|---|---|---|---|
| 1233292 | 1 | preparing×2, ready×2 | False |
| 1233287 | 5 | served×2 | **True** |
| 1233278 | 5 | served×1 | **True** |
| 1233271 | 5 | served×4 | **True** |
| 1232309 | 5 | served×1 | **True** |

**4 of 10 live orders trigger `_allServed = True`** — the toggle gates a real, frequently-fired condition.

### Findings
- No null `food_status` values in live data
- `serve_order_details` (present in API response) not referenced anywhere in FE — safe
- Transform chain is sound — no gaps
- **Plan CONFIRMED. No changes to Gate 3 plan required.**
