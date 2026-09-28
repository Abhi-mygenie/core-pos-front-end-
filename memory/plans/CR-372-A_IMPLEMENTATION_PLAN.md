# CR-372-A — Gate 3: Implementation Plan
## Security: File Moves + .env Cleanup (Zero src/ changes)

**Doc:** `memory/plans/CR-372-A_IMPLEMENTATION_PLAN.md`
**Date:** 2026-09-08
**Role:** PLANNING (Gate 3) — inherits `impact/CR-372-A_IMPACT_ANALYSIS.md` (Gate 2)
**Risk:** LOW | **Sprint:** pos_audit_1 | **Owner decisions:** OD-CR372A-01..06 LOCKED (IA §5)
**Move list (authoritative):** `evidence/CR-372-A/move_list_html_2026_09_08.txt` (74 HTML paths, relative to `frontend/`)

---

## §1 — Scope Lock (R14)

**Files WILL change**
- `frontend/public/__dev/**` → `/app/memory/dev-dashboard/**` (15 files, `git mv`)
- 74 HTML per move list → `/app/memory/design_briefs/**` (subfolders `backend-briefs/`, `design-mockups/`, `downloads/` preserved)
- `frontend/public/pos5-sprint-tracker.xlsx` → `/app/memory/design_briefs/pos5-sprint-tracker.xlsx`
- `frontend/public/downloads/POS2_0_MANUAL_VALIDATION_TASK_TRACKER_2026_05_11.xlsx` + `downloads/contract_amendment_v1_1.pdf` → `/app/memory/design_briefs/downloads/`
- `frontend/.env` — delete 2 lines (`REACT_APP_CRM_API_KEYS=`, `CORS_ORIGINS=`)
- `memory/control/ENV_REGISTRY.md` — 2 rows PENDING REMOVAL → REMOVED
- `memory/control/OPEN_GAPS_REGISTER.md` — OG-AUDIT-001 already filed at planning (this session); implementation only updates its status note if needed
- Registries: `registry.json`, `control/CR_REGISTRY.md`, `control/CONTROL_DASHBOARD.md`, `PRD.md`

**Files WILL NOT touch**
`frontend/src/**` · `frontend/public/index.html` · `firebase-messaging-sw.js` · `public/sounds/**` · `public/training/**` · **`public/pms/**` (13)** · `public/cr358-p2-v3-mockup.html` · `public/cr358-p3-design-comparison.html` · `public/cr358-p4-pms-mockup.html` · `public/comparison_room_ui.html` · `public/MyGenie_PMS_Screen_Reference.pdf` · `frontend/craco.config.js` · `backend/**` · `control/AGENT_PROMPT_ALPHA.md` · `control/PUBLIC_ROUTES.md` · `/app/memory/final/*`

If any step needs a file outside this list → STOP, re-declare, get owner confirmation.

---

## §2 — Entry Verification (IMPLEMENTATION agent runs BEFORE any edit)

```bash
cd /app/frontend
[ "$(find public/__dev -type f | wc -l)" = 15 ]                                  || echo "STALE: __dev count"
[ "$(find public -name '*.html' | wc -l)" = 96 ]                                 || echo "STALE: html total"
[ "$(wc -l < /app/memory/evidence/CR-372-A/move_list_html_2026_09_08.txt)" = 74 ] || echo "STALE: move list"
while read f; do [ -f "$f" ] || echo "STALE: missing $f"; done < /app/memory/evidence/CR-372-A/move_list_html_2026_09_08.txt
grep -q "^REACT_APP_CRM_API_KEYS=" .env && grep -q "^CORS_ORIGINS=" .env          || echo "STALE: .env keys"
[ "$(wc -l < .env)" = 18 ]                                                       || echo "STALE: .env lines"
[ ! -e /app/memory/dev-dashboard ] && [ ! -e /app/memory/design_briefs ]          || echo "STALE: target exists"
grep -c "PENDING REMOVAL" /app/memory/control/ENV_REGISTRY.md   # expect 2
python3 -c "import json;d=json.load(open('/app/memory/control/registry.json'));i=[x for x in d['items'] if x['id']=='CR-372-A'][0];assert i['gate']=='3',i['gate'];print('registry gate 3 OK')"
```
Any `STALE` line → return to PLANNING (plan stale). Never print `.env` values.

---

## §3 — Edits (execution sequence)

All moves use `git mv` — `/app` is one git repo and `memory/` is tracked (331 files), so history is preserved and rollback is `git checkout -- frontend/public frontend/.env && rm -rf memory/dev-dashboard memory/design_briefs`.

| # | Edit | Command / change | Notes |
|---|---|---|---|
| E1 | Move dev dashboard | `cd /app && git mv frontend/public/__dev memory/dev-dashboard` | Directory move; 15 files incl. `data/*.json`. |
| E2 | Create brief dirs | `mkdir -p memory/design_briefs/backend-briefs memory/design_briefs/design-mockups memory/design_briefs/downloads` | |
| E3 | Move 74 HTML | `cd /app/frontend && while read f; do git mv "$f" "/app/memory/design_briefs/${f#public/}"; done < /app/memory/evidence/CR-372-A/move_list_html_2026_09_08.txt` | `${f#public/}` keeps subfolder. `index.html`, 4 carve-outs, `pms/`, `__dev/` are **not** in the list. |
| E4 | Move 3 non-HTML | `git mv public/pos5-sprint-tracker.xlsx /app/memory/design_briefs/` · `git mv public/downloads/POS2_0_MANUAL_VALIDATION_TASK_TRACKER_2026_05_11.xlsx public/downloads/contract_amendment_v1_1.pdf /app/memory/design_briefs/downloads/` | OD-CR372A-03 |
| E5 | Remove empty dirs | `rmdir public/backend-briefs public/design-mockups public/downloads` | Must be empty after E3/E4 — if `rmdir` fails, STOP (unexpected file). |
| E6 | `.env` L15 | `sed -i '/^REACT_APP_CRM_API_KEYS=/d' /app/frontend/.env` | Line-delete by key only; value never displayed. |
| E7 | `.env` L17 | `sed -i '/^CORS_ORIGINS=/d' /app/frontend/.env` | Result: 16 lines; `REACT_APP_BACKEND_URL` untouched (verify with `grep -c "^REACT_APP_BACKEND_URL=" .env` → 1). |
| E8 | Restart | `sudo supervisorctl restart frontend` | Required because `.env` changed. |
| E9 | `control/ENV_REGISTRY.md` L33 | `**PENDING REMOVAL — CR-372-A** (F-SEC-07). Still present in \`.env\` as of 2026-09-08.` → `**REMOVED 2026-09-08** (CR-372-A F-SEC-07)` | Row REACT_APP_CRM_API_KEYS |
| E10 | `control/ENV_REGISTRY.md` L34 | same replacement | Row CORS_ORIGINS |
| E11 | `control/ENV_REGISTRY.md` header | Bump "Last Updated" → `2026-09-08 (CR-372-A F-SEC-07: REACT_APP_CRM_API_KEYS + CORS_ORIGINS removed from frontend/.env)` | |
| E12 | `memory/dev-dashboard/README.md` | Prepend one line: `> Moved from frontend/public/__dev/ on 2026-09-08 (CR-372-A F-SEC-01). Not served from any URL — filesystem only.` | Marker for the relocated tree (R18 analogue). |
| E13 | `memory/design_briefs/README.md` (NEW) | 6-line note: origin `frontend/public/`, date, CR-372-A, PMS carve-outs still in `public/`, list of subfolders. | Marker + orientation for future agents. |

Checkpoint after E1–E5 (file group 1), after E6–E8 (group 2), after E9–E13 (group 3).

---

## §4 — Verification Matrix (inherited by IMPLEMENTATION self-test and QA)

| # | Edit | Check | Expected | Automated? |
|---|---|---|---|:---:|
| V1 | E1 | `test -d /app/frontend/public/__dev; echo $?` | `1` | YES |
| V2 | E1 | `find /app/memory/dev-dashboard -type f \| wc -l` | `15` | YES |
| V3 | E3 | `find /app/frontend/public -name "*.html" \| wc -l` | `18` | YES |
| V4 | E3+E4 | `find /app/memory/design_briefs -type f \| wc -l` (excluding README.md → `! -name README.md`) | `77` | YES |
| V5 | E4 | `find /app/frontend/public -name "*.xlsx" -o -name "*.pdf"` | only `public/MyGenie_PMS_Screen_Reference.pdf` | YES |
| V6 | E5 | `ls -d /app/frontend/public/*/` | `pms/ sounds/ training/` only | YES |
| V7 | E6/E7 | `cut -d= -f1 /app/frontend/.env \| grep -c "CRM_API_KEYS\|CORS_ORIGINS"`; `wc -l < .env`; `grep -c "^REACT_APP_BACKEND_URL=" .env` | `0` · `16` · `1` | YES |
| V8 | E8 | `tail -5 /var/log/supervisor/frontend.out.log` | contains `webpack compiled successfully` | YES |
| V9 | E1/E3 | `curl -s $PREVIEW/__dev/data/config.json \| grep -c 'id="root"'`; same for `/architecture-bible.html` | `1` and `1` (React shell fallback = file gone). Probed pre-move 2026-09-08: real files return content without `id="root"`. | YES |
| V10 | carve-outs | `curl -s $PREVIEW/pms/front-desk.html \| grep -c 'id="root"'`; `curl -s $PREVIEW/cr358-p4-pms-mockup.html \| grep -c 'id="root"'` | `0` and `0` (still served) | YES |
| V11 | runtime | `curl -s $PREVIEW/firebase-messaging-sw.js \| head -c 40`; `curl -s $PREVIEW/training/training-sdk.js \| head -c 40` | non-shell content | YES |
| V12 | scope | `cd /app && git status --short frontend/src backend/ frontend/craco.config.js frontend/public/index.html` | empty | YES |
| V13 | E9–E11 | `grep -c "PENDING REMOVAL" control/ENV_REGISTRY.md`; `grep -c "REMOVED 2026-09-08" control/ENV_REGISTRY.md` | `0` · `2` | YES |
| V14 | E12/E13 | `head -1 memory/dev-dashboard/README.md \| grep -c CR-372-A`; `test -f memory/design_briefs/README.md` | `1` · exists | YES |
| V15 | R20 | grep the CRM key value (read from git history of `.env`, never typed) across `impact/ plans/ handover/ change_requests/CR-372*` | `0` hits | YES |
| V16 | browser | Login → dashboard loads → open one PMS screen (`/pms/front-desk`) → no console 404 for `/sounds/*` or `/training/*` | PASS (screenshot) | NO |
| V17 | build | `cd /app/frontend && yarn build 2>&1 \| tail -3` then `find build -name "*.html" \| wc -l` and `ls build/__dev 2>&1` | build OK · `18` · "No such file" (CR-046 hook prints its log line harmlessly) | YES |

**Total: 17 checks (16 automated, 1 manual).**

---

## §5 — Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| A moved HTML was actually fetched at runtime | Very low — `grep` shows comments only, 0 test refs | Feature shows blank iframe | V12 + V16; rollback via `git checkout` |
| `git mv` fails on untracked file | Low — all 92 verified tracked (`git ls-files`) | Partial move | Entry check E0; use `mv` + `git add` for any untracked stragglers and note in handover |
| `.env` newline corruption | Low — `sed -d` only removes whole lines | Frontend fails to boot | V7 line count 16 + V8 compile |
| `REACT_APP_BACKEND_URL` accidentally altered | Very low | Preview breaks | V7 third check |
| Dev dashboard consumers (CR-371 script, prompt v0.7) point at old path | Certain | Stale process docs, not runtime | OG-AUDIT-001 filed; CR-371 plan must use new path |
| `rmdir` finds unexpected file in `downloads/` etc. | Low | Scope creep | STOP rule in E5 |

---

## §6 — Post-Code Registry Checklist (IMPLEMENTATION must execute)

```
- [ ] registry.json: CR-372-A → status "IMPLEMENTED — 92 files moved + 2 .env keys removed (2026-09-08)", gate "5a", completeness "5/7", code_reality "FULL", sprint_key pos_audit_1, artifact_refs += handover
- [ ] CR_REGISTRY.md: CR-372-A row → IMPLEMENTED (Gate 5a), counts 15 + 74 + 3 / −2 lines
- [ ] CONTROL_DASHBOARD.md: header line + Current Deployment note "dev dashboard now at /app/memory/dev-dashboard/ (filesystem only)"
- [ ] FILE_OWNERSHIP.md: N/A (no src/ files) — state in handover
- [ ] Code markers: N/A for moves; README markers E12/E13 stand in; ENV_REGISTRY rows carry "(CR-372-A F-SEC-07)"
- [ ] OPEN_GAPS_REGISTER.md: OG-AUDIT-001 remains OPEN (owned by CR-369); F-SEC-01/02/07 → note RESOLVED via CR-372-A in PROJECT_BASELINE cross-ref line of OG header
- [ ] PRD.md: Open Issues row F-SEC-01/02 → RESOLVED (CR-372-A)
- [ ] Session handover: handover/SESSION_HANDOVER_2026_09_08_CR372A_IMPL.md (4-line header format)
- [ ] Owner reminder: "Save to GitHub" after session so pms8sep receives the moves
```

---

## §7 — Execution Sequence Summary

```
E0 Entry verification (§2) → E1 __dev move → E2–E5 briefs + artifacts move + rmdir
→ checkpoint 1 (V1–V6) → E6–E8 .env + restart → checkpoint 2 (V7–V11)
→ E9–E13 docs → checkpoint 3 (V12–V15, V17) → V16 screenshot → §6 registry → EXIT GATE 5/5 → handover
```

Estimated: 1 session. Gate 4 GO required before E0 (OWNER APPROVAL MATRIX — env change).

---

*Planning agent | CR-372-A Gate 3 | 2026-09-08 | 13 edits · 92 file moves · −2 env lines · 0 src/ | 17 verification checks | Awaiting Gate 4 GO*
