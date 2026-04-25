# Deployment Handover — Core POS Frontend (mygenie)

## Latest deploy (read me first)
| Field | Value |
|------|-------|
| Date | 2026-04-25 |
| Branch | `roomv2` |
| Commit | `10ed08e Auto-generated changes` |
| Repo | https://github.com/Abhi-mygenie/core-pos-front-end-.git |
| Preview URL | https://sidebar-config-test.preview.emergentagent.com |
| Status | SUCCESS — login page renders, HTTP 200 from Cloudflare edge |

Previous deploys: see §8 changelog at the bottom.

---

## 1. Locked stack (do NOT change)
| Tool | Version |
|------|---------|
| Node | v20.20.2 |
| Yarn | 1.22.22 (classic) |
| React | 19.0.0 |
| CRACO | 7.1.0 |
| react-scripts | 5.0.1 |

**Package manager rule: yarn only.** `npm install` corrupts the lockfile and triggers peer-dep failures. Use `yarn`, `yarn install`, `yarn add`.

---

## 2. Repo layout the Emergent supervisor expects
Supervisor config (`/etc/supervisor/conf.d/supervisord.conf`) is **read-only** and hard-wired to:
- `frontend` → `directory=/app/frontend`, `command=yarn start` → CRACO on `0.0.0.0:3000`
- `backend`  → `directory=/app/backend`, `command=uvicorn server:app --port 8001` (autostart=true)
- `mongodb`, `code-server`, `nginx-code-proxy` → platform services

Because of this, when a frontend-only repo (this one) already contains a `frontend/` folder at its root, you **must clone the whole repo into `/app` itself** (not into a subdir), so the paths `/app/frontend` and `/app/backend` resolve naturally:

```
/app/
├── .emergent/         <-- platform folder, MUST be preserved across re-deploys
├── .git/              <-- from the new clone
├── frontend/          <-- React app (CRACO) — supervisor runs from here
├── backend/           <-- placeholder server.py shipped in repo (leave alone)
├── v1/ v2/ v3/        <-- design references shipped in repo (not code)
└── ...
```

---

## 3. Step-by-step recipe (copy/paste)

### 3.1 Confirm branch name with the user
Branch names in this repo are messy (30+ branches: `roomv1-`, `roomv2`, `13-Apirl-V1`, etc.). Spell-check before cloning:
```bash
git ls-remote --heads https://github.com/Abhi-mygenie/core-pos-front-end-.git | grep -i room
```

### 3.2 Stop services and preserve `.emergent`
```bash
sudo supervisorctl stop frontend backend
mv /app/.emergent /tmp/.emergent_backup
rm -rf /app/* /app/.git /app/.gitignore
```
Note: `/app` is a bind-mount; you can wipe its **contents** but not the directory itself. `.emergent/` MUST be backed up first — losing it breaks the Emergent preview/shell wiring.

### 3.3 Clone target branch directly into /app
```bash
cd /app
git clone --branch <BRANCH> --single-branch \
  https://github.com/Abhi-mygenie/core-pos-front-end-.git .
mv /tmp/.emergent_backup /app/.emergent
```
Sanity:
```bash
git branch                # * <BRANCH>
git log -1 --oneline
ls /app/frontend          # must contain package.json, craco.config.js, src/
```

### 3.4 Write `/app/frontend/.env`
Rules:
- No quotes around values, no spaces around `=`, no inline comments.
- `REACT_APP_CRM_API_KEYS` must be a single-line JSON string (no pretty-printing, no escaped quotes).
- Never delete protected keys (`REACT_APP_BACKEND_URL`, `WDS_SOCKET_PORT`).

Current verified values (2026-04-25):
```
REACT_APP_BACKEND_URL=https://sidebar-config-test.preview.emergentagent.com
WDS_SOCKET_PORT=443
ENABLE_HEALTH_CHECK=false
REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
REACT_APP_SOCKET_URL=https://presocket.mygenie.online
REACT_APP_FIREBASE_API_KEY=AIzaSyCvn7MctrSgULjgiHqQSl4QfeP3dWxITwY
REACT_APP_FIREBASE_AUTH_DOMAIN=mygenie-restaurant.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=mygenie-restaurant
REACT_APP_FIREBASE_STORAGE_BUCKET=mygenie-restaurant.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=969625631640
REACT_APP_FIREBASE_APP_ID=1:969625631640:web:2f2a2987f740b6fc8e09ed
REACT_APP_FIREBASE_MEASUREMENT_ID=G-WFK75QN54E
REACT_APP_FIREBASE_VAPID_KEY=BEvFMTX767yCa4YgfuPjfTyZGD0fp34WkWjW3SPDqS3NRRWSYfqT8m9TA4S-nssyqNG-EIJUu6WIA0MWJaouSUI
REACT_APP_CRM_BASE_URL=https://crm.mygenie.online/api
REACT_APP_CRM_API_KEYS={"364":"dp_live_...","475":"dp_live_...", ... full 15-tenant JSON ... }
REACT_APP_GOOGLE_MAPS_KEY=AIzaSyCS9rZcttTxbair3abltZ3Fm1vEnmY0mj4
```
The full `REACT_APP_CRM_API_KEYS` JSON (15 tenants: 364, 475, 478, 509, 510, 523, 541, 595, 635, 669, 675, 687, 699, 709, 716) is in the live `/app/frontend/.env`. Copy from there if you need to redeploy.

### 3.5 Install dependencies
```bash
cd /app/frontend && yarn install
```
~70–90s. The wall of deprecation/peer-dep warnings is **expected and harmless**:
- workbox-*, abab, q, stable, sourcemap-codec → upstream, ignore
- react-day-picker / recharts / eslint-plugin-flowtype / cosmiconfig-typescript-loader peer mismatches → tolerated by yarn classic, ignore

### 3.6 Start via supervisor (NEVER run `yarn start` yourself)
```bash
sudo supervisorctl start frontend
sleep 25
sudo supervisorctl status frontend
tail -n 30 /var/log/supervisor/frontend.out.log
```
Healthy state: log ends with `Compiled with warnings.` + `webpack compiled with 1 warning` (the `LoadingPage.jsx:101` exhaustive-deps warning is expected — leave it).

### 3.7 Smoke test
```bash
curl -sI http://localhost:3000 | head -5                          # HTTP/1.1 200
curl -sI <PREVIEW_URL> | head -5                                  # HTTP/2 200
```
Open the preview URL in a browser → Mygenie login screen (orange/green logo, Email/Password, green "LOG IN" button).

The black banner `"Frontend Preview Only. Please wake servers …"` at the bottom is **emitted by the Emergent platform**, not the app. It always appears for frontend-only deploys (the real backend is at `preprod.mygenie.online`, not on the preview URL). Ignore.

---

## 4. Things that WILL trip you up (battle-tested gotchas)

1. **Don't clone into a subdir.** Repo already has `frontend/` at its root; cloning into `/app/core-pos-front-end-` produces `/app/core-pos-front-end-/frontend` and supervisor can't find it. Always `git clone … .` into `/app`.

2. **Preserve `.emergent/`** before wiping `/app`. `.git/` from the new clone is fine to replace.

3. **Stale dev-cache races.** If supervisor starts BEFORE `yarn install` finishes, you'll see in `frontend.err.log`:
   - `craco: not found` — node_modules/.bin not yet linked
   - `ENOENT … node_modules/.cache/default-development/0.pack` — webpack cache half-written
   Fix: stop frontend, wait for install, start again. If the `.cache` error persists: `rm -rf /app/frontend/node_modules/.cache && sudo supervisorctl restart frontend`.

4. **VAPID key sanitisation.** Handover docs sometimes show the FCM VAPID key with junk prefixes (a stray `2`, tab characters, or even a value identical to the Firebase API key). Confirmed correct value as of 2026-04-25: `BEvFMTX767yCa4YgfuPjfTyZGD0fp34WkWjW3SPDqS3NRRWSYfqT8m9TA4S-nssyqNG-EIJUu6WIA0MWJaouSUI`. If web-push breaks first thing to recheck.

5. **CRM API keys JSON.** Single-line, no escapes, no trailing comma. Newlines or smart quotes silently break `JSON.parse` and CRM modules go blank with no obvious error.

6. **Branch names look identical.** `roomv1-` (trailing dash) ≠ `roomv1` (doesn't exist) ≠ `roomv2`. Always `git ls-remote --heads` and confirm with the requester before cloning.

7. **Backend left untouched.** This is a frontend-only deployment. The placeholder `/app/backend/server.py` shipped with the repo is unrelated to the actual API at `preprod.mygenie.online`. Don't try to "fix" it. Supervisor will autostart it on :8001 — the frontend ignores it. If you must keep it stopped after a container restart, only an override file in `/etc/supervisor/conf.d/` (separate filename, `autostart=false`) can do it; the main supervisord.conf is read-only.

8. **No npm. No tests. No "improvements".** Per deployment SOP: yarn only, do not run test suites, do not refactor, do not touch ESLint warnings, do not bump deps, do not commit anything.

9. **Hot reload works.** After first successful start, code changes from a `git pull` are picked up automatically. Restart supervisor only if you change `.env` or run `yarn add` / `yarn install`.

10. **`yarn start` runs `craco start`.** Don't replace with `react-scripts start` — CRACO config in `/app/frontend/craco.config.js` injects polyfills/aliases needed by the app.

---

## 5. Quick health checklist (8/8 = good to stop)

- [ ] `git -C /app branch` shows `* <expected-branch>`
- [ ] `/app/.emergent` exists
- [ ] `/app/frontend/.env` has all 17 vars, no quotes, no inline comments, single-line JSON for CRM keys
- [ ] `/app/frontend/node_modules/.bin/craco` exists
- [ ] `sudo supervisorctl status frontend` → RUNNING for >30s
- [ ] `tail /var/log/supervisor/frontend.out.log` ends with `webpack compiled with 1 warning`
- [ ] `curl -sI <PREVIEW_URL>` → 200
- [ ] Browser shows Mygenie login screen with logo, email/password fields, green LOG IN button

If all 8 are ticked: write your dated row in §8 and stop. Do NOT run testing agents. Do NOT modify code.

---

## 6. Known non-blocking warnings (do not fix)

- `src/pages/LoadingPage.jsx:101` — useEffect missing dep `loadStationData`. Cosmetic.
- Deprecated transitive packages: workbox-*, abab, q, stable, sourcemap-codec, jsdom subdeps. Upstream.
- Peer-dep mismatches: react-day-picker (wants react ≤18 / date-fns 2-3), recharts (wants react-is), eslint-plugin-flowtype, cosmiconfig-typescript-loader / ts-node. Tolerated by yarn classic.
- DeprecationWarning at runtime for `onAfterSetupMiddleware`, `onBeforeSetupMiddleware`, `Compilation.assets` from webpack-dev-server. Cosmetic.

---

## 7. Out of scope for this deployment

- Real backend health (`https://preprod.mygenie.online`) — not verified.
- Socket server (`https://presocket.mygenie.online`) — not verified.
- Firebase web-push end-to-end — not verified (only env value sanity-checked).
- CRM tenant API keys — not verified live, only written verbatim.
- Production build (`yarn build`) — not run; deployment uses the dev server (`yarn start`/`craco start`).

---

## 8. Deployment changelog

| Date | Branch | Commit | Preview URL | Notes |
|------|--------|--------|-------------|-------|
| 2026-04-23 | `main` | `4bd90a8` | https://sidebar-config-test.preview.emergentagent.com | Initial deploy. VAPID key was supplied wrong (matched Firebase API key); user provided corrected value during handover. Backend supervisor stopped manually (won't survive container restart). |
| 2026-04-25 | `roomv2` | `10ed08e` | https://sidebar-config-test.preview.emergentagent.com | Wiped `/app` (preserved `.emergent`), reclone into `/app`, yarn install OK, frontend up, login page renders. VAPID key cleaned (leading `2` + tab stripped). |

---

## 9. Useful one-liners

```bash
# Tail logs
tail -n 100 /var/log/supervisor/frontend.out.log
tail -n 100 /var/log/supervisor/frontend.err.log

# Restart after .env change
sudo supervisorctl restart frontend

# Rebuild deps
cd /app/frontend && yarn install

# Smoke test
curl -o /dev/null -w "%{http_code}\n" https://sidebar-config-test.preview.emergentagent.com/

# Check branch / commit currently deployed
git -C /app branch && git -C /app log -1 --oneline

# List remote branches (spell-check before cloning)
git ls-remote --heads https://github.com/Abhi-mygenie/core-pos-front-end-.git
```
