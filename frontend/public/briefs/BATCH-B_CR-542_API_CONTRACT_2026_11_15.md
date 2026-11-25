# API Contract — CR-542 Reason mandatory on Make Unpaid — FINAL v1 — LOCKED 2026-11-15

Backend: Gyan · IDs: BB-04, BB-05 · IA doc: `impact/CR-542_IMPACT_ANALYSIS.md`
Rules: `contracts/BATCH-A_API_CONTRACTS_INDEX_2026_11_15.md` — **names LOCKED; renamed/changed fields → backend reply rejected.**

## 1. Separate Unpaid reasons list (BB-04) — LOCKED OD-B-BB04-FINAL

**OD-B-BB04-FINAL:** Separate list, NOT part of `cancellation-reasons`. Endpoint **LOCKED** (per R19: use this name; if backend already has an existing endpoint, they confirm the existing path and FE uses it as-is).

Endpoint: `GET /api/v2/vendoremployee/unpaid-reasons`

| Path | Type | Values | Status |
|---|---|---|---|
| `[].id` | integer | Reason ID | NEW — **LOCKED** |
| `[].reason` | string | Reason label text | NEW — **LOCKED** |

Backend admin: add / edit Unpaid reasons in a dedicated admin screen (separate from cancellation reasons).

## 2. reason on make-order-unpaid (BB-05) — LOCKED OD-B-BB05

Endpoint: `PUT /api/v2/vendoremployee/order/make-order-unpaid`

Applies to: **Make Unpaid** (Audit, Order Beta) · **Remove from Credit** · **Remove from Room** — **LOCKED OD-B-BB05-SCOPE**.

| Field (request body) | Type | Values | Default | Status |
|---|---|---|---|---|
| `reason` | string | Selected reason label (or free text if “Other”) | — | NEW — **LOCKED OD-B-BB05-REASON** |

**Rule:** `reason` required (non-empty string). Empty or missing → 422 `UNPAID_REASON_REQUIRED`. **LOCKED.**

No `reason_id` — **LOCKED OD-B-BB05-REASON** (owner: reason text only).

Backend stores `reason` and returns it in: order logs · Order Beta report · audit. Backend to confirm return paths in sign-off.

## 3. Errors

| Code | HTTP | When |
|---|---|---|
| `UNPAID_REASON_REQUIRED` | 422 | `reason` empty or missing on make-order-unpaid (all 3 actions) — **LOCKED** |

## 4. Backend sign-off

| ID | OK / ETA / Not feasible | Notes | Date |
|---|---|---|---|
| BB-04 | | Confirm endpoint path or share existing | |
| BB-05 | | Confirm `reason` stored + returned in logs/reports | |
