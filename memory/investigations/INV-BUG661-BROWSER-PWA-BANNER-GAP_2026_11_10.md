# INV — BUG-661 Browser vs PWA Update Banner Gap

**Date:** 2026-11-10
**Role:** INVESTIGATION (follow-up to BUG-661 GATE_5A)
**Reported by:** Owner — "in browser update button is not coming, only in PWA app its coming"
**Classification:** NOT a code bug — expected design behaviour + 1 infrastructure gap
**Confidence:** HIGH (probed UAT live, traced hook code)
**Steps used:** 4/10

---

## 1. UAT State at time of investigation

| Asset | Cache-Control | buildId / notes |
|---|---|---|
| `index.html` | `no-cache` ✓ | Revalidates on every browser load |
| `version.json` | `no-store` ✓ | Always fresh |
| `/static/*` bundles | `immutable` ✓ | Hashed filenames, correct |
| `firebase-messaging-sw.js` | **`max-age=14400` (4 hrs)** ✗ | Should be `no-cache` per DevOps brief — NOT applied yet |
| Bundle BUILD_ID | `1794283819539` | Matches version.json exactly (same deploy) |

---

## 2. Root cause of observed difference

### Browser (no banner) — CORRECT behaviour
```
User opens UAT in browser (after deploy)
  → index.html: no-cache → browser revalidates → gets LATEST index.html
  → latest index.html → new bundle with BUILD_ID = 1794283819539 baked in
  → useAppVersionCheck fetches version.json → 1794283819539
  → 1794283819539 === 1794283819539 → NO mismatch → NO banner
```
User has the latest version. No update needed. No banner is correct.

### PWA (banner shows) — CORRECT behaviour
```
PWA was installed before this deploy
  → SW still serving OLD cached bundle (prev deploy BUILD_ID = old_timestamp)
  → useAppVersionCheck fetches version.json → 1794283819539
  → old_timestamp ≠ 1794283819539 → MISMATCH → BANNER ✓
```
PWA has a stale cached version. Banner is correct.

---

## 3. Findings

### F-1 (Design — not a bug)
The banner is designed for users who have the app **already open** when a new deploy happens. Users who freshly open the browser after a deploy load the new bundle immediately (`index.html` is `no-cache`) — their BUILD_ID already matches version.json, nothing to update, no banner needed.

### F-2 (Infrastructure gap — DevOps action needed)
`firebase-messaging-sw.js` has `Cache-Control: max-age=14400` (4 hours). The DevOps brief (`BACKEND_BRIEF_BUG661_CACHE_HEADERS_2026_11_10.md`) included `no-cache` for this file but it was not applied. Impact:
- Browser may serve a stale SW for up to 4 hours after a deploy
- The `swUpdatePending` (SW-waiting) detection path may not fire for up to 4 hours
- The `versionUpdatePending` (version.json polling) path is **independent** and still works within 5 minutes regardless — this is the primary mechanism for browser users

### F-3 (Testing method — how to verify banner in browser)
The banner in browser only shows to users with an OPEN (not refreshed) session:
```
1. Open UAT in browser — no banner (correct — has latest version)
2. Deploy a new build to UAT (new version.json buildId)
3. Keep the same tab open (do NOT reload)
4. Switch tab away and come back (triggers visibilitychange)
   OR wait up to 5 minutes (interval check)
5. Banner appears → "New version available — Update now" ✓
```

---

## 4. Owner decisions locked

| OD | Decision |
|---|---|
| OD-BUG661-INV-01 | No banner for fresh browser opens is CORRECT — user is on latest version |
| OD-BUG661-INV-02 | DevOps must apply `no-cache` to `firebase-messaging-sw.js` — pending |
| OD-BUG661-INV-03 | Version.json polling (every 5 min + visibilitychange) is the primary browser detection path — SW path is secondary |

---

## 5. Behaviour matrix

| Scenario | Bundle state | Banner shows? | Correct? |
|---|---|---|---|
| Browser — fresh open after deploy | NEW bundle | ✗ No | ✓ User is on latest |
| Browser — tab open before deploy, refocused after | OLD bundle | ✓ Yes (within 5 min) | ✓ |
| Browser — SW cache stale (4 hrs, Gap F-2) | OLD SW | ✗ Possibly delayed | ✗ Fix: `no-cache` on SW file |
| PWA — installed before deploy | OLD bundle | ✓ Yes | ✓ |
| PWA — freshly installed after deploy | NEW bundle | ✗ No | ✓ User is on latest |

---

## 6. Action items

| # | Action | Owner | Priority |
|---|---|---|---|
| A1 | DevOps: set `Cache-Control: no-cache` on `firebase-messaging-sw.js` in nginx/Cloudflare | DevOps | HIGH |
| A2 | Communicate testing method (F-3) to QA team | Owner | LOW |

---

## 7. Retroactive candidates
NONE. BUG-661 code is correct. No new BUG/CR registration needed.
