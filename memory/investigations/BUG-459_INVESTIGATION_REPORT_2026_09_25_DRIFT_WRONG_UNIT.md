# BUG-459 — Investigation Report: Stock Audit Drift Shows Wrong Unit Label

**Date:** 2026-09-25
**Role:** INVESTIGATION (no code changes)
**Steps used:** 6/10
**Confidence:** HIGH — reproduced via arithmetic, fully code-traced

---

## 1. Summary

**Root cause:** `getDrift()` in `StockAuditPanel.jsx` (line 53) assigns `item.displayUnit` ("pkt") as the
unit label for a numeric diff that is computed entirely in base units (gm/ml/piece via `item.quantity`).
The numeric value is correct in base units; only the label is wrong.

**Classification:** FE_BUG
**Confidence:** HIGH (reproduced via screenshot arithmetic + full code trace)
**Steps used:** 6/10

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Steps | Result | Evidence |
|---|---|---|---|---|---|
| H1 | `getDrift()` computes diff in base unit but labels with displayUnit | Code trace `getDrift()` lines 47-54 | 1 | **CONFIRMED** | See §3 |
| H2 | `item.quantity` is inconsistent — sometimes display, sometimes base | Cross-check 3 rows from screenshot | 2 | **CONFIRMED (always base)** | `evidence/BUG-459/getDrift_analysis.json` |
| H3 | BUG-455 implementation changed StockAuditPanel and introduced this | Grep for BUG-455 markers in file | 1 | **ELIMINATED** — BUG-455 only added `displayQtyText` render; `getDrift` untouched | Code trace |

---

## 3. Data Flow Trace

```
API: GET /api/v2/vendoremployee/inventory/stock-inventory
  └─ Response field: quantity = 4700   ← base unit (gm)
  └─ Response field: display_qty = 9.4 ← display unit (pkt)
  └─ Response field: display_unit = "pkt"
  └─ Response field: small_unit = "gm"
  └─ Response field: converion_factor = 500  (typo preserved, R9)

Transform: inventoryTransform.fromAPI.stockItem()
  └─ item.quantity      = Number(item.quantity)  = 4700  ← BASE UNIT (gm)
  └─ item.calQuantity   = Number(item.cal_quantity)       ← also BASE UNIT (gm)
  └─ item.displayQty    = Number(item.display_qty) = 9.4  ← DISPLAY UNIT (pkt)
  └─ item.displayUnit   = item.display_unit = "pkt"
  └─ item.smallUnit     = item.small_unit = "gm"
  └─ item.conversionFactor = 500

State: StockAuditPanel.stockItems[]
  └─ item.quantity = 4700 (gm)  ← used by getDrift()
  └─ item.displayQty = 9.4 (pkt) ← used by System Qty column display

Component: StockAuditPanel.getDrift()  ← BREAK POINT
  Line 50: physical = Number(entry.qty)          → 4600 (user entered, gm)
  Line 51: system   = Number(item.quantity)       → 4700 (gm)  ← BASE UNIT
  Line 52: diff     = physical - system           → -100  (gm)
  Line 53: unit     = item.displayUnit || item.unit → "pkt"  ← DISPLAY UNIT LABEL

UI: drift.diff.toFixed(2) + " " + drift.unit
  → "-100.00 pkt"   ❌  (correct value -100, WRONG unit label)
  Should be: "-100.00 gm"  OR  "-0.20 pkt"
```

---

## 4. Exact Numbers from Screenshot (ANGARA GREAVY)

| Field | Value | Unit | Source |
|---|---|---|---|
| System Qty (display) | 9.4 | pkt | `item.displayQty` + `item.displayUnit` |
| `item.quantity` (used in getDrift) | 4700 | gm | base unit — `item.quantity` |
| Physical entered by user | 4600 | gm | `physicalEntries[id].qty` |
| `diff` computed | 4600 − 4700 = **-100** | **gm** | base unit arithmetic |
| `drift.unit` assigned | — | **pkt** | `item.displayUnit` |
| **Displayed drift** | **-100.00 pkt** | ❌ | gm value + pkt label |
| **Correct drift (option A)** | -100.00 gm | ✅ | use `item.smallUnit` |
| **Correct drift (option B)** | -0.20 pkt | ✅ | `-100 / 500` + `item.displayUnit` |

### Cross-check: BBQ JUMBO WINGS + BIG BOX show no drift
- Both items had `physical == item.quantity` (coincidence — user entered the exact base unit value)
- `4600 - 4700 = -100` is NOT zero → drift fires → wrong label surfaces

---

## 5. Secondary Finding: Placeholder Also in Base Units

**File:** `StockAuditPanel.jsx` line 184
```jsx
placeholder={String(item.quantity)}   // → "4700" (gm, no unit label shown)
```

The System Qty column shows **"9.4 pkt"** (display unit).
The Physical Qty placeholder shows **"4700"** (base unit, no label).

A staff member doing a shelf count would count **packets** (9-10), not weigh in grams (4700).
The placeholder implies the user should enter grams, but there is no label to confirm this.

**This is a separate display issue from the drift label bug** — same root (base vs display unit confusion)
but different location. The API send path (`physicalQty: Number(entry.qty)`) is correct per owner.

---

## 6. Evidence Artifacts

- `/app/memory/evidence/BUG-459/getDrift_analysis.json` — arithmetic trace + cross-check for 3 rows

---

## 7. Exact Break Point

**File:** `src/components/inventory/StockAuditPanel.jsx`
**Lines:** 47–54

```js
// CURRENT — WRONG
const getDrift = (item) => {
    const entry = physicalEntries[item.id];
    if (!entry?.qty && entry?.qty !== 0) return null;
    const physical = Number(entry.qty);
    const system = Number(item.quantity);          // 4700 gm  ← BASE UNIT
    const diff = physical - system;                 // -100     ← in gm
    return { diff, unit: item.displayUnit || item.unit };  // "pkt" ← WRONG LABEL
};
```

The label must match the numeric domain.

Two fix options (owner decision needed):

| Option | Change | Result for ANGARA GREAVY |
|---|---|---|
| **A — show in base unit** | `unit: item.smallUnit \|\| item.unit` | `-100.00 gm` |
| **B — convert to display unit** | `diff: diff / Number(item.conversionFactor \|\| 1)` + keep `displayUnit` | `-0.20 pkt` |

Option A is 1-line. Option B requires conversion factor guard (0/empty case).
`item.conversionFactor` maps from `converion_factor` (R9 typo preserved) — value is numeric or `''`.

---

## 8. Recommendations

**Classification:** FE_FIX
**Scope:** `StockAuditPanel.jsx` — `getDrift()` lines 47-54 (1 function, ~8 lines)
**Planning skip eligible:** YES — 1 file, ≤10 lines, not a hotspot (R5), not financial (R6)
**Owner decision needed:** Option A (base unit label) vs Option B (display unit with conversion)

**Secondary (separate owner decision):**
- `placeholder={String(item.quantity)}` (line 184) → should this show display qty ("9.4") or base qty ("4700")?
  Recommendation: `String(item.displayQty || item.quantity)` with a `{item.displayUnit || item.unit}` hint

---

## 9. Retroactive Candidates

NONE — this is a new unregistered bug.

---

## Handover Note

```
Root cause: getDrift() line 53 assigns item.displayUnit ("pkt") as the unit
for a diff value computed in base units (gm) via item.quantity.
Confidence: HIGH. Steps: 6/10.
FE fix: YES — StockAuditPanel.jsx getDrift() ~8 lines.
Planning skip eligible: YES (owner must approve).
Owner decision needed: Option A (base unit) vs Option B (display unit + conversion).
Secondary: placeholder line 184 (separate, lower priority).
Investigation report: investigations/BUG-459_INVESTIGATION_REPORT_2026_09_25_DRIFT_WRONG_UNIT.md
Evidence: evidence/BUG-459/getDrift_analysis.json
```

---

## 10. ADDENDUM 2026-09-25 — live contract probe (owner-approved, destructive+additive on preprod)

Evidence: `evidence/INV-UNIT-CONTRACT/probes_2026_09_25/PROBE_REPORT.md` (+ raw a_*/b_*/c_*.json, *_requests.jsonl)

**Corrections to §5, §7, §8 above:**
- "The API send path (`physicalQty: Number(entry.qty)`) is correct per owner" — **WRONG.** `add-stock` interprets `physical_qty` in the `unit` sent. FE sends `unit: item.displayUnit` (L83) with a **base-unit** number → backend multiplies by the conversion factor. Confirmed on real data: ANGARA GREAVY had become `2,300,000 gm = 4600 pkt` (user typed 4600 gm, sent as 4600 pkt). Repaired to 9.4 pkt (probe C2). UAT BIRYANI MASALA (`250,000 gm = 500 pkt`) still corrupted.
- **Option A (label as base unit, keep base send) is WITHDRAWN**: sending `unit: small_unit` on `add-stock` is accepted but flips `display_unit` → auto-normalised kg and rescales `quantity` (probe A3). Only display-unit sends are safe.
- Severity upgraded: **P0 data-integrity** (silent ×factor stock inflation on every Stock Audit save for converted items), not a label cosmetic.

**Validated contract (both `add-stock` and `add-purchase`):** `unit` ∈ {purchase unit, consumption unit} (case-insensitive; else 422 `PURCHASE_UNIT_NOT_COMPATIBLE`; empty → 422); numeric quantity interpreted in that unit; decimals convert exactly. `add-stock` requires `physicalqty_master:true` for recount (else 422 vendor_id required) and returns `wastage {type, current_stock, physical_count, difference, unit}` in the sent unit.

**Backend already provides** `display_qty_text` and `display_qty_parts {major, major_unit, minor, minor_unit, sign}` on `stock-inventory` — not mapped by the transform today.

**Revised recommendation (owner Gate 4 pending):** two-box converter input `[major] displayUnit [minor] smallUnit`; send `unit: displayUnit`, `physical_qty: major + minor/conversionFactor`; drift computed in base and rendered via breakdown; Smart Purchase to send `Unit: display_unit` + display quantity (owner direction, accepted by backend).
