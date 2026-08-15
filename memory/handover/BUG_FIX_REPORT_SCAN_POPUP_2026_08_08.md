# Bug Fix Report — show_scan_popup Section Mismatch
**Date:** 2026-08-08 | **Role:** BUG FIX (Alpha v0.7)
**ID:** BUG-SCAN-DEDUP | **Risk:** LOW | **Severity:** MAJOR

## Finding

| # | Test | Severity | RCA Classification | Root Cause | Fix | Files Changed | Verified |
|---|---|---|---|---|---|---|---|
| 1 | show_scan_popup loads wrong value | MAJOR | ENVIRONMENT | Backend dedup 2026-08-08 moved `show_scan_popup` from `advanced{}` to `basic{}`. FE still read `advanced.show_scan_popup` → undefined → always defaulted to true. | `fromAPI` L97: `advanced.show_scan_popup` → `basic.show_scan_popup` | `restaurantSettingsTransform.js` | ✅ PASS |
| 2 | show_scan_popup save silently lost | MAJOR | ENVIRONMENT | `toAPI` wrote to `advanced.show_scan_popup` which backend ignores (stores in basic). | Move `show_scan_popup: s4.showScanPopup ? 1 : 0` from `advanced{}` to `basic{}` | `restaurantSettingsTransform.js` | ✅ PASS |

## Root Cause
`ENVIRONMENT` — Backend deduplication on 2026-08-08 removed `show_scan_popup` from `advanced{}`.
`basic.show_scan_popup` was always the source of truth. FE had it wrong due to when CR-056 was written (field was in both sections at that time).

## Scope Expansion
NONE — 1 file, 2 logical changes.

## Escalated
None.

## Registry Sync
- BUG-SCAN-DEDUP → IMPLEMENTED / pos_5_1 ✅
- File: `restaurantSettingsTransform.js` ✅
- Compile: PASS ✅
- EXIT GATE: 5/5 ✅
