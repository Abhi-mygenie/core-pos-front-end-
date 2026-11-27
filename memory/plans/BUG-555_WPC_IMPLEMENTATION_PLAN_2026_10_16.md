# Implementation Plan — BUG-555 WP-C
## Header Breakpoints: lg → xl (1024px → 1280px)

**Role:** PLANNING (Gate 3 — Implementation Plan)
**Date:** 2026-10-16
**Based on:** `impact/BUG-555_WPC_IMPACT_ANALYSIS_2026_10_16.md` (Gate 2 revalidated)
**Anchors verified at HEAD:** 2026-10-16 — all 12 match exactly
**Code Reality:** NONE — WP-C not yet implemented
**Risk:** MEDIUM · 1 file · 12 edits · not R5 · not financial
**Conflict:** CLEAN — BUG-565/566 changes accounted for in anchors below

---

## Scope Lock

**WILL change:**
- `src/components/layout/Header.jsx` (12 targeted edits)

**WILL NOT touch:**
- `DashboardPage.jsx` — no prop/state/hook change needed
- `Sidebar.jsx`, `OrderEntry.jsx`, any report page
- Any API, transform, localStorage, or auth file

---

## Step 0 — Entry Verification (MANDATORY before coding)

Implementation agent must run before any edit:

```bash
# Verify C1 anchor
sed -n '275p' /app/frontend/src/components/layout/Header.jsx
# Expected: contains "hidden lg:flex items-center gap-1 ml-4"

# Verify C4 anchor (BUG-565 content must be present)
sed -n '437p' /app/frontend/src/components/layout/Header.jsx
# Expected: contains "flex-1 min-w-0 flex justify-end px-2 lg:px-4"

# Confirm WP-C not already started
grep -c "BUG-555.*WP-C\|xl:flex items-center gap-1" /app/frontend/src/components/layout/Header.jsx
# Expected: 0
```

If any check fails → STOP. Return to Planning.

---

## Edits — Exact search_replace Strings

Execute in order C1 → comment → C2 → C3 → C4 → C5 → C6 → C7 → C8 → C9 → C10 → C11.
Compile check after all 12.

---

### C1 — L275: Pills nav breakpoint

**File:** `src/components/layout/Header.jsx`

```
OLD:
          <nav className="hidden lg:flex items-center gap-1 ml-4"> {/* CR-414: pills hidden <1024px */}

NEW:
          <nav className="hidden xl:flex items-center gap-1 ml-4"> {/* CR-414 + BUG-555 WP-C: pills hidden <1280px */}
```

---

### Comment — L341–342: Tablet dropdown block comment

**File:** `src/components/layout/Header.jsx`

```
OLD:
          {/* CR-414: Tablet filter dropdown — mirrors the pills nav (status filters in channel view,
              channel filters in status view). Visible <1024px only (OD-537-02, OD-414-01=A, OD-414-05=A). */}

NEW:
          {/* CR-414 + BUG-555 WP-C: Tablet filter dropdown — mirrors the pills nav (status filters in channel view,
              channel filters in status view). Visible <1280px only (OD-537-02, OD-414-01=A, OD-414-05=A, OD-555-10). */}
```

---

### C2 — L343: Tablet dropdown container breakpoint

**File:** `src/components/layout/Header.jsx`

```
OLD:
          <div className="relative lg:hidden ml-2" ref={tabletDropdownRef}>

NEW:
          <div className="relative xl:hidden ml-2" ref={tabletDropdownRef}> {/* BUG-555 WP-C */}
```

---

### C3 — L432: PlatformDropdown wrapper breakpoint

**File:** `src/components/layout/Header.jsx`

```
OLD:
        <div className="hidden lg:flex items-center pl-3 ml-1 border-l" style={{ borderColor: COLORS.borderGray }}> {/* CR-414: hidden <1024px */}

NEW:
        <div className="hidden xl:flex items-center pl-3 ml-1 border-l" style={{ borderColor: COLORS.borderGray }}> {/* CR-414 + BUG-555 WP-C: hidden <1280px */}
```

---

### C4 — L437: Center section padding breakpoint
**Note:** BUG-565 already added `min-w-0` to this line — preserve it.

**File:** `src/components/layout/Header.jsx`

```
OLD:
        <div className="flex-1 min-w-0 flex justify-end px-2 lg:px-4"> {/* CR-414: tighter padding <1024px */ /* BUG-565 */}

NEW:
        <div className="flex-1 min-w-0 flex justify-end px-2 xl:px-4"> {/* CR-414 + BUG-555 WP-C: tighter padding <1280px */ /* BUG-565 */}
```

---

### C5 — L442: PlatformCounterChip wrapper breakpoint

**File:** `src/components/layout/Header.jsx`

```
OLD:
          <div className="hidden lg:flex items-center mr-3"> {/* CR-414: hidden <1024px */}

NEW:
          <div className="hidden xl:flex items-center mr-3"> {/* CR-414 + BUG-555 WP-C: hidden <1280px */}
```

---

### C6 — L445: Search box flex mode breakpoint

**File:** `src/components/layout/Header.jsx`

```
OLD:
          <div className="relative flex-1 lg:flex-initial min-w-0"> {/* CR-414: search takes remaining row width <1024px */}

NEW:
          <div className="relative flex-1 xl:flex-initial min-w-0"> {/* CR-414 + BUG-555 WP-C: search takes remaining row width <1280px */}
```

---

### C7 — L449: Search box fixed width breakpoint

**File:** `src/components/layout/Header.jsx`

```
OLD:
                isSearchFocused ? "lg:w-64" : "lg:w-48"

NEW:
                isSearchFocused ? "xl:w-64" : "xl:w-48"
```

---

### C8 — L487: Search results dropdown positioning breakpoint

**File:** `src/components/layout/Header.jsx`

```
OLD:
                className="absolute top-full right-0 lg:right-auto lg:left-1/2 lg:-translate-x-1/2 mt-1 w-80 lg:w-96 bg-white rounded-lg shadow-lg border overflow-hidden z-50 max-h-96 overflow-y-auto" /* CR-414: right-anchored, narrower <1024px */

NEW:
                className="absolute top-full right-0 xl:right-auto xl:left-1/2 xl:-translate-x-1/2 mt-1 w-80 xl:w-96 bg-white rounded-lg shadow-lg border overflow-hidden z-50 max-h-96 overflow-y-auto" /* CR-414 + BUG-555 WP-C: right-anchored <1280px */
```

---

### C9 — L769: Add group — add flex-shrink-0

**File:** `src/components/layout/Header.jsx`

```
OLD:
        <div className="flex items-center gap-3">

NEW:
        <div className="flex items-center gap-3 flex-shrink-0"> {/* BUG-555 WP-C */}
```

**Note:** This is unique at L769 — confirm it is the Right Section Add+Online group, NOT any other `flex items-center gap-3` in the file.

---

### C10 — L774: Add button — touch target + aria-label

**File:** `src/components/layout/Header.jsx`

```
OLD:
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg transition-colors hover:opacity-80"
              style={{ backgroundColor: COLORS.primaryOrange, color: "white" }}
              onClick={onAddOrder}

NEW:
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 max-sm:min-w-[44px] max-sm:min-h-[44px] rounded-lg transition-colors hover:opacity-80"
              aria-label="Add"
              style={{ backgroundColor: COLORS.primaryOrange, color: "white" }}
              onClick={onAddOrder}
```

---

### C11 — L779: Add text — icon-only on phones

**File:** `src/components/layout/Header.jsx`

```
OLD:
              <span className="text-sm font-medium">Add</span>

NEW:
              <span className="hidden sm:inline text-sm font-medium">Add</span> {/* BUG-555 WP-C: icon-only <640px */}
```

---

## Execution Sequence

```
1. Step 0: Entry verification (3 grep checks)
2. Apply C1 → comment → C2 → C3 → C4 → C5 → C6 → C7 → C8 → C9 → C10 → C11
3. Compile check: webpack compiled with 1 warning (pre-existing only, 0 new)
4. Self-verify all 12 edits (grep BUG-555 WP-C in Header.jsx)
5. EXIT GATE (5 checkboxes)
6. Write QA handover
```

---

## Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Desktop (≥1280px) regression | Very low | `xl:` only fires at ≥1280. Desktop sees identical layout. |
| <1024px tablet regression | None | `xl:` doesn't fire below 1280. <1024px already was tablet. |
| C9 — wrong `flex items-center gap-3` matched | Low | Use surrounding context (Right Section comment + Add button data-testid) |
| C10 — desktop Add button height changes | None | `max-sm:` only applies at <640px. Desktop unchanged (OD-555-17). |
| BUG-565 min-w-0 lost at C4 | None | C4 old_str includes min-w-0 explicitly — preserve confirmed |

---

## Verification Matrix (Step 4 — seeds QA handover)

| # | Edit | File | Verification | Method |
|---|---|---|---|---|
| V1 | C1–C8 | Header.jsx | `grep -c "lg:flex\|lg:hidden\|lg:px-4\|lg:flex-initial\|lg:w-64\|lg:w-48\|lg:right-auto\|lg:w-96" Header.jsx` = 0 for WP-C lines | CLI grep |
| V2 | C1–C8 | Header.jsx | `grep -c "xl:flex\|xl:hidden\|xl:px-4\|xl:flex-initial\|xl:w-64\|xl:w-48\|xl:right-auto\|xl:w-96" Header.jsx` ≥ 8 | CLI grep |
| V3 | C4 | Header.jsx | L437 still contains `min-w-0` (BUG-565 preserved) | grep |
| V4 | C9 | Header.jsx | L769 `flex-shrink-0` present on Add group | grep |
| V5 | C10 | Header.jsx | L774 `max-sm:min-w-[44px]` present | grep |
| V6 | C11 | Header.jsx | L779 `hidden sm:inline` present | grep |
| V7 | all | Header.jsx | `grep -c "BUG-555 WP-C" Header.jsx` ≥ 8 (code markers) | CLI |
| V8 | compile | — | `webpack compiled with 1 warning` | supervisor log |
| V9 (browser) | C1–C8 | Header.jsx | At 1100×800: pills hidden, tablet-filter-dropdown-btn visible | Browser |
| V10 (browser) | C1–C8 | Header.jsx | At 1280×800: pills visible, tablet dropdown hidden | Browser |
| V11 (browser) | C9–C11 | Header.jsx | At 400×800: Add shows icon only, 44×44px | Browser |
| V12 (browser) | C9–C11 | Header.jsx | At 1280×800: Add button height = 40px (OD-555-17) | Browser |

---

## Post-Code Registry Checklist (Step 5)

```
- [ ] registry.json: BUG-555 → status: GATE_5A_IMPLEMENTED (wpc_status: GATE_5A), sprint_key: oct_cr_batch
- [ ] BUG_TRACKER.md: prepend new "Last Updated" row — BUG-555 WP-C GATE_5A_IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: Header.jsx entry — append "BUG-555 WP-C IMPL 2026-10-16 (C1–C11, L275/343/432/437/442/445/449/487/769/774/779)"
- [ ] Code markers: // BUG-555 WP-C on each changed line (already in new strings above)
- [ ] Compile: webpack 1 pre-existing warning, 0 new
```
