# QA Handover — CR-515 (Staff Rights: Payment Change / Unpaid / Pay-Later / Item Cancel) — 2026-11-16

## 1. Inherited from Plan (Verification Matrix results)

| Edit | File | Verification | Self-Test Result |
|------|------|-------------|:---:|
| G1-E9 | OrderEntry.jsx L353 | `hasPermission('food')` → `hasPermission('order_cancel')` | PASS - verified L353 reads `hasPermission('order_cancel')` with `// CR-515 R-2` marker |
| G2-E7 | OrderReportBetaPage.jsx L10+L268 | `useAuth` imported; `hasPermission` destructured | PASS - verified import L10 and destructure L268 |
| G2-E8a | OrderReportBetaPage.jsx L746-747 | PaymentMethodPicker gated by `update_payment` | PASS - `hasPermission('update_payment') &&` prepended to condition |
| G2-E8b | OrderReportBetaPage.jsx L756-757 | Mark Unpaid gated by `order_unpaid` | PASS - `hasPermission('order_unpaid') &&` prepended to condition |
| G2-B1 | OrderReportBetaPage.jsx L807-808 | Collect button gated by `clear_payment` | PASS - `hasPermission('clear_payment') &&` prepended to condition |

Compile: webpack compiled with 1 warning (pre-existing SettlementReportMockup.jsx — NOT from CR-515). 0 new warnings.

## 2. Test Cases

### TC-1: Item cancel permission (E9) — OrderEntry page
| Step | Action | Expected |
|------|--------|----------|
| 1 | Login as a user **with** `order_cancel` permission | Item cancel buttons visible on order items |
| 2 | Login as a user **without** `order_cancel` but **with** `food` permission | Item cancel buttons **hidden** (this is the fix — previously they could cancel) |
| 3 | Login as owner/manager (has all permissions) | Item cancel buttons visible |

### TC-2: Change Payment Method (E8a) — Orders Beta page (`/reports-module/order-report-beta`)
| Step | Action | Expected |
|------|--------|----------|
| 1 | Login as user **with** `update_payment` | PaymentMethodPicker (Change) button visible on settled orders |
| 2 | Login as user **without** `update_payment` | PaymentMethodPicker (Change) button **hidden** |
| 3 | Verify AllOrdersReportPage (`/reports/audit`) still gates same way | Unchanged — already gated (reference) |

### TC-3: Mark Unpaid (E8b) — Orders Beta page
| Step | Action | Expected |
|------|--------|----------|
| 1 | Login as user **with** `order_unpaid` | "Unpaid" button visible on settled non-PG orders |
| 2 | Login as user **without** `order_unpaid` | "Unpaid" button **hidden** |

### TC-4: Collect Pay-Later (B1) — Orders Beta page
| Step | Action | Expected |
|------|--------|----------|
| 1 | Login as user **with** `clear_payment` | "Collect" button visible on Hold/Paylater/TAB unpaid rows |
| 2 | Login as user **without** `clear_payment` | "Collect" button **hidden** |

### TC-5: No regression on other buttons
| Step | Action | Expected |
|------|--------|----------|
| 1 | Reprint button on Orders Beta | Still visible to all (out of scope — P1) |
| 2 | Refund button on Orders Beta | Still visible for Razorpay PG orders (unchanged) |
| 3 | Pay Link button on Orders Beta | Still visible for Hold orders with Razorpay enabled (unchanged) |

### TC-6: Compile & build
| Step | Action | Expected |
|------|--------|----------|
| 1 | `webpack compile` | 0 new errors, 0 new warnings |

## 3. Regression Tests

| # | What to verify | Why |
|---|----------------|-----|
| R1 | AllOrdersReportPage `/reports/audit` still gates Change + Unpaid | Same keys used — ensure no interference |
| R2 | Dashboard order cards still gate cancel/print correctly | OrderEntry.jsx touched (L353) |
| R3 | Order cancel on order-level (`canCancelOrder`) still works | Same file, adjacent line (L352) |

## 4. Registry Sync Confirmation
- Registry synced: YES
- Items: CR-515
- Sprint: nov_cr_batch
- EXIT GATE: 5/5 PASSED
  - [x] REGISTRY SYNC: registry.json CR-515 → GATE_5A_IMPLEMENTED
  - [x] CR_REGISTRY.MD: row updated
  - [x] FILE_OWNERSHIP.MD: OrderEntry.jsx + OrderReportBetaPage.jsx added
  - [x] CODE MARKERS: `// CR-515` in both files (6 markers total)
  - [x] COMPILE CHECK: 0 new warnings

## 5. Credentials + Environment
- Preview URL: https://pull-build-3--2jz687ss.preview.emergentagent.com
- API: https://preprod.mygenie.online/
- Test accounts: see `/app/memory/control/test_credentials.md`
- Permission testing requires accounts with different role configurations (owner vs staff with limited rights)

## 6. Files Changed
| File | Lines | Change |
|------|-------|--------|
| `components/order-entry/OrderEntry.jsx` | L353 | `food` → `order_cancel` |
| `pages/reports-module/OrderReportBetaPage.jsx` | L10, L268, L746-747, L756-757, L807-808 | `useAuth` import + `hasPermission` + 3 button gates |
