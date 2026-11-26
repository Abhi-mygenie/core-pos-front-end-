# BUG-642 — Implementation Plan (Gate 3)

**ID:** BUG-642  **Gate:** 3 — IMPLEMENTATION PLAN  **Date:** 2026-11-05
**Risk:** MEDIUM  **Files WILL change:** 1 (Sidebar.jsx)  **Files will NOT touch:** Header.jsx, manifest.json, App.js, any page component
**Code Reality:** CONFIRMED GAP  **Conflict:** NONE
**IA:** `impact/BUG-642_IMPACT_ANALYSIS.md`

---

## Edit E-1: Add ArrowLeft to lucide-react imports

**File:** `src/components/layout/Sidebar.jsx`
**Line:** 8

**Current (L8):**
```jsx
  LayoutGrid, List, Columns, Rows, LineChart, Banknote, Store as StoreIcon, Receipt, Link2, ArrowLeftRight, BedDouble, Menu
```

**New (L8):**
```jsx
  LayoutGrid, List, Columns, Rows, LineChart, Banknote, Store as StoreIcon, Receipt, Link2, ArrowLeftRight, BedDouble, Menu, ArrowLeft
```

**Why:** Need the ArrowLeft icon for the Back button. Already used in other files (RecipeFormPanel.jsx).

---

## Edit E-2: Add Back button between logo section and view toggles

**File:** `src/components/layout/Sidebar.jsx`
**Insert after:** L567 (the closing `</div>` of the logo + collapse toggle section)

The logo section ends at approximately L567:
```jsx
      </div>
      {/* VIEW_MODE_LOCK v2 ... */}
```

**Insert between them:**
```jsx
      {/* BUG-642: Global in-app Back button — works in both browser and PWA standalone */}
      {location.pathname !== '/dashboard' && location.pathname !== '/' && location.pathname !== '/loading' && (
        <div
          className="px-3 py-2"
          style={{ borderBottom: `1px solid ${COLORS.borderGray}` }}
        >
          <button
            data-testid="sidebar-back-btn"
            onClick={() => navigate(-1)}
            className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-colors hover:bg-gray-100 ${
              isExpanded ? "justify-start" : "justify-center"
            }`}
            style={{ color: COLORS.grayText }}
            title={!isExpanded ? "Go Back" : undefined}
          >
            <ArrowLeft className="w-5 h-5 flex-shrink-0" />
            {isExpanded && (
              <span className="text-sm font-medium">Back</span>
            )}
          </button>
        </div>
      )}
```

**Why:**
- Shows only when NOT on Dashboard, Login, or Loading (nowhere to go "back" from home)
- Uses `navigate(-1)` — same pattern as existing per-page back buttons (NightAuditPage, GuestFolioPage, etc.)
- Respects sidebar collapsed/expanded state (icon-only when collapsed, "Back" label when expanded)
- Styled consistently with the view toggle section below it (same padding, border, colors)
- `data-testid="sidebar-back-btn"` for QA automation

**Sidebar visual order after edit:**
1. Logo + collapse toggle
2. **Back button** ← NEW (hidden on Dashboard/Login/Loading)
3. View mode toggles (Table/Order, Channel/Status)
4. Menu items (Dashboard, Order Entry, Reports, etc.)

---

## Verification Matrix

| # | Test | Steps | Expected | Automated? |
|---|---|---|---|:---:|
| V-1 | Back visible on sub-page | Login → Dashboard → Reports | Back button visible in sidebar | NO — browser |
| V-2 | Back hidden on Dashboard | Navigate to /dashboard | No Back button | NO — browser |
| V-3 | Back navigates correctly | Dashboard → Reports → click Back | Returns to Dashboard | NO — browser |
| V-4 | Back works in PWA | Install PWA → Dashboard → Settings → Back | Returns to Dashboard | NO — device |
| V-5 | Collapsed sidebar shows icon only | Collapse sidebar → navigate to Reports | ArrowLeft icon visible, no "Back" text | NO — browser |
| V-6 | Sidebar layout intact | Check all pages | No overlap, spacing correct | NO — visual |
| V-7 | Existing per-page backs still work | Night Audit → click page Back button | Works as before | NO — browser |

## Post-Code Registry Checklist

- [ ] registry.json: BUG-642 → status: GATE_5A_IMPLEMENTED, sprint_key: nov_cr_batch
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: Sidebar.jsx added with BUG-642
- [ ] Code marker: `// BUG-642` comment in modified file
- [ ] Compile: webpack 0 new errors

## Execution Sequence

1. Edit E-1 (add import)
2. Edit E-2 (add Back button JSX)
3. webpack compile check
4. Self-test V-1 through V-7
