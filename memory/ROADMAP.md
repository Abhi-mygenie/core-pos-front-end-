# MyGenie POS — current-session roadmap

Updated 2026-09-28. This file prioritizes the active **CR-390 MM recovery** only; other sprint items remain governed by `control/registry.json` and `control/SPRINT_STATUS.md`. It does not close, reorder or authorize unrelated work.

## P0 — current stop / next action items

- **Next agent first:** read `handover/SESSION_HANDOVER_2026_09_28_CR390_PRESENT_PLAN_AWAIT_STEP2.md`, present the full agreed approach + Step 1 findings + accepted choices in plain English, then ask permission for Step 2 only and WAIT. Do not write the detailed repair plan before approval.

- Step 1 analysis and owner decision review complete: `impact/CR-390_MM_FAQ_COVERAGE_GATE2_2026_09_28.md`. OD-390-16…22 LOCKED FOR PLANNING; await separate Step 2 instruction.
- Approved sources: Palm House **Normal** for standard MM; Kunafa Mahal **Aggregator** for aggregator MM; Palm House **Premium** only for menu switching/comparison. No Party setup. Exact future test records/actions/cleanup still require Gate 3 detail and Gate 4 approval.
- Do NOT run existing unsafe capture manifest. Recovery risk CRITICAL; app/source/assets unchanged.

## P1 — gated recovery

- Only after owner authorization: Step 2 / Gate 3 repair plan and verification matrix.
- Explicit Gate 4 GO, then scoped implementation/recapture, independent QA and corrected package.
- External validation for every FAQ-01…70; owner confirms all green before any storyboard/video.

## P2 — later / backlog

- Planned 140 EN/HI videos, voice integration choices and separate preview/download UI; not implemented.
- Owner reviews final MM videos, then EM discussion and remaining original reference-PDF modules.
- Optional annotated reference PDF remains separate from video-source screenshots.

Potential later enhancement: expose a per-FAQ evidence revision/approval badge in the review interface so scripts and images cannot silently drift apart. Suggestion only; no scope approval.