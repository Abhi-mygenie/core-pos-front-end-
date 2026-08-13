# CR-098 — Intake — 2026-07-24

**CR:** Short Code (Item Code) Display on Order Card
**Sprint:** POS 5.0
**Status:** INTAKE
**Priority:** P1 — High
**Risk:** LOW (display-only, no financial logic, no API change)

---

## 1. Requirement

Display the per-item short code (`item_code`) on OrderCard item rows so cashiers/staff can see item codes without opening menu management.

## 2. Classification

- **Type:** CR (new feature — display layer)
- **Duplicate check:** DISTINCT — BUG-143 (CLOSED) covered toggle wiring only, not display
- **Related:** BUG-143 (Short Code toggle — FE COMPLETE, BACKEND-OWNED for print)

## 3. Current State (Code Reality: NONE)

| Layer | Exists? | Detail |
|---|---|---|
| Settings toggle | ✅ | `RestaurantSettingsPage.jsx:424` — ON/OFF for short code feature |
| Per-item code in menu admin | ✅ | `ProductForm.jsx:375`, `BulkEditor.jsx:58` — `itemCode` field |
| productTransform mapping | ✅ | `productTransform.js:143` — `itemCode: api.item_code` |
| **orderTransform item mapping** | ❌ | `orderTransform.js:112-158` — does NOT map `food_details.item_code` |
| **OrderCard display** | ❌ | Zero references to `itemCode` in OrderCard.jsx |
| **CartPanel display** | ❌ | Zero references to `itemCode` in CartPanel.jsx |

## 4. Expected Behavior

When Short Code is enabled in Restaurant Settings:
- Each item row on OrderCard shows the item code (e.g., `[SC01] Paneer Tikka (2)`)
- Item code sourced from `order.items[].food_details.item_code` via orderTransform

## 5. Affected Files (estimated)

| File | Change | Lines |
|---|---|---|
| `api/transforms/orderTransform.js` | Map `foodDetails.item_code` → `itemCode` in item transform | +1 line |
| `components/cards/OrderCard.jsx` | Display `item.itemCode` next to item name in item row | +5 lines |

## 6. Blast Radius

- Scope: SMALL (2 files, ~6 lines)
- Hotspot: YES — OrderCard.jsx (R5)
- Risk: LOW — display-only addition, no state/API/financial change

## 7. Evidence

- Source: INVESTIGATION (2026-07-24) — confirmed via code trace
- Investigation report: `/app/memory/reports/INVESTIGATION_SHORTCODE_PREPTIME_2026_07_24.md`

## 8. Next

Planning Gate 2 (Impact Analysis) → Gate 3 (Implementation Plan)
