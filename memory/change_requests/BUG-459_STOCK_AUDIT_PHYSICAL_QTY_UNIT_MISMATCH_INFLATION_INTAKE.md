# BUG-459 — Stock Audit physical count: base-unit number sent with display-unit label → ×factor stock inflation on save; drift badge mixes units — INTAKE 2026-09-25

**Source:** AGENT-DISCOVERED (Investigation 2026-09-25, `investigations/BUG-459_INVESTIGATION_REPORT_2026_09_25_DRIFT_WRONG_UNIT.md` + §10 live-probe addendum) → owner confirmed registration in intake chat ("A", 2026-09-25).
**Sprint:** `sep_bug_closure` · **Gate:** 1 (INTAKE)
**Related:** BUG-379 (introduced the send path 2026-09-03), BUG-223 (drift preview badge), BUG-455 (same files — Gate 5A awaiting QA, sequencing conflict), BUG-321 (sub-recipe drift semantics), CR-387 (Smart Purchase counterpart, shares breakdown util)

---

## Classification

| Field | Value |
|---|---|
| Type | BUG (data corruption + wrong drift label) |
| Severity | **P0 — CRITICAL** — every Stock Audit save on a converted ingredient silently multiplies on-hand stock by the conversion factor (rubric: data corruption) |
| Risk | **CRITICAL** — API contract (`add-stock` `unit`/`physical_qty`) + data corruption → full gate flow + owner approval + E2E regression + audit note (R6 Risk table) |
| Fast Lane eligible | **NO** |
| Code reality | **NONE** — `grep display_qty_parts\|displayQtyParts\|BUG-459 src/` = 0 hits (2026-09-25). `StockAuditPanel.jsx` L47–54 `getDrift()` and L81–87 `addStock()` call unchanged since BUG-379/BUG-455. |
| Duplicate check | **DISTINCT** — BUG-379 fixed the 422 by adding the fields (and introduced this); BUG-223 styled the badge; BUG-455 appended `display_qty_text` to the book-stock cell only. None addresses unit of the sent value. |

---

## Symptom

`StockAuditPanel.jsx`:
1. System Qty cell shows `item.displayQty item.displayUnit` (+ BUG-455 `display_qty_text`, e.g. **9 pkt 200 gm**).
2. Physical Qty `<Input placeholder={String(item.quantity)}>` (L184) → placeholder is the **base** number (`4700`), no unit label → staff type a base-unit count.
3. `handleSaveAll()` L81–87 sends `unit: item.displayUnit || item.unit` with `physicalQty: Number(entry.qty)` → backend interprets `physical_qty` **in the unit sent** (probe A1–A9) → `4700 pkt` = 2,350,000 gm.
4. `getDrift()` L47–54: `diff = Number(entry.qty) − Number(item.quantity)` (base arithmetic) returned with `unit: item.displayUnit` → badge reads e.g. **"-100.00 pkt"** for a 100 gm difference.

**Live proof (preprod RID 835, 2026-09-25):** ANGARA GREAVY `quantity 2,300,000 gm = 4600 pkt`, `physical_qty "4600"` — user typed 4600 (gm), FE sent 4600 pkt (×500). Repaired to 9.4 pkt = 4700 gm in probe C2. **UAT BIRYANI MASALA #20329 `250,000 gm = 500 pkt` still corrupted** (OD-459-01).

**Validated contract (`POST add-stock/{id}`, `quantity:0, physicalqty_master:true`):** `unit` ∈ {purchase unit, consumption unit} case-insensitive → number converted with `converion_factor`; other unit → 422 `PURCHASE_UNIT_NOT_COMPATIBLE`; empty → 422; `physicalqty_master` omitted → 422 vendor_id required (treated as purchase). **Base-unit send is NOT safe**: flips `display_unit` → auto-normalised kg and rescales `quantity` (probe A3) → the earlier "Option A: keep base send, fix label" is withdrawn. Response carries `wastage {type, current_stock, physical_count, difference, unit}` in the sent unit.

**Expected (owner direction 2026-09-25):**
- Physical count entry = two-box converter, unit labels locked: `[ 15 ] tin  [ 305 ] gm` (display-unit whole + base-unit remainder). Items without conversion keep a single box (OD-459-02).
- Payload: `unit: item.displayUnit`, `physical_qty: major + minor / conversionFactor` (display units — backend-accepted). No-conversion items: `unit: item.unit`, `physical_qty: value`.
- Drift computed in base units `(major·factor + minor) − item.quantity`, rendered as breakdown (`-1 pkt 200 gm`), never a base number with a display label.
- Post-save toast may echo backend `wastage.type/difference/unit`.
- Transform maps `display_qty_parts {major, major_unit, minor, minor_unit, sign}` (already in the API, unmapped).

---

## Evidence

| Item | Detail |
|---|---|
| Investigation report | `investigations/BUG-459_INVESTIGATION_REPORT_2026_09_25_DRIFT_WRONG_UNIT.md` (§1–9 code trace, §10 live-probe addendum) |
| Arithmetic trace | `evidence/BUG-459/getDrift_analysis.json` |
| Live probe pack | `evidence/INV-UNIT-CONTRACT/probes_2026_09_25/PROBE_REPORT.md` — runners `run_a_audit.py`, `run_c_restore.py`; raw `a_*.json`, `c_*.json`; every write body in `a_requests.jsonl`, `c_requests.jsonl` (pointer: `evidence/BUG-459/PROBE_POINTER.md`) |
| Screenshot | Owner screenshot 2026-09-25 (ANGARA GREAVY `-100.00 pkt`, described in report §4) — not stored on disk |
| Steps to reproduce | 1. Inventory › Stock Audit · 2. Converted item (e.g. UAT VIS SPICE PKT 9.75 pkt / 7800 gm) · 3. Type the base number shown in the placeholder (7800) · 4. Save Adjustments → stock becomes 7800 pkt = 6,240,000 gm; drift badge before save shows "0.00 pkt" although system 9.75 pkt vs typed 7800 |
| Curl | Probe A1–A9 (`add-stock`), HTTP + read-back inline in PROBE_REPORT §1 |
| Source | AGENT-DISCOVERED |
| Confidence | **CONFIRMED** — live-reproduced on preprod, real corrupted rows found |

---

## Blast Radius

| File | Change | Lines (est.) | Hotspot |
|---|---|---|---|
| `src/components/inventory/StockAuditPanel.jsx` | two-box input state (`physicalEntries[id] = {major, minor, reasonId}`), `getDrift()` base arithmetic + breakdown render, `handleSaveAll()` payload (`unit: displayUnit`, `physical_qty` composed), placeholder | ~40–60 | NO |
| `src/api/transforms/inventoryTransform.js` | `stockItems()` +`displayQtyParts: item.display_qty_parts || null` (and `ingredients()` if present) | ~2 | NO (FILE_OWNERSHIP: BUG-455 IMPL 2026-09-24 open until Gate 5b) |
| `src/utils/quantityBreakdown.js` (NEW, shared with CR-387) | `toBreakdown(baseValue, factor, displayUnit, smallUnit)` → `{sign, major, minor}` / text; `fromBreakdown(major, minor, factor)` → display qty + base qty | ~30 | NO |

- `grep -c "physicalEntries\|getDrift\|entry.qty" StockAuditPanel.jsx` = 11 · `grep -rn conversionFactor src/` = 26 lines · consumers: `pages/StockAuditPage.jsx` only
- Blast radius: **MEDIUM** (2 files modified + 1 new) · R5 hotspot: NO · Financial: NO (stock quantity only; wastage rows created by backend)
- **Sequencing:** BUG-455 touched `StockAuditPanel.jsx` L176 + `inventoryTransform.js` L73 (Gate 5A, QA pending) — Planning must base line numbers on post-BUG-455 HEAD and not regress the `display_qty_text` cell.
- Sub-recipe path (`addSubRecipeStock`, L69–74) unaffected: both sub-recipes on RID 835 have `has_unit_conversion:false`; still sends `unit: item.unit` — Planning to confirm no-conversion rule applies identically.

---

## Owner Decisions

| ID | Decision | Status |
|---|---|---|
| OD-459-01 | Repair `#20329 UAT BIRYANI MASALA` (currently 250,000 gm = 500 pkt) — true on-hand value? (recount via `unit:"pkt"` probe pattern) | **LOCKED (a) — true on-hand for #20329 UAT BIRYANI MASALA = 9.4 pkt (= 4700 gm @500). Owner 2026-09-25: test data, NO separate repair call. Self-heals on first Stock Audit save after BUG-459 ships (staff enter [9] pkt [200] gm → backend overwrites to 4700 gm). #20329 = designated Gate 6 smoke item (V7 read-back expects cal_quantity 4700, display_unit pkt).** |
| OD-459-02 | Items with `has_unit_conversion:false` → single box, send `unit: item.unit` (recommended) | **LOCKED YES — no-conversion items + sub-recipes: single box, send unit: item.unit.** |
| OD-459-03 | Minor box ≥ conversion factor (e.g. 1700 gm with 1600/tin): (a) auto-normalise into major on blur · (b) block with inline error | **LOCKED (a) — minor >= factor auto-normalises into major on blur.** |
| OD-459-04 | Drift render: sign + breakdown (`-1 pkt 200 gm`) for loss, `+` for gain, `0` → "No drift"; decimals in minor rounded to 0 dp for count/gm/ml | **LOCKED YES — drift = sign + breakdown text; 0 → 'Match'; minor 0 dp for gm/ml/piece.** |
| OD-459-05 | Post-save toast: echo backend `wastage` (`Loss 0.75 pkt`) vs today's generic "N adjustment(s) saved" | **LOCKED YES — post-save toast echoes backend wastage per item (null-guarded).** |

---

## Next
**Gate 1 registered 2026-09-25.** → PLANNING Gate 2 (Impact Analysis; must sequence after/with BUG-455 Gate 5b) → Gate 3 → owner Gate 4 GO. Data repair OD-459-01 can run independently once the owner supplies the value.
