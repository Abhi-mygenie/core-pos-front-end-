# BUG-136 — Impact Analysis + Implementation Plan

**Role:** PLANNING agent (Gate 2 + Gate 3)
**Date:** 2026-06-16
**Code Reality:** NONE — no fix exists yet
**Conflict Pre-Check:** CLEAR — no open item touches layout architecture

---

## GATE 2: IMPACT ANALYSIS

### Root Cause
Each of the 43 page components renders `<Sidebar />` inside its own JSX. React Router unmounts the entire page (including Sidebar) on navigation, then mounts the new page with a fresh Sidebar instance (scroll = 0).

### Data Flow
```
User clicks sidebar item
  → handleChildClick() → navigate(path)
  → React Router unmounts current Route component
  → Current <Sidebar /> destroyed (scroll state lost)
  → New Route component mounts
  → New <Sidebar /> mounts (scroll = 0, top)
```

### Affected Files

| Category | Files | Impact |
|----------|:-----:|--------|
| Sidebar component | 1 | Core fix location |
| Report screens (Insights) | 37 | Remove `<Sidebar>` from each (Option A) |
| Other pages with Sidebar | 6 | May also benefit |
| App.js / Layout wrapper | 1-2 | New file or modification |

### Options Evaluated

| Option | Effort | Scope | Downsides |
|--------|:------:|:-----:|-----------|
| **A: Shared Layout** | MEDIUM | 37+ files | Large diff, cleaner architecture |
| **B: Scroll Restore via Context** | SMALL | 2 files (Sidebar + context) | Keeps bad architecture, adds complexity |
| **C: scrollIntoView** | SMALL | 1 file (Sidebar) | Scroll still visually jumps, just lands at active item |

### Recommendation

**Option B** — scroll position restore via context. Reasons:
- SMALL scope (2 files only — Sidebar.jsx + new context or existing InsightsCacheContext)
- Zero risk to existing screens (no file removals)
- Immediate UX fix
- Option A (layout refactor) can be done in Phase 4 hardening (S41) later

### Owner Decisions Needed
- NONE. This is a clear UX bug with a clear fix.

---

## GATE 3: IMPLEMENTATION PLAN

### Approach: Scroll Position Restore via Shared Context

Store sidebar scroll position in React context (or ref passed through InsightsCacheContext). On Sidebar mount, restore scroll position from context. On scroll/click, save position to context.

### Edit 1: Add scroll state to InsightsCacheContext

**File:** `contexts/InsightsCacheContext.jsx`

Add:
```javascript
const [sidebarScrollTop, setSidebarScrollTop] = useState(0);
// ... provide in context value:
{ ..., sidebarScrollTop, setSidebarScrollTop }
```

### Edit 2: Sidebar — save scroll position on interaction

**File:** `components/layout/Sidebar.jsx`

Add a `ref` to the `<nav>` scroll container. On any navigation click, save `navRef.current.scrollTop` to context before navigating.

```javascript
const navRef = useRef(null);
const { sidebarScrollTop, setSidebarScrollTop } = useInsightsCache();

// Save scroll before navigating
const saveScroll = () => {
  if (navRef.current) setSidebarScrollTop(navRef.current.scrollTop);
};

// Restore scroll on mount
useEffect(() => {
  if (navRef.current && sidebarScrollTop > 0) {
    navRef.current.scrollTop = sidebarScrollTop;
  }
}, []); // run once on mount
```

Modify `<nav>` to use ref:
```jsx
<nav ref={navRef} className="flex-1 overflow-y-auto py-4 min-h-0">
```

Modify `handleChildClick` to call `saveScroll()` before `navigate()`.

### Edit 3: No changes to 37 screen files

Zero modifications to any report screen. The fix is entirely in Sidebar + context.

### Verification Matrix

| # | Check | How to Verify | Automated? |
|---|-------|---------------|:---:|
| 1 | Scroll position preserved after navigation | Click item below fold → navigates → scroll stays | NO (screenshot) |
| 2 | First load starts at top | Fresh login → sidebar at top | NO |
| 3 | Scroll restores after browser back | Navigate → back button → sidebar position correct | NO |
| 4 | No errors in console | Navigate 5 screens → 0 console errors | NO |
| 5 | Webpack compiles | tail frontend.out.log | YES |

### Scope Lock

**Files WILL change:**
- `contexts/InsightsCacheContext.jsx` — add 2 state values
- `components/layout/Sidebar.jsx` — add ref + save/restore logic (~10 lines)

**Files will NOT change:**
- Any report screen (.jsx)
- App.js
- Any service file
- Any route

### Risk Register

| Risk | Probability | Impact | Mitigation |
|------|:---:|:---:|------------|
| InsightsCacheContext not available outside /reports-module/* routes | LOW | HIGH | Sidebar inside InsightsCacheProvider already (routes wrap it) |
| Scroll restore causes flicker | LOW | LOW | Use `useLayoutEffect` instead of `useEffect` for synchronous restore |
| Context clears on logout (CR-044 R-8) resets scroll | LOW | NONE | Correct behavior — fresh start after logout |

### Post-Code Registry Checklist

```
- [ ] registry.json: BUG-136 → status: IMPLEMENTED
- [ ] BUG_TRACKER.md: row added
- [ ] FILE_OWNERSHIP.md: 2 files listed
- [ ] Code markers: // BUG-136 in modified files
```

---

## HANDOVER

Plan ready. 2 files, ~15 lines of new code. Zero screen modifications.
- Code Reality: NONE
- Scope: 2 files (Sidebar.jsx + InsightsCacheContext.jsx)
- Verification: 5 checks (1 automated, 4 manual)
- Owner decisions: NONE
- **Awaiting Gate 4 GO.**

---

*Planning complete for BUG-136. "Save scroll before navigate, restore on mount."*
