# CR-123 — Implementation Plan: Stock Update Sticky Submit Button

**Document:** CR-123_IMPLEMENTATION_PLAN.md
**Stage:** Gate 3 — Implementation Plan
**Planning Agent Date:** 2026-07-31
**Awaiting:** Gate 4 GO from owner

---

## 1. Scope Lock

**Files WILL change:** `components/inventory/SmartPurchasePanel.jsx` (1 file, ~8 lines)
**Files WILL NOT touch:** `GroupedVendorPreview.jsx`, `AutoShoppingList.jsx`, `SmartPurchasePage.jsx`, `InventoryTabBar.jsx`, `App.js`, `Sidebar.jsx`, all service/transform files

---

## 2. Execution Sequence

### Edit 1 of 2 — Panel Container: Add Bottom Padding
**File:** `SmartPurchasePanel.jsx`
**Line:** 217
**Reason:** `position: fixed` button overlaps content at bottom of scroll. `pb-20` creates safe clearance.

**Current:**
```jsx
<div data-testid="smart-purchase-panel">
```
**New:**
```jsx
<div data-testid="smart-purchase-panel" className="pb-20">
```

---

### Edit 2 of 2 — Replace Inline Submit with Fixed Floating Button
**File:** `SmartPurchasePanel.jsx`
**Lines:** 288–294
**Reason:** Replace static bottom button with fixed viewport-anchored floating action button.

**Current (lines 288–294):**
```jsx
          <div className="mt-6 flex justify-end">
            <Button onClick={handleSubmit} disabled={!canSubmit}
              className="bg-orange-600 hover:bg-orange-700 text-white gap-2" data-testid="smart-purchase-submit">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
              {submitting ? 'Submitting…' : `Update Stock (${Object.keys(groupedByVendor).length} vendor${Object.keys(groupedByVendor).length === 1 ? '' : 's'})`} {/* CR-122 */}
            </Button>
          </div>
```

**New:**
```jsx
          {/* CR-123: sticky floating submit — fixed bottom-right, always visible when items selected */}
          {activeRows.length > 0 && (
            <div className="fixed bottom-6 right-6 z-50">
              <Button onClick={handleSubmit} disabled={!canSubmit}
                className="bg-orange-600 hover:bg-orange-700 text-white gap-2 shadow-lg" data-testid="smart-purchase-submit">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                {submitting ? 'Submitting…' : `Update Stock (${Object.keys(groupedByVendor).length} vendor${Object.keys(groupedByVendor).length === 1 ? '' : 's'})`} {/* CR-122 · CR-123 */}
              </Button>
            </div>
          )}
```

**Key decisions in this edit:**
- Gate on `activeRows.length > 0` (NOT `canSubmit`) so spinner is visible during submission
- `disabled={!canSubmit}` still blocks double-submit
- `shadow-lg` adds visual depth for floating appearance
- `z-50` ensures button renders above list rows and GroupedVendorPreview

---

## 3. Verification Matrix

| Edit # | File | Change | How to Verify | Automated? |
|--------|------|--------|---------------|:---:|
| 1 | SmartPurchasePanel.jsx:217 | `pb-20` on panel container | Scroll to bottom of item list; last item fully visible, not obscured by button | NO |
| 2a | SmartPurchasePanel.jsx:288-294 | Fixed button — visible while scrolling | Open Stock Update → select 1 item with rate > 0 → scroll list → button stays bottom-right | NO |
| 2b | SmartPurchasePanel.jsx:288-294 | Button hidden when no items selected | Open Stock Update → DO NOT select any items → button should NOT appear | NO |
| 2c | SmartPurchasePanel.jsx:288-294 | Spinner visible during submit | Click "Update Stock" → button shows spinner while submitting → does NOT disappear | NO |
| 2d | SmartPurchasePanel.jsx:288-294 | `data-testid="smart-purchase-submit"` preserved | `document.querySelector('[data-testid="smart-purchase-submit"]')` in DevTools | NO |

---

## 4. Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Parent has CSS `transform` — breaks `fixed` | LOW — inspected parent chain, none found | Visually verify after implementation |
| Button obscures list rows | MITIGATED | pb-20 on container; fixed overlays viewport not document flow |
| Button visible on other pages | NONE | Fixed element is inside SmartPurchasePanel, only rendered when SmartPurchasePage is active |
| Double-submit | MITIGATED | `disabled={!canSubmit}` gate; `submitting` state blocks re-entry |

---

## 5. Post-Code Registry Checklist

Implementation agent MUST complete all 5 before writing SESSION_HANDOVER:

```
- [ ] registry.json: CR-123 → status: "IMPLEMENTED", gate: "5", sprint_key: "pos_5_0"
- [ ] CR_REGISTRY.md: CR-123 row → IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: SmartPurchasePanel.jsx entry updated with CR-123 + 2026-07-31
- [ ] Code markers: `// CR-123` comment in SmartPurchasePanel.jsx (present in Edit 2)
- [ ] Compile check: `tail -5 /var/log/supervisor/frontend.out.log` → "Compiled successfully"
```

---

## 6. QA Handover Seeds

From Verification Matrix:

| TC# | Test | Steps | Expected |
|-----|------|-------|---------|
| TC-1 | Button floats on scroll | Open Stock Update → tick 1 item + enter rate → scroll down → observe button | Button always visible bottom-right |
| TC-2 | Button hidden when nothing selected | Open Stock Update → no items selected → observe viewport | No floating button |
| TC-3 | Spinner during submit | Select items with rate → click Update Stock → observe button during API call | Button shows spinner, stays visible |
| TC-4 | Content not obscured | Scroll to very bottom of list | Last row fully visible below button |
| TC-5 | testid preserved | DevTools: `[data-testid="smart-purchase-submit"]` | Element found |

---

*Awaiting Gate 4 GO from owner → Implementation agent.*
