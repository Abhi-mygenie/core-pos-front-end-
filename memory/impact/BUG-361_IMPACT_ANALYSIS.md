# BUG-361 — Impact Analysis: Sidebar Phase 2 Sweep

**Gate:** 2 — Impact Analysis
**Date:** 2026-08-26
**Intake:** `/app/memory/change_requests/BUG-361_SIDEBAR_SWEEP_PHASE2_INTAKE.md`
**Code Reality:** CODE EXISTS — 68 files confirmed with broken pattern
**Conflict Pre-Check:** NONE blocking (CR-052/BUG-194/CR-093/CR-101/BUG-272 all QA PASS awaiting smoke — done, not in-flight)
**Risk:** LOW (localStorage key, UI preference only, no API/financial)

---

## Pattern Breakdown

| Group | Count | Variable names | Sidebar prop |
|---|---|---|---|
| **Standard** | 67 | `isSidebarExpanded` / `setIsSidebarExpanded` | `setIsExpanded={setIsSidebarExpanded}` |
| **Special** | 1 (`OrderReportBetaPage.jsx`) | `sidebarExpanded` / `setSidebarExpanded` | `setIsExpanded={setSidebarExpanded}` |

Both groups are identical in structure — only variable names differ. BUG-358 Phase 1 fixed DashboardPage which is also the "special" variant (`sidebarExpanded`).

---

## Edit Required (per file)

### Edit A — localStorage-backed `useState` init (67 standard files)

**Current (exact string, all 67 files):**
```js
const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
```

**New:**
```js
// BUG-361: persist sidebar state across reloads
const [isSidebarExpanded, setIsSidebarExpanded] = useState(
  () => localStorage.getItem('mygenie_sidebar_expanded') === 'true'
);
```

### Edit B — `setIsExpanded` wrapper writes localStorage (67 standard files)

**Current (exact string, all 67 files):**
```
setIsExpanded={setIsSidebarExpanded}
```

**New:**
```
setIsExpanded={(v) => { setIsSidebarExpanded(v); localStorage.setItem('mygenie_sidebar_expanded', String(v)); }} // BUG-361
```

### Edit C — OrderReportBetaPage.jsx:232 (special variant)

**Current:**
```js
const [sidebarExpanded, setSidebarExpanded] = useState(false);
```

**New:**
```js
// BUG-361: persist sidebar state across reloads
const [sidebarExpanded, setSidebarExpanded] = useState(
  () => localStorage.getItem('mygenie_sidebar_expanded') === 'true'
);
```

### Edit D — OrderReportBetaPage.jsx:392 (special variant)

**Current:**
```
setIsExpanded={setSidebarExpanded}
```

**New:**
```
setIsExpanded={(v) => { setSidebarExpanded(v); localStorage.setItem('mygenie_sidebar_expanded', String(v)); }} // BUG-361
```

---

## Downstream Safety

**No downstream consumers are affected.** `Sidebar.jsx` receives `isExpanded` as a prop — it doesn't care how the parent stores the value. All report pages, all panel components, all Sidebar rendering logic is unchanged. The only difference is that the initial value on mount comes from `localStorage` instead of always being `false`.

**localStorage key conflict check:** `mygenie_sidebar_expanded` is used only by BUG-358 (DashboardPage). No other code reads or writes this key. All 68 pages read/write the same key intentionally — they share one preference.

---

## Files WILL Change
All 68 files (2 edits per file = 136 total string replacements). See intake doc for full list.

## Files Will NOT Touch
`Sidebar.jsx`, any service, transform, API endpoint, or other component.

---

## Verification Matrix

| # | Test | Expected |
|---|---|---|
| T1 | Expand sidebar on any report page → reload | Sidebar still expanded |
| T2 | Collapse sidebar on any report page → navigate to different page | Sidebar still collapsed on next page |
| T3 | Expand on Dashboard → navigate to Daily Sales → come back | All pages consistent |
| T4 | Check localStorage in DevTools | `mygenie_sidebar_expanded = 'true'/'false'` |
| T5 | OrderReportBetaPage specifically | Sidebar persists after reload |
