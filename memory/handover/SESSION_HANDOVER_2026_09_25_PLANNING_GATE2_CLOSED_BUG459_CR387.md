# SESSION HANDOVER — 2026-09-25 — PLANNING Gate 2 CLOSED: BUG-459 + CR-387 (all ODs locked) · Gate 3 NOT STARTED

## Summary
Workspace re-synced from remote `21implement` HEAD `0a33e06` (only `memory/` differed — zero `src/` drift; `test_credentials.md` preserved). PLANNING role: Gate 2 completion confirmed and presented to owner in plain English; owner locked **all 15 owner decisions** with verbatim **"All recommended · 459-01: a · 9.4 pkt , update docs and decsions"**. Both items → `GATE_2_CLOSED` (completeness 3/7). **No Implementation Plan written. Zero code.**

## Locked decisions (also in registry `owner_decisions`, intake docs §OD, IA docs §6)
**BUG-459:** OD-01 **9.4 pkt** true on-hand for #20329 UAT BIRYANI MASALA (= 4700 gm @500) · OD-02 YES single box / `item.unit` for no-conversion + sub-recipes · OD-03 (a) auto-normalise minor ≥ factor on blur · OD-04 YES sign + breakdown, 0 → "Match", 0 dp gm/ml/piece · OD-05 YES per-item wastage toast · OD-06 YES keep `audit-input-${id}` on major + `audit-input-minor-${id}` · OD-07 (a) after BUG-455 Gate 5b.
**CR-387:** OD-01 **(b)** `Unit: display_unit` + display qty (4 dp) · OD-02 YES rate per display unit · OD-03 (a) table-2 read-only breakdown text, two-box only in Purchase List · OD-04 YES vendor preview breakdown · OD-05 YES rounding · OD-06 (a) read-only GET `vendor-item-list` probe in Gate 3 for `unit_price` basis · OD-07 (a) ad-hoc rows empty · OD-08 (a) after BUG-455 5b + BUG-459 5a.

## OD-459-01 — NO data action
Owner 2026-09-25: test data; no recount call. #20329 self-heals on the first Stock Audit save after BUG-459 ships → use it as the Gate 6 smoke item (read-back `cal_quantity 4700`, `display_unit "pkt"`).

## Docs touched this session
`control/registry.json` (status, completeness, owner_decisions, status_history ×2 events each) · `control/BUG_TRACKER.md` · `control/CR_REGISTRY.md` · `control/CONTROL_DASHBOARD.md` (top lines + row status) · `change_requests/BUG-459_*_INTAKE.md` · `change_requests/CR-387_*_INTAKE.md` · `impact/BUG-459_IMPACT_ANALYSIS.md` · `impact/CR-387_IMPACT_ANALYSIS.md` (headers + §6) · `dev-dashboard/data/*.json` regenerated (path-patched copy of `gen_dashboard_sync.py` at `/tmp/gen_dash.py` — script itself unchanged, P3 still open).

## Next
Owner verbatim **"Gate 3 GO"** → PLANNING Role 2 stage `implementation_plan`:
1. Re-grep IA line numbers on current HEAD (BUG-455 status check first — OD-459-07 says wait for 5b; if 5b not closed, plan may still be written but implementation must wait).
2. `plans/BUG-459_IMPLEMENTATION_PLAN.md` first (defines `utils/quantityBreakdown.js` API: `toBreakdown / fromBreakdown / normalizeBreakdown`).
3. Run OD-387-06 read-only probe (GET `vendor-item-list`, compare `unit_price` vs `Unit` of past rows) → then `plans/CR-387_IMPLEMENTATION_PLAN.md`.
4. Registry → `GATE_3_PLAN_COMPLETE`; trackers; handover.
Anything other than "Gate 3 GO" = not approved. No code until Gate 4 GO.

## Notes
- Credentials alias `QA_INV` in gitignored `memory/test_credentials.md`. Probe pack `evidence/INV-UNIT-CONTRACT/probes_2026_09_25/`.
- Webpack fixes in `frontend/craco.config.js` + `frontend/webpack-shims/` must survive any future re-pull.
