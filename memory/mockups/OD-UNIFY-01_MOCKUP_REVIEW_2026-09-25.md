# OD-UNIFY-01 — Final-Screen Mockups for Owner Review (Role 2 · PLANNING · Point 1)

**Date:** 2026-09-25 · **Scope:** mockups only, NO code, NO wiring. Awaiting owner review → then Point 2 (plan rewrites) → Point 3 (Gate 4 GO).
**Design blueprint:** `/app/design_guidelines.json` (produced by design agent).
**Rendered mock pages (static, non-wired):** `/app/memory/mockups/*.html` (also served for screenshots at `{preview}/__mock/*.html`).

Grounded on LIVE preprod screens captured this session (RID via QA_INV) — before/after are faithful to the real tables.

---

## Frame 1 + 2 — STOCK AUDIT (`stock_audit_after.html`)
**Converted row (e.g. ANGARA GREAVY, 9.4 pkt @ 800 gm/pkt):**
- BEFORE: `SYSTEM QTY` = "9.4 pkt **(9 pkt 200 gm)**" · `PHYSICAL QTY` = single box holding a raw base number ("4700").
- AFTER: `SYSTEM QTY` = plain "9.4 pkt" (BUG-455 parenthetical **REMOVED**) · `PHYSICAL QTY` = two-box converter `[ 9 ] pkt [ 0 ] gm` · `DRIFT` = signed breakdown badge — amber "↓ 0 pkt 200 gm" (short) / neutral "Match" / green "↑ +0 tin 160 gm" (over).

**No-conversion row (e.g. ACHARI TIKKA, kg-only):** single input box + single unit label — **unchanged**.

➡ Breakdown now appears **exactly once** per row.

## Frame 3 — SMART PURCHASE / STOCK UPDATE (`smart_purchase_after.html`)
**Converted row (e.g. UAT BAR BEER, 8.49 bottle @ 650 ml/bottle):**
- BEFORE: `ON-HAND` = "8.49 bottle **(8 bottle 319 ml)**" · `PROJECTED NEED`/`SUGGESTED QTY` = raw base numbers ("422500 ml" / "416980").
- AFTER: `ON-HAND` = plain "8.49 bottle" (BUG-455 parenthetical **REMOVED**) · `PROJECTED NEED` / `GAP` / `SUGGESTED QTY` = breakdown units ("650 bottle" / "-641 bottle 380 ml" / "641 bottle 380 ml") · Purchase-List `QTY TO BUY` = two-box `[ 2 ] bottle [ 150 ] ml`.

➡ Row is unit-consistent end to end; breakdown appears **exactly once** per cell.

## Frame 4 — CURRENT STOCK + SUB-RECIPE STOCK (`current_substock_unchanged.html`)
- **UNCHANGED boundary.** `CURRENT STOCK` keeps BUG-455 parenthetical (e.g. "0 pieces (0 piece)", "11 tin (11 tin 35 ml)"). No two-box / breakdown UI here → no redundancy → BUG-455 retained.

---

## Suppression edit-sites re-grepped (code is truth — feeds Point 2 plan rewrite)
- `StockAuditPanel.jsx` **L176–177** — `{item.displayQtyText && … (<span>({item.displayQtyText})</span>)} // BUG-455` → suppress on this screen.
- `AutoShoppingList.jsx` **L194** (Table 1 on-hand) and **L307** (Table 2 on-hand) — `{r.display_qty_text && <span>({r.display_qty_text})</span>} // BUG-455` → suppress on this screen.
- KEEP untouched: `CurrentStockPanel.jsx`, `SubRecipeStockPanel.jsx`.
- Approach: per-screen conditional/flag to SUPPRESS (not delete) BUG-455 so it stays live on the other two screens.

## Status / next
- Point 1 (mockups) DONE.
- Point 2 (rewrite BUG-459 + CR-387 plans) **DONE 2026-09-25** — both re-issued as FINAL (Gate 3): BUG-455 handling reversed to *suppress via screen-level flag* (BUG-459 E4m on `StockAuditPanel.jsx` L176–178; CR-387 E-A10/E-A11 on `AutoShoppingList.jsx` L194/L307), sequencing set to combined QA wave (OD-UNIFY-02, impl order BUG-459 → CR-387), verification matrices add "breakdown once per cell" (V8/V12) + boundary regression "BUG-455 still on Current/Sub-Recipe Stock" (V8b/V12b).
- Point 3 — request verbatim **"Gate 4 GO"** before ANY feature code. **CURRENT STOP POINT.**
