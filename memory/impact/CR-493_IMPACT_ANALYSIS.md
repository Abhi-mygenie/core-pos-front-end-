# CR-493 — Reason Always Mandatory + Notes-Mandatory Setting — Impact Analysis (Gate 2) — 2026-11-14

Code Reality: PARTIAL — both dialogs already block confirm without a reason (`CancelFoodModal.jsx` L31/L245, `CancelOrderModal.jsx` L18/L131). Notes-mandatory setting: NONE.
Conflict: shares files with BUG-670 / BUG-674 — implement together.
Risk: HIGH. Backend-blocked: YES (setting key).

## Owner decision (locked)
Reason dropdown always mandatory (order + item). One restaurant setting (backend key) makes notes mandatory/optional for both; default optional.

## Findings
- FE reasons: `settingsService.js` L18-27 `GET cancellation-reasons?limit=100&offset=1` (403 without params — probe 06). 12 reasons, typed `item_type` Order/Food.
- All FE cancel paths found: CancelFoodModal (item), CancelOrderModal (order + refund mode), DashboardPage L1369 (scan-order red cross → same modal). Other cancel paths to verify at Gate 3: delivery cancel (`DELIVERY_ORDER_CANCEL`), aggregator reject, Razorpay cancel-and-refund (`OrderReportBetaPage` refund).
- Backend data: insights Nov 1–14 shows 5 cancels "No reason provided" (probe 10) → some path (other app / aggregator / backend) cancels without reason. Source unknown.
- Empty dropdown (BUG-440): if reasons list is empty the cancel button can never enable — needs a defined fallback.
- Settings-list (probe 03) + profile (probe 02): no notes-mandatory key.

## Files (estimate)
CancelFoodModal.jsx, CancelOrderModal.jsx (notes required when setting on), restaurantSettingsTransform/profileTransform (read new key), possibly delivery/aggregator cancel dialogs.

## Open owner decisions
- OD-493-A: cancels arriving with "No reason provided" (5 in Nov) — investigate source (other app/aggregator) inside this CR, or separate item? OPEN.
- OD-493-B: if the reasons list is empty, block cancel (show "ask admin to add reasons") or allow? OPEN.

- Owner 2026-11-14 round 4: **OD-493-B = block cancel + show message ("ask admin to add cancellation reasons")** when reasons list is empty. OD-493-A still OPEN.

## Backend asks
- B-493-1: restaurant setting key "cancel notes mandatory" (default optional), returned in profile or settings-list.
- B-493-2: backend reject cancel without reason (server-side enforcement) — confirm.
