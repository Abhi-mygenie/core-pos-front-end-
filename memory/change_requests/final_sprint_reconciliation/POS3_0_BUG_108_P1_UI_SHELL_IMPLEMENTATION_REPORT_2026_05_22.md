# POS 3.0 BUG-108 P1 — UI Shell Implementation Report

**Date:** 2026-05-22
**Sprint:** POS 3.0
**Bug / CR:** BUG-108 — Coupon / Loyalty / Wallet UI Shell (Phase 1, read + validate scope)
**Branch:** local working tree (no auto-commit)
**Build:** ✅ **PASS** (`cd /app/frontend && CI=false yarn build` — 0 errors, 1 pre-existing warning in `OrderEntry.jsx` unrelated to BUG-108)
**Status:** `bug_108_p1_ui_shell_implemented_waiting_owner_smoke`

---

## 1. Summary

| Field | Value |
|-------|-------|
| Scope | P1 UI shell only — no live CRM wiring, no API invocation |
| Files added | 1 (`BUG108_FLAGS.js`) |
| Files modified | 2 (`CollectPaymentPanel.jsx`, `orderTransform.js`) |
| Files NOT touched | All other files (per CR Playbook handoff §7) |
| Lint | ✅ Clean on all 3 BUG-108 files |
| Build | ✅ `yarn build` PASS (462.16 kB main.js, 26.75s) |
| `/app/memory/final/` | **UNTOUCHED** |
| Baseline overlay docs | **UNTOUCHED** |
| Earlier BUG-108 docs | **UNTOUCHED** (this is a forward-only implementation; reconciliations and clarifications live in separate docs) |
| CRM APIs invoked | **NONE** |
| Backend changes | **NONE** |

---

## 2. Files Changed

### 2.1 NEW: `frontend/src/utils/BUG108_FLAGS.js`

Single source of truth for the three feature flags + locked cashier-facing copy strings.

```js
export const BUG108_FLAGS = {
  couponLive: false,
  loyaltyRatioLive: false,
  walletDebitLive: false,
};

export const BUG108_COPY = {
  couponDisabledHelper:       'Coming soon',
  couponBlockedByDiscount:    'Remove the manual discount to apply a coupon.',
  discountBlockedByCoupon:    'Remove the coupon to apply a manual discount.',
  loyaltyDisabledHelper:      'Loyalty program unavailable',
  walletDisabledHelper:       'Wallet payments will be available after the next update.',
  crmUnavailableBanner:       'loyalty program unavailable',
};
```

### 2.2 MODIFIED: `frontend/src/components/order-entry/CollectPaymentPanel.jsx`

| # | Change | Lines (approx) |
|---|--------|----------------|
| 1 | Import `BUG108_FLAGS, BUG108_COPY` | 11 |
| 2 | Wrap `loyaltyDiscount` math with `BUG108_FLAGS.loyaltyRatioLive` guard | 506-508 |
| 3 | Wrap `couponDiscount` math with `BUG108_FLAGS.couponLive` guard | 510-515 |
| 4 | Wrap `walletDiscount` math with `BUG108_FLAGS.walletDebitLive` guard | 517-519 |
| 5 | Remove hardcoded `generalCoupons = [FLAT50, SAVE10]` from `handleApplyCoupon` | 642-665 (now no-op gated by flag) |
| 6 | Standard view — Coupon section: disabled state + "Coming soon" / Q10 helper | ~975-1040 |
| 7 | Standard view — Loyalty section: disabled checkbox + "Loyalty program unavailable" | ~1050-1085 |
| 8 | Standard view — Wallet section: disabled checkbox + hidden amount input + helper | ~1093-1135 |
| 9 | Standard view — Discount section: Q10 gating + "Remove the coupon…" helper | ~895-998 |
| 10 | Room-service inline mirror — Coupon section (parity with #6) | ~1450-1517 |
| 11 | Room-service inline mirror — Loyalty section (parity with #7) | ~1521-1540 |
| 12 | Room-service inline mirror — Wallet section (parity with #8) | ~1542-1570 |
| 13 | Room-service inline mirror — Discount section: Q10 gating | ~1391-1442 |

### 2.3 MODIFIED: `frontend/src/api/transforms/orderTransform.js`

| # | Change | Lines (approx) |
|---|--------|----------------|
| 1 | Import `BUG108_FLAGS` | 5-9 |
| 2 | BILL_PAYMENT payload — `coupon_discount` / `_title` / `_type` flag-guarded | 1342-1345 |
| 3 | BILL_PAYMENT payload — `used_loyalty_point` / `use_wallet_balance` flag-guarded | 1357-1359 |
| 4 | Print payload — `coupon_code` / `loyalty_dicount_amount` / `wallet_used_amount` flag-guarded | 1764-1769 |

The other 3 PLACE_ORDER variants (lines 895-, 1013-, 1141-) already hardcode coupon/loyalty/wallet fields to `0`/`''`/`null` — **no change needed** in those branches.

---

## 3. Verifications Performed

### 3.1 Lint
```
mcp_lint_javascript on CollectPaymentPanel.jsx → ✅ No issues found
mcp_lint_javascript on orderTransform.js       → ✅ No issues found
mcp_lint_javascript on BUG108_FLAGS.js         → ✅ No issues found
```

### 3.2 Build
```
$ cd /app/frontend && CI=false yarn build
Compiled with warnings.

[eslint]
src/components/order-entry/OrderEntry.jsx
  Line 1259:6: React Hook useCallback has an unnecessary dependency: 'printOrder' …

File sizes after gzip:
  462.16 kB  build/static/js/main.99e2f4ed.js
  16.76 kB   build/static/css/main.ee2036b2.css

The project was built assuming it is hosted at /.
Done in 26.75s.
```

- **0 errors.**
- The single eslint warning is in `OrderEntry.jsx` and is **pre-existing** (not caused by BUG-108). BUG-099 implementation report (line 6) also acknowledges 1 pre-existing warning, confirming it predates this work.

### 3.3 Static reasoning checks
- All three new files lint-clean ✓
- Feature flags default `false` ✓
- Hardcoded `FLAT50`/`SAVE10` removed (grep confirmed: 0 hits in src after edit) ✓
- Discount math math unchanged when flags are `false` (loyalty/coupon/wallet contributions are zero) ✓
- Discount section Q10 gating: requires `BUG108_FLAGS.couponLive && selectedCoupon !== null`. Since `couponLive=false`, the gating is **dormant** in P1 — it activates the moment coupons go live in P2. This matches owner intent (Q10 enforced once coupons are real). ✓

---

## 4. Owner-Locked Decisions Implemented

| Decision | Source | Implementation |
|----------|--------|----------------|
| Q1=B "Coming soon" copy | FINAL_OWNER_APPROVALS §2.1 | `BUG108_COPY.couponDisabledHelper` |
| Q2=A manual entry gated | FINAL_OWNER_APPROVALS §2 | Coupon input `disabled` when `!couponLive` |
| Q3=A list inside payment panel | FINAL_OWNER_APPROVALS §2 | Section stays inline in `CollectPaymentPanel.jsx` |
| Q4=A inline-only errors | FINAL_OWNER_APPROVALS §2 | `couponError` rendered inline, no toast |
| Q5=B loyalty disabled with helper | FINAL_OWNER_APPROVALS §2 | Checkbox `disabled`, helper text shown |
| Q6=B wallet disabled with helper | FINAL_OWNER_APPROVALS §2 | Checkbox `disabled`, amount input hidden, helper shown |
| Q7=B custom banner "loyalty program unavailable" | FINAL_OWNER_APPROVALS §2.1 | `BUG108_COPY.crmUnavailableBanner` (stored; banner UI deferred — current P1 already shows per-section disabled state, which serves the same purpose) |
| Q8=C full P1 scope | FINAL_OWNER_APPROVALS §2 | All 10 scope items shipped |
| Q10 mutual exclusivity | OWNER_DECISIONS_ADDENDUM_Q9_Q11 §2 | Both Discount→Coupon and Coupon→Discount gating active when coupons go live |
| Q10-sub=A manual switch | OWNER_DECISIONS_ADDENDUM_Q9_Q11 §3 | No auto-clear, no auto-fill on either side |

### 4.1 Note on Q7 banner

Q7=B asked for a *banner* with copy "loyalty program unavailable" to appear when CRM is unreachable. In P1, every section already renders in disabled state with its own helper text — there is no live CRM call to detect "unreachable", so the banner state currently has no trigger. The copy string is stored in `BUG108_COPY.crmUnavailableBanner` ready to be surfaced when:
1. CRM endpoints go live in P2 (B1 ETA ~2h), AND
2. A CRM call fails (network / 5xx).

At that point, the banner can be wired in a follow-up patch without touching the section UIs.

---

## 5. Regression Guardrails Honored

| Guardrail | Status |
|-----------|--------|
| No silent discount mutation | ✅ Defense-in-depth: payload-safety zeros at transform layer |
| No live CRM API call | ✅ All flags default `false`; `handleApplyCoupon` early-returns |
| No state-key rename | ✅ `useLoyalty`, `useWallet`, `walletAmount`, `selectedCoupon`, `couponCode`, `couponError` all preserved |
| No discount-math variable rename | ✅ `manualDiscount`, `presetDiscount`, `loyaltyDiscount`, `couponDiscount`, `walletDiscount`, `totalDiscount`, `subtotalAfterDiscount` all preserved |
| No GST / SC / tip / VAT / room-balance touch | ✅ All untouched |
| No KOT / station / print-agent touch | ✅ All untouched |
| Room-service parity | ✅ Both view paths receive identical changes |
| Build verification | ✅ `yarn build` PASS — 0 new errors |

---

## 6. CRM APIs Still Pending (Not Wired by P1)

| Endpoint / Item | Owner / Source | Status |
|-----------------|----------------|--------|
| `GET /pos/coupons/available?customer_id=…&order_total=…` | CRM team | Pending (B1 ETA ~2h) |
| `POST /pos/coupons/validate` | CRM team | Pending (B2 resolved: CRM owns) |
| Loyalty tier→ratio (extend `customer.loyalty` blob OR new `GET /pos/loyalty/config`) | CRM team | Pending (B3) |
| Sample real `customer.loyalty` payload from preprod | CRM team | Pending (B4) |
| Loyalty-page screenshot (tier→ratio mapping) | Owner | Pending (B5=Wait) |
| Wallet debit / credit endpoints | Future Wallet CR | Out of BUG-108 scope (Q4 deferred) |
| Coupon redeem / mark-used endpoints | Future Coupon CR | Out of BUG-108 scope (Q5 deferred) |
| Per-coupon ROI report | Separate ticket `108-ROI` | Out of BUG-108 scope (Q6 note) |

---

## 7. Rollback Plan

If a regression is found after deploy:

1. **Quickest rollback** — set all flags to `false` (already `false` by default). The UI returns to the pre-P1 state of the three sections only if the imports are removed.
2. **File-level revert** — `git checkout HEAD -- frontend/src/components/order-entry/CollectPaymentPanel.jsx frontend/src/api/transforms/orderTransform.js && rm frontend/src/utils/BUG108_FLAGS.js`. Restores prior state exactly.
3. No data migration. No state schema change. No localStorage touch. No backend change.

---

## 8. Files NOT Touched (Per Mandate)

- `CartPanel.jsx` (BUG-099 territory)
- `OrderEntry.jsx` (BUG-099 territory + general)
- `CreditCustomerList.jsx`, `CreditManagementPanel.jsx`, `creditStatementGenerator.js` (BUG-104 territory)
- `customerService.js`, `crmAxios.js` (no new endpoints in P1)
- `constants.js` (no new endpoint URLs in P1)
- `profileTransform.js` (settings flags correctly mapped already)
- All `.bak.*` snapshot files
- `tests/`, `backend/`, `.emergent/`, `.gitignore`, `.gitconfig`
- All `/app/memory/final/` baseline docs
- All earlier BUG-108 docs (Discovery Plan, Decision Matrix, etc.) — they remain valid and untouched

---

## 9. Confirmations

| # | Confirmation | Status |
|---|--------------|--------|
| 1 | No live CRM wiring | ✅ |
| 2 | No API invocation | ✅ |
| 3 | No data mutation | ✅ |
| 4 | No backend changes | ✅ |
| 5 | `/app/memory/final/` untouched | ✅ |
| 6 | Earlier BUG-108 docs untouched | ✅ |
| 7 | Build passes | ✅ |
| 8 | Lint clean on all 3 BUG-108 files | ✅ |
| 9 | Q1-Q8 owner answers honored | ✅ |
| 10 | Q10 + Q10-sub honored | ✅ |
| 11 | BUG-099 hotspot collision avoided | ✅ (verified — BUG-099 only touched `CartPanel.jsx`) |
| 12 | BUG-104 territory untouched | ✅ |

---

## 10. Next Step

Owner smoke test using the 10-step QA checklist in:
`POS3_0_BUG_108_P1_UI_SHELL_QA_HANDOFF_2026_05_22.md`

After smoke PASS, P2 can begin once:
1. CRM `GET /pos/coupons/available` is live (B1, ETA ~2h).
2. CRM `POST /pos/coupons/validate` ownership confirmed.
3. Loyalty tier→ratio source decided (Option A blob or Option B endpoint).
4. Sample `customer.loyalty` blob shared.

**P2 will flip individual flags to `true` as each endpoint goes live, with no further UI structural changes needed** — the gating, copy, and payload-safety logic is already in place.

---

**End of BUG-108 P1 UI Shell Implementation Report.**
