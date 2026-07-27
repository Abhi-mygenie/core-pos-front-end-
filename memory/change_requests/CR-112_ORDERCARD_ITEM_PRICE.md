# CR-112 — OrderCard Item Price Display

**ID:** CR-112
**Type:** CR (Enhancement)
**Created:** 2026-07-27
**Priority:** P3 — LOW
**Status:** DEFERRED — Owner decisions locked 2026-07-27
**Related:** CR-106, CR-111

## Description
Design mockup shows `₹120.00` per item line. OrderCard doesn't render item prices for ANY order type. Data is available (`item.unitPrice`, `item.price`) but not displayed.

**Owner decisions (LOCKED):**
- Scope: Aggregator only
- Approach: **Option B** — read `currencySymbol` from `useRestaurant()` context (already imported in OrderCard L95)
- Permission key: **EMPLOYEE-LEVEL permission** (role-based, from `role[]` in login response), NOT restaurant-level setting. Owner will provide exact key during role-gating CR. Current 53 permissions have no `show_price` key yet — backend to create.
- Current implementation: placeholder guard `isAggregator && item.unitPrice > 0`. Must be updated to `hasPermission('<key>') && isAggregator && item.unitPrice > 0` when key is available.
- Gap registered: `GAP-CR112-PRICE-PERMISSION` in OPEN_GAPS_REGISTER

## Blast Radius
SMALL — 1 file (`OrderCard.jsx`), ~3 lines.
