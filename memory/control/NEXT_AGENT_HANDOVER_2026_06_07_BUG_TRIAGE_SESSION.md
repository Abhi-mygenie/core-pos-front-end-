# Next Agent Handover — 2026-06-07 Session 2 (Bug Triage + Discovery)

**Date:** 2026-06-07
**Branch:** `5-june`
**Preview URL:** https://cafaeb0a-695e-4680-9d60-b07d29857f98.preview.emergentagent.com
**Credentials:** `owner@palmhouse.com` / `Qplazm@10`

---

## Session Summary

Bug triage + discovery session. 7 new bugs registered, 2 new CRs. Discovery completed on 4 bugs with root causes identified. Implementation plans (Gate 3+4) ready for BUG-113 and BUG-114.

---

## New Bugs Registered (BUG-112..118)

| Bug | Title | Status | Root Cause | Next Step |
|---|---|---|---|---|
| **BUG-112** | Auto-print blocked by Place Order API response (prepaid + auto-bill) | DISCOVERY COMPLETE | Sequential chain: HTTP wait (order_id) + waitForOrderReady (3s socket) + print API. BUG-273 made this deliberate. `billing_auto_bill_print:'Yes'` already in payload. | **Owner must answer Q-112-CRITICAL:** Does backend auto-print when this flag is set? → determines fix approach (Option A–D) |
| **BUG-113** | Partial payment UI stuck — auto-fill locks amount fields | DISCOVERY COMPLETE | `CollectPaymentPanel.jsx` L2639: 2-row auto-fill fires on every `onChange` keystroke → circular override. Only affects restaurants with exactly 2 enabled payment methods. | **Gate 3+4 plan ready** at `BUG_113_114_IMPLEMENTATION_PLAN.md`. Fix: move auto-fill from `onChange` to `onBlur`. Awaiting owner GO. |
| **BUG-114** | discount_type / category_id / category_name sent as empty/0 | DISCOVERY COMPLETE | 2 gaps: (1) `CollectPaymentPanel.jsx` L1020 doesn't thread `selectedDiscountType.id/.name` into paymentData.discounts. (2) `orderTransform.js` L1194,1390 hardcoded `discount_member_category_id:0`. | **Gate 3+4 plan ready** at `BUG_113_114_IMPLEMENTATION_PLAN.md`. 2-file fix. Awaiting owner GO. |
| **BUG-115** | Audit Report cancelled order edge case | NEEDS RUNTIME VALIDATION | Code-read found TAB_FILTERS.cancelled (L84) only checks `paymentMethod==='Cancel'`, misses `fOrderStatus===3`. Matches OG-FE-01. But owner says "not sure of this yet" — need to compare with Order Ledger S6 cancelled logic and validate on preprod. | Login + navigate to Audit Report → compare Cancelled tab with Order Ledger. Need specific failing order ID from owner. |
| **BUG-116** | Custom item socket — menu not updated in realtime | DISCOVERY COMPLETE | `handleAddCustomItem` (L1119) calls `add-single-product` and adds to local cart only. No socket handler exists for menu updates. `MenuContext` has no `addOrUpdateProduct()` method. Backend will emit socket on this endpoint. | **Blocked on backend:** socket event name + payload shape. FE needs: (1) socket event constant, (2) `addOrUpdateProduct` in MenuContext, (3) socket listener hook. |
| **BUG-117** | Audit Report side-sheet discount as text | NEEDS RUNTIME VALIDATION | Code-read found field name mismatch (`discountAmount` vs `discount` across transforms). But owner says validate first, not assume. | Login + open Audit Report → click order with discount → inspect side-sheet. Need preprod session. |
| **BUG-118** | Nth-item & BOGO coupon not working | INTAKE | Needs test coupon codes on preprod to reproduce. | Owner provides coupon codes → test matrix in intake doc. |

---

## New CRs Registered

| CR | Title | Status | Key Info |
|---|---|---|---|
| **CR-014** | Menu Management API Migration | REGISTERED | Switch menu management from Product API to dedicated Menu Management API. Keep UI same. New service + transform files. Needs API docs/sample payloads. |
| **CR-015** | Settlement Module (Day-Closing) | REGISTERED | Opening balance, closing balance, per-waiter settlement, self-settlement, pilferage. **5 curl commands preserved** in CR doc with auth token. Key mapping (total + waiter level) documented. Related to BUG-105. |

---

## Blocking Questions (Owner Must Answer)

| # | Bug/CR | Question | Impact |
|---|---|---|---|
| **Q-112-CRITICAL** | BUG-112 | Does backend auto-print when `billing_auto_bill_print:'Yes'` in place-order payload? | Determines entire fix approach |
| **Q-115-1** | BUG-115 | Pre-billing cancellations → same Cancelled tab or new "Voided" tab? | Tab filter design |
| **Q-116-2/3/4** | BUG-116 | Socket event name + payload shape + channel for custom item | Unblocks FE implementation |
| **Q-114-1** | BUG-114 | What value should `discount_type` carry for category discounts? | Category name or fixed type string |

---

## Ready for Implementation (Awaiting Owner GO)

| Bug | Plan Doc | Files to Change | Risk |
|---|---|---|---|
| **BUG-113** | `BUG_113_114_IMPLEMENTATION_PLAN.md` | `CollectPaymentPanel.jsx` L2626-2646 (onChange→onBlur) | Low |
| **BUG-114** | `BUG_113_114_IMPLEMENTATION_PLAN.md` | `CollectPaymentPanel.jsx` L1020 + `orderTransform.js` L1194,1390 | Low |

---

## Files Created This Session

| File | Purpose |
|---|---|
| `/app/memory/memory/bugs/BUG_112_AUTO_PRINT_PARALLEL_INTAKE.md` | Discovery: auto-print blocking chain |
| `/app/memory/memory/bugs/BUG_113_PARTIAL_PAYMENT_UI_STUCK_INTAKE.md` | Discovery: 2-row auto-fill circular override |
| `/app/memory/memory/bugs/BUG_114_DISCOUNT_CATEGORY_NULL_INTAKE.md` | Discovery: discount category not threaded |
| `/app/memory/memory/bugs/BUG_115_AUDIT_REPORT_CANCEL_VALIDATION_INTAKE.md` | Needs runtime validation |
| `/app/memory/memory/bugs/BUG_116_OUT_OF_KITCHEN_SOCKET_REALTIME_INTAKE.md` | Discovery: custom item socket |
| `/app/memory/memory/bugs/BUG_117_AUDIT_SIDESHEET_DISCOUNT_TEXT_INTAKE.md` | Needs runtime validation |
| `/app/memory/memory/bugs/BUG_118_NTH_ITEM_BOGO_COUPON_INTAKE.md` | Intake only |
| `/app/memory/memory/bugs/BUG_113_114_IMPLEMENTATION_PLAN.md` | Gate 3+4 plan |
| `/app/memory/memory/change_requests/CR_014_MENU_MANAGEMENT_API_MIGRATION.md` | CR doc |
| `/app/memory/memory/change_requests/CR_015_SETTLEMENT_MODULE.md` | CR doc with curl commands |

## Files Updated This Session

| File | Changes |
|---|---|
| `/app/memory/control/BUG_TRACKER.md` | +7 bugs (BUG-112..118) |
| `/app/memory/control/CR_REGISTRY.md` | +2 CRs (CR-014, CR-015) |
| `/app/memory/control/CONTROL_DASHBOARD.md` | Updated with session 2 summary |

---

## Priority Order for Next Session

1. **Implement BUG-113 + BUG-114** (plans ready, awaiting GO)
2. **Runtime validate BUG-115 + BUG-117** (need preprod session with Audit Report)
3. **BUG-112** (blocked on Q-112-CRITICAL answer)
4. **BUG-116** (blocked on backend socket definition)
5. **BUG-118** (blocked on test coupon codes)
6. **CR-015** (Settlement Module — APIs ready, can start anytime)
7. **CR-014** (Menu API Migration — needs API docs from owner)
