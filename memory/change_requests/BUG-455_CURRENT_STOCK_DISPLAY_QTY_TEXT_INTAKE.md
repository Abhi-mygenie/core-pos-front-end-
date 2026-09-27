# BUG-455 — Current Stock: on-hand shows numeric qty + unit only; backend `display_qty_text` (mixed-unit breakdown) never displayed — INTAKE 2026-09-24

**Source:** AGENT-DISCOVERED (Investigation 2026-09-24 of owner-supplied backend change doc `inv_changes.md`, rule R2 "Use `display_qty_text` for on-hand display") → confirmed by owner in intake chat.
**Sprint:** `sep_bug_closure` · **Gate:** 1 (INTAKE)
**Related:** BUG-249 (Current Stock status uses `displayQty` — CLOSED), BUG-226/BUG-275 (conversion factor), CR-086 (Current Stock UX), CR-139 (Sub-Recipe Stock tab)

---

## Classification

| Field | Value |
|---|---|
| Type | BUG (contract adoption gap — backend shipped a field the FE never consumed) |
| Severity | **P2 — MEDIUM** (display only; figures are correct, the sub-unit remainder is simply not shown — "9.8 pkt" instead of "9 pkt 400 gm") |
| Risk | **MEDIUM** — component display + transform mapping across 3–5 files; no API payload change, no financial logic, no localStorage, no hotspot (R5) |
| Fast Lane eligible | **NO** (multi-file) |
| Code reality | **NONE** — `grep display_qty_text\|displayQtyText src/` = 0 hits (2026-09-24). `inventoryTransform.js:24–25 / 70–71` map `display_qty` + `display_unit` only. |
| Duplicate check | **DISTINCT** — BUG-249 introduced `displayQty` for status; no item ever handled `display_qty_text`. |

---

## Symptom

Backend `current_stocks[]` / inventory-master items now carry `display_qty_text` (e.g. `"9 pkt 400 gm"`, `"12 kg 500 gm"`). Every on-hand cell in the POS renders `{displayQty} {displayUnit}` → `9.8 pkt`, so the user has to mentally convert the decimal into packets + grams. Staff counting shelves see "9 pkt 400 gm"; the screen says "9.8 pkt".

**Expected (OD-455-01 LOCKED — owner 2026-09-24):** show `display_qty_text` **alongside** the existing figure (small muted text), not replacing it; omit when it equals the plain figure.

---

## Evidence

| Item | Detail |
|---|---|
| Source doc | `inv_changes.md` (owner upload 2026-09-24, restaurant 835, 11 curl probes PASS) — **not stored on disk**; rule R2 text captured in `investigations/INV_INVENTORY_FE_RULES_R2_R3_2026_09_24.md` |
| Code trace | `investigations/INV_INVENTORY_FE_RULES_R2_R3_2026_09_24.md` §R2 (break point `inventoryTransform.fromAPI.stockItems`) |
| Screenshot | Not provided (owner). Mockup: `public/inv-intake-mockup-2026-09-24.html` §BUG-455 · `design_briefs/DESIGN_BRIEF_INVENTORY_INTAKE_BUG455_456_457_2026_09_24.md` |
| Steps to reproduce | 1. Operations › Current Stock · 2. Find an ingredient with a conversion (e.g. 1 pkt = 500 gm) and fractional stock · 3. Cell shows `9.8 pkt`; API `display_qty_text` = `9 pkt 400 gm` is nowhere on screen |
| Curl | Not run this session (field presence is documented by the backend doc; Planning must curl-verify field name + sample values on RID 835 — R11) |
| Confidence | **SUSPECTED** (agent found in code; owner agreed with the behaviour change) |

---

## Blast Radius

| # | Surface | File : line | Change |
|---|---|---|---|
| 0 | Transform | `src/api/transforms/inventoryTransform.js:24–25, 70–71` | + `displayQtyText: item.display_qty_text \|\| ''` in `ingredients()` and `stockItems()` |
| 1 | Current Stock table | `src/components/inventory/CurrentStockPanel.jsx:325–326` | append muted text |
| 2 | Sub-Recipe Stock | `src/components/inventory/SubRecipeStockPanel.jsx:61–62, 291–292` | pass + append |
| 3 | Stock Audit book-stock cell | `src/components/inventory/StockAuditPanel.jsx:174–175` | append |
| 4 | Stock Update shopping list (On hand) | `src/utils/purchasePlanner.js:133,158` → `src/components/inventory/smart/AutoShoppingList.jsx:193,305` | **OD-455-03** |
| 5 | Excel/PDF export | `CurrentStockPanel.jsx:119, 150` | **OD-455-02** |

- `grep -rn "displayQty" src/ --include=*.jsx --include=*.js` (excl. tests/transform/order-entry) = 11 lines / 6 files
- Blast radius: **MEDIUM** (4–6 files, ~20–30 lines) · Hotspot files (R5): **NO** · Financial (R6): **NO**

---

## Owner Decisions

| ID | Decision | Status |
|---|---|---|
| OD-455-01 | `display_qty_text` alongside existing qty+unit (not replacing) | **LOCKED 2026-09-24** (owner: "this will come in current along with what is already displayed") |
| OD-455-02 | Add "Stock (text)" column to Excel/PDF export? | **LOCKED — YES.** Owner 2026-09-24. |
| OD-455-03 | Include Stock Update shopping-list On-hand column? | **LOCKED — YES.** Owner 2026-09-24. |

---

## Next
**Gate 1 registered 2026-09-24.** → PLANNING Gate 2 (Impact Analysis; curl-verify `display_qty_text` on RID 835 per R11) → Gate 3 → owner Gate 4 GO.
