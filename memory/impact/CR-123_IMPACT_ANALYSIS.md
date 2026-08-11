# CR-123 — Impact Analysis: Stock Update Sticky Submit Button

**Document:** CR-123_IMPACT_ANALYSIS.md
**Stage:** Gate 2 — Impact Analysis
**Planning Agent Date:** 2026-07-31
**Code Reality:** NONE — no CR-123 code exists in codebase
**Conflict Pre-Check:** CLEAR — SmartPurchasePanel.jsx last modified CR-122 (2026-07-31), no open items touch this file

---

## 1. Summary

| Field | Value |
|---|---|
| ID | CR-123 |
| Title | Stock Update: "Update Stock" Button Sticky Fixed Bottom-Right |
| Risk | LOW |
| Blast Radius | SMALL — 1 file, ≤8 lines |
| Fast Lane Eligible | YES (confirmed by intake; owner approved Option B) |
| Intake Doc | `/app/memory/change_requests/CR-123_STOCK_UPDATE_STICKY_SUBMIT_BUTTON_INTAKE.md` |

---

## 2. Code Reality Check

```bash
grep -rn "CR-123" /app/frontend/src/  → 0 hits
grep -rn "fixed bottom-6 right-6" /app/frontend/src/components/inventory/  → 0 hits
```

**Result: NONE** — No code exists for CR-123. Full implementation required.

---

## 3. Conflict Pre-Check

| File | Last Modifier | Date | Status |
|---|---|---|---|
| `SmartPurchasePanel.jsx` | CR-122 agent | 2026-07-31 | CLOSED — DONE. No open conflict. |

No other registered item in registry.json has status ≠ CLOSED touching `SmartPurchasePanel.jsx`.

**Result: CLEAR — no conflict.**

---

## 4. Data Flow Trace (Submit Button)

```
User scrolls list
  → SmartPurchasePanel.jsx (lines 288-294)
    → activeRows.length > 0  → canSubmit gate
      → Button: onClick=handleSubmit, disabled=!canSubmit
        → handleSubmit() → inventoryService.addPurchase() per vendor
```

**Change scope:** The button's **wrapper div and JSX rendering** — nothing in `handleSubmit`, state, or API is touched.

---

## 5. Risk Assessment

| Area | Assessment |
|---|---|
| CSS positioning (`fixed`) | Safe — `position: fixed` is viewport-relative; not clipped by parent `overflow: hidden` unless parent has `transform`/`filter`. Parent chain has none. |
| `canSubmit` guard | Currently `activeRows.length > 0 && !submitting`. Plan preserves semantics — button shown on `activeRows.length > 0`, disabled on `!canSubmit`. |
| Submitting state | If we gate on `canSubmit`, button disappears during submit (jarring). Must gate on `activeRows.length > 0` instead so spinner stays visible during submission. |
| Content obscured | `position: fixed` button overlaps scroll content at bottom. Must add `pb-20` to panel container. |
| Hotspot file | NOT on R5 list ✅ |
| Financial logic | `handleSubmit` is NOT touched ✅ |
| API | Not changed ✅ |

**Risk: LOW — confirmed. No logic, API, state, or financial change.**

---

## 6. Downstream Consumers (None Affected)

| Component | Relationship | Impact |
|---|---|---|
| `GroupedVendorPreview.jsx` | Sibling inside SmartPurchasePanel | NONE — only rendered above list |
| `AutoShoppingList.jsx` | Sibling inside SmartPurchasePanel | NONE — list itself unchanged |
| `SmartPurchasePage.jsx` | Parent page wrapper | NONE — renders panel as-is |
| `InventoryTabBar.jsx` | Sibling page nav | NONE |

---

## 7. Owner Decisions (All Resolved at Intake)

| OD | Decision | Source |
|---|---|---|
| OD-1 | Option B: fixed sticky button | Owner approval (intake) |
| OD-2 | Position: bottom-right | Standard POS pattern |
| OD-3 | Visibility: only when items selected | `activeRows.length > 0` gate |

---

## 8. Files WILL Change

- `components/inventory/SmartPurchasePanel.jsx` — submit button wrapper replaced + container padding added

## Files WILL NOT Touch

- `GroupedVendorPreview.jsx`
- `AutoShoppingList.jsx`
- `SmartPurchasePage.jsx`
- `InventoryTabBar.jsx`
- `App.js`
- `Sidebar.jsx`
- Any API, transform, or service file

---

*Next: Gate 3 Implementation Plan*
