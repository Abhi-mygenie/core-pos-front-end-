# API Contract — BUG-672 Credit on prepaid orders — FINAL v1 — LOCKED 2026-11-15

Backend: Gyan · IDs: BB-01 · IA doc: `impact/BUG-672_IMPACT_ANALYSIS.md`
Rules: `contracts/BATCH-A_API_CONTRACTS_INDEX_2026_11_15.md` — **names LOCKED; renamed/changed fields → backend reply rejected.**

## 1. BB-01 — FE-only fix (no backend change required)

**OD-B-BB01-FINAL (R1c):** Owner decided FE hiding the Credit button is sufficient. **No backend enforcement needed.** BB-01 is a FE-only change.

**What POS will do (FE only):**
- Read `payment_types[TAB].prepaid` from the existing profile response.
- When `prepaid: 0` → hide the Credit / TAB button on prepaid orders.
- When `prepaid: 1` → Credit button shown and works as normal.

**Backend:** no change to `order-bill-payment` or `place-order` needed for this CR.

Existing field (read-only by FE):

| Where | Field | Type | Values | Status |
|---|---|---|---|---|
| `GET /api/v2/vendoremployee/profile` → `restaurants[0].payment_types[]` | `prepaid` | integer | `0` / `1` | EXISTING — confirm unchanged |

## 2. Backend sign-off

| ID | OK / ETA / Not feasible | Notes | Date |
|---|---|---|---|
| BB-01 | FE only — no backend change needed | Confirm `prepaid` field exists and is unchanged | |
