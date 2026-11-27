# BUG-570 — Impact Analysis (Gate 2)

**ID:** BUG-570
**Date:** 2026-10-22
**Code Reality:** NONE — no fix applied yet
**Risk:** LOW
**Conflict Pre-Check:** CLEAN (BUG-544 touches different section of same file)

---

## 1. Summary

On Android tablet, scrolling the sidebar drawer nav causes main content to bleed through the backdrop. Root cause: `backdrop-blur-sm` (`backdrop-filter: blur(4px)`) creates GPU compositing issues during scroll repaints on Android Chrome.

## 2. Current Code

**Sidebar.jsx L518:**
```jsx
<div data-testid="sidebar-drawer-backdrop"
     className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm"
     onClick={() => setDrawerOpen(false)} />
```

## 3. Recommended Fix

**Option A (recommended — safest):** Remove `backdrop-blur-sm`, keep `bg-black/50`.

```jsx
className="fixed inset-0 z-[90] bg-black/50"
```

The solid semi-transparent backdrop provides full coverage without GPU compositing issues. The 4px blur was cosmetic — removing it has zero functional impact.

## 4. Files Affected

| File | Line | Change |
|------|:---:|--------|
| `Sidebar.jsx` | 518 | Remove `backdrop-blur-sm` from className (~6 characters) |

**Files WILL NOT touch:** Everything else.

## 5. Risk Assessment

| Risk | Level | Note |
|------|:---:|------|
| Visual regression on desktop | NONE | `bg-black/50` already provides the dark overlay — blur was subtle enhancement only |
| Other tablet issues | NONE | Only the blur is removed; z-index, positioning, click handler unchanged |

## 6. Scope Lock

1 file, 1 line, 6 characters removed. No functional change.
