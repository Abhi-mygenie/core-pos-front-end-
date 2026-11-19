# Test Credentials — MyGenie POS

## Owner Account (Cafe 103)
- Email: owner@cafe103.com
- Password: Qplazm@10
- Role: Owner (all permissions)
- Restaurant: Cafe 103

## Owner Account (The Palm House) — PMS / Rooms / F&B
- Email: owner@palmhouse.com
- Password: Qplazm@10
- Role: Owner (all permissions)
- Restaurant: The Palm House
- Use for: order entry, tax/GST/VAT/SC, credit, reports, audit, dashboard

## Owner Account (The Goan Kitchen) — Aggregator / Web Orders (PMS)
- Email: owner@thegoankitchen.com
- Password: Qplazm@10
- Role: Owner (all permissions)
- Restaurant: The Goan Kitchen
- Use for: aggregator orders, web/APS orders, ScanOrderPopOut flows
  - Validated 2026-11-19: live WEB/SCAN order **#1578881** ("a1") auto-pops on login — Dine-In, ₹411, 19 items (17 previously-ordered + 1 new "melo fish" ₹1.00), COD, Awaiting Confirmation. Covers CR-547, CR-552, BUG-679, BUG-702 and (₹1 item) CR-545. 1 aggregator order loaded at boot (BUG-703). NOTE: this order is Dine-In, not a Room order — BUG-701 (room edit-confirm popup) ideally needs a room web-edit order.

## Owner Account (Bean Me Up) — Tax / VAT config outlet
- Email: owner@beanmeup.com
- Password: Qplazm@10
- Role: Owner (all permissions)
- Restaurant: Bean Me Up
- Use for: GST-off / VAT-off / VAT-vs-GST tax tests (BUG-647, BUG-683, BUG-706) — tax type to be confirmed in Batch C

## Low-Rights Account (The Meal Break) — Permission gating (captain)
- Email: captain@themealbreak.com
- Password: Qplazm@10
- Role: Captain / restricted (NOT owner)
- Restaurant: The Meal Break (Meal Break)
- Validated 2026-11-19: login OK; restricted sidebar — only dashboard, day-closure, expenses, credit, aggregator, silent-toggle, refresh, profile, logout (NO reports/settings/menu-management/inventory/insights/pms). 4 running Dine-In orders present (IN1 ₹711, IN10 ₹3,913).
- Use for CR-515 / CR-492 / BUG-711 hidden-side gating (payment-method picker, Mark Unpaid, pay-later Collect, item-cancel, complementary checkbox, Reprint). Baseline "rights ON → visible" = any owner account.
- Caveat: no Reports sidebar → Order-Report-Beta Reprint path may be unreachable for captain (that may be the expected gate); verify via table Bill/Collect drawer + Order Entry. Confirm restaurant `complementary` flag = Yes for CR-492.

## Notes
- Owner has all permissions — use to verify buttons ARE visible
- For CR-515 / CR-492 permission gating tests, need a staff account WITHOUT specific permissions to verify buttons are HIDDEN (not available in provided accounts — owner-only coverage = PARTIAL)
