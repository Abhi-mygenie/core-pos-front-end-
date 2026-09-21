# CR-385 · Handover — GATE 3 CLOSED, awaiting "Gate 4 GO" (2026-09-21)

```
Item:   CR-385 PMS Front Desk — Unified Tabbed Workstation · P1 · HIGH (CRITICAL modules M3/M4/M6) · code_reality NONE (0 src/ changes)
Gate 3: CLOSED 2026-09-21 — owner quote in DESIGN_DECISIONS D69 / registry gate_3_closed
Gate 4: GO not yet given. G4-01…09 all ticked with evidence; only G4-10 (owner words "Gate 4 GO") remains.
Plans:  plans/CR-385_IMPLEMENTATION_PLAN_PHASED.md (EXECUTION — phases P0–P5, exact edits, owner smoke scripts) + plans/CR-385_IMPLEMENTATION_PLAN.md (contract/matrix/registry checklist/risks)
Rule:   next phase only after owner says "Phase N smoke OK". Nothing in frontend/src/ before "Gate 4 GO".
```

## Boot order for the IMPLEMENTATION agent (after "Gate 4 GO")
1. `control/AGENT_PROMPT_ALPHA.md` (Role 3 Implementation, Step 0 Entry Verification) → 2. this file → 3. `plans/CR-385_IMPLEMENTATION_PLAN_PHASED.md` **Phase 0 only** → 4. `plans/CR-385_IMPLEMENTATION_PLAN.md` §1 scope lock, §3 data contract, §6 matrix → 5. `plans/CR-385_DESIGN_DECISIONS.md` D1–D69 (all binding) → 6. `public/cr385-frontdesk-mockup.html` v2.29 (visual spec) → 7. fixtures: `evidence/CR-385/probes_2026_09_20_g4_09/*.json` (LR/board/kpis), `probes_2026_09_20_n11/` (mixed nights), `probes_2026_09_21_held_fallback/h1_extend_1116.json` (held_fallback), `probes_2026_09_21_d17/` (advance merge) → 8. `memory/test_credentials.md` (OWNER_TGK) → 9. `public/cr385-master-checklist.html` rows M0-*, X-*, R-*.
Entry Verification: re-run `sed -n 109p;270p App.js`, `244p Sidebar.jsx`, `17,18,36p roomStatusTransform.js`, `10p;48p CancelBookingDialog.jsx`, `12p;39p NoShowDialog.jsx`, `21p;26p;468p ChannelManagerPage.jsx`, `24,33p restaurantSettingsService.js` and compare with the "Current" column before touching anything.

## State of the world
- Backend: D14, D15, D16, D17 fixed + FE-validated; BQ-385-19 shipped + validated; BQ-385-20 = contract (single-method advance); BQ-385-21 resolved by the owner's live scenario (D68). **Backend queue empty.**
- Owner decisions locked: OD-385-16 a · OD-385-17 Channel Manager 5th tab · OD-385-18 a (no Split tile at advance points).
- B-7 smoke complete (S-411 after D17). BUG-418 lands in P4/M6 (O-5). Intake candidates from smoke: BUG-431 (CheckInPage Room Amount pre-fill re-applies GST), BUG-432 (legacy NewBookingPage FE rate honoured over CM rate), BUG-433 (₹1 rounding divergence In-House/folio/POS) — file at P5 or earlier if the owner asks.
- Sandbox: settings at defaults; rooms r4/r5/r1 free (hk); 8524/8526 belong to other testers. Rates 2026-11-15…17 restored (31,500 / 7,400).
- HTML: checklist 36 rows ticked (P-01…P-12, X-*, G4-01…09, S-* except S-418 N/A); mockup v2.29 log current.

## Next words expected from the owner
- **"Gate 4 GO"** → start Phase 0 per the phased plan. Then after each phase: **"Phase N smoke OK"**.
