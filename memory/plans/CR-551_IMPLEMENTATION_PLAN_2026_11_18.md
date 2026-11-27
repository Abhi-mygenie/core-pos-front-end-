# CR-551 — Implementation Plan (Gate 3)

**Date:** 2026-11-18
**Agent role:** PLANNING
**Stage:** Implementation Plan (Gate 3)
**IA:** `memory/impact/CR-551_IMPACT_ANALYSIS_v3_2026_11_18.md`
**Risk:** MEDIUM
**IA verified at HEAD:** YES (same session — all target lines confirmed)

**Owner decisions:** All N/A for local scope (see IA v3 §7)

---

## 1. Scope Lock

**Files WILL change:**
- `src/components/order-entry/ItemCustomizationModal.jsx` — E1, E2
- `src/components/order-entry/CartPanel.jsx` — E3, E4, E5
- `src/components/order-entry/OrderEntry.jsx` — E6, E7, E8

**Files WILL NOT touch:**
- `orderTransform.js` · `CollectPaymentPanel.jsx` · `roundOffUtils.js`
- Any context, service, socket handler, or test file
- The `Customize` button — zero changes to its path

**Payload change:** NONE
**Backend change:** NONE

---

## 2. Exact Edits

---

### Edit E1 — ItemCustomizationModal.jsx: Add `buttonLabel` prop

**File:** `ItemCustomizationModal.jsx`
**Location:** L6 — component signature
**Action:** REPLACE 1 line

```
CURRENT (L6):
const ItemCustomizationModal = ({ item, onClose, onAddToOrder, kbdEnabled = false }) => {

NEW:
const ItemCustomizationModal = ({ item, onClose, onAddToOrder, kbdEnabled = false, buttonLabel = 'Add to Order' }) => { // CR-551: buttonLabel for Edit mode
```

**Verify:** `grep -n "buttonLabel" ItemCustomizationModal.jsx` → 1 hit on L6.

---

### Edit E2 — ItemCustomizationModal.jsx: Use `buttonLabel` in button text

**File:** `ItemCustomizationModal.jsx`
**Location:** L755 — the "Add to Order" text node inside the button
**Action:** REPLACE 1 line

```
CURRENT (L755):
            Add to Order

NEW:
            {buttonLabel} {/* CR-551: dynamic label — "Add to Order" or "Save Changes" */}
```

**Verify:** `grep -n "buttonLabel\|Add to Order" ItemCustomizationModal.jsx` →
- L6: prop with default `'Add to Order'`
- L755: `{buttonLabel}`
- NO remaining hardcoded "Add to Order" text in button body

---

### Edit E3 — CartPanel.jsx: Add `onEdit`, `isEditLocked`, `isPrepaid` to `NewItemRow`

**File:** `CartPanel.jsx`
**Location:** L262 — NewItemRow component signature
**Action:** REPLACE 1 line

```
CURRENT (L262):
const NewItemRow = ({ item, cartIndex, onDeleteItem, updateQuantity, onAddNote, onCustomize, kbdRowProps = {} }) => (

NEW:
const NewItemRow = ({ item, cartIndex, onDeleteItem, updateQuantity, onAddNote, onCustomize, onEdit, isEditLocked = false, isPrepaid = false, kbdRowProps = {} }) => ( // CR-551: +onEdit, +isEditLocked, +isPrepaid
```

**Verify:** `grep -n "onEdit\|isEditLocked\|isPrepaid" CartPanel.jsx` → hits on L262 (signature) and L295+ (Edit button).

---

### Edit E4 — CartPanel.jsx: Add Edit button between Customize and Add Note

**File:** `CartPanel.jsx`
**Location:** L293-312 — the action buttons `<div>`
**Action:** REPLACE the existing buttons block (insert Edit button between Customize and Add Note)

```
CURRENT (L293-312):
      <div className="flex items-center gap-1 mt-1 -ml-2">
        <button 
          onClick={() => onCustomize && onCustomize(item)}
          className="px-2 py-1.5 text-xs hover:bg-gray-50 rounded-lg transition-colors whitespace-nowrap" 
          style={{ color: COLORS.primaryGreen }}
          data-testid={`customize-btn-${item.id}`}
        >
          Customize
        </button>
        <button 
          className="px-2 py-1.5 text-xs hover:bg-gray-50 rounded-lg transition-colors whitespace-nowrap" 
          style={{ color: (item.itemNotes?.length > 0 || item.notes?.trim()) ? COLORS.primaryOrange : COLORS.grayText }}
          onClick={() => onAddNote(item, cartIndex)}
          data-testid={`add-note-btn-${item.id}`}
        >
          {(item.itemNotes?.length > 0 || item.notes?.trim()) ? "Edit Note" : "Add Note"}
        </button>
      </div>

NEW:
      <div className="flex items-center gap-1 mt-1 -ml-2">
        <button 
          onClick={() => onCustomize && onCustomize(item)}
          className="px-2 py-1.5 text-xs hover:bg-gray-50 rounded-lg transition-colors whitespace-nowrap" 
          style={{ color: COLORS.primaryOrange }}
          data-testid={`customize-btn-${item.id}`}
        >
          Customize
        </button>
        {/* CR-551: Edit button — in-place replace; only for items with customizations; hidden when locked/prepaid */}
        {(item.customizable || item.customizations?.size || item.customizations?.variants?.length > 0 || hasAddons(item)) && !isEditLocked && !isPrepaid && (
          <button
            onClick={() => onEdit && onEdit(item)}
            className="px-2 py-1.5 text-xs hover:bg-gray-50 rounded-lg transition-colors whitespace-nowrap font-medium"
            style={{ color: COLORS.primaryGreen }}
            data-testid={`edit-item-btn-${item.id}`}
          >
            ✎ Edit
          </button>
        )}
        <button 
          className="px-2 py-1.5 text-xs hover:bg-gray-50 rounded-lg transition-colors whitespace-nowrap" 
          style={{ color: (item.itemNotes?.length > 0 || item.notes?.trim()) ? COLORS.primaryOrange : COLORS.grayText }}
          onClick={() => onAddNote(item, cartIndex)}
          data-testid={`add-note-btn-${item.id}`}
        >
          {(item.itemNotes?.length > 0 || item.notes?.trim()) ? "Edit Note" : "Add Note"}
        </button>
      </div>
```

**Note:** Customize color changed from `primaryGreen` → `primaryOrange` to visually distinguish it from Edit. Confirm with owner if colour change is unwanted — can revert independently.

**Verify:** `grep -n "edit-item-btn\|✎ Edit\|onEdit" CartPanel.jsx` → hits in E3 signature and E4 button.

---

### Edit E5 — CartPanel.jsx: Thread `onEdit`, `isEditLocked`, `isPrepaid` into NewItemRow render call

**File:** `CartPanel.jsx`
**Location:** L1335-1356 — NewItemRow render call inside cart items map
**Action:** ADD 3 props to the existing `<NewItemRow .../>` JSX

```
CURRENT (L1335-1356):
                    <NewItemRow
                      item={item}
                      cartIndex={index}
                      onDeleteItem={onDeleteItem}
                      updateQuantity={updateQuantity}
                      onAddNote={onAddNote}
                      onCustomize={onCustomize}
                      kbdRowProps={kbdEnabled ? kbdRowProps({

NEW:
                    <NewItemRow
                      item={item}
                      cartIndex={index}
                      onDeleteItem={onDeleteItem}
                      updateQuantity={updateQuantity}
                      onAddNote={onAddNote}
                      onCustomize={onCustomize}
                      onEdit={onEdit} // CR-551
                      isEditLocked={isEditLocked} // CR-551
                      isPrepaid={isPrepaid} // CR-551
                      kbdRowProps={kbdEnabled ? kbdRowProps({
```

**Verify:** `grep -n "onEdit={onEdit}\|isEditLocked={isEditLocked}\|isPrepaid={isPrepaid}" CartPanel.jsx` → 3 hits at the NewItemRow render call.

---

### Edit E6 — OrderEntry.jsx: `_editMode` detection in `addCustomizedItemToCart`

**File:** `OrderEntry.jsx`
**Location:** L970-993 — after the two guards, before `const key = customizationKey`
**Action:** INSERT `workingCart` block + replace 3 `cartItems` references

```
CURRENT (L970-993 — the merge/append body):
    // BUG-246: Merge identical customized items instead of always appending
    const key = customizationKey(item);
    const existingIndex = cartItems.findIndex(ci => !ci.placed && ci.customizations && customizationKey(ci) === key);
    if (existingIndex >= 0) {
      const updated = [...cartItems];
      updated[existingIndex] = { ...updated[existingIndex], qty: updated[existingIndex].qty + (item.quantity || 1) };
      lastAddedKeyRef.current = updated[existingIndex]._cartKey; // CR-482 P8
      setCartItems(updated);
    } else {
      const newKey = genCartKey(); // BUG-374
      lastAddedKeyRef.current = newKey; // CR-482 P8
      setCartItems([...cartItems, {
        ...item,
        qty: item.quantity || 1,
        status: "preparing",
        placed: false,
        addedAt: new Date().toISOString(),
        _cartKey: newKey,
      }]);
    }

NEW:
    // CR-551: Edit in-place — remove original before merge/append when _editMode set
    const workingCart = (item._editMode && item._cartKey)
      ? cartItems.filter(ci => ci._cartKey !== item._cartKey)
      : cartItems; // CR-551
    // BUG-246: Merge identical customized items instead of always appending
    const key = customizationKey(item);
    const existingIndex = workingCart.findIndex(ci => !ci.placed && ci.customizations && customizationKey(ci) === key); // CR-551: workingCart
    if (existingIndex >= 0) {
      const updated = [...workingCart]; // CR-551: workingCart
      updated[existingIndex] = { ...updated[existingIndex], qty: updated[existingIndex].qty + (item.quantity || 1) };
      lastAddedKeyRef.current = updated[existingIndex]._cartKey; // CR-482 P8
      setCartItems(updated);
    } else {
      const newKey = genCartKey(); // BUG-374
      lastAddedKeyRef.current = newKey; // CR-482 P8
      setCartItems([...workingCart, { // CR-551: workingCart
        ...item,
        qty: item.quantity || 1,
        status: "preparing",
        placed: false,
        addedAt: new Date().toISOString(),
        _cartKey: newKey,
      }]);
    }
```

**Verify:**
- `grep -n "workingCart" OrderEntry.jsx` → 5 hits (declaration + 3 uses + comment)
- `grep -n "cartItems.findIndex\|cartItems, {" OrderEntry.jsx | grep -v BUG-246` in the addCustomizedItemToCart zone → 0 hits (all replaced)

---

### Edit E7 — OrderEntry.jsx: Pass `onEdit` to CartPanel

**File:** `OrderEntry.jsx`
**Location:** L2959 — `onCustomize` line in CartPanel JSX
**Action:** INSERT 1 line after `onCustomize`

```
CURRENT (L2959):
                onCustomize={(item) => setCustomizationItem(item)}

NEW:
                onCustomize={(item) => setCustomizationItem(item)}
                onEdit={(item) => setCustomizationItem({ ...item, _editMode: true })} // CR-551
```

**Verify:** `grep -n "onEdit\|_editMode" OrderEntry.jsx` → hits at E7 and E6.

---

### Edit E8 — OrderEntry.jsx: Pass `buttonLabel` to `ItemCustomizationModal`

**File:** `OrderEntry.jsx`
**Location:** L3026 — the `<ItemCustomizationModal .../>` render
**Action:** REPLACE 1 line (add `buttonLabel` prop)

```
CURRENT (L3026):
        <ItemCustomizationModal item={customizationItem} onClose={() => setCustomizationItem(null)} onAddToOrder={addCustomizedItemToCart} kbdEnabled={kbdEnabled} />

NEW:
        <ItemCustomizationModal item={customizationItem} onClose={() => setCustomizationItem(null)} onAddToOrder={addCustomizedItemToCart} kbdEnabled={kbdEnabled} buttonLabel={customizationItem?._editMode ? 'Save Changes' : 'Add to Order'} /> {/* CR-551 */}
```

**Verify:** `grep -n "buttonLabel" OrderEntry.jsx` → 1 hit at L3026.

---

## 3. Execution Sequence

```
1. E1  — ItemCustomizationModal.jsx L6    — prop signature (independent, do first)
2. E2  — ItemCustomizationModal.jsx L755  — button text
   → Webpack check 1 (after ItemCustomizationModal)
3. E3  — CartPanel.jsx L262              — NewItemRow signature
4. E4  — CartPanel.jsx L293-312          — Edit button
5. E5  — CartPanel.jsx L1335             — thread props to render call
   → Webpack check 2 (after CartPanel)
6. E6  — OrderEntry.jsx L970             — workingCart block + 3 replacements
7. E7  — OrderEntry.jsx L2959            — onEdit to CartPanel
8. E8  — OrderEntry.jsx L3026            — buttonLabel to modal
   → Webpack check 3 (after OrderEntry — final)
```

---

## 4. Verification Matrix

| # | Edit | File | Verification | Auto? |
|---|------|------|-------------|:---:|
| V1 | E1 | ItemCustomizationModal.jsx:6 | `grep -n "buttonLabel" ItemCustomizationModal.jsx` → 2 hits (L6 + L755) | YES |
| V2 | E2 | ItemCustomizationModal.jsx:755 | `{buttonLabel}` present; no hardcoded "Add to Order" in button body | YES |
| V3 | E3 | CartPanel.jsx:262 | `grep -n "onEdit\|isEditLocked\|isPrepaid" CartPanel.jsx` → hits in signature + render | YES |
| V4 | E4 | CartPanel.jsx | `grep -n "edit-item-btn\|✎ Edit" CartPanel.jsx` → 1 hit per | YES |
| V5 | E5 | CartPanel.jsx:1335+ | `grep -n "onEdit={onEdit}" CartPanel.jsx` → 1 hit | YES |
| V6 | E6 | OrderEntry.jsx | `grep -n "workingCart" OrderEntry.jsx` → 5 hits | YES |
| V7 | E7 | OrderEntry.jsx:2959 | `grep -n "_editMode" OrderEntry.jsx` → 2 hits (E7 + E6) | YES |
| V8 | E8 | OrderEntry.jsx:3026 | `grep -n "buttonLabel" OrderEntry.jsx` → 1 hit | YES |
| V9 | — | Browser | Add Pasta (Wheat) → ✎ Edit → Rice → Save → cart has 1 item (Rice) | NO |
| V10 | — | Browser | Add Pasta (Wheat) → Customize → Rice → Add to Order → cart has 2 items | NO |
| V11 | — | Browser | Plain item (no variants/addons) → no Edit button visible | NO |
| V12 | — | Browser | isEditLocked=true → Edit button hidden | NO |
| V13 | — | Webpack | `tail frontend.out.log` → `compiled successfully`, 0 new warnings | YES |

---

## 5. Post-Code Registry Checklist (EXIT GATE)

```
- [ ] registry.json: CR-551 → status: IMPLEMENTED, sprint_key: nov_cr_batch
- [ ] CR_REGISTRY.md or BUG_TRACKER.md: row updated to IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: add 3 files with CR-551 + date
- [ ] Code markers: // CR-551 in every modified block
- [ ] Webpack compiles with 0 new warnings
```

---

## 6. Risk Register

| # | Risk | Likelihood | Mitigation |
|---|------|------------|------------|
| R1 | `_editMode` flag leaks into cart item data | LOW | `_editMode` set only on `customizationItem` state (temp object); `addCustomizedItemToCart` stores `...item` spread but `_editMode` is harmless if present — not read anywhere else |
| R2 | Customize colour change (green→orange) causes visual regression | LOW | Easily reverted independently; functionally identical |
| R3 | Edit on item with same combo as another → merges qty (unexpected) | VERY LOW | Correct per existing BUG-246 merge logic; this is expected cart consolidation |
| R4 | `workingCart` changes affect `lastAddedKeyRef` keyboard highlight | NONE | `lastAddedKeyRef` is set inside the if/else block after `workingCart` is computed — logic unchanged |
| R5 | CR-482 keyboard shortcut (Ctrl+Enter) fires "Add to Order" in Edit mode | LOW | `buttonLabel` only changes text, not the `kbdEnabled` hint text; Ctrl+Enter still calls `handleAddToOrder()` which calls `onAddToOrder` — works correctly |

---

```
Planning complete: CR-551
Stage: Implementation Plan (Gate 3)
Code reality: NONE
Risk: MEDIUM
Files WILL change: ItemCustomizationModal.jsx (2 edits) · CartPanel.jsx (3 edits) · OrderEntry.jsx (3 edits)
Files WILL NOT touch: orderTransform.js · CollectPaymentPanel.jsx · any service/context/socket
Edits: 8 (E1–E8), ~30 lines net
Execution order: E1→E2 → E3→E4→E5 → E6→E7→E8 (3 webpack checkpoints)
Verification matrix: 13 checks (8 automated grep/compile, 5 browser)
Owner decisions: ALL N/A
Docs: memory/plans/CR-551_IMPLEMENTATION_PLAN_2026_11_18.md
Next: Gate 4 GO → Implementation
```
