# Subsumed Backlog Owner Attestation 001 — Owner Smoke Sign-off (v2.9)

**Doc:** SUBSUMED_BACKLOG_001_OWNER_SMOKE_SIGNOFF_2026_05_30.md
**Date:** 2026-05-30
**Sign-off type:** Agent-conducted smoke + owner async acceptance (Q1=a, Q2=a, Q3=a)
**Audit revision:** v2.9_2026_05_30

---

## Smoke matrix

| # | Check | Result |
|---|---|---|
| 1 | Scanner v2.9 exits 0 | ✅ |
| 2 | 17 SUBSUMED_OWNER_ATTESTATION docs detected (1 master + 16 stubs × 1 dedup) | ✅ |
| 3 | All 8 target bugs in `older_closed_or_partial`, status `CLOSED — SUBSUMED (owner-attested)` | ✅ |
| 4 | Each target carries `subsumed_meta` block with owner_attested, attested_date, subsuming_cr="UNIDENTIFIED — code grep waived" | ✅ |
| 5 | Each target carries `artifact_refs` with `subsumed_owner_attested: true` flag on smoke_signoff entry | ✅ |
| 6 | Bug Tracker total unique IDs preserved (118 → 118) | ✅ |
| 7 | `intake_only_bugs` duplicates of target 8 removed (7 → 0) | ✅ |
| 8 | Dashboard renders amber `SUBSUMED` pill next to status (BUG-014 verified) | ✅ |
| 9 | Detail-view Subsumption Attestation card renders (date, subsuming CR, registry doc) | ✅ |
| 10 | Pre-rule WAIVED rendering on BUG-088 unchanged | ✅ |
| 11 | Premature WAIVED rendering on active CRs unchanged | ✅ |
| 12 | BUG-040, BUG-041 untouched (still INTAKE) | ✅ |
| 13 | Main React POS app untouched, supervisor RUNNING | ✅ |
| 14 | dashboard.js lint clean | ✅ |

## Visual artifact

- Bug Tracker search for `BUG-014` shows the single subsumed row with both pills (green `CLOSED — SUBSUMED (owner-attested)` + amber `SUBSUMED`). Screenshot captured 2026-05-30.

## Owner directive log

| Question | Answer |
|---|---|
| Q1 — Scope | (a) Bug-side only — 8 bugs |
| Q2 — Status label | (a) `CLOSED — SUBSUMED (owner-attested)` |
| Q3 — Section | (a) Move into `older_closed_or_partial` |

## Self-assessment (per AGENT_PROMPT_ALPHA.md)

| Dimension | Score | Notes |
|---|---|---|
| Session Start file created? | 5 | Created before any code change. |
| Boot sequence completed? | 4 | Read CONTROL_DASHBOARD, AGENT_PROMPT_ALPHA, scanner, dashboard; no React/business changes so frozen baselines unread by design. |
| Scope lock held? | 5 | All modified files match declaration exactly. Mid-flight added removal-from-intake_only_bugs to mover script but this is a within-scope correctness fix, not a scope expansion. |
| API endpoints curl-probed? | N/A | Control-layer only. |
| Walk-in tested separately? | N/A | No order flow changes. |
| Stale docs flagged? | 5 | Pre-existing duplicate rows for BUG-040/041/044/085 flagged in Report §7 for separate batch. |
| Control layer updated? | 5 | Dashboard row, PRD changelog, master registry, Session Start, Plan, Report, this Smoke Sign-off. |
| Handover note written? | 5 | Master registry doc + Report make next-agent context complete. |
| Regression risk assessed? | 5 | All three pre-existing waiver classes verified intact. Main React app untouched. |

## Sign-off

The Subsumed Backlog Owner Attestation 001 batch (v2.9) is **APPROVED — CLOSED**.

- 8 stale INTAKE bugs converted to honestly-labelled `CLOSED — SUBSUMED (owner-attested)` rows.
- Reversal protocol documented — if subsuming CR is ever discovered, upgrade path is clear.
- No regression to pre-rule waivers, premature waivers, or the main React app.
- Owner directive Q1=a, Q2=a, Q3=a fully honoured.

---
*Signed off (agent-conducted, owner async accepted): 2026-05-30.*
