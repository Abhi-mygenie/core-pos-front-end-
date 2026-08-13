# POS2.0 Wave 4 Owner Approval Plan — 2026-05-17

## 1. Purpose

This plan is produced **before any source code is modified**. It captures the proposed approach for Wave 4 (Print Cluster) and requires explicit owner approval before the code-diff preview (Gate 7) and implementation (Gate 8) can proceed.

No source files have been edited at this point. Only the planning docs and frontend `.env` have been written.

---

## 2. Repo / Commit State

| Item | Value |
|---|---|
| Repo URL | `https://github.com/Abhi-mygenie/core-pos-front-end-.git` |
| Branch | `17-may` |
| Commit hash (HEAD) | `e0293f8c22339ae60eab8ff7e08dbc31cca0b29a` |
| Setup mode | `wipe_and_fresh_clone` |
| Working tree status | Clean |
| Frontend deploy | ✅ yarn install + supervisor `craco start`; local + external preview return HTTP 200 |
| Commit allowed | No |

---

## 3. Inputs Read

### Baseline docs (`/app/memory/final/`)
- `FINAL_DOCS_APPROVAL_STATUS.md`
- `ARCHITECTURE_DECISIONS_FINAL.md`
- `MODULE_DECISIONS_FINAL.md`
- `CHANGE_REQUEST_PLAYBOOK.md`
- `IMPLEMENTATION_AGENT_RULES.md`
- `OPEN_QUESTIONS_FINAL_RESOLUTION.md`
- `BUSINESS_RULES_BASELINE_FINAL.md`

### Sprint reconciliation docs
- `POS2_0_MASTER_IMPLEMENTATION_PLAN_2026_05_17.md` (master plan)
- `POS2_0_MASTER_PLAN_AUDIT_AND_CORRECTION_2026_05_17.md` (audit — wins on conflict)
- `POS2_0_REMAINING_BLOCKED_BUG_PLANNING_2026_05_17.md` (Phase 4 planning)
- `POS2_0_PHASE_4_OWNER_DECISION_CAPTURE_2026_05_17.md` (Phase 4 owner answers)
- `POS2_0_PHASE_4_BACKEND_QUESTION_CAPTURE_2026_05_17.md`
- `POS2_0_PHASE_4_QA_REPRO_AND_CLOSURE_2026_05_17.md`
- `POS2_0_CLEAN_SAFE_BUG_IMPLEMENTATION_PLAN_2026_05_17.md`
- `POS2_0_OWNER_DECISION_BUG_PLANNING_2026_05_17.md`
- `POS2_0_PHASE_2_OWNER_DECISION_CAPTURE_2026_05_17.md`
- `POS2_0_BACKEND_SOURCE_OF_TRUTH_BUG_PLANNING_2026_05_17.md`
- `POS2_0_PHASE_3_BACKEND_OWNER_QUESTION_CAPTURE_2026_05_17.md`
- `POS2_0_PHASE_3_OPEN_QUESTION_COMPLETION_ADDENDUM_2026_05_17.md`
- `POS2_0_WAVE_3_IMPLEMENTATION_REPORT_2026_05_17.md`
- `POS2_0_WAVE_1_WAVE_2_FINAL_SMOKE_REPORT_2026_05_17.md`

### Code inspected (read-only)
- `api/transforms/orderTransform.js` (L1, L182-380, L1380-1727)
- `api/services/orderService.js` (L100-171)
- `components/cards/OrderCard.jsx` (L1-160, L700-790)
- `components/cards/TableCard.jsx` (L140-170)
- `components/order-entry/CollectPaymentPanel.jsx` (L750-850)
- `components/order-entry/OrderEntry.jsx` (L1230-1360, L1815-1955)
- `components/order-entry/RePrintButton.jsx` (full)
- `components/reports/OrderTable.jsx` (L1-400, L697-880)
- `components/reports/OrderDetailSheet.jsx` (L1-580)
- `pages/AllOrdersReportPage.jsx` (L1-200, L740-950)

---

## 4. Pre-Implementation Sanity Check — Wave 2 Has Landed

Wave 4 print parity (BUG-050) depends on Wave 2 financial changes being present. Spot checks on `api/transforms/orderTransform.js`:

| Wave 2 Change | Status | Evidence |
|---|---|---|
| BUG-051 always-ceil round-off | ✅ Present | L671 `roundOffEnabled ? Math.ceil(rawTotal) : ...` |
| BUG-054 VAT proration | ✅ Present | L655-657 + L681 `vat_tax: ...vatTaxPostDiscount...` |
| BUG-055 `order_discount_type` payload | ✅ Present | L986, L1110, L1302 |
| BUG-083 `delivery_charge_gst_amount` key | ✅ Present | L694, L1294, L1725 (additive, absent for non-delivery) |

Wave 2 + Wave 3 (BUG-080, BUG-056) are landed.

---

## 5. Bugs Proposed For Implementation (Wave 4 — Print Cluster)

| Bug | Plain-English Issue | Proposed Fix | Files To Modify | Risk | Approval Status |
|---|---|---|---|---|---|
| **BUG-050** | Dashboard "Print Bill" reprint shows different totals than Collect Bill after cancellation/discount/tip/SC | Inject stored order totals (esp. `discount`) into `buildBillPrintPayload` default branch so dashboard reprint matches Collect Bill values | `orderTransform.js` (2 spots), no call-site change | **MEDIUM** (hotspot file; touches all dashboard reprint paths) | pending_owner_approval |
| **BUG-057** | Prepaid orders need "Print Bill" available on Collect Bill panel and order screen (NOT on dashboard OrderCard) | Both surface buttons already exist (CollectPaymentPanel L827, OrderEntry L1833). Add the missing `canPrintBill` permission gate on the OrderEntry button per its own inline comment (L1831), so it's gated like the rest of the print actions. No new buttons added. | `OrderEntry.jsx` (1 line — add permission gate) | **LOW** (additive permission gate; existing button reachable for prepaid via re-engage → Collect Bill) | pending_owner_approval |
| **BUG-059** | Audit Report → Paid tab has no way to reprint a bill | Add a "Print Bill" row action button on Paid tab rows; wire through existing `actionsConfig` plumbing; use `print_icon` permission; no print on Cancelled tab | `OrderTable.jsx` (renderActionsCell Paid branch + actionsConfig destructure); `AllOrdersReportPage.jsx` (add `canPrintBill` + `onPrintBill` to actionsConfig + handler that fetches single-order data then calls `printOrder`) | **MEDIUM** (new UI surface; must use stored-totals path so financials match Collect Bill — depends on BUG-050 fix landing first) | pending_owner_approval |

Sequence: **BUG-050 → BUG-057 → BUG-059** (per master plan §5; BUG-059 reuses the BUG-050-corrected default branch).

---

## 6. Per-Bug Approval Details

### BUG-050 — Manual Bill Reprint Source-of-Truth (Option A: Collect Bill parity)

#### What is wrong in plain English
When a cashier clicks the printer icon on the dashboard OrderCard or TableCard (or the "Print Bill" pill in OrderEntry / RePrintButton), the bill payload is built by the **default branch** of `buildBillPrintPayload`. That default branch hardcodes `discount_amount: 0` (orderTransform.js L1671) and uses `overrideDiscount = 0` for SC/GST recompute (L1507-1508). The result: a reprint after a discount was applied at Collect Bill prints **subtotal/tax as if no discount existed** and the discount line shows ₹0. Tip already cascades from `order.tipAmount` (L1597, L1709), and delivery already cascades from `order.deliveryCharge` (L1603-1605). Discount is the missing cascade.

#### What I will change
1. Add `discount` to the `fromAPI.order` projection so socket-hydrated orders surface the stored backend discount (sourced from `restaurant_discount_amount` — same field the audit report reads in `reportTransform.js`, with `discount_value` as legacy fallback).
2. In `buildBillPrintPayload`, replace the literal `0` fallback in two spots with `parseFloat(order.discount) || 0`:
   - L1507-1508 (`overrideDiscount` used by SC + GST recompute)
   - L1671 (`discount_amount` emitted to the print payload)
3. Override branch is **untouched** — Collect Bill / OrderEntry auto-print continue to win because they pass `overrides.discountAmount` explicitly (CollectPaymentPanel.jsx L766, OrderEntry.jsx L1431 region).

#### Files I expect to modify

| File | What will change | Why this file |
|---|---|---|
| `frontend/src/api/transforms/orderTransform.js` | (a) Add `discount` field to `fromAPI.order` return (~L211 area). (b) In `buildBillPrintPayload`, replace `0` fallback at L1507-1508 + L1671 with `order.discount` cascade. | This is the single source of truth for the print payload; both default and override branches live here. |

No call-site changes in `OrderCard.jsx`, `TableCard.jsx`, `RePrintButton.jsx`, or `orderService.js`.

#### Code area / function / component
- `fromAPI.order` (orderTransform.js L162-380)
- `buildBillPrintPayload` (orderTransform.js L1389-1727)

#### What I will NOT touch
- Override branch values (`overrides.*`) — only the default fallback gets a new value.
- Tip cascade (already correct).
- Delivery / DeliveryGST cascade (already correct under CR-013 / BUG-083).
- Service charge applicability (BUG-023 gate at L1528-1529).
- Cancelled-item filtering (L1440-1444).
- Complimentary handling (BUG-018 Part 3 / BUG-021).
- `cgst_amount` / `sgst_amount` split (CR-013 Phase 1.5).
- Room print fields (REQ3 / BUG-063 — parked on backend).

#### Business rule protected
- **PAY-001/002/004** (payload contracts) — untouched.
- **TAX-001/002/003/008** — GST/VAT math unchanged because we only fix what flows in as `overrideDiscount`; existing post-discount formulas remain.
- **ROUND-002** (round-off to grand total only) — untouched.
- **TOTALS-001/002** — unchanged for non-default path; default path now matches Collect Bill which is the owner-approved parity target.
- **SC-001/002/003/006** — SC applicability gate untouched.
- **AD-101** (BUG-006) — SC on post-discount subtotal preserved.

#### Risk
**MEDIUM**. `buildBillPrintPayload` is touched by every print path in the app. However:
- We only change a fallback value (not the override branch).
- Tip already cascades the same way without regressions, so the pattern is proven.
- `fromAPI.order` is additive (new field only).
- If `restaurant_discount_amount` is absent from a socket payload, `order.discount` stays `0` and behavior is identical to today.

#### QA check after implementation
1. Place a dine-in order → at Collect Bill apply ₹50 discount → pay → print bill: capture printed bill.
2. Open the same order from dashboard → click printer icon → print bill: capture printed bill.
3. Compare: `discount_amount`, `gst_tax`, `cgst_amount` + `sgst_amount`, `order_subtotal`, `payment_amount` — must match across both prints to the rupee.
4. Repeat with: (a) cancellation + discount, (b) tip + discount, (c) walk-in, (d) takeaway (SC must NOT appear per BUG-023), (e) delivery (delivery GST present per BUG-083), (f) order with NO discount (regression: must be identical to current behavior).

#### Approval needed
- A. Approve this bug for code-diff preview
- B. Do not implement this bug
- C. Modify the approach (e.g., redirect dashboard print to override branch instead of injecting fallback)
- D. Need clarification first

---

### BUG-057 — Prepaid Print Bill on Collect Bill Panel + Order Screen (Option B)

#### What is wrong in plain English
Owner requested "Print Bill" be available for **prepaid** orders on two surfaces: the Collect Bill panel and the order screen. Dashboard OrderCard must **not** get one for prepaid (owner explicit). On inspection, both target buttons already exist in code:
- `CollectPaymentPanel.jsx` L827-839 — "Print Bill" button, gated on `hasPlacedItems && onPrintBill`. No `isPrepaid` block. ✅ Reachable for prepaid orders.
- `OrderEntry.jsx` L1833-1835 — `<PrintBillButton orderId={…} />` in the order screen header. Gated on `hasPlacedItems && (effectiveTable?.orderId || placedOrderId)`. No `isPrepaid` block. ✅ Reachable for prepaid.

However, the inline comment at OrderEntry L1827-1832 explicitly states "Visibility gate: **canPrintBill permission** + at least one placed cart item + an orderId resolved", but the **`canPrintBill` permission check is missing from the actual gate** — a defect-in-fix from the original CR-007 / A2.3 change. Adding that one check brings the order-screen Print Bill button in line with every other print action in the app (which uniformly gate on `canPrintBill` / `print_icon`).

CollectPaymentPanel's button does not need a change — it already requires `onPrintBill` prop, which OrderEntry passes only when its `canPrintBill` flag is true (CartPanel layer; verified at OrderEntry L239 + L1937). Actually checking again: `onPrintBill` is passed unconditionally to CollectPaymentPanel (L1317-1342). I'll add the same permission gate at L1833 for OrderEntry's PrintBillButton — but I will NOT change CollectPaymentPanel's gate (it is the owner-approved surface for prepaid and gating it on `canPrintBill` would also affect non-prepaid flows; that's out of scope for BUG-057).

**Net effect**: existing prepaid Print Bill availability on Collect Bill + order screen is preserved; the OrderEntry button gains the proper permission gate that the comment promised.

#### What I will change
- Add `canPrintBill && ` to the visibility predicate at OrderEntry.jsx L1833. `canPrintBill` is already defined at L239 (`hasPermission('print_icon')`).

#### Files I expect to modify

| File | What will change | Why this file |
|---|---|---|
| `frontend/src/components/order-entry/OrderEntry.jsx` | Add `canPrintBill &&` to the existing `{hasPlacedItems && (effectiveTable?.orderId || placedOrderId) && …}` predicate at L1833. | This is the order-screen "Print Bill" surface. The fix matches the inline comment intent (L1831). |

No new buttons added. No prop changes on `PrintBillButton`.

#### Code area / function / component
- `OrderEntry` component, header row inside the cart panel (~L1822-1835).

#### What I will NOT touch
- `CollectPaymentPanel.jsx` Print Bill button gate (already correct for owner intent).
- `PrintBillButton` component internals (`RePrintButton.jsx`).
- `OrderCard.jsx` / `TableCard.jsx` (Phase 4 owner explicitly excluded dashboard OrderCard from prepaid Print Bill).
- Any prepaid flow logic.

#### Business rule protected
- No business rules touched. Pure permission gating change.

#### Risk
**LOW**. Single-condition addition that aligns code with already-documented intent (the inline comment promises this gate). Non-permitted users will lose access to a button that the print policy already says they shouldn't have.

#### QA check after implementation
1. **Prepaid order → Collect Bill panel**: open a prepaid order from dashboard → click "Settle" or re-engage to OrderEntry → enter Collect Bill panel → "Print Bill" button visible → click → bill prints.
2. **Prepaid order → order screen**: re-engage a prepaid order → confirm Print Bill pill is visible in OrderEntry header (canPrintBill = true) → click → bill prints.
3. **Permission negative**: revoke `print_icon` on the role → confirm the order-screen Print Bill pill disappears (regression-safe baseline for the new gate).
4. **Dashboard regression**: confirm OrderCard prepaid row continues to show only "Settle" (no Print Bill) — unchanged.

#### Approval needed
- A. Approve this bug for code-diff preview
- B. Do not implement this bug
- C. Modify the approach (e.g., leave the button completely ungated to keep current behavior bit-identical)
- D. Need clarification first — happy to add a quick screenshot/recording demonstrating the buttons already work on prepaid before implementing

---

### BUG-059 — Audit Report Print Bill on Paid Tab (Options A + C + C)

#### What is wrong in plain English
The Audit Report Paid tab lists historical paid orders, but there is no way to reprint the bill from there. Owner approved a new row-action button on the Paid tab only, gated by current order permissions (`print_icon`), with **no print on cancelled rows**.

The Audit Report already wires per-row actions via `actionsConfig` (Change Method + Mark Unpaid on Paid; Collect Bill on Hold). The cleanest fix is to extend that same plumbing.

#### What I will change
1. **`OrderTable.jsx` — `renderActionsCell` Paid branch (L329-369)**:
   - Add a `canPrintBill` + `onPrintBill` destructure from `actionsConfig`.
   - Render a third button next to Change Method / Mark Unpaid: "Print Bill" pill (Printer icon + "Print" label, orange palette to match the existing CollectPaymentPanel/OrderEntry pills).
   - The button is **hidden** when `canPrintBill === false` (matches Change Method / Mark Unpaid hide-when-no-perm pattern at L330).
   - Eligibility: already excluded by `isOrderEligibleForRowActions` at L245-262 (RM/SRM/ROOM/aggregator excluded; PAID_ACTIONS_ALLOWED_METHODS gate keeps cash/card/upi only — same row eligibility as Change Method / Mark Unpaid).
   - data-testid: `row-action-print-bill-${order.id}`.

2. **`AllOrdersReportPage.jsx` — `actionsConfig` (L750-765)**:
   - Add `canPrintBill: hasPermission('print_icon')`.
   - Add `onPrintBill: handlePrintBillFromAudit` (new handler).
   - New handler (~50 lines): fetches the single-order detail via `getSingleOrderNew(orderId)` (already imported in `OrderDetailSheet.jsx`; will use the same service), then calls `printOrder(orderId, 'bill', null, order, scPctForPrint, { serviceChargeTaxPct, deliveryChargeGstPct }, printerAgents)` — **exactly the same call as `OrderCard.handlePrintBill` and `TableCard.handlePrintBill`**. Because BUG-050 will inject `order.discount` into the default-branch fallback, this audit reprint will automatically match the Collect Bill value.

3. **`OrderTable.jsx` — `renderActionsCell` (L269)**: widen `actionsConfig` destructure to include `canPrintBill, onPrintBill`. Update the Paid actions cell column width if needed (currently `w-44` at L169 — may need `w-56` to fit three pills; will measure during diff preview).

4. **No change** to `OrderDetailSheet.jsx` in this wave (owner spec is row-action; sheet-level print is not in scope and is not in the owner's Option A list).

#### Files I expect to modify

| File | What will change | Why this file |
|---|---|---|
| `frontend/src/components/reports/OrderTable.jsx` | Add `canPrintBill` + `onPrintBill` to actionsConfig destructure; add Print Bill button to Paid branch of `renderActionsCell`; possibly widen the actions column from `w-44` to `w-56`. | Where the per-row action pills are rendered. |
| `frontend/src/pages/AllOrdersReportPage.jsx` | Add `canPrintBill: hasPermission('print_icon')` and `onPrintBill: handlePrintBillFromAudit` to `actionsConfig`. Add `handlePrintBillFromAudit` handler (fetch single-order details → call `printOrder`). | Where actionsConfig + permission wiring live. |

#### Code area / function / component
- `OrderTable.renderActionsCell` (Paid branch L329-369)
- `AllOrdersReportPage.actionsConfig` (L750-765) + new handler in the same file

#### What I will NOT touch
- Hold tab Collect Bill button (L294-326).
- Change Method picker / Mark Unpaid (existing pills).
- Eligibility predicate `isOrderEligibleForRowActions` (no new exclusions needed — owner approved current permissions, same eligibility).
- Cancelled tab (no print button per owner Q-P4-PRINT-03c).
- `OrderDetailSheet.jsx`.
- `CollectBillPanelDrawer.jsx` (read-only drawer already passes `onPrintBill={null}` — that stays).

#### Business rule protected
- **PAY-001/002/004/007/008** — payment payload contracts untouched (this is a print, not a settlement).
- **ROUND-002** — preserved (uses same `buildBillPrintPayload` path).
- New row-action follows the same 2-day mutation window pattern as Change Method / Mark Unpaid? **No** — print is not a mutation; do NOT gate on `isWithinMutationWindow`. Owner Q-P4-PRINT-03b says "current order permissions" → `print_icon` only.

#### Risk
**MEDIUM**. New UI surface + new handler + dependency on BUG-050 fix to ensure printed bill matches Collect Bill value. Mitigations:
- Reuse existing actionsConfig plumbing (same pattern as Change Method).
- Use the exact same `printOrder` call as dashboard cards (no new printer-agent logic).
- Implement BUG-050 first so BUG-059 inherits the parity fix.

#### QA check after implementation
1. Audit Report → Paid tab → row with Cash/Card/UPI payment → "Print Bill" pill visible → click → bill prints → totals match what Collect Bill produced when the order was paid.
2. Audit Report → Paid tab → row with `transferToRoom` / `TAB` / `online` payment method → "Print Bill" pill **hidden** (existing PAID_ACTIONS_ALLOWED_METHODS gate).
3. Audit Report → Cancelled tab → no Print Bill pill on any row.
4. Audit Report → Hold / Running / Audit / Aggregator tabs → no Print Bill pill on any row.
5. Permission revoked (`print_icon` off) → Print Bill pill hidden on Paid tab.
6. Aggregator (Zomato/Swiggy) row on Paid tab → no Print Bill pill (existing eligibility filter at L250).
7. Room / SRM row → no Print Bill pill (existing eligibility filter at L248-249).
8. Date outside 2-day window → Print Bill pill **still visible and enabled** (print is not a mutation).

#### Approval needed
- A. Approve this bug for code-diff preview
- B. Do not implement this bug
- C. Modify the approach (e.g., add the action to OrderDetailSheet header as well; or gate on `isWithinMutationWindow` for parity with Change Method)
- D. Need clarification first

---

## 7. Recommended Implementation Order

Per master plan §5 (Wave 4):

1. **BUG-050** first — establishes default-branch parity for dashboard reprint. All downstream print surfaces (incl. BUG-057's prepaid reuse and BUG-059's audit reprint) inherit this fix automatically.
2. **BUG-057** second — single-line permission gate; safe to land after BUG-050 even though it's logically independent.
3. **BUG-059** third — depends on BUG-050 for financial parity in the audit reprint.

---

## 8. Approval Summary

| Bug | Approval Needed | Owner Decision |
|---|---|---|
| BUG-050 | Required before code diff | _pending_ |
| BUG-057 | Required before code diff | _pending_ |
| BUG-059 | Required before code diff | _pending_ |

---

## 9. Final Status

`owner_approval_plan_created_pending_approval`

Next gate: **Gate 7 — Stop for owner approval of approach.** No source files will be modified until owner replies.

---

*— End of POS2.0 Wave 4 Owner Approval Plan —*
