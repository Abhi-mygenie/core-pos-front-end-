# BUG-225 — Same Name Ingredient + Recipe Unit Mismatch — IMPACT ANALYSIS (Gate 2) — SUBSUMPTION

**ID:** BUG-225
**Title:** Same Name Ingredient+Recipe Unit Mismatch
**Priority:** P2 (MEDIUM)
**Risk:** LOW (post-analysis — no code change of its own)
**Date:** 2026-07-23 (session continuation)
**Analyst:** PLANNING agent (Gate 2)
**Code Reality:** N/A — no code change planned under this ID
**Conflict Pre-Check:** N/A (no files change under this ID)

---

## 1. Finding: SUBSUMED BY BUG-216

Root cause was already confirmed at intake via preprod API (2026-07-22): "ghee dosa" (id 18523) is an **ingredient** (type: inventory, unit: bundle, small_unit: piece), not a recipe. It appeared inside recipe 8362 ("Ajwain Paratha") displaying its **base unit** `bundle`, which made it look like a recipe/bundled item. The visual confusion is exactly the defect class fixed by **BUG-216** (recipe ingredient rows must show/store small unit).

**Update this session (2026-07-23):** re-curl of `get-recipe` (92 recipes, 346 ingredient rows) shows:
- "ghee dosa" is NO LONGER present in any recipe's ingredient list — the offending row was removed/changed since intake.
- All 346 rows use small units (gm/piece/ml). No `bundle` rows remain.
The live symptom has self-resolved at the data level; BUG-216 prevents recurrence at the form level.
Evidence: `/app/memory/evidence/BUG-216/get_recipe_response.json`

## 2. Data Flow Trace
See BUG-216 §1 — identical path (`RecipeFormPanel.jsx:84/217/225`).

## 3. Files WILL Change / WILL NOT Touch
- WILL change under this ID: **NONE** (fix vehicle = BUG-216)
- Residual items carried by other IDs:
  - `converion_factor: null` on ghee dosa → already covered by **BUG-226** (Batch 1, Gate 2 approved)
  - Negative stock `-13.00` on ghee dosa → DATA issue, owner corrects via Stock Audit panel (no code)

## 4. Risk Classification
LOW — documentation/subsumption only.

## 5. Owner Decision Queue
No owner decisions required. Optional (deferred, NOT planned): tooltip/badge distinguishing ingredient type in recipe rows — register as a future CR if wanted.

## 6. Disposition
- Status → GATE 2 COMPLETE — SUBSUMED by BUG-216. Closure of BUG-225 follows BUG-216's QA PASS + owner smoke (verify "ghee dosa" shows `piece` when re-added to a recipe).
