# INVESTIGATION REPORT — Font Rendering Issues on Some Client Machines
**ID:** INV-FONT-2026-08-18
**Date:** 2026-08-18
**Role:** INVESTIGATION
**Steps used:** 9/10
**Screenshot:** Windows machine (HP laptop, "Activate Windows" watermark visible)
**Affected component:** OrderCard.jsx (₹ amount, table/customer name in row 1)

---

## 1. Summary

**5 root causes found — all in FE config/code, no backend involvement.**

| # | Root Cause | File | Impact |
|---|-----------|------|--------|
| RC-1 | Poppins loaded via CSS `@import` (blocking, slow) | `App.css:1` | Font fails on slow/restricted networks → fallback to system font |
| RC-2 | Tailwind has NO `fontFamily` config → Tailwind classes use system font, not Poppins | `tailwind.config.js` | All `font-bold/extrabold` Tailwind classes bypass Poppins entirely |
| RC-3 | `font-extrabold` (weight 800) not loaded — only 400/500/600/700 declared | `App.css:1` | Browser synthesizes fake bold for ₹ amount → looks thicker/wrong |
| RC-4 | `index.css` body font stack has NO Poppins — conflicts with App.css | `index.css:7` | Race condition on CSS load order — system font can win |
| RC-5 | Cabinet Grotesk + Manrope referenced in 20+ pages, never loaded | 20+ `.jsx` files | Always falls back to OS default sans-serif |

**Classification:** CONFIG_ISSUE + CODE_ERROR
**Confidence:** HIGH
**Why "few clients":** Windows users are most affected (RC-2 + RC-3 combo). Mac/iOS users have better system font rendering. Google-blocked networks affect all OS.

---

## 2. Root Cause Deep Trace

### RC-1 — CSS `@import` is the Worst Way to Load Fonts

```css
/* App.css line 1 */
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
```

**Why this is bad:**
- `@import` in CSS is **blocking** — the entire App.css stylesheet is paused until this HTTP request to `fonts.googleapis.com` completes
- Google Fonts CDN is **slow or blocked** on many Indian restaurant networks (corporate firewalls, ISP caching, CDN routing issues)
- `display=swap` means: show system font first, then SWAP to Poppins when it loads → causes visible Flash of Unstyled Text (FOUT)
- On networks where Google Fonts never loads: **Poppins is permanently unavailable**, system font used throughout

**Correct pattern (not used):**
```html
<!-- This is already in index.html but ONLY loads Inter:wght@600 -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="...Poppins..." rel="stylesheet" />
```

---

### RC-2 — Tailwind Has No fontFamily Config (CRITICAL — explains the screenshot)

```js
// tailwind.config.js — theme.extend section
// NO fontFamily defined anywhere
extend: {
  borderRadius: { ... },
  colors: { ... },
  // ← fontFamily is completely absent
}
```

**What this means:**
- Tailwind's default font stack is: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- When `OrderCard.jsx` renders `className="font-extrabold text-lg"`, Tailwind applies its **default** system font stack — NOT `Poppins`
- On Windows: resolves to **Segoe UI**
- On Mac: resolves to **SF Pro / -apple-system**
- On Android: resolves to **Roboto**

This explains why the ₹ amount and table name in order cards look different on Windows vs Mac/tablet.

**Affected code in OrderCard.jsx:**
```jsx
// Line 518 — ₹ amount (always visible on every card)
<span className="font-extrabold text-lg flex-shrink-0 ml-2" ...>
  ₹{order.amount}
</span>

// Line 482 — table/customer name (Dine-In + Room orders)
<span className={`${isDineIn ? 'font-extrabold text-lg' : 'text-xs font-medium'} truncate`}>
  {getDisplayName()}
</span>
```

Both use `font-extrabold text-lg` → Tailwind default → **Segoe UI on Windows**.

---

### RC-3 — Weight 800 (Extrabold) Not Loaded → Synthesized Bold

```css
/* App.css:1 — only loads 400, 500, 600, 700 */
@import url('...Poppins:wght@400;500;600;700&display=swap');
```

- Poppins has weights: 100–900 (all available)
- **Weight 800 (font-extrabold) is NOT in the import string**
- When browser needs weight 800 (from `font-extrabold`), it **synthesizes** it by algorithmically thickening weight 700
- Synthesized bold looks heavier, wider, and uneven — visually "off" compared to genuine weight 800
- This is visible in the screenshot as the ₹99 amount appearing with different thickness

---

### RC-4 — Two Conflicting body Font Declarations

```css
/* index.css line 7 — NO Poppins */
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", 
               "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
}

/* App.css line 20 — Has Poppins */
body {
  font-family: 'Poppins', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
```

- `index.css` is processed as Tailwind base layer (`@tailwind base` at line 1)
- `App.css` is a React-imported CSS file
- Both declare `body {}` at the same specificity
- CSS load order: `index.css` → `App.css` → App.css should win normally
- BUT: `@tailwind base` injects its own reset which may override. And if `@import` in App.css is slow, index.css wins temporarily.
- **Risk:** On some browser/CRA build configurations, index.css body wins → no Poppins on body

---

### RC-5 — Cabinet Grotesk + Manrope Referenced But Never Loaded

```jsx
// 20+ report pages — Cabinet Grotesk
<h1 style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>Daily Sales</h1>

// 4 inventory pages — Manrope
<h1 style={{ fontFamily: 'Manrope, sans-serif' }}>Smart Purchase</h1>
```

**Cabinet Grotesk:** Never loaded in `index.html` or any CSS — always falls back to system sans-serif
**Manrope:** Never loaded anywhere — always falls back
**Result:** All these headers render in OS default sans-serif (Segoe UI on Windows, SF Pro on Mac)

These don't affect the main dashboard card rendering but cause the reports and inventory pages to look visually inconsistent with the design intent.

---

## 3. Why "Few Clients" — Device/Network Matrix

| Client Setup | Font Renders As | Visual Issue? |
|---|---|---|
| Windows + Google Fonts **blocked** (corporate network) | Segoe UI (RC-1 + RC-2) | **YES — worst case** |
| Windows + Google Fonts slow (>3s) | Segoe UI initially, FOUT to Poppins | **YES — flash + synthesis** |
| Windows + Google Fonts fast | Poppins (App.css body), BUT extrabold uses Segoe UI (RC-2) | **YES — ₹ amount different** |
| Mac/iOS + Google Fonts blocked | SF Pro (-apple-system) | Mild — SF Pro renders well |
| Mac/iOS + Google Fonts fast | Poppins (App.css body), SF Pro for Tailwind classes (RC-2) | Mild |
| Android + Google Fonts fast | Poppins (App.css body), Roboto for Tailwind classes (RC-2) | Mild |

**Conclusion:** Windows clients are hit hardest by RC-1 + RC-2 + RC-3 together, explaining why "few clients" (Windows restaurant POS setups) see it.

---

## 4. Fix Plan

### Fix 1 — Move font loading to index.html, add weight 800 (HIGH impact)
```html
<!-- index.html — REPLACE current Inter-only link with combined request -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
```
- Adds weight 800 → fixes synthesized bold (RC-3)
- `<link>` is non-blocking → faster than `@import` (RC-1)
- `display=swap` already there → preserves progressive rendering

### Fix 2 — Add fontFamily to tailwind.config.js (HIGH impact, fixes RC-2)
```js
// tailwind.config.js
theme: {
  extend: {
    fontFamily: {
      sans: ['Poppins', 'Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
    },
    // ...rest of extend
  }
}
```
This makes ALL Tailwind font utilities (`font-bold`, `font-extrabold`, `text-sm` etc.) use Poppins instead of the system default.

### Fix 3 — Remove @import from App.css (low effort, fixes RC-1 redundancy)
```css
/* App.css — REMOVE this line (now loaded via index.html) */
/* @import url('https://fonts.googleapis.com/css2?family=Poppins...'); */
```

### Fix 4 — Align index.css body font stack (fixes RC-4)
```css
/* index.css line 7 — ADD Poppins */
body {
  font-family: 'Poppins', 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
```

### Fix 5 — Load Cabinet Grotesk + Manrope in index.html (fixes RC-5, optional)
```html
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Inter:wght@400;500;600&family=Cabinet+Grotesk:wght@400;500;700&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet" />
```
Or alternatively: replace `Cabinet Grotesk` + `Manrope` references in JSX with `font-sans` Tailwind class.

---

## 5. Blast Radius

| Fix | Files | Risk |
|---|---|---|
| Fix 1 (index.html) | `public/index.html` — 1 line edit | LOW |
| Fix 2 (tailwind.config.js) | `tailwind.config.js` — ~4 lines | LOW-MEDIUM (Tailwind rebuild, visual change globally) |
| Fix 3 (remove @import) | `App.css` — remove line 1 | LOW |
| Fix 4 (index.css) | `index.css` — 1 line edit | LOW |
| Fix 5 (Cabinet Grotesk) | `index.html` — extend existing link OR JSX refs | LOW |

**All fixes are cosmetic-only — zero API, logic, state, or financial change.**

---

## 6. Recommendations

| Priority | Fix | Why First |
|---|---|---|
| **P1** | Fix 1 + Fix 2 + Fix 3 (together) | These 3 together fully resolve the OrderCard ₹ amount rendering |
| **P2** | Fix 4 | Eliminates CSS specificity race condition |
| **P3** | Fix 5 | Reports and inventory pages render correct font (Cabinet Grotesk/Manrope) |

**Planning skip eligible:** YES — all 5 fixes across ≤5 files, zero logic change, pure config/CSS.
**Owner approval required for Fix 2** (tailwind fontFamily changes all Tailwind-styled text globally — visual regression test recommended).

---

*Investigation report: /app/memory/INV-FONT-2026-08-18_INVESTIGATION_REPORT.md*
