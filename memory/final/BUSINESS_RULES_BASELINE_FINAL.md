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
| Rules frozen in this baseline | **32** |
| Rules excluded from baseline (pending) | 24 |

---

## 1. Tax Rules (Frozen)

| Rule ID | Frozen Rule |
|---|---|
| **TAX-001** | Exclusive GST: tax = item price × GST rate, added on top of price. |
| **TAX-002** | Inclusive GST: tax back-calculated from price (price already includes tax). |
| **TAX-003** | VAT items: same tax formula as GST, routed to `vat_amount`; `gst_amount` forced to zero. |
| **TAX-005** | Mixed GST + VAT orders: both tracked separately, never cross-contaminate. |
| **TAX-008** | If `service_charge_tax` or `deliver_charge_gst` is null/missing in profile → system forces that rate to 0%. |

---

## 2. Service Charge Rules (Frozen)

| Rule ID | Frozen Rule |
|---|---|
| **SC-001** | Service Charge applies only to Dine-in, Walk-in, and Room Service order types. It does NOT apply to Takeaway or Delivery. |
| **SC-002** | Service Charge percentage is sourced from `service_charge_percentage` in the restaurant profile. |
| **SC-003** | Service Charge is calculated on the subtotal AFTER discount — not on the pre-discount subtotal. |
| **SC-006** | The Service Charge line is visible only when the order type supports SC and SC% > 0. The cashier may toggle it off for the order. The SC line auto-updates whenever the discount changes. |

---

## 3. Delivery Rules (Frozen)

| Rule ID | Frozen Rule |
|---|---|
| **DEL-004** | Prepaid orders: the delivery charge field is read-only; the cashier cannot change it. |
| **DEL-005** | Web/Scan delivery charge is locked when the value sent by web is > ₹0; it is editable only when the value sent by web is ₹0. *(Smoke passed.)* |

---

## 4. Tip Rules (Frozen)

| Rule ID | Frozen Rule |
|---|---|
| **TIP-001** | The Tip input is shown only when the profile tip feature is enabled. When disabled, tip = ₹0 in the payload. |
| **TIP-002** | Tip GST uses the same rate as Service Charge GST (`service_charge_tax`). If the SC rate is 0%, tip GST is also 0%. |

---

## 5. Round-off Rules (Frozen)

| Rule ID | Frozen Rule |
|---|---|
| **ROUND-002** | Round-off applies only to the Grand Total. All component values use 2-decimal precision. |

---

## 6. Totals Rules (Frozen)

| Rule ID | Frozen Rule |
|---|---|
| **TOTALS-001** | Item Total = sum of (item price × qty) for all non-cancelled, non-complementary items. |
| **TOTALS-002** | Subtotal = Item Total − discount + Service Charge + tip + delivery charge. Subtotal is always pre-tax. |

---

## 7. Payment Rules (Frozen)

| Rule ID | Frozen Rule |
|---|---|
| **PAY-001** | Place unpaid order payload includes: cart + totals + delivery charge + printer agents + `payment_status='unpaid'`. |
| **PAY-002** | Update order: only NEW items are sent in `cart-update`; totals are recalculated for ALL active items; printer agents come from new items' stations only. |
| **PAY-004** | Settle postpaid: food detail rebuilt from placed items (excluding cancelled items + Check-In markers). Live totals come from the Collect Bill screen. PayLater status = `'sucess'`; Tab status = `'success'`; Normal status = `'paid'`. |
| **PAY-007** | Backend currently requires the misspelled `'sucess'` for PayLater / on-hold settlement (confirmed live on order 825855). Frontend must coordinate with backend before any typo fix. |
| **PAY-008** | TAB / Credit settlement sends customer name + mobile only; no `customer_id` is sent. The mobile number is the unique key. |

---

## 8. Scan & Order Rules (Frozen)

| Rule ID | Frozen Rule |
|---|---|
| **SCAN-001** | Web/scan YTC order popup operates as a FIFO queue with Accept / Reject / Snooze / View+Edit actions. The 14 sub-defects identified in the freeze candidate are fixed. |

---

## 9. Dashboard Rules (Frozen)

| Rule ID | Frozen Rule |
|---|---|
| **DASH-001** | Status-8 orders appear on the Hold/Audit tab only — never on the main running dashboard. The Collect Bill button is hidden on the Hold tab. *(Smoke passed.)* |
| **DASH-002** | A socket status-9 event clears the order from the running dashboard. |
| **DASH-003** | Channel-view and status-view share a consistent data source — orders do not jump between views. |

---

## 10. Polling Rules (Frozen)

| Rule ID | Frozen Rule |
|---|---|
| **POLL-001** | A 60-second silent background poll runs as a safety net for missed socket events; it must produce no visual disruption. |
| **POLL-004** | An order currently open in Order Entry is skipped by polling — it is not updated or removed while the cashier is editing. |

---

## 11. Boot Rules (Frozen)

| Rule ID | Frozen Rule |
|---|---|
| **BOOT-001** | The restaurant profile API loads first on login. All other APIs (menu, tables, orders, settings, stations) load only after the profile call completes. |
| **BOOT-002** | The loading page shows visible station-load progress and a failure state. It must never display a false 100%. |

---

## 12. Room Rules (Frozen)

| Rule ID | Frozen Rule |
|---|---|
| **ROOM-001** | Room report totals: <br>• Food Total = associated order total + room food. <br>• Row Total = Room Price + Food Total. <br>• Outstanding = max(0, Row Total − paid). <br>• Discount = max(0, Room Price − lodging collected). <br>BUG-048 fix applied. |

---

## 13. Miscellaneous / Ordering Rules (Frozen)

| Rule ID | Frozen Rule |
|---|---|
| **MISC-001** | An item with base price = ₹1 is treated as a dynamic-price item. The price entry dialog appears before the item is added to the cart. |
| **MISC-002** | Complimentary items show at ₹0 on the bill and are excluded from ALL financial totals (subtotal, tax, grand total). |

---

## What Is NOT in This Baseline

The following categories are deliberately excluded and tracked in `BUSINESS_RULES_PENDING_FREEZE_ITEMS_2026_05_15.md`:

- **Rejected rules** that need a code fix before they can be re-frozen (TIP-003, ROUND-001).
- **Approved-with-amendment rules** that require code alignment + verification (TAX-004, TAX-006, TAX-007, SC-005, DEL-001, DEL-002, DEL-003, PAY-003, PAY-009, SCAN-002, SCAN-003, TOTALS-003, POLL-002, POLL-003, ROOM-002).
- **Deferred rules** awaiting more information (TOTALS-004, PAY-006, SC-004 / PAY-005).
- **Pending runtime / live-print / backend verification items** (DASH-004, PRINT-001, PRINT-002, plus the runtime/backend gates on items above).
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
