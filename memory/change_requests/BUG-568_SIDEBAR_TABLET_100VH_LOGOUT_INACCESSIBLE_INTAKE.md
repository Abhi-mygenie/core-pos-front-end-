# BUG-568 — Intake (Gate 1)
## Sidebar drawer: Logout inaccessible on iPad/Android — h-screen (100vh) exceeds visible viewport + nav items cut off by maskImage

**ID:** BUG-568
**Type:** BUG (found during Gate 6 Owner Smoke Test)
**Date:** 2026-10-16
**Registered by:** INTAKE agent (owner smoke test 2026-10-16)
**Severity:** P1 — HIGH
**Risk:** LOW (Sidebar.jsx — not R5 hotspot)
**Sprint:** oct_cr_batch
**Area:** Other (cross-cutting tablet layout — sidebar is present on all pages)
**Related:** BUG-555 WP-B (introduced tablet drawer), BUG-562 (maskImage gradient added to nav)
**Fast Lane eligible:** YES — 1 file, 2 lines, not R5, not financial
**Process:** Fast Lane (owner Gate 4 GO required)
**Duplicate check:** DISTINCT — no prior registration of 100vh viewport issue on sidebar drawer.
**Note:** Code was incorrectly implemented during investigation session (process violation). Intake doc created retroactively.

---

## 1. Description (Sub-issues from smoke test)

### Sub-issue A — Logout inaccessible (BLOCKER on iPad/Android)

The sidebar drawer (`isTablet=true`, `<1280px`) has `h-screen` (`height: 100vh`) applied alongside `position: fixed; inset-y: 0`. On **iOS Safari** and **Android Chrome**, `100vh` includes the browser chrome (URL bar, bottom navigation bar, tab strip) — making `100vh` larger than the actual visible viewport.

The `aside` therefore extends **below** the visible fold. The bottom section (`flex-shrink-0`) containing Ringer / Refresh / Profile / **Logout** is pushed below the visible area. Since the bottom section has no `overflow-y-auto`, there is **no way to scroll to Logout** — the user is stuck.

**Owner report (iPad portrait):** *"In iPad I am not able to scroll left bottom panel for logout. On portrait mode not able to scroll down the sidebar for logging out."*

**Owner report (Android tablet):** *"In Android tab sidebar is very difficult to work through"* — same root cause.

### Sub-issue B — Nav items cut off by maskImage fade

`Sidebar.jsx:634` — The `<nav>` applies `maskImage: linear-gradient(to bottom, black calc(100% - 40px), transparent 100%)` (BUG-562, added as scroll affordance) on ALL viewports including tablet.

On touch devices this **hides** the last 40px of nav items rather than signalling scrollability. Items like "Menu Management" appear to fade and disappear, making users think the nav ends there. Combined with Sub-issue A (compressed drawer height), the nav is both shorter than it should be AND has its bottom items hidden.

---

## 2. Affected Files

| File | Line | Current | Issue |
|---|---|---|---|
| `src/components/layout/Sidebar.jsx` | 525 | `h-screen` (= 100vh on all viewports) | 100vh > actual viewport on iOS/Android |
| `src/components/layout/Sidebar.jsx` | 634 | `maskImage` gradient applied unconditionally | Hides nav items on tablet touch |

---

## 3. Evidence

- **Screenshot 1:** iPad portrait — sidebar showing Ringer/Refresh/Profile but Logout below fold
- **Screenshot 2:** Android tablet — sidebar drawer open, nav items faded, bottom section visible but Logout not reachable
- **Code trace:** `Sidebar.jsx:525` `h-screen fixed inset-y-0` confirmed — `h-screen` overrides inset height on mobile
- **Confidence:** CONFIRMED — CSS box model traced + owner-reproduced on device
- **Source:** OWNER-REPORTED (Gate 6 smoke test 2026-10-16)

---

## 4. Blast Radius

```bash
grep -rn "Sidebar" /app/frontend/src/ --include="*.jsx" | wc -l
```
- **1 file changed:** `src/components/layout/Sidebar.jsx`
- **2 lines changed:** L525 (`h-screen` → conditional) + L634 (maskImage conditional)
- **Hotspot files:** NO — Sidebar.jsx not in R5 list
- **Estimated scope:** SMALL

---

## 5. Severity Rubric

**P1 — HIGH:** Feature broken (Logout inaccessible), workaround is page reload only. Realtime-adjacent (affects all tablet staff sessions).

---

## 6. Risk Classification

**Risk: LOW**
- Pure CSS change (h-screen → h-[100dvh], maskImage conditional)
- No JS, state, API, localStorage, financial logic
- Not R5 hotspot
- Desktop sidebar completely unaffected (`isTablet=false`)

**Fast Lane eligible:** YES (all 7 conditions met)

---

## 7. Proposed Fix (for Planning reference)

**E1 — Sidebar.jsx:525:** `h-screen` → `${isTablet ? "h-[100dvh]" : "h-screen"}`
- `100dvh` = dynamic viewport height (excludes browser chrome). Supported iOS Safari 15.4+, Android Chrome 108+.

**E2 — Sidebar.jsx:634:** `style={{ maskImage: ... }}` → `style={!isTablet ? { maskImage: ... } : undefined}`
- Removes gradient fade on tablet drawer so all nav items are clearly visible.
- Desktop scroll affordance (BUG-562) preserved unchanged.

---

## 8. Open Decisions

**None.** Fix is unambiguous. No business rule ambiguity.

**OD-568-01:** Owner approves Fast Lane GO? → Implementation (2 lines, Sidebar.jsx)
