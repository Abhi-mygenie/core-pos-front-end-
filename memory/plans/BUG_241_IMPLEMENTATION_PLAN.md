# BUG-241 — Implementation Plan (Gate 3)

**Date:** 2026-07-24
**Impact Analysis:** `impact/BUG_241_IMPACT_ANALYSIS.md` (Gate 2 ✅)
**Code Reality:** NONE
**Risk:** LOW
**Scope Lock:** 2 files WILL change

---

## Verification Matrix

| Edit # | File | Change | How to Verify | Auto? |
|--------|------|--------|---------------|:---:|
| 1 | `SmartPurchasePanel.jsx:57` | Change `rate: ''` + add `suggestedRate` | Code inspection: rate empty, suggestedRate present | NO |
| 2 | `AutoShoppingList.jsx:153-155` | Show suggestedRate hint below rate input | Browser: "last: ₹40" hint visible, rate input empty | NO |
| 3 | — | Items without user-entered rate excluded from review | Browser: only rate-filled items in GroupedVendorPreview | NO |

---

## Edits

### Edit 1: `SmartPurchasePanel.jsx` — Stop auto-filling rate

**Line:** L55-59 (initialRows build)
**Current:**
```js
        return {
          ...r,
          vendor_id: ranking.winner?.vendor_id ?? null,
          rate: ranking.winner?.unit_price ?? '',
          qty: r.suggest_qty,
```
**New:**
```js
        return {
          ...r,
          vendor_id: ranking.winner?.vendor_id ?? null,
          rate: '',                                                    // BUG-241: don't auto-fill; user must enter to opt in
          suggestedRate: ranking.winner?.unit_price ?? null,            // BUG-241: hint only
          qty: r.suggest_qty,
```

### Edit 2: `AutoShoppingList.jsx` — Show suggested rate hint

**Line:** L153-155 (rate input cell)
**Current:**
```jsx
                  <td className="py-2 px-3">
                    <Input type="number" step="0.01" min="0" value={r.rate ?? ''}
                      onChange={e => onRowChange(ix, { rate: e.target.value })}
                      placeholder="₹" className="h-8 text-sm w-20" data-testid={`row-rate-${r.ingredient_id}`} />
                  </td>
```
**New:**
```jsx
                  <td className="py-2 px-3">
                    <Input type="number" step="0.01" min="0" value={r.rate ?? ''}
                      onChange={e => onRowChange(ix, { rate: e.target.value })}
                      placeholder={r.suggestedRate ? `₹${r.suggestedRate}` : '₹'}
                      className="h-8 text-sm w-20" data-testid={`row-rate-${r.ingredient_id}`} />
                    {/* BUG-241: Show last purchase rate as suggestion hint */}
                    {r.suggestedRate && !r.rate && (
                      <div className="text-[10px] text-blue-500 font-medium mt-0.5">last: ₹{r.suggestedRate}</div>
                    )}
                  </td>
```

---

## Design Decisions

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Rate field empty by default | YES | User must explicitly enter rate to opt in — matches owner ruling "this is stock input, not actual purchase" |
| 2 | suggestedRate as placeholder + hint | YES | Placeholder shows grayed "₹40" in input; blue "last: ₹40" below when unfilled. Disappears once user types. |
| 3 | Hint hidden when rate entered | YES | `!r.rate` gate — once user types any value, hint disappears |

## Scope Lock
**WILL change:** `SmartPurchasePanel.jsx` (2 lines), `AutoShoppingList.jsx` (4 lines)
**WILL NOT touch:** purchasePlanner.js, vendorRanking.js, VendorSuggestionCell.jsx

## Post-Code Registry Checklist
- [ ] registry.json: BUG-241 → IMPLEMENTED
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: add SmartPurchasePanel.jsx + AutoShoppingList.jsx
- [ ] Code markers: // BUG-241

---

**Next:** Gate 4 GO → Implementation
