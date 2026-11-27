# BE reply — FE validation pack (standalone)
Date: 2026-09-10
Ref: CR-162 / BUG-384, CR-163 GAP1+GAP2, CR-363 Night Audit, check-in id_type, local-reservations pagination

Summary table:
- CR-162 room-payment 403 → NOT a permission gap. Wrong body fields. Fix: send room_order_id + payment_amount + payment_mode. Validation now 422.
- CR-163 GAP1 source items not removed → CLOSED. Split moves/reduces source qty.
- CR-163 GAP2 new order missing from Dine-In → SHIPPED. Send optional target_table_id.
- CR-363 Night Audit no_show → SHIPPED. today.no_show_count (Option A) now in dashboard-kpis.
- Check-in id_type → HARDENED. id_type required, missing = 422.
- Pagination → P3, client-side OK this sprint.
