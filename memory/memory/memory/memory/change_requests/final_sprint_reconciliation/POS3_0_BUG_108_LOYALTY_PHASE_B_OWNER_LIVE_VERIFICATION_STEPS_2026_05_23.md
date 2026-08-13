# POS 3.0 BUG-108 — Loyalty Phase B Owner Live Verification Steps

**Date:** 2026-05-23
**Pairs with:** Implementation Report + QA Handoff + Agent Smoke Report (2026-05-23)

---

## 1. Status

```
bug_108_loyalty_phase_b_owner_live_steps_ready
```

Current sprint gate: `WAITING_OWNER_BUG_108_LOYALTY_PHASE_B_SMOKE_APPROVAL`
Target gate after owner PASS: `bug_108_loyalty_phase_b_owner_smoke_passed`

---

## 2. Source Docs Read

1. `POS3_0_BUG_108_LOYALTY_PHASE_B_CR_PLAYBOOK_HANDOFF_2026_05_23.md`
2. `POS3_0_BUG_108_LOYALTY_PHASE_B_IMPLEMENTATION_REPORT_2026_05_23.md`
3. `POS3_0_BUG_108_LOYALTY_PHASE_B_QA_HANDOFF_2026_05_23.md`
4. `POS3_0_BUG_108_LOYALTY_PHASE_B_AGENT_SMOKE_REPORT_2026_05_23.md`
5. `POS3_0_BUG_108_P1_UI_SHELL_IMPLEMENTATION_REPORT_2026_05_22.md`
6. `POS3_0_BUG_108_P1_UI_SHELL_QA_HANDOFF_2026_05_22.md`

No additional code inspection was required — implementation docs were sufficient.

---

## 3. What Was Actually Implemented

### Files changed (4 files; `orderTransform.js` deliberately NOT touched)

| File | Change |
|------|--------|
| `src/utils/BUG108_FLAGS.js` | Added `loyaltyPreviewLive: true` + `loyaltyPreviewHelper` copy |
| `src/api/transforms/customerTransform.js` | `customerLookup` builds synthetic loyalty blob; `customerDetail` extracts `loyaltyEnabled` |
| `src/components/order-entry/CartPanel.jsx` | `selectCustomer()` now forwards `tier`, `totalPoints`, `pointsValue`, `walletBalance`, `loyalty` |
| `src/components/order-entry/CollectPaymentPanel.jsx` | Standard loyalty section + room-service inline mirror show real CRM data (tier badge, points, "₹X available"), checkbox stays disabled |

### Flags (current values)

| Flag | Value | Purpose |
|------|------|---------|
| `loyaltyPreviewLive` | `true` | Show real CRM loyalty data in UI |
| `loyaltyRatioLive` | `false` | Keeps discount math at 0 and payload force-zeroed |
| `couponLive` | `false` | Coupon remains "coming soon"/disabled |
| `walletDebitLive` | `false` | Wallet remains read-only/disabled |

### Loyalty fields used (display only)

`loyalty.tier`, `loyalty.total_points`, `loyalty.points_value`, `loyalty.loyalty_enabled`.
`ratio_per_point` stored in blob but not displayed in Phase B.

### Preview math (UI only, never sent)

```
displayValue   = customer.loyalty.points_value || customer.pointsValue || 0
previewAmount  = min(displayValue, itemTotal - manualDiscount - presetDiscount)
Render         : "₹{previewAmount} available"
```

Preview is **display-only** — it does NOT enter `totalDiscount`, `subtotalAfterDiscount`, tax, or any payload field.

### Disabled behavior

- Checkbox/action: disabled (`!loyaltyRatioLive || !displayPoints`) — always disabled in Phase B
- Helper (data present): "Redemption will be enabled in a future update."
- Helper (no data / `loyalty_enabled=false` / no loyalty blob): "Loyalty program unavailable"
- Opacity: 0.85 when data present, 0.7 when unavailable

### Payload safety

| Field | Value | Guard |
|-------|-------|-------|
| `used_loyalty_point` | `0` | `loyaltyRatioLive=false` force-zero in `orderTransform.js:1356` + hardcoded 0 at lines 908/1026/1153 |
| `loyalty_dicount_amount` | `0` | `loyaltyRatioLive=false` force-zero in `orderTransform.js:1768` |
| Loyalty redemption API | not called | No `loyalty/redeem` or `loyalty/reverse` endpoint wired |

---

## 4. Owner Live Verification Preconditions

| Item | Value |
|------|-------|
| Preview URL | `https://insights-phase.preview.emergentagent.com/` (from `REACT_APP_BACKEND_URL`) |
| Login (per QA Handoff) | Email: `owner@palmhouse.com` · Password: `Qplazm@10` (fallback in `/app/memory/test_credentials.md` if available) |
| Customer A | At least one CRM customer with **loyalty points > 0** (so tier/points/₹ available render) |
| Customer B | One customer with **no loyalty data**, **`loyalty_enabled=false`**, or **zero points** (for fallback test) |
| Restaurant settings | `isLoyalty` must be `true` for that restaurant — otherwise the section is hidden by design |
| Browser DevTools | Open Network + Console tabs to observe payload safety and absence of redemption calls |
| Redemption attempts | DO NOT attempt — checkbox is disabled by design |

---

## 5. Step-by-Step Live Verification Checklist

### A. Standard Collect Bill — Customer with loyalty data

1. Login → open Order Entry.
2. In the cart's customer field, search and **select Customer A** from the CRM dropdown.
3. Add at least one menu item so the cart has a non-zero subtotal.
4. Click **Collect Bill**.
5. Locate the **Loyalty** section in the Collect Payment panel.
6. Verify the tier badge renders (e.g., "Gold" / "Silver" / "Bronze") next to the loyalty label.
7. Verify points are shown as `({N} pts)` matching the CRM value.
8. Verify the right-side green text shows `₹{X} available`.
9. Confirm the **loyalty checkbox/action is disabled** (cursor-not-allowed, no tick possible).
10. Confirm helper copy reads: **"Redemption will be enabled in a future update."**
11. Note the current **Grand Total, Tax, Payable**.
12. Mentally compare against a quick subtotal/tax check — loyalty preview must NOT have reduced any of them.

### B. Cap Logic — `min(points_value, subtotal_after_discount)`

1. With Customer A selected and a single low-priced item (subtotal **below** `points_value`):
   - Expected: `₹ available` equals the **subtotal after manual/preset discount**, not the full points value.
2. Add items so subtotal is **above** `points_value`:
   - Expected: `₹ available` equals the **full `points_value`** from CRM.
3. Apply a manual discount that drops subtotal below `points_value`:
   - Expected: `₹ available` immediately recalculates to the new (lower) capped amount.

### C. Loyalty Disabled / Missing Loyalty

1. Select **Customer B** (no loyalty data, `loyalty_enabled=false`, or zero points).
2. Open Collect Bill again.
3. Expected outcomes (any one applies depending on customer state):
   - Section shows **"Loyalty program unavailable"** (no data / `loyalty_enabled=false` / null blob).
   - OR right-side text shows **"No points"** (customer found but zero points).
4. App must NOT crash, no red console errors related to loyalty.
5. Switch back to Customer A — loyalty preview should re-render correctly.

### D. Coupon / Wallet Regression

1. In the same Collect Bill panel, locate the **Coupon** section.
   - Expected: still **disabled / "Coming soon"** (unchanged from P1).
   - No coupon code can be applied to alter the bill.
2. Locate the **Wallet** section.
   - Expected: still **read-only / disabled** with the existing helper text.
   - No wallet debit can be triggered.

### E. Manual Discount Regression

1. Apply a **10% manual discount** (or any flat discount).
2. Verify subtotal/total/tax recalculate exactly as before BUG-108 Phase B.
3. Verify the **loyalty `₹ available`** updates to reflect the new (lower) cap (see §B step 3).
4. Verify the loyalty section remains **display-only** — the manual discount is the only thing actually reducing the bill.
5. If coupon-after-manual-discount rule is in place from prior CRs: coupon should remain disabled when manual discount > 0 (no regression).

### F. Room-Service Inline Mirror

1. From the table grid, switch to a **room-service order** (or open one if available).
2. Open its inline Collect Payment mirror.
3. Repeat A.6 – A.10 (tier, points, ₹ available, disabled checkbox, helper copy).
4. Visual + textual output must be **identical** to the standard view.
5. If your test restaurant has no room-service flow configured, mark this section **DEFERRED**.

### G. Optional Normal Bill Submit (owner's choice)

1. Optional — only if you want to confirm the full payment flow still settles cleanly.
2. With Customer A selected, leave the loyalty checkbox alone (it is disabled anyway), do NOT apply coupon or wallet.
3. Pay using Cash/Card/UPI and complete the bill.
4. (Optional) Open DevTools → Network → inspect the place-order / bill-payment request payload:
   - `used_loyalty_point` must be `0`
   - `loyalty_dicount_amount` must be `0`
   - `coupon_discount` must be `0`
5. If you don't wish to mutate a real bill, mark this section **DEFERRED**.

---

## 6. PASS/FAIL Recording Template (copy-paste)

```
=== BUG-108 LOYALTY PHASE B — OWNER LIVE VERIFICATION RESULTS ===
Date          : ___
Tester (owner): ___
Restaurant    : ___
Customer A    : ___ (loyalty points > 0)
Customer B    : ___ (no/disabled loyalty)

Row                                              Result   Note
------------------------------------------------ -------- ----------------------------
1. Standard loyalty preview renders               P / F   ___
2. Tier display correct                           P / F   ___
3. Points display correct                         P / F   ___
4. "₹X available" displayed in green              P / F   ___
5. Disabled checkbox/action                       P / F   ___
6. Grand total unchanged by preview               P / F   ___
7. Tax unchanged by preview                       P / F   ___
8. Cap logic — min(points_value, subtotal)        P / F   ___
9. Disabled / missing loyalty fallback shown      P / F   ___
10. Coupon section still disabled                 P / F   ___
11. Wallet section still disabled                 P / F   ___
12. Manual discount still works                   P / F   ___
13. Room-service inline mirror parity             P / F / DEFERRED   ___
14. Optional normal bill submit                   P / F / DEFERRED   ___

Defects found  : ___
Final verdict  : APPROVED  /  APPROVED WITH ROOM-SERVICE DEFERRED  /  NEEDS FIX
```

---

## 7. Pass Criteria

Owner can mark **APPROVED** when ALL of the following hold:

- App does not crash and console shows no new red loyalty-related errors.
- Loyalty preview renders correctly for Customer A (tier + points + ₹ available).
- Loyalty checkbox/action stays **disabled**; redemption cannot be triggered.
- Grand total, tax, and payable remain identical with or without the loyalty preview visible.
- Cap logic shows `min(points_value, subtotal_after_discount)`.
- Customer B path shows graceful fallback copy without crashing.
- Coupon section still disabled ("coming soon").
- Wallet section still disabled / read-only.
- Manual discount still works as before.

Room-service mirror and optional normal bill submit may be marked DEFERRED without blocking approval.

---

## 8. Fail Criteria

Owner should mark **NEEDS FIX** if ANY of the following are seen:

- Loyalty preview reduces grand total, tax, or payable.
- Loyalty checkbox/action becomes enabled or tickable.
- A loyalty redemption / reverse API call fires (visible in DevTools → Network).
- Customer with valid loyalty data shows nothing (blank tier/points/₹ section despite having data).
- App crashes or shows red console errors on customer select or Collect Bill open.
- Coupon section becomes active unexpectedly (any coupon applies to the bill).
- Wallet section becomes active unexpectedly (any wallet debit reflects in totals).
- Place-order or bill-payment payload contains a non-zero `used_loyalty_point` or `loyalty_dicount_amount`.

---

## 9. Final Owner Verdict Options

| Verdict | Meaning |
|---------|---------|
| `APPROVED` | All in-scope checks PASS, including room-service mirror and optional submit (or both fully exercised). |
| `APPROVED WITH ROOM-SERVICE DEFERRED` | A1–E PASS; F (room-service) and/or G (normal bill submit) deferred for environment reasons. No defects. |
| `NEEDS FIX` | One or more fail-criteria triggered. Detail in the defects row of §6 template. |

After owner records the verdict, sprint status advances to:
- PASS → `bug_108_loyalty_phase_b_owner_smoke_passed`
- FAIL → stays at `WAITING_OWNER_BUG_108_LOYALTY_PHASE_B_SMOKE_APPROVAL` with defect log

---

## 10. Confirmations

| # | Confirmation | Status |
|---|--------------|--------|
| 1 | No code changed by this agent | Confirmed |
| 2 | No backend changed | Confirmed |
| 3 | No data mutated | Confirmed |
| 4 | `/app/memory/final/` untouched | Confirmed |
| 5 | Baseline docs untouched | Confirmed |
| 6 | No redemption / reverse API invoked | Confirmed |
| 7 | Agent smoke report untouched | Confirmed |

---

**End of BUG-108 Loyalty Phase B Owner Live Verification Steps.**
