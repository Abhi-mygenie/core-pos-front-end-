# BUG-585 — Search: partial results hard-capped at 5, all results should show

**ID:** BUG-585
**Type:** BUG
**Registered:** 2026-10-17
**Sprint:** nov_cr_batch
**Status:** GATE_1_INTAKE
**Priority:** P1
**Risk:** LOW
**Area:** Dashboard — Search

---

## Description

The search bar silently drops any partial match beyond position 5. When more than 5 tables share a digit (e.g. searching "2" matches tables 2, 12, 20, 21, 22, 32, 102 …), only the first 5 in API insertion order are shown. Table "2" may never appear.

**Owner directive (2026-10-17):** "All partials should be displayed. Exact match should be at top."

---

## Root Cause

`searchItems` function `DashboardPage.jsx` L103:
```javascript
return { exact, partial: partial.slice(0, 5) };
//                                ^^^^^^^^^^^ hard cap
```

The slice discards all results beyond 5. There is no relevance sorting — results come in API insertion order, so a short exact label like "2" can be outranked by longer labels like "20", "21", "22" simply because they were inserted earlier.

---

## Expected Behaviour

- All partial matches are returned, not just 5
- Exact matches (once BUG-584 is fixed) appear in the dedicated "Exact Match" section at the top
- Partial section shows every remaining match with no artificial cap

---

## Blast Radius

- **File:** `DashboardPage.jsx` — 1 line (`L103`)
- **Change:** Remove `.slice(0, 5)` — return full `partial` array
- **Scope:** SMALL — single line, search display only
- **Fast Lane eligible:** YES (1 file, 1 line, no API/state/financial logic)
- **Note:** DashboardPage.jsx is R5 hotspot — Fast Lane needs owner approval despite small change

---

## Duplicate Check

- No existing bug about search cap
- **Result: DISTINCT**

---

## Evidence

- **Source:** OWNER-REPORTED + screenshot + code trace (2026-10-17)
- **Confidence:** CONFIRMED — code verified at DashboardPage.jsx L103
- **Steps:** Dashboard → type "2" → Table 2 missing from results even though it exists
