# BUG-466 — Old KOT Printed When New Swiggy/Aggregator Order Received — INTAKE 2026-09-27

**Source:** OWNER-REPORTED 2026-09-27 (batch intake)
**Sprint:** `oct_bug_batch` · **Gate:** 1 (INTAKE)
**Related investigation:** `investigations/BATCH_INVESTIGATION_32_ITEMS_2026_09_27.md`

---

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Priority | **P1 — HIGH** — wrong KOT printed on every new Swiggy order |
| Risk | MEDIUM — print flow only; no financial impact |
| Area | Socket / Print / Aggregator / Printer Agent |
| Duplicate check | DISTINCT |
| Code reality | NOT IN FE — FE `handleAggregatorNewOrder` does not trigger KOT print directly |
| Fast Lane | NO |

---

## Description

When a new Swiggy order is received, an **old/stale KOT is printed** instead of the KOT for the new order. The printed KOT content does not match the items in the new order.

---

## Evidence

| Item | Detail |
|---|---|
| Source | OWNER-REPORTED |
| Screenshot | Not provided |
| Steps to reproduce | OWNER WILL PROVIDE LATER |
| Curl output | Not yet captured |
| Confidence | REPORTED |

---

## Blast Radius

- FE: LOW — `socketHandlers.js` `handleAggregatorNewOrder` has no direct KOT print trigger
- Backend/Printer Agent: MEDIUM — KOT content likely comes from backend Swiggy webhook handler
- Scope: SMALL (1 flow — aggregator new order → KOT print)

---

## Hypotheses (from investigation)

1. Backend stores KOT content at Swiggy order creation time; if order is modified on Swiggy platform before POS receives it, KOT content is stale
2. Printer Agent re-prints an already-printed KOT when the socket order arrives
3. Race condition between order creation and KOT generation

**Most likely:** Backend/Printer Agent issue — FE is not involved in KOT print trigger for aggregator orders.

---

## Open Questions — OWNER WILL ANSWER LATER

- OD-466-01: Does this happen on every Swiggy order or only some?
- OD-466-02: What does the printed KOT contain — items from a previous order, or a partial list?
- OD-466-03: Does the same issue happen for Zomato orders?

---

## Next Step

Backend probe: `GET get-single-order-new` for a recent Swiggy order — compare `order_details` items vs KOT content printed. Escalate to Printer Agent team if PA is polling stale KOT.
