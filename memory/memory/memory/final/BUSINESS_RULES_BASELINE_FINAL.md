# Business Rules — Final Baseline (FROZEN)

**Document Type:** Permanent Baseline Reference
**Date Frozen:** 2026-05-16
**Branch of Record:** `business-rules`
**Authority:** Owner approval session 2026-05-16 + code validation

---

## Purpose

This document is the **permanent, frozen baseline** of POS business rules that have been:

1. Owner-approved without amendment, AND
2. Code-validated (or already smoke-passed) as being correctly implemented today.

Only rules that are **safe to freeze as-is** appear here. Any rule requiring code change, runtime verification, backend confirmation, or owner clarification is intentionally **NOT** in this document — those live in `BUSINESS_RULES_PENDING_FREEZE_ITEMS_2026_05_15.md`.

This document MUST NOT be modified to silently resolve open questions, add invented logic, or backfill amended rules until the corresponding implementation and verification has been completed and signed off.

---

## Source Documents

- Freeze candidate: `/app/memory/memory/change_requests/final_sprint_reconciliation/BUSINESS_LOGIC_FREEZE_CANDIDATE_2026_05_15.md`
- Owner approval sheet: `/app/memory/memory/change_requests/final_sprint_reconciliation/BUSINESS_LOGIC_FREEZE_OWNER_APPROVAL_SHEET_2026_05_16.md`
- Owner approval session log: `/app/memory/memory/change_requests/final_sprint_reconciliation/BUSINESS_LOGIC_OWNER_APPROVAL_SESSION_2026_05_16.md`
- Reconciliation & implementation handoff: `/app/memory/change_requests/final_sprint_reconciliation/BUSINESS_RULE_OWNER_APPROVAL_RECONCILIATION_AND_BUG_HANDOFF_2026_05_16.md`

---

## Summary

| Metric | Count |
|---|---|
| Total rules in freeze candidate | 56 |
| Rules frozen in this baseline | **49** |
| Rules excluded from baseline (pending) | 7 |

> **Revision 2026-05-31a:** TIP-003 and ROUND-001 promoted from the pending register into this baseline
> (Part A "rejected — code fix required" cleared). Both code-verified on branch
> `31may-for-baseline`@`8f92e8c` and owner-reconfirmed. Evidence:
> `control/BUSINESS_RULE_PROMOTION_TIP003_ROUND001_2026_05_31.md`.
>
> **Revision 2026-05-31b:** 10 Part B rules promoted (TAX-004, TAX-006, SC-005, DEL-001, DEL-002, DEL-003,
> TOTALS-003, POLL-002, plus SCAN-002 and PAY-003 as **current-state** freezes). All code-verified on the
> same anchor and owner-reconfirmed. Frozen 34 → 44, pending 22 → 12. Evidence:
> `control/BUSINESS_RULE_PROMOTION_PARTB_2026_05_31.md`.
>
> **Revision 2026-06-01a:** 5 rules promoted from Part C + Part D (PAY-006, TOTALS-004, DASH-004,
> PRINT-001, PRINT-002). All code-verified on branch `1-june`@`a7e29eb`. PAY-006 matched against
> owner-provided payload (A5 decision, 2026-05-29). Frozen 44 → 49, pending 12 → 7. Evidence:
> `control/BUSINESS_RULE_PROMOTION_PARTC_PARTD_2026_06_01.md`.

---

## 1. Tax Rules (Frozen)

| Rule ID | Frozen Rule |
|---|---|
| **TAX-001** | Exclusive GST: tax = item price × GST rate, added on top of price. |
| **TAX-002** | Inclusive GST: tax back-calculated from price (price already includes tax). |
| **TAX-003** | VAT items: same tax formula as GST, routed to `vat_amount`; `gst_amount` forced to zero. |
| **TAX-004** | Subtotal is always pre-tax and includes every billable item regardless of its tax rate (0%, GST or VAT). Zero-tax items contribute ₹0 tax but their full price still counts in subtotal. *(Promoted 2026-05-31 — code-verified.)* |
| **TAX-005** | Mixed GST + VAT orders: both tracked separately, never cross-contaminate. |
| **TAX-006** | The CGST/SGST 50/50 split is applied to the **combined** GST total — item GST + Service Charge GST + Tip GST + Delivery GST — not item GST alone. *(Promoted 2026-05-31 — code-verified.)* |
| **TAX-008** | If `service_charge_tax` or `deliver_charge_gst` is null/missing in profile → system forces that rate to 0%. |

---

## 2. Service Charge Rules (Frozen)

| Rule ID | Frozen Rule |
|---|---|
| **SC-001** | Service Charge applies only to Dine-in, Walk-in, and Room Service order types. It does NOT apply to Takeaway or Delivery. |
| **SC-002** | Service Charge percentage is sourced from `service_charge_percentage` in the restaurant profile. |
| **SC-003** | Service Charge is calculated on the subtotal AFTER discount — not on the pre-discount subtotal. |
| **SC-006** | The Service Charge line is visible only when the order type supports SC and SC% > 0. The cashier may toggle it off for the order. The SC line auto-updates whenever the discount changes. |
| **SC-005** | The Service Charge checkbox initialises from the restaurant's `auto_service_charge` profile setting. A cashier toggling it changes Service Charge for the **current order only**; it never writes back to or changes the saved profile setting. *(Promoted 2026-05-31 — code-verified.)* |

---

## 3. Delivery Rules (Frozen)

| Rule ID | Frozen Rule |
|---|---|
| **DEL-004** | Prepaid orders: the delivery charge field is read-only; the cashier cannot change it. |
| **DEL-005** | Web/Scan delivery charge is locked when the value sent by web is > ₹0; it is editable only when the value sent by web is ₹0. *(Smoke passed.)* |
| **DEL-001** | Delivery GST is sent as a dedicated key `delivery_charge_gst_amount` (present when delivery GST > 0) **and** is also folded into the composite `gst_tax`. *(Per owner answer Q-083-6 the dedicated key is omitted on non-delivery orders where it would be ₹0.)* *(Promoted 2026-05-31 — code-verified.)* |
| **DEL-002** | Delivery GST has a single source — the `deliver_charge_gst` profile rate. If that rate is null/0, `delivery_charge_gst_amount` = ₹0; no other tax rate contaminates delivery GST. *(Promoted 2026-05-31 — code-verified.)* |
| **DEL-003** | The `delivery_charge_gst_amount` field exists and is emitted in the order payloads (Place, Update, Settle) when delivery GST applies. *(Promoted 2026-05-31 — code-verified.)* |

---

## 4. Tip Rules (Frozen)

| Rule ID | Frozen Rule |
|---|---|
| **TIP-001** | The Tip input is shown only when the profile tip feature is enabled. When disabled, tip = ₹0 in the payload. |
| **TIP-002** | Tip GST uses the same rate as Service Charge GST (`service_charge_tax`). If the SC rate is 0%, tip GST is also 0%. |
| **TIP-003** | Tip and Tip GST apply **only** to Dine-in, Walk-in and Room orders, and only when the profile tip feature is enabled. On **Takeaway and Delivery** the tip input is hidden and the payload `tip_amount` / `tip_tax_amount` = ₹0. *(Promoted 2026-05-31 — code-verified; owner-reconfirmed.)* |

---

## 5. Round-off Rules (Frozen)

| Rule ID | Frozen Rule |
|---|---|
| **ROUND-001** | When round-off is enabled (profile setting `totalRound`, default ON), the Grand Total **always uses ceiling** (`Math.ceil`) — there is **no floor / conditional case** (e.g. ₹105.05 → ₹106 and ₹105.15 → ₹106). When the profile disables round-off, the exact 2-decimal total is used. *(Promoted 2026-05-31 — code-verified; owner-reconfirmed.)* |
| **ROUND-002** | Round-off applies only to the Grand Total. All component values use 2-decimal precision. |

---

## 6. Totals Rules (Frozen)

| Rule ID | Frozen Rule |
|---|---|
| **TOTALS-001** | Item Total = sum of (item price × qty) for all non-cancelled, non-complementary items. |
| **TOTALS-002** | Subtotal = Item Total − discount + Service Charge + tip + delivery charge. Subtotal is always pre-tax. |
| **TOTALS-003** | The Grand Total (always ceiling) is sent as `order_amount` for regular orders. For room orders with a pending balance, `order_amount` carries the full payable (food + associated + outstanding room balance) and `grant_amount` carries the final total. There is no `grand_total` key. *(Promoted 2026-05-31 — code-verified.)* |
| **TOTALS-004** | For room orders with a pending balance, `payment_amount` and `grant_amount` include the room balance. `order_amount` is emitted only when `roomBalance > 0` and carries the full payable (food + associated + room balance). Room balance is a pure pass-through — no SC, GST, or discount applied. *(Promoted 2026-06-01 — code-verified: `orderTransform.js:1238,1352-1359`.)* |

---

## 7. Payment Rules (Frozen)

| Rule ID | Frozen Rule |
|---|---|
| **PAY-001** | Place unpaid order payload includes: cart + totals + delivery charge + printer agents + `payment_status='unpaid'`. |
| **PAY-002** | Update order: only NEW items are sent in `cart-update`; totals are recalculated for ALL active items; printer agents come from new items' stations only. |
| **PAY-004** | Settle postpaid: food detail rebuilt from placed items (excluding cancelled items + Check-In markers). Live totals come from the Collect Bill screen. PayLater status = `'sucess'`; Tab status = `'success'`; Normal status = `'paid'`. |
| **PAY-007** | Backend currently requires the misspelled `'sucess'` for PayLater / on-hold settlement (confirmed live on order 825855). Frontend must coordinate with backend before any typo fix. |
| **PAY-008** | TAB / Credit settlement sends customer name + mobile only; no `customer_id` is sent. The mobile number is the unique key. |
| **PAY-003** | Prepaid `partial_payments` always includes all three payment modes (`cash`, `card`, `upi`); used modes carry their amount and unused modes are sent with ₹0. *(Current-state freeze 2026-05-31 — Option 1 per owner: backend contract expects all three keys. Filtering to only the restaurant's configured modes is deferred pending backend confirmation.)* |
| **PAY-006** | Transfer to Room payload (`order-shifted-room` endpoint) includes: `order_id`, `payment_mode: 'transferToRoom'`, `payment_amount` (final total), `payment_status: 'paid'`, `room_id`, `order_discount`, `self_discount`, `comm_discount`, `tip_amount`, `vat_tax`, `gst_tax` (composite CGST+SGST), `service_tax`, `service_gst_tax_amount`, `tip_tax_amount`. *(Promoted 2026-06-01 — code-verified against owner-provided payload sample, `orderTransform.js:1433-1459`.)* |

---

## 8. Scan & Order Rules (Frozen)

| Rule ID | Frozen Rule |
|---|---|
| **SCAN-001** | Web/scan YTC order popup operates as a FIFO queue with Accept / Reject / Snooze / View+Edit actions. The 14 sub-defects identified in the freeze candidate are fixed. |
| **SCAN-002** | Snoozing a scan/web-order popup stops the in-progress alert chime and dims the card; the popup itself remains visible. There is **no timed auto-hide**. *(Current-state freeze 2026-05-31 — supersedes the earlier 2-minute hide, retired by the Jan-2026 snooze CR; owner-reconfirmed.)* |

---

## 9. Dashboard Rules (Frozen)

| Rule ID | Frozen Rule |
|---|---|
| **DASH-001** | Status-8 orders appear on the Hold/Audit tab only — never on the main running dashboard. The Collect Bill button is hidden on the Hold tab. *(Smoke passed.)* |
| **DASH-002** | A socket status-9 event clears the order from the running dashboard. |
| **DASH-003** | Channel-view and status-view share a consistent data source — orders do not jump between views. |
| **DASH-004** | The Web vs POS header counter reads the `orderFrom` field (normalized by `normaliseOrderFrom`). Web = `orderFrom === 'web'`; POS = everything else (including future BE values like `aggregator`, `kiosk`). Counter excludes terminal statuses (cancelled/paid) and empty containers (no orderId). Counter is independent of all UI filters (status chips, channel chips, search, platform dropdown). *(Promoted 2026-06-01 — code-verified: `orderOrigin.js`, `PlatformCounterChip.jsx`, `DashboardPage.jsx:1025-1033`.)* |

---

## 10. Print Rules (Frozen)

| Rule ID | Frozen Rule |
|---|---|
| **PRINT-001** | The `printer_agent` field is present on all 5 order payload types that may trigger a KOT: (1) Place Order, (2) Update Order, (3) Prepaid/PlaceWithPayment, (4) Cancel-Item, (5) Cancel-Order. All use `selectAgentsForKot()` which matches cart station names (case-insensitive) and excludes BILL. When `print_kot='No'`, `printer_agent` is an empty array. Settle (Flow 4) does not include `printer_agent` by design (no KOT on settlement). *(Promoted 2026-06-01 — code-verified: `orderTransform.js:796,821,928,1053,1201`; `printerAgentSelector.js:78-94`.)* |
| **PRINT-002** | The BILL station is excluded from KOT printer agent selection. `selectAgentsForKot()` explicitly skips any agent where `station` matches `'BILL'` (case-insensitive). BILL-only selection is handled by the separate `selectAgentsForBill()` function. When `print_kot='No'`, the printer agent array is empty. *(Promoted 2026-06-01 — code-verified: `printerAgentSelector.js:88-91,71-73`.)* |

---

## 11. Polling Rules (Frozen)

| Rule ID | Frozen Rule |
|---|---|
| **POLL-001** | A 60-second silent background poll runs as a safety net for missed socket events; it must produce no visual disruption. |
| **POLL-002** | An order missing from one polling refresh is removed from the dashboard after **1 miss** (no two-miss buffer). Hold/Park (status 9) rows are never removed by polling. *(Promoted 2026-05-31 — code-verified.)* |
| **POLL-004** | An order currently open in Order Entry is skipped by polling — it is not updated or removed while the cashier is editing. |

---

## 12. Boot Rules (Frozen)

| Rule ID | Frozen Rule |
|---|---|
| **BOOT-001** | The restaurant profile API loads first on login. All other APIs (menu, tables, orders, settings, stations) load only after the profile call completes. |
| **BOOT-002** | The loading page shows visible station-load progress and a failure state. It must never display a false 100%. |

---

## 13. Room Rules (Frozen)

| Rule ID | Frozen Rule |
|---|---|
| **ROOM-001** | Room report totals: <br>• Food Total = associated order total + room food. <br>• Row Total = Room Price + Food Total. <br>• Outstanding = max(0, Row Total − paid). <br>• Discount = max(0, Room Price − lodging collected). <br>BUG-048 fix applied. |

---

## 14. Miscellaneous / Ordering Rules (Frozen)

| Rule ID | Frozen Rule |
|---|---|
| **MISC-001** | An item with base price = ₹1 is treated as a dynamic-price item. The price entry dialog appears before the item is added to the cart. |
| **MISC-002** | Complimentary items show at ₹0 on the bill and are excluded from ALL financial totals (subtotal, tax, grand total). |

---

## What Is NOT in This Baseline

The following categories are deliberately excluded and tracked in `BUSINESS_RULES_PENDING_FREEZE_ITEMS_2026_05_15.md`:

- **Rejected rules** that need a code fix before they can be re-frozen — *none remaining* (TIP-003 and ROUND-001 were code-fixed, verified and promoted into this baseline on 2026-05-31).
- **Approved-with-amendment rules** still requiring verification / decision — 5 remaining: TAX-007 (printed-bill GST breakdown — live-print verification), SCAN-003 (scan-order socket source field — owner parked), PAY-009 (CRM edge cases — timeout-error UX noted, not implemented), POLL-003 (status-8/9 polling exclusion — backend confirmation), ROOM-002 (room `order_amount` composition — owner parked, will reconfirm). *(10 of the original 15 were promoted on 2026-05-31.)*
- **Deferred rules** awaiting more information (SC-004 / PAY-005). *(PAY-006 and TOTALS-004 promoted 2026-06-01.)*
- **Pending backend verification items** (PAY-007 `'sucess'` typo coordination, POLL-003 backend exclusion). *(DASH-004, PRINT-001, PRINT-002 promoted 2026-06-01.)*
- The **12 implementation bugs** (BUG-001 … BUG-012) listed in Section 6 of the reconciliation handoff document.

A rule may only be moved into this baseline after:

1. Code is fixed (where required), AND
2. Runtime / payload / print verification is complete (where required), AND
3. Owner reconfirms the amended rule, AND
4. The corresponding bug from the implementation handoff is closed.

---

## Change Control

- This file is **append-only with promotion semantics**. New rules may be promoted in only after all four gates above pass.
- Rules already in this baseline must not be silently amended. Any change requires:
  - A new owner approval entry in a fresh approval sheet, AND
  - An updated baseline-creation report with the diff, AND
  - A new dated revision of this file.

---

*— End of Frozen Baseline —*
