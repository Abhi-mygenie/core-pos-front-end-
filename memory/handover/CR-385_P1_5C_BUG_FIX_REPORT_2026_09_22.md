# BUG FIX REPORT — 2026-09-22 — CR-385 Phase 1.5c · BUG-445 (Bug Fix role, ALPHA v0.7)

```
Trigger:  owner "call bug fix agent and fix BUG-445, update registry trackers and close session after QA of 445"
Step 0:   failing tests first — tests/cr385/phase1_5c.cr385.test.jsx: 2 red / 1 green before the fix (63 existing green)
Fix:      api/transforms/frontDeskTransform.js L87 — bucketInHouse `checkout <= bd` → `checkout === bd` (marker // CR-385 BUG-445). 1 file, 1 line.
Tests:    cr385 jest 63 → 66 green · guards empty · yarn build exit 0
QA:       /app/test_reports/iteration_16.json — 7/7 PASS, 1920×800 + 1366×768, read-only: chip Leaving today 0 == tile == backend counts.leaving_today; Stayover 2 (bkol r2, blpi r3, OVERDUE 1 d pills); Departures untouched (2 overdue); Phase 0 in-house regression clean; 0 duplicate testids; 0 console errors
Sandbox:  no writes of any kind (r2/r3 untouched, no cancels, no settings)
Escalated: none. Scope expansion: NONE.
```

| Bug | Severity | RCA class | Root cause | Fix | Verified |
|---|---|---|---|---|---|
| BUG-445 | MINOR | **CODE_ERROR** (P0 shell vs plan §3 rule) | `<=` folded overdue check-outs into "leaving"; tile used backend `leaving_today` (= today) → chip 2 vs tile 0 | `===` | unit ×3 + live 7/7 |

EXIT GATE: ☑ registry (BUG-445 FIXED + QA-VERIFIED; CR-385 P1.5c closed) ☑ BUG_TRACKER ☑ FILE_OWNERSHIP ☑ marker ☑ compile → 5/5. Decision D79. Smoke S-26 added.
Handover: "Fixed 1/1. Root cause: CODE_ERROR. Fix report at handover/CR-385_P1_5C_BUG_FIX_REPORT_2026_09_22.md. Registry synced: YES. EXIT GATE: 5/5. Scope expansion: NONE. Escalated: none."
