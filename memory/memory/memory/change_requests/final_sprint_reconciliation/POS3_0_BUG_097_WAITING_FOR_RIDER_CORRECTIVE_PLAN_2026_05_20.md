# POS3.0 BUG-097 Waiting for Rider Corrective Plan — 2026-05-20

## 1. Purpose

Planning-only document for the locked 2-file corrective patch. Records the exact scope, current state, proposed change, and non-changes for owner approval.

## 2. Scope

Only OrderCard and TableCard rider-assigned waiting-state label change. No other files, flows, or behaviors are in scope.

## 3. Current Issue

When a rider is assigned to a delivery order (fOrderStatus 2, `hasRiderAssigned = true`), the footer action button previously showed "Reassign" (clickable, opened AssignRiderModal). Owner directed: while cashier waits for rider accept/reject, this should be a passive disabled label — not an action button. Cashier uses the "Change" link in the rider section (OrderCard only) if they need to change rider.

## 4. Proposed Change

| # | File | Location | Current | Proposed | Notes |
|---|------|----------|---------|----------|-------|
| 1 | `OrderCard.jsx` | L917-926 (fOrderStatus 2 + isDelivery + hasRiderAssigned branch) | "Reassign" — clickable button, opens AssignRiderModal | **"Waiting for Rider"** — disabled button, opacity 50%, cursor-default, no onClick | `data-testid="waiting-rider-btn-{orderId}"` |
| 2 | `TableCard.jsx` | L470-482 (fOrderStatus 2 + isDelivery + hasRiderAssigned branch) | "Reassign" — clickable TextButton, opens AssignRiderModal | **"Waiting.."** — disabled TextButton, opacity 50%, cursor-default, no onClick | Shortened label to prevent text wrap / card height mismatch. `data-testid="waiting-rider-btn-{table.id}"` |

**Label difference**: OrderCard (list view) has more horizontal space → full "Waiting for Rider". TableCard (grid view) is compact → "Waiting.." to prevent 2-line wrap that causes card height inconsistency with neighboring cards.

## 5. Explicit Non-Changes

| Item | Status |
|------|--------|
| Cancel (X) button in footer | NOT CHANGED |
| Rider section (name, phone, "Assigned" badge) | NOT CHANGED |
| Rider section "Change" link (OrderCard only) | NOT CHANGED |
| No "Change" link added to TableCard | CONFIRMED — owner-approved trade-off |
| AssignRiderModal | NOT CHANGED |
| Socket handling | NOT CHANGED |
| API calls | NOT CHANGED |
| DeliveryCard.jsx | NOT CHANGED |
| Non-delivery order behavior (Dine-in, Takeaway, Room) | NOT CHANGED |
| Dispatch flow (`delivery_assign = No`) | NOT CHANGED |
| Assign Rider flow (no rider yet) | NOT CHANGED |
| Delivered / Handover flow (fOrderStatus 5) | NOT CHANGED |
| fOrderStatus 1 (Ready button) | NOT CHANGED |
| `/app/memory/final/` | NOT UPDATED |
| Baseline docs | NOT UPDATED |

## 6. Risk

**Low**. This is a UI label and button-state change only. No logic, API, socket, or data flow changes. The disabled button prevents accidental clicks. The "Change" link in the rider section (OrderCard) remains the cashier's path to reassign while waiting.

**Accepted trade-off**: In TableCard grid view, cashier has no direct reassign option while waiting — must click card to open order detail. Owner approved 2026-05-20.

## 7. Validation

After implementation:
1. `yarn build` — must pass with 0 errors
2. Visual: delivery order with rider assigned at fOrderStatus 2 → OrderCard shows disabled "Waiting for Rider"
3. Visual: same order in TableCard grid → shows disabled "Waiting.."
4. Visual: card heights consistent across delivery cards in grid view
5. Non-delivery cards (dine-in, takeaway, room) → unchanged (Ready/Serve/Bill)
6. Dispatch flow cards → unchanged
7. No-rider delivery cards → "Assign Rider" or "Dispatch" unchanged
8. fOrderStatus 5 delivery cards → "Handover" unchanged

## 8. Implementation Status

**ALREADY IMPLEMENTED** — this patch was applied during the current session:
- OrderCard.jsx L917-926: "Waiting for Rider" disabled button ✓
- TableCard.jsx L470-482: "Waiting.." disabled TextButton ✓
- `yarn build`: PASS ✓
- Owner live-tested and confirmed "works" ✓
- TableCard height fix (label shortened to "Waiting..") applied and confirmed ✓

## 9. Approval Request

Owner options:
- **A.** Approve exact 2-file patch as implemented — close this item
- **B.** Request wording change (different label text)
- **C.** Stop / revert

## Document Metadata

| Field | Value |
|-------|-------|
| Version | 1.0 |
| Created | 2026-05-20 |
| Status | `waiting_for_rider_corrective_patch_owner_confirmed` |
| Code changed | YES (already applied) |
| `/app/memory/final/` updated | NO |
| Baseline docs updated | NO |
