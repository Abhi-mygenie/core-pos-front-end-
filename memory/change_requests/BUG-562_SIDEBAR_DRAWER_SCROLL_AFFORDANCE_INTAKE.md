# BUG-562 — Sidebar Drawer: Navigation Items Below Fold Have No Scroll Affordance

**ID:** BUG-562
**Date:** 2026-10-15
**Type:** BUG
**Severity:** P2 — MEDIUM
**Risk:** LOW
**Sprint:** oct_cr_batch
**Source:** OWNER-REPORTED — smoke test 2026-10-15
**Duplicate check:** DISTINCT — BUG-131 (CLOSED) fixed bottom section being non-sticky; BUG-136 fixed scroll jump. Neither addresses discovery affordance.
**Related:** BUG-555 WP-B (created the drawer), BUG-131 CLOSED (Sidebar bottom sticky)
**Code Reality:** NONE (no bottom gradient/indicator present on `<nav>`)
**Fast Lane eligible:** YES — 1 file, ≤5 lines, not R5, not financial

---

## Description

BUG-555 WP-B implemented a slide-over sidebar drawer at <1280px. The drawer content structure is:

```
<aside h-screen>
  [Logo + collapse button]      ← ~64px
  [View toggles container]      ← ~96px
  <nav flex-1 overflow-y-auto>  ← scrollable, takes remaining height
    Dashboard
    Day Closure
    Expenses
    Menu Management             ← often below fold on short phones
    Credit Management           ← below fold
    Daily Report                ← below fold
    Insights                    ← below fold
    Inventory                   ← below fold
    ...
  </nav>
  [Quick actions: Ringer, Refresh, Logout]  ← fixed at bottom ~120px
</aside>
```

On a typical Android phone in portrait (~700-800px CSS height):
- Header: ~64px, toggles: ~96px, quick actions: ~120px → nav visible height ≈ **420-520px**
- Dashboard + Day Closure + Expenses alone ≈ 3 × 48px = 144px
- Reports, Insights, Inventory, etc. are below the 144px mark but within a 420px nav = **they DO fit**, but with no visual cue

**The problem:** The `<nav>` has `overflow-y-auto` (L634) but NO bottom gradient, scroll indicator, or bottom-shadow. When the nav content fits within the visible area, there's no issue. But when it doesn't — particularly when many sections are expanded, or on very short screens — users have **no affordance** that more items exist below.

**Owner screenshot:** Shows "Expenses" → blank gap → "Ringer On". The gap IS the scroll area with more items (Reports, Insights, etc.) hidden below, but no shadow/gradient shows this to the user.

**Impact:** Users on short phones cannot discover Reports / Insights navigation without knowing to scroll the sidebar drawer. Critical navigation paths are invisible.

---

## Evidence

- **Screenshot:** Owner smoke test 2026-10-15 (Screenshot 2 — sidebar drawer open)
- **Investigation:** Sidebar.jsx L634 confirmed `overflow-y-auto` with no scroll indicator
- **Confidence:** CONFIRMED — `sidebarMenuItems` order (Day Closure L65, Expenses L71 come BEFORE Reports L92, Insights L140 in the array — later items require scroll on short screens)
- **Steps to reproduce:**
  1. Open app on a phone with ~700-800px CSS viewport height in portrait
  2. Click sidebar hamburger button
  3. Observe sidebar drawer — "Reports" / "Insights" sections not visible, no scroll indicator

---

## Root Cause

`Sidebar.jsx:634` — `<nav ref={navRef} className="flex-1 overflow-y-auto py-4 min-h-0">`:
- Scrollable via `overflow-y-auto` but has no bottom gradient or scroll indicator
- No CSS `after:` pseudo-element or scroll-fade effect

**Fix:** Add a bottom fade gradient on the nav element when content overflows (e.g., `[mask-image:linear-gradient(to_bottom,_black_calc(100%-40px),_transparent_100%)]` via CSS/Tailwind, OR a simple `box-shadow: inset 0 -24px 16px -8px rgba(0,0,0,0.08)` when `scrollHeight > clientHeight`).

---

## Blast Radius

- **Files:** 1 (`src/components/layout/Sidebar.jsx`)
- **Lines:** ~3-5
- **Hotspots:** NO
- **Financial:** NO
- **Scope:** SMALL

---

## Owner Decisions Required

**OD-562-01:** Scroll affordance style — options:
- **(a)** CSS bottom-fade gradient on the nav (always-on, lightweight, no JS)
- **(b)** Conditional bottom-shadow via a small React scroll-state hook (appears only when not scrolled to bottom)

Agent recommendation: **(a)** — simpler, no extra state.
