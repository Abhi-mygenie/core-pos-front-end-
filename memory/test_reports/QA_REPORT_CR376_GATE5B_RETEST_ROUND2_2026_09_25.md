# QA Report — CR-376 Gate 5b Re-test Round 2
**Date:** 2026-09-25
**QA Agent:** ALPHA v0.7 Role 4
**Sprint:** `sep_bug_closure`
**Round:** Re-test 2 (Round 1 = 2026-09-25, T10 MAJOR FAIL)
**Fixes verified this round:** BUG-462 (T10), BUG-464 (chip text)

---

## Precondition Check
- Registry synced: YES — CR-376 GATE_5A_IMPLEMENTED, EXIT GATE: ALL 5 PASSED ✅
- Compile: `webpack compiled with 1 warning` (pre-existing isScheduled — not CR-376) ✅
- Environment: Frontend running on port 3000, API at preprod.mygenie.online ✅

---

## Credentials Available This Round

| Alias | Account | Status |
|---|---|---|
| QA_HYATT | owner@hyatt.com / `***` | ✅ Available |
| QA_OWNER | Normal+Premium restaurant | ❌ Not in test_credentials.md (gitignored, cleared on re-pull) |
| cafe103 | Normal-only | ❌ Not in test_credentials.md (gitignored, cleared on re-pull) |

---

## Test Results

| # | Test | Account | Expected | Actual | Result | Severity |
|---|---|---|---|---|---|---|
| T9 | QA_HYATT — 10 pills in Local Settings | QA_HYATT | 10 pills rendered | 10 pills: 24hrs Menu, Bar & Drinks, Breakfast, FOOD MENU, GROK, Kids Menu, PET FOOD, Promational Menu, Promotional Menu, Tea, Coffee & Soft Beverages | **PASS** ✅ | — |
| T10 | QA_HYATT first boot — empty-state | QA_HYATT | `data-testid="active-menu-empty-state"` present, "Normal menu has no items configured." | Empty-state element **PRESENT** ✅. Text: "Normal menu has no items configured. Please update in Local Settings." | **PASS** ✅ (was MAJOR FAIL Round 1 — **fixed by BUG-462**) | — |
| T6 (partial) | Non-Normal menu with items → no empty-state | QA_HYATT | Empty-state NOT shown for menus with products | FOOD MENU (86 products): no empty-state ✅. GROK (23 products): no empty-state ✅ | **PASS** ✅ | — |
| BUG-464 chip | Chip text correct for "FOOD MENU" type | QA_HYATT | Chip reads "FOOD MENU" (not "FOOD MENU Menu") | Chip: `"FOOD MENU"` ✅ | **PASS** ✅ | — |
| BUG-464 chip | Chip text correct for "GROK" type | QA_HYATT | Chip reads "GROK Menu" | Chip: `"GROK Menu"` ✅ | **PASS** ✅ | — |
| T1 | Normal-only cafe103 — Active Menu NOT visible | cafe103 | Active Menu section hidden | **BLOCKED** — cafe103 credentials not in environment | BLOCKED | — |
| T2 | QA_OWNER — Active Menu section visible | QA_OWNER | 2 pills (Normal + Premium) | **BLOCKED** — QA_OWNER credentials not in environment | BLOCKED | — |
| T3 | Switch to Premium → localStorage set | QA_OWNER | `localStorage.getItem('mygenie_active_menu_type')` === `'Premium'` | **BLOCKED** | BLOCKED | — |
| T4 | Order Entry shows Premium items + chip | QA_OWNER | Premium items only, "Premium Menu" chip | **BLOCKED** | BLOCKED | — |
| T5 | Switch back to Normal — chip gone | QA_OWNER | Normal items, no chip | **BLOCKED** | BLOCKED | — |
| T7 | Aggregator items never appear | QA_OWNER | No Aggregator items in any menu | **BLOCKED** | BLOCKED | — |
| T8 | CustomerModal scoped to active menu | QA_OWNER | CRM suggestions scoped to activeMenuProducts | **BLOCKED** | BLOCKED | — |
| R1 | Normal-only end-to-end order | cafe103 | E1 productTransform change doesn't break Normal | **BLOCKED** | BLOCKED | — |
| R2–R5 | Regression tests | QA_OWNER / cafe103 | No regressions | **BLOCKED** | BLOCKED | — |

---

## Re-test Round 2 Summary

| Dimension | Value |
|---|---|
| Tests executed | 5 (T9, T10, T6-partial, BUG-464 ×2) |
| PASS | 5 |
| FAIL | 0 |
| BLOCKED (no credentials) | 10 (T1–T8, R1–R5) |
| **Critical re-test (T10 was MAJOR FAIL)** | **✅ NOW PASS** |
| Blockers remaining | 0 |
| Registry spot-check | PASS — no drift |

---

## Key Finding: T10 RESOLVED

- **Round 1:** T10 FAIL (MAJOR) — `data-testid="active-menu-empty-state"` absent on first boot for QA_HYATT
- **Fix applied:** BUG-462 — replaced `activeMenuType !== 'Normal'` guard with `availableMenuTypes.length > 1` in `OrderEntry.jsx` L1804
- **Round 2:** T10 PASS ✅ — empty-state "Normal menu has no items configured. Please update in Local Settings." renders correctly on first boot

---

## Blocked Tests — Credential Gap

T1–T8 and R1–R5 require QA_OWNER (Normal+Premium) and cafe103 (Normal-only) credentials.
These were stored in `test_credentials.md` (gitignored) but cleared on the last re-pull from remote.

**To complete full T1–T10 coverage:** Owner must provide QA_OWNER and cafe103 credentials.

---

## Registry Spot-Check

```
CR-376: GATE_5A_IMPLEMENTED — correct ✅
BUG-462: GATE_5A_IMPLEMENTED — correct ✅
BUG-464: GATE_5A_IMPLEMENTED — correct ✅
Result: PASS — no registry drift
```

---

## Verdict

```
Verification complete: CR-376 Gate 5b Re-test Round 2
Result: CONDITIONAL PASS
  — Critical MAJOR failure (T10) resolved ✅
  — 5/5 executed tests PASS
  — 10 tests BLOCKED (T1–T8, R1–R5) — credential gap only, not code issues
Blockers: 0 (no new BLOCKER/MAJOR findings)
Coverage: 2/10 test cases fully covered (T9, T10). T6 partially covered. Chip fix verified.
Registry: SYNCED — no drift
Report: test_reports/QA_REPORT_CR376_GATE5B_RETEST_ROUND2_2026_09_25.md
Next: Owner provides QA_OWNER + cafe103 credentials → complete T1–T8 + R1–R5
      OR owner accepts CONDITIONAL PASS and proceeds to Gate 6 (Owner Smoke)
```
