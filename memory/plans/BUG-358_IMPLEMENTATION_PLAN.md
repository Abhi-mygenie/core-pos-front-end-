# BUG-358 — Implementation Plan: Sidebar Collapsed State Not Persisted

**Gate:** 3 — Implementation Plan
**Date:** 2026-08-26
**Impact Analysis:** `/app/memory/impact/BUG-358_IMPACT_ANALYSIS.md`
**Code Reality:** NONE — clean fix
**Risk:** LOW — 2 lines in DashboardPage, no financial/API impact
**Scope:** DashboardPage only (Phase 1)
**Files WILL change:** `DashboardPage.jsx`
**Files will NOT touch:** Sidebar.jsx, any other page

---

## Entry Verification

| # | File | Expected current state |
|---|---|---|
| 1 | `DashboardPage.jsx:451` | `const [sidebarExpanded, setSidebarExpanded] = useState(false); // Default collapsed on login` |
| 2 | `DashboardPage.jsx:1680` | `isExpanded={sidebarExpanded}` |
| 3 | `DashboardPage.jsx:1681` | `setIsExpanded={setSidebarExpanded}` |

---

## Edits

### Edit 1 — `DashboardPage.jsx:451` — localStorage-backed initialiser

**Current:**
```js
const [sidebarExpanded, setSidebarExpanded] = useState(false); // Default collapsed on login
```

**New:**
```js
// BUG-358: persist sidebar expanded state across reloads
const [sidebarExpanded, setSidebarExpanded] = useState(
  () => localStorage.getItem('mygenie_sidebar_expanded') === 'true'
);
```

---

### Edit 2 — `DashboardPage.jsx:1681` — Wrap setIsExpanded to write localStorage on toggle

**Current:**
```jsx
isExpanded={sidebarExpanded}
setIsExpanded={setSidebarExpanded}
```

**New:**
```jsx
isExpanded={sidebarExpanded}
setIsExpanded={(v) => { // BUG-358: persist sidebar state
  setSidebarExpanded(v);
  localStorage.setItem('mygenie_sidebar_expanded', String(v));
}}
```

---

## Execution Sequence

1. Edit 1 (line 451 — init)
2. Edit 2 (line 1681 — write on toggle)
3. Compile check → 0 warnings

---

## Verification Matrix

| Edit | File | Test | Manual/Auto |
|---|---|---|---|
| E1 | DashboardPage | Expand sidebar → hard reload → sidebar still expanded | MANUAL |
| E1 | DashboardPage | Collapse sidebar → hard reload → sidebar still collapsed | MANUAL |
| E2 | DashboardPage | Expand → DevTools Application → `mygenie_sidebar_expanded = 'true'` | MANUAL |
| E2 | DashboardPage | Collapse → DevTools → `mygenie_sidebar_expanded = 'false'` | MANUAL |
| Regression | DashboardPage | All other DashboardPage functionality unaffected (orders, sockets, cards) | MANUAL spot-check |

---

## Post-Code Registry Checklist

- [ ] `registry.json`: BUG-358 → `status: "IMPLEMENTED"`, `gate: "5"`
- [ ] `BUG_TRACKER.md`: row updated
- [ ] `FILE_OWNERSHIP.md`: `DashboardPage.jsx` listed with BUG-358
- [ ] Code markers: `// BUG-358` on both modified lines
- [ ] Compile: 0 new warnings
