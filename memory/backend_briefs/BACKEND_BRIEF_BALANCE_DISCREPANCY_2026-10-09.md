# BACKEND_BRIEF_ISSUE4_BALANCE_DISCREPANCY_2026-10-09

## Summary
- Issue: InHouse balance column shows ₹827 but CPP bill summary shows ₹848 for the same guest (bonk, room r4, booking MG-69-2C201998-53D8-4980-A6A8-B042088BFC9D)
- Classification: DATA_EDGE / CONTRACT_MISMATCH
- Frontend impact: Cashier sees ₹827 in the In-House list but is asked to collect ₹848 in the checkout panel — ₹21 discrepancy causes confusion
- Priority/Risk: P2 / HIGH

## Analysis
Consistent ₹21 difference across all states tested (with and without room discount):
- InHouse balance ₹827 = room_balance(₹600) + food_items(₹122+₹105=₹227)
- CPP bill summary ₹848 = order.amount(₹248) + folio_room_balance(₹600)
- ₹248 - ₹227 = ₹21 discrepancy in food total
- ₹21 ≈ service charge (~9%) on ₹227 food ≈ ₹20.43

## Root Cause Hypothesis
`charge.balance_due` (from the InHouse reservation list API) computes the food portion WITHOUT service charge (₹227), while `order.amount` from the folio API (singleOrderNew) includes service charge (₹248). The room component is consistent (₹600 in both). The SC of ₹21 is present in one computation but absent in the other.

## Endpoints
- InHouse list: POST /api/v2/vendoremployee/aiosell/local-reservations (restaurant_id=69, status=in_house)
  → `charge.balance_due` field
- Folio order: POST /api/v1/order/singleOrderNew (order_id=1233012)
  → `amount` field (food total used as `order.amount` in CPP)

## Reproduction
1. Login as owner@thegoankitchen.com (RID 69)
2. Navigate to PMS → Front Desk → In-House tab
3. Find "bonk" guest (MG-69-2C201998-53D8-4980-A6A8-B042088BFC9D, room r4)
4. Balance column shows ₹827
5. Click Bill → CPP bill summary shows ₹848

## Expected vs Actual
- Expected: Both show the same total (₹848 including SC, OR ₹827 excluding SC — consistent)
- Actual: InHouse column ₹827 (no SC on food) vs CPP bill summary ₹848 (SC included on food)

## Questions for Backend
1. Does `charge.balance_due` in the InHouse list response include service charge on room food orders?
2. Does `order.amount` in singleOrderNew include SC?
3. Should `charge.balance_due` be updated to match the folio total (i.e., include SC)?

## Frontend Workaround
- Available: NO — both values come directly from backend API fields
- The frontend correctly shows what the backend provides; the backend must be the source of truth

## Evidence
- Screenshots provided by owner showing ₹827 (balance column) and ₹848 (bill summary) simultaneously
- Mathematical analysis: ₹848 - ₹827 = ₹21 ≈ SC on ₹227 food
- Report at: /app/memory/BUG-INV-OCT09_INVESTIGATION_REPORT.md
