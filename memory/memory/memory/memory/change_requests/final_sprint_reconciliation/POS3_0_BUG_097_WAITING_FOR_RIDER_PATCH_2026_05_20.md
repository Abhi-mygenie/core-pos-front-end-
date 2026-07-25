# POS3.0 BUG-097 "Waiting for Rider" Corrective Patch — 2026-05-20

> **Scope**: Replace "Reassign" action button with passive "Waiting for Rider" label when rider is assigned and pending accept/reject.
> **Status**: IMPLEMENTED — pending owner review

---

## Changes (2 files, 2 edits)

### 1. `OrderCard.jsx` L917-926
- **Before**: "Reassign" button (clickable, opens AssignRiderModal)
- **After**: "Waiting for Rider" disabled button (no click, opacity 50%, cursor-default)
- `data-testid="waiting-rider-btn-{orderId}"`

### 2. `TableCard.jsx` L470-481
- **Before**: "Reassign" TextButton (clickable, opens AssignRiderModal)
- **After**: "Waiting for Rider" disabled TextButton (no click, opacity 50%, cursor-default)
- `data-testid="waiting-rider-btn-{table.id}"`

## Not Changed
- Cancel (X) button — untouched
- Rider section "Change" link (OrderCard only) — untouched
- AssignRiderModal — untouched
- Non-delivery behavior — untouched
- All other fOrderStatus states — untouched

## Accepted Trade-off
TableCard grid view has no "Change" link. Cashier must click card to open order detail to reassign via "Change" link in rider section. Owner approved.

## Build
PASS — 0 errors.
