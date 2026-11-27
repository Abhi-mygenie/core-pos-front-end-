# API Contract — CR-536 B2B invoice billing address — FINAL v1 — LOCKED 2026-11-15

Backend: Gyan · IDs: BB-10, BB-10b · IA doc: `impact/CR-536_IMPACT_ANALYSIS.md`
Rules: `contracts/BATCH-A_API_CONTRACTS_INDEX_2026_11_15.md` — **names LOCKED; renamed/changed fields → backend reply rejected.**

## 1. GST billing address on order (BB-10) — LOCKED OD-B-BB10

Endpoints: `POST /api/v2/vendoremployee/pos/order-bill-payment` · `POST /api/v2/vendoremployee/pos/place-order`

**Request — new field (sent alongside existing `custGST` / `custGSTName`):**

| Field | Type | Values | Default | Status |
|---|---|---|---|---|
| `custGSTAddress` | string or null | Billing address text, max 255 chars | `null` | NEW — **LOCKED** |

**Response — order rows (order report APIs + order detail):**

| Path | Type | Status |
|---|---|---|
| `cust_gst` | string or null | EXISTING — confirm unchanged |
| `cust_gst_name` | string or null | EXISTING — confirm unchanged |
| `cust_gst_address` | string or null, max 255 chars | NEW — **LOCKED** |

Printed on bill under GST name when non-null (backend print template). OD-536-A.

## 2. Billing address on customer profile (BB-10b) — LOCKED OD-B-BB10

Endpoint: TBD — existing customer profile read + update endpoints (backend to confirm).

| Field | Type | Values | Default | Status |
|---|---|---|---|---|
| `gst_address` | string or null | Billing address, max 255 chars | `null` | NEW — **LOCKED** |

Gate 2.5 decision OD-536-C: pre-fill `custGSTAddress` from `gst_address` on the customer profile when the customer has a `gst_number`; field stays editable. Current profile: only delivery `addresses[]` exist, no billing address field.

## 3. Backend sign-off

| ID | OK / ETA / Not feasible | Notes | Date |
|---|---|---|---|
| BB-10 | | Confirm `cust_gst` / `cust_gst_name` unchanged; confirm `cust_gst_address` returned in all order report rows | |
| BB-10b | | Confirm endpoint for customer profile read/update; confirm `gst_address` field | |
