# Impact Analysis — BUG-416
## Night Audit + Revenue Dashboard: No Sidebar or Back Button

**Date:** 2026-09-15  **Agent:** PLANNING (ALPHA v0.7)  **Stage:** Gate 2
**Code Reality:** NONE — neither page imports Sidebar or has back navigation
**Duplicate check:** DISTINCT
**Conflict pre-check:** NightAuditPage.jsx (CR-363, NEW Sep 2026). RevenueDashboardPage.jsx (CR-366, NEW Sep 2026). No other agent touched these since creation. Zero conflicts.

---

## Risk Classification

**Risk: LOW**  
Trigger: Layout + navigation only. No logic, no API, no data change. Pure structural addition.

---

## Data Flow Trace (navigation gap)

```
User navigates to /pms/night-audit or /pms/revenue
  → Page renders as: <div className="min-h-screen bg-[#F7F7F7] px-4 py-5">
      → No Sidebar component — sidebar not visible
      → No ArrowLeft back button — only exit is browser back button
      → Staff stuck: cannot return to PMS without browser back

FIX:
  Wrap both pages with the standard PMS layout shell:
  <div className="flex h-screen bg-[#F7F7F7]">
    <Sidebar isExpanded={...} setIsExpanded={...} />
    <main className="flex-1 overflow-auto">
      <div className="px-6 py-4">
        [Back button in header] + existing page content
      </div>
    </main>
  </div>
```

**Reference pattern:** `InHouseGuestsPage.jsx` — used as the exact model for both pages.

---

## Affected Files

### WILL CHANGE — `src/pages/pms/NightAuditPage.jsx`

| Edit | Location | Current | Change |
|---|---|---|---|
| E1 | Line ~2 (imports) | No Sidebar, no useNavigate, no ArrowLeft | Add 3 imports: `Sidebar`, `{ useNavigate }`, `ArrowLeft` from lucide-react |
| E2 | Line ~80 (state section) | No sidebar state | Add: `const [isSidebarExpanded, setIsSidebarExpanded] = useState(() => localStorage.getItem('mygenie_sidebar_expanded') !== 'false')` + `const navigate = useNavigate()` |
| E3 | Line ~109 (outer return div) | `<div className="min-h-screen bg-[#F7F7F7] px-4 py-5">` | Replace outer wrapper with flex h-screen + `<Sidebar>` + `<main className="flex-1 overflow-auto">` |
| E4 | Line ~114 (page header area) | No back button in header | Add `<button onClick={() => navigate(-1)}>` with ArrowLeft icon before the existing header title |

### WILL CHANGE — `src/pages/pms/RevenueDashboardPage.jsx`

| Edit | Location | Current | Change |
|---|---|---|---|
| E5 | Line ~2 (imports) | No Sidebar, no ArrowLeft | Add 3 imports same as E1 |
| E6 | Line ~78 (state section) | No sidebar state | Add state + navigate same as E2 |
| E7 | Line ~155 (outer return div) | `<div className="min-h-screen...">` | Replace with flex shell + Sidebar + main same as E3 |
| E8 | Line ~161 (header area) | No back button | Add back button same as E4 |

**~8 edit sites, ~20 lines per file, ~40 lines total**

### WILL NOT TOUCH
- `App.js` — routes already defined, no change
- Any service, transform, or data file
- Page logic, charts, API calls — untouched

---

## Verification Matrix

| # | Test | How to verify |
|---|---|---|
| V1 | Navigate to /pms/night-audit → Sidebar visible | Browser |
| V2 | Navigate to /pms/revenue → Sidebar visible | Browser |
| V3 | Back button on Night Audit → returns to previous page | Browser |
| V4 | Back button on Revenue → returns to previous page | Browser |
| V5 | Sidebar expand/collapse persists across page navigation | Browser + localStorage |
| V6 | Existing page content (charts, tables, date picker) unchanged | Browser |

---

## Owner Decisions: NONE

Option A was confirmed: add Sidebar + Back button to both pages.

---

## Post-Code Registry Checklist

- [ ] registry.json: BUG-416 → IMPLEMENTED
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: NightAuditPage.jsx + RevenueDashboardPage.jsx BUG-416
- [ ] Code marker: `// BUG-416` in every modified section
- [ ] webpack: 0 new warnings

*IA written 2026-09-15 · PLANNING agent (ALPHA v0.7)*
