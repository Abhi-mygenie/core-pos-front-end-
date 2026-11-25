# API Contract — CR-525 (+ CR-521) After-print Collect Bill / bill_print reset — FINAL v1 — LOCKED 2026-11-15

Backend: Gyan · IDs: BD-01, BD-02, BD-03, BD-04 · IA docs: `impact/CR-525_IMPACT_ANALYSIS.md` · `impact/CR-521_IMPACT_ANALYSIS.md`
Rules: `contracts/BATCH-A_API_CONTRACTS_INDEX_2026_11_15.md` — **names LOCKED; renamed/changed fields → backend reply rejected.**
**Release note (OD-525-E):** FE release of CR-525 and CR-521 waits for BD-01 (backend `bill_print` reset) before going live.

## 1. Reset bill_print on add-after-print (BD-01)

Endpoint: `PUT /api/v2/vendoremployee/order/update-place-order` — when request has a **non-empty `cart-update`** (items added)

| Where | Field | Rule | Status |
|---|---|---|---|
| Order (server-side) | `bill_print` | Set to `'No'` immediately after a successful edit with new items | BEHAVIOUR — NEW rule |
| Socket | `update-order` event | Publish after reset so all open POS tabs refresh — **LOCKED OD-D-BD01-EVENT** | BEHAVIOUR |

**Socket note (OD-D-BD01-EVENT):** owner: "backend is already sending this on one of the sockets — need to check first." Backend to confirm in sign-off: (a) is `update-order` already emitted on `update-place-order`? (b) does the `bill_print` reset need an extra explicit emit, or is it bundled?

**Condition:** only when the outlet setting `order_edit_access` is ON (OD-525-A/E). When OFF, today’s behaviour is unchanged.

## 2. No reset on customer-only update (BD-02)

Endpoint: `PUT /api/v2/vendoremployee/order/update-place-order` — with **empty `cart-update: []`**

| Where | Field | Rule | Status |
|---|---|---|---|
| Order (server-side) | `bill_print` | Do NOT reset — leave unchanged | BEHAVIOUR |

CR-523 uses this call for customer save (see `BATCH-D_CR-523_API_CONTRACT_2026_11_15.md` BD-05).

## 3. Other edit paths that reset bill_print (BD-03) — BEHAVIOUR — backend to confirm

TBD — backend to propose and confirm the full list in sign-off. Brief proposals:

| Endpoint | Resets `bill_print`? |
|---|---|
| Non-empty `cart-update` on `update-place-order` | Yes — BD-01 above |
| `cancel-food-item` | BEHAVIOUR — backend to confirm |
| `transfer-food-item` | BEHAVIOUR — backend to confirm |
| Discount apply (`ORDER_DISCOUNT.MANAGE`) | BEHAVIOUR — backend to confirm |

FE will follow the confirmed list exactly.

## 4. Keep bill_print_count unchanged (BD-04)

| Path (order) | Type | Rule | Status |
|---|---|---|---|
| `bill_print_count` | integer | Keeps incrementing on each print; NOT reset when `bill_print` resets | EXISTING — confirm unchanged |

Only the `bill_print` flag resets on edit. `bill_print_count` preserves the full print history.

## 5. Backend sign-off

| ID | OK / ETA / Not feasible | Notes | Date |
|---|---|---|---|
| BD-01 | | Confirm socket event name + reset rule; confirm `order_edit_access` condition | |
| BD-02 | | Confirm no reset on empty cart-update | |
| BD-03 | | Provide full list of edit paths that reset `bill_print` | |
| BD-04 | | Confirm `bill_print_count` unchanged | |
