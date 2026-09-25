# BUG-456 — Ingredients edit row lets user change Unit / Conversion while stock > 0; no proactive gate — user only learns from backend 422 after Save — INTAKE 2026-09-24

**Source:** AGENT-DISCOVERED (Investigation 2026-09-24 of owner-supplied backend change doc `inv_changes.md`, rule R3 "Proactive zero-stock gate before unit/conversion edits") → owner walked through and accepted in intake chat.
**Sprint:** `sep_bug_closure` · **Gate:** 1 (INTAKE)
**Related:** BUG-226 (conversion factor not saved), BUG-269 (unit/small-unit auto-select), BUG-275 (conversion pre-fill), BUG-212 (inline edit), CR-102 (consumption_unit payload)

---

## Classification

| Field | Value |
|---|---|
| Type | BUG (UX gap against a new backend rule) |
| Severity | **P2 — MEDIUM** (save is correctly rejected by the backend — no data corruption — but the user gets a cryptic post-hoc error instead of guidance) |
| Risk | **MEDIUM** — component state / non-financial validation in one file; no API payload change, no hotspot (R5), no financial logic (R6) |
| Fast Lane eligible | **NO** (~15–25 lines, state logic) — Planning-skip is a borderline owner decision |
| Code reality | **NONE** — `grep ZERO_STOCK\|REQUIRES_ZERO\|zeroStock src/` = 0 hits (2026-09-24). `InventorySetupPanel.jsx:183–206` `startEdit()`/`saveEdit()` have no stock check and no original-value snapshot. |
| Duplicate check | **DISTINCT** — earlier conversion bugs (226/269/275) fixed payload/prefill; none gates on stock. |

---

## Symptom

Backend now rejects `PUT update-ingredient` with **422 `UNIT_CHANGE_REQUIRES_ZERO_STOCK` / `CONVERSION_CHANGE_REQUIRES_ZERO_STOCK`** when an ingredient with stock > 0 changes its `unit` or `converion_factor` (stock is recorded in the old unit; a change would silently corrupt on-hand).

FE flow today (`InventorySetupPanel.jsx`):
1. Pencil → `startEdit(ing)` L183 copies the row into `editIng`; does not remember original unit/factor, does not read the row's stock.
2. Edit row L421–431 renders Unit `<select>` and Conversion `<Input>` freely editable.
3. `saveEdit()` L194 validates name/category/unit only → `updateIngredient()`.
4. Backend 422 → red toast `err.readableMessage` — **after** the click, with a backend-worded message.

**Expected:** when stock > 0 **and** unit or conversion differs from the original → amber inline strip ("Stock on hand is 12.5 kg — unit and conversion are locked until stock is 0") + **Save disabled** (+ Undo link). Stock = 0 or only name/category/alert edited → identical to today. Backend 422 handling stays as fallback.

---

## Evidence

| Item | Detail |
|---|---|
| Source doc | `inv_changes.md` rule R3 (owner upload — not stored on disk); captured in `investigations/INV_INVENTORY_FE_RULES_R2_R3_2026_09_24.md` §R3 |
| Screenshot | Live edit row captured on preview 2026-09-24 (test restaurant, row "Chicken" in edit mode) — used for the mockup `public/inv-intake-mockup-2026-09-24.html` §BUG-456 (rows A/B) |
| Steps to reproduce | 1. Setup › Ingredients · 2. Pencil on an ingredient with stock > 0 · 3. Change Base Unit (or Conversion) · 4. Save → red toast 422; nothing warned beforehand |
| Curl | Not run (would mutate; the 422 codes are documented by the backend doc — Planning to verify on a probe ingredient per R11) |
| Confidence | **SUSPECTED** (code-traced; backend rule documented; not live-reproduced) |

---

## Blast Radius

| File | Change | Lines | Hotspot |
|---|---|---|---|
| `src/components/inventory/InventorySetupPanel.jsx` | `startEdit()` snapshot `originalUnit`/`originalFactor`; derive `stockQty` from the row (`displayQty \|\| quantity`); gate memo; amber strip row; `disabled` on Save; Undo | ~15–25 | NO |

- `grep -n "conversionFactor" InventorySetupPanel.jsx` = 9 lines (add + edit forms) — only the **edit** path changes
- Blast radius: **SMALL** (1 file) · R5 hotspot: NO · Financial: NO · Bulk Editor (`IngredientBulkEditor.jsx`) has its own unit/conversion cells → **OD-456-02**

---

## Owner Decisions

| ID | Decision | Status |
|---|---|---|
| OD-456-01 | Gate style: (a) warn-on-change + Save disabled · (b) hard-lock Unit + Conversion fields whenever stock > 0 | **LOCKED — (b) hard-lock** — fields greyed out and uneditable when stock > 0. Owner 2026-09-24. |
| OD-456-02 | Apply the same gate in Ingredient **Bulk Edit** (`IngredientBulkEditor.jsx` unit/conversion cells)? | **LOCKED — YES, include in same plan**, conditional on ≤ 10 lines; else separate follow-up. Owner 2026-09-24. |
| OD-456-03 | Planning skip (~20–35 lines, 2 files, non-hotspot)? | **LOCKED — NO, full Gate 3 plan required.** Owner 2026-09-24. |

---

## Next
**Gate 1 registered 2026-09-24.** → PLANNING Gate 2 → Gate 3 → owner Gate 4 GO.
