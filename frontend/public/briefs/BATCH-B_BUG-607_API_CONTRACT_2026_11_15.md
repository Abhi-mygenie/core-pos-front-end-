# API Contract — BUG-607 GST mode "category" — always item tax — FINAL v1 — LOCKED 2026-11-15

Backend: Gyan · IDs: BB-11, BB-12 · IA doc: `impact/BUG-607_IMPACT_ANALYSIS.md`
Rules: `contracts/BATCH-A_API_CONTRACTS_INDEX_2026_11_15.md` — **names LOCKED; renamed/changed fields → backend reply rejected.**

## 1. Category GST: always use item tax — no restaurant fallback (BB-11) — BEHAVIOUR

All server-side tax computation paths: scan orders · web orders · aggregator orders · bill print · reports · e-invoice.

**No new field. Behaviour change only.**

| Where | Field | Rule | Status |
|---|---|---|---|
| All server tax paths | `tax` (per item) | When `restaurant_gst = "category"`: use each item’s `tax` value — NEVER fall back to restaurant `gst_tax` | BEHAVIOUR — **LOCKED OD-B-BB11** |

**Probe evidence:**
- RID 644 (cafe103): `restaurant_gst = "category"`, `gst_tax = "5.00"` — backend currently uses restaurant fallback (BUG-607 symptom).
- RID 541 (The Palm House): `restaurant_gst = "category"`, `gst_tax = "0.00"`. Probe 32: 286 products all carry item tax (5% GST ×220, 0% GST ×61, 0% VAT ×5). POS already bills per item.

OD-607-A: `restaurant_gst = "category"` means item-level GST always; no restaurant-level fallback.

## 2. Regression order ID (BB-12) — data request, no API field

**OD-B-BB12 (R2b):** Confirmed — data request only. Gyan shares one order ID where restaurant-level GST was wrongly applied, by message. No new API field. No contract entry.

## 3. CR-394 data fix note (BB-13) — not an API contract

**OD-B-BB13 (R2b):** Confirmed — one-time backend data fix only. Gyan runs a script: all products with `tax_calc = Inclusive` in GST-ON outlets (​`gst_status = 1`) → changed to `Exclusive`. Share count of changes per outlet.

**FE QA note:** after data fix, FE team validates reports for any GST inconsistencies (owner: “we always had exclusive so reports need to be validated”).

## 4. Backend sign-off

| ID | OK / ETA / Not feasible | Notes | Date |
|---|---|---|---|
| BB-11 | | Confirm all server tax paths use item `tax` when `restaurant_gst = "category"` | |
| BB-12 | | Share one order ID with wrong GST applied | |
