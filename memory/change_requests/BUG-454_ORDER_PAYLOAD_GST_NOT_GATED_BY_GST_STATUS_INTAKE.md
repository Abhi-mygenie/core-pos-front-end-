# BUG-454 — Order payload GST not gated by `gst_status` (BUG-336 gap)

**ID:** BUG-454 · **Registered:** 2026-09-24 · **Status:** INTAKE — GATE 1 (investigation gate CLOSED 2026-09-24 — see `handover/SESSION_HANDOVER_2026_09_24_GST_INVESTIGATION_CLOSED.md`) · **Type:** BUG · **Priority:** P0 · **Risk:** CRITICAL (tax/money) · **Sprint:** unassigned (owner to route)
**Source:** AGENT-DISCOVERED (INV `INV_GST_MENU_VALIDATION_INVESTIGATION_REPORT_2026_09_24.md` §2 BREAK POINT 1) · **Confidence:** SUSPECTED (code-traced; not reproduced live — would require placing an order on a GST-disabled tenant)

## What the issue is
When the outlet has GST disabled (`profile.gst_status=false` → `restaurant.tax.gstStatus=false`), Collect Bill hides GST (BUG-336), but the **place/update-order payload** built by `orderTransform.js` still computes per-line `tax_amount` and header `gst_tax` from `item.tax.percentage`. The backend therefore stores GST for a GST-disabled outlet; bill totals/persisted header can differ from what the cashier saw.

## Code reality: gap CONFIRMED in code
- `api/transforms/orderTransform.js:723-734` (`buildCartItem`) — `taxAmount` from `item.tax`, no `gstStatus` reference.
- `api/transforms/orderTransform.js:796+` (`calcOrderTotals`) — `gst_tax`, `service_gst_tax_amount`, no gate.
- `grep -rn gstStatus src/api/transforms/orderTransform.js` → 0 hits. Only consumers: `CollectPaymentPanel.jsx:274` (BUG-336), `OrderEntry.jsx:2831` (showGst), `BulkEditor.jsx:220`.

## Duplicate check: RELATED to BUG-336 (fixed display only — tracker row confirms "taxTotals useMemo … lacked gstStatus gate"), BUG-338 (room variant). DISTINCT scope (payload).

## Evidence
- Profile/settings live values: `evidence/INV-GST-KEY-2026-09-24/profile_*.json`, `settings_*.json` (both tenants currently `gst_status=true` → cannot reproduce without toggling a tenant off).
- Steps to reproduce (proposed): toggle GST OFF on a sandbox tenant → add item with `tax=5 GST` → place order → inspect POST payload `food_details[].tax_amount`, `gst_tax`.

## Blast radius
- `orderTransform.js` (R5 hotspot, R6 financial) — `buildCartItem` + `calcOrderTotals`; callers `toAPI.placeOrder/updateOrder/…` pass `extras`; likely +1 param (`gstEnabled`) threaded from `OrderEntry.jsx` (R5).
- Estimated scope: MEDIUM (2–3 files, 2 hotspots). Fast Lane: NO.

## Open decisions
- OD-454-01: gate = force `tax_amount=0` for `tax_type=GST` lines only (VAT untouched), or also zero SC/delivery GST components? (Recommend: GST-type lines + SC/delivery GST, VAT untouched — mirrors BUG-336.)

*Intake written 2026-09-24 · INVESTIGATION→INTAKE (ALPHA v0.7)*
