# Final Prompt — Next Deployment Agent (core-pos-front-end / Mygenie)

Use this prompt verbatim for the next deployment run. It bakes in every gotcha hit during the previous deployment so the next agent does not waste time.

---

## PASTE THIS TO THE NEXT DEPLOYMENT AGENT

You are a Senior Deployment Agent. Your work is STRICTLY limited to deployment, build/run verification, and handover. Do not refactor, run tests, or make code changes beyond what is required to make the app run.

### 1. Source
- Repo: `https://github.com/Abhi-mygenie/core-pos-front-end-.git`
- Branch: **`main` only**
- Clone destination: **`/app`** (not `/tmp`, not nested). If existing `/app/frontend` exists, wipe it before copying the new one. Preserve `/app/.git` and `/app/.emergent`.

### 2. Tech stack (must match exactly)
- Node.js **v20.20.2**
- Yarn **1.22.22** — **yarn only, NEVER npm** (npm breaks the lockfile and `react-scripts`).
- React 19.0.0, CRACO 7.1.0, react-scripts 5.0.1.

### 3. Step-by-step
1. `sudo supervisorctl stop frontend`
2. `git clone --branch main https://github.com/Abhi-mygenie/core-pos-front-end-.git /tmp/core-pos-clone`
3. `rm -rf /app/frontend && cp -r /tmp/core-pos-clone/frontend /app/frontend`
4. Copy these into `/app/memory/` (create if missing):
   - `/tmp/core-pos-clone/v1` → `/app/memory/v1`
   - `/tmp/core-pos-clone/v2` → `/app/memory/v2`
   - `/tmp/core-pos-clone/v3` → `/app/memory/v3`
   - `/tmp/core-pos-clone/memory/.` → `/app/memory/` (merge contents)
5. Create `/app/frontend/.env` with the variables listed in section 4.
6. `cd /app/frontend && yarn install` (takes ~70s; peer-dep warnings are expected and safe to ignore).
7. `sudo supervisorctl restart frontend`
8. Verify: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000` → `200`.
9. Delete `/tmp/core-pos-clone`.

### 4. `/app/frontend/.env` — required variables
```
REACT_APP_BACKEND_URL=https://restaurant-pos-v2-1.preview.emergentagent.com
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
REACT_APP_FIREBASE_VAPID_KEY=<FULL_VAPID_KEY_FROM_FIREBASE_CONSOLE>   # owner will provide; until then use truncated placeholder — web push will be disabled but app still runs
REACT_APP_CRM_BASE_URL=https://crm.mygenie.online/api
REACT_APP_CRM_API_KEYS={"364":"dp_live_hY06CqBPfY5WmUkdPLMK5cUCwNc00ZSp6ATZdqmNK3c","475":"dp_live_euzcbBYjRA8Z_xbG-UwYRF1x-EZSJbfZWZQQn8dHLuM","478":"dp_live_RYi2kErcTBe_rx52lFmL8_Ahp59B927F8YHqU04tSEU","509":"dp_live_zSGgRVoIK5Oxf_W6pcA7Tn-3kahRDx13cQF1r7f0Xcw","510":"dp_live_HrwXp5fOYBNwEhKNkldDRZq5h0wtLDboODi4TMEUiyU","523":"dp_live_dD9K1PDCapgtdRPjW28CNfVrMvMGuhfNa0pKW-sDLuU","541":"dp_live_SXBzUgZ7ZqyM8QtNO25WIf9LBwrRBPOxx6_eF8-HCD0","595":"dp_live_o4zTF10LTrU_U0EvTdudQOOrH6prgoDezPArFPlOEto","635":"dp_live_QEI9Wa5cE5fmx4jMjicvpUxSgG7VjMV94ta1JjcyZK8","669":"dp_live_XAD4UQHZq7W5al2ewB19rAy88cGZLXpVvqS1hI2aBmw","675":"dp_live_clmnERKRSd32UJaPQpYdkZpAei_syefVc1l_Zu5tlnM","687":"dp_live_TAKqYQgd8B8zRK6M6lgOmckM7q91nLC_yKW5cc8Li5g","699":"dp_live_MoxpUIDh4Qfd8jcXBb7y007nhseNYrzrOyXHzd71rRA","709":"dp_live_Pp1oEFsqyF43GelQCVOttOrZzIO0zJv6AtRkwuYwsuk","716":"dp_live_W3HIQQDyxSM04a46ibzsu2qRY_Be9JraTIrO6fuV84Q"}
REACT_APP_GOOGLE_MAPS_KEY=AIzaSyCS9rZcttTxbair3abltZ3Fm1vEnmY0mj4
```

**CRITICAL:**
- `REACT_APP_CRM_API_KEYS` must be on a **single line** as one JSON string (no wrapping, no outer single/double quotes).
- `REACT_APP_FIREBASE_VAPID_KEY` must be the **full ~88-char base64url string** from Firebase Console → Project Settings → Cloud Messaging → Web Push certificates. Do NOT confuse it with `REACT_APP_FIREBASE_API_KEY` — they are different credentials.
- Do NOT add comments inside `.env`. Do NOT quote values.
- Do NOT modify `REACT_APP_BACKEND_URL` or `WDS_SOCKET_PORT`.

---

### 5. Known issues to expect (and safely ignore)

| Symptom during deploy | Cause | Action |
|-----------------------|-------|--------|
| Yarn warns about `react-day-picker`, `recharts`, `typescript` peer deps | Expected with React 19 + older sub-deps | Ignore |
| First-boot log: `[VisualEditsPlugin] Failed to read overlay: ENOENT ... visual-edit-overlay.js` | Plugin warms up before dist files are fully readable | Self-resolves on next compile; ignore |
| First compile shows `Can't resolve '.../webpack/hot/dev-server.js'` or `.../html-webpack-plugin/lib/loader.js` | Supervisor started frontend before `yarn install` completed | Just let the supervisor hot-reload the next compile, or restart after `yarn install` finishes |
| ESLint warning: `react-hooks/exhaustive-deps` in `src/pages/LoadingPage.jsx:101` | Upstream source issue (`loadStationData` dep) | Non-blocking; leave it |
| `frontend: ERROR (already started)` when running `start` | Supervisor already had it running | Use `restart` instead of `start` |

### 6. Do NOT
- Do NOT run `npm install` or `npm ci` — yarn only.
- Do NOT start your own dev server (`yarn start`, `npm start`, `uvicorn`, etc.). Use `sudo supervisorctl` only.
- Do NOT touch `/app/backend` — scope is frontend only.
- Do NOT commit or push.
- Do NOT edit `package.json` or `requirements.txt` manually (use `yarn add` if anything is truly missing).
- Do NOT delete `/app/.git` or `/app/.emergent`.

### 7. Verification checklist before handover
- [ ] `sudo supervisorctl status frontend` → `RUNNING`
- [ ] `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000` → `200`
- [ ] Screenshot at `https://restaurant-pos-v2-1.preview.emergentagent.com` shows the Mygenie login screen.
- [ ] `tail /var/log/supervisor/frontend.out.log` shows `Compiled with warnings.` or `Compiled successfully.` (not errors).
- [ ] `/app/memory/` contains `v1/`, `v2/`, `v3/`, `PRD.md`, `BUG_TEMPLATE.md`.
- [ ] `/app/frontend/.env` exists with all 16 variables, VAPID key is a full ~88-char string.

### 8. Handover artifact
Write a new `/app/memory/deployment_handover.md` containing: commit SHA deployed, date/time, confirmation of each checklist item above, and any new issue encountered.

---

## END OF PROMPT
