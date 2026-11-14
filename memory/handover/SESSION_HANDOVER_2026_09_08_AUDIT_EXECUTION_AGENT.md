# AGENT HANDOVER — AUDIT TRACK EXECUTION
# Mission: Execute CR-368 through CR-372-B → Produce AGENT_PROMPT_ALPHA_v0.8.md → Close Audit Session

**Date written:** 2026-09-08
**Written by:** INTAKE agent
**For:** Next agent picking up the AUDIT execution track
**End goal:** `control/AGENT_PROMPT_ALPHA_v0.8.md` written, all 6 audit CRs CLOSED, session handover written.
**Code changes this session so far:** ZERO in `frontend/src/`

---

## 0. WHAT YOU ARE DOING AND WHY

The project underwent a full health-check audit (2026-09-06). It found security exposures, a broken test suite, stale docs, and 10 gaps in the agent rulebook. The owner approved fixes and decisions for all of them.

**Your mission in one sentence:** Execute the 6 audit CRs in order, then write the new agent rulebook (`v0.8`) that bakes in everything learned — so these problems cannot silently recur.

The 6 CRs were registered this session (2026-09-08). All owner decisions are already locked. You do not need to run INTAKE. Go straight to PLANNING → IMPLEMENTATION for each.

---

## 1. MANDATORY BOOT READING (do this before anything else)

Read these 5 files in order. They contain everything you need — do not skip:

```
1. /app/memory/control/AGENT_PROMPT_ALPHA.md          ← your operating rules (v0.7)
2. /app/memory/control/PROJECT_BASELINE_2026_09.md    ← WHY these CRs exist (35 findings)
3. /app/memory/control/AGENT_PROMPT_GAP_ANALYSIS_v0.8.md  ← blueprint for v0.8 + all D1-D6 decisions
4. /app/memory/control/PUBLIC_ROUTES.md               ← authoritative public route list (CR-372-B)
5. /app/memory/handover/SESSION_HANDOVER_2026_09_08_AUDIT_INTAKE.md  ← what was done today
```

**Environment check (STEP -1.5):** CR-370, CR-371, CR-369 are doc-only → skip env check.
CR-372-A, CR-372-B, CR-368 touch files → verify `yarn start` is running:
```bash
tail -3 /var/log/supervisor/frontend.out.log   # should show "webpack compiled successfully"
```

---

## 2. THE 6 CRs — FULL PICTURE

### Execution order (strictly follow — CR-369 is the prize at the end)

```
CR-370  →  CR-372-A  →  CR-368  →  CR-372-B  →  CR-371  →  CR-369 (FINAL)
 (docs)    (file moves)  (tests)   (App.js)    (script)    (v0.8 prompt)
```

CR-369 is **blocked** until CR-368 is CLOSED (owner decision D3-b).
All others are unblocked and can start immediately.

---

### CR-370 — Stale Doc Corrections (5 records)

**Intake doc:** `change_requests/CR-370_STALE_DOC_CORRECTIONS_5_RECORDS_INTAKE.md`
**Risk:** LOW | **src/ change:** NO | **Role:** PLANNING → IMPLEMENTATION (can combine, LOW risk)

**Exactly 5 edits — nothing more:**

| # | File | What to change |
|---|---|---|
| C1 | `INV_CR363_CR364_CR366_API_IMPACT_ANALYSIS.md` | Find "Critical Change" para claiming v1 endpoints defunct. Reword to: "Only order-family endpoints (`get-single-order-new`, `order-logs-report`, `pos/room-payment`) moved to v2. 12/14 probed v1 routes still live. 4 routes return 403 (permission-scoped, not defunct)." Also fix `OPEN_GAPS_REGISTER.md` OG-PMS-016 to same. |
| C2 | `PRD.md` — Open Issues section | Remove: "CRM API Keys truncated (P0)" (obsolete — key is valid JSON, unused in code). Add: "F-SEC-01: internal dashboard in public/ (S1)", "F-SEC-02: 91 HTML briefs in public/ (S1)", "F-QA-01: 3 fake Jest tests (S1)", "F-QA-02: 56 failing tests (S1)". |
| C3 | `control/CONTROL_DASHBOARD.md` — Current Deployment table | Add row: `Source of truth \| PMS1 branch. Pod = working copy; sync via Save to GitHub after each coding session.` |
| C4 | Create `control/ENV_REGISTRY.md` | New file. Key names + purpose + owner only. **Never write values.** Template below. |
| C5 | `/app/memory/test_credentials.md` | Ask owner for alias names. Agent writes alias → account mapping only. Values are never written. If owner has not provided aliases, write the alias structure with `[TO BE PROVIDED BY OWNER]` placeholders and note it as PARTIAL. |

**ENV_REGISTRY.md template (C4):**
```markdown
# ENV_REGISTRY.md — Environment Variable Registry
# Key names + purpose only. Values are NEVER stored here.

| Variable | Purpose | Owner | Required |
|---|---|---|---|
| REACT_APP_API_BASE_URL | Laravel backend base URL (has trailing slash — strip before concat) | Platform | YES |
| REACT_APP_SOCKET_URL | Socket.io server URL | Platform | YES |
| REACT_APP_BACKEND_URL | Emergent platform internal backend URL | Platform | YES |
| REACT_APP_FIREBASE_API_KEY | Firebase auth init | Firebase project | YES |
| REACT_APP_FIREBASE_AUTH_DOMAIN | Firebase auth domain | Firebase project | YES |
| REACT_APP_FIREBASE_PROJECT_ID | Firebase project ID | Firebase project | YES |
| REACT_APP_FIREBASE_STORAGE_BUCKET | Firebase storage bucket | Firebase project | YES |
| REACT_APP_FIREBASE_MESSAGING_SENDER_ID | FCM sender ID | Firebase project | YES |
| REACT_APP_FIREBASE_APP_ID | Firebase app ID | Firebase project | YES |
| REACT_APP_FIREBASE_MEASUREMENT_ID | Firebase Analytics ID | Firebase project | NO |
| REACT_APP_FIREBASE_VAPID_KEY | FCM web push VAPID key | Firebase project | YES |
| REACT_APP_CRM_BASE_URL | CRM API base URL | CRM service | YES |
| REACT_APP_GOOGLE_MAPS_KEY | Google Maps embed key | Google Cloud | YES |
| WDS_SOCKET_PORT | Webpack dev server socket port (443 for HTTPS proxy) | Platform | YES |
| ENABLE_HEALTH_CHECK | Platform health check toggle | Platform | NO |
```

**Done criteria:** All 5 edits applied. No src/ files touched. Registry updated (status → IMPLEMENTED → hand to QA or self-verify since LOW risk).

---

### CR-372-A — Security: File Moves + .env Cleanup

**Intake doc:** `change_requests/CR-372-A_SECURITY_FILE_MOVES_ENV_CLEANUP_INTAKE.md`
**Risk:** LOW | **src/ change:** NO | **Role:** PLANNING → IMPLEMENTATION

**3 tasks:**

**Task 1 — F-SEC-01: Move `public/__dev/` → `/app/memory/dev-dashboard/`**
```bash
mkdir -p /app/memory/dev-dashboard
mv /app/frontend/public/__dev/* /app/memory/dev-dashboard/
rmdir /app/frontend/public/__dev
```
Verify: `ls /app/frontend/public/__dev` → should fail (dir gone).
`index.html` grep confirmed zero refs — no edits needed.

**Task 2 — F-SEC-02: Move ~91 HTML briefs → `/app/memory/design_briefs/`**
```bash
mkdir -p /app/memory/design_briefs
# Move ALL .html from public/ EXCEPT the 5 PMS carve-outs
```
**DO NOT MOVE these 5 (PMS work in progress — carve-out until PMS closes):**
- `cr358-p2-v3-mockup.html`
- `cr358-p3-design-comparison.html`
- `cr358-p4-pms-mockup.html`
- `comparison_room_ui.html`
- `MyGenie_PMS_Screen_Reference.pdf`

Move everything else. After move, `public/` should contain only:
`index.html`, `favicon.ico`, `manifest.json`, `robots.txt`, `sounds/`, `pms/` (with the 4 PMS HTML files + PDF), `firebase-messaging-sw.js`, and the training/ folder if present.

**Task 3 — F-SEC-07: Remove 2 lines from `frontend/.env`**
Remove:
```
REACT_APP_CRM_API_KEYS=...
CORS_ORIGINS=*
```
These are confirmed unused in `src/` (`crmAxios.js` has a comment noting the key was already removed from active use).

⚠️ **After .env edit:** `sudo supervisorctl restart frontend` — .env changes require a restart.
Wait for "Compiled successfully" in frontend logs before declaring done.

**Done criteria:** `__dev/` gone from public/. ~91 HTML files gone from public/ (5 PMS excluded). 2 .env vars removed. App still compiles.

---

### CR-368 — Test Suite Triage: Zero-Failure Baseline

**Intake doc:** `change_requests/CR-368_TEST_SUITE_TRIAGE_CLEAN_BASELINE_INTAKE.md`
**Risk:** MEDIUM | **src/ change:** test files only (no production src/) | **Role:** PLANNING → IMPLEMENTATION → QA

**This is the gate for CR-369. Do not skip it.**

**Phase A — Convert 3 fake node scripts**

Locate the 3 scripts identified in the audit (F-QA-01). They are in `src/__tests__/` and call `process.exit()` or test inlined copies of functions instead of importing from `src/`:
```bash
grep -rn "process.exit\|require.*\.\." /app/frontend/src/__tests__/ --include="*.test.*"
```
For each found script:
- Rewrite as a proper Jest test that `import`s the actual function from `src/`
- Remove the `process.exit()` calls
- Ensure the test file has a valid `describe/it/expect` structure

**Phase B — Triage 56 failing tests**

Run the full suite (excluding the 3 node scripts if not yet converted):
```bash
cd /app/frontend && yarn test --watchAll=false --forceExit 2>&1 | tail -100
```

For each failing test suite, classify each failure:

**STALE** → the test was written for old behaviour that was changed by a later CR. The test expectation is wrong, not the code.
- Action: Add comment `// RETIRED 2026-09-08: superseded by CR-xxx — <reason>` and skip with `test.skip()`
- Do NOT delete — keep for audit trail

**REAL BUG** → the code is genuinely broken — a regression introduced by a later CR.
- Action: Raise a BUG intake for each (BUG-382 onwards). Do NOT fix in this session — just register.
- Note: each REAL BUG becomes its own item in the next sprint. This session is triage only.

**Save triage results** to `evidence/BASELINE-2026-09/test_triage_2026_09_08.md`:
```markdown
| Suite | Test | Classification | Reason | Action |
|---|---|---|---|---|
```

**Done criteria:** `yarn test --watchAll=false --forceExit` exits with 0 failures. Save the passing runner summary line — this becomes the first line of `REGRESSION_BASELINE.md`:
```
BASELINE 2026-09-08: Test Suites: N passed, N total | Tests: N passed, N total
```

Create `control/REGRESSION_BASELINE.md` with that line + the Jest command to reproduce it.

---

### CR-372-B — Security: Add ProtectedRoute to 23 Routes (App.js)

**Intake doc:** `change_requests/CR-372-B_SECURITY_ROUTE_GUARDING_APP_JS_INTAKE.md`
**Risk:** MEDIUM | **src/ change:** `src/App.js` ONLY | **Role:** PLANNING → Gate 4 GO → IMPLEMENTATION → QA

**The 23 routes to wrap** (full list in intake doc — verify each still exists at expected line before editing):
```
/restaurant-picker, all */preview routes (12), /settlement/preview,
/settings-preview, /aggregator-preview, /printer-config-preview,
/screen1-compare through /screen9-compare (9), /cr132-print
```

**The 2 routes to KEEP public** (do NOT wrap):
```
/          → LoginPage
/local-printer-setup  → LocalPrinterSetupView
```

**Pattern for each wrapped route:**
```jsx
// Before:
<Route path="/restaurant-picker" element={<RestaurantPickerPage />} />

// After:
<Route path="/restaurant-picker" element={<ProtectedRoute><RestaurantPickerPage /></ProtectedRoute>} />{/* CR-372-B */}
```

**Add to the 2 public routes:**
```jsx
<Route path="/" element={<LoginPage />} />{/* PUBLIC: see control/PUBLIC_ROUTES.md */}
<Route path="/local-printer-setup" element={<LocalPrinterSetupView />} />{/* PUBLIC: see control/PUBLIC_ROUTES.md */}
```

⚠️ **Gate 4 required:** Before writing any code, confirm with owner: "Ready to add ProtectedRoute to 23 routes in App.js — Gate 4 GO?"

**Done criteria:** 23 routes wrapped. 2 public routes have comment. `webpack compiles 0 new warnings`. QA: navigate to 2-3 of the wrapped routes while logged out → should redirect to login. Navigate while logged in → should work normally.

---

### CR-371 — Build sync_registry.py

**Intake doc:** `change_requests/CR-371_SYNC_REGISTRY_PY_CANONICAL_SCRIPT_INTAKE.md`
**Risk:** LOW | **src/ change:** NO | **Role:** PLANNING → IMPLEMENTATION

**Build `control/sync_registry.py`** with this CLI:
```bash
python3 /app/memory/control/sync_registry.py \
  --id CR-xxx \
  --status "QA-PASS" \
  --gate 5 \
  [--sprint pos_audit_1] \
  [--note "short note"] \
  [--dry-run]
```

**What it must do:**
1. Read `registry.json` — find item by `--id`
2. Validate `--status` is in the canonical enum (propose this list for owner approval — see OD-CR371-01 below)
3. Update item: `status`, `gate`, `sprint_key`, append to `status_history[]` with date + note
4. Write back `registry.json` (pretty-printed)
5. Update the relevant row in `CR_REGISTRY.md` or `BUG_TRACKER.md` (status + gate columns)
6. Update `CONTROL_DASHBOARD.md` "Last Updated" line
7. Print: `✅ CR-xxx → QA-PASS (gate 5) — 3 files updated`

**OD-CR371-01 — Canonical status enum (propose to owner before coding):**
```
INTAKE | PLANNING | IMPLEMENTED | QA-PASS | QA-FAIL |
OWNER-VERIFIED | CLOSED | BACKEND-BLOCKED | DEFERRED | SPLIT | RETIRED
```

**OD-CR371-02 — Should script also regenerate `__dev/data/*.json`?**
Suggested YES (keeps dev dashboard in sync). Ask owner to confirm.
If NO → script updates 3 files only (registry.json + CR_REGISTRY.md/BUG_TRACKER.md + CONTROL_DASHBOARD.md).

**Done criteria:** Script runs cleanly on a test call. Updates all target files. Dry-run mode works. After CLOSED — manual edits to registry files are forbidden per D4-a.

---

### CR-369 — Write AGENT_PROMPT_ALPHA_v0.8.md (FINAL DELIVERABLE)

**Intake doc:** `change_requests/CR-369_AGENT_PROMPT_ALPHA_V08_WRITE_INTAKE.md`
**Risk:** LOW | **src/ change:** NO | **Role:** PLANNING → IMPLEMENTATION
**BLOCKED until CR-368 is CLOSED (D3-b)**

**Input:** `control/AGENT_PROMPT_GAP_ANALYSIS_v0.8.md` — all 10 gaps + all 6 decisions. READ THIS IN FULL before writing a single line.

**Output:** `control/AGENT_PROMPT_ALPHA_v0.8.md` — new file, ~350 additive lines. v0.7 untouched.

**Structure to follow** (from Gap Analysis §3):

```
0. IDENTITY (copy from v0.7, unchanged)
1. v0.8 OPERATING LAYER — compatibility note
2. MODE STATE MACHINE  (GAP-01, GAP-09, GAP-10)
   2.1 Mode list + declaration format
   2.2 Transition table (allowed / owner-token required / forbidden)
   2.3 Scope Lock protocol
3. BOOT PREFLIGHT (STEP -0.5) + MISSING-INPUT PROTOCOL (GAP-03, GAP-08)
4. ROLE DECISION TREE (copy from v0.7, unchanged)
5. RISK CLASSIFICATION (copy) + confidence labels for findings (GAP-02)
6. GATES — adds Gate 5c REGRESSION (GAP-04, D2-b: MEDIUM+ or R5/R6 only)
7. ROLES 1–12 (v0.7 text retained) with these deltas:
   - INVESTIGATION: confidence labels + no-register rule for MEDIUM/LOW
   - IMPLEMENTATION: Exit Gate item 6 (baseline run) + forbidden IMPLEMENT→QA (D1-a)
   - QA: machine-evidence rule + import-from-src rule + independence enforcement
   - PRE-RELEASE AUDIT: R26 production-surface check
   - CLOSURE: sync_registry.py only (D4-a)
8. SHARED RULES R0–R25 (unchanged) + R26, R27, R28
9. UNIVERSAL FINAL-RESPONSE FOOTER (GAP-10)
10. ENV & CREDENTIALS (points to ENV_REGISTRY.md + test_credentials.md)
11. REMEDIATION QUEUE (D6-yes — baked-in work queue from PROJECT_BASELINE §9)
12. CHANGELOG v0.8
```

**Key decisions to hard-code in v0.8:**

| Section | What to write |
|---|---|
| MODE STATE MACHINE | `MODE: <X> · ITEM: <ID> · GATE: <n>` declared in first response. Transition token: `TRANSITION: <from>→<to> APPROVED`. FORBIDDEN transition: `IMPLEMENT→QA` same session (D1-a). |
| Gate 5c | Applies to MEDIUM+ risk OR changes touching R5/R6 files. LOW risk items skip Gate 5c (D2-b). |
| REGRESSION_BASELINE | Points to `control/REGRESSION_BASELINE.md` (created during CR-368). Jest command + expected summary line + known-failure allow-list. |
| Confidence labels | `HIGH` (reproduced ≥2 ways) / `MEDIUM` (traced once) / `LOW` (inferred). Only HIGH findings may be registered directly. |
| Registry sync | R27: only `sync_registry.py --id ... --status ...` permitted. Manual edits forbidden (D4-a). |
| Public surface R26 | `public/` allow-list: `index.html, favicon, manifest, fonts, logo, robots, firebase-messaging-sw.js`. Anything else → BLOCKED at Pre-Release Audit. Reference `PUBLIC_ROUTES.md` for route exceptions. |
| REMEDIATION QUEUE | Copy the order from `PROJECT_BASELINE_2026_09.md` §9 items 1–7. Agent boots knowing this is the priority queue. |
| BOOT PREFLIGHT -0.5 | Required checks: (a) `control/ENV_REGISTRY.md` exists + non-empty, (b) `test_credentials.md` non-empty, (c) `control/REGRESSION_BASELINE.md` exists, (d) referenced control files exist. BLOCKED-INPUT if any red. |

**Done criteria:** File written at `control/AGENT_PROMPT_ALPHA_v0.8.md`. Has all 12 sections. Owner reviews and confirms. Then v0.8 is the active prompt.

---

## 3. OPEN QUESTIONS (need owner answer before specific steps)

| OD | CR | Question | When needed |
|---|---|---|---|
| OD-CR370-C5 | CR-370 | Provide alias names for `test_credentials.md` (values never written — aliases only) | Before finalising C5 |
| OD-CR371-01 | CR-371 | Approve canonical status enum list (proposed above) | Before coding sync_registry.py |
| OD-CR371-02 | CR-371 | Should sync_registry.py also regenerate `__dev/data/*.json`? (suggested: YES) | Before coding sync_registry.py |
| Gate 4 GO | CR-372-B | Explicit GO before wrapping 23 routes in App.js | Before any App.js edit |

---

## 4. WHAT "DONE" LOOKS LIKE — SESSION CLOSE CHECKLIST

```
□ CR-370 CLOSED — 5 doc corrections applied. ENV_REGISTRY.md created.
□ CR-372-A CLOSED — __dev/ moved, ~91 HTML briefs moved (5 PMS excluded), 2 .env vars removed.
□ CR-368 CLOSED — Jest exits 0 failures. REGRESSION_BASELINE.md created.
□ CR-372-B CLOSED — 23 routes wrapped in App.js. QA PASS.
□ CR-371 CLOSED — sync_registry.py built and working.
□ CR-369 CLOSED — AGENT_PROMPT_ALPHA_v0.8.md written and owner-reviewed.
□ registry.json — all 6 CRs at OWNER-VERIFIED or CLOSED.
□ CR_REGISTRY.md — audit track table updated with final statuses.
□ SESSION_HANDOVER written — references this handover as starting point.
□ CONTROL_DASHBOARD.md — "Audit track" sprint status updated.
```

When all boxes are checked: **the audit session is closed.** v0.8 is the active agent prompt from that point forward.

---

## 5. RULES SPECIFIC TO THIS TRACK

1. **No src/ changes except:** CR-372-B (App.js only) and CR-368 (test files only). Everything else is docs, memory, scripts, or file moves.
2. **Do not start CR-369 until CR-368 is CLOSED** (D3-b). This is a hard constraint.
3. **Gate 4 GO required for CR-372-B** — do not touch App.js without owner explicit confirmation.
4. **Do not fix REAL BUG failures found in CR-368** — register them as new BUG intakes and move on. Fixing them is a separate sprint item.
5. **PMS carve-out is non-negotiable** — the 5 PMS HTML files stay in `public/` until `pos_pms_1` sprint closes. Do not move them.
6. **v0.7 is untouched** — `AGENT_PROMPT_ALPHA.md` stays as-is. v0.8 is a new file.
7. **Registry updates** — until CR-371 is done, use the existing manual method. Once CR-371 is CLOSED, all subsequent registry changes must use the script.

---

## 6. QUICK REFERENCE — KEY FILE PATHS

```
Agent prompt v0.7:        /app/memory/control/AGENT_PROMPT_ALPHA.md
Gap analysis (v0.8 input): /app/memory/control/AGENT_PROMPT_GAP_ANALYSIS_v0.8.md
Project baseline:          /app/memory/control/PROJECT_BASELINE_2026_09.md
Registry:                  /app/memory/control/registry.json
CR Registry:               /app/memory/control/CR_REGISTRY.md
Public routes:             /app/memory/control/PUBLIC_ROUTES.md
Intake docs (all 7):       /app/memory/change_requests/CR-368* through CR-372-B*
Jest evidence:             /app/memory/evidence/BASELINE-2026-09/
App.js:                    /app/frontend/src/App.js
Frontend .env:             /app/frontend/.env
Supervisor logs:           /var/log/supervisor/frontend.out.log
```

---

*End of handover. Start with CR-370. End with CR-369. The v0.8 prompt is the finish line.*
