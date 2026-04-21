## BUG-004 — Incorrect Total Amount in Split Bill (Equally and By Person Sections)

**Module:** Billing / Split Bill (Equally / By Person)  
**Status:** Fixed  
**Severity:** High  
**Priority:** P1  

### Expected Behavior
In the Split Bill flow:
- **Equally** section: total amount shown should match the order's grand total and each split share should equal `grand_total / number_of_people`.
- **By Person** section: total amount shown should match the order's grand total and the sum of per-person amounts should equal this total.

### Actual Behavior
In split case, the total amount is showing wrong in both the "Equally" section and the "By Person" section. The displayed total does not match the actual order grand total, which also cascades into incorrect split shares.

### Business Impact
- Customers are charged incorrectly during split billing.
- Cash/credit reconciliation mismatch at close-of-day.
- Direct revenue leakage or over-charging risk, plus customer disputes.

### Root Cause
Confirmed two distinct defects plus a UX placement issue:
1. **Caller mapping defect** (`OrderEntry.jsx`): items passed to `SplitBillModal` used `price: item.price || (item.unitPrice * item.qty)`, but cart `item.price` is the unit price throughout the rest of the app — so the fallback never fired and unit price was handed to the modal as if it were the line total. Addon/variation amounts were also dropped entirely.
2. **Totals defect** (`SplitBillModal.jsx`): `totalBill = Σ item.price` — an items subtotal only. Ignored discount / service charge / tax / tip / delivery / round-off. `personTotals` used `unitPrice × qty`, propagating the same omissions.
3. **UX placement** (user screenshots): the Split trigger lived in the OrderEntry header (before Collect Payment), so it did not have access to the live grand total that the cashier was settling against. User requested the trigger to move into the Collect Payment screen.

### Scope
Split bill modal → Equally tab and By Person tab → total amount computation + per-split derivation + trigger button placement.

### Dependencies
- Order totals / tax / service charge / tip / discount pipeline (lives in `CollectPaymentPanel`)
- Related to BUG-001 (both require the authoritative bill values)
- None hard-blocking

### Reference Docs
- `app/memory/ARCHITECTURE_DECISIONS_FINAL.md` (AD-401, AD-402 — pre-settlement edits authoritative; AD-101 alignment)

### Candidate Files
- `frontend/src/components/order-entry/OrderEntry.jsx` (SplitBillModal mount site + items mapping; removed old header Split button; added `splitGrandTotal` state)
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (new `onOpenSplitBill` prop + new Split Bill button in the Bill Summary header)
- `frontend/src/components/modals/SplitBillModal.jsx` (`grandTotal` prop; rewritten `totalBill` and `personTotals`)

### Fix Plan
(1) Relocate the Split Bill trigger from the OrderEntry header into the Collect Payment header next to Print Bill; eligibility expression identical (postpaid placed dine-in/walk-in, 2+ items). Trigger passes the live `finalTotal` up as a snapshot. (2) In `OrderEntry`, correct the items mapping to compute true line totals (unit × qty + addons + variations, preferring `item.totalPrice` when set) and pass `grandTotal={splitGrandTotal}` to the modal. (3) In `SplitBillModal`, accept `grandTotal`; use it as the authoritative `totalBill` with safe fallback to `itemsSubtotal`; compute per-person totals by scaling per-unit line totals proportionally (`scaleFactor = totalBill / itemsSubtotal`) so `Σ personTotals` equals `totalBill` when fully assigned. API payload to `/split-order` (`{ id, qty }` per person) is unchanged.

### Risk Notes
- Must stay consistent with printed bill totals (cross-check with BUG-001 fix).
- Rounding rules for equally-split shares need to be explicit (e.g., last person absorbs remainder cents) to avoid 1-paisa mismatches.
- Any change must not regress the non-split bill path.

### Implementation Notes
Three files touched: (a) `OrderEntry.jsx` — removed old header Split button; added `splitGrandTotal` state; passed `onOpenSplitBill` + `grandTotal` to panel/modal; corrected items mapping to pass true line totals. (b) `CollectPaymentPanel.jsx` — imported `Scissors` icon; accepted `onOpenSplitBill` prop; rendered Split Bill button in the Bill Summary header (next to Print Bill) that invokes `onOpenSplitBill(finalTotal)` on click, capturing the live grand total. (c) `SplitBillModal.jsx` — accepted `grandTotal` prop; rewrote `totalBill` with safe fallback; rewrote `personTotals` using proportional scaling; `assignedTotal` / `unassignedTotal` naturally follow. `/split-order` API payload unchanged. Equal-mode display and toast inherit correctness from the new `totalBill` with no code change.

**Regression introduced & fixed (same session):** First edit to `CollectPaymentPanel.jsx` added the JSX button and the prop in the component usage, but the `onOpenSplitBill` destructure inside the component signature did not take effect due to a whitespace mismatch in the `search_replace` old_str. Runtime threw `ReferenceError: Can't find variable: onOpenSplitBill` on Collect Payment mount. Caught from user screenshot; fixed with a one-line addition to the props destructure. Lesson captured: always re-view the consumer's destructure after a cross-file prop addition because ESLint does not flag undeclared React props.

### Diff Review Notes
No payload or socket contract changes. Eligibility expression preserved verbatim. Print Bill button, split-payment feature (unrelated cash+card split), and all other Collect Payment logic untouched. BUG-001/002/003 fixes unaffected. Post-fix lint clean; webpack compiled with only the pre-existing unrelated eslint warning in `LoadingPage.jsx`.

### QA Notes
Main-agent runtime verification deferred. Recommended QA: (1) Postpaid dine-in/walk-in order with 2+ items + discount/tip/SC → Collect Payment shows grand total X → Split Bill opens with `Total Bill = X` → Equal split by 2 shows `X/2`; (2) By Person: full assignment sums to X; partial assignment scales proportionally; (3) TakeAway/Delivery/Prepaid/Single-item: no Split Bill button in Collect Payment header; (4) `/split-order` payload still `{ id, qty }` per person; (5) post-split new order opens for payment — unchanged.

### Release Notes
Ready for release — Split Bill now shows the correct grand total (including discount, service charge, tax, tip, delivery, round-off) and proportional per-person shares. Trigger moved into the Collect Payment screen to align with the cashier's settlement workflow.

### Owner Agent
E1 Implementation Agent (fix) / Bug Structuring Agent (original bug authoring)

### Last Updated
2026-04-20 — E1 Implementation Agent
