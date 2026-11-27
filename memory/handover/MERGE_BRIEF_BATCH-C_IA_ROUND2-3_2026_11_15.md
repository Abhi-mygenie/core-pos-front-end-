# MERGE BRIEF — Batch C Gate 2 IA (write probe + owner rounds 2–3) — 2026-11-15

Docs/evidence only. **Zero app source changes.** Copy the files into the repo at the same paths (they are relative to `/app/`).

## ADDED — Round 1 (Gate 2 IA, read-only probes)
| Path | What |
|---|---|
| memory/impact/BUG-675_IMPACT_ANALYSIS.md | BUG-675 IA (remove "Total sale" text) |
| memory/evidence/BATCH-C-IA/probes_2026_11_15/*.txt | Round 1 read-only probe outputs (12 files: CR-524 cancel fields, CR-528 order logs/operations, CR-503 Beta TAB rows) |
| memory/PRD_DEPLOYMENT_RECORD_2026-11-15_EMERGENT_E1_FRESH_DEPLOY2.md | Fresh deploy record for this session |

Round 1 files also in this zip (later edited in rounds 2–3): CR-503 / CR-528 / CR-524 IA, BATCH-C summary, backend brief.

## ADDED — Rounds 2–3
| Path | What |
|---|---|
| memory/impact/BATCH-C_GATE2_OWNER_ROUND3_2026_11_15.md | Owner round-3 answers (13), clash list, CR-505/CR-510 coverage notes (CR-510 claim corrected), next-probe data list |
| memory/evidence/BATCH-C-IA/probes_2026_11_15_write/WRITE_PROBE_FINDINGS_2026_11_15.md | Write probe findings W-1..W-12 |
| memory/evidence/BATCH-C-IA/probes_2026_11_15_write/batch_c_write_probe.py | Probe script (needs env PROBE_EMAIL / PROBE_PASSWORD; token never printed) |
| memory/evidence/BATCH-C-IA/probes_2026_11_15_write/*.json | Raw masked API responses (test orders 1578757–1578760, all cancelled) |
| memory/handover/MERGE_BRIEF_BATCH-C_IA_ROUND2-3_2026_11_15.md | This brief |

## EDITED (changes appended as "REVISION 2026-11-15" sections + header notes; original text kept)
| Path | Change |
|---|---|
| memory/impact/CR-503_IMPACT_ANALYSIS.md | Pay Later = Hold (not TAB); pop-up on Hold + Credit rows; no rights check for now; CR-515 no longer blocks; OD-503-06 open |
| memory/impact/CR-528_IMPACT_ANALYSIS.md | Now fully BACKEND-BLOCKED (bill print not recorded); OD-528-A/B/C/D locked; no proxy |
| memory/impact/CR-524_IMPACT_ANALYSIS.md | Split-line on partial cancel, mixed IST/UTC timezones, per-item punch time for order cancels |
| memory/impact/BATCH-C_IMPACT_ANALYSIS_SUMMARY_2026_11_15.md | Status = GATE 2 PAUSED, NOT FROZEN; round 2 + 3 notes; revised sequencing |
| memory/backend_briefs/BACKEND_BRIEF_BATCH-C_2026_11_15.md | Updated ASK 1 + ASK 2 (log every bill print incl. reprints, fix order_edit amounts, log order cancel); proxy struck out. Still DRAFT — send only after IA freeze |

## NOT changed
registry.json, CR_REGISTRY.md, FILE_OWNERSHIP.md, all frontend/backend code.

## Merge steps for agent
1. Unzip at repo root (paths start with `memory/`). For EDITED files the zip version is the latest; overwrite.
2. If the target repo changed these 5 edited files after 2026-11-15, keep both: take the target version and re-append the "REVISION 2026-11-15" sections / header notes from the zip.
3. Registry: optionally set CR-510 note → "NEEDS VERIFY (BUG-601 is menu-save, not orders)" and Batch C IA → "GATE 2 PAUSED". No status advance.
4. Do not send the backend brief until the owner freezes the IA.

## Open before freeze
OD-503-06 (Credit Collect meaning — owner screenshots), Hold status code (owner order), CR-505 no-filter breakdown check, CR-510 aggregator order, backend replies for CR-524 / CR-528. Next-probe data list is in ROUND3 doc.
