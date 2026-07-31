# Business Rules — Pending Freeze Items

**Document Type:** Tracking Register for Unfrozen Business Rules
**Date Compiled:** 2026-05-16 (filename retains the 2026-05-15 sprint reconciliation slug)
**Branch of Record:** `business-rules`
**Companion to:** `/app/memory/final/BUSINESS_RULES_BASELINE_FINAL.md`

---

## Purpose

This register lists every business rule from the freeze candidate that **could not be frozen** in the 2026-05-16 owner approval session. Each item below is blocked by at least one of:

- A code change that has not yet been implemented,
- A runtime payload, live-print, or backend confirmation that has not yet been captured,
- An owner decision that was deferred for lack of information.

Nothing in this document is a freeze. Items move from this register to `BUSINESS_RULES_BASELINE_FINAL.md` only after every blocker is cleared and the owner re-approves.

---

## Source Documents

- Reconciliation & implementation handoff: `/app/memory/change_requests/final_sprint_reconciliation/BUSINESS_RULE_OWNER_APPROVAL_RECONCILIATION_AND_BUG_HANDOFF_2026_05_16.md`
- Freeze candidate: `/app/memory/memory/change_requests/final_sprint_reconciliation/BUSINESS_LOGIC_FREEZE_CANDIDATE_2026_05_15.md`
- Owner approval sheet: `/app/memory/memory/change_requests/final_sprint_reconciliation/BUSINESS_LOGIC_FREEZE_OWNER_APPROVAL_SHEET_2026_05_16.md`
- Owner approval session log: `/app/memory/memory/change_requests/final_sprint_reconciliation/BUSINESS_LOGIC_OWNER_APPROVAL_SESSION_2026_05_16.md`

---

## Summary

| Part | Bucket | Count |
|---|---|---|
| A | Rejected rules — code bug, awaiting fix | 0 *(both PROMOTED 2026-05-31)* |
| B | Approved-with-amendment — awaiting code alignment & verification | 5 *(10 PROMOTED 2026-05-31)* |
| C | Deferred rules — awaiting owner clarification | 1 *(C1/TOTALS-004 + C2/PAY-006 PROMOTED 2026-06-01)* |
| D | Pending runtime / live-print / backend verification gates | 4 *(D1/DASH-004 + D2/PRINT-001 + D3/PRINT-002 + D5/TOTALS-004 + D6/PAY-006 PROMOTED 2026-06-01)* |
| E | Linked implementation bugs (cross-reference) | 12 |

> **Update 2026-05-31:** Part A is cleared. TIP-003 and ROUND-001 were found already implemented and
> owner-verified in code on branch `31may-for-baseline`@`8f92e8c`, owner-reconfirmed this session, and
> **promoted into `BUSINESS_RULES_BASELINE_FINAL.md`**. Pending business rules: 24 → **22**.

---

## Part A — Rejected Rules (Code Fix Required) — ✅ CLEARED 2026-05-31

These rules were documented incorrectly. The owner rejected the original wording and stated the correct
behaviour. **Both have since been code-fixed, code-verified and owner-reconfirmed, and are now PROMOTED into
`BUSINESS_RULES_BASELINE_FINAL.md` (2026-05-31).** Retained below for history.

### A1. TIP-003 — Tip on Takeaway / Delivery  ✅ PROMOTED 2026-05-31
- **Original (rejected):** On Takeaway and Delivery orders, tip GST still applies at the SC rate even though the SC line is hidden.
- **Owner-correct rule:** Tip and tip GST do NOT apply on Takeaway or Delivery orders. The tip input must not appear and tip amount must be ₹0 in the payload.
- **~~What's blocking freeze~~ RESOLVED:** implemented + owner-verified (tip-applicability gate). Code on this branch: `CollectPaymentPanel.jsx:310` (`tipApplicable` gate), `:556` (`tip = 0` for takeaway/delivery), `:1551` (input hidden). Test lock: `__tests__/components/order-entry/tip003.applicability.test.jsx`.
- **Frozen wording:** see baseline §4 TIP-003 (adds the profile tip-feature condition, owner-approved).

### A2. ROUND-001 — Conditional Ceiling/Floor Round-off  ✅ PROMOTED 2026-05-31
- **Original (rejected):** If paise > ₹0.10 → round UP; if paise ≤ ₹0.10 → round DOWN.
- **Owner-correct rule:** Grand Total round-off must ALWAYS be ceiling (`Math.ceil`), regardless of paise value. There is no floor case.
- **~~What's blocking freeze~~ RESOLVED:** implemented + owner-verified (always-ceil). Code on this branch: `orderTransform.js:709-711` and `CollectPaymentPanel.jsx:633-634`. Re-test confirms ₹105.05 → ₹106 and ₹105.15 → ₹106. Test lock: `__tests__/api/transforms/round001.alwaysCeil.test.js`.
- **Frozen wording:** see baseline §5 ROUND-001 (adds the profile round-off on/off gate, owner-approved).

---

## Part B — Approved-With-Amendment Rules (Code Alignment Required)

The owner has approved these rules in their **amended** form. None can be frozen until the implementation agent verifies (and where needed corrects) the code, and confirms with a runtime payload or code reference.

> **Update 2026-05-31 — 10 of 15 PROMOTED.** Code-verified on `31may-for-baseline`@`8f92e8c` and owner-reconfirmed
> (Option A). Promoted to `BUSINESS_RULES_BASELINE_FINAL.md`: **TAX-004, TAX-006, SC-005, DEL-001, DEL-002,
> DEL-003, TOTALS-003, POLL-002** (code matches the amended rule), plus **SCAN-002** and **PAY-003** as
> **current-state** freezes (see notes on those items). Evidence:
> `control/BUSINESS_RULE_PROMOTION_PARTB_2026_05_31.md`.
> **Still pending (5):** TAX-007 (printed-bill GST — live-print), SCAN-003 (owner parked), PAY-009 (timeout-error
> note-only), POLL-003 (backend confirmation), ROOM-002 (owner parked — will reconfirm).

### B1. TAX-004 — Subtotal Always Pre-Tax
- **Amended rule:** Subtotal is always pre-tax. All items (0%, GST, VAT) contribute to subtotal regardless of tax rate. Zero-tax items contribute ₹0 to tax but fully count in subtotal.
- **Code action:** Verify subtotal calculation excludes no items based on tax rate.

### B2. TAX-006 — CGST/SGST 50/50 Split Across All GST Sources
- **Amended rule:** CGST/SGST 50/50 split applies to ALL GST types: item GST + SC GST + delivery charge GST + tip GST. Not just item GST.
- **Code action:** Verify `CollectPaymentPanel.jsx:541-542` applies the split to the composite total across all GST components. (See BUG-010.)

### B3. TAX-007 — Full GST Breakdown on Collect Bill AND Print
- **Amended rule:** Both the Collect Bill screen and the printed bill must show the full GST breakdown: composite CGST/SGST + individual SC GST, Tip GST, Delivery GST. Missing keys → escalate to backend.
- **Code action:** Verify the print payload includes all GST breakdown keys; flag any missing keys. (See BUG-011.)

### B4. SC-005 — Auto-SC Toggle Scope
- **Amended rule:** Auto-SC toggle starts ON/OFF per profile `auto_service_charge` setting. Cashier toggle only disables SC for that specific order — does NOT change the profile setting. Per-order only.
- **Code action:** Verify toggle state change is scoped to the current order only and does not persist to profile.

### B5. DEL-001 — Dedicated `delivery_charge_gst_amount` Key
- **Amended rule:** Delivery GST must be sent as a dedicated separate key `delivery_charge_gst_amount` in the payload AND folded into composite `gst_tax`. Both must be present.
- **Code action:** Verify `delivery_charge_gst_amount` exists as a named key in all order payload flows. (See BUG-009.)

### B6. DEL-002 — Single Delivery GST Source
- **Amended rule:** `delivery_charge_gst_amount` is the ONLY delivery GST source. Rate from `deliver_charge_gst` profile field only. If `deliver_charge_gst` is null → `delivery_charge_gst_amount` = 0. No bleed from other rates.
- **Code action:** Verify no other GST rate contaminates delivery GST; verify null-rate → zero behaviour. (See BUG-009.)

### B7. DEL-003 — Field Now Present (Reversal of Original)
- **Amended rule:** A dedicated `delivery_charge_gst_amount` field EXISTS and IS sent in all order payloads. (Original documentation said "no dedicated field — future BE-G9 task"; owner confirms field is present now.)
- **Code action:** Confirm field is present in payload and correctly valued in Place Order, Update, Prepaid, and Settle flows. (See BUG-009.)

### B8. PAY-003 — Partial Payments Filtered to Configured Modes
- **Amended rule:** Prepaid `partial_payments` array includes ONLY payment modes that are configured/enabled for the restaurant. If only cash + UPI are configured, card must NOT appear in the array.
- **Code action:** Verify partial_payments is filtered against the restaurant's configured payment modes; fix if all 3 modes are always sent. (See BUG-006.)

### B9. SCAN-002 — Snooze Duration is 2 Minutes
- **Amended rule:** Snooze duration is **2 minutes** (not 5 minutes as originally documented). In-memory only; page reload clears snooze.
- **Code action:** Verify snooze timeout in `ScanOrderPopOut.jsx:225-254` is 2 min (120,000 ms); fix if 5 min. (See BUG-007.)

### B10. SCAN-003 — Socket Index 4 is Authoritative Source
- **Amended rule:** Socket event `scan-new-order` carries the order source at **position 4**: `['scan-new-order', orderId, restaurantId, status, 'web']`. Frontend must read index 4 as the primary source identifier. `order_in` enrichment is a secondary fallback only.
- **Code action:** Verify `ScanOrderPopOut.jsx` and related socket handlers read index 4 of the array for order source. (See BUG-008.)

### B11. TOTALS-003 — Grand Total Key Names
- **Amended rule:** Grand Total (always ceiling) is sent as `order_amount` for regular orders. For room orders, it is sent as `grant_total` (or similar — exact key to be confirmed).
- **Code action:** Find and confirm the exact key name used in the room-order payload for grand total. (See BUG-012.)

### B12. POLL-002 — One-Miss Removal
- **Amended rule:** Order is removed from dashboard after **1 missed poll** (not 2). No two-miss buffer.
- **Code action:** Update `useOrderPollingReconciliation.js:34,104-105,180-220` to remove after 1 miss. (See BUG-005.)

### B13. POLL-003 — Status-8/9 Excluded From Polling
- **Amended rule:** Status-8 and status-9 orders do not appear in polling context. If there is explicit frontend filter code for these statuses, backend must confirm it enforces the same exclusion rule.
- **Code action:** Find explicit status-8/9 filter code; raise backend confirmation request if found. **Backend confirmation outstanding.**

### B14. PAY-009 — CRM Edge Cases
- **Amended rule (four edge cases):**
  1. Strip leading/trailing spaces from mobile before CRM lookup.
  2. Mobile is unique per restaurant — same resolution as the order screen.
  3. CRM timeout → show a visible error to the cashier.
  4. Mobile not in CRM → add as a new customer.
- **Code action:** Fix (1) mobile trim in `CollectPaymentPanel.jsx:337,422,691` (BUG-003) and (3) timeout error display (BUG-004).

### B15. ROOM-002 — Room Order `order_amount` Composition
- **Amended rule:** `order_amount` for room orders with a pending balance includes food + associated + outstanding room balance. Owner believes current code behaviour is correct; **runtime payload verification required** before baseline freeze.
- **Code action:** Capture live payload for a room order with pending balance and confirm the combined amount is sent.

---

## Part C — Deferred Rules (Insufficient Information)

These rules could not be decided in the owner approval session. They MUST NOT be implemented or frozen until unblocked.

### C1. TOTALS-004 — Room Order Grand Total Composition  ✅ PROMOTED 2026-06-01
- **~~Why deferred~~ RESOLVED:** Code-verified on `1-june`@`a7e29eb`: `orderTransform.js:1352-1359` — `order_amount = finalTotal` when `roomBalance > 0`. Room balance pass-through at L1238. Matches owner confirmation 2026-04-25.

### C2. PAY-006 — Transfer to Room Payload  ✅ PROMOTED 2026-06-01
- **~~Why deferred~~ RESOLVED:** Owner provided exact payload in OWNER_DECISION_QUEUE A5 (2026-05-29). Code at `orderTransform.js:1433-1459` matches all fields exactly.

### C3. SC-004 / PAY-005 — Alleged SC GST Double-Count on Print
- **Why deferred:** Owner states backend does not add SC GST independently. The alleged double-count claim must be verified by comparing the frontend print payload `service_gst_tax_amount` value with what appears on the printed bill.
- **What's needed to unblock:** Owner to share (1) the frontend print payload for a dine-in order with SC, and (2) the printed bill SC GST value. If they match → close as non-issue. If print shows more → decide Option A/B/C/D.

---

## Part D — Pending Runtime / Live-Print / Backend Verification Gates

These items are partially resolved but cannot be frozen until the specified verification is completed. They are NOT code bugs — they are confirmation gates.

| # | Rule ID | Type of Block | What Must Happen |
|---|---|---|---|
| 1 | DASH-004 | ~~Runtime verification~~ | ✅ **PROMOTED 2026-06-01** — code-verified: `orderOrigin.js`, `PlatformCounterChip.jsx`, `DashboardPage.jsx:1025-1033`. |
| 2 | PRINT-001 | ~~Live print verification~~ | ✅ **PROMOTED 2026-06-01** — code-verified: `printer_agent` present on all 5 payload types (`orderTransform.js:796,821,928,1053,1201`). |
| 3 | PRINT-002 | ~~Live print verification~~ | ✅ **PROMOTED 2026-06-01** — code-verified: BILL excluded by `selectAgentsForKot` at `printerAgentSelector.js:88-91`. `print_kot='No'` → empty array. |
| 4 | ROOM-002 | Runtime verification | Capture actual payload for a room order with pending room balance. Confirm `order_amount` = food + room balance. (Code currently believed correct by owner.) **Owner parked — will reconfirm.** |
| 5 | TOTALS-004 | ~~Backend + runtime~~ | ✅ **PROMOTED 2026-06-01** — code-verified: `orderTransform.js:1352-1359`. |
| 6 | PAY-006 | ~~Runtime~~ | ✅ **PROMOTED 2026-06-01** — code-verified against owner-provided payload (`orderTransform.js:1433-1459`). |
| 7 | SC-004 / PAY-005 | Print payload comparison | Owner to share frontend print payload + printed bill for a dine-in with SC. Compare `service_gst_tax_amount` sent vs amount shown on bill. **Still blocked.** |
| 8 | PAY-007 | Backend confirmation | Confirm with backend team: is the `'sucess'` (misspelled) status string permanent? **Still blocked.** |
| 9 | POLL-003 | Backend confirmation | If explicit status-8/9 filter code exists in the polling hook → confirm backend enforces the same exclusion. **Still blocked.** |

---

## Part E — Linked Implementation Bugs (Cross-Reference Only)

These bugs are tracked in detail in Section 6 of the reconciliation handoff. They are listed here only so the freeze register stays linked to the implementation queue. Do not duplicate fix details in this register.

| Bug ID | Linked Rule | Severity | Summary |
|---|---|---|---|
| BUG-001 | TIP-003 | High | Tip/tip GST applied on Takeaway/Delivery |
| BUG-002 | ROUND-001 | Medium | Conditional round-off instead of always ceiling |
| BUG-003 | PAY-009(a) | Medium | Mobile not trimmed before CRM lookup |
| BUG-004 | PAY-009(b) | Medium | Silent failure on CRM lookup timeout |
| BUG-005 | POLL-002 | Low | Two-miss removal instead of one-miss |
| BUG-006 | PAY-003 | Medium | partial_payments includes unconfigured modes |
| BUG-007 | SCAN-002 | Low | Snooze timeout possibly 5 min instead of 2 min |
| BUG-008 | SCAN-003 | Medium | Socket index 4 may not be primary source |
| BUG-009 | DEL-001/002/003 | Medium | `delivery_charge_gst_amount` payload unclear |
| BUG-010 | TAX-006 | Low | CGST/SGST split may not cover all GST types |
| BUG-011 | TAX-007 | Medium | Print bill GST breakdown missing |
| BUG-012 | TOTALS-003 | Low | Room order grand total key name unconfirmed |

For full bug detail (files, expected behaviour, test cases) see Section 6 of:
`/app/memory/change_requests/final_sprint_reconciliation/BUSINESS_RULE_OWNER_APPROVAL_RECONCILIATION_AND_BUG_HANDOFF_2026_05_16.md`

---

## Promotion Criteria — How an Item Leaves This Register

An item may be removed from this register and promoted into `BUSINESS_RULES_BASELINE_FINAL.md` only when ALL of the following apply:

1. Any required code fix is implemented and merged.
2. The associated implementation bug (if any) is closed.
3. Runtime payload / live-print / backend confirmation (if required) is captured and matches the rule.
4. The owner has reconfirmed the rule in writing on a fresh approval entry.
5. The baseline-creation report has been updated with a dated diff entry.

Until all five gates pass, the item stays here.

---

## No-Action Constraints

- This register is documentation-only.
- No code changes are authorized by the existence of this document.
- No baseline updates may be made on the strength of items in this register.
- SC-004 / PAY-005 implementation Options A/B/C/D remain explicitly **not selected**.

---

## Bug Analysis Reconciliation Addendum — 2026-05-17

### 1. Bug-Derived Baseline Conflicts

| Bug | Business Area | Conflict With Baseline | Risk | Required Resolution | Planning Status |
|---|---|---|---|---|---|
| BUG-051 (+ BUG-076 duplicate) | Round-off | Current code/comments still enforce conditional ceil/floor, while pending-freeze ROUND-001 records the owner-correct always-ceil rule. | High | Implement a single round-off fix against ROUND-001; update tests/comments together; do **not** update final baseline in this run. | Safe after reconciliation |
| BUG-075 | Tip / Tip GST | Current code still allows tip/tip GST on takeaway/delivery, while pending-freeze TIP-003 rejects that behavior. | High | Apply one shared `tipApplicable` gate across UI + payload builders; keep final baseline untouched until code/QA gates pass. | Safe after reconciliation |
| BUG-079 | Polling | `useOrderPollingReconciliation.js` still says 2 misses / `REMOVAL_MISS_THRESHOLD = 2`, while pending-freeze POLL-002 records 1 miss. | Medium | Treat POLL-002 as the controlling pending rule; change constant, anti-rule comment, and pinned tests together. | Safe after reconciliation |
| BUG-080 | Partial payments | `partial_payments` is still hardcoded to `cash/card/upi`, while pending-freeze PAY-003 requires restaurant-configured modes only. | Medium | Filter by `restaurant.paymentMethods`; explicitly document tab/credit caveat before implementation. | Safe after reconciliation |
| BUG-082 | Scan/socket source | Owner wording "index 4 as primary" conflicts with the current payload-at-index-4 parser plus the scan-channel fallback workaround. | High | Backend must confirm the exact socket contract before any fallback retirement or parser rewrite. | Blocked |
| BUG-083 | Delivery GST | Current code comment still defers `delivery_charge_gst_amount` to BE-G9 / Phase 3; bug requests activation now. | High | Backend must confirm field name + composite-retention rule before frontend planning. | Blocked |
| BUG-084 | GST split | UI already shows per-component CGST/SGST halves, but payload/template contract is still Phase-3 deferred. | High | Backend must confirm per-component key names and whether composite totals remain alongside them. | Blocked |
| BUG-085 | Print GST breakdown | Printed bill still consumes composite GST/template fields, while bug requests full per-component breakdown. | High | Backend template adoption + owner receipt UX approval required before planning. | Blocked |

### 2. Bug-Derived Missing Business Rules

| Bug | Missing Rule Area | Behaviour Observed / Proposed | Why Missing From Baseline | Required Owner/Backend Decision |
|---|---|---|---|---|
| BUG-050 | Manual bill reprint source-of-truth | Dashboard/manual bill reprint reconstructs totals differently from Collect Bill when cancellation/discount/tip are involved. | Frozen baseline defines settlement totals, but not which source-of-truth manual reprint must follow after cancellations. | Owner must confirm parity expectation and provide payload/bill evidence. |
| BUG-059 | Historical bill reprint scope | Audit Report wants Print Bill on paid/cancelled/completed orders. | No frozen or pending rule defines historical reprint surface, cancelled-order content, or permission gate. | Owner must choose surface + permissions + cancelled-bill behavior. |
| BUG-061 | Room check-in time visibility | Check-in time is available on room data, but the intended reporting surface is unclear. | Baseline does not define whether Audit Report, Rooms Report, or room-child rows must show check-in time. | Owner must pick the target surface and display mode. |
| BUG-067 | Station-view readiness rule | Station View can be enabled even when the tenant has no usable station setup. | Baseline does not define what "restaurant ready configuration completed" means for the station toggle. | Owner must define readiness condition and desired UX (disable vs auto-revert). |
| BUG-072 | Notes taxonomy | Order cards currently support `order_note` + item notes only; owner asks for room note / table note / item note separation. | No baseline rule defines note categories, backend fields, or render priority. | Owner + backend must confirm whether separate fields exist and where they display. |

### 3. Bug-Derived Backend Authority Questions

| Bug | Field / Flow | FE Authority | BE Authority | Required Backend Answer | Freeze Impact |
|---|---|---|---|---|---|
| BUG-052 | Round-off profile config | FE currently hardcodes the rule in `calcOrderTotals` / `CollectPaymentPanel`. | Restaurant profile field / enum / default are backend-owned. | Exact field name, value enum, default behavior, and legacy fallback. | Keep out of baseline; block planning. |
| BUG-058 | Prepaid Hold collect-bill endpoint | FE Audit drawer always calls `order-bill-payment`. | Correct prepaid endpoint/method support is backend-owned. | Which endpoint should settle prepaid-hold orders, and which methods are supported? | Block planning. |
| BUG-060 | `order-shifted-room` aftermath | FE currently relies on socket emissions to free the source table/order. | Event emission order + payloads are backend-owned. | Which socket/table/order events fire after `order-shifted-room`, and in what order? | Block planning. |
| BUG-063 | Room bill payload fields | FE can add fields only if the backend print template accepts them. | Template field names / tolerance are backend-owned. | Confirm room-print field names (`room_no`, `check_in_date`, etc.) and accepted payload keys. | Block planning. |
| BUG-065 | Corporate room GST echo | FE captures and posts `firm_name` / `firm_gst` today. | Response echo + print-template slot mapping are backend-owned. | Confirm response field names and whether they map to `custGSTName` / `custGST` or dedicated room slots. | Block planning. |
| BUG-082 | Scan socket contract | FE currently treats index 4 as payload and uses a web-channel fallback when `order_from` is missing. | Socket message shape is backend-owned. | Is index 4 still payload, or is a new primitive `order_from` contract expected? | Block planning. |
| BUG-083 | `delivery_charge_gst_amount` | FE computes delivery GST locally but does not emit a separate field. | Dedicated key name + persistence rules are backend-owned. | Exact field name and whether composite `gst_tax` must still include delivery GST. | Block planning. |
| BUG-084 | Per-component CGST/SGST keys | FE UI already computes half-splits. | Payload/template key names are backend-owned. | Exact payload contract for item/service/tip/delivery CGST/SGST fields. | Block planning. |
| BUG-085 | Print template GST rows | FE can only enrich payload; receipt rendering is template-driven. | Template adoption is backend-owned. | Which new fields will the print template render, and how will it avoid double-counting? | Block planning. |

### 4. Bug-Derived QA Assertions Needed

| Bug | Business Rule To Protect | QA Assertion Needed | When To Test |
|---|---|---|---|
| BUG-079 | Polling threshold must match approved rule | Remove a server-side order from the poll response once; confirm dashboard removes it after the **next successful poll** only, while still preserving Hold/open-order protections. | After POLL-002 fix lands |
| BUG-083 | Delivery GST must not alter non-delivery totals | Delivery order emits a separate delivery-GST field **and** composite GST remains numerically correct; non-delivery orders must keep zero / absent delivery GST effect. | After BE-G9 + FE payload change |
| BUG-075 | Tip only where approved by order type | Takeaway/delivery orders show no tip field and submit `tip=0`, `tip_tax_amount=0`; dine-in / walk-in / room still support tip. | After TIP-003 fix |
| BUG-080 | partial_payments must respect enabled modes without breaking out-of-scope flows | Payload contains only enabled methods; disabled modes are absent; tab/credit behavior remains unchanged unless separately approved. | After PAY-003 fix |
| BUG-085 | Print template must not double-count GST components | Printed bill shows each approved GST component once, with totals matching frontend payload and without Bean Me Up-style double counting. | After BE template adoption |
| BUG-082 | Socket popup/web counter must use the approved source-of-truth only | A web order with approved socket payload shape triggers the popup/counter; POS orders do not; legacy fallback is either preserved intentionally or retired intentionally. | After socket contract confirmation |
| BUG-063 | Room billing / print totals must follow the frozen room rule while adding fields | Added room fields must not alter ROOM-001 math for Food Total / Row Total / Outstanding / Discount. | After room-print payload change |
| BUG-078 | CRM timeout must stay distinguishable from "customer not found" | Timeout/network failure shows a visible retryable error; real "not found" still permits manual entry/new-customer path. | After CRM timeout UX change |

### 5. Bugs Safe For Planning After Reconciliation

| Bug | Reason Safe | Business Baseline Reference | Caveat |
|---|---|---|---|
| BUG-051 | Owner-correct rule already captured in pending freeze; single locus in code/tests/comments. | Pending Freeze Part A2 — ROUND-001 | Keep backend parity note visible in the planning packet. |
| BUG-054 | Fits frozen TAX-003 expectation that VAT follows GST logic. | Frozen TAX-003 + TOTALS-002 | Verify no room/print side effect on VAT-only tenants. |
| BUG-055 | Payload parity gap only; no business-rule ambiguity. | No frozen conflict; stays within Module 4 payload contract | Audit `updateOrder` parity in the same plan. |
| BUG-062 | UI gate only; no owner/backend blocker found. | No frozen conflict | Preserve walk-in eligibility unless owner says otherwise. |
| BUG-068 | Reconnect rehydration is additive to existing POLL/socket safety-net behavior. | Frozen POLL-001 + POLL-004 remain intact | De-dupe / merge logic must avoid duplicate orders. |
| BUG-070 | Presentation-only grouping change; no business rule conflict. | No frozen conflict | Confirm section ordering during planning. |
| BUG-071 | Human-visible ID audit only; payload IDs stay unchanged. | No frozen conflict | Preserve `order_id` for payloads and test selectors. |
| BUG-073 | Pure conditional-render fix. | No frozen conflict | Verify partial customization cases still render. |
| BUG-075 | Correct rule already documented in pending freeze (TIP-003). | Pending Freeze Part A1 — TIP-003 | Keep print/reprint zero-tip path in regression checklist. |
| BUG-079 | Correct rule already documented in pending freeze (POLL-002). | Pending Freeze Part B12 — POLL-002 | Update anti-rule comments/investigation docs with the code change. |
| BUG-080 | Correct rule already documented in pending freeze (PAY-003). | Pending Freeze Part B8 — PAY-003 | Explicitly record tab/credit out-of-scope caveat unless owner expands scope. |

### 6. Bugs Blocked From Planning

| Bug | Blocker Type | Required Next Step | Owner/Backend Needed |
|---|---|---|---|
| BUG-050 | Missing business rule + owner evidence | Collect paired payloads / bill screenshots and confirm manual-print parity rule. | Owner |
| BUG-052 | Backend contract | Confirm profile field name / enum / default for round-off config. | Backend |
| BUG-053 | Owner repro ambiguity | Capture screenshot / exact row showing the unwanted GST rate label. | Owner |
| BUG-056 | Owner UX choice | Decide preset-discount picker UX and stacking/exclusivity rule. | Owner |
| BUG-057 | Owner UX choice | Confirm approved prepaid Print Bill surfaces and card layout intent. | Owner |
| BUG-058 | Backend payment contract | Confirm prepaid Hold settlement endpoint and allowed payment-method contract. | Backend |
| BUG-059 | Missing historical-reprint rule | Define surface, permission gate, and cancelled-order print behavior. | Owner |
| BUG-060 | Backend socket source-of-truth | Confirm post-transfer event emission inventory before choosing optimistic vs socket-driven fix. | Backend |
| BUG-061 | Missing reporting rule | Decide where room check-in time should appear. | Owner |
| BUG-063 | Room print field contract | Confirm required field list + template key names. | Owner + Backend |
| BUG-064 | Notification contract | Confirm room-transfer notification payload + message/sound behavior. | Owner + Backend |
| BUG-065 | Corporate GST mapping contract | Confirm echo field names and print mapping target. | Owner + Backend |
| BUG-066 | Repro / scope uncertainty | Confirm exact modal/surface that still allows room transfer. | Owner |
| BUG-067 | Missing readiness rule | Define readiness condition for station-view enablement. | Owner |
| BUG-069 | Architecture choice | Choose coordinated-FCM vs socket-driven sound sequencing. | Owner |
| BUG-072 | Notes taxonomy / backend field existence | Confirm note-field taxonomy and target UI surface. | Owner + Backend |
| BUG-074 | Security-sensitive product rule | Choose password autofill vs session/browser-based remember-me behavior. | Owner |
| BUG-078 | Pending-freeze rule, but UX still unchosen | Confirm visible-error pattern / retry policy for CRM timeouts. | Owner |
| BUG-082 | Socket contract ambiguity | Confirm exact meaning of “index 4 as primary” and whether fallback retires. | Owner + Backend |
| BUG-083 | BE-G9 contract missing | Confirm separate delivery-GST field name + composite policy. | Backend |
| BUG-084 | Per-component GST key contract missing | Confirm payload key names and composite-retention policy. | Backend |
| BUG-085 | Backend template + owner receipt UX missing | Confirm template adoption and approved printed layout. | Owner + Backend |

*— End of Pending Freeze Items Register —*
