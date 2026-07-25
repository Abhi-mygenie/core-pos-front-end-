# Agent Handover — POS 4.0 Bug Triage Session (2026-06-07)

**Session:** BUG-112 → BUG-114 implementation + BUG-115 onwards handover
**Date:** 2026-06-07
**Branch:** `5-june`

---

## What Was Done This Session

### 1. Registry Sync (from `intake` branch)
- Added **BUG-112 to BUG-118** (7 bugs) to `BUG_TRACKER.md`
- Added **CR-014, CR-015** (2 CRs) to `CR_REGISTRY.md`
- Preserved local `5-june` FROZEN status for CR-013/CR-013-AUDIT

### 2. BUG-112 — Auto-print blocked by Place Order API response (IMPLEMENTED — Phase 1)
**File:** `OrderEntry.jsx`
- `waitForOrderReady` timeout reduced 3000ms → 500ms (order already in context from socket)
- Added early HTTP check at redirect point: if `newOrderId` already set → fire print immediately
- Fallback to `placePromise.then()` if HTTP hasn't responded yet (current behavior for most cases)
- **Both QSR and Prepaid paths patched** — QSR uses inline print logic (own scope), Prepaid uses `autoPrintNewOrderIfEnabled`
- **Phase 2 deferred:** Socket-first approach for table-based orders (match by tableId, eliminate HTTP wait entirely). Not implemented because tableless orders (walk-in/TA/Del) still need HTTP orderId.
- **Testing result:** Both paths fire correctly. Currently hits fallback path ("HTTP responded after redirect") because HTTP consistently arrives after engage/delay.
- **Implementation summary:** `/app/memory/memory/bugs/BUG_112_IMPLEMENTATION_SUMMARY.md`

### 3. BUG-113 — Partial payment UI stuck (IMPLEMENTED)
**File:** `CollectPaymentPanel.jsx`
- Removed real-time capping + auto-fill from `onChange` handler (was causing circular override on every keystroke)
- Added `onBlur` handler: clamps to max + auto-fills other row only when it's empty
- Free typing in split payment fields now works
- "Remaining: ₹X" label unchanged — shows real-time feedback

### 4. BUG-114 — discount_type / category fields not passed to backend (IMPLEMENTED + VALIDATED)
**Files:** `CollectPaymentPanel.jsx`, `orderTransform.js`
- Threaded `selectedDiscountType.id` and `selectedDiscountType.name` through `paymentData.discounts`
- Fixed `discountType` to carry category name when preset selected (was empty due to `setDiscountType(null)`)
- Fixed `orderDiscountType` to return `'Percent'` for presets
- Updated 2 payment transform builders (`placeOrderWithPayment`, `collectBillExisting`) to read from `discounts` instead of hardcoded 0
- Fixed key mismatch in `placeOrderWithPayment`: was reading `discounts.type`, now reads `discounts.discountType || discounts.type`
- **Validated with real orders on preprod:**
  - `discount_type: "Thrive"` ✅
  - `discount_member_category_id: 49` ✅
  - `discount_member_category_name: "Thrive"` ✅
  - Collect-bill path: `discount_type: "Google Review"`, `discount_member_category_id: 50` ✅

---

## What Remains — Next Agent Picks Up Here

### BUG-115 — Audit Report cancelled item/order rendering (NEEDS RUNTIME VALIDATION)
- Code-read found TAB_FILTERS gap (OG-FE-01)
- **Needs preprod reproduction first** — navigate to Audit Report, find cancelled order/item, validate what renders incorrectly
- Compare with Order Ledger S6 cancelled logic
- Intake doc: `/app/memory/memory/bugs/BUG_115_AUDIT_REPORT_CANCEL_VALIDATION_INTAKE.md`

### BUG-116 — Out-of-kitchen/out-of-menu socket realtime (DISCOVERY COMPLETE)
- Backend socket + FE: save not wired to API + no socket handler + no MenuContext updater
- Intake doc: `/app/memory/memory/bugs/BUG_116_OUT_OF_KITCHEN_SOCKET_REALTIME_INTAKE.md`

### BUG-117 — Audit Report side-sheet discount text format (NEEDS RUNTIME VALIDATION)
- Code-read found field name mismatch (discountAmount vs discount)
- Needs preprod login to validate with real orders
- Intake doc: `/app/memory/memory/bugs/BUG_117_AUDIT_SIDESHEET_DISCOUNT_TEXT_INTAKE.md`

### BUG-118 — Nth-item coupon / BOGO coupon (INTAKE)
- FE investigation needed — no discovery done yet
- Intake doc: `/app/memory/memory/bugs/BUG_118_NTH_ITEM_BOGO_COUPON_INTAKE.md`

### CR-014 — Menu Management API Migration (REGISTERED)
### CR-015 — Settlement Module (REGISTERED)

---

## Files Modified This Session

| File | Bugs |
|------|------|
| `OrderEntry.jsx` | BUG-112 (3 locations: L1640 timeout, L1812-1840 prepaid, L1198-1270 QSR) |
| `CollectPaymentPanel.jsx` | BUG-113 (L2622-2665 onChange→onBlur), BUG-114 (L1005-1028 discounts object) |
| `orderTransform.js` | BUG-114 (L1157 discount_type key, L1194-1196 placeOrderWithPayment, L1390-1392 collectBillExisting) |
| `BUG_TRACKER.md` | Updated statuses for BUG-112, BUG-113, BUG-114 |

---

## Key Architecture Notes for Next Agent

1. **`autoPrintNewOrderIfEnabled`** is defined INSIDE `onPaymentComplete` inline handler (L1610) — NOT accessible from `handleQsrCollectBill` (L1133). QSR path has its own inline print logic. Don't cross-reference.

2. **`waitForOrderReady`** polls `ordersRef.current` (always fresh ref). **`getOrderById`** reads `orders` state (stale closure). Never use `getOrderById` in async paths after navigation — use `waitForOrderReady` instead.

3. **`selectedDiscountType`** in CollectPaymentPanel holds `{ id, name, discountPercent }` from `profileTransform.discountTypes`. When preset is selected, `discountType` state is set to null (intentional). Category info flows through `paymentData.discounts.discountMemberCategoryId/Name`.

4. **Split payment `onChange`** is now free-typing (BUG-113). Validation moved to `onBlur`. Do not re-add real-time capping.
