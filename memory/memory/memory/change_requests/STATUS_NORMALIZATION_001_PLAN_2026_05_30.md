# STATUS-NORMALIZATION-001 — Implementation Plan

**Document:** `STATUS_NORMALIZATION_001_PLAN_2026_05_30.md`
**Date:** 2026-05-30
**Stage:** Stage 5 — Plan (awaiting owner GO at Gate G-1)
**Trigger:** Owner spotted 5 overlapping "CLOSED" status flavours in Bug Tracker dropdown (screenshot 2026-05-30 02:22).
**Predecessor:** AUDIT-CLOSURE-DRIFT-001 (delivered same day; G-2 still open)
**Type:** Data-normalization CR — no UI code change, no schema change.

---

## 1. Problem Statement

After AUDIT-CLOSURE-DRIFT-001 reconciliation, the Bug Tracker tab's Status filter dropdown contains **5 overlapping CLOSED variants**:

1. `CLOSED` (bare — legacy)
2. `CLOSED — IMPLEMENTED`
3. `CLOSED — NO CODE NEEDED`
4. `CLOSED — SMOKE SIGNOFF EXISTS`
5. `CLOSED — SMOKE VERIFIED`
6. `CLOSED — VERIFIED`

They came from 4 different source documents using different vocabularies (old BUG_TEMPLATE.md, POS 2.0 final summary, pos_final_1.0 consolidation report, original control-layer BUG_TRACKER.md). Two are functional duplicates (`SMOKE SIGNOFF EXISTS` vs `SMOKE VERIFIED`).

**This creates noise.** Owner can't tell at a glance whether a "CLOSED — VERIFIED" item is more or less verified than a "CLOSED — IMPLEMENTED" one without cross-checking the artifact dots.

---

## 2. Frozen Owner Decisions

| # | Decision |
|---|---|
| D1 | Normalize to **3 canonical CLOSED statuses** (not 5) |
| D2 | Mapping rule is **rulebook-aligned** — based on actual artifact-completeness, not the wording of the source doc |
| D3 | Data-only change — no dashboard UI/code change |
| D4 | Closure Debt tab continues to surface fine-grained 6-artifact gaps — that's where users go for the detailed view |
| D5 | Bare `CLOSED` is eliminated — every item must map to one of the 3 canonical statuses |

---

## 3. Target Vocabulary — 3 Statuses

| Final status | Rulebook definition | Visual pill |
|---|---|---|
| **`CLOSED — OWNER VERIFIED`** | Owner smoke sign-off **doc exists on disk** (artifact #6 confirmed PRESENT). Strongest closure claim. | Green `status-CLOSED` |
| **`CLOSED — IMPLEMENTED`** | Code shipped + listed in a canonical sprint summary doc, **but no smoke sign-off doc found**. Closure Debt tab will show 5/6 missing artifact. | Green `status-CLOSED` |
| **`CLOSED — NO CODE NEEDED`** | Investigation outcome: bug doesn't require code change (e.g. already handled by backend, works-as-designed, out-of-scope). Owner-declared resolution. | Green `status-CLOSED` |

All 3 share the same green pill colour (they're all closed) — the suffix is the precision indicator.

---

## 4. Mapping Rules (deterministic)

For each item in `bug_tracker.json` and `cr_registry.json`:

```
IF status === "CLOSED — NO CODE NEEDED"                        → keep as-is
ELIF artifact_refs[] contains {type: "smoke_signoff"}          → "CLOSED — OWNER VERIFIED"
ELIF status matches /^CLOSED/i AND ≥1 artifact_refs[] present  → "CLOSED — IMPLEMENTED"
ELIF status matches /^CLOSED/i AND no artifact_refs[]          → "CLOSED — IMPLEMENTED" (with note in Closure Debt)
ELSE                                                            → leave unchanged (not a CLOSED variant)
```

**Why this works:**
- Single source of truth = presence of a smoke_signoff artifact_ref. No subjective judgement.
- Anything that was "CLOSED — VERIFIED" / "CLOSED — SMOKE VERIFIED" / "CLOSED — SMOKE SIGNOFF EXISTS" gets re-checked against the actual artifact_refs array — items that have a real signoff doc → OWNER VERIFIED; items that don't → IMPLEMENTED.
- Bare `CLOSED` → falls into IMPLEMENTED (the safest claim short of OWNER VERIFIED).

---

## 5. Files in scope

### WILL change (data only)
- `/app/frontend/public/__dev/data/bug_tracker.json` — normalize all status strings
- `/app/frontend/public/__dev/data/cr_registry.json` — same
- `/app/frontend/public/__dev/data/closure_debt.json` — `registry_status` field also gets normalized for consistency
- `/app/frontend/public/__dev/README.md` — add a small "Status vocabulary" section
- New: `/app/memory/memory/change_requests/STATUS_NORMALIZATION_001_PLAN_2026_05_30.md` (this plan)
- New: `/app/memory/memory/STATUS_NORMALIZATION_001_OWNER_SMOKE_SIGNOFF_2026_05_30.md` (after G-2)

### Will NOT touch
- `/app/frontend/public/__dev/dashboard.js` — **zero code change** (the existing `StatusPill` regex `/CLOSED|SHIPPED|VERIFIED|IMPLEMENTED/` already covers all 3 target statuses; rendering works as-is)
- `/app/frontend/public/__dev/styles.css` — unchanged
- `/app/memory/control/BUG_TRACKER.md` — keeps its own wording (already reconciled in the previous CR; doesn't need to be schema-aligned with dashboard since it's human-readable)
- `/app/memory/memory/BUG_TEMPLATE.md` — frozen archive (per AUDIT-CLOSURE-DRIFT-001 banner)
- `/app/frontend/src/**` — zero touch
- All other control-layer docs

---

## 6. Audit — What gets remapped

Per current dashboard data:

| Source status | Count | Remaps to |
|---|---|---|
| `CLOSED — IMPLEMENTED` | ~36 | Most → `CLOSED — IMPLEMENTED`. A few with smoke signoff in artifact_refs → `CLOSED — OWNER VERIFIED` |
| `CLOSED — SMOKE SIGNOFF EXISTS` | ~10 | `CLOSED — OWNER VERIFIED` (these were tagged because signoff doc was found) |
| `CLOSED — SMOKE VERIFIED` | ~6 | Check artifact_refs: with signoff doc → `CLOSED — OWNER VERIFIED`; without → `CLOSED — IMPLEMENTED` |
| `CLOSED — VERIFIED` | ~12 | Check artifact_refs: with signoff doc → `CLOSED — OWNER VERIFIED`; without → `CLOSED — IMPLEMENTED` |
| `CLOSED — NO CODE NEEDED` | 2 | Keep as-is |
| Bare `CLOSED` | ~3 | `CLOSED — IMPLEMENTED` (safest default) |
| **Total CLOSED items affected** | **~69** | → ~25 OWNER VERIFIED + ~42 IMPLEMENTED + 2 NO CODE NEEDED |

Phase B will produce the exact audit table before writes.

---

## 7. Acceptance Criteria

| AC | Description |
|---|---|
| AC-N1 | Bug Tracker Status dropdown shows **exactly 3 CLOSED variants** (no bare CLOSED, no SMOKE SIGNOFF EXISTS, no SMOKE VERIFIED) |
| AC-N2 | CR Registry Status dropdown shows the same 3 CLOSED variants |
| AC-N3 | "Hide closed" checkbox still filters all 3 CLOSED variants correctly (existing regex matches all of them) |
| AC-N4 | Group-by Status shows clean groups: CLOSED — OWNER VERIFIED · CLOSED — IMPLEMENTED · CLOSED — NO CODE NEEDED |
| AC-N5 | Every item previously tagged with any CLOSED variant is now tagged with exactly one of the 3 canonical statuses |
| AC-N6 | Items with `artifact_refs` containing a `smoke_signoff` entry map to `CLOSED — OWNER VERIFIED` |
| AC-N7 | Closure Debt items' `registry_status` field updated to use canonical vocabulary |
| AC-N8 | Status pill colour unchanged (green) for all 3 variants |

### AC-REG-* (Regression)
| AC | Description |
|---|---|
| AC-REG-1 | `git status` shows zero touch to `/app/frontend/src/**`, `dashboard.js`, `styles.css`, `package.json` |
| AC-REG-2 | All v1.0/v1.1/v1.2 features still work (filter / search / group / cross-ref / expand / hide-closed) |
| AC-REG-3 | Main app `/` HTTP 200 unchanged |
| AC-REG-4 | "Hide closed" toggle in Bug Tracker still hides ~91 of 118 entries and in CR Registry still hides ~27 of 54 |
| AC-REG-5 | Total bug count (118) and CR count (54) unchanged — this is pure relabelling, not adding/removing rows |

---

## 8. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Item incorrectly downgraded from OWNER VERIFIED to IMPLEMENTED | M | L | Mapping rule is deterministic — only items WITH smoke_signoff artifact_ref get OWNER VERIFIED |
| Item incorrectly upgraded to OWNER VERIFIED | L | M | Rule requires smoke_signoff doc on disk — false positives only possible if Phase A heuristic was wrong (low probability) |
| Closure Debt tab shows mismatch between `registry_status` and the 6 artifact dots | L | L | We update both consistently |
| "CLOSED — VERIFIED" (current label for POS 3.0 items like BUG-087) downgrades to "IMPLEMENTED" | H | L | This is correct behaviour per rulebook — BUG-087 has 0 artifact docs per our audit; calling it OWNER VERIFIED was the inflated claim |
| Status enum change breaks third-party scripts or exports | L | L | Existing CSV export will reflect new vocabulary; no downstream consumers exist |
| Existing screenshots / handover docs reference old status strings | M | L | Acceptable — the historical record stays as written; new exports use new vocabulary |

**Overall: LOW.** Data-only change, deterministic mapping, no code touch.

---

## 9. Gate Ladder

```
Gate G-1 — APPROVE THIS PLAN                            [PENDING owner approval]

Phase B — Execute mapping (script)                      [HOLD until G-1]
Phase C — Refresh 3 JSON snapshots                      [HOLD until G-1]
Phase D — Verify dashboard renders cleanly              [HOLD until G-1]
Phase E — Audit table output for review                 [HOLD until G-1]

Gate G-2 — Owner smoke test on /__dev/                  [HOLD until Phase D done]
Gate G-3 — Close-out                                    [HOLD until G-2 PASS]
```

Owner can also collapse G-1 and G-2 with "approve all" if desired.

---

## 10. Estimated Effort

| Step | Time |
|---|---|
| Owner review of this plan | owner-dependent |
| Phase B — write mapping script + run | 8 min |
| Phase C — refresh JSON files | 2 min |
| Phase D — screenshot validation + audit table | 5 min |
| Phase E — produce before/after diff doc | 5 min |
| **Total agent time** | **~20 min** |

---

## 11. Confirmations

| # | Item | Status |
|---|---|---|
| 1 | Data-only — no dashboard.js / src/ touch | CONFIRMED |
| 2 | Mapping rule is deterministic (no LLM judgement per item) | CONFIRMED |
| 3 | Zero schema change — only string values are normalized | CONFIRMED |
| 4 | Rulebook (AGENT_PROMPT_ALPHA.md R1–R16) honoured | CONFIRMED |
| 5 | Existing `StatusPill` rendering already handles all 3 target statuses without modification | CONFIRMED |
| 6 | "Hide closed" checkbox regex `/CLOSED|SHIPPED|...//` already matches all 3 target statuses | CONFIRMED |

---

## 12. Open Questions for Owner

None — mapping rule is deterministic. If owner wants finer detail (e.g. preserve `CLOSED — NO CODE NEEDED` vs introduce `CLOSED — WORKS AS DESIGNED`), call it out at G-1 before Phase B runs.

---

**Stage 5 complete. Awaiting owner GO at Gate G-1.**
