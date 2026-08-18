# SESSION START — Smoke Sign-off Batch + Intake/CG Waiver Top-up

**Created:** 2026-05-30
**Agent:** E1 (fork)
**Topic:** Backfill smoke sign-offs for 9 closed bugs (5 smoke-only + 4 mid-effort)
**Owner GO:** Received 2026-05-30 (Q1=yes-6-bugs (revised to 5 — BUG-068 excluded), Q2=auto-extract, Q3=append, Q4=N/A, Q5=screenshots-for-4, verbal-for-1, Q6=BUG-068 excluded)

---

## 1. Why this session exists
Owner verified smoke for 5 bugs (BUG-057, 059, 060, 061, 071) — 4 with screenshots, 1 verbal — and approved Code Gate Waiver expansion + Intake stubs for 4 mid-effort bugs.

## 2. Scope Lock

### IN-SCOPE
- `/app/memory/memory/bugs/smoke_signoffs/evidence_2026_05_30/*.png` (4 screenshots, ALREADY downloaded)
- `/app/memory/memory/bugs/smoke_signoffs/BUG_<NNN>_OWNER_SMOKE_SIGNOFF_2026_05_30.md` (9 NEW)
- `/app/memory/memory/bugs/intake/BUG_070_INTAKE_2026_05_30.md` (NEW)
- `/app/memory/memory/bugs/intake/BUG_082_INTAKE_2026_05_30.md` (NEW)
- `/app/memory/memory/bugs/code_gate_waivers/BUG_065_CG_WAIVER.md` (NEW)
- `/app/memory/memory/bugs/code_gate_waivers/BUG_074_CG_WAIVER.md` (NEW)
- `/app/memory/control/CODE_GATE_WAIVER_REGISTRY_2026_05_30.md` (APPEND batch-2 rows)
- `/app/scripts/generate_smoke_signoffs.py` (NEW)
- `/app/scripts/generate_intake_stubs.py` (UPDATE TARGETS list)
- `/app/memory/memory/change_requests/SMOKE_BATCH_001_PLAN_2026_05_30.md` (NEW)
- `/app/memory/memory/change_requests/SMOKE_BATCH_001_REPORT_2026_05_30.md` (NEW)
- `/app/memory/memory/SMOKE_BATCH_001_OWNER_SMOKE_SIGNOFF_2026_05_30.md` (NEW)
- `/app/memory/control/CONTROL_DASHBOARD.md` + `/app/memory/PRD.md` (UPDATE)

### OUT-OF-SCOPE
- BUG-068 (excluded — owner directive)
- BUG-109/110/111 (heavy backfill — separate batch)
- All React `src/` and dashboard JSON/CSV (regenerated only via scanner)

## 3. Targets

### Group A — smoke-only (5 bugs)
| ID | Evidence type |
|---|---|
| BUG-057 | Screenshot — `evidence_2026_05_30/BUG_057_print_bill_button.png` |
| BUG-059 | Screenshot — `BUG_059_audit_print_buttons.png` |
| BUG-060 | Verbal-only sign-off |
| BUG-061 | Screenshot — `BUG_061_room_checkin_time.png` |
| BUG-071 | Screenshot — `BUG_071_user_order_id.png` |

### Group B — 2 missing artifacts (4 bugs)
| ID | Approach |
|---|---|
| BUG-065 | Smoke verbal + CG waiver (POS 2.0, pre-cutoff) |
| BUG-070 | Smoke verbal + Intake stub auto-gen |
| BUG-074 | Smoke verbal + CG waiver (POS 2.0, pre-cutoff) |
| BUG-082 | Smoke verbal + Intake stub auto-gen |

## 4. Expected outcome
- 9 bugs at 7/7
- 9 bugs auto-promoted IMPLEMENTED → OWNER VERIFIED
- 9 bugs archived from Active Closure Debt
- Active Debt: 19 → 10
- All-time tracked: 28 (unchanged)
- Archived: 9 → 18

## 5. Done definition
- [ ] 9 smoke signoff MDs created (4 ref-screenshot, 5 verbal)
- [ ] 2 intake stubs (BUG-070, BUG-082)
- [ ] 2 CG waiver stubs + registry batch-2 entries (BUG-065, BUG-074)
- [ ] Scanner re-run, dashboard verified
- [ ] Report + Owner Smoke Sign-off + PRD/Control updates
