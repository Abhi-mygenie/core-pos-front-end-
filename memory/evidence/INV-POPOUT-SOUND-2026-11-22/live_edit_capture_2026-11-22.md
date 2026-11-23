# Live capture — owner's first web-EDIT order (acct pms@macha.com, rest 69)
Captured 2026-11-22. Token held in /tmp only (not stored here).

## The edited order: id=1579085, bill 000035
- BASELINE (pre-edit, captured earlier this session): order_from=**'pos'**, items=**25**, food7=**0**.
- AFTER EDIT (now): order_from=**'web'**, items=**26**, food7=**1**, f_order_status=**1**, order_in=None (table/counter).
- Appended web-edit line: detail_id=3970172, name='moo duudh', **food_status=7** (→ FE isNotConfirmed=true; mapped status 'pending', NOT cancelled).

## Both endpoints AGREE (boot path vs socket path)
| field | employee-orders-list (boot/reload) | get-single-order-new (socket fetch) |
|---|---|---|
| order_from | 'web' | 'web' |
| f_order_status | 1 | 1 |
| item food_status=7 count | 1 (detail 3970172) | 1 (detail 3970172) |

Stability: 3 consecutive list GETs → identical (order_from='web', fos=1, food7=1). No flapping.

## FE predicate evaluation for 1579085 (ScanOrderPopOut.jsx)
- isUnconfirmedScanOrder = isWebOrder && fos===7 && !scheduled → **FALSE** (fos=1, not 7)
- hasUnconfirmedWebEditItems = isWebOrder(T) && !scheduled(T) && fos!==7(T) && items.some(food_status===7 && !cancelled)(T) → **TRUE**
→ With the CURRENT (settled) data, the web-EDIT pop-out SHOULD open and persist across reload.

## What this proves / narrows
1. For a TABLE web-edit, BOTH boot and socket paths carry order_from='web' + the food_status=7 line. So the earlier "order_from omitted" hypothesis does NOT apply to table web orders (it DOES apply to ROOM orders — see baseline: order_in='RM' → order_from=None).
2. The static data is complete & stable now → the FE edit pop-out should fire. Therefore the owner's intermittent "doesn't open after INSTANT reload" is best explained by a **backend propagation / eventual-consistency window**: the edit's order_from flip (pos→web) and the appended food_status=7 line are NOT instantly reflected in employee-orders-list. EVIDENCE: the pre-edit baseline snapshot of this very order showed order_from='pos'/25 items/food7=0. A cold reload inside that window rebuilds OrderContext from the stale GET → no food_status=7 → pop-out does not open. After propagation (and once the socket in-memory state has been wiped by the reload), it only reappears on the next poll.
3. Architectural fragility: the pop-out depends ENTIRELY on transient order-level fos===7 OR per-item food_status===7 being present in whatever snapshot the boot GET returns. There is NO durable "unconfirmed web order/edit" flag that survives a reload-timing race.

## New-web-order sub-finding
- Live web orders 1579101/1579103/1579104/1579105 are at f_order_status=1 or 2 with NO item food_status=7 → neither pop-out predicate matches (new-order predicate needs fos===7). No web order in the 14-order list dwells at fos=7. Consistent with: unconfirmed web orders either sit at fos=7 only briefly before moving to 1, or are represented without order-level fos=7 — in both cases a cold reload after the status has moved will NOT re-open the pop-out. (To fully lock, needs a freshly-placed web order left UNCONFIRMED, captured immediately.)

## Recommendation refinement
- BACKEND: (a) ensure employee-orders-list reflects an edit (order_from + appended food_status=7) synchronously / with read-after-write consistency; (b) room orders must echo order_from='web' (BUG-701); (c) expose a durable order-level "yet_to_confirm"/"has_unconfirmed_items" boolean so the FE does not depend on a transient status that a reload can miss.
- FE (PLANNING): derive the pop-out from a durable flag (or from item food_status=7 regardless of order-level fos, which already works) AND persist the socket-confirmed YTC/web-origin set across reload so a cold boot inside the backend propagation window still shows the pop-out.
