# QA HANDOVER — CR-547 Selective KOT in ScanOrderPopOut

**Date:** 2026-11-19
**Role:** IMPLEMENTATION (Gate 4 GO, owner-approved)
**Risk:** HIGH (print payload)
**Files changed:** `src/components/dashboard/ScanOrderPopOut.jsx`, `src/pages/DashboardPage.jsx`
**Plan:** `memory/plans/CR-547_IMPLEMENTATION_PLAN.md` (9 edits E-1..E-9, all landed)

## 1. Inherited from Plan (Verification Matrix — self-test results)

| Edit | File | Change | Self-Test Result |
|------|------|--------|:---:|
| E-1 | ScanOrderPopOut.jsx L213 | `selectedItemIds` Set state | ✅ present |
| E-2 | ScanOrderPopOut.jsx | `_kotOrderId` + reset effect on order switch | ✅ present |
| E-3 | ScanOrderPopOut.jsx | `toggleKotItem` useCallback | ✅ present |
| E-4 | ScanOrderPopOut.jsx L524-549 | Edit-mode select-all row | ✅ present |
| E-5 | ScanOrderPopOut.jsx L561-570 | Per-item checkbox (new items) | ✅ present |
| E-6 | ScanOrderPopOut.jsx L621-656 | Normal-mode select-all row (`<>` wrap) | ✅ present |
| E-7 | ScanOrderPopOut.jsx L673-689,811 | Normal li → flex + checkbox + `flex-1 min-w-0` wrapper | ✅ present |
| E-8 | ScanOrderPopOut.jsx L884-901 | KOT button: count badge + disabled when none selected | ✅ present |
| E-9 | DashboardPage.jsx L1738 | `handleScanPrintKOT(order, selectedItems=null)` filters rawOrderDetails + stations | ✅ present |

**Compile:** webpack compiled successfully, 0 new warnings.

## 2. Test cases (require login on preprod + a live scan/web-edit order in queue)

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T1 | Default selection (normal) | Open scan popout for a normal YTC order | All non-cancelled items checked; KOT button reads `KOT (N)` |
| T2 | Deselect one item | Uncheck 1 item | Count drops by 1; button `KOT (N-1)` |
| T3 | Deselect all | Uncheck every item (or Deselect all) | KOT button disabled (greyed), title "Select items for KOT" |
| T4 | Select-all toggle | Click the select-all header | Toggles all items on/off; label flips Select all ↔ Deselect all |
| T5 | Selective print payload | Select 2 of N items → click KOT | KOT prints ONLY the 2 selected items to their stations (`billFoodList`/`rawOrderDetails` filtered) |
| T6 | Edit-mode default | Open a web-edit order with new unconfirmed items | Only NEW items default-selected; previously-ordered items not checkboxed |
| T7 | Cancelled items | Order with a cancelled line | Cancelled line has no checkbox and is not printable |
| T8 | Order switch reset | Next/Prev to another order | Selection resets to that order's defaults |
| T9 | Backward-compat | (regression) existing full-order KOT path | With all items selected, KOT output == pre-CR-547 behaviour |

## 3. Regression tests
- CR-545 banner KOT still prints full order when all items selected.
- CR-552 edit-mode two-section render (new on top, prev collapsed) still intact.
- BUG-702 variation option labels still render.
- Per-item cancel (onCancelItem) still works alongside the new checkbox.

## 4. Known pre-existing issue (NOT CR-547)
`src/__tests__/components/dashboard/ScanOrderPopOut.test.jsx` fails 22/29 on BOTH
original and CR-547 code (stale fixtures — component renders empty in jsdom).
Verified via git-stash A/B. Out of scope for CR-547.

## 5. Credentials + Environment
- Preview URL: https://restaurant-pos-ui-8--7hj8onke.preview.emergentagent.com
- Login creds: NOT available in this pod (`memory/test_credentials.md` is gitignored/empty).
  QA needs a real preprod restaurant login + a live scan/web-edit order to exercise the popout.
