# API Contract — CR-514 Payment reference box — FINAL v1 — LOCKED 2026-11-15

Backend: Gyan · IDs: BB-06, BB-07 · IA doc: `impact/CR-514_IMPACT_ANALYSIS.md`
Rules: `contracts/BATCH-A_API_CONTRACTS_INDEX_2026_11_15.md` — **names LOCKED; renamed/changed fields → backend reply rejected.**

## 1. Per-method reference-box config (BB-06) — LOCKED OD-B-BB06

Endpoint: `GET /api/v2/vendoremployee/profile` → `restaurants[0].payment_types[]`

| Field | Type | Values | Default | Status |
|---|---|---|---|---|
| `ref_enabled` | integer | `0` / `1` | `0` | NEW — **LOCKED** |
| `ref_required` | integer | `0` / `1` | `0` | NEW — **LOCKED** |
| `ref_label` | string or null | Display label e.g. `"UPI Ref"` | `null` | NEW — **LOCKED** |
| `ref_max_len` | integer or null | Max characters for reference input | **`50` when admin leaves blank** | NEW — **LOCKED** |

Editable per method in backend admin (OD-514-B). Current probe (02_profile): `payment_types` items have `id, name, display_name, prepaid, postpaid` — no ref flags.

**Rule:** `ref_enabled: 0` → no reference box shown. `ref_enabled: 1, ref_required: 1` → Pay button locked until reference is entered. `ref_max_len: null` → treat as 50.

## 2. transaction_id per split part (BB-07)

Endpoints: `POST /api/v2/vendoremployee/pos/order-bill-payment` · `POST /api/v2/vendoremployee/pos/place-order` → `partial_payments[]`

| Path | Type | Status |
|---|---|---|
| `partial_payments[].transaction_id` | string | EXISTING — **confirm stored + returned per split part** |

Probe: single-payment `transaction_id: TESTREF514` stored and returned in Order Beta row (probe 21_C / 25). Split per-part: TBD — backend to confirm in sign-off.

## 3. Backend sign-off

| ID | OK / ETA / Not feasible | Notes | Date |
|---|---|---|---|
| BB-06 | | Confirm 4 fields added per method | |
| BB-07 | | Confirm `transaction_id` stored + returned per split part | |
