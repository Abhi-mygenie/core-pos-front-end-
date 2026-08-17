# Business Rule Owner Approval — Reconciliation & Implementation Handoff
**Date:** 2026-05-16
**Branch:** `business-rules`
**Session source:** `/app/memory/memory/change_requests/final_sprint_reconciliation/BUSINESS_LOGIC_OWNER_APPROVAL_SESSION_2026_05_16.md`
**Approval sheet:** `/app/memory/memory/change_requests/final_sprint_reconciliation/BUSINESS_LOGIC_FREEZE_OWNER_APPROVAL_SHEET_2026_05_16.md`

---

## Master Counts

| Category | Count |
|---|---|
| Total rules in freeze candidate | 56 |
| **Section 1 — Approved, ready to freeze** | **32** |
| **Section 2 — Rejected (code bugs)** | **2** |
| **Section 3 — Approved-with-amendment (code alignment required)** | **15** |
| **Section 4 — Deferred (insufficient info)** | **3** |
| **Section 5 — Pending runtime / live-print / backend verification** | **9 items** |
| **Section 6 — Implementation bug list** | **12 bugs** |

> Implementation agent **CAN start** on Sections 2 and 6.
> Section 3 requires code validation before baseline doc is updated.
> Sections 4 and 5 must NOT be frozen until unblocked.

---

## Section 1 — Approved Business Rules Ready to Freeze

No code changes needed. No further owner action needed. Freeze into baseline.

| # | Rule ID | Business Area | Frozen Rule |
|---|---|---|---|
| 1 | TAX-001 | Tax | Exclusive GST: tax = item price × GST rate, added on top of price |
| 2 | TAX-002 | Tax | Inclusive GST: tax back-calculated from price (price already includes tax) |
| 3 | TAX-003 | Tax | VAT items: same tax formula as GST, routed to `vat_amount`; `gst_amount` forced to zero |
| 4 | TAX-005 | Tax | Mixed GST+VAT orders: both tracked separately, never cross-contaminate |
| 5 | TAX-008 | Tax | If `service_charge_tax` or `deliver_charge_gst` is null/missing in profile → system forces that rate to 0% |
| 6 | SC-001 | Service Charge | SC applies only to Dine-in, Walk-in, Room Service. Not Takeaway, not Delivery. |
| 7 | SC-002 | Service Charge | SC percentage from `service_charge_percentage` in restaurant profile |
| 8 | SC-003 | Service Charge | SC calculated on subtotal AFTER discount — not on pre-discount subtotal |
| 9 | SC-006 | Service Charge | SC line visible only when order type supports SC and SC% > 0; cashier can toggle; auto-updates on discount change |
| 10 | DEL-004 | Delivery | Prepaid orders: delivery charge field is read-only; cashier cannot change it |
| 11 | DEL-005 | Delivery | **[SMOKE PASSED]** Web/Scan delivery charge locked when web sent > ₹0; editable when web sent ₹0 |
| 12 | TIP-001 | Tip | Tip input shown only when profile tip feature is enabled; when disabled tip = ₹0 in payload |
| 13 | TIP-002 | Tip | Tip GST uses same rate as SC GST (`service_charge_tax`); if SC rate 0% → tip GST 0% |
| 14 | ROUND-002 | Round-off | Round-off applies only to Grand Total; all component values use 2-decimal precision |
| 15 | TOTALS-001 | Totals | Item Total = sum of (item price × qty) for all non-cancelled, non-complementary items |
| 16 | TOTALS-002 | Totals | Subtotal = Item Total minus discount + SC + tip + delivery charge; pre-tax |
| 17 | PAY-001 | Payment | Place unpaid order: cart + totals + delivery charge + printer agents + `payment_status='unpaid'` |
| 18 | PAY-002 | Payment | Update order: only NEW items in `cart-update`; totals recalculated for ALL active items; printer agents from new items' stations only |
| 19 | PAY-004 | Payment | Settle postpaid: food detail rebuilt from placed items (excl. cancelled + Check-In markers); live totals from Collect Bill screen; PayLater=`'sucess'`, Tab=`'success'`, Normal=`'paid'` |
| 20 | PAY-007 | Payment | Backend requires the misspelled `'sucess'` for PayLater/on-hold settlement — confirmed live on order 825855. Coordinate with backend before any typo fix. |
| 21 | PAY-008 | Payment | TAB/Credit: sends name + mobile only; no `customer_id`; mobile number is the unique key |
| 22 | SCAN-001 | Scan & Order | Web/scan YTC order popup: FIFO queue, Accept / Reject / Snooze / View+Edit actions; 14 sub-defects fixed |
| 23 | DASH-001 | Dashboard | **[SMOKE PASSED]** Status-8 orders appear on Hold/Audit tab only — not on main running dashboard; Collect Bill button hidden on Hold tab |
| 24 | DASH-002 | Dashboard | Socket status-9 event clears order from running dashboard |
| 25 | DASH-003 | Dashboard | Channel-view and status-view use consistent data source — no order jumping |
| 26 | POLL-001 | Polling | 60-second silent background poll; no visual disruption; safety net for missed socket events |
| 27 | POLL-004 | Polling | Order currently open in Order Entry is skipped by polling — not updated or removed while cashier edits |
| 28 | BOOT-001 | Boot | Restaurant profile API loads first on login; all other APIs (menu, tables, orders, settings, stations) load only after profile completes |
| 29 | BOOT-002 | Boot | Loading page shows visible station load progress row and failure state; never shows false 100% |
| 30 | ROOM-001 | Room | Room report totals: Food Total = associated order total + room food. Row Total = Room Price + Food Total. Outstanding = max(0, Row Total − paid). Discount = max(0, Room Price − lodging collected). BUG-048 fixed. |
| 31 | MISC-001 | Ordering | Item with base price = ₹1 is a dynamic price item; price entry dialog appears before adding to cart |
| 32 | MISC-002 | Ordering | Complimentary items show at ₹0 on bill; excluded from ALL financial totals (subtotal, tax, grand total) |

---

## Section 2 — Rejected Rules (Code Bugs — Implementation Agent Must Fix)

These rules were **wrong as documented**. The correct behavior is defined below. Code must be found and fixed to match. Do not freeze until code is fixed and re-verified.

---

### REJECTED: TIP-003 — Tip on Takeaway / Delivery

| | |
|---|---|
| **Original documented rule** | On Takeaway and Delivery orders, tip GST still applies at the SC rate even though the SC line is hidden |
| **Owner verdict** | WRONG — Rejected |
| **Correct rule** | **Tip (and tip GST) does NOT apply on Takeaway or Delivery orders.** The tip input should not appear and tip amount must be ₹0 in the payload for these order types. |
| **Known files** | `orderTransform.js:632,647` — tip GST calculation; `CollectPaymentPanel.jsx` — tip visibility logic |
| **Fix required** | Find all code that calculates or sends tip / tip GST on Takeaway or Delivery orders and remove / gate it by order type |
| **Risk** | High — affects all takeaway and delivery tenants billing tip GST today |

---

### REJECTED: ROUND-001 — Conditional Ceiling/Floor Round-off

| | |
|---|---|
| **Original documented rule** | If paise > ₹0.10 → round UP (ceiling); if paise ≤ ₹0.10 → round DOWN (floor) |
| **Owner verdict** | WRONG — Rejected |
| **Correct rule** | **Grand Total round-off must ALWAYS be ceiling (always round UP to the nearest whole rupee), regardless of the paise value.** There is NO floor case. |
| **Known files** | `orderTransform.js:657-661` — order total rounding; `CollectPaymentPanel.jsx:579-583` — UI display rounding |
| **Fix required** | Replace all conditional ceiling/floor logic with `Math.ceil()` only |
| **Risk** | Medium — rounding discrepancy affects every order total |

---

## Section 3 — Approved-with-Amendment Rules (Code Alignment Required)

These rules are **approved by the owner in their amended form**. The implementation agent must:
1. Verify the code matches the amended rule
2. Fix where it does not
3. Confirm with a runtime payload or code reference before baseline doc is updated

| # | Rule ID | Business Area | Amended Rule | Code Action Required |
|---|---|---|---|---|
| 1 | TAX-004 | Tax | Subtotal is always pre-tax total. All items (0%, GST, VAT) contribute to subtotal regardless of tax rate. Zero-tax items contribute ₹0 to tax totals but fully count in subtotal. | Verify subtotal calculation excludes no items based on tax rate |
| 2 | TAX-006 | Tax | CGST/SGST 50/50 split applies to ALL GST types: item GST + SC GST + delivery charge GST + tip GST. Not just item GST. | Verify `CollectPaymentPanel.jsx:541-542` applies split to composite total across all GST components |
| 3 | TAX-007 | Tax | Both Collect Bill screen AND printed bill show full GST breakdown: composite CGST/SGST + individual SC GST, Tip GST, Delivery GST. If any GST keys are missing from print payload → escalate to backend. | Verify print payload includes all GST breakdown keys; flag missing keys |
| 4 | SC-005 | Service Charge | Auto-SC toggle starts ON/OFF per profile `auto_service_charge` setting. Cashier toggle only disables SC for that specific order — does NOT change the profile setting. Per-order only. | Verify toggle state change is scoped to the current order only and does not persist to profile |
| 5 | DEL-001 | Delivery | Delivery GST must be sent as a dedicated separate key `delivery_charge_gst_amount` in the payload AND folded into composite `gst_tax`. Both must be present. | Verify `delivery_charge_gst_amount` exists as a named key in all order payload flows |
| 6 | DEL-002 | Delivery | `delivery_charge_gst_amount` is the ONLY delivery GST source. Rate from `deliver_charge_gst` profile field only. If `deliver_charge_gst` is null → `delivery_charge_gst_amount` = 0. No bleed from other rates. | Verify no other GST rate contaminates delivery GST; verify null-rate → zero behavior |
| 7 | DEL-003 | Delivery | **REVERSAL of original.** A dedicated `delivery_charge_gst_amount` field EXISTS and IS sent in all order payloads. Original documentation said "no dedicated field — future BE-G9 task" — owner confirms field is present now. | Confirm field is present in payload and correctly valued in Place Order, Update, Prepaid, Settle flows |
| 8 | PAY-003 | Payment | Prepaid `partial_payments` array includes ONLY payment modes that are configured/enabled for the restaurant. If only cash + UPI are configured, card must NOT appear in the array. | Verify partial_payments is filtered against the restaurant's configured payment modes; fix if all 3 modes are always sent |
| 9 | SCAN-002 | Scan & Order | Snooze duration is **2 minutes** (not 5 minutes as originally documented). In-memory only; page reload clears snooze. | Verify snooze timeout in `ScanOrderPopOut.jsx:225-254` is 2 min (120,000ms); fix if 5 min |
| 10 | SCAN-003 | Scan & Order | Socket event `scan-new-order` carries the order source at **position 4** of the array: `['scan-new-order', orderId, restaurantId, status, 'web']`. Frontend must read index 4 as the primary source identifier. `order_in` enrichment is a secondary fallback only. | Verify `ScanOrderPopOut.jsx` and related socket handlers read index 4 of the array for order source |
| 11 | TOTALS-003 | Totals | Grand Total (always ceiling) sent as `order_amount` for regular orders. For room orders, sent as `grant_total` (or similar key — exact key name to be confirmed by implementation agent). | Find and confirm the exact key name used in the room order payload for grand total |
| 12 | POLL-002 | Polling | Order is removed from dashboard after **1 missed poll** (not 2). No two-miss buffer. | Update `useOrderPollingReconciliation.js:34,104-105,180-220` to remove after 1 miss |
| 13 | POLL-003 | Polling | Status-8 and status-9 orders do not appear in polling context. If there is explicit frontend filter code for these statuses, backend must confirm it enforces the same exclusion rule. | Find explicit status-8/9 filter code; raise backend confirmation request if found |
| 14 | PAY-009 | Payment/CRM | Four edge case rules: (1) Strip leading/trailing spaces from mobile before CRM lookup. (2) Mobile unique per restaurant — same resolution as order screen. (3) CRM timeout → show visible error. (4) Mobile not in CRM → add as new customer. | Fix (1) mobile trim in `CollectPaymentPanel.jsx:337,422,691`; fix (3) timeout error display |
| 15 | ROOM-002 | Room | `order_amount` for room orders with pending balance includes food + associated + outstanding room balance. Current code behavior is correct per owner. Runtime payload verification required before baseline freeze. | Capture live payload for a room order with pending balance and confirm combined amount is sent |

---

## Section 4 — Deferred Rules (Insufficient Information — Do NOT Freeze)

Owner could not decide these rules during the session. Do not implement or freeze until unblocked.

| Rule ID | Business Area | Why Deferred | What's Needed to Unblock |
|---|---|---|---|
| TOTALS-004 | Totals | For room orders, grand total (and `payment_amount` / `grant_amount`) likely includes room balance. Needs backend + runtime verification. | Capture runtime payload for a room order and confirm if payment_amount includes room balance. Verify with backend. |
| PAY-006 | Payment | Transfer to Room payload content is unclear. Owner could not confirm without a runtime check. | Capture actual Transfer to Room API payload at runtime. Owner to review and confirm correct fields. |
| SC-004 / PAY-005 | Service Charge / Print | Owner states backend does not add SC GST independently. The alleged double-count claim must be verified by comparing the frontend print payload `service_gst_tax_amount` value with what appears on the printed bill. | Owner to share: (1) Frontend print payload for a dine-in order with SC; (2) Printed bill SC GST value. If they match → close as non-issue. If print shows more → decide Option A/B/C/D. |

---

## Section 5 — Pending Runtime / Live-Print / Backend Verification

These items are partially resolved but **cannot be frozen** until the specified verification is completed. They are NOT code bugs — they are confirmation gates.

| # | Rule ID | Type of Block | What Must Happen |
|---|---|---|---|
| 1 | DASH-004 | Runtime verification | Web vs POS header counter was updated to handle scan & order web orders. Verify the correct field is being read at runtime on a live dashboard with both web and POS orders. |
| 2 | PRINT-001 | Live print verification | Verify `printer_agent` field is present on all 5 payload types (Place, Update, Prepaid, Cancel-Item, Cancel-Order). Confirm correct KOT station is mapped. |
| 3 | PRINT-002 | Live print verification | Verify BILL station is excluded from KOT printer agents. Verify when `print_kot = "No"`, the printer agent array is empty. Test on an agent-configured tenant. |
| 4 | ROOM-002 | Runtime verification | Capture actual payload for a room order with pending room balance. Confirm `order_amount` = food + room balance. (Code currently believed correct by owner.) |
| 5 | TOTALS-004 | Backend + runtime | Capture room order payload to confirm `payment_amount` and `grant_amount` include room balance. Confirm behavior with backend. |
| 6 | PAY-006 | Runtime | Capture Transfer to Room API payload at runtime. Confirm all fields present and correct. |
| 7 | SC-004 / PAY-005 | Print payload comparison | Owner to share frontend print payload + printed bill for a dine-in with SC. Compare `service_gst_tax_amount` sent vs amount shown on bill. |
| 8 | PAY-007 | Backend confirmation | Confirm with backend team: is the `'sucess'` (misspelled) status string permanent? If backend plans to fix typo, frontend must coordinate to avoid silent PayLater breakage. |
| 9 | POLL-003 | Backend confirmation | If explicit status-8/9 filter code exists in polling hook → confirm backend enforces the same exclusion (i.e., these orders are never returned in polling response). |

---

## Section 6 — Final Implementation Bug List

These are **confirmed bugs** with correct behavior defined by the owner. The implementation agent should work through these in priority order.

---

### BUG-001 — TIP-003: Tip Applied on Takeaway/Delivery (HIGH)

| | |
|---|---|
| **Rule violated** | TIP-003 |
| **Bug** | Tip amount and/or tip GST is being calculated or sent in the payload for Takeaway or Delivery order types |
| **Correct behavior** | Tip and tip GST = ₹0 for Takeaway and Delivery. Tip input must not appear. Tip GST must not be calculated. |
| **Files to check** | `orderTransform.js:632,647` (tip GST calc); `CollectPaymentPanel.jsx` (tip visibility) |
| **Test** | Place a Takeaway or Delivery order with tip — confirm tip amount = ₹0 in submitted payload |

---

### BUG-002 — ROUND-001: Conditional Round-off Instead of Always Ceiling (MEDIUM)

| | |
|---|---|
| **Rule violated** | ROUND-001 |
| **Bug** | Grand Total round-off uses a conditional: ceiling when paise > ₹0.10, floor when paise ≤ ₹0.10 |
| **Correct behavior** | Grand Total round-off must ALWAYS be `Math.ceil()` — always round UP regardless of paise value |
| **Files to check** | `orderTransform.js:657-661`; `CollectPaymentPanel.jsx:579-583` |
| **Test** | Submit orders with grand totals of e.g. ₹105.05 and ₹105.15 — both must round to ₹106 |

---

### BUG-003 — PAY-009(a): Mobile Number Not Trimmed Before CRM Lookup (MEDIUM)

| | |
|---|---|
| **Rule violated** | PAY-009 edge case 1 |
| **Bug** | Mobile number entered with leading/trailing spaces is passed to CRM lookup without trimming — may fail to match an existing customer |
| **Correct behavior** | Frontend must `.trim()` the mobile number before sending to CRM lookup. CRM must not store numbers with spaces. |
| **Files to check** | `CollectPaymentPanel.jsx:337,422,691` |
| **Test** | Enter a mobile with a leading space — confirm CRM lookup still returns the correct customer |

---

### BUG-004 — PAY-009(b): Silent Failure on CRM Lookup Timeout (MEDIUM)

| | |
|---|---|
| **Rule violated** | PAY-009 edge case 3 |
| **Bug** | When CRM mobile lookup times out or fails, the name field stays blank with no indication to the cashier |
| **Correct behavior** | If CRM lookup times out or returns an error, show a visible error message to the cashier |
| **Files to check** | `CollectPaymentPanel.jsx` — CRM lookup handler |
| **Test** | Simulate a CRM timeout (e.g., invalid API endpoint) — confirm cashier sees an error, not a silent blank |

---

### BUG-005 — POLL-002: Two-Miss Removal Instead of One-Miss (LOW)

| | |
|---|---|
| **Rule violated** | POLL-002 (amended) |
| **Bug** | Current polling hook removes an order only after 2 consecutive missed polls (~2 minutes total) |
| **Correct behavior** | Order must be removed from the dashboard after **1 missed poll** (~60 seconds) |
| **Files to check** | `useOrderPollingReconciliation.js:34,104-105,180-220` — miss-count logic |
| **Test** | Have an order removed from the server response — confirm it disappears from the dashboard after the next poll (not the one after) |

---

### BUG-006 — PAY-003: Partial Payments Includes Unconfigured Modes (MEDIUM)

| | |
|---|---|
| **Rule violated** | PAY-003 (amended) |
| **Bug** | `partial_payments` array may include all 3 modes (cash, card, UPI) even when one or more are not configured for the restaurant |
| **Correct behavior** | `partial_payments` must only include payment modes that are configured/enabled for the restaurant |
| **Files to check** | `orderTransform.js:1001-1121` — prepaid partial_payments build |
| **Test** | On a tenant with only cash + UPI configured, make a prepaid payment — confirm card mode does not appear in `partial_payments` |

---

### BUG-007 — SCAN-002: Snooze Timeout May Be 5 Min Instead of 2 Min (LOW)

| | |
|---|---|
| **Rule violated** | SCAN-002 (amended — original said 5 min, owner corrected to 2 min) |
| **Bug** | Snooze timer may be set to 5 minutes (300,000ms) instead of the correct 2 minutes (120,000ms) |
| **Correct behavior** | Snooze hides the popup for exactly 2 minutes (120,000ms). In-memory only. |
| **Files to check** | `ScanOrderPopOut.jsx:225-254` — snooze timer constant |
| **Test** | Snooze a web order popup — confirm it reappears after 2 minutes |

---

### BUG-008 — SCAN-003: Socket Index 4 May Not Be Used as Primary Source (MEDIUM)

| | |
|---|---|
| **Rule violated** | SCAN-003 (amended) |
| **Bug** | Frontend may rely on `order_from` or `order_in` enrichment to identify web orders instead of reading `'web'` from index 4 of the `scan-new-order` socket event |
| **Correct behavior** | Socket event `scan-new-order` = `['scan-new-order', orderId, restaurantId, status, 'web']`. Index 4 (`'web'`) is the authoritative source for order origin. Use it first. |
| **Files to check** | Socket handler for `scan-new-order` event; `ScanOrderPopOut.jsx`; `useOrderPollingReconciliation.js:122-128` |
| **Test** | Confirm a web order arriving via socket triggers the popup and increments the web counter using the value at index 4 |

---

### BUG-009 — DEL-001/002/003: delivery_charge_gst_amount Payload Field (MEDIUM)

| | |
|---|---|
| **Rules involved** | DEL-001, DEL-002, DEL-003 |
| **Bug** | Unclear whether `delivery_charge_gst_amount` is (a) sent as a separate key in the payload, (b) the only delivery GST source, and (c) zero when null rate |
| **Correct behavior** | (1) `delivery_charge_gst_amount` must be a dedicated separate key in the payload on all delivery orders. (2) No other rate bleeds into it. (3) Null `deliver_charge_gst` → `delivery_charge_gst_amount` = 0. (4) It must also be folded into composite `gst_tax`. |
| **Files to check** | `orderTransform.js:637-651`; `profileTransform.js:157` |
| **Test** | Submit a delivery order and inspect payload — confirm `delivery_charge_gst_amount` key present, correct value, and `gst_tax` includes it |

---

### BUG-010 — TAX-006: CGST/SGST Split May Not Cover All GST Types (LOW)

| | |
|---|---|
| **Rule violated** | TAX-006 (amended) |
| **Bug** | CGST/SGST 50/50 split may only be applied to item GST total and not to composite GST (item + SC GST + delivery GST + tip GST) |
| **Correct behavior** | CGST and SGST must each equal 50% of the total GST from ALL sources combined |
| **Files to check** | `CollectPaymentPanel.jsx:541-542` |
| **Test** | On an order with SC, tip, and delivery — confirm CGST = SGST = (itemGST + scGST + deliveryGST + tipGST) / 2 |

---

### BUG-011 — TAX-007: Print Bill GST Breakdown Missing (MEDIUM)

| | |
|---|---|
| **Rule violated** | TAX-007 (amended) |
| **Bug** | Printed bill may only show composite CGST/SGST without the individual SC GST, Tip GST, Delivery GST breakdown (unlike the Collect Bill screen) |
| **Correct behavior** | Printed bill must show the same GST breakdown as Collect Bill: composite CGST/SGST + individual SC GST, Tip GST, Delivery GST. If any keys are missing from the print payload → escalate to backend. |
| **Files to check** | Print payload builder; print template config |
| **Test** | Print a bill for an order with SC and delivery — confirm both composite and individual GST lines appear |

---

### BUG-012 — TOTALS-003: Room Order Grand Total Key Name Unconfirmed (LOW)

| | |
|---|---|
| **Rule violated** | TOTALS-003 (amended) |
| **Bug** | The exact payload key name for grand total in room orders is unconfirmed (`grant_total` or similar) |
| **Correct behavior** | For room orders, grand total must be sent under the correct designated key. For regular orders it is `order_amount`. Confirm the room order key. |
| **Files to check** | `orderTransform.js` — room order payload builder |
| **Test** | Submit a room order and inspect payload — note the key name carrying the grand total |

---

## Implementation Agent — Start Checklist

```
[ ] BUG-001  TIP-003   Remove tip/tip GST from Takeaway + Delivery flows
[ ] BUG-002  ROUND-001 Replace conditional round to always Math.ceil()
[ ] BUG-003  PAY-009a  Add .trim() to mobile before CRM lookup
[ ] BUG-004  PAY-009b  Add visible error on CRM timeout
[ ] BUG-005  POLL-002  Change 2-miss removal to 1-miss removal
[ ] BUG-006  PAY-003   Filter partial_payments to configured modes only
[ ] BUG-007  SCAN-002  Confirm/fix snooze to 120,000ms (2 min)
[ ] BUG-008  SCAN-003  Read socket index 4 as primary web source
[ ] BUG-009  DEL-001/2/3 Verify delivery_charge_gst_amount separate key
[ ] BUG-010  TAX-006   CGST/SGST split over ALL GST types
[ ] BUG-011  TAX-007   Print bill shows full GST breakdown
[ ] BUG-012  TOTALS-003 Confirm room order grand total key name
```

---

## DO NOT TOUCH — Deferred / Pending Verification

The following must NOT be implemented or frozen until the owner/backend/runtime unblocks them:

| Item | Blocked By |
|---|---|
| SC-004 / PAY-005 | Owner payload comparison pending |
| TOTALS-004 | Backend + runtime payload verification |
| PAY-006 | Runtime payload capture |
| DASH-004 | Runtime field verification |
| PRINT-001 + PRINT-002 | Live print on agent-configured tenant |
| ROOM-002 | Runtime payload confirmation |
| PAY-007 | Backend confirmation on 'sucess' typo permanence |
| POLL-003 | Backend confirmation on status-8/9 exclusion |

---

## No-Action Constraints (Per Owner)

- No code changes until implementation agent is formally started
- No baseline documentation updates until code is verified
- No register updates
- No commits from this agent
- SC-004 / PAY-005 decision deferred — do not implement any option A/B/C/D

---

*— End of Reconciliation and Handoff Document —*
