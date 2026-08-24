# Smoke Backfill Batch 001 — Report

**Doc:** SMOKE_BATCH_001_REPORT_2026_05_30.md
**Date:** 2026-05-30
**Audit revision:** v2.5_2026_05_30

---

## 1. What was delivered (10 bugs to 7/7)

### Group A — Smoke-only (6 bugs)
4 with screenshot evidence, 2 with owner verbal sign-off.

| Bug | Evidence | Result |
|---|---|---|
| BUG-057 | Screenshot: `BUG_057_print_bill_button.png` | CLOSED — OWNER VERIFIED, 7/7 |
| BUG-059 | Screenshot: `BUG_059_audit_print_buttons.png` | CLOSED — OWNER VERIFIED, 7/7 |
| BUG-060 | Verbal sign-off | CLOSED — OWNER VERIFIED, 7/7 |
| BUG-061 | Screenshot: `BUG_061_room_checkin_time.png` | CLOSED — OWNER VERIFIED, 7/7 |
| BUG-068 | Verbal sign-off (owner update mid-session: re-included) | CLOSED — OWNER VERIFIED, 7/7 |
| BUG-071 | Screenshot: `BUG_071_user_order_id.png` | CLOSED — OWNER VERIFIED, 7/7 |

### Group B — Two artifacts missing (4 bugs)
| Bug | Treatment | Result |
|---|---|---|
| BUG-065 | Smoke verbal + CG waiver (POS 2.0, pre-cutoff) | CLOSED — OWNER VERIFIED, 7/7 (Code Gate = green-W) |
| BUG-070 | Smoke verbal + auto-gen Intake stub | CLOSED — OWNER VERIFIED, 7/7 |
| BUG-074 | Smoke verbal + CG waiver (POS 2.0, pre-cutoff) | CLOSED — OWNER VERIFIED, 7/7 (Code Gate = green-W) |
| BUG-082 | Smoke verbal + auto-gen Intake stub | CLOSED — OWNER VERIFIED, 7/7 |

## 2. Dashboard impact

| Metric | Before this batch | After this batch |
|---|---:|---:|
| Active Debt (CSV register) | 19 | 19 |
| Archived (fully closed)    | 9  | **19** |
| All-time tracked           | 28 | **38** |
| Tab badge `Closure Debt`   | 19 | 19 |
| `CLOSED — OWNER VERIFIED` count | 64 | **74** |
| `CLOSED — IMPLEMENTED` count    | 13 | **3** (only POS 3.1 BUG-109/110/111 left) |

Active stayed at 19 because the 10 batch bugs were not previously in the CSV-based active register; they were tracked solely in `bug_tracker.json`. The cleanup script added them as archived rows so the historical tracker is now complete.

## 3. Mid-run incident — cross-contamination bug

A template-side bug was found and fixed mid-session:

- Initial smoke sign-off template literally wrote *"BUG-068 was explicitly excluded from this batch"* in every signoff doc.
- The reaudit scanner's `BUG_RX` regex pattern-matched the bug-ID anywhere in a doc's body, so BUG-068 was credited with 9 false smoke_signoff refs from the other 9 signoff docs → wrongly promoted to OWNER VERIFIED.
- Fix #1: removed the BUG-068 mention from the template, regenerated.
- Fix #2 (after owner clarification): BUG-068 was re-included in the batch with verbal sign-off → repromoted legitimately.

Lesson recorded in the audit_revision: **never let a doc body reference an excluded bug-ID by literal text** — use neutral phrasing or refer to an external exclusion list.

## 4. Files created/modified (15 new + 6 modified)

### NEW
```
/app/memory/control/sessions/SESSION_START_2026_05_30_SMOKE_BACKFILL_BATCH.md
/app/memory/control/CODE_GATE_WAIVER_REGISTRY_2026_05_30.md           (Batch 2 appended)
/app/memory/memory/bugs/smoke_signoffs/BUG_<NNN>_OWNER_SMOKE_SIGNOFF_2026_05_30.md × 10
/app/memory/memory/bugs/smoke_signoffs/evidence_2026_05_30/*.png        × 4
/app/memory/memory/bugs/intake/BUG_070_INTAKE_2026_05_30.md
/app/memory/memory/bugs/intake/BUG_082_INTAKE_2026_05_30.md
/app/memory/memory/bugs/code_gate_waivers/BUG_065_CG_WAIVER.md
/app/memory/memory/bugs/code_gate_waivers/BUG_074_CG_WAIVER.md
/app/scripts/generate_smoke_signoffs.py
/app/scripts/cleanup_smoke_batch_2026_05_30.py
/app/memory/memory/change_requests/SMOKE_BATCH_001_REPORT_2026_05_30.md
/app/memory/memory/SMOKE_BATCH_001_OWNER_SMOKE_SIGNOFF_2026_05_30.md
```

### MODIFIED
```
/app/scripts/generate_intake_stubs.py             (TARGETS += BUG-070, BUG-082)
/app/memory/control/CLOSURE_DEBT_BURNDOWN.csv     (+10 archived rows; total 38)
/app/frontend/public/__dev/data/closure_debt.json  (regenerated)
/app/frontend/public/__dev/data/bug_tracker.json   (10 bugs promoted with status_history)
/app/memory/control/CONTROL_DASHBOARD.md
/app/memory/PRD.md
```

## 5. Remaining work (3 IMPLEMENTED bugs still pending)
Only the POS 3.1 batch remains in `CLOSED — IMPLEMENTED` with major gaps:
- BUG-109 — QSR takeaway/delivery validation parity (6/7 missing)
- BUG-110 — QSR prepaid lock parity (6/7 missing)
- BUG-111 — QSR bill parity (6/7 missing)

These genuinely need real artifact backfill, not waivers — they shipped recently and the 7-artifact rule was active at the time.

---
*— End of Smoke Batch 001 Report —*
