# Backend Brief — BUG-701: return `order_from="web"` for web-edited room orders

**For:** Backend team · **From:** PLANNING (Abhishek POS) · **Date:** 2026-11-18
**Priority:** P0 (supports BUG-701 FE fix) · **Status:** PROPOSED
**Related FE:** BUG-701 (`impact/BUG-701_IMPACT_ANALYSIS.md`)

---

## Problem
For **room** orders that have been edited via the web/YTC flow (appended `food_status=7` "Not-Confirm" lines), the backend returns `order_from` as `"pos"` or `null` across:
- `get-single-order-new` (`single-order-new`)
- socket frames on `new_order_<rid>` / `update-food-status`
- `running-order-list`

For equivalent **table** web orders, `order_from="web"` is returned correctly. The inconsistency makes the FE lose the web-origin flag on refresh (frontend has a guard shipping under BUG-701, but backend consistency is the robust fix).

## Evidence (RID 69, preprod)
- Order `1578881` (room a1, `rtype=RM`, `order_edit_count=12`, 5× `food_status=7` web-edit lines).
- `get-single-order-new(1578881)` → `order_from=null`, `order_in=null`.
- RAW socket frame (live cancel) → `order_from="pos"`, `restaurantTable.rtype="RM"`.
- Full evidence: `memory/evidence/BUG-701/`.

## Ask
Return `order_from="web"` (consistently, on all three channels above) for any order that originated from / was edited through the web/YTC flow — **regardless of table type (room vs dine-in)**. If a distinct "web-edited" marker is preferred over `order_from`, expose a stable boolean (e.g. `is_web_order` / `web_edited`) the FE can read instead.

## Acceptance
- `get-single-order-new`, running-order-list, and socket frames all report the same web-origin signal for a web-edited room order as they do today for a web-edited table order.
- No change to POS-originated orders (`order_from` stays `pos`/null).

## Notes
- FE ships a defensive guard regardless (preserve prior web-origin on refresh); this brief removes the root inconsistency so FE never has to infer it.
