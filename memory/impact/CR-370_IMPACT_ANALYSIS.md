# CR-370 — Gate 2: Impact Analysis
## Stale Doc Corrections — 5 Records from Audit §3 (C1–C5)

**Doc:** `memory/impact/CR-370_IMPACT_ANALYSIS.md`
**Date:** 2026-09-08
**Role:** PLANNING (Gate 2 only — owner-selected; Gate 3 NOT written)
**Risk:** LOW | **Code Reality:** PARTIAL (C3/C4/C5 exist — with drift; C1 NONE; C2 PARTIAL) | **Conflict:** RELATED (CR-372-A on `.env` ↔ `ENV_REGISTRY.md`)
**Intake:** `change_requests/CR-370_STALE_DOC_CORRECTIONS_5_RECORDS_INTAKE.md`

---

## §0 — Code Reality Check (per correction)

Owner instruction: cover all 5 and re-verify C4/C5 contents (not only remaining scope).

| # | Target | Check run | Result | Reality |
|---|---|---|---|---|
| C1 | `INV_CR363_CR364_CR366_API_IMPACT_ANALYSIS.md` L21 | `grep -n "404"` | "All v1 order endpoints now return 404 … future investigations MUST use v2 URLs" still present | **NONE** |
| C1 | `control/OPEN_GAPS_REGISTER.md` L388 (OG-PMS-016) | `grep -n OG-PMS-016` | "All `/api/v1/vendoremployee/*` order endpoints … now return 404" still present | **NONE** |
| C2 | `PRD.md` L71-79 Open Issues | `sed -n 71,79p` | CRM-keys row struck through with "CLOSE" but **not removed**; F-SEC-01/02 + F-QA-01/02 present as 2 combined rows | **PARTIAL** |
| C3 | `control/CONTROL_DASHBOARD.md` L19 | `grep -n "Source of truth"` | Row **already exists**: "`pms8sep` branch. Pod = working copy; sync via Save to GitHub…" — intake text says `PMS1` | **FULL (wording drift)** |
| C4 | `control/ENV_REGISTRY.md` | `cat` vs `cut -d= -f1 frontend/.env` | 16/16 active keys registered, no values. **Drift:** "Removed / Deprecated" table dates `REACT_APP_CRM_API_KEYS` + `CORS_ORIGINS` as *removed 2026-09-08* — both **still present in `.env`** (CR-372-A not executed) | **FULL (drift)** |
| C5 | `test_credentials.md` | `cat` (masked) | 3 aliases populated. **Drift:** Login endpoint written as `/api/v1/vendor/login`; code `src/api/constants.js:8` = `/api/v1/auth/vendoremployee/login`. cafe103 written as `rid=103`; prompt alias table says RID 644 | **FULL (drift)** |

**Code Reality: PARTIAL.** C4/C5 were executed last session but contain 3 doc-vs-reality drifts (R1: code wins → flagged below). C3 is done under a different branch name than the intake specified.

---

## §1 — Conflict Pre-Check

| File | Other open item touching it | Conflict? |
|---|---|---|
| `INV_CR363_CR364_CR366_API_IMPACT_ANALYSIS.md` | CR-363 / CR-364 / CR-366 (INTAKE, read it as input) | **NONE** — reword only; endpoint matrix untouched |
| `control/OPEN_GAPS_REGISTER.md` | Many items append rows | **NONE** — edit is confined to OG-PMS-016 row text |
| `PRD.md` | Every session writes it | **NONE** — edit confined to Open Issues table |
| `control/CONTROL_DASHBOARD.md` | Every session writes header | **NONE** — no edit needed if OD-CR370-02 = keep `pms8sep` |
| `control/ENV_REGISTRY.md` | **CR-372-A** (removes 2 keys from `.env`) | **RELATED** — ENV_REGISTRY must describe `.env` truthfully at every point. Execution order: CR-370 marks the 2 keys *PENDING REMOVAL (CR-372-A)* → CR-372-A flips to *REMOVED <date>*. Parallel-safe as long as both agents follow that sequence. |
| `test_credentials.md` | None | **NONE** |

`FILE_OWNERSHIP.md`: none of these doc files are listed (it tracks `src/` only). No hotspot (R5) file involved.

---

## §2 — Risk: LOW (confirmed, no upgrade)

- Doc-only. Zero `frontend/src/`, `.env`, `public/`, registry-schema, or runtime change.
- Not financial, not auth logic (C5 records an alias table — it does not change how the app logs in).
- Fast Lane: **NOT eligible** — 6 files (limit 1).
- Downstream risk if left uncorrected: CR-369 v0.8 prompt would be generated from wrong facts (v1 "defunct", missing ENV keys, wrong login endpoint) → agents improvise credentials/endpoints. This is the reason CR-370 precedes CR-369.

---

## §3 — Data Flow Trace (doc lineage: evidence → record → consumer)

```
evidence/BASELINE-2026-09/api_probe_v1_v2_2026_09_06.md   (truth: 12/14 v1 live, 4×403, 3 order-family → v2)
  ├─ INV_CR363_CR364_CR366_API_IMPACT_ANALYSIS.md L21      → read by CR-363/364/366 planners      [C1]
  └─ control/OPEN_GAPS_REGISTER.md OG-PMS-016               → read by every PLANNING boot          [C1]

control/PROJECT_BASELINE_2026_09.md F-DRIFT-04/05/06
  └─ PRD.md Open Issues                                      → read by fork agents on boot          [C2]

Deployment (2026-09-08, branch pms8sep)
  └─ control/CONTROL_DASHBOARD.md Current Deployment         → read by ALL roles on boot            [C3]

frontend/.env (key names only)
  └─ control/ENV_REGISTRY.md                                 → v0.8 Boot Preflight, DEPLOYMENT role [C4]
       └─ RELATED: CR-372-A removes 2 keys → registry must lag, not lead, the .env

src/api/constants.js:8 LOGIN + owner alias note
  └─ test_credentials.md                                     → testing_agent, fork agents, QA       [C5]
```

**Break points found (doc ≠ reality):**
1. C1 — INV L21 + OG-PMS-016 overstate v1 deprecation (evidence says only order-family moved).
2. C4 — ENV_REGISTRY claims 2 keys removed; `.env` still has them.
3. C5 — Login endpoint path does not exist in code; cafe103 RID disagrees with prompt alias table.
4. C2 — PRD row says "71 HTML briefs" / "3 node-script tests"; current reality: 96 `.html` under `public/` (91 to move per CR-372-A), and `grep process.exit` finds **2** test files (CR-368 intake says 3).

---

## §4 — Affected Files & Proposed Edits (for Gate 3 — NOT executed here)

| # | File | Location | Current | Proposed | Risk |
|---|---|---|---|---|---|
| E1 | `INV_CR363_CR364_CR366_API_IMPACT_ANALYSIS.md` | L21 "Critical Change Since Sep 4" | "All v1 order endpoints now return 404 … MUST use v2 URLs" | "Order-family endpoints (`get-single-order-new`, `order-logs-report`, `pos/room-payment`) moved to `/api/v2/`; v1 is otherwise live (12/14 probed routes 200; 4 are 403 permission-scoped). Use v2 for order-family probes only. Corrected 2026-09-08 (CR-370 C1); evidence `evidence/BASELINE-2026-09/api_probe_v1_v2_2026_09_06.md`." | LOW |
| E2 | `control/OPEN_GAPS_REGISTER.md` | L388 OG-PMS-016 text | "All `/api/v1/vendoremployee/*` order endpoints … now return 404; `/api/v2/` is live" | Same correction as E1, keep P3/OPEN status; append "(reworded 2026-09-08, CR-370 C1)". Also bump header "Last Updated". | LOW |
| E3 | `PRD.md` | L74 CRM row | Struck-through row with "CLOSE" | **Remove row** (intake says remove). | LOW |
| E4 | `PRD.md` | L75-76 F-SEC / F-QA rows | "71 HTML briefs", "3 node-script tests" | Reference by CR: "`public/__dev` + internal HTML briefs served in prod (F-SEC-01/02 → CR-372-A)"; "Test suite untrustworthy: fake node-script tests + 56 failures (F-QA-01/02 → CR-368)". Counts deferred to owning CR (see OD-CR370-05). | LOW |
| E5 | `control/CONTROL_DASHBOARD.md` | L19 | Row exists with `pms8sep` | **No edit** if OD-CR370-02 = (a). If (b): replace `pms8sep` → `PMS1` on L16 + L19. | LOW |
| E6 | `control/ENV_REGISTRY.md` | Removed/Deprecated table | "Removed 2026-09-08 (CR-372-A F-SEC-07)" | "**PENDING REMOVAL** — CR-372-A (F-SEC-07). Still present in `.env` as of 2026-09-08." CR-372-A implementation flips to REMOVED. | LOW |
| E7 | `test_credentials.md` | Login Endpoint section | `POST …/api/v1/vendor/login` | `POST https://preprod.mygenie.online/api/v1/auth/vendoremployee/login` (source: `src/api/constants.js:8`). | LOW |
| E8 | `test_credentials.md` | cafe103 row | `rid=103` | Per OD-CR370-04 (owner confirms RID or agent removes the RID column value → "rid: unconfirmed"). | LOW |

**Files WILL change (Gate 3 scope lock candidate):** E1–E8 across 6 files:
`INV_CR363_CR364_CR366_API_IMPACT_ANALYSIS.md`, `control/OPEN_GAPS_REGISTER.md`, `PRD.md`, `control/ENV_REGISTRY.md`, `test_credentials.md`, `control/CONTROL_DASHBOARD.md` (conditional on OD-CR370-02).

**Files WILL NOT touch:** anything under `frontend/src/`, `frontend/public/`, `frontend/.env`, `frontend/craco.config.js`, `App.js`, `registry.json` schema, `control/PROJECT_BASELINE_2026_09.md`, `/app/memory/final/*` (R2), the INV endpoint matrix, CR-363/364/366 intakes.

**Downstream consumers of the corrected records:** CR-369 (v0.8 prompt — Boot Preflight reads ENV_REGISTRY + test_credentials), CR-372-A (owns the `.env` → ENV_REGISTRY flip), CR-368 (owns the true fake-test count), CR-363/364/366 planners (read INV + OG-PMS-016).

---

## §5 — Owner Decisions — ALL LOCKED 2026-09-08 (OD-02: pms8sep · OD-03: a · OD-04: i=code truth, ii=RID 644 · OD-05: a, actual counts · OD-06: a). Gate 3 plan: `plans/CR-370_IMPLEMENTATION_PLAN.md`

| OD | Question | Agent recommendation |
|---|---|---|
| **OD-CR370-02** | C3 source-of-truth branch: intake says `PMS1`; dashboard (and the 2026-09-08 deployment) say `pms8sep`. Which is canonical? | **(a) `pms8sep`** — it is what is deployed; C3 then = DONE, no edit. (b) `PMS1` → edit L16+L19. |
| **OD-CR370-03** | C4 ENV_REGISTRY marks 2 keys REMOVED though `.env` still has them. Reword to PENDING REMOVAL now (E6)? | **YES** — registry must never lead `.env`; CR-372-A flips it on execution. |
| **OD-CR370-04** | C5 test_credentials.md: (i) fix login path to code truth (E7)? (ii) cafe103 `rid=103` vs prompt alias table `cafe103_no_rooms_postpaid_gst = 644` — which RID? | (i) **YES**, code wins (R1). (ii) Owner to confirm RID; agent will not guess. |
| **OD-CR370-05** | C2 PRD counts: hard-code current numbers (96/91 HTML, 2 fake tests) or reference the owning CR (CR-372-A / CR-368) without counts? | **Reference by CR** — counts are owned by those CRs and already drifting (71→91, 3→2). |
| **OD-CR370-06** | C2 additionally: PRD "Upcoming Tasks" item 0 is stale (audit approvals are now done). Out of intake scope — leave as-is, or expand scope to update it? | **Leave** (R14 scope lock). Log as observation only. |

Resolved earlier: OD-CR370-01 (C5 aliases) — provided 2026-09-08.

---

## §6 — Verification Matrix (seed for Gate 3 / QA — all manual grep checks, doc-only)

| # | Check | Command | Expected |
|---|---|---|---|
| V1 | E1 applied | `grep -c "All v1 order endpoints now return 404" INV_CR363_CR364_CR366_API_IMPACT_ANALYSIS.md` | 0 |
| V2 | E2 applied | `grep "OG-PMS-016" control/OPEN_GAPS_REGISTER.md \| grep -c "order-family"` | 1 |
| V3 | E3 applied | `grep -c "CRM API Keys truncated" PRD.md` | 0 |
| V4 | E4 applied | `grep -c "CR-372-A\|CR-368" PRD.md` (Open Issues rows) | ≥2 |
| V5 | E5 per OD-02 | `grep -c "Source of truth" control/CONTROL_DASHBOARD.md` | 1 |
| V6 | E6 applied | `grep -c "PENDING REMOVAL" control/ENV_REGISTRY.md` | 2 |
| V7 | ENV_REGISTRY ⊇ .env keys | `cut -d= -f1 frontend/.env \| while read k; do grep -q "$k" control/ENV_REGISTRY.md \|\| echo MISSING $k; done` | no output |
| V8 | E7 applied | `grep -c "auth/vendoremployee/login" test_credentials.md` | 1 |
| V9 | No secret leaked into IA/plan/handover | grep the owner password string (from `test_credentials.md`, never typed into docs) across `impact/ plans/ handover/` | 0 hits |
| V10 | Zero src/ change | `git status --short frontend/src frontend/.env` | empty |

---

## §7 — Post-Code Registry Checklist (inherited by IMPLEMENTATION)

```
- [ ] registry.json: CR-370 → status IMPLEMENTED, gate 5a, sprint_key pos_audit_1, code_reality → FULL
- [ ] CR_REGISTRY.md: CR-370 row → IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: N/A (doc files not tracked) — note in handover instead
- [ ] Code markers: N/A for markdown — each edited doc carries "(CR-370 Cn, 2026-09-08)" inline
- [ ] OPEN_GAPS_REGISTER: F-DRIFT-05 / F-DRIFT-06 → note RESOLVED via CR-370
```

---

*Planning agent | CR-370 Gate 2 | 2026-09-08 | Code reality: PARTIAL | Risk: LOW | 5 owner decisions open (OD-CR370-02..06) | Gate 3 NOT written per owner instruction*
