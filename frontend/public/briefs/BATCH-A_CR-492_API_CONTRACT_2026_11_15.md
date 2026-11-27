# API Contract — CR-492 Complimentary right — v1 — 2026-11-15

Backend: Gyan · IDs: BA-07, BA-08 · FE plan: `plans/BATCH-A_CR-492_IMPLEMENTATION_PLAN_2026_11_15.md`
Rules: `contracts/BATCH-A_API_CONTRACTS_INDEX_2026_11_15.md` — **names LOCKED; renamed/changed fields → backend reply rejected.**

## 1. Right key
| Where | Key | Status |
|---|---|---|
| role permissions (profile / role list) | `complementary_food` | EXISTING — keep name |

## 2. Comp line fields (place-order / update-order / bill-payment item payloads)
| Field | Type | Values | Status |
|---|---|---|---|
| `is_complementary` | string | `"Yes"` / `"No"` | EXISTING |
| `complementary_reason` | string | required (non-empty) when `is_complementary` = `"Yes"` on a runtime comp line | EXISTING field — **BEHAVIOUR:** reject empty (R14) |

## 3. Server enforcement (BA-07) — BEHAVIOUR
- Any request with a line `is_complementary = "Yes"` that was not comp before, from a user **without** `complementary_food` → 403 `COMP_RIGHT_REQUIRED`.
- Existing comp lines re-sent unchanged by a user without the right → accepted (read-only rule OD-492-A).
- Runtime comp line with empty `complementary_reason` → 422 `COMP_REASON_REQUIRED`. Catalogue-complimentary items are exempt.

## 4. Restaurant flag (BA-08) — answer only
| Where | Field | Status |
|---|---|---|
| profile `restaurants[0]` | `complementary` (`"Yes"`/`"No"`) | EXISTING — backend explains meaning; **no rename** |

## 5. Errors
| Code | HTTP | When |
|---|---|---|
| `COMP_RIGHT_REQUIRED` | 403 | new comp without right |
| `COMP_REASON_REQUIRED` | 422 | runtime comp without reason |

## 6. Backend sign-off
| ID | OK / ETA / Not feasible | Notes | Date |
|---|---|---|---|
| BA-07 | | | |
| BA-08 | | | |
