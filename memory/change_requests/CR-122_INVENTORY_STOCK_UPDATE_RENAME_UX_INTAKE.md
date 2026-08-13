# CR-122 — Inventory: Rename "Smart Purchase" → "Stock Update" + Move Vendor Preview to Top

**Intake Date:** 2026-07-31
**Type:** CR (Change Request)
**Source:** OWNER-REPORTED
**Sprint:** pos_5_0

---

## 1. Owner Request

> "inventory module should be populated on top, currently user doesnt know as next step he need to scroll and submit, also button name should be Update Stock and Tab Name Stock Update not smart purchase also check if anywhere else these words or label needs to be changed"

**Screenshot evidence:** Provided — shows `GroupedVendorPreview` with vendor cards + "Submit Purchase (2 vendors)" button at the bottom of a long scrollable list.

---

## 2. Classification

- **Type:** CR (rename + UX layout)
- **Area:** Inventory → Smart Purchase (all surfaces)
- **Priority:** P1 — Operators confused by label; submit action buried below scroll
- **Risk:** MEDIUM — Multi-file label sweep + layout change in inventory module
- **Fast Lane eligible:** NO (multiple files + layout change)

---

## 3. Duplicate Check

- **DISTINCT**
- Related: **CR-078** (original Smart Purchase delivery CR — code author; component names MUST NOT change)
- Related: **BUG-263** (Smart Purchase no sticky toolbar — CSS only; different scope)

---

## 4. Evidence

- **Screenshot:** Provided (shows GroupedVendorPreview + "Submit Purchase (2 vendors)" button below item list)
- **Steps to reproduce:**
  1. Login → Inventory → "Smart Purchase" tab
  2. Add items to purchase list
  3. Observe: vendor preview section with submit button is at the **bottom** — requires scrolling
  4. Observe: tab label reads "Smart Purchase", button reads "Submit Purchase (N vendors)"
- **Source:** OWNER-REPORTED
- **Confidence:** CONFIRMED

---

## 5. Scope — All User-Facing Changes Required

### 5a. Label Renames (labels only — route paths and component names unchanged)

| File | Line | Current (WRONG) | Expected (CORRECT) |
|------|------|-----------------|-------------------|
| `InventoryTabBar.jsx` | 11 | `label: 'Smart Purchase'` | `label: 'Stock Update'` |
| `Sidebar.jsx` | 128 | `label: "Smart Purchase"` | `label: "Stock Update"` |
| `SmartPurchasePage.jsx` | 24 | `Smart Purchase` (heading) | `Stock Update` |
| `SmartPurchasePage.jsx` | 26 | description: "Pick a horizon, review suggestions, submit purchases by vendor." | "Pick a horizon, review stock needs, and update stock by vendor." |
| `SmartPurchasePanel.jsx` | 246 | `Loading Smart Purchase…` | `Loading Stock Update…` |
| `SmartPurchasePanel.jsx` | 298 | `Submit Purchase (N vendor(s))` | `Update Stock (N vendor(s))` |
| `SmartPurchasePanel.jsx` | 295 | bottom submit button text (same) | `Update Stock (N vendor(s))` |
| `SmartPurchasePanel.jsx` | 76 | `Failed to load Smart Purchase` | `Failed to load Stock Update` |
| `SmartPurchasePanel.jsx` | 189 | `notes: Smart Purchase · horizon ${horizonDays}d` | `Stock Update · horizon ${horizonDays}d` |

**DO NOT rename:** Route paths (`/inventory-smart-purchase`), component names (`SmartPurchasePage`, `SmartPurchasePanel`, `SmartPurchasePanel.jsx`), CSS class names, `data-testid` attributes, CR-078 code markers.

### 5b. UX Layout Change — GroupedVendorPreview to Top

**Current layout:**
```
[Sticky toolbar: HorizonPicker | Review & Submit button]   ← top
[Item list — 100+ rows, requires scroll]
[GroupedVendorPreview — vendor cards + payment dropdowns]  ← bottom (buried)
[Submit Purchase button]                                    ← bottom (buried)
```

**Expected layout:**
```
[Sticky toolbar: HorizonPicker | Update Stock button]      ← top
[GroupedVendorPreview — vendor cards + payment dropdowns]  ← MOVED HERE (top, visible without scroll)
[Item list — rows below]
```

**Implementation:** Move the `<GroupedVendorPreview>` block and the bottom submit `<Button>` from below the item list (`SmartPurchasePanel.jsx` ~line 275-300) to above it (~line 260, after toolbar ends).

---

## 6. Blast Radius

- **Files that WILL change:** 4
  - `InventoryTabBar.jsx` — tab label (1 line)
  - `Sidebar.jsx` — sidebar label (1 line)
  - `SmartPurchasePage.jsx` — heading + description (2 lines)
  - `SmartPurchasePanel.jsx` — 5 label strings + GroupedVendorPreview position
- **Files that will NOT touch:** `App.js` (routes unchanged), `SmartPurchasePanel.jsx` component name, `purchasePlanner.js`, `vendorRanking.js`, `GroupedVendorPreview.jsx`, `inventoryService.js`
- **Hotspot files touched:** NO (none on R5 list)
- **Estimated scope:** MEDIUM (4 files, ~15 lines labels + ~20 lines layout reorder)

---

## 7. Owner Decisions — RESOLVED (2026-07-31)

- **OD-1: ✅ RESOLVED — REMOVE the toolbar "Review & Submit" button entirely.**
  Owner said: "why we need 2 buttons?" → Only ONE submit button exists: "Update Stock (N vendors)" on the GroupedVendorPreview block, which moves to the top. Toolbar retains only the HorizonPicker.
  - **Impact:** `SmartPurchasePanel.jsx` line ~228-232 — entire toolbar submit `<Button>` block removed.

- **OD-2: ✅ RESOLVED — Rename API notes field.**
  `notes: 'Smart Purchase · horizon ${horizonDays}d'` → `'Stock Update · horizon ${horizonDays}d'`
  - **Impact:** `SmartPurchasePanel.jsx` line 189 — 1 string change.

---

## 8. Final Scope Lock (post-OD)

**Files WILL change (4):**
- `InventoryTabBar.jsx` — tab label (1 line)
- `Sidebar.jsx` — sidebar label (1 line)
- `SmartPurchasePage.jsx` — heading + description (2 lines)
- `SmartPurchasePanel.jsx` — 6 label strings + remove toolbar button + move GroupedVendorPreview above item list

**Files will NOT touch:** `App.js`, `GroupedVendorPreview.jsx`, `purchasePlanner.js`, `vendorRanking.js`, `inventoryService.js`, any route path.

**No open questions remain.**

---

*Next: Gate 4 GO → Implementation*
