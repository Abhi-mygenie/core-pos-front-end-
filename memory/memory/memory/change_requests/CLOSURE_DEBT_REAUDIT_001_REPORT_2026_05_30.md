# Closure Debt Re-Audit (v2) — Report

**Doc:** CLOSURE_DEBT_REAUDIT_001_REPORT_2026_05_30.md
**Date:** 2026-05-30
**Run by:** E1 (fork) — Python scanner `/app/scripts/reaudit_closure_debt.py`
**Trigger:** Owner spot-check flagged POS 3.0 bugs displaying 6/6 missing despite being SHIPPED + VERIFIED.

---

## 1. Aggregate result

| Severity bucket | v1 (2026-05-29) | v2 (2026-05-30) | Delta |
|---|---:|---:|---:|
| CRITICAL  | 17 | **4**  | −13 |
| HIGH      | 5  | **2**  | −3 |
| MEDIUM    | 4  | **12** | +8  |
| LOW       | 1  | **9**  | +8  |
| RESOLVED  | 0  | **1**  | +1  |
| **Total** | 28 | **28** | 0 |

Filtered backfill effort dropped from ~42 hrs (v1) → **37.5 hrs (v2)** — but more importantly, the work is now correctly *targeted* (Intake docs mostly, not full 6-artifact backfills).

## 2. Owner-flagged bugs — before vs after

| Item | v1 missing | v2 missing | v1 severity | v2 severity | Net upgrade |
|---|---:|---:|---|---|---|
| BUG-087 PayLater PAID badge          | 6 | 2 | CRITICAL | MEDIUM | 4 slots upgraded |
| BUG-088 Room Transfer v2             | 6 | 2 | CRITICAL | MEDIUM | 4 slots upgraded |
| BUG-089 update-food-status dedup     | 6 | 1 | CRITICAL | LOW    | 5 slots upgraded |
| BUG-098 restaurant profile CRM key   | 6 | 1 | CRITICAL | LOW    | 5 slots upgraded |
| BUG-099 QSR Quick Billing UX         | 4 | 1 | HIGH     | LOW    | 3 slots upgraded |
| BUG-100 duplicate toast removal      | 6 | 1 | CRITICAL | LOW    | 5 slots upgraded |
| BUG-102 Ready/Served 8s timeout      | 6 | 1 | CRITICAL | LOW    | 5 slots upgraded |
| BUG-103 number input arrows          | 6 | 1 | CRITICAL | LOW    | 5 slots upgraded |
| BUG-109 QSR takeaway/delivery        | 4 | 3 | HIGH     | MEDIUM | 1 slot kept (Discovery only) |
| BUG-110 QSR prepaid lock parity      | 4 | 3 | HIGH     | MEDIUM | 1 slot kept |
| BUG-111 QSR bill parity              | 5 | 3 | CRITICAL | MEDIUM | 2 slots upgraded |

## 3. Remaining CRITICAL items (4)

These are *truly* under-documented and need attention:

| Item | Why still CRITICAL | Recommended next step |
|---|---|---|
| POS2-005-FU §A — Collect-Bill hidden for status-8 | Only Impact Analysis exists; no Plan/Code Gate/Impl/Smoke | Write 5 remaining artifacts; check if covered by `final/` baseline overlay |
| POS2-007 Phase 1 — Confirm-order tone FE override   | Only Impl Summary exists; no Intake/Impact/Plan/Code Gate/Smoke | Same |
| PROD-007 — Loyalty earn points on Collect Bill      | Only combined Impact doc; owner-verified in prose | Split combined doc OR accept "combined hotfix doc" convention formally |
| PROD-008 — Manual KOT/Bill custName & custPhone NULL | Same as PROD-007 — single combined Impact doc       | Same |

## 4. Evidence sample — BUG-089 (was 6/6, now 1/6)

| Artifact slot | Evidence path (relative to `/app/memory/`) |
|---|---|
| A1 Intake               | `change_requests/final_sprint_reconciliation/POS3_0_BUG_FIX_MASTER_IMPLEMENTATION_PLAN_2026_05_18.md` |
| A2 Impact Analysis      | `change_requests/final_sprint_reconciliation/POS3_0_BUCKET_A_OWNER_APPROVAL_PLAN_2026_05_18.md` |
| A3 Implementation Plan  | `change_requests/final_sprint_reconciliation/POS3_0_BUG_FIX_MASTER_IMPLEMENTATION_PLAN_2026_05_18.md` |
| A4 Code Gate            | `change_requests/final_sprint_reconciliation/POS3_0_BUCKET_A_CODE_DIFF_PREVIEW_2026_05_18.md` |
| A5 Impl Summary / QA    | `change_requests/final_sprint_reconciliation/POS3_0_BUCKET_A_IMPLEMENTATION_REPORT_2026_05_18.md` + `POS3_0_BUCKET_A_QA_HANDOFF_2026_05_18.md` |
| A6 Owner Smoke Sign-off | `change_requests/final_sprint_reconciliation/POS3_0_COMPLETE_SPRINT_STATUS_RECONCILIATION_2026_05_21.md` (line: *"Implemented + owner-confirmed: 8 — BUG-087, 088, 089, …"*) |

Only A1 Intake doc was never produced as a dedicated file — though the Master Plan covers the requirement context. That's a documentation gap worth ~0.5 hr to backfill, not the 2 hr CRITICAL backfill v1 reported.

## 5. Why the v1 audit failed

The v1 audit's filename matcher only looked for per-bug filenames (`BUG_087_*`, `BUG_100_*`, etc.). Sprint-rollup, bucket-level, and wave-level docs were ignored even when they explicitly cover the bug. The v2 scanner extracts bug IDs from both filenames AND body text, so it correctly attributes Bucket A docs to all 4 bugs they cover.

## 6. Outputs of this re-audit

1. `/app/memory/control/CLOSURE_DEBT_BURNDOWN.csv` — rewritten (28 rows; new `audit_revision` column).
2. `/app/frontend/public/__dev/data/closure_debt.json` — regenerated for Dev Dashboard.
3. **(v2.1 patch)** `/app/frontend/public/__dev/data/bug_tracker.json` — every closed/shipped bug now carries `artifact_refs` (label/path/type per slot) + `completeness: "N/7"`. **108 bugs** received this enrichment. Effect: opening any bug in the Bug Tracker tab now shows the same rich "📎 Artifact References (N/7)" panel as BUG-060 did, with concrete file paths and copy buttons.
4. `/app/memory/memory/change_requests/CLOSURE_DEBT_REAUDIT_001_DELTA_2026_05_30.json` — per-row diff record.
5. `/app/scripts/reaudit_closure_debt.py` — committed reproducible scanner (v2.1).

## 7. Verification

Dev Dashboard at `https://<preview>/__dev/` now shows:

- CRITICAL count: **4** (was 17+)
- HIGH count: **2**
- MEDIUM count: **12**
- LOW count: **9**
- Filtered effort: **37.5 hrs**

Screenshot taken 2026-05-30, captured under `/tmp/dashboard_reaudit.png` during this session.

---
*— End of Re-Audit Report —*
