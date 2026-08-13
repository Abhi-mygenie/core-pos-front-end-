# BUG FIX REPORT — CR-132 schedule_order Type Mismatch
**Date:** 2026-08-11
**Role:** BUG FIX (Role 5)
**Source:** QA iteration_8 failure — E2E_SAVE FAIL

---

## Failure Summary

| Test | Severity | QA Result |
|---|---|---|
| E2E_SAVE — Save & Continue Step 1→2 | BLOCKER | FAIL — HTTP 500 |

**MySQL error:** `SQLSTATE[HY000]: General error: 1366 Incorrect integer value: 'No' for column 'schedule_order' at row 1`

---

## Root Cause

| Field | Classification | Detail |
|---|---|---|
| **PLAN_GAP** | `schedule_order` was mapped using `toYesNo()` like all other boolean fields. But unlike other Yes/No fields (VARCHAR columns), `schedule_order` is an **INT column** in the MySQL DB. MySQL rejected string `'No'` with error 1366. |

**Data flow trace:**
- `fromAPI` line 143: `scheduleOrder: toBool(basic.schedule_order)` → boolean ✅
- `toAPI` line 260: `schedule_order: toYesNo(s5.scheduleOrder)` → `'No'` string ❌
- POST `/api/v2/vendoremployee/restaurant-settings/update-settings` → MySQL INT column → 500

---

## Fix

| # | File | Line | Old | New |
|---|---|---|---|---|
| F1 | `api/transforms/restaurantSettingsTransform.js` | 260 | `schedule_order: toYesNo(s5.scheduleOrder)` | `schedule_order: s5.scheduleOrder ? 1 : 0` |

**1 file, 1 line changed. Not a hotspot file. No financial logic.**

---

## Verification

- Fix applied: ✅ line 260 confirmed
- Curl test: POST with corrected payload → HTTP 200, `"success": true` ✅
- Webpack compile: 0 new warnings ✅
- Adjacent tests: `fromAPI` round-trip unaffected (reads `toBool`, writes integer — consistent) ✅

---

## EXIT GATE

| # | Check | Result |
|---|---|---|
| 1 | Registry sync: CR-132 = IMPLEMENTED, pos_5_1 | ✅ PASS |
| 2 | CR_REGISTRY.MD updated to "IMPLEMENTED — QA RE-TEST PENDING" | ✅ PASS |
| 3 | FILE_OWNERSHIP.MD updated | ✅ PASS |
| 4 | Code marker: `// CR-132 BUG-FIX: integer column` at line 260 | ✅ PASS |
| 5 | Compile: webpack 0 new warnings | ✅ PASS |

**EXIT GATE: 5/5 PASS**

---

## Scope Expansion

NONE — fix is exactly 1 line in the already-scoped file.

---

## Next

QA re-test: run E2E_SAVE + R1 (step3 channels validation) + R2 (step4 GST) + R3 (back/skip/next navigation).
Credentials: `owner@cafe103.com` / `***`
