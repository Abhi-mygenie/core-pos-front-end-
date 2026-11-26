# QA Handover — Batch 1 Implementation (2026-11-16)

## 1. Inherited from Plan (Verification Matrix results)

| # | Edit | File | Verification | Self-Test |
|---|------|------|-------------|:---:|
| 1 | CR-521 | colors.js L18 | `billPrintedBg` changed to `#FFEDD5` | ✅ PASS |
| 2 | CR-493 B5-E1 | profileTransform.js L429 | `cancelNoteMandatory` mapped from API | ✅ PASS (code review) |
| 3 | CR-493 B5-E2 | RestaurantContext.jsx L55 | Default `false` added | ✅ PASS |
| 4 | CR-493 B5-E3 | restaurantSettingsTransform.js L108 | `toBool(advanced.cancel_note_mandatory)` | ✅ PASS (code review) |
| 5 | CR-493 B5-E4 | OrderEntry.jsx L3148+L3158 | `cancelNoteMandatory` prop on both modals | ✅ PASS |
| 6 | CR-493 B5-E5 | CancelOrderModal.jsx L8+L18+L116+L139 | Prop, guard, label, button disabled | ✅ PASS |
| 7 | CR-493 B5-E6 | CancelFoodModal.jsx L5+L31+L214+L256 | Prop, guard, label, button disabled | ✅ PASS |
| 8 | BUG-639 | orderTransform.js L1304 | `expandCompItems` already present | ✅ VERIFIED |
| 9 | CR-526 Pt1 | OrderReportBetaPage.jsx L909-914 | `open`, `order`, `onCancel` props fixed | ✅ PASS |
| 10 | CR-526 Pt2 E1 | CreditCustomerDetailSheet.jsx | Imports added (useAuth, makeOrderUnpaid, MarkUnpaidConfirmDialog, Trash2) | ✅ PASS |
| 11 | CR-526 Pt2 E2 | CreditCustomerDetailSheet.jsx | CreditRow: onRemove, canRemove, Remove button | ✅ PASS |
| 12 | CR-526 Pt2 E3 | CreditCustomerDetailSheet.jsx | Table header: Action column | ✅ PASS |
| 13 | CR-526 Pt2 E4 | CreditCustomerDetailSheet.jsx | State, handler, permission check | ✅ PASS |
| 14 | CR-526 Pt2 E5 | CreditCustomerDetailSheet.jsx | Props on all 3 buckets (Open=canRemove, Covered/Partial=false) | ✅ PASS |
| 15 | CR-526 Pt2 E6 | CreditCustomerDetailSheet.jsx | MarkUnpaidConfirmDialog render | ✅ PASS |
| 16 | BUG-647 E1 | orderTransform.js L807 | `applyTaxFlags` wrapper function | ✅ PASS |
| 17 | BUG-647 E1a-e | orderTransform.js 5 call sites | `.map(i => applyTaxFlags(i, taxFlags))` | ✅ PASS |
| 18 | BUG-647 E2 | orderTransform.js L843 | `gstEnabled`, `vatEnabled` in extras | ✅ PASS |
| 19 | BUG-647 E3 | orderTransform.js L918+L951 | Tax zeroing + conditional SC/Tip/Del GST | ✅ PASS |
| 20 | BUG-647 E5 | orderTransform.js L1638-1639 | collectBillExisting food_detail guards | ✅ PASS |
| 21 | BUG-647 E6 | OrderEntry.jsx L1148+L1159 | localTax/unplacedTax guards | ✅ PASS |
| 22 | BUG-647 E7 | CartPanel.jsx L431-433 | taxTotals guard | ✅ PASS |
| 23 | BUG-647 E8 | OrderEntry.jsx (6 calls) | taxFlags plumbed to all orderToAPI calls | ✅ PASS |

## 2. Browser test cases (require preprod)

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T1 | CR-521 bill printed card | Login → place order → print bill → check dashboard | Card background is orange (#FFEDD5) not green |
| T2 | CR-493 B5 OFF | Login as cafe103 → GST settings OFF → cancel item → check notes label | Label says "Additional Notes (Optional)" |
| T3 | CR-493 B5 ON | Enable cancel_note_mandatory → cancel item → note field | Label says "Additional Notes *" with red asterisk |
| T4 | CR-493 B5 disabled | Setting ON + no note typed → Confirm button | Button disabled, cannot submit |
| T5 | CR-493 B5 enabled | Setting ON + type note → Confirm button | Button enabled, submits successfully |
| T6 | CR-526 Pt1 | Order Beta → Mark Unpaid on a Paid order | Dialog opens, works correctly (no crash) |
| T7 | CR-526 Pt2 Open | Credit Management → customer → Open bucket → Remove button | "Remove" button visible on Open rows for user with `order_unpaid` permission |
| T8 | CR-526 Pt2 Partial | Same → Partial bucket | "—" shown, no Remove button |
| T9 | CR-526 Pt2 dialog | Click Remove on Open row | Confirmation dialog with order # and ₹ amount |
| T10 | BUG-647 GST OFF | GST toggle OFF → place order → check Network payload | `gst_tax=0`, `tax_amount=0`, items `gst_amount="0.00"` |
| T11 | BUG-647 GST ON | GST toggle ON → place order → check Network payload | Normal GST values present |
| T12 | BUG-647 CartPanel | QSR mode + GST OFF → cart total | Shows subtotal only (no tax) |

## 3. Regression tests

| # | What to verify | Why |
|---|----------------|-----|
| R1 | Normal dine-in order place → settle → report | End-to-end money flow unchanged when GST ON |
| R2 | Delivery order with delivery charge GST | BUG-647 touches delivery GST path |
| R3 | QSR place-and-pay flow | BUG-647 touches placeOrderWithPayment |
| R4 | Credit Management record payment | CR-526 Part 2 adds Remove button alongside existing flows |
| R5 | Cancel order without mandatory notes | CR-493 B5 must NOT block cancellation when setting is OFF |

## 4. Registry Sync Confirmation

Registry synced: YES
Items: CR-521, CR-493, BUG-639, CR-526, BUG-647
Sprint: nov_cr_batch
EXIT GATE: 5/5 PASSED

## 5. Credentials + Environment

| Account | RID | Use |
|---------|-----|-----|
| `owner@cafe103.com` / `Qplazm@10` | 644 | General testing, GST toggle, credit management |
| `owner@ruby.com` / `Qplazm@10` | 672 | Socket probes, APS testing |
| Login endpoint | — | `POST /api/v1/auth/vendoremployee/login` to `preprod.mygenie.online` |
