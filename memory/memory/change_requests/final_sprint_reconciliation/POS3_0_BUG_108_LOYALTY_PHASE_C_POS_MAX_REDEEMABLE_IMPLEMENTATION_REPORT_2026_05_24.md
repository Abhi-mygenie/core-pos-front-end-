# POS 3.0 BUG-108 — Loyalty Phase C POS Max-Redeemable Implementation Report

**Date:** 2026-05-24
**Status:** `bug_108_loyalty_phase_c_pos_max_redeemable_implemented_waiting_joint_qa`
**Persona:** Senior POS3.0 BUG-108 Loyalty Phase C POS Implementation Agent
**Frozen plan:** `POS3_0_BUG_108_LOYALTY_PHASE_C_LR_REDEMPTION_TRIGGER_CORRECTION_PLAN_FROZEN_2026_05_24.md`

---

## 1. Final Status

```
bug_108_loyalty_phase_c_pos_max_redeemable_implemented_waiting_joint_qa
```

Build: **PASS** (`CI=false yarn build` — 21.66s, 475.32 kB gzipped, 0 errors, 1 pre-existing warning).
Frontend: RUNNING, webpack compiled successfully.

---

## 2. Docs Read

1. Frozen plan (§1-§17, 661 lines)
2. CRM API verification report
3. POS implementation handoff
4. C-FE-1 implementation report
5. C-FE-1 agent smoke report

---

## 3. Files Modified

| File | Action | Lines changed |
|------|--------|--------------|
| `src/api/constants.js` | ADD `MAX_REDEEMABLE` constant | +2 lines |
| `src/api/transforms/loyaltyTransform.js` | ADD `maxRedeemableFromAPI()` mapper | +20 lines appended |
| `src/api/services/loyaltyService.js` | ADD `getMaxRedeemable()` service function | +39 lines appended |
| `src/utils/BUG108_FLAGS.js` | UPDATE `loyaltyRedeemLive: false`, add new copy strings | ~10 lines changed |
| `src/api/transforms/orderTransform.js` | SIMPLIFY payload gates: remove `loyaltyRedeemLive` from AND gate, `loyalty_redemption_id` always null | 3 sites changed |
| `src/components/order-entry/CollectPaymentPanel.jsx` | MAJOR: remove direct redeem call, remove state machine, remove orphan-debit, add max-redeemable integration, rewrite loyalty UI + inline mirror + bill summary | ~250 lines net change |

---

## 4. Max-Redeemable Service Implementation

- **Endpoint constant:** `MAX_REDEEMABLE: '/pos/max-redeemable'` in `constants.js`
- **Service function:** `getMaxRedeemable({ posId, restaurantId, customerId, custMobile, billAmount })` in `loyaltyService.js`
  - Uses `crmApi.post` (auto-attaches `X-API-Key`)
  - Prefers `customer_id`; falls back to `cust_mobile`
  - Returns parsed response via `maxRedeemableFromAPI()`
  - On error (401/422/5xx/network): returns safe empty result with `error.code = 'NETWORK_ERROR'`
- **Transform:** `maxRedeemableFromAPI(responseBody)` in `loyaltyTransform.js`
  - Maps all 7 CRM data fields to camelCase
  - Extracts `error.code` / `error.message` when present
  - Tracks `success` flag

---

## 5. Collect Bill Integration

- **State:** `maxRedeemable` (object|null), `maxRedeemableLoading` (boolean)
- **useEffect trigger:** fires when `customer.id`, `customer.phone`, `itemTotal`, `manualDiscount`, `presetDiscount`, `restaurant.id`, or `restaurantSettings.isLoyalty` changes
- **Debounce:** 400ms via `useRef` timer — prevents rapid-fire calls during item add/remove
- **Auto-apply:** when CRM returns `maxDiscountValue > 0` and no error, `useLoyalty` is auto-set to `true`
- **Cleanup:** clears `maxRedeemable` when customer deselected or loyalty disabled
- **billAmount sent:** `itemTotal - manualDiscount - presetDiscount` (pre-loyalty subtotal, per frozen plan §4.1)

---

## 6. UI Display Behavior

| State | Right side | Helper text | Checkbox |
|-------|-----------|-------------|----------|
| Loading | "Calculating..." | "Calculating loyalty discount..." | Disabled |
| Happy path (`maxDiscountValue > 0`) | "₹{discount} discount" (green) | "{pts} pts redeemed · ratio ₹{ratio}/pt" (checked) or "Tick to apply ₹{discount} loyalty discount" (unchecked) | Enabled, auto-checked |
| BELOW_MIN_REDEMPTION | "Earn {gap} more" (gray) | "Minimum {min} points required" | Disabled |
| LOYALTY_DISABLED / SETTINGS_MISSING | Section hidden | — | — |
| CUSTOMER_NOT_FOUND / INVALID_REQUEST | Section hidden | — | — |
| Network error | — | "Unable to calculate loyalty discount" | Disabled |
| No customer | Section hidden | — | — |

**"No points" text is ELIMINATED.** Available points always shown from max-redeemable response.

---

## 7. Error-Code Handling

| `data.error.code` | `success` | Action |
|-------------------|-----------|--------|
| (absent) | `true` | Show discount, enable checkbox, auto-apply |
| `BELOW_MIN_REDEMPTION` | `true` | Show "Earn X more", disable checkbox |
| `LOYALTY_DISABLED` | `true` | Hide loyalty section |
| `SETTINGS_MISSING` | `true` | Hide loyalty section |
| `CUSTOMER_NOT_FOUND` | `false` | Hide loyalty section |
| `INVALID_REQUEST` | `false` | Hide loyalty section, console.warn |
| Network/401/422/5xx | — | Safe empty result, "Unable to calculate" |

---

## 8. Final Payload Mapping

| Payload field | Source | Applied | Not applied |
|--------------|--------|---------|-------------|
| `used_loyalty_point` | `maxRedeemable.maxPointsRedeemable` | CRM-returned int | `0` |
| `loyalty_dicount_amount` (via print overrides) | `maxRedeemable.maxDiscountValue` | CRM-returned float | `0` |
| `loyalty_redemption_id` | — | `null` always | `null` |

Gate: `loyaltyRatioLive ? value : 0` (simplified — `loyaltyRedeemLive` removed from AND).

---

## 9. Direct Redeem Wrapper Decision

| Component | Action taken |
|-----------|-------------|
| `redeemLoyalty()` in loyaltyService.js | KEPT as dead code (no callers) |
| `buildRedeemIdempotencyKey()` in loyaltyTransform.js | KEPT as dead code |
| `LOYALTY_REDEEM_STATES` in loyaltyTransform.js | KEPT as dead code |
| `LOYALTY_LS_KEYS` in loyaltyTransform.js | KEPT as dead code |
| `import { redeemLoyalty }` in CollectPaymentPanel | **REMOVED** |
| `import { LOYALTY_REDEEM_STATES, LOYALTY_LS_KEYS }` in CollectPaymentPanel | **REMOVED** |
| `redemption` / `redeemState` / `redeemError` state | **REMOVED** |
| Direct CRM redeem block in handlePayment (old L713-824) | **REMOVED** |
| Orphan-debit localStorage logic | **REMOVED** |

---

## 10. Build Result

| Item | Value |
|------|-------|
| Command | `cd /app/frontend && CI=false yarn build` |
| Exit code | 0 |
| Duration | 21.66s |
| Main bundle | 475.32 kB gzipped |
| Warnings | 1 (pre-existing `react-hooks/exhaustive-deps` on OrderEntry.jsx — unrelated) |
| Errors | 0 |
| Frontend supervisor | RUNNING, webpack compiled successfully |

---

## 11. Regression Guardrails

| Surface | Status |
|---------|--------|
| Coupon | UNCHANGED — `couponLive=false`, force-zero gates intact |
| Wallet | UNCHANGED — `walletDebitLive=false`, force-zero gates intact |
| Manual discount | UNCHANGED — same calculation |
| Preset discount | UNCHANGED — same calculation |
| Tax engine | UNCHANGED — `subtotalAfterDiscount` still feeds GST/VAT |
| Service charge | UNCHANGED |
| Delivery charge | UNCHANGED |
| Tip | UNCHANGED |
| Place Order payload | UPDATED (all-paths fix) — added `loyalty_points_used: 0` for schema consistency |
| Prepaid Payment payload | **FIXED (all-paths fix)** — `used_loyalty_point` + `loyalty_points_used` now read CRM values via BUG108_FLAGS gate. `loyalty_redemption_id: null` added. Owner-verified 2026-05-24. |
| Update Order payload | UPDATED (all-paths fix) — added `loyalty_points_used: 0` for schema consistency |

**Note:** The all-paths fix (2026-05-24) addressed the prepaid payload gap identified during payload verification. See `POS3_0_BUG_108_LOYALTY_PHASE_C_ALL_PATHS_PAYLOAD_FIX_IMPLEMENTATION_REPORT_2026_05_24.md`.

---

## 12–16. Confirmations

| # | Confirmation | Status |
|---|-------------|--------|
| 12 | No direct `/pos/loyalty/redeem` endpoint called | Confirmed — import removed, call block removed, `loyaltyRedeemLive=false` |
| 13 | No backend/data mutation | Confirmed — only non-mutating `/pos/max-redeemable` calls |
| 14 | Reverse/coupon/wallet untouched | Confirmed |
| 15 | `/app/memory/final/` untouched | Confirmed |
| 16 | Baseline docs untouched | Confirmed |

---

**End of Implementation Report.**
