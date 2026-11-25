# BUG-742 — Custom (out-of-menu) item KOT not printed on first placement (POS-4) — INTAKE

**Gate:** 0→1 (INTAKE) · **Role:** INTAKE · **Date:** 2026-11-20
**Type:** BUG · **Class:** FE_BUG · **Area:** POS / Order Entry (KOT / Printing)
**Priority:** P1 (proposed) · **Risk:** CRITICAL (touches KOT printing routing — v0.7 rubric)
**Client:** ALL · **Assignee:** Abhishek (FE, not backend-blocked)
**Source:** AGENT-DISCOVERED · investigation `investigations/INV-KOT-CUSTOM-ITEM-2026-11-20.md` (HIGH confidence, 8/10 steps)

## Symptom
When a **custom / out-of-menu item** is added and the order is **placed for the first time**, the **KOT does not print** to the kitchen. A manual **Re-Print KOT** afterwards works correctly.

## Code reality (traced — buggy path PRESENT, no fix)
`customItemFromAPI` (`api/transforms/orderTransform.js:2326`) builds the cart item but **omits the `station` field**. Downstream:
- `cartStationsToSet` (`printerAgentSelector.js:99-108`) skips items with null/undefined station → returns `[]`
- `selectAgentsForKot` (`printerAgentSelector.js:80`) early-returns `[]` on empty station set
- place-order payload → `printer_agent: []` + per-item `station: null` (`orderTransform.js:772`)
- backend cannot route the KOT → **KOT not sent**

**Why reprint works:** the socket response enriches the placed item with `station: detail.station || 'KDS'` (`orderTransform.js:134`), so the reprint path has a valid station.

**Contrast:** normal menu items always carry `station: product.station || 'kitchen'` (`OrderEntry.jsx:93`).

## Recommended fix (reference — NOT implemented at intake)
Add one line to `customItemFromAPI`:
```javascript
station: data.station_name || null,   // backend resolves station from the item's category (station_source:'category') and returns it as station_name; null preserves "no station = no KOT"
```
`|| null` (not `|| 'KDS'`) keeps the existing "no station ⇒ no KOT" contract when the backend returns none.

## Evidence
- Screenshot: not provided
- Steps to reproduce: add custom item → place order → observe no KOT at kitchen; Re-Print KOT then prints
- Curl output: not applicable (FE transform bug)
- Source: AGENT-DISCOVERED (investigation) · **Confidence: SUSPECTED** (code-traced end-to-end, not yet live-reproduced in this intake)
- Investigation: `investigations/INV-KOT-CUSTOM-ITEM-2026-11-20.md`

## Duplicate check — DISTINCT
RELATED to: **CR-561** (POS KOT/price family, different code path), **BUG-663** & **BUG-297** (category station NULL → KOT routing broken), **CR-449** (item-level station mapping). No existing item covers `customItemFromAPI` station omission → register new.

## Severity rationale
Proposed **P1** — KOT failing to reach the kitchen on first placement is a core order-flow failure; the reprint "workaround" relies on staff noticing the missing ticket (unreliable). Owner may downgrade to P2 (scope limited to custom/out-of-menu items, reprint recovers).

## Risk rationale (rules)
Per v0.7 Risk Classification, **printing** is a CRITICAL trigger (and order-flow is HIGH). Change touches KOT printing routing → **CRITICAL**. Consequences: full gate flow + owner approval + E2E regression; **Fast Lane / planning-skip NOT eligible** (hotspot file `orderTransform.js` (R5) + printing). The investigation rated implementation *complexity* as LOW (1 file / 1 line) — that is complexity, not risk. Risk may only be **downgraded** with owner approval + written rationale.

## Blast radius
SMALL — 1 file, 1 line: `api/transforms/orderTransform.js:2326` (`customItemFromAPI`). Hotspot touched: **YES** (R5: `orderTransform.js`).

## Owner decisions
- **OD-742-C** — LOCKED 2026-11-20: **the system decides the kitchen automatically** (use the backend-assigned station; **no** station selector in the custom-item modal).
- **OD-742-A** — LOCKED 2026-11-20: severity **P1**.
- **OD-742-B** — LOCKED 2026-11-20: **run the full gate** (no planning-skip; CRITICAL risk retained — printing/KOT routing).

## Verification — DONE (FE-only, no backend needed)
Read-only probe 2026-11-20 (`get-products-list`) confirms every product record carries `station_name`="KDS", `station_source`="category", `category_id`=11187. The backend already resolves **category → station** and surfaces it as **`station_name`** on the product record (which `add-single-product` creates and returns). So:
- Fix = `customItemFromAPI` reads **`data.station_name`** (1 line). **No backend change.**
- BACKEND_BRIEF **WITHDRAWN** (`change_requests/BUG-742_BACKEND_BRIEF_ADD_SINGLE_PRODUCT_STATION.md`). Evidence: `evidence/BUG-742/PRODUCT_STATION_PROBE_2026-11-20.md`.
- Residual (FE Gate-3 dev test, not a blocker): confirm the add-single-product response key is literally `station_name`.

## Next
Intake → **Planning (Gate 2)** unless owner approves planning-skip with risk-downgrade rationale. No code changed.
