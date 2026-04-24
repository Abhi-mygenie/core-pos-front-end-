# Deployment Handover – Core POS Frontend (roomv1-)

**Scope:** Deployment-only task. No code analysis, refactoring, bug-fixing, or test execution was performed.

---

## 1. Source Repository

| Item | Value |
|---|---|
| Git URL | https://github.com/Abhi-mygenie/core-pos-front-end-.git |
| Branch | `roomv1-` |
| Cloned commit | `b59c410 Auto-generated changes` |
| Clone destination | `/app` (repo contents placed directly in `/app`; `/app/.git` and `/app/.emergent` preserved) |

Everything previously present in `/app` (default backend/frontend scaffold, test_reports, memory, tests, README, etc.) was wiped before cloning, as instructed. The repo's own `.git` and `.emergent` folders were excluded during copy so the platform's existing `/app/.git` and `/app/.emergent` remain intact.

---

## 2. Tech Stack (as deployed)

- React 19.0.0
- CRACO v7.1.0
- Yarn 1.22.22
- Node.js v20.20.2
- Frontend-only project (no backend service in this branch – a stub `backend/` folder exists in the repo but is not part of the deployment)

---

## 3. Install & Run

```bash
cd /app/frontend
yarn install          # installs against existing yarn.lock
sudo supervisorctl restart frontend
```

Start script (from `package.json`): `craco start` → binds to `0.0.0.0:3000` (managed by supervisor).

Supervisor status after deploy:

```
frontend          RUNNING
mongodb           RUNNING
code-server       RUNNING
nginx-code-proxy  RUNNING
backend           FATAL   (intentional – no backend in this branch)
```

---

## 4. Environment Variables (`/app/frontend/.env`)

All values as supplied in the deployment brief. The `REACT_APP_FIREBASE_VAPID_KEY` leading `2` + whitespace was stripped per instruction, and only the actual key is stored.

| Variable | Value |
|---|---|
| REACT_APP_BACKEND_URL | https://restaurant-pos-v2-1.preview.emergentagent.com |
| WDS_SOCKET_PORT | 443 |
| ENABLE_HEALTH_CHECK | false |
| REACT_APP_API_BASE_URL | https://preprod.mygenie.online/ |
| REACT_APP_SOCKET_URL | https://presocket.mygenie.online |
| REACT_APP_FIREBASE_API_KEY | AIzaSyCvn7MctrSgULjgiHqQSl4QfeP3dWxITwY |
| REACT_APP_FIREBASE_AUTH_DOMAIN | mygenie-restaurant.firebaseapp.com |
| REACT_APP_FIREBASE_PROJECT_ID | mygenie-restaurant |
| REACT_APP_FIREBASE_STORAGE_BUCKET | mygenie-restaurant.firebasestorage.app |
| REACT_APP_FIREBASE_MESSAGING_SENDER_ID | 969625631640 |
| REACT_APP_FIREBASE_APP_ID | 1:969625631640:web:2f2a2987f740b6fc8e09ed |
| REACT_APP_FIREBASE_MEASUREMENT_ID | G-WFK75QN54E |
| REACT_APP_FIREBASE_VAPID_KEY | BEvFMTX767yCa4YgfuPjfTyZGD0fp34WkWjW3SPDqS3NRRWSYfqT8m9TA4S-nssyqNG-EIJUu6WIA0MWJaouSUI |
| REACT_APP_CRM_BASE_URL | https://crm.mygenie.online/api |
| REACT_APP_CRM_API_KEYS | JSON map (15 outlet ids → `dp_live_*` keys) – stored single-line in `.env` |
| REACT_APP_GOOGLE_MAPS_KEY | AIzaSyCS9rZcttTxbair3abltZ3Fm1vEnmY0mj4 |

---

## 5. Verification

- `curl localhost:3000` → **HTTP 200**
- `curl https://restaurant-pos-v2-1.preview.emergentagent.com/` → **HTTP 200**
- Browser screenshot confirmed: **Mygenie login page** (Email / Password / Remember me / Forgot Password? / LOG IN) renders correctly; footer shows `© Mygenie 2025. HOSIGENIE HOSPITALITY SERVICES PRIVATE LIMITED.`
- Webpack reports `Compiled successfully!` with no errors (only deprecation warnings from upstream CRA/Workbox chain – non-blocking).

---

## 6. Known / Non-blocking Items for Next Agent

1. **No backend service in this branch.** Supervisor's `backend` program is in `FATAL` state because `/app/backend` only contains a placeholder `server.py` + `requirements.txt` from the repo. This is expected for a frontend-only deploy. If a backend is later required, supervisor config and `/app/backend` would need to be provisioned separately.
2. **Firebase VAPID key** was stored after stripping a stray `2` + whitespace prefix from the original brief value. If push-notifications fail in prod, confirm the correct VAPID key with the product owner.
3. **`REACT_APP_CRM_API_KEYS`** is a long JSON map stored as a single line in `.env`. CRA loads it verbatim into `process.env`; consuming code must `JSON.parse` it.
4. Yarn install produced several peer-dependency warnings (react-day-picker, recharts, craco ts-loader, etc.). None blocked compilation; left untouched per "no unnecessary changes" directive.
5. No secrets appear truncated in the brief after stripping – **no missing values are blocking deployment.**

---

## 7. Quick Redeploy Recipe (for next agent)

```bash
# 1. Wipe /app (keep .git + .emergent)
cd /app && find . -mindepth 1 -maxdepth 1 ! -name '.git' ! -name '.emergent' -exec rm -rf {} +

# 2. Clone target branch
git clone --branch roomv1- --single-branch \
  https://github.com/Abhi-mygenie/core-pos-front-end-.git /tmp/core-pos-clone

# 3. Copy contents (preserve platform .git/.emergent)
rsync -a --exclude='.git' --exclude='.emergent' /tmp/core-pos-clone/ /app/

# 4. Put /app/frontend/.env in place (values in §4)

# 5. Install & start
cd /app/frontend && yarn install
sudo supervisorctl restart frontend
```

---

**Status:** Deployment successful, frontend live at https://restaurant-pos-v2-1.preview.emergentagent.com/.
