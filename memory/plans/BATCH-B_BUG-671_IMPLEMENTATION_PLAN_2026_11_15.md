# BATCH-B · BUG-671 (Show Unpaid button for partial/split orders in Audit) — Implementation Plan (Gate 3) — 2026-11-15

> Status: GATE_3_PLAN_DRAFT
> HEAD commit: 66ffe518
> Risk: HIGH (payment reversal action exposed on report rows)
> Conflicts: OrderTable.jsx — no open Batch A/B/C/D edit on L248-259. CR-515 (Batch A) edits OrderReportBetaPage row-action buttons, NOT OrderTable.jsx. CR-542 (reason) wraps the same Unpaid action later — ship BUG-671 first or together.

## 1. What changes
Add `'partial'` to the Audit report's allowed-methods list so the "Unpaid" button appears for split/partly-paid orders. "Change Method" stays hidden for partial (Phase 2 per OD-671-A).

## 2. Files changed

| # | File | Line at HEAD | What changes |
|---|------|-------------|--------------|
| E1 | `src/components/reports/OrderTable.jsx` | L249 | Split the single allow-list into per-action lists: Unpaid includes `partial`, Change Method does not |

## 3. Exact edits

### E1 — OrderTable.jsx L249 + L256-259

**Before (L249):**
```js
const PAID_ACTIONS_ALLOWED_METHODS = ['cash', 'card', 'upi'];
```

**After:**
```js
// BUG-671: Unpaid is allowed for partial (split) payments; Change Method is not (Phase 2)
const UNPAID_ALLOWED_METHODS = ['cash', 'card', 'upi', 'partial'];
const CHANGE_METHOD_ALLOWED_METHODS = ['cash', 'card', 'upi'];
```

**Before (L251, `isOrderEligibleForRowActions` function, L258-259):**
```js
  if (tabId === 'paid') {
    const pm = (order.paymentMethod || '').toLowerCase();
    if (!PAID_ACTIONS_ALLOWED_METHODS.includes(pm)) return false;
  }
```

This function returns a single boolean for both Unpaid and Change Method. To split eligibility per action, change the function to accept an optional `action` parameter:

**After:**
```js
  if (tabId === 'paid') {
    const pm = (order.paymentMethod || '').toLowerCase();
    const allowList = action === 'changeMethod' ? CHANGE_METHOD_ALLOWED_METHODS : UNPAID_ALLOWED_METHODS; // BUG-671
    if (!allowList.includes(pm)) return false;
  }
```

Then update the call sites inside OrderTable.jsx where `isOrderEligibleForRowActions` is called for each button:
- Unpaid button: `isOrderEligibleForRowActions(order, 'paid')` → `isOrderEligibleForRowActions(order, 'paid', 'unpaid')`
- Change Method button: `isOrderEligibleForRowActions(order, 'paid', 'changeMethod')`

Alternatively, if the function signature change is too disruptive, keep the function as-is and add inline checks at the button render sites:

**Alternative (simpler, less invasive):**

Keep `PAID_ACTIONS_ALLOWED_METHODS` for Change Method. Add a separate check for Unpaid:

```js
const PAID_ACTIONS_ALLOWED_METHODS = ['cash', 'card', 'upi']; // Change Method
const UNPAID_ALLOWED_METHODS = ['cash', 'card', 'upi', 'partial']; // BUG-671: Unpaid includes partial
```

At the Unpaid button render site (~L1140 area), replace the `isOrderEligibleForRowActions` check with a direct `UNPAID_ALLOWED_METHODS.includes(pm)` check, or add a second eligibility function. **Gate 3 implementer: verify the exact render sites for Unpaid vs Change Method buttons and choose the cleanest approach. The key invariant is: `partial` → Unpaid YES, Change Method NO.**

## 4. Test steps
| # | Steps | Expected |
|---|-------|----------|
| V1 | Audit Paid tab: order paid via split (cash+UPI = partial) | "Unpaid" button visible |
| V2 | Click Unpaid on partial order | MarkUnpaidConfirmDialog opens, confirm → order moves to unpaid |
| V3 | Same partial order: "Change Method" | NOT visible (Phase 2) |
| V4 | Cash/card/UPI single-method orders | Unpaid + Change Method both visible (unchanged) |
| V5 | TAB/room/aggregator orders | No row actions (unchanged) |
| V6 | Webpack compile | 0 new warnings |

## 5. Rebase note
- CR-542 (mandatory reason for Unpaid) wraps the same action. If implementing together, CR-542 adds the reason dialog around the Unpaid confirmation. If BUG-671 ships first, CR-542 inherits the new `UNPAID_ALLOWED_METHODS` list.
- CR-515 (Batch A) edits `OrderReportBetaPage.jsx`, NOT `OrderTable.jsx`. No conflict.

## 6. Scope lock
**WILL change:** OrderTable.jsx (L249, L258-259 or button render sites)
**WILL NOT touch:** MarkUnpaidConfirmDialog.jsx, paymentMutationService.js, orderTransform.js, CollectPaymentPanel, OrderReportBetaPage, AllOrdersReportPage
