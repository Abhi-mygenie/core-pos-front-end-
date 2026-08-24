# QA Report — BATCH-02: Settings Gate Sweep + Search + Discount Reason
**Date:** 2026-08-19
**Items:** BUG-339, BUG-329, BUG-331, BUG-330, BUG-332
**Test iterations:** iteration_2.json + iteration_3.json (TC-4 re-test)

---

## Precondition Check
```
Registry synced: YES — all 5 → IMPLEMENTED, sprint_key=pos_5_x
EXIT GATE: 5/5 PASSED
webpack: compiled successfully (1 pre-existing warning only)
Proceeding: YES
```

---

## Test Results

| # | TC | Item | Steps | Expected | Actual | Severity | Result |
|---|---|---|---|---|---|---|---|
| 1 | TC-1 | BUG-339 | Restaurant Settings Step 1 → Restaurant Type dropdown | Options: Normal, Hotel, Food Court | Options confirmed: Normal ✅ Hotel ✅ Food Court (value=food_court) ✅ | — | **PASS** |
| 2 | TC-2 | BUG-331 | Schedule Orders OFF → Save → Order Entry Takeaway | schedule-order-checkbox absent | `data-testid="schedule-order-checkbox"` absent from cart panel ✅ | — | **PASS** |
| 3 | TC-3 | BUG-330 | Cancel After Serve OFF → served item in order #002462 | Cancel hidden on served item | Old Monk item (served 16530+ min ago) shows NO cancel/trash button. Only Transfer + Re-Print visible ✅ | — | **PASS** |
| 4 | TC-4 | BUG-332 | searchOptions=['phone no'] only → search 'Table' → search '9' | 'Table' = no results; '9' = phone matches | 'Table' → zero results (0 dropdown) ✅; '9' → phone-matched orders appear (QA-TEST-99, delivery orders) ✅ | — | **PASS** |
| 5 | TC-5 | BUG-329 | Discount Report 30-day range | Renders OK; no `s26-orders-table` when no discounts | Page renders, no JS errors ✅; orders-table section hidden (no discounts exist — correct gate) ✅ | — | **PASS** |
| 6 | TC-6 | BUG-330 regression | Cancel After Serve OFF + preparing item | Cancel visible on preparing items | Trash icon present on newly added unplaced item ✅ | — | **PASS** |
| 7 | TC-7 | BUG-332 regression | All search options unchecked → search | All results appear (empty = no restriction) | Searching '1' → Table 1 (Ready ₹115) and others ✅ | — | **PASS** |
| 8 | R1 | Hotspot regression | Login → Dashboard → Order Entry → Add item → Collect Bill → Close | No errors, full flow works | Dashboard loads ✅, Order Entry opens ✅, Cart renders ✅, Collect Bill ₹230 present ✅, no JS errors ✅ | — | **PASS** |

---

## Summary

| Metric | Value |
|---|---|
| Total test cases | 8 |
| PASS | 8 |
| FAIL | 0 |
| INCONCLUSIVE | 0 (TC-4 re-tested, now PASS) |
| BLOCKER findings | 0 |
| MAJOR findings | 0 |
| MINOR findings | 0 |
| NOTE findings | 1 (Header key prop warning — pre-existing, not from this batch) |

---

## Coverage Check

| File Changed | Test Cases Covering It | Coverage |
|---|---|---|
| `RestaurantSettingsPage.jsx` | TC-1, TC-2, TC-3, TC-4 (all go through settings) | ✅ |
| `DiscountReportMockup.jsx` | TC-5 | ✅ |
| `profileTransform.js` | TC-2 (scheduleOrderEnabled flows through), TC-4 (searchOptions flows through) | ✅ |
| `CartPanel.jsx` | TC-2, TC-6, R1 | ✅ |
| `OrderEntry.jsx` | TC-3, TC-6, R1 | ✅ |
| `DashboardPage.jsx` | TC-4, TC-7, R1 | ✅ |

**Coverage: 6/6 files ✅**

---

## Registry Spot-Check
```
BUG-329: IMPLEMENTED, pos_5_x ✅
BUG-330: IMPLEMENTED, pos_5_x ✅
BUG-331: IMPLEMENTED, pos_5_x ✅
BUG-332: IMPLEMENTED, pos_5_x ✅
BUG-339: IMPLEMENTED, pos_5_x ✅
Result: NO DRIFT
```

---

## Notes (non-blocking)

- **Header key prop warning:** Pre-existing console warning (missing `key` prop in Header component list render). Not introduced by this batch. Log for future cleanup.
- **profileTransform.js:233 default:** `api.search_by || ['order id','table no','user id']` — 'phone no' absent from default. Pre-existing. If backend returns null, phone search not in default. Not a regression from BUG-332.
- **Settings restored:** All changed settings (Schedule Orders ON, Cancel After Serve ON, all 4 search options) restored after testing. Restaurant 478 in clean state.
- **TC-5 discount orders:** No discount data exists on test restaurant → `orders_table` empty → section correctly hidden. Behaviour is correct; full table render verification will happen when discount orders are present in owner smoke.

---

## QA Verdict

**QA PASS — Gate 5b**
- 8/8 test cases PASS
- 0 BLOCKER, 0 MAJOR, 0 MINOR findings
- 6/6 changed files covered
- Both hotspot files (OrderEntry.jsx R5, DashboardPage.jsx R5) verified clean
- Full critical-path smoke PASS (R1)
- Settings restored to working state

**Ready for Gate 6 (Owner Smoke).**

---

**Test reports:** `/app/test_reports/iteration_2.json`, `/app/test_reports/iteration_3.json`
**QA Report:** `/app/memory/test_reports/QA_REPORT_BATCH02_2026_08_19.md`
