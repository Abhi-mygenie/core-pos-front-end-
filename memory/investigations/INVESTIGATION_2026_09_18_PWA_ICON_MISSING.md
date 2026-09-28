# INVESTIGATION REPORT — Desktop Icon Shows "C" Instead of MyGenie Logo (PWA)

**ID:** INV-PWA-ICON-001
**Date:** 2026-09-18
**Role:** INVESTIGATION (ALPHA v0.7)
**Status:** CLOSED
**Triggered by:** Owner — "We are making a desktop icon so the app can open as an app instead of Chrome browser. The logo is not coming on the icon — shows 'C' instead."
**Screenshot:** Desktop shortcut showing 'C' placeholder, label "Chai Chabutra..."
**Steps used:** 6 / 10

---

## 1. Summary

| Field | Value |
|---|---|
| Root cause | `manifest.json` is **completely absent** from `/public/`. Without it, Chrome cannot install the app as a PWA with a custom icon. Chrome falls back to a generated letter icon using the first letter of the restaurant name ("C" for "Chai Chabutra"). Additionally, `index.html` has **no `<link rel="manifest">` tag** and **no `<link rel="apple-touch-icon">` tag**. Zero PWA infrastructure exists. |
| Classification | CONFIG_ISSUE |
| Confidence | HIGH — all files checked, all missing confirmed |
| Risk | LOW — new files only, zero existing logic touched |
| Steps used | 6 / 10 |

---

## 2. Hypotheses Tested

| # | Hypothesis | Result |
|---|---|---|
| H1 | `manifest.json` references wrong icon paths | ELIMINATED — `manifest.json` does not exist at all |
| H2 | Icons exist but wrong format/size | ELIMINATED — no icon files of any kind exist in `/public/` |
| H3 | `manifest.json` exists but not linked in `index.html` | ELIMINATED — no manifest at all, and `index.html` has no manifest link |
| H4 | Icons are CRA placeholders, not the MyGenie logo | CONFIRMED (partial) — there are no icons at all; the existing favicon is an external CDN SVG URL |

---

## 3. Full Evidence — What Is Missing

### `/app/frontend/public/` — complete file listing

```
MyGenie_PMS_Screen_Reference.pdf
MyGenie_PMS_Screen_Reference_v1_2026-09-05.pdf
backend-briefs.html
[... HTML design mockup files ...]
firebase-messaging-sw.js
index.html
mygenie_cr_bug_tracker.xlsx
pms/
samples/
sounds/
training/
```

**What is ABSENT:**
| File | Required for | Status |
|---|---|---|
| `manifest.json` | PWA installation, custom icon, app name | ❌ MISSING |
| `logo192.png` | PWA icon 192×192, push notification icon | ❌ MISSING |
| `logo512.png` | PWA icon 512×512, install splash screen | ❌ MISSING |
| `favicon.ico` | Browser tab icon (fallback) | ❌ MISSING |

---

### `/app/frontend/public/index.html` — what is absent

```html
<!-- PRESENT -->
<link rel="icon" type="image/svg+xml"
      href="https://customer-assets.emergentagent.com/...logo111.svg" />
<title>MyGenie POS</title>

<!-- ABSENT — these lines do not exist -->
<link rel="manifest" href="/manifest.json" />             ← missing
<link rel="apple-touch-icon" href="/logo192.png" />       ← missing
<meta name="theme-color" content="#329937" />             ← present but wrong value (#000000)
```

**`manifest.json`** — does not exist. No `<link rel="manifest">` tag in `index.html`.
**`apple-touch-icon`** — does not exist. Required for iOS home screen + some Android browsers.

---

### `firebase-messaging-sw.js:38-39` — broken icon reference

```javascript
const options = {
  icon: '/logo192.png',    // ← references file that does not exist
  badge: '/logo192.png',   // ← same
  ...
};
self.registration.showNotification(title, options);
```

Push notification icons are also broken — `/logo192.png` does not exist. Notifications show a broken/default icon.

---

## 4. Why Chrome Shows "C"

When a website has no `manifest.json` and no icons, Chrome generates a **letter icon** for the desktop shortcut using the first letter of either:
- The app name from the manifest (no manifest → N/A)
- The page `<title>` (= "MyGenie POS" → would give "M")
- OR the restaurant-specific name Chrome has associated with the shortcut

The screenshot shows "C" (for "Chai Chabutra...") — Chrome is using the restaurant name that was used when the shortcut was created, not the `<title>`. This is Chrome's fallback behaviour when no manifest icon is present.

---

## 5. What Is Needed for the Fix

### Files to be created

| File | Location | Size | Purpose |
|---|---|---|---|
| `manifest.json` | `/public/manifest.json` | — | PWA definition — app name, icon paths, display mode |
| `logo192.png` | `/public/logo192.png` | 192×192 px PNG | PWA install icon, push notification icon |
| `logo512.png` | `/public/logo512.png` | 512×512 px PNG | PWA splash screen, install prompt |
| `favicon.ico` | `/public/favicon.ico` | 32×32 px ICO | Browser tab fallback |

### Changes to existing files

| File | Change |
|---|---|
| `index.html` | Add `<link rel="manifest" href="/manifest.json">` |
| `index.html` | Add `<link rel="apple-touch-icon" href="/logo192.png">` |
| `index.html` | Update `theme-color` from `#000000` to MyGenie green `#329937` |

### `manifest.json` minimum shape required

```json
{
  "short_name": "MyGenie POS",
  "name": "MyGenie Restaurant POS",
  "icons": [
    { "src": "/logo192.png", "type": "image/png", "sizes": "192x192" },
    { "src": "/logo512.png", "type": "image/png", "sizes": "512x512" }
  ],
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#329937",
  "background_color": "#ffffff"
}
```

---

## 6. Logo Source

The MyGenie logo SVG currently lives at an **external CDN URL**:
```
https://customer-assets.emergentagent.com/job_react-pos-phase1/artifacts/dwikbb41_logo111.svg
```

This SVG cannot be used directly in `manifest.json` — browsers require **PNG** files for PWA icons.

**Owner action required:** Provide the MyGenie logo as PNG at 192×192 and 512×512 px. The agent can convert the SVG to PNG via script if owner approves, OR owner provides the PNGs directly.

---

## 7. Scope Assessment

| Item | Files | R5 hotspot? | Financial? | Planning skip eligible? |
|---|---|---|---|---|
| `manifest.json` (new file) + `index.html` (2 lines) | 2 | NO | NO | YES |
| PNG icon assets | 0 code files | N/A | N/A | Owner must provide |
| `favicon.ico` | 0 code files | N/A | N/A | Owner must provide |

**Planning skip eligible: YES** — `index.html` is 2 new lines, `manifest.json` is a new file. Not R5. Not financial. Requires owner approval.

**Blocker before implementation:** Owner must provide `logo192.png` and `logo512.png` PNG assets, OR approve agent to convert the existing SVG to PNG.

---

## 8. Secondary Finding — Push Notification Icons Also Broken

`firebase-messaging-sw.js` references `/logo192.png` for push notification icon and badge. Since `logo192.png` does not exist, all push notifications currently show a broken/default icon. This is fixed automatically once `logo192.png` is added to `/public/`.

---

## 9. Owner Decisions Needed

| # | Decision |
|---|---|
| OD-1 | Provide `logo192.png` (192×192) and `logo512.png` (512×512) PNG files directly? OR approve agent to convert the existing CDN SVG to PNG? |
| OD-2 | App short name for manifest — use `"MyGenie POS"` or a shorter name (shown under icon on home screen)? |
| OD-3 | `display` mode — `"standalone"` (opens without browser UI, recommended) or `"minimal-ui"` (shows minimal browser bar)? |

---

## 10. Duplicate Check

NONE — no prior registration in BUG_TRACKER.

---

```
ID:             INV-PWA-ICON-001
Status:         CLOSED — 2026-09-18
Root cause:     CONFIG_ISSUE — manifest.json completely absent from /public/.
                No <link rel="manifest"> in index.html.
                No icon PNG files (logo192.png, logo512.png, favicon.ico).
                Chrome falls back to letter icon ("C") when no manifest icons found.
                Secondary: firebase-messaging-sw.js references /logo192.png
                which also does not exist → push notification icons broken too.

Classification: CONFIG_ISSUE
Confidence:     HIGH — confirmed by direct file listing, index.html inspection
Files missing:  /public/manifest.json
                /public/logo192.png
                /public/logo512.png
                /public/favicon.ico
Lines missing:  index.html — <link rel="manifest"> + <link rel="apple-touch-icon">

Planning skip:  YES — 1 new file (manifest.json) + 2 lines in index.html, not R5
Blocker:        Owner must provide PNG assets (192px + 512px) before implementation
Owner decisions: OD-1 (PNG source), OD-2 (short name), OD-3 (display mode)
Next:           Gate 2 Impact Analysis (PLANNING role) after OD-1 answered
Report:         /app/memory/investigations/INVESTIGATION_2026_09_18_PWA_ICON_MISSING.md
```
