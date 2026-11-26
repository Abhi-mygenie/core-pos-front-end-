# BUG-741 — Gate 3 Implementation Plan — Pop-up cancel wording (POS-2)

**Risk:** LOW–MEDIUM (copy/label only) · **Decision:** LOCKED — keep per-item cancel behaviour (CR-545), clarify wording only. **No logic, no backend.**
**Sequencing:** implement BEFORE CR-561 (both touch `PopoutItemRow.jsx`).

## Confirmed code anchors
- Per-item cancel modal: `components/order-entry/CancelFoodModal.jsx` — title `:72` `Cancel {item?.name}` (testid `cancel-modal-title`), qty controls `:111+`, reason `:159`, confirm button in footer.
- Trigger: `PopoutItemRow.jsx` per-item cancel button → `onCancel(item)` → `ScanOrderPopOut` `onCancelItem` → `CancelFoodModal` (item-level).
- Order-level reject: `ScanOrderPopOut.jsx:297-304 handleRejectClick` → `CancelOrderModal`.

## Exact edits (labels/copy only — pin at implementation)
**1. `components/order-entry/CancelFoodModal.jsx`**
- Title (`:72`): make unmistakably single-item, e.g. `Cancel item: {item?.name}` (qty shown). Keep testid `cancel-modal-title`.
- Confirm button (footer): label to single-item wording, e.g. "Cancel this item" (keep its data-testid).
- Any body copy that reads order-wide → reword to item-scope.

**2. `components/dashboard/PopoutItemRow.jsx`**
- Per-item cancel control `title`/aria-label → "Cancel this item" (no handler change).

**3. (Optional) `components/dashboard/ScanOrderPopOut.jsx`**
- Ensure the order-level Reject affordance label stays visually/textually distinct from the per-item cancel. Label-only.

## Verification matrix
| Case | Expected |
|---|---|
| Open per-item cancel from pop-up | modal clearly reads "cancel this item" + item name/qty; cancels ONLY that item (CR-545 behaviour unchanged) |
| Order-level Reject | unchanged; clearly distinct wording |
| data-testids | unchanged (QA + CR-545 depend on them) |

## Regression / rollback
Copy/label/aria only. No handler, payload, or backend change. Rollback = revert the text.
