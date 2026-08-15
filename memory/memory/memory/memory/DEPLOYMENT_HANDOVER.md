# Deployment Handover Note — Core POS Frontend

## 1. Summary
- React frontend from `https://github.com/Abhi-mygenie/core-pos-front-end-.git` (branch `24-may`) was cloned and deployed into `/app`.
- All required env variables were configured.
- Dependencies installed strictly with **yarn 1.22.22** (no npm used).
- Supervisor `frontend` program is `RUNNING` and serving HTTP 200 both locally (`http://localhost:3000`) and on the public URL.
- Webpack/CRACO build compiled successfully (1 non-blocking ESLint warning, no errors).
- Login page (Mygenie) renders correctly in the browser.

## 2. Source / Branch
- Repo: `https://github.com/Abhi-mygenie/core-pos-front-end-.git`
- Branch: `24-may`
- Clone destination: contents pulled directly into `/app` (all root folders: `backend/`, `frontend/`, `memory/`, `test_reports/`, `tests/`, plus `README.md`, `.gitignore`, `.gitconfig`, `test_result.md`).
- Platform `.git` and `.emergent` folders inside `/app` were preserved (the new repo's own `.git` was not overwritten on top — platform tracking is intact).

## 3. Tech Stack (as deployed)
- Node.js: v20.20.2
- Yarn: 1.22.22
- React: 19.0.0
- CRACO: 7.1.0
- Build target: dev server via `craco start` (supervisor-managed)

## 4. Deployment Steps Executed
1. `git clone --branch 24-may` of the repo into a staging dir.
2. Cleaned existing `/app` non-platform files (kept `.git` & `.emergent`).
3. Copied all repo folders/files into `/app`.
4. Created `/app/frontend/.env` with the variables in section 5.
5. `cd /app/frontend && yarn install --network-timeout 600000` → completed successfully (lockfile generated).
6. `sudo supervisorctl restart frontend` → service RUNNING.
7. Verified:
   - `curl http://localhost:3000/` → HTTP 200
   - `curl https://insights-phase.preview.emergentagent.com/` → HTTP 200
   - Playwright screenshot showed login page rendered correctly.

## 5. Frontend Environment Variables (`/app/frontend/.env`)
| Key | Value |
|---|---|
| `REACT_APP_BACKEND_URL` | `https://insights-phase.preview.emergentagent.com` |
| `WDS_SOCKET_PORT` | `443` |
| `ENABLE_HEALTH_CHECK` | `false` |
| `REACT_APP_API_BASE_URL` | `https://preprod.mygenie.online/` |
| `REACT_APP_SOCKET_URL` | `https://presocket.mygenie.online` |
| `REACT_APP_FIREBASE_API_KEY` | `AIzaSyCvn7MctrSgULjgiHqQSl4QfeP3dWxITwY` |
| `REACT_APP_FIREBASE_AUTH_DOMAIN` | `mygenie-restaurant.firebaseapp.com` |
| `REACT_APP_FIREBASE_PROJECT_ID` | `mygenie-restaurant` |
| `REACT_APP_FIREBASE_STORAGE_BUCKET` | `mygenie-restaurant.firebasestorage.app` |
| `REACT_APP_FIREBASE_MESSAGING_SENDER_ID` | `969625631640` |
| `REACT_APP_FIREBASE_APP_ID` | `1:969625631640:web:2f2a2987f740b6fc8e09ed` |
| `REACT_APP_FIREBASE_MEASUREMENT_ID` | `G-WFK75QN54E` |
| `REACT_APP_FIREBASE_VAPID_KEY` | `BEvFMTX767yCa4YgfuPjfTyZGD0fp34WkWjW3SPDqS3NRRWSYfqT8m9TA4S-nssyqNG-EIJUu6WIA0MWJaouSUI` |
| `REACT_APP_CRM_BASE_URL` | `https://insights-phase.preview.emergentagent.com/api` |

Note on env values:
- `REACT_APP_BACKEND_URL` was given as `https://insights-phase.preview.emergentagent.com/` (with trailing slash). Stored without trailing slash to avoid double-slash issues in axios calls. If the next agent prefers the exact original value, append `/`.

## 6. Supervisor Status (at handover)
```
backend                          RUNNING
code-server                      RUNNING
frontend                         RUNNING
mongodb                          RUNNING
nginx-code-proxy                 RUNNING
```

## 7. Known Non-Blocking Warnings (FYI only — no action taken per scope)
- ESLint warning in `src/components/order-entry/OrderEntry.jsx:1297` (`react-hooks/exhaustive-deps`, `printOrder` dep). Compiles fine.
- One-time stale webpack cache error at first boot (`node_modules/.cache/default-development/0.pack`) — self-recovered on the next compile cycle; current process is healthy.
- `[VisualEditsPlugin] Failed to read overlay: visual-edit-overlay.js` appears occasionally; file exists at `node_modules/@emergentbase/visual-edits/dist/visual-edit-overlay.js`, likely race-condition on first boot. Non-fatal.
- Peer-dependency yarn warnings (react-day-picker, testing-library, etc.) — common with React 19, non-blocking.

## 8. Missing / Truncated Values
- None. All env variables from the task brief were provided in full and applied.

## 9. Useful Commands for Next Agent
```bash
# Restart frontend after env or dep changes
sudo supervisorctl restart frontend

# Live logs
tail -f /var/log/supervisor/frontend.out.log
tail -f /var/log/supervisor/frontend.err.log

# Reinstall deps (yarn ONLY)
cd /app/frontend && yarn install --network-timeout 600000

# Verify
curl -I http://localhost:3000/
curl -I https://insights-phase.preview.emergentagent.com/
```

## 10. Public Preview URL
- `https://insights-phase.preview.emergentagent.com/`

Deployment complete and verified.
