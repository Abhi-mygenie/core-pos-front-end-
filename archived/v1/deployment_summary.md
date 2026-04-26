# MyGenie POS Frontend — Deployment Playbook for Next Agent

> **Goal**: Clone, configure, and run the MyGenie POS React frontend on the Emergent preview environment.

---

## 1. PREREQUISITES

| Item | Value |
|------|-------|
| Node.js | v20.20.2 (pre-installed in Emergent env) |
| Yarn | 1.22.22 (pre-installed) |
| Package Manager | **Use `yarn` only** — `npm` causes breaking issues |
| Build system | CRACO v7.1.0 (wraps Create React App) |
| React version | 19.0.0 |

---

## 2. STEP-BY-STEP DEPLOYMENT

### Step 1: Clone the Repo
```bash
git clone --branch piyush_QA --single-branch https://github.com/Abhi-mygenie/core-pos-front-end-.git /tmp/pos-frontend
```

### Step 2: Stop Frontend Service
```bash
sudo supervisorctl stop frontend
```

### Step 3: Clear Existing Frontend & Copy Files
```bash
# Remove all files in /app/frontend (keep directory)
rm -rf /app/frontend/*
rm -rf /app/frontend/.gitignore /app/frontend/.env

# Copy repo frontend files
cp -r /tmp/pos-frontend/frontend/* /app/frontend/
cp /tmp/pos-frontend/frontend/.gitignore /app/frontend/
```

### Step 3b: Copy Memory Docs (IMPORTANT — don't miss this!)
The repo has a `memory/` folder with 21 architecture docs, bug reports, and project inventory files.
```bash
cp /tmp/pos-frontend/memory/* /app/memory/
cp /tmp/pos-frontend/memory/.gitkeep /app/memory/
```

### Step 4: Create `.env` file at `/app/frontend/.env`
```env
REACT_APP_BACKEND_URL=https://pos-station-realtime.preview.emergentagent.com
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
REACT_APP_FIREBASE_VAPID_KEY=<GET_FULL_KEY_FROM_TEAM>
REACT_APP_CRM_BASE_URL=https://crm.mygenie.online/api
REACT_APP_CRM_API_KEYS=<JSON_MAP_OF_15_RESTAURANTS>
REACT_APP_GOOGLE_MAPS_KEY=AIzaSyCS9rZcttTxbair3abltZ3Fm1vEnmY0mj4
```

**IMPORTANT**: 
- `REACT_APP_BACKEND_URL` must match the preview URL assigned to your Emergent pod
- `REACT_APP_CRM_API_KEYS` is a JSON string with restaurant IDs as keys (see problem statement for full value)
- `REACT_APP_FIREBASE_VAPID_KEY` was truncated — get the full value from the team

### Step 5: Install Dependencies
```bash
cd /app/frontend && yarn install
```
- **No yarn.lock in the repo** — yarn will resolve and create one fresh
- Takes ~70 seconds
- Expect deprecation warnings (workbox, svgo, etc.) — all harmless

### Step 6: Disable Backend (Optional)
If this is frontend-only and backend is not needed:
```bash
sudo supervisorctl stop backend
```
The frontend connects to external APIs directly — no local backend required.

### Step 7: Start Frontend
```bash
sudo supervisorctl start frontend
```
- Supervisor runs `yarn start` → `craco start` on port 3000
- Wait ~15-20 seconds for webpack compilation

### Step 8: Verify
```bash
# Check logs
tail -n 20 /var/log/supervisor/frontend.out.log
# Should see: "webpack compiled successfully" or "webpack compiled with 1 warning"

# Check for errors
tail -n 20 /var/log/supervisor/frontend.err.log
# Only deprecation warnings expected, no actual errors
```

---

## 3. KNOWN ISSUES & FIXES APPLIED

### Issue 1: No yarn.lock in repo
- **Symptom**: `yarn install` warns "No lockfile found"
- **Impact**: First install takes longer and resolves versions fresh
- **Fix**: Not needed — yarn handles it. Consider committing the generated `yarn.lock` back to the repo

### Issue 2: Peer dependency warnings
- **Symptom**: `react-day-picker@8.10.1` warns about `date-fns` and `react` peer deps
- **Detail**: Expects `date-fns@^2.28 || ^3.0.0` but project uses `^4.1.0`; expects React ^16/^17/^18 but project uses React 19
- **Impact**: Non-blocking — app compiles and runs fine
- **Fix**: Upgrade `react-day-picker` to v9+ when ready (supports date-fns v4 and React 19)

### Issue 3: ESLint warning in LoadingPage.jsx
- **Symptom**: `React Hook useEffect has a missing dependency: 'loadStationData'` (Line 101)
- **Impact**: Non-blocking warning, does not prevent compilation
- **Fix**: Add `loadStationData` to useEffect dependency array or wrap with `useCallback`

### Issue 4: Webpack deprecation warnings in stderr
- **Symptom**: `onAfterSetupMiddleware` and `onBeforeSetupMiddleware` deprecation warnings
- **Detail**: react-scripts 5.0.1 uses deprecated webpack-dev-server APIs
- **Impact**: Non-blocking — these are from react-scripts internals
- **Fix**: Will resolve when react-scripts is upgraded (or switch to Vite)

### Issue 5: VAPID Key truncated
- **Symptom**: Firebase push notification VAPID key appears truncated in requirements
- **Impact**: Push notifications may not work
- **Fix**: Get full VAPID key from Firebase Console → Project Settings → Cloud Messaging → Web Push certificates

---

## 4. REPO STRUCTURE (Key Files)

```
/app/frontend/
├── .env                          # Environment variables (created manually)
├── .gitignore
├── craco.config.js               # CRACO config (webpack aliases, eslint, health check plugin)
├── package.json                  # Dependencies
├── tailwind.config.js            # Tailwind config
├── postcss.config.js
├── plugins/health-check/         # Optional health check webpack plugin (disabled by default)
├── public/
│   ├── index.html
│   ├── firebase-messaging-sw.js  # Firebase service worker for push notifications
│   └── sounds/                   # Notification sounds
└── src/
    ├── App.js                    # Main app with routes
    ├── index.js                  # Entry point
    ├── api/                      # API layer (axios, services, socket, transforms)
    ├── components/               # UI components (cards, dashboard, guards, layout, modals, order-entry, ui)
    ├── config/                   # App configuration
    ├── constants/                # Constants
    ├── contexts/                 # React contexts
    ├── data/                     # Static data
    ├── hooks/                    # Custom hooks
    ├── lib/                      # Utility libraries
    ├── pages/                    # Page components (Login, Loading, Dashboard, Reports, StatusConfig)
    └── utils/                    # Utility functions
```

---

## 5. ROUTES

| Path | Component | Auth Required |
|------|-----------|---------------|
| `/` | LoginPage | No |
| `/loading` | LoadingPage | Yes |
| `/dashboard` | DashboardPage | Yes |
| `/reports` | Redirects to `/reports/audit` | — |
| `/reports/audit` | AllOrdersReportPage | Yes |
| `/reports/summary` | OrderSummaryPage | Yes |
| `/visibility/status-config` | StatusConfigPage | Yes |

---

## 6. EXTERNAL SERVICES

| Service | URL | Purpose |
|---------|-----|---------|
| API Backend | `https://preprod.mygenie.online/` | Main REST API |
| WebSocket | `https://presocket.mygenie.online` | Real-time order updates |
| Firebase | `mygenie-restaurant` project | Auth, push notifications |
| CRM API | `https://crm.mygenie.online/api` | CRM integration |
| Google Maps | Via API key | Address/location features |

---

## 7. QUICK TROUBLESHOOTING

| Symptom | Check | Fix |
|---------|-------|-----|
| Blank page | `tail -n 50 /var/log/supervisor/frontend.out.log` | Check for compilation errors |
| Port conflict | `lsof -i :3000` | Kill conflicting process |
| Env not loaded | Restart supervisor after .env change | `sudo supervisorctl restart frontend` |
| Module not found | `cd /app/frontend && yarn install` | Re-install dependencies |
| CORS errors | Check browser console | Verify `REACT_APP_API_BASE_URL` matches allowed origins on backend |
