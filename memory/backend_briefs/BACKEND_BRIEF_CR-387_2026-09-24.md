# BACKEND_BRIEF_CR-387_2026-09-24 — `gst_status` contract + menu tax/packaging validation

## Summary
- Issue: new flat `gst_status` key coexists with legacy `gst {status, code}`; types differ across endpoints; server-side menu validation rules for tax vs packaging are unknown to FE.
- Classification: CONTRACT_MISMATCH (questions) — no defect claimed yet
- Frontend impact: settings wizard writes only `basic.gst`; FE GST gate depends on profile boolean; menu rules may contradict server rules.
- Priority/Risk: P1 / HIGH

## Endpoints
- `GET /api/v1/vendoremployee/profile` → `restaurants[0].gst_status` (**boolean** `true`), `gst_code`
- `GET /api/v2/vendoremployee/restaurant-settings/settings-list` → `data.basic.gst_status` (**int** `1`) **and** `data.basic.gst = {status:1, code}`
- `POST /api/v2/vendoremployee/restaurant-settings/update-settings` (multipart `data=`) — owner sample writes `{"basic":{"gst_status":0|1}}`; FE writes `{"basic":{"gst":{"status":0|1,"code":"…"}}}`
- Menu: `POST …/add-food`, `…/edit-food/{id}`, aggregator equivalents, Excel `bulk import`

## Questions
1. **BQ-387-01** Do `basic.gst_status` and `basic.gst.status` map to the same column? Which one is canonical going forward, and will `basic.gst` be removed? (FE currently reads/writes the object only.)
2. **BQ-387-02** Can `gst_status` be the same type on profile and settings-list (prefer boolean)? FE gate is `=== true`; an int on profile would silently disable GST gating.
3. **BQ-387-03** What server-side validation exists on add/edit/import for `tax`, `tax_type`, `tax_calc` vs `packed_food` / `is_packaged_good` / `pack_charges`, and does it depend on `gst_status`? Please list the exact rejection rules/messages.
4. **BQ-387-04** Is GST on packaging charges modelled (e.g. `pack_charges_gst`, like `deliver_charge_gst`)? If not, is it planned?
5. **BQ-387-05 (BUG-454 related)** On place/update order, does the server trust FE `food_details[].tax_amount` / `gst_tax` or recompute from item tax + `gst_status`?

## Evidence
- `/app/memory/evidence/INV-GST-KEY-2026-09-24/profile_thegoankitchen.json`, `profile_palmhouse.json`, `settings_*.json`, `products_sample.json`
- Report: `/app/memory/INV_GST_MENU_VALIDATION_INVESTIGATION_REPORT_2026_09_24.md`

## Frontend workaround
- Available: PARTIAL — FE can read `basic.gst_status ?? basic.gst?.status` defensively; cannot resolve BQ-03/04/05 without answers.

*Filed 2026-09-24 · INVESTIGATION→INTAKE (ALPHA v0.7)*
