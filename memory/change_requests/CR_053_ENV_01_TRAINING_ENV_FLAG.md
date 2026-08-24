# CR-053-ENV-01 — Training SDK Master Env Switch (`REACT_APP_TRAINING_ENABLED`)

**Status:** PLANNING COMPLETE — Gates 0, 1, 2, 3 done. **IMPLEMENTED 2026-06-18.** All 9 verification scenarios passed (V1-V9). Owner Gate-4 GO received via "go" on 2026-06-18.
**Created:** 2026-06-18
**Created by:** Planning Agent
**Parent CR:** CR-053 (Training Academy)
**Sibling CRs:** CR-053-UX-01 (Read-and-Explore Tour), CR-054 (Training Sandbox Mode placeholder)
**Priority:** P1 — environment safety / production-readiness guard
**Risk:** LOW — purely additive, defaults to "off" on missing/wrong env value
**Effort estimate:** 15-30 min from GO to verified

---

## Gate 0 — Registered

| Field | Value |
|---|---|
| CR ID | CR-053-ENV-01 |
| Title | Training SDK Master Env Switch |
| Class | CR (small, single-feature) |
| Severity | P1 |
| Owner ask | "Add the REACT_APP_TRAINING_ENABLED flag first (1 hr). Plan this." (2026-06-18) |
| Source | Owner directive following decision to disable training FAB pending pivot work |

---

## Gate 1 — Intake

### Description
Currently, the training SDK loads in every environment whenever the `<script>` tag is uncommented in `frontend/public/index.html`. This means there is **no per-environment kill-switch** — once enabled, training appears everywhere it's deployed.

We want a frontend-level boolean env var that controls whether the SDK loads at all. Default = off. Owner flips per environment when ready.

### In scope
- Single env var: `REACT_APP_TRAINING_ENABLED`
- Acceptable values: `"true"` (case-sensitive, enables) or anything else (disables)
- Build-time substitution in `index.html` (CRA standard pattern)
- Default behaviour when var is unset or wrong value = **off** (safe default)

### Out of scope
- Per-restaurant gating (use `training_restaurant_config` MongoDB collection — separate follow-up)
- Per-employee-role gating (separate follow-up)
- Backend `/api/training/*` blocking when flag is off (frontend-only gating is sufficient for v1 — backend simply gets no traffic)
- Runtime flag flipping without rebuild (would require `env.js` loader pattern — separate follow-up if needed)

### Owner-confirmed decisions (intake answers)
| # | Question | Decision |
|---|---|---|
| Q1 | Which approach: build-time substitution / runtime env.js / backend-rewriting? | **A — Build-time substitution** |
| Q2 | Default value in this pod (preview/pre-prod)? | **`false` (off)** |
| Q3 | Strict equality to lowercase `"true"` or be lenient (`1`, `True`, `yes`)? | **Strict — only the literal string `"true"` enables. Anything else = off.** (Documented for owner; misconfigurations fail safe.) |
| Q4 | Should `REACT_APP_TRAINING_ENABLED` be added to all environments now or only this pod? | **This pod first. Other envs get the flag in their respective `.env` files when deployed.** |
| Q5 | Re-enable the current commented-out `<script>` tag while wiring the flag? | **Yes — the new conditional loader replaces the commented-out tag entirely.** |

### Severity rationale
P1 because: training inadvertently appearing in production = risk of staff confusion / inadvertent menu changes if Sandbox Mode (CR-054) isn't yet built. The flag is a production-safety guard.

### Duplicate / collision check
- Existing env vars in `frontend/.env`: `REACT_APP_BACKEND_URL`, `REACT_APP_API_BASE_URL`, `REACT_APP_SOCKET_URL`, `REACT_APP_FIREBASE_*`, `REACT_APP_CRM_BASE_URL`, `WDS_SOCKET_PORT`, `ENABLE_HEALTH_CHECK`. No collision with `REACT_APP_TRAINING_ENABLED`.
- ENV_REGISTRY at `/app/memory/control/ENV_REGISTRY.md` — needs an entry added.

### Evidence
- Current `index.html` line 20 (commented out): `<!-- <script src="/training/training-sdk.js" defer></script> -->`
- Current `frontend/.env`: no `REACT_APP_TRAINING_ENABLED` entry
- Browser verified clean (no FAB, no SDK script) after disable

---

## Gate 2 — Impact Analysis

### Affected files / blast radius

| File | Today | Will change | Change type |
|---|---|---|---|
| `frontend/.env` | No flag | Append one line | ADD env var |
| `frontend/public/index.html` line 19-21 | Commented-out `<script>` tag | Replace with conditional inline loader using `%REACT_APP_TRAINING_ENABLED%` | REPLACE |
| `memory/control/ENV_REGISTRY.md` | No entry | Add entry for the new flag | ADD |
| `memory/control/CR_REGISTRY.md` | No row for CR-053-ENV-01 | Add row | ADD |
| `memory/control/OPEN_GAPS_REGISTER.md` | No closure note | Add `OG-CR053-ENV-GATING` (gap closure) | ADD |

### Files explicitly NOT touched
- Anywhere in `/app/frontend/src/**` (POS application code)
- `/app/backend/server.py` (proxy stays — handles 0 traffic when flag off)
- `/app/training-sdk/**` (SDK source — just doesn't get loaded)
- `/app/training-backend/**` (server keeps running idle on :8002)
- `/app/frontend/yarn.lock`, `package.json` (no new dependencies)
- `/app/frontend/public/training/training-sdk.js` (bundle untouched)

### Risk classification — LOW

| Risk vector | Severity | Mitigation |
|---|:--:|---|
| Env var typo → SDK loads when it shouldn't | 🟢 LOW | Strict `=== 'true'` comparison. Anything else (`True`, `1`, missing) = off. Safe-fail by design. |
| Env var typo → SDK doesn't load when expected | 🟢 LOW | Owner verifies with curl after each flip. Documented in this CR. |
| Forget to restart frontend after flag change | 🟡 MEDIUM | Document explicitly in this CR + the env registry entry. CRA env vars are read at build/start time, not at runtime. |
| Build-time substitution leaks env var into the served HTML | 🟢 LOW | The value is literally the string `"true"` or `"false"` (or other) — no secret leakage, no sensitive data, just a UI gating flag |
| Browser caching old HTML after flag flip | 🟢 LOW | Service worker / CDN cache could delay propagation — owner does hard-refresh after flip. Standard CRA caveat. |
| Training backend reachable even when flag off | 🟢 LOW | The backend remains reachable, but no client calls it. Acceptable — defense-in-depth gating at backend is a separate follow-up. |

### Dependencies
- CRA env-var substitution must work in the current build pipeline — VERIFIED, CRACO doesn't break it.
- Frontend supervisor restart is the standard way to pick up env changes — already in place.

### Class of issue — generalisable lesson
> "Feature flags belong in the env, not the source." If we'd had this from day 1 of CR-053, we wouldn't have hit the "training shows up everywhere unconditionally" issue. Going forward, any new module that mounts into POS should ship with an env switch.

---

## Gate 3 — Implementation Plan

### Implementation steps (in order)

| # | Action | File | Detail |
|:--:|---|---|---|
| 1 | Append flag with default `false` | `/app/frontend/.env` | `REACT_APP_TRAINING_ENABLED=false` |
| 2 | Replace commented-out script with conditional inline loader | `/app/frontend/public/index.html` (lines 19-21) | See exact diff below |
| 3 | Add entry to env registry | `/app/memory/control/ENV_REGISTRY.md` | Document the new flag |
| 4 | Add CR row to CR registry | `/app/memory/control/CR_REGISTRY.md` | Single-row entry under Training Academy section |
| 5 | Update OPEN_GAPS to mark gating addressed | `/app/memory/control/OPEN_GAPS_REGISTER.md` | New entry: OG-CR053-ENV-GATING (closes initial concern) |
| 6 | Restart frontend | bash | `sudo supervisorctl restart frontend` |
| 7 | Verify with curl | bash | `curl <PREVIEW_URL>/ | grep training-sdk` → script src NOT injected |
| 8 | Verify in browser | screenshot | No FAB present after login (or login screen if no auth) |

### Exact diff for `index.html`

```diff
        <div id="training-root"></div>
-       <!-- CR-053 Training SDK temporarily disabled — re-enable by uncommenting the script tag below -->
-       <!-- <script src="/training/training-sdk.js" defer></script> -->
+       <!-- CR-053-ENV-01: Training SDK loads only when REACT_APP_TRAINING_ENABLED=true -->
+       <script>
+         (function() {
+           if ('%REACT_APP_TRAINING_ENABLED%' === 'true') {
+             var s = document.createElement('script');
+             s.src = '/training/training-sdk.js';
+             s.defer = true;
+             document.head.appendChild(s);
+           }
+         })();
+       </script>
```

### Exact diff for `frontend/.env`

```diff
 REACT_APP_CRM_BASE_URL=https://crm.mygenie.online/api
+REACT_APP_TRAINING_ENABLED=false
```

### Verification matrix (post-implementation)

| # | Scenario | Verification | Expected |
|:--:|---|---|:--:|
| V1 | Flag `false`, frontend restarted | `curl <PREVIEW>/ \| grep "training-sdk"` | Script src NOT in injected HTML (only the if-statement) |
| V2 | Flag `false`, browser visit after login | DevTools Network tab | No request to `/training/training-sdk.js` |
| V3 | Flag `false`, browser visit | DevTools Elements | No `<div id="training-fab">` |
| V4 | Flip flag to `true` in `.env`, restart frontend | `curl <PREVIEW>/ \| grep "training-sdk"` | Script src DOES get injected on page load (verified via DevTools, not curl, since injection happens client-side) |
| V5 | Flag `true`, browser after login | DevTools Network | `/training/training-sdk.js` loaded; FAB appears |
| V6 | Remove flag from `.env` entirely, restart | curl + browser | Same as V1 — safe default = off |
| V7 | Set flag to `"True"` or `"1"`, restart | curl + browser | Same as V1 — strict equality fails, safe default = off |
| V8 | Toggle V1↔V5 several times | All transitions | Behaviour matches state each time |
| V9 | POS login + Menu Management + place an order — both flag states | manual smoke | No POS regression in either state |

### Owner-visible behaviour after this ships

**With flag `false` (this pod's default):**
- Open POS, log in, use everything normally
- No 🎓 FAB anywhere
- No training-related network calls
- Training backend on :8002 keeps running but receives zero traffic from this POS

**With flag `true` (when owner is ready):**
- One-line edit + `supervisorctl restart frontend`
- 🎓 FAB appears bottom-right after login
- Training Academy + 13-mission Read-and-Explore tour available
- Owner can flip back to `false` any time

### Rollback plan (if anything weird happens)

```bash
# Set flag back to false in .env
sed -i 's/REACT_APP_TRAINING_ENABLED=true/REACT_APP_TRAINING_ENABLED=false/' /app/frontend/.env
sudo supervisorctl restart frontend
```

That's it — single-line rollback. The conditional loader itself is harmless when flag is false (just a 5-line no-op IIFE).

### Gate 4 — Owner GO checklist

- [ ] Approach **A (build-time substitution)** confirmed?
- [ ] Default value **`false` in this pod** confirmed?
- [ ] Strict equality to `"true"` (no `True`/`1`/`yes`) acceptable?
- [ ] OK to also re-enable the commented-out script (replaced by the conditional loader)?
- [ ] Anything else?

---

## Post-ship checklist (IMPLEMENTATION agent will action these)

- [ ] File markers `// CR-053-ENV-01:` on both touched files
- [ ] `/app/memory/PRD.md` — add note under "What's been implemented" → CR-053-ENV-01 section
- [ ] Update session handover with persistence note (per `OG-CR053-FIX-PERSISTENCE-AUDIT` rule)
- [ ] No new gaps expected; this CR *closes* the env-gating gap

---

## Follow-up CRs (NOT in scope of this one)

| Future CR | Goal | Trigger |
|---|---|---|
| CR-053-ENV-02 | `REACT_APP_TRAINING_ALLOWED_RESTAURANTS=541,1023` allowlist | When some restaurants get training before others |
| CR-053-ENV-03 | `REACT_APP_TRAINING_ALLOWED_ROLES=owner,manager` role gating | When training shouldn't be visible to cashiers/waiters |
| CR-053-ENV-04 | Backend `/api/training/*` returns 404 when env-disabled | Defense-in-depth (gate also at backend) |
| CR-053-ENV-05 | Runtime `env.js` loader pattern | If owner wants to flip flag without rebuild |

These are all stand-alone, ~30-60 min each, layer on top of this CR cleanly. None blocking for current work.
