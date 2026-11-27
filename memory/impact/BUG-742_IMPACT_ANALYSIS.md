# BUG-742 — Impact Analysis (Gate 2) — Custom item KOT not printed on first placement (POS-4)

**Role:** PLANNING (Gate 2) · **Date:** 2026-11-20 (updated) · **Type:** BUG / FE_BUG · **Priority:** P1 (LOCKED OD-742-A)
**Risk:** **CRITICAL** (touches KOT printing routing — v0.7 rubric). **OD-742-B LOCKED = full gate** (no planning-skip).
**Owner decision:** OD-742-C LOCKED = **system decides the kitchen automatically** (backend-assigned station; no modal selector).
**Backend:** **NOT required** — see Verification below (brief WITHDRAWN).

## Code Reality: PARTIAL (buggy path present, no fix)
- `orderTransform.js:2326-2337` `customItemFromAPI` returns the cart item with **no `station` field** (reads only `id`, `name`, `price`).
- `OrderEntry.jsx:1652-1657` `handleAddCustomItem` → `POST ADD_CUSTOM_ITEM` (`/api/v2/vendoremployee/product/add-single-product`) → `customItemFromAPI(response.data.data, …)` → cart.
- `printerAgentSelector.js:99-108` `cartStationsToSet` skips items with null/empty station → `[]`; `:80` `selectAgentsForKot` early-returns `[]` → payload `printer_agent:[]` + `station:null` → backend can't route KOT.
- Reprint works because `orderTransform.js:134` socket path sets `station: detail.station || 'KDS'`.

## Chosen fix (FE-only, confirmed)
Add one line to `customItemFromAPI`:
```javascript
station: data.station_name || null,   // backend resolves station from the item's category (station_source:'category') and returns it as station_name; null preserves "no station = no KOT"
```

## ✅ Verification — DONE (read-only, no write, no backend change)
Live read-only probe 2026-11-20 (`get-products-list`, account owner@thegoankitchen.com) — every product record carries:
- `station_name` = **"KDS"**, `station_source` = **"category"**, `category_id` = 11187, plus `restaurant_printer_id` / `effective_restaurant_printer_id`.

So the backend **already maps category → station** (exactly as the owner stated) and surfaces it as **`station_name`** on the product record. `add-single-product` creates a product and returns that same record shape, so `response.data.data.station_name` is populated from the chosen category. **No backend work needed; the FE simply isn't reading the field.**

Residual micro-check (Gate-3 dev test only, not a blocker): confirm the `add-single-product` response key is literally `station_name` (same as `get-products-list`). Overwhelmingly likely — same product entity.

Note: the category→station link is NOT cleanly assembled on the FE (the `printers` config has `categoryIds` but no station label; `printerAgents` has the station `area_name` but no categories), which is exactly why reading the backend-resolved `station_name` off the response is the correct, simplest source.

## Conflict Pre-Check
| File | Risk | Overlap | Note |
|---|---|---|---|
| `api/transforms/orderTransform.js` | **R5 hotspot** | CR-552 PLANNING (`fromAPI.order` edits) | **DISTINCT function** (`customItemFromAPI`) — no line overlap; sequence politely on shared file |

## Affected files (WILL change)
1. `api/transforms/orderTransform.js:2336` — add `station: data.station_name || null,` inside `customItemFromAPI`. (1 file / 1 line)

## WILL NOT touch
`printerAgentSelector.js`, `buildCartItem`, socket/reprint path, the custom-item modal (no selector per OD-742-C), backend.

## Downstream / regression
Custom item → place → KOT prints immediately to the backend-assigned station. Regression: normal menu items unaffected; a product the backend returns with no station keeps the existing "no station = no KOT" (null) behaviour.

## Risk register
- CRITICAL: printing/KOT routing → full gate (OD-742-B) + E2E print verification + regression on normal items.
- Backend dependency: **NONE** (verified). Backend brief withdrawn.

## Gate-3 readiness: READY
All owner decisions locked (A=P1, B=full gate, C=auto station); fix source confirmed FE-only.

## Next
Gate 3 Implementation Plan (exact edit + Verification Matrix incl. the 1 micro-check). No code changed this gate.
