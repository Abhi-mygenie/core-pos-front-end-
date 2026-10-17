# CR-355 IMPACT ANALYSIS — Sidebar Printers Shortcut: Remove comingSoon + Wire to /settings
**Date:** 2026-08-31
**Stage:** Gate 2 — Impact Analysis
**Code Reality:** PARTIAL — code exists with comingSoon: true; path not yet set
**Conflict Pre-Check:** NO conflicts — Sidebar.jsx last modified by BUG-361 (2026-08-26, localStorage persistence sweep). That change touched useState init patterns across pages, not the sidebarMenuItems[] settings children array.
**Risk:** LOW

---

## Data Flow Trace

```
Sidebar.jsx sidebarMenuItems[]
  settings children:
    ...
    { id: "printers", label: "Printers", comingSoon: true }  ← CURRENT (no path)
    ...

Click handler (line 380-389):
  if (parentId === 'settings') {
    if (child.comingSoon) { showComingSoon(child.label); return; }  ← currently triggers here
    setActiveItem(child.id);
    saveScroll();
    navigate(child.path);  ← after fix: executes with path: "/settings"
  }
```

### Fix
Change `{ id: "printers", label: "Printers", comingSoon: true }` to `{ id: "printers", label: "Printers", path: "/settings" }`.

This navigates to `/settings` (same as "All Settings" and "Table Management" shortcuts). The user lands on the Settings page where they can find and tap the Printers tile. Full auto-open of the Printers panel is a future enhancement (out of scope here).

---

## Affected Files
| File | Change | Risk |
|---|---|---|
| `Sidebar.jsx` | Line 115: remove `comingSoon: true`, add `path: "/settings"` | LOW |

## Files Will NOT Touch
All other files.

---

## Fast Lane Eligibility
✅ All conditions met:
- 1 file only
- ≤10 changed lines (1 line)
- No API, transform, state, localStorage, provider, financial logic
- Not in hotspot list (R5) — Sidebar is listed but last touch was BUG-361 (2026-08-26)
- Owner approval needed to confirm Fast Lane

**Recommendation: Fast Lane** — skip Gate 3 plan, implement directly after owner approves.

---

## Verification Matrix

| # | Test | Steps | Expected |
|---|---|---|---|
| V1 | No more Coming Soon | Sidebar → Settings → Printers | No toast; navigates to /settings |
| V2 | Path correct | After navigation | URL is /settings |
| V3 | Printer Agent / Local Printer tile accessible | On /settings, find Printers tile | Printers tile visible; tap opens correct view (Local or Agent based on localStorage) |

---

## Owner Decision: NONE — path to /settings is the correct minimal fix
## Risk: LOW
## Blast Radius: SMALL (1 file, 1 line)
## Next: Fast Lane (owner approval) OR Gate 3 (if owner prefers full gate)
