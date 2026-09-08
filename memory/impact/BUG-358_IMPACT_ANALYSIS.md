# BUG-358 — Impact Analysis: Sidebar Collapsed State Not Persisted

**Gate:** 2 — Impact Analysis
**Date:** 2026-08-26
**Code Reality:** NONE (plain `useState(false)` at DashboardPage.jsx:451, no localStorage)
**Conflict Pre-Check:** DashboardPage.jsx last touched by CR-097 (auto-settle queue, 2026-07-23). The sidebarExpanded state block (lines 451, 1680-1681) is isolated from that change. NONE.
**Risk:** LOW (UI preference only, no financial or API impact)

---

## Data Flow Trace

```
DashboardPage.jsx:451
  const [sidebarExpanded, setSidebarExpanded] = useState(false);  ← never reads localStorage
        ↓ prop passed at line 1680-1681
  <Sidebar isExpanded={sidebarExpanded} setIsExpanded={setSidebarExpanded} />
        ↓ inside Sidebar.jsx
  line 484: onClick={() => setIsExpanded(false)}   ← collapse button
  line 493: onClick={() => setIsExpanded(true)}    ← expand button
```

**Fix:** Init from localStorage + write back via a wrapper function at the `setIsExpanded` prop boundary.

---

## What Changes — DashboardPage.jsx only

### E1 — Line 451: localStorage-backed initialiser

```js
// BUG-358: persist sidebar expanded state across reloads
const [sidebarExpanded, setSidebarExpanded] = useState(
  () => localStorage.getItem('mygenie_sidebar_expanded') === 'true'
);
```

### E2 — Line 1681: wrapper writes on every toggle

```jsx
<Sidebar
  isExpanded={sidebarExpanded}
  setIsExpanded={(v) => {
    setSidebarExpanded(v);
    localStorage.setItem('mygenie_sidebar_expanded', String(v)); // BUG-358
  }}
/>
```

No change inside `Sidebar.jsx` — it calls the `setIsExpanded` prop as-is. The write happens in DashboardPage's wrapper.

---

## Scope Decision (OD-1)

**Intake OD-1:** "Apply to DashboardPage only, or all pages that own `sidebarExpanded` state?"

**Impact analysis finding:** 65+ page files own `isSidebarExpanded`/`sidebarExpanded` state with `useState(false)`. All use the same pattern.

**Recommended approach:**
- **Phase 1 (this fix):** DashboardPage only — it is the primary working screen. 2-line change.
- **Phase 2 (separate sweep):** All other pages read the same key on init so they reflect the saved state immediately.

If owner wants all pages in one go: the fix is identical in every file — same 2 edits. Blast radius would be LARGE (~65 files) but each edit is 2 lines and zero logic. Can be done as a batch.

**This impact analysis scopes Phase 1: DashboardPage only.**

---

## Dependency Map Check

Per FILE_OWNERSHIP.md: "If you touch DashboardPage.jsx → verify: OrderEntry.jsx, socketHandlers.js, all card components, StatusConfigPage.jsx (settings)"

This change is confined to 2 lines of state initialization and prop wrapping. No card components, no socket, no OrderEntry are affected. Dependency rule satisfied — no verification of downstream files required.

---

## Files WILL Change

| File | Edit | Lines | Risk |
|---|---|---|---|
| `pages/DashboardPage.jsx` | Line 451 (init) + Line 1681 (wrapper) | 2 | LOW |

## Files Will NOT Touch

`Sidebar.jsx`, any other page, any service or transform.

---

## Verification Matrix

| Edit | File | How to Verify |
|---|---|---|
| E1 | DashboardPage | Expand sidebar → reload page → sidebar is still expanded |
| E1 | DashboardPage | Collapse sidebar → reload page → sidebar is still collapsed |
| E2 | DashboardPage | Expand via sidebar expand button → localStorage key = 'true' in DevTools Application tab |
| E2 | DashboardPage | Collapse via sidebar collapse button → localStorage key = 'false' |

---

## Post-Code Registry Checklist

- [ ] registry.json: BUG-358 → status: IMPLEMENTED, gate: 5
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: DashboardPage.jsx listed
- [ ] Code markers: `// BUG-358` on modified lines
- [ ] Compile: 0 new warnings
