# BUG-642 — Impact Analysis (Gate 2)

**ID:** BUG-642  **Gate:** 2 — IMPACT ANALYSIS  **Date:** 2026-11-05
**Risk:** MEDIUM  **Code Reality:** CONFIRMED GAP — no global Back button
**Conflict Pre-Check:** NONE — no open items touch Sidebar.jsx or Header.jsx

---

## 1. Problem

PWA installed in standalone mode (`manifest.json` → `"display": "standalone"`) hides all browser chrome, including the back button. The app shell has no in-app Back control, so users navigating into sub-pages, drawers, or reports have no way to return except Esc (which only works on some modals).

## 2. Root Cause

**`public/manifest.json` L11:**
```json
"display": "standalone"
```
This removes the browser URL bar and navigation buttons.

**App shell layout (`Sidebar.jsx` + `Header.jsx`):** Neither component renders a global Back button. Some individual pages added ad-hoc back buttons (see §3), but there is no app-wide solution.

## 3. Current Back Button Landscape (ad-hoc, per-page)

| Page | File | How |
|---|---|---|
| Night Audit | `pages/pms/NightAuditPage.jsx:128` | `navigate(-1)` |
| Guest Folio | `pages/pms/GuestFolioPage.jsx:160` | `navigate(-1)` |
| Revenue Dashboard | `pages/pms/RevenueDashboardPage.jsx:169` | `navigate(-1)` |
| Ingredient Movement Report | `pages/reports-module/IngredientMovementReportPage.jsx:188` | `navigate(-1)` |
| Item Sales Ledger | `pages/reports-module/ItemSalesLedgerMockup.jsx:378` | `navigate('/reports-module/dashboard')` |
| Item Consumption Report | `pages/reports-module/ItemConsumptionReportPage.jsx:236` | `navigate(-1)` |
| P&L Report | `pages/reports-module/PLReportPage.jsx:209` | `navigate(-1)` |

**Pattern:** `ChevronLeft` or `ArrowLeft` icon + `navigate(-1)` in page headers. Not present on Dashboard, Order Entry, Settings, Credit, Menu Management, or any sidebar-level navigation.

## 4. Affected Files

| File | Change | Lines |
|---|---|---|
| `components/layout/Sidebar.jsx` | Add global Back button at top of sidebar | ~8-10 new lines |

**NOT touched:** `public/manifest.json` (keep `standalone` — owner decision OD-642-01 locked: in-app button, not `minimal-ui`), Header.jsx, App.js, any page component.

## 5. Fix Strategy

**Add a single Back button at the top of the Sidebar**, visible when:
- `window.history.length > 1` AND current path is not `/dashboard` (the home page)
- Uses `useNavigate()` → `navigate(-1)` (consistent with existing ad-hoc patterns)
- Icon: `ArrowLeft` (already imported for other uses in the codebase)
- Positioned above the first menu item, always accessible

**Why Sidebar and not Header:**
- Sidebar is the persistent navigation element (visible on all authenticated pages)
- Header is contextual (changes per page — shows filters, tabs, etc.)
- Sidebar already has `useNavigate` imported (L3, L260)

## 6. Downstream / Regression

- Existing per-page Back buttons (§3) continue to work independently — no conflict
- Sidebar is NOT an R5 hotspot file
- No financial, order, or payment logic affected
- Back button uses `navigate(-1)` (standard React Router) — no custom routing

## 7. Verification Matrix

| # | What | How to Verify |
|---|---|---|
| V-1 | Back button visible in sidebar after navigating to a sub-page | Browser: Dashboard → Reports → check sidebar |
| V-2 | Back button hidden on Dashboard (home) | Browser: navigate to /dashboard |
| V-3 | Back button works in PWA standalone mode | Install PWA → navigate → tap Back |
| V-4 | Existing per-page back buttons still work | Browser: Night Audit back button |
| V-5 | Sidebar layout not broken (spacing, scroll) | Visual check at 1920px and 390px |

## 8. Open Questions / Owner Decisions

**All locked at intake:**
- OD-642-01: LOCKED — in-app Back button (not `minimal-ui`)
- OD-642-02: browser question no longer needed

**No new ODs from IA.**

## 9. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Back button overlaps sidebar menu items | LOW | LOW | Fixed position above menu, adequate spacing |
| `navigate(-1)` exits app to blank page on first navigation | LOW | MEDIUM | Guard: hide when `location.key === 'default'` (first entry) or path is `/dashboard` |

## 10. Next

Gate 3 → Implementation Plan (exact lines, edit-by-edit).
