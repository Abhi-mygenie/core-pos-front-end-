# BUG-028 Rework Implementation Summary (Round 4 — REOPENED)

## Source
- QA Report: /app/memory/bugs/BUG_QA_REPORT_028.md (Round 4 — qa_failed)
- QA Handover: /app/memory/bugs/QA_HANDOVER_SPRINT.md
- Previous Implementation Summary: /app/memory/bugs/BUG_IMPLEMENTATION_SUMMARY_028.md
- Previous Rework Summary (Round 3 — dynamic useState initializer): prior content of this file
- Implementation Plan: /app/memory/bugs/BUG_IMPLEMENTATION_PLAN_028.md
- Analysis: /app/memory/bugs/BUG_ANALYSIS_028.md
- Intake: /app/memory/BUG_TEMPLATE.md

## Rework History
- Round 1 (prior implementation): `useState(true)` → `useState(false)`.
- Round 2 (prior rework): Added `scApplicable &&` guard at line 1151 so SC toggle row hides for takeaway/delivery.
- Round 3 (prior rework): Replaced `useState(false)` with dynamic initializer based on `orderType`, `isRoom`, and `serviceChargePercentage` — so applicable dine-in/walk-in/room orders with SC configured default to TICKED.
- Round 4 (this rework — REOPENED): Round 3 ignored the backend `auto_service_charge` flag. For Young Monk Cafe, `service_charge = "Yes"` and `service_charge_percentage = 2.50`, but `auto_service_charge = "No"` — the checkbox should default UNTICKED there. The `autoServiceCharge` field is already mapped in `profileTransform.js` (line 82) but was never consumed by the UI.

## QA Failure Summary (Round 4)
- Owner control `auto_service_charge` was not honored.
- Round 3 initializer logic: `applicableOrderType && serviceChargePercentage > 0` → for Young Monk (2.5% SC, dine-in) it defaulted to TICKED, which contradicts the backend `auto_service_charge = "No"` setting.
- Required behavior (owner-confirmed):
  - Checkbox defaults TICKED only when: applicable order type AND `serviceChargePercentage > 0` AND `restaurant.autoServiceCharge === true`.
  - Otherwise defaults UNTICKED; cashier may manually tick to collect SC per bill.

## Rework Scope
- Add `&& !!restaurant?.autoServiceCharge` to the `serviceChargeEnabled` `useState` initializer in `CollectPaymentPanel.jsx`.
- No other change.

## Files Modified
- `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx`

## Changes Made
- Around line 211, updated the initializer from:
  ```js
  useState(
    (orderType === 'dineIn' || orderType === 'walkIn' || isRoom)
    && serviceChargePercentage > 0
  );
  ```
  to:
  ```js
  useState(
    (orderType === 'dineIn' || orderType === 'walkIn' || isRoom)
    && serviceChargePercentage > 0
    && !!restaurant?.autoServiceCharge
  );
  ```
- Added a `BUG-028 rework (Round 4 — REOPENED)` comment explaining the `auto_service_charge` requirement.

## What Was Not Changed
- `scApplicable &&` guard at line 1151 (Round 2 fix) — preserved.
- `scApplicable` definition at line 326 — unchanged.
- `serviceCharge` value computation at line 327 — unchanged.
- Render guards at lines 730 and 1363 — unchanged.
- Manual toggle behavior (cashier can tick/untick per bill) — unchanged.
- `profileTransform.js` — already maps `auto_service_charge → autoServiceCharge`; no change needed.
- Payment / print payload builders — unchanged.
- Socket handlers, API calls — unchanged.

## Build / Run Result
- Dependency install: Not needed (no package change)
- Build completed: Not run
- App run checked: Not run
- If skipped, why:
  - The change only extends an existing `useState` initializer with one extra boolean clause using `restaurant?.autoServiceCharge`. `restaurant` is already destructured from `useRestaurant()` at line 31 and is used throughout the component; `autoServiceCharge` is already mapped in the transform layer. No new imports, hooks, state, or API calls were introduced.
  - ESLint on the modified file reports no issues.
  - Per agent rules, baseline build/run is not mandatory for this class of low-risk initializer change.
- Notes: ESLint clean on `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx`.

## Validation Performed
- Confirmed `restaurant` is in scope at line 211 (destructured from `useRestaurant()` at line 31).
- Confirmed `autoServiceCharge` mapping exists in `/app/frontend/src/api/transforms/profileTransform.js` line 82: `autoServiceCharge: toBoolean(api.auto_service_charge)`.
- Behavior matrix after fix:
  - Restaurant with `auto_service_charge = "Yes"`, SC configured, dine-in/walk-in/room → checkbox defaults TICKED ✅
  - Young Monk (`auto_service_charge = "No"`, 2.5% SC, dine-in) → checkbox defaults UNTICKED ✅
  - Takeaway/delivery → checkbox hidden by Round-2 render guards regardless of initializer ✅
  - `serviceChargePercentage = 0` (SC not configured) → render guards hide toggle ✅
- Manual toggle preserved: cashier can still tick/untick after mount.
- Double-bang `!!restaurant?.autoServiceCharge` guarantees a boolean even when `restaurant` is still loading (optional chaining returns `undefined` → `!!undefined` = `false`).
- ESLint: no issues.

## Risks / Follow-up
- Minor timing consideration: if `restaurant` profile is not yet loaded on first render, `autoServiceCharge` is `undefined` → checkbox defaults UNTICKED. This is the safe-default (matches non-applicable behavior) and does not cause under-collection because the Collect Payment panel typically mounts after restaurant profile is loaded; cashier can tick manually if needed. No regression expected for the loaded-profile case, which is the dominant flow.

## Ready for QA Re-validation
- Yes
- Reason: The exact fix specified in `BUG_QA_REPORT_028.md` (Round 4) is now in place. `restaurant.autoServiceCharge` is consumed by the `serviceChargeEnabled` initializer; all prior rounds' fixes (scApplicable guard, dynamic initializer for order type, visibility guards) are preserved; no other behavior changed.
