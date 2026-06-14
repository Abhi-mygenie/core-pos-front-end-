# CR-041 — Navigation Consistency: Standardize Page Opening Patterns Across Sidebar

**Status:** REGISTERED — INTAKE COMPLETE
**Created:** 2026-06-12
**Type:** CR (Change Request)
**Area:** Sidebar Navigation / Page Layout / UX Consistency
**Priority:** P2 (UX consistency — inconsistent navigation patterns confuse users)
**Sprint:** POS 4.0

---

## 1. Symptom / Requirement

Different sidebar items open pages in **different ways**, creating an inconsistent user experience:

| Sidebar Item | Current Opening Pattern |
|---|---|
| **Menu Management** | Slide-over panel (half-page overlay on dashboard) |
| **Credit Management** | Slide-over panel (half-page overlay on dashboard) |
| **Settlement** | Slide-over panel (half-page overlay on dashboard) |
| **Insights → reports** (Sales, Items & Menu, Order Ledger, etc.) | Full-page route (`/reports-module/*`) |
| **Order Reports → reports** (Audit Report, Order Summary, etc.) | Full-page route |
| **Restaurant Setup** | Full-page route (`/restaurant-settings`) |
| **Visibility Settings** | Full-page route (`/visibility/status-config`) |

**Owner directive:** Investigate the full inventory of opening patterns, identify the gaps, and make it consistent. Deep investigation needed to catalogue every sidebar item's behaviour.

---

## 2. Investigation Scope (deferred — registration only)

When investigation begins:

### Step 1: Catalogue every sidebar nav item
For each item, document:
- Label
- Opening pattern: slide-over panel / full-page route / modal / other
- Route (if full-page): `/path`
- Component: which `.jsx` renders
- Can it co-exist with the dashboard? (panels yes, routes no)

### Step 2: Identify the inconsistencies
- Which items SHOULD be slide-over panels vs full-page routes?
- Is there a principle? (e.g., "operational tools = panel, reports = full page, settings = full page")

### Step 3: Owner decision on target pattern
- **Option A:** Everything becomes a full-page route (like Restaurant Setup / Reports)
- **Option B:** Everything becomes a slide-over panel (like Menu Management / Credit)
- **Option C:** Defined rules — e.g., "tools on dashboard = panel; standalone workflows = full page"
- **Option D:** Owner picks per-item

### Files to investigate
- `Sidebar.jsx` — nav items and their click handlers (some use `navigate()`, some use panel state)
- `App.js` — route definitions
- `DashboardPage.jsx` — panel mount points (Menu Management, Credit, Settlement slide-overs)
- Individual panel/page components

---

## 3. Known Patterns (from prior work)

| Pattern | Items Using It | How It Works |
|---|---|---|
| **Slide-over panel** | Menu Management (CR-014), Credit Management (BUG-104), Settlement (CR-015) | Panel mounts inside `DashboardPage.jsx`, slides over the order dashboard. Dashboard stays live underneath. |
| **Full-page route** | Restaurant Setup (CR-019), All Insights reports (CR-011), Order Reports, Visibility Settings | React Router navigates away from dashboard to a standalone page. Dashboard unmounts. |

---

## 4. Impact (preliminary)

- **Files:** Multiple — depends on which direction the standardization goes
- **Regression risk:** MEDIUM-HIGH — changing navigation patterns affects every page
- **Money/payload impact:** NONE — purely UX/navigation
- **Downstream:** Could affect deep-link behaviour, browser back button, mobile UX

---

## 5. Screenshot Evidence

Owner-provided screenshots show:
1. **Insights section:** Dashboard, Settlement, Sales, Items & Menu, Order Ledger, Payments, Tax (all full-page routes)
2. **Full sidebar:** Order Reports (with X/Y/Z to be removed per CR-040), Insights, Credit Management, Settlement, Restaurant Setup, Menu Management, Visibility Settings — mix of panels and routes

---

## 6. Gate Status

| Gate | Status |
|------|--------|
| 0 — Registration | ✅ COMPLETE |
| 1 — Intake | ✅ COMPLETE (this document) |
| 2 — Impact Analysis | PENDING (deep investigation deferred per owner) |
| 3 — Implementation Plan | PENDING |
| 4 — Code Gate | PENDING |
| 5 — Implementation + QA | PENDING |
| 6 — Owner Smoke | PENDING |

---

*CR-041 Intake — 2026-06-12*
