# BUG-240 — Implementation Plan (Gate 3)

**Date:** 2026-07-24
**Impact Analysis:** `impact/BUG_240_IMPACT_ANALYSIS.md` (Gate 2 ✅)
**Code Reality:** PARTIAL — `fmtQty` converts gm→kg for ≥1000, but zero/small/negative show raw small unit
**Risk:** LOW
**Scope Lock:** 2 files WILL change

---

## Verification Matrix

| Edit # | File | Change | How to Verify | Auto? |
|--------|------|--------|---------------|:---:|
| 1 | `purchasePlanner.js:132` | Add `display_on_hand` field (velocity rows) | Code inspection: field present in planner output | NO |
| 2 | `purchasePlanner.js:156` | Add `display_on_hand` field (stock_alert rows) | Code inspection: field present | NO |
| 3 | `AutoShoppingList.jsx:135` | Render `display_on_hand` + `display_unit` | Browser: on-hand shows kg/ltr matching Current Stock | NO |

---

## Edits

### Edit 1: `utils/purchasePlanner.js` — Add display_on_hand to velocity rows

**Line:** After L132 (`on_hand: Number(onHand.toFixed(3)),`)
**New:** Add 1 line:
```js
        display_on_hand:  Number(item.displayQty) || Number((onHand / (WEIGHT_UNITS[(item.displayUnit || '').toLowerCase()] || VOLUME_UNITS[(item.displayUnit || '').toLowerCase()] || 1)).toFixed(2)), // BUG-240: display-unit value for UI
```

**Simpler approach — use displayQty directly from the stock item:**
```js
        display_on_hand:  Number(item.displayQty) || Number(onHand.toFixed(3)), // BUG-240: prefer backend display_qty
```

### Edit 2: `utils/purchasePlanner.js` — Add display_on_hand to stock_alert rows

**Line:** After L156 (`on_hand: Number(onHand.toFixed(3)),`)
**New:** Add 1 line:
```js
        display_on_hand: Number(item.displayQty) || Number(onHand.toFixed(3)), // BUG-240
```

### Edit 3: `components/inventory/smart/AutoShoppingList.jsx` — Render display values

**Line:** L135
**Current:**
```jsx
                    {fmtQty(r.on_hand, r.unit)}
```
**New:**
```jsx
                    {fmtQty(r.display_on_hand ?? r.on_hand, r.display_unit || r.unit)}
```

---

## Design Decisions

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Source for display_on_hand | `item.displayQty` from backend | Backend pre-calculates display value — most consistent with Current Stock |
| 2 | Fallback | `onHand` (calQuantity) | When displayQty=0 or missing, fall back to small-unit value |
| 3 | Math unchanged | YES | `on_hand` (calQuantity) still used for velocity/gap/suggest_qty — `display_on_hand` is render-only |

## Scope Lock
**WILL change:** `purchasePlanner.js` (2 lines), `AutoShoppingList.jsx` (1 line)
**WILL NOT touch:** SmartPurchasePanel.jsx, inventoryTransform.js, CurrentStockPanel.jsx

## Post-Code Registry Checklist
- [ ] registry.json: BUG-240 → IMPLEMENTED
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: add purchasePlanner.js + AutoShoppingList.jsx
- [ ] Code markers: // BUG-240

---

**Next:** Gate 4 GO → Implementation
