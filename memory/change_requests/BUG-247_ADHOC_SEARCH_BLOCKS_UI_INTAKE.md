# BUG-247 — Smart Purchase Ad-Hoc Typeahead Blocks UI (Performance)

**ID:** BUG-247
**Type:** BUG
**Created:** 2026-07-25
**Severity:** P2 (UX degradation — UI freezes on keystroke, not broken functionality)
**Risk:** LOW
**Module:** Inventory — Smart Purchase (`AutoShoppingList.jsx`)
**Duplicate Check:** RELATED to BUG-236 (dropdown clipped by overflow-hidden). DISTINCT: BUG-236 is visual clipping, BUG-247 is performance blocking.
**Code Reality:** Bug confirmed — `VendorSuggestionCell` has no `React.memo`, `filteredMaster` not memoized.
**Source:** OWNER-REPORTED (session 2026-07-25, previously reported and still exists)
**Confidence:** CONFIRMED (code structure: typeahead keystroke re-renders entire table including 50+ heavy Popover/Command components)

---

## Description

When typing in the ad-hoc ingredient search box in Smart Purchase, the UI freezes/lags on each keystroke. The search input becomes unresponsive.

### Root Cause

Every keystroke triggers `setTypeaheadQuery()` → re-renders **entire** `AutoShoppingList` → re-renders ALL table rows → each row contains a `VendorSuggestionCell` (120-line Popover+Command combobox). With 50+ rows, this is 50+ heavy component re-renders per keystroke.

- `typeaheadQuery` is local state (L37) — every change re-renders the whole component
- `filteredMaster` computed inline (L39-44) — NOT memoized
- No `React.memo` on table rows or `VendorSuggestionCell`
- No debounce on the filter

---

## Blast Radius

- 1 file: `AutoShoppingList.jsx` (~5 lines for React.memo fix) OR +1 new file for extracted component
- Scope: SMALL
- Hotspot: NO
- Financial: NO

---

## Next
Planning Gate 2 → Gate 3 → Implementation
