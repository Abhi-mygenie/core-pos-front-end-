# BUG-742 — Gate 3 Implementation Plan — Custom item KOT not printed on first placement (POS-4)

**Risk:** CRITICAL (printing) · **Gate:** full gate (OD-742-B) · **Severity:** P1 (OD-742-A) · **Station source:** auto (OD-742-C) · **Backend:** none.

## Root cause (confirmed)
`customItemFromAPI` (`api/transforms/orderTransform.js:2326-2337`) builds the cart item without a `station`, so `printerAgentSelector.cartStationsToSet` → `[]` → `selectAgentsForKot` → `[]` → payload `printer_agent:[]` + `station:null` → backend can't route the KOT on first placement. Reprint works (socket path sets station at `:134`).

## Exact edit (1 file, 1 line)
**`api/transforms/orderTransform.js`** — inside `customItemFromAPI`, add before the `addedAt:` line (~:2335):
```javascript
station:      data.station_name || null,
```
Rationale: backend resolves station from the chosen category (`station_source:'category'`) and returns it as `station_name` on the created product record (verified read-only on `get-products-list`: `station_name="KDS"`). `|| null` preserves the "no station ⇒ no KOT" contract.

## MUST verify first (dev test, blocks declaring sufficient)
Add a custom item on preprod via the UI and inspect the `POST /api/v2/vendoremployee/product/add-single-product` response → confirm `response.data.data.station_name` is present and populated from the selected category. (Overwhelmingly expected — same product entity as `get-products-list`.) If absent → STOP, the one-liner is insufficient; escalate (not expected per evidence).

## Verification matrix (full gate — E2E print)
| Case | Expected |
|---|---|
| Add custom item in category mapped to KDS → place order (first time) | KOT **prints** to KDS immediately; payload carries `station` + non-empty `printer_agent` |
| Add custom item, category with no station | no KOT (null) — existing contract preserved |
| Normal menu item placement | unchanged (station from `OrderEntry.jsx:93`) |
| Reprint KOT of a custom item | still works (unchanged socket path) |
| Multi-station order (custom + normal in different stations) | each routes to its own station |

## Regression / rollback
Single additive field read. Rollback = remove the one line. No change to `printerAgentSelector`, `buildCartItem`, socket/reprint, or the modal.

## Conflict note
`orderTransform.js` is R5 hotspot shared with CR-552 (PLANNING, edits `fromAPI.order`). This edit is in the isolated `customItemFromAPI` fn — no line overlap; coordinate commit order.
