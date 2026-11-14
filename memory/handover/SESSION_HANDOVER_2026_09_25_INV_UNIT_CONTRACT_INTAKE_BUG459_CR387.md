# SESSION HANDOVER — 2026-09-25 — INVENTORY UNIT CONTRACT: INVESTIGATION → INTAKE (BUG-459 + CR-387)

## Summary
Live probe on preprod (owner-approved destructive+additive, RID 835, alias `QA_INV`) proved both `add-stock` (recount) and `add-purchase` interpret the numeric quantity **in the `unit` sent** (purchase unit or consumption unit, case-insensitive; else 422 `PURCHASE_UNIT_NOT_COMPATIBLE`). The shipped Stock Audit sends a base-unit number with the display-unit label → **×factor stock inflation on every save for converted items** (real corrupted rows found). Registered **BUG-459 (P0/CRITICAL)** and **CR-387 (P1/HIGH)** at Gate 1. **Zero `src/` code changes.**

## What was done
1. Role 6 INVESTIGATION (continued): credentials received from owner → `memory/test_credentials.md` (gitignored, alias `QA_INV`). Probe runners + raw JSON + request logs at `evidence/INV-UNIT-CONTRACT/probes_2026_09_25/` (`PROBE_REPORT.md` is the summary).
   - A1–A9 `add-stock` matrix · B1–B5 `add-purchase` matrix · C1 restore probe item #20326 to baseline (7800 gm) · C2 repaired ANGARA GREAVY #20320 (2,300,000 gm → 9.4 pkt = 4700 gm).
   - Base-unit send on `add-stock` is unsafe (flips `display_unit` → kg, rescales `quantity`) → BUG-459 report "Option A" withdrawn (§10 addendum).
   - Backend already returns `display_qty_text` + `display_qty_parts {major, major_unit, minor, minor_unit, sign}` — unmapped in `inventoryTransform.stockItems()`.
2. Role 1 INTAKE (owner "A"): boot reads done; code reality NONE; duplicate checks (BUG-459 DISTINCT · CR-387 RELATED BUG-240); blast MEDIUM each.
   - `change_requests/BUG-459_STOCK_AUDIT_PHYSICAL_QTY_UNIT_MISMATCH_INFLATION_INTAKE.md`
   - `change_requests/CR-387_SMART_PURCHASE_UNIT_BREAKDOWN_DISPLAY_UNIT_PAYLOAD_INTAKE.md`
   - `evidence/BUG-459/PROBE_POINTER.md` · `evidence/CR-387/PROBE_POINTER.md`
   - `registry.json` 717 → 719 items (meta updated) · BUG_TRACKER / CR_REGISTRY / CONTROL_DASHBOARD top lines + sections · dashboard JSON regenerated into `memory/dev-dashboard/data/` (script `frontend/scripts/gen_dashboard_sync.py` still points at the pre-CR-372 `public/__dev/data` path — ran a path-patched copy; script itself not modified).
3. PRD.md entry appended (2026-09-25).

## Residuals on preprod
- **#20329 UAT BIRYANI MASALA = 250,000 gm (500 pkt) still corrupted** → OD-459-01 (owner supplies true value → recount with `unit:"pkt"`).
- 4 probe purchase rows (ids 7965/7966/7967/7969, vendor 280, ₹103.50, invoice `PROBE-b*`) — no delete endpoint in FE contract.
- Recount rows PUR-835-20260925-7959…7964, 7970, 7971 (added_quantity 0) in purchase history.

## Open owner decisions
BUG-459: OD-459-01 repair value · 02 no-conversion single box · 03 minor ≥ factor · 04 drift render · 05 post-save toast.
CR-387: OD-387-01 payload basis (owner leaning display) · 02 CR-348 rate semantics · 03 bottom table · 04 vendor preview · 05 rounding.

## Sequencing warning
BUG-455 (Gate 5A, QA pending) already edited `StockAuditPanel.jsx`, `inventoryTransform.js`, `purchasePlanner.js`, `AutoShoppingList.jsx`. Planning for BUG-459 / CR-387 must base line numbers on post-BUG-455 HEAD and not regress the `display_qty_text` cells. FILE_OWNERSHIP rows for those files are still owned by BUG-455 IMPL.

## Process notes
- Static proposal mockups created during investigation live in `frontend/public/inv-*proposal*.html` (not app logic; owner aware).
- `create_intake.py` referenced by INTAKE_WORKFLOW.md does not exist in this checkout — intake docs written manually in the BUG-455/456/457 format.
- No environment values, tokens, or passwords appear in any evidence/probe file (grep-verified).

## Next
Owner: answer ODs (esp. OD-459-01 value, OD-387-01) → "Gate 2 GO" → PLANNING role: Impact Analysis BUG-459 first (defines `utils/quantityBreakdown.js`), then CR-387.

## Next-agent entry point
Start with `handover/HANDOVER_2026_09_25_PRESENT_INTAKE_BUG459_CR387_GATE2_APPROVAL.md` — plain-English owner script, IN/OUT scope, OD question list, verbatim approval word ("Gate 2 GO"), and what Planning does after.
