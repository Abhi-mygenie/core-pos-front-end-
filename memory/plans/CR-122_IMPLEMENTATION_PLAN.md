# CR-122 — Implementation Plan (Gate 3)

**ID:** CR-122  
**Stage:** Implementation Plan  
**Impact Analysis:** `/app/memory/impact/CR-122_IMPACT_ANALYSIS.md`  
**Code Reality:** NONE (confirmed — no existing CR-122 edits in codebase)  
**Risk:** LOW-MEDIUM  
**Date:** 2026-07-31  

---

## Scope Lock

**Files WILL change (4):**
1. `components/inventory/InventoryTabBar.jsx`
2. `components/layout/Sidebar.jsx`
3. `pages/SmartPurchasePage.jsx`
4. `components/inventory/SmartPurchasePanel.jsx`

**Files WILL NOT touch:** `App.js`, `GroupedVendorPreview.jsx`, `AutoShoppingList.jsx`, `purchasePlanner.js`, `vendorRanking.js`, `inventoryService.js`, any route paths, `data-testid` attributes (except removing the one on the deleted button).

---

## Execution Sequence

```
Edit 1: InventoryTabBar.jsx  — 1 line (label rename)
Edit 2: Sidebar.jsx          — 1 line (label rename)           ← parallel with Edit 1
Edit 3: SmartPurchasePage.jsx — 1 line (heading rename)        ← parallel with Edit 1, 2
Edit 4: SmartPurchasePanel.jsx — 6 string edits + 1 block remove + 1 reorder
```

Batch 1 (parallel): Edits 1, 2, 3  
Batch 2 (sequential): Edit 4 (all sub-edits within SmartPurchasePanel)

---

## Edit 1 — InventoryTabBar.jsx: Rename tab label

**File:** `frontend/src/components/inventory/InventoryTabBar.jsx`  
**Line:** 11

**Current:**
```js
{ id: 'smart-purchase',  label: 'Smart Purchase', path: '/inventory-smart-purchase', group: 'OPERATIONS', icon: Sparkles },
```

**New:**
```js
{ id: 'smart-purchase',  label: 'Stock Update', path: '/inventory-smart-purchase', group: 'OPERATIONS', icon: Sparkles }, // CR-122: renamed
```

**Verify:** `grep 'Stock Update' InventoryTabBar.jsx` → 1 hit. `grep 'Smart Purchase' InventoryTabBar.jsx` → 0 hits.

---

## Edit 2 — Sidebar.jsx: Rename nav label

**File:** `frontend/src/components/layout/Sidebar.jsx`  
**Line:** 128

**Current:**
```js
{ id: "inventory-smart-purchase", label: "Smart Purchase", path: "/inventory-smart-purchase" },                   // CR-078 · was "Purchase Entry"
```

**New:**
```js
{ id: "inventory-smart-purchase", label: "Stock Update", path: "/inventory-smart-purchase" },                    // CR-078 · was "Purchase Entry" · CR-122 · renamed to "Stock Update"
```

**Verify:** `grep 'Stock Update' Sidebar.jsx` → 1 hit. `grep '"Smart Purchase"' Sidebar.jsx` → 0 hits.

---

## Edit 3 — SmartPurchasePage.jsx: Rename heading

**File:** `frontend/src/pages/SmartPurchasePage.jsx`  
**Line:** 24

**Current:**
```jsx
                  Smart Purchase
```

**New:**
```jsx
                  Stock Update
```

**Verify:** `grep 'Smart Purchase' SmartPurchasePage.jsx` → 0 user-facing hits (comment on line 1 OK to keep).

---

## Edit 4 — SmartPurchasePanel.jsx: 6 edits (strings + remove + reorder)

**File:** `frontend/src/components/inventory/SmartPurchasePanel.jsx`

### 4a — Rename error string (line 76)

**Current:**
```js
setLoadError(err?.readableMessage || err?.message || 'Failed to load Smart Purchase');
```

**New:**
```js
setLoadError(err?.readableMessage || err?.message || 'Failed to load Stock Update'); // CR-122
```

---

### 4b — Rename API notes field (line 189)

**Current:**
```js
          notes: `Smart Purchase · horizon ${horizonDays}d`,
```

**New:**
```js
          notes: `Stock Update · horizon ${horizonDays}d`, // CR-122
```

---

### 4c — REMOVE toolbar "Review & Submit" button (lines 226–234)

**Current (remove all 9 lines):**
```jsx
          {/* CR-081: Review & Submit button (green, top-right per mockup) */}
          {!loading && rows.length > 0 && (
            <Button onClick={handleSubmit} disabled={!canSubmit}
              className="bg-green-600 hover:bg-green-700 text-white gap-2 text-xs" data-testid="smart-purchase-review-submit">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
              Review &amp; Submit
            </Button>
          )}
```

**New:** *(nothing — block deleted entirely)*

---

### 4d — Rename loading text (line 246 → shifts after 4c removes 9 lines, becomes ~line 237)

**Current:**
```jsx
          <Loader2 className="w-4 h-4 animate-spin" /> Loading Smart Purchase…
```

**New:**
```jsx
          <Loader2 className="w-4 h-4 animate-spin" /> Loading Stock Update… {/* CR-122 */}
```

---

### 4e — Move GroupedVendorPreview ABOVE AutoShoppingList (lines ~250–281 after 4c shift)

**Current order (inside `<>...</>` block):**
```jsx
          <AutoShoppingList
            rows={rows}
            ...all props...
          />

          <GroupedVendorPreview
            groupedByVendor={groupedByVendor}
            paymentMethodsList={paymentMethods}
            pmByVendor={pmByVendor}
            onPmChange={(vid, pm) => setPmByVendor(prev => ({ ...prev, [vid]: pm }))}
            vendorNamesById={vendorNamesById}
          />
```

**New order:**
```jsx
          {/* CR-122: GroupedVendorPreview moved to top — visible without scrolling */}
          <GroupedVendorPreview
            groupedByVendor={groupedByVendor}
            paymentMethodsList={paymentMethods}
            pmByVendor={pmByVendor}
            onPmChange={(vid, pm) => setPmByVendor(prev => ({ ...prev, [vid]: pm }))}
            vendorNamesById={vendorNamesById}
          />

          <AutoShoppingList
            rows={rows}
            ...all props (unchanged)...
          />
```

**Implementation note:** This is a JSX block reorder — cut `<GroupedVendorPreview ... />` and paste it immediately after the `<>` open tag, before `<AutoShoppingList>`. Props are identical, no state changes needed.

---

### 4f — Rename bottom submit button (line ~298 → shifts after edits, ~line ~288)

**Current:**
```jsx
              {submitting ? 'Submitting…' : `Submit Purchase (${Object.keys(groupedByVendor).length} vendor${Object.keys(groupedByVendor).length === 1 ? '' : 's'})`}
```

**New:**
```jsx
              {submitting ? 'Submitting…' : `Update Stock (${Object.keys(groupedByVendor).length} vendor${Object.keys(groupedByVendor).length === 1 ? '' : 's'})`} {/* CR-122 */}
```

---

## Verification Matrix

| Edit | File | Change | Verify Command | Expected |
|------|------|--------|----------------|---------|
| 1 | InventoryTabBar.jsx | Tab label | `grep -c 'Stock Update' InventoryTabBar.jsx` | 1 |
| 1 | InventoryTabBar.jsx | No old label | `grep -c "'Smart Purchase'" InventoryTabBar.jsx` | 0 |
| 2 | Sidebar.jsx | Nav label | `grep -c '"Stock Update"' Sidebar.jsx` | 1 |
| 3 | SmartPurchasePage.jsx | Heading | `grep -c 'Smart Purchase' SmartPurchasePage.jsx` | 0 (comment only) |
| 4a | SmartPurchasePanel.jsx | Error string | `grep -c 'Failed to load Stock Update' SmartPurchasePanel.jsx` | 1 |
| 4b | SmartPurchasePanel.jsx | Notes field | `grep -c 'Stock Update.*horizon' SmartPurchasePanel.jsx` | 1 |
| 4c | SmartPurchasePanel.jsx | Button removed | `grep -c 'Review.*Submit\|smart-purchase-review-submit' SmartPurchasePanel.jsx` | 0 |
| 4d | SmartPurchasePanel.jsx | Loading text | `grep -c 'Loading Stock Update' SmartPurchasePanel.jsx` | 1 |
| 4e | SmartPurchasePanel.jsx | Order changed | `grep -n 'GroupedVendorPreview\|AutoShoppingList' SmartPurchasePanel.jsx` | GroupedVendorPreview line # < AutoShoppingList line # |
| 4f | SmartPurchasePanel.jsx | Button label | `grep -c 'Update Stock' SmartPurchasePanel.jsx` | 1 |
| REG | SmartPurchasePanel.jsx | handleSubmit intact | `grep -c 'handleSubmit' SmartPurchasePanel.jsx` | ≥3 (state + wiring) |
| REG | Sidebar.jsx | Route id unchanged | `grep -c '"inventory-smart-purchase"' Sidebar.jsx` | 1 |

---

## Risk Register

| # | Risk | Mitigation |
|---|------|-----------|
| 1 | GroupedVendorPreview shows empty when no items selected | Already the case — no change in behavior, just shown earlier |
| 2 | Removing toolbar button removes the only visible submit for long lists | Single bottom "Update Stock" button remains; GroupedVendorPreview now at top so both visible without scroll |
| 3 | SmartPurchasePage.jsx heading line number may differ if file changed | Use `search_replace` with exact string match — line-independent |

---

```
Planning complete: CR-122
Gate: 3 ✅
Code reality: NONE
Risk: LOW-MEDIUM
Files WILL change: 4 (InventoryTabBar.jsx, Sidebar.jsx, SmartPurchasePage.jsx, SmartPurchasePanel.jsx)
All owner decisions: RESOLVED (OD-1: remove toolbar button, OD-2: API notes renamed)
Next: Gate 4 GO → Implementation
```
