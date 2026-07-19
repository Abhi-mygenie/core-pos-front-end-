# POS 3.0 BUG-108 — Loyalty Phase C POS Max-Redeemable QA Handoff

**Date:** 2026-05-24
**From:** POS Phase C Implementation Agent
**To:** Joint QA Agent / Owner Smoke
**Implementation report:** `POS3_0_BUG_108_LOYALTY_PHASE_C_POS_MAX_REDEEMABLE_IMPLEMENTATION_REPORT_2026_05_24.md`

---

## 1. QA Test Matrix

| # | Scenario | Expected | Restaurant |
|---|----------|----------|-----------|
| 1 | Gold customer (4588 pts), bill ₹349 | Loyalty card: "Gold (4588 pts) ₹349 discount". Bill Summary: "Loyalty Points (349 pts) -₹349". Payload: `used_loyalty_point=349, loyalty_dicount_amount=349` | 689 |
| 2 | Gold customer, bill ₹1000 | ₹664 discount (restaurant cap). Payload: `used=664, amount=664` | 689 |
| 3 | Gold customer, bill ₹5000 | Same ₹664 cap | 689 |
| 4 | Zero-points customer | BELOW_MIN_REDEMPTION: "Earn 100 more", checkbox disabled | 689 |
| 5 | Nonexistent customer_id | Loyalty section hidden (CUSTOMER_NOT_FOUND) | 689 |
| 6 | No customer selected | No loyalty section shown, no API call | any |
| 7 | Checkbox unchecked by cashier | Bill total reverts (no loyalty discount), payload: `used_loyalty_point=0` | 689 |
| 8 | Item added/removed (bill changes) | max-redeemable re-called (debounced), discount updates | 689 |
| 9 | Manual discount changed | max-redeemable re-called, discount adjusts | 689 |
| 10 | Phase B regression: customer data shows | Customer name, phone, tier visible in cart | any |
| 11 | Payload: `used_loyalty_point` sends CRM value | Verify in console.log/network tab | 689 |
| 12 | Payload: `loyalty_redemption_id` = null | Always null from POS Frontend | any |
| 13 | "No points" text eliminated | NEVER shown when `available_points > 0` | 689 |
| 14 | Coupon unchanged | Still "Coming soon", `couponLive=false` | any |
| 15 | Wallet unchanged | Still disabled, `walletDebitLive=false` | any |
| 16 | Manual discount + loyalty additive | Both apply, tax on post-both subtotal | 689 |

---

## 2. Error Code Verification

| Error code | How to trigger | Expected |
|-----------|---------------|----------|
| BELOW_MIN_REDEMPTION | Use 0-pt customer in restaurant 689 | "Earn 100 more", disabled checkbox |
| CUSTOMER_NOT_FOUND | Use invalid customer_id | Section hidden |
| INVALID_REQUEST | (edge case — no customer) | Section hidden |
| LOYALTY_DISABLED | Toggle loyalty off for restaurant | Section hidden |
| SETTINGS_MISSING | Remove loyalty_settings | Section hidden |
| Network error | Disconnect network | "Unable to calculate", disabled |

---

## 3. Test Credentials

| Field | Value |
|-------|-------|
| Login | `owner@kunafamahal.com` / `Qplazm@10` |
| Restaurant ID | 689 |
| Customer | abhishek jain |
| Customer ID | `5ebde664-c7b7-46b7-85ab-f5c5319161b9` |
| Phone | `7505242126` |
| Tier | Gold |
| Points | 4588 |
| Restaurant cap | ₹664 |
| Min redemption | 100 pts |

---

## 4. What Was NOT Changed (Regression Safety)

- Coupon section / flag / payload
- Wallet section / flag / payload
- Manual discount calculation
- Preset discount calculation
- Tax engine (GST/VAT/SC)
- Delivery charge / tip
- Place Order / Prepaid / Update Order payloads (all hardcoded `0`)
- Backend code
- `/app/memory/final/`
- Baseline docs

---

## 5. Owner Smoke Checklist

| # | Step | Expected |
|---|------|----------|
| 1 | Login as kunafamahal → select abhishek jain → open Collect Bill | Loyalty card: "Gold (4588 pts)" + CRM-calculated discount |
| 2 | Add item ₹349 | "₹349 discount" shown, auto-checked |
| 3 | Add more items to ₹1000+ | Discount caps at ₹664 |
| 4 | Uncheck loyalty checkbox | Discount removed from bill total |
| 5 | Re-check loyalty checkbox | Discount re-applied |
| 6 | Select customer with 0 points | "Earn 100 more points", disabled |
| 7 | No "No points" text visible anywhere | Confirmed eliminated |

---

**End of QA Handoff.**
