# CR-559 R2 — PRE-IMPL profile probe (read-only, non-destructive)

**Date:** 2026-11-20 · **Env:** preprod (`https://preprod.mygenie.online`) · **Login:** pms@macha.com (employee, Manager)
**Method:** `POST /api/v1/auth/vendoremployee/common-login` → token → `GET /api/v1/vendoremployee/profile`.
No order created, no state changed (GET only).

## Result — GATE SOURCE VALIDATED (green)
`restaurants[0]`:
- `print_kot = "Yes"`            → `profileTransform.settings.autoKot = true` ✅ (gate key 1)
- `settings.scan_order_auto_print = "Yes"` → `settings.scanOrderAutoPrint = true` ✅ (gate key 2, nested path)
- root `scan_order_auto_print` = absent (null) → nested path is the live source; root fallback unused but harmless.
- `billing_auto_bill_print = "No"` → `settings.autoBill = false` (not used by R2).
- `def_ord_status = 1` → `F_ORDER_STATUS_API[1]` → confirm payload `order_status`.
- top-level `print_agent` = list of **2** agents → `restaurant.printerAgents` populated (selectors have input).

## Implication for R2
- The dual-toggle gate (`isWebOrder && settings.autoKot && settings.scanOrderAutoPrint`) reads real, present
  fields. **No backend change needed to surface the gate flags** (old OD-5 blocker RESOLVED).
- `printerAgents` has 2 entries → `selectAgentsForKot` + `selectAgentsForBill` will produce a non-empty block
  when stations match, matching the owner's `[KDS, BILL]` sample.

## NOT yet proven (needs a live Accept — destructive)
- Whether the backend ACTS on `printer_agent` sent on `waiter-dinein-order-status-update` AND whether
  `update-print-status {kot_print:'Yes'}` physically triggers the KOT. This requires accepting a real web
  order with both toggles ON (owner-run or authorized live probe). Tracked as the remaining Gate-4 precondition.
