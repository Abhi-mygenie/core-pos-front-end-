# QA BUG DOCUMENTATION

# Bug Summary Table

| Bug ID | Title | QA Status | Impl Status | Key Files |
| --- | --- | --- | --- | --- |
| BUG-001 | Prepaid Auto Bill Print — Payload Missing Tip and Discount | **Fixed (Apr-2026)** — autoPrintOverrides now passed with live paymentData values | Close | `OrderEntry.jsx`, `CollectPaymentPanel.jsx`, `orderService.js`, `orderTransform.js` |
| BUG-002 | Postpaid Collect Bill — Auto Bill Print Not Triggered (no order-temp-store call) | **Fixed (Apr-2026)** — AutoPrintCollectBill path added after successful collect-bill | Close | `OrderEntry.jsx`, `orderService.js`, `orderTransform.js`, `constants.js` |
| BUG-003 | Credit on Walk-in — Name Field Auto-Fills “Walk-In” | **Fixed (Apr-2026)** — uses `customerName` (actual name) instead of display label | Close | `OrderEntry.jsx`, `CollectPaymentPanel.jsx`, `orderTransform.js` |
| BUG-004 | Split Bill — Total Amount Wrong in Equally and By Person | **Fixed (Apr-2026)** — uses `grandTotal` from CollectPaymentPanel as authoritative total | Close | `SplitBillModal.jsx`, `OrderEntry.jsx`, `CollectPaymentPanel.jsx` |
| BUG-005 | Print Bill Button Missing on Prepaid Orders in Collect Bill Screen | **Closed — not a business requirement** | Close | n/a |
| BUG-006 | Service Charge Calculated Before Discount (Should Be After Discount, Then Taxes) | **Fixed (Apr-2026)** — AD-101 implemented, GST extended to SC/tip/delivery | Close | `CollectPaymentPanel.jsx`, `orderTransform.js` |
| BUG-007 | Place Order Payload for Delivery Orders Missing Full `delivery_address` Object | **Fixed frontend (Apr-2026)** — backend persistence pending | Close | `orderTransform.js`, `OrderEntry.jsx` |
| BUG-008 | Online Order — Confirm Button Not Working | **Closed — already working** | Close | n/a |
| BUG-009 | Rounding Off — Inverted Logic (₹1.06 Rounds to ₹2 Instead of ₹1) | **FIXED (Apr-2026)** — fractional-part-based rounding | Close | `CollectPaymentPanel.jsx`, `orderTransform.js` |
| BUG-010 | Discount and Tip Fields — No Programmatic Max Validation (Allows >100% Discount) | **FIXED (Apr-2026)** — JS-enforced validation added | Close | `CollectPaymentPanel.jsx` |
| BUG-011 | Scan & Order — Confirm Fails with HTTP 500 (Backend BadMethodCallException) | **Confirmed — Backend bug** — HTTP 500 BadMethodCallException on delivery orders; dine-in works | Open | `DashboardPage.jsx`, `orderService.js`, `constants.js`, `OrderCard.jsx` |
| BUG-012 | Delivery Order Edit — Address Not Showing in UI and Not Printing on Bill | **FIXED (print path, Apr-2026)** — selectedAddress injected into print overrides; backend persistence still pending | Close | `OrderEntry.jsx`, `orderTransform.js` (`buildBillPrintPayload`) |
| BUG-013 | Service Charge Applied to Takeaway and Delivery (Should Be Dine-In and Room Only) | **FIXED (Apr-2026)** — SC gated by orderType (dineIn/walkIn/room only) | Close | `CollectPaymentPanel.jsx`, `orderTransform.js`, `OrderEntry.jsx` |
| BUG-014 | GST Not Applied on Tip Amount | **Closed — confirmed working by user (Apr-2026)** | Close | `CollectPaymentPanel.jsx`, `orderTransform.js` |
| BUG-015 | Loyalty, Coupon Code, and Wallet Shown on Collect Bill — Feature Flags Not Gating Visibility | **FIXED (Apr-2026)** — gated by profile settings | Close | `CollectPaymentPanel.jsx` |
| BUG-016 | Delivery Payload Being Sent on Non-Delivery Order Types (dine-in, etc.) | **FIXED frontend workaround (Apr-2026)** — `delivery_address: null` always emitted; backend `isset()` guard pending | Close (backend open) | `api/transforms/orderTransform.js` |
| BUG-017 | Quantity Input — Amount Not Updating When Qty Is Typed (Items with Variants / Add-ons) | Confirmed — stale `item.totalPrice` baked at add-time is not recomputed on qty change; affects display + local subtotal/tax previews | Open | `components/order-entry/OrderEntry.jsx`, `components/order-entry/CartPanel.jsx`, `components/order-entry/ItemCustomizationModal.jsx` |



> Code is the source of truth. Each entry below has been verified against the current `/app/frontend/src` codebase. Expected behavior is taken from user input and cross-referenced against `app/memory/ARCHITECTURE_DECISIONS_FINAL.md` where relevant.

---

## BUG-001 / Prepaid Auto Bill Print — Payload is Missing Tip and Discount

**User Reported Issue**
- When a prepaid order is taken, the auto bill print fires correctly, but the outgoing payload only contains the service charge. `tip` and `discount_amount` are not being sent.

**QA Status**
- Confirmed (partially for `tip` — see Dependencies).

**Current Code Behavior**
- Prepaid (Scenario 2 — new order + pay in one shot) flow in `OrderEntry.jsx` `onPaymentComplete` (lines ~1054–1136):
  1. Calls `orderToAPI.placeOrderWithPayment(...)` and POSTs `/api/v2/vendoremployee/order/place-order`. The place-order payload itself DOES include `tip_amount`, `self_discount`, `coupon_discount`, `comm_discount`, `order_discount`, `discount_value` (see `orderTransform.js` lines ~774–791), so the backend receives tip/discount at order creation time.
  2. After order settles in context, `autoPrintNewOrderIfEnabled(newOrderId)` is invoked (line ~1134). It calls `printOrder(Number(newOrderId), 'bill', null, order, restaurant?.serviceChargePercentage || 0)` — **no `overrides` object is passed**.
- `printOrder` (`orderService.js` line 132) hands off to `buildBillPrintPayload(order, serviceChargePercentage, overrides={})` (`orderTransform.js` line 867) and POSTs `/api/v1/vendoremployee/order-temp-store`.
- Inside `buildBillPrintPayload`, when `overrides` is empty:
  - `serviceChargeAmount` (line 906–910) → computed as `computedSubtotal * serviceChargePercentage / 100`, OR `order.serviceTax`. **Gets a value.**
  - `discount_amount` (line 975) → `overrides.discountAmount !== undefined ? overrides.discountAmount : 0`. **Hardcoded to `0` when overrides absent.** There is no fallback to any order field.
  - `Tip` (line 997) → `overrides.tip !== undefined ? overrides.tip : (order.tipAmount || 0)`. Depends on `order.tipAmount`, which comes from socket-hydrated `orderTransform.order()` line 175 (`tipAmount: parseFloat(api.tip_amount) || 0`).
- Consequence for the outgoing `order-temp-store` payload on prepaid auto-print:
  - `serviceChargeAmount` → populated.
  - `discount_amount` → always `0`.
  - `Tip` → `0` unless the socket/GET single-order echoes `tip_amount` back on the freshly-placed order.

**Expected Behavior**
- The auto bill print payload for prepaid orders should include the tip and discount values that were collected in `CollectPaymentPanel` (these are already available locally as `tip`, `manualDiscount`, `presetDiscount`, `couponDiscount`, `totalDiscount`).

**Gap Observed**
- Auto-print prepaid path deliberately calls `printOrder` **without** overrides (OrderEntry.jsx line 993 comment: *“buildBillPrintPayload default branch maps socket fields”*).
- `buildBillPrintPayload`'s default branch has **no discount mapping at all** (hardcoded `0`), and tip mapping depends on a socket field that is not guaranteed to round-trip on the initial new-order event.
- The `handlePrintBill` manual path in `CollectPaymentPanel` (lines 360–384) already composes and passes the correct `overrides` (`discountAmount`, `loyaltyAmount`, `walletAmount`, `tip`, `serviceChargeAmount`, etc.). The prepaid auto-print path does not reuse this composition.

**Impacted Areas**
- Modules: Billing, Auto Bill Print, Prepaid Order
- Screens / Flows: OrderEntry → Collect Payment → Place+Pay (prepaid) → auto bill print
- Components / Hooks / Utilities:
  - `OrderEntry.onPaymentComplete` → `autoPrintNewOrderIfEnabled`
  - `orderService.printOrder`
  - `toAPI.buildBillPrintPayload`

**Files Reviewed**
- `frontend/src/components/order-entry/OrderEntry.jsx` (lines 943–1178, esp. 994–1037, 1054–1136)
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (lines 305–384)
- `frontend/src/api/services/orderService.js` (lines 132–151)
- `frontend/src/api/transforms/orderTransform.js` (lines 117–180, 867–1004, 774–798)
- `frontend/src/api/constants.js` (PRINT_ORDER = `/api/v1/vendoremployee/order-temp-store`)

**Code Evidence Summary**
- `autoPrintNewOrderIfEnabled` calls `printOrder` with only 5 arguments — no `overrides` (OrderEntry.jsx lines 1026–1032).
- `buildBillPrintPayload` default branch returns `discount_amount: 0` when `overrides.discountAmount` is undefined (orderTransform.js line 975).
- `Tip` in print payload defaults to `order.tipAmount`, which is derived solely from socket field `api.tip_amount` (orderTransform.js lines 175 + 997).
- No code path in the prepaid auto-print flow propagates `CollectPaymentPanel`'s `tip`, `manualDiscount`, `presetDiscount`, `couponDiscount`, `totalDiscount` into the `order-temp-store` payload.

**Dependencies / External Validation Needed**
- Backend dependency: Whether the backend's socket new-order / single-order fetch echoes `tip_amount` (and any discount field like `restaurant_discount_amount` / `discount_value`) back to the client for a freshly placed prepaid order. If it does, `Tip` could ride in via `order.tipAmount`, but `discount_amount` still needs frontend work because `buildBillPrintPayload` does not read any discount field from `order`.
- API dependency: `/api/v1/vendoremployee/order-temp-store` contract for `discount_amount` and `Tip`.
- Socket dependency: `new-order` / `order-engage` payload shape.
- Payload dependency: `overrides` not provided on prepaid auto-print call.
- Config dependency: `settings.autoBill` must be truthy for this flow to execute.

**Reproduction Understanding**
- Step 1: Enable `settings.autoBill` for the restaurant.
- Step 2: Start a new order with discount and a tip, select Place+Pay (prepaid) in Collect Payment.
- Step 3: Complete payment. Observe the auto-print payload fired to `/api/v1/vendoremployee/order-temp-store` — `serviceChargeAmount` is present; `discount_amount` is `0` and `Tip` is `0`.

**Open Questions / Unknowns**
- Does the backend accept `tip` and `discount_amount` from the frontend on auto-print, or is it expected to rely on server-side state? (Gap between code and product expectation.)
- Does the socket / GET-single-order actually echo `tip_amount` for fresh prepaid orders? Empirical verification needed to know whether the tip gap is always-present or only-sometimes-present.

**Notes**
- Scope is prepaid (Scenario 2) new-order path only. Scenario 1 (collect-bill on existing order) does not auto-print at all — see BUG-002.
- The manual “Print Bill” button in `CollectPaymentPanel` (`handlePrintBill`) already supplies `discountAmount`, `tip`, etc. as overrides and is NOT affected by this bug.

---

## BUG-002 / Postpaid Collect Bill — Auto Bill Print Not Triggered (order-temp-store API Not Called)

**User Reported Issue**
- On a postpaid order, when staff goes to Collect Payment, only the order bill payment API is called. The order disappears from the screen (payment marked collected), but auto bill print does not happen. The user states the order-temp-store API should also be called after collect-bill to trigger the auto print.

**QA Status**
- Confirmed.

**Current Code Behavior**
- `OrderEntry.jsx` `onPaymentComplete` Scenario 1 (existing postpaid order → collect bill) is at lines 1137–1170.
- Only one API call is made: `api.post(API_ENDPOINTS.BILL_PAYMENT, payload)` → POST `/api/v2/vendoremployee/order/order-bill-payment`.
- Inline comment on lines 1140–1142:  
  *“BUG-273 (Session 16): auto-print NOT fired here. Per product contract, auto-bill is scoped to new-order only. Manual 'Print Bill' button in CollectPaymentPanel handles printing for this scenario.”*
- `printOrder` (which hits `/api/v1/vendoremployee/order-temp-store` = the order-temp-store API the user refers to) is not invoked in this branch at all.
- Consequence: after a successful postpaid collect-bill, the order is cleared from the screen (on engage socket) but no `order-temp-store` call is made, so auto bill print never fires.

**Expected Behavior** (per user input)
- After a successful postpaid bill collection, the frontend should also invoke the order-temp-store (PRINT_ORDER) API so that auto bill print fires — matching the behavior on the prepaid / new-order path.

**Gap Observed**
- A deliberate code decision (commented at lines 1140–1142) scopes auto-print to new-order only. The user's current expectation contradicts this decision; product contract has shifted.
- `billing_auto_bill_print: 'Yes'` is sent in the collect-bill payload (`orderTransform.collectBillExisting` line 756) when `settings.autoBill` is on, but that flag alone is not driving a printout on the client because the frontend is not calling `order-temp-store`.

**Impacted Areas**
- Modules: Billing, Auto Bill Print, Postpaid Order, Collect Payment
- Screens / Flows: Dashboard → Active order → Collect Payment → confirm payment on existing order
- Components / Hooks / Utilities:
  - `OrderEntry.onPaymentComplete` (Scenario 1 branch)
  - `orderService.printOrder`
  - `toAPI.collectBillExisting`
  - `toAPI.buildBillPrintPayload`

**Files Reviewed**
- `frontend/src/components/order-entry/OrderEntry.jsx` (lines 1137–1178)
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (lines 305–384)
- `frontend/src/api/services/orderService.js` (lines 132–151)
- `frontend/src/api/transforms/orderTransform.js` (lines 680–810 — `collectBillExisting`)
- `frontend/src/api/constants.js` (`BILL_PAYMENT`, `PRINT_ORDER` = `order-temp-store`)

**Code Evidence Summary**
- Only one network call is executed in the postpaid collect-bill success path: `api.post(API_ENDPOINTS.BILL_PAYMENT, payload)` (OrderEntry.jsx line 1154).
- There is no subsequent or parallel call to `printOrder` / `API_ENDPOINTS.PRINT_ORDER` in the `.then` or anywhere in the Scenario 1 branch.
- Comment at line 1140 explicitly documents that auto-print is intentionally not called in this flow; manual “Print Bill” is the only intended trigger for collect-bill.

**Dependencies / External Validation Needed**
- Backend dependency: Whether `order-bill-payment` alone is supposed to trigger the printer via `billing_auto_bill_print: 'Yes'`, or whether the frontend is genuinely expected to call `order-temp-store` as a separate step. (Product-contract question — code today assumes manual.)
- API dependency: `/api/v1/vendoremployee/order-temp-store` (printer-side).
- Socket dependency: None — the missing call is purely frontend-driven.
- Payload dependency: If `order-temp-store` is to be called, the payload must include the LIVE bill values from `CollectPaymentPanel` (same shape as `handlePrintBill` override object) because `buildBillPrintPayload` default branch does not include discount_amount (see BUG-001).
- Config dependency: `settings.autoBill` flag must gate this.

**Reproduction Understanding**
- Step 1: Enable `settings.autoBill` for the restaurant.
- Step 2: Place a postpaid order (e.g., Dine-In without Place+Pay). Wait for it to be listed as an active postpaid order.
- Step 3: From the order, choose Collect Payment and confirm payment.
- Observed: Payment is collected, order is removed from the screen, but no print payload is sent to `/api/v1/vendoremployee/order-temp-store`. Auto bill print does not fire.

**Open Questions / Unknowns**
- Is the expected auto-print trigger the `billing_auto_bill_print: 'Yes'` flag on the backend (i.e., server fires the printer), or a separate frontend `order-temp-store` call (as user states)?
- If frontend call is expected, which payload flavor — with or without `overrides` derived from `CollectPaymentPanel` state?

**Notes**
- Manual “Print Bill” in `CollectPaymentPanel` (BUG-277) is the only way to print in this flow today.
- Any fix must coordinate with BUG-001 because that bug establishes that the no-overrides auto-print branch cannot emit `tip`/`discount_amount` correctly. A naive addition of a `printOrder` call without overrides here would inherit BUG-001's gaps.

---

## BUG-003 / Credit Payment on Walk-in Order — Name Field Auto-Fills With “Walk-In”

**User Reported Issue**
- On a postpaid walk-in order, when the user reaches Collect Payment and chooses Credit as the payment method, the Name field is pre-filled with “Walk-in” by default. The user states this should not happen (the field should stay empty, so staff can capture the credit customer's real name).

**QA Status**
- Confirmed.

**Current Code Behavior**
- `orderTransform.order()` sets `customer` (display label) to `'Walk-In'` for walk-in orders when no actual customer name is present:
  - `orderTransform.js` line 122: `const isWalkIn = !api.table_id || api.table_id === 0;`
  - Line 142: `customerLabel = isWalkIn ? 'Walk-In' : '';`
  - Line 165: `customer: customerLabel` (so `orderData.customer === 'Walk-In'` for walk-ins).
- `OrderEntry.jsx` hydrates its local `customer` state from `orderData`:
  - Line 234: `name: orderData.customer !== 'WC' ? (orderData.customer || '') : ''`
  - Line 263: same pattern.
  - The guard checks against the literal `'WC'`, but the transform emits `'Walk-In'` (not `'WC'`). Therefore, for walk-in orders, `customer.name` in local state becomes `'Walk-In'`.
- `CollectPaymentPanel.jsx` line 160: `const [tabName, setTabName] = useState(customer?.name || "");`
  - `tabName` is seeded from the pre-populated `customer.name`, so it initializes to `'Walk-In'` on walk-in orders.
- `tabName` is used as the Credit/TAB Name field value (line 1492) and is only visible when `isTabPayment` (credit or API-named “tab”) is active (line 1485, gated by `isTabPayment && !showSplit`).
- Net effect: for a walk-in postpaid order, opening Credit as the payment method shows a Name input already filled with “Walk-In”.

**Expected Behavior**
- When payment method is Credit and the order is a walk-in, the Name field should start empty so staff can enter the real credit customer's name. Default auto-fill of “Walk-In” should not occur.

**Gap Observed**
- The OrderEntry hydration guard (`!== 'WC'`) is not aligned with the transform's actual walk-in label (`'Walk-In'`). The same mis-match would also leak the labels `'TA'` (TakeAway, line 136 of transform) and `'Del'` (Delivery, line 139) into `customer.name` when the user did not enter a real name — although the user only reported the walk-in case.

**Impacted Areas**
- Modules: Billing, Collect Payment, TAB/Credit, Walk-in Orders
- Screens / Flows: Walk-in order → Collect Payment → Credit payment method → Name field
- Components / Hooks / Utilities:
  - `OrderEntry` customer-state hydration (`setCustomer(...)` at lines 233–236 and 262–265)
  - `CollectPaymentPanel` `tabName` initialization (line 160)
  - `orderTransform.order()` (lines 131–165 — source of the `'Walk-In'` label)

**Files Reviewed**
- `frontend/src/components/order-entry/OrderEntry.jsx` (lines 103, 220–285, 1148, 1465)
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (lines 160–167, 1485–1530)
- `frontend/src/api/transforms/orderTransform.js` (lines 117–180)

**Code Evidence Summary**
- `orderTransform.order()` outputs `customer: 'Walk-In'` for walk-in orders.
- `OrderEntry.jsx` stores that into `customer.name` because the `!== 'WC'` guard does not match `'Walk-In'`.
- `CollectPaymentPanel.jsx` initializes `tabName` from `customer.name`, so the Credit Name field is pre-filled with `'Walk-In'`.
- The Credit Name UI is gated by `isTabPayment`, so the pre-fill is visually observable only when Credit (or API-named “tab”) is selected.

**Dependencies / External Validation Needed**
- Backend dependency: None — this is a pure frontend initialization issue.
- API dependency: None.
- Socket dependency: None.
- Payload dependency: Note that on submit, `collectBillExisting` sends `name: tabContact?.name` (orderTransform.js line 796). If the user doesn't clear the field manually, the literal string `'Walk-In'` will be sent to the backend as the credit customer name.
- Config dependency: None.

**Reproduction Understanding**
- Step 1: Start a walk-in postpaid order (no customer name captured).
- Step 2: Place the order, then open Collect Payment.
- Step 3: Select Credit (or the dynamic payment type named `tab`/`TAB`) as payment method.
- Observed: The Name input under the Credit section is already filled with `'Walk-In'`.

**Open Questions / Unknowns**
- Product expectation for TakeAway (`customer === 'TA'`) and Delivery (`customer === 'Del'`) — same leak exists; user only reported walk-in. Unclear if those should also be cleared.
- Whether the backend relies on receiving a non-empty `name` on Credit submissions (i.e., add empty-guard as a separate UX/business rule).

**Notes**
- Related but distinct from BUG-001/002: this is a UX/data-quality issue, not a print/payload completeness issue.

---

## BUG-004 / Split Bill — Total Amount Shown Wrong in “Equally” and “By Person” Sections

**User Reported Issue**
- In the Split Bill modal, the total amount is showing wrong in both the Equally section and the By Person section.

**QA Status**
- Confirmed.

**Current Code Behavior**
- `SplitBillModal.jsx` computes its displayed total as:
  - Line 56: `const totalBill = items.reduce((sum, item) => sum + (item.price || 0), 0);`
  - The modal displays `totalBill` (By Person summary, lines 443–454) and divides it by `equalSplitCount` (Equally mode, lines 467, 503). Each person's total in By Person (line 332) uses `personTotals` which is derived from `unitPrice = item.unitPrice || item.price / item.qty` (line 47) × assigned qty.
- The `items` prop is built in `OrderEntry.jsx` at lines 1492–1498:
  ```js
  items={cartItems.filter(i => i.placed && i.status !== 'cancelled').map(item => ({
    id: item.id,
    name: item.name,
    qty: item.qty,
    price: item.price || (item.unitPrice * item.qty),
    unitPrice: item.unitPrice || item.price / item.qty,
  }))}
  ```
  `SplitBillModal` therefore expects `price` to be the line total and `unitPrice` to be the unit price. The mapping uses `item.price || (item.unitPrice * item.qty)` — but in the cart-item shape used elsewhere in the app (e.g., `CollectPaymentPanel` lines 89–101 inside `getItemLinePrice`), `item.price` is the **unit price** and line total is computed as `item.price * item.qty` plus addon/variation surcharges. So when `item.price` is a truthy unit price (i.e., most items), the fallback `item.unitPrice * item.qty` is never reached and the split modal treats the unit price as if it were the line total. For any item with `qty > 1` or with addons/variations, this under-reports both `totalBill` and each person's assignment.
- The `totalBill` calculation includes **only** item subtotal. It does not include:
  - Discount / coupon / loyalty / wallet (`manualDiscount`, `presetDiscount`, `couponDiscount`, `loyaltyDiscount`, `walletDiscount` in `CollectPaymentPanel`).
  - Service charge (`serviceCharge`, gated by `serviceChargeEnabled` toggle and `restaurant.features.serviceCharge`).
  - Tax (`sgst`, `cgst`, VAT, tax on service charge).
  - Tip (`tipEnabled` + `tipInput`).
  - Delivery charge (for delivery orders).
  - Round-off.
- Therefore, the split modal's total does not match the grand total the customer sees/pays in `CollectPaymentPanel`.
- Equal mode's per-person value (line 503: `Math.round(totalBill / equalSplitCount)`) is derived from the same (wrong) `totalBill`, so it inherits the same error.
- By Person mode uses `unitPrice × qty` per assignment (line 48), so even internal accounting for add-ons / variations is missing — `unitPrice = item.unitPrice || item.price / item.qty` does not incorporate addon or variation amounts that the rest of the codebase accounts for in `getItemLinePrice` (CollectPaymentPanel lines 89–101).

**Expected Behavior** (per user input + ARCHITECTURE_DECISIONS_FINAL.md)
- Split Bill should surface a total equal to the order's grand total (post discount + service charge + tax + tip + delivery + round-off), and each split share (Equally or By Person) should be derived from that single source of truth. By Person rows should use the same per-item line price logic (including addons/variations) that the main bill uses.

**Gap Observed**
- `SplitBillModal.totalBill` is an items-only subtotal, not the grand total. It does not consult the order's final totals (which live in `CollectPaymentPanel` or the order-level `amount`/`subtotalAmount` from the socket).
- The `price || (unitPrice * qty)` mapping in `OrderEntry.jsx` passes unit price as if it were line total whenever `item.price` is truthy (which it is for every non-zero item). This is an incorrect assumption about cart-item shape and it is inconsistent with how `CollectPaymentPanel` treats `item.price`.
- Addon and variation amounts are not contributing to either `totalBill` or `personTotals` in the split modal.

**Impacted Areas**
- Modules: Billing, Split Bill (Equally + By Person)
- Screens / Flows: OrderEntry → Split Bill modal → Equally / By Person
- Components / Hooks / Utilities:
  - `SplitBillModal` — `totalBill`, `personTotals`, `assignedTotal`, `unassignedTotal` (lines 40–58, 332, 443–454, 467, 503)
  - `OrderEntry.jsx` items mapping to `SplitBillModal` (lines 1492–1498)

**Files Reviewed**
- `frontend/src/components/modals/SplitBillModal.jsx` (entire file)
- `frontend/src/components/order-entry/OrderEntry.jsx` (lines 83, 1329, 1487–1548)
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (lines 89–243 — reference for correct line-price logic)
- `frontend/src/api/transforms/orderTransform.js` (cart item shape)

**Code Evidence Summary**
- `totalBill` sums `item.price` only (no tax, no service charge, no tip, no discount, no delivery, no round-off) — `SplitBillModal.jsx` line 56.
- The caller's map (`OrderEntry.jsx` line 1496) hands over `item.price` un-multiplied when it is truthy, even though cart `item.price` is stored as unit price elsewhere in the app.
- `personTotals` uses `unitPrice * qty` only — no addons/variations — `SplitBillModal.jsx` lines 47–48.
- Equal mode divides `totalBill` by `equalSplitCount` directly (line 503), so it inherits the subtotal error.

**Dependencies / External Validation Needed**
- Backend dependency: Whether the backend expects the frontend to send pre-split amounts (discount + tax + SC apportioned per split), or whether the backend re-derives totals on each new split order. API endpoint is `splitOrder` → payload shape shown in `orderService.js` lines 108–118.
- API dependency: `POST /.../split-order` — response flow then re-fetches the new order via `fetchSingleOrderForSocket` (OrderEntry.jsx line 1510), so downstream totals come from the backend.
- Socket dependency: None in the modal's display logic.
- Payload dependency: The display issue is local to the modal; it does not directly corrupt the API payload (which only sends `{ id, qty }` per split), but it does mislead the cashier about what each person owes.
- Config dependency: `restaurant.features.serviceCharge`, `restaurant.features.tip`, `restaurant.serviceChargePercentage`, `settings.autoBill` — all contribute to grand total upstream but are not referenced by the split modal.

**Reproduction Understanding**
- Step 1: Place an order that includes any of: an item with `qty > 1`, an item with addons, an item with variations, a discount, tip, service charge enabled.
- Step 2: Open Split Bill on the placed order.
- Step 3 (Equally): Observe the displayed `Total Bill` and per-person value — they do not equal the order's grand total / `grandTotal / N`.
- Step 4 (By Person): Assign items to persons. Observe each person's total — addons/variations are missing and the numbers do not sum up to the order's grand total (even when every item is assigned).

**Open Questions / Unknowns**
- Whether the product expectation is:
  (a) Split is purely an item-subtotal exercise (backend re-derives tax/SC/discount on each new split order) — in which case only the addon/variation + unit-vs-line-price shape issue is a bug.
  (b) Split must reflect the final grand total (including discount/SC/tax/tip/delivery) proportionally — in which case `totalBill` itself needs to be sourced from the grand total, not the items subtotal.
- Unclear whether `SplitBillModal` should consume `finalTotal` (from `CollectPaymentPanel`) or an order-level `amount` passed in from `OrderEntry`.

**Notes**
- The “Equally” path (`mode === 'equal'`) is purely display; `handleSplit` short-circuits with a toast and no API call (lines 189–194), so only the displayed number is wrong, not any persisted state.
- The “By Person” path (`mode === 'byPerson'`) does make an API call, but the payload is only `{ id, qty }` per person (lines 153–168) — monetary amounts are not sent. The wrong number is a display-only issue for the cashier's decision-making, not a stored-data corruption.
- Cross-reference `ARCHITECTURE_DECISIONS_FINAL.md` for the agreed source-of-truth for Split totals before scoping any fix.

---

## BUG-005 / Print Bill Button Missing on Prepaid Orders in Collect Bill Screen

**Status: CLOSED — Not a business requirement** (Apr-2026)
- Closed per user instruction: conflicts with architecture decisions. Prepaid flow does not require a Print Bill control on the pre-place Collect Bill screen.
- No code change.
- AD-303 reference remains open for future reconsideration if business policy changes.

---

**User Reported Issue**
- On a prepaid order, when the cashier is on the Collect Bill screen, the "Print Bill" button is not shown. Staff cannot print the bill from this screen for prepaid orders.

**QA Status**
- Confirmed.

**Current Code Behavior**
- `CollectPaymentPanel.jsx` renders the Print Bill button conditionally at lines 419–431:
  ```jsx
  {hasPlacedItems && onPrintBill && (
    <button onClick={handlePrintBill} data-testid="print-bill-btn" ...>
      <Printer /> <span>{isPrintingBill ? 'Printing…' : 'Print Bill'}</span>
    </button>
  )}
  ```
- `handlePrintBill` itself guards further (line 362): `if (!onPrintBill || !hasPlacedItems || isPrintingBill) return;`.
- `hasPlacedItems` is passed from `OrderEntry.jsx` line 962: `hasPlacedItems={cartItems.some(i => i.placed)}`.
- For a prepaid order (Scenario 2 = new order + Place+Pay in one shot), the cashier lands on the Collect Bill screen BEFORE any API place-order call has been fired. At that moment every cart item still has `placed: false` (see `OrderEntry.jsx` lines 309, 419, 427, 466 where `placed` is set locally). Therefore `hasPlacedItems === false` and the Print Bill button is hidden by the `hasPlacedItems && onPrintBill` predicate.
- `OrderEntry.jsx` `onPrintBill` handler (lines 981–1002) also bails out with a toast if `effectiveTable?.orderId || placedOrderId` is null (line 986), which is the case for a fresh prepaid pre-place order.
- Postpaid orders reach the Collect Bill screen only AFTER place-order has already persisted and the socket has hydrated items with `placed: true`, so the same button renders correctly for them. Prepaid orders are the only flow where the button is always hidden on this screen.

**Expected Behavior** (per user input + ARCHITECTURE_DECISIONS_FINAL.md AD-303)
- Prepaid orders should also expose a Print Bill button on the Collect Bill screen, with parity to postpaid orders. AD-303 explicitly flags the current absence as a gap/bug, not intended architecture.

**Gap Observed**
- The render predicate `hasPlacedItems && onPrintBill` is too strict for the prepaid Scenario 2 flow — it requires a persisted/placed order as a precondition for showing Print Bill. Prepaid orders never satisfy this precondition on the pre-pay screen because place-order has not been called yet.
- Even if the predicate were relaxed, the current `onPrintBill` implementation in `OrderEntry.jsx` would still early-return (toast "Order not placed yet") because it derives `printOrderId` from `effectiveTable?.orderId || placedOrderId`, both of which are null for a pre-place prepaid order, and because `buildBillPrintPayload` requires `order.rawOrderDetails` (set from socket hydration) — also absent pre-place.

**Impacted Areas**
- Modules: Billing, Bill Print, Prepaid Order, Collect Payment
- Screens / Flows: New order → Collect Payment (prepaid Place+Pay) → expected "Print Bill" control
- Components / Hooks / Utilities:
  - `CollectPaymentPanel` render predicate and `handlePrintBill` (lines 361–385, 419–431)
  - `OrderEntry.jsx` `onPrintBill` wiring (lines 981–1002) and `hasPlacedItems` prop (line 962)
  - `toAPI.buildBillPrintPayload` (`orderTransform.js` line 867) — assumes an existing order with `rawOrderDetails`
  - `orderService.printOrder` (`orderService.js` line 132)

**Files Reviewed**
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (lines 355–431)
- `frontend/src/components/order-entry/OrderEntry.jsx` (lines 481–525, 955–1002)
- `frontend/src/api/services/orderService.js` (lines 132–151)
- `frontend/src/api/transforms/orderTransform.js` (lines 867–1004)
- `frontend/src/api/constants.js` (`PRINT_ORDER`)
- `app/memory/ARCHITECTURE_DECISIONS_FINAL.md` (AD-303)

**Code Evidence Summary**
- Print Bill button render is gated by `hasPlacedItems && onPrintBill` — false by definition for a fresh prepaid order on the Collect Bill screen.
- `hasPlacedItems` derives from `cartItems.some(i => i.placed)`, and `placed` is set to `true` only via socket hydration after place-order succeeds (`OrderEntry.jsx` line 309, 346) or explicitly when items are re-hydrated from context.
- `onPrintBill` requires an existing `orderId` and `order.rawOrderDetails` — neither exists on the pre-place prepaid Collect Bill screen.
- No alternative pre-place print path exists for prepaid orders (the manual `handlePrintBill` is the only print trigger on this screen).

**Dependencies / External Validation Needed**
- Backend dependency: `/api/v1/vendoremployee/order-temp-store` — contract for printing a bill that has NOT yet been placed. Unknown whether backend accepts a bill print for an order that does not yet have an `order_id`.
- API dependency: `toAPI.buildBillPrintPayload` currently assumes a socket-hydrated order — payload shape for a pre-place print needs backend agreement.
- Socket dependency: None for the render gap, but socket hydration IS the reason `placed`/`rawOrderDetails` are unavailable pre-place.
- Payload dependency: If pre-place Print Bill is to be supported, payload must source values from local `CollectPaymentPanel` state (same override shape as manual Print Bill) because there is no hydrated order to read from.
- Config dependency: None.

**Reproduction Understanding**
- Step 1: Start a new order (walk-in, dine-in, takeaway, or delivery).
- Step 2: Go to Collect Payment and select Place+Pay (prepaid) as the payment flow.
- Step 3: Observe the Bill Summary header area on the Collect Bill screen.
- Observed: No Print Bill button is visible. For postpaid flows (where the order was placed first), the same button renders.

**Open Questions / Unknowns**
- Product expectation: should the Print Bill on a pre-place prepaid order (a) place the order first and then print, (b) print directly from local state without touching the backend `place-order`, or (c) place via a dedicated pre-place print endpoint? Code does not currently support any of these.
- AD-303 states this is a bug but does not prescribe implementation.

**Notes**
- Related to but distinct from BUG-001: BUG-001 concerns the prepaid AUTO-print payload (tip/discount missing after place). BUG-005 is the UI gap BEFORE place, where the manual Print Bill trigger itself is hidden.
- Not related to BUG-002 (postpaid auto-print not firing).

---

## BUG-006 / Service Charge Calculated Before Discount (Should Be After Discount, Then Taxes)

**Status: FIXED** (Apr-2026) — see implementation notes below.

**Files changed**
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` — service charge now computed on `subtotalAfterDiscount`; tax block rewritten to prorate item GST by discount ratio and add GST on SC, tip, and delivery charge via weighted-average item GST rate. Removed the separate `printTaxTotals` memo (single source of truth).
- `frontend/src/api/transforms/orderTransform.js`
  - `calcOrderTotals` now accepts `{ discountAmount, tipAmount, deliveryCharge }` extras; applies AD-101 ordering and extended GST base.
  - `placeOrderWithPayment` threads `discounts.total`, `tip`, `deliveryCharge` into `calcOrderTotals`. Also fixes `tip_amount` payload field (was hardcoded `'0'`).
  - `buildBillPrintPayload` default branch honors `overrides.discountAmount`, `overrides.tip`, `overrides.deliveryCharge` in SC base and GST markup.

**Architecture doc updates** — NOT applied by implementation agent per scope rule. Handoff captured in `/app/memory/AD_UPDATES_PENDING.md` (Entries #1, #2, #3) for the documentation agent to validate and apply to `ARCHITECTURE_DECISIONS_FINAL.md`.

**UX follow-up (Apr-2026)** — Two passes after the math fix was validated, both scoped to `CollectPaymentPanel.jsx` only (no math/prop/API/socket change):

- **v1** — user feedback: "we put discount down and it shows up" (Discount input was BELOW Bill Summary, but the discount row appeared AT TOP → scroll-back-to-verify friction).
  - Discount / Coupon / Loyalty / Wallet control cards relocated from AFTER Bill Summary to BEFORE Bill Summary under a new "🎛 Adjustments" section header.
  - Bill Summary card gained a "📋 Bill Summary — computed, read-only" header to mark the editable / computed divide.
  - New "↳ Post-discount" row added inside Bill Summary (AD-101 transparency — shows the base that SC/tax compute against).
  - Service Charge row gained inline base hint (`on ₹X`) when a discount is active.

- **v2** — user feedback: "service charge and tips should also be part of adjustment."
  - Service Charge toggle moved from inside Bill Summary → into Adjustments as a compact checkbox row.
  - Tip input moved from inside Bill Summary → into Adjustments as a compact ₹ input row.
  - Delivery Charge input moved likewise (delivery orders only).
  - Bill Summary is now fully read-only — SC / Delivery / Tip now appear as display-only rows showing just the computed amount (renders only when the value is > 0 or SC is toggled on).
  - Inline rate hint in the SC display row: `Service Charge @ 10% on ₹183`.
  - `data-testid` semantic shift note: `tip-section` and `delivery-charge-section` now point to the editable Adjustments cards (previously pointed to the Bill Summary blocks). New `tip-row` / `delivery-charge-row` IDs added on the display rows. Existing `service-charge-row`, `service-charge-toggle-main`, `tip-input`, `delivery-charge-input` preserved.
  - Room-with-associated-orders branch intentionally untouched in both passes (existing collapsible checkout UX preserved).

**Scope resolved**
- AD-101 ordering: items → discount → SC → tax → tip.
- Tax now prorates item GST by discount ratio AND adds GST on service charge, tip, and delivery charge (per business decision, Apr-2026).
- Single source of truth: UI `sgst`/`cgst` flow identically to bill print overrides and `paymentData` (postpaid `order-bill-payment`). Prepaid Place+Pay (`place-order`) now uses the same rule via `calcOrderTotals`.

---

## BUG-006 / Service Charge Calculated Before Discount — Full QA Documentation (reference)
> This bug is tightly coupled to `ARCHITECTURE_DECISIONS_FINAL.md` → **AD-101**, which already prescribes the correct ordering (`items → discount → service charge → tax → tip`) but currently carries the validation tag `[DECISION ONLY - NOT IMPLEMENTED]`.
> When this bug is picked up for implementation, the architecture doc MUST also be updated in lockstep:
> - Update AD-101 validation tag from `[DECISION ONLY - NOT IMPLEMENTED]` to `[CONFIRMED FROM CODE]` once the new behavior ships.
> - Re-confirm AD-105 (UI-vs-print tax consistency) — UI SGST/CGST must also move off the gross base to stay aligned with the print path; AD-105's `[DECISION ONLY - PARTIALLY IMPLEMENTED]` tag should be re-assessed.
> - Re-confirm AD-302 (print consistency with collect-bill edits) since `buildBillPrintPayload` default branch will change.
> - Re-confirm AD-401 / AD-402 (phase-based financial ownership) — the "settlement-time frontend billing values" referenced there must be the post-discount-SC values after this change.
> - Clarification Q-6 (referenced inline in `CollectPaymentPanel.jsx` lines 247–249) needs to be resolved and recorded as an architecture decision before or alongside this change. Until Q-6 is resolved, ADR update cannot claim full implementation.
>
> This is flagged as a pure QA/architecture observation — no code is changed here.

**User Reported Issue**
- On the bill, service charge is currently computed on the gross item total (pre-discount). It should be computed on the discounted subtotal: `items → discount → service charge → tax → tip`.

**QA Status**
- Confirmed.

**Current Code Behavior**
- `CollectPaymentPanel.jsx` calculates service charge on the PRE-discount `itemTotal` at line 211–213:
  ```js
  const serviceCharge = serviceChargeEnabled && serviceChargePercentage > 0
    ? Math.round(itemTotal * serviceChargePercentage / 100 * 100) / 100
    : 0;
  ```
  where `itemTotal` (line 181) is the raw sum of `getItemLinePrice(item)` across active cart items, BEFORE any discount is subtracted.
- `totalDiscount` is computed separately at line 207 and `subtotalAfterDiscount = Math.max(0, itemTotal - totalDiscount)` at line 208, but it is never used as the service-charge base.
- Item-level tax (`taxTotals`, lines 106–128) is computed on gross line prices without discount proration.
- `serviceChargeGst` (line 219) is then derived from the (pre-discount-based) `serviceCharge` and a blended GST rate.
- Final display uses:
  - `subtotal = subtotalAfterDiscount + serviceCharge + tip` (line 236) — so the subtotal line does combine discount + SC, but `serviceCharge` is still built from `itemTotal` rather than `subtotalAfterDiscount`.
  - `rawFinalTotal = subtotal + sgst + cgst + deliveryCharge` (line 238) — tax is gross-item-based, not discounted-base.
- `printTaxTotals` memo (lines 250–272) DOES apply a discount ratio to item tax for the PRINT payload only (Option A / Approach b), explicitly flagged by an inline comment "UI sgst/cgst and paymentData.sgst/cgst remain on gross tax ... to avoid backend regression." So the UI and the API collect-bill payload still run on the pre-discount base.
- Place-order/update-order payloads use `calcOrderTotals(cart, serviceChargePercentage)` in `orderTransform.js` lines 361–405. That helper computes `serviceCharge = subtotal × serviceChargePercentage / 100` where `subtotal = Σ line totals` — it does not accept any discount parameter, so place/update payloads also compute SC on pre-discount subtotal.
- `buildBillPrintPayload` (orderTransform.js line 906) likewise falls back to `computedSubtotal × serviceChargePercentage / 100` when no override is provided — pre-discount base.

**Expected Behavior** (per user input + ARCHITECTURE_DECISIONS_FINAL.md AD-101)
- Billing order must be: `item total → discounts → service charge → tax → tip`. Service charge must be calculated on the post-discount subtotal. AD-101 validation note: "[DECISION ONLY - NOT IMPLEMENTED] Current code still computes service charge from pre-discount itemTotal in CollectPaymentPanel.jsx."
- Downstream values depending on service charge (GST-on-service-charge; pre-tax subtotal line; final total; print/API payloads) must recalculate consistently against the new base.

**Gap Observed**
- Three calculation sites use the pre-discount base and disagree with AD-101:
  1. `CollectPaymentPanel.jsx` line 212 — UI service-charge line on the Collect Bill screen.
  2. `orderTransform.calcOrderTotals` — used by `placeOrder`, `updateOrder`, `placeOrderWithPayment` payloads.
  3. `buildBillPrintPayload` default branch — bill print payload when no override is provided.
- Only `printTaxTotals` memo applies discount-aware math, and only for the print override path — not for the UI or the `order-bill-payment` API payload.
- Per AD-105 and AD-302, the Collect Bill UI and the printed bill must share the same final values. Because SC base differs from AD-101, UI/print/collect-bill values drift from the intended "discount first, then SC, then tax" ordering.

**Impacted Areas**
- Modules: Billing, Collect Payment, Place Order, Place+Pay, Update Order, Bill Print
- Screens / Flows: Collect Bill screen totals; place-order / update-order / place-order-with-payment payloads; bill print payload
- Components / Hooks / Utilities:
  - `CollectPaymentPanel` `serviceCharge`, `serviceChargeGst`, `sgst`, `cgst`, `subtotal`, `rawFinalTotal` (lines 180–244)
  - `orderTransform.calcOrderTotals` (lines 361–405)
  - `toAPI.placeOrder`, `toAPI.updateOrder`, `toAPI.placeOrderWithPayment` (call-sites of `calcOrderTotals`, lines 472, 543, 595)
  - `toAPI.buildBillPrintPayload` default branch (lines 906–917)
  - `toAPI.collectBillExisting` — re-publishes `serviceCharge` from caller (`paymentData.serviceCharge`), which is already pre-discount from `CollectPaymentPanel.handlePayment` (line 338)

**Files Reviewed**
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (lines 90–272, 304–385)
- `frontend/src/api/transforms/orderTransform.js` (lines 361–405, 466–672, 680–810, 867–1004)
- `frontend/src/components/order-entry/OrderEntry.jsx` (lines 955–1170 — how serviceChargePercentage is threaded to transforms)
- `app/memory/ARCHITECTURE_DECISIONS_FINAL.md` (AD-101, AD-105, AD-302, AD-401, AD-402)

**Code Evidence Summary**
- UI `serviceCharge` is computed as `itemTotal × serviceChargePercentage / 100`, NOT `subtotalAfterDiscount × serviceChargePercentage / 100`. See `CollectPaymentPanel.jsx` line 212 (`itemTotal * serviceChargePercentage / 100 * 100`).
- API payload helper `calcOrderTotals` computes `serviceCharge` from pre-discount `subtotal` (= items-only). See `orderTransform.js` lines 361–405.
- Bill print default branch computes SC from `computedSubtotal` (= items-only) in `buildBillPrintPayload` lines 906–917.
- Existing `printTaxTotals` memo already knows how to prorate by `discountRatio` (line 251) — pattern exists, just not applied to SC or to the UI/API paths.
- Inline comment on lines 247–249 explicitly acknowledges UI/paymentData stays on gross tax "to avoid backend regression until clarification Q-6."

**Dependencies / External Validation Needed**
- Backend dependency: HIGH. Whether backend's `place-order` / `order-bill-payment` accepts a `service_tax` and `gst_tax` computed on post-discount subtotal, or re-derives totals from raw items. Inline comments reference "clarification Q-6" — unresolved.
- API dependency: `/api/v2/vendoremployee/order/place-order`, `/api/v2/vendoremployee/order/order-bill-payment`, `/api/v1/vendoremployee/order/update-place-order`, `/api/v1/vendoremployee/order-temp-store` — all receive `service_tax` / derivatives of it.
- Socket dependency: None directly.
- Payload dependency: If SC base changes, `service_tax`, `gst_tax`, `vat_tax`, `tax_amount`, `order_amount`, `round_up` (from `calcOrderTotals`) all change in `place-order` / `update-order` / `place-order-with-payment` payloads.
- Config dependency: `restaurant.features.serviceCharge`, `restaurant.serviceChargePercentage`, `serviceChargeEnabled` toggle (BUG-276 / AD-502), `discountTypes` from `RestaurantContext`.

**Reproduction Understanding**
- Step 1: Configure a restaurant with non-zero `serviceChargePercentage` (e.g., 10%) and a tax % on menu items.
- Step 2: Start an order with a single item priced ₹1000 and apply a flat ₹200 discount on the Collect Bill screen.
- Step 3: Observe the Service Charge line.
- Observed: Service Charge = ₹1000 × 10% = ₹100 (pre-discount base).
- Expected per AD-101: Service Charge = (₹1000 − ₹200) × 10% = ₹80 (post-discount base). Tax then computed on `₹800 + ₹80 = ₹880` plus tip, etc.

**Open Questions / Unknowns**
- Resolution of "clarification Q-6" — does the backend accept discount-adjusted SC and tax on `order-bill-payment` / `place-order`?
- Treatment of SC-on-SC-GST avg-rate formula: should it be recomputed on the new base, or on the same avg rate against the new SC amount? (Second interpretation is implementation-simpler and matches how `serviceChargeGst` is currently shaped.)
- Does the change also require updating already-hydrated placed orders (e.g., recompute on the client when a discount is applied to a placed order), or does backend resend correct values via socket/single-order fetch?

**Notes**
- Cross-reference with BUG-001 (prepaid auto-print) — any SC base change will also alter the auto-print payload, which currently reuses live paymentData values for SC.
- Cross-reference with AD-105/AD-302 — UI, collect-bill payload, and print payload must remain consistent post-change.
- `printTaxTotals` memo is the closest-existing precedent for discount-aware math and may serve as a reference for implementing the final fix (outside QA scope).

---

## BUG-007 / Place Order Payload for Delivery Orders Missing Full `delivery_address` Object (Currently Sends Only Address ID)

**Status: FIXED (frontend side)** (Apr-2026)

**Files changed**
- `frontend/src/api/transforms/orderTransform.js` — new module-level helper `buildDeliveryAddress(addr)` maps UI address state to wire shape. `placeOrder` and `placeOrderWithPayment` now accept `deliveryAddress` in options and emit the `delivery_address` object when `orderType === 'delivery'` AND a delivery address is provided. `address_id` emission unchanged.
- `frontend/src/components/order-entry/OrderEntry.jsx` — 2 call-sites now pass `deliveryAddress: selectedAddress || null` in options (line ~614 postpaid `placeOrder`, line ~1145 prepaid `placeOrderWithPayment`).

**Scope (confirmed with user)**
- Applied to `placeOrder` + `placeOrderWithPayment` only (per user: "to place order"). `updateOrder` NOT modified — delivery orders are not editable per user.
- `address_id` is always a real CRM id (never null, never local string) per user — if address is not in CRM, it is pushed to CRM first to get an id.
- Payload shape frozen with user on 2026-04-20 (snake_case, nested `location`, nullable `floor`/`road`/`house`).

**Backend-side gap (pending — NOT a frontend issue)**
- Verified via preprod cURL on 2026-04-20: HTTP 200 (order 731449 placed) BUT the persisted order shows `delivery_address: None`. Backend is currently silently dropping the field at the storage layer.
- Handoff captured in `/app/memory/AD_UPDATES_PENDING.md` Entry #6 for backend team to wire up persistence.
- Frontend ships the correct payload regardless — when backend lands its persistence fix, the client is already correct; no further frontend change needed.

**Edge cases handled**
- Non-delivery order types (dine-in / walk-in / takeaway) → `delivery_address` key omitted.
- No selected address → `delivery_address` omitted; `address_id` behavior unchanged.
- Missing lat/lng (manual-typed address without Places autocomplete) → `location.latitude`/`location.longitude` = `null`.
- Empty string default for typically-populated fields; `null` for optional fields (`floor`, `road`, `house`) per user sample.

---


**User Reported Issue**
- For delivery orders, the Place Order payload only includes `address_id`. The backend requires the full `delivery_address` object (contact name, contact number, address type, formatted address string, pincode, latitude, longitude) to process the delivery correctly.

**QA Status**
- Confirmed.

**Current Code Behavior**
- `toAPI.placeOrder` (`orderTransform.js` lines 467–520) builds the place-order payload and only includes `address_id: addressId` (line 513). No `delivery_address`, `contact_person_name`, `contact_person_number`, `address_type`, `pincode`, `latitude`, `longitude`, or equivalent keys are set. Applies to both delivery and non-delivery payloads identically.
- `toAPI.placeOrderWithPayment` (lines 589–672) — same behavior. Only `address_id: addressId` at line 664.
- `toAPI.updateOrder` (lines 527–582) — same behavior. Only `address_id: addressId` at line 575 (with a comment at 573 noting BUG-278 already added propagation of `address_id` on update).
- The full address object IS available locally in `OrderEntry.jsx`:
  - `selectedAddress` state (line 109) carries the full object produced by `AddressFormModal` with fields `{ addressType, address, house, floor, road, city, state, pincode, latitude, longitude, contactPersonName, contactPersonNumber, deliveryInstructions, isDefault, id }` (see `AddressFormModal.jsx` lines 71–86, 142–144).
  - `OrderEntry.jsx` calls `orderToAPI.placeOrder(...)` / `placeOrderWithPayment(...)` / `updateOrder(...)` passing only `addressId: selectedAddress?.id || null` in the `options` object (see lines 565, 614, 1145). The rest of `selectedAddress` is never forwarded.
- `fromAPI.order` at `orderTransform.js` line 218 already maps a backend `api.delivery_address` back into the UI model (`deliveryAddress: api.delivery_address || null`), implying the backend produces/stores a structured delivery address object — but the frontend never sends one.

**Expected Behavior** (per user input)
- For delivery orders, the place-order payload (and by consistency, `place-order-with-payment` and `update-place-order`) should include the full `delivery_address` object, not just the `address_id`.
- Object shape expected by user: contact person name, contact number, address type, full address string, pincode, latitude/longitude.

**Gap Observed**
- The transforms accept and serialize only `addressId`. There is no branch that reads the remaining fields off the selected address.
- Call-sites in `OrderEntry.jsx` pass only `selectedAddress?.id`, not the full `selectedAddress` object.
- No code path currently constructs the `delivery_address` object key in any place-order / update-order / place-order-with-payment payload.
- The gap is consistent across all three order-creation/update flows (delivery is one of four `order_type` values but the transforms do not differentiate delivery from the other types when emitting the address).

**Impacted Areas**
- Modules: Delivery Orders, Place Order, Place+Pay (prepaid), Update Order, Payload Integrity
- Screens / Flows: New delivery order placement; delivery prepaid Place+Pay; editing/updating an existing delivery order
- Components / Hooks / Utilities:
  - `toAPI.placeOrder` (lines 467–520)
  - `toAPI.placeOrderWithPayment` (lines 589–672)
  - `toAPI.updateOrder` (lines 527–582)
  - `OrderEntry.jsx` call-sites: `handlePlaceOrder` (line 565), `handlePlaceOrderWithPayment` path (line 614), `onPaymentComplete` update branch (line 1145)
  - `AddressFormModal` (shape source for the selected address)

**Files Reviewed**
- `frontend/src/api/transforms/orderTransform.js` (lines 217–218, 467–672)
- `frontend/src/components/order-entry/OrderEntry.jsx` (lines 108–160, 555–620, 1140–1170)
- `frontend/src/components/order-entry/AddressFormModal.jsx` (lines 70–145, full field list)
- `frontend/src/components/order-entry/AddressPickerModal.jsx` (selection shape)

**Code Evidence Summary**
- `address_id: addressId` is the ONLY address-related field in three separate place-order payload builders.
- The full `selectedAddress` object (with `contactPersonName`, `contactPersonNumber`, `addressType`, `address`, `pincode`, `latitude`, `longitude`, etc.) is available in parent state and constructed by `AddressFormModal.handleSave` / CRM fetch, but never threaded down into the transform options.
- The options destructure in each transform (`{ addressId = null }` at lines 468, 533, 590) does not accept any `deliveryAddress` / `address` object parameter.
- Backend inbound `fromAPI.order` already consumes `api.delivery_address`, which suggests the shape exists on the backend contract; it is only the outbound direction that is missing.

**Dependencies / External Validation Needed**
- Backend dependency: HIGH. Required `delivery_address` object shape — exact keys, casing, nested vs flat layout. User description gives high-level fields but not wire format.
- API dependency: `/api/v2/vendoremployee/order/place-order`, `/api/v1/vendoremployee/order/update-place-order`, `/api/v2/vendoremployee/order/place-order-with-payment` equivalents — all affected.
- Socket dependency: Whether any socket event also needs the full object (e.g., for re-hydration) or whether `address_id` round-trip is enough.
- Payload dependency: Need confirmation whether `address_id` should still be sent when `delivery_address` is sent (co-existence), or whether `delivery_address` alone is sufficient for new addresses that do not yet have an `address_id`.
- Config dependency: CRM address store (BUG-278 comment suggests `address_id` is CRM-stored). AD-203 / AD-203A / AD-203B are relevant for CRM sourcing but do not prescribe wire format.

**Reproduction Understanding**
- Step 1: Start a delivery order; pick or create an address with contact person name/number, pincode, lat/lng, etc.
- Step 2: Place the order (or Place+Pay).
- Step 3: Inspect the outgoing `place-order` / `place-order-with-payment` payload (Network tab).
- Observed: Only `address_id: <id>` is present. No `delivery_address`, contact person, pincode, or coordinates anywhere in the payload.

**Open Questions / Unknowns**
- Exact expected key name — `delivery_address` (matches `fromAPI.order`) vs `deliveryAddress` vs other — needs backend contract.
- Handling for an ad-hoc/local address (unsaved to CRM) — today `AddressFormModal` → `handleAddAddress` can short-circuit to a local-only address with `id: 'local_<ts>'` when the customer is local-only (`OrderEntry.jsx` lines 137–143). In that path, `addressId` is a local id not known to backend. The fix must consider whether backend expects `delivery_address` with no `address_id` for these cases.
- Whether the `address_id` field should remain, be dropped, or be conditional on the address existing in the CRM database.

**Notes**
- BUG-278 (referenced inline in `orderTransform.js` line 573) previously added `address_id` propagation on `updateOrder`, but did not address the full-object gap. This bug (BUG-007) is a continuation of the same concern with wider scope.
- This is frontend+payload shape work; actual backend behavior on receipt of the new fields is unverified.

---

## BUG-008 / Online Order — Confirm Button Not Working

**Status: CLOSED — Already working on current code path** (Apr-2026)
- Closed per user validation: the active online-order confirm flow (OrderCard → `onAccept` → `DashboardPage.handleConfirmOrder` → `confirmOrder` endpoint) is functional.
- `DeliveryCard.jsx` (literal "Confirm" button with only `console.log`) is dead code — imported but never mounted. Left in place; AD-204 cleanup candidate for a future pass.
- No code change.

---

## BUG-008 / Online Order — Confirm Button Not Working — Full QA Documentation (reference)

**User Reported Issue**
- On online orders, the "Confirm" button does not work. Staff cannot accept an incoming online order.

**QA Status**
- Partially Confirmed. The literal "Confirm" label does exist on a Delivery card that is imported but NOT rendered anywhere (dead code). The active dashboard path uses an "Accept" button (different label) that is wired to an endpoint whose name is dine-in-specific. Which of the two paths the user is observing cannot be disambiguated from the report alone.

**Current Code Behavior**

Path A (dead, but contains a literal "Confirm" label)
- `DeliveryCard.jsx` lines 162–185 renders a green "Confirm" button for orders in `yetToConfirm` status with `onClick={() => console.log(\`Confirm order ${orderId}\`)}` — it only emits a console.log, does not call any handler, does not accept an `onConfirmOrder` prop, and does not hit any API.
- `DeliveryCard` IS exported (`components/cards/index.js` line 2) and IS imported into `DashboardPage.jsx` (line 7), but a repo-wide search shows it is NEVER instantiated in any JSX (`grep -rn "<DeliveryCard" /app/frontend/src` returns no matches). It is effectively dead code on the dashboard today.

Path B (active, but labeled "Accept" not "Confirm")
- `OrderCard.jsx` lines 580–599 renders the yet-to-confirm action set as `[X Reject] + [Accept]`. Label reads "Accept", not "Confirm".
- `onClick={() => onAccept?.(order)}` (line 596) → `ChannelColumn.jsx` line 201 wires `onAccept={(order) => onConfirmOrder?.(item)}` → `DashboardPage.handleConfirmOrder` (lines 892–905):
  ```js
  await confirmOrder(order.orderId, user?.roleName || 'Manager', defaultOrderStatus);
  ```
- `confirmOrder` (`orderService.js` lines 74–78) hits `API_ENDPOINTS.CONFIRM_ORDER = '/api/v2/vendoremployee/order/waiter-dinein-order-status-update'` (`constants.js` line 27) — the endpoint name and comment (line 67 in orderService: "waiter dine-in flow") are explicitly dine-in.
- Payload is `{ order_id, role_name, order_status }` sourced from `defaultOrderStatus` (comes from profile API `def_ord_status`; see AD-006).
- There is no per-source branching for Swiggy / Zomato / Own online orders — every yet-to-confirm source goes through the same dine-in-named endpoint.

Path C (dine-in TableCard — unrelated but similar shape)
- `TableCard.jsx` line 295–316 renders a Cancel + green-tick Confirm icon-button pair for `yetToConfirm` tables. The Confirm icon-button IS wired to `onConfirmOrder?.(table)` → same `handleConfirmOrder` path. This is dine-in only.

**Expected Behavior**
- For an online order (source `swiggy`, `zomato`, or `own` delivery/takeaway) in `yetToConfirm` status, clicking the Confirm/Accept button should transition the order state (via the correct API / socket event) so the order is accepted.

**Gap Observed**
- Path A: `DeliveryCard` contains a button literally labeled "Confirm" whose `onClick` is a bare `console.log` — it would explain the user's exact wording. However, this component is not rendered in production dashboard code. If any build/flag/route renders it, the bug is reproducible; otherwise the literal "Confirm" path is inert dead code.
- Path B: The active online-order flow uses the "Accept" label. Clicks ARE routed to an API, but that API is named `waiter-dinein-order-status-update`. Whether the backend honors this endpoint for non-dine-in (delivery/takeaway/online) orders is a backend-contract gap that cannot be verified from frontend code alone. If the backend rejects or no-ops these calls for online orders, the user's report maps to Path B.
- There is no error handler UX beyond `console.error` (DashboardPage.jsx line 903) — no toast or visual feedback, so an ignored/failed call would appear to the user as "nothing happened" = "button not working".

**Impacted Areas**
- Modules: Dashboard, Online Order Acceptance, YetToConfirm Flow
- Screens / Flows: Dashboard → Delivery/TakeAway/Own channels → yet-to-confirm order → Accept/Confirm click
- Components / Hooks / Utilities:
  - `DeliveryCard.jsx` (lines 162–185) — dead "Confirm" button
  - `OrderCard.jsx` (lines 580–599) — active "Accept" button in list-view
  - `TableCard.jsx` (lines 295–316) — active dine-in "Confirm" (not the online path but shares the handler)
  - `ChannelColumn.jsx` (lines 168, 201) — wires `onConfirmOrder` and the `onAccept → onConfirmOrder` bridge
  - `DashboardPage.handleConfirmOrder` (lines 892–905)
  - `orderService.confirmOrder` (lines 74–78)
  - `toAPI.updateOrderStatus` (lines 854–858) — payload builder reused

**Files Reviewed**
- `frontend/src/components/cards/DeliveryCard.jsx` (entire file)
- `frontend/src/components/cards/OrderCard.jsx` (lines 30–80, 580–620)
- `frontend/src/components/cards/TableCard.jsx` (lines 50–70, 280–320)
- `frontend/src/components/dashboard/ChannelColumn.jsx` (entire file)
- `frontend/src/pages/DashboardPage.jsx` (lines 880–910, 1100–1260)
- `frontend/src/api/services/orderService.js` (lines 60–78)
- `frontend/src/api/transforms/orderTransform.js` (lines 854–858)
- `frontend/src/api/constants.js` (lines 26–27)
- `frontend/src/components/cards/index.js`
- Repo-wide `<DeliveryCard` usage search (returned 0 matches)

**Code Evidence Summary**
- `DeliveryCard.jsx` line 181: `onClick={() => console.log(\`Confirm order ${orderId}\`)}` — the literal "Confirm" button has NO real handler.
- `DeliveryCard` is imported but never mounted — confirmed by negative grep result for `<DeliveryCard`.
- The only rendered yet-to-confirm action for online orders in list view is `OrderCard`'s "Accept" button, wired through `ChannelColumn.onAccept → onConfirmOrder → DashboardPage.handleConfirmOrder → confirmOrder`.
- `confirmOrder` endpoint URL contains `waiter-dinein-order-status-update` — dine-in-named; no branching by `order.source` or `order.orderType`.
- No error UX surfaced to the user if the backend call fails (`handleConfirmOrder` only `console.error`s).

**Dependencies / External Validation Needed**
- Backend dependency: HIGH. Whether `/api/v2/vendoremployee/order/waiter-dinein-order-status-update` accepts/processes yet-to-confirm transitions for online/delivery/takeaway orders, or whether a different endpoint is required.
- API dependency: The currently-wired endpoint vs any (unknown) online-order-specific confirm endpoint (e.g., Swiggy/Zomato integration endpoint).
- Socket dependency: Whether online orders are expected to emit an engage/update-order event upon confirmation, and whether the current socket handlers react correctly to that event for non-dine-in sources.
- Payload dependency: `{ order_id, role_name, order_status }` via `updateOrderStatus` — may be missing fields expected by online-order backend (e.g., aggregator acknowledgement token).
- Config dependency: `defaultOrderStatus` (from profile `def_ord_status`, AD-006) — per AD-006 this is used in "dashboard confirm-order flow and is not scanner-only." Online-order applicability of this status default is unverified.

**Reproduction Understanding**
- Step 1 (Path A hypothesis): On the dashboard, find a yet-to-confirm online/delivery order rendered by `DeliveryCard`. Click the green "Confirm" button. Observed: only a `console.log` fires in DevTools; no API call, no state change.
- Step 2 (Path B hypothesis): On the dashboard in List View (Order View), find a yet-to-confirm online order card rendered by `OrderCard`. Click "Accept". Observed: a `PUT /api/v2/vendoremployee/order/waiter-dinein-order-status-update` is dispatched; no UI toast either way. If the server rejects / no-ops, the order does not transition, which the user may report as "Confirm not working".
- Verification gap: user did not attach a screenshot or specify exact screen/channel, so it is unknown which code path they hit.

**Open Questions / Unknowns**
- Which component does the user see the "Confirm" label on? (Requires screenshot or product clarification.)
- Is `DeliveryCard` intended to be brought back into the dashboard (and the "Confirm" button wired correctly), or is its presence accidental dead code? Cross-reference AD-703 (temp scaffold) and AD-204 (mock cleanup) for the general direction of "remove dead code."
- Does the backend require a different endpoint or additional payload fields for online/aggregator order confirmation? (Backend-contract gap.)

**Notes**
- If the user is referring to Path A ("Confirm" label, `DeliveryCard`), the bug is a pure wiring + component-mount gap.
- If the user is referring to Path B ("Accept" label, `OrderCard`) and interpreting it as "Confirm," the bug is primarily a backend-contract / endpoint-correctness question; the frontend handler is wired, but the endpoint and payload shape may be wrong for online orders.
- No error toast is shown on failure in either case — this alone is a UX regression risk independent of the bug's root cause.

---



---

## BUG-009 / Rounding Off — Inverted Logic (₹1.06 Rounds to ₹2 Instead of ₹1)

**User Reported Issue**
- If an item costs ₹1 and GST of ₹0.06 is applied, the total becomes ₹1.06. In the new POS, this is being rounded off to ₹2. In the old POS, ₹1.06 would show as ₹1, and only if the amount exceeded ₹X.10 (e.g., ₹1.10 or above) would it round up to ₹2.

**QA Status**
- Confirmed.

**Current Code Behavior**
- `CollectPaymentPanel.jsx` lines 247-251:
  - `ceilTotal = Math.ceil(rawFinalTotal)`
  - `roundDiff = Math.round((ceilTotal - rawFinalTotal) * 100) / 100`
  - If `roundDiff >= 0.10`, rounds UP to `ceilTotal`; otherwise rounds DOWN to `Math.floor(rawFinalTotal)`.
- `orderTransform.js` `calcOrderTotals` lines 399-402: identical logic:
  - `diff = Math.round((ceilTotal - rawTotal) * 100) / 100`
  - `roundUp = diff >= 0.10 ? diff : 0`
  - `orderAmount = roundUp > 0 ? ceilTotal : Math.floor(rawTotal)`
- Tracing for ₹1.06:
  - `ceilTotal = Math.ceil(1.06) = 2`
  - `roundDiff = 2 - 1.06 = 0.94`
  - `0.94 >= 0.10` is TRUE, so `finalTotal = ceilTotal = 2`. Result: **₹2** (wrong per user).
- Tracing for ₹1.94:
  - `ceilTotal = Math.ceil(1.94) = 2`
  - `roundDiff = 2 - 1.94 = 0.06`
  - `0.06 >= 0.10` is FALSE, so `finalTotal = Math.floor(1.94) = 1`. Result: **₹1** (wrong — should be ₹2).
- The logic is **inverted**: it rounds UP when the fractional part is small (far from ceiling) and rounds DOWN when the fractional part is large (close to ceiling).

**Expected Behavior** (per user input)
- The FRACTIONAL part of the rawTotal (i.e., `rawTotal - Math.floor(rawTotal)`) should be the decision variable:
  - If fractional part <= 0.10: round DOWN (floor).
  - If fractional part > 0.10: round UP (ceil).
- ₹1.06: fractional = 0.06 <= 0.10 -> floor -> ₹1.
- ₹1.94: fractional = 0.94 > 0.10 -> ceil -> ₹2.
- ₹1.10: fractional = 0.10 <= 0.10 -> floor -> ₹1.
- ₹1.11: fractional = 0.11 > 0.10 -> ceil -> ₹2.

**Gap Observed**
- The condition checks `ceilTotal - rawTotal` (distance to ceiling) instead of `rawTotal - Math.floor(rawTotal)` (fractional part). These are complementary values that sum to 1.0 (for non-integer amounts), so the >= 0.10 threshold produces the opposite result of what's intended.
- Bug exists in TWO independent calculation paths: the UI (`CollectPaymentPanel`) and the API payload (`calcOrderTotals` in `orderTransform.js`). The `buildBillPrintPayload` does not have its own rounding logic — it relies on the caller's computed values.

**Impacted Areas**
- Modules: Billing, Collect Payment, Place Order, Place+Pay, Update Order, Bill Print
- Screens / Flows: Collect Bill screen total; place-order / update-order / place-order-with-payment API payloads; any screen displaying the final rounded total
- Components / Hooks / Utilities:
  - `CollectPaymentPanel` rounding block (lines 247-251)
  - `orderTransform.calcOrderTotals` rounding block (lines 397-402, 410-411)

**Files Reviewed**
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (lines 245-251)
- `frontend/src/api/transforms/orderTransform.js` (lines 397-414)

**Code Evidence Summary**
- `CollectPaymentPanel.jsx` line 248-251: `roundDiff = ceilTotal - rawFinalTotal; finalTotal = roundDiff >= 0.10 ? ceilTotal : Math.floor(rawFinalTotal)` — checks distance-to-ceiling, not fractional part. Inverted.
- `orderTransform.js` line 400-402: `diff = ceilTotal - rawTotal; roundUp = diff >= 0.10 ? diff : 0; orderAmount = roundUp > 0 ? ceilTotal : Math.floor(rawTotal)` — identical inversion.
- Both paths produce the same wrong behavior: small fractional amounts (e.g., 0.06) trigger ceil; large fractional amounts (e.g., 0.94) trigger floor.

**Dependencies / External Validation Needed**
- Backend dependency: The `round_up` field in `calcOrderTotals` is sent to the backend (line 411: `round_up: String(roundUp.toFixed(2))`). Backend rounding behavior should be verified for consistency.
- API dependency: `place-order`, `update-order`, `place-order-with-payment` payloads contain `order_amount` and `round_up` derived from this logic.
- Config dependency: AD-001 (referenced in code comment at line 247 of CollectPaymentPanel and line 397 of orderTransform) prescribes the rounding rule. Verify AD-001 matches the user's description.

**Reproduction Understanding**
- Step 1: Create an order with a single item priced ₹1 with 6% GST (exclusive). Total becomes ₹1.06.
- Step 2: Observe the final total on the Collect Bill screen.
- Observed: ₹2 (rounded up). Expected: ₹1 (should floor because fractional 0.06 <= 0.10).
- Step 3: Create an order totaling ₹X.94 (e.g., item ₹X with tax that results in ₹X.94).
- Observed: ₹X-1 (floored). Expected: ₹X+1 (should ceil because fractional 0.94 > 0.10).

**Open Questions / Unknowns**
- Exact threshold: user says "greater than ₹1.10 then it shows ₹2" — is the boundary EXACTLY 0.10 (inclusive floor at 0.10, ceil at 0.11+) or > 0.10 (floor at <= 0.09, ceil at 0.10+)? Current description implies <= 0.10 floors.
- Does the backend also have its own rounding? If so, the backend and frontend rules must match after the fix.

**Notes**
- The `roundOff` display value in `CollectPaymentPanel` (line 250) is also inverted: it shows a positive round-off amount when it should show negative, and vice versa.
- AD-001 (code comment) is the governing architecture decision for rounding. The implementation contradicts the described user expectation.
- Cross-reference: `buildBillPrintPayload` does not have its own rounding — it inherits from the caller's overrides or from the order's `amount` field. So the print payload is affected transitively.

---

## BUG-010 / Discount and Tip Fields — No Programmatic Max Validation (Allows >100% Discount)

**User Reported Issue**
- The discount field allows entering values greater than 100% (e.g., 110%). There is no validation on the discount percentage field or tip field to prevent invalid entries. Other relevant percentage/amount fields should also be validated.

**QA Status**
- Confirmed.

**Current Code Behavior**
- `CollectPaymentPanel.jsx` discount input (lines 466-477):
  - HTML attributes: `type="number"`, `min="0"`, `max={discountType === 'percent' ? "100" : undefined}`.
  - `onChange` handler: `(e) => setDiscountValue(e.target.value < 0 ? "" : e.target.value)` — only rejects negative values. Does NOT enforce the max="100" constraint programmatically.
  - HTML `max` attribute on `type="number"` is advisory only — it does not prevent typing values above the max. It only affects browser-native form validation (which is not used here since there is no `<form>` submission).
- Discount computation (lines 189-191): `manualDiscount = Math.round((itemTotal * parseFloat(discountValue || 0)) / 100)` — if user enters 110%, `manualDiscount = itemTotal * 1.1`, which exceeds itemTotal.
- `subtotalAfterDiscount = Math.max(0, itemTotal - totalDiscount)` (line 208) caps at 0, so the subtotal won't go negative. But the `totalDiscount` would exceed `itemTotal`, making service charge, tax, and final total effectively 0 or negative before the clamp. The display shows a discount amount larger than the item total, which is confusing.
- Same un-enforced HTML `max` appears in the Room Service discount input (lines 803-814).
- Tip input (lines 621-631): `onChange={(e) => setTipInput(e.target.value)}`, `min="0"` — no max validation at all. User can enter any positive number.
- Delivery charge input (lines 648-656): same pattern — no max validation.
- Flat discount mode: `max` is `undefined` for flat type. User can enter a flat discount amount exceeding `itemTotal`.

**Expected Behavior**
- Discount percentage field: programmatically clamp at 100%. Values above 100% should be rejected or clamped in the `onChange` handler.
- Flat discount: should not exceed `itemTotal` (the sum of active item prices).
- Tip: should have a reasonable upper bound (e.g., not exceed 100% of the item total, or a configurable max).
- All numeric fields should have JS-level enforcement, not rely on HTML `max` attribute.

**Gap Observed**
- HTML `max` attribute present but not enforced by JavaScript — user can type any value.
- `onChange` handler only guards against negative values (`< 0`), not upper bounds.
- No validation toast/warning when exceeding limits.
- Flat discount has no upper bound at all (no `max` attribute and no JS check).

**Impacted Areas**
- Modules: Billing, Collect Payment, Discount, Tip, Delivery Charge
- Screens / Flows: Collect Bill screen — discount input (percent and flat), tip input, delivery charge input
- Components / Hooks / Utilities:
  - `CollectPaymentPanel` discount `onChange` handlers (lines 471, 808)
  - `CollectPaymentPanel` tip `onChange` handler (line 625)
  - `CollectPaymentPanel` delivery charge `onChange` handler (line 651)
  - Discount computation at lines 189-191

**Files Reviewed**
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (lines 137-138, 148, 189-191, 466-477, 621-631, 648-656, 803-814)

**Code Evidence Summary**
- Line 471: `onChange={(e) => setDiscountValue(e.target.value < 0 ? "" : e.target.value)}` — only negative guard, no upper bound.
- Line 473: `max={discountType === 'percent' ? "100" : undefined}` — HTML-only, not JS-enforced.
- Line 625: `onChange={(e) => setTipInput(e.target.value)}` — no validation at all.
- Line 189: `Math.round((itemTotal * parseFloat(discountValue || 0)) / 100)` — computes discount without capping percentage at 100.
- Line 208: `Math.max(0, itemTotal - totalDiscount)` — prevents negative subtotal, but discount display itself can exceed itemTotal.

**Dependencies / External Validation Needed**
- Backend dependency: None — this is a pure frontend input validation issue.
- API dependency: None directly, but if a > 100% discount is accepted and sent to the backend, it could corrupt order financials.
- Config dependency: None.

**Reproduction Understanding**
- Step 1: Open Collect Payment on any order.
- Step 2: Select Discount type as "%" and enter 110 in the value field.
- Observed: The value 110 is accepted. `manualDiscount` exceeds `itemTotal`. `subtotalAfterDiscount` becomes 0. Grand total can become 0 or an unexpected value.
- Step 3: Enter a very large tip (e.g., ₹99999).
- Observed: Accepted without warning.

**Open Questions / Unknowns**
- What is the appropriate max for tip? Should it be a percentage of itemTotal, an absolute cap, or restaurant-configurable?
- Should flat discount be capped at `itemTotal` or at `subtotalAfterDiscount` (to prevent stacking beyond the bill)?

**Notes**
- The `walletAmount` input (line 574) DOES have JS enforcement: `Math.min(parseFloat(e.target.value) || 0, customer.walletBalance)`. This pattern could be reused for discount/tip inputs.
- `presetDiscount` (from restaurant preset types, line 186) uses `selectedDiscountType.discountPercent` from the API — that value should already be within valid range if the API provides valid data. But manual entry has no such guarantee.

---

## BUG-011 / Scan & Order — Confirm in New POS Spins Indefinitely (API 404 Not Found)

**User Reported Issue**
- When an order is placed via Scan & Order and staff tries to confirm it in the new POS, the order does not get confirmed — it just keeps loading (spinning). The API appears to be returning a 404 Not Found error.

**QA Status**
- Confirmed — Backend bug.

**Runtime Validation (Apr-2026)**
- Actual error is **HTTP 500** (not 404 as originally reported).
- Backend response: `BadMethodCallException` from Laravel — `Method App\Http\Controllers\Api\V2\Vendoremployee\OrderController... not found` (file: `/var/www/html/vendor/laravel/framework/src/Illuminate/Routing/Controller.php`, line 68).
- Same endpoint `waiter-dinein-order-status-update` **works for dine-in orders** but **fails for delivery orders** with 500.
- Socket `order-engage` event fires correctly before the confirm API call fails.
- Frontend code path is correct — this is a pure backend controller method issue.

**Current Code Behavior**
- `DashboardPage.jsx` `handleConfirmOrder` (lines 892-905):
  - Extracts `order.orderId` from the table entry via `getOrderDataForEntry`.
  - Calls `confirmOrder(order.orderId, user?.roleName || 'Manager', defaultOrderStatus)`.
  - On failure: only `console.error('[DashboardPage] Failed to confirm order:', err)` — no toast, no user-visible feedback.
- `orderService.js` `confirmOrder` (lines 74-78):
  - Builds payload via `toAPI.updateOrderStatus(orderId, roleName, orderStatus)` which produces `{ order_id, role_name, order_status }`.
  - Calls `api.put(API_ENDPOINTS.CONFIRM_ORDER, payload)`.
  - `CONFIRM_ORDER = '/api/v2/vendoremployee/order/waiter-dinein-order-status-update'` (constants.js line 27).
- `OrderCard.jsx` Accept button (lines 592-599):
  - `onClick={() => onAccept?.(order)}` — fires the handler and returns immediately.
  - No loading/spinner state on the Accept button itself. No disabled state during the async call.
  - The "spinning" the user reports is likely the order remaining in `yetToConfirm` status (no state transition) because the API failed silently.
- The same endpoint is used for ALL order types (dine-in, walk-in, takeaway, delivery, scan & order). There is no branching by `order.source` or `order.orderType`.
- `defaultOrderStatus` comes from the profile API's `def_ord_status` field, mapped through `F_ORDER_STATUS` (DashboardPage line 900).

**Expected Behavior**
- Orders placed via Scan & Order should be confirmable from the new POS dashboard using the Accept button. The API call should succeed, and the order should transition from `yetToConfirm` to the next status.
- On failure, the user should see an error toast or visual feedback.

**Gap Observed**
- The frontend uses a dine-in-specific endpoint name (`waiter-dinein-order-status-update`) for ALL order types, including Scan & Order. If the backend requires a different endpoint for scan & order, a 404 is expected.
- No user-facing error handling: the `catch` block only logs to console, so a 404 response would leave the user seeing no change (perceived as "spinning" or "stuck").
- No loading/disabled state on the Accept button during the async call — the button remains clickable, so the user might click multiple times.

**Impacted Areas**
- Modules: Dashboard, Scan & Order, Order Confirmation
- Screens / Flows: Dashboard -> Yet to Confirm order (from Scan & Order) -> Accept button click
- Components / Hooks / Utilities:
  - `DashboardPage.handleConfirmOrder` (lines 892-905)
  - `orderService.confirmOrder` (lines 74-78)
  - `OrderCard.jsx` Accept button (lines 592-599)
  - `toAPI.updateOrderStatus` (orderTransform.js lines 908-912)
  - `API_ENDPOINTS.CONFIRM_ORDER` (constants.js line 27)

**Files Reviewed**
- `frontend/src/pages/DashboardPage.jsx` (lines 21, 892-905)
- `frontend/src/api/services/orderService.js` (lines 74-78)
- `frontend/src/api/constants.js` (line 27)
- `frontend/src/components/cards/OrderCard.jsx` (lines 40, 151, 580-599)
- `frontend/src/api/transforms/orderTransform.js` (lines 908-912)

**Code Evidence Summary**
- Single endpoint for all order types: `CONFIRM_ORDER = '/api/v2/vendoremployee/order/waiter-dinein-order-status-update'`. No branching by source or type.
- Payload is generic: `{ order_id, role_name, order_status }`. No Scan & Order-specific fields.
- No user-facing error handling in the `catch` block (line 903: only `console.error`).
- No loading state on the Accept button in OrderCard.

**Dependencies / External Validation Needed**
- Backend dependency: HIGH. Whether `/api/v2/vendoremployee/order/waiter-dinein-order-status-update` accepts Scan & Order orders, or whether a different endpoint is required. The 404 error strongly suggests the backend does not route this endpoint for scan & order source.
- API dependency: Need to confirm the correct endpoint for Scan & Order confirmation from the backend team.
- Socket dependency: Whether the socket delivers Scan & Order orders in the same format as dine-in orders (same `f_order_status`, same `order_in` field).
- Payload dependency: Whether additional fields (e.g., scan order token, aggregator ID) are needed in the confirm payload for Scan & Order.

**Reproduction Understanding**
- Step 1: Place an order via Scan & Order (customer-facing QR code flow).
- Step 2: In the new POS dashboard, locate the incoming order in the "Yet to Confirm" status.
- Step 3: Click "Accept" on the order card.
- Observed: Nothing visible happens. Console shows 404 error from the API call. Order remains in yetToConfirm state.

**Open Questions / Unknowns**
- What is the Scan & Order `order_in` / `source` value? If it differs from `'own'` / `'dinein'`, the backend may not recognize the endpoint.
- Does the backend have a separate confirmation endpoint for scan & order (e.g., a customer-order-confirm endpoint)?
- Is the `order_id` format the same between scan & order and POS-originated orders?

**Notes**
- BUG-008 (Online Order Confirm) documented a similar flow but for Swiggy/Zomato orders. That bug was closed as "already working" because the code path IS wired. The 404 for Scan & Order suggests a different backend routing issue.
- Adding a user-visible error toast on the `catch` block would at least inform staff that the confirmation failed, regardless of the root cause.

---

## BUG-012 / Delivery Order Edit — Address Not Showing in UI and Not Printing on Bill

**User Reported Issue**
- While editing a delivery order, the delivery address is not showing in the UI. Additionally, the address is not printing on the bill — neither on auto bill print nor on manual bill print.

**QA Status**
- Partially Confirmed. Root cause is linked to BUG-007 (backend drops `delivery_address` on persistence).

**Current Code Behavior**
- **Restoring address on edit**: `OrderEntry.jsx` lines 264-267 and 295-298:
  ```
  if (orderData.deliveryAddress) {
    setSelectedAddress(orderData.deliveryAddress);
  }
  ```
  This restores `selectedAddress` from `orderData.deliveryAddress`, which is mapped from `api.delivery_address` by `orderTransform.order()` (line 218: `deliveryAddress: api.delivery_address || null`).
- **BUG-007 dependency**: BUG-007 documented that the frontend now correctly sends `delivery_address` in `placeOrder` and `placeOrderWithPayment` payloads. However, the backend was verified to silently drop the field at the storage layer (BUG-007 status: "Fixed frontend; backend persistence pending"). If the backend does not persist `delivery_address`, when the order is fetched back (via socket or GET single-order), `api.delivery_address` will be `null`, and `orderData.deliveryAddress` will be `null`.
- **UI display**: `CartPanel.jsx` line 558 checks `selectedAddress` for the delivery address strip. If `selectedAddress` is null (because the backend returned null), the strip shows "Tap to select delivery address *" instead of the actual address.
- **Print payload**: `buildBillPrintPayload` (orderTransform.js lines 1058-1062):
  - `deliveryCustAddress: order.orderType === 'delivery' ? (order.deliveryAddress?.formatted || order.deliveryAddress?.address || '') : ''`
  - If `order.deliveryAddress` is null (backend didn't persist), this evaluates to `''`. The printed bill will have an empty address.
- **No re-fetch on edit**: When an existing delivery order is opened for editing, the address is sourced solely from `orderData.deliveryAddress` (the order context/socket data). There is no fallback to re-fetch the address from CRM using `address_id`.

**Expected Behavior**
- When editing a delivery order, the previously entered delivery address should be displayed in the UI (address strip in CartPanel).
- The printed bill (auto and manual) should include the delivery address.

**Gap Observed**
- The frontend restoration logic (`if (orderData.deliveryAddress) setSelectedAddress(...)`) is correct — it will restore the address IF the backend returns it. The gap is that the backend does not persist `delivery_address` (documented in BUG-007).
- No fallback mechanism: when `deliveryAddress` is null, the frontend could potentially re-fetch the address from CRM using `address_id` (which IS persisted), but this fallback does not exist in the current code.
- The print payload reads `order.deliveryAddress?.formatted || order.deliveryAddress?.address` — both null when backend drops the field.

**Impacted Areas**
- Modules: Delivery Orders, Order Editing, Bill Print, Address Display
- Screens / Flows: Dashboard -> Open existing delivery order -> CartPanel address strip; Bill print (auto and manual)
- Components / Hooks / Utilities:
  - `OrderEntry.jsx` address restoration (lines 264-267, 295-298)
  - `CartPanel.jsx` delivery address strip (lines 546-597)
  - `toAPI.buildBillPrintPayload` delivery fields (lines 1058-1062)
  - `fromAPI.order` delivery mapping (line 218)

**Files Reviewed**
- `frontend/src/components/order-entry/OrderEntry.jsx` (lines 108-114, 264-267, 295-298, 1470)
- `frontend/src/components/order-entry/CartPanel.jsx` (lines 274, 546-597)
- `frontend/src/api/transforms/orderTransform.js` (lines 218-219, 1058-1062)
- `app/memory/BUG_TEMPLATE.md` BUG-007 status ("backend persistence pending")

**Code Evidence Summary**
- `orderTransform.order()` line 218: `deliveryAddress: api.delivery_address || null` — maps to null when backend returns null.
- `OrderEntry.jsx` lines 265-266: `if (orderData.deliveryAddress) setSelectedAddress(orderData.deliveryAddress)` — conditional on `deliveryAddress` being truthy. When null, `selectedAddress` stays at its initial `null`.
- `CartPanel.jsx` line 558: `{selectedAddress ? (...address details...) : (...tap to select prompt...)}` — shows empty prompt when null.
- `buildBillPrintPayload` line 1060: `order.deliveryAddress?.formatted || order.deliveryAddress?.address || ''` — evaluates to empty string when null.
- No fallback to use `address_id` to re-fetch address from CRM on order edit.

**Dependencies / External Validation Needed**
- Backend dependency: HIGH. This is primarily a backend issue. BUG-007 confirmed the backend drops `delivery_address` at the storage layer. Until the backend persists and returns `delivery_address`, the frontend cannot display or print it on re-open.
- API dependency: Whether the `address_id` can be used to fetch the full address from CRM as a fallback. `OrderEntry.jsx` has `lookupAddresses(phone)` but that fetches ALL addresses for a customer, not a specific one by `address_id`.
- Socket dependency: Whether the socket `new-order` or `order-engage` event includes `delivery_address` (it would also be null if backend didn't store it).

**Reproduction Understanding**
- Step 1: Place a delivery order with a full address selected.
- Step 2: After the order is placed, re-open it for editing from the dashboard.
- Step 3: Observe the CartPanel delivery address strip.
- Observed: Shows "Tap to select delivery address *" instead of the previously selected address.
- Step 4: Print the bill (manual or auto).
- Observed: No delivery address on the printed bill.

**Open Questions / Unknowns**
- When will the backend persist `delivery_address`? (BUG-007 handoff captured in AD_UPDATES_PENDING.md Entry #6.)
- Should the frontend implement a fallback to re-fetch the address by `address_id` from CRM when `deliveryAddress` is null on an existing delivery order?

**Notes**
- This is a direct consequence of BUG-007. The frontend code is correct — it will restore and display the address as soon as the backend starts persisting and returning `delivery_address`.
- A frontend-only workaround could be implemented: on order re-open for delivery orders where `deliveryAddress` is null but `address_id` is present, fetch the address from CRM. This would require the order to also carry `address_id` (which it does: `orderTransform.order()` could be extended, and `updateOrder` already sends `address_id`).

---

## BUG-013 / Service Charge Applied to Takeaway and Delivery (Should Be Dine-In and Room Only)

**User Reported Issue**
- Service charge is currently being applied to takeaway and delivery orders. It should only be applicable on dine-in orders and room orders.

**QA Status**
- Confirmed.

**Current Code Behavior**
- `CollectPaymentPanel.jsx` receives `orderType` as a prop (line 21: `orderType = 'dineIn'`).
- Service charge percentage is sourced from the restaurant profile (line 29): `const serviceChargePercentage = (restaurant?.features?.serviceCharge && restaurant?.serviceChargePercentage) || 0;`
- Service charge calculation (lines 219-221):
  ```
  const serviceCharge = serviceChargeEnabled && serviceChargePercentage > 0
    ? Math.round(subtotalAfterDiscount * serviceChargePercentage / 100 * 100) / 100
    : 0;
  ```
  This uses `serviceChargeEnabled` (a local toggle) and `serviceChargePercentage` (from restaurant profile). **`orderType` is NOT used** in this computation.
- Service charge toggle UI (lines 588-608): rendered based on `serviceChargePercentage > 0` only. No `orderType` filter.
- In `orderTransform.calcOrderTotals` (lines 365, 382-384): `serviceChargePercentage` is passed as a parameter. No `orderType` parameter exists in the function signature. The caller decides whether to pass a non-zero percentage.
- In `OrderEntry.jsx`, the service charge percentage is passed to transforms at lines 565, 614, 1145: `serviceChargePercentage: restaurant?.serviceChargePercentage || 0` — always passed regardless of `orderType`.

**Expected Behavior**
- Service charge should be applied ONLY to dine-in orders (`orderType === 'dineIn'` or `orderType === 'walkIn'`) and room orders (`isRoom === true`).
- Takeaway (`orderType === 'takeAway'`) and delivery (`orderType === 'delivery'`) orders should NOT have service charge applied.

**Gap Observed**
- `CollectPaymentPanel.jsx` does not use `orderType` in the service charge calculation or toggle visibility.
- `calcOrderTotals` does not accept `orderType` and applies SC whenever `serviceChargePercentage > 0`.
- `OrderEntry.jsx` does not filter `serviceChargePercentage` by `orderType` before passing it to `CollectPaymentPanel` or transform functions.
- The `orderType` prop IS available in `CollectPaymentPanel` (line 21) and could be used for gating, but it is not referenced in any service charge logic.

**Impacted Areas**
- Modules: Billing, Service Charge, Order Type Logic
- Screens / Flows: Collect Bill screen for takeaway and delivery orders; place-order/place-order-with-payment API payloads for takeaway/delivery
- Components / Hooks / Utilities:
  - `CollectPaymentPanel` service charge computation (lines 219-221)
  - `CollectPaymentPanel` service charge toggle render (lines 588-608)
  - `CollectPaymentPanel` room-service branch SC toggle (lines 904-918)
  - `orderTransform.calcOrderTotals` (lines 365-384)
  - `OrderEntry.jsx` serviceChargePercentage prop threading (lines 565, 614, 1145)

**Files Reviewed**
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (lines 21, 29, 219-221, 588-608)
- `frontend/src/api/transforms/orderTransform.js` (lines 365-414)
- `frontend/src/components/order-entry/OrderEntry.jsx` (lines 39, 565, 614, 964, 1145)
- `frontend/src/api/transforms/profileTransform.js` (lines 70-78, 81)

**Code Evidence Summary**
- `serviceCharge` variable in `CollectPaymentPanel` is computed without any `orderType` check.
- The `orderType` prop is received and used for delivery charge gating (line 211: `orderType === 'delivery'`) and tip display, but NOT for service charge.
- `calcOrderTotals(cart, serviceChargePercentage, extras)` applies SC unconditionally when `serviceChargePercentage > 0`.
- Profile transform (line 77): `serviceCharge: toBoolean(api.service_charge)` and line 81: `serviceChargePercentage: parseFloat(api.service_charge_percentage) || 0` — these are restaurant-level settings with no order-type awareness.

**Dependencies / External Validation Needed**
- Backend dependency: Whether the backend already applies order-type-based SC filtering (so frontend SC mismatch would cause frontend-backend disagreement on totals).
- Config dependency: `restaurant.features.serviceCharge` and `restaurant.serviceChargePercentage` from profile API — currently restaurant-level, not order-type-level.

**Reproduction Understanding**
- Step 1: Configure a restaurant with service charge enabled (e.g., 10%).
- Step 2: Create a takeaway or delivery order with items.
- Step 3: Go to Collect Payment.
- Observed: Service charge toggle is visible and enabled. Service charge amount is computed and added to the total.
- Expected: Service charge toggle should not appear for takeaway/delivery orders, and SC should be 0.

**Open Questions / Unknowns**
- Does the backend apply SC filtering by order type? If so, the frontend and backend would disagree on totals for takeaway/delivery orders.
- Should the SC toggle still appear (but defaulted to OFF) for takeaway/delivery, or should it be completely hidden?

**Notes**
- The fix is straightforward: gate `serviceCharge` computation and the toggle UI on `orderType`. Example: `const scApplicable = orderType === 'dineIn' || orderType === 'walkIn' || isRoom;` and use `scApplicable` in the calculation and render conditionals.
- `calcOrderTotals` could receive 0 as `serviceChargePercentage` for non-applicable order types (caller-side filtering), avoiding a signature change.

---

## BUG-014 / GST Not Applied on Tip Amount

**User Reported Issue**
- GST is not being applied to the tip amount. Tax should be calculated on the tip as well.

**QA Status**
- Not Confirmed from code. Implementation appears to already apply GST to tip.

**Current Code Behavior**
- `CollectPaymentPanel.jsx` lines 234, 237:
  ```
  const tipGst = tip * avgGstRate;
  const totalGst = itemGstPostDiscount + scGst + tipGst + deliveryGst;
  ```
  GST IS applied to tip via `tipGst = tip * avgGstRate`. The `avgGstRate` is the weighted average item GST rate (line 228-230: `(taxTotals.sgst + taxTotals.cgst) / itemTotal`).
- `orderTransform.calcOrderTotals` (lines 392): `+ (tipAmount * avgGstRate)` — GST on tip IS applied in the place-order API payload.
- `buildBillPrintPayload` with overrides (lines 982-983): `+ overrideTip * avgGstRate` — GST on tip IS applied in the print payload when caller provides overrides.
- `buildBillPrintPayload` without overrides (lines 962-963): `overrideTip = overrides.tip !== undefined ? ... : 0` — when no overrides provided (e.g., auto-print path), `overrideTip` defaults to 0. In this case, tip GST is NOT included. However, this is the same auto-print-without-overrides gap documented in BUG-001.
- Manual "Print Bill" from `CollectPaymentPanel` (line 356-358): passes `gstTax: Math.round((sgst + cgst) * 100) / 100` and `tip` as overrides. Since `sgst/cgst` already include `tipGst`, the manual print path IS correct.
- `handlePayment` (lines 291-292): `sgst` and `cgst` in `paymentData` include `tipGst` because they derive from `totalGst` which includes `tipGst`. So the collect-bill API payload IS correct.

**Expected Behavior**
- GST should be applied on the tip amount as part of the billing calculation.

**Gap Observed**
- From code inspection, GST on tip IS implemented in all primary paths:
  1. UI display (CollectPaymentPanel): tipGst included in sgst/cgst ✓
  2. Place-order API payload (calcOrderTotals): tipAmount * avgGstRate ✓
  3. Manual print (buildBillPrintPayload with overrides): gstTax from UI ✓
  4. Collect-bill API payload (handlePayment): sgst/cgst from UI ✓
- The ONLY gap is the auto-print-without-overrides path (BUG-001 scope), where `overrideTip` defaults to 0.
- Cannot reproduce the user's complaint from code analysis alone. Possible explanations:
  (a) User tested before BUG-006 fix (Apr-2026) which added tip GST.
  (b) User's restaurant has 0% GST on items (`avgGstRate` = 0), so `tipGst` = 0.
  (c) User is observing the auto-print bill (BUG-001 scope) where tip GST is missing.
  (d) User is comparing against a different expected rate (e.g., a fixed GST rate on tip vs. the average item rate).

**Impacted Areas**
- Modules: Billing, Tax Calculation, Tip
- Screens / Flows: Collect Bill screen — tax computation when tip is present

**Files Reviewed**
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (lines 213-214, 227-239, 288-323, 340-364)
- `frontend/src/api/transforms/orderTransform.js` (lines 365-414, 960-984)

**Code Evidence Summary**
- `tipGst = tip * avgGstRate` (CollectPaymentPanel line 234) — GST IS computed on tip.
- `totalGst = itemGstPostDiscount + scGst + tipGst + deliveryGst` (line 237) — tipGst IS included in total GST.
- `sgst = Math.round((totalGst / 2) * 100) / 100` (line 238) — final SGST includes tip portion.
- Same logic in `calcOrderTotals` line 392: `+ (tipAmount * avgGstRate)`.

**Dependencies / External Validation Needed**
- Backend dependency: Whether backend applies its own GST-on-tip calculation that differs from the frontend's average-rate approach.
- Config dependency: `restaurant.features.tip` must be enabled for tip to be non-zero. If disabled, tip = 0 and tipGst = 0 by definition (not a bug).

**Reproduction Understanding**
- Step 1: Enable tip feature in restaurant settings. Ensure items have non-zero GST.
- Step 2: Create an order, go to Collect Payment, enter a tip amount (e.g., ₹100).
- Step 3: Observe the SGST/CGST values.
- Expected: SGST/CGST should increase by the tip's GST contribution (tip * avgGstRate / 2 each).
- Verification: Compare SGST with tip = 0 vs. SGST with tip = ₹100 — the difference should be `₹100 * avgGstRate / 2`.

**Open Questions / Unknowns**
- Is the user testing with items that have 0% GST? If all items are GST-exempt, `avgGstRate` = 0 and tip GST would legitimately be 0.
- Is the user expecting a fixed GST rate on tip (e.g., 18%) rather than the weighted average of item GST rates? The current implementation uses the item-average approach.
- Is the user looking at the auto-print bill (which misses tip GST per BUG-001)?

**Notes**
- This bug was explicitly implemented as part of the BUG-006 fix (Apr-2026): "GST on service charge, tip, and delivery charge" was added.
- If the user's complaint persists after verification, it may be a UX/display issue (e.g., tip GST not shown as a separate line item, making it invisible even though it's included in SGST/CGST totals).
- Cross-reference BUG-001: auto-print without overrides still misses tip in GST — this is the most likely path where the user observes the issue.

---

## BUG-015 / Loyalty, Coupon Code, and Wallet Shown on Collect Bill — Feature Flags Not Gating Visibility

**User Reported Issue**
- On the Collect Bill screen, loyalty, coupon code, and wallet options are shown. It is unclear on what basis or conditions these are displayed. The logic/criteria for showing or hiding these options needs to be documented or clarified.

**QA Status**
- Confirmed. Feature flags exist (`isCoupon`, `isLoyalty`, `isCustomerWallet`) but are not used in `CollectPaymentPanel` to gate visibility.

**Current Code Behavior**
- `CollectPaymentPanel.jsx` visibility conditions:
  - Coupon section (line 486): `{customer && (...)}` — shown whenever `customer` prop is truthy.
  - Loyalty section (line 523): `{customer && (...)}` — shown whenever `customer` prop is truthy.
  - Wallet section (line 550): `{customer && (...)}` — shown whenever `customer` prop is truthy.
  - Same conditions in the Room Service branch (lines 823, 854, 870).
- Within each section:
  - Loyalty checkbox: disabled when `!customer?.loyaltyPoints` (line 535). Visually muted but still rendered.
  - Wallet checkbox: disabled when `!customer?.walletBalance` (line 563). Visually muted but still rendered.
  - Coupon: always interactable when customer exists. No disable condition.
- The component does NOT read `useSettings()` or check `isCoupon`/`isLoyalty`/`isCustomerWallet` settings.
- **Feature flags exist in the codebase**:
  - `profileTransform.js` line 190-192: `isCoupon: toBoolean(apiSettings.is_coupon)`, `isLoyalty: toBoolean(apiSettings.is_loyality)`, `isCustomerWallet: toBoolean(apiSettings.is_customer_wallet)`.
  - These are available via `useSettings()` hook (from `SettingsContext`).
  - They are used in the Settings panel (`ViewEditViews.jsx` lines 229-231, 280-282, 288-290) for display/toggle of these features.
  - They are **NOT used** in `CollectPaymentPanel.jsx` at all (confirmed by `grep -n "isCoupon\|isLoyalty\|isCustomerWallet" CollectPaymentPanel.jsx` returning no results).

**Expected Behavior**
- Coupon section should only be visible when `settings.isCoupon` is true AND a customer is selected.
- Loyalty section should only be visible when `settings.isLoyalty` is true AND a customer is selected.
- Wallet section should only be visible when `settings.isCustomerWallet` is true AND a customer is selected.
- If the restaurant has disabled any of these features in settings, the corresponding section should not appear on the Collect Bill screen.

**Gap Observed**
- Three feature flags (`isCoupon`, `isLoyalty`, `isCustomerWallet`) are defined in the profile transform and stored in settings context, but `CollectPaymentPanel` does not reference them. The visibility decision is based solely on the existence of a `customer` object.
- `CollectPaymentPanel` already imports `useSettings` (line 4: `useSettings` from contexts), but does not destructure or use the coupon/loyalty/wallet flags.

**Impacted Areas**
- Modules: Billing, Collect Payment, Loyalty, Coupon, Wallet, Settings
- Screens / Flows: Collect Bill screen — visibility of Coupon, Loyalty, and Wallet sections
- Components / Hooks / Utilities:
  - `CollectPaymentPanel` render conditionals (lines 486, 523, 550, 823, 854, 870)
  - `SettingsContext` / `useSettings` — source of `isCoupon`, `isLoyalty`, `isCustomerWallet`
  - `profileTransform.settings` (lines 190-192) — where flags are parsed from API

**Files Reviewed**
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (lines 4, 486-585, 823-888)
- `frontend/src/api/transforms/profileTransform.js` (lines 187-198)
- `frontend/src/contexts/SettingsContext.jsx` (line 39)
- `frontend/src/components/panels/settings/ViewEditViews.jsx` (lines 229-231, 280-282, 288-290)
- Repo-wide grep for `isCoupon`, `isLoyalty`, `isCustomerWallet` usage

**Code Evidence Summary**
- `CollectPaymentPanel` line 486: `{customer && (...coupon section...)}` — only checks `customer`, not `settings.isCoupon`.
- `CollectPaymentPanel` line 523: `{customer && (...loyalty section...)}` — only checks `customer`, not `settings.isLoyalty`.
- `CollectPaymentPanel` line 550: `{customer && (...wallet section...)}` — only checks `customer`, not `settings.isCustomerWallet`.
- `profileTransform.js` lines 190-192: flags are parsed and available.
- `ViewEditViews.jsx` lines 280-282: same flags are used in Settings panel — proving they're functional in the codebase, just not wired to the Collect Bill screen.
- `CollectPaymentPanel` does have `const { paymentLayoutConfig } = useSettings();` (line 26) — already uses `useSettings` but does not destructure `isCoupon`/`isLoyalty`/`isCustomerWallet`.

**Dependencies / External Validation Needed**
- Backend dependency: None — this is a frontend visibility-gating issue.
- Config dependency: `isCoupon`, `isLoyalty`, `isCustomerWallet` from profile API's settings object must be correctly set for the restaurant.

**Reproduction Understanding**
- Step 1: In Settings panel, disable Coupons, Loyalty, and/or Customer Wallet for the restaurant.
- Step 2: Create an order with a customer attached.
- Step 3: Go to Collect Payment.
- Observed: Coupon, Loyalty, and Wallet sections are all visible (because `customer` exists).
- Expected: Sections for disabled features should not appear.

**Open Questions / Unknowns**
- Is the coupon list (currently hardcoded general coupons at lines 261-264: `FLAT50`, `SAVE10`) supposed to come from the API or remain hardcoded? If API-driven, the `isCoupon` flag could also gate the coupon API fetch.
- Should disabled sections be completely hidden, or shown in a disabled/locked state with a "feature not enabled" message?

**Notes**
- The fix is straightforward: destructure `isCoupon`, `isLoyalty`, `isCustomerWallet` from `useSettings()` and add them to the render conditionals (e.g., `{customer && settings.isCoupon && (...coupon section...)}`).
- Both the default table/walkIn branch and the Room Service branch need the same gating applied.
- The hardcoded coupon list (`FLAT50`, `SAVE10`) at lines 261-264 should likely be replaced with API-driven coupons or removed if the `isCoupon` flag is false.

---

## BUG-016 / Delivery Payload Being Sent on Non-Delivery Order Types (dine-in, etc.)

**User Reported Issue**
- Delivery-specific payload fields are being passed in the place-order request for non-delivery order types as well. Delivery-related fields should only be sent when `order_type` is `delivery`, and must not appear in dine-in, takeaway, walk-in, or room-service payloads.

**Sample Payload (captured from a dine-in order — should not contain delivery fields)**
```json
{"user_id":"","restaurant_id":478,"table_id":"0","order_type":"dinein","cust_name":"","cust_mobile":"","cust_email":"","cust_dob":"","cust_anniversary":"","cust_membership_id":"","order_note":"","payment_method":"cash","payment_status":"paid","payment_type":"prepaid","transaction_id":"","print_kot":"Yes","billing_auto_bill_print":"Yes","auto_dispatch":"No","scheduled":0,"schedule_at":null,"order_sub_total_amount":683,"order_sub_total_without_tax":683,"tax_amount":37.57,"gst_tax":37.57,"vat_tax":0,"order_amount":789,"round_up":"0.13","service_tax":68.3,"service_gst_tax_amount":0,"tip_amount":0,"tip_tax_amount":0,"delivery_charge":0,"discount_type":"","self_discount":0,"coupon_discount":0,"coupon_title":"","coupon_type":"","order_discount":0,"used_loyalty_point":0,"use_wallet_balance":0,"paid_room":"","room_id":"","address_id":null,"discount_member_category_id":0,"discount_member_category_name":"","usage_id":"","cart":[{"food_id":62167,"quantity":1,"price":386,"variant":"","add_on_ids":[],"add_on_qtys":[],"variations":[],"add_ons":[],"station":"KDS","food_amount":386,"variation_amount":0,"addon_amount":0,"gst_amount":"19.30","vat_amount":"0.00","discount_amount":"0.00","complementary_price":0,"is_complementary":"No","food_level_notes":""},{"food_id":62170,"quantity":1,"price":297,"variant":"","add_on_ids":[],"add_on_qtys":[],"variations":[],"add_ons":[],"station":"KDS","food_amount":297,"variation_amount":0,"addon_amount":0,"gst_amount":"14.85","vat_amount":"0.00","discount_amount":"0.00","complementary_price":0,"is_complementary":"No","food_level_notes":""}],"partial_payments":[{"payment_mode":"cash","payment_amount":789,"grant_amount":789,"transaction_id":""},{"payment_mode":"card","payment_amount":0,"grant_amount":0,"transaction_id":""},{"payment_mode":"upi","payment_amount":0,"grant_amount":0,"transaction_id":""}]}
```

**QA Status**
- **Runtime Root Cause Confirmed (Apr-2026) — Backend bug, frontend workaround applied.** The preprod PHP backend at `POST /api/v2/vendoremployee/order/place-order` unconditionally accesses `$payload['delivery_address']` without an `isset()` guard. When the frontend correctly omitted this key for non-delivery orders (BUG-007 gating), PHP threw:
  ```
  { "error": "Undefined array key \"delivery_address\"" }  → HTTP 500
  ```
  Evidence captured by user (Apr-21-2026):
  - Console: `[Prepaid] CRITICAL: 500 {error: 'Undefined array key "delivery_address"'}` (stack → `handlePayment` @ `CollectPaymentPanel.jsx:336` → `onPaymentComplete`).
  - UI toast: `Payment Failed — Undefined array key "delivery_address"`.
  - Request payload (walk-in → mapped to `order_type: "dinein"`): no `delivery_address` key present.
- **Original frontend expectation (from user's first report) — redirected.** User's initial ask was to *remove* delivery fields from non-delivery payloads. Runtime shows the opposite: backend requires the key to always be present (even as `null`). Implementing the original ask would have worsened the regression.
- Partially Confirmed overall: `delivery_address` object gating intent is correct, but the strict omission causes backend crash. Scalar fields `delivery_charge`, `address_id`, `paid_room`, `room_id` remain always-emitted as neutral values (no backend error observed for these).

**Current Code Behavior (post-fix, Apr-2026)**
- `frontend/src/api/transforms/orderTransform.js`:
  - `placeOrder` (Flow 1, lines ~562–567): always emits `payload.delivery_address = (orderType === 'delivery' && deliveryAddress) ? buildDeliveryAddress(deliveryAddress) : null;`.
  - `placeOrderWithPayment` (Flow 3, lines ~724–733): same pattern — always emits `delivery_address` key with full object for delivery orders or `null` for all other order types.
  - `updateOrder` (Flow 2, lines 575–630) — unchanged. It never emitted `delivery_address` historically and targets a different endpoint (`PUT /api/v1/vendoremployee/order/update-place-order`); no runtime error reported for this flow. If the same backend guard gap exists for update-order endpoint, a follow-up patch will be needed.
- Result: non-delivery Place Order / Place + Pay now succeed end-to-end against preprod backend.

**Expected Behavior**
- Non-delivery order placement (walk-in, dine-in, takeaway, room) must not fail due to backend misreading an optional field. Either:
  - (short-term / current state) frontend always emits `delivery_address: null` for non-delivery orders, OR
  - (long-term / proper) backend uses `$payload['delivery_address'] ?? null` / `isset()` and frontend can safely omit the key for non-delivery orders.

**Gap Observed**
- **Backend gap (primary, still open):** Preprod PHP backend does not guard the `delivery_address` key access. This is the real bug; frontend workaround only masks it.
- **Frontend gap (resolved by this fix):** Was correctly gating the key per BUG-007 intent, but unaware of the unguarded backend access. Now emits `null` for non-delivery as a defensive compatibility measure.

**Impacted Areas**
- Modules: Order Placement, Payload Construction, Billing
- Screens / Flows: OrderEntry → Place + Pay (Prepaid), Place Order (Postpaid) — all non-delivery order types (walk-in / dine-in / takeaway / room)
- Components / Hooks / Utilities:
  - `toAPI.placeOrder` (lines 508–571) — patched
  - `toAPI.placeOrderWithPayment` (lines 637–733) — patched
  - `toAPI.updateOrder` (lines 575–630) — NOT patched; different endpoint, no reported failure
  - `buildDeliveryAddress` helper (lines 431–449) — unchanged

**Files Reviewed**
- `frontend/src/api/transforms/orderTransform.js` (lines 508–733)
- Runtime evidence: DevTools Network payload + Console error at `CollectPaymentPanel.jsx:336` → `onPaymentComplete` → `orderService.placeOrderWithPayment`

**Code Evidence Summary**
- Pre-fix: two call-sites used conditional spread / `if` block, so the `delivery_address` key was completely absent from non-delivery payloads.
- Post-fix: both call-sites unconditionally assign the key; value is full object for delivery orders, `null` otherwise.
- `buildCartItem` and all other payload-building logic untouched.

**Dependencies / External Validation Needed**
- Backend dependency (still open): Backend team must add `isset()` / `??` guards in the PHP controller so the frontend can eventually revert to strict gating if desired. Tracked in `AD_UPDATES_PENDING.md` Entry #6 (extended).
- API dependency: `/api/v2/vendoremployee/order/place-order` — behavior with `delivery_address: null` confirmed acceptable (same contract as pre-BUG-007). Behavior with key completely absent rejects with HTTP 500.
- Socket dependency: None.
- Payload dependency: None — fix is a one-key addition.
- Config dependency: None.

**Reproduction Understanding (pre-fix)**
- Step 1: Open OrderEntry, choose Walk-In (or Dine-In / Takeaway / Room).
- Step 2: Add items → Collect Payment → Place + Pay (Prepaid, any payment mode).
- Step 3: Observe `POST /api/v2/vendoremployee/order/place-order` → HTTP 500 with body `{"error":"Undefined array key \"delivery_address\""}`.
- Step 4: UI toast shows "Payment Failed — Undefined array key 'delivery_address'".

**Verification (post-fix)**
- Step 1: Open OrderEntry, choose Walk-In.
- Step 2: Add items → Collect Payment → Place + Pay with Cash.
- Step 3: Observe payload now contains `"delivery_address": null` for non-delivery orders.
- Step 4: Expect HTTP 200, order placed, auto-print fires (if enabled), order engages via socket.

**Open Questions / Unknowns**
- Does the same backend handler crash on `PUT /api/v1/vendoremployee/order/update-place-order` if the update payload omits `delivery_address`? The update-order payload (Flow 2) does NOT emit the key. If affected, extend the same null-default fix to `updateOrder`.
- Does the CollectBill / order-bill-payment flow (Flow 4) also access `delivery_address`? If so, extend the fix.
- Should scalar fields (`delivery_charge`, `address_id`, `paid_room`, `room_id`) eventually be gated by order type, per user's original BUG-016 intent? Blocked on the same backend-guard prerequisite.

**Notes**
- This fix is a **backward-compatibility workaround** to unblock production payment collection on non-delivery prepaid orders. The true fix is on the backend (`isset()` / `??` guard).
- BUG-007's design intent (sending the full object only on delivery) remains partially preserved: the object is still only emitted with real data for delivery orders; non-delivery orders send a sentinel `null`.
- Once the backend is patched, a follow-up ticket can revert frontend to strict omission to fully honor the original BUG-016 user intent.


---

## BUG-017 / Quantity Input — Amount Not Updating When Qty Is Typed (Items with Variants / Add-ons)

**User Reported Issue**
- When the quantity for a cart item is increased by typing a value directly into the Qty input field, the item's line amount (₹) does not update accordingly. The user reports this happens specifically for items that have variants and/or add-ons.
- Observed in screenshot (Screenshot 2026-04-21 at 11.45.42 AM):
  - `Vada Pav` — Qty `8`, Price shown as `₹280` (plain item, no variant row).
  - `Chai Vada Pav` (Options: Without Sugar) — Qty `98`, Price shown as `₹45` (clearly stale — still showing the unit price at qty 1).

**QA Status**
- Confirmed — for unplaced cart items added via the ItemCustomizationModal (items with selected variants, add-ons, or chosen size), the displayed line amount and the pre-placement cart subtotal/tax previews use a stale `item.totalPrice` that was fixed at add-time and is not recomputed when the cart quantity changes.
- Plain items added via the `addToCart` fast-path (no customization) are not affected — their display falls back to `item.price * item.qty` and updates correctly. This matches the screenshot (Vada Pav qty 8 × ~₹35 = ₹280 — correct; Chai Vada Pav qty 98 × ~₹45 = should be ₹4,410, but display shows ₹45 — incorrect).

**Current Code Behavior**
- Item is added to the cart via one of two paths:
  1. **Plain (no customization):** `OrderEntry.addToCart` (`OrderEntry.jsx` lines 398–415) spreads the catalog item into the cart item. It does **not** set a `totalPrice` field — so `item.totalPrice` remains undefined.
  2. **Customized (with size / variants / add-ons):** `ItemCustomizationModal.handleAddToOrder` (`ItemCustomizationModal.jsx` lines 123–150) calls `calculateTotal()` (lines 63–79) and stores the result as `customizedItem.totalPrice`. `calculateTotal` returns `(basePrice + variantsPrice + addonsPrice) * quantity` — baked in at add-time for the modal's then-current `quantity`.
     Then `OrderEntry.addCustomizedItemToCart` (`OrderEntry.jsx` lines 417–431) spreads the customized item into the cart, preserving `totalPrice`.
- Qty changes from the cart UI route through `OrderEntry.updateQuantity` (`OrderEntry.jsx` lines 436–478). For unplaced items (the "New Item" path) the entire body is:
  ```
  setCartItems(prev => prev.map(item => item.id === itemId ? { ...item, qty: newQty } : item));
  ```
  Only `qty` is updated. `totalPrice` is **not** recomputed. There is no hook that watches `qty` changes and recalculates `totalPrice` from `price + variant + addon` amounts.
- The cart row renders the amount at `CartPanel.jsx` line 235 (`NewItemRow`):
  ```
  ₹{(item.totalPrice || (item.price * item.qty)).toLocaleString()}
  ```
  `item.totalPrice` is truthy for customized items → the stale value is displayed. For plain items `item.totalPrice` is undefined/0 → fallback `item.price * item.qty` uses the live `qty` → updates correctly.

**Expected Behavior**
- When the cart quantity for a customized item changes (via +, −, or direct input into the Qty field), the displayed line amount must recompute to reflect `(basePrice + variantsPrice + addonsPrice) × newQty`.
- The pre-placement cart subtotal, tax preview, and Collect Payment grand-total previews that rely on line amounts must also reflect the updated quantity before the order is placed.

**Gap Observed**
- Stale `totalPrice` is not invalidated/recomputed when `qty` changes. No line of code in `updateQuantity` (or a reactive selector) recalculates it for customized items.
- Downstream cart-level aggregates in `OrderEntry.jsx` also use the same stale-prone expression `item.totalPrice || (item.price * item.qty)`:
  - `localSubtotal` (line 492–494)
  - `localTax` (lines 496–503) — uses `linePrice = item.totalPrice || (item.price * item.qty)`
  - `unplacedSubtotal` (lines 504–506)
  - `unplacedTax` (line 507+)
  These all under-report for customized items when qty is increased post-add.

**Impacted Areas**
- Modules: Cart / Order Entry, Item Customization, Billing preview (pre-placement)
- Screens / Flows: OrderEntry → Add Customized Item → change Qty in cart → observe line amount + subtotal + tax preview
- Components / Hooks / Utilities:
  - `OrderEntry.addToCart` (lines 398–415)
  - `OrderEntry.addCustomizedItemToCart` (lines 417–431)
  - `OrderEntry.updateQuantity` (lines 436–478) — unplaced path is line 477
  - `OrderEntry.localSubtotal` / `localTax` / `unplacedSubtotal` / `unplacedTax` (lines 492–513)
  - `CartPanel.NewItemRow` (lines 178–238) — rendering at line 235
  - `CartPanel.PlacedItemRow` (lines 30–175) — renders a different proportional formula at line 159, `Math.round(item.totalPrice / (item.qty || 1) * shownQty)`; separate code path and not the same bug
  - `ItemCustomizationModal.calculateTotal` (lines 63–79) and `handleAddToOrder` (lines 123–150) — source of the baked-in `totalPrice`

**Files Reviewed**
- `frontend/src/components/order-entry/OrderEntry.jsx` (lines 395–513 — add/update cart item and local totals)
- `frontend/src/components/order-entry/CartPanel.jsx` (lines 30–238 — PlacedItemRow + NewItemRow rendering)
- `frontend/src/components/order-entry/ItemCustomizationModal.jsx` (lines 60–150 — calculateTotal + handleAddToOrder)
- `frontend/src/api/transforms/orderTransform.js` (lines 265–353 — `buildCartItem` for API payload)

**Code Evidence Summary**
- `ItemCustomizationModal.calculateTotal()` returns `(basePrice + variantsPrice + addonsPrice) * quantity` and is stamped into `totalPrice` at add time only. No recomputation is wired to cart qty changes.
- `OrderEntry.updateQuantity` (line 477) only updates `qty`; `totalPrice` is preserved verbatim.
- `CartPanel.NewItemRow` line 235 displays `item.totalPrice || (item.price * item.qty)` — truthy `totalPrice` short-circuits the fallback, showing the stale amount.
- For the API payload (`buildCartItem`, lines 265–353), `food_amount = basePrice * (item.qty || 1)` and `lineTotal = fullUnitPrice * (item.qty || 1)` — these DO use the fresh `item.qty`. So once Place Order fires, the amount sent to backend is correct (for food_amount; variation/addon amounts are unit-level — not multiplied by qty).
- **Additional finding inside `buildCartItem` (requires validation):** for customized lines the qty multiplication for variation/addon is performed at the **total** computation step only. `variation_amount` (line 343) and `addon_amount` (line 344) are unit values (not × qty), while the line tax at lines 323–329 uses `fullUnitPrice * item.qty` — so tax is correct, but the per-line `food_amount + variation_amount + addon_amount` composition the backend may sum does not match qty-multiplied totals. This is outside BUG-017 scope but noted as a potential related gap; requires backend contract check.

**Dependencies / External Validation Needed**
- Backend dependency: None for the display bug — it is purely a frontend state-derivation issue.
- API dependency: `buildCartItem` already uses `item.qty` for `food_amount` — the actual placed-order amount is correct; verify whether backend recomputes line totals from `food_amount + (variation_amount * qty) + (addon_amount * qty)` or takes `food_amount` as-is.
- Socket dependency: None — bug is pre-placement (unplaced cart items).
- Payload dependency: None.
- Config dependency: None.

**Reproduction Understanding**
- Step 1: Open OrderEntry, select any table (e.g., dine-in).
- Step 2: Add an item that has a variant (e.g., `Chai Vada Pav` with "Options: Without Sugar") via the Customize modal; click Add to Order with qty 1.
- Step 3: Back in the Cart panel, either click the pencil-edit icon for the qty control (or use +/-/input) and type a new quantity (e.g., 98) into the Qty input — or press `+` repeatedly to increase qty.
- Step 4: Observe the line amount column — it does NOT update; it continues to show the unit price from the modal (e.g., `₹45` when qty=98, instead of `₹45 × 98 = ₹4,410`).
- Step 5: Repeat with a plain (non-customized) item — observed amount DOES update correctly (fallback path).

**Open Questions / Unknowns**
- None for the display/preview bug — root cause confirmed in code.
- Potential related question (outside BUG-017 core): confirm backend handling of variation/addon amounts when `quantity > 1` — `buildCartItem` emits them as unit values; if backend expects per-line totals (unit × qty), there may be a separate payload bug. This should be tracked separately if confirmed with backend.

**Notes**
- The bug is specific to unplaced items added through `ItemCustomizationModal` (customized items). Plain items routed through `addToCart` are unaffected because `item.totalPrice` is never set — the display falls back to the live `item.price * item.qty` expression.
- Placed-item rows (`PlacedItemRow`) use a different proportional formula (`totalPrice / item.qty * shownQty`) and are not part of this bug.
- Screenshot reference provided by user (Screenshot 2026-04-21 at 11.45.42 AM).

