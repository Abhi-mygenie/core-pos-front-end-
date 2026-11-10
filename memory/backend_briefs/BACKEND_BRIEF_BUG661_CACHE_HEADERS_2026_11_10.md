# BACKEND_BRIEF — BUG-661 Cache Headers — UAT / Production
**Date:** 2026-11-10
**From:** Frontend agent
**To:** DevOps / Backend / Infra team
**Priority:** P0 — must be applied before BUG-661 goes to production
**Classification:** CONFIG_ISSUE

---

## 1. Summary

The PWA update banner (BUG-661) is deployed and working correctly in code.
It will **never fire reliably in production** until the server sends the correct
`Cache-Control` headers on two files: `index.html` and `version.json`.

Without these headers:
- Users' browsers cache the old `index.html` after a new deploy → old JS bundle
  loads → old `BUILD_ID` → hook never detects the new version → **banner never shows**.
- `version.json` itself gets cached → even if the user loads the new bundle,
  the fetch returns a stale `version.json` → comparison always says "no update" →
  **banner never shows**.

---

## 2. What needs to change

Three files on the server need specific `Cache-Control` headers.
Everything else stays exactly as it is.

| File / Path | Required header | Reason |
|---|---|---|
| `/index.html` | `Cache-Control: no-cache` | Browser must revalidate on every load — this is the entry point that loads the versioned JS bundle |
| `/version.json` | `Cache-Control: no-store` | Must never be cached — this is the file the app polls to detect a new release |
| `/firebase-messaging-sw.js` | `Cache-Control: no-cache` | Service worker file — browser must always revalidate it |
| `/static/*` | `Cache-Control: public, max-age=31536000, immutable` | Hashed filenames — safe to cache forever; never changes for the same hash |

> **Note:** `no-cache` = browser revalidates with server before using cached copy (fast, uses ETags).
> `no-store` = browser never stores a copy at all (always fetches fresh). Used on `version.json` only because it must always be fresh.

---

## 3. nginx config (if using nginx)

Add this to the `server {}` block for the POS frontend:

```nginx
# BUG-661: PWA update banner requires these headers to work correctly

# index.html — must revalidate on every load
location = /index.html {
    add_header Cache-Control "no-cache" always;
}

# version.json — never cache; this is the update-check file
location = /version.json {
    add_header Cache-Control "no-store" always;
}

# Service worker — must revalidate
location = /firebase-messaging-sw.js {
    add_header Cache-Control "no-cache" always;
}

# Hashed static assets — safe to cache forever
location /static/ {
    add_header Cache-Control "public, max-age=31536000, immutable" always;
}

# Catch-all SPA fallback — also no-cache so index.html is always fresh
location / {
    try_files $uri /index.html;
    add_header Cache-Control "no-cache" always;
}
```

After editing: `nginx -t && nginx -s reload`

---

## 4. Cloudflare config (if using Cloudflare in front of nginx)

Cloudflare can override the headers nginx sends. Two things to check:

**4a. Page Rules or Cache Rules — add these rules (in order):**

| URL pattern | Setting | Value |
|---|---|---|
| `pos-uat.mygenie.online/version.json` | Cache Level | Bypass |
| `pos-uat.mygenie.online/index.html` | Cache Level | Bypass |
| `pos-uat.mygenie.online/firebase-messaging-sw.js` | Cache Level | Bypass |
| `pos-uat.mygenie.online/static/*` | Cache Level | Cache Everything + Edge TTL 1 year |

**4b. Verify Cloudflare is NOT overriding your headers:**
In Cloudflare Dashboard → Caching → Configuration:
- Browser Cache TTL → set to **"Respect Existing Headers"**
- This ensures your nginx `Cache-Control` headers pass through to the browser unchanged.

---

## 5. Verification steps (run after applying)

```bash
# 1. index.html — must show no-cache
curl -sI https://pos-uat.mygenie.online/ | grep -i cache-control
# Expected: cache-control: no-cache

# 2. version.json — must show no-store
curl -sI https://pos-uat.mygenie.online/version.json | grep -i cache-control
# Expected: cache-control: no-store

# 3. Static asset — must show immutable
curl -sI "https://pos-uat.mygenie.online/static/js/main.b398b123.js" | grep -i cache-control
# Expected: cache-control: public, max-age=31536000, immutable

# 4. Confirm version.json content is fresh (not stale)
curl -s https://pos-uat.mygenie.online/version.json
# Expected: {"buildId":"<current-build-timestamp>"}
```

---

## 6. How to test the banner end-to-end after headers are applied

1. Open `pos-uat.mygenie.online` in a browser — note no banner (expected).
2. Run a new `yarn build` and deploy to UAT — this produces a new `buildId` timestamp in `version.json`.
3. Go back to the browser tab from step 1 (do NOT reload yet).
4. Switch to another tab and come back (triggers `visibilitychange`) — or wait up to 5 minutes.
5. **Banner should appear:** "New version available — Update now"
6. Click **Update now** → page reloads → new bundle loads → banner disappears. ✓

If banner appears in step 5 and disappears in step 6 → headers are correct and the full flow works.

---

## 7. Impact if NOT applied

| Scenario | Without headers | With headers |
|---|---|---|
| New version deployed | Users keep serving old cached bundle indefinitely | Users see banner within 5 min |
| User clicks "Update now" | May reload old cached `index.html` → banner loops | Reloads new `index.html` → new bundle → banner gone |
| version.json polled every 5 min | Returns stale cached response → no detection | Returns fresh response → detection works |
| White screen after deploy | Old `index.html` → 404 on deleted bundle files | Boot guard in `index.html` handles it (BUG-661 F6) |

---

## 8. Current UAT state (as probed 2026-11-10)

```
version.json:   {"buildId":"1794274124380"}  — file exists ✓
Bundle BUILD_ID: 1794274124380               — matches version.json ✓ (same deploy)
index.html Cache-Control:   MISSING ✗
version.json Cache-Control: MISSING ✗
Cloudflare cf-cache-status: DYNAMIC (no explicit cache rule set)
```

The code is correct. Only server config is missing.

---

**Contact:** Frontend team — reference BUG-661 (`plans/BUG-661_IMPLEMENTATION_PLAN.md` §3)

---

## ADDENDUM — 2026-11-10 (Post-UAT investigation)

### Current UAT state (probed 2026-11-10 04:43 UTC)

| File | Required | Currently set | Status |
|---|---|---|---|
| `index.html` | `no-cache` | `no-cache` | ✓ Done |
| `version.json` | `no-store` | `no-store` | ✓ Done |
| `/static/*` | `immutable` | `public, max-age=31536000, immutable` | ✓ Done |
| `firebase-messaging-sw.js` | **`no-cache`** | **`max-age=14400` (4 hrs)** | ✗ **NOT DONE** |

### Action still needed
`firebase-messaging-sw.js` must be set to `Cache-Control: no-cache`.
Currently it caches for 4 hours, so after a new deploy:
- Browser may serve stale SW for up to 4 hours
- `swUpdatePending` (SW waiting state) detection may not fire for 4 hours
- `versionUpdatePending` (version.json polling) still works within 5 min — partial mitigation

### nginx fix (add this line if not already present)
```nginx
location = /firebase-messaging-sw.js { add_header Cache-Control "no-cache" always; }
```

### Cloudflare fix
Add a Cache Rule: URL = `pos-uat.mygenie.online/firebase-messaging-sw.js` → Cache Level: Bypass

### Verification
```bash
curl -sI https://pos-uat.mygenie.online/firebase-messaging-sw.js | grep -i cache-control
# Expected: cache-control: no-cache
```

### Why browser shows no banner (design clarification — NOT a bug)
Browser fresh-opens load the new bundle immediately (`index.html` is `no-cache`).
The banner only shows for users who had the app OPEN before the deploy.
To test in browser: open app → deploy → keep tab open → switch away and back → banner appears.
