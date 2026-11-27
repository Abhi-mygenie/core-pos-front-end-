# BUG-670 — Item Cancel Notes Not Sent / Not Shown — Impact Analysis (Gate 2) — 2026-11-14

Code Reality: PARTIAL — notes textarea exists in UI, payload + backend field missing.
Conflict pre-check: CancelFoodModal.jsx no open owner. orderTransform.js / OrderEntry.jsx (R5) have open GATE_5A items — re-verify anchors at Gate 3.
Risk: HIGH (order cancel flow, orderTransform R5, reports). Not financial.
Backend-blocked: YES.

## Owner decision (locked 2026-11-14)
Item notes exist in dialog but not sent → fix payload; show in Cancellation report + Order Beta.

## Data flow trace
UI `CancelFoodModal.jsx` L7 `additionalNotes` state, L201-216 textarea → `handleCancel` L35 calls `onCancel({item, reason, cancelQuantity, remainingQuantity})` — **notes dropped here (BREAK 1)**.
→ `OrderEntry.jsx` L1534 `handleCancelFood` → `orderToAPI.cancelItem` (`orderTransform.js` L988-1007) — no notes key (BREAK 2).
→ `PUT /api/v2/vendoremployee/order/cancel-food-item`.
→ Backend: probe 22 sent `cancel_reason_text`, `notes`, `cancellation_note`, `cancel_note` → 200 but **none stored** (BREAK 3 — backend).
→ Read: `cancel-order-list` line has `reason`, `reason_type`, `cancel_type` only. Insights `items[].notes` = `food_level_notes` (kitchen note), not cancel note (BREAK 4 — backend). FE `reportTransform.js:789` and `insightsService.js:301-305` read `cancel_reason_text`, never returned.
→ Order Beta (`daily-order-report-details-combined`) row has no line-level cancel data at all (BREAK 5 — backend).

## Files (estimate for Gate 3)
| File | Change | R5 |
|---|---|---|
| components/order-entry/CancelFoodModal.jsx | pass notes in onCancel | no |
| components/order-entry/OrderEntry.jsx L1534-1543 | forward notes | YES |
| api/transforms/orderTransform.js L988-1007 | add backend-confirmed note key | YES |
| api/transforms/reportTransform.js L789, api/services/insightsService.js L301-305 | read confirmed key | no |
| pages/reports-module/CancellationsMockup.jsx (~L275, L951) | already renders `notes` — key mapping only | no |
| pages/reports-module/OrderReportBetaPage.jsx | show cancel reason/notes (needs new API fields) | no |

## Backend asks (Gyan)
- B-670-1: field name for item cancel note on `cancel-food-item` + store it.
- B-670-2: return it per line in `cancel-order-list` and `insights-cancellations` (separate from `food_level_notes`).
- B-670-3: return line cancel reason + note in Order Beta combined API.

## Owner review 2026-11-14 (round 2)
- Owner confirmed with 2 screenshots: Item Cancellation Detail has no notes column; Insights Cancellations "Notes" shows "BATCH-A IA PR…" = kitchen note (`food_level_notes`), not cancel note.
- Owner Q "key mismatch or backend not saving?" → answer: BOTH. (1) FE never sends the typed notes (dropped at CancelFoodModal L35). (2) Backend has no field — 4 candidate keys sent, none stored.

## Downstream / regression
Item cancel pre/post serve, partial-qty cancel, weight items, cancel from Collect Bill, KOT cancel print, insights Cancellations report, Order Beta.
Depends on: CR-493 (mandatory-notes setting) — share the same notes field.
