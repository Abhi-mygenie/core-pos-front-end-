# POS 3.0 BUG-108 — Loyalty Phase B QA Handoff (Owner Smoke Test)

**Date:** 2026-05-23
**Status:** `bug_108_loyalty_phase_b_waiting_owner_smoke`
**Pairs with:** `POS3_0_BUG_108_LOYALTY_PHASE_B_IMPLEMENTATION_REPORT_2026_05_23.md`

---

## 1. QA Status

```
bug_108_loyalty_phase_b_waiting_owner_smoke
```

---

## 2. Scope

BUG-108 Loyalty Phase B only — read-only + calculated preview. No real redemption, no coupon, no wallet, no payment mutation.

---

## 3. Test Route / Access

Use current frontend preview URL (from `/app/frontend/.env` `REACT_APP_BACKEND_URL`).

Login credentials from `/app/memory/test_credentials.md` or:
```
Email:    owner@palmhouse.com
Password: Qplazm@10
```

---

## 4. QA Checklist (35 Rows)

### General (G1-G4)

| # | Check | Expected | data-testid |
|---|-------|----------|-------------|
| G1 | App loads without crash | Login page renders | — |
| G2 | Build passed | 0 errors, 1 pre-existing unrelated warning | — |
| G3 | No console errors on Collect Bill | No red errors related to loyalty | — |
| G4 | No new toast from BUG-108 | Zero toasts from loyalty section | — |

### Loyalty Preview — Data Available (L1-L10)

| # | Check | Expected | data-testid |
|---|-------|----------|-------------|
| L1 | Select customer with loyalty points > 0 | Customer loads with CRM data | — |
| L2 | Open Collect Bill → loyalty section visible | Section renders with real data | `loyalty-section` |
| L3 | Tier badge displayed | Shows "Gold" / "Silver" / "Bronze" from CRM | — |
| L4 | Points count displayed | Shows "{N} pts" from CRM data | — |
| L5 | Available amount displayed in green | Shows "₹{X} available" (capped at subtotal) | `loyalty-preview-value` |
| L6 | Checkbox is DISABLED | Cannot tick — `loyaltyRatioLive=false` | `use-loyalty-checkbox` |
| L7 | Helper text shows preview message | "Redemption will be enabled in a future update." | `loyalty-helper-text` |
| L8 | Preview does NOT change bill total | Grand total same with/without loyalty section | — |
| L9 | Preview does NOT change tax | GST/VAT unchanged | — |
| L10 | Opacity is 0.85 (not fully faded) | Section looks read-only but not disabled | — |

### Loyalty — No Data / Disabled (D1-D5)

| # | Check | Expected | data-testid |
|---|-------|----------|-------------|
| D1 | Customer with no loyalty data / anonymous | Loyalty section hidden (no customer) | — |
| D2 | Customer with `loyalty_enabled=false` | Shows "Loyalty program unavailable" | `loyalty-helper-text` |
| D3 | Customer with zero points | Shows "No points" on right side | `loyalty-preview-value` |
| D4 | `restaurantSettings.isLoyalty=false` | Loyalty section hidden entirely | — |
| D5 | Missing loyalty blob (null) | Shows "Loyalty program unavailable" | — |

### Payload Safety (P1-P5)

| # | Check | Expected | data-testid |
|---|-------|----------|-------------|
| P1 | Place order → inspect PLACE_ORDER payload | `used_loyalty_point: 0` | — |
| P2 | Settle order → inspect BILL_PAYMENT payload | `used_loyalty_point: 0`, `use_wallet_balance: 0` | — |
| P3 | Print bill → inspect print payload | `loyalty_dicount_amount: 0` | — |
| P4 | Preview amount NOT in any payload field | No field carries the preview ₹X value | — |
| P5 | `coupon_discount: 0` still in payload | Coupon force-zero unchanged | — |

### Room-Service Mirror (R1-R4)

| # | Check | Expected | data-testid |
|---|-------|----------|-------------|
| R1 | Room-service order → loyalty section visible | Same preview display as standard view | — |
| R2 | Tier badge + points + "₹X available" shown | Matches standard view | — |
| R3 | Checkbox disabled in mirror | Same disabled state | — |
| R4 | Helper text matches standard view | Same copy text | — |

### Regression (X1-X7)

| # | Check | Expected | data-testid |
|---|-------|----------|-------------|
| X1 | Manual discount works | 10% discount correctly reduces subtotal | — |
| X2 | Coupon section still disabled | "Coming soon" unchanged | — |
| X3 | Wallet section still disabled | Helper text unchanged | — |
| X4 | Collect Bill proceeds normally | Can complete payment | — |
| X5 | Tax calculation unchanged | GST/VAT correct | — |
| X6 | Payment methods work | Cash/Card/UPI/Split unchanged | — |
| X7 | No backend mutation | No new API calls from loyalty section | — |

**Total: 35 rows** (G:4 + L:10 + D:5 + P:5 + R:4 + X:7)

---

## 5. Owner Smoke Steps

### Step 1 — Login + select customer with loyalty points
Login → Order Entry → search customer with loyalty points > 0.

### Step 2 — Open Collect Bill → check loyalty section
Add item → Collect Bill. Verify: tier badge visible, "{N} pts" shown, "₹{X} available" in green.

### Step 3 — Verify checkbox disabled
Try to tick the loyalty checkbox. Expected: cannot tick, cursor-not-allowed.

### Step 4 — Verify bill total unaffected
Compare bill total with and without customer. Loyalty preview should NOT reduce total.

### Step 5 — Apply manual discount
Apply 10% manual discount. Verify: loyalty preview updates (capped at reduced subtotal), bill math correct.

### Step 6 — Check payload (DevTools)
Place order → Network tab → find place-order request. Verify: `used_loyalty_point: 0`.

### Step 7 — Room-service mirror
Create room-service order → verify same loyalty preview display in inline mirror.

### Step 8 — Customer with no loyalty
Select a customer with 0 points or no loyalty data. Verify: "No points" or "Loyalty program unavailable".

---

## 6. Pass/Fail Template

```
=== BUG-108 LOYALTY PHASE B QA RESULTS ===
Date: ___
Tester: ___

Step 1: PASS / FAIL (note: ___)
Step 2: PASS / FAIL (note: ___)
Step 3: PASS / FAIL (note: ___)
Step 4: PASS / FAIL (note: ___)
Step 5: PASS / FAIL (note: ___)
Step 6: PASS / FAIL (note: ___)
Step 7: PASS / FAIL (note: ___)
Step 8: PASS / FAIL (note: ___)

Overall: PASS / FAIL
```

---

## 7. Final Gate

```
WAITING_OWNER_BUG_108_LOYALTY_PHASE_B_SMOKE_APPROVAL
```

After smoke PASS, status advances to `bug_108_loyalty_phase_b_owner_confirmed`.

---

**End of BUG-108 Loyalty Phase B QA Handoff.**
