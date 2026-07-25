# BUG-104 — Owner UAT Fix Verification — 2026-05-22

> **Status:** `bug_104_phase_1_uat_fixes_complete_ready_for_owner_signoff`
> **Predecessor:** `POS3_0_BUG_104_OWNER_UAT_FEEDBACK_CAPTURE_2026_05_22.md`

## Closure Matrix

| Feedback ID | Screen | Fix Applied | File(s) | Status |
|---|---|---|---|---|
| F-001 | SS0 | Added standalone top-level "Credit Management" entry (Wallet icon, `id: 'credit'`). | `src/components/layout/Sidebar.jsx` | ✅ Verified |
| F-002 | SS0 | Positioned directly above "Menu Management". `VISIBLE_SECTIONS` includes `'credit'`; removed temp `'orders'` parent exposure and `parentId === 'orders'` click branch. | `src/components/layout/Sidebar.jsx` | ✅ Verified |
| F-003 | SS1 | Wrapped page body in `max-w-7xl mx-auto px-6 py-4`. | `src/pages/CreditManagementPage.jsx` | ✅ Verified |
| F-004 | SS1 | Removed Email `<th>`/`<td>`. Search by email retained client-side. | `src/components/credit/CreditCustomerList.jsx` | ✅ Verified |
| F-005 | SS1 | Inline KPI strip rendered above search/filter — Phase 1: Outstanding tile only. Aggregates **all** customers (Q-A locked). Backend ask in flight for `total_credit` / `total_paid`. | `src/components/credit/CreditCustomerList.jsx` | ✅ Verified (Outstanding); ⏳ pending backend for the other two tiles |
| F-006 | SS2 | "First Tab" → "First Credit". | `src/components/credit/CreditCustomerDetailSheet.jsx` | ✅ Verified |
| F-007 | SS2 | `SummaryTile` accepts optional `sub` prop. Last Credit + Last Payment now stack date (primary) + time (smaller muted line) via new `formatTimeShort` helper. Tile height delta absorbed by existing padding (no row reflow). | `src/components/credit/CreditCustomerDetailSheet.jsx`, `src/api/transforms/creditTransform.js` | ✅ Verified |
| F-008 | SS2 | Column header "Credit ₹" → "Credit ( Bill )". | `src/components/credit/CreditCustomerDetailSheet.jsx` | ✅ Verified |
| F-009 | SS3 | Replaced custom `CreditBillDetailSheet` with the Audit Report `OrderDetailSheet` component. Custom file **DELETED**. | `src/components/credit/CreditCustomerDetailSheet.jsx`; **deleted** `src/components/credit/CreditBillDetailSheet.jsx` | ✅ Verified |
| F-010 | SS4 | No change (owner-approved as-is). Verified no regression. | (none) | ✅ Verified |
| Post-UAT bug | SS2/SS3 | Nested Escape was closing both sheets. Fixed by adding `onEscapeKeyDown` / `onPointerDownOutside` / `onInteractOutside` preventDefault on the SS2 `SheetContent` while `billOrder` is open. Shared OrderDetailSheet was NOT modified — fix lives entirely inside the credit wrapper. | `src/components/credit/CreditCustomerDetailSheet.jsx` | ✅ Verified (1st Esc closes SS3 only; 2nd Esc closes SS2) |

## Live Verification

- `yarn build` → 0 errors (1 pre-existing OrderEntry.jsx warning).
- Testing agent iteration_2: 26/27 pass; the one MEDIUM issue (Escape) was fixed and re-verified live.
- Live smoke checks (Palm House, owner@palmhouse.com):
  - SS1 KPI: **Outstanding ₹6,05,748.00**, 40 customers, 19 with balance.
  - SS2 Salik photographer: First Credit `08/09/25`, Last Credit `12/05/26 · ₹168.00` with `2:28 am` stacked below, "CREDIT ( BILL )" header.
  - SS3 audit OrderDetailSheet opens for order #000163 with "Cappuccino × 1 = ₹160".
  - Escape: 1st press closes SS3 only; 2nd press closes SS2.

## Backend Ask Still In Flight

Owner is forwarding the request to backend. When `/api/v1/vendoremployee/pos/tap-waiter-list` returns:
```
"total_credit": <number>,
"total_paid":   <number>,
"outstanding":  <number>
```
the SS1 KPI strip flips from 1 tile to 3 tiles. ~10-line additive change.

## Gate

**`READY_FOR_OWNER_SIGNOFF`**
