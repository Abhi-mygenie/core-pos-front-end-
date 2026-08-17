# BUG-236 — Implementation Plan (Gate 3)
# Smart Purchase — Ad-hoc Typeahead Dropdown Clipped by overflow-hidden

**Date:** 2026-08-14
**Builds on:** `memory/impact/BUG-236_ADHOC_DROPDOWN_IMPACT_ANALYSIS.md`
**Risk:** LOW
**Scope lock:**
  - File WILL change: `components/inventory/smart/AutoShoppingList.jsx`
  - Files will NOT touch: SmartPurchasePanel.jsx · VendorSuggestionCell.jsx · all services

---

## Pre-Plan Verification (ALL PASS — checked against live code)

| Target | Plan says | Live code | Match? |
|---|---|---|---|
| Card container | L130: `overflow-hidden` | Confirmed L130 | ✅ |
| "No match" div | L42: `absolute z-10` | Confirmed L42 | ✅ |
| Dropdown div | L47: `absolute z-10 ... data-testid="adhoc-typeahead-dropdown"` | Confirmed L47 | ✅ |
| Inner table wrapper | L162: `overflow-x-auto` (already correct) | Confirmed L162 | ✅ |

---

## Execution Order

```
Edit 1 → Remove overflow-hidden from Section 1 card (L130)  — unblocks dropdown escape
Edit 2 → z-10 → z-50 on "No match" div (L42)               — safety z-index
Edit 3 → z-10 → z-50 on match dropdown (L47)               — safety z-index
```

All 3 edits are in different non-overlapping locations → can run in parallel.

---

## Edit 1 — `AutoShoppingList.jsx:130`
### Remove `overflow-hidden` from Section 1 (Purchase List) card container

**Current (L130):**
```jsx
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
```

**New:**
```jsx
      {/* BUG-236: overflow-hidden removed — was clipping AdHocTypeahead dropdown */}
      <div className="bg-white rounded-xl border border-slate-200">
```

**Why:** `overflow-hidden` clips the absolutely-positioned dropdown in `AdHocTypeahead`.
The inner table wrapper at L162 (`overflow-x-auto`) handles horizontal scroll independently.

---

## Edit 2 — `AutoShoppingList.jsx:42` (inside `AdHocTypeahead`)
### z-10 → z-50 on "No matching ingredients" empty-state div

**Current (L42):**
```jsx
          <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg px-3 py-2 text-sm text-slate-400">
```

**New:**
```jsx
          <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg px-3 py-2 text-sm text-slate-400"> {/* BUG-236 */}
```

---

## Edit 3 — `AutoShoppingList.jsx:47` (inside `AdHocTypeahead`)
### z-10 → z-50 on match dropdown list

**Current (L47):**
```jsx
          <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-52 overflow-y-auto" data-testid="adhoc-typeahead-dropdown">
```

**New:**
```jsx
          <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-52 overflow-y-auto" data-testid="adhoc-typeahead-dropdown"> {/* BUG-236 */}
```

---

## Verification Matrix

| # | Edit | How to Verify | Auto? |
|---|---|---|---|
| V1 | Compile | webpack 0 new warnings | YES (log) |
| V2 | Edit 1 — Dropdown visible | Smart Purchase → "+ Add Item" → type any letter → dropdown appears BELOW input, NOT clipped | NO (browser) |
| V3 | Edit 1 — Dropdown overlays section below | Dropdown extends visually past card edge without clipping | NO (browser) |
| V4 | Edit 3 — Pick works | Click ingredient in dropdown → item added to table as AD-HOC row, typeahead closes | NO (browser) |
| V5 | Edit 1 — Table scroll preserved | Narrow browser → table scrolls horizontally inside card | NO (browser) |
| V6 | Edit 2+3 — Empty state visible | Type non-existent ingredient → "No matching ingredients" text appears | NO (browser) |
| V7 | Regression — Section 2 unaffected | All Ingredients section still renders, search + category filter work | NO (browser) |
| V8 | Regression — VendorSuggestionCell | Vendor combobox in purchase rows still opens correctly | NO (browser) |

---

## Post-Code Registry Checklist

```
□ 1. registry.json: BUG-236 → status: IMPLEMENTED, gate: 5a
□ 2. BUG_TRACKER.md: BUG-236 row → IMPLEMENTED
□ 3. FILE_OWNERSHIP.md: AutoShoppingList.jsx entry added with BUG-236
□ 4. Code markers: // BUG-236 in every modified line
□ 5. Compile check: webpack 0 new warnings
```

---

```
Planning complete: BUG-236
Stage: Impact Analysis (Gate 2) + Implementation Plan (Gate 3) — both this session
Code reality: PARTIAL (confirmed at updated line numbers)
Risk: LOW
File WILL change: components/inventory/smart/AutoShoppingList.jsx (3 lines)
Files will NOT touch: SmartPurchasePanel.jsx · VendorSuggestionCell.jsx · all services
Owner decisions: NONE
Awaiting Gate 4 GO.
```
