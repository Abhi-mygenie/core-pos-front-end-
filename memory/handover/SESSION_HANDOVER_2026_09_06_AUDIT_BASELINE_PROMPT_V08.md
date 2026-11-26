# SESSION HANDOVER — 2026-09-06 — AUDIT: Project Baseline + Agent Prompt v0.8 Gap Analysis

**Track:** AUDIT (separate from PMS delivery track — see `SESSION_HANDOVER_2026_09_06_PMS_TRACK.md`)
**Role(s) this session:** INVESTIGATION / PRE-RELEASE AUDIT (read-only) → gap analysis (docs only)
**Code changes:** NONE in `frontend/src`. Only `/app/memory/**` written.
**Owner instruction for next session:** *"We will start with the audit work in the next session."*

---

## 1. Why this track exists (owner's two requirements)

1. **Consolidate the project baseline** after ~6 months / multiple sprints: surface security gaps, architecture issues, incomplete areas, inconsistencies — reconciled against code (R1), not against what docs claim.
2. **Review and harden the agent prompt** (`AGENT_PROMPT_ALPHA.md` v0.7). Known weaknesses named by owner: (a) agent slides from investigation into fixing without a clear transition; (b) agent keeps going when required files/info are missing; (c) regression testing is not built into the workflow. Goal: more structured, controlled, agentic behaviour per stage.

Owner choices captured this session:
- Baseline scope = frontend code + control layer **+ live preprod API probes** (read-only).
- Prompt revision = **new file `AGENT_PROMPT_ALPHA_v0.8.md`**, keep v0.7 untouched.
- **Gap analysis first → owner approval → then write v0.8.** (Approval NOT yet given — see §5.)
- Testing tools allowed for the audit (used: Jest full run, curl probes). No testing_agent needed for doc work.
- `PMS1` is the latest branch with full history; pod is a working copy → F-ARCH-01 downgraded S1→S3 (process rule, not blocker).

---

## 2. What was done

### 2.1 Evidence sweep (all persisted under `memory/evidence/BASELINE-2026-09/`)
| Probe | Result | File |
|---|---|---|
| Live API probe, 21 endpoints, owner account, read-only | 12/14 `v1` routes still live; only order-family moved to `v2`; 4 routes 403 (permission-scoped); Laravel debug traces leak on 404 | `api_probe_v1_v2_2026_09_06.md` |
| Full Jest run | **Hangs at 45/48 suites** — 3 CR-358 "tests" are plain-Node scripts calling `process.exit()` | `jest_full_run.log` |
| Jest run excluding those 3 | **591 pass / 56 fail / 647 · 15 failing suites** | `jest_run_excl_node_scripts.log` |
| Registry analysis (618 items) | 241 CLOSED · 221 QA-PASS-awaiting-smoke · 70 IMPLEMENTED-no-QA · 45 INTAKE; 4 spellings of `type`; 497 null `category` | `registry_open_items.json` |
| Code-marker reconciliation | 89 CLOSED/IMPLEMENTED items have **no** `// CR-xxx`/`// BUG-xxx` marker in `src/` | `items_without_code_markers.txt` |
| Secrets / hosts / eval / innerHTML scan | clean | (inline in baseline) |
| Route guard scan | 112 routes; 22 unauthenticated preview/compare routes (mock-only today) | baseline F-SEC-03 |
| Handover behaviour review (66 handovers, 13 QA reports) | role-bleed, self-QA, unregistered fix, partial registry sync, over-generalised INV finding | baseline §7 |

### 2.2 Deliverables written
| Deliverable | Path | Status |
|---|---|---|
| **Consolidated Project Baseline** (10 sections, 35 findings with IDs/severity/evidence) | `control/PROJECT_BASELINE_2026_09.md` | DONE (F-ARCH-01 downgraded per owner) |
| **Agent Prompt Gap Analysis v0.7→v0.8** (10 gaps, proposed v0.8 structure, 6 owner decisions) | `control/AGENT_PROMPT_GAP_ANALYSIS_v0.8.md` | DONE — **awaiting owner approval** |
| Evidence folder | `evidence/BASELINE-2026-09/` | DONE |

### 2.3 Headline findings (plain English)
- **Security (S1):** internal control dashboard `frontend/public/__dev/` (client-side SHA-256 "auth", bypassable) + 71 internal HTML briefs (8.7 MB) are served from the production origin. 22 preview routes have no `ProtectedRoute`. Preprod backend runs with debug traces on.
- **Quality (S1):** "QA passed" is not trustworthy today — 3 fake tests hang the runner, 56 real failures accumulated since June because QA only ever ran per-item tests. 221 items never had owner smoke.
- **Architecture (S2):** 4 god files >2 000 lines hold the money logic; money rounding scattered over 78 files; 20+ business settings in localStorage; 16 `.bak` files in `src/`.
- **Drift:** 89 closed items without code markers; `ENV_REGISTRY.md` (credential truth) does not exist; `test_credentials.md` empty; SPRINT_STATUS 3 months stale; Sep-6 INV claim "v1 defunct" is wrong (needs correction in INV report + OG-PMS-016); handoff "Issue 1 CRM keys truncated" is obsolete (var is valid JSON and unused).

---

## 3. Corrections owed to existing records (not yet applied — do in next session)
| Record | Correction |
|---|---|
| `INV_CR363_CR364_CR366_API_IMPACT_ANALYSIS.md` "Critical Change" para + `OPEN_GAPS_REGISTER.md` OG-PMS-016 | Reword: only order-family endpoints moved to v2; 12/14 probed v1 routes live; 403s are permission-scoped |
| `PRD.md` Open Issues | Remove "CRM API Keys truncated (P0)" — obsolete; add F-SEC-01/02, F-QA-01/02 |
| `CONTROL_DASHBOARD.md` | Add line: "Source of truth: `PMS1`. Pod = working copy; sync via Save to GitHub after each coding session." |
| `control/ENV_REGISTRY.md` | Create (key names + purpose only, no values) |
| `/app/memory/test_credentials.md` | Populate alias→account (values never written) |

---

## 4. Blockers
| Blocker | Type | Owner |
|---|---|---|
| v0.8 prompt cannot be written until owner answers approval questions (§5) | Decision | Owner |
| Backend debug mode / `room-payment` 403 | Backend brief needed (not written yet) | Owner → backend team |
| Bulk decision on 221 "awaiting smoke" items | Decision | Owner |

No technical blockers. No code is broken by this track.

---

## 5. NEXT SESSION — exact start (AUDIT track)

**Step 0 — Boot:** read this handover, `control/PROJECT_BASELINE_2026_09.md`, `control/AGENT_PROMPT_GAP_ANALYSIS_v0.8.md`. Declare role. Do NOT touch `frontend/src` until owner says which remediation item to start.

**Step 1 — Get the 5 approvals (owner has not answered yet):**
1. Approve 10-gap list as-is, or drop/add gaps?
2. **D1** Self-QA: (a) hard-forbid same-session IMPLEMENT→QA · (b) allow for LOW-risk only
3. **D2** Gate 5c Regression applies to: (a) every item · (b) risk ≥ MEDIUM or hotspot files only *(recommended)*
4. **D3** Known-failure allow-list: (a) start with today's 56 failures + retire-by dates · (b) triage to green first
5. **D4** Registry updates: (a) script-only (`sync_registry.py`, separate CR) · (b) manual + Exit-Gate diff check
(D5 transition token wording, D6 adopt baseline §9 as sprint queue — optional.)
Agent-recommended defaults if owner says "use defaults": D1 a · D2 b · D3 a · D4 b.

**Step 2 — Write `control/AGENT_PROMPT_ALPHA_v0.8.md`** per gap-analysis §3 structure (additive; v0.7 untouched; ~+350 lines): Mode State Machine + transition tokens + scope lock; Boot Preflight + Missing-Input Protocol (HALT / ASK / ASSUME-AND-FLAG); Gate 5c Regression + `REGRESSION_BASELINE.md`; confidence labels; machine-evidence QA; R26 production surface; R27 canonical enums; universal footer; changelog. Then owner review.

**Step 3 — Apply record corrections (§3 above).**

**Step 4 — Baseline remediation, in this order (each as its own registered item via INTAKE → gates; owner picks start):**
1. F-QA-01 + F-QA-02: convert 3 node scripts to real Jest tests; triage 56 failures (stale→retire with marker, real→BUG intake); commit `eslint.config.js` (F-QA-03) → establishes the regression baseline.
2. F-SEC-01 + F-SEC-02: move `public/__dev/` and 71 HTML briefs out of `public/`; F-SEC-03 guard 22 preview routes.
3. F-SEC-07: remove `REACT_APP_CRM_API_KEYS` + `CORS_ORIGINS` from `frontend/.env`.
4. Backend brief (owner sends): `APP_DEBUG=false` on preprod (F-SEC-05); `pos/room-payment` 403 ruling (OG-PMS-014).
5. Owner decision: 221 awaiting-smoke items — bulk retroactive closure (Closure Phase B) or scheduled smoke.
6. Backlog: F-ARCH-03/04/05 refactors, F-DRIFT-01/02 registry hygiene, `.bak` purge (F-ARCH-06), Node 22 (F-QA-05).

---

## 6. Rules observed / lessons for the prompt
- Read-only audit stayed read-only (no code, no registry status changes). ✔
- Evidence saved to persistent path, secrets masked, credentials never printed. ✔
- Investigation over-generalisation from Sep 6 ("v1 defunct") was caught by a wider sample this session → supports GAP-02 (confidence labels + sample statement).
- Trailing slash in `REACT_APP_API_BASE_URL` produces `//api/...` → false 404s in curl probes. Strip it: `sed 's#/$##'`. Token TTL ≈15 min — re-login before long probe batches.

## 7. Self-assessment
Scope drift: NONE (two deliverables + gap analysis only; v0.8 correctly withheld pending approval). Stale docs flagged: 7 (F-DRIFT-01…07). Rating: 4/5 — one avoidable detour (double-slash 404s) before probes were valid.
