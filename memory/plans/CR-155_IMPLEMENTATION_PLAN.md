# CR-155 — Move Addon/Variation Stock to Menu Management
## Gate 3: Implementation Plan

**Date:** 2026-08-21
**Role:** PLANNING agent
**Stage:** Implementation Plan (Gate 3)
**Gate 2 doc:** `/app/memory/impact/CR-155_IMPACT_ANALYSIS.md`
**Gate 2 accuracy check:** PASS — all target lines verified 2026-08-21
**Risk:** MEDIUM (UI restructure — relocation only; AddonStockTab + VariationStockTab untouched)

---

## Scope Lock

**Files WILL change:**
1. `src/components/panels/MenuManagementPanel.jsx`
2. `src/components/settings/aggregatorSetup/AggregatorSetupView.jsx`

**Files will NOT touch:**
`AddonStockTab.jsx`, `VariationStockTab.jsx`, `aggregatorConfigService.js`,
`ProductList.jsx`, `BulkEditor.jsx`, `orderTransform.js`, any financial logic.

---

## Pre-Implementation Entry Check (MANDATORY)

```
1. MenuManagementPanel.jsx line 26:
   EXPECTED: const [addonPanelMode, setAddonPanelMode] = useState(false); // CR-144

2. MenuManagementPanel.jsx ~line 220:
   EXPECTED: {/* CR-144: Manage Add-ons button — always visible, no menuType guard */}

3. MenuManagementPanel.jsx ~line 258:
   EXPECTED: {addonPanelMode ? (

4. MenuManagementPanel.jsx line ~144:
   EXPECTED: if (menuType !== 'Aggregator') setSelectedClientId(null);

5. AggregatorSetupView.jsx line 9:
   EXPECTED: import AddonStockTab      from './AddonStockTab';    // CR-143

6. AggregatorSetupView.jsx line 81:
   EXPECTED: <button data-testid="tab-addon-stock"
```

If any mismatch → **STOP. Return to PLANNING agent.**

---

## Execution Sequence (5 edits across 2 files)

> **Execute CR-159 Edits 1 + 6 BEFORE starting CR-155** (they both touch MenuManagementPanel.jsx;
> avoid two sequential edits on the same section in same pass).
> CR-155 edits are independent of CR-159 BulkEditor edits — no conflict there.

---

### Edit 1 — `MenuManagementPanel.jsx`: Add imports

**search_replace — old_str:**
```js
import AddonManagementPanel from "./menu/AddonManagementPanel"; // CR-144
import * as menuService from "../../api/services/menuManagementService";
```

**search_replace — new_str:**
```js
import AddonManagementPanel from "./menu/AddonManagementPanel"; // CR-144
import AddonStockTab        from "../settings/aggregatorSetup/AddonStockTab";     // CR-155
import VariationStockTab    from "../settings/aggregatorSetup/VariationStockTab"; // CR-155
import * as menuService from "../../api/services/menuManagementService";
```

**Verify:** `grep "AddonStockTab\|VariationStockTab" MenuManagementPanel.jsx` → 2 import hits
**Risk:** LOW — additive imports only

---

### Edit 2 — `MenuManagementPanel.jsx`: Add `stockMode` state

**search_replace — old_str:**
```js
  const [addonPanelMode, setAddonPanelMode] = useState(false); // CR-144
```

**search_replace — new_str:**
```js
  const [addonPanelMode, setAddonPanelMode] = useState(false); // CR-144
  const [stockMode, setStockMode] = useState(null); // CR-155: null=closed | 'addon-stock' | 'variation-stock'
```

**Verify:** `grep "stockMode" MenuManagementPanel.jsx` → hits for state + usage
**Risk:** LOW — additive

---

### Edit 3 — `MenuManagementPanel.jsx`: Add "Aggregator Stock" button + reset on menuType change

**Two sub-edits in one search_replace block:**

**Sub-edit A — Button in header** (insert between existing "Add-ons" button and "Bulk Edit" button):

**search_replace — old_str:**
```jsx
          {/* Bulk Edit / Card View toggle */}
          <button
            data-testid="bulk-edit-toggle-btn"
            onClick={() => { setBulkEditMode(v => !v); if (addonPanelMode) setAddonPanelMode(false); }}
```

**search_replace — new_str:**
```jsx
          {/* CR-155: Aggregator Stock — OOS/Available toggle for addons + variations on aggregator platform.
              Only visible when Aggregator menu type is selected. */}
          {menuType === 'Aggregator' && (
            <button
              data-testid="aggregator-stock-btn"
              onClick={() => {
                setStockMode(v => v ? null : 'addon-stock');
                if (bulkEditMode)   setBulkEditMode(false);
                if (addonPanelMode) setAddonPanelMode(false);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors"
              style={{
                borderColor:     stockMode ? COLORS.primaryOrange : COLORS.borderGray,
                color:           stockMode ? COLORS.primaryOrange : COLORS.grayText,
                backgroundColor: stockMode ? '#FFF7ED' : 'transparent',
              }}
            >
              <Settings className="w-4 h-4" />
              Aggregator Stock
            </button>
          )}
          {/* Bulk Edit / Card View toggle */}
          <button
            data-testid="bulk-edit-toggle-btn"
            onClick={() => { setBulkEditMode(v => !v); if (addonPanelMode) setAddonPanelMode(false); if (stockMode) setStockMode(null); }}
```

**Note on Sub-edit A:** The existing "Bulk Edit" button's onClick also needs `if (stockMode) setStockMode(null)` added so switching to Bulk Edit closes the stock panel. This is included in the new_str above.

**Sub-edit B — Reset stockMode on menuType change:**

**search_replace — old_str:**
```js
  // CR-146: reset client filter when menu type leaves Aggregator
  useEffect(() => {
    if (menuType !== 'Aggregator') setSelectedClientId(null);
  }, [menuType]);
```

**search_replace — new_str:**
```js
  // CR-146: reset client filter when menu type leaves Aggregator
  // CR-155: reset stock mode when leaving Aggregator
  useEffect(() => {
    if (menuType !== 'Aggregator') {
      setSelectedClientId(null);
      setStockMode(null); // CR-155
    }
  }, [menuType]);
```

**Verify:** Switch to Normal menu while stockMode is open → panel closes.
**Risk:** LOW — additive logic in existing effect

---

### Edit 4 — `MenuManagementPanel.jsx`: Add stockMode render block

**search_replace — old_str:**
```jsx
      {/* Content — Card View or Bulk Editor or Addon Master — CR-144 */}
      {addonPanelMode ? (
```

**search_replace — new_str:**
```jsx
      {/* Content — Card View or Bulk Editor or Addon Master — CR-144 / Aggregator Stock — CR-155 */}
      {stockMode ? (
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Sub-tab row */}
          <div className="flex border-b flex-shrink-0 px-6 pt-2" style={{ borderColor: COLORS.borderGray }}>
            {[
              { key: 'addon-stock',     label: 'Addon Stock' },
              { key: 'variation-stock', label: 'Variation Stock' },
            ].map(({ key, label }) => (
              <button key={key}
                onClick={() => setStockMode(key)}
                className="px-4 py-2 text-sm font-medium border-b-2 transition-colors mr-1"
                style={{
                  borderBottomColor: stockMode === key ? COLORS.primaryOrange : 'transparent',
                  color: stockMode === key ? COLORS.primaryOrange : COLORS.grayText,
                }}
                data-testid={`stock-tab-${key}`}>
                {label}
              </button>
            ))}
          </div>
          {/* Tab content */}
          <div className="flex-1 overflow-auto p-4">
            {stockMode === 'addon-stock' && (
              <AddonStockTab // CR-155
                activeClientId={selectedClientId}
                subBrands={clients}
              />
            )}
            {stockMode === 'variation-stock' && (
              <VariationStockTab // CR-155
                activeClientId={selectedClientId}
                subBrands={clients}
              />
            )}
          </div>
        </div>
      ) : addonPanelMode ? (
```

**Verify:** Click "Aggregator Stock" → section opens with Addon Stock tab. Click Variation Stock → switches. Click button again → closes.
**Risk:** LOW — components are fully built; props verified available

---

### Edit 5 — `AggregatorSetupView.jsx`: Remove the two tabs

**Three removals in sequence (use three search_replace calls):**

**Removal A — imports (lines 9–10):**

**search_replace — old_str:**
```js
import AddonStockTab      from './AddonStockTab';    // CR-143
import VariationStockTab  from './VariationStockTab'; // CR-143
```

**search_replace — new_str:**
```js
// CR-155: AddonStockTab + VariationStockTab moved to MenuManagementPanel
```

**Removal B — tab buttons (lines 81–82):**

**search_replace — old_str:**
```jsx
        <button data-testid="tab-addon-stock"    style={tabStyle('addon-stock')}    onClick={() => setActiveTab('addon-stock')}>Addon Stock</button>
        <button data-testid="tab-variation-stock" style={tabStyle('variation-stock')} onClick={() => setActiveTab('variation-stock')}>Variation Stock</button>
```

**search_replace — new_str:**
```jsx
        {/* CR-155: Addon Stock + Variation Stock tabs moved to Menu Management panel */}
```

**Removal C — conditional renders (lines 128–140):**

**search_replace — old_str:**
```jsx
      {activeTab === 'addon-stock' && (     // CR-143
        <AddonStockTab
          activeClientId={activeClientId}
          subBrands={subBrands}
        />
      )}
      {activeTab === 'variation-stock' && ( // CR-143
        <VariationStockTab
          activeClientId={activeClientId}
          subBrands={subBrands}
        />
      )}
```

**search_replace — new_str:**
```jsx
      {/* CR-155: tabs removed — now in Menu Management → Aggregator Stock */}
```

**Verify:** Settings → Aggregator Setup → only 4 tabs remain: Configuration, Operational Settings, Sync & Catalog, Category Timings.
**Risk:** LOW — pure removal; no state or API dependency remains

---

## Verification Matrix

| Edit | File | Change | Self-test | Automated? |
|---|---|---|---|---|
| 1 | MenuManagementPanel.jsx | AddonStockTab + VariationStockTab imports | grep imports → 2 hits | YES |
| 2 | MenuManagementPanel.jsx | `stockMode` state | grep `stockMode` → hits | YES |
| 3A | MenuManagementPanel.jsx | "Aggregator Stock" button (Aggregator only) | Switch Aggregator → button appears | NO |
| 3A | MenuManagementPanel.jsx | Button hidden (Normal/Party/Premium) | Switch Normal → button absent | NO |
| 3B | MenuManagementPanel.jsx | stockMode resets on menuType change | Open stock → switch Normal → panel closes | NO |
| 4 | MenuManagementPanel.jsx | Stock section opens with Addon Stock default | Click button → Addon Stock tab active | NO |
| 4 | MenuManagementPanel.jsx | Variation Stock sub-tab | Click Variation Stock → tab switches, data loads | NO |
| 4 | MenuManagementPanel.jsx | Addon OOS from new location | Mark addon OOS → catalog status changes | NO |
| 4 | MenuManagementPanel.jsx | UrbanPiper toggle from new location | Enable/Disable UP → succeeds | NO |
| 5A | AggregatorSetupView.jsx | Imports removed | grep AddonStockTab in file → 0 component hits | YES |
| 5B | AggregatorSetupView.jsx | Tab buttons removed | Settings → Aggregator Setup → 4 tabs only | NO |
| 5C | AggregatorSetupView.jsx | Conditional renders removed | No render error on Aggregator Setup open | NO |

**Compile check:** `yarn build` must produce 0 new warnings after all 5 edits.

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-155 → status: IMPLEMENTED, sprint_key: pos_6_0
- [ ] CR_REGISTRY.md: CR-155 row → IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: add rows for MenuManagementPanel.jsx, AggregatorSetupView.jsx with CR-155 + date
- [ ] Code markers: // CR-155 present in all modified files (included in edit text above)
- [ ] Compile: webpack 0 new warnings
```

---

## Handover to Implementation Agent

```
"Plan ready. CR-155 — 5 edits across 2 files (+ 3 sub-removals in AggregatorSetupView).
 Scope: MenuManagementPanel.jsx (+45 lines), AggregatorSetupView.jsx (-12 lines).
 Files NOT touched: AddonStockTab.jsx, VariationStockTab.jsx — zero changes.
 Execute CR-159 Edits 1+6 before CR-155 Edit 3 (both touch MenuManagementPanel.jsx header).
 Risk: MEDIUM overall; individual edits LOW.
 Verification matrix: 12 checks (3 automated, 9 manual).
 Owner decisions: ALL resolved. Awaiting Gate 4 GO."
```
