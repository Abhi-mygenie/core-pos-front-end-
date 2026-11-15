# API Contract — CR-524 Punch time per cancelled item — DRAFT v1 — 2026-11-15

Backend: Gyan · ID: ASK 1 · IA doc: `impact/CR-524_IMPACT_ANALYSIS.md`
Rules: `contracts/BATCH-A_API_CONTRACTS_INDEX_2026_11_15.md` — **names LOCKED; renamed/changed fields → backend reply rejected.**
**Status: DRAFT v1 — waiting backend reply before FINAL. IA frozen 2026-11-15.**

## 1. Add punch time per cancelled line (ASK 1)

Endpoint: `GET /api/v2/vendoremployee/report/insights-cancellations` → items array

**Problem:** `created_at` (the time an item was punched / added to the order) is absent from the API today. FE cannot compute Cancellation Duration without it.

| Path | Type | Values | Default | Status |
|---|---|---|---|---|
| `[].punched_at` | string (ISO 8601 or IST datetime) | Datetime when the item was originally punched / added | — | NEW — TBD (backend to confirm field name: `punched_at` or `created_at`) |

**Naming note (R19):** brief proposes `punched_at` as the semantic name (= original add time). If backend already returns a field for this under a different key, backend confirms the existing name and FE uses it as-is.

**Probe evidence (01c_cr524_items_full.txt):** Current item keys: `cancel_date, cancel_time, cancelled_by, punched_by, station, …` — **no `created_at` or `punched_at` today.**

**Partial-cancel rule:** When a line is partially cancelled, the cancelled split-row’s `punched_at` = the **original parent line’s add time** (not the split time). Probe: row 3969224 (partial cancel) vs parent 3969222 — FE expects `punched_at` = parent add time.

**Timezone:** same as `cancel_time` (IST / local), or ISO with offset. Backend to confirm — today `cancel_time` = “HH:MM” (IST, no date component).

**FE computation (once field available):**
`duration_min = Math.max(0, Math.round((cancel_datetime − punched_at_datetime) / 60 000))`

## 2. Backend sign-off

| ID | OK / ETA / Not feasible | Notes | Date |
|---|---|---|---|
| ASK 1 | | Confirm field name (`punched_at` or existing key); confirm partial-cancel uses parent add time; confirm timezone | |
