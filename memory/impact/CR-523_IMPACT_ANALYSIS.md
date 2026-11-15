# CR-523: Link Customer Without Update / Complete. Impact Analysis (Gate 2), 2026-11-15

Code Reality: NONE. Today the customer is kept only in Order Entry state (`setCustomer`). It reaches the server only with `place-order`, `update-place-order` (only when new items exist, `OrderEntry` L1236-1253 early-returns when there are no unplaced items) or `collect-bill` (`orderTransform` L1384/L1751).
Conflict pre-check: `OrderEntry.jsx` (R5 hotspot): BUG-656 (GATE_5A) owns L2919 `onCustomerChange={isEditLocked ? undefined : setCustomer}`; CR-512 / BUG-662 (5A); Batch A CR-492/493/515 (Gate 3). **BUG-673 (this batch) is in the same file → same agent, BUG-673 first.** `CartPanel.jsx` customer search L988 (BUG-656). `CustomerModal` onSave at `OrderEntry` L3149-3163.
Risk: MEDIUM (order write on each save; customer DB side effect).
Backend-blocked: **NO**. Probe P3 confirms the existing `update-place-order` accepts a customer-only update (empty `cart-update`).

## Owner decisions (locked)
- Intake: the customer is saved **immediately on popup save**. Works after bill print. Change existing customer → check at impact.
- OD-523-A (R4): **keep it blocked when locked** (CR-489 ON + printed + no `order_edit_access`): the BUG-656 behaviour stays. Users with edit access, or outlets with the lock OFF, can link/change after print.
- OD-523-B (R4): **no automatic bill reprint**.

## Probe P3 (2026-11-15, cafe103, test order id 1578761, bill_print=Yes, cancelled after)
| Call | Result |
|---|---|
| `PUT update-place-order` with `cart-update: []`, `print_kot:'No'`, `printer_agent: []`, cust_name/mobile set | **200** "Items added to order successfully!", amount unchanged (420), lines unchanged (2), `user_id` 51320 linked, `user_name` set, bill_print stays Yes |
| same with a different name/mobile (**change existing**) | **200**, `user_id` → 51321 (new customer linked) |
| same with empty name/mobile (**remove**) | 200 but **customer NOT removed** (stays 51321) |
| side effect | each call: `order_edit_count` +1; the backend **creates a customer record** for a new mobile (51320, 51321 created on CAFE 103) |
Evidence: `evidence/BATCH-D-IA/probes_2026_11_15/P3_*.json`.

## Entry points to change
| # | Where | Today | Proposed |
|---|---|---|---|
| A | Header "add customer" → `CustomerModal` `onSave` (OrderEntry L3149-3163) | `setCustomer(customerData)` only | if the order is **placed** (`effectiveTable.orderId`) and not `isEditLocked` → `setCustomer` + call `update-place-order` with `newItems=[]`, `printAllKOT=false`, existing customer fields. Toast "Customer saved". On error: toast + keep local state |
| B | CartPanel inline customer search / select (L988 via `onCustomerChange`) | `setCustomer` only (disabled when locked, BUG-656) | same server save on select when the order is placed |
| C | New (unplaced) order | saved with place-order | unchanged |
| D | Locked (OD-523-A) | CartPanel disabled. **CustomerModal `onSave` still calls `setCustomer` (inconsistent)** | block both when `isEditLocked` (header button disabled/toast), aligned with BUG-656 |
Payload builder: reuse `orderToAPI.updateOrder(table, [], customer, orderType, { printAllKOT:false, ... })`. Gate 3 must verify `combinedTotals` with an empty `newItems` = placed totals only (no unplaced items leak into the amount when the cart also holds unsent items).

## Open points (Gate 3 / owner)
1. Remove a linked customer: the server ignores an empty name/mobile → "remove" can't be done through this call. Recommendation: the UI doesn't offer remove after placement (only change). Otherwise backend brief §2 (optional).
2. Unsent items in the cart while saving a customer: they're NOT sent (customer only). Owner to confirm at Gate 3 (recommendation: yes, customer only).
3. `order_edit_count` +1 per customer save: may show as an "edit" in reports/logs. Backend brief §2 asks whether a customer-only update can skip the count.
4. Collect Bill still sends the cust fields (L1751) → no conflict.

## Verification seeds
V1 Placed order, no new items → link customer → toast. Reopen the order on another device → customer shown.
V2 Change the customer → the new one is shown.
V3 Printed + lock OFF → allowed, no reprint. V4 Printed + lock ON + no permission → blocked (both entry points). V5 Printed + lock ON + permission → allowed.
V6 New order → unchanged. V7 Save fails (offline) → error toast, local state kept.
Regression: BUG-270 cust_mobile, CR-479 country code, BUG-656 lock, loyalty/wallet on collect, CRM customer lookup.
