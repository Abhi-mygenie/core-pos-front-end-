# BUG-685 — Impact Analysis (Gate 2)

**ID:** BUG-685 · **Type:** BUG · **Area:** Menu / Order Entry
**Priority:** P0 · **Risk:** HIGH · **QA Severity:** BLOCKER
**Stage:** Gate 2 — Impact Analysis only (no plan, no code)
**Author:** PLANNING agent · **Date:** 2026-11-18

## Code Reality
**PARTIAL** (incomplete CR-551). Confirmed at HEAD `c30f4c05`:
- `frontend/src/components/order-entry/CartPanel.jsx` L806-824 — main `CartPanel` props destructure includes `onCustomize` (L811) but **not** `onEdit`.
- `CartPanel.jsx` L1353 — render path passes `onEdit={onEdit}` (marked `// CR-551`) → references an undefined identifier.
- `CartPanel.jsx` L262 — child `NewItemRow` correctly lists `onEdit` in its own props (CR-551).
- `OrderEntry.jsx:2964` — parent passes `onEdit={(item)=>setCustomizationItem({...item,_editMode:true})}` into `<CartPanel>`.
Result: at render of any unplaced row, `onEdit` is undefined in CartPanel scope → `ReferenceError: onEdit is not defined` → React error screen.

## Conflict Pre-Check
- `CartPanel.jsx` is an **R5 hotspot** (FILE_OWNERSHIP: CR-482 P10, BUG-527 F2/F3/F4, BUG-374/369/372/371, etc.).
- No other OPEN item is currently mid-edit on CartPanel. The defect originates from the CR-551 edit itself.
- **Parallel-safe** with BUG-686..694 (different files).

## Data-flow trace
OrderEntry (`onEdit` handler) → `<CartPanel onEdit=…>` prop → **CartPanel must destructure `onEdit`** → `<NewItemRow onEdit={onEdit}>` → row pencil button `onClick={()=>onEdit(item)}` (CartPanel L305). Break point: the destructure step is missing.

## Affected files / lines
| File | Lines | Nature |
|------|-------|--------|
| `components/order-entry/CartPanel.jsx` | props block ~L806-824 | add `onEdit` (+ verify `isEditLocked`, `isPrepaid` siblings referenced at L1354-1355 are also destructured) |

**Note for Gate 3:** L1354 `isEditLocked={isEditLocked}` and L1355 `isPrepaid={isPrepaid}` are also CR-551 — verify these identifiers are destructured in the main props too, or they are the next crash after `onEdit` is fixed.

## Downstream consumers / blast radius
- Unblocks: CR-551 (edit customizable cart item); new-order creation path for BUG-647/683/678 + SC+GST regression; self-created orders for CR-526/BUG-671/672.
- 1 file, ~1-3 lines. No API/transform/state/localStorage/socket change.

## Risk
HIGH (order-capture flow, R5 file) — but fix is a prop-destructure correction, no logic change. Full gate recommended; not Fast-Lane eligible (R5 hotspot + order flow).

## Owner decisions
None — root cause confirmed. (Owner previously chose HOLD on fixing.)

## Verification matrix seeds (for Gate 3 / QA)
1. Tap a customizable item → no crash, row renders with pencil (Edit) button.
2. Tap a plain item → no crash, no pencil button.
3. Edit → ItemCustomizationModal opens with "Save Changes"; save updates in place (no duplicate).
4. Regression: place a full order end-to-end.
