# BUG-604 — Intake (Gate 1)
## cancel_type="unknown"/null — cancelled items with no stage

**ID:** BUG-604
**Type:** BUG
**Date:** 2026-10-21
**Sprint:** nov_cr_batch
**Area:** Reports / Analytics
**Priority:** P1
**Risk:** MEDIUM
**Source:** INVESTIGATION (BUG-579 6-month probe)
**Duplicate check:** DISTINCT (related BUG-579, BUG-603)
**Status:** GATE_1_INTAKE_BACKEND_BLOCKED

---

## Description
Cancelled items with no usable stage information. `cancel_type` is `"unknown"`, `null`, or has a value like `"Pre-Serve"` that maps to stage `"Unknown"`.

## Evidence (6 months, Apr–Oct 2026)
| Restaurant | cancel_type | Count |
|---|---|---|
| Pav2 | `"unknown"` | 44 |
| Pav2 | `null` | 7 |
| Pav2 | `"Pre-Serve"` → stage "Unknown" | 17 |
| Palm House | `null` | 1 |
| Palm House | `"Post-Serve"`/`"Pre-Serve"` → stage "Unknown" | 2 |
| **Total** | | **Pav2: 68 (19%), Palm House: 3 (0.3%)** |

## Impact
19% of Pav2 cancellations have no stage — the cancellation report shows them under "Unknown" with no waste-level categorization.

## Next
Backend should populate `cancel_type` from `food_status` at cancellation time for every item.
