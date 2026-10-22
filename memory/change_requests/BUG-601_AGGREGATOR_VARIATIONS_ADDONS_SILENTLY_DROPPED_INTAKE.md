# BUG-601 — Intake (Gate 1)
## Aggregator menu variations + addon_ids silently dropped on save

**ID:** BUG-601
**Type:** BUG
**Date:** 2026-10-21
**Sprint:** nov_cr_batch
**Area:** Menu / Order Entry
**Priority:** P0
**Risk:** HIGH — data silently lost, user sees "Saved" toast but changes never reach backend
**Fast Lane eligible:** NO (needs backend coordination)
**Source:** OWNER-REPORTED (Goan Kitchen)
**Duplicate check:** DISTINCT

---

## 1. Description
When editing an aggregator menu item (Swiggy/Zomato) in Menu Management, variations (e.g., "Choice of Dip") and add-ons are not saved. The user modifies variations, clicks Save, sees "Saved" toast — but the data is silently dropped. Refreshing the page shows the old data.

## 2. Root Cause (from investigation, HIGH confidence)
`menuManagementService.js` L48 (add) and L88 (edit):
```js
const SKIP = new Set(['variations', 'addon_ids']);
```

Both `addFoodAggregatorMultipart` and `editFoodAggregator` intentionally skip `variations` and `addon_ids` when building FormData. Comment: "multipart string value corrupts DB (cleanBindings TypeError)."

**Contrast with normal menu:** `editFood` (L74-81) wraps everything in `JSON.stringify(foodInfo)` as a single `food_info` field — variations included. Aggregator uses flat FormData fields (BUG-327 change), and FormData can't serialize nested objects.

## 3. Evidence
- `menuManagementService.js:88`: `const SKIP = new Set(['variations', 'addon_ids'])`
- `menuManagementService.js:45`: Same SKIP on add path
- Normal menu `editFood` L76: `formData.append('food_info', JSON.stringify(foodInfo))` — works

## 4. Blast Radius
- `menuManagementService.js` L48 + L88 — FE changes
- Backend aggregator food endpoints — must accept variations in some format
- Scope: MEDIUM (FE + backend coordination)

## 5. Owner Decisions
- OD-601-01: Fix approach:
  - (a) JSON.stringify variations in FormData: `formData.append('variations', JSON.stringify(...))`  — backend must parse JSON string
  - (b) Separate JSON API call for variations after multipart save
  - (c) Switch aggregator to `food_info` JSON wrapper like normal menu (reverts BUG-327 approach)
- OD-601-02: Backend team must confirm which format they can accept

## 6. Next
Backend coordination needed → then Planning Gate 2 → Implementation.
