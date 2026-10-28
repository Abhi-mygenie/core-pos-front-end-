# SESSION HANDOVER — 2026-09-25 — OWNER FREEZE: "Unify the two screens" · Gate 4 STILL NOT given

## Summary (why this handover exists)
The design-overlap question raised in the prior session (Message 118: BUG-455's readable-stock text vs the incoming BUG-459/CR-387 breakdown UI on the same cells) is now **decided by the owner**.

**Owner decision (verbatim intent):** *"The freeze option is unified two screens … next agent should show the final screens, rewrite the plan / final implementation plan. QA is still needed but we can do both the QAs together."*

This handover records the frozen decision as new/amended Owner Decisions and tells the next agent exactly what to do. **No code was written this session. Gate 4 GO is NOT given.**

---

## FROZEN OWNER DECISIONS (locked 2026-09-25)

### OD-UNIFY-01 — Single breakdown per cell on the two overlapping screens
On **Stock Audit** (`StockAuditPanel.jsx`) and **Smart Purchase / Stock Update** (`AutoShoppingList.jsx` + `SmartPurchasePanel.jsx` + `GroupedVendorPreview.jsx`), the breakdown ("9 pkt 400 gm" style) must render **exactly once per cell**.
- The **new BUG-459 / CR-387 two-box + native breakdown UI is the single source** of the breakdown on these two screens.
- **BUG-455's separate parenthetical muted text (e.g. "(9 pkt 400 gm)") is SUPPRESSED on these two screens only.**
- **BUG-455 text is KEPT unchanged** on **Current Stock** (`CurrentStockPanel.jsx`) and **Sub-Recipe Stock** (`SubRecipeStockPanel.jsx`) — BUG-459/CR-387 do not apply there, so no redundancy exists.

### OD-UNIFY-02 — Combined QA wave (amends OD-459-07 / OD-387-08)
Owner explicitly amended the locked sequencing. BUG-455 Gate 5b QA no longer has to close *before* the new work. **BUG-455 + BUG-459 + CR-387 are QA'd together in ONE combined wave** after all three are implemented.
- OD-459-07 (was: "execute after BUG-455 Gate 5b") → **AMENDED**: BUG-455 QA runs in the same wave as BUG-459.
- OD-387-08 (was: "after BUG-455 5b + BUG-459 5a") → **AMENDED**: CR-387 still needs the shared util `quantityBreakdown.js` from BUG-459, so **implementation order stays BUG-459 → CR-387**, but **QA is combined** across all three.

---

## NEXT AGENT — SCOPE THIS SESSION (PLANNING + design only, then STOP)

Owner answer to "how far this session": **Mockups + rewritten plans ONLY, then wait for my "Gate 4 GO". Do NOT implement.**

Do these three, in order, then stop:

### 1. Produce final-screen mockups for owner review
Show the owner what the two unified screens will look like (wireframe / annotated screenshot / static mock — no wiring into the live flow):
- **Stock Audit row (converted item, e.g. 9.75 pkt @800 gm):** book/system cell shows the plain qty with the breakdown expressed ONLY through the two-box physical-count converter `[ 9 ] pkt [ 600 ] gm` + drift badge "↓ 0 pkt 600 gm" — **no** BUG-455 "(…)" parenthetical on the book cell.
- **Stock Audit row (no-conversion item, e.g. kg only):** single input box + single unit label, unchanged.
- **Smart Purchase / Shopping List row (converted item):** Projected Need / Gap / Suggested Qty and the two-box "Qty to Buy" all speak in breakdown units via CR-387; the **On-Hand cell no longer carries the BUG-455 parenthetical** — the row is unit-consistent end to end.
- **Current Stock + Sub-Recipe Stock:** unchanged (BUG-455 parenthetical stays) — include one frame showing they are untouched, so the owner sees the boundary of the change.

### 2. Rewrite BOTH implementation plans into "final" versions reflecting the unification
Update in place (do NOT create parallel duplicates):
- `/app/memory/plans/BUG-459_IMPLEMENTATION_PLAN.md`
- `/app/memory/plans/CR-387_IMPLEMENTATION_PLAN.md`

Required plan changes vs the current Gate 3 drafts:
- **BUG-459 plan:** it currently states *"BUG-455 text cell L173–179 untouched"* and *"BUG-455 spans untouched"*. Under OD-UNIFY-01 this REVERSES — the plan must now **suppress the BUG-455 parenthetical in `StockAuditPanel.jsx`** (the book-stock cell append added by BUG-455). Re-verify the exact current line numbers with grep (do not trust old numbers), add an explicit edit site + code marker `// BUG-459 (OD-UNIFY-01)` for the suppression, and add it to the Scope Lock "files WILL change" rationale.
- **CR-387 plan:** it currently lists BUG-455 spans `AutoShoppingList.jsx` **L194 / L307 as verbatim / MUST NOT touch**. Under OD-UNIFY-01 this REVERSES for these two on-hand cells — the plan must now **suppress the BUG-455 on-hand parenthetical on the Smart Purchase screen**. Re-grep exact lines, move those spans out of the "will NOT touch" list into "WILL change", add `// CR-387 (OD-UNIFY-01)` markers.
- **Both plans:** update the sequencing/precondition sections to reflect OD-UNIFY-02 (combined QA wave; implementation order BUG-459 → CR-387 preserved because CR-387 depends on the shared util).
- **Both plans:** update the Verification Matrix with a new check "breakdown renders exactly once per cell on this screen — no BUG-455 parenthetical present" and a regression check confirming BUG-455 parenthetical STILL present on Current Stock + Sub-Recipe Stock.
- Keep the decision to suppress (not delete) BUG-455 logic clean: prefer a per-screen conditional/flag so BUG-455 rendering stays live on the other two screens. Do not rip BUG-455 code out globally.

### 3. STOP — request Gate 4 GO
After mockups + rewritten plans, present to owner and **wait for verbatim "Gate 4 GO"**. Do not write feature code. If asked to code before that, reply with the `OWNER APPROVAL REQUIRED` block.

---

## Current registry / gate state
- **BUG-455:** `GATE_5A_IMPLEMENTED` (code present; QA now folded into the combined wave per OD-UNIFY-02). QA cases already written: `/app/memory/handover/QA_HANDOVER_2026_09_24_BUG455_456_457.md` (T455-1…8 + regression R1–R4).
- **BUG-459:** `GATE_3_PLAN_COMPLETE` → plan to be re-issued as "final" this session (still Gate 3; no status change until owner Gate 4 GO).
- **CR-387:** `GATE_3_PLAN_COMPLETE` → same.
- OD-387-06 probe: already EXECUTED/RESOLVED (unit_price is per BASE unit; E-A7 default confirmed). No re-probe needed.

## Files in play (re-grep line numbers before editing — code is truth, R1/R12)
- Suppress-on-Stock-Audit: `src/components/inventory/StockAuditPanel.jsx` (BUG-455 book-stock append).
- Suppress-on-Smart-Purchase: `src/components/inventory/smart/AutoShoppingList.jsx` (BUG-455 on-hand text, prev. "verbatim" L194/L307).
- Keep untouched: `src/components/inventory/CurrentStockPanel.jsx`, `src/components/inventory/SubRecipeStockPanel.jsx` (BUG-455 stays).
- Shared util (from BUG-459): `src/utils/quantityBreakdown.js` — CR-387 appends `rowQuantity(row)`.
- Do NOT overwrite the ESM webpack fixes: `frontend/craco.config.js` + `frontend/webpack-shims/`.

## Credentials
- `QA_INV` alias in `/app/memory/test_credentials.md` (preprod RID 835). Never print values in reports/handovers (R20).

## Guardrails carried forward
- Strict gate protocol (`/app/memory/control/AGENT_PROMPT_ALPHA.md`) — Role 2 PLANNING for the plan rewrite; no code until Gate 4 GO.
- Yarn only (R10). Code markers mandatory (R18). Registry sync gate on any future code (R17).
- Respond to the owner in **English only**.
