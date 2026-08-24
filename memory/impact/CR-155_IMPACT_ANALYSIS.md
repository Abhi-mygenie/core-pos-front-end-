# CR-155 — Move Addon/Variation Stock to Menu Management
## Gate 2: Impact Analysis (FINAL — design frozen 2026-08-21)

**Date:** 2026-08-21
**Role:** PLANNING agent
**Stage:** Impact Analysis (Gate 2) — COMPLETE
**Code Reality:** FULL for components (AddonStockTab + VariationStockTab fully built); NONE for wiring in MenuManagementPanel
**Conflict Pre-Check:** See Step 1 below
**Risk:** MEDIUM (UI restructure — relocation only, no new API calls)
**Design:** FROZEN — mockup at `/app/frontend/public/batch08-mockup.html`
**Related:** CR-143 (CLOSED — originally placed these tabs in AggregatorSetupView)

---

## What CR-155 Actually Does (owner confirmed 2026-08-21)

CR-155 is a **pure location move**. The two tabs being relocated are:

| Tab | What the buttons do | API behind it | Scope |
|---|---|---|---|
| **Addon Stock** | Mark addon master as OOS or Available on aggregator | `applyBulkAddon` (catalog, all brands) + `toggleAddonStock` (UrbanPiper, per brand) | Aggregator (Swiggy/Zomato via UrbanPiper) only |
| **Variation Stock** | Enable/Disable individual variation values per brand | `toggleVariation({ food_id, variation_index, variation_value_index, action })` | Aggregator per-brand only |

**Not involved:** addon CRUD (that is AddonManagementPanel CR-144), variation structure edit (that is Product Form), non-aggregator stock_out field (that is BulkEditor stockOut column).

---

## Design Decisions (Frozen)

| Decision | Answer | Source |
|---|---|---|
| What is being moved | Stock on/off tabs for aggregator addon + variation OOS management | Owner confirmed 2026-08-21 |
| Location in Menu Management | New "Aggregator Stock" button in header → inline section with sub-tabs | Design frozen 2026-08-21 |
| Visibility | Aggregator menuType ONLY — hidden for Normal/Party/Premium | Owner confirmed 2026-08-21 |
| Component files — move or stay? | Stay in `settings/aggregatorSetup/` — import cross-directory | Design frozen 2026-08-21 |
| Remove from AggregatorSetupView? | YES — remove tab buttons + conditional renders | Design frozen 2026-08-21 |
| API changes | NONE — same aggregatorConfigService calls, same buttons, same behaviour | Confirmed |
| Functionality change | ZERO — relocation only | Confirmed |

---

## Step 1 — Conflict Pre-Check

| File | Last Modifier | Open Conflict? |
|---|---|---|
| `MenuManagementPanel.jsx` | CR-144 (closed 2026-08-15) | Clean |
| `AggregatorSetupView.jsx` | CR-143 (closed) — original placement | Clean. Removing CR-143's tabs is the explicit intent of CR-155. |
| `AddonStockTab.jsx` | CR-143 (closed) | NOT MODIFIED — zero changes |
| `VariationStockTab.jsx` | CR-143 (closed) | NOT MODIFIED — zero changes |

**Execution order:** CR-155 and CR-159 share `MenuManagementPanel.jsx`. Both are safe to execute in same session. Recommended: CR-159 first (adds `deleteReasons` prop to BulkEditor call), then CR-155 (adds stockMode state + button + render block).

---

## Step 2 — Gate 2: Impact Analysis

### Current State vs Target State

| | Current | Target (CR-155) |
|---|---|---|
| AddonStockTab location | AggregatorSetupView.jsx tabs 5 | MenuManagementPanel.jsx (Aggregator mode only) |
| VariationStockTab location | AggregatorSetupView.jsx tab 6 | MenuManagementPanel.jsx (Aggregator mode only) |
| Entry point | Settings → Aggregator Setup → scroll to tab | Menu Management → Aggregator dropdown → "Aggregator Stock" button |
| Visibility gate | Always (inside aggregator settings) | `menuType === 'Aggregator'` |
| API calls | aggregatorConfigService (unchanged) | aggregatorConfigService (unchanged) |
| Props | `activeClientId`, `subBrands` from AggregatorSetupView | `activeClientId=selectedClientId`, `subBrands=clients` from MenuManagementPanel (already available) |

---

### Data Flow (Target)

```
MenuManagementPanel.jsx
  menuType === 'Aggregator'         ← gate
  stockMode state (null | 'addon-stock' | 'variation-stock')
    ↓ user clicks "Aggregator Stock" button
  stockMode = 'addon-stock'         ← default on open
    → renders inline section below header
      [Addon Stock] [Variation Stock] sub-tab buttons
        → stockMode === 'addon-stock':
            <AddonStockTab
              activeClientId={selectedClientId}   ← from MenuManagementPanel.selectedClientId (line 28)
              subBrands={clients}                  ← from MenuManagementPanel.clients (line 27)
            />
        → stockMode === 'variation-stock':
            <VariationStockTab
              activeClientId={selectedClientId}
              subBrands={clients}
            />
```

---

### Props Availability Verification

| Prop needed | From | Available in MenuManagementPanel? | Line |
|---|---|---|---|
| `activeClientId` | `selectedClientId` state | YES | Line 28 |
| `subBrands` | `clients` state | YES | Line 27 |

`clients` is already fetched via `fetchClients()` when `menuType === 'Aggregator'` (line 137 effect). Zero new API calls needed.

---

### Files WILL Change (2 files)

#### 1. `src/components/panels/MenuManagementPanel.jsx`

**Change A — Add imports** (after line 11, existing imports):
```js
import AddonStockTab     from '../settings/aggregatorSetup/AddonStockTab';     // CR-155
import VariationStockTab from '../settings/aggregatorSetup/VariationStockTab'; // CR-155
```

**Change B — Add `stockMode` state** (after line 26, after `addonPanelMode`):
```js
const [stockMode, setStockMode] = useState(null); // CR-155: null=closed, 'addon-stock', 'variation-stock'
```

**Change C — Add "Aggregator Stock" button in header** (in header right-buttons area, line ~220–257, after existing "Add-ons" button, before "Bulk Edit"):
```jsx
{/* CR-155: Aggregator Stock — only visible when Aggregator menu type is active */}
{menuType === 'Aggregator' && (
  <button
    data-testid="aggregator-stock-btn"
    onClick={() => {
      setStockMode(v => v ? null : 'addon-stock');
      if (bulkEditMode) setBulkEditMode(false);
      if (addonPanelMode) setAddonPanelMode(false);
    }}
    className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors"
    style={{
      borderColor: stockMode ? COLORS.primaryOrange : COLORS.borderGray,
      color:       stockMode ? COLORS.primaryOrange : COLORS.grayText,
      backgroundColor: stockMode ? '#FFF7ED' : 'transparent',
    }}
  >
    <Settings className="w-4 h-4" />
    Aggregator Stock
  </button>
)}
```

**Change D — Reset stockMode when leaving Aggregator** (add to existing `useEffect` at line 144–147 that resets `selectedClientId`):
```js
// CR-155: reset stock mode when leaving Aggregator
if (menuType !== 'Aggregator') setStockMode(null);
```

**Change E — Add stockMode render block** (in content area, add `stockMode` check alongside existing `addonPanelMode` / `bulkEditMode` checks at line ~260):
```jsx
{stockMode ? (
  <div className="flex-1 overflow-hidden flex flex-col">
    {/* Sub-tab switcher */}
    <div className="flex border-b flex-shrink-0 px-6 pt-2" style={{ borderColor: COLORS.borderGray }}>
      {[
        { key: 'addon-stock', label: 'Addon Stock' },
        { key: 'variation-stock', label: 'Variation Stock' },
      ].map(({ key, label }) => (
        <button key={key}
          onClick={() => setStockMode(key)}
          className="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
          style={{
            borderBottomColor: stockMode === key ? COLORS.primaryOrange : 'transparent',
            color: stockMode === key ? COLORS.primaryOrange : COLORS.grayText,
          }}
          data-testid={`stock-tab-${key}`}>
          {label}
        </button>
      ))}
    </div>
    <div className="flex-1 overflow-auto p-4">
      {stockMode === 'addon-stock' && (
        <AddonStockTab activeClientId={selectedClientId} subBrands={clients} /> // CR-155
      )}
      {stockMode === 'variation-stock' && (
        <VariationStockTab activeClientId={selectedClientId} subBrands={clients} /> // CR-155
      )}
    </div>
  </div>
) : addonPanelMode ? (
  ... existing addonPanelMode block
```

**Lines added:** ~45
**Risk:** LOW — components drop-in; all props available; no API changes

---

#### 2. `src/components/settings/aggregatorSetup/AggregatorSetupView.jsx`

**Remove — imports** (lines 9–10):
```js
import AddonStockTab      from './AddonStockTab';    // CR-143  ← REMOVE
import VariationStockTab  from './VariationStockTab'; // CR-143  ← REMOVE
```

**Remove — tab buttons** (lines 81–82):
```jsx
<button data-testid="tab-addon-stock"    ...>Addon Stock</button>    ← REMOVE
<button data-testid="tab-variation-stock" ...>Variation Stock</button> ← REMOVE
```

**Remove — conditional renders** (lines 128–140):
```jsx
{activeTab === 'addon-stock' && (     // CR-143  ← REMOVE block
  <AddonStockTab activeClientId={activeClientId} subBrands={subBrands} />
)}
{activeTab === 'variation-stock' && ( // CR-143  ← REMOVE block
  <VariationStockTab activeClientId={activeClientId} subBrands={subBrands} />
)}
```

**Lines removed:** ~12
**Risk:** LOW — pure removal. If `activeTab` state was ever persisted to localStorage as 'addon-stock' or 'variation-stock', it would fallback to no-render (safe, no crash).

---

### Files Will NOT Touch

`AddonStockTab.jsx`, `VariationStockTab.jsx`, `aggregatorConfigService.js`, `ProductList.jsx`, any financial logic, `BulkEditor.jsx` (separate CR), `orderTransform.js`.

---

## Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| Aggregator Stock accessible on Normal menu | HIGH | `menuType === 'Aggregator'` gate — button not rendered; stockMode render block unreachable |
| AddonStockTab calls fail on Normal restaurant | HIGH | Component never mounts due to gate. Zero risk. |
| `clients` empty when stockMode opens | LOW | `fetchClients()` already runs when menuType='Aggregator' (existing effect line 134-142). Tabs handle empty subBrands gracefully (BrandSelect shows just "Main Brand"). |
| `activeTab='addon-stock'` stale in AggregatorSetupView localStorage | LOW | AggregatorSetupView uses local state (useState('config')), not localStorage. On next open defaults to 'config'. |
| Staff confused by removal from Aggregator Setup | LOW | Owner has approved. No user-facing announcement needed — new location is more logical. |
| stockMode persists across menuType switch | LOW | Change D (useEffect) resets stockMode to null when menuType leaves Aggregator. |

---

## Verification Matrix (seeds QA handover)

| # | File | Change | How to Verify | Auto? |
|---|---|---|---|---|
| 1 | MenuManagementPanel.jsx | Aggregator Stock button visible in Aggregator mode | Switch to Aggregator → button visible in header | NO |
| 2 | MenuManagementPanel.jsx | Button NOT visible in Normal/Party/Premium | Switch to Normal → button absent from DOM | NO |
| 3 | MenuManagementPanel.jsx | Click opens Addon Stock tab by default | Click button → Addon Stock tab selected | NO |
| 4 | MenuManagementPanel.jsx | Variation Stock sub-tab switch works | Click Variation Stock → tab active + loads | NO |
| 5 | MenuManagementPanel.jsx | Addon OOS toggle works from new location | Mark addon OOS → catalog status changes | NO |
| 6 | MenuManagementPanel.jsx | UrbanPiper toggle works from new location | Enable/Disable UP → API call succeeds | NO |
| 7 | MenuManagementPanel.jsx | stockMode resets when switching to Normal | While stockMode open → switch to Normal → panel closes | NO |
| 8 | AggregatorSetupView.jsx | Addon Stock tab GONE from Aggregator Setup | Settings → Aggregator Setup → tabs: Config, Operational, Sync, Timings only | NO |
| 9 | AggregatorSetupView.jsx | Variation Stock tab GONE from Aggregator Setup | (same as above) | NO |
| 10 | Both | No console errors | Browser console clean | NO |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-155 → status: IMPLEMENTED, sprint_key: pos_6_0
- [ ] CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: MenuManagementPanel.jsx, AggregatorSetupView.jsx listed
- [ ] Code markers: // CR-155 in every modified file
```

---

**Owner decisions:** ALL RESOLVED (design frozen 2026-08-21)
**Next:** Gate 4 GO → Implementation
