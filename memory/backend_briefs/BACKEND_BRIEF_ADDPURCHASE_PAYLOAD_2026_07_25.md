# BACKEND_BRIEF_ADDPURCHASE_PAYLOAD_2026_07_25

## Summary
- Issue: FE `toAPI.addPurchase()` sends wrong/missing keys per backend contract doc
- Classification: CONTRACT_MISMATCH (FE side) + BACKEND_ASK (ignored keys)
- Frontend impact: Every purchase has `payment_type: null` and `tot_amount: 1`
- Priority/Risk: P0 (payment_type + totals) / MEDIUM risk

## Endpoint
- Method: POST
- URL: `/api/v2/vendoremployee/inventory/add-purchase`
- Auth: Bearer token

## FE Gaps (to fix on FE)
1. `payment_method` → should be `payment_type` (key rename)
2. Missing `tot_amount`, `item_total` (should = sum of line Amount)
3. Missing `tot_fair: 0`, `tot_tax: 0` (default to 1 when omitted)
4. `converion_factor: 1` always sent (should omit when no conversion)

## Backend Ask (future consideration)
Keys FE sends that backend currently ignores — FE will keep sending them:
- `vendor_name` — supplier display name
- `invoice_number` — GRN reference
- `notes` — purchase notes / source tag
- `rate` (per line) — unit rate
- `origin` — source: planner / stock_alert / ad_hoc

Recommendation: Consider accepting `notes`, `invoice_number`, `origin` in future release.

## Evidence
- Backend contract: `add_purchase_payload_frontend.md` (owner-provided 2026-07-25)
- FE code: `inventoryTransform.js:167-186`
- Investigation report: `/app/memory/reports/INVESTIGATION_SMART_PURCHASE_SUBMIT_2026_07_25.md`

## Frontend Fix Status
Registered as BUG-243. Awaiting Gate 4 GO.
