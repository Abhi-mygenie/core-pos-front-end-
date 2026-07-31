# CR-034 — Implementation Plan (Gate 3)

**Date:** 2026-06-11 · Workstream B · All decisions locked (Q4, ITEMS-BASIS, H22-KEY, Q-B)

## Scope (LOCKED)
Bucket split in Items & Menu. Punch-dated. No settlement flow-back (TAB cumulative).

## Changes
1. `frontend/src/api/services/insightsService.js` — `getItemSalesAggregated`:
   - Line bucket order of precedence: Cancelled (food_status 3) → Comp (complementary=1) → **Credit (parent pm='TAB')** → Sold (fs='6') → Pending
   - New aggregates: `totalRevenueCredit`, `qtyCredit` per item + meta totals
   - Order-level charges of TAB orders distribute into Credit bucket (not Sold)
2. `frontend/src/pages/reports-module/ItemSalesHybridMockup.jsx`:
   - "Added to Credit" tab/section mirroring Sold table (data-testid `items-credit-tab`)
   - Header label "By punch date" (Q-B)
   - Cancelled tab: wired to shared valuation + cancel_at (CR-031 dependency)
3. Comp lines: display value via `complementary_price` where shown (H22-KEY)

## Expected number shifts (harness targets)
May Palm House: Sold −≈₹49,460 (+charges share) → equals Ledger-Paid item scope; Credit bucket +same. All months both restaurants tabulated in harness.

## Sequencing
After CR-031 module exists (cancelled bucket) and alongside CR-030 B-2/B-3.

## QA
Harness identities: Sold ≡ non-TAB fs-6 items; Credit ≡ TAB items; Sold+Credit = old Sold (after BUG-126), to the rupee.

## Freeze-log
Items screen not frozen — none. Rollback: bucket branch revert (credit folds back into Sold).
