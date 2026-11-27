# INVESTIGATION REPORT — Is PWA the Right Approach for Desktop App Icon?

**ID:** INV-PWA-APPROACH-001
**Date:** 2026-09-18
**Role:** INVESTIGATION (ALPHA v0.7)
**Status:** CLOSED
**Triggered by:** Owner — "I want to make a desktop icon so the app opens as an app instead of Chrome browser. Is PWA the right approach?"
**Steps used:** 4 / 10

---

## 1. Summary

| Field | Value |
|---|---|
| Answer | **YES — PWA (manifest.json + PNG icons) is the correct and simplest approach for this app** |
| Confidence | HIGH |
| Reason | The app already satisfies 2 of 4 Chrome PWA install requirements. Only `manifest.json` and PNG icon files are missing. No new code, no new architecture needed. |

---

## 2. All Options Evaluated

### Option A — PWA Installation via `manifest.json` ← RECOMMENDED

**What it is:** Add a `manifest.json` file + PNG icons to the app. Chrome detects it and offers an "Install" prompt. Once installed:
- Opens in a **standalone window** — no address bar, no browser tabs, no Chrome UI
- Has a **custom icon** on the desktop / taskbar
- Behaves exactly like a native app to the user
- Still runs the same React web app underneath

**What the user sees after installation:**
```
Before:  Chrome opens with address bar, tab strip, bookmarks bar
After:   Standalone window — just the POS app, no browser UI, custom MyGenie icon
```

**Complexity:** Minimal. Just 1 new JSON file + PNG assets + 2 lines in `index.html`.

---

### Option B — Electron (wrap web app in a native shell)

**What it is:** A separate framework that packages a web app inside a desktop application. Requires a full parallel project — separate `package.json`, `main.js`, app packaging, code signing.

**Verdict for this app:** OVERKILL. Adds weeks of setup, a separate build pipeline, auto-update infrastructure, and code-signing requirements for distribution. No meaningful benefit over PWA for a POS system.

---

### Option C — Chrome App (legacy)

Chrome Apps (`.crx` format) were deprecated and removed in 2022. Not available.

---

### Option D — Tauri / NW.js / other desktop wrappers

Similar to Electron — significant rebuild effort. Not suitable for an existing running web app.

---

## 3. Why PWA Is Correct for THIS Specific App

### Chrome's 4 requirements for PWA installation — current status

| Requirement | Status | Evidence |
|---|---|---|
| 1. Served over HTTPS | ✅ ALREADY MET | `preprod.mygenie.online` is HTTPS |
| 2. A registered Service Worker | ✅ ALREADY MET | `firebase-messaging-sw.js` is registered in `src/config/firebase.js:68` |
| 3. A valid `manifest.json` | ❌ MISSING | File does not exist in `/public/` |
| 4. PNG icons (192×192 and 512×512) | ❌ MISSING | No icon files in `/public/` |

**The app is already 2/4 of the way there.** Requirements 1 and 2 are satisfied today — not by design for PWA, but because HTTPS is standard and the Firebase push notification service worker is already registered.

Only the manifest and icon files are missing.

---

### What `"display": "standalone"` gives in `manifest.json`

```
display: "standalone"  →  App opens WITHOUT Chrome UI:
  ✅ No address bar
  ✅ No tab strip
  ✅ No bookmarks bar
  ✅ Custom icon on desktop / taskbar / dock
  ✅ Shows in taskbar as a separate app (not as a Chrome window)
  ✅ Has its own entry in Alt+Tab / Cmd+Tab switcher
```

This is exactly what the user wants — the POS opens and looks like a native desktop application.

---

## 4. Important Distinction — Two Ways to Create a Desktop Icon in Chrome

| Method | Requires manifest? | Icon | Window style |
|---|---|---|---|
| Chrome → More Tools → Create Shortcut | NO | Letter fallback ("C") | Opens WITH browser UI (address bar visible) |
| Chrome Install PWA prompt (or address bar install icon) | YES | Custom logo | Opens WITHOUT browser UI (standalone) |

The user currently has Method 1 — that's why the icon shows "C" and the app opens inside a normal Chrome window. After adding the manifest, Method 2 becomes available — custom icon AND no browser chrome.

**The user will need to:** Re-install the shortcut after the manifest is added. The existing shortcut cannot be updated — it must be deleted and reinstalled via Chrome's "Install app" button (appears in the address bar after manifest is detected).

---

## 5. One Nuance — Service Worker Coverage

The existing `firebase-messaging-sw.js` satisfies Chrome's service worker requirement for PWA installability. However, it only handles push notifications — it does not cache the app for offline use.

**For the stated goal (desktop icon + standalone window):** This is sufficient. Offline caching is not required for the install prompt to appear.

**If offline / fallback screen is ever needed** (e.g., if network drops during a shift), a separate caching service worker would be needed. That is a separate future decision — not a blocker for the desktop icon.

---

## 6. Conclusion

```
Is PWA the right approach?   YES — definitively.

Why:
  - App is already HTTPS + has a service worker (2/4 requirements met)
  - manifest.json + 2 PNG files is all that's needed
  - Gives standalone window (no browser UI) + custom icon
  - No Electron, no wrappers, no new architecture
  - Works on Windows, Mac, Linux, Android, iOS (Chrome/Edge/Safari)

What is NOT needed:
  - Electron
  - Tauri
  - Any new framework or dependency
  - Any changes to React app logic

What IS needed (from INV-PWA-ICON-001):
  - /public/manifest.json           (new file — ~15 lines)
  - /public/logo192.png             (owner to provide — 192×192 PNG)
  - /public/logo512.png             (owner to provide — 512×512 PNG)
  - index.html: <link rel="manifest"> + <link rel="apple-touch-icon">  (2 lines)

After deploy: delete old shortcut, visit app, click install icon in Chrome address bar.
```

---

```
ID:             INV-PWA-APPROACH-001
Status:         CLOSED — 2026-09-18
Answer:         YES — PWA is the correct approach. No alternatives needed.
App status:     2/4 Chrome PWA requirements already met (HTTPS + Service Worker).
Missing:        manifest.json + PNG icon assets + 2 lines in index.html.
Planning:       See INV-PWA-ICON-001 for full file list and owner decisions.
Report:         /app/memory/investigations/INVESTIGATION_2026_09_18_PWA_APPROACH.md
```
