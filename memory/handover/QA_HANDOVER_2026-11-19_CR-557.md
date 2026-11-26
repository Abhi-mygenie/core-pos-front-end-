# QA Handover — CR-557 (shared `<PopoutItemRow>` for ScanOrderPopOut)

**Date:** 2026-11-19 · **Risk:** HIGH · **Gate:** 5A IMPLEMENTED → QA
**Plan:** `plans/CR-557_IMPLEMENTATION_PLAN.md` · **IA:** `impact/CR-557_IMPACT_ANALYSIS.md`
**Decisions:** OD-557-01=YES (APS/Price-TBD in Mode B) · OD-557-02=Option A (prevItems shared read-only row) · OD-557-03=Keep old labels

## Files changed
- **NEW** `frontend/src/components/dashboard/PopoutItemRow.jsx` (shared row, variants full/new/readonly)
- `frontend/src/components/dashboard/ScanOrderPopOut.jsx` (import + 3 list-body swaps; removed unused XCircle import)

## Self-verification done by Implementation
| Check | Result |
|-------|--------|
| Webpack compile | ✅ Compiled successfully, 0 new warnings |
| Unit: `CR547_SelectiveKOT.test.jsx` (KOT selection, select-all, per-item checkboxes) | ✅ PASS (all) |
| Unit: `ScanOrderPopOut.test.jsx` | 7 pass / 22 fail — **ALL 22 failures PRE-EXISTING**, proven by stashing CR-557 and re-running baseline (22 fail / 7 pass, identical). Root cause: test helper uses `orderFrom:'web'` but live predicate `isUnconfirmedScanOrder` requires `isWebOrder` (unchanged by CR-557). |
| Asserted test-ids preserved | ✅ `popout-kot-check-${idx}` (Mode A), `popout-kot-check-new-${idx}` (Mode B) intact |
| Code markers `// CR-557` | ✅ both files |

## PRE-EXISTING issue to note (NOT CR-557)
`ScanOrderPopOut.test.jsx` is drifted from code: it builds orders with `orderFrom:'web'` while the predicate (L60-61) checks `isWebOrder`. 22 render-based tests fail on baseline too. Recommend a separate test-maintenance ticket to update the helper to set `isWebOrder:true`. Do NOT attribute to CR-557.

## Browser test cases (run on preprod — needs real web + web-edit orders)
| # | Case | Expected |
|---|------|----------|
| V1–V4 | **Mode A** (new web order, fOrderStatus=7): APS badge+Price TBD on ₹1 item; cancelled row strikethrough+price hidden; multi-line variations w/ option prices; add-on prices + note + Comp tag | identical to before CR-557 |
| V5–V8 | **Mode B** (customer edits confirmed order → new "yet-to-confirm" items): new-item rows now show APS/Price-TBD, cancelled styling, multi-line variations+prices, add-on prices, notes | parity with Mode A (previously missing) |
| V9 | Per-item cancel (X) opens CancelFoodModal in both modes | works both |
| V10 | KOT checkbox + Select-all + count badge + payload | unchanged in both modes |
| V11 | "Previously ordered items" rows greyed, read-only (no cancel/KOT) | OD-557-02 |

## Registry
- registry.json: CR-557 → GATE_5A_IMPLEMENTED, gate 5
- CR_REGISTRY.md, FILE_OWNERSHIP.md updated
- Dependents unblocked: CR-558 (Option B), BUG-679(ModeB), BUG-702(ModeB), CR-545(ModeB) — mark resolved-by-CR-557 after QA passes.
