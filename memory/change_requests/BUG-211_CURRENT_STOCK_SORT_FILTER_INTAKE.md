# BUG-211 — Current Stock: No Default Sort + KPI Cards Not Clickable

**ID:** BUG-211
**Type:** BUG
**Created:** 2026-07-20
**Severity:** P1 (HIGH)
**Risk:** MEDIUM
**Module:** Inventory — Current Stock
**Duplicate Check:** RELATED to CR-075 (S2 filter UX, S3 status chips — PARTIALLY SHIPPED), CR-081 (HALTED)
**Code Reality:** NONE (no sort code exists, KPI cards are plain divs)
**Source:** OWNER-REPORTED (this session)
**Confidence:** CONFIRMED (code inspection proves both gaps)

---

## Description

Two usability bugs on the Current Stock screen (/inventory-current-stock):

### Bug A: No Default Sort — Low Stock Buried
- Items display in raw API order (insertion order)
- Out-of-stock and low-stock items are scattered throughout the table
- **Expected:** Low stock and out-of-stock items sorted to the TOP by default (Out of Stock first, then Low Stock, then In Stock)

### Bug B: KPI Cards Not Clickable as Filters
- The 4 KPI cards (Total Items, Low Stock, Out of Stock, Categories) look interactive (coloured borders, icon badges) but are static `<div>`s
- User expectation: clicking "Low Stock (XX)" card should filter the table to show only low-stock items
- Status chip row below duplicates this intent but is less discoverable
- **Expected:** KPI cards act as toggle filters — click to filter, click again to clear

### Owner Suggestion
- Instead of separate KPI cards + status chips, make the KPI cards themselves the filter mechanism. Remove the separate chip row for cleaner UX.

---

## Evidence

- Code: `CurrentStockPanel.jsx` line 85-97 — `filtered` useMemo has NO `.sort()` call
- Code: `CurrentStockPanel.jsx` line 146-183 — KPI cards are `<div>` with no `onClick`
- Code: `CurrentStockPanel.jsx` line 244-268 — Status chips DO have `onClick` → `setStatusFilter()`
- QA iterations 18-21 did not test sort order (passed filter presence, not filter function)

## Blast Radius
- 1 file: `CurrentStockPanel.jsx` (331 lines)
- ~20-30 lines change (add sort in useMemo, add onClick to KPI cards)
- Hotspot: NO
- Scope: SMALL

## Fix Plan (seeding — formal plan at Gate 3)
- Add `.sort()` to `filtered` useMemo: Out of Stock (qty≤0) → Low Stock (isLowStock) → In Stock
- Add `onClick={() => setStatusFilter('low')}` to Low Stock KPI card (toggle: click again clears)
- Add `onClick={() => setStatusFilter('out')}` to Out of Stock KPI card
- Visually indicate active filter state on KPI card (ring/border highlight)
- Consider removing status chip row if KPI cards replace their function (owner decision)

## Next
Planning Gate 2 → Gate 3 → Implementation
