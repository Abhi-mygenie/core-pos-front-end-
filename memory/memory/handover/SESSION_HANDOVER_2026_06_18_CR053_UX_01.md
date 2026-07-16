# SESSION HANDOVER — 2026-06-18 — CR-053 + CR-053-UX-01

**Session type:** PLANNING → IMPLEMENTATION
**Active CRs:** CR-053 (parent), CR-053-UX-01 (this session's pivot), CR-054 (Phase 2 placeholder)
**Owner Gate 4:** GIVEN (this session)
**Result:** Phase 1 (Read-and-Explore Tour) implementation COMPLETE — awaiting browser walkthrough by owner with real staff login

---

## 1. Headline

The training tour has been re-architected from "scripted click-through on live data" to a **Read-and-Explore Tour**. Staff can perform safe UI actions (open forms, navigate) to see their real menu live, but the tour never asks them to Save / Delete / Toggle. All 13 missions encoded, SDK rebuilt, deployed. Zero POS source files touched.

---

## 2. What changed this session (with explicit source-file persistence)

> **Note:** every entry below names the source file the fix lives in. This is the new persistence rule from `OG-CR053-FIX-PERSISTENCE-AUDIT`.

| # | Change | File where it lives | Verified |
|:--:|---|---|:--:|
| 1 | Replaced 12-mission "click-through" course with 13-mission Read-and-Explore tour | `/app/training-backend/seed/seed_menu_management.py` (full rewrite) + DB reseeded | ✅ DB: course v2, 13 missions, 59 steps |
| 2 | New `step_type` field per step: highlight / explore / for_real | `seed_menu_management.py` (every step) | ✅ DB query confirms types present |
| 3 | Backend `/me` returns `mission_status` map for per-mission picker | `/app/training-backend/routes/progress.py` (lines 114-138 + return block) | ✅ training-backend restarted; field returned |
| 4 | Replaced silent auto-chain with explicit mission picker | `/app/training-sdk/src/dashboards/TrainingHome.jsx` (CourseGrid + MissionPicker split) | ✅ Bundle rebuilt |
| 5 | Added stuck-detector watchdog (target absent >3.5s → RecoveryCard) | `/app/training-sdk/src/overlay/MissionExecutor.jsx` (lines 32-60) | ✅ Bundle rebuilt |
| 6 | New RecoveryCard component (Take me to Menu / Let me look / Skip / End) | `/app/training-sdk/src/overlay/RecoveryCard.jsx` (NEW FILE) | ✅ Bundle rebuilt |
| 7 | Added "I'm stuck" button in TopBar | `/app/training-sdk/src/overlay/TrainingTopBar.jsx` (lines 60-80) | ✅ Bundle rebuilt |
| 8 | Added persistent tutorial banner ("🎓 for learning only") | `/app/training-sdk/src/overlay/MissionExecutor.jsx` (lines 125-138) | ✅ Bundle rebuilt |
| 9 | Step-type badges in tooltip (👀 Look here / 👆 Try it / 📖 Read only) | `/app/training-sdk/src/overlay/InstructionTooltip.jsx` (STEP_TYPE_BADGE map + render) | ✅ Bundle rebuilt |
| 10 | PulseRing color prop (green for highlight/explore, amber for for_real) | `/app/training-sdk/src/overlay/PulseRing.jsx` (color prop + hexToRgb helper) | ✅ Bundle rebuilt |
| 11 | "Now try it" dismissable checklist on completion | `/app/training-sdk/src/overlay/CompletionScreen.jsx` (localStorage key `training_now_try_it_dismissed`) | ✅ Bundle rebuilt |
| 12 | TrainingProvider new methods: `openMissionPicker`, `retourMission`, `reportStuck`, `recoverGoToMenu`; `finishMission` no longer auto-chains | `/app/training-sdk/src/TrainingProvider.jsx` (full rewrite) | ✅ Bundle rebuilt |
| 13 | Rebuilt SDK bundle | `/app/frontend/public/training/training-sdk.js` (296 KB) | ✅ Browser confirms `[Training SDK] Mounted successfully` |

---

## 3. Files touched — audit (training-only ✅)

```
M  frontend/public/training/training-sdk.js   (rebuilt bundle)
M  training-backend/routes/progress.py         (mission_status field)
M  training-backend/seed/seed_menu_management.py (full rewrite)
M  training-sdk/src/TrainingProvider.jsx
M  training-sdk/src/dashboards/TrainingHome.jsx
M  training-sdk/src/overlay/CompletionScreen.jsx
M  training-sdk/src/overlay/InstructionTooltip.jsx
M  training-sdk/src/overlay/MissionExecutor.jsx
M  training-sdk/src/overlay/PulseRing.jsx
M  training-sdk/src/overlay/TrainingTopBar.jsx
?? training-sdk/src/overlay/RecoveryCard.jsx   (NEW)
?? training-sdk/yarn.lock                        (yarn install)
?? frontend/yarn.lock                            (existing — yarn install during phase A)
```

Files NOT touched (per CR-053-UX-01 mandate):
- `/app/frontend/src/**` — POS source (zero files)
- `/app/backend/server.py` — POS backend (zero changes)
- `/app/training-backend/server.py`, models, middleware (only `routes/progress.py` modified)
- `/app/frontend/public/index.html` — already had training-root + script tag from prior session

---

## 4. Mission catalog (canonical)

13 missions total: M1-M10 + M11 + M11+ (optional) + M12. 59 steps.

| # | Mission | Steps | Optional | Time |
|:--:|---|:--:|:--:|:--:|
| M1 | Navigate to Menu Management | 3 | No | 1m |
| M2 | Browse Categories | 4 | No | 2m |
| M3 | View Menu Items | 3 | No | 2m |
| M4 | Add a New Menu Item | 7 | No | 4m |
| M5 | Edit an Existing Item | 6 | No | 3m |
| M6 | Quick Edit (Price & Name) | 4 | No | 2m |
| M7 | Set Food Type | 5 | No | 2m |
| M8 | Toggle Item Availability | 3 | No | 1m |
| M9 | Delete a Menu Item | 5 | No | 2m |
| M10 | Add Item Variations | 6 | No | 4m |
| M11 | Bulk Edit Intro | 4 | No | 3m |
| M11+ | Bulk Editor Deep Dive | 4 | **Yes** | 4m |
| M12 | Create a New Category | 5 | No | 2m |

Canonical text: `/app/memory/handover/CR_053_UX_01_MISSIONS_DRAFT.md`.

---

## 5. Operational state

### Services
- POS backend (`/app/backend`) — supervisor-managed on :8001 ✅
- POS frontend (`/app/frontend`) — supervisor-managed on :3000 ✅
- Training backend (`/app/training-backend`) — `nohup uvicorn` on :8002 ✅ (NOT supervisor-managed — see `OG-CR053-SUPERVISOR-WRAP`)
- MongoDB — local :27017, db `mygenie_training` ✅
- Proxy verified: `<PREVIEW_URL>/api/training/health` → 200

### How to restart training-backend on a fresh pod
```bash
cd /app/training-backend && nohup /root/.venv/bin/uvicorn server:app \
  --host 0.0.0.0 --port 8002 \
  > /var/log/training/training-backend.out.log \
  2> /var/log/training/training-backend.err.log &
```

### How to reseed Menu Management course
```bash
cd /app/training-backend && /root/.venv/bin/python seed/seed_menu_management.py
```

### How to rebuild SDK after source change
```bash
cd /app/training-sdk && yarn build
cp dist/training-sdk.js /app/frontend/public/training/training-sdk.js
```

---

## 6. What the next session must do (priority order)

### P0 — Owner walkthrough in browser (real staff login required)
1. Open POS preview URL → log in with real staff account (no test creds — pre-prod is owner-managed)
2. Click 🎓 FAB bottom-right → Training Academy opens
3. Click "Menu Management" course card → mission picker shows 13 missions
4. Walk M1 → M12 in order, verifying:
   - Tutorial banner visible at top ("🎓 Tutorial mode — for learning only")
   - Each step's tooltip shows the right badge (👀 / 👆 / 📖)
   - Highlight steps auto-advance after countdown
   - Explore steps wait for user click on the highlighted element
   - For-real steps auto-advance and clearly say "don't click"
   - Back-arrow steps (M4 s7, M5 s6, M10 s6) target the form back arrow
   - Stuck-detector fires if target absent for 3.5s
   - "I'm stuck" button in topbar opens RecoveryCard
   - CompletionScreen shows "Now try it" checklist with Don't show again
   - After completion, returns to mission picker (not silent auto-chain)
   - Completed missions show "Re-tour" button
   - Optional M11+ doesn't gate course completion

### P1 — If any selector misfires (common cause: live POS markup differs from grep)
- Capture which mission/step failed
- Use stuck-detector "Skip this step" to continue
- Fix the selector in `seed_menu_management.py` (each step has `target` and `validate.value`)
- Re-run seed script + clear progress: `mongosh mygenie_training --eval 'db.training_progress.deleteMany({})'`

### P2 — Staff Dashboard (deferred from CR-053 P1)
- Code exists at `/app/training-sdk/src/dashboards/StaffDashboard.jsx`
- Untested in browser
- Owner/Manager view: KPI strip + employee progress table

### P3 — Begin CR-054 intake
- Read `/app/memory/change_requests/CR_054_TRAINING_SANDBOX_INTAKE.md`
- Schedule workshop to answer the 10 open intake questions
- Do NOT design / code until intake completes

---

## 7. Open gaps (current state)

See `/app/memory/control/OPEN_GAPS_REGISTER.md`. CR-053-related:

- `OG-CR053-SUPERVISOR-WRAP` (P2) — training-backend not under supervisor; manual start each pod boot
- `OG-CR053-FIX-PERSISTENCE-AUDIT` (P1) — process rule now in force (this handover follows it)
- `OG-CR053-PHASE2-SANDBOX` (P2) — Phase 2 = CR-054
- `OG-CR053-SEED-IDEMPOTENCY` (P3) — no schema version guard on reseed
- `OG-CR053-NO-TRAINING-CONFIG-SEED` (P3) — `training_restaurant_config` empty
- `OG-CR053-BACK-ARROW-SELECTOR` (P3) — NEW this session — structural selector for form back arrow; brittle if POS markup reorders
- `OG-CR053-MULTILINGUAL` (P3) — NEW this session — English-only v1

No blockers. All P3 gaps are documented and have acceptable workarounds.

---

## 8. Decisions / rationale

- **Why Read-and-Explore over pure Observation?** Static screenshots were needed for steps describing form internals, but screenshots become stale and don't match user's real data. Safe Explore clicks (open form, navigate) keep the tour live and personalised with zero data-write risk.
- **Why explicit mission picker over auto-chain?** Auto-chain made it impossible to know what was happening when state got out of sync. Explicit picker = predictable.
- **Why stuck-detector?** Closes the worst UX in v1 ("click the highlighted element" with no highlight). Now always has a graceful out.
- **Why For-real read-only steps?** Save/Delete/Toggle are explained but never performed during tour. User sees the button highlighted in amber so they know exactly which one does the real action — but it's clearly marked "don't click."
- **Why split M11?** Bulk Edit is genuinely two skill levels — basic editing (everyone) and Excel import/export (power users). 4+4 steps is more digestible than 6 in one mission.

---

## 9. References

- Approved missions draft: `/app/memory/handover/CR_053_UX_01_MISSIONS_DRAFT.md`
- CR-054 intake placeholder: `/app/memory/change_requests/CR_054_TRAINING_SANDBOX_INTAKE.md`
- Open gaps: `/app/memory/control/OPEN_GAPS_REGISTER.md`
- PRD: `/app/memory/PRD.md`
- Previous handover: `/app/memory/handover/SESSION_HANDOVER_2026_06_18_CR053.md`

---

**Handover prepared by:** IMPLEMENTATION agent (CR-053-UX-01 cycle)
**Awaiting:** Owner walkthrough verification in browser with real staff credentials
