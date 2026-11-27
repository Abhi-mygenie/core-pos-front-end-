# API Contract — CR-526 Make Unpaid / day-settlement lock — FINAL v1 — LOCKED 2026-11-15

Backend: Gyan · IDs: BB-02, BB-03 · IA doc: `impact/CR-526_IMPACT_ANALYSIS.md`
Rules: `contracts/BATCH-A_API_CONTRACTS_INDEX_2026_11_15.md` — **names LOCKED; renamed/changed fields → backend reply rejected.**

## 1. Settled-day signal (BB-02)

**OD-B-BB02-FINAL:** Proactively grey out the Unpaid / Remove button for orders from settled days. `day_settled` on order rows confirmed. **Condition (OD-B-BB02-FINAL):** only relevant when restaurant has settlement enabled (`settelment_report: "Yes"` in settings-list). When settlement is OFF, `day_settled` is always `false` or absent.

`day_settled = true` when the day is settled by EITHER: (a) manual cashier day-closure OR (b) auto 6 AM settlement.

### Order rows — `GET /api/v2/vendoremployee/report/daily-order-report-details-combined` + order detail

| Where | Field | Type | Values | Default | Status |
|---|---|---|---|---|---|
| Order row | `day_settled` | boolean | `true` / `false` | `false` | NEW — **LOCKED OD-B-BB02-FINAL** |

Probe result (R5 probe 34_0..6, 7 days, RID 541): waiter rows today carry `today_settlement`, `balance_to_settle`, `pilferage` — no settled flag or timestamp.

**Settlement report shape:** owner chose order-rows only. No new fields needed on `get-settlement-report`.

## 2. Reject make-order-unpaid / change-method after settlement (BB-03)

Endpoints: `PUT /api/v2/vendoremployee/order/make-order-unpaid` · change-payment-method (TBD — same or separate endpoint; backend to confirm)

**Behaviour (BB-03):** When the order's business day is already settled, the backend MUST reject the action.

| Where | Field | Rule | Status |
|---|---|---|---|
| `make-order-unpaid` + change-method | — | Reject when order’s day is settled | BEHAVIOUR |

**Error code LOCKED (OD-B-BB03):** 422 `DAY_ALREADY_SETTLED`, "Day already settled".

## 3. Errors

| Code | HTTP | When |
|---|---|---|
| `DAY_ALREADY_SETTLED` | 422 | Day settled (manual closure or auto 6 AM); Unpaid or change-method attempted — **LOCKED OD-B-BB03** |

## 4. Backend sign-off

| ID | OK / ETA / Not feasible | Notes | Date |
|---|---|---|---|
| BB-02 | | | |
| BB-03 | | | |
