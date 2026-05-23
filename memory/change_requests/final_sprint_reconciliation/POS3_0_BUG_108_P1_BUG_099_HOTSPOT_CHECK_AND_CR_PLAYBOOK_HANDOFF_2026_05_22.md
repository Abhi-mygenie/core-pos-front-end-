# POS 3.0 BUG-108 P1 — BUG-099 Hotspot Check + CR Playbook 10-Step Implementation Handoff

**Date:** 2026-05-22
**Sprint:** POS 3.0
**Bug / CR:** BUG-108 — Coupon / Loyalty / Wallet UI Shell (Phase 1, read + validate scope)
**Prepared by:** Senior POS3.0 BUG-108 Frontend P1 Implementation Agent
**Pairs with:** All BUG-108 docs (Discovery Plan, Decision Matrix, Owner Decisions, API Inventory, UX Plan, Q9-Q11 Addendum, Baseline Reconciliation Note, Final Owner Approvals).
**Mandated reading order honored:** All `/app/memory/final/`, BUG-108 docs, BUG-099 docs, and POS3 sprint reconciliation doc — read prior to writing this handoff.

---

## 1. BUG-099 Status

**Verdict: BUG-099 = `implemented_owner_confirmed` (CLOSED).**

Evidence:
- `POS3_0_COMPLETE_SPRINT_STATUS_RECONCILIATION_2026_05_21.md` line 130: `BUG-099 | CR (P1) | implemented_owner_confirmed`
- `POS3_0_BUG_099_REVISED_IMPLEMENTATION_REPORT_2026_05_19.md` line 11: `File changed | CartPanel.jsx only`
- `POS3_0_BUG_099_REVISED_IMPLEMENTATION_REPORT_2026_05_19.md` line 65: `CollectPaymentPanel.jsx | UNTOUCHED | Zero modifications across all revisions`

---

## 2. Did BUG-099 Touch `CollectPaymentPanel.jsx`?

**NO.**

BUG-099 (QSR Quick Billing) shipped an entirely separate path:
- Added `QsrBillingSection` inline inside `CartPanel.jsx`
- Added `handleQsrCollectBill` in `OrderEntry.jsx` (calls `placeOrderWithPayment` directly, bypassing the standard `CollectPaymentPanel` flow)
- Used new utility `qsrModePrefs.js`

BUG-099 explicitly preserved `CollectPaymentPanel.jsx` unchanged (grep verified: 0 modifications across all 3 revisions). The pre-existing baseline concern (CR Master Planning §859) that flagged this file as a HIGH-risk hotspot did **not** materialize — BUG-099 routed around it.

---

## 3. Exact BUG-108 P1 Line / Function Hotspots

### 3.1 `frontend/src/components/order-entry/CollectPaymentPanel.jsx`

| Hotspot | Lines | Function | Change needed |
|---------|-------|----------|---------------|
| State declarations | 248-256 | Component body | No change (state preserved) |
| `manualDiscount` math | 498-500 | Memoized computed | No change |
| `loyaltyDiscount` math | 502-504 | Memoized computed | Wrap with flag — force 0 when `loyaltyRatioLive=false` |
| `couponDiscount` math | 506-511 | Memoized computed | Wrap with flag — force 0 when `couponLive=false` |
| `walletDiscount` math | 513-515 | Memoized computed | Wrap with flag — force 0 when `walletDebitLive=false` |
| Hardcoded coupon catalog | 644-647 | `handleApplyCoupon` | **REMOVE entirely** |
| `handleApplyCoupon` | 639-664 | Function | No-op when `couponLive=false` (button disabled anyway) |
| Discount section gating | 941-958 | JSX | Add Q10 gating — disable when `selectedCoupon !== null` |
| Coupon section (standard view) | 969-1004 | JSX | Disable input + button, helper "Coming soon", Q10 gating |
| Loyalty section (standard view) | 1006-1031 | JSX | Disable checkbox, add helper "Loyalty program unavailable" |
| Wallet section (standard view) | 1033-1069 | JSX | Disable checkbox + hide amount input, add helper |
| Discount section (room inline) | 1393-1430 | JSX | Add Q10 gating |
| Coupon section (room inline) | 1432-1461 | JSX | Disable, add helper, Q10 gating |
| Loyalty section (room inline) | 1463-1477 | JSX | Disable, add helper |
| Wallet section (room inline) | 1479-1498 | JSX | Disable + hide input, add helper |

### 3.2 `frontend/src/api/transforms/orderTransform.js`

| Hotspot | Lines | Payload | Change needed |
|---------|-------|---------|---------------|
| `coupon_discount` / `_title` / `_type` | 898-900 | PLACE_ORDER (variant 1) | Force `0` / `""` / `""` if `couponLive=false` |
| Same triple | 1013-1015 | PLACE_ORDER (variant 2) | Same |
| Same triple | 1141-1143 | PLACE_ORDER (variant 3) | Same |
| Same triple | 1336-1338 | BILL_PAYMENT | Same |
| `used_loyalty_point` | 903, 1021, 1148, 1347 | Multiple builders | Force `0` if `loyaltyRatioLive=false` |
| `use_wallet_balance` | 904, 1022, 1149, 1348 | Multiple builders | Force `0` if `walletDebitLive=false` |
| `coupon_code` (print) | 1755 | Print payload | Force `""` if `couponLive=false` |
| `loyalty_dicount_amount` (print) | 1756 | Print payload | Force `0` if `loyaltyRatioLive=false` |
| `wallet_used_amount` (print) | 1757 | Print payload | Force `0` if `walletDebitLive=false` |

### 3.3 New file: `frontend/src/utils/BUG108_FLAGS.js`

Tiny module exporting the three feature flags + a banner-state hook helper. Acts as the single source of truth read by both UI and transform.

---

## 4. Conflict Verdict

**✅ NO COLLISION with BUG-099.**

- BUG-099 touched: `CartPanel.jsx`, `OrderEntry.jsx`, `qsrModePrefs.js`, `StatusConfigPage`.
- BUG-108 P1 touches: `CollectPaymentPanel.jsx`, `orderTransform.js`, new `BUG108_FLAGS.js`.
- **Zero file overlap.**

Cross-validated against `BUG_104` Phase 2A (which shipped this session in the prior fork): BUG-104 touched `CreditCustomerList.jsx`, `CreditManagementPanel.jsx`, `creditStatementGenerator.js` — also zero overlap with BUG-108 P1.

**Safe to proceed.**

---

## 5. CR Playbook 10-Step Implementation Plan

Following the format in `/app/memory/final/CHANGE_REQUEST_PLAYBOOK.md`.

### 5.1 Approval Gate

| Field | Value |
|-------|-------|
| **Request Summary** | BUG-108 P1: Remove mocked coupon catalog + add disabled-state UI for Coupon/Loyalty/Wallet + Q10 manual↔coupon mutual exclusivity + payload-safety zeros. UI shell only — no live CRM wiring. |
| **Change Type** | Feature (UI shell + payload-safety guardrails) |
| **Affected Module(s)** | Order Entry → Collect Payment Panel; Order Transform (payload builders) |
| **Primary Files to Change** | `CollectPaymentPanel.jsx`, `orderTransform.js`, new `BUG108_FLAGS.js` |
| **Related APIs** | None — feature flags are all `false`. No CRM call added. Existing `PLACE_ORDER` / `BILL_PAYMENT` / print payloads continue to work; values for coupon/loyalty/wallet fields are forced to zero/empty. |
| **State Impact** | Existing component state preserved (`useLoyalty`, `useWallet`, `walletAmount`, `selectedCoupon`, `couponCode`, `couponError`). UI gates new interactions on flags. |
| **UI Impact** | Coupon/Loyalty/Wallet sections render in **disabled state with helper text** when their respective flags are `false` (default for P1). Q10 mutual-exclusivity gates Discount ↔ Coupon. |
| **Regression Risks** | LOW. Payload zeros = today's actual behavior since CRM never confirmed any mock value. Discount math is the same (manual + preset still works alone). |
| **Open Decision Dependencies** | None (Q1-Q8 + Q9-Q11 + Q10-sub all answered; B1-B5 don't gate P1). |
| **Safe to Implement Without Owner Clarification?** | **Yes.** |

### 5.2 File-Level Change Plan

#### File 1: `frontend/src/utils/BUG108_FLAGS.js` (NEW)

- **Why affected:** Single source of truth for the three feature flags.
- **Intended change:** Create file exporting `BUG108_FLAGS = { couponLive: false, loyaltyRatioLive: false, walletDebitLive: false }` + helper `getCrmBlockedBanner()`.
- **Risk:** None — new file, additive.
- **Downstream files to verify:** `CollectPaymentPanel.jsx`, `orderTransform.js` (both import the flags).

#### File 2: `frontend/src/components/order-entry/CollectPaymentPanel.jsx`

- **Why affected:** Hosts the three feature sections (Coupon, Loyalty, Wallet) and the discount math.
- **Intended change:**
  1. Import `BUG108_FLAGS`.
  2. Remove hardcoded `generalCoupons` array (lines 644-647).
  3. Inside `handleApplyCoupon`, early-return when `BUG108_FLAGS.couponLive === false`.
  4. Wrap `loyaltyDiscount`, `couponDiscount`, `walletDiscount` with flag guards — force 0 when the corresponding flag is `false` (belt-and-braces; UI disables also prevent this state).
  5. Add Q10 gating:
     - `const isManualActive = (manualDiscount > 0 || presetDiscount > 0)`
     - `const isCouponActive = (selectedCoupon !== null)`
     - Discount type `<select>` disabled when `isCouponActive` → helper "Remove the coupon to apply a manual discount."
     - Coupon input + Apply button disabled when `isManualActive` OR `!BUG108_FLAGS.couponLive` → helper "Coming soon" (flag) / "Remove the manual discount to apply a coupon." (Q10)
  6. Loyalty section: checkbox disabled when `!BUG108_FLAGS.loyaltyRatioLive`. Add helper text "Loyalty program unavailable" (matches Q7 banner phrasing per FINAL_OWNER_APPROVALS §2.1).
  7. Wallet section: checkbox disabled + amount input hidden when `!BUG108_FLAGS.walletDebitLive`. Add helper "Wallet payments will be available after the next update."
  8. Mirror **all** changes in the room-service inline view (lines 1391-1498).
- **Risk:** MEDIUM — file is 2515 lines, hotspot per CR Master §859. Mitigated by no-touch-zones (no SC/GST/payment-method changes).
- **Downstream files to verify:** None — `orderTransform.js` reads the same `paymentData.discounts` object as today; values are just zeroed when flags are false.

#### File 3: `frontend/src/api/transforms/orderTransform.js`

- **Why affected:** Builds the PLACE_ORDER / BILL_PAYMENT / print payloads that carry coupon/loyalty/wallet fields.
- **Intended change:**
  1. Import `BUG108_FLAGS`.
  2. At each of the 4 PLACE_ORDER variants + BILL_PAYMENT + print override: wrap `coupon_discount` / `coupon_title` / `coupon_type` / `coupon_code` with `couponLive`; wrap `used_loyalty_point` / `loyalty_dicount_amount` with `loyaltyRatioLive`; wrap `use_wallet_balance` / `wallet_used_amount` with `walletDebitLive`.
  3. When flag is `false` → emit `0` for numeric, `""` for string.
- **Risk:** LOW — payload field shape unchanged, only values are zeroed.
- **Downstream files to verify:** None — POS backend already accepts `0` / `""` for these fields (they're optional in the payload contract per BUG-252 baseline).

### 5.3 Testing Checklist

| Path | Test |
|------|------|
| **Happy path** | Place a dine-in order without coupon/loyalty/wallet → unchanged behavior |
| **Happy path** | Apply manual discount alone → Coupon section disabled, helper text visible |
| **Happy path** | (When `couponLive=true` someday) Apply coupon alone → Discount section disabled, helper text visible |
| **Error path** | Try to apply coupon while manual discount > 0 → Apply button disabled, helper visible |
| **Error path** | (When `couponLive=false`) Coupon "Apply" button does nothing on click |
| **Permission-gated** | `restaurantSettings.isCoupon=false` → entire Coupon section hidden (existing behavior) |
| **Permission-gated** | `restaurantSettings.isLoyalty=false` → Loyalty section hidden |
| **Permission-gated** | `restaurantSettings.isCustomerWallet=false` → Wallet section hidden |
| **Socket/reload** | Refresh during edit → state resets; UI rebuilds disabled correctly (no flicker showing enabled then disabled) |
| **Print/payment path** | Place order → inspect network payload — `coupon_discount=0`, `used_loyalty_point=0`, `use_wallet_balance=0`. No mock value leak. |
| **Regression — manual discount** | Apply 10% manual discount → bill total decreases correctly, no change in math |
| **Regression — preset discount** | Apply preset discount → unchanged |
| **Regression — service charge / GST / tip** | Untouched files, untouched code paths |
| **Regression — room-service order flow** | Inline mirror in room-service renders identical disabled states as standard view |

### 5.4 Handover Note

| Section | Content |
|---------|---------|
| **What** | UI shell for BUG-108 — Coupon disabled with "Coming soon"; Loyalty + Wallet read-only with disabled actions; Q10 manual↔coupon mutual exclusivity; payload-safety zeros at transform layer. |
| **Why** | CRM endpoints not yet live (B1 ETA ~2h); we ship the UI shell now so cashiers see "Coming soon" instead of fake FLAT50/SAVE10 and no mock value can leak into orders. |
| **How** | Single feature-flag set (`BUG108_FLAGS`) read by both component and transform. Default all flags `false`. P2 flips them to `true` once CRM endpoints are verified live. |
| **Risk** | LOW — additive disabled states + payload zeros. No live CRM call, no API mutation, no schema change. |
| **Rollback** | Set all flags back to current behavior by removing the flag wraps. Pure code-level revert. |
| **Doc updates** | This handoff + implementation report + QA handoff. PRD changelog. |

---

## 6. Files to Touch

1. `frontend/src/utils/BUG108_FLAGS.js` (NEW)
2. `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (modify)
3. `frontend/src/api/transforms/orderTransform.js` (modify)

---

## 7. Files NOT to Touch

- Any `/app/memory/final/*` baseline doc.
- Any earlier BUG-108 doc (Discovery Plan, Decision Matrix, etc.).
- Any backend code.
- `crmAxios.js`, `customerService.js` (no new endpoints).
- `constants.js` (no new endpoint URLs in P1).
- `CartPanel.jsx`, `OrderEntry.jsx` (BUG-099 territory; unrelated).
- `creditStatementGenerator.js`, `CreditCustomerList.jsx`, `CreditManagementPanel.jsx` (BUG-104 territory; unrelated).
- `profileTransform.js` (settings flag mapping is correct as-is).
- All `*.bak.*` files (legacy snapshots).
- `tests/`, `backend/`, `.emergent/`, `.gitignore`.

---

## 8. Regression Guardrails

| Guardrail | Method |
|-----------|--------|
| No silent discount mutation | Payload-safety zeros at transform layer (defense-in-depth even if UI state leaks) |
| No live CRM API call | All flags default `false`; `handleApplyCoupon` early-returns when `couponLive=false` |
| No state-key rename | `useLoyalty`, `useWallet`, `walletAmount`, `selectedCoupon`, `couponCode`, `couponError` all preserved |
| No discount-math rename | `manualDiscount`, `presetDiscount`, `totalDiscount`, `subtotalAfterDiscount` all preserved |
| No GST / SC / tip touch | Lines outside the targeted hotspots remain untouched |
| Room-service parity | Both view paths receive identical changes in same commit |
| Build verification | `cd /app/frontend && CI=false yarn build` must pass with **zero new errors** |

---

## 9. QA Plan (Smoke for Owner)

| # | Step | Expected |
|---|------|----------|
| 1 | Login, open POS, select a customer with `loyaltyPoints>0` and `walletBalance>0` | Customer selected |
| 2 | Navigate to Collect Bill | Coupon section visible + disabled; helper "Coming soon" shown |
| 3 | Loyalty section | Visible; checkbox disabled; helper "Loyalty program unavailable" shown |
| 4 | Wallet section | Visible; balance shown read-only; "Use Wallet" checkbox disabled |
| 5 | Apply 10% manual discount | Bill total updates correctly; Coupon Apply button disabled; helper "Remove the manual discount to apply a coupon." shown |
| 6 | Clear manual discount → re-select Coupon | Coupon Apply button still disabled (CRM flag is `false`); helper "Coming soon" returns |
| 7 | Inspect outgoing PLACE_ORDER request (browser devtools) | `coupon_discount: 0`, `coupon_title: ""`, `coupon_type: ""`, `used_loyalty_point: 0`, `use_wallet_balance: 0` |
| 8 | Inspect print-bill payload | `coupon_code: ""`, `loyalty_dicount_amount: 0`, `wallet_used_amount: 0` |
| 9 | Room-service order flow (place order for a room) | Same disabled states + same helper text as standard view |
| 10 | Cancel / make-unpaid an order | No CRM call attempted (no `wallet/credit` reverse endpoint exists in this build) |

**Acceptance:** All 10 steps pass; no errors in browser console related to BUG-108 sections.

---

## 10. Final Implementation Readiness Verdict

**✅ SAFE TO PROCEED.**

- BUG-099 collision: **None** (verified — BUG-099 didn't touch `CollectPaymentPanel.jsx`)
- Owner approvals: **100%** (all Q1-Q8, Q9-Q11, Q10-sub, B1-B5 answered)
- Baseline reconciliation: **0 hard conflicts** (per BASELINE_RECONCILIATION_NOTE)
- Scope is bounded to **2 files modified + 1 new file**
- Payload-safety zeros defend against any UI state leak
- No new CRM API calls, no data mutation
- Build target: `cd /app/frontend && CI=false yarn build` (no errors)

Proceeding to implementation now.

---

**End of BUG-099 Hotspot Check + CR Playbook 10-Step P1 Implementation Handoff.**
