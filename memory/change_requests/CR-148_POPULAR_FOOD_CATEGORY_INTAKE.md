# CR-148 — Popular Food Category

**Type:** Change Request (Feature)
**ID:** CR-148
**Date:** 2026-08-17
**Status:** INTAKE COMPLETE — awaiting Gate 2 (Planning)

---

## Description

Owner wants a "Popular" food category visible in the POS order entry / menu panel — a curated list of frequently ordered or owner-marked items that surfaces as a quick-access category. This helps staff quickly find and add popular items without browsing category by category.

## Classification

| Field | Value |
|---|---|
| Type | CR |
| Area | Menu Management / Order Entry |
| Priority | P2 |
| Severity | MEDIUM — enhances usability but not blocking |
| Risk | MEDIUM (UI state, menu filtering, data source for "popular" flag) |
| Fast Lane | NO — multi-component change |

## Evidence

- Source: OWNER-REPORTED
- Screenshot: not provided
- Steps to reproduce: Open POS order entry — no "Popular" category tab/section visible
- Confidence: REPORTED

## Code Reality Check

```bash
grep -rn "popular\|isPopular\|is_popular" src/ → 12 matches
  - api/transforms/restaurantSettingsTransform.js (is_popular field mapped)
  - data/mockMenu.js (mock data has popular flag)
  - pages/RestaurantSettingsPage.jsx (referenced but not exposed)
```

- **Code reality: PARTIAL** — `is_popular` flag exists in transforms and mock data; no visible "Popular" category in POS order entry UI

## Blast Radius

- ~12 lines (SMALL scope)
- Hotspot files: order entry panel, category filter/tab component
- Estimated scope: SMALL-MEDIUM (2-4 files)

## Expected Behavior

- A "Popular" tab/category appears in order entry alongside other food categories
- Items marked as popular (via menu management or backend flag) appear under this category
- Owner can mark/unmark items as popular from Menu Management

## Owner Decisions Needed

1. Should "Popular" be auto-generated (based on order frequency) or manually curated by owner?
2. Should it appear as a top category tab or a special section within categories?

## Duplicate Check

DISTINCT

---

**Next:** Planning Gate 2
