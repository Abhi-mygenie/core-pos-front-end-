# CR-155 — Move Addon Stock and Variation Stock from Aggregator Setup to Menu Management

**Type:** Change Request (Feature Relocation)
**ID:** CR-155
**Date:** 2026-08-17
**Status:** INTAKE COMPLETE — awaiting Gate 2 (Planning)
**Screenshot Evidence:** Provided — shows Addon Stock and Variation Stock as tabs inside Aggregator Setup (`/aggregator/setup`)

---

## Description

The **Addon Stock** and **Variation Stock** management tabs are currently located inside **Aggregator Setup** (Settings → Aggregator Setup → tabs 5 & 6). Owner wants these moved to **Menu Management** where they logically belong — since addon and variation stock is general menu data, not aggregator-specific.

Screenshot confirms current location: `pos-uat.mygenie.online/aggregator/setup` → "Addon Stock" tab and "Variation Stock" tab.

## Classification

| Field | Value |
|---|---|
| Type | CR |
| Area | Menu Management / Aggregator Setup |
| Priority | P1 |
| Severity | HIGH — UX/discoverability issue; staff managing stock must enter aggregator config to find these controls |
| Risk | MEDIUM (UI restructure; components exist and work — this is a relocation, not a rewrite) |
| Fast Lane | NO — multi-file change (add to MenuManagementPanel, remove from AggregatorSetupView) |

## Evidence

- Source: OWNER-REPORTED + SCREENSHOT PROVIDED
- Screenshot: Aggregator Setup page (`/aggregator/setup`) showing Addon Stock (tab 5) and Variation Stock (tab 6) as active tabs
- Steps to reproduce: Navigate to Settings → Aggregator Setup → see Addon Stock and Variation Stock tabs that don't belong there
- Confidence: CONFIRMED (screenshot + code)

## Code Reality Check

```bash
# Current location (WRONG):
  components/settings/aggregatorSetup/AddonStockTab.jsx       ← component file
  components/settings/aggregatorSetup/VariationStockTab.jsx   ← component file
  components/settings/aggregatorSetup/AggregatorSetupView.jsx:
    line 9:   import AddonStockTab      from './AddonStockTab';    // CR-143
    line 10:  import VariationStockTab  from './VariationStockTab'; // CR-143
    line 81:  <button ... onClick={() => setActiveTab('addon-stock')}>Addon Stock</button>
    line 82:  <button ... onClick={() => setActiveTab('variation-stock')}>Variation Stock</button>
    line 128: {activeTab === 'addon-stock' && <AddonStockTab ... />}
    line 134: {activeTab === 'variation-stock' && <VariationStockTab ... />}

# Target location (CORRECT):
  components/panels/MenuManagementPanel.jsx
    - Already has: AddonManagementPanel (CR-144)
    - Already has: AggregatorStockToggle (per-product aggregator toggle)
    - Natural home for addon/variation stock management
```

- **Code reality: FULL** — components exist and work; relocation only
- Files to modify:
  - `src/components/settings/aggregatorSetup/AggregatorSetupView.jsx` (remove 2 tabs + imports)
  - `src/components/panels/MenuManagementPanel.jsx` (add Addon Stock + Variation Stock tabs/sections)
- Files NOT to touch: `AddonStockTab.jsx`, `VariationStockTab.jsx` (move file path or import from new location)

## Blast Radius

- ~6 lines removed from `AggregatorSetupView.jsx`
- New tab/section added to `MenuManagementPanel.jsx`
- Component files may need to move from `settings/aggregatorSetup/` to `panels/menu/` or stay and be imported cross-directory
- Estimated scope: MEDIUM (3 files, ~20-30 lines changed)

## Expected Behavior

- **Aggregator Setup** no longer shows "Addon Stock" or "Variation Stock" tabs
- **Menu Management** panel has Addon Stock and Variation Stock accessible (as new tabs or sections)
- All existing functionality of both tabs is preserved — only location changes
- No API changes needed

## Owner Decisions Needed

1. In Menu Management, should Addon Stock and Variation Stock appear as:
   a. New tab buttons alongside the existing Addons / Bulk Edit / Card view controls?
   b. As a separate section within the Addons panel?
2. Should the component files be physically moved to `components/panels/menu/` folder, or stay in `settings/aggregatorSetup/` and be imported cross-directory?

## Duplicate Check

RELATED to CR-143 (which originally added AddonStockTab and VariationStockTab to Aggregator Setup). This CR reverses that placement decision.

---

**Next:** Planning Gate 2
