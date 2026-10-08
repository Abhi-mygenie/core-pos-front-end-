# Deploy MyGenie Core POS Frontend into /app

Pull the existing project from GitHub directly into the workspace and run it as-is, with no code changes. Environment values start as placeholders and real values are supplied later.

## Who it's for
The project owner, who already has a working React POS frontend in a GitHub repository and wants it running in this platform's preview environment exactly as it is today — no redesign, no feature work, no code edits.

## What is being brought in
- Source: `https://github.com/Abhi-mygenie/core-pos-front-end-`
- Branch: `main` (confirmed to exist and contains the full project)
- The repository holds a complete project: `frontend/` (the MyGenie Core POS React app), `backend/`, `memory/`, `tests/`, `test_reports/`, and supporting files.
- The POS app is a frontend that talks to an external MyGenie backend (e.g. `preprod.mygenie.online`) and uses services such as Firebase auth, Google Maps, a CRM API, charts, and a socket connection — all driven by environment variables.

## What happens to /app
- Platform-specific files and folders are backed up first and preserved: the running-service configuration, environment placeholder files, and deployment/platform metadata.
- All other current contents of `/app` are cleared.
- The repository contents are placed directly into `/app` (not inside a subfolder), so `/app/frontend`, `/app/backend`, `/app/memory`, etc. come from the repo.
- No cloning into temporary or nested folders.

## Environment values
- Every backend environment key is written as a placeholder value.
- Every frontend environment key is written as a placeholder value.
- Platform-protected variables (backend database connection, the frontend's public backend URL) are kept as the platform requires so services can start.
- Real third-party values (Firebase, Google Maps, CRM keys, external API base URL, socket URL, etc.) are supplied by the owner afterward.

## What "running as-is" will and won't show
- The app is expected to install its dependencies, compile, and serve — the POS login screen should load.
- Because third-party values are placeholders, anything that depends on them — real login, live data, maps, CRM, charts fed by the backend — will not work until the owner provides the real values. This is expected at this stage.
- No source code is edited to make these work; only environment placeholders are put in place.

## Memory directory
- The `memory/` directory is taken from the repository's `main` branch.
- After deployment, the local `memory/` is compared against the repository's `main` to confirm it is fully in sync, and any difference is reported.

## Implementation phases

### Phase 1 (done now): Deploy and run as-is
Back up and preserve platform files, clear the rest of `/app`, pull the `main` branch directly into `/app`, write placeholder environment values for all backend and frontend keys, install dependencies, start the services, confirm the app serves and the login screen loads, and confirm the `memory/` directory is fully in sync with the repository.

### Phase 2 (later): Supply real environment values
The owner provides the real third-party values; these replace the placeholders so login, external API calls, maps, CRM, and live data begin working.

### Phase 3 (later): Verify full functionality
Log in with a real account and confirm end-to-end flows (auth, data, charts, any audit/reporting tabs) behave as they did in the owner's previous environment.

## Assumptions
- The `main` branch is the intended source (it exists and contains the full project; the repository's other default branch is not used).
- "Run as-is" means no source code edits at all — only environment placeholders and dependency install/run.
- Placeholder environment values are acceptable now, with a non-functional login/data layer understood until real values are added.
- The repository's `memory/`, `tests/`, `backend/`, and other folders are brought in as they exist on `main`; the platform's own service configuration overrides only what is needed to start the services.
- Any dependency constraints already recorded in the repository (for example a pinned charting library version) are respected by installing exactly what the repo specifies, without changing them.
- The result is a preview deployment inside this platform; no external server, domain, or production deployment is set up as part of this.
