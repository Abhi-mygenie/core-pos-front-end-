# CR-372-A — Gate 2: Impact Analysis
## Security: File Moves + .env Cleanup (Zero src/ changes)

**Doc:** `memory/impact/CR-372-A_IMPACT_ANALYSIS.md`
**Date:** 2026-09-08
**Role:** PLANNING (Gate 2 + Gate 3 — owner-selected OD-CR372A-01 b)
**Risk:** LOW (confirmed §2) | **Code Reality:** PARTIAL (problem present, no fix applied; prod build already strips `__dev/` — see §0) | **Conflict:** RELATED (CR-370 ENV_REGISTRY flip · CR-371 OD-CR371-02 dashboard path · CR-369 v0.7 prompt refs)
**Intake:** `change_requests/CR-372-A_SECURITY_FILE_MOVES_ENV_CLEANUP_INTAKE.md` · **Parent:** `change_requests/CR-372_SECURITY_REMEDIATION_PUBLIC_SURFACE_INTAKE.md`
**Evidence:** `evidence/CR-372-A/move_list_html_2026_09_08.txt` (74 paths)

---

## §0 — Code Reality Check (per fix)

| Fix | Check run | Result | Reality |
|---|---|---|---|
| F-SEC-01 `public/__dev/` | `find public/__dev -type f \| wc -l`; `du -sh` | **15 files / 784 KB** present (`index.html`, `dashboard.js`, `workflow.js`, `auth.js`, `styles.css`, `README.md`, 3 mockup HTML, `data/` × 6 JSON). `/app/memory/dev-dashboard/` does **not** exist. | **PARTIAL** |
| F-SEC-01 build exposure | `craco.config.js:80-96` | **CR-046 already deletes `build/__dev/` in `NODE_ENV=production`.** Exposure is dev-server / preview only. Plugin is guarded by `fs.existsSync` → becomes a harmless no-op after the move. | nuance — see OD-CR372A-06 |
| F-SEC-01 references | `grep -rn "__dev" public/index.html src/ backend/server.py` | **0 hits** in `index.html`, `src/`, backend. `GET /api/workflow-queue` (cited in prompt v0.7 STEP -1) does **not exist** in `backend/server.py`. `/app/scripts/gen_dev_dashboard_config.js` (cited in `__dev/README.md`) does **not exist** on disk. | pre-existing stale refs |
| F-SEC-02 HTML count | `find public -name "*.html"` | **96 total** = 4 in `__dev/` + **92 elsewhere** (64 top-level incl. `index.html` · 5 `backend-briefs/` · 9 `design-mockups/` · 1 `downloads/` · 13 `pms/`). Intake "~91" was derived as 96−5 and is **wrong** (counted the PDF, missed `__dev` HTML and `index.html`). | **PARTIAL** — count corrected |
| F-SEC-02 src refs | `grep -rn "\.html" src --include=*.js --include=*.jsx` | 4 hits, **all comments** (`DeliveryManagementPage.jsx:7`, `PurchaseReportPage.jsx:7`, `OrderReportBetaPage.jsx:3`, `InventoryTabBar.jsx:2`). No import/fetch/`window.open`. 0 hits in `src/**/*.test.*`. | no src edit needed |
| F-SEC-02 non-HTML | `find public -maxdepth 2 -type f ! -name "*.html"` | Internal artifacts also served: `pos5-sprint-tracker.xlsx`, `downloads/POS2_0_MANUAL_VALIDATION_TASK_TRACKER_2026_05_11.xlsx`, `downloads/contract_amendment_v1_1.pdf`. Runtime files that must stay: `index.html`, `firebase-messaging-sw.js`, `sounds/`, `training/training-sdk.js` (loaded by `index.html:25` when `REACT_APP_TRAINING_ENABLED=true`). | scope expanded (OD-CR372A-03) |
| F-SEC-07 `.env` | `cut -d= -f1 frontend/.env` | 18 lines. `REACT_APP_CRM_API_KEYS` = **line 15**, `CORS_ORIGINS` = **line 17**. Both present. | **PARTIAL** |
| F-SEC-07 consumers | `grep -rn "CRM_API_KEYS\|CORS_ORIGINS" src craco.config.js public/index.html` | 1 hit: `src/api/crmAxios.js:5` — **comment only** ("Env-based REACT_APP_CRM_API_KEYS mapping removed per owner directive"). `CORS_ORIGINS` is consumed **only** by `backend/server.py:75` from `backend/.env` — a different file, out of scope (OD-CR372A-05). | safe to remove |

**Code Reality: PARTIAL.** Nothing has been moved/removed yet. Two intake facts corrected by code: (1) HTML move count is 74, not ~91; (2) `__dev/` is already excluded from the production bundle by CR-046 — the F-SEC-01 exposure is on the dev/preview origin.

---

## §1 — Conflict Pre-Check

| Target | Other open item | Conflict? |
|---|---|---|
| `frontend/public/__dev/**` | **CR-371** (OD-CR371-02: "regenerate `__dev/data/*.json`?") · DEV-DASHBOARD-001 / CR-046 (CLOSED) | **RELATED** — CR-371 must target the new path `/app/memory/dev-dashboard/data/*.json`. Execution order: CR-372-A **before** CR-371 (already the agreed order). |
| `frontend/public/*.html` | None open. `CR-358-P*` (PMS) owns the carve-outs, which are **not** moved. | **NONE** |
| `frontend/.env` | None. `ENV_REGISTRY.md` rows already say "PENDING REMOVAL — CR-372-A" (CR-370 E6). | **NONE** — CR-372-A performs the agreed flip → REMOVED |
| `control/ENV_REGISTRY.md` | CR-370 (IMPLEMENTED) | **NONE** — sequence honoured (CR-370 first, then this) |
| `control/AGENT_PROMPT_ALPHA.md` (v0.7) | **CR-369** (v0.8, blocked by CR-368) · CR-047 (CLOSED) | **RELATED** — 6 refs to `__dev` paths (L279, L1057, L1219, L1250, L1614, L1637) go stale. **Owner OD-CR372A-04 = defer to CR-369; log OPEN_GAPS entry now.** v0.7 is NOT edited by this CR. |
| `frontend/craco.config.js` | None | **NONE** — not edited (OD-CR372A-06 recommendation) |
| `frontend/src/**` | — | **ZERO changes** |

`FILE_OWNERSHIP.md` tracks `src/` only — none of the targets are listed. No R5 hotspot involved. No `/app/memory/final/*` (R2) touched.

---

## §2 — Risk: LOW (confirmed, no upgrade)

- No `src/` change, no API, no transform, no state, no localStorage, no provider order, no financial/auth logic.
- `.env` removal: both keys have **zero consumers** in `src/`; `CORS_ORIGINS` never had an effect in the browser. Only observable effect: the CRM key string disappears from the client bundle (the intended security outcome).
- File moves: React runtime never references the moved files (§0). `index.html`, `firebase-messaging-sw.js`, `sounds/`, `training/` remain.
- Fast Lane: **NOT eligible** (92 files + `.env` = env change; multi-file).
- Rollback: pure `git mv` + 2 deleted lines → `git checkout -- frontend/public frontend/.env` restores everything.

---

## §3 — Data Flow Trace (serving path: repo → dev-server / build → browser)

```
frontend/public/**                     ──CRA CopyPlugin──▶  build/**  ──▶  <origin>/<path>   (production)
frontend/public/**                     ──webpack-dev-server──▶ <preview>/<path>              (dev / preview)

  public/__dev/**          → served on preview (dev-server)          [F-SEC-01]
                           → build: REMOVED by craco CR-046 hook     (already safe in prod)
  public/*.html + subdirs  → served on preview AND copied to build   [F-SEC-02]  ← real prod exposure
  public/*.xlsx, *.pdf     → served on preview AND copied to build   [F-SEC-02 ext, OD-CR372A-03]
  frontend/.env REACT_APP_* → inlined into JS bundle at build        [F-SEC-07]
    REACT_APP_CRM_API_KEYS → no src consumer → inlined only if referenced by process.env.* (it is not) — key string
                             still lives in repo/pod .env → remove.
    CORS_ORIGINS (no REACT_APP_ prefix) → never inlined by CRA; misleading only → remove.

Consumers of the moved artifacts after the move (filesystem only):
  /app/memory/dev-dashboard/**   ← CR-371 (regen data JSON, OD-CR371-02) · CR-369 v0.8 (path refs)
  /app/memory/design_briefs/**   ← 4 src doc-comments (paths in comments become historical — no edit, R14)
```

**Break points after move (expected, documented):**
1. `curl <preview>/__dev/` → 404 (was 200). Prompt v0.7 DEPLOYMENT "Dashboard verify → 200" becomes a **false check** → OG-AUDIT-001 (deferred to CR-369).
2. `architecture-bible.html` (moved) contains an internal reference to `/api/training/*` text only — no live link breakage.
3. `backend-briefs/index.html` and `design-mockups/index.html` link to sibling files by relative path → **preserved** because subfolder structure is kept.

---

## §4 — Scope (final, per owner decisions §5)

### WILL change

| # | Item | From | To | Count |
|---|---|---|---|---|
| A | F-SEC-01 dev dashboard | `frontend/public/__dev/` | `/app/memory/dev-dashboard/` | 15 files (dir move) |
| B | F-SEC-02 HTML briefs — top level | `frontend/public/*.html` except `index.html` + 4 PMS carve-outs | `/app/memory/design_briefs/` | 59 |
| C | F-SEC-02 HTML briefs — subfolders | `public/backend-briefs/` (5) · `public/design-mockups/` (9) · `public/downloads/contract_amendment_v1_1.html` (1) | `/app/memory/design_briefs/<same subfolder>/` | 15 |
| D | F-SEC-02 ext — non-HTML internal artifacts (OD-CR372A-03) | `public/pos5-sprint-tracker.xlsx` · `public/downloads/POS2_0_MANUAL_VALIDATION_TASK_TRACKER_2026_05_11.xlsx` · `public/downloads/contract_amendment_v1_1.pdf` | `/app/memory/design_briefs/` (+ `downloads/`) | 3 |
| E | F-SEC-07 | `frontend/.env` L15 `REACT_APP_CRM_API_KEYS=…`, L17 `CORS_ORIGINS=…` | deleted | −2 lines |
| F | Registry flip (CR-370 §1 agreement) | `control/ENV_REGISTRY.md` "PENDING REMOVAL — CR-372-A" ×2 | "REMOVED 2026-09-08 (CR-372-A F-SEC-07)" | 2 rows |
| G | Gap log (OD-CR372A-04) | `control/OPEN_GAPS_REGISTER.md` | + OG-AUDIT-001: v0.7 prompt `__dev` path refs → CR-369 | +1 row |

**Total moved: 92 files** (15 + 59 + 15 + 3). `public/` after move: `index.html`, `firebase-messaging-sw.js`, `sounds/`, `training/training-sdk.js`, `pms/` (13 HTML), `cr358-p2-v3-mockup.html`, `cr358-p3-design-comparison.html`, `cr358-p4-pms-mockup.html`, `comparison_room_ui.html`, `MyGenie_PMS_Screen_Reference.pdf`.

### WILL NOT touch
`frontend/src/**` (incl. the 4 comment refs), `frontend/public/index.html`, `firebase-messaging-sw.js`, `sounds/`, `training/`, **`public/pms/**` + 4 PMS carve-out HTML + PDF** (OD-CR372A-02, revisit at `pos_pms_1` closure), `frontend/craco.config.js` (CR-046 hook stays as no-op — OD-CR372A-06), `backend/.env` + `backend/server.py` (OD-CR372A-05), `control/AGENT_PROMPT_ALPHA.md` (OD-CR372A-04 → CR-369), `control/PUBLIC_ROUTES.md`, `App.js` (CR-372-B), `/app/memory/final/*` (R2), `registry.json` schema.

### Downstream consumers
CR-371 (dashboard data path), CR-369 (v0.8 must cite `/app/memory/dev-dashboard/`), CR-372-B (independent — App.js only), DEPLOYMENT role (dashboard-verify step obsolete), PRE-RELEASE AUDIT §E/§F (`__dev` exceptions obsolete).

---

## §5 — Owner Decisions — ALL LOCKED 2026-09-08

| OD | Question | Decision |
|---|---|---|
| **OD-CR372A-01** | Gate 2 only or Gate 2 + 3? | **(b) Both** — plan written same session (`plans/CR-372-A_IMPLEMENTATION_PLAN.md`) |
| **OD-CR372A-02** | Which HTML set moves (count was wrong: 92 non-`__dev`, incl. 13 in `public/pms/`)? | **Everything except PMS files** → move 74 HTML; keep `public/pms/` (13) + 4 named carve-outs + PDF |
| **OD-CR372A-03** | Non-HTML internal artifacts (2 × `.xlsx`, 1 contract `.pdf`) served publicly | **Add to CR-372-A scope** (row D) |
| **OD-CR372A-04** | v0.7 prompt has 6 `__dev` path refs that go stale | **Defer to CR-369 (v0.8); log OPEN_GAPS entry now** (row G) |
| **OD-CR372A-05** | `CORS_ORIGINS` also in `backend/.env`, consumed by `server.py:75` | **frontend/.env only; backend untouched** ("we don't use backend") |
| **OD-CR372A-06** | `craco.config.js` CR-046 `__dev` removal hook becomes dead code after move | **Agent recommendation: LEAVE** (guarded no-op; removing it = build-config edit outside "zero src/" spirit). Owner may override at Gate 4 → would add 1 file / −17 lines. |

Parent decisions inherited: OD-CR372-02 (key not consumed → remove directly), OD-CR372-03 (option A → `/app/memory/dev-dashboard/`).

---

## §6 — Verification Matrix (seed — full version in plan §4)

| # | Check | Expected |
|---|---|---|
| V1 | `test -d frontend/public/__dev` | absent |
| V2 | `find memory/dev-dashboard -type f \| wc -l` | 15 |
| V3 | `find frontend/public -name "*.html" \| wc -l` | **18** (index + 4 carve-outs + 13 pms) |
| V4 | `find memory/design_briefs -type f \| wc -l` | **77** (74 HTML + 3 non-HTML) |
| V5 | `find frontend/public -name "*.xlsx" -o -name "*.pdf" \| sort` | only `MyGenie_PMS_Screen_Reference.pdf` |
| V6 | `cut -d= -f1 frontend/.env \| grep -c "CRM_API_KEYS\|CORS_ORIGINS"` | 0 · line count 16 |
| V7 | `curl -s <preview>/__dev/data/config.json` and `/architecture-bible.html` — body check | Body contains `id="root"` (React shell fallback). **Probed 2026-09-08 before move:** dev-server answers 200 for every path; missing files return the React shell, real files return their content. Status code alone is NOT a valid check. |
| V8 | `curl -s <preview>/pms/front-desk.html` — body check | Body does **not** contain `id="root"` (real PMS carve-out file still served) |
| V9 | `tail -5 /var/log/supervisor/frontend.out.log` after `supervisorctl restart frontend` | "webpack compiled successfully" |
| V10 | `git status --short frontend/src backend/` | empty |
| V11 | `grep -c "PENDING REMOVAL" control/ENV_REGISTRY.md` / `grep -c "REMOVED 2026-09-08" control/ENV_REGISTRY.md` | 0 / 2 |
| V12 | Secret scan of IA/plan/handover for the CRM key value | 0 hits |

---

*Planning agent | CR-372-A Gate 2 | 2026-09-08 | Code reality: PARTIAL | Risk: LOW | 6 ODs locked (OD-CR372A-01..06) | Gate 3 plan written same session*
