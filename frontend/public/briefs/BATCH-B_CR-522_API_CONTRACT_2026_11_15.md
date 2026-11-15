# API Contract — CR-522 Payment tolerance % — FINAL v1 — LOCKED 2026-11-15

Backend: Gyan · IDs: BB-08 · IA doc: `impact/CR-522_IMPACT_ANALYSIS.md`
Rules: `contracts/BATCH-A_API_CONTRACTS_INDEX_2026_11_15.md` — **names LOCKED; renamed/changed fields → backend reply rejected.**

## 1. Tolerance % setting (BB-08) — LOCKED OD-B-BB08

Endpoint: `GET /api/v2/vendoremployee/restaurant-settings/settings-list` → `basic` section (next to `reconcile_amount`)

| Where | Field | Type | Values | Default | Status |
|---|---|---|---|---|---|
| `basic` | `reconcile_tolerance_pct` | decimal (number) or null | Any positive decimal; no upper cap | `null` | NEW — **LOCKED** |

**Rule (OD-522-B + OD-B-BB08):**
- `null` or blank → tolerance check OFF — POS skips the ± check entirely.
- `0` → tolerance check OFF (same as blank).
- Any positive value (e.g. `3.5`) → POS checks received amount is within ± that percentage of bill total.
- **No maximum cap — any positive decimal is valid.**

Backend admin: restaurant-level field, editable per outlet. Current probe (03 / 33): `reconcile_amount: "No"` present; no tolerance key.

Phase 2 write endpoint (POS Settings screen, CR-541) is a separate CR — not in this contract.

## 2. Backend sign-off

| ID | OK / ETA / Not feasible | Notes | Date |
|---|---|---|---|
| BB-08 | | | |
