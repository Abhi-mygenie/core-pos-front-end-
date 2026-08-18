# QA Handover — Misc Fixes: BUG-262, BUG-263, BUG-264, BUG-265

**Document:** QA_HANDOVER_MISC_BUG262_265_2026_07_31.md
**Items:** BUG-262 · BUG-263 · BUG-264 · BUG-265
**Implementation Date:** 2026-07-27

---

## 1. Registry Sync Confirmation

```
Items: BUG-262, BUG-263, BUG-264, BUG-265 — IMPLEMENTED gate 5a
Code markers:
  ✅ BUG-262: LoginPage.jsx L100/107 · SplitBillModal.jsx L203 · InventorySetupPanel.jsx L275 · InventoryIntelligencePanel.jsx L61
  ✅ BUG-263: SmartPurchasePanel.jsx L219-220: sticky top-0 z-10
  ✅ BUG-264: SmartPurchasePanel.jsx L104: 'System Vendor (no purchase history)'
  ✅ BUG-265: InventorySetupPanel.jsx L319: placeholder hint for conversion input
```

---

## 2. Code Checks

| Check | Command | Expected |
|-------|---------|---------|
| C1-BUG262 | `grep -c 'BUG-262' /app/frontend/src/pages/LoginPage.jsx` | 2 |
| C2-BUG262 | `grep -c 'BUG-262' /app/frontend/src/components/inventory/InventoryIntelligencePanel.jsx` | 1 |
| C3-BUG262 | `grep -c 'BUG-262' /app/frontend/src/components/inventory/InventorySetupPanel.jsx` | 1 |
| C4-BUG263 | `grep -c 'sticky top-0' /app/frontend/src/components/inventory/SmartPurchasePanel.jsx` | ≥1 |
| C5-BUG264 | `grep -c 'no purchase history' /app/frontend/src/components/inventory/SmartPurchasePanel.jsx` | 1 |
| C6-BUG265 | `grep -c 'new-ingredient-conversion\|edit-ingredient-conversion' /app/frontend/src/components/inventory/InventorySetupPanel.jsx` | ≥2 |

---

## 3. Test Cases

### BUG-262 — Coming Soon Placeholders Removed

| TC# | Steps | Expected |
|-----|-------|---------|
| TC-1 | Login page → observe | No "Coming Soon" demo request button |
| TC-2 | Inventory → Setup → Ingredients tab → "Import" button | No "Coming Soon" tooltip on the import button |
| TC-3 | Inventory → Intelligence tab → Wastage section | No "Coming Soon" wastage placeholder section |
| TC-4 | Split Bill modal (Dine-In → Split) | Equal split functions as calculation; no "Coming Soon" badge |

### BUG-263 — Sticky Toolbar in Stock Update

| TC# | Steps | Expected |
|-----|-------|---------|
| TC-5 | Inventory → Stock Update → scroll down through items | Top toolbar (search/date controls) sticks to top while scrolling |
| TC-6 | Scroll back to top | Toolbar remains accessible |

### BUG-264 — System Vendor Label

| TC# | Steps | Expected |
|-----|-------|---------|
| TC-7 | Inventory → Stock Update → any item → Vendor dropdown | "System Vendor (no purchase history)" visible as a dropdown option (not just "System") |

### BUG-265 — Conversion Factor Hint

| TC# | Steps | Expected |
|-----|-------|---------|
| TC-8 | Inventory → Setup → Add new ingredient → fill base unit + small unit | Conversion input shows placeholder like "1 kg = ? gm" describing the expected format |
| TC-9 | Edit existing ingredient with auto-mapped units (kg/ltr) | Conversion column shows "—" (read-only, no input needed) |

---

## 4. Credentials + Environment

| Field | Value |
|---|---|
| Login | `owner@18march.com` / `Qplazm@10` |
| Notes | TC-3 requires Intelligence tab to have no wastage data showing placeholder. TC-7 requires Stock Update to have loaded items. |
