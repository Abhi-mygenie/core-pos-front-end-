# Handover: POS 4.0 Sprint Gap Audit & Backfill

> **For:** Specialized Gap Audit Agent (CLOSURE role — Role 11 per AGENT_PROMPT_ALPHA v0.4)
> **From:** Implementation Agent (E1), 2026-06-13
> **Priority:** P0 — sprint cannot freeze until this is done
> **Estimated effort:** 1-2 sessions

---

## 1. SITUATION

POS 4.0 is the active sprint for the MyGenie POS frontend. Over the past 2 weeks (June 1-13), multiple agent sessions implemented features and fixes. However, **agents consistently skipped the documentation and registration process** defined in the project's control layer. The result:

- Items are scattered across markdown docs but not in `registry.json` (the canonical machine-readable registry)
- Some items have intake docs but no implementation plans
- Some items were implemented but never had formal QA reports
- No agent created Session Start files (Artifact #0)
- FILE_OWNERSHIP.md was not updated despite ~30 files being changed
- OPEN_GAPS_REGISTER.md was not checked or maintained
- The Smoke Batch doc from June 11 doesn't include the 10 items implemented on June 12-13

**This same problem happened in POS 3.0** and required a painful multi-session backfill. The owner wants to break this cycle.

---

## 2. YOUR JOB

You are a **CLOSURE agent** (Role 11 per `/app/memory/control/AGENT_PROMPT_ALPHA.md`). Your job is:

### Phase A: Gap Audit (read-only, no changes)

Produce a gap matrix covering every item in POS 4.0. For each item, check:

| Artifact | Check | Where to look |
|----------|-------|---------------|
| Registration | Is it in `registry.json`? | `/app/memory/control/registry.json` |
| Intake doc | Does an intake doc exist? | `/app/memory/change_requests/<ID>_*.md` |
| Impact Analysis | Does an impact analysis exist? | `/app/memory/<ID>_*IMPACT*.md` or within phase docs |
| Implementation Plan | Does a plan doc exist? | `/app/memory/<ID>_*PLAN*.md` or `PHASE_*_PLAN*.md` |
| Code implemented | Is the status IMPLEMENTED in CR_REGISTRY/BUG_TRACKER? | `/app/memory/control/CR_REGISTRY.md` + `BUG_TRACKER.md` |
| QA Report | Does a QA report exist for this item? | `/app/memory/test_reports/` or QA handover docs |
| Owner Smoke | Has owner verified this item? | Smoke Batch docs or CR_REGISTRY status |

Output: `POS4_0_GAP_AUDIT_2026_06_13.md` — a single table showing every item × every artifact → EXISTS / MISSING / NOT APPLICABLE.

### Phase B: Backfill Critical Gaps (with owner approval)

After the audit, present the gap matrix to the owner. Owner decides per gap:
- **BACKFILL** — create the missing artifact now
- **SKIP** — document as "skipped, reason: X" (e.g., item was trivial, artifact adds no value)
- **DEFER** — carry to next sprint

Then execute the owner's decisions. Typical backfill actions:
- Add missing items to `registry.json`
- Create lightweight intake stubs for items that went straight to code
- Update FILE_OWNERSHIP.md with all files changed this sprint
- Update OPEN_GAPS_REGISTER.md (close resolved gaps, add new ones)
- Add the 10 new items (CR-037→CR-045 + BUG-131→BUG-133) to a Smoke Batch doc for owner testing
- Sync CR_REGISTRY.md ↔ registry.json (markdown = human-readable, JSON = machine-readable, both must agree)

### Phase C: Build Sprint Health Check Script

Create a script at `/app/scripts/sprint_health_check.py` that any agent can run to check sprint health:

```bash
python3 /app/scripts/sprint_health_check.py
```

The script should:
1. Read `registry.json` → list all items in current sprint
2. For each item, check if expected artifacts exist on disk (intake doc, plan, QA report)
3. Compare `registry.json` vs `CR_REGISTRY.md` for mismatches
4. Check `FILE_OWNERSHIP.md` vs actual git changes (files changed but not listed)
5. Count Session Start files this sprint
6. Output a clear pass/fail health report

This is the **prevention mechanism** — future agents run this at session start/end to catch drift early.

---

## 3. WHAT TO READ FIRST

Read these in order:

| # | Document | Why |
|---|----------|-----|
| 1 | `/app/memory/control/AGENT_PROMPT_ALPHA.md` | **Start at Step 0, pick Role 11 (CLOSURE).** This is the project's agent playbook — 12 roles, 16 rules, full process. You need to understand what SHOULD have been followed to know what was skipped. |
| 2 | `/app/memory/control/CONTROL_DASHBOARD.md` | Current project state, deployment info, all active sprints |
| 3 | `/app/memory/control/CR_REGISTRY.md` | Every CR registered. POS 4.0 items are at the bottom (CR-029 onwards). Check statuses. |
| 4 | `/app/memory/control/BUG_TRACKER.md` | Every bug tracked. POS 4.0 bugs: BUG-125 onwards. |
| 5 | `/app/memory/control/registry.json` | Machine-readable registry. Compare against CR_REGISTRY.md for mismatches. |
| 6 | `/app/memory/control/FILE_OWNERSHIP.md` | Last updated unknown. Needs refresh with all files changed this sprint. |
| 7 | `/app/memory/control/OPEN_GAPS_REGISTER.md` | May have stale entries. Needs review. |
| 8 | `/app/memory/handover/SESSION_HANDOVER_2026_06_13_IMPLEMENTATION.md` | Most recent session — 10 items implemented, complete file change map |
| 9 | `/app/memory/handover/QA_HANDOVER_2026_06_13_IMPLEMENTATION_SESSION.md` | QA handover for those 10 items — 70+ test cases, not yet executed |
| 10 | `/app/memory/handover/SESSION_HANDOVER_2026_06_12_PLANNING.md` | Planning session — 11 items registered, zero code |
| 11 | `/app/memory/control/POS4_0_BASELINE_CONSOLIDATION_REPORT_2026_06_11.md` | Pre-freeze consolidation from June 11 |
| 12 | `/app/memory/control/POS4_0_OWNER_SMOKE_BATCH_2026_06_11.md` | Smoke batch from June 11 — does NOT include June 12-13 items |

---

## 4. KNOWN PROBLEM AREAS

Based on my knowledge of this sprint, here are the likely gaps:

### Items likely missing from registry.json
- CR-037 through CR-045 (registered in markdown June 12, may not be in JSON)
- BUG-130 through BUG-133 (registered in markdown June 12, may not be in JSON)

### Items with partial artifacts
| Item | Has Intake | Has Impact | Has Plan | Has Code | Has QA | Has Smoke |
|------|-----------|-----------|---------|---------|--------|----------|
| CR-029 through CR-036 | Varies | Varies | Varies | Yes | Varies | Pending (S-1 to S-9 batch) |
| CR-037 | ✅ | In Phase 2 doc | ✅ Phase 2 | ✅ | ❌ Pending | ❌ |
| CR-038 | ✅ | In Phase 2 doc | ✅ Phase 2 | ✅ | ❌ Pending | ❌ |
| CR-039 | ✅ | In Phase 3 doc | ✅ Phase 3 | ✅ | ❌ Pending | ❌ |
| CR-040 | ✅ | In Phase 1 doc | ✅ Phase 1 | ✅ | ❌ Pending | ❌ |
| CR-041 | ✅ | In Phase 1 doc | ✅ Phase 1 | Investigation only | N/A | N/A |
| CR-042 | ✅ | In Phase 1 doc | ✅ Phase 1 | ✅ | ❌ Pending | ❌ |
| CR-043 | ✅ (brief) | ❌ | ❌ | ❌ | ❌ | ❌ |
| CR-044 | ✅ | ✅ Phase 5 | ✅ Phase 5 | ✅ | ❌ Pending | ❌ |
| CR-045 | ✅ | ✅ Phase 5 | ✅ Phase 5 | ✅ | ❌ Pending | ❌ |
| BUG-130 | ✅ | ✅ Phase 4 | ❌ | ❌ Not started | ❌ | ❌ |
| BUG-131 | ✅ | In Phase 1 doc | ✅ Phase 1 | ✅ | ❌ Pending | ❌ |
| BUG-132 | ✅ | ✅ Dedicated doc | ✅ Dedicated doc | ✅ | ❌ Pending | ❌ |
| BUG-133 | ✅ | ✅ Phase 4 | ✅ Dedicated doc | ✅ | ❌ Pending | ❌ |

### Docs that need updating
- `FILE_OWNERSHIP.md` — ~30 files changed this sprint, not reflected
- `OPEN_GAPS_REGISTER.md` — not reviewed this sprint
- `SPRINT_STATUS.md` — may be stale
- Smoke Batch — needs new batch for June 12-13 items (10 items)
- `BASELINE_INDEX.md` — may need update if baseline shifted

### Session Start files
- **Zero exist for POS 4.0.** Every session skipped Artifact #0.
- Decision for owner: backfill retroactively (low value) or just document as "skipped for all POS 4.0 sessions" and enforce from next sprint.

---

## 5. WHAT SUCCESS LOOKS LIKE

When you're done:

1. **Gap Audit doc exists** — single table, every POS 4.0 item × every artifact, clear status
2. **registry.json is in sync** with CR_REGISTRY.md and BUG_TRACKER.md
3. **FILE_OWNERSHIP.md updated** — all ~30 files changed this sprint listed
4. **OPEN_GAPS_REGISTER.md reviewed** — stale entries closed, new gaps from this sprint added
5. **Smoke Batch updated** — June 12-13 items (10 implemented) added to owner smoke queue
6. **Sprint Health Check script exists** — `python3 /app/scripts/sprint_health_check.py` runs and produces useful output
7. **CONTROL_DASHBOARD.md updated** — reflects current sprint state post-audit
8. **Owner has a clear answer:** "Here's what's missing. Here's what I recommend backfilling vs skipping. Here's the prevention script."

---

## 6. WHAT NOT TO DO

- Do NOT implement features or fix bugs — you are CLOSURE role only
- Do NOT modify any source code in `/app/frontend/src/`
- Do NOT re-run QA tests — that's the QA agent's job
- Do NOT create Session Start files retroactively unless owner explicitly asks (low value)
- Do NOT spend time on items from previous sprints (POS 3.0, POS 3.1, CRM 2.0) — those are already closed
- Do NOT modify frozen baseline docs (`/app/memory/final/*`)

---

## 7. TEST CREDENTIALS (if you need to verify items on preprod)

| Restaurant | Email | Password |
|-----------|-------|----------|
| Welcome Resort | owner@welcomeresort.com | Qplazm@10 |
| Palm House | owner@palmhouse.com | Qplazm@10 |

Login: `POST https://preprod.mygenie.online/api/v1/auth/vendoremployee/login`

---

*Handover for Gap Audit Agent — 2026-06-13*
