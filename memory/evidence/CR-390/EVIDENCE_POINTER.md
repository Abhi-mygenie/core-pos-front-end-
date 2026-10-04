# CR-390 — Evidence pointer (2026-09-26)

## Current MM recovery references — Step 2 / 2026-09-28

- Owner “begin step 2”; plan draft: `memory/plans/CR-390_IMPLEMENTATION_PLAN.md` current amendment; data/all-70 annex: `memory/plans/CR-390_MM_RECOVERY_EVIDENCE_SPEC.md`.
- **OD-390-25 LOCKED FOR PLANNING: option 3b read-only discovery first.** Current handover: `memory/handover/SESSION_HANDOVER_2026_09_28_CR390_OPTION3B_ACCEPTED_PRESENTATION.md` — present both sessions/current state, explain pending P3B-1…4 approvals and wait. Earlier Step 2 handover remains supporting history.
- Current planning ledger: `memory/evidence/CR-390/GATE3_2026_09_28/PLANNING_EVIDENCE.md`; Step 1 source: `memory/impact/CR-390_MM_FAQ_COVERAGE_GATE2_2026_09_28.md`; historical ledger: `memory/evidence/CR-390/GATE2_2026_09_28/READ_ONLY_EVIDENCE.md`.
- Original images: `memory/evidence/CR-390/MM/` (50 PNGs / 42 distinct hashes, not accepted). 70 FAQ baseline remains 34 blocked/36 partial; proposed correction chains do not reclassify it.
- Locked sources: Palm House Normal; Kunafa Mahal Aggregator; Palm House Premium for switching/comparison only. No Party setup.
- **Gate 3 OPEN / OWNER REVIEW; OD-390-23/24 LOCKED FOR PLANNING (owner 1a/2a); OD-390-25 LOCKED FOR PLANNING (3b read-only discovery first; P3B execution approvals pending, no access); no Gate 4 GO.** No code, original narration/mapping/manifest/PNG/env, live/data or generated deliverable changes. Existing MM tooling remains unmodified/unsafe to rerun; old PMS missing-generator inventory below is historical.

## Historical PMS intake inventory (preserved)

| Evidence | Path | Note |
|---|---|---|
| PMS Screen Reference v2.0 (the model deliverable) | `frontend/public/MyGenie_PMS_Screen_Reference.pdf` | 38 pp · 36 screens · 5 sections · 16 Sep 2026 |
| PMS Screen Reference v1.0 | `frontend/public/MyGenie_PMS_Screen_Reference_v1_2026-09-05.pdf` | 14 pp · 13 screens · superseded |
| PMS static design mockups (not PDF source) | `frontend/public/pms/*.html` (13), `frontend/public/pms-mockup.html`, `frontend/public/cr358-p4-pms-mockup.html` | Tailwind CDN mockups |
| Method record | `memory/handover/SESSION_HANDOVER_2026_09_06_PMS_TRACK.md` §2 | "dummy data injected via DOM (`/app/pms_dummy_data.py`, `/app/generate_pms_pdf_v2.py`)" |
| Generator scripts | — | **ABSENT**: `ls /app/*.py` → none; `git log --all -- '*generate_pms_pdf*' '*pms_dummy_data*'` → no commits |
| Route inventory used for module list | `frontend/src/App.js` (`grep -o 'path="[^"]*"'`) | 2026-09-26 |

PDF v2.0 contents page (verbatim section headers): FRONT OFFICE (01–17) · BILLING (18–19) · ROOMS (20–22) · DISTRIBUTION (23–30) · REPORTS (31–36).
