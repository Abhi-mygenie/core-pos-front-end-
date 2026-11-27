# CR-071 — App-Wide Role Gating (Permission Consumer Wiring) — Impact Analysis (Gate 2) — 2026-11-14

Code Reality: PARTIAL — `AuthContext.hasPermission`, `PermissionGate.jsx`, `PermissionRoute.jsx` shipped. Consumers today: DashboardPage (14), ChannelColumn (13), OrderEntry (11), AllOrdersReportPage (6), App.js (6), Sidebar (4), Room report, cards.
Risk: HIGH (touches R5 hotspots; can lock staff out). Backend-blocked: NO.

## Owner decision (locked)
"Into Batch A. Abhishek." — no further scope recorded (intake: REQUIREMENT NOT CAPTURED).

## Findings
Keys currently consumed: bill, customer_management, discount, food, food_transfer, merge_table, order_cancel, order_edit_access, print_icon, report, show_daily_report, transfer_table, update_payment, order_unpaid.
Catalogue keys NOT consumed in FE: complementary_food (→CR-492), clear_payment, serve, confirm_order, order_edit, assign_online_order, show_online_order, aggregator, delivery_man, virtual_wallet, whatsapp_icon, table_view, token_display, swiggy_zomato_price, Ready, coupon, inventory, menu, expence, Loyalty, restaurant_settings, printer_management, table_management, delivery_management, employee, restaurant_setup, physicalqty_master, and per-report keys (cancellation_report, pl_report, wastage_report, room_report, sales_report …).
Note `OrderEntry.jsx` L353: item cancel gated on `food`, not `order_cancel`.

## Owner 2026-11-14 round 3
- **OD-071-A = a — only the rights Batch A needs.** Full app-wide wiring on HOLD until all batches done, then recheck.

## Open owner decision
- OD-071-A: scope — (a) only the keys Batch A needs (CR-492, CR-515, cancel), or (b) full app-wide wiring of every catalogue key above (~30 files)? OPEN — blocks sizing.
- OD-071-B: item cancel should use `order_cancel` (today `food`)? OPEN.
