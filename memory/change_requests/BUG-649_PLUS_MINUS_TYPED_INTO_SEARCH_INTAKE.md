# BUG-649 — CR-482 P8: +/- Key Typed Into Search Box When No Last-Added Item Exists

**Registered:** 2026-11-05  
**Classification:** BUG  
**Severity:** P2 — MEDIUM  
**Risk:** LOW (UX annoyance, no data/money impact)  
**Process required:** Standard gate flow. FAST LANE eligible? **YES** (1 file, ≤5 lines, no financial logic, not R5 hotspot for this specific path)  
**Sprint:** TBD  
**Source:** QA-FOUND (CR-482 QA Report P6–P10, test 8.10)

---

## Description

When keyboard shortcuts are ON and there is no "last added" item (sent-only table, new order before adding, or after adding a weighed item), pressing `+` or `-` doesn't change any quantity (correct) but the character gets typed into the search box, emptying the item grid. Workaround: press Backspace.

**Root cause:** The P8 key handler's skip path (when `lastAddedKeyRef.current` is null) doesn't call `e.preventDefault()`, so the keypress propagates to the focused search input.

---

## Code Reality Check

**PARTIAL** — `OrderEntry.jsx`:
- P8 handler exists with `lastAddedKeyRef` check
- The "no match" path returns without `preventDefault`

---

## Duplicate Check

**DISTINCT.** No existing bug about +/- in search.

---

## Evidence

- **Screenshots:** QA report placed_2/placed_3 (search shows "+"/"-")
- **Steps to reproduce:**
  1. Shortcuts ON, reopen a table with only sent items (cafe103 C1)
  2. Press `+` or `-`
  3. Character appears in search box, item grid empties
- **Source:** QA-FOUND
- **Confidence:** CONFIRMED

---

## Blast Radius

- 1 file (`OrderEntry.jsx`), 1-2 lines (`e.preventDefault()` on the skip path)
- Hotspot: YES (OrderEntry.jsx is R5) but change is trivial
- Estimated scope: **SMALL (1 file, 1-2 lines)**

---

## Next: PLANNING (Fast Lane candidate — owner approval needed)
