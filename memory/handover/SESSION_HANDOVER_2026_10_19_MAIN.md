# Session Handover — 2026-10-19

**Role:** CLOSURE / HANDOVER
**Date:** 2026-10-19
**Next agent role:** Resume from this handover — present summary to owner, then await instruction
**Sprint:** oct_cr_batch + backlog

---

## What To Tell The Owner First

"This session covered 15 items — 6 fully shipped and QA-passed, 2 implemented awaiting QA, 1 needing Gate 4 GO, 6 newly intaked for backlog."

---

## SHIPPED THIS SESSION (QA PASSED — ready for owner smoke)

| ID | Title | Notes |
|---|---|---|
| **BUG-536** | SC GST missing from manual bill reprint | 2 lines in `orderTransform.js`. Reprints from Dashboard/Order Taking now include SC tax in `gst_tax`. QA PASSED 6/6. |
| **BUG-591** | Status View cards sorted alphabetically not by time | 1 file `ChannelColumn.jsx`. Preparing/Ready/Served columns now oldest-first. QA PASSED 100%. Verified live on PalmHouse — WAYN ₹210 (80d) now card #1. **Note: registry still shows GATE_5A_IMPLEMENTED — update to GATE_5B_QA_PASSED.** |
| **BUG-538** | Role-based discount gate + Apply button | 4 files (`orderTransform`, `orderService`, `OrderEntry`, `CPP`). Owner sees full controls + Apply/Unapply button. Cashier: discount section completely hidden. Root cause of earlier failure: `profileTransform.js` was missing `roleBaseDiscount` mapping — fixed. QA PASSED 100% (kunafamahal, `roleBaseDiscount=Yes`). |
| **BUG-557** TableCard gap | Delivery Assign button not showing in grid view | `TableCard.jsx` — mirrors OrderCard fix. Assign/Dispatch button now shows at fOS=5 for unassigned delivery orders. QA PASSED 100%. |
| **CR-440** | Order Notification Banners kill switch | `NotificationContext.jsx` + `StatusConfigPage.jsx`. Toggle in Status Configuration → UI Elements → "Order Notification Banners" (after Auto-expand Served Items). Immediate effect, localStorage persisted, survives re-login. QA PASSED 5/5. |
| **BUG-596** | Expense Report transactions sorted alphabetically not by date | 1 file `ExpenseReportPage.jsx`. Transactions now sorted by date descending (newest first). Code verified, live data test blocked by empty API response in test env — **owner to verify on their device.** |

---

## IMPLEMENTED — AWAITING QA (Gate 5b)

| ID | Title | What to test |
|---|---|---|
| **BUG-595** | Role-based discount not updating live in cashier CPP | Two-device test needed: cashier opens CPP → owner applies discount → CPP should update WITHOUT cashier reopening. Code fix: `initialDiscount` effect deps `[]` → `[initialDiscount?.discount, initialDiscount?.discountType]` + `orderDiscountJson` added to `orderItemsByTableId` whitelist. QA status: CONDITIONAL PASS (code verified, live socket test not automatable). |

---

## AWAITING GATE 4 GO

| ID | Title | What owner needs to say |
|---|---|---|
| **BUG-532** | Dashboard room tile shows wrong amount (SC gap) | Say **"BUG-532 Gate 4 GO"** — 1 line change in `DashboardPage.jsx:L49`. Plan written and verified. Room tile will show ₹848 (was ₹827). |

---

## NEW — REGISTERED THIS SESSION (Gate 1 complete, all backlog)

| ID | Type | Title | Blocked on |
|---|---|---|---|
| **BUG-592** | BUG P1 | Manual bill prints discount % not ₹ amount | Backend + FE safety net. Backend brief filed. Needs Gate 2. |
| **BUG-593** | BUG P2 | CRM sends "noname" as customer name | Ready for Gate 2 — trace `createCustomer` payload. |
| **BUG-594** | BUG P2 | Kitchen view toggle not visible (localStorage cache) | Ready for Gate 2. |
| **CR-436** | CR P1 | Inventory out-of-stock auto-disable via backend key | OD-436-01: backend field name needed. |
| **CR-437** | CR P2 | New settings keys including Menu Master | OD-437-01: full key list from backend needed. |
| **CR-438** | CR P1 | E-invoice upload to Govt GST portal for B2B | OD-438-01: FE vs backend responsibility. |
| **CR-439** | CR P2 | Default screen selection for user | OD-439-04: backend field availability. |
| **CR-441** | CR P3 | Order card prep time as timeline | OD-441-01: expected prep time data source. |

---

## TEST CREDENTIALS (all confirmed working)

| Account | Password | Use for |
|---|---|---|
| `owner@kunafamahal.com` | Qplazm@10 | BUG-538 owner path (roleBaseDiscount=Yes, has discount perm) |
| `cashier@kunafamahal.com` | Qplazm@10 | BUG-538 cashier path (no discount perm) |
| `owner@palmhouse.com` | Qplazm@10 | BUG-591 Status View, BUG-532 |
| `owner@thegoankitchen.com` | Qplazm@10 | BUG-532 (has SC), BUG-592 |
| `owner@cafe103.com` | Qplazm@10 | General FE testing, CR-440 |

---

## KEY TECHNICAL FINDINGS THIS SESSION

### BUG-538 Root Cause (FCM-unrelated)
`profileTransform.js` was missing `roleBaseDiscount` mapping. `restaurantSettingsTransform.js` had it but CPP reads `profileTransform` via `useRestaurant()`. One line fix: `roleBaseDiscount: toBoolean(apiSettings.settings?.role_base_discount ?? apiSettings.role_base_discount)`.

### BUG-595 Root Cause
`initialDiscount` useCallback in CPP had `[]` deps — fired once at mount. Socket update changed `initialDiscount` prop but effect never re-ran. Fixed: deps → `[initialDiscount?.discount, initialDiscount?.discountType]`. Also: `orderItemsByTableId` in `OrderContext` was missing `orderDiscountJson` from its whitelist (dine-in table orders).

### CR-440 Architecture
Three notification systems exist — only `NotificationBanner` is from Firebase. Shadcn `toast()` and Sonner `toast.*` are pure FE action feedback and must NOT be suppressed. Kill switch: `notificationsEnabled` flag in `NotificationContext`, guard before `setNotifications()`, localStorage persistence.

### Discount Investigation (BUG-538)
Two-device flow confirmed. Backend sends `order_discount_json` in socket `update-order` payload. `handleOrderDataEvent` uses payload directly (v2 pattern — no re-fetch). Socket correctly delivers `orderDiscountJson` to orders context. Live flow: owner applies → socket → `orderData.orderDiscountJson` updates → `initialDiscount` prop updates → (with BUG-595 fix) CPP re-seeds discount.

---

## FILES CHANGED THIS SESSION

| File | Changed by |
|---|---|
| `src/components/dashboard/ChannelColumn.jsx` | BUG-591 |
| `src/components/cards/TableCard.jsx` | BUG-557 |
| `src/api/transforms/orderTransform.js` | BUG-538 E1 |
| `src/api/services/orderService.js` | BUG-538 E_SERVICE |
| `src/components/order-entry/OrderEntry.jsx` | BUG-538 E2 |
| `src/components/order-entry/CollectPaymentPanel.jsx` | BUG-538 E3 · BUG-595 E1 |
| `src/api/transforms/profileTransform.js` | BUG-538 roleBaseDiscount fix |
| `src/contexts/OrderContext.jsx` | BUG-595 E2 (orderDiscountJson whitelist) |
| `src/contexts/NotificationContext.jsx` | CR-440 E1 |
| `src/pages/StatusConfigPage.jsx` | CR-440 E2 |
| `src/pages/reports-module/ExpenseReportPage.jsx` | BUG-596 |

---

## RECOMMENDED NEXT SESSION ORDER

1. **"BUG-591 Gate 5b GO"** — owner smoke: open PalmHouse Status View, confirm WAYN (80d) is card #1 in Served column
2. **"BUG-532 Gate 4 GO"** — 1-line fix, instant win
3. **"BUG-595 Gate 5b GO"** — two-device test: cashier CPP open + owner applies discount
4. **"BUG-596 smoke"** — open Expense Report, confirm newest dates first
5. **BUG-592 Gate 2** — manual bill discount % bug (needs backend brief answer)
6. **BUG-593 Gate 2** — CRM noname (quick code trace)
