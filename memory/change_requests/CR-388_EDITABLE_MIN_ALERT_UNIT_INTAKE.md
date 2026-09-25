# CR-388 — Editable Min Alert Unit Field

**Date:** 2026-09-25 · **Role 1 INTAKE**
**Sprint:** TBD (next sprint)
**Status:** GATE_2_READY — All ODs locked 2026-09-25
**Owner instruction:** "no code edit — follow gates rules" → INTAKE + PLANNING only. No implementation this session.

---

## Summary

The **Min Alert (Qty · Unit)** column in Inventory Setup currently shows the unit as a **read-only span** locked to `smallUnit` (BUG-269-C / BUG-309). The user wants to be able to **independently edit the min alert unit** — e.g., set the alert threshold in a different unit than the `smallUnit`.

This applies to both:
1. **Single-item inline edit row** (`InventorySetupPanel.jsx`)
2. **Bulk Edit Ingredients table** (`IngredientBulkEditor.jsx`)

---

## Classification

- **Type:** CR (Change Request / Feature)
- **Severity:** P2 — MEDIUM (workflow improvement, current workaround: change smallUnit then revert)
- **Risk:** MEDIUM (modifies ingredient save payload `min_unit_alert`, touches 2 files, requires API field verification)
- **Fast Lane eligible:** NO (2 files, API contract change, risk = MEDIUM)

---

## Code Reality Check

**InventorySetupPanel.jsx L459-463:**
```js
{/* BUG-269-C: Alert unit locked to smallUnit (read-only) */}
<span className="h-8 text-xs border border-slate-100 rounded-md px-2 w-16 inline-flex items-center justify-center bg-slate-50 text-slate-500"
  data-testid="edit-ingredient-min-unit">
  {editIng.smallUnit || editIng.unit || '—'}
</span>
```

**IngredientBulkEditor.jsx L477-479:**
```js
{/* BUG-309: minUnitAlert is a unit string — read-only span locked to smallUnit */}
{row.minUnitAlert || row.smallUnit || row.unit || '—'}
```

**Code Reality: NONE** — no editable min unit field exists.

---

## Duplicate Check

- BUG-309 (Bulk Edit: Min Unit type=number drops unit string) — IMPLEMENTED, CLOSED. That fix intentionally locked it as read-only. CR-388 proposes making it editable again with proper UX.
- BUG-269-C (minUnitAlert locks to smallUnit on edit start) — IMPLEMENTED. CR-388 builds on top of this.
- **Duplicate check: DISTINCT** (new feature on top of existing behaviour)
- **Related:** BUG-309, BUG-269

---

## Evidence

- **Source:** OWNER-REPORTED (screenshot provided)
- **Screenshot:** Owner screenshot — inline edit row for "Aloo Gobhi" showing "pieces" as non-editable text after min qty input
- **Steps to reproduce:** Inventory → Setup → Ingredients → click edit (pencil) on any ingredient → observe min unit field is a greyed read-only span
- **Confidence:** CONFIRMED (code-verified + screenshot)

---

## Blast Radius

- **Files likely to change:** `InventorySetupPanel.jsx` (edit form + add form), `IngredientBulkEditor.jsx`
- **Hotspot files:** NO (neither is in R5 hotspot list)
- **API impact:** TBD — needs R11 curl probe at PLANNING. Backend may already accept `min_unit_alert` as a freeform string; needs verification.
- **Blast radius: SMALL-MEDIUM (2 files)**

---

## Owner Decisions — LOCKED 2026-09-25

| # | Question | Decision | Source |
|---|----------|----------|--------|
| OD-388-01 | What unit options in the dropdown? | **LOCKED: Same unit options as the smallUnit selector (standard unit list / UNIT_SMALL_MAP values). Editable select dropdown in BOTH add and edit inline forms.** | Owner: "there should be use while adding as well as editing ingredients" + screenshot showing dropdown in edit form |
| OD-388-02 | Auto-default from smallUnit? | **LOCKED: (a) YES — auto-default minUnitAlert from smallUnit when smallUnit changes, but user can override independently** | Owner: "o2 - A" |
| OD-388-03 | Scope — where to apply? | **LOCKED: (a) Both — single edit inline form + add form + Bulk Edit table** | Owner: "o3 a add and edit single and bulk both places" |

**All ODs locked. Gate 1 CLOSED. Ready for Gate 2 — Impact Analysis.**

---

## Screenshot Evidence (2026-09-25)

- **SS1 (single edit):** "Aloo Gobhi" edit row shows min alert unit as a dropdown displaying "pieces" — confirms expected UX pattern
- **SS2 (bulk edit):** Regular ingredient rows show MIN UNIT as static text (no dropdown); sub-recipe rows incidentally have dropdown — confirms regular ingredients need the fix

---

## Next

Gate 2 — Impact Analysis. No code this session per owner instruction.
