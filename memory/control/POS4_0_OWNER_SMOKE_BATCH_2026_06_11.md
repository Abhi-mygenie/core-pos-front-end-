# POS 4.0 — Owner Smoke Batch (Gate 6) — Pre-Freeze
**Created:** 2026-06-11 (from `POS4_0_BASELINE_CONSOLIDATION_REPORT_2026_06_11.md` §3-A + owner rulings R1–R5)
**Rule:** Every item below must be marked PASS (or owner-attested) before the POS 4.0 baseline can be frozen.
**Removed from batch per owner rulings:** CR-021 (R1 — smoke covered both flows, CLOSED) · CR-023 (R2 — smoke done 06-11, CLOSED).
**Creds:** cafe103 / kunafamahal — `Qplazm@10` (preprod.mygenie.online).

| # | Item | Priority | What to verify | Result |
|---|------|----------|----------------|--------|
| S-1 | **CR-025 Discount payload** | **P0 (money)** | 20% discount on ₹1000 order → network payload `order_discount: 200` (₹, not 20), `self_discount: 0`. Repeat on prepaid Place+Pay and Transfer-to-Room | ☐ |
| S-2 | **CR-018 Schedule Order** | P1 | Schedule checkbox on delivery/takeaway/walk-in (hidden on dine-in/room/QSR); incomplete time disables Place Order & Collect Bill; payload `scheduled:1, schedule_at` with time; SCH badge on OrderCard + TableCard; Schedule filter pill; YTC→Preparing→Ready→Served column order | ☐ |
| S-3 | **CR-019 Settings Wizard** | P1 | `/restaurant-settings`: full 6-step walkthrough → Save & Launch; values persist on reload | ☐ |
| S-4 | **CR-020 Phase 4 + B12–B15** | P1 | B11: turn channel OFF in settings → order-type dropdown hides it (then agent removes DEBUG-B11 logs); B12: no "Default GST %" field; B13/B14: "Item Level / Restaurant Level" labels + dynamic hint; B15: Short Code renders as toggle, saves "Yes"/"No" | ☐ |
| S-5 | **CR-017 WhatsApp Payment Link** | P1 | Unpaid order → OrderCard WhatsApp button → modal pre-fills name/phone → send → customer receives Razorpay link on WhatsApp | ☐ |
| S-6 | **BUG-116 Realtime menu socket** | P1 | Add/edit item from another session/backend → POS menu updates without reload (`food_update_${rid}`) | ☐ |
| S-7 | **BUG-122 post-delivery (3 FE fixes)** | P1 | POS YTC OrderCard shows ✗ + ✓ (Cancel works, ✓ advances per def_ord_status); snooze clock ONLY on web-order TableCards | ☐ |
| S-8 | **BUG-112 / BUG-113 / BUG-114** (owner ruling R5) | P1 | 112: QSR Place+Pay auto-print fires fast (≤ ~0.5s after HTTP); 113: split amount fields freely editable, clamp only on blur; 114: category discount → payload carries `discount_type` + `discount_member_category_id/name` | ☐ |
| S-9 | **CR-026 Report Data & Rounding Sweep** | P1 | Reports show paise (₹14.50, no forced rounding); Order Ledger has phone/txn-ref/address/room columns populated; Credit Panel drill-down bill summary correct + totals cards from API; bill-summary line order correct, GST/VAT hidden when ₹0 | ☐ |

**On full PASS:** agent will (1) remove DEBUG-B11 logs, (2) flip statuses to CLOSED — OWNER VERIFIED across CR_REGISTRY/BUG_TRACKER/dashboards, (3) cut the POS 4.0 baseline entry in `BASELINE_INDEX.md`.
