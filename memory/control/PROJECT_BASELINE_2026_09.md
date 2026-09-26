# MyGenie POS + PMS — Consolidated Project Baseline

**Document:** PROJECT_BASELINE_2026_09.md
**Baseline date:** 2026-09-06
**Scope:** `/app/frontend` (React SPA) + `/app/memory` control layer + live preprod API contract (read-only probes)
**Method:** Code is truth (R1). Every finding has an ID, severity, evidence path. No application code was changed to produce this baseline.
**Evidence folder:** `/app/memory/evidence/BASELINE-2026-09/`

Severity scale: **S0** production-blocking / data or money risk · **S1** must fix before next release · **S2** fix this sprint cycle · **S3** hygiene / backlog

---

## 1. System Snapshot

| Dimension | Baseline value |
|---|---|
| Frontend | React 19 · CRA + CRACO · Tailwind · Radix/shadcn · react-router · axios · socket.io-client · Firebase |
| Source size | 528 files under `src/` · 112 `<Route>` entries in `App.js` · 55 API service modules · ~500 endpoint constants (49 `v1`, 228 `v2`) |
| Largest files | `CollectPaymentPanel.jsx` 3 324 lines · `OrderEntry.jsx` 2 936 · `orderTransform.js` 2 251 · `DashboardPage.jsx` 2 099 |
| Local backend | `/app/backend/server.py` — 88-line FastAPI template (`/api/status` only). **Not** the product backend. |
| Product backend | Laravel at `preprod.mygenie.online` (env `REACT_APP_API_BASE_URL`), Socket.io at `presocket…`, CRM at `crm.mygenie.online` |
| Runtime | Node 20.20.2 (package `@testing-library/jest-dom@7` requires Node ≥22 → `--ignore-engines` needed on every install) |
| Git | `/app` repo has **9 commits, no remote**. `origin/PMS1` (the branch the control layer treats as truth) is **not reachable** from this pod. |
| Tests | 48 test files · **591 pass / 56 fail / 647 total** (15 failing suites) · 3 "tests" are plain-Node scripts that **hang Jest** (see F-QA-01) |
| Control layer | `registry.json` 618 items · 66 handovers · 35 plans · 13 QA reports · 16 open gaps (OG-PMS-001…016) · Agent prompt v0.7 (1 762 lines) |
| Sprints | POS 2.0 → POS 4.0 (FROZEN) → printing/CR-133 → `pos_pms_1` (CR-358 P1–P4 QA-passed, Gate 6 owner smoke pending) |

### 1.1 Feature inventory (live routes, grouped)

| Area | Routes / screens | State |
|---|---|---|
| Auth | `/`, `/restaurant-picker` (CR-166 common-login, admin login-as-restaurant) | Live |
| POS core | `/dashboard`, order entry, collect payment, split/merge/transfer, KOT/bill printing, stations, printer agents, aggregators (UrbanPiper) | Live · FROZEN baseline |
| Menu / Inventory / Expense / Employees / Credit / Day-closure / Delivery | `/menu`, `/inventory-*`, `/expenses`, `/employees`, `/credit`, `/day-closure`, `/delivery-management` | Live |
| Reports module | ~45 `/reports-module/*` routes (audit, ledger, sales, tax, staff, customers, P&L, purchase, consumption, order-report-beta) | Live; many still named `*Mockup.jsx` |
| PMS (`pos_pms_1`) | `/pms/front-desk`, `new-booking`, `arrivals`, `check-in`, `in-house`, `departures`, `reservations` (tape chart), `room-status`, `channel-manager` (4 tabs), `/reports/rooms` | QA-passed P1–P4 · **Gate 6 owner smoke not done** |
| Dev / preview | 22 unauthenticated `*/preview`, `/screenN-compare`, `/settings-preview`, `/aggregator-preview`, `/printer-config-preview`, `/cr132-print`, `/local-printer-setup` | Shipped in prod bundle (see F-SEC-03) |

---

## 2. Security Findings

| ID | Sev | Finding | Evidence | Recommendation |
|---|---|---|---|---|
| F-SEC-01 | **S1** | **Internal control-layer dashboard shipped to production.** `frontend/public/__dev/` (dashboard.js 98 KB, workflow.js, data/*.json incl. `bug_tracker.json`, `cr_registry.json`, `closure_debt.json`) is served at `/__dev/` on every build. "Auth" is a client-side SHA-256 compare against `access.json` → trivially bypassed; the JSON is fetchable directly. | `frontend/public/__dev/auth.js` L35-45, `data/access.json` | Move `__dev/` out of `public/` (serve from local backend or exclude via build step). Rotate the password hash. |
| F-SEC-02 | **S1** | **71 internal HTML documents in `public/`** (backend briefs with endpoint/payload details, architecture-bible, gap briefs, comparison mock-ups, 8.7 MB) are publicly served from the production origin. | `ls frontend/public/*.html` → 71 | Relocate to `/app/memory/` (they are control-layer artefacts) or a non-public folder; add a `public/` allow-list check to Pre-Release Audit. |
| F-SEC-03 | **S2** | **22 unauthenticated routes** (`*/preview`, `screen1-9-compare`, `cr132-print`, `local-printer-setup`, `aggregator-preview`, `printer-config-preview`, `settings-preview`) render without `ProtectedRoute`. Currently mock-data only (0 live service calls found), but they leak UI/business rules and are a regression trap if a dev later wires them to real services. | `App.js` L147-220; per-file service-call grep = 0 | Wrap in `ProtectedRoute` or gate behind `process.env.NODE_ENV==='development'`. |
| F-SEC-04 | **S2** | **Auth token, common-auth token, CRM token in `localStorage`** (XSS-readable, no expiry metadata). 401 handling does a hard `window.location` redirect. Backend token TTL observed ≈15 min (token expired between two probe runs) — no refresh flow → users get silently logged out mid-shift. | `api/axios.js` L23-60; probe log | Document TTL with backend; add expiry-aware pre-emptive re-auth or idle warning. Consider `sessionStorage` for CRM token. |
| F-SEC-05 | **S2** | **Backend debug mode on preprod.** Every 404/500 returns Laravel exception JSON with `file`, `line`, 24-frame `trace` (server paths). | `api_probe_v1_v2_2026_09_06.md` § Observations | Backend brief: `APP_DEBUG=false` on preprod; FE should never render `err.response.data.trace`. |
| F-SEC-06 | **S3** | 181 `console.log` in production code paths (notification payloads, CRM token *presence*, FCM token prefix). No PII/secret values found, but noise leaks flow details in prod console. | grep count | Strip via babel plugin or gate behind `NODE_ENV`. |
| F-SEC-07 | **S3** | `CORS_ORIGINS` lives in `frontend/.env` (belongs to backend); `REACT_APP_CRM_API_KEYS` still present but **unused in code** (crmAxios uses login-provided token). Dead secret in env. | `.env`; `crmAxios.js` L2-5 | Remove both keys from frontend `.env`. **Closes "Issue 1: truncated CRM keys" — the var is obsolete, not truncated (it is valid JSON, 209 chars).** |
| F-SEC-08 | **S3** | 1 `target="_blank"` without `rel="noopener"`. | grep | Add `rel="noopener noreferrer"`. |

No hard-coded API keys, secrets, `eval`, or `dangerouslySetInnerHTML` found in `src/`. `.env` files are untracked in git.

---

## 3. Architecture Findings

| ID | Sev | Finding | Evidence | Recommendation |
|---|---|---|---|---|
| F-ARCH-01 | **S3** *(downgraded 2026-09-06 — owner: `PMS1` is the latest branch with full history; pod is a working copy)* | Pod git has no remote; local `src/` is a snapshot of `PMS1` synced via platform **Save to GitHub**. Risk is only pod↔PMS1 drift (happened 2026-09-04, OG-PMS-012). | `git remote -v` (empty) | Working rule: Save to GitHub at end of every coding session; at session start owner confirms nothing was pushed to `PMS1` outside the pod. Record rule in `CONTROL_DASHBOARD.md`; add to v0.8 Boot Preflight. |
| F-ARCH-02 | **S1** | **v1/v2 endpoint split is undocumented and partially wrong in docs.** 49 `v1` + 228 `v2` constants. Live probe: 12/14 `v1` routes still serve (profile, categories, tables, roles, reports, urbanpiper); only the order-family (`get-single-order-new`, `order-logs-report`, `pos/room-payment`) moved to `v2`. Sep-6 INV report over-generalised ("all v1 defunct"). 4 `v1`/`v2` routes return **403** for the owner account (products list, cancellation reasons, employee-orders-list, assigned-restaurants, room-payment) → permission scoping, not removal. | `api_probe_v1_v2_2026_09_06.md` | Add an `API_CONTRACT_MATRIX.md` (endpoint · version · method · last-probed · status) owned by Investigation/Closure roles; correct INV report and OG-PMS-016 wording. |
| F-ARCH-03 | **S2** | **God components.** 4 files > 2 000 lines; `CollectPaymentPanel.jsx` (3 324) and `OrderEntry.jsx` (2 936) hold the financial hotspots (R5/R6). Every CR touching payments edits the same file → merge/regression risk concentrated. | `wc -l` | Freeze further growth; carve out hooks (`useSplitBill`, `useRoomBilling`, `useTip`) behind existing test coverage. |
| F-ARCH-04 | **S2** | **Money math is scattered.** 112 `toFixed(2)` and ad-hoc `Math.round(x*100)/100` across 78 files; only `utils/roundOffUtils.js` is a shared helper. Financial rounding rules (ROUND-001 always-ceil, CR-029 round-up) live in transforms and components separately. | grep | Single `money.js` (add/sub/round/format) + lint rule banning `toFixed(2)` outside it. Regression suite must include the 5 financial transform tests. |
| F-ARCH-05 | **S2** | **Business configuration stored client-side.** 20+ `mygenie_*` localStorage keys hold runtime rules (name/phone required per channel, order-taking enabled, printer type, ID-upload required, enabled statuses). Per-device drift; R8 acknowledges it but no owner/sync doc exists. `mygenie_sidebar_expanded` read/written in **156 places** instead of one hook. | grep counts | Inventory in `LOCALSTORAGE_CONTRACT.md`; migrate to `useLocalPref(key)` hook; flag any setting that should be server-side. |
| F-ARCH-06 | **S3** | 16 `*.bak.*` files (1.1 MB) committed inside `src/` (e.g. `CollectPaymentPanel.jsx.bak.cr013p15`). Not bundled, but they match greps, inflate diffs, and confuse `R18` marker checks. | `find src -name "*.bak*"` | Delete; git history is the backup. |
| F-ARCH-07 | **S3** | Naming debt: ~40 live report pages are still `*Mockup.jsx`; `RoomOrdersMockup.jsx`/`SettlementReportMockup.jsx` carry `useMemo` exhaustive-deps warnings. | `pages/reports-module/` | Rename at next closure; fix deps. |
| F-ARCH-08 | **S3** | Local `/app/backend` FastAPI is a template stub, yet the agent prompt references `GET/POST /api/workflow-queue` and dashboard sync "via API". The dashboard therefore reads static JSON last generated **2026-07-25**. | `backend/server.py` (0 workflow refs); `cr_registry.json.generated_at` | Either implement the 2 endpoints in `server.py` or remove API references from the prompt and make `gen_dashboard_sync.py` a Closure step. |

---

## 4. Quality / Test Baseline

| ID | Sev | Finding | Evidence | Recommendation |
|---|---|---|---|---|
| F-QA-01 | **S1** | **3 CR-358 "unit tests" are not Jest tests.** `bucketReservationOps.test.js`, `pmsService.tapeChart.cr358p4.test.js`, `roomStatusTransform.cr358p4.test.js` are plain-Node scripts that call `process.exit()` and test an **inlined copy** of the function, not the production import. They hang the Jest runner (full run never completes) and would pass even if `pmsService.js` were broken. The "34/34 pass" QA claim for P4 rests partly on them. | file headers; `jest_full_run.log` (stalls at 45/48) | Rewrite as real Jest tests importing from `src/`; add "Jest must exit green" to the QA Exit Gate. |
| F-QA-02 | **S1** | **Regression debt: 56 failing tests in 15 suites**, up from "2 pre-existing failures" recorded 2026-06-12. Failures are contract tests (`placeOrderPayload`, `updateOrderPayload`, `role-name-wire-contract`, `axios.test`, `barrelExports`, `ScanOrderPopOut`, `BulkEditor.*`) whose expected payloads were changed by later CRs without updating the tests. Every QA report since June ran **only the item's own tests**, so the slide was never caught. | `jest_run_excl_node_scripts.log` | Triage each suite: stale → update or retire with `// RETIRED: superseded by CR-xxx`; real → BUG intake. Then make "full suite green" the Regression gate. |
| F-QA-03 | **S2** | No lint config is committed (`.eslintrc*` absent; CRA defaults only). Lint cannot be run standalone, so `R5/R6` hotspot changes have no static gate. | `ls .eslintrc*` | Commit `eslint.config.js` (react-app + hooks); wire into Implementation Exit Gate. |
| F-QA-04 | **S2** | **Gate 6 backlog:** 221 registry items sit at "QA PASS — awaiting owner smoke" and 70 at "IMPLEMENTED" with no QA record. Only 241/618 are CLOSED. Smoke debt of this size means "shipped" and "verified" have diverged for ~3 months. | `registry_open_items.json` | Owner decision: bulk retroactive smoke (Closure Phase B) for items already in production ≥30 days, or explicit accept-as-is. |
| F-QA-05 | **S3** | Node engine mismatch (`jest-dom@7` needs Node ≥22, pod has 20.x) forces `--ignore-engines` on each install. | package.json | Pin `@testing-library/jest-dom@^6` or upgrade Node in deploy image. |

---

## 5. Incomplete / Partially-Shipped Areas

| ID | Area | State | Blocker |
|---|---|---|---|
| F-INC-01 | CR-358 PMS P1–P4 | Code + QA done · **Gate 6 owner smoke not performed** | Owner time |
| F-INC-02 | CR-358-P5 Rates/Restrictions/No-Show | INTAKE, unblocked | Gate 2 not started |
| F-INC-03 | CR-363 Night Audit | INTAKE, 🟡 partial — no no-show field (OG-PMS-015) | Backend field or FE derivation decision |
| F-INC-04 | CR-364 Guest Folio | INTAKE, 🟡 partial — `pos/room-payment` 403 (OG-PMS-014) | Backend permission ruling |
| F-INC-05 | CR-366 Revenue Dashboard | INTAKE, 🟢 mostly unblocked (N-day loop) | Gate 2 not started |
| F-INC-06 | CR-361 / 362 / 365 / 367 | INTAKE, backend-blocked | No assign / cancel-modify / housekeeping / messaging endpoints; briefs not yet written |
| F-INC-07 | BUG-381 walk-in data | Fixed, live preprod test deferred | Owner |
| F-INC-08 | `PmsPlaceholderPage.jsx` | Still in `pages/pms/` after all P1–P4 routes were re-pointed | Dead file — delete at closure |
| F-INC-09 | OG-PMS-010 auto-HK on checkout | Reproduced twice, likely backend | Backend ruling pending |
| F-INC-10 | OG-PMS-013 board soft-allocation vs LR truth | Contradictory screens | Blocks clean CR-361 contract |

---

## 6. Inconsistencies & Documentation Drift

| ID | Sev | Finding | Evidence |
|---|---|---|---|
| F-DRIFT-01 | **S1** | **89 items marked CLOSED/IMPLEMENTED/QA-PASS have no `// CR-xxx` / `// BUG-xxx` marker anywhere in `src/`** (R18 says markers are mandatory). Either code was refactored away, markers were dropped, or the items were never coded. | `items_without_code_markers.txt` |
| F-DRIFT-02 | **S2** | `registry.json` field hygiene: `type` has 4 spellings (`BUG/bug/CR/cr`), 497/618 items have `category: null` despite the Dashboard Data Contract requiring it; ~25 free-text status variants outside the canonical set. | registry analysis |
| F-DRIFT-03 | **S2** | `SPRINT_STATUS.md` last updated **2026-06-15**; `__dev/data/cr_registry.json` generated **2026-07-25**; `CONTROL_DASHBOARD.md` "Deployment Reconciliation" cites branch `main @ 1f05d05` which does not exist in this repo. | file headers |
| F-DRIFT-04 | **S2** | Prompt references files that do not exist: `control/ENV_REGISTRY.md` (named as *credential source of truth*), `control/BASELINE_INDEX.md`, `handover/AGENT_HANDOVER_PROTOCOL.md`. `/app/memory/test_credentials.md` is empty. Agents therefore improvise credentials from handoff text. | `ls` |
| F-DRIFT-05 | **S2** | Investigation report `INV_CR363_CR364_CR366` (Sep 6) states v1 is defunct → OG-PMS-016 filed on that basis. Live probe shows only the order-family moved. **Both need correction.** | `api_probe_v1_v2_2026_09_06.md` |
| F-DRIFT-06 | **S3** | Handoff "Issue 1: CRM API keys truncated (P0)" is obsolete — key is valid JSON and unused in code. "Issue 3: forbidden `#3B82F6` in Sidebar" is real (`Sidebar.jsx` L837) and also present in 10 other files (`colors.js`, `statusHelpers.js`, 8 report pages). | grep |
| F-DRIFT-07 | **S3** | OG-DOC-01/02 (June) still OPEN: docs cite branch `2-jiune-v2`, a shipped file that doesn't exist. | OPEN_GAPS L161-162 |

---

## 7. Agent-Process Findings (input to prompt v0.8)

Observed in handovers/QA reports — these are *behaviour* gaps, not code gaps.

| ID | Observed behaviour | Where | Control missing |
|---|---|---|---|
| F-PROC-01 | **Role bleed in a single session:** one agent ran QA(P3) → IMPLEMENTATION(P4) → QA(P4) → REGRESSION, then **fixed a MAJOR bug found in regression without registering it** and self-passed the retest. | `SESSION_HANDOVER_2026_09_04_CR358_P3QA_P4IMPL_REGRESSION.md` | Mode-transition gate; no self-QA of own implementation; R0 enforcement inside Regression |
| F-PROC-02 | **Investigation over-generalised** a finding ("v1 defunct") and it propagated into a registered gap within the same session. | INV Sep 6 → OG-PMS-016 | Confidence label + "verify before registering" step |
| F-PROC-03 | **Missing inputs silently worked around**: no remote → agent kept planning (Sep 4) until drift was noticed 2 sessions later; empty `test_credentials.md` → agents pulled credentials from chat text; `ENV_REGISTRY.md` missing → nobody flagged it. | OG-PMS-012; this baseline | HALT/ASK/ASSUME-AND-FLAG protocol |
| F-PROC-04 | **"Regression" = re-running the item's own tests.** Full Jest suite was last green-checked in June; 56 failures accumulated unseen. Regression role exists (Role 9) but is placed *after* smoke, so it never runs per-item. | all QA reports since June | Mandatory per-item regression stage with a defined baseline suite |
| F-PROC-05 | **QA accepted non-Jest scripts as tests** and reported "34/34 pass". | F-QA-01 | QA Exit Gate: "runner exits 0 with N suites" evidence, not counts from a script |
| F-PROC-06 | **Registry update partial**: Planning wrote `registry.json` but not `CR_REGISTRY.md` / `CONTROL_DASHBOARD.md` (G9 MAJOR, Sep 3). | `SESSION_HANDOVER_2026_09_03_CR358P4_GATE2.md` L133 | Single sync script + Exit-Gate check instead of manual multi-file edits |
| F-PROC-07 | **Dev artefacts committed into production surfaces** (`public/__dev`, 71 HTML briefs, `.bak` files) across many sessions — no role owns "what ships". | F-SEC-01/02, F-ARCH-06 | Pre-Release Audit checklist item: `public/` allow-list + `src/` hygiene |

---

## 8. Blocked Items Register (consolidated)

| Item | Blocked on | Owner of unblock |
|---|---|---|
| CR-364 Record Payment · OG-PMS-014 | `pos/room-payment` 403 | Backend team (permission) |
| CR-363 no-show line · OG-PMS-015 | no `no_show` field | Backend or owner decision (FE derive) |
| CR-361 / 362 / 365 / 367 | endpoints absent | Backend briefs (not yet written) |
| OG-PMS-010 auto-HK | backend behaviour | Backend ruling |
| OG-PMS-013 soft-allocation | contract ruling B-361-02 | Backend ruling |
| BUG-381 live test · CR-358 Gate 6 | owner availability | Owner |
| F-ARCH-01 PMS1 sync | — (downgraded; process rule only) | — |

---

## 9. Recommended Remediation Order

1. **Record source-of-truth rule** (F-ARCH-01, S3): `PMS1` = truth, pod = working copy, Save to GitHub after each coding session; one line in `CONTROL_DASHBOARD.md`.
2. **Stop shipping internal artefacts** (F-SEC-01, F-SEC-02, F-SEC-03): move `__dev/` + HTML briefs out of `public/`; guard preview routes. *Low code risk, high exposure reduction.*
3. **Make the test suite trustworthy** (F-QA-01, F-QA-02): convert 3 node scripts, triage 56 failures, commit lint config. Establish "full suite green" as the regression baseline **before** any new PMS CR starts Gate 4.
4. **Correct the record** (F-DRIFT-05, F-DRIFT-06, F-DRIFT-04): fix INV/OG-PMS-016 wording, close obsolete CRM-key issue, create `ENV_REGISTRY.md` + populate `test_credentials.md` (aliases only).
5. **Adopt prompt v0.8** (Section 7 → `AGENT_PROMPT_GAP_ANALYSIS_v0.8.md`) so items 1–4 cannot recur.
6. **Gate 6 owner smoke** for CR-358 P1–P4, then CR-358-P5 / CR-366 / CR-363 / CR-364 in that order (least-blocked first).
7. Backlog: F-ARCH-03/04/05 refactors behind test coverage; registry hygiene (F-DRIFT-01/02); `.bak` purge; Node upgrade.

---

## 10. Evidence Index

| File | Content |
|---|---|
| `evidence/BASELINE-2026-09/api_probe_v1_v2_2026_09_06.md` | 21 live endpoint probes, status codes, observations |
| `evidence/BASELINE-2026-09/jest_full_run.log` | Full run (stalls at 45/48 — F-QA-01) |
| `evidence/BASELINE-2026-09/jest_run_excl_node_scripts.log` | 591/647, 15 failing suites listed |
| `evidence/BASELINE-2026-09/registry_open_items.json` | 373 non-closed registry items with status/gate |
| `evidence/BASELINE-2026-09/items_without_code_markers.txt` | 89 IDs (F-DRIFT-01) |
