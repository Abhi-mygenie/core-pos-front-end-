# CR-551 — Impact Analysis v3 (Gate 2)
# Re-scoped: Local Cart Edit — Separate "Edit" button, Customize unchanged

**Date:** 2026-11-18
**Agent role:** PLANNING
**Stage:** Impact Analysis (Gate 2) — REPLACES v2 (`impact/CR-551_IMPACT_ANALYSIS_v2_2026_11_18.md`)
**Intake doc:** `change_requests/CR-551_EDIT_VARIATIONS_AFTER_PLACE_INTAKE.md`

**Owner clarification (2026-11-18 session):**
- **Customize** button — zero behaviour change. Existing merge/append logic stays.
- **Edit** button — NEW button. Opens modal pre-populated, always replaces original in-place.
- v2 IA was wrong to modify the Customize save path. This IA corrects that.

---

## 0. Code Reality Check

**Result: NONE** — 0 hits for `_editMode`, `onEditItem`, `handleEditCart`, `editMode` across all src files. Edit button does not exist. All 3 file changes are greenfield.

---

## 1. Conflict Pre-Check

| File | Last meaningful touch | Active conflict? |
|------|----------------------|-----------------|
| `CartPanel.jsx` | BUG-683 E3 (L434 VAT skip, L455 useMemo dep) — tax zone | **NONE** — NewItemRow action buttons are ~L293-310, no overlap |
| `OrderEntry.jsx` | BUG-684 (L17, L1155-1227 round-off), BUG-677 (L27-28 imports) — different zones | **NONE** — target zone is L961-992 (addCustomizedItemToCart) + L3025 (modal render) |
| `ItemCustomizationModal.jsx` | CR-482 P5 (Esc/Ctrl+Enter keyboard handlers) | **NONE** — keyboard is on modal container; button text change is additive |

**No blocking conflicts.**

---

## 2. Data Flow Trace

### 2.1 Customize path (unchanged — documented for reference)

```
Cashier taps "Customize" on NewItemRow
  → onCustomize(item) [CartPanel L295]
  → setCustomizationItem(item) [OrderEntry L2959]
  → ItemCustomizationModal opens with item (pre-filled via existing useEffect L28-74)
  → User changes selections → handleAddToOrder() → onAddToOrder(customizedItem)
  → addCustomizedItemToCart(item) [OrderEntry L962]
      ├─ customizationKey(item) computed
      ├─ if matching key found → merge qty (BUG-246)
      └─ else → append as new item (new _cartKey)
  → setCustomizationItem(null)
```

**No change to this path.** Customize can still produce a new line if the user picks a different combo.

### 2.2 Edit path (new)

```
Cashier taps "✎ Edit" on NewItemRow
  → onEdit(item) [CartPanel — NEW prop]
  → handleEditCartItem(item) [OrderEntry — NEW function]
      ├─ Guards: isEditLocked → toast + return; isPrepaid+placedOrderId → toast + return
      ├─ setCustomizationItem({ ...item, _editMode: true })  ← flag on item
  → ItemCustomizationModal opens (same instance, same state)
      ├─ item._editMode detected → button label = "Save Changes"
      ├─ item pre-populated from _cartKey item (existing useEffect L28-74 — already works)
  → User changes selections → handleAddToOrder() → onAddToOrder(customizedItem)
  → addCustomizedItemToCart(item) [OrderEntry L962 — MODIFIED ~5 lines]
      ├─ Guards: isEditLocked, isPrepaid (existing — unchanged)
      ├─ NEW: if (item._editMode && item._cartKey) →
      │       filter out original from cartItems where _cartKey matches
      ├─ customizationKey(item) computed on updated array
      ├─ if matching key found → merge qty (existing BUG-246 logic — unchanged)
      └─ else → append (existing logic — unchanged)
  → setCustomizationItem(null)
  → lastAddedKeyRef.current = new/merged _cartKey  (CR-482 P8 — keyboard highlight)
  → setFlashItemId (visual feedback — existing)
```

---

## 3. Additional Cart Impacts Found (Step 2 investigation findings)

### 3.1 Edit button must be gated on item having customizations

`Customize` currently shows for **all** unplaced items (no `item.customizable` check in CartPanel L293-310). The Edit button must only show when the item actually has variants/addons/size — otherwise it opens an empty modal for a plain item.

**Gate condition:**
```javascript
const hasCustomizations = item.customizable ||
  item.customizations?.size ||
  item.customizations?.variants?.length > 0 ||
  hasAddons(item);
// Only render Edit button when hasCustomizations is true
```

### 3.2 isEditLocked + isPrepaid must flow into NewItemRow

Currently `isEditLocked` and `isPrepaid` are props on `CartPanel` but are **not passed into `NewItemRow`** (NewItemRow signature: `{ item, cartIndex, onDeleteItem, updateQuantity, onAddNote, onCustomize, kbdRowProps }`).

For the Edit button to respect the lock:
- Add `isEditLocked` + `isPrepaid` to `NewItemRow` props
- Hide/disable Edit button when either is true (same guard as `addCustomizedItemToCart`)
- Note: `Customize` button currently has **no such guard** — this is pre-existing. We do not change that.

### 3.3 Single modal instance — _editMode flag approach is clean

Both Customize and Edit share the same `customizationItem` state and the same `<ItemCustomizationModal>` render at L3025. The `_editMode: true` flag on the item object is the simplest approach — no second state variable needed. Modal reads `item._editMode` to decide button label. The flag is stripped before the item is committed to cart (it's on the temp `customizedItem`, not the final cart entry).

### 3.4 lastAddedKeyRef must be set in Edit path

`lastAddedKeyRef` (CR-482 P8) drives keyboard highlight on the last-added cart row. The existing `addCustomizedItemToCart` already updates it. The ~5-line Edit detection block should NOT break this — it runs before the merge/append logic which already sets `lastAddedKeyRef`.

### 3.5 Customize button — no change, no gate added

The `Customize` button currently has no `isEditLocked` guard and no customization gate. We explicitly leave it as-is per owner clarification — zero changes to the Customize path.

---

## 4. Files WILL Change

| # | File | Location | Change | Lines |
|---|------|----------|--------|-------|
| 1 | `CartPanel.jsx` | `NewItemRow` component (L262) | Add `onEdit`, `isEditLocked`, `isPrepaid` to props. Add Edit button (gated: `hasCustomizations && !isEditLocked && !isPrepaid`). Thread `onEdit`, `isEditLocked`, `isPrepaid` from CartPanel render call (L1335). | ~12 lines |
| 2 | `OrderEntry.jsx` | `addCustomizedItemToCart` (L962) + CartPanel render (L2959) | A: Add ~5 lines to `addCustomizedItemToCart` — if `_editMode && _cartKey`, filter original before merge/append. B: Pass `onEdit={handleEditCartItem}` to CartPanel. No `handleEditCartItem` function needed — `setCustomizationItem` with `_editMode` flag is enough (~2 lines). | ~7 lines |
| 3 | `ItemCustomizationModal.jsx` | Button area (L738-757) | Add `buttonLabel` prop (default `"Add to Order"`). Render `{buttonLabel}` instead of hardcoded text. Caller passes `item._editMode ? "Save Changes" : "Add to Order"` — OR modal reads `item.editMode` directly (simpler). | ~4 lines |

**Total: 3 files, ~23 lines. No new files.**

---

## 5. Files WILL NOT Touch

- `orderTransform.js` — no payload change
- `CollectPaymentPanel.jsx` — not involved
- `roundOffUtils.js` — not involved
- `addToCart` (plain item path) — not involved
- Socket handlers, contexts, services — not involved
- Any test file

---

## 6. Verification Matrix

| # | Test Case | Steps | Expected | How |
|---|-----------|-------|----------|-----|
| V1 | Edit replaces in place | Add Pasta (Wheat) → ✎ Edit → change to Rice → Save | Cart: 1× Pasta (Rice). No duplicate. | Browser |
| V2 | Edit merges with existing | Cart: Pasta(Rice)×2 + Pasta(Wheat)×1 → Edit Wheat → change to Rice → Save | Cart: 1× Pasta(Rice)×3 | Browser |
| V3 | Edit no change → save | Tap ✎ Edit → change nothing → Save | Same item, qty unchanged | Browser |
| V4 | Customize unaffected | Tap Customize → change combo → Add to Order | Existing merge/append runs — may add new line | Browser |
| V5 | Edit hidden for plain item | Add plain item (no variants/addons) | No Edit button visible; Customize visible | Browser |
| V6 | Edit hidden when locked | Bill printed + isEditLocked=true | Edit button not shown | Browser |
| V7 | Edit hidden when prepaid | Prepaid order + placed items | Edit button not shown | Browser |
| V8 | Modal title/button changes | Tap ✎ Edit | Button says "Save Changes"; Tap Customize → "Add to Order" | Browser |
| V9 | Keyboard highlight (CR-482 P8) | Edit item via keyboard flow | Edited row gets keyboard highlight | Browser |
| V10 | Webpack compiles clean | — | 0 new warnings | `tail frontend.out.log` |

---

## 7. Owner Decisions (confirmed N/A for local scope)

| OD | Status |
|----|--------|
| OD-551-01 (before served) | N/A — unplaced items only |
| OD-551-02 (no KOT) | N/A — no backend call |
| OD-551-03 (order_edit permission) | N/A — `isEditLocked` already gates mutations |
| OD-551-04 (recalculate tax) | Automatic — existing `useMemo` chain |
| OD-551-05 (combine qty + variations) | Already done — modal has qty + variants + addons |

---

## 8. Backend Dependency

**NONE.** Fully local state.

---

## 9. Risk

**MEDIUM** (downgraded from HIGH in v1 IA)
- No backend, no API, no financial recalculation, no placed items, no KOT
- 3 files, ~23 lines, all additive
- Hotspot: `OrderEntry.jsx` (R5) — but target zone (L962, L2959, L3025) is not near the financial/round-off code touched in BUG-684

---

## 10. Related Items

| ID | Relationship |
|----|-------------|
| BUG-246 | Merge identical customized items — unchanged, Edit relies on it |
| BUG-374 | `_cartKey` identity — Edit uses it to find original |
| CR-482 | `lastAddedKeyRef` keyboard highlight — preserved in Edit path |
| BUG-656 | `isEditLocked` — Edit button respects the same guard |
| BUG-684 | Same `OrderEntry.jsx` file — different zone (L1155-1227 vs L962) |

---

```
Planning complete: CR-551 (v3)
Stage: Impact Analysis (Gate 2)
Code Reality: NONE
Risk: MEDIUM
Files WILL change: CartPanel.jsx (~12 lines) · OrderEntry.jsx (~7 lines) · ItemCustomizationModal.jsx (~4 lines)
Files WILL NOT touch: orderTransform.js · CollectPaymentPanel.jsx · any service/context/socket
Owner decisions: ALL N/A
Backend dependency: NONE
Docs: memory/impact/CR-551_IMPACT_ANALYSIS_v3_2026_11_18.md
Next: Gate 3 (Implementation Plan) → Gate 4 GO
```
