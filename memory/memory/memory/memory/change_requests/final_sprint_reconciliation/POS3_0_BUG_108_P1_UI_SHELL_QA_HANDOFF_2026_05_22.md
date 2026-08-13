# POS 3.0 BUG-108 P1 — UI Shell QA Handoff (Owner Smoke Test)

**Date:** 2026-05-22
**Status:** `bug_108_p1_ui_shell_implemented_waiting_owner_smoke`
**Pairs with:**
- `POS3_0_BUG_108_P1_UI_SHELL_IMPLEMENTATION_REPORT_2026_05_22.md` (what was built)
- `POS3_0_BUG_108_P1_BUG_099_HOTSPOT_CHECK_AND_CR_PLAYBOOK_HANDOFF_2026_05_22.md` (10-step playbook)

---

## 1. Pre-Flight

| Item | Value |
|------|-------|
| Build | ✅ `yarn build` PASS — 0 errors |
| Files changed | `BUG108_FLAGS.js` (new), `CollectPaymentPanel.jsx`, `orderTransform.js` |
| Feature flags | All three (`couponLive`, `loyaltyRatioLive`, `walletDebitLive`) = **`false`** |
| CRM API calls added | **NONE** — P1 is UI shell only |

---

## 2. Test Credentials

Use the standard preprod account from `/app/memory/test_credentials.md` if present, or:

```
Email:    owner@palmhouse.com
Password: Qplazm@10
```

(Recorded in prior session handoff. Owner should substitute their own account if testing on a different restaurant.)

---

## 3. Smoke Test Steps (10 Required)

### Step 1 — Login + select a customer with loyalty + wallet balance

| | |
|---|---|
| **Action** | Login → Order Entry → search for a customer who has `loyaltyPoints > 0` AND `walletBalance > 0` (any existing CRM customer with both works) |
| **Expected** | Customer profile loads; Cart Panel shows the customer chip |
| **Pass criteria** | Customer balance fields populate from CRM (already-live functionality) |

### Step 2 — Open Collect Bill → Coupon section visible and disabled

| | |
|---|---|
| **Action** | Add at least one item to cart → click "Collect Bill" |
| **Expected** | Coupon section (🎫 Coupon) is visible with: input disabled, "Apply" button disabled, helper text **"Coming soon"** in gray italic |
| **Pass criteria** | Cannot type in the coupon input. "Apply" button has reduced opacity and `cursor-not-allowed`. |
| **Test ID** | `coupon-section`, `coupon-input`, `apply-coupon-btn`, `coupon-helper-text` |

### Step 3 — Loyalty section visible with disabled checkbox + helper

| | |
|---|---|
| **Action** | Inspect Loyalty section (⭐ Loyalty) in the same Collect Bill view |
| **Expected** | Section visible with: points balance shown (`{N} pts`), `₹{N} available` on right; checkbox **disabled**; helper text **"Loyalty program unavailable"** in gray italic |
| **Pass criteria** | Cannot tick checkbox. Section opacity ≈ 0.7 to signal read-only state. |
| **Test ID** | `loyalty-section`, `use-loyalty-checkbox`, `loyalty-helper-text` |

### Step 4 — Wallet section visible with disabled checkbox + amount input hidden

| | |
|---|---|
| **Action** | Inspect Wallet section (💰 Wallet) in the same Collect Bill view |
| **Expected** | Section visible with: balance shown read-only (`₹{N}`); checkbox **disabled**; **amount input is NOT rendered**; helper text **"Wallet payments will be available after the next update."** |
| **Pass criteria** | Cannot tick checkbox. No amount input field visible. |
| **Test ID** | `wallet-section`, `use-wallet-checkbox`, `wallet-helper-text` |

### Step 5 — Manual discount works normally (regression)

| | |
|---|---|
| **Action** | In Discount section: select "%" → enter `10` |
| **Expected** | Bill total updates: 10% of item-total deducted. SC/GST/Grand Total recompute. |
| **Pass criteria** | Bill math unchanged from pre-BUG-108 behavior. |

### Step 6 — Q10 mutual exclusivity (Manual → Coupon disabled by manual)

| | |
|---|---|
| **Action** | With manual 10% discount still applied (from Step 5), look at the Coupon section |
| **Expected** | Coupon section is still disabled with **"Coming soon"** helper (since `couponLive=false` makes it disabled regardless of Q10). |
| **Pass criteria** | Section remains disabled. Same helper as Step 2. |
| **Note** | The Q10 helper `"Remove the manual discount to apply a coupon."` becomes visible **only** when `couponLive=true` (P2). In P1, the `couponLive=false` helper "Coming soon" wins. This is correct precedence. |

### Step 7 — Inspect outgoing PLACE_ORDER request payload

| | |
|---|---|
| **Action** | Place a new dine-in / takeaway order with the manual 10% discount applied → open browser DevTools → Network tab → find the `place-order` request |
| **Expected** | Request body contains: `coupon_discount: 0`, `coupon_title: ""` (or null/omitted), `coupon_type: ""` (or null/omitted), `used_loyalty_point: 0`, `use_wallet_balance: 0`. The `self_discount` field correctly carries the 10% manual discount value. |
| **Pass criteria** | No mock value leak. Manual discount field reflects correctly; all three CRM-pending fields are zero. |

### Step 8 — Inspect outgoing BILL_PAYMENT request payload (existing order)

| | |
|---|---|
| **Action** | Find an existing unpaid order → settle via Collect Bill with manual discount → inspect the `order-bill-payment` request |
| **Expected** | Same field expectations as Step 7. `coupon_discount: 0`, `used_loyalty_point: 0`, `use_wallet_balance: 0`. Manual discount in `self_discount`. |
| **Pass criteria** | No mock value leak in BILL_PAYMENT. |

### Step 9 — Inspect Print payload

| | |
|---|---|
| **Action** | Click "Print Bill" before paying, OR settle and let the auto-print fire → inspect the `order-temp-store` (print) request |
| **Expected** | `coupon_code: ""`, `loyalty_dicount_amount: 0`, `wallet_used_amount: 0`. `discount_amount` carries the manual discount only. |
| **Pass criteria** | No mock value leak in print payload. |

### Step 10 — Room-service inline mirror parity

| | |
|---|---|
| **Action** | Switch order type to a room-service order (associate the order with a room) → in the inline mirror view of the cart/payment, inspect the Coupon/Loyalty/Wallet sections |
| **Expected** | Same three disabled-state sections appear with **same helper texts** as the standard view: "Coming soon" / "Loyalty program unavailable" / "Wallet payments will be available after the next update." |
| **Pass criteria** | Inline mirror parity confirmed. No section shows a stale enabled state. |

---

## 4. Negative / Edge-Case Checks (Bonus)

### N1. Restaurant has `is_coupon=false` in settings

| | |
|---|---|
| **Action** | Toggle off Coupons in Settings → ViewEdit → Save → reload → re-open Collect Bill with customer selected |
| **Expected** | Coupon section is **hidden entirely** (existing behavior — `restaurantSettings.isCoupon` gate). |
| **Pass criteria** | No "Coming soon" text. Loyalty and Wallet sections behave likewise per their own flags. |

### N2. No customer selected

| | |
|---|---|
| **Action** | Open Collect Bill **without** selecting a customer |
| **Expected** | All three sections (Coupon, Loyalty, Wallet) hidden — they require `customer` to be set. |
| **Pass criteria** | No disabled sections leak through to anonymous orders. |

### N3. Customer with `loyaltyPoints=0` or `walletBalance=0`

| | |
|---|---|
| **Action** | Select a customer with zero loyalty / zero wallet balance |
| **Expected** | Loyalty section shows "No points"; Wallet shows "No balance"; both still disabled per their flags. |
| **Pass criteria** | Empty-state copy is correct; no JS errors in console. |

### N4. SC / GST / Tip / VAT regression

| | |
|---|---|
| **Action** | Apply a 10% manual discount + enable SC + non-zero tip + GST/VAT applicable items |
| **Expected** | All taxes and SC compute correctly off the discounted subtotal. Tip GST and SC GST flow through to payload as before. |
| **Pass criteria** | Bill print + payload values match what's shown on screen. |

---

## 5. Acceptance Criteria

| # | Item | Required? |
|---|------|-----------|
| 1 | All 10 Smoke Test steps PASS | ✅ Yes |
| 2 | No JavaScript console errors during the flow | ✅ Yes |
| 3 | No mock value (FLAT50, SAVE10) appears anywhere | ✅ Yes |
| 4 | Manual discount + preset discount unaffected | ✅ Yes |
| 5 | Pay flow (Cash/Card/UPI/Split/Hold) unaffected | ✅ Yes |
| 6 | Bonus N1-N4 — at least N1 + N2 must pass | ✅ Yes |

---

## 6. Known Limitations (Documented, NOT Defects)

1. **Q7 CRM-unavailable banner is wired in the copy module but not currently rendered.** P1 ships the per-section disabled state which serves the same user-facing purpose. The banner becomes meaningful only once CRM endpoints are live and a call fails (P2 follow-up).
2. **Q10 gating from manual-discount → coupon side is dormant in P1.** Because `couponLive=false`, the coupon section is *already* disabled with "Coming soon". The Q10 helper `"Remove the manual discount to apply a coupon."` activates the moment `couponLive` flips to `true` in P2. Likewise for the reverse direction.
3. **Discount section opacity reduces when a coupon is applied AND `couponLive=true`.** In P1, no coupon can be applied, so the discount section never shows the reduced-opacity state. Same activation pattern as #2.
4. **`handleApplyCoupon` is a guarded no-op in P1.** Clicking the Apply button (even if the disabled state is bypassed via DevTools) does nothing. P2 will replace the placeholder with the real `POST /pos/coupons/validate` call.

These are intentional and aligned with the owner-locked decisions (Q1=B, Q5=B, Q6=B, Q7=B, Q8=C).

---

## 7. Reporting Format (For Owner)

After running the 10 smoke steps, please reply with:

```
Step 1: PASS / FAIL (note: ___)
Step 2: PASS / FAIL (note: ___)
…
Step 10: PASS / FAIL (note: ___)

Bonus N1-N4: PASS / FAIL each
Overall: PASS / FAIL
```

If any step fails, please share:
- A short description of the deviation
- A screenshot if visual
- The browser console error message if any
- For payload checks (Steps 7-9), the actual request body JSON

---

## 8. Confirmations

| # | Confirmation | Status |
|---|--------------|--------|
| 1 | No live CRM wiring shipped in P1 | ✅ |
| 2 | No API invocation by P1 code | ✅ |
| 3 | No data mutation | ✅ |
| 4 | No backend changes | ✅ |
| 5 | `/app/memory/final/` untouched | ✅ |
| 6 | Earlier BUG-108 docs untouched | ✅ |
| 7 | Build PASS | ✅ |
| 8 | Lint clean | ✅ |
| 9 | Owner-locked copy strings used verbatim | ✅ |
| 10 | BUG-099 / BUG-104 territories untouched | ✅ |

---

## 9. Next Step After Smoke PASS

1. Owner replies with PASS confirmation.
2. CR Master Planning status updates to `bug_108_p1_ui_shell_owner_confirmed`.
3. P2 kicks off when CRM endpoints (B1 ETA ~2h) are verified live — will flip flags individually as each goes live, with no further UI structural changes needed.
4. Separate Wallet CR and Coupon redemption CR start when scoped (Q4 deferral).
5. `108-ROI` ticket created separately for per-coupon ROI report (Q6 note).

---

---

## CONTINUATION PASS ADDENDUM — 2026-05-23

### A1. Test Scope

BUG-108 P1 UI shell only. No live CRM wiring, no API invocation, no data mutation. Verification of disabled/read-only states for Coupon, Loyalty, and Wallet sections, Q10 mutual exclusivity gating, payload safety, and standard ↔ room-service mirror parity.

### A2. Test Route / Access

Use current frontend preview URL:
`https://insights-phase.preview.emergentagent.com`

Or the Emergent agent URL configured in `/app/frontend/.env` as `REACT_APP_BACKEND_URL`.

Login credentials from `/app/memory/test_credentials.md` or:
```
Email:    owner@palmhouse.com
Password: Qplazm@10
```

### A3. Expanded QA Checklist (38 Rows)

#### General (G1-G4)

| # | Category | Check | Expected Result | data-testid (if applicable) |
|---|----------|-------|-----------------|----------------------------|
| G1 | General | App loads without crash | Login page renders | — |
| G2 | General | Build passed | `CI=false yarn build` exits 0 with only pre-existing OrderEntry.jsx warning | — |
| G3 | General | No console-breaking errors on Collect Bill | No red errors in browser console related to BUG-108 sections | — |
| G4 | General | No new toast notifications from BUG-108 | Zero toasts triggered by coupon/loyalty/wallet section interactions | — |

#### Coupon (C1-C10)

| # | Category | Check | Expected Result | data-testid |
|---|----------|-------|-----------------|-------------|
| C1 | Coupon | FLAT50 not selectable | No dropdown/list contains "FLAT50" | — |
| C2 | Coupon | SAVE10 not selectable | No dropdown/list contains "SAVE10" | — |
| C3 | Coupon | Coupon section visible when `customer && isCoupon` | Section renders in Collect Bill | `coupon-section` |
| C4 | Coupon | Coupon input disabled | Cannot type in coupon code field | `coupon-input` |
| C5 | Coupon | Apply button disabled | Button has `cursor-not-allowed`, reduced opacity | `apply-coupon-btn` |
| C6 | Coupon | "Coming soon" helper visible | Gray italic text below coupon section | `coupon-helper-text` |
| C7 | Coupon | Coupon cannot affect bill total | Grand total unchanged when coupon section is interacted with | — |
| C8 | Coupon | Coupon fields zero in PLACE_ORDER payload | `coupon_discount: 0`, `coupon_title: ""`, `coupon_type: ""` | — |
| C9 | Coupon | Coupon fields zero in BILL_PAYMENT payload | Same zero values in bill-payment request body | — |
| C10 | Coupon | Coupon code empty in print payload | `coupon_code: ""` in print request | — |

#### Q10 Mutual Exclusivity (Q1-Q4)

| # | Category | Check | Expected Result | data-testid |
|---|----------|-------|-----------------|-------------|
| Q1 | Q10 | Manual discount > 0 → coupon section disabled | When 10% manual discount applied, coupon section stays disabled | — |
| Q2 | Q10 | Helper text when manual active (P1: "Coming soon" wins) | "Coming soon" shown since `couponLive=false` takes precedence over Q10 helper | `coupon-helper-text` |
| Q3 | Q10 | Clear manual discount → coupon still disabled (P1) | Coupon remains disabled with "Coming soon" regardless of manual discount state | — |
| Q4 | Q10 | No auto-clear/auto-fill on either side | Removing manual discount does not auto-apply coupon; removing coupon does not auto-set manual discount | — |

#### Loyalty (L1-L6)

| # | Category | Check | Expected Result | data-testid |
|---|----------|-------|-----------------|-------------|
| L1 | Loyalty | Section visible when `customer && isLoyalty` | Loyalty section renders | `loyalty-section` |
| L2 | Loyalty | Points/tier display if data exists | Customer loyalty points shown read-only (`{N} pts`) | — |
| L3 | Loyalty | "Use Loyalty" checkbox disabled | Cannot tick checkbox | `use-loyalty-checkbox` |
| L4 | Loyalty | Helper text "Loyalty program unavailable" | Gray italic text shown | `loyalty-helper-text` |
| L5 | Loyalty | No 1:1 hardcoded redemption behavior | No loyalty discount applied to bill total | — |
| L6 | Loyalty | Loyalty fields zero in payload | `used_loyalty_point: 0`, `loyalty_dicount_amount: 0` | — |

#### Wallet (W1-W6)

| # | Category | Check | Expected Result | data-testid |
|---|----------|-------|-----------------|-------------|
| W1 | Wallet | Section visible when `customer && isCustomerWallet` | Wallet section renders | `wallet-section` |
| W2 | Wallet | Wallet balance displayed read-only | Balance shown if available | — |
| W3 | Wallet | "Use Wallet" checkbox disabled | Cannot tick checkbox | `use-wallet-checkbox` |
| W4 | Wallet | Amount input NOT rendered | No text input for wallet amount visible | — |
| W5 | Wallet | Helper text shown | "Wallet payments will be available after the next update." | `wallet-helper-text` |
| W6 | Wallet | Wallet fields zero in payload | `use_wallet_balance: 0`, `wallet_used_amount: 0` | — |

#### CRM Unavailable (B1-B2)

| # | Category | Check | Expected Result | data-testid |
|---|----------|-------|-----------------|-------------|
| B1 | CRM Banner | Per-section disabled state serves as CRM-unavailable signal | All 3 sections show disabled/helper text — no separate banner in P1 | — |
| B2 | CRM Banner | Collect Bill not blocked | Can proceed to payment without coupon/loyalty/wallet | — |

#### Room-Service Inline Mirror (R1-R4)

| # | Category | Check | Expected Result | data-testid |
|---|----------|-------|-----------------|-------------|
| R1 | Mirror | Coupon section disabled in room-service view | Same disabled state + "Coming soon" as standard view | — |
| R2 | Mirror | Loyalty section read-only in room-service view | Same disabled checkbox + helper as standard view | — |
| R3 | Mirror | Wallet section read-only in room-service view | Same disabled checkbox + hidden input + helper as standard view | — |
| R4 | Mirror | Q10 gating mirrored | Same manual/coupon mutual exclusivity logic in inline mirror | — |

#### Regression (X1-X8)

| # | Category | Check | Expected Result | data-testid |
|---|----------|-------|-----------------|-------------|
| X1 | Regression | Collect Bill proceeds without coupon/loyalty/wallet | Payment completes successfully | — |
| X2 | Regression | Manual discount works when coupon absent | 10% discount correctly reduces subtotal; SC/GST recompute | — |
| X3 | Regression | Tax calculation unchanged | GST/VAT computes correctly on discounted subtotal | — |
| X4 | Regression | Service charge unchanged | SC computes correctly | — |
| X5 | Regression | Delivery charge unchanged | Delivery charge unaffected | — |
| X6 | Regression | Payment method flow unchanged | Cash/Card/UPI/Split/Hold all work | — |
| X7 | Regression | Room billing unchanged | Room charges compute correctly | — |
| X8 | Regression | No backend/API mutation | No new API calls; existing flows unchanged | — |

**Total: 38 rows** (G:4 + C:10 + Q:4 + L:6 + W:6 + B:2 + R:4 + X:8)

### A4. P2 / Deferred Items

| Item | Owner | Status |
|------|-------|--------|
| Live coupon available API (`GET /pos/coupons/available`) | CRM team (B1) | Pending |
| Live coupon validate API (`POST /pos/coupons/validate`) | CRM team (B2=A) | Pending |
| Loyalty tier→ratio source | CRM team (B3) | Pending |
| Wallet debit lifecycle | Separate Wallet CR | Deferred |
| Coupon redemption / mark-used | Separate Coupon CR | Deferred |
| Rollback/reversal for coupon/loyalty/wallet | Future CR | Deferred |
| Per-coupon ROI report | Ticket `108-ROI` | Out of scope |

### A5. Pass/Fail Recording Template (Extended)

```
=== BUG-108 P1 QA RESULTS ===
Date: ___
Tester: ___

GENERAL
G1: PASS / FAIL (note: ___)
G2: PASS / FAIL (note: ___)
G3: PASS / FAIL (note: ___)
G4: PASS / FAIL (note: ___)

COUPON
C1: PASS / FAIL (note: ___)
C2: PASS / FAIL (note: ___)
C3: PASS / FAIL (note: ___)
C4: PASS / FAIL (note: ___)
C5: PASS / FAIL (note: ___)
C6: PASS / FAIL (note: ___)
C7: PASS / FAIL (note: ___)
C8: PASS / FAIL (note: ___)
C9: PASS / FAIL (note: ___)
C10: PASS / FAIL (note: ___)

Q10 MUTUAL EXCLUSIVITY
Q1: PASS / FAIL (note: ___)
Q2: PASS / FAIL (note: ___)
Q3: PASS / FAIL (note: ___)
Q4: PASS / FAIL (note: ___)

LOYALTY
L1: PASS / FAIL (note: ___)
L2: PASS / FAIL (note: ___)
L3: PASS / FAIL (note: ___)
L4: PASS / FAIL (note: ___)
L5: PASS / FAIL (note: ___)
L6: PASS / FAIL (note: ___)

WALLET
W1: PASS / FAIL (note: ___)
W2: PASS / FAIL (note: ___)
W3: PASS / FAIL (note: ___)
W4: PASS / FAIL (note: ___)
W5: PASS / FAIL (note: ___)
W6: PASS / FAIL (note: ___)

CRM UNAVAILABLE
B1: PASS / FAIL (note: ___)
B2: PASS / FAIL (note: ___)

ROOM-SERVICE MIRROR
R1: PASS / FAIL (note: ___)
R2: PASS / FAIL (note: ___)
R3: PASS / FAIL (note: ___)
R4: PASS / FAIL (note: ___)

REGRESSION
X1: PASS / FAIL (note: ___)
X2: PASS / FAIL (note: ___)
X3: PASS / FAIL (note: ___)
X4: PASS / FAIL (note: ___)
X5: PASS / FAIL (note: ___)
X6: PASS / FAIL (note: ___)
X7: PASS / FAIL (note: ___)
X8: PASS / FAIL (note: ___)

OVERALL: PASS / FAIL
Signature: ___
```

### A6. Final Gate

```
WAITING_OWNER_BUG_108_P1_SMOKE_APPROVAL
```

Owner smoke test required using the 10-step procedure in §3 above + expanded 38-row checklist in §A3. After smoke PASS, status advances to `bug_108_p1_ui_shell_owner_confirmed`.

---

**End of BUG-108 P1 UI Shell QA Handoff (with Continuation Pass addendum).**
