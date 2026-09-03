# BUG-358 — Sidebar Collapsed State Lost on Every Page Reload

**Date:** 2026-08-26
**Registered by:** INTAKE agent
**Source:** AGENT-DISCOVERED (INVESTIGATION_REPORT_BATCH_2026_08_26.md, Issue 9)
**Sprint:** POS 5.1 backlog

---

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Severity | P2 |
| Risk | LOW |
| Side | Frontend |
| Root cause | CODE_ERROR (no localStorage persistence) |
| Duplicate check | RELATED to BUG-136 (sidebar scroll position) — DISTINCT scope (collapse state vs scroll) |
| Code reality | NONE (fix not present) |
| Blast radius | SMALL (1–2 files: DashboardPage.jsx, possibly other pages) |
| Fast Lane eligible | NO (localStorage change — excluded from Fast Lane per rules) |

## Description

Every time a user reloads or navigates, the sidebar resets to collapsed (`false`). A user who prefers the expanded sidebar must re-expand it on every session. `DashboardPage.jsx:451` uses plain `useState(false)` with no `localStorage` read or write.

## Root Cause

```js
// DashboardPage.jsx:451 — CURRENT (wrong)
const [sidebarExpanded, setSidebarExpanded] = useState(false);
```

No `localStorage` interaction anywhere around this state.

## Proposed Fix

```js
// Read from localStorage on init
const [sidebarExpanded, setSidebarExpanded] = useState(
  () => localStorage.getItem('mygenie_sidebar_expanded') === 'true'
);
// Write on every toggle (wherever setSidebarExpanded is called)
// e.g. setIsExpanded={(v) => { setSidebarExpanded(v); localStorage.setItem('mygenie_sidebar_expanded', String(v)); }}
```

Note: `OrderReportBetaPage.jsx:218` has the same pattern — may need the same fix for consistency.

## Evidence

- File: `src/pages/DashboardPage.jsx:451`
- Steps: Expand sidebar → reload page → sidebar is collapsed again
- Confidence: HIGH (code-verified)

## Owner Decisions Needed

OD-1: Apply to DashboardPage only, or all pages that own `sidebarExpanded` state?
