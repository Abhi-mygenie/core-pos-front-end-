# INV unit-contract probe — Stock Audit `add-stock` + Smart Purchase `add-purchase` — 2026-09-25

```
Role:        INVESTIGATION (no app source changed; scripts + JSON live only under this folder)
Account:     QA_INV (read-by-pattern from memory/test_credentials.md via _common.py — never printed)
Host:        REACT_APP_API_BASE_URL from frontend/.env (preprod, RID 835)
Login:       POST /api/v1/auth/vendoremployee/common-login → 200 (login endpoint also 200)
Probe item:  #20326 UAT VIS SPICE PKT — unit pkt · small_unit gm · converion_factor 800 · baseline 7800 gm = 9.75 pkt
Runners:     run_s0_baseline.py · run_a_audit.py · run_b_purchase.py · run_c_restore.py (+ _common.py)
Raw:         s0_stock_inventory_raw.json · a_*.json · b_*.json · c_*.json · *_requests.jsonl (every write body)
Owner scope: "destructive, additive, both allowed" (2026-09-25)
```

## 0. Baseline read-back (`GET stock-inventory`) — 37 rows, 14 with conversion

| Field (raw) | Meaning confirmed by probe |
|---|---|
| `quantity` / `cal_quantity` | base (small_unit) quantity |
| `display_qty` / `display_unit` | quantity in purchase unit (`unit`) |
| `display_qty_text` | **backend already renders the breakdown**: `"9 pkt 600 gm"`, `"8 bottle 319 ml"`, `"4 tin 1440 gm"` |
| `display_qty_parts` | **`{major, major_unit, minor, minor_unit, sign}`** — the exact structure needed for the two-box converter UX (not mapped by `inventoryTransform.stockItem()` today) |
| `physical_qty` | last physical count **stored in the unit it was sent in** (BLACK OLIVE `4.9625` tin; ANGARA GREAVY `4600` → see §3) |

## 1. `run_a_audit.py` — `POST add-stock/{id}` recount matrix

| # | Body (`quantity:0, physicalqty_master:true` + …) | HTTP | Read-back `quantity` / `display` | Verdict |
|---|---|---|---|---|
| A1 | `unit:"pkt", physical_qty:9.75` (equal to current) | 200 | 7800 gm · 9.75 pkt · `wastage: null` | ✅ display unit honoured, no-op |
| A2 | `unit:"pkt", physical_qty:9` | 200 | **7200 gm** · 9 pkt · `wastage {Loss, current 9.75, physical 9, diff 0.75, unit pkt}` | ✅ factor ×800 applied |
| A3 | `unit:"gm", physical_qty:7800` (consumption unit) | 200 | `cal_quantity` 7800 ✅ **but `quantity` → 7.800, `display_unit` → "kg", text "9 kg 750 gm"**; `wastage {Gain, current 9, physical 7800, diff 0.75, unit kg}` (mixed units) | ⚠️ accepted but **NOT neutral** — rewrites display unit to kg and mixes units in the drift object |
| A4 | `unit:"pkt", physical_qty:9.5` | 200 | 7600 gm · 9.5 pkt (display_unit back to pkt) | ✅ decimals OK |
| A5 | `unit:""` | **422** | `errors.unit: "The unit field is required."` | unit mandatory |
| A6 | `unit:"xyz"` | **422** | `PURCHASE_UNIT_NOT_COMPATIBLE` — "Unit must be the purchase unit or consumption unit configured on this ingredient." | only `unit` or `small_unit` accepted |
| A7 | `unit:"PKT", physical_qty:9.25` | 200 | 7400 gm · 9.25 pkt | case-insensitive |
| A8 | `physicalqty_master` omitted | **422** | `vendor_id required` — treated as a purchase | flag is what marks recount |
| A9 | restore `unit:"pkt", physical_qty:9.75` | 200 | 7800 gm · 9.75 pkt | restored |

Side effects: every 200 recount creates a `purchase_id` / `transaction_id PUR-835-20260925-79xx` row with `added_quantity 0`, `price 0`, `vendor_id null` (ids 7959–7964, 7970, 7971) and a backend-computed `wastage` object.

## 2. `run_b_purchase.py` — `POST add-purchase` (vendor 280 "UAT Biryani Supplier", Cash)

| # | `purchase_items[0]` | HTTP | `added_items[0]` | Read-back | Verdict |
|---|---|---|---|---|---|
| B1 | `Unit:"pkt", quantity:1` | 200 | `stock_quantity 1, sunit pkt, calculate_quantity 800` | 7800 → **8600 gm** · 10.75 pkt | ✅ display unit × factor |
| B2 | `Unit:"gm", quantity:100` | 200 | `stock_quantity 100, sunit gm, calculate_quantity 100` | → 8700 gm · display_unit **stays pkt** | ✅ base unit ×1 (no display flip on purchase path) |
| B3 | `Unit:"pkt", quantity:1.5` | 200 | `calculate_quantity 1200` | → 9900 gm · 12.38 pkt · "12 pkt 304 gm" | ✅ decimals |
| B4 | `Unit:"xyz"` | **422** | `PURCHASE_UNIT_NOT_COMPATIBLE` | unchanged | same guard as add-stock |
| B5 | `Unit:"PKT"` | 200 | `calculate_quantity 800` | → 10700 gm | case-insensitive |

Side effects: 4 real purchase records (ids 7965, 7966, 7967, 7969; ₹103.50 total, invoice `PROBE-b*`) remain on preprod — no delete endpoint in the FE contract. Stock effect was wiped by the C1 recount (recount overrides absolute stock).

## 3. `run_c_restore.py`

| # | Action | Result |
|---|---|---|
| C1 | #20326 recount `pkt 9.75` | 7800 gm · 9.75 pkt — **probe item restored to baseline** |
| C2 | #20320 ANGARA GREAVY was `2,300,000 gm = 4600 pkt`, `physical_qty "4600"` → recount `pkt 9.4` | **4700 gm · 9.4 pkt · "9 pkt 200 gm"** — corrupted row repaired (value from BUG-459 report screenshot) |
| C3 | sub-recipe rows (#20324, #20335) | `has_unit_conversion:false`, piece/piece — converter UX not applicable; `addSubRecipeStock` path unaffected |

**#20329 UAT BIRYANI MASALA is still `250,000 gm = 500 pkt`** — same corruption signature (base number sent with `pkt` label); prior true value unknown, left untouched — owner to decide.

## 4. Contract conclusions (validated live)

1. **Both endpoints interpret the numeric quantity in the unit sent.** Accepted units: the ingredient's purchase unit (`unit` / `display_unit`) or its consumption unit (`small_unit`), case-insensitive; anything else → 422 `PURCHASE_UNIT_NOT_COMPATIBLE`; empty → 422.
2. **Owner's requested contract — send `unit = display unit` and quantity in display units — is accepted and correct** for both `add-stock` (recount) and `add-purchase`. Decimals (9.5 pkt, 1.5 pkt) convert exactly (`display × factor`).
3. **Sending the base unit on `add-stock` is unsafe**: it flips `display_unit` to an auto-normalised unit (gm → kg), rescales `quantity` (7800 → 7.800) and produces a mixed-unit `wastage` object. BUG-459 "Option A / keep base send" must be **withdrawn**.
4. **Current shipped FE is corrupting data (P0)**: `StockAuditPanel.jsx` L83 sends `unit: item.displayUnit` with `physical_qty: Number(entry.qty)` where the input placeholder/prompt is the **base** number (`item.quantity`). Real preprod damage: ANGARA GREAVY ×500 (repaired in C2), UAT BIRYANI MASALA ×500 (still corrupted). Smart Purchase (`SmartPurchasePanel.jsx` L216–217, `unit: r.unit` = smallUnit, base qty) is internally consistent today, so it does not corrupt — it only *displays* inconsistently.
5. Backend returns a ready-made drift object on recount: `wastage {type: "Loss (Wastage)"|"Gain (Found)", current_stock, physical_count, difference, unit}` in the **sent** unit — usable for the post-save toast; live pre-save drift still needs FE arithmetic.
6. Backend already supplies `display_qty_text` and `display_qty_parts {major, major_unit, minor, minor_unit, sign}` on `stock-inventory` — FE does not need its own breakdown helper for System Qty / On-Hand; a helper is still needed for FE-derived numbers (projected need, gap, suggested qty, live drift) and to compose the two-box input into `major + minor/factor`.

## 5. Implications for the proposed FE change (for Gate 2/3 — not implemented)

| Surface | Today | Required by validated contract |
|---|---|---|
| Stock Audit input | one box, base number implied, sent with display-unit label | two boxes `[major] displayUnit [minor] smallUnit` → send `unit: item.displayUnit`, `physical_qty: major + minor / conversionFactor` (or, for no-conversion items, `unit: item.unit`, `physical_qty: value`) |
| Stock Audit drift (pre-save) | `physical(base) − item.quantity(base)` labelled `displayUnit` | compute in base: `(major·factor + minor) − item.quantity`, render via breakdown helper; post-save may echo backend `wastage` |
| Smart Purchase payload | `Unit: smallUnit`, base qty | `Unit: display_unit`, `quantity: major + minor/factor` (both accepted; display form chosen by owner) |
| Smart Purchase columns | mixed base/display | breakdown helper on projected need / gap / suggested / qty-to-buy; On-Hand can use `display_qty_text` |
| Transform | `display_qty_parts` unmapped | map `displayQtyParts` in `fromAPI.stockItem` |

## 6. Residual risks / open items
- `#20329 UAT BIRYANI MASALA` still corrupted (owner decision: repair value?).
- Backend `wastage.unit` on base-unit recount is wrong (`kg` while `physical_count` is gm) — backend-side quirk, irrelevant once FE sends display units only; noted for a backend brief if base-unit sends are ever needed.
- 4 probe purchase rows (₹103.50) remain in preprod purchase/expense reports.
