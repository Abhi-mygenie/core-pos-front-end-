# POS2.0 — Sprint Bug Impact Analysis

> **Sprint:** POS2.0
> **Normalized sprint name (filename):** POS2_0
> **Analysis date/time (UTC):** 2026-05-16 17:05
> **Repo:** https://github.com/Abhi-mygenie/core-pos-front-end-.git
> **Branch:** 17-may
> **Local /app strategy:** Wiped contents of `/app` and freshly cloned `17-may` branch.
> **Bug intake source:** `/app/memory/BUG_TEMPLATE.md` (sprint-tagged `POS2.0` rows BUG-050 → BUG-074)
> **Bugs in scope (25):** BUG-050, BUG-051, BUG-052, BUG-053, BUG-054, BUG-055, BUG-056, BUG-057, BUG-058, BUG-059, BUG-060, BUG-061, BUG-062, BUG-063, BUG-064, BUG-065, BUG-066, BUG-067, BUG-068, BUG-069, BUG-070, BUG-071, BUG-072, BUG-073, BUG-074

---

## 0. Reading order followed (per FINAL_DOCS_APPROVAL_STATUS — Mandatory baseline reading order)

**`/app/memory/final/`:**
- `FINAL_DOCS_APPROVAL_STATUS.md` — baseline approval, mandatory future-agent reading order, open decisions register (OD-01 reporting ownership; OD-02 room billing/print lifecycle still deferred).
- `ARCHITECTURE_DECISIONS_FINAL.md` — architecture/guardrail rules, hotspots.
- `MODULE_DECISIONS_FINAL.md` — 14 module boundaries; explicit Module 4 (Order Entry / Cart / Payment), Module 5 (Rooms), Module 7 (Socket), Module 8 (Notifications), Module 10 (Reports), Module 14 (Printing/Bill/KOT).
- `IMPLEMENTATION_AGENT_RULES.md` — pre-coding rules; high-risk files list (`OrderEntry.jsx`, `CollectPaymentPanel.jsx`, `RoomCheckInModal.jsx`, `orderTransform.js`, etc.).
- `CHANGE_REQUEST_PLAYBOOK.md` — mandatory step-by-step impact-analysis workflow.
- `OPEN_QUESTIONS_FINAL_RESOLUTION.md` — touched only where relevant per bug.

**Overlay / current-state docs reviewed (`/app/memory/change_requests/` + root):**
- `BASELINE_RECONCILIATION_REPORT_2026_05_04.md`
- `FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md`
- `PENDING_TASK_REGISTER_2026_05_04.md`
- `PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md`
- `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md`
- `LAST_SPRINT_CODE_FIX_VALIDATION_2026_05_06.md`
- `CR_011_PG_SCAN_SERVE_PAYMENTTYPE_CASE_MISMATCH.md`
- `CR_013_GST_CONFIG_CORRECTION.md`
- `REPORTS_FIELD_MAPPING_TRACKER.md`
- Bug intake entries BUG-050 → BUG-074 inside `/app/memory/BUG_TEMPLATE.md`.

**Prior bug docs in `/app/memory/bugs/` consulted for cross-reference / duplicate-check:**
- BUG-032 (Back-End Order ID vs Restaurant Order ID — closed pos_final_1.0, smoke-pass 2026-05-12) — referenced in BUG-071 impact below.
- BUG-005 (referenced in BUG-057 intake) — historical "Print Bill on prepaid not business requirement" closure.
- BUG-009 (referenced in BUG-051 intake) — round-off old POS parity rule established.
- BUG-042-A/B/C (Hold UPI/payment) — referenced in BUG-058 impact below.

**Code (frontend) inspected:**
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx`
- `frontend/src/components/order-entry/OrderEntry.jsx`
- `frontend/src/components/order-entry/CartPanel.jsx`
- `frontend/src/components/order-entry/TransferFoodModal.jsx`
- `frontend/src/components/order-entry/ShiftTableModal.jsx`
- `frontend/src/components/order-entry/MergeTableModal.jsx`
- `frontend/src/components/cards/OrderCard.jsx`
- `frontend/src/components/cards/TableCard.jsx`
- `frontend/src/components/dashboard/ChannelColumn.jsx`
- `frontend/src/components/dashboard/ScanOrderPopOut.jsx`
- `frontend/src/components/reports/CollectBillPanelDrawer.jsx`
- `frontend/src/components/reports/OrderTable.jsx`
- `frontend/src/components/reports/OrderDetailSheet.jsx`
- `frontend/src/components/reports/RoomRowCard.jsx`
- `frontend/src/components/modals/RoomCheckInModal.jsx`
- `frontend/src/api/transforms/orderTransform.js`
- `frontend/src/api/transforms/profileTransform.js`
- `frontend/src/api/services/orderService.js`
- `frontend/src/api/services/roomService.js`
- `frontend/src/api/services/authService.js`
- `frontend/src/api/socket/socketHandlers.js`
- `frontend/src/api/socket/socketService.js`
- `frontend/src/api/socket/socketEvents.js`
- `frontend/src/contexts/AuthContext.jsx`
- `frontend/src/contexts/NotificationContext.jsx`
- `frontend/src/contexts/TableContext.jsx`
- `frontend/src/contexts/RestaurantContext.jsx`
- `frontend/src/pages/DashboardPage.jsx`
- `frontend/src/pages/AllOrdersReportPage.jsx`
- `frontend/src/pages/LoginPage.jsx`
- `frontend/src/pages/StatusConfigPage.jsx`
- `frontend/src/config/paymentMethods.js`
- `frontend/src/config/firebase.js`
- `frontend/src/utils/soundManager.js`

**Backend code in scope?** `/app/backend/` exists but is only a stub (`server.py` + `requirements.txt`); the real backend is external. Therefore all "backend confirmation" notes below refer to **external preprod backend** owned by the API team.

## 0.1 Baseline conflicts found

- **None of the analysed bugs trigger a baseline conflict** with `/app/memory/final/*` content (no architecture/module/policy contradiction).
- Two analysed bugs intersect **OD-02 (room billing/print lifecycle is intentionally deferred)** — BUG-063 (room bill missing keys) and BUG-065 (corporate GST not flowing to bill). These will require explicit owner confirmation before implementation per the deferred-decision rule.
- BUG-052 (Place Order should apply restaurant round-off configuration) **conflicts** with the existing wording in code comments at `orderTransform.js:655-661` and `CollectPaymentPanel.jsx:579-583` which call the current rule "BUG-009 old-POS parity, owner-approved 2026-05-05". A reversal of BUG-009 / BUG-051 closure is implied — this is **policy-level**, owner clarification mandatory.
- BUG-053 (hardcoded SGST/CGST percentage in brackets) **does not match current code** for item-level GST rows. Item-level rows already render WITHOUT a percentage; only SC/Tip/Delivery rows show a single percentage (sourced from `serviceChargeTaxPct/2`). Owner may be looking at a stale build or a different surface.
- BUG-066 (Table item transfer should not allow transfer to room) **does not match current code** — `TransferFoodModal` already excludes rooms (`orderType === 'dineIn' || isWalkIn` filter). Owner may have hit a different surface (e.g., Shift Table modal — already excludes rooms; or the "To Room" payment-method button — covered by BUG-062).

---

# BUG-050 Impact Analysis

## Source
- **Intake Bug:** `/app/memory/BUG_TEMPLATE.md` lines 4149-4209
- **Sprint:** POS2.0
- **Evidence Folder:** No separate evidence folder found.
- **Final Docs Folder:** `/app/memory/final`
- **Google Sheet Status Before Analysis:** Not provided in intake.

## User Reported Issue
After cancelling one or more items in an order, the printed bill produced from the **order card** or **order screen** shows incorrect GST / tax / totals, while the printed bill from the **Collect Bill** screen shows correctly.

## Evidence Reviewed
- Intake entry BUG-050.
- Source files:
  - `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (lines 740-772 → manual Print Bill override path)
  - `frontend/src/components/order-entry/OrderEntry.jsx` (lines 1313-1338 → onPrintBill handler from Collect Bill screen)
  - `frontend/src/components/cards/OrderCard.jsx` (lines 120-145 → dashboard `handlePrintBill`)
  - `frontend/src/components/cards/TableCard.jsx` (lines 143-180 → dashboard `handlePrintBill`)
  - `frontend/src/api/transforms/orderTransform.js` (lines 1360-1696 → `buildBillPrintPayload` default vs override branch; lines 1411 `isDetailCancelled`; lines 1413-1430 `billFoodList` filter)
  - `frontend/src/api/services/orderService.js` (line 136 → `printOrder` calling `buildBillPrintPayload`)
- No payload / screenshot / API response provided at intake.

## Module Mapping
- **Primary Module:** **14. Printing / Bill / KOT** (`MODULE_DECISIONS_FINAL.md` §14).
- **Downstream Impacted Modules:** Module 4 (Order Entry / Cart / Payment — override branch lives here), Module 3 (Dashboard — default branch entry-points), Module 5 (Rooms — room print uses same builder).
- **Module decision reference:** §14 explicitly lists "bill values drifting from payment screen" as a known impact area; §14 future-change rule: "Print changes require review of manual print, auto-print, room print, and fallback payload behavior together."

## Affected Route / Page
Embedded in dashboard (no dedicated route). Entry points:
- Order card "Bill" button on `/dashboard`.
- Table card "Bill" button on `/dashboard`.
- Order screen / Collect Bill screen Print Bill button (also embedded in dashboard).

## Affected Screen / Flow
Cashier prepares an order, cancels one or more items, then clicks "Bill" on the **dashboard card** (OrderCard or TableCard) OR the **Print Bill** button inside Collect Bill. The bill printed from the dashboard card path differs from the one printed inside Collect Bill.

## Affected Code Areas

| File | Reason |
| --- | --- |
| `frontend/src/api/transforms/orderTransform.js` | `buildBillPrintPayload` (line 1360). Has TWO logical branches: (a) override branch when caller passes `overrides.orderItemTotal/orderSubtotal/gstTax/serviceChargeAmount/...` (CollectPaymentPanel path), (b) default branch when overrides are absent (dashboard cards). |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | `handlePrintBill` lines 740-772 builds full overrides from live UI state (itemTotal, subtotal, finalTotal, discountAmount, gstTax, vatTax, serviceChargeAmount, tip, deliveryCharge, runtimeComplimentaryFoodIds). All values exclude cancelled items via `billableItems` filter. |
| `frontend/src/components/order-entry/OrderEntry.jsx` | Forwards overrides + selectedAddress (delivery) to `printOrder`. |
| `frontend/src/components/cards/OrderCard.jsx` | `handlePrintBill` lines 120-145 calls `printOrder(orderId, 'bill', null, order, scPctForPrint, { serviceChargeTaxPct, deliveryChargeGstPct }, printerAgents)` — **no item-total/subtotal/discount/tip overrides**. |
| `frontend/src/components/cards/TableCard.jsx` | Same pattern as OrderCard (no live overrides). |
| `frontend/src/api/services/orderService.js` | Line 136 — `printOrder` selects override vs default branch implicitly via the overrides object emptiness. |

## API Review
- **Endpoint:** `POST /api/v1/vendoremployee/order-temp-store` (declared in `api/constants.js` and consumed in `orderService.printOrder`).
- **Payload builder:** `toAPI.buildBillPrintPayload` (orderTransform.js:1360).
- **Response consumer:** Print backend (server-side template). Frontend does not consume response beyond success/error toast.
- **Soft-fail / hard-fail behavior:** Throws on HTTP error; both entry points show a toast.
- **API contract risk:** Default branch emits `gst_tax`, `cgst_amount`, `sgst_amount`, `vat_tax`, `discount_amount`, `Tip`, `serviceChargeAmount`, `order_subtotal`, `order_item_total`, `payment_amount`. If any of these are recomputed differently per branch, the bill renders differently.

## Socket / Realtime Review
No direct socket involvement.

## State / Data Flow
1. Cashier cancels an item → API call → backend sets `food_status=3`, `cancel_at`, `cancel_type` on the order detail row.
2. Socket emits `update-food-status` → `OrderContext` updated → the cart item shows `status='cancelled'`.
3. **Path A (Collect Bill):** CollectPaymentPanel filters `billableItems` (excludes cancelled). UI recomputes itemTotal, discount, SC, GST, tip, finalTotal — all exclude cancelled. On Print Bill click, overrides carry these live values into `buildBillPrintPayload`. Bill is correct.
4. **Path B (Dashboard card):** OrderCard / TableCard call `printOrder(...)` with NO live overrides. `buildBillPrintPayload` enters the default branch:
   - **Cancelled-item filter IS applied** (line 1411-1415 `isDetailCancelled` AND `billFoodList.filter(d => !isDetailCancelled(d))`). So food line list and `computedSubtotal` exclude cancelled items.
   - BUT no `overrides.discountAmount`, no `overrides.tip`, no `overrides.gstTax`, no `overrides.orderItemTotal`, no `overrides.orderSubtotal` are passed.
   - Result: emitted payload has `discount_amount = 0`, `Tip = order.tipAmount || 0`, `gst_tax = recomputed-from-billFoodList` (may differ from live UI value when delivery / SC factor in differently), `discount = 0`.

## Relevant Final Documentation
- `MODULE_DECISIONS_FINAL.md` §14 — explicitly mentions "bill values drifting from payment screen" as a known impact area.
- `ARCHITECTURE_DECISIONS_FINAL.md` — high-risk file list includes `orderTransform.js` (buildBillPrintPayload) and dashboard cards.

## Current Code Behavior
- Cancelled items are **correctly excluded** from `billFoodList` in both branches (line 1411-1415, added 2026-05-01).
- However, the **default branch does not know** order-level discount, tip, SC, delivery overrides from the dashboard card caller. Default branch tries to reconstruct (`computedSubtotal` + `serviceChargeAmount` via `scApplicable`), but it cannot recover discount or tip from `rawOrderDetails` alone — those are only entered on the Collect Bill page.
- Net effect: For an order with discount/tip and a subsequent item cancellation, dashboard re-print emits `discount_amount=0` and `Tip=0` (already documented as BUG-001 / BUG-273 / BUG-282 historical references in the code comments at lines 1347-1356 of OrderEntry.jsx and lines 1559-1578 of orderTransform.js).
- For "GST / tax / totals" discrepancy after cancellation specifically:
  - Override branch `gstTax = sgst + cgst` (live UI value, post-discount, post-SC GST add-back).
  - Default branch `gst_tax` recomputed from `billFoodList` item-level tax, multiplied by `(1 - discountRatio)`, with SC/Tip/Delivery GST added. **Discount on dashboard card = 0**, so `discountRatio = 0`, meaning gst_tax is **not** prorated. If the order had a discount when items were placed (or has tip), the dashboard re-print will over-state tax vs. the cashier's Collect Bill value.

## Expected Behavior
Printed bill from any entry point (order card, order screen, Collect Bill screen) should emit identical financial values for the same order at the same point in time, including correct treatment of cancelled items, discount, SC, tip, and tax.

## Root Cause Hypothesis
**Frontend payload construction issue — high-confidence hypothesis.** The default branch of `buildBillPrintPayload` (used by dashboard OrderCard/TableCard manual print) reconstructs financials from `rawOrderDetails` alone, which lacks order-level discount/tip context. After cancellation, the FOOD LINE list is correct but the supporting financial fields (discount_amount, Tip, recomputed gst_tax) diverge from the Collect Bill values. This matches the historical comment trail in `OrderEntry.jsx:1347-1356` and `orderTransform.js:1559-1578` where prior fixes (BUG-001 / BUG-273 / BUG-282) only patched specific scenarios (auto-print, BUG-282 subtotal) but the dashboard manual-print path remained reconstruction-based.

## Regression Risk Areas
- Room bill print (uses the same builder).
- Prepaid auto-print (uses override path).
- Postpaid Collect Bill (uses override path — already correct).
- Auto-print after Place+Pay.
- Re-print path (TableCard / OrderCard / RePrintButton).

## Docs / Code Mismatch
None. Code matches `MODULE_DECISIONS_FINAL.md` §14 wording about "bill values drifting from payment screen."

## Open Questions / Missing Information
- Owner has not supplied the specific cancelled-item scenario payload (e.g., before/after side-by-side bill or the exact field that mismatched — GST? CGST? Total? Subtotal?). The hypothesis above is the most likely cause but the precise field of mismatch should be confirmed against an actual printed bill.
- Whether the bug applies even when no discount/tip is present (pure GST recompute path).

## User Interaction Required
**Required.** Owner should provide:
1. A reproduction order ID where cancellation triggered the visible mismatch.
2. Snapshots of the two printed bills (dashboard vs. Collect Bill) OR the two `/order-temp-store` payloads.
3. Confirmation of whether the bug reproduces with no discount + no tip + no SC (pure tax-on-base recompute).

## Analysis Verdict
**Frontend bug** (default-branch payload-builder gap).

## Analysis Outcome
**Analysis Complete with Clarification Required.** Hypothesis is strong, but the specific field-level mismatch is owner-controlled and best confirmed by inspecting an actual mismatched bill before deciding fix scope (full default-branch removal vs. inject `order.discount` etc. into the order shape).

## Ready For Next Stage?
**No** (owner reproduction artifact / payload sample needed first).

## Next Step
Owner clarification first — request a reproduction order and the two printed-bill payloads OR screenshots.

---

# BUG-051 Impact Analysis

## Source
- **Intake Bug:** `/app/memory/BUG_TEMPLATE.md` lines 4211-4267
- **Sprint:** POS2.0
- **Evidence Folder:** No separate evidence folder found.
- **Final Docs Folder:** `/app/memory/final`
- **Google Sheet Status Before Analysis:** Not provided.

## User Reported Issue
Round-off currently uses ceiling only when the fractional part is `> 0.10` and floor otherwise. Owner says round-off should **always use ceiling whenever round-off is applied**.

## Evidence Reviewed
- Intake entry BUG-051 (and reference to BUG-009 closed previously).
- Source: `CollectPaymentPanel.jsx:579-585`, `orderTransform.js:655-663` (`calcOrderTotals`).
- `MODULE_DECISIONS_FINAL.md` §4 (Order Entry / Cart / Payment Workflow).

## Module Mapping
- **Primary Module:** **4. Order Entry / Cart / Payment Workflow**.
- **Downstream Impacted Modules:** Module 14 (Printing — bill uses same final total), Module 5 (Rooms — same SCAlt path).
- **Module decision reference:** §4 "totals/tax/SC/discount interactions"; future-change rule: "Every change must identify whether it affects place-order, update-order, collect-bill, prepaid flow, split, room, or print behavior."

## Affected Route / Page
Embedded in dashboard via Collect Bill (CollectPaymentPanel) and any Place Order with payment path.

## Affected Screen / Flow
Every flow that computes a `finalTotal` / `orderAmount` (Collect Bill, Place Order, Place+Pay, Split Bill grand total, Transfer to Room amount).

## Affected Code Areas

| File | Reason |
| --- | --- |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | Lines 579-585 — live finalTotal computation. Comment block at L579-580 reads: `BUG-009: Round-off based on fractional part (old POS parity). If fractional > 0.10 → ceil; if fractional <= 0.10 → floor.` |
| `frontend/src/api/transforms/orderTransform.js` | Lines 655-663 inside `calcOrderTotals` — same logic, repeated. Comment at L655 reads: `BUG-009: Rounding based on fractional part (old POS parity).` |
| `frontend/src/__tests__/api/transforms/qa_subtotal_delivery_validation.test.js` | Test at L113, L327, L346-351 hardcodes the "old-POS-parity" behavior — fixing this will break these tests. |

## API Review
- Both `placeOrder` / `placeOrderWithPayment` / `updateOrder` / `transferToRoom` payloads carry `order_amount` and `round_up` (orderTransform.js:671-672). Changing the ceiling rule changes both fields in every place-order / pay payload.

## Socket / Realtime Review
No direct socket involvement.

## State / Data Flow
`finalTotal` (live UI) → CollectPaymentPanel grand-total row → `paymentData.finalTotal` → `placeOrderWithPayment` / `collectBillExisting` / `transferToRoom` payload. Also `orderAmount` computed inside `calcOrderTotals` returns the same value via `...totals` spread.

## Relevant Final Documentation
- `OPEN_QUESTIONS_FINAL_RESOLUTION.md` — does not contain a frozen round-off policy beyond inheriting BUG-009 closure.
- Code comment at `CollectPaymentPanel.jsx:1705` reads "BUG-009 round-off applies ONLY to Grand Total per owner directive 2026-05-05" — this is the **frozen policy referenced in the current sprint**.
- `MODULE_DECISIONS_FINAL.md` §4 — financial rules guardrail.

## Current Code Behavior
- If `fractional = (rawFinalTotal - Math.floor(rawFinalTotal))` is `> 0.10`, ceil; else floor.
- Example: `rawFinalTotal = 100.05` → fractional 0.05 → floor → `100`. RoundOff = `-0.05`.
- Example: `rawFinalTotal = 100.15` → fractional 0.15 → ceil → `101`. RoundOff = `+0.85`.
- Sign of round-off: can be negative (favorable to customer) OR positive (favorable to restaurant).

## Expected Behavior
Per owner: "Round-off should always use ceiling whenever round-off is applied, regardless of decimal value."
- Equivalent rule: `finalTotal = Math.ceil(rawFinalTotal)`.
- Implication: round-off is always `≥ 0` (always favorable to restaurant), and is always applied as long as there is any non-zero fractional part.

## Root Cause Hypothesis
**Frontend financial-logic bug — high-confidence hypothesis** that is also a **policy reversal of BUG-009**. The current code intentionally implements the "old-POS-parity" condition. The owner is now reversing that rule. There is no defect in code execution — the change is purely a rule change.

## Regression Risk Areas
- All payment payloads (place-order, update-order, place+pay, collect-bill, transfer-to-room) — `order_amount` and `round_up` numerical values change.
- Print bill — bill total changes.
- Reports / Audit — `paid_amount` for newly placed orders increases by the rounded-up amount. Historical orders unaffected.
- Split-bill grand total.
- Cash quick-pills next-multiple calculation (CollectPaymentPanel:2196).
- Existing test suite — `qa_subtotal_delivery_validation.test.js` cases L113 and Bucket-5 assertions will need to be re-baselined.

## Docs / Code Mismatch
The comment block "BUG-009 round-off applies ONLY to Grand Total per owner directive 2026-05-05" remains correct re: scope (still Grand Total only). The rule (`fractional > 0.10 ? ceil : floor`) is what is being reversed. Comments must be updated post-fix.

## Open Questions / Missing Information
- Should the rule apply when `rawFinalTotal` is already an integer? (Math.ceil of an integer is the integer itself → no change → safe.)
- Should it apply for refund / negative adjustment scenarios? (Unlikely surfaces, but worth listing.)
- Does the backend independently re-apply round-off? (If yes, frontend change alone may produce diff between UI grand-total and backend-computed `order_amount` until backend re-aligned.) **External backend confirmation needed.**

## User Interaction Required
**Not required** to start analysis, but **required before implementation** for two reasons: (a) policy reversal of BUG-009 must be explicitly acknowledged by owner, (b) backend re-alignment confirmation.

## Analysis Verdict
**Configuration / policy change** (no code defect — rule reversal).

## Analysis Outcome
**Analysis Complete.**

## Ready For Next Stage?
**Yes** (proceed to implementation planning), with the explicit caveat that owner must sign off on the BUG-009 policy reversal and confirm backend parity.

## Next Step
Bug Implementation Planning Agent — produce a coordinated plan that touches both `CollectPaymentPanel.jsx:582-583` AND `orderTransform.js:659-661`, plus updates the comment block AND the two affected tests.

---

# BUG-052 Impact Analysis

## Source
- **Intake Bug:** `/app/memory/BUG_TEMPLATE.md` lines 4270-4327
- **Sprint:** POS2.0
- **Evidence Folder:** No separate evidence folder found.
- **Final Docs Folder:** `/app/memory/final`
- **Google Sheet Status Before Analysis:** Not provided.

## User Reported Issue
At Place Order, the restaurant's default round-off configuration is **not being applied**. Round-off currently happens only during Collect Bill. Place Order must also consider the restaurant configuration.

## Evidence Reviewed
- Intake entry BUG-052.
- `frontend/src/api/transforms/orderTransform.js` lines 585-681 (`calcOrderTotals`).
- `frontend/src/api/transforms/profileTransform.js` lines 130-235 (restaurant profile transform).
- `frontend/src/components/order-entry/OrderEntry.jsx` lines 1497-1545 (placeOrderWithPayment call site).

## Module Mapping
- **Primary Module:** **4. Order Entry / Cart / Payment Workflow** (Place Order path).
- **Downstream Impacted Modules:** Module 12 (Menu / Restaurant profile, for the config read), Module 14 (Print).
- **Module decision reference:** §4 future-change rule: "Every change must identify whether it affects place-order, update-order, collect-bill, prepaid flow, split, room, or print behavior."

## Affected Route / Page
Embedded in dashboard — Place Order button inside OrderEntry; also Place+Pay path.

## Affected Screen / Flow
Cashier composes order → clicks Place Order (or Place+Pay) → payload built by `toAPI.placeOrder` / `placeOrderWithPayment` / `updateOrder`. All three call `calcOrderTotals(...)` which currently DOES compute a `round_up` value, but using the hardcoded BUG-009 rule rather than reading a restaurant configuration.

## Affected Code Areas

| File | Reason |
| --- | --- |
| `frontend/src/api/transforms/profileTransform.js` | No `roundOff` / `round_off` / `round_up` configuration is currently parsed from the restaurant profile (grep confirms zero matches in this file). |
| `frontend/src/api/transforms/orderTransform.js` | `calcOrderTotals` (line 585) hardcodes the fractional-based rule at lines 655-661. Same rule lives in `CollectPaymentPanel.jsx:579-585`. |
| `frontend/src/contexts/RestaurantContext.jsx` | Exposes `restaurant` object but no `roundOff` field; would need a new field to be wired through. |

## API Review
- Restaurant profile endpoint: `/api/v1/vendoremployee/restaurant-profile-new` (declared in `api/constants.js`) — likely carries a `round_off` / `round_up` / `is_round_off` config key, but the **frontend transform does not currently read it** (`profileTransform.js` has no mention).
- Place-order family payloads emit `round_up` (orderTransform.js:672) regardless. So today the value is **computed** but not **configured**.

## Socket / Realtime Review
No direct socket involvement.

## State / Data Flow
1. Restaurant profile loaded at login → `RestaurantContext.restaurant.*`.
2. Cashier places order → `calcOrderTotals` runs at payload build time → returns `order_amount` (rounded) + `round_up`.
3. Currently: **no restaurant config read** in step 2 — rule is universal.

## Relevant Final Documentation
- `MODULE_DECISIONS_FINAL.md` §4 — flagged as a financial-rule sink.
- `ARCHITECTURE_DECISIONS_FINAL.md` — high-risk file list.

## Current Code Behavior
- Place Order, Update Order, and Place+Pay all DO apply the **same BUG-009 fractional rule** during payload construction.
- It is technically incorrect to say "round-off is happening only during Collect Bill" — `calcOrderTotals` applies it everywhere.
- However, the rule is **hardcoded** rather than driven by `restaurant.roundOff` configuration. So when a restaurant admin changes the rule via configuration, the UI does NOT respect that change — a defensible reading of the owner's complaint.

## Expected Behavior
- Place Order should **read the restaurant's round-off configuration** (e.g., a `round_off_mode` profile field with values like `ceil | floor | none | nearest`) and apply it consistently at Place Order, Update Order, Place+Pay, and Collect Bill.
- If the configuration says "always ceil" (which is what BUG-051 asks for), then this maps to BUG-051's universal ceiling. The combined picture is: BUG-052 introduces config-driven round-off; BUG-051 sets that config to "always ceil".

## Root Cause Hypothesis
**Frontend mapping issue + missing profile-transform field — high-confidence hypothesis.** The restaurant profile likely exposes a round-off configuration on the backend, but `profileTransform.js` does not parse it and `calcOrderTotals` does not consume it.

## Regression Risk Areas
- All four payment payloads (place-order, update-order, place+pay, collect-bill, transfer-to-room).
- Print bill totals.
- Audit / paid reports.
- BUG-009 / BUG-051 closure status — they become subsumed by this configuration.

## Docs / Code Mismatch
- `MODULE_DECISIONS_FINAL.md` §4 calls out "round-off" as a financial-rule sensitivity. No specific stance on configuration governance.
- `OPEN_QUESTIONS_FINAL_RESOLUTION.md` does not freeze the round-off policy beyond inherited BUG-009 closure.

## Open Questions / Missing Information
- **Critical (backend-owned):** What is the exact field name and value enum the backend exposes for the round-off configuration on `restaurant-profile-new`? (Candidates: `round_off`, `round_up_type`, `round_off_mode`, `is_round_off`.)
- Does the configuration allow per-order-type variation (dineIn vs delivery)? Per-channel?
- What is the default value when the field is missing on legacy restaurants?

## User Interaction Required
**Required.** Owner / API team must provide the backend field name and value contract before implementation can begin. Without that, the frontend would have to invent a contract.

## Analysis Verdict
**API contract issue** + **frontend mapping issue**. Combined with BUG-051 = a single configuration-driven rule. Best implemented together.

## Analysis Outcome
**Analysis Complete with Clarification Required.**

## Ready For Next Stage?
**No** (backend field contract needed first).

## Next Step
Owner clarification + backend confirmation first — capture the restaurant profile field name, value enum, default, and any per-channel variation rule. Then bundle BUG-051 + BUG-052 into a single implementation plan.

---

# BUG-053 Impact Analysis

## Source
- **Intake Bug:** `/app/memory/BUG_TEMPLATE.md` lines 4330-4387
- **Sprint:** POS2.0
- **Evidence Folder:** No separate evidence folder found.
- **Final Docs Folder:** `/app/memory/final`
- **Google Sheet Status Before Analysis:** Not provided.

## User Reported Issue
GST is item-level. SGST/CGST labels show hardcoded bracket percentages (e.g., "SGST (2.5%)" or "CGST (9%)"). If items in an order carry mixed GST rates, the percentage in brackets should not be shown. If all items have the same GST rate, the percentage can be shown.

## Evidence Reviewed
- Intake entry BUG-053.
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx`:
  - L1716-1724 (Item GST rows — current).
  - L1738-1769 (SC / Tip / Delivery GST rows — current).

## Module Mapping
- **Primary Module:** **4. Order Entry / Cart / Payment Workflow** (bill summary inside CollectPaymentPanel).
- **Downstream Impacted Modules:** Module 14 (Printing — print bill must match).
- **Module decision reference:** §4.

## Affected Route / Page
Embedded in dashboard (Collect Bill screen).

## Affected Screen / Flow
Bill Summary tax breakdown rows visible to cashier on Collect Payment.

## Affected Code Areas

| File | Reason |
| --- | --- |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | Tax breakdown rendering lines 1707-1781. Item GST rows (L1716-1724) render `CGST` / `SGST` labels **without** a percentage. SC / Tip / Delivery GST rows (L1738-1769) render the percentage using `restaurant.serviceChargeTaxPct / 2` or `restaurant.deliveryChargeGstPct / 2`. |

## API Review
- No payload change needed.
- Display-only labels.

## Socket / Realtime Review
No socket involvement.

## State / Data Flow
- Item GST is built per-item from `item.tax.percentage` in `taxTotals` useMemo (L208-235). Mixed rates fold into a single sgst/cgst bucket — the resulting label cannot represent a single percentage when rates differ.
- SC / Tip / Delivery GST uses a single rate from `restaurant.serviceChargeTaxPct` / `restaurant.deliveryChargeGstPct`.

## Relevant Final Documentation
None directly.

## Current Code Behavior
**Mismatch with owner intake — the current item-level rows already omit the percentage label.** The comment block at L1698-1706 explicitly states:
> "Item GST shown without rate label because items can carry mixed rates; SC / Tip / Delivery carry the single configured rate (`serviceChargeTaxPct` for SC + Tip, `deliveryChargeGstPct` for Delivery — half on each side)."

Code at L1717 reads `<span>CGST</span>` and L1721 `<span>SGST</span>` — no parenthesized percentage. This rule was introduced under CR-013 Phase 1.5 D-GST-4 (May-2026, owner-approved).

The owner may be looking at:
1. **A stale build** that still has the BUG-009-era hardcoded `SGST (2.5%)` label, OR
2. **The SC / Tip / Delivery rows** (L1738, 1742, 1751, 1755, 1764, 1768) which DO show a percentage. These percentages are NOT hardcoded — they come from restaurant config. But owner may consider these mixed-rate-unsafe too.

## Expected Behavior
Per owner: hide the percentage in brackets when items have mixed GST rates; show it when all items share a single rate.

## Root Cause Hypothesis
**Code already matches the spec for item-level rows** (high-confidence). For SC / Tip / Delivery rows, the percentage is rate-config-driven not hardcoded — these are not "item-level" so the owner's rule may or may not apply. Owner needs to clarify whether the SC / Tip / Delivery rate labels are in scope.

## Regression Risk Areas
- If SC / Tip / Delivery percentage labels are also removed, customers / cashiers lose context for those rows. Low risk; cosmetic.
- Print bill template (server-side) may render its own GST label string; not visible here.

## Docs / Code Mismatch
- Owner intake describes a state ("SGST/CGST labels show hardcoded bracket percentages like 2.5% or 9%") that does NOT match current code for item rows. Possible owner build drift OR owner is looking at SC / Tip / Delivery rows.

## Open Questions / Missing Information
- A screenshot from the owner's environment showing the exact label string (e.g., "SGST (2.5%)") and which restaurant ID / order ID.
- Build hash / deploy timestamp of the owner's view (to rule out stale build).
- Whether SC / Tip / Delivery percentage labels are in scope of this bug.

## User Interaction Required
**Required.** Owner must confirm screenshot + which rows are affected before proceeding. Otherwise risk of "fixing" rows that already meet the spec OR removing intentional rate labels.

## Analysis Verdict
**Likely already-resolved / configuration ambiguity** — pending owner screenshot.

## Analysis Outcome
**Analysis Complete with Clarification Required.**

## Ready For Next Stage?
**No** (owner artifact required to confirm the actual mismatch).

## Next Step
Owner clarification first — screenshot of the bill summary with mixed-rate items, plus identification of which row (item / SC / Tip / Delivery) violates the rule.

---

# BUG-054 Impact Analysis

## Source
- **Intake Bug:** `/app/memory/BUG_TEMPLATE.md` lines 4390-4446
- **Sprint:** POS2.0
- **Evidence Folder:** No separate evidence folder found.
- **Final Docs Folder:** `/app/memory/final`
- **Google Sheet Status Before Analysis:** Not provided.

## User Reported Issue
When an item with VAT receives an item-level discount, the item price decreases but VAT is NOT recalculated. VAT should follow the same logic as GST and recalculate based on the discounted item amount.

## Evidence Reviewed
- Intake entry BUG-054.
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` L530-577 (Live UI tax recompute).
- `frontend/src/api/transforms/orderTransform.js` L585-680 (`calcOrderTotals`).

## Module Mapping
- **Primary Module:** **4. Order Entry / Cart / Payment Workflow**.
- **Downstream Impacted Modules:** Module 14 (Printing — bill emits `vat_tax`).
- **Module decision reference:** §4 financial-rule guardrail.

## Affected Route / Page
Embedded in dashboard (Collect Bill).

## Affected Screen / Flow
Order with VAT-rated items + item or order-level discount applied at Collect Payment.

## Affected Code Areas

| File | Reason |
| --- | --- |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | L534: `itemGstPostDiscount = (taxTotals.sgst + taxTotals.cgst) * (1 - discountRatio)` — GST IS prorated by discount ratio. L575: `const vat = taxTotals.vat;` — **VAT is NOT prorated**. |
| `frontend/src/api/transforms/orderTransform.js` | `calcOrderTotals` L649: `itemGstPostDiscount = gstTax * (1 - discountRatio)`. L651 then folds in SC/Tip/Delivery GST. `vatTax` is never multiplied by `(1 - discountRatio)` (search confirms `vatTax` only appears at L587, L613, L653, L670 — never with discountRatio). |

## API Review
- Place-order / collect-bill payloads emit `vat_tax` (L670 / L1248). If frontend value is wrong, backend persists wrong value.
- API contract not changing — only frontend computation.

## Socket / Realtime Review
None.

## State / Data Flow
1. Items with `tax.type === 'VAT'` accumulate into `taxTotals.vat` (single bucket, no half-split per L227 comment).
2. Discount is applied to subtotal.
3. GST is prorated by discountRatio.
4. **VAT is not prorated** — uses pre-discount value.
5. `rawFinalTotal = subtotal + sgst + cgst + vat` (L577) — `subtotal` is post-discount, `vat` is pre-discount → tax-on-base mismatch.

## Relevant Final Documentation
- `MODULE_DECISIONS_FINAL.md` §4 financial guardrail.
- Implementation note in CollectPaymentPanel L573-575: `Item-level VAT bucket (CR-VAT-COLLECT, 2026-05): folds in alongside sgst+cgst. SC / Tip / Delivery tax math intentionally untouched per owner decision.` — explains CR-VAT-COLLECT introduced VAT but did not address discount proration.

## Current Code Behavior
On a VAT-only restaurant (e.g., UAE / foreign markets) with a 10% discount on a ₹1000 item carrying 5% VAT:
- Pre-discount: item ₹1000, VAT 50.
- Post-discount subtotal: ₹900.
- GST path (if were GST): ₹50 * 0.9 = ₹45 (correctly prorated).
- Current VAT path: ₹50 (incorrectly retained pre-discount).
- → bill over-states tax by ₹5.

## Expected Behavior
VAT should mirror GST: `vatPostDiscount = taxTotals.vat * (1 - discountRatio)`.

## Root Cause Hypothesis
**Frontend financial-logic bug — high-confidence hypothesis.** CR-VAT-COLLECT (May-2026) added the VAT bucket but did not include the discount-proration treatment that has been in place for GST since BUG-006 / AD-101.

## Regression Risk Areas
- All bill totals for VAT-only or VAT-mixed-with-GST restaurants when any discount is applied.
- Print bill (`vat_tax` echoed).
- Payment payloads — `vat_tax` value changes.
- Already-tested CR-VAT-COLLECT scenarios that don't include a discount — unaffected.

## Docs / Code Mismatch
None at policy level. The implementation note explicitly says "SC / Tip / Delivery tax math intentionally untouched per owner decision" — that wording is about SC/Tip/Delivery only, not about item-level discount proration on VAT.

## Open Questions / Missing Information
- Whether the same proration rule should apply to VAT on SC / Tip / Delivery components (currently those don't use VAT anyway — GST-only).
- Whether order-level discount and item-level discount should both prorate VAT (current GST treatment uses order-level `discountRatio` — item-level discount does not exist in current code as a separate concept).

## User Interaction Required
**Not required** — analysis is conclusive from code inspection alone.

## Analysis Verdict
**Frontend bug** (financial-logic gap in VAT discount proration).

## Analysis Outcome
**Analysis Complete.**

## Ready For Next Stage?
**Yes.**

## Next Step
Bug Implementation Planning Agent — fix at two coordinated points:
1. `CollectPaymentPanel.jsx:575` — prorate `vat` by `(1 - discountRatio)`.
2. `orderTransform.js:649-651` (and the return at L670) — prorate `vatTax` by `(1 - discountRatio)`.

---

# BUG-055 Impact Analysis

## Source
- **Intake Bug:** `/app/memory/BUG_TEMPLATE.md` lines 4449-4505
- **Sprint:** POS2.0
- **Evidence Folder:** No separate evidence folder found.
- **Final Docs Folder:** `/app/memory/final`
- **Google Sheet Status Before Analysis:** Not provided.

## User Reported Issue
The key `order_discount_type` is **not being passed** in the payload for prepaid orders, while it is passed correctly for postpaid orders.

## Evidence Reviewed
- Intake entry BUG-055.
- `frontend/src/api/transforms/orderTransform.js`:
  - `placeOrderWithPayment` (prepaid path, lines 1001-1122) — payload at L1050-1109.
  - `collectBillExisting` (postpaid path, lines 1130-1299) — payload at L1230-1287.
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` L685-720 (paymentData / discounts builder).

## Module Mapping
- **Primary Module:** **4. Order Entry / Cart / Payment Workflow** (specifically the prepaid place+pay sub-flow).
- **Downstream Impacted Modules:** Module 10 (Reports — discount type may surface in audit if backend echoes it).
- **Module decision reference:** §4.

## Affected Route / Page
Embedded in dashboard — Place+Pay path (prepaid).

## Affected Screen / Flow
Cashier composes new order → selects discount → presses Pay (without Place Order first). Frontend builds prepaid `placeOrderWithPayment` payload → POSTs to `/api/v2/vendoremployee/place-order` (with payment fields).

## Affected Code Areas

| File | Reason |
| --- | --- |
| `frontend/src/api/transforms/orderTransform.js` | `placeOrderWithPayment` payload at L1080-1085 emits: `discount_type`, `self_discount`, `coupon_discount`, `coupon_title`, `coupon_type`, `order_discount`. **`order_discount_type` is missing.** Compare with `collectBillExisting` L1272-1275 which emits BOTH `discount_type` AND `order_discount_type`. |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | L702: `orderDiscountType: discountType === 'percent' ? 'Percent' : discountType === 'flat' ? 'Amount' : ''` — produces the value. L695 spreads `presetDiscount`, L697 `orderDiscountPercent`, L701 `discountType`. The field is supplied; just not consumed by `placeOrderWithPayment`. |

## API Review
- **Endpoint A (prepaid):** `POST /api/v2/vendoremployee/place-order` — payload missing `order_discount_type`.
- **Endpoint B (postpaid):** `POST /api/v2/vendoremployee/order/order-bill-payment` — payload emits `order_discount_type`.
- Backend acceptance: Unknown whether backend rejects missing key for prepaid OR silently defaults it. **Backend confirmation needed for completeness, but the parity gap is the bug regardless.**

## Socket / Realtime Review
None.

## State / Data Flow
1. CollectPaymentPanel builds `discounts` object (L685-720) including `orderDiscountType`.
2. `discounts` flows into `paymentData.discounts`.
3. `placeOrderWithPayment` receives `paymentData.discounts` (line 1003).
4. Builds payload at L1050-1109 using `discounts.type`, `discounts.manual`, `discounts.coupon`, `discounts.couponTitle`, `discounts.couponType`, `discounts.orderDiscountPercent` — **skips** `discounts.orderDiscountType`.
5. `collectBillExisting` receives the same object and DOES emit `discounts.orderDiscountType` at L1273.

## Relevant Final Documentation
- `MODULE_DECISIONS_FINAL.md` §4 — financial rule + payload contract.
- `CR_013_GST_CONFIG_CORRECTION.md` is about GST contract; not directly relevant.

## Current Code Behavior
Place+Pay (prepaid) sends a discount but without the `order_discount_type` key — backend either ignores, throws, or defaults silently. Either way, prepaid orders **cannot record whether the order-level discount was percent vs amount** on backend, breaking parity with postpaid.

## Expected Behavior
`placeOrderWithPayment` payload should include `order_discount_type` with same value semantics as `collectBillExisting` (`'Percent'` / `'Amount'` / `''`).

## Root Cause Hypothesis
**Frontend payload-builder parity gap — high-confidence hypothesis.** The CollectBillExisting payload was updated under BUG-252 ("Aligned with OLD POS payload structure"). The corresponding update to `placeOrderWithPayment` was never made.

## Regression Risk Areas
- Backend ingestion of place-order payload — if backend was already defaulting silently, behavior changes from "default" to "explicit value". May affect downstream reports.
- Auto-print bill on prepaid Place+Pay — bill payload may now reflect the new discount type if backend echoes it.
- Update-order path: `updateOrder` at L896 also does NOT emit `order_discount_type` (search confirms). Should be reviewed in the same fix.

## Docs / Code Mismatch
None at architecture level. The BUG-252 alignment comment at L1127 ("Aligned with OLD POS payload structure") implicitly establishes the contract; place+pay drifted.

## Open Questions / Missing Information
- Backend echo behavior: does the response include `order_discount_type` on prepaid path today, or is it `null` / missing?
- Whether the same fix should be extended to `updateOrder` (`order_discount_type` missing there too) and `transferToRoom` (which doesn't carry discount fields at all — confirm).

## User Interaction Required
**Not required** for the parity hypothesis. **Recommended** for the update-order extension scope.

## Analysis Verdict
**Frontend bug** (payload parity gap between place+pay and collect-bill).

## Analysis Outcome
**Analysis Complete.**

## Ready For Next Stage?
**Yes.**

## Next Step
Bug Implementation Planning Agent — primary fix in `placeOrderWithPayment` (orderTransform.js:1080-1085). Confirm extension to `updateOrder` (L896) as part of same plan.

---

# BUG-056 Impact Analysis

## Source
- **Intake Bug:** `/app/memory/BUG_TEMPLATE.md` lines 4509-4565
- **Sprint:** POS2.0
- **Evidence Folder:** No separate evidence folder found.
- **Final Docs Folder:** `/app/memory/final`
- **Google Sheet Status Before Analysis:** Not provided.

## User Reported Issue
When a custom discount category is created (e.g., quantity discount with a defined percentage), it is **not appearing in the discount UI** of Collect Payment.

## Evidence Reviewed
- Intake entry BUG-056.
- `frontend/src/api/transforms/profileTransform.js` L249-256 (`discountTypes` transform).
- `frontend/src/contexts/RestaurantContext.jsx` L79-123 (`discountTypes` exposed).
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` — line 64 (`discountTypes` imported from context), L472 (`selectedDiscountType` state), L477-479 (`presetDiscount` derived from `selectedDiscountType`).
- Lint search: `setSelectedDiscountType` — **never called** anywhere in `CollectPaymentPanel.jsx`.

## Module Mapping
- **Primary Module:** **4. Order Entry / Cart / Payment Workflow** (Collect Payment UI).
- **Downstream Impacted Modules:** Module 12 (Restaurant profile — source of discount categories).
- **Module decision reference:** §4.

## Affected Route / Page
Embedded in dashboard (Collect Payment panel).

## Affected Screen / Flow
Cashier opens Collect Payment, looks for restaurant-configured discount categories (e.g., "Quantity Discount 10%", "Senior Citizen 5%"), tries to apply one. The dropdown / button list is not present.

## Affected Code Areas

| File | Reason |
| --- | --- |
| `frontend/src/contexts/RestaurantContext.jsx` | Exposes `discountTypes` from `restaurant.discountTypes`. |
| `frontend/src/api/transforms/profileTransform.js` | L178: `discountTypes: fromAPI.discountTypes(api.restaurant_discount_type)`. L249-256 maps each to `{ id, name, discountPercent }`. Returns `[]` when input is not an array. |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | Imports `discountTypes` (L64). Declares `selectedDiscountType` state (L472). Uses it in `presetDiscount` computation (L477-479) and payload (`discounts.preset` at L695). **No UI element renders the list, and `setSelectedDiscountType` is never called.** |
| `frontend/src/components/panels/settings/ListFormViews.jsx` | L129-181 — admin Settings panel CAN list / create discount types, confirming the data source flows from API to context to admin UI. The gap is on Collect Payment. |

## API Review
- `restaurant-profile-new` likely returns `restaurant_discount_type: [{id, name, discount_percent}]` — transform reads this correctly.
- No API change needed.

## Socket / Realtime Review
None.

## State / Data Flow
1. Login → bootstrap fetches restaurant profile → `restaurant.discountTypes` populated.
2. Settings panel `ListFormViews.jsx` displays the list correctly (proves data flows).
3. CollectPaymentPanel imports `discountTypes` but only the `selectedDiscountType` state machinery exists; **no `<select>` or `<button-list>` element is rendered**.
4. As a result, `selectedDiscountType` stays `null`, `presetDiscount = 0`, payload `discounts.preset = 0`.

## Relevant Final Documentation
- `MODULE_DECISIONS_FINAL.md` §4 — discount handling is in scope of Order Entry / Cart / Payment.

## Current Code Behavior
- Restaurant-configured discount categories are fetched, transformed, and exposed correctly.
- The Collect Payment UI **only renders manual discount (percent / flat) + loyalty + wallet + coupon** — no rendered picker for `discountTypes` (preset categories).
- Code already supports the calculation if a category were selected (`presetDiscount` formula and `discounts.preset` payload field exist).

## Expected Behavior
Custom / preset discount categories from `restaurant.discountTypes` should be selectable in the Collect Payment UI (e.g., as a dropdown next to the manual discount input, or as a separate row).

## Root Cause Hypothesis
**Frontend UI gap — missing render — high-confidence hypothesis.** The state and calculation exist but no setter is wired and no picker is rendered. This is most likely an incomplete previous implementation (e.g., a partial port of an older feature from the OLD POS).

## Regression Risk Areas
- Discount layering: ensure preset + manual + coupon + loyalty don't double-count. Code at L500 already does `manualDiscount + presetDiscount + loyaltyDiscount + couponDiscount + walletDiscount`, so layering math is ready.
- Print bill `discount_amount` aggregation — already groups manual + preset + coupon (CollectPaymentPanel.jsx:745) — picker would feed this correctly.
- Audit report — `discounts.preset` already flows into payload at L695.

## Docs / Code Mismatch
None.

## Open Questions / Missing Information
- Owner's UX preference: dropdown above manual discount input, or as a separate "Preset Discounts" rail, or as quick-select buttons?
- Should preset-category selection be mutually exclusive with manual percent / flat? Or stackable?
- Should the picker be visible even when the cashier doesn't have a preset configured (i.e., empty list hidden)?

## User Interaction Required
**Required.** Owner UX preference for the picker style + mutual-exclusivity rule must be confirmed.

## Analysis Verdict
**Frontend UI bug** (missing render — incomplete feature).

## Analysis Outcome
**Analysis Complete with Clarification Required.**

## Ready For Next Stage?
**No** (owner UX choice needed).

## Next Step
Owner clarification first — confirm picker UX. Then implementation plan to render the picker, wire `setSelectedDiscountType`, and define mutual-exclusivity with manual discount.

---

# BUG-057 Impact Analysis

## Source
- **Intake Bug:** `/app/memory/BUG_TEMPLATE.md` lines 4568-4624
- **Sprint:** POS2.0
- **Evidence Folder:** No separate evidence folder found.
- **Final Docs Folder:** `/app/memory/final`
- **Google Sheet Status Before Analysis:** Not provided.

## User Reported Issue
On prepaid orders, the **Print Bill button is missing** on the order screen and on the Collect Bill screen. The same print logic should apply, so the button should be available.

## Evidence Reviewed
- Intake entry BUG-057 + reference to BUG-005 (closed as "not a business requirement").
- `frontend/src/components/cards/OrderCard.jsx` L761-786 (Bill vs Settle button gate).
- `frontend/src/components/order-entry/OrderEntry.jsx` L653, L1313-1338 (`isPrepaid` derivation + `onPrintBill` plumbing).
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` L806-818 (Print Bill button visibility gate: `hasPlacedItems && onPrintBill`).

## Module Mapping
- **Primary Module:** **14. Printing / Bill / KOT** (button visibility decision).
- **Downstream Impacted Modules:** Module 4 (Order Entry — CollectPaymentPanel render), Module 3 (Dashboard — OrderCard render).
- **Module decision reference:** §14, §4.

## Affected Route / Page
Embedded in dashboard.

## Affected Screen / Flow
Two distinct surfaces:

1. **OrderCard (dashboard) → "Bill" button:** Currently hidden for prepaid orders by an `if (paymentType === 'prepaid') show Settle else show Bill` switch.
2. **Inside OrderEntry / CollectPaymentPanel → "Print Bill" button:** Currently gated by `hasPlacedItems && onPrintBill`. `onPrintBill` IS wired in OrderEntry.jsx:1313 regardless of `isPrepaid`. So in principle the button SHOULD be visible for prepaid orders inside Collect Payment.

## Affected Code Areas

| File | Reason |
| --- | --- |
| `frontend/src/components/cards/OrderCard.jsx` | L761-786 — `paymentType === 'prepaid'` branch shows ONLY the Settle button; "Bill" branch is in the `else`. Prepaid orders never reach the Bill button on the dashboard card. |
| `frontend/src/components/order-entry/OrderEntry.jsx` | L1313-1338 — `onPrintBill` handler is wired unconditionally. Passing it to CollectPaymentPanel regardless of `isPrepaid`. |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | L806-818 — Print Bill button renders when `hasPlacedItems && onPrintBill` — both true for prepaid orders that are placed. **Button SHOULD appear in CollectPaymentPanel for prepaid orders already.** |

## API Review
- `POST /api/v1/vendoremployee/order-temp-store` (BILL_PRINT) — same endpoint for prepaid and postpaid. No API issue.

## Socket / Realtime Review
None.

## State / Data Flow
- `paymentType` is hydrated from socket (`api.payment_type`) into `OrderContext`.
- `OrderEntry.isPrepaid = liveOrder?.paymentType || orderData?.paymentType === 'prepaid'` (L653).
- `CollectPaymentPanel.isPrepaid` is passed in (L36) — gates delivery-charge editability + To Room button, but does NOT gate Print Bill button.

## Relevant Final Documentation
- BUG-005 was referenced in the intake as previously closed with "not a business requirement". The owner is now reversing that — explicit business-requirement change.

## Current Code Behavior
- **Dashboard OrderCard:** Bill button hidden for prepaid orders (Settle shown instead).
- **CollectPaymentPanel:** Print Bill button SHOULD be visible for prepaid orders (no `isPrepaid` gate on the visibility condition). Owner's complaint that "Print Bill button is missing on Collect Bill screen" for prepaid orders may indicate:
  - Either a different gating path is hiding it (e.g., `onPrintBill` not passed for prepaid path) — need to re-verify the exact `isPrepaid` flow in OrderEntry, OR
  - The owner observed the dashboard OrderCard absence and conflated the two surfaces.
- Indeed, in OrderEntry.jsx L1313, `onPrintBill` is wired unconditionally. So CollectPaymentPanel SHOULD show the button when there are placed items. **Code inspection suggests CollectPaymentPanel button is already present for prepaid; only the dashboard OrderCard is missing it.** Owner reproduction is needed to confirm.

## Expected Behavior
- Both the dashboard OrderCard and the CollectPaymentPanel should expose a Print Bill button for prepaid orders that have at least one placed item, given the same business logic (e.g., a Place+Pay receipt needs to be re-printable).

## Root Cause Hypothesis
**Frontend UI gate — high-confidence for OrderCard, medium-confidence for CollectPaymentPanel.** OrderCard's prepaid branch was explicit and intentional (BUG-274 wired the Settle button there). CollectPaymentPanel's Print Bill should already work for prepaid — confirm via owner repro.

## Regression Risk Areas
- Adding Print Bill alongside Settle on the dashboard card → button density may push card layout; need design review.
- Auto-print on Place+Pay (BUG-273) — already prints. Adding manual print is additive but may produce duplicate prints if cashier hits it twice.
- BUG-005 historical decision reversal — confirm with owner this is a deliberate change of business intent.

## Docs / Code Mismatch
- Intake mentions "May be related to BUG-005 (closed as 'not a business requirement')" — owner is now reversing.

## Open Questions / Missing Information
- Owner reproduction on the CollectPaymentPanel surface (is the button actually missing, or only on OrderCard?).
- Should the dashboard card show BOTH Settle and Print Bill, or replace one with the other based on context?

## User Interaction Required
**Required.** Owner must confirm: (a) whether Collect Payment's Print Bill is actually missing for prepaid orders, (b) UX intent for OrderCard (replace Settle, add alongside, or new icon).

## Analysis Verdict
**Frontend UI bug** (OrderCard prepaid branch missing Print Bill) + possible **already-resolved** for CollectPaymentPanel.

## Analysis Outcome
**Analysis Complete with Clarification Required.**

## Ready For Next Stage?
**No** (owner clarification on UX intent for dashboard card).

## Next Step
Owner clarification first — confirm both surfaces and design intent.

---

# BUG-058 Impact Analysis

## Source
- **Intake Bug:** `/app/memory/BUG_TEMPLATE.md` lines 4628-4687
- **Sprint:** POS2.0
- **Evidence Folder:** No separate evidence folder found.
- **Final Docs Folder:** `/app/memory/final`
- **Google Sheet Status Before Analysis:** Not provided.

## User Reported Issue
When a prepaid order is moved to pending payment, it appears under Audit Report → Hold. Trying to collect the bill from Hold for that prepaid order **gives an error**, while postpaid collection works.

## Evidence Reviewed
- Intake entry BUG-058 + reference to BUG-042 (Hold UPI, closed).
- `frontend/src/pages/AllOrdersReportPage.jsx` L687-748 (Collect Bill handlers).
- `frontend/src/components/reports/CollectBillPanelDrawer.jsx` L92-301 (drawer + `handlePaymentComplete`).
- `frontend/src/api/transforms/orderTransform.js` L1130-1299 (`collectBillExisting`) + L1001-1122 (`placeOrderWithPayment` — prepaid path).
- `frontend/src/api/constants.js` — endpoints: BILL_PAYMENT, PAID_PREPAID_ORDER.

## Module Mapping
- **Primary Module:** **10. Reports / Audit / Summary** (entry point: Hold tab).
- **Downstream Impacted Modules:** Module 4 (Order Entry / Payment Workflow — the actual payment path), Module 14 (Print).
- **Module decision reference:** §10, §4.

## Affected Route / Page
`/reports/audit` → Hold tab.

## Affected Screen / Flow
1. Cashier creates a prepaid order with pending payment (e.g., advance not collected) → order lands in Hold tab.
2. Cashier clicks the Hold row's "Collect" pill → `CollectBillPanelDrawer` opens.
3. Cashier picks Cash / Card / UPI → presses Pay.
4. Drawer's `handlePaymentComplete` calls `orderToAPI.collectBillExisting(...)` + POSTs to `BILL_PAYMENT` endpoint.
5. Backend rejects because the order is prepaid (paymentType='prepaid'), not postpaid — wrong endpoint.

## Affected Code Areas

| File | Reason |
| --- | --- |
| `frontend/src/components/reports/CollectBillPanelDrawer.jsx` | L160-196 — `handlePaymentComplete` **always** calls `collectBillExisting` + POSTs to `BILL_PAYMENT`. No branch by `detail.paymentType`. |
| `frontend/src/api/transforms/orderTransform.js` | `collectBillExisting` (L1130) expects postpaid contract; `placeOrderWithPayment` (L1001) is prepaid. Prepaid pending-payment completion should likely route through a different endpoint such as `paid-prepaid-order` (referenced in `OrderCard.handleSettlePrepaid` L156). |
| `frontend/src/api/services/paymentMutationService.js` | (not inspected in detail) — may already export a `completePrepaidOrder` helper used by OrderCard's Settle path. Same path needed from Hold tab. |

## API Review
- **Postpaid path:** `POST /api/v2/vendoremployee/order/order-bill-payment` with `collectBillExisting` payload.
- **Prepaid path (likely correct one):** `POST /api/v2/vendoremployee/order/paid-prepaid-order` (used by OrderCard.handleSettlePrepaid for status-5 prepaid orders).
- Soft / hard fail: Hard fail — backend will return 4xx if the order is prepaid and called with `order-bill-payment`. The error is currently surfaced via `handleCollectError` toast on the AllOrdersReportPage.

## Socket / Realtime Review
- After successful payment, backend emits socket events that the page refetches via `fetchOrders()`. Same for both flows.

## State / Data Flow
1. Held order data fetched via `SINGLE_ORDER_NEW` (CollectBillPanelDrawer.jsx:128).
2. `orderFromAPI.order(raw)` produces a `transformed.paymentType` (`api.payment_type` mapping).
3. Drawer body uses CollectPaymentPanel WITHOUT passing `isPrepaid` (L264-296) — so the panel's UI lock rules aren't applied either.
4. On Pay → unconditionally collectBillExisting → wrong endpoint for prepaid.

## Relevant Final Documentation
- `MODULE_DECISIONS_FINAL.md` §10 — Reports module owns this surface; §4 owns the payment contract.
- `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md` should be checked for any related payload contract updates (referenced but not analysed in depth — confirmed not directly relevant to this bug).

## Current Code Behavior
- Prepaid Hold rows reach CollectBillPanelDrawer.
- All payments route through `BILL_PAYMENT` → backend rejection → toast "Could not collect bill".
- The dashboard's prepaid Settle button (OrderCard) uses the correct endpoint (`paid-prepaid-order` via `completePrepaidOrder`), proving the right path exists in code.

## Expected Behavior
- Drawer's `handlePaymentComplete` should branch by `detail.paymentType`:
  - `'postpaid'` (or missing) → existing flow (`collectBillExisting` + BILL_PAYMENT).
  - `'prepaid'` → `paid-prepaid-order` endpoint (mirror OrderCard `handleSettlePrepaid` shape).

## Root Cause Hypothesis
**Frontend payload-builder + endpoint routing gap — high-confidence hypothesis.** The drawer was implemented under CR-003 Phase 3.6 assuming all Hold rows are postpaid. Prepaid pending-payment orders are a new edge that landed in Hold (per intake notes; tied to BUG-042-A/B/C session work).

## Regression Risk Areas
- BUG-042-A/B/C closure status — Hold tab collect-bill was just stabilised; the prepaid branch must not break the postpaid path.
- BUG-274 (Settle prepaid) — dashboard Settle still uses the right endpoint; do not duplicate state.
- Optimistic removal logic on AllOrdersReportPage (L714-748) — should remain unchanged because success/error callbacks are stable.

## Docs / Code Mismatch
None.

## Open Questions / Missing Information
- Confirm the exact backend endpoint for prepaid pending-payment completion (`paid-prepaid-order` vs. a dedicated `prepaid-pending-payment-collect` if any).
- Confirm how `paid-prepaid-order` should accept a method override (cash / card / upi) — `OrderCard.handleSettlePrepaid` passes only `serviceTax` + `tipAmount`, no method, suggesting the original Settle path assumed cash. Owner UX intent for paying prepaid pending via card / UPI from Hold needs confirmation.
- The actual error response body from the failing flow (owner did not attach it to intake).

## User Interaction Required
**Required.** Owner must (a) supply the exact failed API response, (b) confirm whether prepaid Hold completion should allow split / non-cash methods.

## Analysis Verdict
**API contract / endpoint-routing issue** at the frontend.

## Analysis Outcome
**Analysis Complete with Clarification Required.**

## Ready For Next Stage?
**No** (backend endpoint contract + UX intent confirmation needed).

## Next Step
Owner clarification first (error response + UX intent) — then bundle with BUG-042 family fix history for implementation planning.

---

# BUG-059 Impact Analysis

## Source
- **Intake Bug:** `/app/memory/BUG_TEMPLATE.md` lines 4690-4748
- **Sprint:** POS2.0
- **Evidence Folder:** No separate evidence folder found.
- **Final Docs Folder:** `/app/memory/final`
- **Google Sheet Status Before Analysis:** Not provided.

## User Reported Issue
In the Audit Report, there should be a **Print Bill option** for completed / paid orders and for cancelled orders. Currently this option is missing or needs validation.

## Evidence Reviewed
- Intake entry BUG-059.
- `frontend/src/pages/AllOrdersReportPage.jsx` L750-765 (`actionsConfig`).
- `frontend/src/components/reports/OrderTable.jsx` L264-360 (`renderActionsCell`).
- `frontend/src/components/reports/OrderDetailSheet.jsx` (inspected for action surfaces; no Print Bill).
- `frontend/src/components/reports/CollectBillPanelDrawer.jsx` L271 — `onPrintBill={null}` (disabled even for Hold).

## Module Mapping
- **Primary Module:** **10. Reports / Audit / Summary**.
- **Downstream Impacted Modules:** Module 14 (Printing — would reuse `buildBillPrintPayload`), Module 4 (Order Entry — `OrderEntry.onPrintBill` plumbing).
- **Module decision reference:** §10 + §14.

## Affected Route / Page
`/reports/audit` — Paid, Cancelled, Completed tabs (and possibly Hold tab too).

## Affected Screen / Flow
Cashier / manager opens Audit Report → views completed/cancelled orders → wants to re-print the bill for a historical order. Currently no UI affordance.

## Affected Code Areas

| File | Reason |
| --- | --- |
| `frontend/src/components/reports/OrderTable.jsx` | `renderActionsCell` (L264) exposes only Collect Bill / Change Method / Mark Unpaid — for Paid + Hold tabs only. No Print Bill action. No actionsConfig for Cancelled. |
| `frontend/src/pages/AllOrdersReportPage.jsx` | L750-765 — actionsConfig is only built when `activeTab === 'paid' || 'hold'`. Cancelled / completed tabs get `null`. |
| `frontend/src/components/reports/CollectBillPanelDrawer.jsx` | L271 — `onPrintBill={null}` even when the drawer is open. Suggests intentional historical suppression. |
| `frontend/src/api/services/orderService.js` | `printOrder(orderId, 'bill', ...)` exists and works on any order id with `rawOrderDetails` — can be reused. |

## API Review
- `POST /api/v1/vendoremployee/order-temp-store` is order-id agnostic — works on past completed/cancelled rows.
- `POST /api/v1/vendoremployee/get-single-order-new` provides `rawOrderDetails` for any historical order.
- No new endpoint needed.

## Socket / Realtime Review
None.

## State / Data Flow
1. Row click currently opens `OrderDetailSheet` (read-only view).
2. To add Print Bill: a new action button on the row OR a button inside OrderDetailSheet that calls `getSingleOrderNew(orderId)` → `orderFromAPI.order(raw)` → `printOrder(orderId, 'bill', null, transformed, scPct, {}, printerAgents)`.

## Relevant Final Documentation
- `MODULE_DECISIONS_FINAL.md` §14 — print module is the right home.
- `OPEN_QUESTIONS_FINAL_RESOLUTION.md` OD-01 (reporting ownership) — relevant because Audit Report consumers historically pulled aggregation from backend; this is presentation only, so OD-01 doesn't block.

## Current Code Behavior
- Audit Report has zero Print Bill affordance on Paid, Cancelled, Completed, or any tab.
- Hold tab opens Collect Bill drawer but explicitly disables Print Bill (`onPrintBill={null}`).

## Expected Behavior
Print Bill option (button / icon / row action) available for paid / completed / cancelled orders in Audit Report — issuing the same `/order-temp-store` payload as a fresh print.

## Root Cause Hypothesis
**Frontend feature gap — missing UI affordance — high-confidence hypothesis.** Not a defect; an intentional omission that the owner now wants to add.

## Regression Risk Areas
- For cancelled orders, `buildBillPrintPayload` already excludes cancelled items via `isDetailCancelled` filter (L1411-1415). An all-cancelled order would emit a near-empty `billFoodList`. Owner should clarify expected bill content for fully-cancelled orders (maybe show all original items with strikethrough?).
- Service-charge applicability rule (`scApplicable` at L1499-1500 in orderTransform) — completed orders re-print uses `order.orderType` and `order.isRoom`. Already coherent.
- Discount / tip / SC reconstruction — same default-branch limitations as BUG-050 (no override values on cancelled / paid re-prints from audit).

## Docs / Code Mismatch
None.

## Open Questions / Missing Information
- UX surface: row-level icon vs. inside OrderDetailSheet vs. inside CollectBillDrawer (Hold)?
- For cancelled orders: print should show original-with-strikethrough OR exclude cancelled lines (current default behavior)? Owner intent needed.
- Permission gate (e.g., only managers can re-print historical bills)?

## User Interaction Required
**Required.** UX surface + cancelled-print content choice + permission gate.

## Analysis Verdict
**Frontend feature gap** (missing Print Bill in Audit Report).

## Analysis Outcome
**Analysis Complete with Clarification Required.**

## Ready For Next Stage?
**No** (owner clarification needed for UX / scope).

## Next Step
Owner clarification first.

---

# BUG-060 Impact Analysis

## Source
- **Intake Bug:** `/app/memory/BUG_TEMPLATE.md` lines 4751-4810
- **Sprint:** POS2.0
- **Evidence Folder:** No separate evidence folder found.
- **Final Docs Folder:** `/app/memory/final`
- **Google Sheet Status Before Analysis:** Not provided.

## User Reported Issue
When an order is **transferred to a room**, the cart contents are cleared but the **source table still shows occupied** on the dashboard. Dashboard redirection also does not happen.

## Evidence Reviewed
- Intake entry BUG-060.
- `frontend/src/components/order-entry/OrderEntry.jsx` L1449-1468 (Scenario 3: Transfer to Room).
- `frontend/src/api/transforms/orderTransform.js` L1308-1340 (`transferToRoom` payload builder).
- `frontend/src/api/socket/socketHandlers.js` (search for any room-shift event handler — none found beyond the generic new-order / update-order handlers).
- `frontend/src/contexts/TableContext.jsx` L94-130 (`updateTableStatus`).

## Module Mapping
- **Primary Module:** **5. Rooms / Room Check-In / Room Transfer**.
- **Downstream Impacted Modules:** Module 13 (Tables & Orders Runtime State — source table status), Module 7 (Realtime Socket — backend's emit driving the status flip), Module 3 (Dashboard — visible occupancy).
- **Module decision reference:** §5 ("room transfer behavior" as common impact area).

## Affected Route / Page
Embedded in dashboard.

## Affected Screen / Flow
Order on a table → cashier presses Pay → selects "To Room" → picks destination room → confirms. Frontend POSTs `ORDER_SHIFTED_ROOM` then calls `navigateAfterOrderAction()` (L1468). The source table should become Available — currently does not until manual refresh.

## Affected Code Areas

| File | Reason |
| --- | --- |
| `frontend/src/components/order-entry/OrderEntry.jsx` | L1450-1468 — fires HTTP, shows toast, navigates. Does NOT call `updateTableStatus(sourceTableId, 'available')` and does NOT call `removeOrder(orderId)` from `OrderContext`. Relies entirely on backend socket emission. |
| `frontend/src/api/socket/socketHandlers.js` | No dedicated handler for `order-shifted-room` socket event (search produced zero matches). The current `handleNewOrder` adds the destination (room) order. There is no handler that removes the source (table) order or frees the source table. |
| `frontend/src/contexts/TableContext.jsx` | `updateTableStatus` exists (L94) but is only called by socket handlers and explicit dashboard logic. |
| `frontend/src/contexts/OrderContext.jsx` | Has `removeOrder` exposed — not called by transfer-to-room frontend path. |

## API Review
- `POST /api/v1/vendoremployee/order-shifted-room` — payload at orderTransform.js:1308-1340. Returns success message. Frontend reads `res.data?.message` for toast only.

## Socket / Realtime Review
- The fix likely depends on the backend emitting either:
  - `update-table` with `table_status='available'` for the source table, OR
  - `update-order-status` / `update-order-source` for the source order indicating it moved.
- **If backend already emits these correctly**, then the frontend handler `handleUpdateOrderTarget` (orderTransform.js:1313-1340 of socketHandlers) should already free the source. Need backend behavior confirmation.
- **If backend does not emit**, the frontend must perform optimistic table-status update + order-context removal in `OrderEntry.transferToRoom` Scenario 3.

## State / Data Flow
1. HTTP success → backend writes new room order, marks source order as shifted, frees source table on DB.
2. Backend SHOULD emit:
   - `update-order-source` or `update-order-status` (3-cancelled or 6-shifted) for the source order.
   - `update-table` with available for source table.
   - `new-order` for the destination (room) order.
3. Frontend SHOULD react. Today, evidence suggests step 2 emissions are incomplete or step 3's handlers don't free the source table.

## Relevant Final Documentation
- `MODULE_DECISIONS_FINAL.md` §5 "room transfer behavior"; §13 "stale locks / table-order lookup assumptions"; §7 "subscription timing / table-order sync conflicts".
- `OPEN_QUESTIONS_FINAL_RESOLUTION.md` OD-02 (room billing/print lifecycle deferred) — **DOES intersect this bug** because the lifecycle ownership of "what happens to source table on room transfer" is part of room workflow semantics.

## Current Code Behavior
- HTTP succeeds; UI navigates; source table card still shows occupied; visible until manual refresh or until a subsequent socket event for that table arrives.

## Expected Behavior
After successful transfer to room: source table should immediately show Available (zero items, no orderId), and dashboard should reflect the new room order.

## Root Cause Hypothesis
**Combined frontend state-sync bug + likely backend socket gap — medium-confidence hypothesis pending backend behavior verification.** Most probably the backend does not emit a clean `update-table` for the source table after `order-shifted-room`, and frontend does not compensate optimistically.

## Regression Risk Areas
- Engage lock state (TableContext) — must not double-clear.
- Source order presence in OrderContext — must be removed exactly once.
- Destination room order arrival — must not conflict with the source-removal.
- ChannelView dineIn column — should drop the source card immediately.

## Docs / Code Mismatch
- OD-02 (room billing/print lifecycle) is the right place to record this. Implementation should explicitly state which side (frontend optimistic vs. backend socket) owns the source-free.

## Open Questions / Missing Information
- **Backend emission inventory for `order-shifted-room`:** what events fire, in what order, with what payloads.
- Whether the source table card should also redirect to dashboard if currently on the OrderEntry screen of the source.

## User Interaction Required
**Required (backend behavior verification).** Owner / backend team must inspect the live socket trace after a successful `order-shifted-room` call to confirm which events emit.

## Analysis Verdict
**Socket / state-sync bug** (likely backend-frontend coordination gap).

## Analysis Outcome
**Analysis Complete with Clarification Required.**

## Ready For Next Stage?
**No** (backend behavior verification needed first).

## Next Step
Backend confirmation first — capture socket trace post-transfer. Then decide frontend optimistic vs. socket-driven fix.

---

# BUG-061 Impact Analysis

## Source
- **Intake Bug:** `/app/memory/BUG_TEMPLATE.md` lines 4814-4870
- **Sprint:** POS2.0
- **Evidence Folder:** No separate evidence folder found.
- **Final Docs Folder:** `/app/memory/final`
- **Google Sheet Status Before Analysis:** Not provided.

## User Reported Issue
When a room is checked in, the **check-in time is not appearing in the Audit Report**.

## Evidence Reviewed
- Intake entry BUG-061.
- `frontend/src/api/transforms/orderTransform.js` L334-368 (`roomInfo` mapping — `checkInDate`, `checkOutDate` are captured).
- `frontend/src/components/reports/RoomRowCard.jsx` L431 (uses `detail?.roomInfo?.checkInDate` — works for rooms report).
- `frontend/src/pages/AllOrdersReportPage.jsx` / `OrderTable.jsx` / `OrderDetailSheet.jsx` — **no occurrence** of `checkIn`, `check_in`, `checkin` (grep confirmed zero matches).
- `frontend/src/api/services/roomService.js` L95 — frontend already sends `checkin_date` (date + time concatenated) to backend.

## Module Mapping
- **Primary Module:** **10. Reports / Audit / Summary**.
- **Downstream Impacted Modules:** Module 5 (Rooms — data source).
- **Module decision reference:** §10 + §5.

## Affected Route / Page
`/reports/audit` (Audit Report).

## Affected Screen / Flow
Cashier / manager views Audit Report → looks at a room order row → check-in time not displayed.

## Affected Code Areas

| File | Reason |
| --- | --- |
| `frontend/src/pages/AllOrdersReportPage.jsx` | Does not surface `roomInfo.checkInDate` in any column. |
| `frontend/src/components/reports/OrderTable.jsx` | Column set does not include check-in time. |
| `frontend/src/components/reports/OrderDetailSheet.jsx` | Does not render check-in. |
| `frontend/src/api/transforms/reportTransform.js` | Should be checked for room-detail mapping; current evidence is mapping happens in `orderTransform.fromAPI.order` which IS used for room context but not for the report-page filtered list (which uses `reportTransform`). |

## API Review
- `getOrderLogsReport` (reportService.js) returns rows that exclude rooms (AllOrdersReportPage explicitly removes RM/SRM/ROOM rows from the operator-facing list). So **rooms are intentionally filtered out** of Audit Report. The owner may be referring to the dedicated Rooms Report (`/reports/rooms`) where `RoomRowCard` already displays check-in date.
- Alternative interpretation: owner wants check-in time on the **room-children order rows** that DO appear in Audit Report (room-attached dine-in orders).

## Socket / Realtime Review
None.

## State / Data Flow
- Frontend already sends `checkin_date` (date + time) to backend on check-in.
- Backend echoes it in `room_info.checkin_date`.
- `orderFromAPI.order` parses it into `roomInfo.checkInDate`.
- Currently consumed only by `RoomRowCard` (Rooms Report), NOT by AllOrdersReportPage.

## Relevant Final Documentation
- `MODULE_DECISIONS_FINAL.md` §10 — "business-day filtering, reconciliation logic" — check-in time is part of the audit timeline.
- `OPEN_QUESTIONS_FINAL_RESOLUTION.md` OD-02 (room lifecycle deferred) — touches this.

## Current Code Behavior
- Audit Report explicitly filters out room rows (`isRoomOrderForReport` exclusion at AllOrdersReportPage:258).
- Room-children (associated dine-in orders) appear, but the only date column is the order's `created_at` — not the parent room's check-in time.
- Rooms Report (separate page) shows check-in correctly.

## Expected Behavior
- Confirm with owner: should the Audit Report include rooms (currently filtered)? Or should check-in time appear only on room-children rows?

## Root Cause Hypothesis
**Frontend mapping / UI gap — high-confidence hypothesis** combined with **scope ambiguity** (which surface).

## Regression Risk Areas
- If rooms are re-included in Audit Report, CR-001 / CR-004 closures around "rooms moved to dedicated rooms report" may regress.
- If check-in time is added to room-children rows only, OrderTable / OrderDetailSheet column counts change.

## Docs / Code Mismatch
- CR-001 CS-16..CS-22 explicitly moved room rows to `/reports/rooms`. BUG-061 implies a partial reversal OR a clarification to enrich room-children rows.

## Open Questions / Missing Information
- Which surface does the owner mean: Audit Report (operator-facing /reports/audit), Rooms Report (/reports/rooms), or both?
- For room-children rows, should check-in time appear in a new column, on hover, or in OrderDetailSheet only?

## User Interaction Required
**Required.** Owner must clarify which surface and whether this is a column addition vs. policy change.

## Analysis Verdict
**Frontend UI gap** + **scope ambiguity**.

## Analysis Outcome
**Analysis Complete with Clarification Required.**

## Ready For Next Stage?
**No** (owner UX clarification needed).

## Next Step
Owner clarification first.

---

# BUG-062 Impact Analysis

## Source
- **Intake Bug:** `/app/memory/BUG_TEMPLATE.md` lines 4874-4931
- **Sprint:** POS2.0
- **Evidence Folder:** No separate evidence folder found.
- **Final Docs Folder:** `/app/memory/final`
- **Google Sheet Status Before Analysis:** Not provided.

## User Reported Issue
Takeaway and Delivery orders should **not be transferable to room**. Room transfer should be allowed only for room-compatible order types.

## Evidence Reviewed
- Intake entry BUG-062.
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` L1952-1966 ("To Room" button render gate).
- `frontend/src/config/paymentMethods.js` L85-94, L188-217 (transferToRoom config + filter).

## Module Mapping
- **Primary Module:** **5. Rooms / Room Check-In / Room Transfer**.
- **Downstream Impacted Modules:** Module 4 (Order Entry — payment method UI).
- **Module decision reference:** §5.

## Affected Route / Page
Embedded in dashboard (Collect Payment).

## Affected Screen / Flow
Cashier opens Collect Payment for a takeaway or delivery order → sees the "To Room" button → can transfer to room (should be blocked).

## Affected Code Areas

| File | Reason |
| --- | --- |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | L1953 — `!isRoom && hasRooms && hasPlacedItems` is the only gate. No `orderType` check. Takeaway / Delivery satisfy all three. |
| `frontend/src/config/paymentMethods.js` | L85-94 (config) and L188-217 (`filterLayoutByApiTypes`) check `requiresRooms` and `hasRooms` — no `orderType` filter. |

## API Review
- `ORDER_SHIFTED_ROOM` endpoint is reachable for any order type today.

## Socket / Realtime Review
None.

## State / Data Flow
The render gate is purely UI; if hidden, the payment method cannot be selected → cannot transfer.

## Relevant Final Documentation
- `MODULE_DECISIONS_FINAL.md` §5 + §4.

## Current Code Behavior
"To Room" button visible for all non-room postpaid orders that have placed items, including takeaway / delivery.

## Expected Behavior
"To Room" button visible only for dine-in / walk-in postpaid orders with placed items. Hidden for takeaway / delivery / prepaid orders.

## Root Cause Hypothesis
**Frontend UI gate — missing condition — high-confidence hypothesis.** Trivial render-condition addition.

## Regression Risk Areas
- Dine-in / walk-in / room-children flows must remain unaffected.
- Prepaid orders already lock most UI; the To Room gate didn't have an explicit prepaid check but the button only shows when `hasPlacedItems` (postpaid path).

## Docs / Code Mismatch
None.

## Open Questions / Missing Information
- Confirm whether walk-in orders ARE room-eligible (current architecture suggests yes — walk-ins behave like dine-in for room transfer).

## User Interaction Required
**Not required.**

## Analysis Verdict
**Frontend UI bug** (missing orderType gate).

## Analysis Outcome
**Analysis Complete.**

## Ready For Next Stage?
**Yes.**

## Next Step
Bug Implementation Planning Agent — change CollectPaymentPanel.jsx:1953 to `!isRoom && hasRooms && hasPlacedItems && (orderType === 'dineIn' || orderType === 'walkIn')`.

---

# BUG-063 Impact Analysis

## Source
- **Intake Bug:** `/app/memory/BUG_TEMPLATE.md` lines 4935-4991
- **Sprint:** POS2.0
- **Evidence Folder:** No separate evidence folder found.
- **Final Docs Folder:** `/app/memory/final`
- **Google Sheet Status Before Analysis:** Not provided.

## User Reported Issue
When printing a room bill, several **required room-related keys are missing**. Associated order details and room linkage fields should be included in the bill print / payload.

## Evidence Reviewed
- Intake entry BUG-063.
- `frontend/src/api/transforms/orderTransform.js` L1586-1696 (`buildBillPrintPayload` room branch).
- `frontend/src/api/transforms/orderTransform.js` L334-368 (`roomInfo` fields available on the transformed order).

## Module Mapping
- **Primary Module:** **14. Printing / Bill / KOT** (room print).
- **Downstream Impacted Modules:** Module 5 (Rooms — source of fields).
- **Module decision reference:** §14 + §5; **OD-02 (room billing/print lifecycle deferred) directly intersects.**

## Affected Route / Page
Embedded in dashboard (room order Print Bill on OrderCard / CollectPaymentPanel / TableCard for room cards).

## Affected Screen / Flow
Cashier prints a room bill — printed receipt is missing room-related context (room number, check-in / check-out date, guest name, GST firm info, etc.).

## Affected Code Areas

| File | Reason |
| --- | --- |
| `frontend/src/api/transforms/orderTransform.js` | `buildBillPrintPayload` return (L1634-1695) emits the following room fields: `roomRemainingPay`, `roomAdvancePay`, `roomGst` (hardcoded 0 per Q-3E), `associated_orders[]`. **Does NOT emit:** `room_no` / `room_number`, `room_id`, `check_in_date`, `check_out_date`, `firm_name`, `firm_gst` (corporate), `guest_name`, `booking_type`, `booking_for`, `total_adult`, `total_children`. `custGSTName: ''` and `custGST: ''` are hardcoded empty strings at L1651-1652. |
| `frontend/src/api/transforms/orderTransform.js` | `roomInfo` (L334-368) DOES carry these fields: `roomPrice`, `advancePayment`, `balancePayment`, `receiveBalance`, `paymentStatus`, `balancePaymentMode`, `roomNo`, `discountAmount`, `discountReason`, `checkInDate`, `checkOutDate`, `bookingType`, `guestName`. **`firm_name` and `firm_gst` are NOT yet mapped from `room_info` even though `roomService.checkIn` sends them.** |

## API Review
- `POST /api/v1/vendoremployee/order-temp-store` — same endpoint. Backend template renders whatever the payload supplies.
- Backend probably has placeholders for `roomNo`, `checkInDate`, `firmName`, `firmGst`, `guestName` in the print template — needs verification.

## Socket / Realtime Review
None.

## State / Data Flow
1. Room check-in stored backend-side with all fields.
2. `get-single-order-new` returns `room_info: {...}`.
3. `orderFromAPI.order` partially parses `room_info` (missing `firm_name`, `firm_gst`, `total_adult`, `total_children`).
4. `buildBillPrintPayload` returns the bill payload — uses `roomInfo` only for the 4 amount fields + associated_orders.
5. Missing keys never reach the print template.

## Relevant Final Documentation
- **OD-02 (room billing/print lifecycle deferred)** — owner-locked deferred decision. This bug **reactivates that decision** and requires owner sign-off before implementation.
- `MODULE_DECISIONS_FINAL.md` §5 future-change rule: "Any room change requires impact review across dashboard, payment, transforms, print, and room check-in payload rules."
- `MODULE_DECISIONS_FINAL.md` §14 future-change rule: "Print changes require review of manual print, auto-print, room print, and fallback payload behavior together."

## Current Code Behavior
- Room bill payload has only food + room-balance + advance + associated_orders.
- Bill template likely renders blank rows for missing context (Room No, Guest, Check-In Date, GSTN).

## Expected Behavior
- Room bill payload should emit (at minimum): `room_no`, `check_in_date`, `check_out_date`, `guest_name`, `booking_type`, `total_adult`, `total_children`, `firm_name`, `firm_gst`. Plus retain existing food + room amounts.

## Root Cause Hypothesis
**Frontend mapping + payload gap — high-confidence hypothesis.** Two-layer gap:
1. `roomInfo` transform missing `firm_name`, `firm_gst`, adult / children counts.
2. `buildBillPrintPayload` not emitting any of the available `roomInfo` fields except the four amounts.

## Regression Risk Areas
- All room bill prints — adding new fields should be **additive** (backend template either renders or ignores) — but verify backend tolerates unknown keys.
- BUG-029 / BUG-273 / BUG-001 (auto-print) — same builder; new fields should not break those flows.
- Test suite `req3-room-bill-print.test.js` — assertions on payload may need updates.

## Docs / Code Mismatch
- OD-02 is the right home for documenting this fix. Implementation must update OD-02 status from "deferred" to "resolved".

## Open Questions / Missing Information
- **Exact list of required keys** — owner intake says "several required room-related keys" but doesn't enumerate them. Possible enumeration above is the agent's best guess. **Owner must supply the list.**
- Backend template field names — backend team confirmation needed (do they expect `room_no` or `roomNumber`? `check_in_date` or `checkInDate`?).
- Whether `firmName` / `firmGst` should populate `custGSTName` / `custGST` (currently empty strings) for Corporate-booked rooms.

## User Interaction Required
**Required.** Owner enumeration of required keys + backend field-name contract.

## Analysis Verdict
**Frontend mapping + payload gap** + **room billing/print policy decision (OD-02)**.

## Analysis Outcome
**Analysis Complete with Clarification Required.**

## Ready For Next Stage?
**No** (owner enumeration of required keys + backend confirmation).

## Next Step
Owner clarification + backend confirmation first. **Strongly recommend combining with BUG-065 (corporate fields)** since they share the same code path.

---

# BUG-064 Impact Analysis

## Source
- **Intake Bug:** `/app/memory/BUG_TEMPLATE.md` lines 4994-5050
- **Sprint:** POS2.0
- **Evidence Folder:** No separate evidence folder found.
- **Final Docs Folder:** `/app/memory/final`
- **Google Sheet Status Before Analysis:** Not provided.

## User Reported Issue
When an order is transferred into a room, the notification / sound says or behaves like a **"New Order"** instead of indicating it was a room transfer.

## Evidence Reviewed
- Intake entry BUG-064.
- `frontend/src/api/socket/socketHandlers.js` L146-206 (`handleNewOrder`).
- `frontend/src/contexts/NotificationContext.jsx` L100-154 (`processNotification` — Firebase sound + banner).
- `frontend/src/api/socket/socketEvents.js` (no `order-shifted-room` socket event constant; transfers come through the generic `new-order` channel on the destination side).
- `frontend/src/utils/toneMapper.js` (confirm-order tone mapping).

## Module Mapping
- **Primary Module:** **8. Notifications & Firebase**.
- **Downstream Impacted Modules:** Module 7 (Realtime Socket — event semantics), Module 5 (Rooms — transfer flow), Module 3 (Dashboard — banner display).
- **Module decision reference:** §8 future-change rule "Preserve foreground/background distinction; treat Firebase as the canonical notifications platform."

## Affected Route / Page
Dashboard (notification banner + sidebar).

## Affected Screen / Flow
Cashier on dashboard sees a "new order" banner with the New Order sound when in fact an existing order was just moved into a room by another operator.

## Affected Code Areas

| File | Reason |
| --- | --- |
| `frontend/src/api/socket/socketHandlers.js` | `handleNewOrder` (L146) treats all `new-order` events identically. Room-transfer destination orders arrive on this channel because backend likely emits the room order as a "new" order on the destination room. |
| `frontend/src/contexts/NotificationContext.jsx` | Reads `data.sound` / `data.notification_type` from FCM payload. If backend's FCM payload for the transferred order also uses `new_order` type/sound, the frontend has no way to differentiate. |
| `frontend/src/utils/toneMapper.js` | Has confirm-order-tone override but no room-transfer-specific entry. |

## API Review
- FCM payload structure is backend-controlled. Whether the backend distinguishes "room transfer" notification vs "new order" notification is unknown.

## Socket / Realtime Review
- The current event inventory has `NEW_ORDER`, `UPDATE_ORDER`, `UPDATE_ORDER_TARGET` (Switch Table — different from room transfer), `UPDATE_ORDER_SOURCE`, `UPDATE_ORDER_PAID`, `SPLIT_ORDER`. No dedicated `room-transfer` event.

## State / Data Flow
1. Operator A transfers order to room → backend writes room order + likely fires FCM "new order" notification to all logged-in clients + emits `new-order` socket event.
2. Operator B's frontend receives FCM → `processNotification` → plays "new order" sound + shows "New Order" banner.
3. Operator B's frontend receives `new-order` socket event → adds room order to OrderContext.

## Relevant Final Documentation
- `MODULE_DECISIONS_FINAL.md` §8 "future change rule: treat Firebase as the canonical notifications platform and prioritize correction of discrepancies."
- `MODULE_DECISIONS_FINAL.md` §7 future change rule: "Socket changes require channel / event inventory and downstream state review."

## Current Code Behavior
- No differentiation between new order vs. room transfer destination order on either the FCM or socket path.

## Expected Behavior
- A room-transfer destination order should produce a distinct notification message ("Order transferred to Room X") and possibly a distinct sound (or no sound).

## Root Cause Hypothesis
**Backend event/FCM payload differentiation gap — likely** + **frontend missing differentiation logic — likely**. Combined hypothesis: backend must emit a `notification_type` or similar marker; frontend must map it to a different message string and (optionally) tone.

## Regression Risk Areas
- Confirm-order tone overrides (CR SNOOZE_SOUND_STOP_AND_DURATION, POS2-007/008 confirm-order tone) — must not collide.
- Switch-table notifications (`update-order-target`) — already separate.

## Docs / Code Mismatch
None at policy level; this is a feature add.

## Open Questions / Missing Information
- Does the backend FCM payload include `notification_type` for room-transfer events?
- Owner's intended message string and sound choice for room-transfer notifications.
- Should the sound be silent for transfers (since the order existed already)?

## User Interaction Required
**Required.** Backend confirmation + owner message / sound choice.

## Analysis Verdict
**Notification / FCM contract gap** + **frontend mapping gap**.

## Analysis Outcome
**Analysis Complete with Clarification Required.**

## Ready For Next Stage?
**No** (backend FCM payload + owner UX choice).

## Next Step
Backend confirmation first; owner UX clarification.

---

# BUG-065 Impact Analysis

## Source
- **Intake Bug:** `/app/memory/BUG_TEMPLATE.md` lines 5054-5112
- **Sprint:** POS2.0
- **Evidence Folder:** No separate evidence folder found.
- **Final Docs Folder:** `/app/memory/final`
- **Google Sheet Status Before Analysis:** Not provided.

## User Reported Issue
During room check-in, the **Corporate tab** should capture **GST number and corporate client name**. These details should be **passed forward to the bill and BOS / backend / order system**. Currently this is not working.

## Evidence Reviewed
- Intake entry BUG-065.
- `frontend/src/components/modals/RoomCheckInModal.jsx`:
  - L33-36 — `BOOKING_FOR = [Individual, Corporate]`.
  - L295-296 — `firmName`, `firmGst` state.
  - L331 — `gstBlockVisible = flags.showUserGst && bookingFor === 'Corporate'`.
  - L488-491 — required validation when corporate + showUserGst flag.
  - L546-547 — payload includes `firmName`, `firmGst`.
- `frontend/src/api/services/roomService.js` L114-115 — sends `firm_name`, `firm_gst` to backend.
- `frontend/src/api/transforms/orderTransform.js` L334-368 — `roomInfo` transform — **does NOT parse `firm_name` / `firm_gst` from `room_info`**.
- `buildBillPrintPayload` L1651-1652 — `custGSTName: ''`, `custGST: ''` hardcoded empty.

## Module Mapping
- **Primary Module:** **5. Rooms** (capture + payload pass-through).
- **Downstream Impacted Modules:** Module 14 (Printing — bill rendering of GSTN), Module 10 (Reports — audit / rooms report display).
- **Module decision reference:** §5; **OD-02 (room billing/print lifecycle) directly intersects.**

## Affected Route / Page
Embedded in dashboard.

## Affected Screen / Flow
Operator opens room check-in modal → switches Booking For to "Corporate" → GST block becomes visible (when `flags.showUserGst`) → operator enters firm name + GSTIN → submits. Backend persists. Bill print and audit display should show these. Currently nothing downstream consumes them.

## Affected Code Areas

| File | Reason |
| --- | --- |
| `frontend/src/components/modals/RoomCheckInModal.jsx` | Capture: works (validated GSTIN regex L40, required when corporate + flag). |
| `frontend/src/api/services/roomService.js` | Sends to backend correctly. |
| `frontend/src/api/transforms/orderTransform.js` | **Gap 1:** `roomInfo` parser does not extract `firm_name` / `firm_gst` from `api.room_info`. **Gap 2:** `buildBillPrintPayload` does not emit them in the print payload. **Gap 3:** `custGSTName` / `custGST` (which are the bill-template GSTN slots) are hardcoded to empty strings rather than reading from `roomInfo`. |
| `frontend/src/components/reports/RoomRowCard.jsx` | (Not inspected for firm fields; need verification) — may or may not display them. |
| Audit Report consumers | Do not display firm GST today (BUG-061 sibling issue). |

## API Review
- Backend's `room-check-in` accepts `firm_name`, `firm_gst` already.
- Backend's `get-single-order-new` likely returns them under `room_info` — needs verification (grep confirms frontend transform does not parse them currently).
- `order-temp-store` payload would need them added.

## Socket / Realtime Review
None.

## State / Data Flow
1. Check-in modal captures `firmName`, `firmGst`.
2. roomService sends to backend.
3. Backend stores; assumed to echo on subsequent `room_info` fetches.
4. **Stops here** on the frontend — neither `orderFromAPI.order` nor `buildBillPrintPayload` consumes them.

## Relevant Final Documentation
- **OD-02 (deferred)** — strongly intersects.
- `MODULE_DECISIONS_FINAL.md` §5 + §14.

## Current Code Behavior
- Capture works.
- Persistence works (backend-side; not verifiable from frontend).
- Display / print does NOT work.

## Expected Behavior
- Bill print payload should include `firmName` / `firmGst` (mapped to backend template's `custGSTName` / `custGST` keys OR to dedicated room corporate GST fields).
- Audit / rooms report should display them.

## Root Cause Hypothesis
**Frontend mapping + payload gap — high-confidence hypothesis.** Same fix family as BUG-063.

## Regression Risk Areas
- Non-corporate room bills should remain empty for these fields.
- Existing corporate-booked rooms should not retroactively change other fields.
- BUG-063 fix should land together to avoid two passes through room print.

## Docs / Code Mismatch
- OD-02 deferred decision intersects.

## Open Questions / Missing Information
- Backend response field names for `firm_name` / `firm_gst` under `room_info`.
- Whether they should also populate `custGSTName` / `custGST` (bill template's customer GST slots) OR new dedicated `firmName` / `firmGst` slots.

## User Interaction Required
**Required.** Owner + backend confirmation of field names.

## Analysis Verdict
**Frontend mapping + payload gap.**

## Analysis Outcome
**Analysis Complete with Clarification Required.**

## Ready For Next Stage?
**No** (backend field-name + owner mapping intent).

## Next Step
Owner clarification + backend confirmation. **Combine with BUG-063 in single implementation plan.**

---

# BUG-066 Impact Analysis

## Source
- **Intake Bug:** `/app/memory/BUG_TEMPLATE.md` lines 5116-5172
- **Sprint:** POS2.0
- **Evidence Folder:** No separate evidence folder found.
- **Final Docs Folder:** `/app/memory/final`
- **Google Sheet Status Before Analysis:** Not provided.

## User Reported Issue
When transferring **table items**, the item / order should **not be transferable to a room**. Currently this may not be blocked. (Related to but distinct from BUG-062 which is about order-level transfer.)

## Evidence Reviewed
- Intake entry BUG-066.
- `frontend/src/components/order-entry/TransferFoodModal.jsx` L13-22 — already filters `(o.orderType === 'dineIn' || o.isWalkIn) && paymentType !== 'prepaid'`.
- `frontend/src/components/order-entry/ShiftTableModal.jsx` L26-28 — already excludes rooms (`!t.isRoom`).
- `frontend/src/components/order-entry/MergeTableModal.jsx` — would need to check; not inspected.

## Module Mapping
- **Primary Module:** **5. Rooms / Room Check-In / Room Transfer**.
- **Downstream Impacted Modules:** Module 4 (Order Entry — modal logic).
- **Module decision reference:** §5 + §4.

## Affected Route / Page
Embedded in dashboard.

## Affected Screen / Flow
Cashier opens an order → clicks transfer on an item → TransferFoodModal opens → picks destination order. Should not list rooms as destinations.

## Affected Code Areas

| File | Reason |
| --- | --- |
| `frontend/src/components/order-entry/TransferFoodModal.jsx` | L16-22 — `occupiedOrders` filter already excludes rooms by requiring `orderType === 'dineIn' || isWalkIn`. **Rooms are already excluded.** |
| `frontend/src/components/order-entry/ShiftTableModal.jsx` | L26-28 — explicit `!t.isRoom` exclusion. **Already correct.** |
| `frontend/src/components/order-entry/MergeTableModal.jsx` | Not inspected in detail — should be reviewed for the same room exclusion. |

## API Review
None.

## Socket / Realtime Review
None.

## State / Data Flow
Modal renders a filtered list of destination orders / tables → cashier picks → API call.

## Relevant Final Documentation
- `MODULE_DECISIONS_FINAL.md` §5.

## Current Code Behavior
**Mismatch with owner intake.** Both TransferFoodModal and ShiftTableModal already exclude rooms. Owner's complaint may be referring to:
1. **The To-Room payment-method button** (covered by BUG-062), OR
2. **MergeTableModal** which has not been verified, OR
3. **A different surface entirely** (e.g., a context menu in OrderCard).

## Expected Behavior
None of the table-item transfer surfaces should allow room as destination.

## Root Cause Hypothesis
**Likely already resolved for the surfaces inspected**; possible **MergeTableModal gap** — to verify.

## Regression Risk Areas
- If MergeTableModal does allow room destinations, restricting it should be additive.

## Docs / Code Mismatch
- Owner intake contradicts current code for TransferFoodModal and ShiftTableModal. Owner may be looking at a different modal or a stale build.

## Open Questions / Missing Information
- Which exact modal / surface is the owner referring to?
- Screenshot or repro of the surface where room appears as a transferable destination.
- MergeTableModal room behavior — to be inspected.

## User Interaction Required
**Required.** Owner must confirm surface.

## Analysis Verdict
**Likely already resolved** for inspected surfaces; **MergeTableModal verification pending**.

## Analysis Outcome
**Analysis Complete with Clarification Required.**

## Ready For Next Stage?
**No** (owner repro / surface confirmation needed; MergeTableModal verification needed).

## Next Step
Owner clarification first; secondary: verify MergeTableModal exclusion before declaring duplicate of BUG-062.

---

# BUG-067 Impact Analysis

## Source
- **Intake Bug:** `/app/memory/BUG_TEMPLATE.md` lines 5176-5233
- **Sprint:** POS2.0
- **Evidence Folder:** No separate evidence folder found.
- **Final Docs Folder:** `/app/memory/final`
- **Google Sheet Status Before Analysis:** Not provided.

## User Reported Issue
The KDS station view toggle in admin configuration should be applicable only when the restaurant's default / ready configuration is **completed**. If configuration is not ready and someone turns it on, it should auto-toggle off.

## Evidence Reviewed
- Intake entry BUG-067.
- `frontend/src/pages/StatusConfigPage.jsx` L126-135, L338-345, L432-457 (toggle + save logic).
- `frontend/src/contexts/StationContext.jsx` (`availableStations`, `setStationViewEnabled`).

## Module Mapping
- **Primary Module:** **11. Visibility Settings / Device Configuration**.
- **Downstream Impacted Modules:** Module 9 (Station / Kitchen Panel), Module 3 (Dashboard — station panel rendering).
- **Module decision reference:** §11 future-change rule: "Any persistence-scope change requires migration planning from current device-local Phase 1 behavior."

## Affected Route / Page
`/visibility/status-config`.

## Affected Screen / Flow
Admin user opens Status Config → toggles "Station View" → expects it to depend on whether the restaurant has stations configured.

## Affected Code Areas

| File | Reason |
| --- | --- |
| `frontend/src/pages/StatusConfigPage.jsx` | L339-345 — `toggleStationViewEnabled` just flips boolean. L432-457 — save writes to localStorage + `setStationViewEnabled`. **No precondition check on `availableStations.length > 0`.** |

## API Review
- No API call; localStorage-only.

## Socket / Realtime Review
None.

## State / Data Flow
1. Toggle UI → state change in `stationViewConfig.enabled`.
2. Save → localStorage `mygenie_station_view_config` + StationContext.
3. Dashboard reads StationContext.stationViewEnabled → renders station panel.

## Relevant Final Documentation
- `MODULE_DECISIONS_FINAL.md` §11 — "current local/device-level behavior is temporary Phase 1 behavior; later role-based/admin control work is separate future-phase scope."
- §9 future-change rule: "If the station system is not performing as expected, failure should be explicit."

## Current Code Behavior
- Toggle can be turned on regardless of whether `availableStations` is empty.
- If on with zero stations → dashboard renders empty station panel → confused operator state (per §9 "empty panel confusion" known issue).

## Expected Behavior
- If `availableStations.length === 0` (or "restaurant ready configuration not completed"), the toggle should be disabled OR auto-toggle off when turned on.

## Root Cause Hypothesis
**Frontend configuration / validation gap — high-confidence hypothesis.** Add precondition guard to `toggleStationViewEnabled` and / or to the save handler.

## Regression Risk Areas
- Restaurants with configured stations must continue to function normally.
- LocalStorage key compatibility — adding the guard should not change the persisted shape.

## Docs / Code Mismatch
- Owner's "restaurant ready configuration" phrasing is ambiguous. Most likely interpretation: stations are configured (`availableStations.length > 0`). Confirm with owner.

## Open Questions / Missing Information
- Definition of "restaurant ready configuration completed" — is it (a) stations configured, (b) something on the restaurant profile, or (c) a separate readiness flag?
- Should the toggle be visually disabled, or allow click + auto-revert with a toast?

## User Interaction Required
**Required.** Owner definition of readiness condition + UX intent (disabled vs. auto-revert).

## Analysis Verdict
**Configuration / validation gap.**

## Analysis Outcome
**Analysis Complete with Clarification Required.**

## Ready For Next Stage?
**No** (owner definition needed).

## Next Step
Owner clarification first.

---

# BUG-068 Impact Analysis

## Source
- **Intake Bug:** `/app/memory/BUG_TEMPLATE.md` lines 5236-5293
- **Sprint:** POS2.0
- **Evidence Folder:** No separate evidence folder found.
- **Final Docs Folder:** `/app/memory/final`
- **Google Sheet Status Before Analysis:** Not provided.

## User Reported Issue
If socket is disconnected and a Scan & Order arrives during disconnection, then after reconnect the **pending / yet-to-confirm popup does not appear**. Reconnect logic should detect pending orders and show the popup.

## Evidence Reviewed
- Intake entry BUG-068.
- `frontend/src/api/socket/socketService.js` L222-279 (`_setupConnectionHandlers`).
- `frontend/src/api/socket/socketHandlers.js` L466-518 (`handleScanNewOrder`).
- `frontend/src/components/dashboard/ScanOrderPopOut.jsx` L52-54 (predicate).
- `frontend/src/api/services/orderService.js` (search for any "fetchPendingOrders" / "rehydrate" helper — none found beyond the bootstrap `getRunningOrders`).

## Module Mapping
- **Primary Module:** **7. Realtime Socket**.
- **Downstream Impacted Modules:** Module 13 (Tables & Orders Runtime State — order context), Module 8 (Notifications), Module 3 (Dashboard — popup visibility).
- **Module decision reference:** §7 future-change rule: "Socket changes require channel / event inventory and downstream state review."

## Affected Route / Page
Dashboard (any logged-in screen with sockets active).

## Affected Screen / Flow
1. POS dashboard open, socket connected.
2. Network blips / WiFi drop → socket disconnects → `socketService._setStatus(RECONNECTING)`.
3. During disconnect, customer scans QR and places order → backend creates YTC order + fires FCM + emits socket event.
4. Frontend missed the socket event (was disconnected).
5. Socket reconnects → `socketService` fires CONNECT → handler sets status → **nothing else happens**.
6. OrderContext does not have the new order → ScanOrderPopOut doesn't see it → popup doesn't appear.

## Affected Code Areas

| File | Reason |
| --- | --- |
| `frontend/src/api/socket/socketService.js` | L262-267 — `RECONNECT` handler just updates status + clears attempts. No refetch trigger. |
| `frontend/src/api/socket/useSocketEvents.js` | Subscribes to event handlers but has no `onReconnect` rehydration hook. |
| `frontend/src/api/services/orderService.js` | `getRunningOrders` exists (used by bootstrap on `/loading`). Could be re-invoked on reconnect to fetch missed YTC orders. |
| `frontend/src/contexts/OrderContext.jsx` | `addOrder` / `setOrders` exposed — could be called with refetch result on reconnect. |

## API Review
- `GET /api/v1/vendoremployee/running-order-list` (or similar) — same endpoint used at bootstrap.
- Could be reused on reconnect.

## Socket / Realtime Review
- Socket.IO library is configured with `reconnection: true`, up to 10 attempts. Connection events: CONNECT, DISCONNECT, RECONNECT, RECONNECT_ATTEMPT, RECONNECT_ERROR, RECONNECT_FAILED.
- Event-replay-on-reconnect is **not implemented** on the frontend. Socket.IO does not replay missed events by default.

## State / Data Flow
- Missed `scan-new-order` events during disconnect → permanently lost on the frontend.
- Manual page refresh re-runs bootstrap → `getRunningOrders` re-pulls all current orders → YTC popup appears.

## Relevant Final Documentation
- `MODULE_DECISIONS_FINAL.md` §7 "subscription timing" "table-order sync conflicts" as known impact areas.
- `ARCHITECTURE_DECISIONS_FINAL.md` — Firebase canonical for notifications.

## Current Code Behavior
- Reconnect does NOT refetch.
- Missed orders surface only on full page refresh.

## Expected Behavior
- On socket reconnect, frontend should re-fetch the running order list and update OrderContext so the YTC popup re-evaluates.

## Root Cause Hypothesis
**Frontend reconnect handler gap — high-confidence hypothesis.** Need to wire a `socketService.onStatusChange` listener that triggers `getRunningOrders` + diff-merge into OrderContext when status transitions from RECONNECTING to CONNECTED.

## Regression Risk Areas
- Diff-merge logic must not duplicate orders (existing `addOrder` may need `replaceIfExists` semantics).
- Engage locks (TableContext) — should not be re-set after a reconnect-driven refetch since the backend's `engage` markers may be stale.
- Performance: refetch on every flaky reconnect could be heavy; debounce / minimum-disconnect-duration threshold may be needed.

## Docs / Code Mismatch
None at policy level.

## Open Questions / Missing Information
- Backend endpoint to use — `running-order-list` returns ALL running including YTC? (Bootstrap uses it; confirm coverage).
- Whether the rehydration should be incremental (only since-last-connect timestamp) or full refresh.
- Whether to also trigger a similar refresh on tab visibility change (page returning from background).

## User Interaction Required
**Not required** for the hypothesis; the design choice (incremental vs. full refresh) is implementation detail.

## Analysis Verdict
**Socket / state-sync bug** (missing reconnect rehydration).

## Analysis Outcome
**Analysis Complete.**

## Ready For Next Stage?
**Yes.**

## Next Step
Bug Implementation Planning Agent — design reconnect rehydration in `socketService` + `useSocketEvents`.

---

# BUG-069 Impact Analysis

## Source
- **Intake Bug:** `/app/memory/BUG_TEMPLATE.md` lines 5297-5353
- **Sprint:** POS2.0
- **Evidence Folder:** No separate evidence folder found.
- **Final Docs Folder:** `/app/memory/final`
- **Google Sheet Status Before Analysis:** Not provided.

## User Reported Issue
Order / update data comes through socket; sound comes through Firebase. Currently the **sound plays before the order / update appears** on the dashboard. Order should appear first, then sound should play.

## Evidence Reviewed
- Intake entry BUG-069.
- `frontend/src/contexts/NotificationContext.jsx` L100-154 (FCM → `processNotification` → `soundManager.play`).
- `frontend/src/api/socket/socketHandlers.js` L146-206 (`handleNewOrder`).
- `frontend/src/config/firebase.js` L108-110 (`onForegroundMessage`).

## Module Mapping
- **Primary Module:** **8. Notifications & Firebase**.
- **Downstream Impacted Modules:** Module 7 (Socket — the data path), Module 3 (Dashboard — render timing).
- **Module decision reference:** §8 + §7.

## Affected Route / Page
Dashboard.

## Affected Screen / Flow
Customer scans QR → backend writes order → fires:
1. **FCM push** with sound/title/body (delivered fast — Google's push infra).
2. **Socket emit** `new-order` with order payload (delivered via WebSocket; subject to local socket health).

The two arrive on independent code paths with no coordination. Empirical timing: FCM typically arrives slightly faster than the socket event on the same client.

## Affected Code Areas

| File | Reason |
| --- | --- |
| `frontend/src/contexts/NotificationContext.jsx` | L134 — `soundManager.play(resolvedSound)` fired immediately on FCM arrival. |
| `frontend/src/api/socket/socketHandlers.js` | `handleNewOrder` (L146) adds the order to context. No coordination with FCM path. |
| `frontend/src/config/firebase.js` | onForegroundMessage simply delivers payload to the callback. |

## API Review
- Both FCM payload + socket event are backend-driven. Sequencing is determined by network paths, not by backend ordering.

## Socket / Realtime Review
- Already covered above.

## State / Data Flow
- Race condition: FCM beats socket → sound before render.

## Relevant Final Documentation
- `MODULE_DECISIONS_FINAL.md` §8 "treat Firebase as the canonical notifications platform and prioritize correction of discrepancies."
- §8 known impact area: "sound toggle behavior".

## Current Code Behavior
- Sound plays at FCM arrival time, independent of socket arrival.

## Expected Behavior
- Visual order render → THEN sound plays.

## Root Cause Hypothesis
**Architectural race — high-confidence hypothesis.** Two possible fix patterns:
1. **Coordinated:** FCM sets a "pending notification" entry keyed by `order_id`; sound delays until matching `new-order` socket event arrives (with a max wait timeout).
2. **Socket-driven sound:** Move sound trigger from FCM `processNotification` to the socket `handleNewOrder` handler (sound plays after `addOrder` succeeds). FCM then only handles background / out-of-app banners.

Option 2 is simpler but changes the "Firebase as canonical sound platform" rule (`MODULE_DECISIONS_FINAL.md` §8). Option 1 preserves the rule but is more complex.

## Regression Risk Areas
- Background notifications (when app is closed) — must continue to play sound via service worker. Option 2 risks this; Option 1 preserves it.
- Snooze / silent / per-tone overrides — must be re-routed if sound source moves.
- BUG-034 (inconsistent notification tone — closed) and CR SNOOZE_SOUND_STOP_AND_DURATION — depend on the FCM path.

## Docs / Code Mismatch
- Module §8 rule about Firebase canonical platform must be revisited if Option 2 is chosen.

## Open Questions / Missing Information
- Owner preference between Option 1 (queued / coordinated) and Option 2 (socket-driven sound).
- Acceptable max wait (e.g., 1.5 sec) before falling back to "play sound anyway".
- Per-event-type policy: should the rule apply to all order events or only to new-orders?

## User Interaction Required
**Required.** Owner architecture-level decision needed.

## Analysis Verdict
**Architectural / coordination issue.**

## Analysis Outcome
**Analysis Complete with Clarification Required.**

## Ready For Next Stage?
**No** (owner architecture choice needed).

## Next Step
Owner clarification first — choose Option 1 / Option 2 / hybrid.

---

# BUG-070 Impact Analysis

## Source
- **Intake Bug:** `/app/memory/BUG_TEMPLATE.md` lines 5356-5415
- **Sprint:** POS2.0
- **Evidence Folder:** No separate evidence folder found.
- **Final Docs Folder:** `/app/memory/final`
- **Google Sheet Status Before Analysis:** Not provided.

## User Reported Issue
Area-wise segregation is not happening properly in **Table View** and **Channel View**. The view should group by area first, then show the next area, then the next area. Apply to both rooms and tables. Order View can remain as-is.

## Evidence Reviewed
- Intake entry BUG-070.
- `frontend/src/pages/DashboardPage.jsx`:
  - L520-625 — tables grouping by `sectionName` (works for non-room tables).
  - L635-670 — `allRoomsList` flat-mapped without section grouping.
  - L672-820 — `channelData` (Channel Layout) — items are FLAT arrays per channel; no area grouping.

## Module Mapping
- **Primary Module:** **3. Dashboard / POS Workspace**.
- **Downstream Impacted Modules:** Module 13 (Tables runtime state).
- **Module decision reference:** §3 known impact area "channel/status rendering".

## Affected Route / Page
`/dashboard` Table View and Channel View.

## Affected Screen / Flow
Cashier on dashboard switches between Table View and Channel View. Tables ARE area-grouped (when sections exist). Rooms are NOT area-grouped. Channel View shows flat lists per channel.

## Affected Code Areas

| File | Reason |
| --- | --- |
| `frontend/src/pages/DashboardPage.jsx` | `tables` useMemo (L520) correctly groups non-room tables by `sectionName`. `allRoomsList` (L635) does NOT use `sectionName` — flat. `channelData.dineIn.items` (L778-797) is a flat concatenation; no area sub-grouping. `channelData.room.items` (L811-816) likewise flat. |
| `frontend/src/components/dashboard/ChannelColumnsLayout.jsx` | Renders each channel's items as a flat list; would need a sectioned-render mode. |
| `frontend/src/components/dashboard/ChannelColumn.jsx` | Same — flat. |

## API Review
- Tables endpoint returns `section_name`; rooms also have section assignments (verify in `tableTransform`).

## Socket / Realtime Review
None.

## State / Data Flow
- Tables → grouped by section in dashboard `tables` memo.
- Rooms → flat list.
- Channel View → flat lists per channel.

## Relevant Final Documentation
- `MODULE_DECISIONS_FINAL.md` §3 future-change rule mentions filter / view-mode considerations.

## Current Code Behavior
- Table View: tables grouped (when sections exist). Rooms flat (no sections).
- Channel View: dineIn / takeaway / delivery / room columns each contain flat lists.

## Expected Behavior
- Table View: rooms also grouped by area.
- Channel View: each channel's items grouped by area where applicable (dineIn, room).

## Root Cause Hypothesis
**Frontend rendering / data-shape gap — high-confidence hypothesis.** Two-layer change:
1. `allRoomsList` memo to add section grouping.
2. `channelData` to expose `sections` per channel (where applicable) and `ChannelColumn` to render section headers.

## Regression Risk Areas
- Performance: grouping adds compute on every render — memoize correctly.
- Empty-section behavior: should empty sections be hidden or shown collapsed?
- Mixed tables (some with section, some without) — current code falls back to `'Default'` section; consistency check needed.

## Docs / Code Mismatch
None.

## Open Questions / Missing Information
- Whether Channel View room column should also segregate by area (rooms typically have less natural area segmentation).
- Sort order of sections (alphabetical, by section ID, configurable?).
- Should the section header be sticky on scroll?

## User Interaction Required
**Recommended** for UX details but **not required** for the structural fix.

## Analysis Verdict
**Frontend rendering bug** (missing area grouping for rooms + channel view).

## Analysis Outcome
**Analysis Complete.**

## Ready For Next Stage?
**Yes.**

## Next Step
Bug Implementation Planning Agent — add section grouping to `allRoomsList` and `channelData`. Confirm UX details with owner during planning.

---

# BUG-071 Impact Analysis

## Source
- **Intake Bug:** `/app/memory/BUG_TEMPLATE.md` lines 5419-5479
- **Sprint:** POS2.0
- **Evidence Folder:** No separate evidence folder found.
- **Final Docs Folder:** `/app/memory/final`
- **Google Sheet Status Before Analysis:** Not provided.

## User Reported Issue
In many places, including the order card, the system shows the **database order ID**. The UI should show the **user-facing order ID** (short 3-4 digit) instead. Need an audit across the entire UI, bill print, and all places where order ID is displayed.

## Evidence Reviewed
- Intake entry BUG-071 + reference to BUG-032 (closed pos_final_1.0 smoke pass 2026-05-12).
- `frontend/src/components/cards/OrderCard.jsx` L74 (`orderId = order.orderId || order.id`), L138 (toast), L313-319 (chip displaying `#{orderId}`).
- `frontend/src/components/order-entry/OrderEntry.jsx` L1113-1121 (order id chip displaying `#{effectiveTable?.orderId || placedOrderId}`).
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` L792 (`#${orderNumber}` — correct, uses orderNumber). 
- `frontend/src/api/transforms/orderTransform.js` L183-184: `orderId: api.id`, `orderNumber: api.restaurant_order_id`.
- `frontend/src/memory/bugs/BUG_032_SMOKE_SIGNOFF.md` — BUG-032 fix was applied only to OrderEntry / CollectPaymentPanel header.

## Module Mapping
- **Primary Module:** **3. Dashboard / POS Workspace** (cards).
- **Downstream Impacted Modules:** Module 4 (OrderEntry header), Module 14 (Print — verify `restaurant_order_id` in print payload — already uses `order.orderNumber` per L1636), Module 10 (Reports — verify if Audit shows orderId vs orderNumber).
- **Module decision reference:** §3 + §4 + §14.

## Affected Route / Page
Multiple — dashboard cards, OrderEntry header, possibly Audit Report, print, toast messages.

## Affected Screen / Flow
Cashier sees `#886xxx` (database ID) instead of `#1234` (user-facing ID) in multiple places.

## Affected Code Areas

| File | Reason |
| --- | --- |
| `frontend/src/components/cards/OrderCard.jsx` | L318 chip displays `#{orderId}`. L138 toast displays `Order #${orderId}`. **Bug present.** |
| `frontend/src/components/order-entry/OrderEntry.jsx` | L1119 chip displays `#{effectiveTable?.orderId || placedOrderId}` — uses database ID. **Bug present** despite BUG-032 closure (closure was for an earlier header, not this chip). |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | L792 uses `orderNumber` — **correct**. |
| `frontend/src/components/cards/TableCard.jsx` | Should be reviewed (not inspected in depth). |
| `frontend/src/components/reports/OrderTable.jsx` | Should be reviewed (Audit Report row IDs). |
| `frontend/src/components/reports/OrderDetailSheet.jsx` | Should be reviewed. |
| `frontend/src/api/transforms/orderTransform.js` | `buildBillPrintPayload` L1635-1636 emits both `order_id` (DB) and `restaurant_order_id` (user-facing) — backend template chooses. Correct. |
| All toasts referencing `Order #${orderId}` | Many call-sites; should be audited (handlePrintKot, handlePrintBill, handleSettlePrepaid, handleCancelOrder, etc.). |

## API Review
- Payloads must keep `order_id` (DB ID) for backend correctness — do NOT change payloads.
- Display strings should switch to `restaurant_order_id` (orderNumber) where currently using `orderId`.

## Socket / Realtime Review
None.

## State / Data Flow
- `OrderContext.orders[i].orderId` = DB ID.
- `OrderContext.orders[i].orderNumber` = user-facing ID (string).
- All display surfaces should read `orderNumber` for human visibility; `orderId` for API calls / data-testid keys.

## Relevant Final Documentation
- BUG-032 closure documents the right pattern — but coverage was incomplete.
- `MODULE_DECISIONS_FINAL.md` §3 / §4 / §14.

## Current Code Behavior
- Three known instances of database ID display remain (OrderCard chip, OrderCard toast, OrderEntry chip). Likely more elsewhere.

## Expected Behavior
- All human-visible order IDs use `orderNumber` (user-facing). Backend identifiers (`orderId`) used only for data-testids, payloads, and internal logic.

## Root Cause Hypothesis
**Frontend display gap — high-confidence hypothesis** + **incomplete BUG-032 closure coverage**.

## Regression Risk Areas
- data-testid keys based on `orderId` should NOT be changed (would break tests).
- Payload `order_id` fields should NOT be changed.
- Edge case: brand-new orders (pre-engage) may not have `orderNumber` yet — current code uses `orderId` as fallback in some places. Fallback policy must be defined (hide chip vs. show placeholder vs. show DB ID).

## Docs / Code Mismatch
- BUG-032 SMOKE_SIGNOFF claims item 4 "Print bill payload — backend `order_id` still used for the underlying call, but display always shows restaurant order number — PASS, Payload integrity preserved". The OrderEntry chip is not part of that smoke set.

## Open Questions / Missing Information
- Full audit list of every place `orderId` is rendered for display (vs. used as identifier). The owner asked for "a check the entire UI, bill print, and all places".
- Fallback behavior when `orderNumber` is empty / not yet assigned.

## User Interaction Required
**Not required** for the fix scope itself; but recommend an owner-approved audit scope before mass-replacement to avoid regressing test selectors.

## Analysis Verdict
**Frontend display bug** (multi-surface coverage gap, partial duplicate of BUG-032 closure).

## Analysis Outcome
**Analysis Complete.**

## Ready For Next Stage?
**Yes** with caution — recommend a comprehensive grep-based audit before implementation begins.

## Next Step
Bug Implementation Planning Agent — produce an audit list, then a coordinated rewrite that touches each surface while preserving payload + data-testid identifiers.

---

# BUG-072 Impact Analysis

## Source
- **Intake Bug:** `/app/memory/BUG_TEMPLATE.md` lines 5482-5540
- **Sprint:** POS2.0
- **Evidence Folder:** No separate evidence folder found.
- **Final Docs Folder:** `/app/memory/final`
- **Google Sheet Status Before Analysis:** Not provided.

## User Reported Issue
In Order View, the order card is not showing **room notes**. **Room notes, table notes, and item notes** should appear on the order card (similar to table notes).

## Evidence Reviewed
- Intake entry BUG-072.
- `frontend/src/components/cards/OrderCard.jsx`:
  - L426-437 — renders `order.orderNote` if truthy.
  - L490, 525-533 — renders `item.notes` per item.
- `frontend/src/api/transforms/orderTransform.js`:
  - L272 — `orderNote: api.order_note || ''`.
  - L130 — `notes: detail.food_level_notes || ''` (per item).
  - No separate `tableNote` or `roomNote` field exists.
- Grep across whole repo for `tableNote|table_note|roomNote|room_note` — **zero matches**.

## Module Mapping
- **Primary Module:** **3. Dashboard / POS Workspace** (card render).
- **Downstream Impacted Modules:** Module 4 (Order Entry — notes capture), Module 5 (Rooms — if room notes are separate from order notes).
- **Module decision reference:** §3.

## Affected Route / Page
Dashboard order cards (and possibly TableCard).

## Affected Screen / Flow
Cashier / kitchen sees order card; room-specific notes (e.g., "Bring extra water"), table-specific notes ("Birthday"), and item-specific notes are expected on the card. Currently only `orderNote` (single field) and `item.notes` (per item) render.

## Affected Code Areas

| File | Reason |
| --- | --- |
| `frontend/src/components/cards/OrderCard.jsx` | Only renders `order.orderNote` and `item.notes`. No table/room note. |
| `frontend/src/api/transforms/orderTransform.js` | Backend API contract apparently uses `order_note` (top-level) + `food_level_notes` (per-detail). No `table_note` or `room_note` distinct field is parsed. |
| `frontend/src/components/order-entry/OrderNotesModal.jsx` / `ItemNotesModal.jsx` | Capture screens — not inspected in detail; likely only write to `order_note` and `food_level_notes`. |

## API Review
- Backend may or may not have separate fields for `table_note` / `room_note`. **Unknown.** If they don't exist on backend, this becomes a feature add at backend + frontend.

## Socket / Realtime Review
None.

## State / Data Flow
- All notes today funnel through `order_note` (order-level free-text) and `food_level_notes` (per-item).

## Relevant Final Documentation
- `MODULE_DECISIONS_FINAL.md` §3 — does not specifically mention notes structure.

## Current Code Behavior
- One order note field + per-item notes. No table-specific or room-specific notes separate from order_note.

## Expected Behavior
- Three categories displayed: room note, table note, item note (where applicable).

## Root Cause Hypothesis
**Combined frontend + backend gap — medium-confidence hypothesis.** If backend doesn't already separate the three, this is a new feature, not a bug. The owner intake hints "verify whether table notes are coming correctly" — which suggests possibly backend DOES emit table notes today but frontend isn't displaying.

## Regression Risk Areas
- Note overflow on small cards.
- Order entry capture screens — need to be updated to capture all three.

## Docs / Code Mismatch
None at architecture level.

## Open Questions / Missing Information
- **Critical:** Does the backend already emit `table_note` and `room_note` separately, or is `order_note` the single source today?
- Owner intent: are these three distinct fields, or is "room note" actually the room check-in note (already captured as `orderNote` in check-in)?
- If they're distinct, what's the UX for capture screens?

## User Interaction Required
**Required.** Backend confirmation (do they exist?) + owner clarification (capture UX intent).

## Analysis Verdict
**Frontend display gap** + possible **backend contract gap**.

## Analysis Outcome
**Analysis Complete with Clarification Required.**

## Ready For Next Stage?
**No** (backend + owner confirmation needed first).

## Next Step
Backend confirmation first; owner UX clarification.

---

# BUG-073 Impact Analysis

## Source
- **Intake Bug:** `/app/memory/BUG_TEMPLATE.md` lines 5543-5599
- **Sprint:** POS2.0
- **Evidence Folder:** No separate evidence folder found.
- **Final Docs Folder:** `/app/memory/final`
- **Google Sheet Status Before Analysis:** Not provided.

## User Reported Issue
When an order item is customizable but no variation or add-on is selected, the order UI still shows an **extra line / placeholder** representing variation or add-on details. The line should not appear if no variation / add-on is selected.

## Evidence Reviewed
- Intake entry BUG-073.
- `frontend/src/components/order-entry/CartPanel.jsx` L65-99 (item rendering — customizations branch + fallback branch).
- `frontend/src/components/cards/OrderCard.jsx` L463-487 (variants/addons display string).

## Module Mapping
- **Primary Module:** **4. Order Entry / Cart / Payment Workflow** (CartPanel render).
- **Downstream Impacted Modules:** Module 3 (Dashboard — OrderCard already correctly hides empty `detailsStr`).
- **Module decision reference:** §4.

## Affected Route / Page
Embedded in dashboard (Order Entry / Cart screen).

## Affected Screen / Flow
Cashier adds a customizable item without selecting any variation / add-on → empty line under the item name in the cart panel.

## Affected Code Areas

| File | Reason |
| --- | --- |
| `frontend/src/components/order-entry/CartPanel.jsx` | L65: `{item.customizations && !isCancelled && ( <div>...</div> )}` — renders the wrapper `<div>` if `item.customizations` is truthy, even when `size`, `variants`, and `addons` are all empty. The three children at L67-69 each have conditional inner content but the outer `<div>` shows an empty line. |
| `frontend/src/components/cards/OrderCard.jsx` | L520 — `{detailsStr && (...)}` correctly hides when empty. **Already correct.** |

## API Review
None.

## Socket / Realtime Review
None.

## State / Data Flow
- `item.customizations` is set when the user opens the customization modal — even if they don't pick anything, the object may be truthy (e.g., `{ size: '', variants: [], addons: [] }`).

## Relevant Final Documentation
None directly.

## Current Code Behavior
- CartPanel renders an empty `<div>` for items with empty customizations.

## Expected Behavior
- The wrapper `<div>` should NOT render if all three (size, variants, addons) are empty.

## Root Cause Hypothesis
**Frontend conditional rendering bug — high-confidence hypothesis.** Tiny one-line fix in CartPanel.jsx: change the gating condition to also check content presence.

## Regression Risk Areas
- Items with partial customization (size only / addons only) — must continue to render correctly.

## Docs / Code Mismatch
None.

## Open Questions / Missing Information
None.

## User Interaction Required
**Not required.**

## Analysis Verdict
**Frontend UI bug** (empty wrapper element).

## Analysis Outcome
**Analysis Complete.**

## Ready For Next Stage?
**Yes.**

## Next Step
Bug Implementation Planning Agent — update CartPanel.jsx:65 gate to also verify `(size || variants.length || addons.length)`.

---

# BUG-074 Impact Analysis

## Source
- **Intake Bug:** `/app/memory/BUG_TEMPLATE.md` lines 5602-5661
- **Sprint:** POS2.0
- **Evidence Folder:** No separate evidence folder found.
- **Final Docs Folder:** `/app/memory/final`
- **Google Sheet Status Before Analysis:** Not provided.

## User Reported Issue
On the login screen, the **Remember Me button does not remember the username / password** or the checkbox state. After returning, saved details are not auto-filled.

## Evidence Reviewed
- Intake entry BUG-074.
- `frontend/src/pages/LoginPage.jsx` L17-36 (state + on-mount restore).
- `frontend/src/api/services/authService.js` L13-78 (login + getRememberedEmail).

## Module Mapping
- **Primary Module:** **1. Authentication & Session**.
- **Downstream Impacted Modules:** None.
- **Module decision reference:** §1 known impact area "remember-me state".

## Affected Route / Page
`/` (Login Screen).

## Affected Screen / Flow
User checks Remember Me + logs in → logs out (or browser closed) → returns to login → expects username + password to auto-fill + checkbox already on. Today, only **email** is restored.

## Affected Code Areas

| File | Reason |
| --- | --- |
| `frontend/src/api/services/authService.js` | L23-29: stores `STORAGE_KEYS.REMEMBER_ME` and `STORAGE_KEYS.USER_EMAIL` only. **Password is NEVER stored** by design. |
| `frontend/src/pages/LoginPage.jsx` | L25-29: restores only email. Sets `rememberMe=true` if the flag is set. Password field stays empty. |

## API Review
None.

## Socket / Realtime Review
None.

## State / Data Flow
- Stored: `auth_token` + `remember_me=true` + `user_email`.
- Restored: email + rememberMe checkbox state.
- Not stored: password (security best practice in modern web apps).

## Relevant Final Documentation
- `MODULE_DECISIONS_FINAL.md` §1 known impact area "remember-me state" — listed but no policy on password storage.
- `OPEN_QUESTIONS_FINAL_RESOLUTION.md` may have a long-term token/session strategy note; the deferred item is "Long-term token/session strategy remains unresolved" (§1).

## Current Code Behavior
- Email restored; password not restored; checkbox state restored.

## Expected Behavior
- Per owner intake: both username and password should be auto-filled on return.
- Security concern: storing the password (in clear text or even encoded) in localStorage is a **security anti-pattern** — credentials become readable by any script that runs on the domain (XSS exposure).
- Alternative (industry-standard): "Remember Me" persists the **session token** (already done — `STORAGE_KEYS.AUTH_TOKEN`) so the user doesn't need to log in again. The fact that the user IS already redirected past login on return (L31-35 of LoginPage) suggests this already works for the token-valid case.

## Root Cause Hypothesis
**Owner intent vs. security-best-practice conflict — medium-confidence hypothesis.** Two possible interpretations:
1. **Owner wants literal password auto-fill** — would require localStorage password storage (not recommended; security risk).
2. **Owner observed that after token expiry, login doesn't auto-fill the password** — and wants something between "fully auto-login" (current token-based behavior) and "manual relogin". The current behavior is already token-based — token is stored under STORAGE_KEYS.AUTH_TOKEN and the LoginPage redirects when `isAuthenticated`. Password auto-fill would only matter when the token expires.

## Regression Risk Areas
- Security audit / SOC2 / PCI implications of storing passwords client-side.
- Browser-native password manager interactions (autofill behavior) — `autocomplete` attributes on the password field may already enable browser-level remember.
- Existing token-based auto-login flow must remain intact.

## Docs / Code Mismatch
- §1 "remember-me state" is named as an impact area but the policy on password is not explicit.

## Open Questions / Missing Information
- **Owner intent clarification:** Does "Remember Me" mean (a) literal password auto-fill on every visit (security risk), (b) browser-native password manager hint (industry standard), (c) token-based silent re-auth (already present), or (d) extended session lifetime?
- Whether `<input type="password" autocomplete="current-password">` is set on the password field (need to check `LoginPage.jsx` markup).

## User Interaction Required
**Required.** Owner must clarify intent — this has security implications.

## Analysis Verdict
**Frontend behavior + policy decision** (security-sensitive).

## Analysis Outcome
**Analysis Complete with Clarification Required.**

## Ready For Next Stage?
**No** (owner policy clarification needed).

## Next Step
Owner clarification first — confirm intent (a/b/c/d above). Recommend option (b) or (c) over (a) for security.

---

# BUG-075 Impact Analysis

## Source
- **Intake Bug:** `/app/memory/BUG_TEMPLATE.md` lines 5666-5726
- **Sprint:** POS2.0
- **Evidence Folder:** No separate evidence folder found.
- **Final Docs Folder:** `/app/memory/final`
- **Google Sheet Status Before Analysis:** Not provided.

## User Reported Issue
Tip and Tip GST should be removed from Takeaway and Delivery order flows. Tip should only apply to dine-in and room orders.

## Evidence Reviewed
- Intake entry BUG-075.
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` L269, L506-507, L536, L1029 (tip state + gate).
- BUG-013 closure for sibling rule (service charge → dineIn/room only) — reference for the same pattern.

## Module Mapping
- **Primary Module:** **4. Order Entry / Cart / Payment Workflow**.
- **Downstream Impacted Modules:** Module 14 (Printing — bill emits `tip_amount` + `tip_tax_amount`), Module 10 (Reports — tip surfaces in audit detail).
- **Module decision reference:** §4 — "totals/tax/SC/discount interactions". Sibling rule pattern is in `CollectPaymentPanel.jsx:513` (BUG-013 SC scope).

## Affected Route / Page
Embedded in dashboard (Collect Payment).

## Affected Screen / Flow
Cashier opens Collect Payment for a takeaway / delivery order. Tip input is currently visible if `restaurant.features.tip` is enabled. Tip and its GST flow into `finalTotal` and into the payload.

## Affected Code Areas

| File | Reason |
| --- | --- |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | L269: `const tipEnabled = !!restaurant?.features?.tip;` — gated ONLY by feature flag, NOT by orderType. L506-507: `const tip = tipEnabled ? (parseFloat(tipInput) || 0) : 0;` — same. L536: `const tipGst = tip * scTaxRate;` — tip GST always computes when tip>0. L1029: tip input render gate uses only `tipEnabled`. L1462: tip row in bill summary uses only `tipEnabled && tip > 0`. |
| `frontend/src/api/transforms/orderTransform.js` | `calcOrderTotals` (L585) receives `tipAmount` and unconditionally adds it to `subtotalWithoutTax`, `gst_tax` (via `tipGstAmt = tipAmount * scTaxRate`), and `rawTotal`. **No orderType awareness.** Used by `placeOrder`, `placeOrderWithPayment`, `updateOrder`. |
| `frontend/src/api/transforms/orderTransform.js` | `collectBillExisting` (L1130) emits `tip_amount` and `tip_tax_amount` from `paymentData.tip` — propagates whatever CollectPaymentPanel computed. |

## API Review
- `tip_amount` + `tip_tax_amount` keys are part of every place-order / update-order / collect-bill payload.
- Backend likely accepts these unconditionally. Removing them for takeaway/delivery is a frontend-only gate.

## Socket / Realtime Review
None.

## State / Data Flow
1. Cashier opens Collect Payment.
2. `tipEnabled` checks `restaurant.features.tip` only.
3. Tip input is shown; tip GST follows BUG-013-style scTaxRate but with no orderType gate.
4. Tip + tip GST flow into bill summary and payment payload regardless of orderType.

## Relevant Final Documentation
- `MODULE_DECISIONS_FINAL.md` §4 — financial guardrail.
- BUG-013 closure note in `CollectPaymentPanel.jsx:513` defines the sibling pattern for SC: `scApplicable = orderType === 'dineIn' || orderType === 'walkIn' || isRoom`. The same shape should apply to tip.

## Current Code Behavior
Tip + tip GST visible & applied for takeaway / delivery orders when `features.tip` is enabled.

## Expected Behavior
Tip + tip GST hidden & not applied for takeaway / delivery, regardless of `features.tip` flag. Allowed only for dineIn / walkIn / isRoom.

## Root Cause Hypothesis
**Frontend financial-rule scope gap — high-confidence hypothesis.** Same family as BUG-013 (SC scope). The gating predicate exists for SC; an analogous one is missing for tip.

## Regression Risk Areas
- Dine-in / walk-in / room tip flows must remain unchanged.
- Print bill `Tip` field (buildBillPrintPayload L1680) — should also produce 0 for takeaway/delivery.
- `calcOrderTotals` is shared across place-order / update-order / collect-bill — must apply consistently.
- `tipGstAmt` rides `scTaxRate` (frozen rule §1 row 9 per CR-013) — guard for orderType-zero pattern not regression.

## Docs / Code Mismatch
None. BUG-013 explicitly established the SC rule; tip is the natural sibling.

## Open Questions / Missing Information
- Whether walk-in is in scope (BUG-013's SC rule includes walk-in; tip likely identical).
- Whether existing takeaway/delivery orders that already have a saved tip should be zeroed on re-print (default branch path).

## User Interaction Required
**Not required** — the pattern is well-established from BUG-013.

## Analysis Verdict
**Frontend bug** (missing orderType gate on tip).

## Analysis Outcome
**Analysis Complete.**

## Ready For Next Stage?
**Yes.**

## Next Step
Bug Implementation Planning Agent — mirror BUG-013 SC pattern: add `tipApplicable = orderType === 'dineIn' || orderType === 'walkIn' || isRoom` gate at both `CollectPaymentPanel.jsx:506-507` (UI tip) and `orderTransform.js:calcOrderTotals` (payload tip + tip GST). **Strongly recommend bundling with Bucket A.**

---

# BUG-076 Impact Analysis

## Source
- **Intake Bug:** `/app/memory/BUG_TEMPLATE.md` lines 5728-5785
- **Sprint:** POS2.0
- **Evidence Folder:** No separate evidence folder found.
- **Final Docs Folder:** `/app/memory/final`
- **Google Sheet Status Before Analysis:** Not provided.

## User Reported Issue
Replace conditional round-off logic to **always use `Math.ceil()`** instead of the current conditional ceil/floor logic.

## Evidence Reviewed
- Intake entry BUG-076 (which explicitly notes "Potential overlap with BUG-051").
- BUG-051 analysis section above.
- `CollectPaymentPanel.jsx:582-583`, `orderTransform.js:659-661`.

## Module Mapping
- **Primary Module:** **4. Order Entry / Cart / Payment Workflow**.
- **Downstream Impacted Modules:** Same as BUG-051.
- **Module decision reference:** §4.

## Affected Route / Page
Same as BUG-051.

## Affected Screen / Flow
Same as BUG-051.

## Affected Code Areas
Same as BUG-051:

| File | Reason |
| --- | --- |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | L582-583 — fractional-conditional ceil/floor. |
| `frontend/src/api/transforms/orderTransform.js` | L659-661 — same logic in `calcOrderTotals`. |
| `frontend/src/__tests__/api/transforms/qa_subtotal_delivery_validation.test.js` | Tests pinned to current logic — would need re-baselining. |

## API Review
Same as BUG-051.

## Socket / Realtime Review
None.

## State / Data Flow
Same as BUG-051.

## Relevant Final Documentation
Same as BUG-051.

## Current Code Behavior
Identical conditional ceil/floor to BUG-051.

## Expected Behavior
Always `Math.ceil()`.

## Root Cause Hypothesis
**Exact duplicate of BUG-051** — both bugs describe the same code defect and the same policy reversal. The owner intake itself flags the overlap.

## Regression Risk Areas
Same as BUG-051.

## Docs / Code Mismatch
Same as BUG-051.

## Open Questions / Missing Information
- Confirm with owner whether to close BUG-076 as a duplicate of BUG-051 OR keep both rows in the tracker as cross-references.

## User Interaction Required
**Not required for analysis** — clear duplicate. **Recommended for tracker housekeeping** so the closure trail is single-source.

## Analysis Verdict
**Duplicate / Already Covered** — same scope as BUG-051.

## Analysis Outcome
**Duplicate / Already Covered.**

## Ready For Next Stage?
**Yes** (rolled into BUG-051 implementation plan).

## Next Step
Bug Implementation Planning Agent — **fold BUG-076 into BUG-051's plan** (single fix touches both bug rows). Suggest closing BUG-076 with reference to BUG-051's smoke pass when it lands.

---

# BUG-077 Impact Analysis

## Source
- **Intake Bug:** `/app/memory/BUG_TEMPLATE.md` lines 5788-5842
- **Sprint:** POS2.0
- **Evidence Folder:** No separate evidence folder found.
- **Final Docs Folder:** `/app/memory/final`
- **Google Sheet Status Before Analysis:** Not provided.

## User Reported Issue
Mobile number input should have `.trim()` applied before CRM lookup to remove leading/trailing whitespace.

## Evidence Reviewed
- Intake entry BUG-077.
- `frontend/src/api/services/customerService.js` L20-50 (`searchCustomers`, `lookupCustomer`).
- `frontend/src/components/order-entry/CustomerModal.jsx` L74 (`lookupCustomer(phone.trim())`).
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` L362-394 (`searchCustomers(tabPhone)` / `searchCustomers(tabName)`).
- `frontend/src/components/order-entry/CartPanel.jsx` L358, L376 (`searchCustomers(customerPhone)` / `searchCustomers(customerName)`).

## Module Mapping
- **Primary Module:** **6. Customer / CRM Integration**.
- **Downstream Impacted Modules:** Module 4 (Order Entry — call sites).
- **Module decision reference:** §6 ("soft-fail lookup behavior").

## Affected Route / Page
Embedded in dashboard / Order Entry / Collect Payment.

## Affected Screen / Flow
Cashier types a phone number (potentially pasted with leading/trailing whitespace) → typeahead `searchCustomers` OR explicit `lookupCustomer` fires → returns empty on whitespace mismatch.

## Affected Code Areas

| File | Reason |
| --- | --- |
| `frontend/src/api/services/customerService.js` | L20-32 `searchCustomers` already calls `query.trim()` (L21 guard + L24 in params). L40-50 `lookupCustomer` already calls `phone?.trim()` (L41 guard + L43 in payload). **Already trimmed at the service layer.** |
| `frontend/src/components/order-entry/CustomerModal.jsx` | L74 `lookupCustomer(phone.trim())` — trims at call-site too. |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | L376, L394 `searchCustomers(tabPhone)` / `searchCustomers(tabName)` — pass through raw state. Service layer trims internally. |
| `frontend/src/components/order-entry/CartPanel.jsx` | L358, L376 — same. Service layer handles trim. |

## API Review
- `POST /pos/customer-lookup` payload `{ phone: phone.trim() }`.
- `GET /pos/customers?search=...` query param uses `query.trim()`.
- Backend receives already-trimmed values.

## Socket / Realtime Review
None.

## State / Data Flow
- Raw input → component state (untrimmed) → service helper → service helper trims → CRM API.

## Relevant Final Documentation
- `MODULE_DECISIONS_FINAL.md` §6 — CRM module known impact area "soft-fail lookup behavior".

## Current Code Behavior
**Already trims.** `searchCustomers` and `lookupCustomer` both trim before issuing the API request. Component-level call sites also trim where lookup is explicit.

## Expected Behavior
Per intake: trim before lookup. **Already satisfied** by current code.

## Root Cause Hypothesis
**Likely already resolved — high-confidence.** Owner intake may be from a stale build OR observing a different call path (e.g., a direct state-to-payload bind on order placement, separate from CRM lookup).

Possible secondary scope: when the user types and immediately tabs out, the typeahead debounce may still capture an un-trimmed snapshot. The component state itself retains whitespace; only the API call layer strips it. Owner may want the **displayed input** to auto-strip whitespace on blur — a UX nicety distinct from the API behavior.

## Regression Risk Areas
- Search debounce timings — must not break.
- CRM key resolution — unaffected.

## Docs / Code Mismatch
None.

## Open Questions / Missing Information
- Owner reproduction of the case where trim is missing (paste a number with trailing space, observe lookup fail).
- Whether the desired fix is (a) confirm current trim is sufficient, OR (b) also trim the on-screen input on blur to give visual feedback, OR (c) trim somewhere else (e.g., on customer create / order placement).

## User Interaction Required
**Required.** Owner reproduction needed to confirm whether the current trim coverage is sufficient.

## Analysis Verdict
**Likely already resolved / configuration ambiguity.**

## Analysis Outcome
**Analysis Complete with Clarification Required.**

## Ready For Next Stage?
**No** (owner repro required to confirm gap).

## Next Step
Owner clarification first — supply a phone input value that fails CRM lookup despite expected match. If none, close as already-resolved.

---

# BUG-078 Impact Analysis

## Source
- **Intake Bug:** `/app/memory/BUG_TEMPLATE.md` lines 5846-5902
- **Sprint:** POS2.0
- **Evidence Folder:** No separate evidence folder found.
- **Final Docs Folder:** `/app/memory/final`
- **Google Sheet Status Before Analysis:** Not provided.

## User Reported Issue
When CRM lookup times out, a **visible error message** should be shown to the user. Currently the timeout fails silently.

## Evidence Reviewed
- Intake entry BUG-078.
- `frontend/src/api/services/customerService.js` L20-50 (search / lookup error handling).
- `frontend/src/api/crmAxios.js` L49 (`timeout: 15000`), L67-79 (response interceptor — extracts `readableMessage`).

## Module Mapping
- **Primary Module:** **6. Customer / CRM Integration**.
- **Downstream Impacted Modules:** Module 4 (Order Entry — UI surfaces that consume lookup results).
- **Module decision reference:** §6 ("soft-fail lookup behavior" + "missing-config behavior").

## Affected Route / Page
Embedded in dashboard / Order Entry / Collect Payment.

## Affected Screen / Flow
1. Cashier triggers CRM lookup (e.g., typing in CustomerModal phone field).
2. CRM service is unreachable / slow.
3. axios timeout fires at 15 s.
4. `lookupCustomer` catches error → `console.warn(...)` → returns `null`.
5. UI proceeds as if customer not found — no toast, no inline error.

## Affected Code Areas

| File | Reason |
| --- | --- |
| `frontend/src/api/services/customerService.js` | L28-31 (`searchCustomers` catch): `console.warn` + return `[]`. L46-49 (`lookupCustomer` catch): `console.warn` + return `null`. **No UI surface emission.** Soft-fail by design (see Module §6). |
| `frontend/src/api/crmAxios.js` | L67-79 response interceptor stores `readableMessage` on the error object — already available. |
| `frontend/src/components/order-entry/CustomerModal.jsx` | L74 `await lookupCustomer(phone.trim())` — receives `null` on failure, treats as "phone not registered". No error toast surface. |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | L376, L394 — passes filtered results to local state. On `[]` from `searchCustomers` no distinction between "no results" vs "timeout". |

## API Review
- `POST /pos/customer-lookup` and `GET /pos/customers` — both protected by 15 s axios timeout.
- Error shape preserved by interceptor (`error.readableMessage`).

## Socket / Realtime Review
None.

## State / Data Flow
1. Lookup call enters axios.
2. On timeout, axios throws `ECONNABORTED`-like error.
3. Service catch returns empty/null → silent.
4. UI behaves as "not found".

## Relevant Final Documentation
- `MODULE_DECISIONS_FINAL.md` §6 — "soft-fail lookup behavior" + future-change rule "Any CRM UX tightening must explicitly define missing-config behavior."

## Current Code Behavior
Soft-fail — silent. No visible difference between "timeout" and "not registered".

## Expected Behavior
On timeout (or network failure), display a visible error toast / inline message: e.g., "Customer lookup timed out — please retry."

## Root Cause Hypothesis
**Frontend UX gap — high-confidence hypothesis.** Service layer already captures the error type; UI surfaces just don't consume it. Two implementation patterns possible:

1. Make `lookupCustomer` / `searchCustomers` **throw** specifically for timeout/network errors (return `null` only for genuinely-not-found). Callers wrap in try/catch + toast.
2. Add an optional callback / event channel to surface errors without changing the return contract.

Option 1 is cleaner but is an API contract change (callers must update). Option 2 is additive.

## Regression Risk Areas
- All existing `lookupCustomer` / `searchCustomers` call sites — must continue to handle soft-fail.
- Race condition: typeahead may fire many requests, each timing out — must not spam toasts.

## Docs / Code Mismatch
- Module §6 explicitly says "Any CRM UX tightening must explicitly define missing-config behavior." This bug touches similar policy.

## Open Questions / Missing Information
- Owner preference between Option 1 / Option 2.
- Should timeout retry automatically (e.g., 1 silent retry) before surfacing the error?
- Should "no CRM API key configured" (currently `console.warn`) also surface?

## User Interaction Required
**Required.** Owner UX preference + retry policy.

## Analysis Verdict
**Frontend UX gap.**

## Analysis Outcome
**Analysis Complete with Clarification Required.**

## Ready For Next Stage?
**No** (owner UX choice + retry policy).

## Next Step
Owner clarification first; bundle with BUG-077 fix since both touch the same module.

---

# BUG-079 Impact Analysis

## Source
- **Intake Bug:** `/app/memory/BUG_TEMPLATE.md` lines 5905-5960
- **Sprint:** POS2.0
- **Evidence Folder:** No separate evidence folder found.
- **Final Docs Folder:** `/app/memory/final`
- **Google Sheet Status Before Analysis:** Not provided.

## User Reported Issue
Change the **2-miss removal logic to 1-miss removal**.

## Evidence Reviewed
- Intake entry BUG-079 (explicitly marked "Context unclear" by intake author).
- Codebase search for "miss"/threshold patterns → **clear single match** at `frontend/src/hooks/useOrderPollingReconciliation.js` L34.

## Module Mapping
- **Primary Module:** **7. Realtime Socket** (the polling reconciliation hook is the safety net for missed socket events).
- **Downstream Impacted Modules:** Module 13 (Tables & Orders Runtime State — order removal), Module 3 (Dashboard — card disappearance behavior).
- **Module decision reference:** §7 + §13. Hook was introduced under CR `order_polling_reconciliation_investigation` (file references in `/app/memory/change_requests/`).

## Affected Route / Page
Cross-cutting — runs every 60 s wherever the dashboard is open.

## Affected Screen / Flow
1. Hook polls `employee-orders-list` every 60 s in the background.
2. For each local order missing from the latest poll, increment `missCount`.
3. If `missCount >= REMOVAL_MISS_THRESHOLD` (currently `2`), call `removeOrder(orderId)` → card vanishes from dashboard.
4. Today: order must be missing in **2 consecutive polls (≥120 s)** before removal.
5. Owner wants: remove after **1 missed poll (~60 s)**.

## Affected Code Areas

| File | Reason |
| --- | --- |
| `frontend/src/hooks/useOrderPollingReconciliation.js` | L34: `export const REMOVAL_MISS_THRESHOLD = 2;` — single constant change. L13 anti-rule comment: "Two consecutive missing polls required before removal" — comment must be updated too. L180-217: removal logic uses `REMOVAL_MISS_THRESHOLD`. |
| `frontend/src/__tests__/hooks/useOrderPollingReconciliation.*.test.*` (if any) | Tests may pin the value of `2` — re-baseline needed. |
| `/app/memory/change_requests/order_polling_reconciliation_investigation/*` | Investigation plan documents will become stale — note for documentation update. |

## API Review
- `GET /api/v1/vendoremployee/employee-orders-list` (employee order list — used by the poll). No payload change.

## Socket / Realtime Review
- This hook is the **fallback** for missed socket events. Reducing threshold to 1 makes the dashboard more aggressive at removing orders the backend has already terminated but the socket missed.
- Combined with BUG-068 (socket reconnect rehydration) — both improve socket-drift recovery.

## State / Data Flow
1. Hook fetches running orders every 60 s.
2. Computes diff vs OrderContext.
3. Increments miss-count per missing order.
4. Removes when threshold met.
5. Engaged orders skip the count (line 190-191 — already correct).
6. Hold orders (fOrderStatus 9) protected from removal (anti-rule L12).

## Relevant Final Documentation
- `MODULE_DECISIONS_FINAL.md` §7 + §13.
- `CR: ORDER_POLLING_RECONCILIATION` planning docs.

## Current Code Behavior
- Two consecutive missing polls (≥120 s) required before an order is removed.
- Threshold designed to tolerate a single transient API hiccup.

## Expected Behavior
- One missing poll (~60 s) sufficient for removal.
- Faster correction of socket drift, but lower tolerance for transient API errors.

## Root Cause Hypothesis
**Configuration / policy change — high-confidence hypothesis.** Single-constant change. No code defect.

## Regression Risk Areas
- **False-positive removal** during a transient `employee-orders-list` 5xx — orders incorrectly removed from a cashier's screen on a single failed poll. Mitigation: keep the API-failure short-circuit (currently exists at top of poll function — verify).
- Engaged-row skip logic (L190-191) — still required to avoid removing orders being actively edited.
- Hold-row protection (L13 anti-rule) — must remain.
- Snapshot-staleness window — backend may "settle" an order but the next poll arrives before the settle is committed; if the order is missing for "1 poll" it gets removed even though backend will list it again on the next poll.

## Docs / Code Mismatch
- Comments at L13 ("Two consecutive missing polls required before removal") must be updated post-fix.
- Investigation plan docs in `/app/memory/change_requests/order_polling_reconciliation_investigation/` become stale.

## Open Questions / Missing Information
- Whether the threshold should be configurable per restaurant (vs. universal).
- Whether failure of the poll itself (HTTP 5xx) should be treated as "0 misses observed" (current behavior preserves this — verify).
- Whether engaged-row skip-rule remains for 1-miss as well.

## User Interaction Required
**Recommended** for owner to acknowledge the false-positive trade-off, but **not strictly required** for implementation since the change is well-scoped.

## Analysis Verdict
**Configuration / policy change** (no defect).

## Analysis Outcome
**Analysis Complete.**

## Ready For Next Stage?
**Yes.**

## Next Step
Bug Implementation Planning Agent — change `REMOVAL_MISS_THRESHOLD = 2 → 1`. Update comments + any pinned tests + investigation doc trail. Confirm engaged-row skip + Hold protection remain.

---

# BUG-080 Impact Analysis

## Source
- **Intake Bug:** `/app/memory/BUG_TEMPLATE.md` lines 5963-6019
- **Sprint:** POS2.0
- **Evidence Folder:** No separate evidence folder found.
- **Final Docs Folder:** `/app/memory/final`
- **Google Sheet Status Before Analysis:** Not provided.

## User Reported Issue
The `partial_payments` list should be filtered to **only configured payment modes**. Currently it may include all modes.

## Evidence Reviewed
- Intake entry BUG-080.
- `frontend/src/api/transforms/orderTransform.js` L1024-1048 (`placeOrderWithPayment` partial_payments fill).
- `frontend/src/api/transforms/orderTransform.js` L1289-1297 (`collectBillExisting` partial_payments fill).
- `frontend/src/api/transforms/profileTransform.js` L170-175 (`paymentMethods` toggle map).

## Module Mapping
- **Primary Module:** **4. Order Entry / Cart / Payment Workflow**.
- **Downstream Impacted Modules:** Module 12 (Restaurant profile — source of config), Module 10 (Reports — audit displays partial_payments).
- **Module decision reference:** §4.

## Affected Route / Page
Embedded in dashboard.

## Affected Screen / Flow
1. Cashier places order via Place+Pay or settles via Collect Bill.
2. Frontend builds `partial_payments` array.
3. **Even for non-split payments**, prepaid `placeOrderWithPayment` payload (L1042-1047) ALWAYS includes ALL 3 modes (`cash`, `card`, `upi`) — two of them with `payment_amount: 0`.
4. **For split payments** (L1035-1039), missing modes are auto-added with `0` amounts so all 3 are always present.
5. **Restaurant configuration** (`restaurant.paymentMethods.{cash,upi,card,tab}`) is NOT consulted.

## Affected Code Areas

| File | Reason |
| --- | --- |
| `frontend/src/api/transforms/orderTransform.js` | L1024-1048 — `placeOrderWithPayment` always fills `['cash', 'card', 'upi']`. L1035-1039 — split branch ensures all 3 are present. L1289-1297 — `collectBillExisting` split branch follows the same `splitPayments` shape but does NOT auto-add missing modes. |
| `frontend/src/api/transforms/profileTransform.js` | L170-175 — `paymentMethods: { cash, upi, card, tab }` available on restaurant profile. Not read by the partial_payments builders. |

## API Review
- Backend likely tolerates the extra zero-amount entries today (no rejection visible in test history).
- Filtering to configured modes is **subtractive**: drops irrelevant entries. Should be backend-safe.

## Socket / Realtime Review
None.

## State / Data Flow
1. Restaurant profile loaded → `restaurant.paymentMethods.{cash,upi,card,tab} = {true|false}`.
2. Place+Pay or Collect Bill builds payload.
3. **Today:** `['cash','card','upi']` hardcoded.
4. **Expected:** Filter by `restaurant.paymentMethods` enabled flags.

## Relevant Final Documentation
- `MODULE_DECISIONS_FINAL.md` §4.
- `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md` may have related guidance on partial_payments shape (referenced but not fully indexed in this analysis).

## Current Code Behavior
- Payload always carries 3 entries regardless of restaurant config.
- For a cash-only restaurant: card + upi entries appear with `payment_amount: 0` — clutter / cosmetic, but may confuse reporting downstream.

## Expected Behavior
- Payload carries only entries for modes enabled in `restaurant.paymentMethods`.

## Root Cause Hypothesis
**Frontend payload-builder gap — high-confidence hypothesis.** Builders hardcode the 3-mode list. Should consume `restaurant.paymentMethods` (passed via options) and produce a filtered list.

## Regression Risk Areas
- Backend ingestion — must accept variable-length partial_payments (likely already does; need confirmation).
- Audit Report — `partial_payments` field rendering must tolerate fewer rows.
- Existing tests pinned to length=3 — re-baseline needed.
- Split bill UX — the cashier must not be able to pick a mode that's not configured (already covered by paymentMethods config UI).
- `paymentMethods.tab` is also a configured mode — currently not included even when the partial_payments shape is fully hardcoded. Owner should clarify whether tab/credit is in scope.

## Docs / Code Mismatch
- BUG-080 implies the contract should be config-driven; today it is hardcoded.

## Open Questions / Missing Information
- Is `tab` / credit payment also in scope for partial_payments? (Currently not in either the hardcoded list or the config flag set inspected.)
- Should the selected (current) payment method always appear even if its flag is false? (Defensive consistency vs. strict filtering.)
- Backend confirmation that variable-length partial_payments is acceptable.

## User Interaction Required
**Recommended** (tab/credit scope) — **not strictly required** for the core fix.

## Analysis Verdict
**Frontend payload-builder bug** (hardcoded modes).

## Analysis Outcome
**Analysis Complete with Clarification Required.**

## Ready For Next Stage?
**Yes** (with caveat — tab/credit scope to confirm).

## Next Step
Bug Implementation Planning Agent — change `placeOrderWithPayment` + `collectBillExisting` partial_payments builders to consume `restaurant.paymentMethods` and emit only enabled modes. Pair with BUG-055 since both touch `placeOrderWithPayment` payload.

---

# BUG-081 Impact Analysis

## Source
- **Intake Bug:** `/app/memory/BUG_TEMPLATE.md` lines 6022-6077
- **Sprint:** POS2.0
- **Evidence Folder:** No separate evidence folder found.
- **Final Docs Folder:** `/app/memory/final`
- **Google Sheet Status Before Analysis:** Not provided.

## User Reported Issue
**Confirm / fix snooze to 120,000ms (2 min).**

## Evidence Reviewed
- Intake entry BUG-081.
- `frontend/src/components/dashboard/ScanOrderPopOut.jsx` L59: `export const POPOUT_SNOOZE_MS = 2 * 60 * 1000;` (= 120,000 ms).
- `frontend/src/pages/DashboardPage.jsx` L1434 — **stale comment** "5-min hide-set (R-SNOOZE-9)".

## Module Mapping
- **Primary Module:** **8. Notifications & Firebase** (ScanOrderPopOut snooze) + **3. Dashboard** (host).
- **Downstream Impacted Modules:** None.
- **Module decision reference:** §8.

## Affected Route / Page
Dashboard.

## Affected Screen / Flow
Cashier snoozes a YTC scan order pop-out → it disappears for `POPOUT_SNOOZE_MS` → reappears.

## Affected Code Areas

| File | Reason |
| --- | --- |
| `frontend/src/components/dashboard/ScanOrderPopOut.jsx` | L59 — constant set to 120,000 ms. **Already correct.** L56-58 explicitly documents owner decision 2026-01-16 (was 5 min, superseded). |
| `frontend/src/pages/DashboardPage.jsx` | L1434 — stale comment "pop-out-local 5-min hide-set (R-SNOOZE-9)". Misleading but not functional. |
| `frontend/src/__tests__/components/dashboard/ScanOrderPopOut.test.jsx` | Imports `POPOUT_SNOOZE_MS` for tests — single source of truth maintained. |

## API Review
None.

## Socket / Realtime Review
None.

## State / Data Flow
- ScanOrderPopOut maintains a Map of snoozed orders with an expiry timestamp = `Date.now() + POPOUT_SNOOZE_MS` (L261).
- `setTimeout(..., POPOUT_SNOOZE_MS)` (L275) wakes the queue.

## Relevant Final Documentation
- `MODULE_DECISIONS_FINAL.md` §8.
- CR `SNOOZE_SOUND_STOP_AND_DURATION` (Jan-2026) — owner-locked the 2-min duration.

## Current Code Behavior
- Snooze duration is **already 120,000 ms** (2 min).

## Expected Behavior
- 120,000 ms.

## Root Cause Hypothesis
**Likely already resolved — high-confidence.** The constant is correctly set. The only loose end is the **stale comment** in `DashboardPage.jsx:1434` which still mentions "5-min hide-set".

## Regression Risk Areas
- If the comment is updated, no behavior change.
- If a different "snooze" exists elsewhere (e.g., a dashboard-level snooze map separate from ScanOrderPopOut's internal map), it should be cross-checked. Search above did not find a second snooze constant.

## Docs / Code Mismatch
- DashboardPage.jsx L1434 comment is stale ("5-min").

## Open Questions / Missing Information
- Whether owner is referring to a different snooze surface (KDS alerts, order notifications, etc.) — none found in current codebase.

## User Interaction Required
**Recommended** to confirm scope (any other "snooze" surfaces?), but **not strictly required** since the only known snooze is already 2 min.

## Analysis Verdict
**Likely already resolved.** Stale comment cleanup only.

## Analysis Outcome
**Duplicate / Already Covered.**

## Ready For Next Stage?
**Yes** (trivial comment cleanup) — but **recommend owner confirm scope** before closing.

## Next Step
Owner clarification first to confirm scope. If confirmed, close as already-resolved with a minor comment-cleanup PR (one line in DashboardPage.jsx).

---

# BUG-082 Impact Analysis

## Source
- **Intake Bug:** `/app/memory/BUG_TEMPLATE.md` lines 6081-6136
- **Sprint:** POS2.0
- **Evidence Folder:** No separate evidence folder found.
- **Final Docs Folder:** `/app/memory/final`
- **Google Sheet Status Before Analysis:** Not provided.

## User Reported Issue
**Socket index 4 should be read as the primary web source** — suggests the socket event payload's index 4 carries an `order_from='web'` indicator that frontend should read.

## Evidence Reviewed
- Intake entry BUG-082.
- `frontend/src/api/socket/socketEvents.js` L148-153 — `MSG_INDEX` definition:
  - `EVENT_NAME: 0`
  - `ORDER_ID: 1`
  - `RESTAURANT_ID: 2`
  - `STATUS: 3` (f_order_status)
  - `PAYLOAD: 4` (orders array for new-order)
- `frontend/src/api/socket/socketHandlers.js` L156-157 — currently reads `message[5]?.table_info` for table info.
- `frontend/src/api/socket/socketHandlers.js` L498-511 (`handleScanNewOrder` POS2-002-P4-FU-01 web enrichment).
- Live-data note at L502-507: "Backend's `single-order-new` response was observed in the wild (order 825770, 2026-05-10) to omit `order_from='web'`, which left orderFrom=null after the Phase 1 transform and prevented Phase 4's ScanOrderPopOut + Phase 3.1's Web counter from firing. Fill the field only when the backend did not supply it."

## Module Mapping
- **Primary Module:** **7. Realtime Socket** (event parsing).
- **Downstream Impacted Modules:** Module 3 (Dashboard — Web counter / ScanOrderPopOut), Module 8 (Notifications — web-origin sound mapping).
- **Module decision reference:** §7 future-change rule: "Socket changes require channel / event inventory and downstream state review."

## Affected Route / Page
Cross-cutting — wherever socket events drive the dashboard.

## Affected Screen / Flow
1. Backend emits `new-order` socket event with the full order payload at message index 4.
2. Frontend currently reads payload from index 4 (`MSG_INDEX.PAYLOAD = 4`) and `table_info` from index 5 (`message[5]?.table_info`).
3. The owner is asking that **`order_from` (or a similar source indicator) at index 4** be treated as the primary source for "web vs POS" determination — possibly because **a new socket message structure** has been agreed with backend.

## Affected Code Areas

| File | Reason |
| --- | --- |
| `frontend/src/api/socket/socketEvents.js` | L148-153 — `MSG_INDEX` constant. Index 4 is currently `PAYLOAD`. If owner means a new shape where index 4 is a primitive `order_from` string, this needs renaming + the structure changes. |
| `frontend/src/api/socket/socketHandlers.js` | L156-180 — `handleNewOrder` reads payload at index 4 and orders inside it. POS2-002-P4-FU-01 enrichment at L498-511 currently derives `order_from='web'` from the **scan-new-order** channel (not from a message index). |
| `frontend/src/api/transforms/orderTransform.js` | `orderFrom` field — derived from `api.order_from` in `fromAPI.order`. The socket-level enrichment fills `order.orderFrom = 'web'` when the backend payload's `order_from` field is empty (handler L508-511). |

## API Review
- Socket contract owned by backend.
- If "index 4 = order_from primitive" is a new contract, this is a backend change that frontend must adopt.

## Socket / Realtime Review
- Currently: index 4 = full payload (orders array, items, etc.). 
- Owner's request implies either:
  - (a) **A new contract** where index 4 becomes a primitive `order_from` string (breaking change), OR
  - (b) **The same payload at index 4** but the `order_from` field inside it should be the **primary** source (overriding the POS2-002-P4-FU-01 fallback at L508-511 which fills `'web'` when backend omitted it), OR
  - (c) The bug is mis-worded and refers to a **different** event (e.g., a separate web-source-only event with a different shape).

Most plausible: **(b)** — the owner wants the backend's authoritative `order_from` field (now reliably present per recent backend fix) to drive web-vs-POS determination, instead of frontend deriving it from the channel.

## State / Data Flow
1. Socket → `handleNewOrder` → reads payload (index 4) → `orderFromAPI.order` parses → `orderFrom` field set from `api.order_from`.
2. Today: scan-new-order channel has a fallback that forces `'web'` when `order_from` is empty.
3. Expected: trust backend's `order_from` field as primary; remove or downgrade the channel-based fallback.

## Relevant Final Documentation
- `MODULE_DECISIONS_FINAL.md` §7 future-change rule.
- POS2-002 / POS2-002-P4-FU-01 implementation history in code comments.

## Current Code Behavior
- `order_from` is read from API payload + filled with `'web'` only when the scan-new-order channel was used AND the backend omitted the field.

## Expected Behavior
- `order_from` is read as primary from socket payload index 4 (i.e., from the `orders` array's `order_from` field inside the payload at index 4).
- The fallback may be **removed** if backend now reliably ships the field.

## Root Cause Hypothesis
**Backend contract clarification / fallback retirement — medium-confidence hypothesis** pending owner confirmation of intent.

## Regression Risk Areas
- ScanOrderPopOut predicate: `orderFrom === 'web' && fOrderStatus === 7` — if removing the fallback breaks any legacy orders that still have empty `order_from`, the popup won't appear.
- Web counter on dashboard.
- Sound / tone mapping for web orders (if any).
- POS2-002-P4-FU-01 enrichment removal must be coordinated with backend confirmation that field ships reliably.

## Docs / Code Mismatch
- Comment at L498-511 documents the fallback as a workaround for a backend bug. If backend has fixed that, the fallback can be retired.

## Open Questions / Missing Information
- **Critical:** Exact owner intent — is this about (a) a new socket contract, (b) trusting an existing field, or (c) something else?
- Has the backend reliably shipped `order_from='web'` since the 2026-05-10 observation?
- Should the channel-based fallback be removed entirely OR kept as defensive?

## User Interaction Required
**Required.** Owner intent + backend confirmation.

## Analysis Verdict
**Socket contract / configuration clarification.**

## Analysis Outcome
**Analysis Complete with Clarification Required.**

## Ready For Next Stage?
**No** (owner intent unclear; backend confirmation required).

## Next Step
Owner clarification first (what does "index 4 as primary" precisely mean?) + backend confirmation that `order_from` ships reliably now.

---

# BUG-083 Impact Analysis

## Source
- **Intake Bug:** `/app/memory/BUG_TEMPLATE.md` lines 6140-6196
- **Sprint:** POS2.0
- **Evidence Folder:** No separate evidence folder found.
- **Final Docs Folder:** `/app/memory/final`
- **Google Sheet Status Before Analysis:** Not provided.

## User Reported Issue
Verify that `delivery_charge_gst_amount` is being passed as a **separate key** in the payload (so delivery-charge GST is tracked independently from composite `gst_tax`).

## Evidence Reviewed
- Intake entry BUG-083.
- `frontend/src/api/transforms/orderTransform.js` L640-680 (`calcOrderTotals` return).
- `frontend/src/api/transforms/orderTransform.js` L1230-1287 (`collectBillExisting` payload).
- `frontend/src/api/transforms/orderTransform.js` L1050-1109 (`placeOrderWithPayment` payload).
- `frontend/src/api/transforms/orderTransform.js` L1634-1695 (`buildBillPrintPayload`).
- Code comment at L640-643 (`calcOrderTotals` return block): **"Delivery GST stays folded into composite gst_tax for now — a dedicated `delivery_charge_gst_amount` key is BE-G9 in Phase 3."**

## Module Mapping
- **Primary Module:** **4. Order Entry / Cart / Payment Workflow** (payload).
- **Downstream Impacted Modules:** Module 14 (Printing — bill GST breakdown), Module 10 (Reports — audit / rooms display).
- **Module decision reference:** §4.

## Affected Route / Page
Embedded in dashboard — all order placement / collect-bill / print paths.

## Affected Screen / Flow
1. Cashier places a delivery order with a delivery charge.
2. `calcOrderTotals` computes `delGstAmt = deliveryCharge * delTaxRate` and folds it into the composite `gst_tax`.
3. Payload emits `service_gst_tax_amount`, `tip_tax_amount`, `gst_tax` — but **no `delivery_charge_gst_amount`** key.
4. Backend cannot reconcile delivery GST as a separate line.

## Affected Code Areas

| File | Reason |
| --- | --- |
| `frontend/src/api/transforms/orderTransform.js` | `calcOrderTotals` L646-651: `delGstAmt` computed locally; folded into `gstTax = itemGstPostDiscount + scGstAmt + tipGstAmt + delGstAmt`. Return block L665-680 emits `service_gst_tax_amount` and `tip_tax_amount` but **no `delivery_charge_gst_amount`**. |
| `frontend/src/api/transforms/orderTransform.js` | L640-643 inline comment acknowledges the gap is intentional + pending backend (BE-G9). |
| `frontend/src/api/transforms/orderTransform.js` | `collectBillExisting` (L1230-1287) emits `service_gst_tax_amount`, `tip_tax_amount`, but no `delivery_charge_gst_amount`. |
| `frontend/src/api/transforms/orderTransform.js` | `buildBillPrintPayload` (L1634-1695) — same pattern; no separate delivery GST key. |

## API Review
- Backend has BE-G9 pending (per BUG-083 sibling intake BUG-085 + the inline comment).
- Adding the key is **additive** on the frontend; backend acceptance must be confirmed.

## Socket / Realtime Review
None.

## State / Data Flow
- Delivery GST is a computed local variable (`delGstAmt`) that disappears into the composite return.
- Bill UI already displays it as a separate row at `CollectPaymentPanel.jsx:1764-1769`.
- Bill print payload currently does NOT carry it as a separate field.

## Relevant Final Documentation
- `MODULE_DECISIONS_FINAL.md` §4.
- `CR_013_GST_CONFIG_CORRECTION.md` — likely the parent CR that introduced the per-component split for SC/Tip and explicitly defers delivery to Phase 3.

## Current Code Behavior
- Delivery GST is computed but folded into composite `gst_tax`. Not separately persisted.

## Expected Behavior
- Emit `delivery_charge_gst_amount` as a top-level field in:
  - `calcOrderTotals` return (so it flows through every payload builder)
  - `collectBillExisting` payload
  - `buildBillPrintPayload` payload
  - Optionally `placeOrderWithPayment` / `updateOrder` payloads.

## Root Cause Hypothesis
**Frontend mapping gap acknowledged as pending — high-confidence hypothesis.** The Phase 3 deferral has now been "unparked" by the owner (this bug). Likely paired with BUG-084 / BUG-085.

## Regression Risk Areas
- Backend tolerance for the new key — confirm backend accepts before shipping.
- Composite `gst_tax` value — should the composite drop the delivery component now (avoid double-counting) OR keep it for backwards compatibility?
- Tests pinned to current payload shape — re-baseline needed.

## Docs / Code Mismatch
- Inline comment explicitly says "BE-G9 in Phase 3". This bug effectively activates Phase 3.

## Open Questions / Missing Information
- Backend field-name confirmation (`delivery_charge_gst_amount` vs. `delivery_gst_tax_amount` vs. another shape).
- Whether composite `gst_tax` should now exclude the delivery component (avoid double-count) OR keep it (backward-compat).
- Whether the same key should also surface in the print payload.

## User Interaction Required
**Required.** Backend field-name + composite-policy confirmation.

## Analysis Verdict
**Frontend mapping + payload gap** + **backend contract confirmation**.

## Analysis Outcome
**Analysis Complete with Clarification Required.**

## Ready For Next Stage?
**No** (backend confirmation required).

## Next Step
Backend confirmation first. **Strongly recommend bundling with BUG-084 + BUG-085** since all three are CR-013 Phase 3 family.

---

# BUG-084 Impact Analysis

## Source
- **Intake Bug:** `/app/memory/BUG_TEMPLATE.md` lines 6199-6256
- **Sprint:** POS2.0
- **Evidence Folder:** No separate evidence folder found.
- **Final Docs Folder:** `/app/memory/final`
- **Google Sheet Status Before Analysis:** Not provided.

## User Reported Issue
CGST/SGST split should be applied over **ALL GST types** — not just item GST. Should include SC GST, tip GST, delivery GST etc. with the CGST/SGST split.

## Evidence Reviewed
- Intake entry BUG-084 (explicitly notes overlap with BUG-053).
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` L1707-1781 (bill summary tax breakdown).
- `frontend/src/api/transforms/orderTransform.js` L1691-1692 (print payload `cgst_amount` / `sgst_amount`).

## Module Mapping
- **Primary Module:** **4. Order Entry / Cart / Payment Workflow** (UI breakdown) + **14. Printing** (payload).
- **Downstream Impacted Modules:** Module 10 (Reports — Audit GST display).
- **Module decision reference:** §4 + §14.

## Affected Route / Page
Embedded in dashboard.

## Affected Screen / Flow
Cashier views Bill Summary on Collect Payment. Today the UI already shows CGST/SGST split per component (item, SC, Tip, Delivery — L1707-1772). **The UI is correct.** The PAYLOAD is the gap.

## Affected Code Areas

| File | Reason |
| --- | --- |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | L1714-1772 — Bill summary already shows CGST + SGST split for items, SC, Tip, Delivery. Each component has its own pair of rows. **UI already correct.** |
| `frontend/src/api/transforms/orderTransform.js` | `buildBillPrintPayload` L1691-1692 — emits only top-level `cgst_amount` and `sgst_amount` (50/50 of total `finalGstTax`). No per-component split fields. |
| `frontend/src/api/transforms/orderTransform.js` | `calcOrderTotals` (L585) and `collectBillExisting` payload (L1230-1287) — emit `service_gst_tax_amount` and `tip_tax_amount` but those are NOT split into CGST/SGST halves at payload level. |

## API Review
- For each per-component GST amount (item, SC, Tip, Delivery), the backend would need:
  - `item_cgst_amount`, `item_sgst_amount`
  - `service_cgst_amount`, `service_sgst_amount` (or `service_gst_tax_amount` retained + split via consumer)
  - `tip_cgst_amount`, `tip_sgst_amount`
  - `delivery_cgst_amount`, `delivery_sgst_amount`
- **Exact key names backend-dependent.**

## Socket / Realtime Review
None.

## State / Data Flow
- UI already computes per-component half-splits inline (e.g., `scGst / 2` for CGST + `scGst / 2` for SGST).
- These values are NOT persisted into payloads — they exist only in the rendered DOM.

## Relevant Final Documentation
- `MODULE_DECISIONS_FINAL.md` §4 + §14.
- `CR_013_GST_CONFIG_CORRECTION.md` / Phase 3 deferral note in `buildBillPrintPayload` comment L1684-1690.

## Current Code Behavior
- UI shows CGST/SGST split per component (already correct).
- Payload emits only:
  - `gst_tax` (composite)
  - `service_gst_tax_amount` (not split into CGST/SGST halves)
  - `tip_tax_amount` (not split)
  - `cgst_amount` / `sgst_amount` (50/50 of composite total — at the WHOLE-bill level only).

## Expected Behavior
- Payload emits each component's CGST + SGST as separate keys.
- (Bill print backend template would then render each as a separate line.)

## Root Cause Hypothesis
**Frontend payload gap — high-confidence hypothesis.** Same family as BUG-083 + BUG-085. The UI logic is already there; just needs payload plumbing. **Significant overlap with BUG-053** (per owner's note in intake).

## Regression Risk Areas
- Backend rejection / tolerance for additional keys — confirm before shipping.
- Print template — current backend template renders `cgst_amount` / `sgst_amount` as top-level; adding per-component rows requires template support.
- Composite `gst_tax` field — should it now equal the sum of all per-component values (double-bookkeeping with verification) OR be dropped?
- Audit display — would need to consume new per-component fields if presentation should change.

## Docs / Code Mismatch
- Comment at L1684-1690 of orderTransform.js explicitly defers per-component slot adoption to Phase 3 CR.

## Open Questions / Missing Information
- Backend field-name contract for the new per-component GST keys.
- Whether the composite `gst_tax` / `cgst_amount` / `sgst_amount` should be dropped or retained.
- Whether the new keys should appear in only the print payload OR also in place-order / collect-bill payloads.

## User Interaction Required
**Required.** Backend field-name contract.

## Analysis Verdict
**Frontend payload gap** + **backend contract confirmation needed**.

## Analysis Outcome
**Analysis Complete with Clarification Required.**

## Ready For Next Stage?
**No** (backend confirmation required).

## Next Step
Backend confirmation first. **Bundle with BUG-083 + BUG-085** under the CR-013 Phase 3 umbrella.

---

# BUG-085 Impact Analysis

## Source
- **Intake Bug:** `/app/memory/BUG_TEMPLATE.md` lines 6259-6316
- **Sprint:** POS2.0
- **Evidence Folder:** No separate evidence folder found.
- **Final Docs Folder:** `/app/memory/final`
- **Google Sheet Status Before Analysis:** Not provided.

## User Reported Issue
Printed bill should show **full GST breakdown** including all components (item GST, service charge GST, tip GST, delivery charge GST) with CGST/SGST split.

## Evidence Reviewed
- Intake entry BUG-085 (explicitly notes "Related to BUG-084 — these may be part of the same GST breakdown enhancement").
- BUG-083 / BUG-084 sections above.
- `frontend/src/api/transforms/orderTransform.js` `buildBillPrintPayload` L1634-1695.

## Module Mapping
- **Primary Module:** **14. Printing / Bill / KOT**.
- **Downstream Impacted Modules:** Module 4 (Order Entry — payload source).
- **Module decision reference:** §14.

## Affected Route / Page
Any flow that calls `printOrder(..., 'bill', ...)`.

## Affected Screen / Flow
Cashier prints a bill. Today the printed receipt aggregates GST into a single top-level `gst_tax` (plus 50/50 cgst/sgst split of that total). Owner wants per-component breakdown printed.

## Affected Code Areas

| File | Reason |
| --- | --- |
| `frontend/src/api/transforms/orderTransform.js` | `buildBillPrintPayload` return (L1634-1695) — emits `gst_tax`, `cgst_amount`, `sgst_amount`, `vat_tax`, `delivery_charge`. No per-component GST breakdown. |
| **Backend print template** | The actual receipt is rendered from the payload by the backend. The backend template **must support the new fields** — frontend payload enrichment alone won't change the print unless backend renders them. |

## API Review
- Payload key enumeration depends on backend's print template. New keys needed match BUG-084's payload list.

## Socket / Realtime Review
None.

## State / Data Flow
1. CollectPaymentPanel computes per-component GST values.
2. Print Bill button forwards overrides → `buildBillPrintPayload`.
3. `buildBillPrintPayload` keeps the breakdown internal — emits composite `gst_tax`.
4. Backend renders bill from composite — no per-component lines.

## Relevant Final Documentation
- `MODULE_DECISIONS_FINAL.md` §14.
- Comment at `orderTransform.js:1684-1690`: "If the backend template doesn't yet read these fields they're harmless; per-component slot adoption tracked under Phase 3 CR (CR_013_P3_PRINT_TEMPLATE_PER_COMPONENT_TAX.md)."

## Current Code Behavior
- Printed bill shows only aggregate GST.

## Expected Behavior
- Printed bill shows per-component breakdown (item, SC, Tip, Delivery), each with CGST/SGST split.

## Root Cause Hypothesis
**Frontend payload + backend template gap — high-confidence hypothesis.** Same family as BUG-084. Cannot be fixed by frontend alone — backend print template must adopt the new fields. Owner intent is to activate "Phase 3 CR" referenced in the inline comment.

## Regression Risk Areas
- Existing print template renders current fields — adding new keys is additive but template must consume them.
- Bill total recompute risk — template must not double-count if both composite AND component fields are sent.
- Bill aesthetics — more lines means longer receipt; layout review needed.

## Docs / Code Mismatch
- Phase 3 deferral now activated by owner.

## Open Questions / Missing Information
- Backend template field expectations + adoption timeline.
- Whether to deprecate composite `gst_tax` or keep alongside.
- Owner approval of additional receipt height.

## User Interaction Required
**Required.** Backend confirmation + owner UX approval.

## Analysis Verdict
**Frontend payload + backend template gap.**

## Analysis Outcome
**Analysis Complete with Clarification Required.**

## Ready For Next Stage?
**No** (backend confirmation + owner UX approval).

## Next Step
Backend confirmation first; owner UX approval; bundle with BUG-083 + BUG-084 under CR-013 Phase 3.

---

# BUG-086 Impact Analysis

## Source
- **Intake Bug:** `/app/memory/BUG_TEMPLATE.md` lines 6319-6377
- **Sprint:** POS2.0
- **Evidence Folder:** No separate evidence folder found.
- **Final Docs Folder:** `/app/memory/final`
- **Google Sheet Status Before Analysis:** Not provided.

## User Reported Issue
**Confirm** the correct key name for the room order grand total in the payload — ensuring consistency between frontend and backend.

## Evidence Reviewed
- Intake entry BUG-086.
- `frontend/src/api/transforms/orderTransform.js` L1250-1256 (`collectBillExisting` room branch).
- `frontend/src/api/transforms/orderTransform.js` L671 (`order_amount` in `calcOrderTotals` return).
- Code comment at L1250-1255: "ROOM_CHECKIN_GAP3 (Stage 2, revised 2026-04-25): `order_amount` carries the full payable amount (food + associated + room balance) for room orders with a pending room balance. **User-confirmed field name on 2026-04-25** (replaces earlier `grand_total` candidate). Emitted only when `roomBalance > 0` to keep non-room flows byte-identical to pre-Stage-2 payloads."

## Module Mapping
- **Primary Module:** **5. Rooms** + **4. Order Entry / Cart / Payment Workflow**.
- **Downstream Impacted Modules:** Module 14 (Printing — also references `order_amount`).
- **Module decision reference:** §5 + §4. **OD-02 (room billing/print lifecycle) intersects.**

## Affected Route / Page
Embedded in dashboard.

## Affected Screen / Flow
Cashier collects bill on a room order that has a pending room balance. Payload includes `order_amount` carrying the full payable (food + associated + room balance).

## Affected Code Areas

| File | Reason |
| --- | --- |
| `frontend/src/api/transforms/orderTransform.js` | L1250-1256 — conditional emission of `order_amount` only when `roomBalance > 0` (preserving byte-identical payload for non-room cases). User-confirmed key name from 2026-04-25. |
| `frontend/src/api/transforms/orderTransform.js` | L671 — `order_amount: orderAmount` returned by `calcOrderTotals` as part of `...totals` spread. The L1256 conditional is **additive on top of that** for the room-balance scenario. |
| `frontend/src/api/transforms/orderTransform.js` | L1610, L1618, L1631 — `buildBillPrintPayload` references `order_amount` from associated orders + builds `roomFinalPaymentAmount`. |

## API Review
- `order_amount` is the user-confirmed key for room-with-balance grand total.
- BUG-086 is a **verification request** — code already implements the confirmed key.

## Socket / Realtime Review
None.

## State / Data Flow
- Room order with balance → `collectBillExisting` payload includes `order_amount: finalTotal`.
- Other room orders without balance: no `order_amount` override (preserves the `...totals.order_amount` from `calcOrderTotals` — which is food-only).

## Relevant Final Documentation
- **OD-02 (room billing/print lifecycle deferred)** — touches.
- Code comment at L1250-1255 explicitly cites the user confirmation date 2026-04-25.

## Current Code Behavior
- Uses `order_amount` key per the 2026-04-25 confirmation.

## Expected Behavior
- Confirm `order_amount` is still the correct key OR identify whether owner wants a different/additional key.

## Root Cause Hypothesis
**Verification request, not a defect — high-confidence.** Code already reflects the user-confirmed field name. The owner is re-asking for confirmation, possibly because a later backend change introduced ambiguity OR because the room billing/print lifecycle (OD-02) is being re-opened.

## Regression Risk Areas
- If owner has changed their mind on the key name, this would be a payload contract change — affects `collectBillExisting`, `buildBillPrintPayload`, `transferToRoom`, and possibly all room-aware payloads.
- BUG-063 / BUG-065 may pile additional room-related keys into the same payload — coordinate.

## Docs / Code Mismatch
None at code level. Confirmation trail at `orderTransform.js:1250-1255` is explicit.

## Open Questions / Missing Information
- Does owner want a change, or is this purely a verification ping?
- If verification only, can it be closed by reference to the 2026-04-25 confirmation?

## User Interaction Required
**Required.** Owner confirmation: verify-and-close OR specify a different key.

## Analysis Verdict
**Likely already resolved** (code matches user-confirmed contract).

## Analysis Outcome
**Duplicate / Already Covered** (verification only).

## Ready For Next Stage?
**Yes** (verify-and-close path) — pending owner confirmation.

## Next Step
Owner clarification first — confirm whether `order_amount` is still correct or needs change. **Strongly recommend bundling verification with BUG-063 / BUG-065 since all three are room billing/print lifecycle (OD-02).**

---

# Cross-Bug Summary — Sprint POS2.0 (UPDATED for full 37-bug set)

> **Note:** This summary supersedes the previous 25-bug summary. The intake later expanded to 37 bugs total (BUG-050 → BUG-086) via the 2026-05-16 second-batch addition (BUG-075 → BUG-086).

## 1. Bugs analyzed (37)
BUG-050, BUG-051, BUG-052, BUG-053, BUG-054, BUG-055, BUG-056, BUG-057, BUG-058, BUG-059, BUG-060, BUG-061, BUG-062, BUG-063, BUG-064, BUG-065, BUG-066, BUG-067, BUG-068, BUG-069, BUG-070, BUG-071, BUG-072, BUG-073, BUG-074, **BUG-075, BUG-076, BUG-077, BUG-078, BUG-079, BUG-080, BUG-081, BUG-082, BUG-083, BUG-084, BUG-085, BUG-086**.

## 2. Bugs ready for implementation planning (11)

| Bug | Why ready |
| --- | --- |
| BUG-051 | Frontend policy reversal — clear locus. Owner sign-off of BUG-009 reversal still needed but analysis complete. |
| BUG-054 | Frontend VAT discount-proration gap — clear. |
| BUG-055 | Frontend payload parity gap — clear. |
| BUG-062 | Frontend UI gate — single condition. |
| BUG-068 | Frontend socket reconnect rehydration — clear hypothesis. |
| BUG-070 | Frontend rendering / data-shape gap — clear. |
| BUG-071 | Frontend display gap — needs audit list but scope clear. |
| BUG-073 | Frontend conditional render fix — trivial. |
| **BUG-075** | Frontend financial-rule scope gap (tip applicability) — mirror BUG-013 SC pattern. |
| **BUG-079** | Configuration change — single constant. |
| **BUG-080** | Frontend payload-builder gap — clear fix locus (paymentMethods config plumbing). |

## 3. Bugs needing owner clarification (15)

| Bug | What owner must clarify |
| --- | --- |
| BUG-050 | Repro order + payloads / screenshots of mismatched bills. |
| BUG-052 | Backend round-off config field name + value enum + default. |
| BUG-053 | Screenshot of the hardcoded percentage; which row. |
| BUG-056 | Picker UX for preset discount categories + mutual-exclusivity rule. |
| BUG-057 | UX intent on OrderCard (replace Settle? add alongside?). |
| BUG-058 | Failed API response + UX intent for prepaid Hold payment method coverage. |
| BUG-059 | UX surface + cancelled-bill content choice + permission gate. |
| BUG-060 | Backend socket emission inventory after `order-shifted-room`. |
| BUG-061 | Which surface (Audit vs Rooms Report) + scope. |
| BUG-063 | Enumeration of required keys + backend field-name contract. |
| BUG-064 | Backend FCM payload differentiation + owner UX choice. |
| BUG-065 | Backend `firm_name`/`firm_gst` echo confirmation + UX mapping. |
| BUG-066 | Which exact surface the owner is referring to. |
| BUG-067 | Definition of "restaurant ready configuration" + UX intent. |
| BUG-069 | Architecture-level choice between Option 1 / Option 2. |
| BUG-072 | Backend confirmation + UX intent. |
| BUG-074 | Security-sensitive intent (password autofill vs. token vs. browser). |
| **BUG-077** | Owner repro of phone-trim failure (likely already-resolved). |
| **BUG-078** | UX preference for visible-error pattern + retry policy. |
| **BUG-081** | Confirm scope (any other "snooze" surfaces?) — value already correct. |
| **BUG-082** | Exact intent of "index 4 as primary web source" — ambiguous wording. |
| **BUG-086** | Verify-and-close OR specify a different key. |

## 4. Bugs needing backend confirmation (12)

BUG-050, BUG-052, BUG-058, BUG-060, BUG-061, BUG-063, BUG-064, BUG-065, BUG-072, **BUG-082, BUG-083, BUG-084, BUG-085**.

## 5. Bugs likely frontend-only (15+)
BUG-051, BUG-053 (likely already correct), BUG-054, BUG-055, BUG-056, BUG-057 (dashboard part), BUG-062, BUG-066 (likely already correct), BUG-067, BUG-068, BUG-070, BUG-071, BUG-073, BUG-074 (depending on owner choice), **BUG-075, BUG-077 (likely already correct), BUG-078, BUG-079, BUG-080, BUG-081 (likely already correct)**.

## 6. Bugs likely backend / API-contract dependent (10)
BUG-052, BUG-058, BUG-060, BUG-063, BUG-064, BUG-065, BUG-072, **BUG-082, BUG-083, BUG-084, BUG-085**.

## 7. Bugs involving report / export logic (3)
BUG-058 (Audit Hold drawer payload), BUG-059 (Audit print bill option), BUG-061 (Audit room check-in time).

## 8. Bugs involving socket / state / context (4)
BUG-060, BUG-068, BUG-069, **BUG-082**.

## 9. Duplicates / cross-references identified

| Sprint POS2.0 bug | Related bug | Verdict |
| --- | --- | --- |
| BUG-051 | BUG-009 (Round-off — closed) | **Policy reversal** — not duplicate, but supersedes BUG-009. |
| **BUG-076** | **BUG-051** | **Exact duplicate** — same code, same policy reversal. Fold into BUG-051's plan. |
| BUG-057 | BUG-005 (closed as "not a business requirement") | **Policy reversal**. |
| BUG-058 | BUG-042-A/B/C (Hold UPI payment) | **Related but distinct** — prepaid branch not covered. |
| BUG-066 | BUG-062 | **Partial overlap** — both modals already correct for inspected surfaces. |
| BUG-071 | BUG-032 (Restaurant Order ID — closed) | **Coverage gap** — closure was incomplete for OrderCard / OrderEntry chip surfaces. |
| **BUG-077** | n/a | **Likely already resolved** — service layer already trims. |
| **BUG-081** | CR `SNOOZE_SOUND_STOP_AND_DURATION` (Jan-2026, closed) | **Likely already resolved** — value already 120,000 ms. |
| **BUG-084** | BUG-053 | **Sibling** — UI already correct; payload gap. Different scope from BUG-053 (which was item-row label). |
| **BUG-085** | BUG-084, BUG-083 | **Sibling** — same CR-013 Phase 3 family. |
| **BUG-086** | ROOM_CHECKIN_GAP3 Stage 2 (user-confirmed 2026-04-25) | **Verification only** — already implements confirmed contract. |

## 10. Recommended implementation buckets (UPDATED)

### Bucket A — Quick frontend fixes (no owner/backend gating)
- BUG-054 (VAT discount proration)
- BUG-055 (`order_discount_type` parity for prepaid)
- BUG-062 (To-Room button gate)
- BUG-073 (Empty customization line)
- **BUG-075 (Tip scope — mirror BUG-013 SC pattern)**
- **BUG-079 (Miss threshold 2 → 1)**

### Bucket B — Frontend policy reversals (owner sign-off only)
- BUG-051 + **BUG-076 (duplicate — fold into BUG-051)**
- BUG-070
- BUG-071
- **BUG-080 (paymentMethods filter)** — depends on backend tolerance confirmation, but minimal risk.

### Bucket C — Socket / state-sync
- BUG-060
- BUG-068
- BUG-069
- **BUG-082** (after backend confirmation)

### Bucket D — Audit Report enhancements
- BUG-058
- BUG-059
- BUG-061

### Bucket E — Room billing / print (OD-02 un-defer)
- BUG-063 + **BUG-086 (verification — same family)**
- BUG-064
- BUG-065

### Bucket F — CR-013 Phase 3 GST per-component breakdown (NEW — all sibling bugs)
- **BUG-083 (delivery_charge_gst_amount separate key)**
- **BUG-084 (CGST/SGST split across ALL GST types)**
- **BUG-085 (Print bill full GST breakdown)**

### Bucket G — Configuration / governance
- BUG-052
- BUG-056
- BUG-067

### Bucket H — CRM module (NEW)
- **BUG-077 (likely-resolved confirmation)**
- **BUG-078 (visible error on CRM timeout)**

### Bucket I — Specific clarification-blocked / already-resolved
- BUG-050 (owner repro)
- BUG-053 (likely already-resolved)
- BUG-057 (owner UX)
- BUG-066 (likely already-resolved)
- BUG-072 (backend + owner)
- BUG-074 (owner security intent)
- **BUG-081 (likely already-resolved — verify scope)**

## 11. Recommended first implementation bucket

**Bucket A (Quick frontend fixes)** remains the lowest-risk, highest-velocity start. The added bugs (BUG-075, BUG-079) expand the bucket to **6 bugs**:
- **BUG-054 + BUG-055 + BUG-062 + BUG-073 + BUG-075 + BUG-079**
- Bundle into a single implementation plan with one regression checkpoint (financial-math + reconciliation test pass).

**Bucket F (CR-013 Phase 3)** becomes the second-most-attractive bucket once backend confirms field names — three sibling bugs share the same code path, similar regression surface, single coordinated PR.

## 12. Docs read (CUMULATIVE)

**From `/app/memory/final/`** (same as before):
- `FINAL_DOCS_APPROVAL_STATUS.md`, `ARCHITECTURE_DECISIONS_FINAL.md`, `MODULE_DECISIONS_FINAL.md`, `IMPLEMENTATION_AGENT_RULES.md`, `CHANGE_REQUEST_PLAYBOOK.md`, `OPEN_QUESTIONS_FINAL_RESOLUTION.md`.

**From `/app/memory/change_requests/`** (same as before plus referenced):
- `BASELINE_RECONCILIATION_REPORT_2026_05_04.md`, `FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md`, `PENDING_TASK_REGISTER_2026_05_04.md`, `PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md`, `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md`, `LAST_SPRINT_CODE_FIX_VALIDATION_2026_05_06.md`, `CR_011_PG_SCAN_SERVE_PAYMENTTYPE_CASE_MISMATCH.md`, `CR_013_GST_CONFIG_CORRECTION.md`, `REPORTS_FIELD_MAPPING_TRACKER.md`.
- **Additional referenced for new bugs:** `order_polling_reconciliation_investigation/*` (BUG-079), POS2-002-P4-FU-01 history (BUG-082), CR-013 Phase 3 deferral note (BUG-083/084/085).

**From `/app/memory/` root:**
- `BUG_TEMPLATE.md` lines 4145-6376 (sprint POS2.0 intake — full 37-bug set).

**From `/app/memory/bugs/`:**
- `BUG_032_SMOKE_SIGNOFF.md` (BUG-071 sibling).

**Additional code files inspected for new bugs:**
- `frontend/src/api/services/customerService.js` (BUG-077, BUG-078).
- `frontend/src/api/crmAxios.js` (BUG-078).
- `frontend/src/hooks/useOrderPollingReconciliation.js` (BUG-079).
- `frontend/src/api/socket/socketEvents.js` (BUG-082 — `MSG_INDEX`).
- All previously-inspected files re-cross-referenced for new bugs.

## 13. Baseline conflicts found (UPDATED — 7 total)

| # | Conflict | Sources | Resolution |
| --- | --- | --- | --- |
| 1 | BUG-051 / BUG-052 / **BUG-076** reverse the BUG-009 frozen policy (2026-05-05). | Code comments at `CollectPaymentPanel.jsx:579-580` + `orderTransform.js:655-656`. | Policy reversal — record explicitly in implementation plan. |
| 2 | BUG-063 / BUG-065 / **BUG-086** require resolving **OD-02 (room billing/print lifecycle, deferred)**. | `FINAL_DOCS_APPROVAL_STATUS.md` §5 OD-02. | Must un-defer OD-02 with owner sign-off. |
| 3 | BUG-053 / BUG-066 / **BUG-077 / BUG-081** intake descriptions do not match current code behavior. | Bug intake claims vs. file inspection. | Owner reproduction needed to confirm or close as already-resolved. |
| 4 | BUG-071 broadens BUG-032 (closed) coverage. | `BUG_032_SMOKE_SIGNOFF.md` vs. current code in OrderCard.jsx / OrderEntry.jsx. | Closure was incomplete; extend coverage without regressing 5 verified surfaces. |
| 5 | BUG-070 partial conflict with CR-001 CS-16..CS-22 (rooms moved to `/reports/rooms`). | CR-001 closure + BUG-061 / BUG-070 intake. | No actual conflict — scope is dashboard view; CR-001 closure intact. |
| 6 | **BUG-083 / BUG-084 / BUG-085 activate the CR-013 Phase 3 deferral** documented in code comments at `orderTransform.js:640-643` and `orderTransform.js:1684-1690`. | Inline comments. | Phase 3 effectively unparked — coordinate backend contract before frontend ships. |
| 7 | **BUG-079 reduces the safety-net threshold** defined in `useOrderPollingReconciliation.js` anti-rule list ("Two consecutive missing polls required before removal"). | `useOrderPollingReconciliation.js:L13` comment + L34 constant. | Policy reduction — record explicitly; update comments and investigation plan docs post-fix. |

