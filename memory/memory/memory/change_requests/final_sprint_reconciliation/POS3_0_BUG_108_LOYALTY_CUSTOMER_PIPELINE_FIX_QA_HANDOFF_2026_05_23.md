# POS 3.0 BUG-108 — Loyalty Customer Pipeline Fix QA Handoff

**Date:** 2026-05-23
**Pairs with:** `POS3_0_BUG_108_LOYALTY_CUSTOMER_PIPELINE_FIX_IMPLEMENTATION_REPORT_2026_05_23.md`
**Status:** `bug_108_loyalty_customer_pipeline_fix_waiting_agent_resmoke`

---

## 1. QA Status

```
bug_108_loyalty_customer_pipeline_fix_waiting_agent_resmoke
```

After agent re-smoke PASS, advance to:
```
bug_108_loyalty_customer_pipeline_fix_agent_resmoke_passed_waiting_owner_resmoke
```

After owner re-smoke PASS, advance to:
```
bug_108_loyalty_phase_b_owner_smoke_passed
```

---

## 2. Scope

Customer enrichment pipeline defect only — covering paths P1 (typeahead select), P2 (savedCart restore), P3 (orderData restore), P4 (manual blur clobber), P6 (CustomerModal save), P8 (room-service inline mirror inheritance).

**Hard out-of-scope:**
- Loyalty redemption / reverse
- Coupon / wallet behavior
- Bill total, tax, payable, service charge, delivery charge
- Payment / settlement / print / socket
- Backend
- Dead-code cleanup (parked as P3 per Q1=A)

---

## 3. Test Access

- Preview URL: from `/app/frontend/.env` `REACT_APP_BACKEND_URL`
- Owner login (per QA handoff Phase B): `owner@palmhouse.com` / `Qplazm@10` — owner may swap to `owner@jehsnest.com` for the live Sapna scenario.
- DevTools required for payload safety inspection (Network tab).

---

## 4. QA Checklist (28 rows)

### Build & Lint (1–3)

| # | Check | Expected |
|---|-------|----------|
| 1 | `CI=false yarn build` | Exit 0, 0 errors, 1 pre-existing `OrderEntry.jsx` warning |
| 2 | All 4 modified files lint-clean | ESLint PASS |
| 3 | Bundle size delta | +~10 kB gzip on `main.js` — acceptable |

### Sapna (9004020412, 86 pts) — the originally reported defect (4–8)

| # | Check | Expected |
|---|-------|----------|
| 4 | Open Sapna's active order/table re-engage (Path P2/P3) | Loyalty section populates within ~400 ms with `Bronze` badge, `86 pts`, `₹X available`, helper `"Redemption will be enabled in a future update."` |
| 5 | Fresh order, search "9004", click Sapna in typeahead (Path P1) | Loyalty section populates immediately with same display as #4 |
| 6 | After #5, click the menu / Place Order / anywhere else (triggers P4 blur) | Loyalty section **remains** populated — does NOT regress to "Loyalty program unavailable" |
| 7 | Fresh order, type "Sapna" + "9004020412" manually and Tab/click away WITHOUT picking suggestion | Order opens; OrderEntry restore enrichment does not fire here (CartPanel only); loyalty section shows "Loyalty program unavailable" — acceptable, matches Q3=A scope |
| 8 | Open Add Customer modal → enter phone `9004020412` → Save (Path P6) | Loyalty section populated immediately on Collect Bill — `existing` loyalty fields propagated through `onSave` |

### Fresh typeahead enrichment (9–11)

| # | Check | Expected |
|---|-------|----------|
| 9 | Pick any other CRM customer with points > 0 via typeahead | Tier badge + points + `₹X available` render |
| 10 | After #9, edit the phone number by one digit and blur | Loyalty section appropriately re-derives or clears (merge preserves shape; new mismatching phone = no loyalty match if lookup fails) |
| 11 | Pick a customer, then clear the name field | `onCustomerChange(null)` fires (P5) → loyalty section hides correctly |

### Loyalty data display (12–15)

| # | Check | Expected | data-testid |
|---|-------|----------|-------------|
| 12 | Tier badge | `Bronze` / `Silver` / `Gold` from CRM | (within `loyalty-section`) |
| 13 | Points count | `({N} pts)` from CRM | (within `loyalty-section`) |
| 14 | Preview value | `₹{X} available` in green, capped at `min(points_value, itemTotal - manualDiscount - presetDiscount)` | `loyalty-preview-value` |
| 15 | Helper copy | "Redemption will be enabled in a future update." (data present) / "Loyalty program unavailable" (no data / disabled) | `loyalty-helper-text` |

### Fallback paths (16–18)

| # | Check | Expected |
|---|-------|----------|
| 16 | Customer with no CRM record / brand-new customer | "Loyalty program unavailable" (graceful fallback, no crash) |
| 17 | Customer where `loyalty.loyalty_enabled === false` | "Loyalty program unavailable" |
| 18 | Customer with zero points | "No points" on right-side label |

### Subtotal cap (19–20)

| # | Check | Expected |
|---|-------|----------|
| 19 | Add items so subtotal > `points_value` | `₹ available` shows full `points_value` |
| 20 | Apply 50% manual discount so subtotal < `points_value` | `₹ available` recalculates to capped amount |

### Payload safety (21–24)

| # | Check | Expected |
|---|-------|----------|
| 21 | Place Order → DevTools → place-order payload | `used_loyalty_point: 0` |
| 22 | Settle / Pay → bill-payment payload | `used_loyalty_point: 0`, `use_wallet_balance: 0` |
| 23 | Print bill → print payload | `loyalty_dicount_amount: 0` |
| 24 | Loyalty checkbox state | Disabled — `cursor-not-allowed`, cannot tick (loyaltyRatioLive remains false) |

### Regression — coupon / wallet / manual discount / totals (25–28)

| # | Check | Expected |
|---|-------|----------|
| 25 | Coupon section | Still disabled ("Coming soon") |
| 26 | Wallet section | Still disabled / read-only |
| 27 | Manual discount (10%, flat ₹X) | Bill total reduces correctly; loyalty `₹ available` updates accordingly |
| 28 | Grand total + tax with vs. without loyalty section populated | Identical — loyalty preview never affects total / tax / payable |

### Room-service inline mirror (bonus, deferrable)

| # | Check | Expected |
|---|-------|----------|
| 29 | Open a room-service order → inline Collect Payment block | Loyalty section matches standard view 1:1 (inherits enriched `customer` state) |
| 30 | All payload safety checks (21–24) repeated in room-service flow | Identical zeros |

---

## 5. Agent Re-Smoke Steps

1. Run `cd /app/frontend && CI=false yarn build` — confirm 0 errors and only the pre-existing `OrderEntry.jsx` `printOrder` warning.
2. Code-level verify each modified file:
   - `customerTransform.js`: confirm `buildSyntheticLoyalty` exists; both `searchResult` and `customerLookup` call it; `searchResult` now returns `pointsValue` + `loyalty`.
   - `CartPanel.jsx`: confirm `handleFieldBlur` spreads `customer` first, then overlays `{ id, name, phone }`.
   - `OrderEntry.jsx`: confirm `lookupCustomer` is imported and `enrichCustomerLoyaltyFromCRM` is called in both restore branches (savedCart + orderData).
   - `CustomerModal.jsx`: confirm `crmLoyaltyFields` capture in both `existing CRM customer` (initialData) and `lookup matched existing` branches; confirm spread into `customerData` before `onSave`.
3. Grep verify no edits to `orderTransform.js`, `CollectPaymentPanel.jsx`, `BUG108_FLAGS.js`, backend files.
4. Confirm `BUG108_FLAGS`: `loyaltyPreviewLive=true`, `loyaltyRatioLive=false`, `couponLive=false`, `walletDebitLive=false` — unchanged.
5. Write agent re-smoke report at:
   `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_108_LOYALTY_CUSTOMER_PIPELINE_FIX_AGENT_RESMOKE_REPORT_2026_05_23.md`
6. Set status: `bug_108_loyalty_customer_pipeline_fix_agent_resmoke_passed_waiting_owner_resmoke` (or `_failed_needs_fix`).

---

## 6. Owner Re-Smoke Steps

Owner returns to the original failing scenario:

1. **Login → restaurant `jehsnest`.**
2. **Step A — original defect:** Re-engage the table with Sapna's pending order. **Expected:** within ~400 ms, the Collect Bill loyalty section shows `Bronze` + `86 pts` + `₹X available` (matches the CRM customer list screenshot from the defect report).
3. **Step B — typeahead path:** Cancel/start fresh. Type "9004" in phone, pick Sapna in dropdown. **Expected:** loyalty section populates immediately.
4. **Step C — blur clobber test:** In #3, click on the menu / an item / Place Order button. **Expected:** loyalty section **does NOT** regress to "Loyalty program unavailable".
5. **Step D — modal path:** Open Add Customer modal, type Sapna's phone, Save. **Expected:** loyalty section is populated on Collect Bill.
6. **Step E — fallback paths:** pick a customer with no points → "No points"; pick anonymous → loyalty section hidden / unavailable.
7. **Step F — payload safety (optional, DevTools):** Place Order / Pay → verify Network tab shows `used_loyalty_point: 0` and `loyalty_dicount_amount: 0`.
8. **Step G — regression:** Apply manual discount, coupon section still "Coming soon", wallet still read-only, totals/tax unchanged.

Owner records verdict in the standard PASS/FAIL template (from §6 of the Phase B Owner Live Verification Steps doc).

---

## 7. Pass / Fail Template (owner copy-paste)

```
=== BUG-108 LOYALTY CUSTOMER PIPELINE FIX — OWNER RE-SMOKE RESULTS ===
Date          : ___
Tester (owner): ___
Restaurant    : jehsnest

Step A — Sapna table re-engage                             : P / F  (___)
Step B — Typeahead select                                  : P / F  (___)
Step C — Blur clobber test (no regression after blur)      : P / F  (___)
Step D — CustomerModal save with existing CRM phone        : P / F  (___)
Step E — Fallback paths (no points / anonymous / disabled) : P / F  (___)
Step F — Payload safety (used_loyalty_point=0 etc)         : P / F / SKIPPED  (___)
Step G — Regression (coupon, wallet, manual discount, totals): P / F  (___)

Final verdict: APPROVED  /  APPROVED WITH ROOM-SERVICE DEFERRED  /  NEEDS FIX
```

---

## 8. Final Gate

```
WAITING_AGENT_RESMOKE_THEN_OWNER_RESMOKE
```

After agent re-smoke PASS → `WAITING_OWNER_BUG_108_LOYALTY_PHASE_B_RESMOKE_APPROVAL`
After owner re-smoke PASS → `bug_108_loyalty_phase_b_owner_smoke_passed`

---

**End of BUG-108 Loyalty Customer Pipeline Fix QA Handoff.**
