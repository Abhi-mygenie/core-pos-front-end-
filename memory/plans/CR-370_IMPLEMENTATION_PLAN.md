# CR-370 — Gate 3: Implementation Plan
## Stale Doc Corrections — 5 Records from Audit §3 (C1–C5)

**Doc:** `memory/plans/CR-370_IMPLEMENTATION_PLAN.md`
**Date:** 2026-09-08
**Role:** PLANNING (Gate 3)
**Risk:** LOW | **Code Reality:** PARTIAL | **Conflict:** RELATED (CR-372-A ↔ ENV_REGISTRY — sequence defined below)
**Impact Analysis:** `memory/impact/CR-370_IMPACT_ANALYSIS.md` (Gate 2, same day — target lines re-verified at plan time)
**Owner decisions:** ALL LOCKED 2026-09-08 (see §1)

---

## §1 — Locked Owner Decisions

| OD | Decision | Effect on plan |
|---|---|---|
| OD-CR370-01 | Aliases provided (prior session) | C5 already populated |
| OD-CR370-02 | Source-of-truth branch = **`pms8sep`**. Update docs so the audit track states this branch. | CONTROL_DASHBOARD L16/L19 already correct → no edit. Intake C3 text + PRD header get `pms8sep` (E5a, E5b). |
| OD-CR370-03 | (a) Reword ENV_REGISTRY to **PENDING REMOVAL — CR-372-A** | E6 |
| OD-CR370-04 | (i) Code is truth → login path from `constants.js:8`. (ii) cafe103 RID = **644** | E7, E8 |
| OD-CR370-05 | (a) Use actual counts: **96 HTML in `public/` (91 to move, 5 kept — CR-372-A)** | E4 |
| OD-CR370-06 | (a) Leave PRD "Upcoming Tasks" item 0 untouched — observation only | No edit; §7 note |

Agent finding applied under OD-04 rule ("code is truth"): fake-test count is **2**, not 3 — `bucketReservationOps.test.js` was rewritten as real Jest under BUG-382 (file header confirms); `grep process.exit` → 2 files. E4 records "2 remaining (1 of 3 fixed via BUG-382)".

---

## §2 — Scope Lock (R14)

**Files WILL change (7):**
1. `INV_CR363_CR364_CR366_API_IMPACT_ANALYSIS.md`
2. `control/OPEN_GAPS_REGISTER.md`
3. `PRD.md`
4. `change_requests/CR-370_STALE_DOC_CORRECTIONS_5_RECORDS_INTAKE.md` (C3 wording → `pms8sep`, per OD-02)
5. `control/ENV_REGISTRY.md`
6. `test_credentials.md`
7. `control/CONTROL_DASHBOARD.md` — header "Last Updated" line only (session bookkeeping; deployment table untouched)

**Files WILL NOT touch:** `frontend/src/**`, `frontend/public/**`, `frontend/.env`, `frontend/craco.config.js`, `App.js`, `control/registry.json` schema (status fields only via checklist), `control/PROJECT_BASELINE_2026_09.md`, `/app/memory/final/*` (R2), INV endpoint matrix rows, CR-363/364/366 intakes, CR-368/CR-372-A intakes.

**Secret rule (R20):** no edit may introduce a password/token value. E7/E8 touch `test_credentials.md` rows but only the URL and RID cells.

---

## §3 — Exact Edits

### E1 — INV report: reword v1-defunct claim (C1)
**File:** `INV_CR363_CR364_CR366_API_IMPACT_ANALYSIS.md` **L21**
**Current:**
```
**Critical Change Since Sep 4:** The backend team appears to have migrated endpoints from `/api/v1/` to `/api/v2/`. All v1 order endpoints now return 404. The frontend already uses v2 paths — so no breakage in the live app, but future investigations MUST use v2 URLs.
```
**New:**
```
**Change Since Sep 4 (corrected 2026-09-08, CR-370 C1):** Only the **order-family** endpoints (`get-single-order-new`, `report/order-logs-report`, `pos/room-payment`) moved from `/api/v1/` to `/api/v2/`. v1 is **not** defunct — 12/14 probed v1 routes return 200; the remaining 4 return 403 (permission-scoped for the sandbox owner role, not removed). The frontend already uses v2 for the order family — no breakage in the live app. Code reality (2026-09-08): `src/api/constants.js` declares **35 live v1 endpoints** including LOGIN, COMMON_LOGIN, PROFILE, CATEGORIES, PRODUCTS, TABLES, RUNNING_ORDERS, ROOM_CHECK_IN, PRINT_ORDER, credit/settlement and P&L reports — v1 is production-critical, not defunct. Rule: probe order-family endpoints on v2; all other endpoints stay on v1 unless a probe proves otherwise. Evidence: `evidence/BASELINE-2026-09/api_probe_v1_v2_2026_09_06.md` + `grep -rn "'/api/v1/" src/api/constants.js`.
```
**Verify:** `grep -c "All v1 order endpoints now return 404" <file>` → 0; `grep -c "CR-370 C1" <file>` → 1.

### E2 — OPEN_GAPS_REGISTER: reword OG-PMS-016 (C1)
**File:** `control/OPEN_GAPS_REGISTER.md` **L388** (row `OG-PMS-016`)
**Current cell (col 4):**
```
All `/api/v1/vendoremployee/*` order endpoints (`get-single-order-new`, `report/order-logs-report`, `pos/room-payment`) now return 404; `/api/v2/` is live. Frontend already on v2 — no runtime breakage — but all probes/briefs must reference v2.
```
**New cell:**
```
Order-family endpoints only (`get-single-order-new`, `report/order-logs-report`, `pos/room-payment`) moved to `/api/v2/` (v1 → 404). v1 is otherwise live: 12/14 probed routes 200, 4 × 403 permission-scoped (see `evidence/BASELINE-2026-09/api_probe_v1_v2_2026_09_06.md`). Frontend already on v2 for the order family — no runtime breakage. Code still declares 35 live v1 endpoints (login, profile, categories, products, tables, running orders…) — see `constants.js`. Probes/briefs: v2 for order family, v1 elsewhere. *(Reworded 2026-09-08, CR-370 C1 — original text overstated v1 as defunct; F-DRIFT-05.)*
```
Status/priority cells unchanged (P3 / OPEN).
**Also L4:** `**Last Updated:** 2026-09-02 (…)` → `**Last Updated:** 2026-09-08 (CR-370 C1: OG-PMS-016 reworded — v1 not defunct, order-family only; F-DRIFT-05 resolved). Prior: 2026-09-02 (CR-357 advance payment decisions frozen; OD-7 backend open)`
**Verify:** `grep "OG-PMS-016" <file> | grep -c "order-family"` → 1.

### E3 — PRD.md: remove obsolete CRM-keys row (C2)
**File:** `PRD.md` **L74**
**Current:**
```
| ~~CRM API Keys truncated~~ — OBSOLETE (var valid JSON and unused in code; remove from .env, F-SEC-07) | — | CLOSE |
```
**New:** *(line deleted)*. Removal of the var itself stays with CR-372-A (F-SEC-07) — already in its intake.
**Verify:** `grep -c "CRM API Keys truncated" PRD.md` → 0.

### E4 — PRD.md: correct F-SEC / F-QA rows with actual counts (C2, OD-05)
**File:** `PRD.md` **L75-76** (after E3 they become L74-75)
**Current:**
```
| Internal `public/__dev` dashboard + 71 HTML briefs served in prod (F-SEC-01/02) | P1 | NOT STARTED |
| Test suite untrustworthy: 3 node-script tests hang Jest, 56 failures (F-QA-01/02) | P1 | NOT STARTED |
```
**New:**
```
| Internal `public/__dev` dashboard + 96 HTML files in `public/` served in prod (91 to move, 5 PMS carve-outs kept) (F-SEC-01/02 → CR-372-A) | P1 | INTAKE |
| Test suite untrustworthy: 2 fake node-script tests still hang Jest (1 of 3 already fixed via BUG-382), 56 failures (F-QA-01/02 → CR-368) | P1 | INTAKE |
```
**Verify:** `grep -c "CR-372-A" PRD.md` ≥ 1; `grep -c "CR-368" PRD.md` ≥ 1; `grep -c "71 HTML" PRD.md` → 0.

### E5a — Intake doc: C3 branch wording (OD-02)
**File:** `change_requests/CR-370_STALE_DOC_CORRECTIONS_5_RECORDS_INTAKE.md` **L33**
**Current:** `**Add line:** "Source of truth: \`PMS1\` branch. Pod = working copy; sync via Save to GitHub after each coding session."`
**New:** `**Add line:** "Source of truth: \`pms8sep\` branch. Pod = working copy; sync via Save to GitHub after each coding session." *(OD-CR370-02: branch corrected PMS1 → pms8sep, 2026-09-08. Row already present in CONTROL_DASHBOARD.md L19 — C3 verified DONE.)*`

### E5b — PRD.md header: current branch (OD-02)
**File:** `PRD.md` **L4**
**Current:** `Deploy existing React frontend (\`PMS1\` branch), investigate …`
**New:** `Deploy existing React frontend (\`PMS1\` branch — **current source-of-truth branch: \`pms8sep\`** since 2026-09-08, OD-CR370-02), investigate …`
**Verify:** `grep -c "pms8sep" PRD.md` ≥ 1. `CONTROL_DASHBOARD.md` L16/L19 already say `pms8sep` — **no edit** (V5 confirms 1 row).

### E6 — ENV_REGISTRY: keys are pending removal, not removed (C4, OD-03)
**File:** `control/ENV_REGISTRY.md` **L31-32**
**Current:**
```
| REACT_APP_CRM_API_KEYS | 2026-09-08 (CR-372-A F-SEC-07) | Unused in src/ — `crmAxios.js` has comment noting key removed from active use |
| CORS_ORIGINS | 2026-09-08 (CR-372-A F-SEC-07) | Frontend env var — has no effect on browser CORS; was misleading |
```
**New:**
```
| REACT_APP_CRM_API_KEYS | **PENDING REMOVAL — CR-372-A** (F-SEC-07). Still present in `.env` as of 2026-09-08. | Unused in src/ — `crmAxios.js` has comment noting key removed from active use |
| CORS_ORIGINS | **PENDING REMOVAL — CR-372-A** (F-SEC-07). Still present in `.env` as of 2026-09-08. | Frontend env var — has no effect on browser CORS; was misleading |
```
Also rename the table heading `## Removed / Deprecated` → `## Removed / Deprecated / Pending Removal` and add one line under it: `> Rule: this table may only say REMOVED after the key is gone from \`.env\`. CR-372-A flips these two rows on execution.`
**Sequence with CR-372-A:** CR-370 first (this edit) → CR-372-A implementation replaces "PENDING REMOVAL — CR-372-A …" with "Removed <date> (CR-372-A)". Parallel-safe.
**Verify:** `grep -c "PENDING REMOVAL" control/ENV_REGISTRY.md` → 2.

### E7 — test_credentials.md: login endpoint = code truth (C5, OD-04 i)
**File:** `test_credentials.md` **L20**
**Current:** `POST https://preprod.mygenie.online/api/v1/vendor/login`
**New:** `POST https://preprod.mygenie.online/api/v1/auth/vendoremployee/login   (source: src/api/constants.js:8 LOGIN — CR-370 C5, 2026-09-08)`
L21 body line unchanged.
**Verify:** `grep -c "auth/vendoremployee/login" test_credentials.md` → 1; `grep -c "vendor/login" test_credentials.md` → 0.

### E8 — test_credentials.md: cafe103 RID (C5, OD-04 ii)
**File:** `test_credentials.md` **L13** (cafe103-owner row) — edit **only** the Restaurant cell.
**Current cell:** `Cafe 103 (rid=103)`
**New cell:** `Cafe 103 (rid=644)`
Password/email cells untouched. Never echo the row in output.
**Verify:** `grep -c "rid=644" test_credentials.md` → 1; `grep -c "rid=103" test_credentials.md` → 0.

### E9 — CONTROL_DASHBOARD.md: header bookkeeping only
**File:** `control/CONTROL_DASHBOARD.md` **L4** — prepend to "Last Updated": `2026-09-08 — CR-370 IMPLEMENTED (5 doc corrections C1–C5 applied; F-DRIFT-04/05/06 resolved). ` then keep existing text as "Prior".
Deployment table (L12-22) **not edited**.

---

## §4 — Execution Sequence

```
1. E1 → E2   (C1 — both v1 wording fixes together; then V1, V2)
2. E3 → E4 → E5b   (PRD.md three edits in one pass; then V3, V4, V5b)
3. E5a       (intake doc)
4. E6        (ENV_REGISTRY; then V6, V7)
5. E7 → E8   (test_credentials.md; then V8 — NEVER print file contents)
6. E9        (dashboard header)
7. V9, V10   (secret scan + zero src/ change)
8. Post-Code Registry Checklist (§6)
```
Estimated: 9 edits, 7 files, ~15 changed lines. No restart, no build, no yarn.

---

## §5 — Verification Matrix

| Edit # | File | Change | How to Verify | Automated? |
|---|---|---|---|:---:|
| E1 | INV_CR363…md:21 | v1-defunct → order-family only | V1: `grep -c "All v1 order endpoints now return 404"` = 0 | grep |
| E2 | OPEN_GAPS_REGISTER.md:388, :4 | OG-PMS-016 reword + Last Updated | V2: `grep OG-PMS-016 \| grep -c order-family` = 1 | grep |
| E3 | PRD.md:74 | Remove CRM row | V3: `grep -c "CRM API Keys truncated"` = 0 | grep |
| E4 | PRD.md:75-76 | Actual counts + CR refs | V4: `grep -c "96 HTML"`=1, `grep -c "2 fake"`=1, `grep -c "71 HTML"`=0 | grep |
| E5a | CR-370 intake:33 | PMS1 → pms8sep | `grep -c pms8sep` ≥1 | grep |
| E5b | PRD.md:4 | branch note | V5b: `grep -c pms8sep PRD.md` ≥1 | grep |
| — | CONTROL_DASHBOARD.md:19 | no edit needed | V5: `grep -c "Source of truth"` = 1 and contains `pms8sep` | grep |
| E6 | ENV_REGISTRY.md:31-32 | PENDING REMOVAL | V6: `grep -c "PENDING REMOVAL"` = 2 | grep |
| E6 | ENV_REGISTRY.md | still covers every .env key | V7: loop `cut -d= -f1 frontend/.env` → each name grep-found → no MISSING | script |
| E7 | test_credentials.md:20 | login path | V8: `grep -c "auth/vendoremployee/login"` = 1 | grep |
| E8 | test_credentials.md:13 | rid=644 | `grep -c "rid=644"` = 1 | grep |
| ALL | impact/ plans/ handover/ | no secret | V9: grep the password value (read from test_credentials, never typed) = 0 hits | script |
| ALL | frontend/ | zero code change | V10: `git status --short frontend/src frontend/.env frontend/public` empty | git |

**R25 note:** no API mutation in this CR — verb rule N/A.

---

## §6 — Post-Code Registry Checklist (IMPLEMENTATION agent MUST execute)

```
- [ ] registry.json: CR-370 → status "IMPLEMENTED — 5 doc corrections applied (2026-09-08)", gate "5a", completeness "5/7", code_reality "FULL", sprint_key "pos_audit_1"; artifact_refs += Implementation Plan path
- [ ] CR_REGISTRY.md: CR-370 row → IMPLEMENTED, gate 5a
- [ ] FILE_OWNERSHIP.md: N/A (tracks src/ only) — state this in handover
- [ ] Code markers: N/A for markdown — every edited doc carries inline "(CR-370 Cn, 2026-09-08)" (E1–E9 all include it)
- [ ] OPEN_GAPS_REGISTER / PROJECT_BASELINE cross-ref: F-DRIFT-04, -05, -06 → note "RESOLVED via CR-370 2026-09-08" (append to OG header line only — do NOT edit PROJECT_BASELINE_2026_09.md, it is the frozen audit record)
- [ ] Session handover: handover/SESSION_HANDOVER_2026_09_08_CR370_IMPL.md
```

---

## §7 — Risk Register & Observations

| # | Risk / Observation | Mitigation |
|---|---|---|
| R-1 | ENV_REGISTRY and `.env` diverge again if CR-372-A forgets the flip | E6 adds explicit rule line + CR-372-A intake already references F-SEC-07; add to CR-372-A plan verification |
| R-2 | Accidentally echoing `test_credentials.md` during E7/E8 | Use `search_replace` with cell-only strings; verify with `grep -c`, never `cat` |
| R-3 | PRD line numbers shift after E3 deletion | Edits keyed on text, not line numbers |
| OBS-1 | CR-368 intake says "3 fake scripts"; reality is 2 (BUG-382 fixed one). Not CR-370 scope. | Flag to CR-368 planner in handover; CR-368 Phase A scope shrinks to 2 files |
| OBS-2 | PRD "Upcoming Tasks" item 0 stale | OD-06 = leave; logged here only |
| OBS-3 | Prompt alias table (`AGENT_PROMPT_ALPHA.md`) lists cafe103 as RID 644 and calls it `cafe103_no_rooms_postpaid_gst`; test_credentials uses alias `cafe103-owner`. Two alias schemes coexist. | Not CR-370 scope; candidate for CR-369 v0.8 (single alias table) |

---

## §8 — Gate 4 Request

```
OWNER APPROVAL REQUIRED
Reason: Gate 4 GO before implementation (Owner Approval Matrix)
Risk: LOW
Proposed next step: IMPLEMENTATION agent applies E1–E9 (7 doc files, ~15 lines, zero src/), runs V1–V10, executes §6 checklist, writes QA handover + session handover.
I will not proceed until owner approves.
```

---

*Planning agent | CR-370 Gate 3 | 2026-09-08 | 9 edits / 7 files | Risk LOW | All ODs locked | Awaiting Gate 4 GO*
