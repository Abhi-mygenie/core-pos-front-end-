# Batch A planning — safe merge steps (read before unzipping)

Base = GitHub `main` commit 9b1fc198 (2026-11-14), the version synced after IA.
8 files were edited after that base. Your branch may have edited the same files. Do NOT overwrite blindly.

## Contents
- `BATCH-A_PLANNING_CHANGES.patch` — exact line changes to the 8 edited files (base → new), 29 hunks.
- `BASE_MD5_main_9b1fc198.txt` — checksums of those 8 files at the base.
- `memory/...` — full new versions (8 edited + 3 new files: design mockups, 2 handovers).

## Steps
1. Commit or stash your work. Back up `memory/`.
2. Check whether you touched the 8 files since base:
   `md5sum -c BASE_MD5_main_9b1fc198.txt` (run at repo root)
   - **OK** for a file → you did not change it → safe to take the zip version.
   - **FAILED** → you changed it → do NOT overwrite; go to step 3 for that file.
3. Apply the patch (merges line changes, keeps yours):
   `git apply --3way -p1 BATCH-A_PLANNING_CHANGES.patch`
   (or check first: `git apply --check -p1 BATCH-A_PLANNING_CHANGES.patch`)
   If a hunk conflicts, resolve by hand: keep BOTH your lines and the patch lines unless they state different facts — then ask the owner.
4. Copy the 3 NEW files from the zip (no conflict possible):
   `memory/design/BATCH-A_GATE2_5_MOCKUPS_2026_11_14.html`,
   `memory/handover/SESSION_HANDOVER_2026_11_14_BATCH_A_GATE2_CLOSED.md`,
   `memory/handover/SESSION_HANDOVER_2026_11_14_BATCH_A_GATE3_PLANNING.md`.
5. Validate: `python3 -m json.tool memory/control/registry.json > /dev/null` must pass.
6. Delete the nested duplicate `memory/evidence/BATCH-A-IA/BATCH-A-IA/` (holds UNMASKED phone/email; masked copy is `evidence/BATCH-A-IA/probes_2026_11_14/`).
7. Report to owner: which files were clean, which were merged, any conflicts and how resolved.

## What the 8 edits contain (so you can judge conflicts)
- IA summary: Rounds 5–12 + priorities + Gate 2 close banner + Gate 2.5 entry; stale "not yet asked" list replaced.
- Owner decisions: Round 5–12 sections, Gate 2.5 section (M1–M10 approved, M5 comp reason required, M9 sidebar Notifications link).
- CR-445 / CR-372-B IA: closed banner + priority at top.
- CR_REGISTRY.md: Batch A table at top (13 items, GATE_2_IA_CLOSED) + row status/priority updates.
- registry.json: 13 Batch A statuses → GATE_2_IA_CLOSED; priorities CR-372-B P0, CR-445 P1, CR-540 P1.
- Backend brief + tracker: BA-17/BA-18 (CR-445) marked P1.
