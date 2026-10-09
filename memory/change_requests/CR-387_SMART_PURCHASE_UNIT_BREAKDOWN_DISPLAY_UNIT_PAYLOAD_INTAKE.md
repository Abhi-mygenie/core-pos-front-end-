# CR-387 — Smart Purchase (Stock Update): unit-consistent quantity breakdown for Projected Need / Gap / Suggested / Qty to Buy + two-box purchase quantity + send display unit & display quantity — INTAKE 2026-09-25

**Source:** OWNER-REPORTED (UX: "Smart Purchase mixed units" → converter-style `[15] tin [305] gm`, "send both in display unit and quantity") · investigation 2026-09-25 + live probe B1–B5 → owner confirmed registration ("A", 2026-09-25).
**Sprint:** `sep_bug_closure` · **Gate:** 1 (INTAKE)
**Related:** CR-078 (planner), BUG-240 (On-Hand display unit — fixed On-Hand only), BUG-455 (`display_qty_text` on On-Hand, Gate 5A), CR-348 (per-unit rate derivation in payload), BUG-458 (vendor name), BUG-459 (shared breakdown util; Stock Audit counterpart)

---

## Classification

| Field | Value |
|---|---|
| Type | CR (UX change + payload contract change) |
| Priority | **P1 — HIGH** — a single row mixes three bases (On-Hand in display unit, Projected Need / Gap / Suggested / Qty to Buy in base unit, some unlabelled); staff cannot reason about how many packets to buy. Not corrupting today (payload is internally consistent: base unit + base qty). |
| Risk | **HIGH** — API contract change on `add-purchase` `purchase_items[].Unit` + `quantity`; financial adjacency: CR-348 derives `rate = total / qty` per unit → must be re-based on display qty or the stored per-unit rate changes meaning |
| Fast Lane eligible | **NO** |
| Code reality | **NONE** — `grep display_on_hand\|display_unit purchasePlanner.js` shows display values computed for On-Hand only (L130–131); `AutoShoppingList.jsx` renders `projected_need`, `gap`, `suggest_qty`, `qty` raw; `SmartPurchasePanel.jsx` L216–217 sends `unit: r.unit` (= `smallUnit`), `quantity: Number(r.qty ?? r.suggest_qty)`, `conversionFactor: 1`. No breakdown util in `src/`. |
| Duplicate check | **RELATED to BUG-240** (same symptom family; BUG-240 converted On-Hand only) — register new. |

---

## Requirement

Today (`AutoShoppingList.jsx`, top list + bottom "all ingredients"):
- On-Hand → `display_on_hand display_unit` (+ `display_qty_text`, BUG-455) → **8 bottle 319 ml**
- Projected Need / Gap / Suggested Qty / Qty to Buy → base numbers (`ml`), partly unlabelled → **5520 / 1300 / 1300 / [1300]**

Expected:
1. Every quantity column in both tables renders through the shared breakdown util: `whole displayUnit remainder smallUnit` (e.g. **2 bottle 0 ml → "2 bottle"**, **1 bottle 650 ml**); On-Hand may keep backend `display_qty_text`.
2. Qty to Buy input = two-box converter `[ 2 ] bottle [ 0 ] ml` (labels locked); FE composes display qty = `major + minor/factor`; total shown alongside.
3. Payload (`SmartPurchasePanel.jsx` → `toAPI.addPurchase`): `Unit: r.display_unit`, `quantity: <display qty>` — **backend-accepted** (probe B1 `Unit:"pkt", quantity:1` → +800 gm; B3 `1.5 pkt` → +1200 gm; `Unit:"xyz"` → 422 `PURCHASE_UNIT_NOT_COMPATIBLE`; case-insensitive). Base-unit purchases stay valid (B2) — no display flip on this endpoint.
4. CR-348 rate derivation `rate = Number(r.rate) / qty` must use the **same** qty basis that is sent (display) so `rate` = price per display unit.
5. Items without conversion: single box, `Unit: r.unit` (unchanged behaviour).

---

## Evidence

| Item | Detail |
|---|---|
| Probe pack | `evidence/INV-UNIT-CONTRACT/probes_2026_09_25/PROBE_REPORT.md` §2 — `run_b_purchase.py`, raw `b_*.json`, bodies in `b_requests.jsonl` (pointer `evidence/CR-387/PROBE_POINTER.md`). 4 probe purchase rows remain on preprod (ids 7965/7966/7967/7969, ₹103.50). |
| Code trace | Investigation summary in `investigations/BUG-459_INVESTIGATION_REPORT_2026_09_25_DRIFT_WRONG_UNIT.md` §10 + handoff notes; planner L117–131, list render sites, panel L216–219 |
| Mockups (proposal only) | `frontend/public/inv-unit-proposal-mockup.html`, `inv-real-data-proposal.html`, `inv-final-proposal.html`, `inv-proposal-inv2-inv3.html` (static, created during investigation; values illustrative) |
| Screenshot | Owner-described row (UAT BAR BEER) — not stored |
| Steps to reproduce | Inventory › Stock Update · pick a converted ingredient (UAT BAR BEER 650 ml/bottle) · compare On-Hand "8 bottle 319 ml" with Projected Need / Gap / Qty to Buy shown in ml with no unit |
| Source | OWNER-REPORTED |
| Confidence | **CONFIRMED** (code-traced; backend contract live-verified) |

---

## Blast Radius

| File | Change | Lines (est.) | Hotspot |
|---|---|---|---|
| `src/utils/purchasePlanner.js` | rows carry `conversion_factor`, `small_unit`; derived breakdown for `projected_need` / `gap` / `suggest_qty` | ~10–15 | NO |
| `src/components/inventory/smart/AutoShoppingList.jsx` | ~5 render sites → breakdown text; Qty to Buy → two-box input (both tables) | ~40–60 | NO |
| `src/components/inventory/SmartPurchasePanel.jsx` | row state `qtyMajor/qtyMinor`; payload `unit: r.display_unit`, `quantity` display; CR-348 rate divisor re-based | ~10–15 | NO |
| `src/utils/quantityBreakdown.js` (NEW — owned by BUG-459) | shared | — | — |

- `grep -n "suggest_qty\|projected_need\|gap\|display_on_hand\|r.qty" AutoShoppingList.jsx` = 21 lines
- Blast radius: **MEDIUM** (3 files + shared util) · R5 hotspot: NO · Financial: rate/amount derivation touched (CR-348) → owner approval matrix applies
- **Sequencing:** BUG-455 edited `purchasePlanner.js` + `AutoShoppingList.jsx` (Gate 5A, QA pending); depends on BUG-459 util.

---

## Owner Decisions

| ID | Decision | Status |
|---|---|---|
| OD-387-01 | Payload basis: (a) keep base unit + base qty (accepted, no corruption, zero contract change) · (b) display unit + display qty (owner-stated preference, backend-accepted) | **LOCKED (b) — add-purchase payload Unit = display_unit, quantity = display qty (4 dp); rows without conversion keep Unit: r.unit.** |
| OD-387-02 | CR-348 rate semantics after (b): `rate` = price per **display unit** (recommended, matches manual Purchase Entry which sends `Unit: ing.unit`) | **LOCKED YES — rate = ₹ per display unit (divisor = display qty); Amount total unchanged.** |
| OD-387-03 | Apply breakdown + two-box input to the bottom "all ingredients / manual add" table as well as the top purchase list | **LOCKED (a) — table 2 (All Ingredients) read-only breakdown text for Projected Need / Suggested Qty; two-box input only in table 1 (Purchase List).** |
| OD-387-04 | Vendor preview (`GroupedVendorPreview.jsx`) quantities rendered in the same breakdown | **LOCKED YES — GroupedVendorPreview quantities rendered as breakdown.** |
| OD-387-05 | Rounding of minor remainder (0 dp for gm/ml/piece; 2 dp otherwise) | **LOCKED YES — minor 0 dp for gm/ml/piece, 2 dp otherwise (shared with OD-459-04).** |

---

## Next
**Gate 1 registered 2026-09-25.** → PLANNING Gate 2 (after BUG-459 util shape is fixed; sequence after BUG-455 Gate 5b) → Gate 3 → owner Gate 4 GO.
